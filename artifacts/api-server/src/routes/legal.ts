import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, vendorDocumentsTable, vendorContractsTable } from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { notifyUser } from "../lib/notify";
import { z } from "zod";

const router = Router();

// Only admins can access legal review routes
const adminOnly = [requireAuth, requireRole("admin")] as const;

const REQUIRED_DOC_TYPES = [
  "commercial_registration",
  "business_license",
  "tax_card",
  "vat_certificate",
] as const;

// ── GET /api/legal/vendors ─────────────────────────────────────────────────
// List all vendors with their verification status + doc summary
router.get("/vendors", ...adminOnly, async (req, res) => {
  try {
    const statusFilter = req.query.status as string | undefined;

    const vendors = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        fullName: usersTable.fullName,
        storeName: usersTable.storeName,
        storeCategory: usersTable.storeCategory,
        verificationStatus: usersTable.verificationStatus,
        isVendorApproved: usersTable.isVendorApproved,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.role, "vendor"));

    // Apply status filter if provided
    const filtered = statusFilter
      ? vendors.filter((v) => v.verificationStatus === statusFilter)
      : vendors;

    // Fetch doc counts per vendor in one query
    const vendorIds = filtered.map((v) => v.id);
    let docCounts: Record<number, { total: number; approved: number; pending: number; rejected: number }> = {};

    if (vendorIds.length > 0) {
      const allDocs = await db
        .select({ vendorId: vendorDocumentsTable.vendorId, status: vendorDocumentsTable.status })
        .from(vendorDocumentsTable)
        .where(inArray(vendorDocumentsTable.vendorId, vendorIds));

      for (const doc of allDocs) {
        if (!docCounts[doc.vendorId]) {
          docCounts[doc.vendorId] = { total: 0, approved: 0, pending: 0, rejected: 0 };
        }
        docCounts[doc.vendorId].total++;
        if (doc.status === "approved") docCounts[doc.vendorId].approved++;
        else if (doc.status === "pending") docCounts[doc.vendorId].pending++;
        else if (doc.status === "rejected") docCounts[doc.vendorId].rejected++;
      }
    }

    const result = filtered.map((v) => ({
      ...v,
      docStats: docCounts[v.id] ?? { total: 0, approved: 0, pending: 0, rejected: 0 },
    }));

    res.json({ vendors: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/legal/vendors/:id ─────────────────────────────────────────────
// Get full detail: vendor profile + all documents + contract
router.get("/vendors/:id", ...adminOnly, async (req, res) => {
  try {
    const vendorId = parseInt(req.params.id, 10);
    if (isNaN(vendorId)) { res.status(400).json({ error: "Invalid vendor id" }); return; }

    const [vendor] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        fullName: usersTable.fullName,
        phone: usersTable.phone,
        storeName: usersTable.storeName,
        storeDescription: usersTable.storeDescription,
        storeCategory: usersTable.storeCategory,
        verificationStatus: usersTable.verificationStatus,
        isVendorApproved: usersTable.isVendorApproved,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(and(eq(usersTable.id, vendorId), eq(usersTable.role, "vendor")))
      .limit(1);

    if (!vendor) { res.status(404).json({ error: "Vendor not found" }); return; }

    const documents = await db
      .select()
      .from(vendorDocumentsTable)
      .where(eq(vendorDocumentsTable.vendorId, vendorId));

    const contract = await db
      .select()
      .from(vendorContractsTable)
      .where(eq(vendorContractsTable.vendorId, vendorId))
      .limit(1);

    res.json({ vendor, documents, contract: contract[0] ?? null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PATCH /api/legal/documents/:docId ─────────────────────────────────────
// Approve / reject / request re-upload for a specific document
const ReviewDocSchema = z.object({
  status: z.enum(["approved", "rejected", "reupload_requested"]),
  adminNotes: z.string().optional(),
});

router.patch("/documents/:docId", ...adminOnly, async (req, res) => {
  try {
    const docId = parseInt(req.params.docId, 10);
    if (isNaN(docId)) { res.status(400).json({ error: "Invalid doc id" }); return; }

    const body = ReviewDocSchema.parse(req.body);
    const reviewerId = req.user!.userId;

    const [doc] = await db
      .select()
      .from(vendorDocumentsTable)
      .where(eq(vendorDocumentsTable.id, docId))
      .limit(1);

    if (!doc) { res.status(404).json({ error: "Document not found" }); return; }

    await db
      .update(vendorDocumentsTable)
      .set({
        status: body.status,
        adminNotes: body.adminNotes ?? null,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(vendorDocumentsTable.id, docId));

    // Fetch vendor info for notifications and status updates
    const [vendor] = await db
      .select({ email: usersTable.email, fullName: usersTable.fullName, verificationStatus: usersTable.verificationStatus })
      .from(usersTable)
      .where(eq(usersTable.id, doc.vendorId))
      .limit(1);

    // Update vendor status to "documents_under_review" if not already
    if (!["documents_under_review", "documents_approved", "contract_pending", "contract_submitted", "approved"].includes(vendor.verificationStatus ?? "")) {
      await db
        .update(usersTable)
        .set({ verificationStatus: "documents_under_review", updatedAt: new Date() })
        .where(eq(usersTable.id, doc.vendorId));
    }

    // Check if ALL required docs are now approved → advance to documents_approved
    const allDocs = await db
      .select({ type: vendorDocumentsTable.type, status: vendorDocumentsTable.status })
      .from(vendorDocumentsTable)
      .where(eq(vendorDocumentsTable.vendorId, doc.vendorId));

    const docMap: Record<string, string> = {};
    for (const d of allDocs) docMap[d.type] = d.status;
    const allRequiredApproved = REQUIRED_DOC_TYPES.every((t) => docMap[t] === "approved");

    if (allRequiredApproved) {
      await db
        .update(usersTable)
        .set({ verificationStatus: "documents_approved", updatedAt: new Date() })
        .where(eq(usersTable.id, doc.vendorId));
    }

    // Notify vendor about this document decision
    const docLabels: Record<string, string> = {
      commercial_registration: "Commercial Registration",
      business_license: "Business License",
      tax_card: "Tax Card",
      vat_certificate: "VAT Registration Certificate",
      certificate_of_origin: "Certificate of Origin",
      health_certificate: "Health Certificate",
    };
    const docLabelsAr: Record<string, string> = {
      commercial_registration: "السجل التجاري",
      business_license: "الرخصة التجارية",
      tax_card: "البطاقة الضريبية",
      vat_certificate: "شهادة تسجيل ضريبة القيمة المضافة",
      certificate_of_origin: "شهادة المنشأ",
      health_certificate: "الشهادة الصحية",
    };

    const docName = docLabels[doc.type] ?? doc.type;
    const docNameAr = docLabelsAr[doc.type] ?? doc.type;

    const notifMap = {
      approved: {
        title: `Document Approved: ${docName}`,
        titleAr: `تمت الموافقة على الوثيقة: ${docNameAr}`,
        message: `Your ${docName} has been reviewed and approved by our legal team.${allRequiredApproved ? " All required documents are now approved!" : ""}`,
        messageAr: `تمت مراجعة ${docNameAr} والموافقة عليها من قِبل الفريق القانوني.${allRequiredApproved ? " تمت الموافقة على جميع الوثائق المطلوبة!" : ""}`,
      },
      rejected: {
        title: `Document Rejected: ${docName}`,
        titleAr: `تم رفض الوثيقة: ${docNameAr}`,
        message: `Your ${docName} has been rejected.${body.adminNotes ? ` Reason: ${body.adminNotes}` : ""} Please contact support if you need assistance.`,
        messageAr: `تم رفض ${docNameAr}.${body.adminNotes ? ` السبب: ${body.adminNotes}` : ""} يرجى التواصل مع الدعم إذا كنت بحاجة إلى مساعدة.`,
      },
      reupload_requested: {
        title: `Re-upload Required: ${docName}`,
        titleAr: `مطلوب إعادة رفع: ${docNameAr}`,
        message: `Please re-upload your ${docName}.${body.adminNotes ? ` Notes: ${body.adminNotes}` : ""}`,
        messageAr: `يرجى إعادة رفع ${docNameAr}.${body.adminNotes ? ` ملاحظات: ${body.adminNotes}` : ""}`,
      },
    };

    const notif = notifMap[body.status];
    notifyUser(doc.vendorId, vendor.email, vendor.fullName, {
      type: "vendor_verification",
      ...notif,
      link: "/vendor/onboarding",
    });

    res.json({ success: true, allRequiredApproved });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/legal/vendors/:id/contract ──────────────────────────────────
// Generate and send contract to vendor
const GenerateContractSchema = z.object({
  contractUrl: z.string().url().optional(),
  adminNotes: z.string().optional(),
});

router.post("/vendors/:id/contract", ...adminOnly, async (req, res) => {
  try {
    const vendorId = parseInt(req.params.id, 10);
    if (isNaN(vendorId)) { res.status(400).json({ error: "Invalid vendor id" }); return; }

    const body = GenerateContractSchema.parse(req.body);

    const [vendor] = await db
      .select({ email: usersTable.email, fullName: usersTable.fullName, storeName: usersTable.storeName })
      .from(usersTable)
      .where(and(eq(usersTable.id, vendorId), eq(usersTable.role, "vendor")))
      .limit(1);
    if (!vendor) { res.status(404).json({ error: "Vendor not found" }); return; }

    // Upsert contract record
    const [existing] = await db
      .select({ id: vendorContractsTable.id })
      .from(vendorContractsTable)
      .where(eq(vendorContractsTable.vendorId, vendorId))
      .limit(1);

    if (existing) {
      await db
        .update(vendorContractsTable)
        .set({
          contractUrl: body.contractUrl ?? existing.toString(),
          status: "sent",
          adminNotes: body.adminNotes ?? null,
          generatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(vendorContractsTable.id, existing.id));
    } else {
      await db.insert(vendorContractsTable).values({
        vendorId,
        contractUrl: body.contractUrl ?? null,
        status: "sent",
        adminNotes: body.adminNotes ?? null,
        generatedAt: new Date(),
      });
    }

    // Update vendor status to contract_pending
    await db
      .update(usersTable)
      .set({ verificationStatus: "contract_pending", updatedAt: new Date() })
      .where(eq(usersTable.id, vendorId));

    // Notify vendor
    notifyUser(vendorId, vendor.email, vendor.fullName, {
      type: "vendor_verification",
      title: "Vendor Agreement Ready to Sign",
      titleAr: "اتفاقية البائع جاهزة للتوقيع",
      message: "Your documents have been approved! Please download the vendor agreement, sign it, and upload the signed copy to complete your registration.",
      messageAr: "تمت الموافقة على وثائقك! يرجى تنزيل اتفاقية البائع وتوقيعها ورفع النسخة الموقعة لإتمام التسجيل.",
      link: "/vendor/onboarding",
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

// ── PATCH /api/legal/vendors/:id/approve ──────────────────────────────────
// Final approval — vendor becomes an approved seller
const ApproveSchema = z.object({ adminNotes: z.string().optional() });

router.patch("/vendors/:id/approve", ...adminOnly, async (req, res) => {
  try {
    const vendorId = parseInt(req.params.id, 10);
    if (isNaN(vendorId)) { res.status(400).json({ error: "Invalid vendor id" }); return; }

    const body = ApproveSchema.parse(req.body);

    const [vendor] = await db
      .select({ email: usersTable.email, fullName: usersTable.fullName, storeName: usersTable.storeName })
      .from(usersTable)
      .where(and(eq(usersTable.id, vendorId), eq(usersTable.role, "vendor")))
      .limit(1);
    if (!vendor) { res.status(404).json({ error: "Vendor not found" }); return; }

    // Approve vendor
    await db
      .update(usersTable)
      .set({ isVendorApproved: true, verificationStatus: "approved", updatedAt: new Date() })
      .where(eq(usersTable.id, vendorId));

    // Approve contract if exists
    await db
      .update(vendorContractsTable)
      .set({ status: "approved", approvedAt: new Date(), adminNotes: body.adminNotes ?? null, updatedAt: new Date() })
      .where(eq(vendorContractsTable.vendorId, vendorId));

    // Notify vendor
    notifyUser(vendorId, vendor.email, vendor.fullName, {
      type: "vendor_verification",
      title: "Congratulations — You're an Approved Seller!",
      titleAr: "تهانينا — لقد أصبحت بائعاً معتمداً!",
      message: `Welcome, ${vendor.storeName ?? vendor.fullName}! Your store has been approved. You can now publish products and start selling on Orbit Market.`,
      messageAr: `أهلاً بك، ${vendor.storeName ?? vendor.fullName}! تمت الموافقة على متجرك. يمكنك الآن نشر المنتجات والبدء في البيع على أوربت ماركت.`,
      link: "/dashboard",
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

// ── PATCH /api/legal/vendors/:id/reject ───────────────────────────────────
const RejectSchema = z.object({ adminNotes: z.string().min(1) });

router.patch("/vendors/:id/reject", ...adminOnly, async (req, res) => {
  try {
    const vendorId = parseInt(req.params.id, 10);
    if (isNaN(vendorId)) { res.status(400).json({ error: "Invalid vendor id" }); return; }

    const body = RejectSchema.parse(req.body);

    const [vendor] = await db
      .select({ email: usersTable.email, fullName: usersTable.fullName })
      .from(usersTable)
      .where(and(eq(usersTable.id, vendorId), eq(usersTable.role, "vendor")))
      .limit(1);
    if (!vendor) { res.status(404).json({ error: "Vendor not found" }); return; }

    await db
      .update(usersTable)
      .set({ verificationStatus: "rejected", updatedAt: new Date() })
      .where(eq(usersTable.id, vendorId));

    notifyUser(vendorId, vendor.email, vendor.fullName, {
      type: "vendor_verification",
      title: "Vendor Application Not Approved",
      titleAr: "لم تتم الموافقة على طلب البائع",
      message: `We were unable to approve your vendor application at this time. Reason: ${body.adminNotes}. Please contact our support team for assistance.`,
      messageAr: `لم نتمكن من الموافقة على طلبك كبائع في الوقت الحالي. السبب: ${body.adminNotes}. يرجى التواصل مع فريق الدعم.`,
      link: "/vendor/onboarding",
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
