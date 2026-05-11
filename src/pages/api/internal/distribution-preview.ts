/**
 * Admin-only DRY_RUN preview of the catalog distribution pipeline.
 *
 * Always runs in dry-run mode — external APIs are never called from
 * this endpoint, even if a caller tries. Useful for previewing tomorrow
 * morning's post before the cron fires.
 *
 * Accepts GET or POST. Auth via admin API key (`x-colaberry-admin-key`
 * or `Authorization: Bearer <COLABERRY_ADMIN_KEY>`). Localhost bypass
 * only in dev (per `isAdminAuthorized`).
 *
 * Query params:
 *   - windowHours: 1..336 (default 24)
 *   - kind: repeatable — restrict to specific ContentKinds
 *   - platform: repeatable — restrict to specific Platforms
 *   - channel: one `documentId` — dry-run a single CMS channel
 *   - forceStatic=true — bypass CMS and use the hard-coded fallback
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { isAdminAuthorized } from "../../../lib/api-auth";
import { runDistribution } from "../../../lib/distribution/orchestrator";
import type {
  ContentKind,
  DistributionRunResult,
  Platform,
} from "../../../lib/distribution/types";

const ADMIN_KEY = (process.env.COLABERRY_ADMIN_KEY || "").trim();

const VALID_KINDS: readonly ContentKind[] = [
  "agent",
  "mcpServer",
  "skill",
  "podcastEpisode",
  "llmArchitecture",
];
const VALID_PLATFORMS: readonly Platform[] = [
  "x",
  "moltbook",
  "huggingface",
  "devto",
  "hashnode",
  "reddit",
  "discord",
  "producthunt",
  "hackernews",
  "github",
];

type ErrorResponse = { error: string };

function parseWindowHours(req: NextApiRequest): number | undefined {
  const raw = req.query.windowHours;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 24 * 14) return undefined;
  return parsed;
}

function parseRepeatable(req: NextApiRequest, key: string): string[] {
  const raw = req.query[key];
  if (!raw) return [];
  return (Array.isArray(raw) ? raw : [raw])
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DistributionRunResult | ErrorResponse>
) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAdminAuthorized(req, ADMIN_KEY)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const kindParams = parseRepeatable(req, "kind");
  const kinds = kindParams.filter((k): k is ContentKind =>
    (VALID_KINDS as readonly string[]).includes(k)
  );

  const platformParams = parseRepeatable(req, "platform");
  const platforms = platformParams.filter((p): p is Platform =>
    (VALID_PLATFORMS as readonly string[]).includes(p)
  );

  const channelRaw = req.query.channel;
  const channelDocumentId = Array.isArray(channelRaw)
    ? channelRaw[0]
    : channelRaw;
  const forceStaticRaw = req.query.forceStatic;
  const forceStaticValue = Array.isArray(forceStaticRaw)
    ? forceStaticRaw[0]
    : forceStaticRaw;
  const forceStaticChannels =
    (forceStaticValue || "").toLowerCase() === "true";

  try {
    const result = await runDistribution({
      dryRun: true, // hard-coded — this endpoint NEVER live-posts
      windowHours: parseWindowHours(req),
      kinds: kinds.length ? kinds : undefined,
      platforms: platforms.length ? platforms : undefined,
      channelDocumentId:
        typeof channelDocumentId === "string" && channelDocumentId.trim()
          ? channelDocumentId.trim()
          : undefined,
      forceStaticChannels,
    });

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(result);
  } catch (error) {
    console.error(
      "[distribution-preview]",
      error instanceof Error ? error.stack || error.message : error
    );
    return res.status(500).json({ error: "Preview crashed" });
  }
}
