import type { GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import Layout from "../../../components/Layout";
import SectionHeader from "../../../components/SectionHeader";
import { fetchSkills, Skill } from "../../../lib/cms";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";
import { SKILL_CATEGORIES, classifySkill } from "../../../data/skill-taxonomy";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

/* ── Category colors (zinc-based for monochrome design system) ──────── */
const CATEGORY_COLORS: Record<string, string> = {
  development: "#60a5fa",
  "ai-generation": "#f87171",
  research: "#a78bfa",
  "data-science": "#34d399",
  business: "#fbbf24",
  testing: "#fb923c",
  productivity: "#38bdf8",
  security: "#f472b6",
  infrastructure: "#a3e635",
  other: "#94a3b8",
};
const ACCENT_COLOR = "#DC2626";

/* ── Types ──────────────────────────────────────────────────────────── */
type GraphNode = {
  id: string;
  name: string;
  category: string;
  color: string;
  val: number;
};
type GraphLink = {
  source: string;
  target: string;
  type: string;
};

/* ── Data fetching ──────────────────────────────────────────────────── */
type GraphPageProps = {
  nodes: GraphNode[];
  links: GraphLink[];
  categoryBreakdown: { slug: string; label: string; count: number; color: string }[];
};

export const getStaticProps: GetStaticProps<GraphPageProps> = async () => {
  try {
    const allSkills = await fetchSkills(undefined, { maxRecords: 500, sortBy: "latest" });
    const top = allSkills
      .filter((s) => s.name && s.slug)
      .slice(0, 200);

    // Build nodes
    const nodes: GraphNode[] = top.map((skill) => {
      const cat = classifySkill(skill);
      return {
        id: skill.slug,
        name: skill.name,
        category: cat.slug,
        color: CATEGORY_COLORS[cat.slug] || "#a1a1aa",
        val: 1 + (skill.tags?.length || 0) * 0.5,
      };
    });

    // Build links based on shared tags and same category
    const links: GraphLink[] = [];
    const linkSet = new Set<string>();
    const addLink = (src: string, tgt: string, type: string) => {
      const key = [src, tgt].sort().join("|");
      if (!linkSet.has(key)) {
        linkSet.add(key);
        links.push({ source: src, target: tgt, type });
      }
    };

    // Phase 1: Shared tags (similar_to) — threshold of 1+
    for (let i = 0; i < top.length; i++) {
      const a = top[i];
      const aTags = new Set((a.tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean));
      if (aTags.size === 0) continue;

      for (let j = i + 1; j < top.length; j++) {
        const b = top[j];
        const bTags = (b.tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean);
        const shared = bTags.filter((t) => aTags.has(t)).length;

        if (shared >= 1) {
          addLink(a.slug, b.slug, "similar_to");
        }
      }
    }

    // Phase 2: Same category links (belong_to) — connect each skill to up to 2 neighbors in same category
    const byCategory: Record<string, typeof top> = {};
    for (const skill of top) {
      const cat = classifySkill(skill).slug;
      (byCategory[cat] ??= []).push(skill);
    }
    for (const catSkills of Object.values(byCategory)) {
      for (let i = 0; i < catSkills.length - 1 && i < 80; i++) {
        addLink(catSkills[i].slug, catSkills[i + 1].slug, "belong_to");
      }
    }

    // Category breakdown for legend
    const catCounts: Record<string, number> = {};
    for (const n of nodes) {
      catCounts[n.category] = (catCounts[n.category] || 0) + 1;
    }
    const categoryBreakdown = SKILL_CATEGORIES
      .filter((c) => (catCounts[c.slug] || 0) > 0)
      .map((c) => ({ slug: c.slug, label: c.label, count: catCounts[c.slug] || 0, color: CATEGORY_COLORS[c.slug] || "#a1a1aa" }));

    return { props: { nodes, links, categoryBreakdown }, revalidate: 600 };
  } catch {
    return { props: { nodes: [], links: [], categoryBreakdown: [] }, revalidate: 120 };
  }
};

/* ── Page component ─────────────────────────────────────────────────── */
export default function SkillGraphPage({ nodes, links, categoryBreakdown }: GraphPageProps) {
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const graphRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  const graphData = useMemo(() => ({ nodes: [...nodes], links: [...links] }), [nodes, links]);

  const seoMeta: SeoMeta = {
    title: "Skill Relationship Graph | Colaberry AI",
    description: "Visualize how AI skills connect through shared tags, categories, and dependencies.",
    canonical: buildCanonical("/aixcelerator/skills/graph"),
  };

  const handleNodeClick = useCallback((node: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (node?.id) {
      window.location.href = `/aixcelerator/skills/${node.id}`;
    }
  }, []);

  const handleNodeHover = useCallback((node: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    setHoveredNode(node || null);
  }, []);

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) =>
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        )}
      </Head>

      <div className="reveal grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <SectionHeader
          as="h1"
          size="xl"
          kicker="Ontology"
          title="Skill Relationship Graph"
          description="Visualize connections between skills based on shared tags and categories. Click a node to view the skill."
        />
        <Link
          href="/aixcelerator/skills"
          className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          ← Back to catalog
        </Link>
      </div>

      {/* Graph container */}
      <div className="reveal mt-6 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-950" style={{ height: "600px" }}>
        {nodes.length > 0 ? (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeLabel="name"
            nodeColor="color"
            nodeRelSize={5}
            linkColor={() => "rgba(113,113,122,0.2)"}
            linkWidth={0.5}
            backgroundColor="#09090b"
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            nodeCanvasObjectMode={() => "after"}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              if (globalScale < 2) return;
              const label = node.name || "";
              const fontSize = 10 / globalScale;
              ctx.font = `${fontSize}px Inter, sans-serif`;
              ctx.textAlign = "center";
              ctx.fillStyle = "#fafafa";
              ctx.fillText(label, node.x || 0, (node.y || 0) + 8 / globalScale);
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            Loading skill graph data...
          </div>
        )}
      </div>

      {/* Hovered node info */}
      {hoveredNode && (
        <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{hoveredNode.name}</span>
          {" — "}
          <span className="capitalize">{hoveredNode.category.replace("-", " & ")}</span>
        </div>
      )}

      {/* Legend */}
      <div className="reveal mt-6 surface-panel p-5">
        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
          Category Legend
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {categoryBreakdown.map((cat) => (
            <div key={cat.slug} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                {cat.label} ({cat.count})
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Showing top {nodes.length} skills · {links.length} connections based on shared tags
        </p>
      </div>
    </Layout>
  );
}
