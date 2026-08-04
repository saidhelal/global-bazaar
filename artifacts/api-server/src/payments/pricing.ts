/**
 * PricingService — the single source of truth for money.
 *
 * Every figure on an order (unit price, discount, coupon, tax, shipping, total)
 * is derived here from the database. Nothing a client sends is trusted: the
 * caller supplies product ids and quantities only. This closes the price
 * tampering hole where the order total was computed from client-supplied
 * prices.
 */
import { db } from "@workspace/db";
import {
  productsTable,
  couponsTable,
  couponRedemptionsTable,
  taxRulesTable,
  shippingZonesTable,
  shippingRatesTable,
} from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";

export interface PricingRequestItem {
  productId: number;
  quantity: number;
}

export interface PricingRequest {
  items: PricingRequestItem[];
  country: string;
  state?: string | undefined;
  couponCode?: string | undefined;
  userId?: number | undefined;
}

export interface PricedItem {
  productId: number;
  vendorId: number;
  title: string;
  /** Effective unit price after the product's own discountPercent. */
  price: number;
  quantity: number;
  subtotal: number;
  image: string | null;
}

export interface PricingResult {
  items: PricedItem[];
  currency: string;
  subtotal: number;
  discountAmount: number;
  couponId: number | null;
  couponCode: string | null;
  shippingCost: number;
  taxAmount: number;
  taxName: string;
  taxRate: number;
  total: number;
}

export class PricingError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "PricingError";
  }
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Default commission rate applied to vendor earnings, overridable per env. */
export function platformCommissionRate(): number {
  const raw = Number(process.env["PLATFORM_COMMISSION_RATE"] ?? "10");
  return Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : 10;
}

/**
 * Resolves a tax rule most-specific-first: country+state, then country, then
 * the wildcard row ("*"). Returns a zero rule when nothing matches, so a
 * missing configuration never silently invents tax.
 */
async function resolveTaxRule(country: string, state?: string) {
  const active = eq(taxRulesTable.isActive, true);

  if (state) {
    const [withState] = await db.select().from(taxRulesTable)
      .where(and(active, eq(taxRulesTable.country, country), eq(taxRulesTable.state, state)))
      .limit(1);
    if (withState) return withState;
  }

  const [byCountry] = await db.select().from(taxRulesTable)
    .where(and(active, eq(taxRulesTable.country, country), sql`${taxRulesTable.state} is null`))
    .limit(1);
  if (byCountry) return byCountry;

  const [wildcard] = await db.select().from(taxRulesTable)
    .where(and(active, eq(taxRulesTable.country, "*")))
    .limit(1);
  return wildcard ?? null;
}

/**
 * Shipping comes from the configured zones/rates tables. When no zone covers
 * the destination the order is still priced (shipping = 0) rather than failing,
 * matching the previous behaviour of always producing a total.
 */
async function resolveShipping(country: string, subtotal: number): Promise<number> {
  const zones = await db.select().from(shippingZonesTable).where(eq(shippingZonesTable.isActive, true));
  const zone = zones.find((z) => (z.countries ?? []).includes(country));
  if (!zone) return 0;

  const [rate] = await db.select().from(shippingRatesTable)
    .where(and(eq(shippingRatesTable.zoneId, zone.id), eq(shippingRatesTable.isActive, true)))
    .limit(1);
  if (!rate) return 0;

  const threshold = rate.freeThreshold !== null ? parseFloat(rate.freeThreshold) : null;
  if (threshold !== null && subtotal >= threshold) return 0;
  return round2(parseFloat(rate.baseFee));
}

/**
 * Validates a coupon and returns the discount it grants. Throws for an invalid
 * code so the caller can surface a precise reason instead of silently charging
 * full price.
 */
