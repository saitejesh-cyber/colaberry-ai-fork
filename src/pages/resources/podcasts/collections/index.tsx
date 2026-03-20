import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Head from "next/head";
import Layout from "../../../../components/Layout";
import CollectionsPageTemplate from "../../../../components/CollectionsPageTemplate";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../../lib/seo";
import { PODCAST_ONTOLOGY_CONFIG } from "../../../../data/podcast-taxonomy";
import { PODCAST_COLLECTIONS } from "../../../../data/podcast-collections";
import type { ContentCollection } from "../../../../lib/ontologyTypes";

type Props = { collections: ContentCollection[] };

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: { collections: PODCAST_COLLECTIONS },
  revalidate: 600,
});

export default function PodcastCollectionsPage({ collections }: InferGetStaticPropsType<typeof getStaticProps>) {
  const seoMeta: SeoMeta = {
    title: "Podcast Collections | Colaberry AI",
    description: "Curated podcast episode collections organized by topic and theme.",
    canonical: buildCanonical("/resources/podcasts/collections"),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) =>
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        )}
      </Head>
      <CollectionsPageTemplate config={PODCAST_ONTOLOGY_CONFIG} collections={collections} />
    </Layout>
  );
}
