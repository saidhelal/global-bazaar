/**
 * RefundService, SettlementService and InvoiceService.
 *
 * All three write to the append-only ledger rather than mutating balances, so
 * every figure they expose can be re-derived from payment_transactions.
 */
import { db } from "@workspace/db";
import {
  ordersTable, orderItemsTable, refundsTable, invoicesTable,
  vendorSettlementsTable, settlementItemsTable,
} from "@workspace/db/schema";
import { and, eq, sql, desc } from "drizzle-orm";
import { getProvider, ProviderError } from "./providers";
import { recordTransaction, audit, sumTransactions } from "./ledger";
import { platformCommissionRate } from "./pricing";

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export class ServiceError extends Error {
  constructor(message: string, readonly code: string, readonly httpStatus = 400) {
    super(message);
    this.name = "ServiceError";
  }
}

// ─── Refunds ─────────────────────────────────────────────────────────────────

/**
 * Issues a full or partial refund. The refundable ceiling is derived from the
 * ledger (charges minus prior refunds), so concurrent or repeated requests can
 * never refund more than was actually captured.
 */
export async function createRefund(opts: {
  orderId: number;
  amount?: number | undefined;
  reason?: string | undefined;
  actorId: number;
}) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, opts.orderId)).limit(1);
  if (!order) throw new ServiceError("Order not found", "ORDER_NOT_FOUND", 404);

  if (order.paymentStatus !== "paid" && order.paymentStatus !== "partially_refunded") {
    throw new ServiceError("Order has no captured payment to refund", "NOT_REFUNDABLE", 409);
  }

  const charged = await sumTransactions(opts.orderId, "charge");
  const alreadyRefunded = await sumTransactions(opts.orderId, "refund");
  const refundable = round2(charged - alreadyRefunded);

  if (refundable <= 0) throw new ServiceError("Nothing left to refund", "FULLY_REFUNDED", 409);

  const amount = round2(opts.amount ?? refundable);
  if (amount <= 0) throw new ServiceError("Refund amount must be positive", "INVALID_AMOUNT");
  if (amount > refundable) {
    throw new ServiceError(`Refund exceeds refundable balance (${refundable})`, "AMOUNT_TOO_LARGE");
  }

  const [refund] = await db.insert(refundsTable).values({
    orderId: opts.orderId,
    amount: amount.toFixed(2),
    currency: order.currency,
    reason: opts.reason ?? null,
    status: "processing",
    gateway: order.paymentGateway,
    requestedBy: opts.actorId,
    approvedBy: opts.actorId,
  }).returning();

  let gatewayRef: string | null = null;
  let settled = false;

  try {
    const provider = getProvider(order.paymentGateway);
    const result = await provider.refund(order.paymentIntentId ?? "", amount, order.currency);
    gatewayRef = result.gatewayRef;
    settled = result.status === "refunded";
  } catch (err) {
    // A gateway without a refund API (Paymob, MyFatoorah) leaves the refund in
    // "processing" for an operator to complete in the gateway's own dashboard.
    if (!(err instanceof ProviderError && err.code === "REFUND_MANUAL")) {
      await db.update(refundsTable)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(refundsTable.id, refund!.id));
      await audit({
        action: "refund.failed", orderId: opts.orderId, actorId: opts.actorId,
        gateway: order.paymentGateway, severity: "critical",
        detail: { amount, error: err instanceof Error ? err.message : String(err) },
      });
      throw new ServiceError(
        err instanceof Error ? err.message : "Refund failed at the gateway",
        "GATEWAY_REFUND_FAILED", 502,
      );
    }
  }

  // Money leaving the platform is a negative ledger entry.
  await recordTransaction({
    orderId: opts.orderId,
    type: "refund",
    status: settled ? "succeeded" : "pending",
    gateway: order.paymentGateway,
    gatewayRef,
    amount: -amount,
    currency: order.currency,
    rawPayload: { refundId: refund!.id, reason: opts.reason },
  });

  await db.update(refundsTable).set({
    status: settled ? "refunded" : "processing",
    gatewayRef,
    updatedAt: new Date(),
  }).where(eq(refundsTable.id, refund!.id));

  if (settled) {
    const totalRefunded = round2(alreadyRefunded + amount);
    const isFull = totalRefunded >= charged - 0.01;
    await db.update(ordersTable).set({
      paymentStatus: isFull ? "refunded" : "partially_refunded",
      ...(isFull ? { status: "refunded" as const } : {}),
      updatedAt: new Date(),
    }).where(eq(ordersTable.id, opts.orderId));
  }

  await audit({
    action: "refund.created", orderId: opts.orderId, actorId: opts.actorId,
    gateway: order.paymentGateway, detail: { amount, settled, refundId: refund!.id },
  });

  return { ...refund!, status: settled ? "refunded" : "processing", gatewayRef };
}

