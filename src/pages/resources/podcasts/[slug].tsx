// src/pages/resources/podcasts/[slug].tsx
import Layout from "../../../components/Layout";
import Link from "next/link";
import RichText from "../../../components/RichText";
import SectionHeader from "../../../components/SectionHeader";
import PodcastPlayer from "../../../components/PodcastPlayer";
import { fetchPodcastBySlug } from "../../../lib/cms";

export async function getServerSideProps({ params }: any) {
  const episode = await fetchPodcastBySlug(params.slug);

  if (episode) {
    return { props: { episode } };
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_CMS_URL}/api/podcast-episodes` +
      `?filters[companies][slug][$eq]=${params.slug}` +
      `&populate[companies][fields][0]=name` +
      `&populate[companies][fields][1]=slug` +
      `&populate[tags][fields][0]=name` +
      `&populate[tags][fields][1]=slug`,
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

  if (!episodes.length) {
    return { notFound: true };
  }

  const companyName =
    episodes?.[0]?.companies?.[0]?.attributes?.name ??
    episodes?.[0]?.companies?.[0]?.name ??
    params.slug;

  return {
    props: {
      episode: null,
      companyName,
      companySlug: params.slug,
      companyEpisodes: episodes,
    },
  };
}

export default function PodcastDetail({
  episode,
  companyName,
  companyEpisodes,
}: any) {
  const platformLabels: Record<string, string> = {
    apple: "Apple Podcasts",
    spotify: "Spotify",
    youtube: "YouTube",
    substack: "Substack",
    twitter: "X (Twitter)",
  };

  if (!episode && companyEpisodes) {
    return (
      <Layout>
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
          {companyEpisodes.map((e: any) => (
            <li key={e.id} className="surface-panel border-t-4 border-brand-blue/20 p-4">
              <div className="text-sm font-semibold text-slate-900">{e.title}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {e.tags?.map((tag: any) => (
                  <Link
                    key={tag.slug ?? tag.id}
                    href={`/resources/podcasts/tag/${tag.slug}`}
                    className="rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-brand-deep"
                  >
                    #{tag.name ?? tag.attributes?.name}
                  </Link>
                ))}
              </div>
              <Link
                href={`/resources/podcasts/${e.slug}`}
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-deep hover:text-brand-blue"
              >
                View →
              </Link>
            </li>
          ))}
        </ul>
      </Layout>
    );
  }

  const publishedLabel = episode.publishedDate
    ? new Date(episode.publishedDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Layout>
      <div className="flex flex-col gap-3">
        <SectionHeader
          as="h1"
          size="xl"
          kicker="Podcast"
          title={episode.title}
          description="Listen to the episode or read the full narrative and transcript."
        >
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {publishedLabel ? <span>{publishedLabel}</span> : null}
            {episode.duration ? <span>{episode.duration}</span> : null}
            {episode.episodeNumber ? <span>Episode {episode.episodeNumber}</span> : null}
          </div>
        </SectionHeader>
      </div>

      {episode.coverImageUrl && (
        <div className="surface-panel mt-6 overflow-hidden border border-slate-200/80">
          <img
            src={episode.coverImageUrl}
            alt={episode.coverImageAlt || episode.title}
            className="h-64 w-full object-cover sm:h-80"
            loading="lazy"
          />
        </div>
      )}

      <div className="surface-panel mt-6 border-t-4 border-brand-blue/20 p-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Listen to the podcast
        </div>
        <div className="mt-3">
          <PodcastPlayer
            embedCode={episode.buzzsproutEmbedCode}
            audioUrl={episode.audioUrl}
          />
        </div>

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
          {episode.companies.map((company: any) => (
            <Link
              key={company.slug}
              href={`/resources/podcasts/${company.slug}`}
              className="rounded-full border border-brand-blue/20 bg-white/80 px-2.5 py-1 text-xs font-semibold text-brand-deep hover:text-brand-blue"
            >
              {company.name}
            </Link>
          ))}
        </div>

        {episode.platformLinks?.some((link: any) => link?.url) ? (
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
            {episode.platformLinks
              .filter((link: any) => link?.url)
              .map((link: any, index: number) => (
              <a
                key={`${link.platform}-${index}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 font-semibold text-slate-600 hover:text-brand-deep"
              >
                {platformLabels[String(link.platform)] || String(link.platform || "platform")}
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <div className="surface-panel mt-6 border-t-4 border-brand-blue/20 p-6">
        <div className="prose max-w-none">
          {episode.description ? (
            <RichText blocks={episode.description} />
          ) : (
            <p>Podcast summary and notes will appear here once published.</p>
          )}
        </div>
      </div>

      {episode.transcript && (
        <div className="surface-panel mt-6 border-t-4 border-brand-blue/20 p-6">
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-slate-900">
              Transcript
            </summary>
            <div
              className="prose mt-4 max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: episode.transcript }}
            />
          </details>
        </div>
      )}
    </Layout>
  );
}
