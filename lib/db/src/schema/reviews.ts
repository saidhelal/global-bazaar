import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { productsTable } from "./products";
import { ordersTable } from "./orders";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  orderId: integer("order_id").references(() => ordersTable.id, { onDelete: "set null" }),
  rating: integer("rating").notNull(),
  title: text("title"),
  titleAr: text("title_ar"),
  body: text("body"),
  bodyAr: text("body_ar"),
  status: text("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  vendorReply: text("vendor_reply"),
  vendorReplyAr: text("vendor_reply_ar"),
  vendorRepliedAt: timestamp("vendor_replied_at"),
  helpfulCount: integer("helpful_count").notNull().default(0),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reviewVotesTable = pgTable("review_votes", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull().references(() => reviewsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  isHelpful: boolean("is_helpful").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Review = typeof reviewsTable.$inferSelect;
export type InsertReview = typeof reviewsTable.$inferInsert;
export type ReviewVote = typeof reviewVotesTable.$inferSelect;
