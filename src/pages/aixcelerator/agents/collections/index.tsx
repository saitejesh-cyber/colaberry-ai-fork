import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Head from "next/head";
import Layout from "../../../../components/Layout";
import CollectionsPageTemplate from "../../../../components/CollectionsPageTemplate";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../../lib/seo";
import { AGENT_ONTOLOGY_CONFIG } from "../../../../data/agent-taxonomy";
import { AGENT_COLLECTIONS } from "../../../../data/agent-collections";
import type { ContentCollection } from "../../../../lib/ontologyTypes";

type Props = { collections: ContentCollection[] };

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: { collections: AGENT_COLLECTIONS },
  revalidate: 600,
});

export default function AgentCollectionsPage({ collections }: InferGetStaticPropsType<typeof getStaticProps>) {
  const seoMeta: SeoMeta = {
    title: "Agent Collections | Colaberry AI",
    description: "Curated AI agent collections for end-to-end automation scenarios.",
    canonical: buildCanonical("/aixcelerator/agents/collections"),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) =>
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        )}
      </Head>
      <CollectionsPageTemplate config={AGENT_ONTOLOGY_CONFIG} collections={collections} />
    </Layout>
  );
}
