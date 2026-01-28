// src/pages/resources/podcasts/index.tsx
import Layout from "../../../components/Layout";
import BuzzsproutPlayer from "../../../components/BuzzsproutPlayer";
import Link from "next/link";
import { GetServerSideProps } from "next";

type Tag = {
  name: string;
  slug: string;
};

type PodcastEpisode = {
  id: number;
  title: string;
  slug: string;
  publishedDate: string;
  tags: Tag[];
};


export default function Podcasts({ episodes }: { episodes: PodcastEpisode[] }) {
  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Resources
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Podcasts
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Internal podcasts + curated external aggregation.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_1.25fr]">
        {/* INTERNAL */}
        <section className="surface-panel p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold text-slate-900">Internal podcasts</h3>
            <span className="rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-600">
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
                className="surface-panel surface-hover p-4"
              >
                <h4 className="text-sm font-semibold text-slate-900">{ep.title}</h4>
                <p className="mt-1 text-xs text-slate-500">{ep.publishedDate}</p>

                {/* TAGS */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {ep.tags.map((tag: any) => (
                    <Link
                      key={tag.slug}
                      href={`/resources/podcasts/tag/${tag.slug}`}
                      className="rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-brand-deep"
                    >
                      #{tag.name}
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
        <section className="surface-panel p-6">
          <h3 className="text-sm font-semibold text-slate-900">External aggregation</h3>
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
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_CMS_URL}/api/podcast-episodes` +
      `?sort=publishedDate:desc` +
      `&populate[tags][fields][0]=name` +
      `&populate[tags][fields][1]=slug`
  );

  const json = await res.json();

  const episodes =
    json?.data?.map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      slug: item.slug,
      publishedDate: item.publishedDate,
      tags: item.tags ?? [],
    })) || [];

  return { props: { episodes } };
};
