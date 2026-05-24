import { Router, type Request } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── STRIPE ──────────────────────────────────────────────────────────────────

/** POST /api/payments/stripe/create-intent */
router.post("/stripe/create-intent", requireAuth, async (req, res) => {
  const STRIPE_SECRET_KEY = process.env["STRIPE_SECRET_KEY"];
  if (!STRIPE_SECRET_KEY) {
    res.status(503).json({ error: "Stripe is not configured. Please add STRIPE_SECRET_KEY." });
    return;
  }
  try {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const { orderId } = req.body as { orderId: number };
    if (!orderId) { res.status(400).json({ error: "orderId required" }); return; }

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (order.userId !== req.user!.userId) { res.status(403).json({ error: "Forbidden" }); return; }

    const amount = Math.round(parseFloat(order.total) * 100); // cents
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: (order.currency || "USD").toLowerCase(),
      metadata: { orderId: String(order.id), userId: String(order.userId) },
      automatic_payment_methods: { enabled: true },
      description: `Orbit Market Order #${order.id}`,
    });

    await updateOrderPayment(order.id, {
      paymentGateway: "stripe",
      paymentIntentId: pi.id,
      paymentStatus: "pending_payment",
    });

    res.json({ clientSecret: pi.client_secret, paymentIntentId: pi.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Stripe error";
    res.status(500).json({ error: msg });
  }
});

/** POST /api/payments/stripe/webhook — raw body, no auth */
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

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as { id: string; metadata: Record<string, string>; amount: number; currency: string };
      const orderId = parseInt(pi.metadata["orderId"] ?? "0");
      if (orderId) {
        await updateOrderPayment(orderId, {
          paymentStatus: "paid",
          status: "confirmed",
          paymentDetails: { stripePaymentIntentId: pi.id, amount: pi.amount, currency: pi.currency },
        });
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as { id: string; metadata: Record<string, string>; last_payment_error?: { message?: string } };
      const orderId = parseInt(pi.metadata["orderId"] ?? "0");
      if (orderId) {
        await updateOrderPayment(orderId, {
          paymentStatus: "failed",
          paymentDetails: { error: pi.last_payment_error?.message },
        });
      }
    }

    res.json({ received: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook error";
    res.status(400).json({ error: msg });
  }
});

// ─── PAYMOB ──────────────────────────────────────────────────────────────────

