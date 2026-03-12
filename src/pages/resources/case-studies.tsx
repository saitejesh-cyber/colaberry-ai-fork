import Head from "next/head";
import Layout from "../../components/Layout";
import Link from "next/link";
import SectionHeader from "../../components/SectionHeader";


import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../lib/seo";

export default function CaseStudiesHub() {
  const seoMeta: SeoMeta = {
    title: "Case Studies | Colaberry AI",
    description: "Browse delivery outcomes by industry. Each industry page contains detailed case studies with measurable results.",
    canonical: buildCanonical("/resources/case-studies"),
  };

  const industries = [
    { name: "Agriculture", slug: "agriculture" },
    { name: "Energy", slug: "energy" },
    { name: "Utilities", slug: "utilities" },
    { name: "Healthcare & Life Sciences", slug: "healthcare-life-sciences" },
    { name: "Climate Tech", slug: "climate-tech" },
    { name: "Manufacturing", slug: "manufacturing" },
    { name: "Fintech", slug: "fintech" },
    { name: "Supply Chain", slug: "supply-chain" },
  ];

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Colaberry AI Case Studies",
          "description": "Browse delivery outcomes by industry with detailed case studies and measurable results.",
          "url": buildCanonical("/resources/case-studies"),
          "publisher": { "@type": "Organization", "name": "Colaberry AI" },
        }) }} />
      </Head>
      <SectionHeader
        as="h1"
        size="xl"
        kicker="Resources"
        title="Case studies"
        description="Browse delivery outcomes by industry. Each industry page contains detailed case studies."
      />

      <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {industries.map((item) => (
          <Link
            key={item.slug}
            href={`/industries/${item.slug}`}
            className="surface-panel surface-hover surface-interactive group border border-zinc-200/80 bg-white/90 p-5 dark:border-zinc-700/80 dark:bg-zinc-900/90"
            aria-label={`View ${item.name} case studies`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">View case studies and outcomes.</div>
              </div>
              <div className="mt-0.5 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep">
                <span aria-hidden="true">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/resources"
          className="btn btn-secondary"
        >
          Back to Resources
        </Link>
        <Link
          href="/industries"
          className="btn btn-primary"
        >
          View Industries
        </Link>
      </div>
    </Layout>
  );
}
