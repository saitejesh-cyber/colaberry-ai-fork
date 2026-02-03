// src/pages/resources/podcasts/[slug].tsx
import Layout from "../../../components/Layout";
import Link from "next/link";
import Head from "next/head";
import RichText from "../../../components/RichText";
import SectionHeader from "../../../components/SectionHeader";
import PodcastPlayer from "../../../components/PodcastPlayer";
import TranscriptTimeline from "../../../components/TranscriptTimeline";
import { fetchPodcastBySlug } from "../../../lib/cms";
import sanitizeHtml from "sanitize-html";
import { useEffect, useMemo, useRef, useState } from "react";

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
        transcript: sanitizedTranscript || episode.transcript || null,
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
    rss: "RSS",
  };
  const preferNative = Boolean(episode.useNativePlayer && episode.audioUrl);
  const embedCode = preferNative ? null : episode.buzzsproutEmbedCode;
  const audioUrl = episode.audioUrl;
  const [shareUrl, setShareUrl] = useState("");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const hasLoggedView = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.href);
    }
  }, []);

  useEffect(() => {
    if (!hasLoggedView.current) {
      hasLoggedView.current = true;
      logPodcastEvent("view", undefined, { slug: episode.slug, title: episode.title });
    }
  }, []);

  const resolvedShareUrl = useMemo(() => {
    if (shareUrl) {
      return shareUrl;
    }
    if (baseUrl) {
      return `${baseUrl.replace(/\/$/, "")}/resources/podcasts/${episode.slug}`;
    }
    return "";
  }, [baseUrl, episode.slug, shareUrl]);

  const shareLinks = useMemo(() => {
    const url = encodeURIComponent(resolvedShareUrl);
    const title = encodeURIComponent(episode.title || "Colaberry AI Podcast");
    return {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      x: `https://x.com/intent/tweet?url=${url}&text=${title}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    };
  }, [episode.title, resolvedShareUrl]);

  const transcriptIsHtml = typeof episode.transcript === "string";
  const transcriptSegments = Array.isArray(episode.transcriptSegments)
    ? episode.transcriptSegments
    : [];
  const hasTimedTranscript = transcriptSegments.length > 0;
  const shouldForceNative = hasTimedTranscript && audioUrl;
  const subscribeLinks = (episode.platformLinks || []).filter((link: any) => link?.url);

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

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <div className="surface-panel border-t-4 border-brand-blue/20 p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Listen to the podcast
            </div>
            <div className="mt-3">
              <PodcastPlayer
                embedCode={shouldForceNative ? null : embedCode}
                audioUrl={audioUrl}
                audioRef={audioRef}
                onPlay={() => logPodcastEvent("play", undefined, { slug: episode.slug, title: episode.title })}
              />
              {hasTimedTranscript ? (
                <p className="mt-2 text-xs text-slate-500">
                  Transcript is synchronized with the audio player.
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Share
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={shareLinks.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue"
                  aria-label="Share on LinkedIn"
                  onClick={() => logPodcastEvent("share", "linkedin", { slug: episode.slug, title: episode.title })}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 1 0-4 0v7h-4V9h4v2.2A4.5 4.5 0 0 1 16 8Z"
                      fill="currentColor"
                    />
                    <rect x="2" y="9" width="4" height="12" fill="currentColor" />
                    <circle cx="4" cy="4" r="2" fill="currentColor" />
                  </svg>
                </a>
                <a
                  href={shareLinks.x}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue"
                  aria-label="Share on X"
                  onClick={() => logPodcastEvent("share", "x", { slug: episode.slug, title: episode.title })}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M4 4h4.6l4 5.6L16.9 4H21l-6.6 8.6L21 20h-4.7l-4.2-5.9L7.3 20H3l7-8.9L4 4Z"
                      fill="currentColor"
                    />
                  </svg>
                </a>
                <a
                  href={shareLinks.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue"
                  aria-label="Share on Facebook"
                  onClick={() => logPodcastEvent("share", "facebook", { slug: episode.slug, title: episode.title })}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M14.5 8.5h3V5h-3c-2.5 0-4.5 2-4.5 4.5V12H7v3h3v6h3.5v-6h3l.5-3h-3.5V9.5c0-.6.4-1 1-1Z"
                      fill="currentColor"
                    />
                  </svg>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    if (resolvedShareUrl) {
                      navigator.clipboard.writeText(resolvedShareUrl);
                      logPodcastEvent("share", "copy", { slug: episode.slug, title: episode.title });
                    }
                  }}
                  className="focus-ring inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue"
                >
                  Copy link
                </button>
                {episode.transcript && String(episode.transcript).trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setTranscriptOpen(true);
                      setTimeout(() => {
                        transcriptRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 50);
                    }}
                    className="focus-ring inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue"
                  >
                    Transcript
                  </button>
                )}
              </div>
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
          </div>

          <div className="surface-panel border-t-4 border-brand-blue/20 p-6">
            <div className="prose max-w-none">
              {episode.description ? (
                <RichText blocks={episode.description} />
              ) : (
                <p>Podcast summary and notes will appear here once published.</p>
              )}
            </div>
          </div>

          {hasTimedTranscript && (
            <div
              ref={transcriptRef}
              id="transcript"
              className="surface-panel border-t-4 border-brand-blue/20 p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Transcript
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">Time‑coded transcript</h3>
                </div>
                {episode.transcriptGeneratedAt ? (
                  <span className="text-xs text-slate-500">
                    Updated {new Date(episode.transcriptGeneratedAt).toLocaleDateString()}
                  </span>
                ) : null}
              </div>
              <div className="mt-4">
                <TranscriptTimeline segments={transcriptSegments} audioRef={audioRef} />
              </div>
            </div>
          )}

          {!hasTimedTranscript && episode.transcript && String(episode.transcript).trim() && (
            <div
              ref={transcriptRef}
              id="transcript"
              className="surface-panel border-t-4 border-brand-blue/20 p-6"
            >
              <details
                open={transcriptOpen}
                onToggle={(event) => setTranscriptOpen(event.currentTarget.open)}
              >
                <summary className="focus-ring cursor-pointer text-sm font-semibold text-slate-900">
                  Transcript
                </summary>
                <div className="prose mt-4 max-w-none text-sm">
                  {transcriptIsHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: episode.transcript }} />
                  ) : (
                    <RichText blocks={episode.transcript} />
                  )}
                </div>
              </details>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="surface-panel border-t-4 border-brand-blue/20 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Listen on
            </div>
            {subscribeLinks.length > 0 ? (
              <div className="mt-4 grid gap-2">
                {subscribeLinks.map((link: any, index: number) => {
                  const platform = String(link.platform || "platform");
                  const platformKey = platform.toLowerCase();
                  const label = platformLabels[platformKey] || platform;
                  return (
                    <a
                      key={`${platformKey}-${index}`}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() =>
                        logPodcastEvent("subscribe", platformKey, {
                          slug: episode.slug,
                          title: episode.title,
                        })
                      }
                      className="focus-ring inline-flex items-center justify-between rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue"
                    >
                      <span>{label}</span>
                      <span aria-hidden="true">→</span>
                    </a>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Subscribe links will appear here.</p>
            )}
          </div>

          {episode.companies?.length > 0 && (
            <div className="surface-panel border-t-4 border-brand-blue/20 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Company tags
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {episode.companies.map((company: any) => (
                  <Link
                    key={company.slug}
                    href={`/podcast/${company.slug}`}
                    className="chip chip-brand rounded-full border border-brand-blue/20 bg-white/80 px-3 py-1 text-xs font-semibold text-brand-deep hover:text-brand-blue"
                  >
                    {company.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </Layout>
  );
}

async function logPodcastEvent(
  eventType: "view" | "play" | "share" | "subscribe" | "click",
  platform?: string,
  episode?: { slug?: string; title?: string }
) {
  try {
    await fetch("/api/podcast-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        platform,
        episodeSlug: episode?.slug,
        episodeTitle: episode?.title,
      }),
    });
  } catch {
    // logging is best-effort only
  }
}
