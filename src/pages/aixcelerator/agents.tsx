import AgentCard from "../../components/AgentCard";
import Layout from "../../components/Layout";
import SectionHeader from "../../components/SectionHeader";
import { useMemo, useState } from "react";
import type { GetServerSideProps } from "next";
import fallbackAgents from "../../data/agents.json";
import { Agent, fetchAgents } from "../../lib/cms";

type AgentsPageProps = {
  agents: Agent[];
  allowPrivate: boolean;
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
    return { props: { agents: safeAgents, allowPrivate } };
  } catch {
    const safeAgents = (fallbackAgents as Agent[]).filter(
      (agent) => (agent.visibility || "public").toLowerCase() === "public"
    );
    return { props: { agents: safeAgents, allowPrivate } };
  }
};

export default function Agents({ agents, allowPrivate }: AgentsPageProps) {
  const [visibility, setVisibility] = useState<"all" | "public" | "private">(
    allowPrivate ? "all" : "public"
  );
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const industries = useMemo(
    () =>
      Array.from(new Set(agents.map((a) => a.industry || "Other"))).filter(Boolean).sort(),
    [agents]
  );
  const statuses = useMemo(() => {
    const list = Array.from(new Set(agents.map((a) => (a.status || "unknown").toLowerCase())));
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
  const filteredAgents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!allowPrivate) {
      return agents.filter((agent) => {
        const matchesVisibility =
          (agent.visibility || "public").toLowerCase() === "public";
        return matchesVisibility && matchesFilters(agent, query, industryFilter, statusFilter, tagFilter);
      });
    }
    if (visibility === "all") {
      return agents.filter((agent) => matchesFilters(agent, query, industryFilter, statusFilter, tagFilter));
    }
    return agents.filter(
      (agent) =>
        (agent.visibility || "public").toLowerCase() === visibility &&
        matchesFilters(agent, query, industryFilter, statusFilter, tagFilter)
    );
  }, [allowPrivate, agents, industryFilter, search, statusFilter, tagFilter, visibility]);

  return (
    <Layout>
      <div className="flex flex-col gap-3">
        <SectionHeader
          as="h1"
          size="xl"
          kicker="Agents catalog"
          title="AI Agents"
          description="A governed catalog of enterprise agents and assistants-aligned to teams, workflows, and industry context, with public and private listings."
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
          <div className="lg:col-span-5">
            <label htmlFor="agent-search" className="sr-only">
              Search agents
            </label>
            <div className="relative">
              <input
                id="agent-search"
                name="agent-search"
                type="search"
                placeholder="Search agents, industries, tags..."
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
          {tagOptions.length > 0 && (
            <div className="lg:col-span-3">
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
          Showing {filteredAgents.length} of {agents.length}
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAgents.map((a, i) => (
          <AgentCard key={i} agent={a} />
        ))}
      </div>
    </Layout>
  );
}

function matchesFilters(
  agent: Agent,
  query: string,
  industryFilter?: string,
  statusFilter?: string,
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
  const tagMatch =
    !tagFilter || tagFilter === "all"
      ? true
      : (agent.tags || []).some(
          (tag) => (tag.slug || tag.name || "").toLowerCase() === tagFilter
        );
  if (!industryMatch || !statusMatch || !tagMatch) {
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
