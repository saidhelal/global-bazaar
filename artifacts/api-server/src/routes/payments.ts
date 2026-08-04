import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { ordersTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import {
  getProvider, ProviderError, PaymobProvider, myfatoorahProvider, type ChargeContext,
} from "../payments/providers";
import { recordTransaction, audit, claimEvent, amountMatches } from "../payments/ledger";
import { accrueSettlement } from "../payments/services";

const router = Router();

// ─── Shared helpers ──────────────────────────────────────────────────────────

async function updateOrderPayment(
  orderId: number,
  patch: {
    paymentStatus?: string;
    paymentIntentId?: string;
    paymentGateway?: string;
    paymentDetails?: Record<string, unknown>;
    status?: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  },
) {
  const { paymentStatus, paymentIntentId, paymentGateway, paymentDetails, status } = patch;
  await db
    .update(ordersTable)
    .set({
      ...(paymentStatus !== undefined && { paymentStatus }),
      ...(paymentIntentId !== undefined && { paymentIntentId }),
      ...(paymentGateway !== undefined && { paymentGateway }),
      ...(paymentDetails !== undefined && { paymentDetails }),
      ...(status !== undefined && { status }),
      updatedAt: new Date(),
    })
    .where(eq(ordersTable.id, orderId));
}

/**
 * Loads the order together with the real customer record and builds the charge
 * context. Replaces the hardcoded "customer@orbit.market" placeholder that used
 * to be sent to Paymob and MyFatoorah.
 */
async function buildChargeContext(
  req: Request,
  orderId: number,
): Promise<{ ok: true; ctx: ChargeContext; currency: string } | { ok: false; status: number; body: object }> {
  if (!orderId) return { ok: false, status: 400, body: { error: "orderId required" } };

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) return { ok: false, status: 404, body: { error: "Order not found" } };
  if (order.userId !== req.user!.userId) return { ok: false, status: 403, body: { error: "Forbidden" } };

  if (order.paymentStatus === "paid") {
    return { ok: false, status: 409, body: { error: "Order is already paid", code: "ALREADY_PAID" } };
  }

  const [customer] = await db
    .select({ email: usersTable.email, fullName: usersTable.fullName, phone: usersTable.phone })
    .from(usersTable).where(eq(usersTable.id, order.userId!)).limit(1);

  const addr = (order.shippingAddress ?? {}) as Record<string, string>;
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = (req.headers["x-forwarded-host"] as string) || (req.headers["host"] as string) || "localhost";

  return {
    ok: true,
    currency: order.currency,
    ctx: {
      orderId: order.id,
      amount: parseFloat(order.total),
      currency: order.currency,
      customerName: addr["fullName"] || customer?.fullName || "Customer",
      customerEmail: customer?.email ?? "",
      customerPhone: addr["phone"] || customer?.phone || "",
      address: addr,
      appOrigin: `${proto}://${host}`,
    },
  };
}

/**
 * Single entry point for starting a charge on any gateway. Keeps each route a
 * thin adapter so response shapes stay exactly as they were.
 */
async function startCharge(req: Request, res: Response, gatewayId: string) {
  const provider = getProvider(gatewayId);

  if (!provider.isConfigured()) {
    res.status(503).json({ error: `${gatewayId} is not configured.` });
    return null;
  }

  const { orderId } = req.body as { orderId: number };
  const loaded = await buildChargeContext(req, orderId);
  if (!loaded.ok) {
    res.status(loaded.status).json(loaded.body);
    return null;
  }

  // A gateway may only be used for a currency it can actually settle.
  if (!provider.supportsCurrency(loaded.currency)) {
    await audit({
      action: "payment.currency_rejected",
      actorId: req.user!.userId,
      orderId,
      gateway: gatewayId,
      severity: "warning",
      detail: { currency: loaded.currency },
    });
    res.status(400).json({
      error: `${gatewayId} does not support ${loaded.currency}`,
      code: "CURRENCY_UNSUPPORTED",
    });
    return null;
  }

  try {
    const result = await provider.createCharge(loaded.ctx);

    await updateOrderPayment(orderId, {
      paymentGateway: gatewayId,
      paymentIntentId: result.gatewayRef,
      paymentStatus: "pending_payment",
    });

    await recordTransaction({
      orderId,
      type: "charge",
      status: "pending",
      gateway: gatewayId,
      gatewayRef: result.gatewayRef,
      amount: loaded.ctx.amount,
      currency: loaded.currency,
    });

    return result;
  } catch (err) {
    if (err instanceof ProviderError) {
      res.status(err.httpStatus).json({ error: err.message, code: err.code });
      return null;
    }
    const msg = err instanceof Error ? err.message : "Payment error";
    res.status(500).json({ error: msg });
    return null;
  }
}

/**
 * Applies a confirmed payment exactly once. Callers must have already verified
 * authenticity (signature/HMAC) and idempotency.
 */
