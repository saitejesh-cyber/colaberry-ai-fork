import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Layout from "../../../../components/Layout";
import CollectionDetailTemplate from "../../../../components/CollectionDetailTemplate";
import { fetchPodcastBySlug, PodcastEpisode } from "../../../../lib/cms";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../../lib/seo";
import { PODCAST_ONTOLOGY_CONFIG, classifyPodcast } from "../../../../data/podcast-taxonomy";
import { PODCAST_COLLECTIONS } from "../../../../data/podcast-collections";
import { CATEGORY_COLORS, type GraphNode, type GraphLink } from "../../../../lib/graphUtils";
import type { ContentCollection, OntologyItem } from "../../../../lib/ontologyTypes";

type Props = {
  collection: ContentCollection;
  items: OntologyItem[];
  graphNodes: GraphNode[];
  graphLinks: GraphLink[];
};

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: PODCAST_COLLECTIONS.map((c) => ({ params: { slug: c.slug } })),
  fallback: "blocking",
});

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const slug = String(params?.slug || "");
  const collection = PODCAST_COLLECTIONS.find((c) => c.slug === slug);
  if (!collection) return { notFound: true, revalidate: 120 };

  const episodes: PodcastEpisode[] = [];
  for (const itemSlug of collection.itemSlugs) {
    try {
      const ep = await fetchPodcastBySlug(itemSlug);
      if (ep) episodes.push(ep);
    } catch { /* skip */ }
  }

  const items: OntologyItem[] = episodes.map((e) => ({
    slug: e.slug,
    name: e.title,
    tags: e.tags,
  }));

  const graphNodes: GraphNode[] = episodes.map((ep) => {
    const cat = classifyPodcast(ep);
    const tagStrings = (ep.tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean);
    return {
      id: ep.slug,
      name: ep.title,
      category: cat.slug,
      color: CATEGORY_COLORS[cat.slug] || "#a1a1aa",
      val: 1.5 + tagStrings.length * 0.3,
      tags: tagStrings,
    };
  });

  const graphLinks: GraphLink[] = [];
  const linkSet = new Set<string>();
  const addLink = (src: string, tgt: string, type: string) => {
    const key = [src, tgt].sort().join("|") + "|" + type;
    if (!linkSet.has(key)) { linkSet.add(key); graphLinks.push({ source: src, target: tgt, type }); }
  };

  for (let i = 0; i < episodes.length; i++) {
    const aTags = new Set((episodes[i].tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean));
    if (aTags.size === 0) continue;
    for (let j = i + 1; j < episodes.length; j++) {
      const bTags = (episodes[j].tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean);
      if (bTags.filter((t) => aTags.has(t)).length >= 1) {
        addLink(episodes[i].slug, episodes[j].slug, "similar_to");
      }
    }
  }

  for (let i = 0; i < episodes.length; i++) {
    const catI = classifyPodcast(episodes[i]).slug;
    for (let j = i + 1; j < episodes.length; j++) {
      if (classifyPodcast(episodes[j]).slug === catI) {
        addLink(episodes[i].slug, episodes[j].slug, "belong_to");
      }
    }
  }

  return { props: { collection, items, graphNodes, graphLinks }, revalidate: 600 };
};

export default function PodcastCollectionDetailPage({ collection, items, graphNodes, graphLinks }: Props) {
  const seoMeta: SeoMeta = {
    title: `${collection.name} | Podcast Collections | Colaberry AI`,
    description: collection.description,
    canonical: buildCanonical(`/resources/podcasts/collections/${collection.slug}`),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) =>
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        )}
      </Head>
      <CollectionDetailTemplate
        config={PODCAST_ONTOLOGY_CONFIG}
        collection={collection}
        items={items}
        graphNodes={graphNodes}
        graphLinks={graphLinks}
      />
    </Layout>
  );
}
