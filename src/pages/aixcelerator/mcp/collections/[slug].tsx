import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Layout from "../../../../components/Layout";
import CollectionDetailTemplate from "../../../../components/CollectionDetailTemplate";
import MCPCard from "../../../../components/MCPCard";
import { fetchMCPServerBySlug, MCPServer } from "../../../../lib/cms";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../../lib/seo";
import { MCP_ONTOLOGY_CONFIG, classifyMCP } from "../../../../data/mcp-taxonomy";
import { MCP_COLLECTIONS } from "../../../../data/mcp-collections";
import { CATEGORY_COLORS, type GraphNode, type GraphLink } from "../../../../lib/graphUtils";
import type { ContentCollection, OntologyItem } from "../../../../lib/ontologyTypes";

/* ── Types ──────────────────────────────────────────────────────────── */

type Props = {
  collection: ContentCollection;
  items: OntologyItem[];
  mcpServers: MCPServer[];
  graphNodes: GraphNode[];
  graphLinks: GraphLink[];
};

/* ── Data fetching ─────────────────────────────────────────────────── */

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: MCP_COLLECTIONS.map((c) => ({ params: { slug: c.slug } })),
  fallback: "blocking",
});

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const slug = String(params?.slug || "");
  const collection = MCP_COLLECTIONS.find((c) => c.slug === slug);
  if (!collection) return { notFound: true, revalidate: 120 };

  const mcpServers: MCPServer[] = [];
  for (const itemSlug of collection.itemSlugs) {
    try {
      const mcp = await fetchMCPServerBySlug(itemSlug);
      if (mcp) mcpServers.push(mcp);
    } catch { /* skip */ }
  }

  // Convert to OntologyItem for the template
  const items: OntologyItem[] = mcpServers.map((m) => ({
    slug: m.slug,
    name: m.name,
    tags: m.tags,
    category: m.category,
  }));

  // Build graph data
  const graphNodes: GraphNode[] = mcpServers.map((mcp) => {
    const cat = classifyMCP(mcp);
    const tagStrings = (mcp.tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean);
    return {
      id: mcp.slug,
      name: mcp.name,
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

  // similar_to: shared tags ≥ 1
  for (let i = 0; i < mcpServers.length; i++) {
    const aTags = new Set((mcpServers[i].tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean));
    if (aTags.size === 0) continue;
    for (let j = i + 1; j < mcpServers.length; j++) {
      const bTags = (mcpServers[j].tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean);
      if (bTags.filter((t) => aTags.has(t)).length >= 1) {
        addLink(mcpServers[i].slug, mcpServers[j].slug, "similar_to");
      }
    }
  }

  // belong_to: same category
  for (let i = 0; i < mcpServers.length; i++) {
    const catI = classifyMCP(mcpServers[i]).slug;
    for (let j = i + 1; j < mcpServers.length; j++) {
      if (classifyMCP(mcpServers[j]).slug === catI) {
        addLink(mcpServers[i].slug, mcpServers[j].slug, "belong_to");
      }
    }
  }

  return {
    props: { collection, items, mcpServers, graphNodes, graphLinks },
    revalidate: 600,
  };
};

/* ── Page ──────────────────────────────────────────────────────────── */

export default function MCPCollectionDetailPage({ collection, items, mcpServers, graphNodes, graphLinks }: Props) {
  const seoMeta: SeoMeta = {
    title: `${collection.name} | MCP Collections | Colaberry AI`,
    description: collection.description,
    canonical: buildCanonical(`/aixcelerator/mcp/collections/${collection.slug}`),
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
        config={MCP_ONTOLOGY_CONFIG}
        collection={collection}
        items={items}
        graphNodes={graphNodes}
        graphLinks={graphLinks}
        renderItemCard={(_, index) => {
          const mcp = mcpServers[index];
          if (!mcp) return null;
          return (
            <div key={mcp.slug} className="relative">
              <div className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900 z-10">
                {index + 1}
              </div>
              <MCPCard mcp={mcp} />
            </div>
          );
        }}
      />
    </Layout>
  );
}
