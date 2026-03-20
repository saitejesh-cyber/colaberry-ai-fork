/**
 * Skills Graph — Uses the generic GraphPageTemplate with skill-specific data.
 * Refactored from custom implementation to leverage premium template features.
 */

import type { GetStaticProps } from "next";
import Head from "next/head";
import Layout from "../../../components/Layout";
import GraphPageTemplate from "../../../components/GraphPageTemplate";
import { fetchSkills } from "../../../lib/cms";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";
import { SKILL_CATEGORIES, classifySkill, SKILL_ONTOLOGY_CONFIG } from "../../../data/skill-taxonomy";
import { SKILL_COLLECTIONS } from "../../../data/skill-collections";
import {
  buildGraphData,
  CATEGORY_COLORS,
  countLinksByType,
  type GraphNode,
  type GraphLink,
} from "../../../lib/graphUtils";

type GraphPageProps = {
  nodes: GraphNode[];
  links: GraphLink[];
  categoryBreakdown: { slug: string; label: string; count: number; color: string }[];
  linkTypeCounts: Record<string, number>;
  totalCollections: number;
};

export const getStaticProps: GetStaticProps<GraphPageProps> = async () => {
  try {
    const allSkills = await fetchSkills(undefined, { maxRecords: 1000, sortBy: "latest" });
    const top = allSkills.filter((s) => s.name && s.slug).slice(0, 500);

    const { nodes, links } = buildGraphData(top, SKILL_COLLECTIONS, classifySkill);

    const catCounts: Record<string, number> = {};
    for (const n of nodes) {
      catCounts[n.category] = (catCounts[n.category] || 0) + 1;
    }
    const categoryBreakdown = SKILL_CATEGORIES
      .filter((c) => (catCounts[c.slug] || 0) > 0)
      .map((c) => ({ slug: c.slug, label: c.label, count: catCounts[c.slug] || 0, color: CATEGORY_COLORS[c.slug] || "#a1a1aa" }));

    const collectionGroups = SKILL_COLLECTIONS.map((col) => ({
      slug: col.slug,
      name: col.name,
      nodeIds: col.skillSlugs.filter((s) => nodes.some((n) => n.id === s)),
    })).filter((g) => g.nodeIds.length > 0);

    return {
      props: {
        nodes,
        links,
        categoryBreakdown,
        linkTypeCounts: countLinksByType(links),
        totalCollections: collectionGroups.length,
      },
      revalidate: 600,
    };
  } catch {
    return { props: { nodes: [], links: [], categoryBreakdown: [], linkTypeCounts: {}, totalCollections: 0 }, revalidate: 120 };
  }
};

export default function SkillGraphPage({ nodes, links, categoryBreakdown, linkTypeCounts, totalCollections }: GraphPageProps) {
  const seoMeta: SeoMeta = {
    title: "Skill Relationship Graph | Colaberry AI",
    description: "Visualize how AI skills connect through shared tags, categories, and dependencies.",
    canonical: buildCanonical("/aixcelerator/skills/graph"),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) =>
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        )}
      </Head>

      <GraphPageTemplate
        config={SKILL_ONTOLOGY_CONFIG}
        nodes={nodes}
        links={links}
        categoryBreakdown={categoryBreakdown}
        linkTypeCounts={linkTypeCounts}
        totalCollections={totalCollections}
      />
    </Layout>
  );
}
