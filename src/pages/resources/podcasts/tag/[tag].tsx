import Layout from "../../../../components/Layout";
import Link from "next/link";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import EnterprisePageHero from "../../../../components/EnterprisePageHero";
import StatePanel from "../../../../components/StatePanel";
import {
  fetchPodcastEpisodes,
  type Company,
  type PodcastEpisode,
  type Tag,
} from "../../../../lib/cms";
import { heroImage } from "../../../../lib/media";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../../lib/seo";

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
    const allEpisodes = await fetchPodcastEpisodes({ maxRecords: 500 });
    const episodes: TaggedEpisode[] = allEpisodes
      .filter((episode: PodcastEpisode) =>
        (episode.tags || []).some((entry) => entry.slug?.toLowerCase() === tag.toLowerCase())
      )
      .map((episode) => ({
        id: episode.id,
        title: episode.title,
        slug: episode.slug,
        tags: episode.tags || [],
        companies: episode.companies || [],
      }));

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
  const seoMeta: SeoMeta = {
    title: `#${tag} Podcasts | Colaberry AI`,
    description: `Podcast episodes tagged with #${tag}, including linked companies and direct episode access.`,
    canonical: buildCanonical(`/resources/podcasts/tag/${encodeURIComponent(tag)}`),
  };
  const uniqueCompanyCount = new Set(
    episodes.flatMap((episode) => (episode.companies || []).map((company) => company.slug).filter(Boolean))
  ).size;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai").replace(/\/$/, "");
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `#${tag} podcast episodes`,
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
        kicker="Tag signal"
        title={`#${tag} podcasts`}
        description={`Episodes tagged with #${tag}, with company mappings and direct episode links.`}
        image={heroImage("hero-podcasts-cinematic.webp")}
        alt={`Podcast tag ${tag} signal`}
        imageKicker="Tag feed"
        imageTitle={`#${tag} episode lane`}
        imageDescription="Topic-tagged episodes surfaced for focused discovery."
        chips={[`#${tag}`, `${episodes.length} episodes`, `${uniqueCompanyCount} linked companies`]}
        primaryAction={{ label: "All podcasts", href: "/resources/podcasts" }}
        secondaryAction={{ label: "Resources hub", href: "/resources", variant: "secondary" }}
        metrics={[
          {
            label: "Tag",
            value: `#${tag}`,
            note: "Current taxonomy filter.",
          },
          {
            label: "Episodes",
            value: String(episodes.length),
            note: "Current episodes in this tag lane.",
          },
          {
            label: "Company links",
            value: String(uniqueCompanyCount),
            note: "Distinct company relationships.",
          },
        ]}
      />

      <ul className="section-spacing grid gap-4">
        {episodes.map((e) => (
          <li key={e.id} className="surface-panel section-shell p-4">
            <div className="text-sm font-semibold text-zinc-900">{e.title}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {e.companies?.map((company) => (
                <Link
                  key={company.slug}
                  href={`/resources/podcasts/company?slug=${encodeURIComponent(company.slug)}`}
                  className="chip chip-brand rounded-md px-2.5 py-1 text-xs font-semibold"
                >
                  {company.name}
                </Link>
              ))}
            </div>
            <Link
              href={`/resources/podcasts/${e.slug}`}
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-deep transition hover:translate-x-0.5 hover:text-brand-blue"
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
