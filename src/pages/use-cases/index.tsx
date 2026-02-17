import type { GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
type UseCaseSortMode = "alphabetical" | "latest" | "trending";

const PAGE_SIZE = 24;

export const getStaticProps: GetStaticProps<UseCasesPageProps> = async () => {
  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";
  const visibilityFilter = allowPrivate ? undefined : "public";

  try {
    const useCases = (await fetchUseCases(visibilityFilter, { maxRecords: 400, sortBy: "latest" }))
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
  const [sortMode, setSortMode] = useState<UseCaseSortMode>("trending");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

  const scopedUseCases = useMemo(
    () => filterUseCasesByVisibility(useCases, allowPrivate, visibility),
    [allowPrivate, useCases, visibility]
  );

  const visibilityCounts = useMemo(
    () =>
      useCases.reduce<Record<string, number>>((acc, item) => {
        const key = (item.visibility || "public").toLowerCase();
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    [useCases]
  );

  const filteredUseCases = useMemo(() => {
    const query = search.trim().toLowerCase();

    return scopedUseCases.filter((item) => {
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

      return industryMatch && statusMatch && queryMatch;
    });
  }, [industryFilter, scopedUseCases, search, statusFilter]);

  const sortedUseCases = useMemo(
    () => sortUseCases(filteredUseCases, sortMode),
    [filteredUseCases, sortMode]
  );
  const latestUseCases = useMemo(
    () => sortUseCases(scopedUseCases, "latest").slice(0, 6),
    [scopedUseCases]
  );
  const trendingUseCases = useMemo(
    () => sortUseCases(scopedUseCases, "trending").slice(0, 6),
    [scopedUseCases]
  );
  const shownCount = Math.min(visibleCount, sortedUseCases.length);
  const visibleUseCases = useMemo(
    () => sortedUseCases.slice(0, shownCount),
    [shownCount, sortedUseCases]
  );
  const hasMore = shownCount < sortedUseCases.length;

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, sortedUseCases.length));
        }
      },
      { rootMargin: "320px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, sortedUseCases.length]);

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

      <section className="surface-panel mt-6 p-5 sm:mt-8">
        <SectionHeader
          kicker="Catalog snapshot"
          title="Coverage and deployment readiness"
          description="A quick view of breadth across industries, visibility, and connected assets."
          size="md"
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-3 sm:items-center sm:gap-6">
          <Stat title="Use cases" value={String(useCases.length)} note="Structured profiles" />
          <Stat
            title="Industries"
            value={String(new Set(useCases.map((item) => item.industry)).size)}
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
          title="Latest and trending use cases"
          description="Track newest playbooks and high-interest deployment patterns."
          size="md"
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <SignalRail
            title="Latest updates"
            description="Most recently updated use case profiles."
            items={latestUseCases}
            emptyText="No recently updated use cases available."
            detailType="latest"
          />
          <SignalRail
            title="Trending now"
            description="Use cases with stronger linkage, quality, and freshness signals."
            items={trendingUseCases}
            emptyText="Trending signals will appear after more use case activity is recorded."
            detailType="trending"
          />
        </div>
      </section>

      <section className="surface-panel mt-6 border border-slate-200/80 bg-white/90 p-5">
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto]">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Search title, industry, tags, or companies..."
            className="w-full rounded-full border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25"
            aria-label="Search use cases"
          />
          <select
            value={industryFilter}
            onChange={(event) => {
              setIndustryFilter(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
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
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
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
              onChange={(event) => {
                setVisibility(event.target.value as VisibilityFilter);
                setVisibleCount(PAGE_SIZE);
              }}
              className="w-full rounded-full border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 md:min-w-[10.5rem]"
              aria-label="Filter by visibility"
            >
              <option value="all">All visibility</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          ) : null}
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
            ] as { value: UseCaseSortMode; label: string }[]
          ).map((option) => {
            const active = sortMode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSortMode(option.value);
                  setVisibleCount(PAGE_SIZE);
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
        <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500" aria-live="polite">
          Showing {shownCount} of {sortedUseCases.length} (catalog {scopedUseCases.length})
        </div>
      </section>

      {sortedUseCases.length === 0 ? (
        <div className="mt-6">
          <StatePanel
            variant="empty"
            title="No use cases found"
            description="Try broader search terms or clear filters to see more results."
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:mt-8">
          {visibleUseCases.map((item) => {
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
      <div className="mt-6 flex flex-col items-center gap-3">
        {sortedUseCases.length > 0 ? (
          hasMore ? (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, sortedUseCases.length))}
              className="btn btn-secondary"
            >
              Load more use cases
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

function formatDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function filterUseCasesByVisibility(
  useCases: UseCase[],
  allowPrivate: boolean,
  visibility: VisibilityFilter
) {
  if (!allowPrivate) {
    return useCases.filter((item) => (item.visibility || "public").toLowerCase() === "public");
  }
  if (visibility === "all") {
    return useCases;
  }
  return useCases.filter((item) => (item.visibility || "public").toLowerCase() === visibility);
}

function sortUseCases(useCases: UseCase[], mode: UseCaseSortMode) {
  const sorted = [...useCases];
  if (mode === "alphabetical") {
    return sorted.sort((a, b) => a.title.localeCompare(b.title));
  }
  if (mode === "latest") {
    return sorted.sort((a, b) => compareDatesDesc(a.lastUpdated, b.lastUpdated) || a.title.localeCompare(b.title));
  }
  return sorted.sort((a, b) => {
    const scoreDelta = scoreTrendingUseCase(b) - scoreTrendingUseCase(a);
    if (scoreDelta !== 0) return scoreDelta;
    return compareDatesDesc(a.lastUpdated, b.lastUpdated) || a.title.localeCompare(b.title);
  });
}

function compareDatesDesc(left?: string | null, right?: string | null) {
  return toTimestamp(right) - toTimestamp(left);
}

function toTimestamp(value?: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function scoreTrendingUseCase(item: UseCase) {
  const linkageScore = Math.min(item.agents.length * 5 + item.mcpServers.length * 4, 30);
  const verifiedScore = item.verified ? 8 : 0;
  const completenessScore =
    (item.summary ? 2 : 0) +
    (item.longDescription ? 4 : 0) +
    (item.outcomes ? 3 : 0) +
    (item.metrics ? 3 : 0);
  const freshnessScore = (() => {
    const timestamp = toTimestamp(item.lastUpdated);
    if (!timestamp) return 0;
    const days = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    if (days <= 14) return 12;
    if (days <= 45) return 8;
    if (days <= 90) return 4;
    return 0;
  })();
  return linkageScore + verifiedScore + completenessScore + freshnessScore;
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
  items: UseCase[];
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
                ? formatDate(item.lastUpdated) || "Date pending"
                : item.verified
                ? "Verified"
                : `${item.agents.length + item.mcpServers.length} links`;
            return (
              <li key={item.slug || item.id}>
                <Link
                  href={`/use-cases/${item.slug}`}
                  className="group flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-blue/30 hover:text-brand-deep"
                >
                  <span className="truncate pr-3">{item.title}</span>
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
