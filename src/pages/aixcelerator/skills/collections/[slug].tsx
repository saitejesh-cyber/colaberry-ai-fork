import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback } from "react";
import Layout from "../../../../components/Layout";
import EnterprisePageHero from "../../../../components/EnterprisePageHero";
import EnterpriseCtaBand from "../../../../components/EnterpriseCtaBand";
import SkillCard from "../../../../components/SkillCard";
import CollectionGraph from "../../../../components/CollectionGraph";
import { fetchSkillBySlug, Skill } from "../../../../lib/cms";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../../lib/seo";
import { SKILL_COLLECTIONS, type SkillCollection } from "../../../../data/skill-collections";
import { SKILL_CATEGORIES, classifySkill } from "../../../../data/skill-taxonomy";
import {
  CATEGORY_COLORS,
  type GraphNode,
  type GraphLink,
} from "../../../../lib/graphUtils";
import type { SkillRelationType } from "../../../../data/skill-taxonomy";

/* ── Types ──────────────────────────────────────────────────────────── */

type CollectionDetailProps = {
  collection: SkillCollection;
  skills: Skill[];
  graphNodes: GraphNode[];
  graphLinks: GraphLink[];
};

/* ── Data fetching ──────────────────────────────────────────────────── */

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: SKILL_COLLECTIONS.map((c) => ({ params: { slug: c.slug } })),
  fallback: "blocking",
});

export const getStaticProps: GetStaticProps<CollectionDetailProps> = async ({ params }) => {
  const slug = String(params?.slug || "");
  const collection = SKILL_COLLECTIONS.find((c) => c.slug === slug);
  if (!collection) return { notFound: true, revalidate: 120 };

  const skills: Skill[] = [];
  for (const skillSlug of collection.skillSlugs) {
    try {
      const skill = await fetchSkillBySlug(skillSlug);
      if (skill) skills.push(skill);
    } catch {
      // Skill not found in CMS — skip
    }
  }

  // Build mini graph data for this collection
  const graphNodes: GraphNode[] = skills.map((skill) => {
    const cat = classifySkill(skill);
    const tagStrings = (skill.tags || [])
      .map((t) => (t.slug || t.name || "").toLowerCase())
      .filter(Boolean);
    return {
      id: skill.slug,
      name: skill.name,
      category: cat.slug,
      color: CATEGORY_COLORS[cat.slug] || "#a1a1aa",
      val: 1.5 + tagStrings.length * 0.3,
      tags: tagStrings,
    };
  });

  const graphLinks: GraphLink[] = [];
  const linkSet = new Set<string>();
  const addLink = (src: string, tgt: string, type: SkillRelationType) => {
    const key = [src, tgt].sort().join("|") + "|" + type;
    if (!linkSet.has(key)) {
      linkSet.add(key);
      graphLinks.push({ source: src, target: tgt, type });
    }
  };

  // compose_with: adjacent skills in collection ordering
  for (let i = 0; i < skills.length - 1; i++) {
    addLink(skills[i].slug, skills[i + 1].slug, "compose_with");
  }

  // similar_to: shared tags ≥ 1
  for (let i = 0; i < skills.length; i++) {
    const aTags = new Set(
      (skills[i].tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean),
    );
    if (aTags.size === 0) continue;
    for (let j = i + 1; j < skills.length; j++) {
      const bTags = (skills[j].tags || [])
        .map((t) => (t.slug || t.name || "").toLowerCase())
        .filter(Boolean);
      const shared = bTags.filter((t) => aTags.has(t)).length;
      if (shared >= 1) {
        addLink(skills[i].slug, skills[j].slug, "similar_to");
      }
    }
  }

  // depend_on: parse prerequisites
  for (const skill of skills) {
    if (!skill.prerequisites) continue;
    const prereqText = skill.prerequisites.toLowerCase();
    for (const other of skills) {
      if (other.slug === skill.slug) continue;
      const otherName = other.name.toLowerCase();
      if (
        prereqText.includes(other.slug) ||
        (otherName.length > 4 && prereqText.includes(otherName))
      ) {
        addLink(other.slug, skill.slug, "depend_on");
      }
    }
  }

  return {
    props: { collection, skills, graphNodes, graphLinks },
    revalidate: 600,
  };
};

