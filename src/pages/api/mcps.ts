import type { NextApiRequest, NextApiResponse } from "next";
import { fetchMCPServers, type MCPServer } from "../../lib/cms";

const PAGE_SIZE = 24;

type MCPSortMode = "trending" | "latest" | "alphabetical";

function parseSort(raw: string): MCPSortMode {
  if (raw === "latest") return "latest";
  if (raw === "alphabetical") return "alphabetical";
  return "trending";
}

function normalizeSearch(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 120);
}

function matchesFilters(
  mcp: MCPServer,
  query: string,
  industry: string,
  status: string,
  source: string,
  tag: string,
  visibility: string,
  allowPrivate: boolean,
  tool: string = "all"
): boolean {
  // Visibility gate
  if (!allowPrivate && (mcp.visibility || "public").toLowerCase() !== "public") return false;
  if (visibility !== "all" && (mcp.visibility || "public").toLowerCase() !== visibility) return false;

  if (industry !== "all" && (mcp.industry || "").toLowerCase() !== industry) return false;
  if (status !== "all" && (mcp.status || "unknown").toLowerCase() !== status) return false;
  if (source !== "all" && (mcp.source || "internal").toLowerCase() !== source) return false;
  if (
    tag !== "all" &&
    !(mcp.tags || []).some((t) => (t.slug || t.name || "").toLowerCase() === tag)
  )
    return false;
  if (
    tool !== "all" &&
    !(mcp.linkedTools || []).some((t) => (t.slug || t.name || "").toLowerCase() === tool)
  )
    return false;

  if (!query) return true;
  const haystack = [
    mcp.name,
    mcp.description,
    mcp.industry,
    mcp.category,
    ...(mcp.tags || []).map((t) => t.name),
    ...(mcp.companies || []).map((c) => c.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function toTimestamp(value?: string | null): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function scoreTrending(mcp: MCPServer): number {
  const ratingScore = typeof mcp.rating === "number" ? Math.max(mcp.rating, 0) * 18 : 0;
  const usageScore =
    typeof mcp.usageCount === "number" && mcp.usageCount > 0
      ? Math.log10(mcp.usageCount + 1) * 25
      : 0;
  const verifiedScore = mcp.verified ? 8 : 0;
  const ts = toTimestamp(mcp.lastUpdated);
  let freshnessScore = 0;
  if (ts) {
    const days = (Date.now() - ts) / 86_400_000;
    if (days <= 14) freshnessScore = 12;
    else if (days <= 45) freshnessScore = 8;
    else if (days <= 90) freshnessScore = 4;
  }
  return ratingScore + usageScore + verifiedScore + freshnessScore;
}

function sortMCPs(mcps: MCPServer[], mode: MCPSortMode): MCPServer[] {
  const sorted = [...mcps];
  if (mode === "alphabetical") {
    return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
  if (mode === "latest") {
    return sorted.sort(
      (a, b) => toTimestamp(b.lastUpdated) - toTimestamp(a.lastUpdated) || a.name.localeCompare(b.name)
    );
  }
  // trending
  return sorted.sort((a, b) => {
    const delta = scoreTrending(b) - scoreTrending(a);
    if (delta !== 0) return delta;
    return toTimestamp(b.lastUpdated) - toTimestamp(a.lastUpdated) || a.name.localeCompare(b.name);
  });
}

type Facets = {
  industries: string[];
  statuses: string[];
  sources: string[];
  tags: { value: string; label: string }[];
  tools: { value: string; label: string }[];
};

function buildFacets(mcps: MCPServer[]): Facets {
  const industrySet = new Set<string>();
  const statusSet = new Set<string>();
  const sourceSet = new Set<string>();
  const tagMap = new Map<string, string>();
  const toolMap = new Map<string, string>();
  for (const mcp of mcps) {
    if (mcp.industry) industrySet.add(mcp.industry);
    statusSet.add((mcp.status || "unknown").toLowerCase());
    sourceSet.add((mcp.source || "internal").toLowerCase());
    for (const tag of mcp.tags || []) {
      const key = (tag.slug || tag.name || "").toLowerCase();
      if (key && !tagMap.has(key)) tagMap.set(key, tag.name || tag.slug || key);
    }
    for (const tool of mcp.linkedTools || []) {
      const key = (tool.slug || tool.name || "").toLowerCase();
      if (key && !toolMap.has(key)) toolMap.set(key, tool.name || tool.slug || key);
    }
  }
  return {
    industries: Array.from(industrySet).filter(Boolean).sort(),
    statuses: Array.from(statusSet).sort(),
    sources: Array.from(sourceSet).sort(),
    tags: Array.from(tagMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    tools: Array.from(toolMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

function clipText(value?: string | null, limit = 220) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1).trimEnd()}...`;
}

function toListItem(mcp: MCPServer): MCPServer {
  return {
    id: mcp.id,
    name: mcp.name,
    slug: mcp.slug,
    description: clipText(mcp.description, 220),
    rating: typeof mcp.rating === "number" ? mcp.rating : null,
    usageCount: typeof mcp.usageCount === "number" ? mcp.usageCount : null,
    lastUpdated: mcp.lastUpdated ?? null,
    industry: mcp.industry ?? null,
    category: mcp.category ?? null,
    status: mcp.status ?? null,
    visibility: mcp.visibility ?? null,
    source: mcp.source ?? null,
    sourceName: mcp.sourceName ?? null,
    verified: mcp.verified ?? null,
    tags: mcp.tags ?? [],
    companies: mcp.companies ?? [],
  };
}

type ResponsePayload = {
  mcps: MCPServer[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  total: number;
  catalogTotal: number;
  facets: Facets;
};

let cachedMCPs: MCPServer[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 120_000; // 2 minutes

async function getAllMCPs(): Promise<MCPServer[]> {
  const now = Date.now();
  if (cachedMCPs && now - cacheTime < CACHE_TTL) return cachedMCPs;
  cachedMCPs = await fetchMCPServers();
  cacheTime = now;
  return cachedMCPs;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponsePayload | { error: string }>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rawPage = Number(req.query.page) || 1;
    const page = Math.max(1, rawPage);
    const sortMode = parseSort(String(req.query.sort || "trending"));
    const searchQuery = normalizeSearch(String(req.query.q || "")).toLowerCase();
    const industry = String(req.query.industry || "all").toLowerCase();
    const status = String(req.query.status || "all").toLowerCase();
    const source = String(req.query.source || "all").toLowerCase();
    const tag = String(req.query.tag || "all").toLowerCase();
    const tool = String(req.query.tool || "all").toLowerCase();
    const visibility = String(req.query.visibility || "all").toLowerCase();
    const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";

    const allMCPs = await getAllMCPs();

    // Build facets from the full visible dataset
    const visibleMCPs = allowPrivate
      ? allMCPs
      : allMCPs.filter((m) => (m.visibility || "public").toLowerCase() === "public");
    const facets = buildFacets(visibleMCPs);
    const catalogTotal = visibleMCPs.length;

    // Apply all filters
    const filtered = allMCPs.filter((mcp) =>
      matchesFilters(mcp, searchQuery, industry, status, source, tag, visibility, allowPrivate, tool)
    );

    // Sort
    const sorted = sortMCPs(filtered, sortMode);

    const total = sorted.length;
    const start = (page - 1) * PAGE_SIZE;
    const mcps = sorted.slice(start, start + PAGE_SIZE).map(toListItem);
    const hasMore = start + PAGE_SIZE < total;

    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
    return res.status(200).json({ mcps, page, pageSize: PAGE_SIZE, hasMore, total, catalogTotal, facets });
  } catch {
    return res.status(500).json({ error: "Failed to fetch MCP servers" });
  }
}
