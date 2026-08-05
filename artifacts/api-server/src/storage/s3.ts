/**
 * S3 object storage.
 *
 * The single storage implementation: uploads are presigned PUTs straight to
 * S3, reads are ACL-checked and then redirected to a short-lived presigned GET,
 * and access control lives in each object's S3 metadata rather than in a
 * policy file that was never written.
 */
import crypto from "crypto";
import {
  S3Client, HeadObjectCommand, DeleteObjectCommand, GetObjectCommand, PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type Visibility = "public" | "private";

export interface ObjectMeta {
  key: string;
  owner: number | null;
  visibility: Visibility;
  contentType: string;
  size: number;
}

export class StorageError extends Error {
  constructor(message: string, readonly code: string, readonly httpStatus = 400) {
    super(message);
    this.name = "StorageError";
  }
}

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // keep in step with Nginx client_max_body_size
const UPLOAD_URL_TTL = 15 * 60;             // seconds
const READ_URL_TTL = 5 * 60;

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
]);

/** Opaque keys only — never a caller-supplied path, so traversal is impossible. */
const KEY_PATTERN = /^[a-f0-9]{32}$/;

let client: S3Client | null = null;

export function isConfigured(): boolean {
  return Boolean(process.env["S3_BUCKET"] && process.env["S3_REGION"]);
}

export function bucket(): string {
  const b = process.env["S3_BUCKET"];
  if (!b) throw new StorageError("S3_BUCKET is not configured", "NOT_CONFIGURED", 503);
  return b;
}

export function maxUploadBytes(): number {
  const raw = Number(process.env["MAX_UPLOAD_BYTES"]);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_BYTES;
}

/**
 * Credentials are resolved by the AWS SDK's default chain, so an EC2 instance
 * role works without putting long-lived keys in the environment. Explicit keys
 * are still honoured when supplied.
 */
function s3(): S3Client {
  if (client) return client;
  const region = process.env["S3_REGION"];
  if (!region) throw new StorageError("S3_REGION is not configured", "NOT_CONFIGURED", 503);

  const accessKeyId = process.env["AWS_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["AWS_SECRET_ACCESS_KEY"];

  client = new S3Client({
    region,
    ...(process.env["S3_ENDPOINT"] ? { endpoint: process.env["S3_ENDPOINT"], forcePathStyle: true } : {}),
    ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
  });
  return client;
}

export function newObjectKey(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function isValidKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

export function assertAllowedContentType(contentType: string): void {
  const base = contentType.split(";")[0]!.trim().toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(base)) {
    throw new StorageError(`Unsupported file type: ${contentType}`, "UNSUPPORTED_TYPE", 415);
  }
}

/**
 * Presigned PUT. Owner and visibility are pinned into the signature as required
 * metadata headers, so the browser cannot upload an object that claims a
 * different owner or escalates its own visibility.
 */
export async function createUploadUrl(opts: {
  key: string;
  ownerId: number;
  contentType: string;
  visibility: Visibility;
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: `objects/${opts.key}`,
    ContentType: opts.contentType,
    Metadata: {
      owner: String(opts.ownerId),
      visibility: opts.visibility,
    },
  });

  return getSignedUrl(s3(), command, {
    expiresIn: UPLOAD_URL_TTL,
    signableHeaders: new Set(["content-type"]),
  });
}

/** Reads an object's metadata, or null when it does not exist. */
export async function headObject(key: string): Promise<ObjectMeta | null> {
  if (!isValidKey(key)) return null;
  try {
    const out = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: `objects/${key}` }));
    const ownerRaw = out.Metadata?.["owner"];
    const visibility = out.Metadata?.["visibility"] === "private" ? "private" : "public";
    return {
      key,
      owner: ownerRaw !== undefined ? Number(ownerRaw) : null,
      visibility,
      contentType: out.ContentType ?? "application/octet-stream",
      size: out.ContentLength ?? 0,
    };
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === "NotFound" || name === "NoSuchKey") return null;
    throw err;
  }
}

/** Short-lived presigned GET used to serve the bytes after an ACL check. */
export async function createReadUrl(key: string): Promise<string> {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket(), Key: `objects/${key}` }), {
    expiresIn: READ_URL_TTL,
  });
}

export async function deleteObject(key: string): Promise<void> {
  if (!isValidKey(key)) throw new StorageError("Invalid object key", "BAD_KEY", 400);
  await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: `objects/${key}` }));
}

/**
 * Access decision. Public objects are readable by anyone — product images are
 * shown to anonymous shoppers — while private objects are limited to their
 * owner and administrators.
 */
export function canRead(meta: ObjectMeta, userId?: number, role?: string): boolean {
  if (meta.visibility === "public") return true;
  if (role === "admin") return true;
  return userId !== undefined && meta.owner === userId;
}

/** Only the owner or an administrator may remove an object. */
export function canDelete(meta: ObjectMeta, userId: number, role: string): boolean {
  return role === "admin" || meta.owner === userId;
}
