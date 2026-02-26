import Layout from "../../../components/Layout";
import Link from "next/link";
import Head from "next/head";
import Image from "next/image";
import type { GetServerSideProps } from "next";
import { useMemo, useState } from "react";
import SectionHeader from "../../../components/SectionHeader";
import EnterprisePageHero from "../../../components/EnterprisePageHero";
import PodcastPlayer from "../../../components/PodcastPlayer";
import StatePanel from "../../../components/StatePanel";
import {
  fetchPodcastEpisodes,
  getPodcastTrendingScore,
  type PodcastEpisode,
  type PodcastSortBy,
} from "../../../lib/cms";
import { heroImage } from "../../../lib/media";
import { logPodcastEvent } from "../../../lib/podcastTelemetry";

const PAGE_SIZE = 24;
const PODCAST_BRAND_IMAGE = "/media/podcast/colaberry-ai-podcast-qr.png";
const PODCAST_FALLBACK_IMAGE = heroImage("hero-podcasts-cinematic.webp");

type PodcastTypeFilter = "all" | "internal" | "external";

type PodcastCompanyFacet = {
  slug: string;
  name: string;
  count: number;
};

type PodcastQueryState = {
  sort: PodcastSortBy;
  type: PodcastTypeFilter;
  q: string;
};

type PodcastsPageProps = {
  episodes: PodcastEpisode[];
  companies: PodcastCompanyFacet[];
  featuredLatest: PodcastEpisode[];
  featuredTrending: PodcastEpisode[];
  fetchError: boolean;
  totalEpisodes: number;
  totalPages: number;
  currentPage: number;
  internalCount: number;
  externalCount: number;
  activeSort: PodcastSortBy;
  activeType: PodcastTypeFilter;
  searchQuery: string;
  canonicalPath: string;
};

