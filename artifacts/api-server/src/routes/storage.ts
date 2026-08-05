import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth, verifyToken } from "../middlewares/auth";
import {
  isConfigured, newObjectKey, isValidKey, assertAllowedContentType, maxUploadBytes,
  createUploadUrl, createReadUrl, headObject, deleteObject, canRead, canDelete,
  StorageError,
} from "../storage/s3";

const router: IRouter = Router();

const RequestUploadUrlBody = z.object({
  name: z.string().min(1),
  size: z.number().int().positive(),
  contentType: z.string().min(1),
  visibility: z.enum(["public", "private"]).optional(),
});

function fail(req: Request, res: Response, err: unknown): void {
  if (err instanceof StorageError) {
    res.status(err.httpStatus).json({ error: err.message, code: err.code });
    return;
  }
  req.log.error({ err }, "Storage error");
  res.status(500).json({ error: "Storage error" });
}

/** Optional identity, used to authorise reads of private objects. */
function currentUser(req: Request): { userId: number; role: string } | null {
  const token = req.cookies?.["orbit_token"] || req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const p = verifyToken(token);
    return { userId: p.userId, role: p.role };
  } catch {
    return null;
  }
}

/**
 * Issues a presigned upload URL. Authenticated: an anonymous caller could
 * otherwise mint unlimited uploads against the bucket. The response shape is
 * unchanged, so the web client PUTs the bytes to `uploadURL` exactly as before.
 */
router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
  if (!isConfigured()) {
    res.status(503).json({ error: "Object storage is not configured. Set S3_BUCKET and S3_REGION." });
    return;
  }

  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }
  const { name, size, contentType, visibility } = parsed.data;

  try {
    assertAllowedContentType(contentType);
    if (size > maxUploadBytes()) {
      throw new StorageError("File exceeds the maximum upload size", "TOO_LARGE", 413);
    }

    const key = newObjectKey();
    const uploadURL = await createUploadUrl({
      key,
      ownerId: req.user!.userId,
      contentType,
      // Product imagery is shown to anonymous shoppers, so uploads are public
      // unless the caller explicitly asks otherwise.
      visibility: visibility ?? "public",
    });

    res.json({ uploadURL, objectPath: `/objects/${key}`, metadata: { name, size, contentType } });
  } catch (err) {
    fail(req, res, err);
  }
});

/**
 * Serves an object. The ACL is enforced here, then the caller is redirected to
 * a short-lived presigned URL so the bytes stream from S3 rather than through
 * the application. A redirect is used because `<img>` follows it and cannot
 * send an Authorization header.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  if (!isConfigured()) {
    res.status(503).json({ error: "Object storage is not configured" });
    return;
  }

  const raw = req.params.path;
  const wildcard = Array.isArray(raw) ? raw.join("/") : raw;
  const key = (wildcard ?? "").split("/")[0] ?? "";

  try {
    if (!isValidKey(key)) {
      res.status(404).json({ error: "Object not found" });
      return;
    }

    const meta = await headObject(key);
    if (!meta) {
      res.status(404).json({ error: "Object not found" });
      return;
    }

    const user = currentUser(req);
    if (!canRead(meta, user?.userId, user?.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    res.setHeader(
      "Cache-Control",
      meta.visibility === "public" ? "public, max-age=300" : "private, no-store",
    );
    res.redirect(302, await createReadUrl(key));
  } catch (err) {
    fail(req, res, err);
  }
});

/** Removes an object. Restricted to its owner and administrators. */
router.delete("/storage/objects/:key", requireAuth, async (req: Request, res: Response) => {
  if (!isConfigured()) {
    res.status(503).json({ error: "Object storage is not configured" });
    return;
  }

  const key = String(req.params["key"]);
  try {
    if (!isValidKey(key)) {
      res.status(404).json({ error: "Object not found" });
      return;
    }

    const meta = await headObject(key);
    if (!meta) {
      res.status(404).json({ error: "Object not found" });
      return;
    }

    if (!canDelete(meta, req.user!.userId, req.user!.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await deleteObject(key);
    res.json({ deleted: true, objectPath: `/objects/${key}` });
  } catch (err) {
    fail(req, res, err);
  }
});

export default router;
