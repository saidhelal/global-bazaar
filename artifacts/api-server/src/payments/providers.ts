/**
 * Payment provider abstraction.
 *
 * Adding a gateway means implementing PaymentProvider and registering it here —
 * no route, service or schema change. Each provider declares the currencies it
 * can actually settle, which is what stops an order being charged in a currency
 * the gateway does not support (the previous code hardcoded EGP for Paymob and
 * derived MyFatoorah's currency from the shipping country).
 */
import crypto from "crypto";

export interface ChargeContext {
  orderId: number;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: Record<string, string>;
  /** Absolute origin of the running app, used to build callback URLs. */
  appOrigin: string;
}

export type ChargeResult =
  | { kind: "client_secret"; clientSecret: string; gatewayRef: string }
  | { kind: "redirect"; url: string; gatewayRef: string }
  | { kind: "offline"; gatewayRef: string };

export interface RefundResult {
  gatewayRef: string | null;
  /** "refunded" when the gateway settled it synchronously. */
  status: "refunded" | "processing";
}

export interface PaymentProvider {
  readonly id: string;
  /** False when required credentials are absent; the route answers 503. */
  isConfigured(): boolean;
  supportsCurrency(currency: string): boolean;
  createCharge(ctx: ChargeContext): Promise<ChargeResult>;
  /** Throws NotSupported when the gateway has no refund API wired up. */
  refund(gatewayRef: string, amount: number, currency: string): Promise<RefundResult>;
}

export class ProviderError extends Error {
  constructor(message: string, readonly code: string, readonly httpStatus = 400) {
    super(message);
    this.name = "ProviderError";
  }
}

const upper = (c: string): string => c.trim().toUpperCase();

// ─── Stripe ──────────────────────────────────────────────────────────────────

/** Zero-decimal currencies must not be multiplied by 100. */
const STRIPE_ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "CLP", "ISK", "XOF", "XAF"]);

const STRIPE_CURRENCIES = new Set([
  "USD", "EUR", "GBP", "AED", "SAR", "EGP", "KWD", "BHD", "QAR", "OMR",
  "JOD", "CAD", "AUD", "CHF", "SEK", "NOK", "DKK", "JPY", "TRY", "INR",
]);

class StripeProvider implements PaymentProvider {
  readonly id = "stripe";

  isConfigured(): boolean {
    return Boolean(process.env["STRIPE_SECRET_KEY"]);
  }

  supportsCurrency(currency: string): boolean {
    return STRIPE_CURRENCIES.has(upper(currency));
  }

  private async client() {
    const { default: Stripe } = await import("stripe");
    return new Stripe(process.env["STRIPE_SECRET_KEY"]!);
  }

  static toMinorUnits(amount: number, currency: string): number {
    return STRIPE_ZERO_DECIMAL.has(upper(currency))
      ? Math.round(amount)
      : Math.round(amount * 100);
  }

  async createCharge(ctx: ChargeContext): Promise<ChargeResult> {
    const stripe = await this.client();
    const pi = await stripe.paymentIntents.create({
      amount: StripeProvider.toMinorUnits(ctx.amount, ctx.currency),
      currency: ctx.currency.toLowerCase(),
      receipt_email: ctx.customerEmail,
      metadata: { orderId: String(ctx.orderId) },
      automatic_payment_methods: { enabled: true },
      description: `Orbit Market Order #${ctx.orderId}`,
    });
    return { kind: "client_secret", clientSecret: pi.client_secret!, gatewayRef: pi.id };
  }

  async refund(gatewayRef: string, amount: number, currency: string): Promise<RefundResult> {
    const stripe = await this.client();
    const r = await stripe.refunds.create({
      payment_intent: gatewayRef,
      amount: StripeProvider.toMinorUnits(amount, currency),
    });
    return { gatewayRef: r.id, status: r.status === "succeeded" ? "refunded" : "processing" };
  }
}

// ─── Paymob ──────────────────────────────────────────────────────────────────

class PaymobProvider implements PaymentProvider {
  readonly id = "paymob";

  isConfigured(): boolean {
    return Boolean(
      process.env["PAYMOB_API_KEY"] &&
      process.env["PAYMOB_INTEGRATION_ID"] &&
      process.env["PAYMOB_IFRAME_ID"],
    );
  }

