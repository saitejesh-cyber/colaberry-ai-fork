import CatalogSearchBox from "../../components/CatalogSearchBox";
import MCPCard from "../../components/MCPCard";
import Layout from "../../components/Layout";
import SectionHeader from "../../components/SectionHeader";
import StatePanel from "../../components/StatePanel";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GetStaticProps } from "next";
import { fetchMCPServers, MCPServer } from "../../lib/cms";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../lib/seo";

const PAGE_SIZE = 24;

type MCPPageProps = {
  mcps: MCPServer[];
  allowPrivate: boolean;
  fetchError: boolean;
  totalCount: number;
  initialHasMore: boolean;
};

type MCPSortMode = "alphabetical" | "latest" | "trending";

type Facets = {
  industries: string[];
  statuses: string[];
  sources: string[];
  tags: { value: string; label: string }[];
  tools: { value: string; label: string }[];
};

export const getStaticProps: GetStaticProps<MCPPageProps> = async () => {
  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";
  const visibilityFilter = allowPrivate ? undefined : "public";

  try {
    const raw = await fetchMCPServers(visibilityFilter, { maxRecords: PAGE_SIZE + 1 });
    const mcps = raw.slice(0, PAGE_SIZE).map(toMcpListItem);
    const initialHasMore = raw.length > PAGE_SIZE;
    return {
      props: { mcps, allowPrivate, fetchError: false, totalCount: mcps.length, initialHasMore },
      revalidate: 600,
    };
  } catch {
    return {
      props: { mcps: [], allowPrivate, fetchError: true, totalCount: 0, initialHasMore: false },
      revalidate: 120,
    };
  }
};

