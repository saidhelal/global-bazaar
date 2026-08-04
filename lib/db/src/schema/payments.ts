import {
  pgTable, serial, text, timestamp, pgEnum, boolean, integer, numeric, jsonb, uniqueIndex, index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { ordersTable } from "./orders";

// ─── Enums ───────────────────────────────────────────────────────────────────

/**
 * Ledger entry kinds. Money always moves through one of these, and an entry is
 * never updated — a correction is a new entry of the opposite sign.
 */
export const transactionTypeEnum = pgEnum("transaction_type", [
  "charge",      // customer -> platform
  "refund",      // platform -> customer
  "payout",      // platform -> vendor
  "commission",  // platform's cut, recorded against a vendor's earnings
  "adjustment",  // manual correction, always paired with a reason
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending", "succeeded", "failed", "cancelled",
]);

export const refundStatusEnum = pgEnum("refund_status", [
  "requested", "approved", "processing", "refunded", "rejected", "failed",
]);

export const settlementStatusEnum = pgEnum("settlement_status", [
  "accrued",        // earned, still in escrow (order not yet delivered/settled)
  "pending_payout", // released, awaiting transfer
  "paid",
  "on_hold",
]);

export const couponTypeEnum = pgEnum("coupon_type", ["percent", "fixed"]);

// ─── Ledger ──────────────────────────────────────────────────────────────────

/**
 * The financial ledger. Append-only by contract: services must never UPDATE a
 * row here. Balances are derived by summing entries, never stored, so the
 * ledger can always be reconciled against gateway statements.
 */
export const paymentTransactionsTable = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => ordersTable.id, { onDelete: "restrict" }),
  vendorId: integer("vendor_id").references(() => usersTable.id, { onDelete: "set null" }),
  type: transactionTypeEnum("type").notNull(),
  status: transactionStatusEnum("status").notNull().default("pending"),
  gateway: text("gateway").notNull(),
  /** Gateway's own identifier (PaymentIntent id, Paymob order id, invoice id). */
  gatewayRef: text("gateway_ref"),
  /** Signed amount in `currency`: positive = money in, negative = money out. */
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  /** Rate to the platform's base currency at the time of the entry. */
  fxRate: numeric("fx_rate", { precision: 18, scale: 8 }).default("1"),
  baseAmount: numeric("base_amount", { precision: 14, scale: 2 }),
  /** Untouched gateway payload, kept for dispute resolution and audit. */
  rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>(),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("payment_transactions_order_idx").on(t.orderId),
  index("payment_transactions_vendor_idx").on(t.vendorId),
  index("payment_transactions_gateway_ref_idx").on(t.gateway, t.gatewayRef),
]);

/**
 * Webhook de-duplication. The unique index is the idempotency guarantee: a
 * replayed gateway event fails to insert, so the handler skips reprocessing.
 */
export const paymentEventsTable = pgTable("payment_events", {
  id: serial("id").primaryKey(),
  gateway: text("gateway").notNull(),
  eventId: text("event_id").notNull(),
  eventType: text("event_type"),
  orderId: integer("order_id").references(() => ordersTable.id, { onDelete: "set null" }),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("payment_events_gateway_event_idx").on(t.gateway, t.eventId),
]);

// ─── Refunds ─────────────────────────────────────────────────────────────────

