import type { NextApiRequest, NextApiResponse } from "next";
import { isBearerAuthorized } from "../../lib/api-auth";

const CMS_URL = (process.env.CMS_URL || process.env.NEXT_PUBLIC_CMS_URL || "").trim().replace(/\/$/, "");
const CMS_API_TOKEN = (process.env.CMS_API_TOKEN || "").trim();
const SYNC_SECRET = process.env.SYNC_SECRET || "";

const CLIENTS = ["Claude Code", "Cursor", "LibreChat", "Claude.ai", "Codex"];
const TOOLS_FALLBACK = ["default_tool"];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function cmsHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (CMS_API_TOKEN) h.Authorization = `Bearer ${CMS_API_TOKEN}`;
  return h;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isBearerAuthorized(req, SYNC_SECRET)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!CMS_URL) {
    return res.status(500).json({ error: "CMS_URL not configured" });
  }

  const slug = (req.query.slug as string) || (req.body?.slug as string);
  if (!slug) {
    return res.status(400).json({ error: "slug is required (query param or body)" });
  }

  const tools: string[] = req.body?.tools || TOOLS_FALLBACK;
  const days = Math.min(Number(req.body?.days) || 30, 90);
  const totalEvents = Math.min(Number(req.body?.totalEvents) || 5000, 20000);

  // Weight tools so the first tool gets more calls
  const toolWeights = tools.map((_, i) => Math.max(10, 100 - i * 20));
  const totalWeight = toolWeights.reduce((s, w) => s + w, 0);

  // Generate events distributed over the last N days
  const now = new Date();
  const events: Array<{
    mcpServerSlug: string;
    toolName: string;
    clientName: string;
    latencyMs: number;
    success: boolean;
    timestamp: string;
  }> = [];

  for (let i = 0; i < totalEvents; i++) {
    // Pick weighted tool
    let r = Math.random() * totalWeight;
    let toolIdx = 0;
    for (let j = 0; j < toolWeights.length; j++) {
      r -= toolWeights[j];
      if (r <= 0) { toolIdx = j; break; }
    }

    const daysAgo = Math.random() * days;
    const ts = new Date(now.getTime() - daysAgo * 86400000);

    events.push({
      mcpServerSlug: slug,
      toolName: tools[toolIdx],
      clientName: pick(CLIENTS),
      latencyMs: rand(200, 3000),
      success: Math.random() > 0.006, // ~99.4% success rate
      timestamp: ts.toISOString(),
    });
  }

  // Batch insert into Strapi (in chunks of 50 to avoid timeouts)
  let created = 0;
  let errors = 0;
  const BATCH = 50;

  for (let i = 0; i < events.length; i += BATCH) {
    const batch = events.slice(i, i + BATCH);
    const promises = batch.map((event) =>
      fetch(`${CMS_URL}/api/mcp-telemetry-events`, {
        method: "POST",
        headers: cmsHeaders(),
        body: JSON.stringify({ data: event }),
      })
        .then((r) => { if (r.ok) created++; else errors++; })
        .catch(() => { errors++; })
    );
    await Promise.all(promises);
  }

  return res.status(200).json({
    success: true,
    slug,
    totalGenerated: events.length,
    created,
    errors,
    days,
    tools,
  });
}
