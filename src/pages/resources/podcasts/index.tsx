import Layout from "../../../components/Layout";
import Link from "next/link";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import { useMemo, useState } from "react";
import SectionHeader from "../../../components/SectionHeader";
import PodcastPlayer from "../../../components/PodcastPlayer";
import MediaPanel from "../../../components/MediaPanel";
import StatePanel from "../../../components/StatePanel";
import { fetchPodcastEpisodes, PodcastEpisode } from "../../../lib/cms";
import { heroImage } from "../../../lib/media";
import { logPodcastEvent } from "../../../lib/podcastTelemetry";

const PAGE_SIZE = 24;

type PodcastCompanyFacet = {
  slug: string;
  name: string;
  count: number;
};

type PodcastsPageProps = {
  episodes: PodcastEpisode[];
  companies: PodcastCompanyFacet[];
  fetchError: boolean;
  totalEpisodes: number;
  totalPages: number;
  currentPage: number;
  internalCount: number;
  externalCount: number;
};

export default function Podcasts({
  episodes,
  companies,
  fetchError,
  totalEpisodes,
  totalPages,
  currentPage,
  internalCount,
  externalCount,
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

  return (
    <Layout>
      <Head>
        <title>Podcasts | Colaberry AI</title>
        <meta
          name="description"
          content="Explore the Colaberry AI podcast library with chronological episodes, inline playback, and detailed episode pages."
        />
      </Head>

      {fetchError ? (
        <div className="mb-6">
          <StatePanel
            variant="error"
            title="Podcast data is temporarily unavailable"
            description="Showing available catalog data while we reconnect to the CMS."
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <SectionHeader
            as="h1"
            size="xl"
            kicker="Resources"
            title="Podcast library"
            description="Chronological podcast catalog with in-page listening and complete episode detail pages."
          />
        </div>
        <MediaPanel
          kicker="Audio signal"
          title="Enterprise AI conversations"
          description="Listen directly on this page or open full episode narratives and transcripts."
          image={heroImage("hero-podcasts-cinematic.webp")}
          alt="Studio podcast waveform visualization"
          aspect="wide"
          fit="cover"
        />
      </div>

      <section className="surface-panel mt-6 p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="Total episodes" value={String(totalEpisodes)} note="Full chronological archive" />
          <MetricCard label="Colaberry episodes" value={String(internalCount)} note="Internal production" />
          <MetricCard label="External episodes" value={String(externalCount)} note="Curated third-party sources" />
        </div>
      </section>

      <section className="surface-panel mt-6 p-6">
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

      <section className="surface-panel mt-6 border border-slate-200/80 bg-white/90 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">All podcast episodes</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Showing {showingFrom}–{showingTo} of {totalEpisodes} episodes (newest first).
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
              title="No podcast episodes available"
              description="Publish episodes in CMS and they will appear here in chronological order."
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
              const inlineEmbedCode = episode.useNativePlayer && episode.audioUrl ? null : episode.buzzsproutEmbedCode;

              return (
                <li key={episode.id} className="surface-panel border border-slate-200/80 bg-white/90 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{episode.title}</h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                        {publishedLabel || "Date pending"}
                        {episode.duration ? ` • ${episode.duration}` : ""}
                        {episode.episodeNumber ? ` • Episode ${episode.episodeNumber}` : ""}
                      </p>
                    </div>
                    <span
                      className={`chip rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        isExternal
                          ? "border-violet-200/80 bg-violet-50 text-violet-700"
                          : "border-emerald-200/80 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {isExternal ? "External" : "Colaberry"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(episode.tags || []).map((tag) => (
                      <Link
                        key={tag.slug}
                        href={`/resources/podcasts/tag/${tag.slug}`}
                        className="chip rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-brand-deep"
                      >
                        #{tag.name}
                      </Link>
                    ))}
                    {(episode.companies || []).map((company) => (
                      <Link
                        key={company.slug}
                        href={`/resources/podcasts/company?slug=${encodeURIComponent(company.slug)}`}
                        className="chip chip-brand rounded-full border border-brand-blue/20 bg-white/90 px-2.5 py-1 text-xs font-semibold text-brand-deep hover:text-brand-blue"
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
                      {isActive ? "Hide player" : hasInlinePlayer ? "Play on page" : "Player unavailable"}
                    </button>
                    <Link
                      href={`/resources/podcasts/${episode.slug}`}
                      onClick={() =>
                        logPodcastEvent("click", "list-detail", { slug: episode.slug, title: episode.title })
                      }
                      className="btn btn-primary btn-sm"
                    >
                      Open detail page
                    </Link>
                  </div>

                  {isActive ? (
                    <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white/90 p-3">
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
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 ? (
          <nav className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="Podcast pagination">
            <PageLink page={Math.max(currentPage - 1, 1)} disabled={currentPage <= 1} label="Previous" />
            {visiblePages.map((page, index) =>
              page === "ellipsis" ? (
                <span key={`ellipsis-${index}`} className="px-2 text-sm text-slate-400" aria-hidden="true">
                  …
                </span>
              ) : (
                <PageLink key={page} page={page} active={page === currentPage} />
              )
            )}
            <PageLink page={Math.min(currentPage + 1, totalPages)} disabled={currentPage >= totalPages} label="Next" />
          </nav>
        ) : null}
      </section>
    </Layout>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/70">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{note}</p>
    </article>
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

function buildPageHref(page: number) {
  return page <= 1 ? "/resources/podcasts" : `/resources/podcasts?page=${page}`;
}

function PageLink({
  page,
  active = false,
  disabled = false,
  label,
}: {
  page: number;
  active?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const text = label || String(page);
  if (disabled) {
    return (
      <span
        className="inline-flex min-w-10 items-center justify-center rounded-full border border-slate-200/80 px-3 py-1.5 text-sm font-semibold text-slate-400"
        aria-disabled="true"
      >
        {text}
      </span>
    );
  }

  return (
    <Link
      href={buildPageHref(page)}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-w-10 items-center justify-center rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
        active
          ? "border-brand-blue/40 bg-brand-blue/10 text-brand-deep"
          : "border-slate-200/80 bg-white/90 text-slate-700 hover:border-brand-blue/30 hover:text-brand-deep"
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

  try {
    const allEpisodes = await fetchPodcastEpisodes();
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

    const totalEpisodes = allEpisodes.length;
    const totalPages = Math.max(1, Math.ceil(totalEpisodes / PAGE_SIZE));
    const currentPage = Math.min(requestedPage, totalPages);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const episodes = allEpisodes.slice(startIndex, startIndex + PAGE_SIZE);

    const companies = Array.from(companyMap.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });

    return {
      props: {
        episodes,
        companies,
        fetchError: false,
        totalEpisodes,
        totalPages,
        currentPage,
        internalCount,
        externalCount,
      },
    };
  } catch {
    return {
      props: {
        episodes: [],
        companies: [],
        fetchError: true,
        totalEpisodes: 0,
        totalPages: 1,
        currentPage: 1,
        internalCount: 0,
        externalCount: 0,
      },
    };
  }
};
