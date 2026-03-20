import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Layout from "../../../../components/Layout";
import CollectionDetailTemplate from "../../../../components/CollectionDetailTemplate";
import ToolCard from "../../../../components/ToolCard";
import { fetchToolBySlug, Tool } from "../../../../lib/cms";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../../lib/seo";
import { TOOL_ONTOLOGY_CONFIG, classifyTool } from "../../../../data/tool-taxonomy";
import { TOOL_COLLECTIONS } from "../../../../data/tool-collections";
import { CATEGORY_COLORS, type GraphNode, type GraphLink } from "../../../../lib/graphUtils";
import type { ContentCollection, OntologyItem } from "../../../../lib/ontologyTypes";

type Props = {
  collection: ContentCollection;
  items: OntologyItem[];
  tools: Tool[];
  graphNodes: GraphNode[];
  graphLinks: GraphLink[];
};

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: TOOL_COLLECTIONS.map((c) => ({ params: { slug: c.slug } })),
  fallback: "blocking",
});

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const slug = String(params?.slug || "");
  const collection = TOOL_COLLECTIONS.find((c) => c.slug === slug);
  if (!collection) return { notFound: true, revalidate: 120 };

  const tools: Tool[] = [];
  for (const itemSlug of collection.itemSlugs) {
    try {
      const tool = await fetchToolBySlug(itemSlug);
      if (tool) tools.push(tool);
    } catch { /* skip */ }
  }

  const items: OntologyItem[] = tools.map((t) => ({
    slug: t.slug,
    name: t.name,
    category: t.toolCategory,
  }));

  const graphNodes: GraphNode[] = tools.map((tool) => {
    const cat = classifyTool(tool as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    return {
      id: tool.slug,
      name: tool.name,
      category: cat.slug,
      color: CATEGORY_COLORS[cat.slug] || "#a1a1aa",
      val: 2,
      tags: tool.toolCategory ? [tool.toolCategory.toLowerCase()] : [],
    };
  });

  const graphLinks: GraphLink[] = [];
  const linkSet = new Set<string>();
  const addLink = (src: string, tgt: string, type: string) => {
    const key = [src, tgt].sort().join("|") + "|" + type;
    if (!linkSet.has(key)) { linkSet.add(key); graphLinks.push({ source: src, target: tgt, type }); }
  };

  for (let i = 0; i < tools.length; i++) {
    const catI = classifyTool(tools[i] as any).slug; // eslint-disable-line @typescript-eslint/no-explicit-any
    for (let j = i + 1; j < tools.length; j++) {
      if (classifyTool(tools[j] as any).slug === catI) { // eslint-disable-line @typescript-eslint/no-explicit-any
        addLink(tools[i].slug, tools[j].slug, "belong_to");
      }
    }
  }

  return { props: { collection, items, tools, graphNodes, graphLinks }, revalidate: 600 };
};

export default function ToolCollectionDetailPage({ collection, items, tools, graphNodes, graphLinks }: Props) {
  const seoMeta: SeoMeta = {
    title: `${collection.name} | Tool Collections | Colaberry AI`,
    description: collection.description,
    canonical: buildCanonical(`/aixcelerator/tools/collections/${collection.slug}`),
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
        config={TOOL_ONTOLOGY_CONFIG}
        collection={collection}
        items={items}
        graphNodes={graphNodes}
        graphLinks={graphLinks}
        renderItemCard={(_, index) => {
          const tool = tools[index];
          if (!tool) return null;
          return (
            <div key={tool.slug} className="relative">
              <div className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900 z-10">
                {index + 1}
              </div>
              <ToolCard name={tool.name} slug={tool.slug} description={tool.description} toolCategory={tool.toolCategory} />
            </div>
          );
        }}
      />
    </Layout>
  );
}
