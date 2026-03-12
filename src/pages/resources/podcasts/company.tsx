import Layout from "../../../components/Layout";
import Link from "next/link";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import EnterprisePageHero from "../../../components/EnterprisePageHero";
import StatePanel from "../../../components/StatePanel";
import {
  fetchPodcastEpisodes,
  type Company,
  type PodcastEpisode,
  type Tag,
} from "../../../lib/cms";

import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";

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
    const allEpisodes = await fetchPodcastEpisodes({ maxRecords: 500 });
    const episodes: CompanyEpisode[] = allEpisodes
      .filter((episode: PodcastEpisode) =>
        (episode.companies || []).some((company) => company.slug?.toLowerCase() === slug.toLowerCase())
      )
      .map((episode) => ({
        id: episode.id,
        title: episode.title,
        slug: episode.slug,
        tags: episode.tags || [],
        companies: episode.companies || [],
      }));

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
  const seoMeta: SeoMeta = {
    title: `${companyName} Podcasts | Colaberry AI`,
    description: `Podcast episodes connected to ${companyName}, with tag context and direct episode links.`,
    canonical: buildCanonical(`/resources/podcasts/company?slug=${encodeURIComponent(companySlug)}`),
  };
  const uniqueTagCount = new Set(
    episodes.flatMap((episode) => (episode.tags || []).map((tag) => tag.slug).filter(Boolean))
  ).size;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai").replace(/\/$/, "");
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${companyName} podcast episodes`,
    itemListElement: episodes.map((episode, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: episode.title,
      url: `${siteUrl}/resources/podcasts/${episode.slug}`,
    })),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
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
            <div className="text-sm font-semibold text-zinc-900">{episode.title}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {episode.tags?.map((tag) => (
                <Link
                  key={tag.slug}
                  href={`/resources/podcasts/tag/${tag.slug}`}
                  className="chip chip-muted rounded-md px-2.5 py-1 text-xs font-semibold"
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