export default function Podcasts({
  episodes,
  companies,
  featuredLatest,
  featuredTrending,
  fetchError,
  totalEpisodes,
  totalPages,
  currentPage,
  internalCount,
  externalCount,
  activeSort,
  activeType,
  searchQuery,
  canonicalPath,
}: PodcastsPageProps) {
  const [companyQuery, setCompanyQuery] = useState("");
  const [activeEpisodeSlug, setActiveEpisodeSlug] = useState<string | null>(null);

  const filteredCompanies = useMemo(() => {
    const query = companyQuery.trim().toLowerCase();
    if (!query) {
      return companies;
    }
    return companies.filter((company) => company.name.toLowerCase().includes(query));
  }, [companies, companyQuery]);

  const showingFrom = totalEpisodes ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const showingTo = totalEpisodes ? Math.min(currentPage * PAGE_SIZE, totalEpisodes) : 0;
  const visiblePages = buildVisiblePages(currentPage, totalPages);
  const queryState: PodcastQueryState = {
    sort: activeSort,
    type: activeType,
    q: searchQuery,
  };

  const sortLabel = activeSort === "trending" ? "trending signal" : "newest first";
  const hasQueryFilters = activeType !== "all" || activeSort !== "latest" || Boolean(searchQuery.trim());
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai").replace(/\/$/, "");
  const canonicalUrl = `${siteUrl}${canonicalPath}`;
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Colaberry AI podcast catalog",
    itemListOrder: activeSort === "trending" ? "https://schema.org/ItemListOrderDescending" : "https://schema.org/ItemListOrderAscending",
    numberOfItems: episodes.length,
    itemListElement: episodes.map((episode, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteUrl}/resources/podcasts/${episode.slug}`,
      name: episode.title,
      datePublished: episode.publishedDate || undefined,
    })),
  };

  return (
    <Layout>
      <Head>
        <title>Podcasts | Colaberry AI</title>
        <meta
          name="description"
          content="Explore the Colaberry AI podcast library with chronological episodes, trending signals, inline playback, and detailed episode pages."
        />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content="Podcasts | Colaberry AI" />
        <meta
          property="og:description"
          content="Enterprise AI podcast catalog with latest episodes, trending signals, and transcript-ready detail pages."
        />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      </Head>

      {fetchError ? (
        <div className="section-spacing">
          <StatePanel
            variant="error"
            title="Podcast data is temporarily unavailable"
            description="Showing available catalog data while we reconnect to the CMS."
          />
        </div>
      ) : null}

      <EnterprisePageHero
        kicker="Resources"
        title="Podcast library"
        description="Structured podcast destination with latest episodes, trending signals, inline listening, and transcript-ready detail pages."
        image={PODCAST_BRAND_IMAGE}
        alt="Colaberry AI podcast artwork with QR code"
        imageKicker="Audio signal"
        imageTitle="Enterprise AI conversations"
        imageDescription="Listen directly on this page or open full episode narratives and transcripts."
        chips={[
          "Inline player",
          "Transcript-ready detail pages",
          activeSort === "trending" ? "Trending order" : "Latest order",
          activeType === "all" ? "All sources" : activeType === "internal" ? "Colaberry only" : "External only",
        ]}
        primaryAction={{ label: "Browse companies", href: "#company-search" }}
        secondaryAction={{ label: "Back to resources", href: "/resources", variant: "secondary" }}
        metrics={[
          {
            label: "Total episodes",
            value: String(internalCount + externalCount),
            note: "Full chronological archive.",
          },
          {
            label: "Colaberry episodes",
            value: String(internalCount),
            note: "Internal production catalog.",
          },
          {
            label: "External episodes",
            value: String(externalCount),
            note: "Curated third-party sources.",
          },
        ]}
      />

      <section className="surface-panel section-shell section-spacing p-6">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <SectionHeader
              kicker="Substack signal"
              title="Colaberry AI podcast cover artwork"
              description="Using the same Substack visual identity in the catalog improves brand continuity and recognition."
              size="md"
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href="/resources/podcasts" className="btn btn-primary btn-sm">
                Open podcast catalog
              </Link>
            </div>
          </div>
          <div className="section-card rounded-2xl p-3">
            <PodcastArtwork
              src={PODCAST_BRAND_IMAGE}
              alt="Colaberry AI podcast artwork with QR code"
              className="h-56 w-full rounded-xl object-cover"
            />
          </div>
        </div>
      </section>

      <section className="surface-panel section-shell section-spacing p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            kicker="Distribution"
            title="Latest and trending podcast signals"
            description="Fresh episodes and high-engagement conversations surfaced for fast discovery."
            size="md"
          />
          <Link href="/resources/podcasts" className="btn btn-secondary btn-sm mt-3 sm:mt-0">
            Full podcast catalog
          </Link>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <SignalRail title="Latest" description="Most recently published episodes." episodes={featuredLatest} />
          <SignalRail title="Trending" description="Episodes with stronger engagement signals." episodes={featuredTrending} />
        </div>
      </section>

      <section className="surface-panel section-shell section-spacing p-6">
        <SectionHeader
          kicker="Catalog controls"
          title="Search, filter, and sort"
          description="Filter by source type, query by title/tags/company, and switch between latest and trending order."
          size="md"
        />
        <form action="/resources/podcasts" method="get" className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
            Search
            <input
              type="search"
              name="q"
              defaultValue={searchQuery}
              placeholder="Episode title, tag, or company"
              className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
            Type
            <select
              name="type"
              defaultValue={activeType}
              className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
            >
              <option value="all">All sources</option>
              <option value="internal">Colaberry only</option>
              <option value="external">External only</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
            Sort
            <select
              name="sort"
              defaultValue={activeSort}
              className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
            >
              <option value="latest">Latest</option>
              <option value="trending">Trending</option>
            </select>
          </label>
          <div className="flex items-center gap-2">
            <button type="submit" className="btn btn-primary h-10 px-4 text-sm">
              Apply
            </button>
            {hasQueryFilters ? (
              <Link href="/resources/podcasts" className="btn btn-secondary h-10 px-4 text-sm">
                Reset
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      <section className="surface-panel section-shell section-spacing p-6">
        <SectionHeader
          kicker="Company tags"
          title="Browse episodes by company"
          description="Filter by tagged companies and jump to dedicated company podcast views."
          size="md"
        />
        <div className="mt-4 max-w-xl">
          <label htmlFor="company-search" className="sr-only">
            Search company tags
          </label>
          <div className="relative group">
            <input
              id="company-search"
              name="company-search"
              type="search"
              placeholder="Search company tags..."
              value={companyQuery}
              onChange={(event) => setCompanyQuery(event.target.value)}
              className="w-full rounded-full border border-slate-200/80 bg-white px-4 py-2 pr-11 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:placeholder:text-slate-500"
            />
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-teal opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
              fill="none"
            >
              <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" />
              <path d="M16.25 16.25 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {filteredCompanies.map((company) => (
            <Link
              key={company.slug}
              href={`/resources/podcasts/company?slug=${encodeURIComponent(company.slug)}`}
              className="chip chip-brand rounded-full border border-brand-blue/20 bg-white/85 px-3 py-1 text-xs font-semibold text-brand-deep hover:text-brand-blue"
            >
              {company.name} <span className="text-slate-400">({company.count})</span>
            </Link>
          ))}
          {filteredCompanies.length === 0 ? (
            <span className="text-xs text-slate-500">No companies match that search.</span>
          ) : null}
        </div>
      </section>

      <section className="surface-panel section-shell section-spacing p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">All podcast episodes</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Showing {showingFrom}–{showingTo} of {totalEpisodes} episodes ({sortLabel}).
            </p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Page {currentPage} of {Math.max(totalPages, 1)}
          </p>
        </div>

        {episodes.length === 0 ? (
          <div className="mt-4">
            <StatePanel
              variant="empty"
              title="No podcast episodes match this filter"
              description="Try broader search terms or reset filters to see the full podcast archive."
            />
          </div>
        ) : (
          <ul className="mt-5 grid gap-4">
            {episodes.map((episode) => {
              const hasInlinePlayer = Boolean(episode.audioUrl || episode.buzzsproutEmbedCode);
              const isActive = activeEpisodeSlug === episode.slug;
              const publishedLabel = formatDate(episode.publishedDate);
              const episodeType = (episode.podcastType || "internal").toLowerCase();
              const isExternal = episodeType === "external";
              const cardArtwork = isExternal
                ? episode.coverImageUrl || PODCAST_BRAND_IMAGE
                : PODCAST_BRAND_IMAGE;
              const inlineEmbedCode = episode.useNativePlayer && episode.audioUrl ? null : episode.buzzsproutEmbedCode;

              return (
                <li key={episode.id} className="surface-panel section-shell p-4">
                  <div className="flex flex-col gap-4 md:grid md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
                    <div className="section-card overflow-hidden rounded-2xl">
                      <PodcastArtwork
                        src={cardArtwork}
                        alt={episode.coverImageAlt || episode.title}
                        className="h-44 w-full object-cover md:h-full"
                      />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{episode.title}</h3>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                            {publishedLabel || "Date pending"}
                            {episode.duration ? ` • ${episode.duration}` : ""}
                            {episode.episodeNumber ? ` • Episode ${episode.episodeNumber}` : ""}
                          </p>
                        </div>
                        <span className={`chip rounded-full px-2.5 py-1 text-xs font-semibold ${isExternal ? "chip-muted" : "chip-brand"}`}>
                          {isExternal ? "External" : "Colaberry"}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-300">
                        <span className="chip chip-muted rounded-full px-2 py-0.5">Plays {formatCompactNumber(episode.playCount)}</span>
                        <span className="chip chip-muted rounded-full px-2 py-0.5">Views {formatCompactNumber(episode.viewCount)}</span>
                        <span className="chip chip-muted rounded-full px-2 py-0.5">Shares {formatCompactNumber(episode.shareCount)}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {(episode.tags || []).map((tag) => (
                          <Link
                            key={tag.slug}
                            href={`/resources/podcasts/tag/${tag.slug}`}
                            className="chip chip-muted rounded-full px-2.5 py-1 text-xs font-semibold"
                          >
                            #{tag.name}
                          </Link>
                        ))}
                        {(episode.companies || []).map((company) => (
                          <Link
                            key={company.slug}
                            href={`/resources/podcasts/company?slug=${encodeURIComponent(company.slug)}`}
                            className="chip chip-brand rounded-full px-2.5 py-1 text-xs font-semibold"
                          >
                            {company.name}
                          </Link>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={!hasInlinePlayer}
                          onClick={() => {
                            if (!hasInlinePlayer) return;
                            const nextActive = isActive ? null : episode.slug;
                            setActiveEpisodeSlug(nextActive);
                            if (nextActive) {
                              logPodcastEvent("play", "list-inline", { slug: episode.slug, title: episode.title });
                            }
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          {isActive ? "Hide player" : hasInlinePlayer ? "Play" : "Player unavailable"}
                        </button>
                        <Link
                          href={`/resources/podcasts/${episode.slug}`}
                          onClick={() =>
                            logPodcastEvent("click", "list-detail", { slug: episode.slug, title: episode.title })
                          }
                          className="btn btn-primary btn-sm"
                        >
                          View Podcast
                        </Link>
                      </div>

                      {isActive ? (
                        <div className="section-card mt-4 rounded-2xl p-3">
                          <PodcastPlayer
                            embedCode={inlineEmbedCode}
                            audioUrl={episode.audioUrl}
                            defer={false}
                            onPlay={() =>
                              logPodcastEvent("play", "list-inline", { slug: episode.slug, title: episode.title })
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 ? (
          <nav className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="Podcast pagination">
            <PageLink
              page={Math.max(currentPage - 1, 1)}
              queryState={queryState}
              disabled={currentPage <= 1}
              label="Previous"
            />
            {visiblePages.map((page, index) =>
              page === "ellipsis" ? (
                <span key={`ellipsis-${index}`} className="px-2 text-sm text-slate-400" aria-hidden="true">
                  …
                </span>
              ) : (
                <PageLink key={page} page={page} queryState={queryState} active={page === currentPage} />
              )
            )}
            <PageLink
              page={Math.min(currentPage + 1, totalPages)}
              queryState={queryState}
              disabled={currentPage >= totalPages}
              label="Next"
            />
          </nav>
        ) : null}
      </section>
    </Layout>
  );
}

function SignalRail({
  title,
  description,
  episodes,
}: {
  title: string;
  description: string;
  episodes: PodcastEpisode[];
}) {
  return (
    <article className="section-card rounded-2xl p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">{title}</div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
      {episodes.length > 0 ? (
        <ul className="mt-4 grid gap-2">
          {episodes.map((episode) => (
            <li key={episode.slug}>
              <Link
                href={`/resources/podcasts/${episode.slug}`}
                className="focus-ring section-card flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 transition hover:text-brand-deep dark:text-slate-100"
              >
                <span className="line-clamp-1 pr-3">{episode.title}</span>
                <span className="text-xs text-slate-400">→</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-500">No episodes yet.</p>
      )}
    </article>
  );
}

function PodcastArtwork({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [imageSrc, setImageSrc] = useState(src);

  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={1400}
      height={900}
      className={className || "h-full w-full object-cover"}
      unoptimized
      onError={() => {
        if (imageSrc !== PODCAST_FALLBACK_IMAGE) {
          setImageSrc(PODCAST_FALLBACK_IMAGE);
        }
      }}
    />
  );
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatCompactNumber(value?: number | null) {
  const num = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(num);
}

function buildVisiblePages(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push("ellipsis");
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }
  if (end < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);

  return pages;
}

function parseSort(value: string): PodcastSortBy {
  return value === "trending" ? "trending" : "latest";
}

function parseTypeFilter(value: string): PodcastTypeFilter {
  if (value === "internal" || value === "external") return value;
  return "all";
}

function normalizeSearchQuery(value: string) {
  return value.trim().slice(0, 100);
}

function matchesEpisodeSearch(episode: PodcastEpisode, query: string) {
  if (!query) return true;
  const text = query.toLowerCase();
  if (episode.title.toLowerCase().includes(text)) return true;
  if ((episode.tags || []).some((tag) => `${tag.name} ${tag.slug}`.toLowerCase().includes(text))) return true;
  if ((episode.companies || []).some((company) => `${company.name} ${company.slug}`.toLowerCase().includes(text))) return true;
  return false;
}

function buildPageHref(page: number, queryState: PodcastQueryState) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (queryState.sort !== "latest") params.set("sort", queryState.sort);
  if (queryState.type !== "all") params.set("type", queryState.type);
  if (queryState.q) params.set("q", queryState.q);
  const queryString = params.toString();
  return queryString ? `/resources/podcasts?${queryString}` : "/resources/podcasts";
}

function PageLink({
  page,
  queryState,
  active = false,
  disabled = false,
  label,
}: {
  page: number;
  queryState: PodcastQueryState;
  active?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const text = label || String(page);
  if (disabled) {
    return (
      <span
        className="chip chip-muted inline-flex min-w-10 items-center justify-center rounded-full px-3 py-1.5 text-sm font-semibold text-slate-400"
        aria-disabled="true"
      >
        {text}
      </span>
    );
  }

  return (
    <Link
      href={buildPageHref(page, queryState)}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-w-10 items-center justify-center rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
        active
          ? "border-brand-blue/40 bg-brand-blue/10 text-brand-deep"
          : "chip chip-muted text-slate-700 hover:text-brand-deep"
      }`}
    >
      {text}
    </Link>
  );
}

