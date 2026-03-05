import type { NextApiRequest, NextApiResponse } from "next";
import { syncBuzzsproutToStrapi, type SyncResult } from "../../../lib/buzzsproutSync";

const SYNC_SECRET = (process.env.PODCAST_SYNC_SECRET || "").trim();

type ErrorResponse = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SyncResult | ErrorResponse>
) {
  // Only allow POST (Cloud Scheduler sends POST)
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify shared secret
  if (SYNC_SECRET) {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (token !== SYNC_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  try {
    const result = await syncBuzzsproutToStrapi();

    // Never cache cron responses
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(result);
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Unknown sync error";
    return res.status(500).json({ error: reason });
  }
}
