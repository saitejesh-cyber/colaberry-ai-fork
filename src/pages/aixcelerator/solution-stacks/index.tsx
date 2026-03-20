/**
 * Solution Stacks — Cross-type curated bundles listing page.
 */

import Head from "next/head";
import Link from "next/link";
import Layout from "../../../components/Layout";
import SectionHeader from "../../../components/SectionHeader";
import EnterpriseCtaBand from "../../../components/EnterpriseCtaBand";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";
import { SOLUTION_STACKS } from "../../../data/solution-stacks";

export default function SolutionStacksPage() {
  const seoMeta: SeoMeta = {
    title: "Solution Stacks | Colaberry AI",
    description: "Cross-type curated bundles — Agents + Skills + MCPs + Tools working together for real-world solutions.",
    canonical: buildCanonical("/aixcelerator/solution-stacks"),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) =>
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        )}
      </Head>

      <div className="reveal">
        <SectionHeader
          as="h1"
          size="xl"
          kicker="Solution Stacks"
          title="Cross-Type Solution Stacks"
          description="Pre-built combinations of Agents, Skills, MCP Servers, and Tools designed to solve real-world challenges end-to-end."
        />
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-700">
          <span className="font-bold text-zinc-900 dark:text-zinc-50">{SOLUTION_STACKS.length}</span>
          <span className="text-zinc-500 dark:text-zinc-400">Solution Stacks</span>
        </div>
      </div>

      <section className="stagger-grid mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SOLUTION_STACKS.map((stack) => (
          <Link
            key={stack.slug}
            href={`/aixcelerator/solution-stacks/${stack.slug}`}
            className="group block"
          >
            <div className="catalog-card flex h-full flex-col p-5">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{stack.name}</h2>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 line-clamp-3">
                {stack.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {stack.keywordTags.slice(0, 5).map((tag) => (
                  <span key={tag} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{tag}</span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-zinc-200/60 pt-3 dark:border-zinc-700/50">
                <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="inline-block" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {stack.items.length > 0 ? `${stack.items.length} items` : "Multi-type bundle"}
                </span>
                <span className="text-xs font-semibold text-[#DC2626] group-hover:underline dark:text-[#F87171]">View Stack →</span>
              </div>
            </div>
          </Link>
        ))}
      </section>

      <EnterpriseCtaBand
        kicker="Solution stacks"
        title="Explore the platform knowledge graph"
        description="Discover how Agents, Skills, MCPs, and Tools connect across the Colaberry AI platform."
        primaryHref="/aixcelerator/ontology"
        primaryLabel="Platform ontology"
        secondaryHref="/aixcelerator/ecosystem"
        secondaryLabel="Ecosystem graph"
        className="mt-16"
      />
    </Layout>
  );
}
