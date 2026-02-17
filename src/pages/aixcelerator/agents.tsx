import AgentCard from "../../components/AgentCard";
import Layout from "../../components/Layout";
import SectionHeader from "../../components/SectionHeader";
import MediaPanel from "../../components/MediaPanel";
import StatePanel from "../../components/StatePanel";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GetStaticProps } from "next";
import { Agent, fetchAgents } from "../../lib/cms";
import { heroImage } from "../../lib/media";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";

type AgentsPageProps = {
  agents: Agent[];
  allowPrivate: boolean;
  fetchError: boolean;
};

type AgentSortMode = "alphabetical" | "latest" | "trending";

export const getStaticProps: GetStaticProps<AgentsPageProps> = async () => {
  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";
  const visibilityFilter = allowPrivate ? undefined : "public";

  try {
    const agents = (await fetchAgents(visibilityFilter, { maxRecords: 400 })).map(
      toAgentListItem
    );
    return {
      props: { agents, allowPrivate, fetchError: false },
      revalidate: 600,
    };
  } catch {
    return {
      props: { agents: [], allowPrivate, fetchError: true },
      revalidate: 120,
    };
  }
};

export default function Agents({ agents, allowPrivate, fetchError }: AgentsPageProps) {
  const router = useRouter();
  const [visibility, setVisibility] = useState<"all" | "public" | "private">(
    allowPrivate ? "all" : "public"
  );
  const [sortMode, setSortMode] = useState<AgentSortMode>("trending");
  const agentHighlights = [
    {
      title: "Ownership and lifecycle",
      description: "Track owners, approval state, and lifecycle stage for every agent.",
    },
    {
      title: "Readiness signals",
      description: "Surface evaluation status, reliability notes, and rollout readiness.",
    },
    {
      title: "Visibility control",
      description: "Segment public and private listings with governance rules.",
    },
    {
      title: "Industry alignment",
      description: "Map agents to workflows and industry workspaces.",
    },
  ];
  const agentSignals = ["Owner mapped", "Eval ready", "Private-aware", "LLM metadata"];
  const [search, setSearch] = useState<string | null>(null);
  const [industryFilter, setIndustryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const pageSize = 24;
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const querySearch = useMemo(() => {
    const raw = Array.isArray(router.query.q) ? router.query.q[0] : router.query.q;
    return typeof raw === "string" ? raw : "";
  }, [router.query.q]);
  const effectiveSearch = search ?? querySearch;
  const industries = useMemo(
    () =>
      Array.from(new Set(agents.map((a) => a.industry || "Other"))).filter(Boolean).sort(),
    [agents]
  );
  const statuses = useMemo(() => {
    const list = Array.from(new Set(agents.map((a) => (a.status || "unknown").toLowerCase())));
    return list.sort();
  }, [agents]);
  const sources = useMemo(() => {
    const list = Array.from(new Set(agents.map((a) => (a.source || "internal").toLowerCase())));
    return list.sort();
  }, [agents]);
  const tagOptions = useMemo(() => {
    const map = new Map<string, string>();
    agents.forEach((agent) => {
      (agent.tags || []).forEach((tag) => {
        const key = (tag.slug || tag.name || "").toLowerCase();
        if (key && !map.has(key)) {
          map.set(key, tag.name || tag.slug || key);
        }
      });
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [agents]);
  const visibilityCounts = agents.reduce<Record<string, number>>((acc, a) => {
    const key = (a.visibility || "public").toLowerCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";
  const canonicalUrl = `${siteUrl}/aixcelerator/agents`;
  const metaTitle = "AI Agents Catalog | Colaberry AI";
  const metaDescription =
    "Explore a governed marketplace of AI agents with ownership, lifecycle status, and LLM-ready metadata for enterprise discovery.";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Colaberry AI Agents Catalog",
    url: canonicalUrl,
    description: metaDescription,
    itemListElement: agents.slice(0, 12).map((agent, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "SoftwareApplication",
        name: agent.name,
        description: agent.description || undefined,
        applicationCategory: "AI Agent",
        url: `${siteUrl}/aixcelerator/agents/${agent.slug || agent.id}`,
      },
    })),
  };
  const filteredAgents = useMemo(() => {
    const query = effectiveSearch.trim().toLowerCase();
    return filterByVisibility(agents, allowPrivate, visibility).filter((agent) =>
      matchesFilters(agent, query, industryFilter, statusFilter, sourceFilter, tagFilter)
    );
  }, [agents, allowPrivate, visibility, effectiveSearch, industryFilter, statusFilter, sourceFilter, tagFilter]);
  const sortedAgents = useMemo(
    () => sortAgents(filteredAgents, sortMode),
    [filteredAgents, sortMode]
  );
  const scopedAgents = useMemo(
    () => filterByVisibility(agents, allowPrivate, visibility),
    [agents, allowPrivate, visibility]
  );
  const latestAgents = useMemo(
    () => sortAgents(scopedAgents, "latest").slice(0, 6),
    [scopedAgents]
  );
  const trendingAgents = useMemo(
    () => sortAgents(scopedAgents, "trending").slice(0, 6),
    [scopedAgents]
  );
  const shownCount = Math.min(visibleCount, sortedAgents.length);
  const visibleAgents = useMemo(
    () => sortedAgents.slice(0, shownCount),
    [sortedAgents, shownCount]
  );
  const hasMore = shownCount < sortedAgents.length;
  const hasResults = sortedAgents.length > 0;

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + pageSize, sortedAgents.length));
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sortedAgents.length, hasMore, pageSize]);

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
            title="Live agent data is temporarily unavailable"
            description="Showing cached catalog entries while we reconnect to the CMS."
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
            kicker="Agents catalog"
            title="AI Agents"
            description="A governed AI marketplace of enterprise agents and assistants-aligned to teams, workflows, and industry context, with public and private listings."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {agentHighlights.map((item) => (
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
            {agentSignals.map((signal) => (
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
              SEO + LLM-ready discovery for trusted agents
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Each listing is structured with ownership, lifecycle state, and industry tags so
              humans and LLMs can discover, compare, and trust deployments.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/resources/case-studies"
                className="btn btn-secondary btn-compact"
              >
                Explore case studies
              </Link>
              <Link
                href="/resources/books#trust-before-intelligence"
                className="btn btn-ghost btn-compact"
              >
                Read Trust Before Intelligence
              </Link>
            </div>
          </div>
        </div>
        <MediaPanel
          kicker="Catalog preview"
          title="Agent coverage at a glance"
          description="Quickly see ownership, visibility, and readiness status."
          image={heroImage("hero-agents-cinematic.webp")}
          alt="Operators reviewing agent coverage"
          aspect="wide"
          fit="cover"
        />
      </div>

      <section className="surface-panel mt-6 p-5">
        <SectionHeader
          kicker="Catalog snapshot"
          title="Coverage and readiness"
          description="See how many agents are active across industries and stages."
          size="md"
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-3 sm:items-center sm:gap-6">
          <Stat title="Agents" value={String(agents.length)} note="Versioned catalog" />
          <Stat
            title="Industries"
            value={String(new Set(agents.map((a) => a.industry)).size)}
            note="Domain-aligned"
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
          title="Latest and trending agents"
          description="Track newest agent profiles and high-interest assistants before exploring the full catalog."
          size="md"
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <SignalRail
            title="Latest updates"
            description="Most recently updated agent profiles."
            items={latestAgents}
            emptyText="No recently updated agent entries available."
            detailType="latest"
          />
          <SignalRail
            title="Trending now"
            description="Agents with stronger usage, quality, and freshness signals."
            items={trendingAgents}
            emptyText="Trending signals will appear after more agent activity is recorded."
            detailType="trending"
          />
        </div>
      </section>

      <section className="surface-panel mt-8 p-6">
        <SectionHeader
          kicker="Filters"
          title="Search and filter"
          description="Find agents by industry, status, tags, and visibility."
          size="md"
        />
        <div className="mt-4 grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <label htmlFor="agent-search" className="sr-only">
              Search agents
            </label>
            <div className="relative group">
              <input
                id="agent-search"
                name="agent-search"
                type="search"
                placeholder="Search agents, industries, tags..."
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
            <label htmlFor="agent-industry" className="sr-only">
              Filter by industry
            </label>
            <select
              id="agent-industry"
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
            <label htmlFor="agent-status" className="sr-only">
              Filter by status
            </label>
            <select
              id="agent-status"
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
            <label htmlFor="agent-source" className="sr-only">
              Filter by source
            </label>
            <select
              id="agent-source"
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
              <label htmlFor="agent-tag" className="sr-only">
                Filter by tag
              </label>
              <select
                id="agent-tag"
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
            ] as { value: AgentSortMode; label: string }[]
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
          Showing {shownCount} of {sortedAgents.length} (catalog {scopedAgents.length})
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {visibleAgents.map((a) => (
          <AgentCard key={a.slug || String(a.id)} agent={a} />
        ))}
      </div>

      {!hasResults && (
        <div className="mt-6">
          <StatePanel
            variant="empty"
            title="No agents match these filters"
            description="Try clearing filters, switching visibility, or using a shorter search query."
          />
        </div>
      )}

      <div className="mt-6 flex flex-col items-center gap-3">
        {hasResults ? (
          hasMore ? (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => Math.min(prev + pageSize, sortedAgents.length))}
              className="btn btn-secondary"
            >
              Load more agents
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

function toAgentListItem(agent: Agent): Agent {
  return {
    id: agent.id,
    name: agent.name,
    slug: agent.slug,
    description: clipText(agent.description, 220),
    rating: typeof agent.rating === "number" ? agent.rating : null,
    usageCount: typeof agent.usageCount === "number" ? agent.usageCount : null,
    lastUpdated: agent.lastUpdated ?? null,
    industry: agent.industry ?? null,
    status: agent.status ?? null,
    visibility: agent.visibility ?? null,
    source: agent.source ?? null,
    sourceName: agent.sourceName ?? null,
    verified: agent.verified ?? null,
    tags: agent.tags ?? [],
    companies: agent.companies ?? [],
  };
}

function clipText(value?: string | null, limit = 220) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1).trimEnd()}...`;
}

function matchesFilters(
  agent: Agent,
  query: string,
  industryFilter?: string,
  statusFilter?: string,
  sourceFilter?: string,
  tagFilter?: string
) {
  const industryMatch =
    !industryFilter || industryFilter === "all"
      ? true
      : (agent.industry || "").toLowerCase() === industryFilter;
  const statusMatch =
    !statusFilter || statusFilter === "all"
      ? true
      : (agent.status || "unknown").toLowerCase() === statusFilter;
  const sourceMatch =
    !sourceFilter || sourceFilter === "all"
      ? true
      : (agent.source || "internal").toLowerCase() === sourceFilter;
  const tagMatch =
    !tagFilter || tagFilter === "all"
      ? true
      : (agent.tags || []).some(
          (tag) => (tag.slug || tag.name || "").toLowerCase() === tagFilter
        );
  if (!industryMatch || !statusMatch || !sourceMatch || !tagMatch) {
    return false;
  }
  if (!query) {
    return true;
  }
  const haystack = [
    agent.name,
    agent.description,
    agent.industry,
    ...(agent.tags || []).map((tag) => tag.name),
    ...(agent.companies || []).map((company) => company.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function filterByVisibility(
  agents: Agent[],
  allowPrivate: boolean,
  visibility: "all" | "public" | "private"
) {
  if (!allowPrivate) {
    return agents.filter((agent) => (agent.visibility || "public").toLowerCase() === "public");
  }
  if (visibility === "all") {
    return agents;
  }
  return agents.filter((agent) => (agent.visibility || "public").toLowerCase() === visibility);
}

function sortAgents(agents: Agent[], mode: AgentSortMode) {
  const sorted = [...agents];
  if (mode === "alphabetical") {
    return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
  if (mode === "latest") {
    return sorted.sort((a, b) => compareDatesDesc(a.lastUpdated, b.lastUpdated) || a.name.localeCompare(b.name));
  }
  return sorted.sort((a, b) => {
    const scoreDelta = scoreTrendingAgent(b) - scoreTrendingAgent(a);
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

function scoreTrendingAgent(agent: Agent) {
  const ratingScore = typeof agent.rating === "number" ? Math.max(agent.rating, 0) * 18 : 0;
  const usageScore =
    typeof agent.usageCount === "number" && agent.usageCount > 0
      ? Math.log10(agent.usageCount + 1) * 25
      : 0;
  const verifiedScore = agent.verified ? 8 : 0;
  const freshnessScore = getFreshnessScore(agent.lastUpdated);
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
  items: Agent[];
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
                  href={`/aixcelerator/agents/${item.slug || item.id}`}
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
