import Head from "next/head";
import Link from "next/link";
import Layout from "../../../components/Layout";
import SectionHeader from "../../../components/SectionHeader";
import EnterpriseCtaBand from "../../../components/EnterpriseCtaBand";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";
import { SKILL_CATEGORIES } from "../../../data/skill-taxonomy";
import { SKILL_COLLECTIONS } from "../../../data/skill-collections";

const RELATIONSHIP_TYPES = [
  { type: "similar_to", label: "Similar To", description: "Functionally equivalent or substitutable skills", color: "#34d399", style: "dashed" },
  { type: "belong_to", label: "Belong To", description: "Hierarchical categorization within larger workflows", color: "#fbbf24", style: "solid" },
  { type: "compose_with", label: "Compose With", description: "Skills that combine together with output-to-input flow", color: "#60a5fa", style: "solid" },
  { type: "depend_on", label: "Depend On", description: "Prerequisites and environment setup requirements", color: "#f87171", style: "dashed" },
];

export default function OntologyPage() {
  const seoMeta: SeoMeta = {
    title: "Skill Ontology | Colaberry AI",
    description: "How skills are organized into a structured, composable network — taxonomy, relation graph, and package library.",
    canonical: buildCanonical("/aixcelerator/skills/ontology"),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) =>
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        )}
      </Head>

      <div className="reveal grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-start">
        <div>
          <SectionHeader
            as="h1"
            size="xl"
            kicker="Ontology"
            title="Skill Ontology"
            description="Skill Ontology organizes individual skills into a structured, composable network, enabling agents to reason, plan, and execute complex tasks as an extensible, maintainable capability system."
          />
          <div className="mt-6 rounded-xl border border-zinc-200/80 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span className="mr-1.5 inline-block rounded bg-[#DC2626]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#DC2626] dark:text-[#F87171]">How it works</span>
              When querying for a task, the system traverses this graph to identify the necessary collections and skills to construct a capable agent.
            </p>
          </div>
        </div>

        {/* 3-Layer Architecture Diagram */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
          {/* Layer 1: Skill Taxonomy */}
          <div className="rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-600">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Skill Taxonomy</div>
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">Skills</div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-1 text-[10px] text-zinc-400">has_category</div>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {SKILL_CATEGORIES.filter(c => c.slug !== "other").slice(0, 6).map((cat) => (
                <span key={cat.slug} className="rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:ring-blue-800">
                  {cat.label}
                </span>
              ))}
              <span className="rounded-md bg-zinc-50 px-2.5 py-1 text-[10px] font-semibold text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700">
                ...
              </span>
            </div>
            <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-zinc-400">has_tag</div>
            <div className="mt-1 flex flex-wrap justify-center gap-1">
              {["frontend", "python", "llm", "ai agents", "data", "security", "testing"].map((tag) => (
                <span key={tag} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{tag}</span>
              ))}
            </div>
          </div>

          {/* Arrow down */}
          <div className="flex justify-center py-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-zinc-400"><path d="M12 5v14m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
          </div>

          {/* Layer 2: Skill Relation Graph */}
          <div className="rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-600">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Skill Relation Graph</div>
            <div className="flex flex-wrap justify-center gap-3">
              {RELATIONSHIP_TYPES.map((rel) => (
                <div key={rel.type} className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: rel.color, borderStyle: rel.style === "dashed" ? "dashed" : "solid" }} />
                  <span className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400">{rel.type}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {["nextjs-expert", "seaborn", "matplotlib", "react-patterns", "playwright", "browser-automation"].map((skill) => (
                <span key={skill} className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-800">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Arrow down */}
          <div className="flex justify-center py-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-zinc-400"><path d="M12 5v14m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
          </div>

          {/* Layer 3: Skill Package Library */}
          <div className="rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-600">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Skill Package Library</div>
            <div className="flex flex-wrap justify-center gap-2">
              {SKILL_COLLECTIONS.slice(0, 4).map((col) => (
                <Link
                  key={col.slug}
                  href={`/aixcelerator/skills/collections/${col.slug}`}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-center hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
                >
                  <div className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">{col.slug}</div>
                  <div className="mt-0.5 text-[9px] text-zinc-400">{col.skillSlugs.length} skills</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Relationship Types Section */}
      <section className="reveal mt-12">
        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
          Relationship Types
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {RELATIONSHIP_TYPES.map((rel) => (
            <div key={rel.type} className="catalog-card p-5">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: rel.color }} />
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{rel.label}</span>
              </div>
              <code className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">{rel.type}</code>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{rel.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="reveal mt-12 grid gap-4 sm:grid-cols-3">
        <Link href="/aixcelerator/skills/graph" className="group catalog-card p-5 text-center">
          <div className="text-lg">🔗</div>
          <div className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">Skill Graph</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Interactive force-graph visualization</div>
          <div className="mt-2 text-xs font-semibold text-[#DC2626] group-hover:underline dark:text-[#F87171]">Explore →</div>
        </Link>
        <Link href="/aixcelerator/skills/collections" className="group catalog-card p-5 text-center">
          <div className="text-lg">📦</div>
          <div className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">Collections</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{SKILL_COLLECTIONS.length} curated skill bundles</div>
          <div className="mt-2 text-xs font-semibold text-[#DC2626] group-hover:underline dark:text-[#F87171]">Browse →</div>
        </Link>
        <Link href="/aixcelerator/skills" className="group catalog-card p-5 text-center">
          <div className="text-lg">⚡</div>
          <div className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">Skills Catalog</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Browse all skills with taxonomy filters</div>
          <div className="mt-2 text-xs font-semibold text-[#DC2626] group-hover:underline dark:text-[#F87171]">Browse →</div>
        </Link>
      </section>

      <EnterpriseCtaBand
        kicker="Skills ontology"
        title="Explore the skill network"
        description="Discover how AI skills connect, compose, and depend on each other across the platform."
        primaryHref="/aixcelerator/skills/graph"
        primaryLabel="View skill graph"
        secondaryHref="/aixcelerator/skills"
        secondaryLabel="Browse all skills"
        className="mt-16"
      />
    </Layout>
  );
}