  /** Paymob Accept settles Egyptian pounds only. */
  supportsCurrency(currency: string): boolean {
    return upper(currency) === "EGP";
  }

  private async authToken(): Promise<string> {
    const resp = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: process.env["PAYMOB_API_KEY"] }),
    });
    const data = (await resp.json()) as { token?: string };
    if (!data.token) throw new ProviderError("Paymob authentication failed", "PAYMOB_AUTH", 502);
    return data.token;
  }

  async createCharge(ctx: ChargeContext): Promise<ChargeResult> {
    const token = await this.authToken();
    const amountCents = Math.round(ctx.amount * 100);

    const orderResp = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        amount_cents: amountCents,
        currency: upper(ctx.currency),
        merchant_order_id: `${ctx.orderId}-${Date.now()}`,
        items: [],
      }),
    });
    const paymobOrder = (await orderResp.json()) as { id?: number };
    if (!paymobOrder.id) throw new ProviderError("Paymob order registration failed", "PAYMOB_ORDER", 502);

    const nameParts = (ctx.customerName || "Customer User").split(" ");
    const pkResp = await fetch("https://accept.paymob.com/api/acceptance/payment_keys", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        amount_cents: amountCents,
        expiration: 3600,
        order_id: paymobOrder.id,
        billing_data: {
          apartment: "N/A",
          email: ctx.customerEmail,
          floor: "N/A",
          first_name: nameParts[0] || "Customer",
          last_name: nameParts.slice(1).join(" ") || "User",
          street: ctx.address["addressLine1"] || "N/A",
          building: "N/A",
          phone_number: ctx.customerPhone || "+20000000000",
          shipping_method: "PKG",
          postal_code: ctx.address["postalCode"] || "00000",
          city: ctx.address["city"] || "Cairo",
          country: "EG",
          state: ctx.address["state"] || "Cairo",
        },
        currency: upper(ctx.currency),
        integration_id: parseInt(process.env["PAYMOB_INTEGRATION_ID"]!),
        lock_order_when_paid: false,
      }),
    });
    const pk = (await pkResp.json()) as { token?: string };
    if (!pk.token) throw new ProviderError("Paymob payment key failed", "PAYMOB_KEY", 502);

    return {
      kind: "redirect",
      url: `https://accept.paymob.com/api/acceptance/iframes/${process.env["PAYMOB_IFRAME_ID"]}?payment_token=${pk.token}`,
      gatewayRef: String(paymobOrder.id),
    };
  }

  async refund(): Promise<RefundResult> {
    throw new ProviderError(
      "Paymob refunds are processed manually from the Paymob dashboard",
      "REFUND_MANUAL",
      501,
    );
  }

  /**
   * Recomputes Paymob's HMAC over the documented field set. Verification is
   * mandatory: a callback without a valid HMAC is rejected.
   */
  static verifyHmac(data: Record<string, unknown>, secret: string): boolean {
    const order = data["order"] as Record<string, unknown> | null;
    const src = data["source_data"] as Record<string, unknown> | null;
    const fields = [
      data["amount_cents"], data["created_at"], data["currency"], data["error_occured"],
      data["has_parent_transaction"], data["id"], data["integration_id"], data["is_3d_secure"],
      data["is_auth"], data["is_capture"], data["is_refunded"], data["is_standalone_payment"],
      data["is_voided"], order?.["id"], data["owner"], data["pending"],
      src?.["pan"], src?.["sub_type"], src?.["type"], data["success"],
    ].map((v) => String(v ?? "")).join("");

    const expected = crypto.createHmac("sha512", secret).update(fields).digest("hex");
    const received = String(data["hmac"] ?? "");
    if (received.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  }
}

// ─── MyFatoorah ──────────────────────────────────────────────────────────────

const MYFATOORAH_CURRENCIES = new Set(["KWD", "SAR", "AED", "BHD", "QAR", "OMR", "JOD", "EGP", "USD"]);

class MyFatoorahProvider implements PaymentProvider {
  readonly id = "myfatoorah";

  isConfigured(): boolean {
    return Boolean(process.env["MYFATOORAH_API_KEY"]);
  }

