import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Head from "next/head";
import Layout from "../../../components/Layout";
import OntologyPageTemplate from "../../../components/OntologyPageTemplate";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";
import { fetchToolCategoryCounts, fetchAllToolTags } from "../../../lib/cms";
import { TOOL_ONTOLOGY_CONFIG } from "../../../data/tool-taxonomy";
import { TOOL_COLLECTIONS } from "../../../data/tool-collections";

type Props = {
  categoryCounts: Record<string, number>;
  totalItems: number;
  topTags: { name: string; slug: string; count: number }[];
};

export const getStaticProps: GetStaticProps<Props> = async () => {
  try {
    const [categoryCounts, allTags] = await Promise.all([
      fetchToolCategoryCounts(),
      fetchAllToolTags(),
    ]);
    const totalItems = Object.values(categoryCounts).reduce((s, c) => s + c, 0);
    return { props: { categoryCounts, totalItems, topTags: allTags.slice(0, 30) }, revalidate: 600 };
  } catch {
    return { props: { categoryCounts: {}, totalItems: 0, topTags: [] }, revalidate: 120 };
  }
};

const REPRESENTATIVE_ITEMS = [
  { slug: "github", name: "github", x: 80, y: 30 },
  { slug: "vscode", name: "vscode", x: 200, y: 60 },
  { slug: "postgres", name: "postgres", x: 350, y: 20 },
  { slug: "redis", name: "redis", x: 480, y: 50 },
  { slug: "slack", name: "slack", x: 620, y: 30 },
  { slug: "docker", name: "docker", x: 750, y: 60 },
];

const REPRESENTATIVE_EDGES = [
  { from: 0, to: 1, type: "used_with" },
  { from: 2, to: 3, type: "similar_to" },
  { from: 3, to: 2, type: "replaces" },
  { from: 4, to: 0, type: "used_with" },
  { from: 5, to: 0, type: "belong_to" },
];

export default function ToolOntologyPage({ categoryCounts, totalItems, topTags }: InferGetStaticPropsType<typeof getStaticProps>) {
  const seoMeta: SeoMeta = {
    title: "Tool Ontology | Colaberry AI",
    description: "How tools are organized into a structured network — taxonomy, relation graph, and collection library.",
    canonical: buildCanonical("/aixcelerator/tools/ontology"),
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
        config={TOOL_ONTOLOGY_CONFIG}
        categoryCounts={categoryCounts}
        totalItems={totalItems}
        collections={TOOL_COLLECTIONS}
        topTags={topTags}
        representativeItems={REPRESENTATIVE_ITEMS}
        representativeEdges={REPRESENTATIVE_EDGES}
      />
    </Layout>
  );
}
