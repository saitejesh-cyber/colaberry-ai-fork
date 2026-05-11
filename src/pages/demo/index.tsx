import Head from "next/head";
import Link from "next/link";
import Layout from "../../components/Layout";
import SectionHeader from "../../components/SectionHeader";
import EnterpriseCtaBand from "../../components/EnterpriseCtaBand";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../lib/seo";
import { demos, type DemoConfig } from "../../data/demos";

export default function DemoHub() {
  const seoMeta: SeoMeta = {
    title: "Live Demos | Colaberry AI",
    description:
      "Explore interactive AI demos built by Colaberry AI Research Labs — from virtual try-on to intelligent assistants.",
    canonical: buildCanonical("/demo"),
  };

  // ItemList JSON-LD for AEO — lets answer engines pick up the full demo
  // catalog in one structured payload.
  const ldJson = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Colaberry AI Live Demos",
    description: seoMeta.description,
    itemListElement: demos.map((demo, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "WebApplication",
        name: demo.title,
        description: demo.tagline,
        url: buildCanonical(`/demo/${demo.slug}`),
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
      },
    })),
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

      <div className="reveal">
        <SectionHeader
          as="h1"
          size="xl"
          kicker="Interactive Demos"
          title="Experience AI in action"
          description="Hands-on demos showcasing Colaberry AI Research Labs capabilities — from computer vision to intelligent assistants. Each demo runs live in your browser."
        />
      </div>

      <div className="stagger-grid mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {demos.map((demo) => (
          <DemoCard key={demo.slug} demo={demo} />
        ))}
      </div>

      <EnterpriseCtaBand
        kicker="AI platform"
        title="Ready to transform your workflows?"
        description="Explore the full AIXcelerator platform — agents, skills, MCP servers, and modular capability layers."
        primaryHref="/request-demo"
        primaryLabel="Book a demo"
        secondaryHref="/aixcelerator"
        secondaryLabel="Explore AIXcelerator"
        className="mt-16"
      />
    </Layout>
  );
}

function DemoCard({ demo }: { demo: DemoConfig }) {
  const isLive = demo.status === "live";

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            {demo.category}
          </span>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {demo.title}
          </h2>
        </div>
        {isLive ? (
          <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" aria-hidden="true" />
            Live
          </span>
        ) : (
          <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            Coming soon
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {demo.tagline}
      </p>
      {isLive ? (
        <span className="mt-auto text-sm font-medium text-[#DC2626] dark:text-[#F87171]">
          View demo details &rarr;
        </span>
      ) : null}
    </>
  );

  return isLive ? (
    <Link
      href={`/demo/${demo.slug}`}
      className="catalog-card group flex flex-col gap-4 rounded-2xl border border-zinc-200 p-6 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
    >
      {inner}
    </Link>
  ) : (
    <div className="catalog-card flex flex-col gap-4 rounded-2xl border border-zinc-200 p-6 opacity-60 dark:border-zinc-700">
      {inner}
    </div>
  );
}
