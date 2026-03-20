import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Head from "next/head";
import Layout from "../../../components/Layout";
import GraphPageTemplate from "../../../components/GraphPageTemplate";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";
import { fetchAgents } from "../../../lib/cms";
import { AGENT_ONTOLOGY_CONFIG, classifyAgent } from "../../../data/agent-taxonomy";
import { AGENT_COLLECTIONS } from "../../../data/agent-collections";
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
    const allAgents = await fetchAgents(undefined, { maxRecords: 1000, sortBy: "latest" });
    const top = allAgents.filter((a) => a.name && a.slug).slice(0, 500);

    const { nodes, links } = buildGraphData(top, AGENT_COLLECTIONS, (item) => classifyAgent(item as Parameters<typeof classifyAgent>[0]));

    const catCounts: Record<string, number> = {};
    for (const n of nodes) catCounts[n.category] = (catCounts[n.category] || 0) + 1;

    const categoryBreakdown = AGENT_ONTOLOGY_CONFIG.categories
      .filter((c) => (catCounts[c.slug] || 0) > 0)
      .map((c) => ({ slug: c.slug, label: c.label, count: catCounts[c.slug] || 0, color: CATEGORY_COLORS[c.slug] || "#a1a1aa" }));

    return {
      props: {
        nodes, links, categoryBreakdown,
        linkTypeCounts: countLinksByType(links),
        totalCollections: AGENT_COLLECTIONS.length,
      },
      revalidate: 600,
    };
  } catch {
    return { props: { nodes: [], links: [], categoryBreakdown: [], linkTypeCounts: {}, totalCollections: 0 }, revalidate: 120 };
  }
};

export default function AgentGraphPage({ nodes, links, categoryBreakdown, linkTypeCounts, totalCollections }: InferGetStaticPropsType<typeof getStaticProps>) {
  const seoMeta: SeoMeta = {
    title: "Agent Relationship Graph | Colaberry AI",
    description: "Visualize how AI agents connect through shared capabilities, integrations, and workflows.",
    canonical: buildCanonical("/aixcelerator/agents/graph"),
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
        config={AGENT_ONTOLOGY_CONFIG}
        nodes={nodes} links={links}
        categoryBreakdown={categoryBreakdown}
        linkTypeCounts={linkTypeCounts}
        totalCollections={totalCollections}
      />
    </Layout>
  );
}
