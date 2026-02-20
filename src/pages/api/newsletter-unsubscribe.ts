import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { verifyUnsubscribeToken } from "../../lib/newsletterTokens";

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL;
const CMS_TOKEN = process.env.CMS_API_TOKEN;
const HASH_SALT = process.env.NEWSLETTER_HASH_SALT || "colaberry-newsletter";
const REQUEST_TIMEOUT_MS = Number(process.env.NEWSLETTER_API_TIMEOUT_MS || 8000);

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_IP = 20;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

type UnsubscribePayload = {
  email?: unknown;
  token?: unknown;
};

type CMSCollectionResponse = {
  data?: Array<{
    id?: number | string;
    documentId?: string;
    attributes?: {
      status?: string | null;
    };
    status?: string | null;
  }>;
};

function normalizeText(value: unknown, maxLength = 200) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function getClientIp(req: NextApiRequest) {
  const forwarded = req.headers["x-forwarded-for"];
  const fromHeader = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (fromHeader) {
    return fromHeader.split(",")[0]?.trim() || "unknown";
  }
  return req.socket.remoteAddress || "unknown";
}

function hashValue(value: string) {
  return crypto
    .createHash("sha256")
    .update(`${HASH_SALT}:${value}`)
    .digest("hex")
    .slice(0, 24);
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (current.count >= RATE_LIMIT_IP) {
    return true;
  }
  current.count += 1;
  rateBuckets.set(key, current);
  return false;
}

function parsePayload(req: NextApiRequest): UnsubscribePayload | null {
  if (!req.body) return {};
  if (typeof req.body === "object") {
    return req.body as UnsubscribePayload;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as UnsubscribePayload;
    } catch {
      return null;
    }
  }
  return null;
}

async function cmsFetch<T>(path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${CMS_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CMS_TOKEN}`,
        ...(init.headers || {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`CMS ${response.status}: ${text || "request failed"}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveEmail(req: NextApiRequest): Promise<string | null> {
  const queryToken = normalizeText(req.query.token, 1000);
  const queryEmail = normalizeText(req.query.email, 180).toLowerCase();
  if (queryToken) {
    return verifyUnsubscribeToken(queryToken);
  }
  if (EMAIL_PATTERN.test(queryEmail)) {
    return queryEmail;
  }

  const payload = parsePayload(req);
  if (!payload) return null;
  const token = normalizeText(payload.token, 1000);
  if (token) {
    return verifyUnsubscribeToken(token);
  }
  const email = normalizeText(payload.email, 180).toLowerCase();
  if (EMAIL_PATTERN.test(email)) {
    return email;
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "POST, GET");
    return res.status(405).json({ ok: false, message: "Method not allowed." });
  }

  if (!CMS_URL || !CMS_TOKEN) {
    return res
      .status(503)
      .json({ ok: false, message: "Unsubscribe service is temporarily unavailable." });
  }

  const ip = getClientIp(req);
  const ipHash = hashValue(ip);
  if (isRateLimited(ipHash)) {
    return res.status(429).json({ ok: false, message: "Too many requests. Please try again shortly." });
  }

  const email = await resolveEmail(req);
  if (!email || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ ok: false, message: "A valid unsubscribe token or email is required." });
  }

  const requestId = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const userAgent = normalizeText(req.headers["user-agent"], 500) || null;
  const referrer = normalizeText(req.headers.referer, 500) || null;
  const emailHash = hashValue(email);

  try {
    const existing = await cmsFetch<CMSCollectionResponse>(
      `/api/newsletter-subscribers?filters[email][$eq]=${encodeURIComponent(email)}&fields[0]=id&fields[1]=status&pagination[pageSize]=1`
    );

    const entry = existing?.data?.[0] ?? null;
    if (!entry) {
      return res.status(200).json({ ok: true, message: "Email has been unsubscribed.", notFound: true });
    }

    const entryStatus = String((entry.attributes?.status ?? entry.status ?? "")).toLowerCase();
    if (entryStatus === "unsubscribed") {
      return res.status(200).json({ ok: true, message: "This email is already unsubscribed." });
    }

    const entryId = entry.documentId || entry.id;
    if (!entryId) {
      return res.status(500).json({ ok: false, message: "Unable to unsubscribe right now." });
    }

    await cmsFetch(`/api/newsletter-subscribers/${encodeURIComponent(String(entryId))}`, {
      method: "PUT",
      body: JSON.stringify({
        data: {
          status: "unsubscribed",
          unsubscribedAt: nowIso,
          metadata: {
            requestId,
            ipHash,
            emailHash,
            referrer,
            userAgent,
          },
        },
      }),
    });

    return res.status(200).json({ ok: true, message: "You have been unsubscribed successfully." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error(`[newsletter-unsubscribe] ${requestId} ${message}`);
    return res.status(500).json({ ok: false, message: "Unable to unsubscribe at this moment." });
  }
}