async function confirmPayment(
  orderId: number,
  gateway: string,
  gatewayRef: string,
  paidAmount: number | null,
  raw: Record<string, unknown>,
): Promise<{ applied: boolean; reason?: string }> {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) return { applied: false, reason: "order_not_found" };

  const expected = parseFloat(order.total);

  // Never mark an order paid for a different amount than it was placed for.
  if (paidAmount !== null && !amountMatches(expected, paidAmount)) {
    await audit({
      action: "payment.amount_mismatch",
      orderId,
      gateway,
      severity: "critical",
      detail: { expected, received: paidAmount, gatewayRef },
    });
    await recordTransaction({
      orderId, type: "charge", status: "failed", gateway, gatewayRef,
      amount: paidAmount, currency: order.currency,
      failureReason: `Amount mismatch: expected ${expected}, received ${paidAmount}`,
      rawPayload: raw,
    });
    return { applied: false, reason: "amount_mismatch" };
  }

  await updateOrderPayment(orderId, {
    paymentStatus: "paid",
    status: "confirmed",
    paymentGateway: gateway,
    paymentDetails: { gatewayRef, amount: paidAmount ?? expected, currency: order.currency },
  });

  await recordTransaction({
    orderId, type: "charge", status: "succeeded", gateway, gatewayRef,
    amount: paidAmount ?? expected, currency: order.currency, rawPayload: raw,
  });

  await audit({ action: "payment.confirmed", orderId, gateway, detail: { gatewayRef } });

  // Book vendor earnings into escrow ("accrued"); they are released for payout
  // when the order is delivered. Never let this fail the payment confirmation.
  try {
    await accrueSettlement(orderId);
  } catch (err) {
    await audit({
      action: "settlement.accrual_failed", orderId, severity: "warning",
      detail: { error: err instanceof Error ? err.message : String(err) },
    });
  }

  return { applied: true };
}

async function failPayment(
  orderId: number, gateway: string, gatewayRef: string, reason: string, raw: Record<string, unknown>,
) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  await updateOrderPayment(orderId, { paymentStatus: "failed", paymentDetails: { error: reason } });
  await recordTransaction({
    orderId, type: "charge", status: "failed", gateway, gatewayRef,
    amount: order ? parseFloat(order.total) : 0,
    currency: order?.currency ?? "USD",
    failureReason: reason, rawPayload: raw,
  });
  await audit({ action: "payment.failed", orderId, gateway, severity: "warning", detail: { reason } });
}

// ─── STRIPE ──────────────────────────────────────────────────────────────────

/** POST /api/payments/stripe/create-intent */
router.post("/stripe/create-intent", requireAuth, async (req, res) => {
  const result = await startCharge(req, res, "stripe");
  if (!result || result.kind !== "client_secret") return;
  res.json({ clientSecret: result.clientSecret, paymentIntentId: result.gatewayRef });
});

/** POST /api/payments/stripe/webhook — raw body, signature-verified, no auth */
router.post("/stripe/webhook", async (req: Request & { rawBody?: Buffer }, res) => {
  const STRIPE_SECRET_KEY = process.env["STRIPE_SECRET_KEY"];
  const STRIPE_WEBHOOK_SECRET = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    res.status(503).json({ error: "Stripe not configured" });
    return;
  }
  try {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const sig = req.headers["stripe-signature"] as string;
    const rawBody = req.rawBody ?? (req.body as Buffer);
    const event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);

    const pi = event.data.object as {
      id: string; metadata: Record<string, string>; amount?: number;
      currency?: string; last_payment_error?: { message?: string };
    };
    const orderId = parseInt(pi.metadata?.["orderId"] ?? "0");

    // Idempotency: a replayed delivery is acknowledged but not reprocessed.
    if (!(await claimEvent("stripe", event.id, event.type, orderId || null, { id: pi.id }))) {
      res.json({ received: true, duplicate: true });
      return;
    }

    if (orderId && event.type === "payment_intent.succeeded") {
      const minor = pi.amount ?? 0;
      const zeroDecimal = ["jpy", "krw", "vnd", "clp", "isk"].includes((pi.currency ?? "").toLowerCase());
      await confirmPayment(orderId, "stripe", pi.id, zeroDecimal ? minor : minor / 100, { event: event.type });
    } else if (orderId && event.type === "payment_intent.payment_failed") {
      await failPayment(orderId, "stripe", pi.id, pi.last_payment_error?.message ?? "Payment failed", {
        event: event.type,
      });
    }

    res.json({ received: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook error";
    await audit({
      action: "webhook.signature_rejected", gateway: "stripe", severity: "critical",
      detail: { error: msg }, ipAddress: req.ip ?? null,
    });
    res.status(400).json({ error: msg });
  }
});

// ─── PAYMOB ──────────────────────────────────────────────────────────────────