export const getServerSideProps: GetServerSideProps<PodcastsPageProps> = async ({ query }) => {
  const rawPage = Array.isArray(query.page) ? query.page[0] : query.page;
  const parsedPage = Number.parseInt(String(rawPage || "1"), 10);
  const requestedPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const rawSort = Array.isArray(query.sort) ? query.sort[0] : query.sort;
  const rawType = Array.isArray(query.type) ? query.type[0] : query.type;
  const rawSearch = Array.isArray(query.q) ? query.q[0] : query.q;

  const activeSort = parseSort(String(rawSort || "latest").toLowerCase());
  const activeType = parseTypeFilter(String(rawType || "all").toLowerCase());
  const searchQuery = normalizeSearchQuery(String(rawSearch || ""));

  const queryState: PodcastQueryState = {
    sort: activeSort,
    type: activeType,
    q: searchQuery,
  };

  const canonicalPath = buildPageHref(requestedPage, queryState);

  try {
    const allEpisodes = await fetchPodcastEpisodes();
    const now = Date.now();
    const trendingSorted = [...allEpisodes].sort((a, b) => {
      const scoreDiff = getPodcastTrendingScore(b, now) - getPodcastTrendingScore(a, now);
      if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
      const bDate = Date.parse(b.publishedDate || b.updatedAt || "") || 0;
      const aDate = Date.parse(a.publishedDate || a.updatedAt || "") || 0;
      return bDate - aDate;
    });

    const internalCount = allEpisodes.filter(
      (episode) => (episode.podcastType || "internal").toLowerCase() === "internal"
    ).length;
    const externalCount = allEpisodes.length - internalCount;

    const companyMap = new Map<string, PodcastCompanyFacet>();
    allEpisodes.forEach((episode) => {
      (episode.companies || []).forEach((company) => {
        if (!company.slug) return;
        const existing = companyMap.get(company.slug);
        if (existing) {
          existing.count += 1;
          return;
        }
        companyMap.set(company.slug, {
          slug: company.slug,
          name: company.name || company.slug,
          count: 1,
        });
      });
    });

    const sourceFiltered = allEpisodes.filter((episode) => {
      if (activeType === "all") return true;
      const episodeType = (episode.podcastType || "internal").toLowerCase();
      return episodeType === activeType;
    });

    const searchedEpisodes = sourceFiltered.filter((episode) => matchesEpisodeSearch(episode, searchQuery));
    const orderedEpisodes =
      activeSort === "trending"
        ? [...searchedEpisodes].sort((a, b) => {
            const scoreDiff = getPodcastTrendingScore(b, now) - getPodcastTrendingScore(a, now);
            if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
            const bDate = Date.parse(b.publishedDate || b.updatedAt || "") || 0;
            const aDate = Date.parse(a.publishedDate || a.updatedAt || "") || 0;
            return bDate - aDate;
          })
        : searchedEpisodes;

    const totalEpisodes = orderedEpisodes.length;
    const totalPages = Math.max(1, Math.ceil(totalEpisodes / PAGE_SIZE));
    const currentPage = Math.min(requestedPage, totalPages);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const episodes = orderedEpisodes.slice(startIndex, startIndex + PAGE_SIZE);

    const companies = Array.from(companyMap.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });

    return {
      props: {
        episodes,
        companies,
        featuredLatest: allEpisodes.slice(0, 4),
        featuredTrending: trendingSorted.slice(0, 4),
        fetchError: false,
        totalEpisodes,
        totalPages,
        currentPage,
        internalCount,
        externalCount,
        activeSort,
        activeType,
        searchQuery,
        canonicalPath: buildPageHref(currentPage, queryState),
      },
    };
  } catch {
    return {
      props: {
        episodes: [],
        companies: [],
        featuredLatest: [],
        featuredTrending: [],
        fetchError: true,
        totalEpisodes: 0,
        totalPages: 1,
        currentPage: 1,
        internalCount: 0,
        externalCount: 0,
        activeSort,
        activeType,
        searchQuery,
        canonicalPath,
      },
    };
  }
};
