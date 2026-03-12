import Layout from "../../components/Layout";
import Head from "next/head";
import Link from "next/link";
import EnterprisePageHero from "../../components/EnterprisePageHero";

import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../lib/seo";

export default function WhitePapers() {
  const seoMeta: SeoMeta = {
    title: "White Papers | Colaberry AI",
    description: "Technical deep-dives, POVs, and reference architectures for enterprise teams deploying AI at scale.",
    canonical: buildCanonical("/resources/white-papers"),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              "name": "White Papers | Colaberry AI",
              "description": "Technical deep-dives, POVs, and reference architectures for enterprise teams deploying AI at scale.",
              "url": `${process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai"}/resources/white-papers`,
            }),
          }}
        />
      </Head>

      <EnterprisePageHero
        kicker="Resources"
        title="White papers"
        description="Technical deep-dives, POVs, and reference architectures for enterprise teams deploying AI at scale."
        chips={["Architecture", "Governance", "Playbooks", "POVs"]}
        primaryAction={{ label: "Open updates feed", href: "/updates" }}
        secondaryAction={{ label: "Back to resources", href: "/resources", variant: "secondary" }}
        metrics={[
          {
            label: "Focus",
            value: "Technical depth",
            note: "Implementation-ready guidance.",
          },
          {
            label: "Coverage",
            value: "Architecture + governance",
            note: "From system design to controls.",
          },
          {
            label: "Audience",
            value: "Engineering + leadership",
            note: "Built for cross-functional adoption.",
          },
        ]}
      />

      <div className="section-spacing grid gap-4 lg:grid-cols-3">
        <Card title="Reference architectures" description="Platform patterns and enterprise rollout." />
        <Card title="Governance" description="Controls, auditability, and risk management." />
        <Card title="Industry playbooks" description="Domain-specific delivery frameworks." />
      </div>

      <div className="section-spacing flex flex-col gap-3 sm:flex-row">
        <Link
          href="/resources"
          className="btn btn-secondary"
        >
          Back to Resources
        </Link>
        <Link
          href="/updates"
          className="btn btn-primary"
        >
          View News & Product
        </Link>
      </div>
    </Layout>
  );
}

function Card({ title, description }: { title: string; description: string }) {
  return (
    <div className="card-feature p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[0.9375rem] font-semibold text-zinc-900">{title}</div>
          <div className="mt-1 text-sm text-zinc-600">{description}</div>
        </div>
        <span className="chip chip-muted rounded-md px-2.5 py-1 text-xs font-semibold">
          Planned
        </span>
      </div>
    </div>
  );
}
