// src/pages/resources/podcasts/[slug].tsx
import Layout from "../../../components/Layout";
import Link from "next/link";
import RichText from "../../../components/RichText";
import SectionHeader from "../../../components/SectionHeader";

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
    description: item.description,
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
      <div className="flex flex-col gap-3">
        <SectionHeader as="h1" size="xl" kicker="Resources" title={episode.title}>
          <p className="text-sm text-slate-500">{episode.publishedDate}</p>
        </SectionHeader>
      </div>

      <div className="surface-panel mt-6 border-t-4 border-brand-blue/20 p-6">
        {/* DESCRIPTION */}
        <div className="prose max-w-none">
          <RichText blocks={episode.description} />
        </div>

        {/* TAGS */}
        <div className="mt-4 flex flex-wrap gap-2">
          {episode.tags.map((tag: any) => (
            <Link
              key={tag.slug}
              href={`/resources/podcasts/tag/${tag.slug}`}
              className="rounded-full border border-slate-200/80 bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-brand-deep"
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
      </div>
    </Layout>
  );
}
