import MCPCard from "../../components/MCPCard";
import Layout from "../../components/Layout";
import SectionHeader from "../../components/SectionHeader";
import MediaPanel from "../../components/MediaPanel";
import StatePanel from "../../components/StatePanel";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GetStaticProps } from "next";
import { fetchMCPServers, MCPServer } from "../../lib/cms";
import { heroImage } from "../../lib/media";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";

type MCPPageProps = {
  mcps: MCPServer[];
  allowPrivate: boolean;
  fetchError: boolean;
};

type MCPSortMode = "alphabetical" | "latest" | "trending";

export const getStaticProps: GetStaticProps<MCPPageProps> = async () => {
  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";
  const visibilityFilter = allowPrivate ? undefined : "public";

  try {
    const mcps = (await fetchMCPServers(visibilityFilter, { maxRecords: 300 })).map(
      toMcpListItem
    );
    return {
      props: { mcps, allowPrivate, fetchError: false },
      revalidate: 600,
    };
  } catch {
    return {
      props: { mcps: [], allowPrivate, fetchError: true },
      revalidate: 120,
    };
  }
};

export default function MCP({ mcps, allowPrivate, fetchError }: MCPPageProps) {
  const router = useRouter();
  const [visibility, setVisibility] = useState<"all" | "public" | "private">(
    allowPrivate ? "all" : "public"
  );
  const [sortMode, setSortMode] = useState<MCPSortMode>("trending");
  const mcpHighlights = [
    {
      title: "Connector patterns",
      description: "Standardize endpoints, auth types, and scopes across tools.",
    },
    {
      title: "Deployment status",
      description: "Track ready, beta, or experimental servers in one view.",
    },
    {
      title: "Source traceability",
      description: "Internal, partner, or external provenance with ownership context.",
    },
    {
      title: "Observability hooks",
      description: "Reliability and usage signals from every endpoint.",
    },
  ];
  const mcpSignals = ["TLS-ready", "Auth-ready", "Rate-limited", "Docs linked"];
  const [search, setSearch] = useState<string | null>(null);
  const [industryFilter, setIndustryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const querySearch = useMemo(() => {
    const raw = Array.isArray(router.query.q) ? router.query.q[0] : router.query.q;
    return typeof raw === "string" ? raw : "";
  }, [router.query.q]);
  const effectiveSearch = search ?? querySearch;
  const pageSize = 24;
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const industries = useMemo(
    () =>
      Array.from(new Set(mcps.map((m) => m.industry || "Other"))).filter(Boolean).sort(),
    [mcps]
  );
  const statuses = useMemo(() => {
    const list = Array.from(new Set(mcps.map((m) => (m.status || "unknown").toLowerCase())));
    return list.sort();
  }, [mcps]);
  const sources = useMemo(() => {
    const list = Array.from(new Set(mcps.map((m) => (m.source || "internal").toLowerCase())));
    return list.sort();
  }, [mcps]);
  const tagOptions = useMemo(() => {
    const map = new Map<string, string>();
    mcps.forEach((mcp) => {
      (mcp.tags || []).forEach((tag) => {
        const key = (tag.slug || tag.name || "").toLowerCase();
        if (key && !map.has(key)) {
          map.set(key, tag.name || tag.slug || key);
        }
      });
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [mcps]);
  const visibilityCounts = mcps.reduce<Record<string, number>>((acc, m) => {
    const key = (m.visibility || "public").toLowerCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";
  const canonicalUrl = `${siteUrl}/aixcelerator/mcp`;
  const metaTitle = "MCP Servers Catalog | Colaberry AI";
  const metaDescription =
    "Browse MCP servers with connector patterns, auth readiness, and industry alignment-structured for SEO and LLM discovery.";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Colaberry AI MCP Servers Catalog",
    url: canonicalUrl,
    description: metaDescription,
    itemListElement: mcps.slice(0, 12).map((mcp, index) => ({
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
  const filteredMCPs = useMemo(() => {
    const query = effectiveSearch.trim().toLowerCase();
    return filterByVisibility(mcps, allowPrivate, visibility).filter((mcp) =>
      matchesFilters(mcp, query, industryFilter, statusFilter, sourceFilter, tagFilter)
    );
  }, [allowPrivate, effectiveSearch, industryFilter, mcps, sourceFilter, statusFilter, tagFilter, visibility]);
  const sortedMCPs = useMemo(
    () => sortMCPs(filteredMCPs, sortMode),
    [filteredMCPs, sortMode]
  );
  const scopedMCPs = useMemo(
    () => filterByVisibility(mcps, allowPrivate, visibility),
    [allowPrivate, mcps, visibility]
  );
  const latestMCPs = useMemo(
    () => sortMCPs(scopedMCPs, "latest").slice(0, 6),
    [scopedMCPs]
  );
  const trendingMCPs = useMemo(
    () => sortMCPs(scopedMCPs, "trending").slice(0, 6),
    [scopedMCPs]
  );
  const shownCount = Math.min(visibleCount, sortedMCPs.length);
  const visibleMCPs = useMemo(
    () => sortedMCPs.slice(0, shownCount),
    [shownCount, sortedMCPs]
  );
  const hasMore = shownCount < sortedMCPs.length;
  const hasResults = sortedMCPs.length > 0;

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + pageSize, sortedMCPs.length));
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, pageSize, sortedMCPs.length]);

  return (
    <Layout>
      <Head>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <link rel="canonical" href={canonicalUrl} />
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

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <SectionHeader
            as="h1"
            size="xl"
            kicker="MCP library"
            title="MCP Servers"
            description="A curated MCP server library for connecting agents to business apps, data, and developer tools-with public and private options for secure deployment."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {mcpHighlights.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm"
              >
                <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                <div className="mt-1 text-xs text-slate-600">{item.description}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            {mcpSignals.map((signal) => (
              <span
                key={signal}
                className="chip rounded-full border border-slate-200/80 bg-white px-3 py-1 font-semibold"
              >
                {signal}
              </span>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">
              Marketplace intent
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              Connector-ready, searchable, and LLM-friendly
            </div>
            <p className="mt-1 text-xs text-slate-600">
              MCP servers are indexed with auth patterns, visibility, and industry coverage so
              teams and LLMs can discover integrations faster.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/aixcelerator/agents"
                className="btn btn-secondary btn-compact"
              >
                Explore agents
              </Link>
              <Link
                href="/resources/white-papers"
                className="btn btn-ghost btn-compact"
              >
                Read integration guides
              </Link>
            </div>
          </div>
        </div>
        <MediaPanel
          kicker="Integration preview"
          title="Connector-ready surface"
          description="Standardize tool access with MCP server patterns and endpoints."
          image={heroImage("hero-mcp-cinematic.webp")}
          alt="MCP integration network overview"
          aspect="wide"
          fit="cover"
        />
      </div>

      <section className="surface-panel mt-6 p-5">
        <SectionHeader
          kicker="Catalog snapshot"
          title="Coverage and delivery readiness"
          description="A quick view of integration breadth and industry alignment."
          size="md"
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-3 sm:items-center sm:gap-6">
          <Stat title="Servers" value={String(mcps.length)} note="Curated library" />
          <Stat
            title="Industries"
            value={String(new Set(mcps.map((m) => m.industry)).size)}
            note="Domain-aware"
          />
          <Stat
            title="Visibility"
            value={`${visibilityCounts.public ?? 0} public`}
            note={allowPrivate ? `${visibilityCounts.private ?? 0} private` : "Private hidden"}
          />
        </div>
      </section>

      <section className="surface-panel mt-6 p-6">
        <SectionHeader
          kicker="Discovery signals"
          title="Latest and trending MCP servers"
          description="Monitor newest entries and high-interest connectors before diving into the full catalog."
          size="md"
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <SignalRail
            title="Latest additions"
            description="Most recently updated server profiles."
            items={latestMCPs}
            emptyText="No recently updated MCP entries available."
            detailType="latest"
          />
          <SignalRail
            title="Trending now"
            description="Servers with stronger usage, quality, and freshness signals."
            items={trendingMCPs}
            emptyText="Trending signals will appear after more MCP activity is recorded."
            detailType="trending"
          />
        </div>
      </section>

      <section className="surface-panel mt-8 p-6">
        <SectionHeader
          kicker="Filters"
          title="Search and filter"
          description="Find MCP servers by industry, status, tags, and visibility."
          size="md"
        />
        <div className="mt-4 grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
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
                  setVisibleCount(pageSize);
                }}
                className="w-full rounded-full border border-slate-200/80 bg-white px-4 py-2 pr-11 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:placeholder:text-slate-500"
              />
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-teal opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
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
                setVisibleCount(pageSize);
              }}
              className="w-full rounded-full border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
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
                setVisibleCount(pageSize);
              }}
              className="w-full rounded-full border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
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
                setVisibleCount(pageSize);
              }}
              className="w-full rounded-full border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
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
                  setVisibleCount(pageSize);
                }}
                className="w-full rounded-full border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
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
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
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
                  setVisibleCount(pageSize);
                }}
                aria-pressed={active}
                className={`chip focus-ring rounded-full px-3 py-1 text-xs font-semibold ${
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
                    setVisibleCount(pageSize);
                  }}
                  aria-pressed={active}
                  className={`chip focus-ring rounded-full px-3 py-1 text-xs font-semibold ${
                    active ? "chip-brand" : "chip-muted"
                  }`}
                >
                  {option === "all" ? "All" : option === "public" ? "Public" : "Private"}
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500" aria-live="polite">
          Showing {shownCount} of {sortedMCPs.length} (catalog {scopedMCPs.length})
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {visibleMCPs.map((m) => (
          <MCPCard key={m.slug || String(m.id)} mcp={m} />
        ))}
      </div>

      {!hasResults && (
        <div className="mt-6">
          <StatePanel
            variant="empty"
            title="No MCP servers match these filters"
            description="Try clearing filters, switching visibility, or adjusting your search query."
          />
        </div>
      )}

      <div className="mt-6 flex flex-col items-center gap-3">
        {hasResults ? (
          hasMore ? (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => Math.min(prev + pageSize, sortedMCPs.length))}
              className="btn btn-secondary"
            >
              Load more MCP servers
            </button>
          ) : (
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              End of results
            </div>
          )
        ) : null}
        <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />
      </div>
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

function matchesFilters(
  mcp: MCPServer,
  query: string,
  industryFilter?: string,
  statusFilter?: string,
  sourceFilter?: string,
  tagFilter?: string
) {
  const industryMatch =
    !industryFilter || industryFilter === "all"
      ? true
      : (mcp.industry || "").toLowerCase() === industryFilter;
  const statusMatch =
    !statusFilter || statusFilter === "all"
      ? true
      : (mcp.status || "unknown").toLowerCase() === statusFilter;
  const sourceMatch =
    !sourceFilter || sourceFilter === "all"
      ? true
      : (mcp.source || "internal").toLowerCase() === sourceFilter;
  const tagMatch =
    !tagFilter || tagFilter === "all"
      ? true
      : (mcp.tags || []).some(
          (tag) => (tag.slug || tag.name || "").toLowerCase() === tagFilter
        );
  if (!industryMatch || !statusMatch || !sourceMatch || !tagMatch) {
    return false;
  }
  if (!query) {
    return true;
  }
  const haystack = [
    mcp.name,
    mcp.description,
    mcp.industry,
    mcp.category,
    ...(mcp.tags || []).map((tag) => tag.name),
    ...(mcp.companies || []).map((company) => company.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
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

function sortMCPs(mcps: MCPServer[], mode: MCPSortMode) {
  const sorted = [...mcps];
  if (mode === "alphabetical") {
    return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
  if (mode === "latest") {
    return sorted.sort((a, b) => compareDatesDesc(a.lastUpdated, b.lastUpdated) || a.name.localeCompare(b.name));
  }
  return sorted.sort((a, b) => {
    const scoreDelta = scoreTrendingMCP(b) - scoreTrendingMCP(a);
    if (scoreDelta !== 0) return scoreDelta;
    return compareDatesDesc(a.lastUpdated, b.lastUpdated) || a.name.localeCompare(b.name);
  });
}

function compareDatesDesc(a?: string | null, b?: string | null) {
  const left = toTimestamp(a);
  const right = toTimestamp(b);
  return right - left;
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

function SignalRail({
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
    <article className="surface-panel border border-slate-200/80 bg-white/90 p-4">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{description}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-300">{emptyText}</p>
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
                  className="group flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-blue/30 hover:text-brand-deep"
                >
                  <span className="truncate pr-3">{item.name}</span>
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 group-hover:text-brand-deep">
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
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-600">{note}</div>
    </div>
  );
}
