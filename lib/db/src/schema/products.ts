import { pgTable, serial, text, timestamp, pgEnum, boolean, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const productStatusEnum = pgEnum("product_status", ["draft", "pending_review", "approved", "rejected", "archived"]);

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  description: text("description"),
  descriptionAr: text("description_ar"),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  sku: text("sku"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  compareAtPrice: numeric("compare_at_price", { precision: 12, scale: 2 }),
  discountPercent: integer("discount_percent").default(0),
  currency: text("currency").default("USD").notNull(),
  stock: integer("stock").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").default(5),
  weight: numeric("weight", { precision: 8, scale: 2 }),
  weightUnit: text("weight_unit").default("kg"),
  status: productStatusEnum("status").notNull().default("pending_review"),
  rejectionReason: text("rejection_reason"),
  isFeatured: boolean("is_featured").default(false),
  tags: jsonb("tags").$type<string[]>().default([]),
  images: jsonb("images").$type<string[]>().default([]),
  coverImage: text("cover_image"),
  adminNotes: text("admin_notes"),
  viewCount: integer("view_count").default(0),
  salesCount: integer("sales_count").default(0),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Product = typeof productsTable.$inferSelect;
export type InsertProduct = typeof productsTable.$inferInsert;
