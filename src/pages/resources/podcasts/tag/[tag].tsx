import Layout from "../../../../components/Layout";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import SectionHeader from "../../../../components/SectionHeader";
import StatePanel from "../../../../components/StatePanel";
import type { Company, Tag } from "../../../../lib/cms";

type TaggedEpisode = {
  id: number;
  title: string;
  slug: string;
  tags: Tag[];
  companies: Company[];
};

type PodcastTagPageProps = {
  tag: string;
  episodes: TaggedEpisode[];
  fetchError: boolean;
};

type RouteParams = {
  tag?: string;
};

export const getServerSideProps: GetServerSideProps<PodcastTagPageProps, RouteParams> = async ({
  params,
}) => {
  const tag = params?.tag ?? "";
  if (!tag) {
    return { notFound: true };
  }
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_CMS_URL}/api/podcast-episodes` +
        `?filters[tags][slug][$eq]=${tag}` +
        `&filters[podcastStatus][$eq]=published` +
        `&publicationState=live` +
        `&populate[tags][fields][0]=name` +
        `&populate[tags][fields][1]=slug` +
        `&populate[companies][fields][0]=name` +
        `&populate[companies][fields][1]=slug`,
      { cache: "no-store" }
    );

    const json = await res.json();
    const rawData = Array.isArray(json?.data) ? json.data : [];
    const episodes: TaggedEpisode[] =
      rawData.map((item: { id?: number; attributes?: Record<string, unknown> }) => {
        const attrs = (item.attributes ?? item) as {
          title?: string;
          slug?: string;
          tags?: { data?: Tag[] } | Tag[];
          companies?: { data?: Company[] } | Company[];
        };
        return {
          id: item.id ?? 0,
          title: attrs.title ?? "Podcast episode",
          slug: attrs.slug ?? "",
          tags: Array.isArray(attrs.tags)
            ? attrs.tags
            : Array.isArray(attrs.tags?.data)
            ? attrs.tags.data
            : [],
          companies: Array.isArray(attrs.companies)
            ? attrs.companies
            : Array.isArray(attrs.companies?.data)
            ? attrs.companies.data
            : [],
        };
      }) || [];

    return {
      props: {
        tag,
        episodes,
        fetchError: false,
      },
    };
  } catch {
    return {
      props: {
        tag,
        episodes: [],
        fetchError: true,
      },
    };
  }
};

export default function PodcastTagPage({
  tag,
  episodes,
  fetchError,
}: PodcastTagPageProps) {
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
        {episodes.map((e) => (
          <li key={e.id} className="surface-panel border border-slate-200/80 bg-white/90 p-4">
            <div className="text-sm font-semibold text-slate-900">{e.title}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {e.companies?.map((company) => (
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
