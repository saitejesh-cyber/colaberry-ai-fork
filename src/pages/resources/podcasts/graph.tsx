import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Head from "next/head";
import Layout from "../../../components/Layout";
import GraphPageTemplate from "../../../components/GraphPageTemplate";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";
import { fetchPodcastEpisodes } from "../../../lib/cms";
import { PODCAST_ONTOLOGY_CONFIG, classifyPodcast } from "../../../data/podcast-taxonomy";
import { PODCAST_COLLECTIONS } from "../../../data/podcast-collections";
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
    const allEpisodes = await fetchPodcastEpisodes({ maxRecords: 500, sortBy: "latest" });
    // Adapt PodcastEpisode (title) to OntologyItem shape (name)
    const adapted = allEpisodes.filter((e) => e.title && e.slug).slice(0, 300).map((e) => ({
      slug: e.slug,
      name: e.title,
      tags: e.tags,
      description: e.description,
      title: e.title,
    }));

    const { nodes, links } = buildGraphData(adapted, PODCAST_COLLECTIONS, (item) => classifyPodcast(item as any)); // eslint-disable-line @typescript-eslint/no-explicit-any

    const catCounts: Record<string, number> = {};
    for (const n of nodes) catCounts[n.category] = (catCounts[n.category] || 0) + 1;

    const categoryBreakdown = PODCAST_ONTOLOGY_CONFIG.categories
      .filter((c) => (catCounts[c.slug] || 0) > 0)
      .map((c) => ({ slug: c.slug, label: c.label, count: catCounts[c.slug] || 0, color: CATEGORY_COLORS[c.slug] || "#a1a1aa" }));

    return {
      props: {
        nodes, links, categoryBreakdown,
        linkTypeCounts: countLinksByType(links),
        totalCollections: PODCAST_COLLECTIONS.length,
      },
      revalidate: 600,
    };
  } catch {
    return { props: { nodes: [], links: [], categoryBreakdown: [], linkTypeCounts: {}, totalCollections: 0 }, revalidate: 120 };
  }
};

export default function PodcastGraphPage({ nodes, links, categoryBreakdown, linkTypeCounts, totalCollections }: InferGetStaticPropsType<typeof getStaticProps>) {
  const seoMeta: SeoMeta = {
    title: "Podcast Relationship Graph | Colaberry AI",
    description: "Visualize how podcast episodes connect through shared topics, guests, and themes.",
    canonical: buildCanonical("/resources/podcasts/graph"),
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
        config={PODCAST_ONTOLOGY_CONFIG}
        nodes={nodes} links={links}
        categoryBreakdown={categoryBreakdown}
        linkTypeCounts={linkTypeCounts}
        totalCollections={totalCollections}
      />
    </Layout>
  );
}
