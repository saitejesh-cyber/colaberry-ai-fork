import MCPCard from "../../components/MCPCard";
import Layout from "../../components/Layout";
import SectionHeader from "../../components/SectionHeader";
import { useEffect, useMemo, useState } from "react";
import type { GetServerSideProps } from "next";
import fallbackMCPs from "../../data/mcps.json";
import { fetchMCPServers, MCPServer } from "../../lib/cms";

type MCPPageProps = {
  mcps: MCPServer[];
  allowPrivate: boolean;
};

export const getServerSideProps: GetServerSideProps<MCPPageProps> = async () => {
  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";
  const visibilityFilter = allowPrivate ? undefined : "public";

  try {
    const mcps = await fetchMCPServers(visibilityFilter);
    const safeMcps = mcps.length
      ? mcps
      : (fallbackMCPs as MCPServer[]).filter(
          (mcp) => (mcp.visibility || "public").toLowerCase() === "public"
        );
    return { props: { mcps: safeMcps, allowPrivate } };
  } catch {
    const safeMcps = (fallbackMCPs as MCPServer[]).filter(
      (mcp) => (mcp.visibility || "public").toLowerCase() === "public"
    );
    return { props: { mcps: safeMcps, allowPrivate } };
  }
};

export default function MCP({ mcps, allowPrivate }: MCPPageProps) {
  const [visibility, setVisibility] = useState<"all" | "public" | "private">(
    allowPrivate ? "all" : "public"
  );
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 24;
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
  const filteredMCPs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!allowPrivate) {
      return mcps.filter((mcp) => {
        const matchesVisibility =
          (mcp.visibility || "public").toLowerCase() === "public";
        return matchesVisibility && matchesFilters(mcp, query, industryFilter, statusFilter, sourceFilter, tagFilter);
      });
    }
    if (visibility === "all") {
      return mcps.filter((mcp) => matchesFilters(mcp, query, industryFilter, statusFilter, sourceFilter, tagFilter));
    }
    return mcps.filter(
      (mcp) =>
        (mcp.visibility || "public").toLowerCase() === visibility &&
        matchesFilters(mcp, query, industryFilter, statusFilter, sourceFilter, tagFilter)
    );
  }, [allowPrivate, industryFilter, mcps, search, sourceFilter, statusFilter, tagFilter, visibility]);
  const totalPages = Math.max(1, Math.ceil(filteredMCPs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filteredMCPs.length);
  const pagedMCPs = useMemo(
    () => filteredMCPs.slice(pageStart, pageEnd),
    [filteredMCPs, pageEnd, pageStart]
  );

  useEffect(() => {
    setPage(1);
  }, [search, industryFilter, statusFilter, sourceFilter, tagFilter, visibility, allowPrivate, mcps.length]);

  return (
    <Layout>
      <div className="flex flex-col gap-3">
        <SectionHeader
          as="h1"
          size="xl"
          kicker="MCP library"
          title="MCP Servers"
          description="A curated MCP server library for connecting agents to business apps, data, and developer tools-with public and private options for secure deployment."
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
            <div className="relative">
              <input
                id="mcp-search"
                name="mcp-search"
                type="search"
                placeholder="Search MCP servers, industries, tags..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-full border border-slate-200/80 bg-white px-4 py-2 pr-10 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:placeholder:text-slate-500"
              />
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-teal"
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
            <label htmlFor="mcp-status" className="sr-only">
              Filter by status
            </label>
            <select
              id="mcp-status"
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
            <label htmlFor="mcp-source" className="sr-only">
              Filter by source
            </label>
            <select
              id="mcp-source"
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
              <label htmlFor="mcp-tag" className="sr-only">
                Filter by tag
              </label>
              <select
                id="mcp-tag"
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
                  className={`chip rounded-full px-3 py-1 text-xs font-semibold ${
                    active ? "chip-brand" : "chip-muted"
                  }`}
                >
                  {option === "all" ? "All" : option === "public" ? "Public" : "Private"}
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Showing {filteredMCPs.length ? `${pageStart + 1}-${pageEnd}` : 0} of{" "}
          {filteredMCPs.length} (total {mcps.length})
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {pagedMCPs.map((m, i) => (
          <MCPCard key={i} mcp={m} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="rounded-full border border-slate-200/80 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-blue/40 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
          >
            Previous
          </button>
          <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Page {currentPage} of {totalPages}
          </div>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="rounded-full border border-slate-200/80 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-blue/40 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
          >
            Next
          </button>
        </div>
      )}
    </Layout>
  );
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

function Stat({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-600">{note}</div>
    </div>
  );
}
