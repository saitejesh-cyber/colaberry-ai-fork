import type { NextApiRequest, NextApiResponse } from "next";
import { getTelemetrySlugs } from "../../lib/mcp-slug-aliases";

const CMS_URL = (process.env.CMS_URL || process.env.NEXT_PUBLIC_CMS_URL || "").trim().replace(/\/$/, "");
const CMS_API_TOKEN = (process.env.CMS_API_TOKEN || "").trim();

/* ── Types ─────────────────────────────────────────────────── */

type TelemetryEvent = {
  id: number;
  mcpServerSlug: string;
  toolName: string;
  clientName: string;
  latencyMs: number;
  success: boolean;
  timestamp: string;
};

type ToolMetric = {
  name: string;
  calls: number;
  avgLatencyMs: number;
  uptimePercent: number;
};

type TelemetryResponse = {
  performance: {
    tools: ToolMetric[];
    totalCalls: number;
    avgLatencyMs: number;
    uptimePercent: number;
    latencyTimeSeries: Array<{ date: string; p50LatencyMs: number }>;
  };
  usage: {
    topClients: Array<{ name: string; calls: number }>;
    totalCalls: number;
    dailySessions: Array<{ date: string; sessions: number }>;
  };
};

/* ── In-memory cache ───────────────────────────────────────── */

const cache = new Map<string, { data: TelemetryResponse; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/* ── Helpers ───────────────────────────────────────────────── */

function cmsHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (CMS_API_TOKEN) h.Authorization = `Bearer ${CMS_API_TOKEN}`;
  return h;
}

async function fetchTelemetryEvents(slugs: string[]): Promise<TelemetryEvent[]> {
  const events: TelemetryEvent[] = [];
  let page = 1;

  // Build Strapi filter: $in for multiple slugs, $eq for single
  const slugFilter =
    slugs.length === 1
      ? `filters[mcpServerSlug][$eq]=${encodeURIComponent(slugs[0])}`
      : slugs.map((s, i) => `filters[mcpServerSlug][$in][${i}]=${encodeURIComponent(s)}`).join("&");

  for (let i = 0; i < 20; i++) {
    const url = `${CMS_URL}/api/mcp-telemetry-events?${slugFilter}&pagination[page]=${page}&pagination[pageSize]=100&sort=timestamp:desc`;
    const res = await fetch(url, { headers: cmsHeaders() });
    if (!res.ok) break;
    const body = await res.json();
    const items = body?.data || [];
    if (items.length === 0) break;
    for (const item of items) {
      const attrs = item.attributes || item;
      events.push({
        id: item.id,
        mcpServerSlug: attrs.mcpServerSlug,
        toolName: attrs.toolName,
        clientName: attrs.clientName,
        latencyMs: attrs.latencyMs,
        success: attrs.success,
        timestamp: attrs.timestamp,
      });
    }
    if (items.length < 100) break;
    page++;
  }

  return events;
}

function aggregateMetrics(events: TelemetryEvent[]): TelemetryResponse {
  if (events.length === 0) {
    return {
      performance: { tools: [], totalCalls: 0, avgLatencyMs: 0, uptimePercent: 0, latencyTimeSeries: [] },
      usage: { topClients: [], totalCalls: 0, dailySessions: [] },
    };
  }

  // Per-tool aggregation
  const toolMap = new Map<string, { calls: number; totalLatency: number; successes: number }>();
  const clientMap = new Map<string, number>();
  const dateMap = new Map<string, { latencies: number[]; sessions: Set<string> }>();

  for (const e of events) {
    // Tool metrics
    const t = toolMap.get(e.toolName) || { calls: 0, totalLatency: 0, successes: 0 };
    t.calls++;
    t.totalLatency += e.latencyMs;
    if (e.success) t.successes++;
    toolMap.set(e.toolName, t);

    // Client metrics
    clientMap.set(e.clientName, (clientMap.get(e.clientName) || 0) + 1);

    // Daily aggregation
    const date = e.timestamp.slice(0, 10);
    const d = dateMap.get(date) || { latencies: [], sessions: new Set<string>() };
    d.latencies.push(e.latencyMs);
    d.sessions.add(e.clientName);
    dateMap.set(date, d);
  }

  // Build tool metrics
  const tools: ToolMetric[] = Array.from(toolMap.entries())
    .map(([name, m]) => ({
      name,
      calls: m.calls,
      avgLatencyMs: Math.round(m.totalLatency / m.calls),
      uptimePercent: Number(((m.successes / m.calls) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.calls - a.calls);

  const totalCalls = events.length;
  const totalLatency = events.reduce((sum, e) => sum + e.latencyMs, 0);
  const totalSuccesses = events.filter((e) => e.success).length;

  // Build time series (sorted by date)
  const sortedDates = Array.from(dateMap.keys()).sort();
  const latencyTimeSeries = sortedDates.map((date) => {
    const lats = dateMap.get(date)!.latencies.sort((a, b) => a - b);
    const p50 = lats[Math.floor(lats.length * 0.5)] || 0;
    return { date, p50LatencyMs: p50 };
  });

  const dailySessions = sortedDates.map((date) => ({
    date,
    sessions: dateMap.get(date)!.sessions.size,
  }));

  // Top clients
  const topClients = Array.from(clientMap.entries())
    .map(([name, calls]) => ({ name, calls }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 10);

  return {
    performance: {
      tools,
      totalCalls,
      avgLatencyMs: Math.round(totalLatency / totalCalls),
      uptimePercent: Number(((totalSuccesses / totalCalls) * 100).toFixed(1)),
      latencyTimeSeries,
    },
    usage: {
      topClients,
      totalCalls,
      dailySessions,
    },
  };
}

/* ── POST: Ingest telemetry event ──────────────────────────── */

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { slug, toolName, clientName, latencyMs, success } = req.body;

  if (!slug || !toolName) {
    return res.status(400).json({ error: "slug and toolName are required" });
  }

  const payload = {
    data: {
      mcpServerSlug: slug,
      toolName,
      clientName: clientName || "Unknown",
      latencyMs: typeof latencyMs === "number" ? latencyMs : 0,
      success: success !== false,
      timestamp: new Date().toISOString(),
    },
  };

  const cmsRes = await fetch(`${CMS_URL}/api/mcp-telemetry-events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...cmsHeaders() },
    body: JSON.stringify(payload),
  });

  if (!cmsRes.ok) {
    const errBody = await cmsRes.text().catch(() => "");
    return res.status(502).json({ error: "Failed to store event", detail: errBody });
  }

  // Invalidate cache for this slug
  cache.delete(slug);

  return res.status(201).json({ success: true });
}

/* ── GET: Query aggregated telemetry ───────────────────────── */

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const slug = req.query.slug as string;
  if (!slug) {
    return res.status(400).json({ error: "slug query parameter is required" });
  }

  // Check cache
  const cached = cache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(cached.data);
  }

  // Query by both current and legacy slugs (handles slug migrations)
  const slugs = getTelemetrySlugs(slug);
  const events = await fetchTelemetryEvents(slugs);
  const metrics = aggregateMetrics(events);

  // Cache
  cache.set(slug, { data: metrics, expiresAt: Date.now() + CACHE_TTL });

  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return res.status(200).json(metrics);
}

/* ── Handler ───────────────────────────────────────────────── */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!CMS_URL) {
    return res.status(500).json({ error: "CMS_URL not configured" });
  }

  if (req.method === "POST") return handlePost(req, res);
  if (req.method === "GET") return handleGet(req, res);
  return res.status(405).json({ error: "Method not allowed" });
}
