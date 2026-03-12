import { timingSafeEqual } from "crypto";
import type { NextApiRequest } from "next";

/**
 * Extract API key from request headers.
 * Supports `x-colaberry-admin-key` header and `Authorization: Bearer <token>`.
 */
export function getApiKey(req: NextApiRequest): string {
  const rawHeader = req.headers["x-colaberry-admin-key"];
  const apiKey = Array.isArray(rawHeader) ? rawHeader[0] || "" : rawHeader || "";
  if (apiKey) return apiKey;

  return getBearerToken(req);
}

/**
 * Extract Bearer token from Authorization header.
 */
export function getBearerToken(req: NextApiRequest): string {
  const auth = req.headers.authorization;
  const bearer = Array.isArray(auth) ? auth[0] || "" : auth || "";
  const prefix = "Bearer ";
  if (bearer.startsWith(prefix)) {
    return bearer.slice(prefix.length).trim();
  }
  return "";
}

/**
 * Timing-safe comparison of two strings.
 * Prevents timing attacks on API key validation.
 */
export function isValidKey(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Check if the request is from localhost in development mode only.
 * In production, always returns false to prevent header spoofing.
 */
export function isLocalDevelopment(req: NextApiRequest): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const rawHost = req.headers.host;
  const host = Array.isArray(rawHost) ? rawHost[0] || "" : rawHost || "";
  return /^localhost(?::\d+)?$/i.test(host) || /^127\.0\.0\.1(?::\d+)?$/i.test(host);
}

/**
 * Check if the request is authorized for admin endpoints.
 * Uses timing-safe comparison and restricts localhost bypass to development.
 */
export function isAdminAuthorized(req: NextApiRequest, expectedKey: string): boolean {
  if (isLocalDevelopment(req)) return true;
  if (!expectedKey) return false;
  return isValidKey(getApiKey(req), expectedKey);
}

/**
 * Check if the request is authorized via Bearer token (for sync/seed routes).
 * Uses timing-safe comparison.
 */
export function isBearerAuthorized(req: NextApiRequest, expectedSecret: string): boolean {
  if (!expectedSecret) return false;
  const token = getBearerToken(req);
  return isValidKey(token, expectedSecret);
}