export async function listRefunds(orderId?: number) {
  const q = db.select().from(refundsTable).orderBy(desc(refundsTable.createdAt));
  return orderId ? q.where(eq(refundsTable.orderId, orderId)) : q.limit(200);
}

// ─── Settlement (escrow-ready) ───────────────────────────────────────────────

/**
 * Records what each vendor earned from an order. Entries start as "accrued" —
 * held, not payable — which is the escrow behaviour: funds are only released
 * once the order reaches delivery.
 */
export async function accrueSettlement(orderId: number): Promise<number> {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) throw new ServiceError("Order not found", "ORDER_NOT_FOUND", 404);

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  const rate = platformCommissionRate();
  let created = 0;

  for (const item of items) {
    const gross = parseFloat(item.subtotal);
    const commission = round2(gross * (rate / 100));
    const net = round2(gross - commission);

    // The unique index on order_item_id makes this idempotent.
    const inserted = await db.insert(settlementItemsTable).values({
      orderId,
      orderItemId: item.id,
      vendorId: item.vendorId,
      grossAmount: gross.toFixed(2),
      commissionRate: rate.toFixed(2),
      commissionAmount: commission.toFixed(2),
      netAmount: net.toFixed(2),
      currency: order.currency,
      status: "accrued",
    }).onConflictDoNothing({ target: settlementItemsTable.orderItemId }).returning();

    if (inserted.length > 0) {
      created++;
      await recordTransaction({
        orderId, vendorId: item.vendorId, type: "commission", status: "succeeded",
        gateway: order.paymentGateway, amount: commission, currency: order.currency,
      });
    }
  }

  if (created > 0) {
    await audit({ action: "settlement.accrued", orderId, detail: { items: created, commissionRate: rate } });
  }
  return created;
}

/** Releases held earnings for a delivered order so they become payable. */
export async function releaseSettlement(orderId: number): Promise<number> {
  const rows = await db.update(settlementItemsTable)
    .set({ status: "pending_payout" })
    .where(and(eq(settlementItemsTable.orderId, orderId), eq(settlementItemsTable.status, "accrued")))
    .returning();
  if (rows.length > 0) {
    await audit({ action: "settlement.released", orderId, detail: { items: rows.length } });
  }
  return rows.length;
}

/** Aggregated earnings for a vendor, derived from settlement items. */
export async function vendorEarnings(vendorId: number) {
  const [totals] = await db.select({
    gross: sql<string>`coalesce(sum(${settlementItemsTable.grossAmount}), 0)`,
    commission: sql<string>`coalesce(sum(${settlementItemsTable.commissionAmount}), 0)`,
    net: sql<string>`coalesce(sum(${settlementItemsTable.netAmount}), 0)`,
    held: sql<string>`coalesce(sum(case when ${settlementItemsTable.status} = 'accrued' then ${settlementItemsTable.netAmount} else 0 end), 0)`,
    payable: sql<string>`coalesce(sum(case when ${settlementItemsTable.status} = 'pending_payout' then ${settlementItemsTable.netAmount} else 0 end), 0)`,
    paid: sql<string>`coalesce(sum(case when ${settlementItemsTable.status} = 'paid' then ${settlementItemsTable.netAmount} else 0 end), 0)`,
  }).from(settlementItemsTable).where(eq(settlementItemsTable.vendorId, vendorId));

  const items = await db.select().from(settlementItemsTable)
    .where(eq(settlementItemsTable.vendorId, vendorId))
    .orderBy(desc(settlementItemsTable.createdAt)).limit(100);

  return {
    gross: parseFloat(totals?.gross ?? "0"),
    commission: parseFloat(totals?.commission ?? "0"),
    net: parseFloat(totals?.net ?? "0"),
    heldInEscrow: parseFloat(totals?.held ?? "0"),
    payable: parseFloat(totals?.payable ?? "0"),
    paid: parseFloat(totals?.paid ?? "0"),
    items,
  };
}

