import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Head from "next/head";
import Layout from "../../../components/Layout";
import GraphPageTemplate from "../../../components/GraphPageTemplate";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";
import { fetchTools } from "../../../lib/cms";
import { TOOL_ONTOLOGY_CONFIG, classifyTool } from "../../../data/tool-taxonomy";
import { TOOL_COLLECTIONS } from "../../../data/tool-collections";
import { buildGraphData, CATEGORY_COLORS, countLinksByType, type GraphNode, type GraphLink } from "../../../lib/graphUtils";

type Props = {
  nodes: GraphNode[];
  links: GraphLink[];
  categoryBreakdown: { slug: string; label: string; count: number; color: string }[];
  linkTypeCounts: Record<string, number>;
  totalCollections: number;
};

export const getStaticProps: GetStaticProps<Props> = async () => {
  try {
    const allTools = await fetchTools({ maxRecords: 500 });
    const top = allTools.filter((t) => t.name && t.slug).slice(0, 300);

    const { nodes, links } = buildGraphData(top, TOOL_COLLECTIONS, (item) => classifyTool(item as any)); // eslint-disable-line @typescript-eslint/no-explicit-any

    const catCounts: Record<string, number> = {};
    for (const n of nodes) catCounts[n.category] = (catCounts[n.category] || 0) + 1;

    const categoryBreakdown = TOOL_ONTOLOGY_CONFIG.categories
      .filter((c) => (catCounts[c.slug] || 0) > 0)
      .map((c) => ({ slug: c.slug, label: c.label, count: catCounts[c.slug] || 0, color: CATEGORY_COLORS[c.slug] || "#a1a1aa" }));

    return {
      props: {
        nodes, links, categoryBreakdown,
        linkTypeCounts: countLinksByType(links),
        totalCollections: TOOL_COLLECTIONS.length,
      },
      revalidate: 600,
    };
  } catch {
    return { props: { nodes: [], links: [], categoryBreakdown: [], linkTypeCounts: {}, totalCollections: 0 }, revalidate: 120 };
  }
};

export default function ToolGraphPage({ nodes, links, categoryBreakdown, linkTypeCounts, totalCollections }: InferGetStaticPropsType<typeof getStaticProps>) {
  const seoMeta: SeoMeta = {
    title: "Tool Relationship Graph | Colaberry AI",
    description: "Visualize how tools connect through shared categories and usage patterns.",
    canonical: buildCanonical("/aixcelerator/tools/graph"),
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
        config={TOOL_ONTOLOGY_CONFIG}
        nodes={nodes} links={links}
        categoryBreakdown={categoryBreakdown}
        linkTypeCounts={linkTypeCounts}
        totalCollections={totalCollections}
      />
    </Layout>
  );
}
