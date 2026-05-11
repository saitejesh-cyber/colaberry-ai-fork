// src/pages/resources/podcasts/[slug].tsx
import Layout from "../../../components/Layout";
import Breadcrumb from "../../../components/Breadcrumb";
import Link from "next/link";
import Image from "next/image";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import RichText from "../../../components/RichText";
import SectionHeader from "../../../components/SectionHeader";
import KineticHeading from "../../../components/KineticHeading";
import PodcastPlayer from "../../../components/PodcastPlayer";
import AudioPlayerUI from "../../../components/AudioPlayerUI";
import TranscriptTimeline from "../../../components/TranscriptTimeline";
import SubstackEmbedSignup from "../../../components/SubstackEmbedSignup";
import {
  fetchPodcastBySlug,
  fetchRelatedPodcastEpisodes,
  type PodcastEpisode,
  type PlatformLink,
} from "../../../lib/cms";
import sanitizeHtml from "sanitize-html";
import { useEffect, useRef, useState } from "react";
import { usePodcastPlayer } from "../../../contexts/PodcastPlayerContext";

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
  // Proxy Buzzsprout audio through our API to bypass Cloudflare JS challenges
  // that block <audio> element requests (503). Server-side fetch passes fine.
  const rawAudioUrl = episode.audioUrl;
  const audioUrl = rawAudioUrl?.includes("buzzsprout.com/")
    ? `/api/audio-stream?url=${encodeURIComponent(rawAudioUrl)}`
    : rawAudioUrl;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.colaberry.ai").replace(/\/$/, "");
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
  const {
    audioRef,
    play: globalPlay,
    isCurrentEpisode,
  } = usePodcastPlayer();

  useEffect(() => {
    if (!hasLoggedView.current) {
      hasLoggedView.current = true;
      logPodcastEvent("view", undefined, { slug: episode.slug, title: episode.title });
    }
  }, [episode.slug, episode.title]);

  // Auto-load this episode into the global player when visiting the detail page
  // (only if it's not already the current episode)
  useEffect(() => {
    if (audioUrl && !isCurrentEpisode(episode.slug)) {
      globalPlay({
        slug: episode.slug,
        title: episode.title,
        audioUrl,
        coverImageUrl: episode.coverImageUrl,
        coverImageAlt: episode.coverImageAlt,
        duration: episode.duration,
      });
    }
    // Only on mount / episode change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode.slug, audioUrl]);

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

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      </Head>

      <ScrollProgress />

      <Breadcrumb items={[
        { label: "Home", href: "/" },
        { label: "Podcasts", href: "/resources/podcasts" },
        { label: episode.title },
      ]} />

      {/* ── Apple Podcasts–style episode header ── */}
      <header className="section-shell overflow-hidden px-4 pt-4 pb-4 sm:px-6">
        <div className="flex gap-5 sm:gap-6">
          {/* Left: Cover art */}
          <div className="shrink-0">
            <Image
              src={episode.coverImageUrl || PODCAST_BRAND_IMAGE}
              alt={episode.coverImageAlt || episode.title}
              width={180}
              height={180}
              className="h-32 w-32 rounded-2xl shadow-md sm:h-44 sm:w-44"
              sizes="(min-width:640px) 176px, 128px"
            />
          </div>

          {/* Right: Metadata + Title + Show name */}
          <div className="flex min-w-0 flex-col justify-center">
            <p className="flex flex-wrap items-center gap-x-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {publishedLabel ? <span>{publishedLabel}</span> : null}
              {episode.duration ? <><span aria-hidden="true">·</span><span>{episode.duration}</span></> : null}
              {episode.episodeNumber ? <><span aria-hidden="true">·</span><span>Ep {episode.episodeNumber}</span></> : null}
            </p>

            <KineticHeading
              as="h1"
              text={episode.title}
              className="mt-1.5 font-display text-lg font-bold leading-snug text-zinc-900 break-words dark:text-zinc-100 sm:text-xl lg:text-2xl"
              duration={0.7}
              stagger={0.05}
            />

            <Link
              href="/resources/podcasts"
              className="mt-1.5 text-sm font-semibold text-[#DC2626] hover:underline dark:text-[#F87171]"
            >
              Colaberry AI Podcast
            </Link>

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
          </div>
        </div>
      </header>

      <div className="section-shell px-4 pt-4 pb-8 sm:px-6">
        <div className="flex flex-col gap-6">
          <div id="player" ref={playerRef} className="sticky top-16 z-30 -mx-4 border-b border-zinc-200/60 bg-zinc-50/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/80 dark:border-zinc-800/60 dark:bg-zinc-950/95 dark:supports-[backdrop-filter]:bg-zinc-950/80 sm:-mx-6 sm:px-6">
            {usesNativePlayer && audioUrl ? (
              <AudioPlayerUI
                src={audioUrl}
                audioRef={audioRef}
                forwardSkipSeconds={30}
                className=""
                externalAudio
                onPlay={() => logPodcastEvent("play", undefined, { slug: episode.slug, title: episode.title })}
              />
            ) : (
              <PodcastPlayer
                embedCode={embedCode}
                audioUrl={audioUrl}
                audioRef={audioRef}
                onPlay={() => logPodcastEvent("play", undefined, { slug: episode.slug, title: episode.title })}
              />
            )}
          </div>

          {/* Two-column layout: main content + Playing Next sidebar */}
          <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0">
          <div>
            <div className="flex flex-wrap items-center gap-2">
                <a
                  href={shareLinks.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-icon"
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
                  className="btn btn-secondary btn-icon"
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
                  className="btn btn-secondary btn-icon"
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
                  className={`btn btn-compact ${copiedLink ? "text-zinc-600 dark:text-zinc-300" : "btn-secondary"}`}
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
                    className="btn btn-secondary btn-compact"
                  >
                    Transcript
                  </button>
                )}
              </div>

            {subscribeLinks.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-label font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  Listen on
                </span>
                <div className="flex flex-wrap items-center gap-2">
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
                        className="focus-ring chip chip-muted inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold"
                      >
                        <span>{label}</span>
                        <span aria-hidden="true">&rarr;</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {episode.companies?.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-label font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  Company tags
                </span>
                <div className="flex flex-wrap gap-2">
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

          </div>

          {/* ── Episode Notes / Transcript tabs ── */}
          <div id="transcript" className="mt-8">
            <div role="tablist" className="flex items-center gap-1 rounded-lg border border-zinc-200/80 p-1 w-fit dark:border-zinc-700">
              <button
                type="button"
                role="tab"
                aria-selected={contentTab === "description"}
                onClick={() => setContentTab("description")}
                className={`flex min-h-[36px] items-center rounded-md px-4 py-1.5 text-xs font-semibold transition ${
                  contentTab === "description"
                    ? "bg-zinc-950 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                Episode Notes
              </button>
              {hasTranscriptContent ? (
                <button
                  type="button"
                  role="tab"
                  aria-selected={contentTab === "transcript"}
                  onClick={() => setContentTab("transcript")}
                  className={`flex min-h-[36px] items-center rounded-md px-4 py-1.5 text-xs font-semibold transition ${
                    contentTab === "transcript"
                      ? "bg-zinc-950 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  Transcript
                </button>
              ) : null}
            </div>

            {contentTab === "description" ? (
              <div className="prose mt-4 max-w-none overflow-hidden [overflow-wrap:break-word]">
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
              <div className="prose mt-4 max-h-[60vh] max-w-none overflow-y-auto overflow-x-hidden rounded-lg border border-zinc-200/60 p-4 text-sm [overflow-wrap:break-word] dark:border-zinc-700/50">
                {transcriptIsHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(episode.transcript as string, { allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "span"]) }) }} />
                ) : (
                  <RichText blocks={episode.transcript} />
                )}
              </div>
            ) : null}
          </div>
          </div>{/* end left column */}

          {/* RIGHT: Subscribe + Playing Next sidebar (desktop only) */}
            <aside className="hidden lg:block">
              <div className="sticky top-32">
                {/* Subscribe form — on-brand native form, hands off to Substack */}
                <div className="mb-6">
                  <SubstackEmbedSignup
                    variant="sidebar"
                    listKind="podcast"
                    title="Subscribe to the Colaberry AI Podcast"
                    description="Get every new episode delivered free to your inbox — enterprise AI agents, MCP servers, skills, and tools."
                  />
                </div>

                {/* Playing Next */}
          {relatedEpisodes.length > 0 && (
              <div className="border-t border-[#D4D1CA] pt-6 dark:border-[#4A473F]">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  Playing Next
                </h3>
                <ul className="mt-3 space-y-2">
                  {relatedEpisodes.slice(0, 4).map((ep) => {
                    const epType = (ep.podcastType || "internal").toLowerCase();
                    const epArt = epType === "external" && ep.coverImageUrl
                      ? ep.coverImageUrl
                      : PODCAST_BRAND_IMAGE;
                    return (
                      <li key={ep.slug}>
                        <Link
                          href={`/resources/podcasts/${ep.slug}`}
                          className="group flex gap-3 rounded-lg p-2 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                        >
                          <Image
                            src={epArt}
                            alt={ep.coverImageAlt || ep.title}
                            width={48}
                            height={48}
                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                            sizes="48px"
                            loading="lazy"
                          />
                          <div className="min-w-0">
                            <span className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              {ep.title}
                            </span>
                            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                              Colaberry AI Podcast
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
          )}
              </div>
            </aside>
          </div>{/* end grid */}
        </div>

      </div>

      {relatedEpisodes.length > 0 ? (
        <section className="detail-section section-spacing overflow-hidden">
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
                    className="focus-ring card-elevated flex h-full gap-5 p-4"
                  >
                    <Image
                      src={itemArtwork}
                      alt={item.coverImageAlt || item.title}
                      width={80}
                      height={80}
                      className="h-20 w-20 shrink-0 rounded-xl object-cover"
                      sizes="80px"
                      loading="lazy"
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

      {/* Mini player is now handled by GlobalMiniPlayer in _app.tsx */}

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
