import crypto from "crypto";
import type { NextApiRequest } from "next";

const HASH_SALT = process.env.RATE_LIMIT_SALT || "colaberry-rl";
const MAX_BUCKETS = 10_000;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function cleanup() {
  if (buckets.size < MAX_BUCKETS) return;
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(`${HASH_SALT}:${ip}`).digest("hex").slice(0, 24);
}

/**
 * Get client IP from request, using the first value from x-forwarded-for.
 */
export function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  const fromHeader = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (fromHeader) {
    return fromHeader.split(",")[0]?.trim() || "unknown";
  }
  return req.socket.remoteAddress || "unknown";
}

/**
 * Check if a request is rate limited.
 * @param prefix - Namespace prefix (e.g., "mcps", "demo-request")
 * @param ip - Client IP address
 * @param limit - Max requests per window
 * @param windowMs - Time window in milliseconds
 * @returns true if rate limited
 */
export function isRateLimited(
  prefix: string,
  ip: string,
  limit: number,
  windowMs: number
): boolean {
  cleanup();
  const key = `${prefix}:${hashIp(ip)}`;
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (current.count >= limit) return true;

  current.count++;
  return false;
}
