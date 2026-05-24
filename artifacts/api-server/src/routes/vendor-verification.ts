import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, vendorDocumentsTable, vendorContractsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { notifyAdmins, notifyUser } from "../lib/notify";
import { z } from "zod";

const router = Router();

// Required docs every vendor must submit (others are optional/supplementary)
const REQUIRED_DOC_TYPES = [
  "commercial_registration",
  "business_license",
  "tax_card",
  "vat_certificate",
] as const;

// ── GET /api/vendor/verification/status ────────────────────────────────────
// Returns the vendor's full onboarding status: documents + contract
router.get("/status", requireAuth, requireRole("vendor"), async (req, res) => {
  try {
    const vendorId = req.user!.userId;

    const [vendor] = await db
      .select({
        id: usersTable.id,
        fullName: usersTable.fullName,
        email: usersTable.email,
        storeName: usersTable.storeName,
        storeCategory: usersTable.storeCategory,
        verificationStatus: usersTable.verificationStatus,
        isVendorApproved: usersTable.isVendorApproved,
      })
      .from(usersTable)
      .where(eq(usersTable.id, vendorId))
      .limit(1);

    if (!vendor) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }

    const documents = await db
      .select()
      .from(vendorDocumentsTable)
      .where(eq(vendorDocumentsTable.vendorId, vendorId));

    const contract = await db
      .select()
      .from(vendorContractsTable)
      .where(eq(vendorContractsTable.vendorId, vendorId))
      .limit(1);

    res.json({
      vendor,
      documents,
      contract: contract[0] ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/vendor/verification/documents ────────────────────────────────
// Submit (or replace) a document after uploading to storage
const SubmitDocSchema = z.object({
  type: z.enum([
    "commercial_registration",
    "business_license",
    "tax_card",
    "vat_certificate",
    "certificate_of_origin",
    "health_certificate",
  ]),
  fileUrl: z.string().url(),
  fileName: z.string().optional(),
});

router.post("/documents", requireAuth, requireRole("vendor"), async (req, res) => {
  try {
    const vendorId = req.user!.userId;
    const body = SubmitDocSchema.parse(req.body);

    // Check if vendor already has a doc of this type
    const [existing] = await db
      .select()
      .from(vendorDocumentsTable)
      .where(
        and(
          eq(vendorDocumentsTable.vendorId, vendorId),
          eq(vendorDocumentsTable.type, body.type)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing doc — allowed if pending, rejected, or reupload_requested
      await db
        .update(vendorDocumentsTable)
        .set({
          fileUrl: body.fileUrl,
          fileName: body.fileName ?? existing.fileName,
          status: "pending",
          adminNotes: null,
          reviewedBy: null,
          reviewedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(vendorDocumentsTable.id, existing.id));
    } else {
      // Insert new doc
      await db.insert(vendorDocumentsTable).values({
        vendorId,
        type: body.type,
        fileUrl: body.fileUrl,
        fileName: body.fileName,
        status: "pending",
      });
    }

    // Fetch all vendor docs to check if all required ones are now submitted
    const allDocs = await db
      .select({ type: vendorDocumentsTable.type })
      .from(vendorDocumentsTable)
      .where(eq(vendorDocumentsTable.vendorId, vendorId));

    const submittedTypes = new Set(allDocs.map((d) => d.type));
    const allRequiredSubmitted = REQUIRED_DOC_TYPES.every((t) => submittedTypes.has(t));

    // Get current vendor status
    const [vendor] = await db
      .select({ verificationStatus: usersTable.verificationStatus, email: usersTable.email, fullName: usersTable.fullName })
      .from(usersTable)
      .where(eq(usersTable.id, vendorId))
      .limit(1);

    // Advance status when all required docs submitted for first time
    const advanceable = ["not_started", "pending_documents"].includes(vendor.verificationStatus ?? "");
    if (allRequiredSubmitted && advanceable) {
      await db
        .update(usersTable)
        .set({ verificationStatus: "documents_submitted", updatedAt: new Date() })
        .where(eq(usersTable.id, vendorId));

      // Notify all admins
      notifyAdmins({
        type: "vendor_verification",
        title: "New Vendor Documents Submitted",
        titleAr: "تم تقديم وثائق بائع جديد",
        message: `Vendor "${vendor.fullName}" has submitted all required documents and is awaiting legal review.`,
        messageAr: `قام البائع "${vendor.fullName}" بتقديم جميع الوثائق المطلوبة وهو في انتظار المراجعة القانونية.`,
        link: "/dashboard/legal",
      });
    } else if (!allRequiredSubmitted && vendor.verificationStatus === "not_started") {
      // Mark as "in progress"
      await db
        .update(usersTable)
        .set({ verificationStatus: "pending_documents", updatedAt: new Date() })
        .where(eq(usersTable.id, vendorId));
    }

    res.status(200).json({ success: true, allRequiredSubmitted });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/vendor/verification/contract/signed ──────────────────────────
// Vendor submits their signed contract file
const SignedContractSchema = z.object({
  signedContractUrl: z.string().url(),
  fileName: z.string().optional(),
});

router.post("/contract/signed", requireAuth, requireRole("vendor"), async (req, res) => {
  try {
    const vendorId = req.user!.userId;
    const body = SignedContractSchema.parse(req.body);

    const [contract] = await db
      .select()
      .from(vendorContractsTable)
      .where(eq(vendorContractsTable.vendorId, vendorId))
      .limit(1);

    if (!contract) {
      res.status(404).json({ error: "No contract generated yet" });
      return;
    }

    await db
      .update(vendorContractsTable)
      .set({
        signedContractUrl: body.signedContractUrl,
        status: "signed",
        signedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(vendorContractsTable.id, contract.id));

    // Update vendor status
    await db
      .update(usersTable)
      .set({ verificationStatus: "contract_submitted", updatedAt: new Date() })
      .where(eq(usersTable.id, vendorId));

    // Notify admins
    const [vendor] = await db
      .select({ email: usersTable.email, fullName: usersTable.fullName })
      .from(usersTable)
      .where(eq(usersTable.id, vendorId))
      .limit(1);

    notifyAdmins({
      type: "vendor_verification",
      title: "Signed Vendor Agreement Submitted",
      titleAr: "تم تقديم اتفاقية البائع الموقعة",
      message: `Vendor "${vendor.fullName}" has uploaded their signed agreement and is awaiting final approval.`,
      messageAr: `قام البائع "${vendor.fullName}" برفع الاتفاقية الموقعة وهو في انتظار الموافقة النهائية.`,
      link: `/dashboard/legal/${vendorId}`,
    });

    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
