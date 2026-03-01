// src/pages/resources/podcasts/[slug].tsx
import Layout from "../../../components/Layout";
import Breadcrumb from "../../../components/Breadcrumb";
import Link from "next/link";
import Image from "next/image";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import RichText from "../../../components/RichText";
import SectionHeader from "../../../components/SectionHeader";
import PodcastPlayer from "../../../components/PodcastPlayer";
import TranscriptTimeline from "../../../components/TranscriptTimeline";
import {
  fetchPodcastBySlug,
  fetchRelatedPodcastEpisodes,
  type PodcastEpisode,
  type PlatformLink,
} from "../../../lib/cms";
import sanitizeHtml from "sanitize-html";
import { useEffect, useRef, useState } from "react";

const PODCAST_BRAND_IMAGE = "/media/podcast/colaberry-ai-podcast-brand.svg";
import { logPodcastEvent } from "../../../lib/podcastTelemetry";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";

type PodcastDetailProps = {
  episode: PodcastEpisode;
  relatedEpisodes: PodcastEpisode[];
};

type RouteParams = {
  slug?: string;
};

export const getServerSideProps: GetServerSideProps<PodcastDetailProps, RouteParams> = async ({
  params,
}) => {
  const slug = params?.slug;
  if (!slug) {
    return { notFound: true };
  }
  const episode = await fetchPodcastBySlug(slug);

  if (!episode) {
    return { notFound: true };
  }

  let relatedEpisodes: PodcastEpisode[] = [];
  try {
    relatedEpisodes = await fetchRelatedPodcastEpisodes(episode, { limit: 4 });
  } catch {
    relatedEpisodes = [];
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
      relatedEpisodes,
    },
  };
};