export const refundsTable = pgTable("refunds", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "restrict" }),
  transactionId: integer("transaction_id").references(() => paymentTransactionsTable.id, { onDelete: "set null" }),
  /** Partial refunds are supported: amount may be less than the order total. */
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  reason: text("reason"),
  status: refundStatusEnum("status").notNull().default("requested"),
  gateway: text("gateway"),
  gatewayRef: text("gateway_ref"),
  requestedBy: integer("requested_by").references(() => usersTable.id, { onDelete: "set null" }),
  approvedBy: integer("approved_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [index("refunds_order_idx").on(t.orderId)]);

// ─── Vendor settlement (escrow-ready) ────────────────────────────────────────

/**
 * A payout batch for one vendor. Earnings accrue per order item and are held
 * ("accrued") until released, which is what makes the model escrow-ready even
 * though no gateway split-payment is used yet.
 */
export const vendorSettlementsTable = pgTable("vendor_settlements", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  grossAmount: numeric("gross_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  commissionAmount: numeric("commission_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  refundedAmount: numeric("refunded_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  netAmount: numeric("net_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  status: settlementStatusEnum("status").notNull().default("accrued"),
  payoutRef: text("payout_ref"),
  notes: text("notes"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [index("vendor_settlements_vendor_idx").on(t.vendorId)]);

/** One line per order item included in a settlement — the audit trail. */
export const settlementItemsTable = pgTable("settlement_items", {
  id: serial("id").primaryKey(),
  settlementId: integer("settlement_id").references(() => vendorSettlementsTable.id, { onDelete: "cascade" }),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "restrict" }),
  orderItemId: integer("order_item_id").notNull(),
  vendorId: integer("vendor_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  grossAmount: numeric("gross_amount", { precision: 14, scale: 2 }).notNull(),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  commissionAmount: numeric("commission_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  netAmount: numeric("net_amount", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  status: settlementStatusEnum("status").notNull().default("accrued"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("settlement_items_vendor_idx").on(t.vendorId),
  index("settlement_items_settlement_idx").on(t.settlementId),
  uniqueIndex("settlement_items_order_item_idx").on(t.orderItemId),
]);

// ─── Coupons ─────────────────────────────────────────────────────────────────

export const couponsTable = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  type: couponTypeEnum("type").notNull(),
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency"),
  minSubtotal: numeric("min_subtotal", { precision: 12, scale: 2 }).default("0"),
  maxDiscount: numeric("max_discount", { precision: 12, scale: 2 }),
  maxUses: integer("max_uses"),
  maxUsesPerUser: integer("max_uses_per_user").default(1),
  usedCount: integer("used_count").notNull().default(0),
  validFrom: timestamp("valid_from"),
  validTo: timestamp("valid_to"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("coupons_code_idx").on(t.code)]);

export const couponRedemptionsTable = pgTable("coupon_redemptions", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").notNull().references(() => couponsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  orderId: integer("order_id").references(() => ordersTable.id, { onDelete: "cascade" }),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("coupon_redemptions_coupon_idx").on(t.couponId),
  uniqueIndex("coupon_redemptions_order_idx").on(t.orderId),
]);

// ─── Tax ─────────────────────────────────────────────────────────────────────

/**
 * Jurisdiction-based tax. Resolution order is most-specific first:
 * country+state, then country, then the global fallback (country = "*").
 */
export const taxRulesTable = pgTable("tax_rules", {
  id: serial("id").primaryKey(),
  country: text("country").notNull(),
  state: text("state"),
  name: text("name").notNull().default("VAT"),
  nameAr: text("name_ar"),
  rate: numeric("rate", { precision: 6, scale: 4 }).notNull(),
  appliesToShipping: boolean("applies_to_shipping").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [index("tax_rules_country_idx").on(t.country, t.state)]);

// ─── Invoices ────────────────────────────────────────────────────────────────

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "restrict" }),
  /** Human-facing sequential number, e.g. INV-2026-000123. */
  number: text("number").notNull(),
  currency: text("currency").notNull(),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  shippingAmount: numeric("shipping_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
  /** Frozen snapshot: an invoice must not change when products or rules do. */
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>(),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("invoices_number_idx").on(t.number),
  uniqueIndex("invoices_order_idx").on(t.orderId),
]);

// ─── Audit ───────────────────────────────────────────────────────────────────

/**
 * Security audit trail for financial actions, including rejected webhook
 * attempts (forged HMAC, amount mismatch) which are otherwise invisible.
 */
export const paymentAuditLogTable = pgTable("payment_audit_log", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  actorId: integer("actor_id").references(() => usersTable.id, { onDelete: "set null" }),
  orderId: integer("order_id").references(() => ordersTable.id, { onDelete: "set null" }),
  gateway: text("gateway"),
  severity: text("severity").notNull().default("info"),
  detail: jsonb("detail").$type<Record<string, unknown>>(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("payment_audit_action_idx").on(t.action),
  index("payment_audit_order_idx").on(t.orderId),
]);

// ─── Types ───────────────────────────────────────────────────────────────────

export type PaymentTransaction = typeof paymentTransactionsTable.$inferSelect;
export type PaymentEvent = typeof paymentEventsTable.$inferSelect;
export type Refund = typeof refundsTable.$inferSelect;
export type VendorSettlement = typeof vendorSettlementsTable.$inferSelect;
export type SettlementItem = typeof settlementItemsTable.$inferSelect;
export type Coupon = typeof couponsTable.$inferSelect;
export type CouponRedemption = typeof couponRedemptionsTable.$inferSelect;
export type TaxRule = typeof taxRulesTable.$inferSelect;
export type Invoice = typeof invoicesTable.$inferSelect;
export type PaymentAuditEntry = typeof paymentAuditLogTable.$inferSelect;
