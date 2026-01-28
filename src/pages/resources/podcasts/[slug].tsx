// src/pages/resources/podcasts/[slug].tsx
import Layout from "../../../components/Layout";
import Link from "next/link";
import RichText from "../../../components/RichText";

export async function getServerSideProps({ params }: any) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_CMS_URL}/api/podcast-episodes` +
      `?filters[slug][$eq]=${params.slug}` +
      `&populate[tags][fields][0]=name` +
      `&populate[tags][fields][1]=slug`,
    { cache: "no-store" }
  );

  const json = await res.json();
  const item = json?.data?.[0];

  if (!item) return { notFound: true };

  const episode = {
    id: item.id,
    title: item.title,
    description: item.description, // blocks
    slug: item.slug,
    publishedDate: item.publishedDate,
    transcript: item.transcript,
    tags: item.tags ?? [],
  };

  return { props: { episode } };
}

export default function PodcastDetail({ episode }: any) {
  return (
    <Layout>
      <h1 className="text-3xl font-semibold">{episode.title}</h1>
      <p className="text-sm text-slate-500">{episode.publishedDate}</p>

      {/* DESCRIPTION */}
      <div className="mt-4 prose max-w-none">
        <RichText blocks={episode.description} />
      </div>

      {/* TAGS */}
      <div className="mt-4 flex gap-2">
        {episode.tags.map((tag: any) => (
          <Link
            key={tag.slug}
            href={`/resources/podcasts/tag/${tag.slug}`}
            className="text-xs bg-slate-100 px-2 py-1 rounded"
          >
            #{tag.name}
          </Link>
        ))}
      </div>

      {/* TRANSCRIPT */}
      {episode.transcript && (
        <article className="prose mt-6 max-w-none">
          <h3>Transcript</h3>
          <div>{episode.transcript}</div>
        </article>
      )}
    </Layout>
  );
}
