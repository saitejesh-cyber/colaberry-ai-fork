// src/pages/resources/podcasts/[slug].tsx
import Layout from "../../../components/Layout";
import Link from "next/link";
import Head from "next/head";
import RichText from "../../../components/RichText";
import SectionHeader from "../../../components/SectionHeader";
import PodcastPlayer from "../../../components/PodcastPlayer";
import { fetchPodcastBySlug } from "../../../lib/cms";
import sanitizeHtml from "sanitize-html";

export async function getServerSideProps({ params }: any) {
  const episode = await fetchPodcastBySlug(params.slug);

  if (!episode) {
    return { notFound: true };
  }

  const rawTranscript = typeof episode.transcript === "string" ? episode.transcript : "";
  const sanitizedTranscript = rawTranscript
    ? sanitizeHtml(rawTranscript, {
        allowedTags: ["p", "br", "strong", "em", "b", "i", "u", "ul", "ol", "li", "h2", "h3", "h4", "a"],
        allowedAttributes: {
          a: ["href", "target", "rel"],
        },
        allowedSchemes: ["http", "https", "mailto"],
      })
    : null;

  return {
    props: {
      episode: {
        ...episode,
        transcript: sanitizedTranscript,
      },
    },
  };
}

export default function PodcastDetail({ episode }: any) {
  const platformLabels: Record<string, string> = {
    apple: "Apple Podcasts",
    spotify: "Spotify",
    youtube: "YouTube",
    substack: "Substack",
    twitter: "X (Twitter)",
  };
  const preferNative = Boolean(episode.useNativePlayer && episode.audioUrl);
  const embedCode = preferNative ? null : episode.buzzsproutEmbedCode;
  const audioUrl = episode.audioUrl;

  const publishedLabel = episode.publishedDate
    ? new Date(episode.publishedDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Layout>
      <Head>
        <title>{`${episode.title} | Podcast | Colaberry AI`}</title>
      </Head>
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
          <PodcastPlayer embedCode={embedCode} audioUrl={audioUrl} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {episode.tags.map((tag: any) => (
            <Link
              key={tag.slug}
              href={`/resources/podcasts/tag/${tag.slug}`}
              className="chip rounded-full border border-slate-200/80 bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-brand-deep"
            >
              #{tag.name}
            </Link>
          ))}
          {episode.companies.map((company: any) => (
            <Link
              key={company.slug}
              href={`/podcast/${company.slug}`}
              className="chip chip-brand rounded-full border border-brand-blue/20 bg-white/80 px-2.5 py-1 text-xs font-semibold text-brand-deep hover:text-brand-blue"
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
                className="chip chip-muted rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 font-semibold text-slate-600 hover:text-brand-deep"
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

      {episode.transcript && String(episode.transcript).trim() && (
        <div className="surface-panel mt-6 border-t-4 border-brand-blue/20 p-6">
          <details>
            <summary className="focus-ring cursor-pointer text-sm font-semibold text-slate-900">
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