  supportsCurrency(currency: string): boolean {
    return MYFATOORAH_CURRENCIES.has(upper(currency));
  }

  private base(): string {
    return process.env["MYFATOORAH_BASE_URL"] || "https://apitest.myfatoorah.com";
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${process.env["MYFATOORAH_API_KEY"]}`,
      "Content-Type": "application/json",
    };
  }

  async createCharge(ctx: ChargeContext): Promise<ChargeResult> {
    const callbackUrl = `${ctx.appOrigin}/api/payments/myfatoorah/callback`;
    const resp = await fetch(`${this.base()}/v2/ExecutePayment`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        PaymentMethodId: 0,
        CustomerName: ctx.customerName || "Customer",
        // Driven by the order's currency, not the shipping country.
        DisplayCurrencyIso: upper(ctx.currency),
        CustomerMobile: ctx.customerPhone || undefined,
        CustomerEmail: ctx.customerEmail,
        InvoiceValue: ctx.amount,
        CallBackUrl: callbackUrl,
        ErrorUrl: callbackUrl,
        Language: "en",
        CustomerReference: String(ctx.orderId),
        InvoiceItems: [{
          ItemName: `Orbit Market Order #${ctx.orderId}`,
          Quantity: 1,
          UnitPrice: ctx.amount,
        }],
      }),
    });

    const data = (await resp.json()) as {
      IsSuccess: boolean; Message?: string; Data?: { InvoiceId: number; InvoiceURL: string };
    };
    if (!data.IsSuccess || !data.Data) {
      throw new ProviderError(data.Message || "MyFatoorah rejected the request", "MYFATOORAH_INIT", 502);
    }
    return { kind: "redirect", url: data.Data.InvoiceURL, gatewayRef: String(data.Data.InvoiceId) };
  }

  async refund(): Promise<RefundResult> {
    throw new ProviderError(
      "MyFatoorah refunds are processed manually from the MyFatoorah portal",
      "REFUND_MANUAL",
      501,
    );
  }

  /** Server-side status check — never trust the browser redirect. */
  async fetchStatus(paymentId: string): Promise<{ invoiceId: string; paid: boolean; amount: number | null }> {
    const resp = await fetch(`${this.base()}/v2/GetPaymentStatus`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ Key: paymentId, KeyType: "PaymentId" }),
    });
    const data = (await resp.json()) as {
      IsSuccess: boolean;
      Data?: { InvoiceId: number; InvoiceStatus: string; InvoiceValue?: number };
    };
    return {
      invoiceId: String(data.Data?.InvoiceId ?? ""),
      paid: data.Data?.InvoiceStatus === "Paid",
      amount: data.Data?.InvoiceValue ?? null,
    };
  }
}

// ─── Cash on delivery ────────────────────────────────────────────────────────

class CodProvider implements PaymentProvider {
  readonly id = "cod";
  isConfigured(): boolean { return true; }
  supportsCurrency(): boolean { return true; }

  async createCharge(ctx: ChargeContext): Promise<ChargeResult> {
    return { kind: "offline", gatewayRef: `cod-${ctx.orderId}` };
  }

  async refund(gatewayRef: string): Promise<RefundResult> {
    // Nothing was captured electronically; the ledger entry is the record.
    return { gatewayRef, status: "refunded" };
  }
}

// ─── Registry ────────────────────────────────────────────────────────────────

export const stripeProvider = new StripeProvider();
export const paymobProvider = new PaymobProvider();
export const myfatoorahProvider = new MyFatoorahProvider();
export const codProvider = new CodProvider();

const REGISTRY = new Map<string, PaymentProvider>([
  [stripeProvider.id, stripeProvider],
  [paymobProvider.id, paymobProvider],
  [myfatoorahProvider.id, myfatoorahProvider],
  [codProvider.id, codProvider],
]);

export function getProvider(id: string): PaymentProvider {
  const p = REGISTRY.get(id);
  if (!p) throw new ProviderError(`Unknown payment gateway "${id}"`, "UNKNOWN_GATEWAY", 400);
  return p;
}

export function listProviders(): PaymentProvider[] {
  return [...REGISTRY.values()];
}

export { PaymobProvider, MyFatoorahProvider, StripeProvider };
