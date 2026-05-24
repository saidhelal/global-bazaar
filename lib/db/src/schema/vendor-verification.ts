import { pgTable, serial, text, timestamp, pgEnum, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const documentTypeEnum = pgEnum("document_type", [
  "commercial_registration",
  "business_license",
  "tax_card",
  "vat_certificate",
  "certificate_of_origin",
  "health_certificate",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "pending",
  "approved",
  "rejected",
  "reupload_requested",
]);

export const contractStatusEnum = pgEnum("contract_status", [
  "sent",
  "signed",
  "approved",
]);

export const vendorDocumentsTable = pgTable("vendor_documents", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: documentTypeEnum("type").notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name"),
  status: documentStatusEnum("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  reviewedBy: integer("reviewed_by").references(() => usersTable.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const vendorContractsTable = pgTable("vendor_contracts", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  contractUrl: text("contract_url"),
  signedContractUrl: text("signed_contract_url"),
  status: contractStatusEnum("status").notNull().default("sent"),
  adminNotes: text("admin_notes"),
  generatedAt: timestamp("generated_at").defaultNow(),
  signedAt: timestamp("signed_at"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type VendorDocument = typeof vendorDocumentsTable.$inferSelect;
export type VendorContract = typeof vendorContractsTable.$inferSelect;
