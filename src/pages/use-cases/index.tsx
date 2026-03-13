import type { GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../../components/Layout";
import CatalogSnapshot from "../../components/CatalogSnapshot";
import SectionHeader from "../../components/SectionHeader";
import StatePanel from "../../components/StatePanel";
import { fetchUseCases, UseCase } from "../../lib/cms";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../lib/seo";

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
  const seoMeta: SeoMeta = {
    title: "Use Cases | Colaberry AI",
    description: "Discover enterprise AI use cases with structured context across industries, outcomes, and implementation patterns.",
    canonical: buildCanonical("/use-cases"),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              "name": "Colaberry AI Use Cases",
              "description": "Discover enterprise AI use cases with structured context across industries, outcomes, and implementation patterns.",
              "url": canonicalUrl,
            }),
          }}
        />
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

      <div className="reveal grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <SectionHeader
            as="h1"
            size="xl"
            kicker="Solutions layer"
            title="Use Cases"
            description="Structured deployment patterns connecting agents, MCP servers, outcomes, and operational context."
          />
        </div>
      </div>

      <CatalogSnapshot
        stats={[
          { label: "Use cases", value: useCases.length.toLocaleString(), note: "Structured profiles" },
          { label: "Industries", value: String(new Set(useCases.map((item) => item.industry)).size), note: "Domain-aligned" },
          { label: "Visibility", value: `${visibilityCounts.public ?? 0} public`, note: allowPrivate ? `${visibilityCounts.private ?? 0} private` : "Private hidden" },
        ]}
      />

      <section className="reveal surface-panel section-spacing p-5">
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto]">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Search title, industry, tags, or companies..."
            className="w-full rounded-lg border border-zinc-200/80 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:border-[#4F2AA3]/40 focus:outline-none focus:ring-2 focus:ring-[#4F2AA3]/25 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200 dark:placeholder:text-zinc-500"
            aria-label="Search use cases"
          />
          <select
            value={industryFilter}
            onChange={(event) => {
              setIndustryFilter(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="w-full rounded-lg border border-zinc-200/80 bg-white px-4 py-2.5 text-sm text-zinc-700 shadow-sm focus:border-[#4F2AA3]/40 focus:outline-none focus:ring-2 focus:ring-[#4F2AA3]/25 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200"
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
            className="w-full rounded-lg border border-zinc-200/80 bg-white px-4 py-2.5 text-sm text-zinc-700 shadow-sm focus:border-[#4F2AA3]/40 focus:outline-none focus:ring-2 focus:ring-[#4F2AA3]/25 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200"
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
              className="w-full rounded-lg border border-zinc-200/80 bg-white px-4 py-2.5 text-sm text-zinc-700 shadow-sm focus:border-[#4F2AA3]/40 focus:outline-none focus:ring-2 focus:ring-[#4F2AA3]/25 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200 md:min-w-[10.5rem]"
              aria-label="Filter by visibility"
            >
              <option value="all">All visibility</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          ) : null}
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
                className={`chip focus-ring rounded-md px-3 py-1 text-xs font-semibold ${
                  active ? "chip-brand" : "chip-muted"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500" aria-live="polite">
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
        <div className="reveal section-spacing grid gap-4">
          {visibleUseCases.map((item) => {
            const statusLabel = (item.status || "live").toLowerCase();
            const visibilityLabel = (item.visibility || "public").toLowerCase();
            return (
              <Link
                key={item.id}
                href={`/use-cases/${item.slug}`}
                className="card-feature p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</h2>
                    {item.summary ? <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{item.summary}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="chip chip-brand rounded-md px-3 py-1 text-xs font-semibold">
                      {item.industry || "General"}
                    </span>
                    {item.category ? (
                      <span className="chip chip-muted rounded-md px-3 py-1 text-xs font-semibold">
                        {item.category}
                      </span>
                    ) : null}
                    <span className="chip chip-muted rounded-md px-3 py-1 text-xs font-semibold">
                      {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
                    </span>
                    <span className="chip chip-muted rounded-md px-3 py-1 text-xs font-semibold">
                      {visibilityLabel.charAt(0).toUpperCase() + visibilityLabel.slice(1)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
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
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
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


