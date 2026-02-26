import Layout from "../../../../components/Layout";
import Link from "next/link";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import EnterprisePageHero from "../../../../components/EnterprisePageHero";
import StatePanel from "../../../../components/StatePanel";
import type { Company, Tag } from "../../../../lib/cms";
import { heroImage } from "../../../../lib/media";

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
  const uniqueCompanyCount = new Set(
    episodes.flatMap((episode) => (episode.companies || []).map((company) => company.slug).filter(Boolean))
  ).size;

  return (
    <Layout>
      <Head>
        <title>{`#${tag} Podcasts | Colaberry AI`}</title>
        <meta
          name="description"
          content={`Podcast episodes tagged with #${tag}, including linked companies and direct episode access.`}
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
            <div className="text-sm font-semibold text-slate-900">{e.title}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {e.companies?.map((company) => (
                <Link
                  key={company.slug}
                  href={`/resources/podcasts/company?slug=${encodeURIComponent(company.slug)}`}
                  className="chip chip-brand rounded-full px-2.5 py-1 text-xs font-semibold"
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
