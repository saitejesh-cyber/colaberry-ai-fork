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
      <h1 className="text-3xl font-semibold">Podcasts</h1>
      <p className="text-slate-600">
        Internal podcasts + curated external aggregation
      </p>

      <div className="mt-6 grid lg:grid-cols-2 gap-6">
        {/* INTERNAL */}
        <section>
          <h3 className="font-semibold mb-3">Internal podcasts</h3>

          {episodes.length === 0 && (
            <p className="text-sm text-slate-500">No podcasts yet</p>
          )}

          <ul className="space-y-4">
            {episodes.map((ep) => (
              <li key={ep.id} className="border rounded p-4">
                <h4 className="font-semibold">{ep.title}</h4>
                <p className="text-xs text-slate-500">
                  {ep.publishedDate}
                </p>

                    {/* TAGS */}
                    <div className="mt-2 flex flex-wrap gap-2">
                        {ep.tags.map((tag: any) => (
                            <Link
                                key={tag.slug}
                                href={`/resources/podcasts/tag/${tag.slug}`}
                                className="text-xs bg-slate-100 px-2 py-1 rounded"
                            >
                                #{tag.name}
                            </Link>
                        ))}
                    </div>

                <Link
                  href={`/resources/podcasts/${ep.slug}`}
                  className="text-sm text-brand-blue mt-2 inline-block"
                >
                  View episode →
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* EXTERNAL */}
        <section>
          <h3 className="font-semibold mb-3">External aggregation</h3>
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
