import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Layout from "../../../../components/Layout";
import CollectionDetailTemplate from "../../../../components/CollectionDetailTemplate";
import AgentCard from "../../../../components/AgentCard";
import { fetchAgentBySlug, Agent } from "../../../../lib/cms";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../../lib/seo";
import { AGENT_ONTOLOGY_CONFIG, classifyAgent } from "../../../../data/agent-taxonomy";
import { AGENT_COLLECTIONS } from "../../../../data/agent-collections";
import { CATEGORY_COLORS, type GraphNode, type GraphLink } from "../../../../lib/graphUtils";
import type { ContentCollection, OntologyItem } from "../../../../lib/ontologyTypes";

type Props = {
  collection: ContentCollection;
  items: OntologyItem[];
  agents: Agent[];
  graphNodes: GraphNode[];
  graphLinks: GraphLink[];
};

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: AGENT_COLLECTIONS.map((c) => ({ params: { slug: c.slug } })),
  fallback: "blocking",
});

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const slug = String(params?.slug || "");
  const collection = AGENT_COLLECTIONS.find((c) => c.slug === slug);
  if (!collection) return { notFound: true, revalidate: 120 };

  const agents: Agent[] = [];
  for (const itemSlug of collection.itemSlugs) {
    try {
      const agent = await fetchAgentBySlug(itemSlug);
      if (agent) agents.push(agent);
    } catch { /* skip */ }
  }

  const items: OntologyItem[] = agents.map((a) => ({
    slug: a.slug,
    name: a.name,
    tags: a.tags,
    category: a.industry,
  }));

  const graphNodes: GraphNode[] = agents.map((agent) => {
    const cat = classifyAgent(agent);
    const tagStrings = (agent.tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean);
    return {
      id: agent.slug,
      name: agent.name,
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

  for (let i = 0; i < agents.length; i++) {
    const aTags = new Set((agents[i].tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean));
    if (aTags.size === 0) continue;
    for (let j = i + 1; j < agents.length; j++) {
      const bTags = (agents[j].tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean);
      if (bTags.filter((t) => aTags.has(t)).length >= 1) {
        addLink(agents[i].slug, agents[j].slug, "similar_to");
      }
    }
  }

  for (let i = 0; i < agents.length; i++) {
    const catI = classifyAgent(agents[i]).slug;
    for (let j = i + 1; j < agents.length; j++) {
      if (classifyAgent(agents[j]).slug === catI) {
        addLink(agents[i].slug, agents[j].slug, "belong_to");
      }
    }
  }

  return { props: { collection, items, agents, graphNodes, graphLinks }, revalidate: 600 };
};

export default function AgentCollectionDetailPage({ collection, items, agents, graphNodes, graphLinks }: Props) {
  const seoMeta: SeoMeta = {
    title: `${collection.name} | Agent Collections | Colaberry AI`,
    description: collection.description,
    canonical: buildCanonical(`/aixcelerator/agents/collections/${collection.slug}`),
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
        config={AGENT_ONTOLOGY_CONFIG}
        collection={collection}
        items={items}
        graphNodes={graphNodes}
        graphLinks={graphLinks}
        renderItemCard={(_, index) => {
          const agent = agents[index];
          if (!agent) return null;
          return (
            <div key={agent.slug} className="relative">
              <div className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900 z-10">
                {index + 1}
              </div>
              <AgentCard agent={agent} />
            </div>
          );
        }}
      />
    </Layout>
  );
}
