import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import Layout from "../../components/Layout";
import SectionHeader from "../../components/SectionHeader";
import EnterpriseCtaBand from "../../components/EnterpriseCtaBand";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../lib/seo";
import {
  getDemoBySlug,
  getLiveDemoSlugs,
  type DemoConfig,
} from "../../data/demos";

interface DemoDetailPageProps {
  demo: DemoConfig;
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: getLiveDemoSlugs().map((slug) => ({ params: { slug } })),
    // `blocking` lets us add new demos to `src/data/demos.ts` without
    // regenerating static paths at build time — they get generated on first
    // request and then cached.
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps<DemoDetailPageProps> = async ({ params }) => {
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const demo = getDemoBySlug(slug);
  if (!demo) {
    return { notFound: true };
  }
  return {
    props: { demo },
    // 1-hour ISR — demo metadata is hand-authored and changes rarely.
    revalidate: 3600,
  };
};

export default function DemoDetailPage({ demo }: DemoDetailPageProps) {
  const isLive = demo.status === "live";

  const seoMeta: SeoMeta = {
    title: `${demo.title} | Colaberry AI Demos`,
    description: demo.tagline,
    canonical: buildCanonical(`/demo/${demo.slug}`),
  };

  // Schema.org WebApplication payload for AEO — demos are interactive apps,
  // not documents, so WebApplication is the correct type.
  const ldJson = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: demo.title,
    description: demo.summary,
    url: buildCanonical(`/demo/${demo.slug}`),
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    softwareVersion: demo.releaseVersion,
    ...(demo.lastUpdated ? { dateModified: demo.lastUpdated } : {}),
    featureList: demo.features.map((f) => f.title),
  };

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
            __html: JSON.stringify(ldJson).replace(/</g, "\\u003c"),
          }}
        />
      </Head>

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 text-xs text-zinc-500 dark:text-zinc-400"
      >
        <Link href="/demo" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Demos
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-zinc-700 dark:text-zinc-300">{demo.title}</span>
      </nav>

      {/* Hero */}
      <div className="reveal grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start lg:gap-12">
        <div>
          <SectionHeader
            as="h1"
            size="xl"
            kicker={demo.category}
            title={demo.title}
            description={demo.summary}
          />

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {isLive ? (
              <Link
                href={demo.launchUrl}
                className="inline-flex items-center gap-2 rounded-full bg-[#DC2626] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B91C1C] dark:bg-[#F87171] dark:text-zinc-950 dark:hover:bg-[#EF4444]"
              >
                Launch live demo
                <span aria-hidden="true">&rarr;</span>
              </Link>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                Coming soon
              </span>
            )}
            <Link
              href="/request-demo"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
            >
              Request a walkthrough
            </Link>
            {demo.releaseVersion ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" aria-hidden="true" />
                {demo.releaseVersion}
                {demo.lastUpdated ? ` · ${demo.lastUpdated}` : ""}
              </span>
            ) : null}
          </div>
        </div>

        {/* Walkthrough video — right column on lg+, stacks below CTAs on mobile */}
        <div className="flex flex-col gap-3">
          <div
            className="relative aspect-video w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900"
            data-testid="demo-video-slot"
          >
            {demo.videoEmbedUrl ? (
              // Self-hosted files (.mp4 / .webm / .ogg / .mov) render via
              // <video>; provider URLs (YouTube / Vimeo / Loom embed URLs)
              // render via <iframe>. Detection is by file extension on the
              // URL path (strip query/hash first).
              /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(demo.videoEmbedUrl) ? (
                <video
                  src={demo.videoEmbedUrl}
                  poster={demo.videoPoster}
                  controls
                  preload="metadata"
                  playsInline
                  className="absolute inset-0 h-full w-full bg-zinc-950 object-cover"
                >
                  Your browser does not support HTML5 video. You can still
                  <Link href={demo.launchUrl} className="underline"> launch the live demo</Link>.
                </video>
              ) : (
                <iframe
                  src={demo.videoEmbedUrl}
                  title={`${demo.title} walkthrough video`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              )
            ) : demo.videoPoster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={demo.videoPoster}
                alt={`${demo.title} walkthrough preview`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <span
                  aria-hidden="true"
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-400"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6"
                  >
                    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                  </svg>
                </span>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Walkthrough video coming soon
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Prefer a live session? Use &ldquo;Request a walkthrough&rdquo; above.
                </p>
              </div>
            )}
          </div>
          {demo.videoCaption ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {demo.videoCaption}
            </p>
          ) : null}
        </div>
      </div>

      {/* Metrics band */}
      {demo.metrics.length > 0 ? (
        <div className="stagger-grid mt-12 grid gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-700 sm:grid-cols-2 lg:grid-cols-4">
          {demo.metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex flex-col gap-1 bg-white p-5 dark:bg-zinc-950"
            >
              <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 sm:text-3xl">
                {metric.value}
              </div>
              <div className="text-xs uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Features */}
      <section className="reveal mt-16">
        <SectionHeader
          as="h2"
          size="lg"
          kicker="What you can do"
          title="Core capabilities"
          description="Hands-on features available when you launch the live demo."
          animate={false}
        />
        <div className="stagger-grid mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {demo.features.map((feature) => (
            <div
              key={feature.title}
              className="catalog-card flex flex-col gap-3 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-700"
            >
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="reveal mt-16">
        <SectionHeader
          as="h2"
          size="lg"
          kicker="Under the hood"
          title="Technology stack"
          description="Every layer of the stack — from database to 3D renderer."
          animate={false}
        />
        <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-[0.14em] text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Technology
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Role &amp; contribution
                </th>
              </tr>
            </thead>
            <tbody>
              {demo.techStack.map((row, idx) => (
                <tr
                  key={row.label}
                  className={
                    idx % 2 === 0
                      ? "bg-white dark:bg-zinc-950"
                      : "bg-zinc-50 dark:bg-zinc-900"
                  }
                >
                  <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {row.label}
                  </td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.role}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Launch CTA */}
      <section className="reveal mt-16">
        <div className="surface-panel flex flex-col items-start gap-4 rounded-2xl border border-zinc-200 p-8 dark:border-zinc-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#DC2626] dark:text-[#F87171]">
              Ready to try it
            </span>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 sm:text-xl">
              Launch the live {demo.title} demo
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Runs in your browser · camera processed locally · never stored.
            </p>
          </div>
          {isLive ? (
            <Link
              href={demo.launchUrl}
              className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-[#DC2626] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B91C1C] dark:bg-[#F87171] dark:text-zinc-950 dark:hover:bg-[#EF4444]"
            >
              Launch demo
              <span aria-hidden="true">&rarr;</span>
            </Link>
          ) : (
            <span className="inline-flex flex-shrink-0 items-center rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              Coming soon
            </span>
          )}
        </div>
      </section>

      <EnterpriseCtaBand
        kicker="AI platform"
        title="Build your own AI experience"
        description="Explore the full AIXcelerator platform — agents, skills, MCP servers, and the modular capability layers that power demos like this one."
        primaryHref="/request-demo"
        primaryLabel="Book a demo"
        secondaryHref="/aixcelerator"
        secondaryLabel="Explore AIXcelerator"
        className="mt-16"
      />
    </Layout>
  );
}

