import { useState, useSyncExternalStore } from "react";
import Head from "next/head";
import Link from "next/link";
import Layout from "../../components/Layout";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../lib/seo";

const VOICE_AGENT_URL =
  process.env.NEXT_PUBLIC_VOICE_AGENT_URL || "http://localhost:3000";

export default function DemoVoice() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const theme = useSyncExternalStore(
    (onStoreChange) => {
      const observer = new MutationObserver(onStoreChange);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    },
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light") as "light" | "dark",
    () => "dark" as const,
  );

  const seoMeta: SeoMeta = {
    title: "Voice Agent Demo | Colaberry AI",
    description:
      "Real-time conversational voice agent powered by LiveKit, LangGraph, and multi-language speech (Sarvam + Groq + OpenAI) with sub-1.2s round-trip latency.",
    canonical: buildCanonical("/demo/voice"),
  };

  const iframeSrc = `${VOICE_AGENT_URL}?embedded=true&theme=${theme}`;

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) =>
          "rel" in props ? (
            <link key={key} {...props} />
          ) : (
            <meta key={key} {...props} />
          )
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Voice Agent",
              description: seoMeta.description,
              url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai"}/demo/voice`,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
            }).replace(/</g, "\\u003c"),
          }}
        />
        <link rel="preconnect" href={VOICE_AGENT_URL} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={VOICE_AGENT_URL} />
      </Head>

      {/* Compact title bar — keeps branding without eating viewport */}
      <div className="flex items-center justify-between pb-3 pt-1">
        <div className="flex items-center gap-3">
          <Link
            href="/demo/voice-agent"
            className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            aria-label="Back to demo details"
          >
            <span aria-hidden="true">&larr;</span>
            Details
          </Link>
          <span className="h-3 w-px bg-zinc-300 dark:bg-zinc-700" aria-hidden="true" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#DC2626] dark:text-[#F87171]">
            Live Demo
          </span>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 sm:text-xl">
            Voice Agent
          </h1>
        </div>
        <p className="hidden text-xs text-zinc-500 dark:text-zinc-400 sm:block">
          Audio processed via LiveKit &middot; never stored
        </p>
      </div>

      {/* Immersive iframe — fills remaining viewport */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700"
        style={{ height: "calc(100dvh - var(--site-header-height) - 72px)" }}
      >
        {!loaded && !error && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900"
          >
            <div className="flex flex-col items-center gap-3">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-[#DC2626] dark:border-zinc-600 dark:border-t-[#F87171]"
                aria-hidden="true"
              />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Loading demo&hellip;
              </p>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="absolute inset-0 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Demo temporarily unavailable
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Please try again later or{" "}
                <Link
                  href="/request-demo"
                  className="text-[#B91C1C] underline dark:text-[#EF4444]"
                >
                  request a live walkthrough
                </Link>
                .
              </p>
            </div>
          </div>
        )}

        {!error && (
          <iframe
            src={iframeSrc}
            allow="microphone; autoplay"
            title="Voice Agent Demo"
            aria-hidden={!loaded}
            className="h-full w-full"
            style={{
              border: "none",
              opacity: loaded ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        )}
      </div>
    </Layout>
  );
}
