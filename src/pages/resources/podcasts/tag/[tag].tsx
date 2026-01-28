import Layout from "../../../../components/Layout";
import { fetchPodcastEpisodes } from "../../../../lib/cms";
import Link from "next/link";

export async function getServerSideProps({ params }: any) {
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_CMS_URL}/api/podcast-episodes` +
        `?populate[tags][fields][0]=name` +
        `&populate[tags][fields][1]=slug`,
        { cache: "no-store" }
    );

    const json = await res.json();

    const episodes =
        json?.data?.map((item: any) => ({
            id: item.id,
            title: item.title,
            slug: item.slug,
            tags: item.tags || [],
        })) || [];

    const filtered = episodes.filter((e: any) =>
        e.tags.some((t: any) => t.slug === params.tag)
    );

    return {
        props: {
            tag: params.tag,
            episodes: filtered,
        },
    };
}

export default function PodcastTagPage({ tag, episodes }: any) {
  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Resources
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          #{tag} Podcasts
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Episodes tagged with #{tag}.
        </p>
      </div>

      <ul className="mt-6 grid gap-4">
        {episodes.map((e: any) => (
          <li key={e.id} className="surface-panel surface-hover p-4">
            <div className="text-sm font-semibold text-slate-900">{e.title}</div>
            <Link
              href={`/resources/podcasts/${e.slug}`}
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-deep hover:text-brand-blue"
            >
              View →
            </Link>
          </li>
        ))}
      </ul>
    </Layout>
  );
}
