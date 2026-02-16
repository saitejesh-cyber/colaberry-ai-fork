import Layout from "../../../components/Layout";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import SectionHeader from "../../../components/SectionHeader";
import StatePanel from "../../../components/StatePanel";
import type { Company, Tag } from "../../../lib/cms";

type CompanyEpisode = {
  id: number;
  title: string;
  slug: string;
  tags: Tag[];
  companies: Company[];
};

type PodcastCompanyPageProps = {
  companySlug: string;
  companyName: string;
  episodes: CompanyEpisode[];
  fetchError: boolean;
};

export const getServerSideProps: GetServerSideProps<PodcastCompanyPageProps> = async ({
  query,
}) => {
  const slug = typeof query?.slug === "string" ? query.slug : "";

  if (!slug) {
    return { notFound: true };
  }

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_CMS_URL}/api/podcast-episodes` +
        `?filters[companies][slug][$eq]=${slug}` +
        `&filters[podcastStatus][$eq]=published` +
        `&publicationState=live` +
        `&populate[companies][fields][0]=name` +
        `&populate[companies][fields][1]=slug` +
        `&populate[tags][fields][0]=name` +
        `&populate[tags][fields][1]=slug`,
      { cache: "no-store" }
    );

    const json = await res.json();
    const rawData = Array.isArray(json?.data) ? json.data : [];
    const episodes: CompanyEpisode[] =
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

    const companyName =
      episodes?.[0]?.companies?.[0]?.name ??
      slug;

    return {
      props: {
        companySlug: slug,
        companyName,
        episodes,
        fetchError: false,
      },
    };
  } catch {
    return {
      props: {
        companySlug: slug,
        companyName: slug,
        episodes: [],
        fetchError: true,
      },
    };
  }
};

export default function PodcastCompanyPage({
  companyName,
  episodes,
  fetchError,
}: PodcastCompanyPageProps) {
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
          kicker="Company"
          title={`${companyName} podcasts`}
          description={`Episodes connected to ${companyName}.`}
        />
      </div>

      <ul className="mt-6 grid gap-4">
        {episodes.map((episode) => (
          <li key={episode.id} className="surface-panel border border-slate-200/80 bg-white/90 p-4">
            <div className="text-sm font-semibold text-slate-900">{episode.title}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {episode.tags?.map((tag) => (
                <Link
                  key={tag.slug}
                  href={`/resources/podcasts/tag/${tag.slug}`}
                  className="chip rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-brand-deep"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
            <Link
              href={`/resources/podcasts/${episode.slug}`}
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-deep hover:text-brand-blue"
              aria-label={`View episode ${episode.title}`}
            >
              View <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
        {episodes.length === 0 && (
          <li>
            <StatePanel
              variant="empty"
              title={`No episodes tagged for ${companyName}`}
              description="Check back after new episodes are published."
            />
          </li>
        )}
      </ul>
    </Layout>
  );
}
