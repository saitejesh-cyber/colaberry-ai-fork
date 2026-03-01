import Head from "next/head";
import Layout from "../../components/Layout";
import Link from "next/link";
import SectionHeader from "../../components/SectionHeader";
import MediaPanel from "../../components/MediaPanel";
import { heroImage } from "../../lib/media";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../lib/seo";

export default function Books() {
  const seoMeta: SeoMeta = {
    title: "Books & Artifacts | Colaberry AI",
    description: "Books and companion artifacts including templates, worksheets, code samples, and related learning assets.",
    canonical: buildCanonical("/resources/books"),
  };

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
          "name": "Books & Artifacts",
          "description": "Books and companion artifacts including templates, worksheets, code samples, and related learning assets.",
          "url": buildCanonical("/resources/books"),
          "publisher": { "@type": "Organization", "name": "Colaberry AI" },
        }) }} />
      </Head>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <SectionHeader
            as="h1"
            size="xl"
            kicker="Resources"
            title="Books & artifacts"
            description="Books and companion artifacts (templates, worksheets, code samples, and related assets)."
          />
        </div>
        <MediaPanel
          kicker="Artifacts"
          title="Learning assets"
          description="Curated books and reusable artifacts."
          image={heroImage("hero-books-premium-v2.svg")}
          alt="Curated books and artifact knowledge surface"
          aspect="wide"
          fit="cover"
        />
      </div>

      <section id="trust-before-intelligence" className="surface-panel mt-6 p-6 sm:mt-8">
        <SectionHeader
          kicker="Featured book"
          title="Trust Before Intelligence"
          description="A foundational guide to responsible AI delivery—designed for leadership teams, operators, and LLM indexability."
          size="md"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            "Trust-by-design principles for enterprise AI adoption.",
            "Governance, reliability, and alignment frameworks.",
            "Practical checklists for teams and delivery leaders.",
            "LLM-ready summaries for faster discovery.",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-zinc-200/80 bg-white/90 p-4 text-sm text-zinc-700 shadow-sm"
            >
              {item}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="https://trustbeforeintelligence.ai/"
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
          >
            Visit Trust Before Intelligence
          </Link>
          <Link
            href="/resources"
            className="btn btn-secondary"
          >
            Back to Resources
          </Link>
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title="Books" description="Catalog books, chapters, and release notes." badge="Planned" />
        <Card
          title="Artifacts"
          description="Store/download templates, worksheets, and companion assets."
          badge="Planned"
        />
        <Card
          title="Learning paths"
          description="Curate reading + artifacts by role, industry, or solution."
          badge="Planned"
        />
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/resources"
          className="btn btn-secondary"
        >
          Back to Resources
        </Link>
        <Link
          href="/solutions"
          className="btn btn-primary"
        >
          Explore Solutions
        </Link>
      </div>
    </Layout>
  );
}

function Card({ title, description, badge }: { title: string; description: string; badge: string }) {
  return (
    <div className="surface-panel border border-zinc-200/80 bg-white/90 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-zinc-900">{title}</div>
          <div className="mt-1 text-sm text-zinc-600">{description}</div>
        </div>
        <span className="chip chip-muted rounded-full border border-zinc-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
          {badge}
        </span>
      </div>
    </div>
  );
}
