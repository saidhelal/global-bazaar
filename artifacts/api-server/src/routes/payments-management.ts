/**
 * Payment management surface: admin ledger/refunds/settlements, vendor
 * earnings, and customer self-service (retry, invoice, payment history).
 *
 * Mounted alongside the existing /api/payments routes; no existing endpoint is
 * modified.
 */
import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  ordersTable, paymentTransactionsTable, refundsTable, vendorSettlementsTable,
  settlementItemsTable, paymentAuditLogTable, couponsTable,
} from "@workspace/db/schema";
import { and, eq, desc, sql, gte, lte, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
  createRefund, listRefunds, accrueSettlement, releaseSettlement,
  vendorEarnings, createSettlementBatch, markSettlementPaid, issueInvoice, ServiceError,
} from "../payments/services";
import { priceOrder, PricingError } from "../payments/pricing";
import { audit } from "../payments/ledger";

const router = Router();
const adminOnly = [requireAuth, requireRole("admin")] as const;

function fail(res: import("express").Response, err: unknown): void {
  if (err instanceof ServiceError) { res.status(err.httpStatus).json({ error: err.message, code: err.code }); return; }
  if (err instanceof PricingError) { res.status(400).json({ error: err.message, code: err.code }); return; }
  res.status(500).json({ error: err instanceof Error ? err.message : "Unexpected error" });
}

// ─── Customer ────────────────────────────────────────────────────────────────

/** POST /api/payments/quote — price a basket without creating an order. */
router.post("/quote", requireAuth, async (req, res) => {
  const Body = z.object({
    items: z.array(z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().positive(),
    })).min(1),
    country: z.string().min(2),
    state: z.string().optional(),
    couponCode: z.string().optional(),
  });
  try {
    const body = Body.parse(req.body);
    const quote = await priceOrder({ ...body, userId: req.user!.userId });
    res.json(quote);
  } catch (err) { fail(res, err); }
});

/** POST /api/payments/coupons/validate */
router.post("/coupons/validate", requireAuth, async (req, res) => {
  const Body = z.object({
    code: z.string().min(1),
    items: z.array(z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().positive(),
    })).min(1),
    country: z.string().min(2),
    state: z.string().optional(),
  });
  try {
    const body = Body.parse(req.body);
    const quote = await priceOrder({
      items: body.items, country: body.country, state: body.state,
      couponCode: body.code, userId: req.user!.userId,
    });
    res.json({
      valid: true, code: quote.couponCode,
      discountAmount: quote.discountAmount, total: quote.total,
    });
  } catch (err) {
    if (err instanceof PricingError) {
      res.status(200).json({ valid: false, error: err.message, code: err.code });
      return;
    }
    fail(res, err);
  }
});

/** GET /api/payments/my/history — the customer's own payment history. */
router.get("/my/history", requireAuth, async (req, res) => {
  try {
    const orders = await db.select({ id: ordersTable.id })
      .from(ordersTable).where(eq(ordersTable.userId, req.user!.userId));
    const ids = orders.map(o => o.id);
    if (ids.length === 0) { res.json({ transactions: [] }); return; }

    const tx = await db.select().from(paymentTransactionsTable)
      .where(inArray(paymentTransactionsTable.orderId, ids))
      .orderBy(desc(paymentTransactionsTable.createdAt)).limit(200);
    res.json({ transactions: tx });
  } catch (err) { fail(res, err); }
});

/** POST /api/payments/:orderId/retry — reset a failed payment for another try. */
router.post("/:orderId/retry", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(String(req.params["orderId"]));
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (order.userId !== req.user!.userId) { res.status(403).json({ error: "Forbidden" }); return; }
    if (order.paymentStatus === "paid") {
      res.status(409).json({ error: "Order is already paid", code: "ALREADY_PAID" }); return;
    }
    if (order.status === "cancelled" || order.status === "refunded") {
      res.status(409).json({ error: "Order is closed", code: "ORDER_CLOSED" }); return;
    }

    // Clearing the stale gateway reference lets the client start a fresh charge
    // through the existing create-intent / init endpoints.
    await db.update(ordersTable).set({
      paymentStatus: "pending_payment", paymentIntentId: null, updatedAt: new Date(),
    }).where(eq(ordersTable.id, orderId));

    await audit({ action: "payment.retry_requested", orderId, actorId: req.user!.userId });
    res.json({ ok: true, orderId, paymentStatus: "pending_payment" });
  } catch (err) { fail(res, err); }
});

/** GET /api/payments/:orderId/invoice */
router.get("/:orderId/invoice", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(String(req.params["orderId"]));
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (order.userId !== req.user!.userId && req.user!.role !== "admin") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    if (order.paymentStatus !== "paid" && order.paymentStatus !== "refunded"
        && order.paymentStatus !== "partially_refunded") {
      res.status(409).json({ error: "Invoice is issued once the order is paid", code: "NOT_PAID" });
      return;
    }
    res.json({ invoice: await issueInvoice(orderId) });
  } catch (err) { fail(res, err); }
});

