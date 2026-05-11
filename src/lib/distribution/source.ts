/**
 * Source layer — pulls catalog entries updated within the lookback window
 * from Strapi and normalizes them into `DistributableEntry` shape.
 *
 * Deliberately bypasses the heavy `fetchSkills / fetchAgents / ...`
 * helpers in `src/lib/cms.ts` because those bake in deep `populate=*`
 * graphs (tags + companies + agents + mcp + use-cases) that we don't need
 * here. Instead we issue lean Strapi queries with `filters[updatedAt][$gt]`
 * and only the fields a post template renders.
 */

import type { DistributableEntry, ContentKind } from "./types";

const CMS_URL = (
  process.env.CMS_URL ||
  process.env.NEXT_PUBLIC_CMS_URL ||
  ""
)
  .trim()
  .replace(/\/$/, "");
const CMS_API_TOKEN = (process.env.CMS_API_TOKEN || "").trim();
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai")
  .trim()
  .replace(/\/$/, "");

const DEFAULT_WINDOW_HOURS = 24;
const DEFAULT_MAX_PER_KIND = 25;
const FETCH_TIMEOUT_MS = 15_000;

/** Each kind maps to its Strapi collection path + the URL-prefix for the
 * detail page on colaberry.ai. One record per kind = one place to
 * extend when a new ContentKind joins the union. */
interface KindConfig {
  kind: ContentKind;
  collectionPath: string;
  urlPrefix: string;
  /** Strapi field that holds the public-facing title. */
  titleField: string;
  /** Strapi field for the 1-2 sentence summary. */
  summaryField: string;
  /** Filter to skip draft / private records. Empty string = no filter. */
  visibilityFilter: string;
}

const KIND_CONFIGS: KindConfig[] = [
  {
    kind: "agent",
    collectionPath: "/api/agents",
    urlPrefix: "/aixcelerator/agents",
    titleField: "name",
    summaryField: "summary",
    visibilityFilter: "&filters[visibility][$eq]=public",
  },
  {
    kind: "mcpServer",
    collectionPath: "/api/mcp-servers",
    urlPrefix: "/aixcelerator/mcp",
    titleField: "name",
    summaryField: "summary",
    visibilityFilter: "&filters[visibility][$eq]=public",
  },
  {
    kind: "skill",
    collectionPath: "/api/skills",
    urlPrefix: "/aixcelerator/skills",
    titleField: "name",
    summaryField: "summary",
    visibilityFilter: "&filters[visibility][$eq]=public",
  },
  {
    kind: "podcastEpisode",
    collectionPath: "/api/podcast-episodes",
    urlPrefix: "/resources/podcasts",
    titleField: "title",
    summaryField: "description",
    visibilityFilter: "&filters[podcastStatus][$eq]=published",
  },
  {
    kind: "llmArchitecture",
    collectionPath: "/api/llm-architectures",
    urlPrefix: "/aixcelerator/llm-architectures",
    titleField: "name",
    summaryField: "summary",
    visibilityFilter: "",
  },
];

interface StrapiListResponse<T> {
  data: T[];
  meta?: { pagination?: { total?: number } };
}

interface StrapiRow {
  id: number;
  documentId?: string;
  name?: string;
  title?: string;
  slug?: string;
  summary?: string;
  description?: string | unknown;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  tags?: Array<{ name?: string; slug?: string }>;
}

export interface FetchOptions {
  /** Lookback window in hours. Default 24. */
  windowHours?: number;
  /** Max entries per kind — caps blast radius if CMS has a big bulk edit. */
  maxPerKind?: number;
  /** Restrict to specific kinds. Empty / undefined = all. */
  kinds?: ContentKind[];
  /** Fixed "now" for deterministic tests. Default: Date.now(). */
  nowMs?: number;
}

/**
 * Return every catalog entry whose `updatedAt` falls inside the lookback
 * window. Results are ordered newest-first across kinds.
 *
 * Never throws — returns an empty array and logs the error. The cron route
 * treats "nothing to send" as a successful run, so a transient CMS blip
 * shouldn't trip a 500. Per-kind errors are accumulated in the return.
 */