async function paymobAuthToken(apiKey: string): Promise<string> {
  const resp = await fetch("https://accept.paymob.com/api/auth/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  const data = await resp.json() as { token: string };
  return data.token;
}

/** POST /api/payments/paymob/init */
router.post("/paymob/init", requireAuth, async (req, res) => {
  const { PAYMOB_API_KEY, PAYMOB_INTEGRATION_ID, PAYMOB_IFRAME_ID } = process.env;
  if (!PAYMOB_API_KEY || !PAYMOB_INTEGRATION_ID || !PAYMOB_IFRAME_ID) {
    res.status(503).json({
      error: "Paymob not configured. Please add PAYMOB_API_KEY, PAYMOB_INTEGRATION_ID, and PAYMOB_IFRAME_ID.",
    });
    return;
  }
  try {
    const { orderId } = req.body as { orderId: number };
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (order.userId !== req.user!.userId) { res.status(403).json({ error: "Forbidden" }); return; }

    // Step 1: Auth token
    const authToken = await paymobAuthToken(PAYMOB_API_KEY);

    // Step 2: Register order with Paymob
    const amountCents = Math.round(parseFloat(order.total) * 100);
    const orderResp = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        amount_cents: amountCents,
        currency: "EGP",
        merchant_order_id: String(order.id),
        items: [],
      }),
    });
    const paymobOrder = await orderResp.json() as { id: number };

    // Step 3: Get payment key
    const addr = order.shippingAddress as Record<string, string>;
    const nameParts = (addr["fullName"] || "Customer User").split(" ");
    const pkResp = await fetch("https://accept.paymob.com/api/acceptance/payment_keys", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        amount_cents: amountCents,
        expiration: 3600,
        order_id: paymobOrder.id,
        billing_data: {
          apartment: "N/A",
          email: "customer@orbit.market",
          floor: "N/A",
          first_name: nameParts[0] || "Customer",
          last_name: nameParts.slice(1).join(" ") || "User",
          street: addr["addressLine1"] || "N/A",
          building: "N/A",
          phone_number: addr["phone"] || "+20000000000",
          shipping_method: "PKG",
          postal_code: addr["postalCode"] || "00000",
          city: addr["city"] || "Cairo",
          country: "EG",
          state: addr["state"] || "Cairo",
        },
        currency: "EGP",
        integration_id: parseInt(PAYMOB_INTEGRATION_ID),
        lock_order_when_paid: false,
      }),
    });
    const pkData = await pkResp.json() as { token: string };

    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${pkData.token}`;

    await updateOrderPayment(order.id, {
      paymentGateway: "paymob",
      paymentIntentId: String(paymobOrder.id),
      paymentStatus: "pending_payment",
    });

    res.json({ iframeUrl, paymobOrderId: paymobOrder.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Paymob error";
    res.status(500).json({ error: msg });
  }
});

/** POST /api/payments/paymob/callback — called by Paymob server */
router.post("/paymob/callback", async (req, res) => {
  const { PAYMOB_HMAC_SECRET } = process.env;
  try {
    const data = req.body as Record<string, unknown>;

    // HMAC verification
    if (PAYMOB_HMAC_SECRET && data["hmac"]) {
      const order = data["order"] as Record<string, unknown> | null;
      const sourceData = data["source_data"] as Record<string, unknown> | null;
      const hmacFields = [
        data["amount_cents"], data["created_at"], data["currency"], data["error_occured"],
        data["has_parent_transaction"], data["id"], data["integration_id"], data["is_3d_secure"],
        data["is_auth"], data["is_capture"], data["is_refunded"], data["is_standalone_payment"],
        data["is_voided"], order?.["id"], data["owner"], data["pending"],
        sourceData?.["pan"], sourceData?.["sub_type"], sourceData?.["type"], data["success"],
      ].map(v => String(v ?? "")).join("");

      const expected = crypto.createHmac("sha512", PAYMOB_HMAC_SECRET).update(hmacFields).digest("hex");
      if (data["hmac"] !== expected) {
        res.status(400).json({ error: "HMAC verification failed" });
        return;
      }
    }

    const orderObj = data["order"] as Record<string, unknown> | null;
    const paymobOrderId = String(orderObj?.["id"] ?? "");

    if (paymobOrderId) {
      const orders = await db.select().from(ordersTable).where(eq(ordersTable.paymentIntentId, paymobOrderId));
      if (orders.length > 0) {
        const dbOrder = orders[0]!;
        if (data["success"] === true || data["success"] === "true") {
          await updateOrderPayment(dbOrder.id, {
            paymentStatus: "paid",
            status: "confirmed",
            paymentDetails: { paymobTransactionId: data["id"], amount: data["amount_cents"] },
          });
        } else if (data["success"] === false || data["success"] === "false") {
          await updateOrderPayment(dbOrder.id, { paymentStatus: "failed" });
        }
      }
    }

    res.json({ received: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Callback error";
    res.status(500).json({ error: msg });
  }
});

// ─── MYFATOORAH ──────────────────────────────────────────────────────────────

const GULF_INFO: Record<string, { currency: string; mobileCode: string }> = {
  "Kuwait":                  { currency: "KWD", mobileCode: "+965" },
  "Saudi Arabia":            { currency: "SAR", mobileCode: "+966" },
  "United Arab Emirates":    { currency: "AED", mobileCode: "+971" },
  "UAE":                     { currency: "AED", mobileCode: "+971" },
  "Bahrain":                 { currency: "BHD", mobileCode: "+973" },
  "Qatar":                   { currency: "QAR", mobileCode: "+974" },
  "Oman":                    { currency: "OMR", mobileCode: "+968" },
};

/** POST /api/payments/myfatoorah/init */
router.post("/myfatoorah/init", requireAuth, async (req, res) => {
  const MYFATOORAH_API_KEY = process.env["MYFATOORAH_API_KEY"];
  const MF_BASE = process.env["MYFATOORAH_BASE_URL"] || "https://apitest.myfatoorah.com";

  if (!MYFATOORAH_API_KEY) {
    res.status(503).json({ error: "MyFatoorah not configured. Please add MYFATOORAH_API_KEY." });
    return;
  }
  try {
    const { orderId } = req.body as { orderId: number };
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (order.userId !== req.user!.userId) { res.status(403).json({ error: "Forbidden" }); return; }

    const addr = order.shippingAddress as Record<string, string>;
    const gulfInfo = GULF_INFO[addr["country"] ?? ""] ?? { currency: "SAR", mobileCode: "+966" };

    const proto = (req.headers["x-forwarded-proto"] as string) || "https";
    const host = (req.headers["x-forwarded-host"] as string) || (req.headers["host"] as string) || "localhost:8080";
    const appOrigin = `${proto}://${host}`;
    const callbackUrl = `${appOrigin}/api/payments/myfatoorah/callback`;

    const resp = await fetch(`${MF_BASE}/v2/ExecutePayment`, {
      method: "POST",
      headers: { Authorization: `Bearer ${MYFATOORAH_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        PaymentMethodId: 0,
        CustomerName: addr["fullName"] || "Customer",
        DisplayCurrencyIso: gulfInfo.currency,
        MobileCountryCode: gulfInfo.mobileCode,
        CustomerMobile: addr["phone"] || `${gulfInfo.mobileCode}500000000`,
        CustomerEmail: "customer@orbit.market",
        InvoiceValue: parseFloat(order.total),
        CallBackUrl: callbackUrl,
        ErrorUrl: callbackUrl,
        Language: "en",
        CustomerReference: String(order.id),
        InvoiceItems: [{
          ItemName: `Orbit Market Order #${order.id}`,
          Quantity: 1,
          UnitPrice: parseFloat(order.total),
        }],
      }),
    });

    const data = await resp.json() as { IsSuccess: boolean; Message?: string; Data?: { InvoiceId: number; InvoiceURL: string } };
    if (!data.IsSuccess) {
      res.status(400).json({ error: data.Message || "MyFatoorah error" });
      return;
    }

    await updateOrderPayment(order.id, {
      paymentGateway: "myfatoorah",
      paymentIntentId: String(data.Data!.InvoiceId),
      paymentStatus: "pending_payment",
    });

    res.json({ paymentUrl: data.Data!.InvoiceURL, invoiceId: data.Data!.InvoiceId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "MyFatoorah error";
    res.status(500).json({ error: msg });
  }
});

