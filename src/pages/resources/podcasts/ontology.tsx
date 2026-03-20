import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Head from "next/head";
import Layout from "../../../components/Layout";
import OntologyPageTemplate from "../../../components/OntologyPageTemplate";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";
import { fetchPodcastCategoryCounts, fetchAllPodcastTags } from "../../../lib/cms";
import { PODCAST_ONTOLOGY_CONFIG } from "../../../data/podcast-taxonomy";
import { PODCAST_COLLECTIONS } from "../../../data/podcast-collections";

type Props = {
  categoryCounts: Record<string, number>;
  totalItems: number;
  topTags: { name: string; slug: string; count: number }[];
};

export const getStaticProps: GetStaticProps<Props> = async () => {
  try {
    const [categoryCounts, allTags] = await Promise.all([
      fetchPodcastCategoryCounts(),
      fetchAllPodcastTags(),
    ]);
    const totalItems = Object.values(categoryCounts).reduce((s, c) => s + c, 0);
    return { props: { categoryCounts, totalItems, topTags: allTags.slice(0, 30) }, revalidate: 600 };
  } catch {
    return { props: { categoryCounts: {}, totalItems: 0, topTags: [] }, revalidate: 120 };
  }
};

const REPRESENTATIVE_ITEMS = [
  { slug: "ai-strategy", name: "ai-strategy", x: 80, y: 30 },
  { slug: "data-trends", name: "data-trends", x: 200, y: 60 },
  { slug: "cloud-native", name: "cloud-native", x: 350, y: 20 },
  { slug: "startup-stories", name: "startup-stories", x: 480, y: 50 },
  { slug: "ml-deep-dive", name: "ml-deep-dive", x: 620, y: 30 },
  { slug: "career-growth", name: "career-growth", x: 750, y: 60 },
];

const REPRESENTATIVE_EDGES = [
  { from: 0, to: 4, type: "similar_to" },
  { from: 1, to: 4, type: "references" },
  { from: 2, to: 0, type: "sequel_to" },
  { from: 3, to: 5, type: "similar_to" },
  { from: 0, to: 3, type: "belong_to" },
];

export default function PodcastOntologyPage({
  categoryCounts, totalItems, topTags,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const seoMeta: SeoMeta = {
    title: "Podcast Ontology | Colaberry AI",
    description: "How podcast episodes are organized into a structured network — taxonomy, relation graph, and collection library.",
    canonical: buildCanonical("/resources/podcasts/ontology"),
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
        config={PODCAST_ONTOLOGY_CONFIG}
        categoryCounts={categoryCounts}
        totalItems={totalItems}
        collections={PODCAST_COLLECTIONS}
        topTags={topTags}
        representativeItems={REPRESENTATIVE_ITEMS}
        representativeEdges={REPRESENTATIVE_EDGES}
      />
    </Layout>
  );
}