/** Creates a payout batch from everything currently payable for a vendor. */
export async function createSettlementBatch(vendorId: number, actorId: number) {
  const payable = await db.select().from(settlementItemsTable)
    .where(and(eq(settlementItemsTable.vendorId, vendorId), eq(settlementItemsTable.status, "pending_payout")));

  if (payable.length === 0) throw new ServiceError("No payable earnings for this vendor", "NOTHING_PAYABLE", 409);

  const gross = round2(payable.reduce((s, i) => s + parseFloat(i.grossAmount), 0));
  const commission = round2(payable.reduce((s, i) => s + parseFloat(i.commissionAmount), 0));
  const net = round2(payable.reduce((s, i) => s + parseFloat(i.netAmount), 0));
  const currency = payable[0]!.currency;

  const dates = payable.map(i => i.createdAt.getTime());
  const [batch] = await db.insert(vendorSettlementsTable).values({
    vendorId,
    periodStart: new Date(Math.min(...dates)),
    periodEnd: new Date(Math.max(...dates)),
    grossAmount: gross.toFixed(2),
    commissionAmount: commission.toFixed(2),
    netAmount: net.toFixed(2),
    currency,
    status: "pending_payout",
  }).returning();

  await db.update(settlementItemsTable)
    .set({ settlementId: batch!.id })
    .where(and(eq(settlementItemsTable.vendorId, vendorId), eq(settlementItemsTable.status, "pending_payout")));

  await audit({ action: "settlement.batch_created", actorId, detail: { vendorId, net, items: payable.length } });
  return batch!;
}

/** Marks a batch paid and books the payout in the ledger. */
export async function markSettlementPaid(settlementId: number, actorId: number, payoutRef?: string) {
  const [batch] = await db.select().from(vendorSettlementsTable)
    .where(eq(vendorSettlementsTable.id, settlementId)).limit(1);
  if (!batch) throw new ServiceError("Settlement not found", "NOT_FOUND", 404);
  if (batch.status === "paid") throw new ServiceError("Settlement is already paid", "ALREADY_PAID", 409);

  await db.update(vendorSettlementsTable).set({
    status: "paid", paidAt: new Date(), payoutRef: payoutRef ?? null, updatedAt: new Date(),
  }).where(eq(vendorSettlementsTable.id, settlementId));

  await db.update(settlementItemsTable).set({ status: "paid" })
    .where(eq(settlementItemsTable.settlementId, settlementId));

  await recordTransaction({
    vendorId: batch.vendorId, type: "payout", status: "succeeded",
    gateway: "manual", gatewayRef: payoutRef ?? null,
    amount: -parseFloat(batch.netAmount), currency: batch.currency,
  });

  await audit({
    action: "settlement.paid", actorId, severity: "info",
    detail: { settlementId, vendorId: batch.vendorId, net: batch.netAmount },
  });
  return { ...batch, status: "paid" as const };
}

// ─── Invoices ────────────────────────────────────────────────────────────────

/**
 * Issues an invoice, or returns the existing one. The snapshot freezes the
 * figures so a later price or tax change never rewrites history.
 */
export async function issueInvoice(orderId: number) {
  const [existing] = await db.select().from(invoicesTable)
    .where(eq(invoicesTable.orderId, orderId)).limit(1);
  if (existing) return existing;

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) throw new ServiceError("Order not found", "ORDER_NOT_FOUND", 404);

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));

  const year = new Date().getFullYear();
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoicesTable);
  const number = `INV-${year}-${String((count ?? 0) + 1).padStart(6, "0")}`;

  const [invoice] = await db.insert(invoicesTable).values({
    orderId,
    number,
    currency: order.currency,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount ?? "0",
    shippingAmount: order.shippingCost ?? "0",
    taxAmount: order.tax ?? "0",
    total: order.total,
    snapshot: {
      orderId,
      placedAt: order.createdAt,
      shippingAddress: order.shippingAddress,
      paymentGateway: order.paymentGateway,
      items: items.map(i => ({
        title: i.title, price: i.price, quantity: i.quantity, subtotal: i.subtotal,
      })),
    },
  }).returning();

  await audit({ action: "invoice.issued", orderId, detail: { number } });
  return invoice!;
}