/** POST /api/payments/paymob/init */
router.post("/paymob/init", requireAuth, async (req, res) => {
  const result = await startCharge(req, res, "paymob");
  if (!result || result.kind !== "redirect") return;
  res.json({ iframeUrl: result.url, paymobOrderId: Number(result.gatewayRef) });
});

/** POST /api/payments/paymob/callback — HMAC is mandatory */
router.post("/paymob/callback", async (req, res) => {
  const secret = process.env["PAYMOB_HMAC_SECRET"];
  const data = (req.body ?? {}) as Record<string, unknown>;

  // Previously this check was skipped whenever the secret or the hmac field was
  // absent, which let anyone mark any order paid. It is now unconditional.
  if (!secret) {
    await audit({
      action: "webhook.rejected_unconfigured", gateway: "paymob", severity: "critical",
      detail: { reason: "PAYMOB_HMAC_SECRET is not set" }, ipAddress: req.ip ?? null,
    });
    res.status(503).json({ error: "Paymob callback verification is not configured" });
    return;
  }

  if (!data["hmac"] || !PaymobProvider.verifyHmac(data, secret)) {
    await audit({
      action: "webhook.forged_signature", gateway: "paymob", severity: "critical",
      detail: { hasHmac: Boolean(data["hmac"]), transactionId: data["id"] },
      ipAddress: req.ip ?? null,
    });
    res.status(400).json({ error: "HMAC verification failed" });
    return;
  }

  try {
    const orderObj = data["order"] as Record<string, unknown> | null;
    const paymobOrderId = String(orderObj?.["id"] ?? "");
    const transactionId = String(data["id"] ?? "");
    if (!paymobOrderId) { res.json({ received: true }); return; }

    const [dbOrder] = await db.select().from(ordersTable)
      .where(eq(ordersTable.paymentIntentId, paymobOrderId)).limit(1);
    if (!dbOrder) { res.json({ received: true }); return; }

    if (!(await claimEvent("paymob", transactionId || paymobOrderId, "callback", dbOrder.id, data))) {
      res.json({ received: true, duplicate: true });
      return;
    }

    const paidAmount = data["amount_cents"] !== undefined
      ? Number(data["amount_cents"]) / 100
      : null;

    if (data["success"] === true || data["success"] === "true") {
      await confirmPayment(dbOrder.id, "paymob", transactionId, paidAmount, data);
    } else {
      await failPayment(dbOrder.id, "paymob", transactionId, "Paymob reported failure", data);
    }

    res.json({ received: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Callback error";
    res.status(500).json({ error: msg });
  }
});

// ─── MYFATOORAH ──────────────────────────────────────────────────────────────

/** POST /api/payments/myfatoorah/init */
router.post("/myfatoorah/init", requireAuth, async (req, res) => {
  const result = await startCharge(req, res, "myfatoorah");
  if (!result || result.kind !== "redirect") return;
  res.json({ paymentUrl: result.url, invoiceId: Number(result.gatewayRef) });
});

/** GET /api/payments/myfatoorah/callback — status is re-fetched server-side */
router.get("/myfatoorah/callback", async (req, res) => {
  const paymentId = req.query["paymentId"] as string | undefined;
  if (!myfatoorahProvider.isConfigured() || !paymentId) {
    res.redirect("/?payment=error");
    return;
  }
  try {
    const status = await myfatoorahProvider.fetchStatus(paymentId);
    if (!status.invoiceId) { res.redirect("/?payment=error"); return; }

    const [dbOrder] = await db.select().from(ordersTable)
      .where(eq(ordersTable.paymentIntentId, status.invoiceId)).limit(1);
    if (!dbOrder) { res.redirect("/?payment=error"); return; }

    if (await claimEvent("myfatoorah", paymentId, "callback", dbOrder.id, { invoiceId: status.invoiceId })) {
      if (status.paid) {
        await confirmPayment(dbOrder.id, "myfatoorah", paymentId, status.amount, { invoiceId: status.invoiceId });
      } else {
        await failPayment(dbOrder.id, "myfatoorah", paymentId, "Invoice not paid", { invoiceId: status.invoiceId });
      }
    }

    res.redirect(`/orders/${dbOrder.id}?payment=${status.paid ? "success" : "failed"}`);
  } catch {
    res.redirect("/?payment=error");
  }
});

// ─── STATUS ──────────────────────────────────────────────────────────────────

/** GET /api/payments/status/:orderId */
router.get("/status/:orderId", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(String(req.params["orderId"]));
    const [order] = await db
      .select({
        id: ordersTable.id,
        userId: ordersTable.userId,
        paymentStatus: ordersTable.paymentStatus,
        paymentGateway: ordersTable.paymentGateway,
        status: ordersTable.status,
      })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (order.userId !== req.user!.userId && req.user!.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { userId: _userId, ...payload } = order;
    res.json(payload);
  } catch {
    res.status(500).json({ error: "Failed to fetch payment status" });
  }
});

export default router;
