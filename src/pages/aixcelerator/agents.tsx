import AgentCard from "../../components/AgentCard";
import Layout from "../../components/Layout";
import SectionHeader from "../../components/SectionHeader";
import MediaPanel from "../../components/MediaPanel";
import StatePanel from "../../components/StatePanel";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GetServerSideProps } from "next";
import fallbackAgents from "../../data/agents.json";
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

export const getServerSideProps: GetServerSideProps<AgentsPageProps> = async () => {
  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";
  const visibilityFilter = allowPrivate ? undefined : "public";

  try {
    const agents = await fetchAgents(visibilityFilter);
    const safeAgents = agents.length
      ? agents
      : (fallbackAgents as Agent[]).filter(
          (agent) => (agent.visibility || "public").toLowerCase() === "public"
        );
    return { props: { agents: safeAgents, allowPrivate, fetchError: false } };
  } catch {
    const safeAgents = (fallbackAgents as Agent[]).filter(
      (agent) => (agent.visibility || "public").toLowerCase() === "public"
    );
    return { props: { agents: safeAgents, allowPrivate, fetchError: true } };
  }
};

export default function Agents({ agents, allowPrivate, fetchError }: AgentsPageProps) {
  const router = useRouter();
  const [visibility, setVisibility] = useState<"all" | "public" | "private">(
    allowPrivate ? "all" : "public"
  );
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
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const pageSize = 24;
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!router.isReady) return;
    const raw = Array.isArray(router.query.q) ? router.query.q[0] : router.query.q;
    const nextQuery = typeof raw === "string" ? raw : "";
    setSearch((prev) => (prev === nextQuery ? prev : nextQuery));
  }, [router.isReady, router.query.q]);
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
    const query = search.trim().toLowerCase();
    if (!allowPrivate) {
      return agents.filter((agent) => {
        const matchesVisibility =
          (agent.visibility || "public").toLowerCase() === "public";
        return matchesVisibility && matchesFilters(agent, query, industryFilter, statusFilter, sourceFilter, tagFilter);
      });
    }
    if (visibility === "all") {
      return agents.filter((agent) => matchesFilters(agent, query, industryFilter, statusFilter, sourceFilter, tagFilter));
    }
    return agents.filter(
      (agent) =>
        (agent.visibility || "public").toLowerCase() === visibility &&
        matchesFilters(agent, query, industryFilter, statusFilter, sourceFilter, tagFilter)
    );
  }, [allowPrivate, agents, industryFilter, search, sourceFilter, statusFilter, tagFilter, visibility]);
  const shownCount = Math.min(visibleCount, filteredAgents.length);
  const visibleAgents = useMemo(
    () => filteredAgents.slice(0, shownCount),
    [filteredAgents, shownCount]
  );
  const hasMore = shownCount < filteredAgents.length;
  const hasResults = filteredAgents.length > 0;

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [search, industryFilter, statusFilter, sourceFilter, tagFilter, visibility, allowPrivate, agents.length, pageSize]);

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + pageSize, filteredAgents.length));
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredAgents.length, hasMore, pageSize]);

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
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
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
          image={heroImage("hero-agents.png")}
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
                value={search}
                onChange={(event) => setSearch(event.target.value)}
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
              onChange={(event) => setIndustryFilter(event.target.value)}
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
              onChange={(event) => setStatusFilter(event.target.value)}
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
              onChange={(event) => setSourceFilter(event.target.value)}
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
                onChange={(event) => setTagFilter(event.target.value)}
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
        {allowPrivate && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(["all", "public", "private"] as const).map((option) => {
              const active = visibility === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setVisibility(option)}
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
          Showing {shownCount} of {filteredAgents.length} (total {agents.length})
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {visibleAgents.map((a, i) => (
          <AgentCard key={i} agent={a} />
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
              onClick={() => setVisibleCount((prev) => Math.min(prev + pageSize, filteredAgents.length))}
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

function Stat({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-600">{note}</div>
    </div>
  );
}
