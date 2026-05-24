import { Router } from "express";
import { db } from "@workspace/db";
import {
  reviewsTable, reviewVotesTable, productsTable, usersTable, orderItemsTable,
} from "@workspace/db/schema";
import { eq, and, desc, avg, count, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";
import { notifyUser, notifyAdmins } from "../lib/notify";

const router = Router();

const ReviewSchema = z.object({
  productId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  titleAr: z.string().max(120).optional(),
  body: z.string().max(2000).optional(),
  bodyAr: z.string().max(2000).optional(),
});

// Helper: recalculate product rating from approved reviews
async function recalcProductRating(productId: number) {
  const [result] = await db
    .select({ avg: avg(reviewsTable.rating), cnt: count() })
    .from(reviewsTable)
    .where(and(eq(reviewsTable.productId, productId), eq(reviewsTable.status, "approved")));
  const newRating = result?.avg ? parseFloat(result.avg).toFixed(2) : "0";
  const newCount = result?.cnt ?? 0;
  await db.update(productsTable)
    .set({ rating: newRating, reviewCount: newCount, updatedAt: new Date() })
    .where(eq(productsTable.id, productId));
}

// GET /api/reviews/product/:productId — public approved reviews + rating summary
router.get("/product/:productId", async (req, res) => {
  try {
    const productId = parseInt(req.params["productId"]!);
    const limit = Math.min(parseInt(req.query["limit"] as string || "20"), 50);
    const page = Math.max(parseInt(req.query["page"] as string || "1"), 1);
    const offset = (page - 1) * limit;
    const sortBy = req.query["sort"] as string || "newest";

    const orderClause = sortBy === "highest" ? desc(reviewsTable.rating)
      : sortBy === "lowest" ? reviewsTable.rating
      : sortBy === "helpful" ? desc(reviewsTable.helpfulCount)
      : desc(reviewsTable.createdAt);

    const reviews = await db
      .select({
        id: reviewsTable.id,
        userId: reviewsTable.userId,
        orderId: reviewsTable.orderId,
        rating: reviewsTable.rating,
        title: reviewsTable.title,
        titleAr: reviewsTable.titleAr,
        body: reviewsTable.body,
        bodyAr: reviewsTable.bodyAr,
        vendorReply: reviewsTable.vendorReply,
        vendorReplyAr: reviewsTable.vendorReplyAr,
        vendorRepliedAt: reviewsTable.vendorRepliedAt,
        helpfulCount: reviewsTable.helpfulCount,
        createdAt: reviewsTable.createdAt,
        updatedAt: reviewsTable.updatedAt,
        authorName: usersTable.fullName,
      })
      .from(reviewsTable)
      .innerJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
      .where(and(eq(reviewsTable.productId, productId), eq(reviewsTable.status, "approved")))
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset);

    // Rating summary (distribution)
    const distribution = await db
      .select({ rating: reviewsTable.rating, cnt: count() })
      .from(reviewsTable)
      .where(and(eq(reviewsTable.productId, productId), eq(reviewsTable.status, "approved")))
      .groupBy(reviewsTable.rating);

    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    let sum = 0;
    for (const row of distribution) {
      dist[row.rating] = row.cnt;
      total += row.cnt;
      sum += row.rating * row.cnt;
    }
    const average = total > 0 ? (sum / total).toFixed(2) : "0";

    // Mark verified purchases (userId had an order containing this product)
    const verifiedUserIds = new Set<number>();
    if (reviews.length > 0) {
      const userIds = reviews.map(r => r.userId);
      const verified = await db
        .select({ userId: usersTable.id })
        .from(orderItemsTable)
        .innerJoin(usersTable, sql`EXISTS (
          SELECT 1 FROM orders WHERE orders.id = ${orderItemsTable.orderId} AND orders.user_id = ${usersTable.id}
        )`)
        .where(and(
          eq(orderItemsTable.productId, productId),
          sql`${usersTable.id} = ANY(${sql.raw(`ARRAY[${userIds.join(",")}]::int[]`)})`
        ))
        .groupBy(usersTable.id);
      verified.forEach(v => verifiedUserIds.add(v.userId));
    }

    const enriched = reviews.map(r => ({
      ...r,
      isVerifiedPurchase: verifiedUserIds.has(r.userId),
      authorInitial: r.authorName.charAt(0).toUpperCase(),
      authorDisplay: r.authorName.split(" ")[0] + " " + (r.authorName.split(" ")[1]?.[0] || "") + ".",
    }));

    res.json({ reviews: enriched, summary: { average, total, distribution: dist } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// GET /api/reviews/my — customer review history
router.get("/my", requireAuth, async (req, res) => {
  try {
    const reviews = await db
      .select({
        id: reviewsTable.id,
        productId: reviewsTable.productId,
        rating: reviewsTable.rating,
        title: reviewsTable.title,
        titleAr: reviewsTable.titleAr,
        body: reviewsTable.body,
        bodyAr: reviewsTable.bodyAr,
        status: reviewsTable.status,
        vendorReply: reviewsTable.vendorReply,
        vendorReplyAr: reviewsTable.vendorReplyAr,
        vendorRepliedAt: reviewsTable.vendorRepliedAt,
        helpfulCount: reviewsTable.helpfulCount,
        createdAt: reviewsTable.createdAt,
        productTitle: productsTable.title,
        productTitleAr: productsTable.titleAr,
        productCoverImage: productsTable.coverImage,
      })
      .from(reviewsTable)
      .innerJoin(productsTable, eq(reviewsTable.productId, productsTable.id))
      .where(eq(reviewsTable.userId, req.user!.userId))
      .orderBy(desc(reviewsTable.createdAt));
    res.json({ reviews });
  } catch {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// POST /api/reviews — create review
router.post("/", requireAuth, async (req, res) => {
  if (req.user!.role === "admin") { res.status(403).json({ error: "Admins cannot post reviews" }); return; }
  try {
    const data = ReviewSchema.parse(req.body);

    // Check if already reviewed
    const existing = await db.select().from(reviewsTable)
      .where(and(eq(reviewsTable.productId, data.productId), eq(reviewsTable.userId, req.user!.userId)))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "You have already reviewed this product" });
      return;
    }

    // Check for verified purchase
    const purchase = await db.select({ id: orderItemsTable.orderId })
      .from(orderItemsTable)
      .innerJoin(
        sql`orders`,
        sql`orders.id = ${orderItemsTable.orderId} AND orders.user_id = ${req.user!.userId}`
      )
      .where(eq(orderItemsTable.productId, data.productId))
      .limit(1);
    const orderId = purchase[0]?.id ?? null;

    const [review] = await db.insert(reviewsTable).values({
      productId: data.productId,
      userId: req.user!.userId,
      orderId,
      rating: data.rating,
      title: data.title,
      titleAr: data.titleAr,
      body: data.body,
      bodyAr: data.bodyAr,
      status: "pending",
    }).returning();

    res.status(201).json({ review });

    // Notify admins
    notifyAdmins({
      type: "system",
      title: `New Review Pending: ${data.rating}★`,
      titleAr: `مراجعة جديدة بانتظار الموافقة: ${data.rating}★`,
      message: `A new ${data.rating}-star review has been submitted for product #${data.productId} and needs moderation.`,
      messageAr: `تم تقديم مراجعة جديدة بـ ${data.rating} نجوم للمنتج #${data.productId} وتحتاج إلى إشراف.`,
      link: "/dashboard/reviews/moderation",
    }).catch(() => {});
  } catch (err: any) {
    if (err?.name === "ZodError") res.status(400).json({ error: "Validation failed", details: err.errors });
    else res.status(500).json({ error: "Failed to create review" });
  }
});

// PUT /api/reviews/:id — edit own review
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    const data = ReviewSchema.partial().parse(req.body);
    const [existing] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Review not found" }); return; }
    if (existing.userId !== req.user!.userId) { res.status(403).json({ error: "Forbidden" }); return; }
    const [review] = await db.update(reviewsTable)
      .set({ ...data, status: "pending", updatedAt: new Date() })
      .where(eq(reviewsTable.id, id))
      .returning();
    await recalcProductRating(existing.productId);
    res.json({ review });
  } catch {
    res.status(500).json({ error: "Failed to update review" });
  }
});

// DELETE /api/reviews/:id — delete own review (or admin)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    const [existing] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Review not found" }); return; }
    if (existing.userId !== req.user!.userId && req.user!.role !== "admin") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
    await recalcProductRating(existing.productId);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete review" });
  }
});

