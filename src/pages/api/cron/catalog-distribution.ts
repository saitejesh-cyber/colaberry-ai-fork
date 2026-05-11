/**
 * Daily catalog distribution cron.
 *
 * POST-only, bearer-auth, no-store. Mirrors the `buzzsprout-sync`
 * pattern — Cloud Scheduler hits this with a shared secret.
 *
 * Live-post mode requires BOTH:
 *   - A valid bearer token matching CATALOG_DISTRIBUTION_SECRET, AND
 *   - Explicit `?live=true` query flag OR env `CATALOG_DISTRIBUTION_LIVE=true`.
 *
 * Without the live flag the run is DRY_RUN — we serialize payloads,
 * return the full DistributionRunResult, but make zero external calls.
 * This is the production-safe default.
 *
 * Sprint v5 — config is fetched from the Strapi `distribution-channel`
 * collection. When CMS is down the orchestrator falls back to its
 * hard-coded `STATIC_CHANNELS` constant; ops can force that path for
 * recovery with `?forceStatic=true`.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { isBearerAuthorized } from "../../../lib/api-auth";
import { runDistribution } from "../../../lib/distribution/orchestrator";
import type { DistributionRunResult } from "../../../lib/distribution/types";

const SECRET = (process.env.CATALOG_DISTRIBUTION_SECRET || "").trim();
const LIVE_ENV_FLAG =
  (process.env.CATALOG_DISTRIBUTION_LIVE || "").trim().toLowerCase() === "true";

type ErrorResponse = { error: string };

function parseLiveFlag(req: NextApiRequest): boolean {
  const raw = req.query.live;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value || "").toLowerCase() === "true";
}

function parseWindowHours(req: NextApiRequest): number | undefined {
  const raw = req.query.windowHours;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 24 * 14) return undefined;
  return parsed;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DistributionRunResult | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isBearerAuthorized(req, SECRET)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const liveFromQuery = parseLiveFlag(req);
  const dryRun = !(LIVE_ENV_FLAG || liveFromQuery);

  const forceStaticRaw = req.query.forceStatic;
  const forceStaticValue = Array.isArray(forceStaticRaw)
    ? forceStaticRaw[0]
    : forceStaticRaw;
  const forceStaticChannels =
    (forceStaticValue || "").toLowerCase() === "true";

  try {
    const result = await runDistribution({
      dryRun,
      windowHours: parseWindowHours(req),
      forceStaticChannels,
    });

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(result);
  } catch (error) {
    // The orchestrator catches its own errors into runErrors, so this
    // branch is reserved for programmer bugs (e.g. the orchestrator
    // throws before it can wrap). We log and return 500 so alerting
    // trips rather than quietly eating the failure.
    console.error(
      "[catalog-distribution]",
      error instanceof Error ? error.stack || error.message : error
    );
    return res.status(500).json({ error: "Distribution run crashed" });
  }
}
