import type { NextApiRequest, NextApiResponse } from "next";
import { fetchTools, type Tool } from "../../lib/cms";

const PAGE_SIZE = 24;

type ToolSortMode = "alphabetical" | "popular";

function parseSort(raw: string): ToolSortMode {
  if (raw === "popular") return "popular";
  return "alphabetical";
}

function normalizeSearch(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 120);
}

function matchesFilters(
  tool: Tool,
  query: string,
  category: string
): boolean {
  if (category !== "all" && (tool.toolCategory || "other").toLowerCase() !== category) return false;

  if (!query) return true;
  const haystack = [
    tool.name,
    tool.description,
    tool.toolCategory,
    ...(tool.mcpServers || []).map((s) => s.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function sortTools(tools: Tool[], mode: ToolSortMode): Tool[] {
  const sorted = [...tools];
  if (mode === "popular") {
    return sorted.sort(
      (a, b) => (b.mcpServers?.length ?? 0) - (a.mcpServers?.length ?? 0) || a.name.localeCompare(b.name)
    );
  }
  return sorted.sort((a, b) => a.name.localeCompare(b.name));
}

type Facets = {
  categories: { value: string; label: string }[];
};

function formatCategoryLabel(cat: string): string {
  return cat.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildFacets(tools: Tool[]): Facets {
  const catMap = new Map<string, string>();
  for (const tool of tools) {
    const cat = (tool.toolCategory || "other").toLowerCase();
    if (!catMap.has(cat)) catMap.set(cat, formatCategoryLabel(cat));
  }
  return {
    categories: Array.from(catMap.entries())
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

function toListItem(tool: Tool): Tool {
  return {
    id: tool.id,
    name: tool.name,
    slug: tool.slug,
    description: clipText(tool.description, 220),
    toolCategory: tool.toolCategory ?? null,
    website: tool.website ?? null,
    iconUrl: tool.iconUrl ?? null,
    iconAlt: tool.iconAlt ?? null,
    mcpServers: tool.mcpServers ?? [],
  };
}

type ResponsePayload = {
  tools: Tool[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  total: number;
  catalogTotal: number;
  facets: Facets;
};

let cachedTools: Tool[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 120_000;

async function getAllTools(): Promise<Tool[]> {
  const now = Date.now();
  if (cachedTools && now - cacheTime < CACHE_TTL) return cachedTools;
  cachedTools = await fetchTools();
  cacheTime = now;
  return cachedTools;
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
    const sortMode = parseSort(String(req.query.sort || "alphabetical"));
    const searchQuery = normalizeSearch(String(req.query.q || "")).toLowerCase();
    const category = String(req.query.category || "all").toLowerCase();

    const allTools = await getAllTools();
    const facets = buildFacets(allTools);
    const catalogTotal = allTools.length;

    const filtered = allTools.filter((tool) => matchesFilters(tool, searchQuery, category));
    const sorted = sortTools(filtered, sortMode);

    const total = sorted.length;
    const start = (page - 1) * PAGE_SIZE;
    const tools = sorted.slice(start, start + PAGE_SIZE).map(toListItem);
    const hasMore = start + PAGE_SIZE < total;

    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
    return res.status(200).json({ tools, page, pageSize: PAGE_SIZE, hasMore, total, catalogTotal, facets });
  } catch {
    return res.status(500).json({ error: "Failed to fetch tools" });
  }
}
