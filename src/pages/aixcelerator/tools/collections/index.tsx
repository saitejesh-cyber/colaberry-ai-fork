import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Head from "next/head";
import Layout from "../../../../components/Layout";
import CollectionsPageTemplate from "../../../../components/CollectionsPageTemplate";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../../lib/seo";
import { TOOL_ONTOLOGY_CONFIG } from "../../../../data/tool-taxonomy";
import { TOOL_COLLECTIONS } from "../../../../data/tool-collections";
import type { ContentCollection } from "../../../../lib/ontologyTypes";

type Props = { collections: ContentCollection[] };

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: { collections: TOOL_COLLECTIONS },
  revalidate: 600,
});

export default function ToolCollectionsPage({ collections }: InferGetStaticPropsType<typeof getStaticProps>) {
  const seoMeta: SeoMeta = {
    title: "Tool Collections | Colaberry AI",
    description: "Curated tool collections for developer and data infrastructure needs.",
    canonical: buildCanonical("/aixcelerator/tools/collections"),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) =>
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        )}
      </Head>
      <CollectionsPageTemplate config={TOOL_ONTOLOGY_CONFIG} collections={collections} />
    </Layout>
  );
}