/* ── Page component ─────────────────────────────────────────────────── */

export default function CollectionDetailPage({
  collection,
  skills,
  graphNodes,
  graphLinks,
}: CollectionDetailProps) {
  const router = useRouter();
  const category = SKILL_CATEGORIES.find((c) => c.slug === collection.category);
  const difficultyLabel = collection.difficulty.charAt(0).toUpperCase() + collection.difficulty.slice(1);

  const seoMeta: SeoMeta = {
    title: `${collection.name} | Skill Collections | Colaberry AI`,
    description: collection.description,
    canonical: buildCanonical(`/aixcelerator/skills/collections/${collection.slug}`),
  };

  const handleGraphNodeClick = useCallback(
    (nodeId: string) => {
      router.push(`/aixcelerator/skills/${nodeId}`);
    },
    [router],
  );

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) =>
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        )}
      </Head>

      <EnterprisePageHero
        kicker="Skill collection"
        title={collection.name}
        description={collection.description}
      />

      {/* Collection metadata */}
      <div className="reveal mt-6 flex flex-wrap items-center gap-3">
        {category && (
          <span className="chip chip-neutral rounded-full px-3 py-1.5 text-xs font-semibold">
            {category.label}
          </span>
        )}
        <span className="chip chip-neutral rounded-full px-3 py-1.5 text-xs font-semibold">
          {difficultyLabel}
        </span>
        {collection.keywordTags.length > 0 && (
          <>
            {collection.keywordTags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </>
        )}
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {collection.skillSlugs.length} skills in this collection
          {skills.length < collection.skillSlugs.length && ` · ${skills.length} available in catalog`}
        </span>
      </div>

      {/* Embedded Relationship Graph */}
      {graphNodes.length > 1 && (
        <section className="reveal mt-8">
          <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            Skill Relationship Graph
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Visualize how skills in this collection relate to each other. Click a node to view the skill.
          </p>
          <div className="mt-3">
            <CollectionGraph
              nodes={graphNodes}
              links={graphLinks}
              height={380}
              showLabels
              onNodeClick={handleGraphNodeClick}
            />
          </div>
        </section>
      )}

      {/* Skills grid */}
      {skills.length > 0 ? (
        <section className="reveal mt-8">
          <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            Skills in this collection
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill, index) => (
              <div key={skill.id} className="relative">
                <div className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900 z-10">
                  {index + 1}
                </div>
                <SkillCard skill={skill} />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="reveal mt-8 surface-panel p-8 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Skills in this collection are being populated. Check back as the catalog grows.
          </p>
          <Link
            href="/aixcelerator/skills"
            className="mt-4 inline-block text-sm font-semibold text-[#DC2626] hover:underline"
          >
            Browse all skills →
          </Link>
        </section>
      )}

      {/* Skill Pipeline Flow */}
      {skills.length > 1 && (
        <section className="reveal mt-8 surface-panel p-6">
          <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            Skill Pipeline Flow
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            How skills compose together in this collection — output of one feeds into the next.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {skills.map((skill, index) => (
              <div key={skill.id} className="flex items-center gap-2">
                <Link
                  href={`/aixcelerator/skills/${skill.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[8px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {index + 1}
                  </span>
                  {skill.name}
                </Link>
                {index < skills.length - 1 && (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden="true">
                    <path d="M5 12h14m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <EnterpriseCtaBand
        kicker="Skill collections"
        title="Explore more skill bundles"
        description="Browse curated collections of AI skills designed to work together."
        primaryHref="/aixcelerator/skills/collections"
        primaryLabel="All collections"
        secondaryHref="/aixcelerator/skills"
        secondaryLabel="Browse all skills"
        className="mt-16"
      />
    </Layout>
  );
}
