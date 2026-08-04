/**
 * Minimal in-process rate limiter.
 *
 * Guards credential endpoints against brute force. Deliberately dependency-free
 * and in-memory: the counters live per process, so with several PM2 instances
 * the effective limit is (limit x instances). That is acceptable for slowing
 * credential stuffing; a shared store (Redis) would be required for a hard
 * global guarantee.
 */
import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodic sweep so the map cannot grow without bound.
const SWEEP_MS = 5 * 60_000;
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}, SWEEP_MS);
sweeper.unref();

/** Loopback or RFC1918/ULA — i.e. a reverse proxy we host, not the internet. */
function isTrustedHop(addr: string): boolean {
  const ip = addr.replace(/^::ffff:/, "");
  return (
    ip === "127.0.0.1" || ip === "::1" || ip === "localhost" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    /^f[cd]/i.test(ip)
  );
}

/**
 * Resolves the address a limit is counted against.
 *
 * Forwarding headers are only honoured when the TCP peer is a local/private
 * hop, i.e. our own Nginx. When the peer is a public address the request
 * reached the app directly, so the headers are caller-supplied and ignored —
 * otherwise an attacker rotating X-Forwarded-For would mint a fresh bucket per
 * request and bypass the limit entirely.
 *
 * The first X-Forwarded-For entry is never used even when trusted: Nginx is
 * configured with $proxy_add_x_forwarded_for, which APPENDS the real address to
 * whatever the caller sent, so only the last entry was added by the proxy.
 * X-Real-IP is replaced outright by the proxy and is preferred.
 */
function clientKey(req: Request): string {
  const peer = req.socket.remoteAddress || "unknown";

  if (isTrustedHop(peer)) {
    const realIp = (req.headers["x-real-ip"] as string | undefined)?.trim();
    if (realIp) return realIp;

    const chain = (req.headers["x-forwarded-for"] as string | undefined)
      ?.split(",").map((p) => p.trim()).filter(Boolean);
    if (chain && chain.length > 0) return chain[chain.length - 1]!;
  }

  return peer;
}

export interface RateLimitOptions {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Maximum requests allowed per key within the window. */
  limit: number;
  /** Distinguishes independent limits sharing one client key. */
  name: string;
}

export function rateLimit(opts: RateLimitOptions) {
  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const client = clientKey(req);
    const key = `${opts.name}:${client}`;

    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }

    bucket.count += 1;

    if (bucket.count > opts.limit) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      logger.warn({ route: opts.name, client, count: bucket.count }, "Rate limit exceeded");
      res.status(429).json({
        error: "Too many attempts. Please try again later.",
        code: "RATE_LIMITED",
        retryAfter,
      });
      return;
    }

    next();
  };
}

/** Credential endpoints: strict, since each attempt is a guess. */
export const authLimiter = rateLimit({ name: "auth", windowMs: 15 * 60_000, limit: 10 });

/** Account creation and password-reset mail: slower still. */
export const accountLimiter = rateLimit({ name: "account", windowMs: 60 * 60_000, limit: 5 });
