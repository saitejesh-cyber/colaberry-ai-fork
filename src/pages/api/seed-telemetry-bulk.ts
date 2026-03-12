import type { NextApiRequest, NextApiResponse } from "next";
import { isBearerAuthorized } from "../../lib/api-auth";

const CMS_URL = (process.env.CMS_URL || process.env.NEXT_PUBLIC_CMS_URL || "").trim().replace(/\/$/, "");
const CMS_API_TOKEN = (process.env.CMS_API_TOKEN || "").trim();
const SYNC_SECRET = process.env.SYNC_SECRET || "";

const CLIENTS = ["Claude Code", "Cursor", "LibreChat", "Claude.ai", "Codex"];

// Common MCP tool names per server type
const TOOL_SETS: Record<string, string[]> = {
  default: ["query", "execute", "list", "get"],
  Package: ["run", "install", "configure", "status"],
  Remote: ["connect", "send", "receive", "disconnect"],
  Docker: ["deploy", "logs", "status", "restart"],
};

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

async function fetchAllSlugs(): Promise<Array<{ slug: string; serverType: string | null }>> {
  const all: Array<{ slug: string; serverType: string | null }> = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const url = `${CMS_URL}/api/mcp-servers?fields[0]=slug&fields[1]=serverType&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
    const res = await fetch(url, { headers: cmsHeaders() });
    if (!res.ok) break;
    const body = await res.json();
    const items = body?.data || [];
    for (const item of items) {
      if (item.slug) all.push({ slug: item.slug, serverType: item.serverType });
    }
    if (items.length < pageSize) break;
    page++;
  }

  return all;
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

  const eventsPerServer = Math.min(Number(req.body?.eventsPerServer) || 30, 200);
  const days = Math.min(Number(req.body?.days) || 30, 90);
  const BATCH = 100;

  // Fetch all server slugs
  const servers = await fetchAllSlugs();
  if (servers.length === 0) {
    return res.status(404).json({ error: "No servers found in CMS" });
  }

  let totalCreated = 0;
  let totalErrors = 0;
  let serversProcessed = 0;

  // Process servers in groups
  for (const server of servers) {
    const tools = TOOL_SETS[server.serverType || "default"] || TOOL_SETS.default;
    const now = new Date();
    const events: Array<Record<string, unknown>> = [];

    for (let i = 0; i < eventsPerServer; i++) {
      const daysAgo = Math.random() * days;
      const ts = new Date(now.getTime() - daysAgo * 86400000);

      events.push({
        mcpServerSlug: server.slug,
        toolName: pick(tools),
        clientName: pick(CLIENTS),
        latencyMs: rand(150, 3500),
        success: Math.random() > 0.008,
        timestamp: ts.toISOString(),
      });
    }

    // Batch create events
    for (let i = 0; i < events.length; i += BATCH) {
      const batch = events.slice(i, i + BATCH);
      const promises = batch.map((event) =>
        fetch(`${CMS_URL}/api/mcp-telemetry-events`, {
          method: "POST",
          headers: cmsHeaders(),
          body: JSON.stringify({ data: event }),
        })
          .then((r) => { if (r.ok) totalCreated++; else totalErrors++; })
          .catch(() => { totalErrors++; })
      );
      await Promise.all(promises);
    }

    serversProcessed++;
  }

  return res.status(200).json({
    success: true,
    serversProcessed,
    totalServers: servers.length,
    eventsPerServer,
    totalCreated,
    totalErrors,
    days,
  });
}