async function resolveCoupon(
  code: string,
  subtotal: number,
  currency: string,
  userId: number | undefined,
): Promise<{ id: number; code: string; discount: number }> {
  const normalized = code.trim().toUpperCase();
  const [coupon] = await db.select().from(couponsTable)
    .where(eq(couponsTable.code, normalized)).limit(1);

  if (!coupon || !coupon.isActive) {
    throw new PricingError("Coupon is not valid", "COUPON_INVALID");
  }

  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) {
    throw new PricingError("Coupon is not active yet", "COUPON_NOT_STARTED");
  }
  if (coupon.validTo && now > coupon.validTo) {
    throw new PricingError("Coupon has expired", "COUPON_EXPIRED");
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new PricingError("Coupon usage limit reached", "COUPON_EXHAUSTED");
  }
  if (coupon.currency && coupon.currency !== currency) {
    throw new PricingError("Coupon does not apply to this currency", "COUPON_CURRENCY");
  }

  const minSubtotal = coupon.minSubtotal ? parseFloat(coupon.minSubtotal) : 0;
  if (subtotal < minSubtotal) {
    throw new PricingError(`Order must be at least ${minSubtotal} to use this coupon`, "COUPON_MIN_SUBTOTAL");
  }

  if (userId !== undefined && coupon.maxUsesPerUser !== null) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(couponRedemptionsTable)
      .where(and(eq(couponRedemptionsTable.couponId, coupon.id), eq(couponRedemptionsTable.userId, userId)));
    if (count >= coupon.maxUsesPerUser) {
      throw new PricingError("You have already used this coupon", "COUPON_USER_LIMIT");
    }
  }

  let discount = coupon.type === "percent"
    ? subtotal * (parseFloat(coupon.value) / 100)
    : parseFloat(coupon.value);

  if (coupon.maxDiscount) discount = Math.min(discount, parseFloat(coupon.maxDiscount));
  discount = Math.min(round2(discount), subtotal); // never exceed the subtotal

  return { id: coupon.id, code: coupon.code, discount };
}

/**
 * Prices an order from scratch. The returned items carry authoritative prices
 * and are what must be persisted — never the client's version.
 */
export async function priceOrder(req: PricingRequest): Promise<PricingResult> {
  if (req.items.length === 0) {
    throw new PricingError("Order must contain at least one item", "EMPTY_ORDER");
  }

  const priced: PricedItem[] = [];
  let currency: string | null = null;

  for (const line of req.items) {
    const [product] = await db.select().from(productsTable)
      .where(eq(productsTable.id, line.productId)).limit(1);

    if (!product) {
      throw new PricingError(`Product ${line.productId} not found`, "PRODUCT_NOT_FOUND");
    }
    if (product.status !== "approved") {
      throw new PricingError(`Product "${product.title}" is not available`, "PRODUCT_UNAVAILABLE");
    }
    if (product.stock < line.quantity) {
      throw new PricingError(`Insufficient stock for "${product.title}"`, "INSUFFICIENT_STOCK");
    }

    // Mixed-currency baskets cannot be charged as one amount by any of the
    // configured gateways, so reject rather than silently mis-charge.
    if (currency === null) currency = product.currency;
    else if (currency !== product.currency) {
      throw new PricingError("All items in an order must share one currency", "MIXED_CURRENCY");
    }

    const base = parseFloat(product.price);
    const pct = product.discountPercent ?? 0;
    const unit = round2(pct > 0 ? base * (1 - pct / 100) : base);

    priced.push({
      productId: product.id,
      vendorId: product.vendorId,
      title: product.title,
      price: unit,
      quantity: line.quantity,
      subtotal: round2(unit * line.quantity),
      image: product.coverImage ?? (product.images ?? [])[0] ?? null,
    });
  }

  const resolvedCurrency = currency ?? "USD";
  const subtotal = round2(priced.reduce((s, i) => s + i.subtotal, 0));

  let discountAmount = 0;
  let couponId: number | null = null;
  let couponCode: string | null = null;
  if (req.couponCode) {
    const c = await resolveCoupon(req.couponCode, subtotal, resolvedCurrency, req.userId);
    discountAmount = c.discount;
    couponId = c.id;
    couponCode = c.code;
  }

  const discountedSubtotal = round2(subtotal - discountAmount);
  const shippingCost = await resolveShipping(req.country, discountedSubtotal);

  const taxRule = await resolveTaxRule(req.country, req.state);
  const taxRate = taxRule ? parseFloat(taxRule.rate) : 0;
  const taxBase = taxRule?.appliesToShipping ? discountedSubtotal + shippingCost : discountedSubtotal;
  const taxAmount = round2(taxBase * taxRate);

  return {
    items: priced,
    currency: resolvedCurrency,
    subtotal,
    discountAmount,
    couponId,
    couponCode,
    shippingCost,
    taxAmount,
    taxName: taxRule?.name ?? "Tax",
    taxRate,
    total: round2(discountedSubtotal + shippingCost + taxAmount),
  };
}
