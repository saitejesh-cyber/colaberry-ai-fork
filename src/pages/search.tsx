import Link from "next/link";
import type { GetServerSideProps } from "next";
import Layout from "../components/Layout";
import SectionHeader from "../components/SectionHeader";
import StatePanel from "../components/StatePanel";
import fallbackAgents from "../data/agents.json";
import fallbackMcps from "../data/mcps.json";
import caseStudies from "../data/caseStudies.json";
import {
  Agent,
  MCPServer,
  PodcastEpisode,
  fetchAgents,
  fetchMCPServers,
  fetchPodcastEpisodes,
} from "../lib/cms";
import { getIndustryDisplayName } from "../data/caseStudies";

type SearchResultType = "Agents" | "MCP Servers" | "Podcasts" | "Case Studies" | "Pages";

type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  description?: string;
  href: string;
  meta?: string;
};

type SearchPageProps = {
  query: string;
  results: SearchResult[];
};

const TYPE_ORDER: SearchResultType[] = ["Agents", "MCP Servers", "Podcasts", "Case Studies", "Pages"];
const TYPE_LIMITS: Record<SearchResultType, number> = {
  Agents: 12,
  "MCP Servers": 12,
  Podcasts: 8,
  "Case Studies": 10,
  Pages: 6,
};

const STATIC_PAGES: Array<Omit<SearchResult, "id">> = [
  {
    type: "Pages",
    title: "AIXcelerator platform",
    description: "Core platform, modular layers, and governance surface.",
    href: "/aixcelerator",
    meta: "Platform",
  },
  {
    type: "Pages",
    title: "Agents catalog",
    description: "Governed catalog of enterprise agents and assistants.",
    href: "/aixcelerator/agents",
    meta: "Agents",
  },
  {
    type: "Pages",
    title: "MCP servers library",
    description: "Standardized MCP server registry and integrations.",
    href: "/aixcelerator/mcp",
    meta: "MCP",
  },
  {
    type: "Pages",
    title: "Industries",
    description: "Industry pages with aligned solutions and case studies.",
    href: "/industries",
    meta: "Industries",
  },
  {
    type: "Pages",
    title: "Solutions",
    description: "Packaged offerings and reusable playbooks.",
    href: "/solutions",
    meta: "Solutions",
  },
  {
    type: "Pages",
    title: "Resources hub",
    description: "Podcasts, books, white papers, and curated signals.",
    href: "/resources",
    meta: "Resources",
  },
  {
    type: "Pages",
    title: "News and product updates",
    description: "Announcements, releases, and ecosystem signals.",
    href: "/updates",
    meta: "Updates",
  },
];

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function matchesQuery(query: string, fields: Array<string | undefined | null>) {
  const haystack = normalizeText(fields.filter(Boolean).join(" "));
  return haystack.includes(query);
}

function buildAgentResults(query: string, rawQuery: string, agents: Agent[]): SearchResult[] {
  return agents
    .filter((agent) =>
      matchesQuery(query, [
        agent.name,
        agent.description,
        agent.industry,
        agent.status,
        agent.source,
        ...(agent.tags || []).map((tag) => tag.name || tag.slug || ""),
        ...(agent.companies || []).map((company) => company.name || company.slug || ""),
      ])
    )
    .map((agent) => ({
      id: `agent-${agent.id}`,
      type: "Agents",
      title: agent.name,
      description: agent.description || "Agent catalog entry",
      href: `/aixcelerator/agents?q=${encodeURIComponent(rawQuery)}`,
      meta: [agent.industry, agent.status].filter(Boolean).join(" · ") || "Agent",
    }));
}

function buildMcpResults(query: string, rawQuery: string, servers: MCPServer[]): SearchResult[] {
  return servers
    .filter((server) =>
      matchesQuery(query, [
        server.name,
        server.description,
        server.industry,
        server.category,
        server.status,
        server.source,
        ...(server.tags || []).map((tag) => tag.name || tag.slug || ""),
        ...(server.companies || []).map((company) => company.name || company.slug || ""),
      ])
    )
    .map((server) => ({
      id: `mcp-${server.id}`,
      type: "MCP Servers",
      title: server.name,
      description: server.description || "MCP server catalog entry",
      href: `/aixcelerator/mcp?q=${encodeURIComponent(rawQuery)}`,
      meta: [server.industry, server.category].filter(Boolean).join(" · ") || "MCP server",
    }));
}

function buildPodcastResults(query: string, episodes: PodcastEpisode[]): SearchResult[] {
  return episodes
    .filter((episode) =>
      matchesQuery(query, [
        episode.title,
        ...(episode.tags || []).map((tag) => tag.name || tag.slug || ""),
        ...(episode.companies || []).map((company) => company.name || company.slug || ""),
      ])
    )
    .map((episode) => ({
      id: `podcast-${episode.id}`,
      type: "Podcasts",
      title: episode.title,
      description: "Podcast episode",
      href: `/resources/podcasts/${episode.slug}`,
      meta: episode.publishedDate || "Podcast",
    }));
}