// PUT /api/reviews/:id/reply — vendor reply
router.put("/:id/reply", requireAuth, async (req, res) => {
  if (req.user!.role !== "vendor" && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  try {
    const id = parseInt(req.params["id"]!);
    const { reply, replyAr } = z.object({ reply: z.string().max(1000), replyAr: z.string().max(1000).optional() }).parse(req.body);
    const [existing] = await db.select({ productId: reviewsTable.productId, userId: reviewsTable.userId })
      .from(reviewsTable).where(eq(reviewsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Review not found" }); return; }

    // Verify vendor owns the product
    if (req.user!.role === "vendor") {
      const [product] = await db.select({ vendorId: productsTable.vendorId })
        .from(productsTable).where(eq(productsTable.id, existing.productId)).limit(1);
      if (product?.vendorId !== req.user!.userId) {
        res.status(403).json({ error: "You don't own this product" }); return;
      }
    }

    const [review] = await db.update(reviewsTable)
      .set({ vendorReply: reply, vendorReplyAr: replyAr || null, vendorRepliedAt: new Date(), updatedAt: new Date() })
      .where(eq(reviewsTable.id, id))
      .returning();

    res.json({ review });

    // Notify the reviewer that the vendor replied
    const [reviewer] = await db.select({ email: usersTable.email, fullName: usersTable.fullName })
      .from(usersTable).where(eq(usersTable.id, existing.userId)).limit(1);
    if (reviewer) {
      notifyUser(existing.userId, reviewer.email, reviewer.fullName, {
        type: "system",
        title: "Vendor replied to your review",
        titleAr: "رد البائع على مراجعتك",
        message: `The vendor has replied to your review. Click to view the reply.`,
        messageAr: "رد البائع على مراجعتك. انقر لعرض الرد.",
        link: `/products/${existing.productId}#reviews`,
      }).catch(() => {});
    }
  } catch (err: any) {
    if (err?.name === "ZodError") res.status(400).json({ error: "Reply text required" });
    else res.status(500).json({ error: "Failed to add reply" });
  }
});

// POST /api/reviews/:id/vote — mark helpful/unhelpful
router.post("/:id/vote", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    const { isHelpful } = z.object({ isHelpful: z.boolean() }).parse(req.body);

    // Upsert vote
    const existing = await db.select().from(reviewVotesTable)
      .where(and(eq(reviewVotesTable.reviewId, id), eq(reviewVotesTable.userId, req.user!.userId)))
      .limit(1);

    if (existing.length > 0) {
      await db.update(reviewVotesTable).set({ isHelpful })
        .where(and(eq(reviewVotesTable.reviewId, id), eq(reviewVotesTable.userId, req.user!.userId)));
    } else {
      await db.insert(reviewVotesTable).values({ reviewId: id, userId: req.user!.userId, isHelpful });
    }

    // Recalculate helpful count
    const [result] = await db.select({ cnt: count() }).from(reviewVotesTable)
      .where(and(eq(reviewVotesTable.reviewId, id), eq(reviewVotesTable.isHelpful, true)));
    await db.update(reviewsTable).set({ helpfulCount: result?.cnt ?? 0 }).where(eq(reviewsTable.id, id));
    res.json({ success: true, helpfulCount: result?.cnt ?? 0 });
  } catch (err: any) {
    if (err?.name === "ZodError") res.status(400).json({ error: "Invalid vote data" });
    else res.status(500).json({ error: "Failed to record vote" });
  }
});

// ─── Admin endpoints ──────────────────────────────────────────────────────────

// GET /api/reviews/admin — all reviews (admin only)
router.get("/admin", requireAuth, async (req, res) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const { status } = req.query as { status?: string };
    const conditions = status ? [eq(reviewsTable.status, status)] : [];
    const reviews = await db
      .select({
        id: reviewsTable.id,
        productId: reviewsTable.productId,
        userId: reviewsTable.userId,
        rating: reviewsTable.rating,
        title: reviewsTable.title,
        body: reviewsTable.body,
        status: reviewsTable.status,
        rejectionReason: reviewsTable.rejectionReason,
        helpfulCount: reviewsTable.helpfulCount,
        createdAt: reviewsTable.createdAt,
        productTitle: productsTable.title,
        authorName: usersTable.fullName,
        authorEmail: usersTable.email,
      })
      .from(reviewsTable)
      .innerJoin(productsTable, eq(reviewsTable.productId, productsTable.id))
      .innerJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(reviewsTable.createdAt));
    res.json({ reviews });
  } catch {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// PUT /api/reviews/admin/:id/approve
router.put("/admin/:id/approve", requireAuth, async (req, res) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const id = parseInt(req.params["id"]!);
    const [review] = await db.update(reviewsTable)
      .set({ status: "approved", rejectionReason: null, updatedAt: new Date() })
      .where(eq(reviewsTable.id, id))
      .returning();
    await recalcProductRating(review.productId);
    res.json({ review });
    // Notify the reviewer
    const [user] = await db.select({ email: usersTable.email, fullName: usersTable.fullName })
      .from(usersTable).where(eq(usersTable.id, review.userId)).limit(1);
    if (user) {
      notifyUser(review.userId, user.email, user.fullName, {
        type: "product_approved",
        title: "Your review has been published!",
        titleAr: "تم نشر مراجعتك!",
        message: `Your ${review.rating}-star review has been approved and is now visible on the product page.`,
        messageAr: `تمت الموافقة على مراجعتك (${review.rating} نجوم) وهي الآن مرئية على صفحة المنتج.`,
        link: `/products/${review.productId}#reviews`,
      }).catch(() => {});
    }
  } catch {
    res.status(500).json({ error: "Failed to approve review" });
  }
});

