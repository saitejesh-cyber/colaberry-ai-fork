import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Head from "next/head";
import Layout from "../../../../components/Layout";
import CollectionsPageTemplate from "../../../../components/CollectionsPageTemplate";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../../lib/seo";
import { MCP_ONTOLOGY_CONFIG } from "../../../../data/mcp-taxonomy";
import { MCP_COLLECTIONS } from "../../../../data/mcp-collections";
import type { ContentCollection } from "../../../../lib/ontologyTypes";

/* ── Data fetching ─────────────────────────────────────────────────── */

type Props = {
  collections: ContentCollection[];
};

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: { collections: MCP_COLLECTIONS },
  revalidate: 600,
});

/* ── Page ──────────────────────────────────────────────────────────── */

export default function MCPCollectionsPage({
  collections,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const seoMeta: SeoMeta = {
    title: "MCP Server Collections | Colaberry AI",
    description: "Curated MCP server collections for real-world integration scenarios.",
    canonical: buildCanonical("/aixcelerator/mcp/collections"),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) =>
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        )}
      </Head>

      <CollectionsPageTemplate config={MCP_ONTOLOGY_CONFIG} collections={collections} />
    </Layout>
  );
}