export default function PodcastDetail({ episode, relatedEpisodes }: PodcastDetailProps) {
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
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai").replace(/\/$/, "");
  const canonicalUrl = `${siteUrl}/resources/podcasts/${episode.slug}`;
  const metaDescription =
    (typeof episode.description === "string" && episode.description.trim()) ||
    "Podcast episode with player, transcript, and structured metadata for enterprise AI discovery.";
  const seoMeta: SeoMeta = {
    title: `${episode.title} | Podcast | Colaberry AI`,
    description: metaDescription,
    canonical: buildCanonical(`/resources/podcasts/${episode.slug}`),
    ogType: "article",
    ogImage: episode.coverImageUrl || null,
    ogImageAlt: episode.coverImageAlt || episode.title,
  };
  const playerRef = useRef<HTMLDivElement | null>(null);
  const hasLoggedView = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!hasLoggedView.current) {
      hasLoggedView.current = true;
      logPodcastEvent("view", undefined, { slug: episode.slug, title: episode.title });
    }
  }, [episode.slug, episode.title]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncTime = () => setCurrentTime(audio.currentTime || 0);
    const syncDuration = () => {
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(nextDuration);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    syncTime();
    syncDuration();
    setIsPlaying(!audio.paused);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", syncTime);
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("durationchange", syncDuration);
    };
  }, [audioUrl]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: episode.title,
    description: metaDescription,
    datePublished: episode.publishedDate || undefined,
    url: canonicalUrl,
    ...(episode.duration ? { duration: episode.duration } : {}),
    associatedMedia: episode.audioUrl
      ? {
          "@type": "MediaObject",
          contentUrl: episode.audioUrl,
          encodingFormat: "audio/mpeg",
        }
      : undefined,
    partOfSeries: {
      "@type": "PodcastSeries",
      name: "Colaberry AI Podcast",
      url: `${siteUrl}/resources/podcasts`,
    },
    publisher: {
      "@type": "Organization",
      name: "Colaberry AI",
      url: siteUrl,
    },
  };

  const shareLinks = (() => {
    const url = encodeURIComponent(canonicalUrl);
    const title = encodeURIComponent(episode.title || "Colaberry AI Podcast");
    return {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      x: `https://x.com/intent/tweet?url=${url}&text=${title}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    };
  })();

  const transcriptIsHtml = typeof episode.transcript === "string";
  const transcriptSegments = Array.isArray(episode.transcriptSegments)
    ? episode.transcriptSegments
    : [];
  const hasTimedTranscript = transcriptSegments.length > 0;
  const hasTranscriptText = Boolean(episode.transcript && String(episode.transcript).trim());
  const hasTranscriptContent = hasTimedTranscript || hasTranscriptText;
  const [copiedLink, setCopiedLink] = useState(false);
  const [contentTab, setContentTab] = useState<"description" | "transcript">(
    hasTimedTranscript ? "transcript" : "description"
  );
  const shouldForceNative = hasTimedTranscript && audioUrl;
  const usesNativePlayer = Boolean(audioUrl && (shouldForceNative || preferNative));
  const showMiniPlayer = usesNativePlayer && (isPlaying || currentTime > 0);
  const subscribeLinks = (episode.platformLinks || []).filter(
    (link): link is PlatformLink & { url: string } => Boolean(link?.url)
  );

  const publishedLabel = episode.publishedDate
    ? new Date(episode.publishedDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const formatTime = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) {
      return "0:00";
    }
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleTogglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  const handleStopPlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>

      <ScrollProgress />

      <Breadcrumb items={[
        { label: "Home", href: "/" },
        { label: "Podcasts", href: "/resources/podcasts" },
        { label: episode.title },
      ]} />

      {/* ── Compact episode header ── */}
      <header className="section-shell px-4 pt-4 pb-2 sm:px-6">
        <h1 className="font-display text-display-lg font-bold text-zinc-900 dark:text-zinc-100 sm:text-display-xl lg:text-display-2xl">
          {episode.title}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
          {publishedLabel ? <span>{publishedLabel}</span> : null}
          {episode.duration ? <><span aria-hidden="true">&middot;</span><span>{episode.duration}</span></> : null}
          {episode.episodeNumber ? <><span aria-hidden="true">&middot;</span><span>Episode {episode.episodeNumber}</span></> : null}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(episode.tags || []).slice(0, 5).map((tag) => (
            <Link key={tag.slug} href={`/resources/podcasts/tag/${tag.slug}`} className="chip chip-muted rounded-md px-2.5 py-1 text-xs font-semibold">
              #{tag.name}
            </Link>
          ))}
          {hasTranscriptContent ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--trusted-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--trusted-text)] ring-1 ring-inset ring-[var(--trusted-stroke)]">
              Transcript
            </span>
          ) : null}
        </div>
      </header>

      <div className="section-shell px-4 pt-4 pb-8 sm:px-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <div id="player" ref={playerRef} className="detail-section">
            <div className="text-label font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-300">
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
                <p className="mt-2 text-xs text-zinc-500">
                  Transcript is synchronized with the audio player.
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-label font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                Share
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={shareLinks.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost btn-icon"
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
                  className="btn btn-ghost btn-icon"
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
                  className="btn btn-ghost btn-icon"
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
                    if (canonicalUrl) {
                      navigator.clipboard.writeText(canonicalUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                      logPodcastEvent("share", "copy", { slug: episode.slug, title: episode.title });
                    }
                  }}
                  className={`btn btn-compact ${copiedLink ? "text-emerald-600 dark:text-emerald-400" : "btn-ghost"}`}
                >
                  {copiedLink ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mr-1 inline-block">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    "Copy link"
                  )}
                </button>
                {hasTranscriptContent && (
                  <button
                    type="button"
                    onClick={() => setContentTab("transcript")}
                    className="btn btn-ghost btn-compact"
                  >
                    Transcript
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {episode.tags.map((tag) => (
                <Link
                  key={tag.slug}
                  href={`/resources/podcasts/tag/${tag.slug}`}
                  className="chip chip-muted rounded-md px-2.5 py-1 text-xs font-semibold"
                >
                  #{tag.name}
                </Link>
              ))}
              {episode.companies.map((company) => (
                <Link
                  key={company.slug}
                  href={`/resources/podcasts/company?slug=${encodeURIComponent(company.slug)}`}
                  className="chip chip-neutral rounded-md px-2.5 py-1 text-xs font-semibold"
                >
                  {company.name}
                </Link>
              ))}
            </div>
          </div>

          {/* ── Description / Transcript tabs ── */}
          <div id="transcript" className="detail-section">
            <div role="tablist" className="flex items-center gap-1 rounded-lg border border-zinc-200/80 p-1 w-fit dark:border-zinc-700">
              <button
                type="button"
                role="tab"
                aria-selected={contentTab === "description"}
                onClick={() => setContentTab("description")}
                className={`flex min-h-[36px] items-center rounded-md px-4 py-1.5 text-xs font-semibold transition ${
                  contentTab === "description"
                    ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                Description
              </button>
              {hasTranscriptContent ? (
                <button
                  type="button"
                  role="tab"
                  aria-selected={contentTab === "transcript"}
                  onClick={() => setContentTab("transcript")}
                  className={`flex min-h-[36px] items-center rounded-md px-4 py-1.5 text-xs font-semibold transition ${
                    contentTab === "transcript"
                      ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  Transcript
                </button>
              ) : null}
            </div>

            {contentTab === "description" ? (
              <div className="prose mt-4 max-w-none">
                {episode.description ? (
                  <RichText blocks={episode.description} />
                ) : null}
              </div>
            ) : hasTimedTranscript ? (
              <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-lg border border-zinc-200/60 p-4 dark:border-zinc-700/50">
                {episode.transcriptGeneratedAt ? (
                  <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                    Updated{" "}
                    {new Date(episode.transcriptGeneratedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </p>
                ) : null}
                <TranscriptTimeline segments={transcriptSegments} audioRef={audioRef} />
              </div>
            ) : hasTranscriptText ? (
              <div className="prose mt-4 max-h-[60vh] max-w-none overflow-y-auto rounded-lg border border-zinc-200/60 p-4 text-sm dark:border-zinc-700/50">
                {transcriptIsHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: episode.transcript as string }} />
                ) : (
                  <RichText blocks={episode.transcript} />
                )}
              </div>
            ) : null}
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          {subscribeLinks.length > 0 ? (
            <div className="detail-section">
              <div className="text-label font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                Listen on
              </div>
              <div className="mt-4 grid gap-2">
                {subscribeLinks.map((link, index) => {
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
                      className="focus-ring chip chip-muted inline-flex items-center justify-between rounded-md px-4 py-2 text-xs font-semibold"
                    >
                      <span>{label}</span>
                      <span aria-hidden="true">&rarr;</span>
                    </a>
                  );
                })}
              </div>
            </div>
          ) : null}

          {episode.companies?.length > 0 && (
            <div className="detail-section">
              <div className="text-label font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                Company tags
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {episode.companies.map((company) => (
                  <Link
                    key={company.slug}
                    href={`/resources/podcasts/company?slug=${encodeURIComponent(company.slug)}`}
                    className="chip chip-neutral rounded-md px-3 py-1 text-xs font-semibold"
                  >
                    {company.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {relatedEpisodes.length > 0 ? (
        <section className="detail-section section-spacing">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeader
              as="h2"
              size="md"
              kicker="Related"
              title="More podcast episodes"
              description="Continue listening with closely related episodes from the catalog."
            />
            <Link href="/resources/podcasts" className="btn btn-secondary btn-sm mt-2 sm:mt-0">
              Full podcast catalog
            </Link>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {relatedEpisodes.map((item) => {
              const itemType = (item.podcastType || "internal").toLowerCase();
              const itemArtwork = itemType === "external" && item.coverImageUrl
                ? item.coverImageUrl
                : PODCAST_BRAND_IMAGE;
              return (
                <li key={item.slug}>
                  <Link
                    href={`/resources/podcasts/${item.slug}`}
                    className="focus-ring flex h-full gap-4 rounded-xl bg-[#F5F3EE] p-4 transition-colors hover:bg-[#EDEAE3] dark:bg-[#1E1D1A] dark:hover:bg-[#252420]"
                  >
                    <Image
                      src={itemArtwork}
                      alt={item.coverImageAlt || item.title}
                      width={48}
                      height={48}
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                      unoptimized
                    />
                    <div className="min-w-0 flex-1">
                      {formatDate(item.publishedDate) ? (
                        <span className="text-label font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          {formatDate(item.publishedDate)}
                        </span>
                      ) : null}
                      <span className="mt-1 line-clamp-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </span>
                      {typeof item.description === "string" && item.description.trim() && (
                        <span className="mt-1 line-clamp-1 block text-xs text-zinc-500 dark:text-zinc-400">
                          {item.description.replace(/<[^>]*>/g, "").slice(0, 120)}
                        </span>
                      )}
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                        Open episode <span aria-hidden="true">&rarr;</span>
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {showMiniPlayer && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 w-[min(100%-2rem,64rem)] -translate-x-1/2">
          <div className="pointer-events-auto card-elevated p-3 shadow-lg backdrop-blur">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTogglePlayback}
                  className="btn btn-secondary btn-icon"
                  aria-label={isPlaying ? "Pause audio" : "Play audio"}
                  aria-pressed={isPlaying}
                >
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                      <rect x="6" y="5" width="4" height="14" fill="currentColor" />
                      <rect x="14" y="5" width="4" height="14" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                      <path d="M8 5v14l11-7-11-7Z" fill="currentColor" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleStopPlayback}
                  className="btn btn-ghost btn-icon"
                  aria-label="Stop audio"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <rect x="6" y="6" width="12" height="12" fill="currentColor" />
                  </svg>
                </button>
              </div>
              <span className="text-xs font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {episode.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="btn btn-ghost btn-compact"
              >
                Back to player
              </button>
            </div>
          </div>
        </div>
      )}

      <ShareActions title={episode.title} />
    </Layout>
  );
}

function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className="scroll-progress"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
      style={{ transform: `scaleX(${progress / 100})` }}
    />
  );
}

function ShareActions({ title: _title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="fixed bottom-6 right-6 z-30 flex gap-2">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--stroke)] bg-[var(--surface-strong)] shadow-lg transition-colors hover:bg-[var(--surface-soft)]"
        aria-label="Copy link"
        onClick={copy}
      >
        {copied ? (
          <svg viewBox="0 0 20 20" className="h-4 w-4 text-[var(--trust-green)]" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
        )}
      </button>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