// ─── Vendor ──────────────────────────────────────────────────────────────────

/** GET /api/payments/vendor/earnings */
router.get("/vendor/earnings", requireAuth, requireRole("vendor", "admin"), async (req, res) => {
  try {
    res.json(await vendorEarnings(req.user!.userId));
  } catch (err) { fail(res, err); }
});

/** GET /api/payments/vendor/settlements */
router.get("/vendor/settlements", requireAuth, requireRole("vendor", "admin"), async (req, res) => {
  try {
    const rows = await db.select().from(vendorSettlementsTable)
      .where(eq(vendorSettlementsTable.vendorId, req.user!.userId))
      .orderBy(desc(vendorSettlementsTable.createdAt));
    res.json({ settlements: rows });
  } catch (err) { fail(res, err); }
});

// ─── Admin ───────────────────────────────────────────────────────────────────

/** GET /api/payments/admin/transactions — the ledger, searchable and filtered. */
router.get("/admin/transactions", ...adminOnly, async (req, res) => {
  try {
    const { gateway, type, status, orderId, from, to } = req.query as Record<string, string>;
    const page = Math.max(1, parseInt(req.query["page"] as string) || 1);
    const limit = Math.min(200, parseInt(req.query["limit"] as string) || 50);

    const filters = [
      gateway ? eq(paymentTransactionsTable.gateway, gateway) : undefined,
      type ? eq(paymentTransactionsTable.type, type as "charge") : undefined,
      status ? eq(paymentTransactionsTable.status, status as "succeeded") : undefined,
      orderId ? eq(paymentTransactionsTable.orderId, parseInt(orderId)) : undefined,
      from ? gte(paymentTransactionsTable.createdAt, new Date(from)) : undefined,
      to ? lte(paymentTransactionsTable.createdAt, new Date(to)) : undefined,
    ].filter(Boolean);

    const where = filters.length ? and(...filters as never[]) : undefined;

    const rows = await db.select().from(paymentTransactionsTable)
      .where(where).orderBy(desc(paymentTransactionsTable.createdAt))
      .limit(limit).offset((page - 1) * limit);

    const [totals] = await db.select({
      count: sql<number>`count(*)::int`,
      volume: sql<string>`coalesce(sum(case when ${paymentTransactionsTable.type} = 'charge' and ${paymentTransactionsTable.status} = 'succeeded' then ${paymentTransactionsTable.amount} else 0 end), 0)`,
      refunded: sql<string>`coalesce(sum(case when ${paymentTransactionsTable.type} = 'refund' then ${paymentTransactionsTable.amount} else 0 end), 0)`,
    }).from(paymentTransactionsTable).where(where);

    res.json({
      transactions: rows,
      page, limit,
      total: totals?.count ?? 0,
      grossVolume: parseFloat(totals?.volume ?? "0"),
      refundedVolume: Math.abs(parseFloat(totals?.refunded ?? "0")),
    });
  } catch (err) { fail(res, err); }
});

/** GET /api/payments/admin/refunds */
router.get("/admin/refunds", ...adminOnly, async (req, res) => {
  try {
    const orderId = req.query["orderId"] ? parseInt(req.query["orderId"] as string) : undefined;
    res.json({ refunds: await listRefunds(orderId) });
  } catch (err) { fail(res, err); }
});

/** POST /api/payments/admin/orders/:orderId/refund — full or partial. */
router.post("/admin/orders/:orderId/refund", ...adminOnly, async (req, res) => {
  const Body = z.object({
    amount: z.number().positive().optional(),
    reason: z.string().max(500).optional(),
  });
  try {
    const body = Body.parse(req.body ?? {});
    const refund = await createRefund({
      orderId: parseInt(String(req.params["orderId"])),
      amount: body.amount,
      reason: body.reason,
      actorId: req.user!.userId,
    });
    res.status(201).json({ refund });
  } catch (err) { fail(res, err); }
});

/** GET /api/payments/admin/settlements */
router.get("/admin/settlements", ...adminOnly, async (_req, res) => {
  try {
    const rows = await db.select().from(vendorSettlementsTable)
      .orderBy(desc(vendorSettlementsTable.createdAt)).limit(200);
    res.json({ settlements: rows });
  } catch (err) { fail(res, err); }
});

/** POST /api/payments/admin/orders/:orderId/accrue — book vendor earnings. */
router.post("/admin/orders/:orderId/accrue", ...adminOnly, async (req, res) => {
  try {
    const orderId = parseInt(String(req.params["orderId"]));
    res.json({ accrued: await accrueSettlement(orderId) });
  } catch (err) { fail(res, err); }
});

/** POST /api/payments/admin/orders/:orderId/release — release escrowed funds. */
router.post("/admin/orders/:orderId/release", ...adminOnly, async (req, res) => {
  try {
    const orderId = parseInt(String(req.params["orderId"]));
    res.json({ released: await releaseSettlement(orderId) });
  } catch (err) { fail(res, err); }
});