/** GET /api/payments/myfatoorah/callback — redirect after payment */
router.get("/myfatoorah/callback", async (req, res) => {
  const MYFATOORAH_API_KEY = process.env["MYFATOORAH_API_KEY"];
  const MF_BASE = process.env["MYFATOORAH_BASE_URL"] || "https://apitest.myfatoorah.com";

  const paymentId = req.query["paymentId"] as string | undefined;
  if (!MYFATOORAH_API_KEY || !paymentId) {
    res.redirect("/?payment=error");
    return;
  }
  try {
    const resp = await fetch(`${MF_BASE}/v2/GetPaymentStatus`, {
      method: "POST",
      headers: { Authorization: `Bearer ${MYFATOORAH_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ Key: paymentId, KeyType: "PaymentId" }),
    });

    const data = await resp.json() as { IsSuccess: boolean; Data?: { InvoiceId: number; InvoiceStatus: string } };
    const invoiceId = String(data.Data?.InvoiceId ?? "");

    if (invoiceId) {
      const orders = await db.select().from(ordersTable).where(eq(ordersTable.paymentIntentId, invoiceId));
      if (orders.length > 0) {
        const dbOrder = orders[0]!;
        if (data.Data?.InvoiceStatus === "Paid") {
          await updateOrderPayment(dbOrder.id, {
            paymentStatus: "paid",
            status: "confirmed",
            paymentDetails: { myFatoorahPaymentId: paymentId, invoiceId },
          });
          res.redirect(`/orders/${dbOrder.id}?payment=success`);
          return;
        } else {
          await updateOrderPayment(dbOrder.id, { paymentStatus: "failed" });
          res.redirect(`/orders/${dbOrder.id}?payment=failed`);
          return;
        }
      }
    }
    res.redirect("/?payment=error");
  } catch {
    res.redirect("/?payment=error");
  }
});

// ─── GENERAL STATUS ───────────────────────────────────────────────────────────

/** GET /api/payments/status/:orderId */
router.get("/status/:orderId", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params["orderId"]!);
    const [order] = await db
      .select({
        id: ordersTable.id,
        paymentStatus: ordersTable.paymentStatus,
        paymentGateway: ordersTable.paymentGateway,
        status: ordersTable.status,
      })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    res.json(order);
  } catch {
    res.status(500).json({ error: "Failed to fetch payment status" });
  }
});

export default router;
