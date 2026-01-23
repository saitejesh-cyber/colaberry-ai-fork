import Layout from "../../../components/Layout";
import BuzzsproutPlayer from "../../../components/BuzzsproutPlayer";
import Link from "next/link";
import { GetServerSideProps } from "next";

type PodcastEpisode = {
  id: number;
  title: string;
  slug: string;
  publishedDate: string;
  tags?: string[];
};

type Props = {
  episodes: PodcastEpisode[];
};

export default function Podcasts({ episodes }: Props) {
  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Resources
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Podcasts
        </h1>

        <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Space for internal podcast posts and curated external aggregation.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:mt-8 lg:grid-cols-2">
        {/* INTERNAL POSTING */}
        <Panel
          title="Internal posting"
          description="Publish episodes, transcripts, show notes, and takeaways."
        >
          {episodes.length === 0 && (
            <div className="mt-3 text-sm text-slate-500">
              No podcasts published yet.
            </div>
          )}

          <ul className="mt-4 grid gap-4">
            {episodes.map((episode) => (
              <li
                key={episode.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="text-sm font-semibold text-slate-900">
                  {episode.title}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Published on {episode.publishedDate}
                </div>

                {episode.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {episode.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/resources/podcasts/tag/${tag}`}
                        className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                )}

                <Link
                  href={`/resources/podcasts/${episode.slug}`}
                  className="mt-3 inline-block text-xs font-semibold text-brand-blue"
                >
                  View episode →
                </Link>
              </li>
            ))}
          </ul>

        </Panel>

        {/* EXTERNAL AGGREGATION */}
        <Panel
          title="External aggregation"
          description="Curated external podcasts from trusted sources."
        >
          <BuzzsproutPlayer />
        </Panel>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/resources"
          className="inline-flex items-center justify-center rounded-lg border border-brand-blue/25 bg-white px-4 py-2.5 text-sm font-semibold text-brand-ink hover:bg-slate-50"
        >
          Back to Resources
        </Link>

        <Link
          href="/updates"
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          View News & Product
        </Link>
      </div>
    </Layout>
  );
}

/* ---------- SSR ---------- */
export const getServerSideProps: GetServerSideProps = async () => {
  const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL;

  const res = await fetch(
    `${CMS_URL}/api/podcast-episodes?populate=*&sort=publishedDate:desc`
  );

  const json = await res.json();

  const episodes =
    json?.data?.map((item: any) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      publishedDate: item.publishedDate,
      tags: item.tags || [],
    })) || [];

  return { props: { episodes } };
};

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{description}</div>
      {children}
    </div>
  );
}
