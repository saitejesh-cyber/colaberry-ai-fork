import Layout from "../../components/Layout";
import Head from "next/head";
import Link from "next/link";
import EnterprisePageHero from "../../components/EnterprisePageHero";
import EnterpriseCtaBand from "../../components/EnterpriseCtaBand";

import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../lib/seo";
import type { GetStaticProps } from "next";
import { fetchAgents, fetchUseCases } from "../../lib/cms";

type SolutionsProps = { agentCount: number; useCaseCount: number };

export const getStaticProps: GetStaticProps<SolutionsProps> = async () => {
  let agentCount = 0;
  let useCaseCount = 0;
  try {
    const [agents, useCases] = await Promise.allSettled([
      fetchAgents("public"),
      fetchUseCases("public"),
    ]);
    if (agents.status === "fulfilled") agentCount = agents.value.length;
    if (useCases.status === "fulfilled") useCaseCount = useCases.value.length;
  } catch {}
  return { props: { agentCount, useCaseCount }, revalidate: 600 };
};

export default function Solutions({ agentCount, useCaseCount }: SolutionsProps) {
  const seoMeta: SeoMeta = {
    title: "Solutions | Colaberry AI - Packaged Offerings & Playbooks",
    description: "Packaged offerings and reusable solution patterns aligned to industries and delivery playbooks.",
    canonical: buildCanonical("/solutions"),
  };
  const solutions = [
    {
      title: "Agent operations",
      description: "Governed rollout patterns for agent ownership, lifecycle, and reliability.",
    },
    {
      title: "Knowledge assistants",
      description: "Secure retrieval + workflow assistants for enterprise teams.",
    },
    {
      title: "Document automation",
      description: "Summarization, extraction, drafting, and review with audit-ready metadata.",
    },
    {
      title: "MCP integration",
      description: "Standardized tool access for automation across systems.",
    },
    {
      title: "Governance & guardrails",
      description: "Policies, data boundaries, and controls for enterprise adoption.",
    },
    {
      title: "Industry playbooks",
      description: "Domain context and repeatable delivery patterns by industry.",
    },
  ];
  const solutionHighlights = [
    {
      title: "Operational playbooks",
      description: "Repeatable patterns ready for enterprise deployment.",
    },
    {
      title: "Governance baked in",
      description: "Approvals, ownership, and audit-ready delivery context.",
    },
    {
      title: "Integration ready",
      description: "MCP connectors and tool access with consistent patterns.",
    },
    {
      title: "Outcome aligned",
      description: "Mapped to industry outcomes and measurable value.",
    },
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
          "name": "Colaberry AI Solutions",
          "description": "Packaged offerings and reusable solution patterns for enterprise AI deployment.",
          "url": `${process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai"}/solutions`,
        }) }} />
      </Head>
      <EnterprisePageHero
        kicker="Solutions"
        title="Packaged offerings & playbooks"
        description="Repeatable solution patterns aligned to industries and delivery playbooks. Enterprise-grade governance, agent operations, and MCP integration."
      />

      <div className="reveal section-spacing grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {solutionHighlights.map((item) => (
          <div
            key={item.title}
            className="card-elevated p-4"
          >
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</div>
            <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{item.description}</div>
          </div>
        ))}
      </div>
      {agentCount > 0 || useCaseCount > 0 ? (
        <p className="mt-2 text-sm text-[#667085] dark:text-[#94A3B8]">
          Backed by {agentCount > 0 ? `${agentCount} agents` : ""}{agentCount > 0 && useCaseCount > 0 ? " and " : ""}{useCaseCount > 0 ? `${useCaseCount} use cases` : ""} in the catalog.
        </p>
      ) : null}

      <div className="reveal section-spacing grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {solutions.map((item) => (
          <div key={item.title} className="card-feature p-5">
            <div className="text-[0.9375rem] font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{item.description}</div>
            <div className="chip chip-muted mt-4 inline-flex items-center rounded-md border border-zinc-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
              Planned
            </div>
          </div>
        ))}
      </div>

      <div className="reveal section-spacing flex flex-col gap-3 sm:flex-row">
        <Link
          href="/use-cases"
          className="btn btn-primary"
        >
          Explore use cases
        </Link>
        <Link
          href="/industries"
          className="btn btn-secondary"
        >
          View industries
        </Link>
        <Link
          href="/resources"
          className="btn btn-ghost"
        >
          Explore resources
        </Link>
      </div>

      <EnterpriseCtaBand
        kicker="Get started"
        title="Ready to explore enterprise solutions?"
        description="Book a demo to see how Colaberry AI accelerates delivery across your organization."
        primaryHref="/request-demo"
        primaryLabel="Book a demo"
        secondaryHref="/use-cases"
        secondaryLabel="Explore use cases"
      />
    </Layout>
  );
}
