import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /api/notifications — user's notifications
router.get("/", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query["limit"] as string || "30"), 100);
    const onlyUnread = req.query["unread"] === "true";

    const conditions = [eq(notificationsTable.userId, req.user!.userId)];
    if (onlyUnread) conditions.push(eq(notificationsTable.isRead, false));

    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(and(...conditions))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(limit);

    res.json({ notifications });
  } catch {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// GET /api/notifications/count — unread count
router.get("/count", requireAuth, async (req, res) => {
  try {
    const [result] = await db
      .select({ count: count() })
      .from(notificationsTable)
      .where(and(
        eq(notificationsTable.userId, req.user!.userId),
        eq(notificationsTable.isRead, false)
      ));
    res.json({ count: result?.count ?? 0 });
  } catch {
    res.status(500).json({ error: "Failed to fetch count" });
  }
});

// PUT /api/notifications/:id/read — mark single as read
router.put("/:id/read", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(
        eq(notificationsTable.id, id),
        eq(notificationsTable.userId, req.user!.userId)
      ));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

// PUT /api/notifications/read-all — mark all as read
router.put("/read-all", requireAuth, async (req, res) => {
  try {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(
        eq(notificationsTable.userId, req.user!.userId),
        eq(notificationsTable.isRead, false)
      ));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});

// DELETE /api/notifications/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    await db
      .delete(notificationsTable)
      .where(and(
        eq(notificationsTable.id, id),
        eq(notificationsTable.userId, req.user!.userId)
      ));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

// DELETE /api/notifications/clear-all
router.delete("/clear-all", requireAuth, async (req, res) => {
  try {
    await db
      .delete(notificationsTable)
      .where(eq(notificationsTable.userId, req.user!.userId));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to clear notifications" });
  }
});

export default router;
