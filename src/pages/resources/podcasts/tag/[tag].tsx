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
      <h1 className="text-2xl font-semibold">#{tag} Podcasts</h1>

      <ul className="mt-6 grid gap-4">
        {episodes.map((e: any) => (
          <li key={e.id} className="border p-4 rounded">
            <div className="font-semibold">{e.title}</div>
            <Link
              href={`/resources/podcasts/${e.slug}`}
              className="text-sm text-brand-blue"
            >
              View →
            </Link>
          </li>
        ))}
      </ul>
    </Layout>
  );
}
