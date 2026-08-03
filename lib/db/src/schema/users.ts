import { pgTable, serial, text, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
// drizzle-zod v0.8 builds its schemas with the Zod v4 API (it imports "zod/v4"
// internally), so `z` must come from the same entry point. Importing the v3
// classic API here yields schemas that are structurally incompatible with the
// objects returned by createInsertSchema/createSelectSchema.
import { z } from "zod/v4";

export const roleEnum = pgEnum("role", ["customer", "vendor", "admin"]);

export const vendorVerificationStatusEnum = pgEnum("vendor_verification_status", [
  "not_started",
  "pending_documents",
  "documents_submitted",
  "documents_under_review",
  "documents_approved",
  "contract_pending",
  "contract_submitted",
  "approved",
  "rejected",
]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("customer"),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  // Vendor-specific fields
  storeName: text("store_name"),
  storeDescription: text("store_description"),
  storeCategory: text("store_category"),
  isVendorApproved: boolean("is_vendor_approved").default(false),
  verificationStatus: vendorVerificationStatusEnum("verification_status").default("not_started"),
  // Reset token
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  passwordHash: true,
  resetToken: true,
  resetTokenExpiry: true,
}).extend({
  password: z.string().min(8),
});

export const selectUserSchema = createSelectSchema(usersTable).omit({
  passwordHash: true,
  resetToken: true,
  resetTokenExpiry: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type SafeUser = z.infer<typeof selectUserSchema>;
