import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Head from "next/head";
import Layout from "../../../components/Layout";
import OntologyPageTemplate from "../../../components/OntologyPageTemplate";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";
import { fetchMCPCategoryCounts, fetchAllMCPTags } from "../../../lib/cms";
import { MCP_ONTOLOGY_CONFIG } from "../../../data/mcp-taxonomy";
import { MCP_COLLECTIONS } from "../../../data/mcp-collections";

/* ── Data fetching ─────────────────────────────────────────────────── */

type Props = {
  categoryCounts: Record<string, number>;
  totalItems: number;
  topTags: { name: string; slug: string; count: number }[];
};

export const getStaticProps: GetStaticProps<Props> = async () => {
  try {
    const [categoryCounts, allTags] = await Promise.all([
      fetchMCPCategoryCounts(),
      fetchAllMCPTags(),
    ]);
    const totalItems = Object.values(categoryCounts).reduce((s, c) => s + c, 0);
    return {
      props: { categoryCounts, totalItems, topTags: allTags.slice(0, 30) },
      revalidate: 600,
    };
  } catch {
    return {
      props: { categoryCounts: {}, totalItems: 0, topTags: [] },
      revalidate: 120,
    };
  }
};

/* ── Representative items for the SVG diagram ─────────────────────── */

const REPRESENTATIVE_ITEMS = [
  { slug: "postgres-mcp", name: "postgres", x: 80, y: 30 },
  { slug: "redis-mcp", name: "redis", x: 200, y: 60 },
  { slug: "slack-mcp", name: "slack", x: 350, y: 20 },
  { slug: "github-mcp", name: "github", x: 480, y: 50 },
  { slug: "brave-search", name: "brave-search", x: 620, y: 30 },
  { slug: "openai-mcp", name: "openai", x: 750, y: 60 },
];

const REPRESENTATIVE_EDGES = [
  { from: 0, to: 1, type: "similar_to" },
  { from: 2, to: 3, type: "interop_with" },
  { from: 3, to: 4, type: "complement" },
  { from: 4, to: 5, type: "similar_to" },
  { from: 0, to: 3, type: "belong_to" },
];

/* ── Page ──────────────────────────────────────────────────────────── */

export default function MCPOntologyPage({
  categoryCounts,
  totalItems,
  topTags,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const seoMeta: SeoMeta = {
    title: "MCP Server Ontology | Colaberry AI",
    description: "How MCP servers are organized into a structured, composable network — taxonomy, relation graph, and collection library.",
    canonical: buildCanonical("/aixcelerator/mcp/ontology"),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) =>
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        )}
      </Head>

      <OntologyPageTemplate
        config={MCP_ONTOLOGY_CONFIG}
        categoryCounts={categoryCounts}
        totalItems={totalItems}
        collections={MCP_COLLECTIONS}
        topTags={topTags}
        representativeItems={REPRESENTATIVE_ITEMS}
        representativeEdges={REPRESENTATIVE_EDGES}
      />
    </Layout>
  );
}
