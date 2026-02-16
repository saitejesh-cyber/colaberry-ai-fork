import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL;
const CMS_TOKEN = process.env.CMS_API_TOKEN;
const HASH_SALT = process.env.PODCAST_LOG_HASH_SALT || "colaberry-podcast-log";
const CMS_TIMEOUT_MS = Number(process.env.PODCAST_LOG_TIMEOUT_MS || 6000);

const ALLOWED_EVENTS = new Set(["view", "play", "share", "subscribe", "click"] as const);
const EPISODE_SLUG_PATTERN = /^[a-z0-9-]{2,160}$/i;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT_PER_IP = 80;
const DEDUPE_WINDOW_MS: Record<PodcastEventType, number> = {
  view: 60_000,
  play: 12_000,
  share: 6_000,
  subscribe: 10_000,
  click: 6_000,
};

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const dedupeBuckets = new Map<string, number>();

type PodcastEventType = "view" | "play" | "share" | "subscribe" | "click";

type PodcastLogPayload = {
  eventType?: unknown;
  platform?: unknown;
  episodeSlug?: unknown;
  episodeTitle?: unknown;
  sessionId?: unknown;
  pagePath?: unknown;
  referrer?: unknown;
};

type EpisodeQueryResponse = {
  data?: Array<{
    id?: number | string;
    documentId?: string;
    attributes?: Record<string, unknown>;
    viewCount?: unknown;
    playCount?: unknown;
    shareCount?: unknown;
    subscribeCount?: unknown;
    clickCount?: unknown;
  }>;
};

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function parsePayload(req: NextApiRequest): PodcastLogPayload | null {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body as PodcastLogPayload;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as PodcastLogPayload;
    } catch {
      return null;
    }
  }
  return null;
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
  if (rateBuckets.size > 4000) {
    for (const [bucketKey, bucket] of rateBuckets.entries()) {
      if (bucket.resetAt <= now) {
        rateBuckets.delete(bucketKey);
      }
    }
  }
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (current.count >= RATE_LIMIT_PER_IP) {
    return true;
  }
  current.count += 1;
  rateBuckets.set(key, current);
  return false;
}

function shouldDedupe(eventType: PodcastEventType, sessionId: string, episodeSlug: string, platform: string) {
  const now = Date.now();
  if (dedupeBuckets.size > 6000) {
    for (const [bucketKey, timestamp] of dedupeBuckets.entries()) {
      if (now - timestamp > RATE_WINDOW_MS) {
        dedupeBuckets.delete(bucketKey);
      }
    }
  }
  const key = `${sessionId}:${eventType}:${episodeSlug}:${platform}`;
  const previous = dedupeBuckets.get(key);
  const threshold = DEDUPE_WINDOW_MS[eventType];
  if (previous && now - previous < threshold) {
    return true;
  }
  dedupeBuckets.set(key, now);
  return false;
}

async function cmsFetch(path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CMS_TIMEOUT_MS);
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
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function resolveCountField(eventType: PodcastEventType) {
  const map: Record<PodcastEventType, string> = {
    view: "viewCount",
    play: "playCount",
    share: "shareCount",
    subscribe: "subscribeCount",
    click: "clickCount",
  };
  return map[eventType];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, reason: "method_not_allowed" });
  }

  if (!CMS_URL || !CMS_TOKEN) {
    return res.status(200).json({ ok: false, reason: "logging_disabled" });
  }

  const payload = parsePayload(req);
  if (!payload) {
    return res.status(400).json({ ok: false, reason: "invalid_payload" });
  }

  const eventTypeRaw = normalizeText(payload.eventType, 32).toLowerCase();
  if (!ALLOWED_EVENTS.has(eventTypeRaw as PodcastEventType)) {
    return res.status(400).json({ ok: false, reason: "invalid_event" });
  }
  const eventType = eventTypeRaw as PodcastEventType;

  const episodeSlug = normalizeText(payload.episodeSlug, 160).toLowerCase();
  if (!episodeSlug || !EPISODE_SLUG_PATTERN.test(episodeSlug)) {
    return res.status(400).json({ ok: false, reason: "invalid_episode" });
  }

  const platform = normalizeText(payload.platform, 80).toLowerCase() || null;
  const episodeTitle = normalizeText(payload.episodeTitle, 220) || null;
  const sessionId = normalizeText(payload.sessionId, 120) || "anonymous";
  const pagePath = normalizeText(payload.pagePath, 220) || null;

  const ip = getClientIp(req);
  const ipHash = hashValue(ip);
  if (isRateLimited(ipHash)) {
    return res.status(200).json({ ok: false, reason: "rate_limited" });
  }
  if (shouldDedupe(eventType, sessionId, episodeSlug, platform || "")) {
    return res.status(200).json({ ok: true, deduped: true });
  }

  const requestId = crypto.randomUUID();
  const userAgent = normalizeText(req.headers["user-agent"], 500) || null;
  const referrer =
    normalizeText(payload.referrer, 500) || normalizeText(req.headers.referer, 500) || null;
  const occurredAt = new Date().toISOString();

  try {
    let episodeRefId: number | string | null = null;
    let currentCount: number | null = null;
    const countField = resolveCountField(eventType);

    const episodeRes = (await cmsFetch(
      `/api/podcast-episodes?filters[slug][$eq]=${encodeURIComponent(
        episodeSlug
      )}&fields[0]=id&fields[1]=documentId&fields[2]=${countField}&pagination[pageSize]=1`
    )) as EpisodeQueryResponse;

    const episodeEntry = episodeRes?.data?.[0];
    if (episodeEntry) {
      const attrs = (episodeEntry.attributes ?? episodeEntry) as Record<string, unknown>;
      episodeRefId = episodeEntry.documentId || episodeEntry.id || null;
      const rawCount = Number(attrs?.[countField] ?? 0);
      currentCount = Number.isFinite(rawCount) ? rawCount : 0;
    }

    await cmsFetch("/api/podcast-logs", {
      method: "POST",
      body: JSON.stringify({
        data: {
          eventType,
          platform,
          episodeSlug,
          episodeTitle,
          episode: episodeRefId,
          pagePath,
          url: pagePath || referrer,
          referrer,
          userAgent,
          sessionId,
          requestId,
          ipHash,
          occurredAt,
        },
      }),
    });

    if (episodeRefId && currentCount !== null) {
      await cmsFetch(`/api/podcast-episodes/${encodeURIComponent(String(episodeRefId))}`, {
        method: "PUT",
        body: JSON.stringify({
          data: {
            [countField]: currentCount + 1,
          },
        }),
      });
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    console.error(`[podcast-log] ${requestId} ${reason}`);
    return res.status(200).json({ ok: false, reason: "log_failed" });
  }

  return res.status(200).json({ ok: true });
}
