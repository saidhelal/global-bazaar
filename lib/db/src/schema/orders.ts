import { pgTable, serial, text, timestamp, pgEnum, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const orderStatusEnum = pgEnum("order_status", [
  "pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded",
]);

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  status: orderStatusEnum("status").notNull().default("pending"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  shippingCost: numeric("shipping_cost", { precision: 12, scale: 2 }).default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("USD").notNull(),
  shippingAddress: jsonb("shipping_address").$type<{
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  }>().notNull(),
  paymentMethod: text("payment_method").default("cod").notNull(),
  paymentStatus: text("payment_status").default("pending_payment").notNull(),
  paymentGateway: text("payment_gateway").default("cod").notNull(),
  paymentIntentId: text("payment_intent_id"),
  paymentDetails: jsonb("payment_details").$type<Record<string, unknown>>(),
  // Nullable/defaulted so existing rows stay valid: the discount is resolved
  // server-side by PricingService, never supplied by the client.
  couponId: integer("coupon_id"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull(),
  vendorId: integer("vendor_id").notNull(),
  title: text("title").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  image: text("image"),
});

export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
