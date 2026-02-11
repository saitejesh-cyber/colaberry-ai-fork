import Layout from "../../../../components/Layout";
import Link from "next/link";
import SectionHeader from "../../../../components/SectionHeader";
import StatePanel from "../../../../components/StatePanel";
import { PodcastEpisode } from "../../../../lib/cms";

export async function getServerSideProps({ params }: any) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_CMS_URL}/api/podcast-episodes` +
        `?filters[tags][slug][$eq]=${params.tag}` +
        `&filters[podcastStatus][$eq]=published` +
        `&publicationState=live` +
        `&populate[tags][fields][0]=name` +
        `&populate[tags][fields][1]=slug` +
        `&populate[companies][fields][0]=name` +
        `&populate[companies][fields][1]=slug`,
      { cache: "no-store" }
    );

    const json = await res.json();
    const episodes =
      json?.data?.map((item: any) => {
        const attrs = item.attributes ?? item;
        return {
          id: item.id,
          title: attrs.title,
          slug: attrs.slug,
          tags: attrs.tags?.data ?? attrs.tags ?? [],
          companies: attrs.companies?.data ?? attrs.companies ?? [],
        };
      }) || [];

    return {
      props: {
        tag: params.tag,
        episodes,
        fetchError: false,
      },
    };
  } catch {
    return {
      props: {
        tag: params.tag,
        episodes: [],
        fetchError: true,
      },
    };
  }
}

export default function PodcastTagPage({
  tag,
  episodes,
  fetchError,
}: {
  tag: string;
  episodes: PodcastEpisode[];
  fetchError: boolean;
}) {
  return (
    <Layout>
      {fetchError && (
        <div className="mb-6">
          <StatePanel
            variant="error"
            title="Podcast data is temporarily unavailable"
            description="Try again in a moment while we reconnect to the CMS."
          />
        </div>
      )}
      <div className="flex flex-col gap-3">
        <SectionHeader
          as="h1"
          size="xl"
          kicker="Resources"
          title={`#${tag} Podcasts`}
          description={`Episodes tagged with #${tag}.`}
        />
      </div>

      <ul className="mt-6 grid gap-4">
        {episodes.map((e: any) => (
          <li key={e.id} className="surface-panel border-t-4 border-brand-blue/20 p-4">
            <div className="text-sm font-semibold text-slate-900">{e.title}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {e.companies?.map((company: any) => (
                <Link
                  key={company.slug ?? company.id}
                  href={`/podcast/${company.slug}`}
                  className="chip chip-brand rounded-full border border-brand-blue/20 bg-white/90 px-2.5 py-1 text-xs font-semibold text-brand-deep hover:text-brand-blue"
                >
                  {company.name ?? company.attributes?.name}
                </Link>
              ))}
            </div>
            <Link
              href={`/resources/podcasts/${e.slug}`}
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-deep hover:text-brand-blue"
              aria-label={`View episode ${e.title}`}
            >
              View <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
        {episodes.length === 0 && (
          <li>
            <StatePanel
              variant="empty"
              title={`No episodes tagged with #${tag}`}
              description="Check back after new episodes are published."
            />
          </li>
        )}
      </ul>
    </Layout>
  );
}
