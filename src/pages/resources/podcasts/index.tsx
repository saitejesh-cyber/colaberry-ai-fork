// src/pages/resources/podcasts/index.tsx
import Layout from "../../../components/Layout";
import Link from "next/link";
import Head from "next/head";
import { GetServerSideProps } from "next";
import { useMemo, useState } from "react";
import SectionHeader from "../../../components/SectionHeader";
import BuzzsproutPlayer from "../../../components/BuzzsproutPlayer";
import MediaPanel from "../../../components/MediaPanel";
import { fetchPodcastEpisodes, PodcastEpisode } from "../../../lib/cms";

export default function Podcasts({ episodes }: { episodes: PodcastEpisode[] }) {
  const internalEpisodes = useMemo(
    () => episodes.filter((episode) => (episode.podcastType || "internal") === "internal"),
    [episodes]
  );
  const externalEpisodes = useMemo(
    () => episodes.filter((episode) => (episode.podcastType || "internal") === "external"),
    [episodes]
  );
  const [companyQuery, setCompanyQuery] = useState("");
  const companies = useMemo(() => {
    const map = new Map<string, { slug: string; name: string }>();
    episodes.forEach((episode) => {
      episode.companies?.forEach((company: any) => {
        const slug = company.slug || company.attributes?.slug;
        const name = company.name || company.attributes?.name || slug;
        if (slug && !map.has(slug)) {
          map.set(slug, { slug, name });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [episodes]);
  const filteredCompanies = useMemo(() => {
    const query = companyQuery.trim().toLowerCase();
    if (!query) {
      return companies;
    }
    return companies.filter((company) => company.name.toLowerCase().includes(query));
  }, [companies, companyQuery]);

  return (
    <Layout>
      <Head>
        <title>Podcasts | Colaberry AI</title>
      </Head>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <SectionHeader
            as="h1"
            size="xl"
            kicker="Resources"
            title="Podcasts"
            description="Colaberry AI Podcast + curated external ai podcast."
          />
        </div>
        <MediaPanel
          kicker="Audio library"
          title="Signal-rich conversations"
          description="Episodes and curated conversations across AI adoption."
          image="/media/visuals/panel-podcast.svg"
          alt="Podcast waveform illustration"
          aspect="wide"
          fit="contain"
        />
      </div>

      <section className="surface-panel mt-6 p-6">
        <SectionHeader
          kicker="Company tags"
          title="Browse by company"
          description="Jump directly to podcasts by company."
          size="md"
        />
        <div className="mt-4 max-w-xl">
          <label htmlFor="company-search" className="sr-only">
            Search your company
          </label>
          <div className="relative group">
            <input
              id="company-search"
              name="company-search"
              type="search"
              placeholder="Search your company..."
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
        <div className="mt-4 flex flex-wrap gap-2">
          {filteredCompanies.map((company) => (
            <Link
              key={company.slug}
              href={`/podcast/${company.slug}`}
              className="chip chip-brand rounded-full border border-brand-blue/20 bg-white/80 px-3 py-1 text-xs font-semibold text-brand-deep hover:text-brand-blue"
            >
              {company.name}
            </Link>
          ))}
          {filteredCompanies.length === 0 && (
            <span className="text-xs text-slate-500">No companies match that search.</span>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* INTERNAL */}
        <section className="surface-panel border-t-4 border-brand-blue/20 p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-slate-900">Colaberry AI Podcast</h3>
            <span className="chip chip-muted rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {internalEpisodes.length} episodes
            </span>
          </div>

          {internalEpisodes.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">No podcasts yet.</p>
          )}

          <ul className="mt-4 grid gap-4">
            {internalEpisodes.map((ep) => (
              <li
                key={ep.id}
                className="surface-panel border-t-4 border-brand-blue/20 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{ep.title}</h4>
                    {ep.publishedDate && (
                      <p className="mt-1 text-xs text-slate-500">{ep.publishedDate}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    {ep.episodeNumber ? `#${ep.episodeNumber}` : "Podcast"}
                  </span>
                </div>

                {/* TAGS */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {ep.tags.map((tag: any) => (
                    <Link
                      key={tag.slug}
                      href={`/resources/podcasts/tag/${tag.slug}`}
                      className="chip rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-brand-deep"
                    >
                      #{tag.name}
                    </Link>
                  ))}
                  {ep.companies.map((company) => (
                    <Link
                      key={company.slug}
                      href={`/podcast/${company.slug}`}
                      className="chip chip-brand rounded-full border border-brand-blue/20 bg-white/90 px-2.5 py-1 text-xs font-semibold text-brand-deep hover:text-brand-blue"
                    >
                      {company.name}
                    </Link>
                  ))}
                </div>

                <Link
                  href={`/resources/podcasts/${ep.slug}`}
                  onClick={() =>
                    logPodcastEvent("click", "list-internal", { slug: ep.slug, title: ep.title })
                  }
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-deep hover:text-brand-blue"
                  aria-label={`View episode ${ep.title}`}
                >
                  View episode <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* EXTERNAL */}
        <section className="surface-panel border-t-4 border-brand-blue/20 p-6">
          <h3 className="text-base font-semibold text-slate-900">AI Podcast</h3>
          <p className="mt-1 text-sm text-slate-600">
            Surface trusted public sources with a consistent listening experience.
          </p>
          {externalEpisodes.length > 0 && (
            <ul className="mt-4 grid gap-4">
              {externalEpisodes.map((ep) => (
                <li key={ep.id} className="rounded-2xl border border-slate-200/80 bg-white/90 p-4">
                  <div className="text-sm font-semibold text-slate-900">{ep.title}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ep.tags.map((tag: any) => (
                      <Link
                        key={tag.slug}
                        href={`/resources/podcasts/tag/${tag.slug}`}
                        className="chip rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-brand-deep"
                      >
                        #{tag.name}
                      </Link>
                    ))}
                  </div>
                  <Link
                    href={`/resources/podcasts/${ep.slug}`}
                    onClick={() =>
                      logPodcastEvent("click", "list-external", { slug: ep.slug, title: ep.title })
                    }
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-deep hover:text-brand-blue"
                    aria-label={`View episode ${ep.title}`}
                  >
                    View episode <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <BuzzsproutPlayer />
        </section>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const episodes = await fetchPodcastEpisodes();
  return { props: { episodes } };
};

async function logPodcastEvent(
  eventType: "view" | "play" | "share" | "subscribe" | "click",
  platform?: string,
  episode?: { slug?: string; title?: string }
) {
  try {
    await fetch("/api/podcast-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        platform,
        episodeSlug: episode?.slug,
        episodeTitle: episode?.title,
      }),
    });
  } catch {
    // logging is best-effort only
  }
}
