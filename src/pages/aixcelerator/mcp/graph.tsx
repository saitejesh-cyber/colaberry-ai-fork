import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Head from "next/head";
import Layout from "../../../components/Layout";
import GraphPageTemplate from "../../../components/GraphPageTemplate";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";
import { fetchMCPServers } from "../../../lib/cms";
import { MCP_ONTOLOGY_CONFIG, classifyMCP } from "../../../data/mcp-taxonomy";
import { MCP_COLLECTIONS } from "../../../data/mcp-collections";
import {
  buildGraphData,
  CATEGORY_COLORS,
  countLinksByType,
  type GraphNode,
  type GraphLink,
} from "../../../lib/graphUtils";

/* ── Types ──────────────────────────────────────────────────────────── */

type Props = {
  nodes: GraphNode[];
  links: GraphLink[];
  categoryBreakdown: { slug: string; label: string; count: number; color: string }[];
  linkTypeCounts: Record<string, number>;
  totalCollections: number;
};

/* ── Data fetching ─────────────────────────────────────────────────── */

export const getStaticProps: GetStaticProps<Props> = async () => {
  try {
    const allMCPs = await fetchMCPServers(undefined, { maxRecords: 1000, sortBy: "latest" });
    const top = allMCPs.filter((m) => m.name && m.slug).slice(0, 500);

    const { nodes, links } = buildGraphData(top, MCP_COLLECTIONS, (item) => classifyMCP(item as Parameters<typeof classifyMCP>[0]));

    const catCounts: Record<string, number> = {};
    for (const n of nodes) catCounts[n.category] = (catCounts[n.category] || 0) + 1;

    const categoryBreakdown = MCP_ONTOLOGY_CONFIG.categories
      .filter((c) => (catCounts[c.slug] || 0) > 0)
      .map((c) => ({ slug: c.slug, label: c.label, count: catCounts[c.slug] || 0, color: CATEGORY_COLORS[c.slug] || "#a1a1aa" }));

    const totalCollections = MCP_COLLECTIONS.filter((col) =>
      col.itemSlugs.some((s) => nodes.some((n) => n.id === s)),
    ).length;

    return {
      props: {
        nodes,
        links,
        categoryBreakdown,
        linkTypeCounts: countLinksByType(links),
        totalCollections,
      },
      revalidate: 600,
    };
  } catch {
    return { props: { nodes: [], links: [], categoryBreakdown: [], linkTypeCounts: {}, totalCollections: 0 }, revalidate: 120 };
  }
};

/* ── Page ──────────────────────────────────────────────────────────── */

export default function MCPGraphPage({
  nodes,
  links,
  categoryBreakdown,
  linkTypeCounts,
  totalCollections,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const seoMeta: SeoMeta = {
    title: "MCP Server Relationship Graph | Colaberry AI",
    description: "Visualize how MCP servers connect through shared tags, categories, and interoperability.",
    canonical: buildCanonical("/aixcelerator/mcp/graph"),
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
        config={MCP_ONTOLOGY_CONFIG}
        nodes={nodes}
        links={links}
        categoryBreakdown={categoryBreakdown}
        linkTypeCounts={linkTypeCounts}
        totalCollections={totalCollections}
      />
    </Layout>
  );
}