/** POST /api/payments/admin/vendors/:vendorId/settle — build a payout batch. */
router.post("/admin/vendors/:vendorId/settle", ...adminOnly, async (req, res) => {
  try {
    const vendorId = parseInt(String(req.params["vendorId"]));
    res.status(201).json({ settlement: await createSettlementBatch(vendorId, req.user!.userId) });
  } catch (err) { fail(res, err); }
});

/** POST /api/payments/admin/settlements/:id/pay */
router.post("/admin/settlements/:id/pay", ...adminOnly, async (req, res) => {
  const Body = z.object({ payoutRef: z.string().max(200).optional() });
  try {
    const body = Body.parse(req.body ?? {});
    const settled = await markSettlementPaid(
      parseInt(String(req.params["id"])), req.user!.userId, body.payoutRef,
    );
    res.json({ settlement: settled });
  } catch (err) { fail(res, err); }
});

/** GET /api/payments/admin/audit — financial audit trail. */
router.get("/admin/audit", ...adminOnly, async (req, res) => {
  try {
    const severity = req.query["severity"] as string | undefined;
    const rows = await db.select().from(paymentAuditLogTable)
      .where(severity ? eq(paymentAuditLogTable.severity, severity) : undefined)
      .orderBy(desc(paymentAuditLogTable.createdAt)).limit(200);
    res.json({ entries: rows });
  } catch (err) { fail(res, err); }
});

/** GET /api/payments/admin/reports/summary */
router.get("/admin/reports/summary", ...adminOnly, async (_req, res) => {
  try {
    const [ledger] = await db.select({
      gross: sql<string>`coalesce(sum(case when ${paymentTransactionsTable.type} = 'charge' and ${paymentTransactionsTable.status} = 'succeeded' then ${paymentTransactionsTable.amount} else 0 end), 0)`,
      refunds: sql<string>`coalesce(sum(case when ${paymentTransactionsTable.type} = 'refund' then ${paymentTransactionsTable.amount} else 0 end), 0)`,
      commission: sql<string>`coalesce(sum(case when ${paymentTransactionsTable.type} = 'commission' then ${paymentTransactionsTable.amount} else 0 end), 0)`,
      payouts: sql<string>`coalesce(sum(case when ${paymentTransactionsTable.type} = 'payout' then ${paymentTransactionsTable.amount} else 0 end), 0)`,
    }).from(paymentTransactionsTable);

    const [escrow] = await db.select({
      held: sql<string>`coalesce(sum(case when ${settlementItemsTable.status} = 'accrued' then ${settlementItemsTable.netAmount} else 0 end), 0)`,
      payable: sql<string>`coalesce(sum(case when ${settlementItemsTable.status} = 'pending_payout' then ${settlementItemsTable.netAmount} else 0 end), 0)`,
    }).from(settlementItemsTable);

    res.json({
      grossVolume: parseFloat(ledger?.gross ?? "0"),
      refunded: Math.abs(parseFloat(ledger?.refunds ?? "0")),
      commissionEarned: parseFloat(ledger?.commission ?? "0"),
      paidOut: Math.abs(parseFloat(ledger?.payouts ?? "0")),
      heldInEscrow: parseFloat(escrow?.held ?? "0"),
      payableToVendors: parseFloat(escrow?.payable ?? "0"),
    });
  } catch (err) { fail(res, err); }
});

/** GET|POST /api/payments/admin/coupons */
router.get("/admin/coupons", ...adminOnly, async (_req, res) => {
  try {
    res.json({ coupons: await db.select().from(couponsTable).orderBy(desc(couponsTable.createdAt)) });
  } catch (err) { fail(res, err); }
});

router.post("/admin/coupons", ...adminOnly, async (req, res) => {
  const Body = z.object({
    code: z.string().min(3).max(40),
    type: z.enum(["percent", "fixed"]),
    value: z.number().positive(),
    currency: z.string().length(3).optional(),
    minSubtotal: z.number().min(0).optional(),
    maxDiscount: z.number().positive().optional(),
    maxUses: z.number().int().positive().optional(),
    maxUsesPerUser: z.number().int().positive().optional(),
    validFrom: z.string().optional(),
    validTo: z.string().optional(),
  });
  try {
    const b = Body.parse(req.body);
    const [coupon] = await db.insert(couponsTable).values({
      code: b.code.trim().toUpperCase(),
      type: b.type,
      value: b.value.toFixed(2),
      currency: b.currency ?? null,
      minSubtotal: (b.minSubtotal ?? 0).toFixed(2),
      maxDiscount: b.maxDiscount ? b.maxDiscount.toFixed(2) : null,
      maxUses: b.maxUses ?? null,
      maxUsesPerUser: b.maxUsesPerUser ?? 1,
      validFrom: b.validFrom ? new Date(b.validFrom) : null,
      validTo: b.validTo ? new Date(b.validTo) : null,
    }).returning();
    await audit({ action: "coupon.created", actorId: req.user!.userId, detail: { code: coupon!.code } });
    res.status(201).json({ coupon });
  } catch (err) { fail(res, err); }
});

export default router;