function buildCaseStudyResults(query: string): SearchResult[] {
  const results: SearchResult[] = [];
  const entries = Object.entries(caseStudies as Record<string, any>);
  entries.forEach(([slug, industry]) => {
    const displayName = industry?.industry || getIndustryDisplayName(slug);
    const cases = Array.isArray(industry?.cases) ? industry.cases : [];
    cases.forEach((caseStudy: any, index: number) => {
      const title = caseStudy?.title || "Case study";
      const match = matchesQuery(query, [
        displayName,
        title,
        ...(caseStudy?.challenge || []),
        ...(caseStudy?.solution || []),
        ...(caseStudy?.outcomes || []),
      ]);
      if (!match) return;
      results.push({
        id: `case-${slug}-${index}`,
        type: "Case Studies",
        title,
        description: (caseStudy?.challenge || [])[0] || "Industry case study",
        href: `/industries/${slug}`,
        meta: displayName,
      });
    });
  });
  return results;
}

function buildPageResults(query: string): SearchResult[] {
  return STATIC_PAGES.filter((page) =>
    matchesQuery(query, [page.title, page.description, page.meta])
  ).map((page, index) => ({
    id: `page-${index}`,
    ...page,
  }));
}

function groupResults(results: SearchResult[]) {
  const grouped = new Map<SearchResultType, SearchResult[]>();
  results.forEach((result) => {
    const bucket = grouped.get(result.type) || [];
    bucket.push(result);
    grouped.set(result.type, bucket);
  });

  return TYPE_ORDER.map((type) => {
    const items = grouped.get(type) || [];
    const limit = TYPE_LIMITS[type];
    return { type, items: items.slice(0, limit) };
  }).filter((group) => group.items.length > 0);
}

export const getServerSideProps: GetServerSideProps<SearchPageProps> = async ({ query }) => {
  const rawQuery = typeof query.q === "string" ? query.q.trim() : "";
  if (!rawQuery) {
    return { props: { query: "", results: [] } };
  }

  const normalizedQuery = normalizeText(rawQuery);
  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";
  const visibilityFilter = allowPrivate ? undefined : "public";

  const [agents, mcps, podcasts] = await Promise.all([
    fetchAgents(visibilityFilter).catch(() => fallbackAgents as Agent[]),
    fetchMCPServers(visibilityFilter).catch(() => fallbackMcps as MCPServer[]),
    fetchPodcastEpisodes().catch(() => [] as PodcastEpisode[]),
  ]);

  const results = [
    ...buildAgentResults(normalizedQuery, rawQuery, agents),
    ...buildMcpResults(normalizedQuery, rawQuery, mcps),
    ...buildPodcastResults(normalizedQuery, podcasts),
    ...buildCaseStudyResults(normalizedQuery),
    ...buildPageResults(normalizedQuery),
  ];

  return {
    props: {
      query: rawQuery,
      results,
    },
  };
};

export default function SearchPage({ query, results }: SearchPageProps) {
  const grouped = groupResults(results);
  const hasResults = grouped.length > 0;

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <SectionHeader
            as="h1"
            size="xl"
            kicker="Search"
            title={query ? `Results for \"${query}\"` : "Search the catalog"}
            description="Search across agents, MCP servers, podcasts, case studies, and core pages."
          />
        </div>
        <div className="surface-panel p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Refine search
          </div>
          <form action="/search" method="get" role="search" className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="search-q" className="sr-only">
              Search
            </label>
            <input
              id="search-q"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search agents, MCP servers, podcasts, case studies..."
              className="w-full rounded-full border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25"
            />
            <button type="submit" className="btn btn-primary btn-sm">
              Search
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            Try keywords like industry names, agent types, MCP servers, or podcast topics.
          </p>
        </div>
      </div>

      {!query ? (
        <div className="mt-8">
          <StatePanel
            variant="empty"
            title="Start with a search term"
            description="Enter a keyword to explore agents, MCP servers, podcasts, and case studies."
          />
        </div>
      ) : null}

      {query && !hasResults ? (
        <div className="mt-8">
          <StatePanel
            variant="empty"
            title="No results yet"
            description="Try a broader keyword, check spelling, or search by industry."
          />
        </div>
      ) : null}

      {hasResults ? (
        <div className="mt-8 grid gap-6">
          {grouped.map((group) => (
            <section key={group.type} className="surface-panel p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">{group.type}</div>
                <span className="text-xs text-slate-500">{group.items.length} results</span>
              </div>
              <div className="mt-4 grid gap-3">
                {group.items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="surface-panel surface-hover surface-interactive border border-slate-200/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                        {item.description ? (
                          <div className="mt-1 text-sm text-slate-600">{item.description}</div>
                        ) : null}
                      </div>
                      <span className="rounded-full border border-brand-blue/20 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-deep">
                        {item.type}
                      </span>
                    </div>
                    {item.meta ? <div className="mt-2 text-xs text-slate-500">{item.meta}</div> : null}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </Layout>
  );
}
