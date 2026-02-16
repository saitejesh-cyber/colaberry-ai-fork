import type { GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useMemo, useState } from "react";
import Layout from "../../components/Layout";
import MediaPanel from "../../components/MediaPanel";
import SectionHeader from "../../components/SectionHeader";
import StatePanel from "../../components/StatePanel";
import { fetchUseCases, UseCase } from "../../lib/cms";
import { heroImage } from "../../lib/media";

type UseCasesPageProps = {
  useCases: UseCase[];
  allowPrivate: boolean;
  fetchError: boolean;
};

type VisibilityFilter = "all" | "public" | "private";

export const getStaticProps: GetStaticProps<UseCasesPageProps> = async () => {
  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";
  const visibilityFilter = allowPrivate ? undefined : "public";

  try {
    const useCases = (await fetchUseCases(visibilityFilter, { maxRecords: 400 }))
      .filter((item) => Boolean(item.title && item.slug))
      .map((item) => ({
        ...item,
        title: item.title.trim(),
        slug: item.slug.trim(),
      }));

    return {
      props: { useCases, allowPrivate, fetchError: false },
      revalidate: 600,
    };
  } catch {
    return {
      props: { useCases: [], allowPrivate, fetchError: true },
      revalidate: 120,
    };
  }
};

export default function UseCasesPage({ useCases, allowPrivate, fetchError }: UseCasesPageProps) {
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibility, setVisibility] = useState<VisibilityFilter>(allowPrivate ? "all" : "public");

  const industries = useMemo(
    () =>
      Array.from(new Set(useCases.map((item) => (item.industry || "General").trim())))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [useCases]
  );

  const statuses = useMemo(
    () =>
      Array.from(new Set(useCases.map((item) => (item.status || "live").toLowerCase())))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [useCases]
  );

  const filteredUseCases = useMemo(() => {
    const query = search.trim().toLowerCase();

    return useCases.filter((item) => {
      const itemVisibility = (item.visibility || "public").toLowerCase();
      const visibilityMatch =
        visibility === "all" ? true : itemVisibility === visibility;
      const industryMatch =
        industryFilter === "all" ? true : (item.industry || "General") === industryFilter;
      const statusMatch =
        statusFilter === "all" ? true : (item.status || "live").toLowerCase() === statusFilter;
      const queryMatch =
        query.length === 0
          ? true
          : [
              item.title,
              item.summary,
              item.longDescription,
              item.industry,
              item.category,
              item.status,
              ...(item.tags || []).map((tag) => tag.name || tag.slug || ""),
              ...(item.companies || []).map((company) => company.name || company.slug || ""),
            ]
              .join(" ")
              .toLowerCase()
              .includes(query);

      return visibilityMatch && industryMatch && statusMatch && queryMatch;
    });
  }, [industryFilter, search, statusFilter, useCases, visibility]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";
  const canonicalUrl = `${siteUrl}/use-cases`;

  return (
    <Layout>
      <Head>
        <title>Use Cases | Colaberry AI</title>
        <meta
          name="description"
          content="Discover enterprise AI use cases with structured context across industries, outcomes, and implementation patterns."
        />
        <link rel="canonical" href={canonicalUrl} />
      </Head>

      {fetchError ? (
        <div className="mb-6">
          <StatePanel
            variant="error"
            title="Use case data is temporarily unavailable"
            description="Showing available cached data while CMS reconnects."
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <SectionHeader
            as="h1"
            size="xl"
            kicker="Solutions layer"
            title="Use Cases"
            description="Structured deployment patterns connecting agents, MCP servers, outcomes, and operational context."
          />
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            {["Outcome-led", "Industry-aligned", "Agent + MCP linked", "LLM-readable"].map((label) => (
              <span
                key={label}
                className="chip rounded-full border border-slate-200/80 bg-white px-3 py-1 font-semibold"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        <MediaPanel
          kicker="Use case catalog"
          title="Execution playbooks"
          description="Each profile captures problem framing, implementation pattern, outcomes, and linked assets."
          image={heroImage("hero-solutions-cinematic.webp")}
          alt="Enterprise AI use case catalog"
          aspect="wide"
          fit="cover"
        />
      </div>

      <section className="surface-panel mt-6 border border-slate-200/80 bg-white/90 p-5 sm:mt-8">
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, industry, tags, or companies..."
            className="w-full rounded-full border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25"
            aria-label="Search use cases"
          />
          <select
            value={industryFilter}
            onChange={(event) => setIndustryFilter(event.target.value)}
            className="w-full rounded-full border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25"
            aria-label="Filter by industry"
          >
            <option value="all">All industries</option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-full border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
          {allowPrivate ? (
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as VisibilityFilter)}
              className="w-full rounded-full border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 md:min-w-[10.5rem]"
              aria-label="Filter by visibility"
            >
              <option value="all">All visibility</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          ) : null}
        </div>
      </section>

      {filteredUseCases.length === 0 ? (
        <div className="mt-6">
          <StatePanel
            variant="empty"
            title="No use cases found"
            description="Try broader search terms or clear filters to see more results."
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:mt-8">
          {filteredUseCases.map((item) => {
            const statusLabel = (item.status || "live").toLowerCase();
            const visibilityLabel = (item.visibility || "public").toLowerCase();
            return (
              <Link
                key={item.id}
                href={`/use-cases/${item.slug}`}
                className="surface-panel surface-hover surface-interactive border border-slate-200/80 bg-white/90 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
                    {item.summary ? <p className="mt-1 text-sm text-slate-600">{item.summary}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="chip chip-brand rounded-full px-3 py-1 text-xs font-semibold">
                      {item.industry || "General"}
                    </span>
                    {item.category ? (
                      <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">
                        {item.category}
                      </span>
                    ) : null}
                    <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">
                      {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
                    </span>
                    <span className="chip chip-muted rounded-full px-3 py-1 text-xs font-semibold">
                      {visibilityLabel.charAt(0).toUpperCase() + visibilityLabel.slice(1)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Agents: {item.agents.length}</span>
                  <span>•</span>
                  <span>MCP servers: {item.mcpServers.length}</span>
                  {item.lastUpdated ? (
                    <>
                      <span>•</span>
                      <span>Updated {formatDate(item.lastUpdated)}</span>
                    </>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Layout>
  );
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
