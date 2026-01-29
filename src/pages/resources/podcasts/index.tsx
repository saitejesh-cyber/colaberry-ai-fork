// src/pages/resources/podcasts/index.tsx
import Layout from "../../../components/Layout";
import Link from "next/link";
import Head from "next/head";
import { GetServerSideProps } from "next";
import SectionHeader from "../../../components/SectionHeader";
import BuzzsproutPlayer from "../../../components/BuzzsproutPlayer";
import { fetchPodcastEpisodes, PodcastEpisode } from "../../../lib/cms";

export default function Podcasts({ episodes }: { episodes: PodcastEpisode[] }) {
  return (
    <Layout>
      <Head>
        <title>Podcasts | Colaberry AI</title>
      </Head>
      <div className="flex flex-col gap-3">
        <SectionHeader
          as="h1"
          size="xl"
          kicker="Resources"
          title="Podcasts"
          description="Internal podcasts + curated external aggregation."
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* INTERNAL */}
        <section className="surface-panel border-t-4 border-brand-blue/20 p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-slate-900">Internal podcasts</h3>
            <span className="chip chip-muted rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {episodes.length} episodes
            </span>
          </div>

          {episodes.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">No podcasts yet.</p>
          )}

          <ul className="mt-4 grid gap-4">
            {episodes.map((ep) => (
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
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-deep hover:text-brand-blue"
                >
                  View episode →
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* EXTERNAL */}
        <section className="surface-panel border-t-4 border-brand-blue/20 p-6">
          <h3 className="text-base font-semibold text-slate-900">External aggregation</h3>
          <p className="mt-1 text-sm text-slate-600">
            Surface trusted public sources with a consistent listening experience.
          </p>
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