// PUT /api/reviews/admin/:id/reject
router.put("/admin/:id/reject", requireAuth, async (req, res) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const id = parseInt(req.params["id"]!);
    const { reason } = z.object({ reason: z.string().min(5) }).parse(req.body);
    const [review] = await db.update(reviewsTable)
      .set({ status: "rejected", rejectionReason: reason, updatedAt: new Date() })
      .where(eq(reviewsTable.id, id))
      .returning();
    await recalcProductRating(review.productId);
    res.json({ review });
    // Notify the reviewer
    const [user] = await db.select({ email: usersTable.email, fullName: usersTable.fullName })
      .from(usersTable).where(eq(usersTable.id, review.userId)).limit(1);
    if (user) {
      notifyUser(review.userId, user.email, user.fullName, {
        type: "product_rejected",
        title: "Your review was not published",
        titleAr: "لم يتم نشر مراجعتك",
        message: `Your review could not be published. Reason: ${reason}`,
        messageAr: `تعذر نشر مراجعتك. السبب: ${reason}`,
        link: `/products/${review.productId}`,
      }).catch(() => {});
    }
  } catch (err: any) {
    if (err?.name === "ZodError") res.status(400).json({ error: "Rejection reason required" });
    else res.status(500).json({ error: "Failed to reject review" });
  }
});

export default router;