export default function MCP({ mcps: initialMCPs, allowPrivate, fetchError, totalCount, initialHasMore }: MCPPageProps) {
  const router = useRouter();
  const [visibility, setVisibility] = useState<"all" | "public" | "private">(
    allowPrivate ? "all" : "public"
  );
  const [sortMode, setSortMode] = useState<MCPSortMode>("trending");
  const [search, setSearch] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState<string | null>(null);
  const [industryFilter, setIndustryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [toolFilter, setToolFilter] = useState("all");
  const querySearch = useMemo(() => {
    const raw = Array.isArray(router.query.q) ? router.query.q[0] : router.query.q;
    return typeof raw === "string" ? raw : "";
  }, [router.query.q]);
  const effectiveSearch = search ?? querySearch;

  // Debounce search input (300ms) to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(effectiveSearch), 300);
    return () => clearTimeout(timer);
  }, [effectiveSearch]);

  // All loaded MCPs (SSR first page + API pages)
  const [allMCPs, setAllMCPs] = useState<MCPServer[]>(initialMCPs);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [displayTotal, setDisplayTotal] = useState(totalCount);
  const [catalogTotal, setCatalogTotal] = useState(totalCount);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Refs to avoid stale closures in IntersectionObserver callback
  const loadingRef = useRef(false);
  const pageRef = useRef(1);

  // Facets from the API (full dataset)
  const [facets, setFacets] = useState<Facets | null>(null);

  // Initial facets derived from SSR data (incomplete but immediate)
  const ssrIndustries = useMemo(
    () => Array.from(new Set(initialMCPs.map((m) => m.industry || "Other"))).filter(Boolean).sort(),
    [initialMCPs]
  );
  const ssrStatuses = useMemo(() => {
    return Array.from(new Set(initialMCPs.map((m) => (m.status || "unknown").toLowerCase()))).sort();
  }, [initialMCPs]);
  const ssrSources = useMemo(() => {
    return Array.from(new Set(initialMCPs.map((m) => (m.source || "internal").toLowerCase()))).sort();
  }, [initialMCPs]);
  const ssrTags = useMemo(() => {
    const map = new Map<string, string>();
    initialMCPs.forEach((mcp) => {
      (mcp.tags || []).forEach((tag) => {
        const key = (tag.slug || tag.name || "").toLowerCase();
        if (key && !map.has(key)) map.set(key, tag.name || tag.slug || key);
      });
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [initialMCPs]);

  // Use API facets when available, fall back to SSR-derived facets
  const industries = facets?.industries ?? ssrIndustries;
  const statuses = facets?.statuses ?? ssrStatuses;
  const sources = facets?.sources ?? ssrSources;
  const tagOptions = facets?.tags ?? ssrTags;
  const toolOptions = facets?.tools ?? [];

  const visibilityCounts = useMemo(() => {
    return allMCPs.reduce<Record<string, number>>((acc, m) => {
      const key = (m.visibility || "public").toLowerCase();
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [allMCPs]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";
  const metaTitle = "MCP Servers Catalog | Colaberry AI";
  const metaDescription =
    "Browse MCP servers with connector patterns, auth readiness, and industry alignment-structured for SEO and LLM discovery.";
  const seoMeta: SeoMeta = {
    title: metaTitle,
    description: metaDescription,
    canonical: buildCanonical("/aixcelerator/mcp"),
  };
  const canonicalUrl = seoMeta.canonical!;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Colaberry AI MCP Servers Catalog",
    url: canonicalUrl,
    description: metaDescription,
    itemListElement: allMCPs.slice(0, 12).map((mcp, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "SoftwareApplication",
        name: mcp.name,
        description: mcp.description || undefined,
        applicationCategory: "MCP Server",
        url: `${siteUrl}/aixcelerator/mcp/${mcp.slug || mcp.id}`,
      },
    })),
  };

  // Build API query params from current filters
  const buildParams = useCallback(
    (page: number) => {
      const params = new URLSearchParams({ page: String(page), sort: sortMode });
      const q = (debouncedSearch ?? "").trim();
      if (q) params.set("q", q);
      if (industryFilter !== "all") params.set("industry", industryFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (tagFilter !== "all") params.set("tag", tagFilter);
      if (toolFilter !== "all") params.set("tool", toolFilter);
      if (visibility !== "all") params.set("visibility", visibility);
      return params;
    },
    [sortMode, debouncedSearch, industryFilter, statusFilter, sourceFilter, tagFilter, toolFilter, visibility]
  );

  // When any filter/sort changes, reset and fetch page 1 from API
  const filterKey = `${sortMode}|${debouncedSearch}|${industryFilter}|${statusFilter}|${sourceFilter}|${tagFilter}|${toolFilter}|${visibility}`;
  const prevFilterKey = useRef(filterKey);
  const initialMount = useRef(true);

  useEffect(() => {
    // On initial mount, fetch page 1 to get full facets and real total
    if (initialMount.current) {
      initialMount.current = false;
      const params = buildParams(1);
      fetch(`/api/mcps?${params}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setAllMCPs(data.mcps);
            setHasMore(data.hasMore);
            setCurrentPage(1);
            setDisplayTotal(data.total);
            setCatalogTotal(data.catalogTotal);
            setFacets(data.facets);
            pageRef.current = 1;
            loadingRef.current = false;
          }
        })
        .catch(() => {});
      return;
    }

    // On subsequent filter changes, reset and fetch page 1
    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey;
      loadingRef.current = true;
      const params = buildParams(1);
      fetch(`/api/mcps?${params}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setAllMCPs(data.mcps);
            setHasMore(data.hasMore);
            setCurrentPage(1);
            setDisplayTotal(data.total);
            setCatalogTotal(data.catalogTotal);
            setFacets(data.facets);
            pageRef.current = 1;
          }
        })
        .catch(() => {})
        .finally(() => {
          loadingRef.current = false;
          setLoadingMore(false);
        });
    }
  }, [filterKey, buildParams]);

  // Fetch next page on scroll
  const fetchNextPage = useCallback(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    const params = buildParams(nextPage);
    fetch(`/api/mcps?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setAllMCPs((prev) => [...prev, ...data.mcps]);
          setHasMore(data.hasMore);
          setCurrentPage(nextPage);
          setDisplayTotal(data.total);
          pageRef.current = nextPage;
        }
      })
      .catch(() => {})
      .finally(() => {
        loadingRef.current = false;
        setLoadingMore(false);
      });
  }, [buildParams]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const handler = fetchNextPage;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) handler();
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, currentPage, fetchNextPage]);

  // Compute latest/trending signal rails from loaded data
  const scopedMCPs = useMemo(
    () => filterByVisibility(allMCPs, allowPrivate, visibility),
    [allowPrivate, allMCPs, visibility]
  );
  const _latestMCPs = useMemo(
    () => sortMCPsLocal(scopedMCPs, "latest").slice(0, 6),
    [scopedMCPs]
  );
  const _trendingMCPs = useMemo(
    () => sortMCPsLocal(scopedMCPs, "trending").slice(0, 6),
    [scopedMCPs]
  );

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>

      {fetchError && (
        <div className="mb-6">
          <StatePanel
            variant="error"
            title="Live MCP data is temporarily unavailable"
            description="Showing cached MCP entries while we reconnect to the CMS."
            action={
              <button
                type="button"
                onClick={() => router.replace(router.asPath)}
                className="btn btn-secondary btn-sm"
              >
                Retry
              </button>
            }
          />
        </div>
      )}

      <div className="reveal grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <SectionHeader
            as="h1"
            size="xl"
            kicker="MCP library"
            title="MCP Servers"
            description="A curated MCP server library for connecting agents to business apps, data, and developer tools-with public and private options for secure deployment."
          />
        </div>
      </div>

      <section className="reveal surface-panel mt-8 p-5 sm:mt-10">
        <SectionHeader
          kicker="Catalog snapshot"
          title="Coverage and delivery readiness"
          description="A quick view of integration breadth and industry alignment."
          size="md"
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-3 sm:items-center sm:gap-6">
          <Stat title="Servers" value={String(catalogTotal)} note="Curated library" />
          <Stat
            title="Industries"
            value={String(industries.length)}
            note="Domain-aware"
          />
          <Stat
            title="Visibility"
            value={`${visibilityCounts.public ?? 0} public`}
            note={allowPrivate ? `${visibilityCounts.private ?? 0} private` : "Private hidden"}
          />
        </div>
      </section>

      <section className="reveal surface-panel mt-6 p-6 sm:mt-8">
        <SectionHeader
          kicker="Filters"
          title="Search and filter"
          description="Find MCP servers by industry, status, tags, and visibility."
          size="md"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12">
          <div className="sm:col-span-2 md:col-span-3 lg:col-span-4">
            <label htmlFor="mcp-search" className="sr-only">
              Search MCP servers
            </label>
            <div className="relative group">
              <input
                id="mcp-search"
                name="mcp-search"
                type="search"
                placeholder="Search MCP servers, industries, tags..."
                value={effectiveSearch}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                className="w-full rounded-lg border border-zinc-200/80 bg-white px-4 py-2 pr-11 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200 dark:placeholder:text-zinc-500"
              />
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 dark:text-zinc-500"
                fill="none"
              >
                <path
                  d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M16.25 16.25 21 21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="mcp-industry" className="sr-only">
              Filter by industry
            </label>
            <select
              id="mcp-industry"
              value={industryFilter}
              onChange={(event) => {
                setIndustryFilter(event.target.value);
              }}
              className="w-full rounded-lg border border-zinc-200/80 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200"
            >
              <option value="all">All industries</option>
              {industries.map((industry) => (
                <option key={industry} value={industry.toLowerCase()}>
                  {industry}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="mcp-status" className="sr-only">
              Filter by status
            </label>
            <select
              id="mcp-status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
              }}
              className="w-full rounded-lg border border-zinc-200/80 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200"
            >
              <option value="all">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="mcp-source" className="sr-only">
              Filter by source
            </label>
            <select
              id="mcp-source"
              value={sourceFilter}
              onChange={(event) => {
                setSourceFilter(event.target.value);
              }}
              className="w-full rounded-lg border border-zinc-200/80 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200"
            >
              <option value="all">All sources</option>
              {sources.map((source) => (
                <option key={source} value={source}>
                  {source.charAt(0).toUpperCase() + source.slice(1)}
                </option>
              ))}
            </select>
          </div>
          {tagOptions.length > 0 && (
            <div className="lg:col-span-2">
              <label htmlFor="mcp-tag" className="sr-only">
                Filter by tag
              </label>
              <select
                id="mcp-tag"
                value={tagFilter}
                onChange={(event) => {
                  setTagFilter(event.target.value);
                }}
                className="w-full rounded-lg border border-zinc-200/80 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200"
              >
                <option value="all">All tags</option>
                {tagOptions.map((tag) => (
                  <option key={tag.value} value={tag.value}>
                    {tag.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {toolOptions.length > 0 && (
            <div className="lg:col-span-2">
              <label htmlFor="mcp-tool" className="sr-only">
                Filter by tool
              </label>
              <select
                id="mcp-tool"
                value={toolFilter}
                onChange={(event) => {
                  setToolFilter(event.target.value);
                }}
                className="w-full rounded-lg border border-zinc-200/80 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200"
              >
                <option value="all">All tools</option>
                {toolOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Sort
          </span>
          {(
            [
              { value: "trending", label: "Trending" },
              { value: "latest", label: "Latest" },
              { value: "alphabetical", label: "A-Z" },
            ] as { value: MCPSortMode; label: string }[]
          ).map((option) => {
            const active = sortMode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSortMode(option.value);
                }}
                aria-pressed={active}
                className={`chip focus-ring rounded-md px-3 py-1 text-xs font-semibold ${
                  active ? "chip-brand" : "chip-muted"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {allowPrivate && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(["all", "public", "private"] as const).map((option) => {
              const active = visibility === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setVisibility(option);
                  }}
                  aria-pressed={active}
                  className={`chip focus-ring rounded-md px-3 py-1 text-xs font-semibold ${
                    active ? "chip-brand" : "chip-muted"
                  }`}
                >
                  {option === "all" ? "All" : option === "public" ? "Public" : "Private"}
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500" aria-live="polite">
          Showing {allMCPs.length} of {displayTotal} (catalog {catalogTotal})
        </div>
      </section>

      <div className="reveal stagger-grid mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {allMCPs.map((m) => (
          <MCPCard key={m.slug || String(m.id)} mcp={m} />
        ))}
      </div>

      {allMCPs.length === 0 && !loadingMore && (
        <div className="mt-6">
          <StatePanel
            variant="empty"
            title="No MCP servers match these filters"
            description="Try clearing filters, switching visibility, or adjusting your search query."
          />
        </div>
      )}

      <div className="mt-6 flex flex-col items-center gap-3">
        {allMCPs.length > 0 ? (
          hasMore ? (
            <>
              <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />
              {loadingMore && (
                <span className="text-sm text-zinc-500">Loading more MCP servers...</span>
              )}
            </>
          ) : (
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              End of results
            </div>
          )
        ) : null}
      </div>

      <CatalogSearchBox placeholder="Search MCP servers or ask a question..." />
    </Layout>
  );
}

function toMcpListItem(mcp: MCPServer): MCPServer {
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

function clipText(value?: string | null, limit = 220) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1).trimEnd()}...`;
}

function filterByVisibility(
  mcps: MCPServer[],
  allowPrivate: boolean,
  visibility: "all" | "public" | "private"
) {
  if (!allowPrivate) {
    return mcps.filter((mcp) => (mcp.visibility || "public").toLowerCase() === "public");
  }
  if (visibility === "all") {
    return mcps;
  }
  return mcps.filter((mcp) => (mcp.visibility || "public").toLowerCase() === visibility);
}

function toTimestamp(value?: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function scoreTrendingMCP(mcp: MCPServer) {
  const ratingScore = typeof mcp.rating === "number" ? Math.max(mcp.rating, 0) * 18 : 0;
  const usageScore =
    typeof mcp.usageCount === "number" && mcp.usageCount > 0
      ? Math.log10(mcp.usageCount + 1) * 25
      : 0;
  const verifiedScore = mcp.verified ? 8 : 0;
  const freshnessScore = getFreshnessScore(mcp.lastUpdated);
  return ratingScore + usageScore + verifiedScore + freshnessScore;
}

function getFreshnessScore(value?: string | null) {
  if (!value) return 0;
  const timestamp = toTimestamp(value);
  if (!timestamp) return 0;
  const days = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
  if (days <= 14) return 12;
  if (days <= 45) return 8;
  if (days <= 90) return 4;
  return 0;
}

function sortMCPsLocal(mcps: MCPServer[], mode: MCPSortMode) {
  const sorted = [...mcps];
  if (mode === "alphabetical") {
    return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
  if (mode === "latest") {
    return sorted.sort((a, b) => toTimestamp(b.lastUpdated) - toTimestamp(a.lastUpdated) || a.name.localeCompare(b.name));
  }
  return sorted.sort((a, b) => {
    const scoreDelta = scoreTrendingMCP(b) - scoreTrendingMCP(a);
    if (scoreDelta !== 0) return scoreDelta;
    return toTimestamp(b.lastUpdated) - toTimestamp(a.lastUpdated) || a.name.localeCompare(b.name);
  });
}

function formatShortDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function _SignalRail({
  title,
  description,
  items,
  emptyText,
  detailType,
}: {
  title: string;
  description: string;
  items: MCPServer[];
  emptyText: string;
  detailType: "latest" | "trending";
}) {
  return (
    <article className="card-elevated p-5">
      <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">{title}</div>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{description}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{emptyText}</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {items.map((item) => {
            const detail =
              detailType === "latest"
                ? formatShortDate(item.lastUpdated) || "Date pending"
                : item.rating
                ? `Rating ${item.rating.toFixed(1)}`
                : item.usageCount
                ? `${item.usageCount} uses`
                : "Emerging";
            return (
              <li key={item.slug || item.id}>
                <Link
                  href={`/aixcelerator/mcp/${item.slug || item.id}`}
                  className="card-elevated group flex items-center justify-between px-3 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200"
                >
                  <span className="truncate pr-3">{item.name}</span>
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-500 group-hover:text-brand-deep dark:text-zinc-400">
                    {detail}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

function Stat({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="card-elevated p-4">
      <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">{title}</div>
      <div className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{note}</div>
    </div>
  );
}
