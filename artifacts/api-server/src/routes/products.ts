import { Router } from "express";
import { notifyUser } from "../lib/notify";
import { db } from "@workspace/db";
import { productsTable, usersTable } from "@workspace/db/schema";
import { eq, and, desc, asc, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const CATEGORIES = [
  "Electronics", "Fashion", "Home & Living", "Beauty", "Sports",
  "Books", "Automotive", "Art & Collectibles", "Food & Gourmet",
  "Jewelry & Watches", "Toys & Games", "Health & Wellness", "Other",
];

const ProductUpsertSchema = z.object({
  title: z.string().min(3).max(200),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  category: z.enum(CATEGORIES as [string, ...string[]]),
  subcategory: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().optional().nullable(),
  discountPercent: z.number().min(0).max(100).default(0),
  currency: z.string().default("USD"),
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  weight: z.number().positive().optional().nullable(),
  weightUnit: z.string().default("kg"),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  coverImage: z.string().optional().nullable(),
  status: z.enum(["draft", "pending_review"]).default("pending_review"),
});

// GET /api/products — public product listing (approved only)
router.get("/", async (req, res) => {
  try {
    const { category, search, sort = "newest", page = "1", limit = "24", featured, minPrice, maxPrice } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(48, parseInt(limit));
    const offset = (pageNum - 1) * pageSize;

    const conditions: ReturnType<typeof eq>[] = [eq(productsTable.status, "approved")];
    if (category && category !== "all") conditions.push(eq(productsTable.category, category));
    if (featured === "true") conditions.push(eq(productsTable.isFeatured, true));
    if (minPrice) conditions.push(sql`${productsTable.price} >= ${parseFloat(minPrice)}` as any);
    if (maxPrice) conditions.push(sql`${productsTable.price} <= ${parseFloat(maxPrice)}` as any);
    if (search) conditions.push(or(
      ilike(productsTable.title, `%${search}%`),
      ilike(productsTable.description, `%${search}%`),
    )!);

    const orderCol = sort === "price_asc" ? asc(productsTable.price)
      : sort === "price_desc" ? desc(productsTable.price)
      : sort === "rating" ? desc(productsTable.rating)
      : desc(productsTable.createdAt);

    const products = await db
      .select()
      .from(productsTable)
      .where(and(...conditions))
      .orderBy(orderCol)
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(productsTable)
      .where(and(...conditions));

    res.json({ products, total: Number(count), page: pageNum, pageSize });
  } catch {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET /api/products/categories
router.get("/categories", (_req, res) => {
  res.json({ categories: CATEGORIES });
});

// GET /api/products/:id — public product detail
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params["id"]));
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!product || product.status !== "approved") {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    await db.update(productsTable).set({ viewCount: (product.viewCount ?? 0) + 1 }).where(eq(productsTable.id, id));
    res.json({ product });
  } catch {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// ─── Vendor routes ────────────────────────────────────────────────────────────

// GET /api/vendor/products — vendor's own products
router.get("/vendor/mine", requireAuth, async (req, res) => {
  if (req.user!.role !== "vendor" && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const { status } = req.query as { status?: string };
    const conditions = [eq(productsTable.vendorId, req.user!.userId)];
    if (status) conditions.push(eq(productsTable.status, status as any));

    const products = await db
      .select()
      .from(productsTable)
      .where(and(...conditions))
      .orderBy(desc(productsTable.updatedAt));
    res.json({ products });
  } catch {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// POST /api/vendor/products — create product
router.post("/vendor/products", requireAuth, async (req, res) => {
  if (req.user!.role !== "vendor" && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const data = ProductUpsertSchema.parse(req.body);
    const [product] = await db
      .insert(productsTable)
      .values({
        ...data,
        vendorId: req.user!.userId,
        price: String(data.price),
        compareAtPrice: data.compareAtPrice ? String(data.compareAtPrice) : null,
        weight: data.weight ? String(data.weight) : null,
      })
      .returning();
    res.status(201).json({ product });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      res.status(400).json({ error: "Validation failed", details: err.errors });
    } else {
      res.status(500).json({ error: "Failed to create product" });
    }
  }
});

// PUT /api/vendor/products/:id — update product
router.put("/vendor/products/:id", requireAuth, async (req, res) => {
  if (req.user!.role !== "vendor" && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const id = parseInt(String(req.params["id"]));
    const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Product not found" }); return; }
    if (existing.vendorId !== req.user!.userId && req.user!.role !== "admin") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const data = ProductUpsertSchema.partial().parse(req.body);
    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };
    if (data.price !== undefined) updateData["price"] = String(data.price);
    if (data.compareAtPrice !== undefined) updateData["compareAtPrice"] = data.compareAtPrice ? String(data.compareAtPrice) : null;
    if (data.weight !== undefined) updateData["weight"] = data.weight ? String(data.weight) : null;
    // If editing an approved product, send back to pending review
    if (existing.status === "approved" && req.user!.role !== "admin") {
      updateData["status"] = "pending_review";
    }
    const [product] = await db.update(productsTable).set(updateData as any).where(eq(productsTable.id, id)).returning();
    res.json({ product });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      res.status(400).json({ error: "Validation failed" });
    } else {
      res.status(500).json({ error: "Failed to update product" });
    }
  }
});

// DELETE /api/vendor/products/:id — delete product
router.delete("/vendor/products/:id", requireAuth, async (req, res) => {
  if (req.user!.role !== "vendor" && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  try {
    const id = parseInt(String(req.params["id"]));
    const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Product not found" }); return; }
    if (existing.vendorId !== req.user!.userId && req.user!.role !== "admin") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    await db.delete(productsTable).where(eq(productsTable.id, id));
    res.json({ message: "Product deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// ─── Admin routes ────────────────────────────────────────────────────────────

// GET /api/admin/products — all products for admin review
router.get("/admin/all", requireAuth, async (req, res) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const { status } = req.query as { status?: string };
    const products = await db
      .select()
      .from(productsTable)
      .where(status ? eq(productsTable.status, status as any) : undefined)
      .orderBy(desc(productsTable.createdAt));
    res.json({ products });
  } catch {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// PUT /api/admin/products/:id/approve
router.put("/admin/products/:id/approve", requireAuth, async (req, res) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const id = parseInt(String(req.params["id"]));
    const { adminNotes } = z.object({ adminNotes: z.string().optional() }).parse(req.body);
    const [product] = await db.update(productsTable)
      .set({ status: "approved", rejectionReason: null, adminNotes: adminNotes || null, updatedAt: new Date() })
      .where(eq(productsTable.id, id))
      .returning();
    res.json({ product });
    // Notify vendor
    const [vendor] = await db.select({ email: usersTable.email, fullName: usersTable.fullName })
      .from(usersTable).where(eq(usersTable.id, product.vendorId)).limit(1);
    if (vendor) {
      notifyUser(product.vendorId, vendor.email, vendor.fullName, {
        type: "product_approved",
        title: `Product Approved: ${product.title}`,
        titleAr: `تمت الموافقة على المنتج: ${product.titleAr || product.title}`,
        message: `Your product "${product.title}" has been approved and is now live on the marketplace.`,
        messageAr: `تمت الموافقة على منتجك "${product.titleAr || product.title}" وهو الآن متاح في السوق.`,
        link: `/products/${product.id}`,
        sendEmail: true,
      }).catch(() => {});
    }
  } catch {
    res.status(500).json({ error: "Failed to approve product" });
  }
});

// PUT /api/admin/products/:id/reject
router.put("/admin/products/:id/reject", requireAuth, async (req, res) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const id = parseInt(String(req.params["id"]));
    const { reason } = z.object({ reason: z.string().min(5) }).parse(req.body);
    const [product] = await db.update(productsTable)
      .set({ status: "rejected", rejectionReason: reason, updatedAt: new Date() })
      .where(eq(productsTable.id, id))
      .returning();
    res.json({ product });
    // Notify vendor
    const [vendor] = await db.select({ email: usersTable.email, fullName: usersTable.fullName })
      .from(usersTable).where(eq(usersTable.id, product.vendorId)).limit(1);
    if (vendor) {
      notifyUser(product.vendorId, vendor.email, vendor.fullName, {
        type: "product_rejected",
        title: `Product Needs Changes: ${product.title}`,
        titleAr: `المنتج يحتاج إلى تعديلات: ${product.titleAr || product.title}`,
        message: `Your product "${product.title}" was not approved. Reason: ${reason}`,
        messageAr: `لم تتم الموافقة على منتجك "${product.titleAr || product.title}". السبب: ${reason}`,
        link: `/dashboard/products`,
        sendEmail: true,
      }).catch(() => {});
    }
  } catch (err: any) {
    if (err?.name === "ZodError") res.status(400).json({ error: "Rejection reason required" });
    else res.status(500).json({ error: "Failed to reject product" });
  }
});

// PUT /api/admin/products/:id/feature
router.put("/admin/products/:id/feature", requireAuth, async (req, res) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const id = parseInt(String(req.params["id"]));
    const { featured } = z.object({ featured: z.boolean() }).parse(req.body);
    const [product] = await db.update(productsTable)
      .set({ isFeatured: featured, updatedAt: new Date() })
      .where(eq(productsTable.id, id))
      .returning();
    res.json({ product });
  } catch {
    res.status(500).json({ error: "Failed to update product" });
  }
});

export default router;
