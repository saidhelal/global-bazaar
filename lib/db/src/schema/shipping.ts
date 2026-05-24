import { pgTable, serial, text, timestamp, pgEnum, boolean, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { ordersTable } from "./orders";

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "created",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed_delivery",
  "returned",
]);

export const shippingZonesTable = pgTable("shipping_zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  countries: jsonb("countries").$type<string[]>().notNull().default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const shippingRatesTable = pgTable("shipping_rates", {
  id: serial("id").primaryKey(),
  zoneId: integer("zone_id").notNull().references(() => shippingZonesTable.id, { onDelete: "cascade" }),
  carrier: text("carrier").notNull().default("Standard"),
  baseFee: numeric("base_fee", { precision: 10, scale: 2 }).notNull(),
  freeThreshold: numeric("free_threshold", { precision: 10, scale: 2 }),
  minDays: integer("min_days").notNull().default(3),
  maxDays: integer("max_days").notNull().default(7),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const shipmentsTable = pgTable("shipments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  vendorId: integer("vendor_id").notNull(),
  trackingNumber: text("tracking_number").notNull().unique(),
  carrier: text("carrier").notNull().default("Standard"),
  status: shipmentStatusEnum("status").notNull().default("created"),
  estimatedDelivery: timestamp("estimated_delivery"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const shipmentEventsTable = pgTable("shipment_events", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull().references(() => shipmentsTable.id, { onDelete: "cascade" }),
  status: shipmentStatusEnum("status").notNull(),
  location: text("location"),
  locationAr: text("location_ar"),
  description: text("description"),
  descriptionAr: text("description_ar"),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ShippingZone = typeof shippingZonesTable.$inferSelect;
export type ShippingRate = typeof shippingRatesTable.$inferSelect;
export type Shipment = typeof shipmentsTable.$inferSelect;
export type ShipmentEvent = typeof shipmentEventsTable.$inferSelect;
