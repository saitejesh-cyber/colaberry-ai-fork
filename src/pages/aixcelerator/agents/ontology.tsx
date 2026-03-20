import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Head from "next/head";
import Layout from "../../../components/Layout";
import OntologyPageTemplate from "../../../components/OntologyPageTemplate";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";
import { fetchAgentCategoryCounts, fetchAllAgentTags } from "../../../lib/cms";
import { AGENT_ONTOLOGY_CONFIG } from "../../../data/agent-taxonomy";
import { AGENT_COLLECTIONS } from "../../../data/agent-collections";

type Props = {
  categoryCounts: Record<string, number>;
  totalItems: number;
  topTags: { name: string; slug: string; count: number }[];
};

export const getStaticProps: GetStaticProps<Props> = async () => {
  try {
    const [categoryCounts, allTags] = await Promise.all([
      fetchAgentCategoryCounts(),
      fetchAllAgentTags(),
    ]);
    const totalItems = Object.values(categoryCounts).reduce((s, c) => s + c, 0);
    return { props: { categoryCounts, totalItems, topTags: allTags.slice(0, 30) }, revalidate: 600 };
  } catch {
    return { props: { categoryCounts: {}, totalItems: 0, topTags: [] }, revalidate: 120 };
  }
};

const REPRESENTATIVE_ITEMS = [
  { slug: "code-reviewer", name: "code-reviewer", x: 80, y: 30 },
  { slug: "content-writer", name: "content-writer", x: 200, y: 60 },
  { slug: "data-analyst", name: "data-analyst", x: 350, y: 20 },
  { slug: "sales-outreach", name: "sales-outreach", x: 480, y: 50 },
  { slug: "research-assistant", name: "research-asst", x: 620, y: 30 },
  { slug: "support-bot", name: "support-bot", x: 750, y: 60 },
];

const REPRESENTATIVE_EDGES = [
  { from: 0, to: 2, type: "chains_with" },
  { from: 1, to: 3, type: "similar_to" },
  { from: 2, to: 4, type: "integrates_with" },
  { from: 4, to: 5, type: "chains_with" },
  { from: 0, to: 1, type: "belong_to" },
];

export default function AgentOntologyPage({ categoryCounts, totalItems, topTags }: InferGetStaticPropsType<typeof getStaticProps>) {
  const seoMeta: SeoMeta = {
    title: "Agent Ontology | Colaberry AI",
    description: "How AI agents are organized into a structured network — taxonomy, relation graph, and collection library.",
    canonical: buildCanonical("/aixcelerator/agents/ontology"),
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
        config={AGENT_ONTOLOGY_CONFIG}
        categoryCounts={categoryCounts}
        totalItems={totalItems}
        collections={AGENT_COLLECTIONS}
        topTags={topTags}
        representativeItems={REPRESENTATIVE_ITEMS}
        representativeEdges={REPRESENTATIVE_EDGES}
      />
    </Layout>
  );
}
