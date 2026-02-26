import Layout from "../../../components/Layout";
import Link from "next/link";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import EnterprisePageHero from "../../../components/EnterprisePageHero";
import StatePanel from "../../../components/StatePanel";
import type { Company, Tag } from "../../../lib/cms";
import { heroImage } from "../../../lib/media";

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
  companySlug,
  episodes,
  fetchError,
}: PodcastCompanyPageProps) {
  const uniqueTagCount = new Set(
    episodes.flatMap((episode) => (episode.tags || []).map((tag) => tag.slug).filter(Boolean))
  ).size;

  return (
    <Layout>
      <Head>
        <title>{`${companyName} Podcasts | Colaberry AI`}</title>
        <meta
          name="description"
          content={`Podcast episodes connected to ${companyName}, with tag context and direct episode links.`}
        />
      </Head>
      {fetchError && (
        <div className="section-spacing">
          <StatePanel
            variant="error"
            title="Podcast data is temporarily unavailable"
            description="Try again in a moment while we reconnect to the CMS."
          />
        </div>
      )}
      <EnterprisePageHero
        kicker="Company signal"
        title={`${companyName} podcasts`}
        description={`Episodes connected to ${companyName}, with direct links into podcast detail pages.`}
        image={heroImage("hero-podcasts-cinematic.webp")}
        alt={`${companyName} podcast signal`}
        imageKicker="Company feed"
        imageTitle={`${companyName} episode distribution`}
        imageDescription="Company-tagged episodes surfaced for fast discovery."
        chips={[`Company: ${companyName}`, `${episodes.length} episodes`, `${uniqueTagCount} linked tags`]}
        primaryAction={{ label: "All podcasts", href: "/resources/podcasts" }}
        secondaryAction={{ label: "Resources hub", href: "/resources", variant: "secondary" }}
        metrics={[
          {
            label: "Company slug",
            value: companySlug,
            note: "Canonical company key for filtering.",
          },
          {
            label: "Episodes",
            value: String(episodes.length),
            note: "Current company-tagged episodes.",
          },
          {
            label: "Tag coverage",
            value: String(uniqueTagCount),
            note: "Distinct tags across these episodes.",
          },
        ]}
      />

      <ul className="section-spacing grid gap-4">
        {episodes.map((episode) => (
          <li key={episode.id} className="surface-panel section-shell p-4">
            <div className="text-sm font-semibold text-slate-900">{episode.title}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {episode.tags?.map((tag) => (
                <Link
                  key={tag.slug}
                  href={`/resources/podcasts/tag/${tag.slug}`}
                  className="chip chip-muted rounded-full px-2.5 py-1 text-xs font-semibold"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
            <Link
              href={`/resources/podcasts/${episode.slug}`}
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-deep transition hover:translate-x-0.5 hover:text-brand-blue"
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