export async function fetchRecentEntries(
  options: FetchOptions = {}
): Promise<{ entries: DistributableEntry[]; errors: string[] }> {
  const windowHours = options.windowHours ?? DEFAULT_WINDOW_HOURS;
  const maxPerKind = options.maxPerKind ?? DEFAULT_MAX_PER_KIND;
  const nowMs = options.nowMs ?? Date.now();
  const cutoffIso = new Date(nowMs - windowHours * 60 * 60 * 1000).toISOString();

  const configs = options.kinds?.length
    ? KIND_CONFIGS.filter((c) => options.kinds!.includes(c.kind))
    : KIND_CONFIGS;

  const errors: string[] = [];
  const entries: DistributableEntry[] = [];

  // Fire per-kind requests in parallel — each kind is isolated so one
  // collection's failure doesn't drag the others down.
  const results = await Promise.allSettled(
    configs.map((config) =>
      fetchForKind(config, cutoffIso, maxPerKind).then((rows) =>
        rows.map((row) => normalizeRow(row, config, cutoffIso))
      )
    )
  );

  results.forEach((result, index) => {
    const config = configs[index];
    if (result.status === "fulfilled") {
      entries.push(...result.value);
    } else {
      errors.push(
        `[distribution.source] ${config.kind}: ${
          result.reason instanceof Error ? result.reason.message : String(result.reason)
        }`
      );
    }
  });

  // Newest-first, then by kind as stable tiebreaker.
  entries.sort((a, b) => {
    const byTime = b.updatedAt.localeCompare(a.updatedAt);
    return byTime !== 0 ? byTime : a.kind.localeCompare(b.kind);
  });

  return { entries, errors };
}

async function fetchForKind(
  config: KindConfig,
  cutoffIso: string,
  maxPerKind: number
): Promise<StrapiRow[]> {
  if (!CMS_URL) {
    throw new Error("CMS_URL not configured");
  }

  const fields = [
    "id",
    "documentId",
    config.titleField,
    "slug",
    config.summaryField,
    "createdAt",
    "updatedAt",
    "publishedAt",
  ]
    .map((field, i) => `fields[${i}]=${encodeURIComponent(field)}`)
    .join("&");

  const url =
    `${CMS_URL}${config.collectionPath}` +
    `?${fields}` +
    `&populate[tags][fields][0]=name` +
    `&populate[tags][fields][1]=slug` +
    `&filters[updatedAt][$gt]=${encodeURIComponent(cutoffIso)}` +
    config.visibilityFilter +
    `&sort[0]=updatedAt:desc` +
    `&pagination[pageSize]=${maxPerKind}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: CMS_API_TOKEN
        ? { Authorization: `Bearer ${CMS_API_TOKEN}` }
        : {},
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`CMS ${res.status} ${res.statusText} ${text.slice(0, 140)}`);
    }
    const json = (await res.json()) as StrapiListResponse<StrapiRow>;
    return Array.isArray(json.data) ? json.data : [];
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeRow(
  row: StrapiRow,
  config: KindConfig,
  cutoffIso: string
): DistributableEntry {
  const rawTitle =
    (config.titleField === "title" ? row.title : row.name) || row.slug || "Untitled";
  const title = String(rawTitle).trim();
  const summary = extractSummary(row, config.summaryField);
  const slug = (row.slug || "").trim();
  const url = slug
    ? `${SITE_URL}${config.urlPrefix}/${slug}`
    : `${SITE_URL}${config.urlPrefix}`;
  const tags = Array.isArray(row.tags)
    ? row.tags
        .map((t) => (t?.name || t?.slug || "").trim())
        .filter((t): t is string => t.length > 0)
        .slice(0, 5)
    : [];

  const updatedAt = row.updatedAt || row.publishedAt || new Date().toISOString();
  const createdAt = row.createdAt || updatedAt;
  // "New" = both created AND updated within the same window — cheap heuristic
  // that works well enough for headline copy ("New:" vs "Updated:").
  const isNew = createdAt >= cutoffIso && createdAt === updatedAt;

  return {
    id: row.documentId || String(row.id),
    kind: config.kind,
    title,
    summary,
    url,
    tags,
    updatedAt,
    isNew,
  };
}

/** Extract a plain-text summary. `summary` fields are plain text; the
 * podcast `description` field is Strapi rich-text (block node array).
 * We flatten rich-text to plain text with a conservative block-walker. */
function extractSummary(row: StrapiRow, summaryField: string): string {
  const raw =
    summaryField === "description"
      ? row.description
      : (row as unknown as Record<string, unknown>)[summaryField];

  if (typeof raw === "string") {
    return raw.trim();
  }
  if (Array.isArray(raw)) {
    const flat = walkRichText(raw as unknown[]).trim();
    return flat;
  }
  return "";
}

function walkRichText(nodes: unknown[]): string {
  const out: string[] = [];
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const n = node as { type?: string; text?: string; children?: unknown[] };
    if (typeof n.text === "string") {
      out.push(n.text);
    } else if (Array.isArray(n.children)) {
      out.push(walkRichText(n.children));
    }
  }
  return out.join(" ").replace(/\s+/g, " ");
}
