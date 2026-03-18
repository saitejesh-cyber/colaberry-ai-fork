import type { GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import Layout from "../../../components/Layout";
import SectionHeader from "../../../components/SectionHeader";
import EnterpriseCtaBand from "../../../components/EnterpriseCtaBand";
import { fetchSkills, Skill } from "../../../lib/cms";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";
import { SKILL_CATEGORIES, classifySkill, type SkillRelationType } from "../../../data/skill-taxonomy";
import { SKILL_COLLECTIONS } from "../../../data/skill-collections";
import {
  buildGraphData,
  CATEGORY_COLORS,
  RELATIONSHIP_TYPE_COLORS,
  RELATIONSHIP_TYPE_LABELS,
  countLinksByType,
  type GraphNode,
  type GraphLink,
} from "../../../lib/graphUtils";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

/* ── Types ──────────────────────────────────────────────────────────── */
type GraphPageProps = {
  nodes: GraphNode[];
  links: GraphLink[];
  categoryBreakdown: { slug: string; label: string; count: number; color: string }[];
  linkTypeCounts: Record<string, number>;
  collectionGroups: { slug: string; name: string; nodeIds: string[] }[];
};

/* ── Data fetching ──────────────────────────────────────────────────── */
export const getStaticProps: GetStaticProps<GraphPageProps> = async () => {
  try {
    const allSkills = await fetchSkills(undefined, { maxRecords: 1000, sortBy: "latest" });
    const top = allSkills.filter((s) => s.name && s.slug).slice(0, 500);

    const { nodes, links } = buildGraphData(top, SKILL_COLLECTIONS, classifySkill);

    // Category breakdown for legend
    const catCounts: Record<string, number> = {};
    for (const n of nodes) {
      catCounts[n.category] = (catCounts[n.category] || 0) + 1;
    }
    const categoryBreakdown = SKILL_CATEGORIES
      .filter((c) => (catCounts[c.slug] || 0) > 0)
      .map((c) => ({ slug: c.slug, label: c.label, count: catCounts[c.slug] || 0, color: CATEGORY_COLORS[c.slug] || "#a1a1aa" }));

    // Collection groups (which nodes belong to which collections)
    const collectionGroups = SKILL_COLLECTIONS.map((col) => ({
      slug: col.slug,
      name: col.name,
      nodeIds: col.skillSlugs.filter((s) => nodes.some((n) => n.id === s)),
    })).filter((g) => g.nodeIds.length > 0);

    return {
      props: {
        nodes,
        links,
        categoryBreakdown,
        linkTypeCounts: countLinksByType(links),
        collectionGroups,
      },
      revalidate: 600,
    };
  } catch {
    return { props: { nodes: [], links: [], categoryBreakdown: [], linkTypeCounts: {}, collectionGroups: [] }, revalidate: 120 };
  }
};

/* ── Page component ─────────────────────────────────────────────────── */
export default function SkillGraphPage({ nodes, links, categoryBreakdown, linkTypeCounts, collectionGroups }: GraphPageProps) {
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [enabledEdgeTypes, setEnabledEdgeTypes] = useState<Record<SkillRelationType, boolean>>({
    similar_to: true,
    belong_to: true,
    compose_with: true,
    depend_on: true,
  });
  const graphRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Filter links by enabled edge types
  const filteredLinks = useMemo(
    () => links.filter((l) => enabledEdgeTypes[l.type]),
    [links, enabledEdgeTypes],
  );

  const graphData = useMemo(
    () => ({ nodes: [...nodes], links: [...filteredLinks] }),
    [nodes, filteredLinks],
  );

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

  // Search: find + zoom to node
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    const query = searchQuery.toLowerCase();
    const match = nodes.find(
      (n) => n.name.toLowerCase().includes(query) || n.id.toLowerCase().includes(query),
    );
    if (match && graphRef.current) {
      setHighlightedNode(match.id);
      // Find node position from the internal data
      const internalNode = graphRef.current.graphData().nodes.find((n: any) => n.id === match.id); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (internalNode) {
        graphRef.current.centerAt(internalNode.x, internalNode.y, 1000);
        graphRef.current.zoom(4, 1000);
      }
      setTimeout(() => setHighlightedNode(null), 3000);
    }
  }, [searchQuery, nodes]);

  // Toggle edge type
  const toggleEdgeType = useCallback((type: SkillRelationType) => {
    setEnabledEdgeTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => graphRef.current?.zoom(graphRef.current.zoom() * 1.5, 300), []);
  const zoomOut = useCallback(() => graphRef.current?.zoom(graphRef.current.zoom() / 1.5, 300), []);
  const zoomReset = useCallback(() => {
    graphRef.current?.zoomToFit(400, 50);
  }, []);

  const graphContainerClass = isFullscreen
    ? "fixed inset-0 z-50 bg-zinc-950"
    : "reveal mt-6 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-950";

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) =>
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        )}
      </Head>

      {!isFullscreen && (
        <div className="reveal grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <SectionHeader
            as="h1"
            size="xl"
            kicker="Ontology"
            title="Skill Relationship Graph"
            description="Visualize connections between skills based on shared tags, categories, and dependencies. Click a node to view the skill."
          />
          <Link
            href="/aixcelerator/skills"
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            ← Back to catalog
          </Link>
        </div>
      )}

      {/* Controls bar */}
      <div className={`${isFullscreen ? "fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-sm p-3" : "reveal mt-4"} flex flex-wrap items-center gap-3`}>
        {/* Search */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search skills..."
            className="h-8 w-48 rounded-full border border-zinc-300 bg-white px-3 text-xs text-zinc-900 placeholder-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
          />
          <button
            onClick={handleSearch}
            className="flex h-8 items-center gap-1 rounded-full bg-zinc-900 px-3 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Find
          </button>
        </div>

        {/* Edge type filters */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Edges:</span>
          {(Object.keys(RELATIONSHIP_TYPE_COLORS) as SkillRelationType[]).map((type) => (
            <button
              key={type}
              onClick={() => toggleEdgeType(type)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                enabledEdgeTypes[type]
                  ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  : "bg-transparent text-zinc-400 line-through dark:text-zinc-600"
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: RELATIONSHIP_TYPE_COLORS[type], opacity: enabledEdgeTypes[type] ? 1 : 0.3 }}
              />
              {RELATIONSHIP_TYPE_LABELS[type]}
              <span className="text-zinc-400 dark:text-zinc-500">({linkTypeCounts[type] || 0})</span>
            </button>
          ))}
        </div>

        {/* Zoom + fullscreen controls */}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={zoomIn} className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 text-xs text-white hover:bg-zinc-700" title="Zoom in">+</button>
          <button onClick={zoomOut} className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 text-xs text-white hover:bg-zinc-700" title="Zoom out">−</button>
          <button onClick={zoomReset} className="flex h-7 items-center justify-center rounded-md bg-zinc-800 px-2 text-[10px] text-white hover:bg-zinc-700" title="Reset zoom">Reset</button>
          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="flex h-7 items-center justify-center rounded-md bg-zinc-800 px-2 text-[10px] text-white hover:bg-zinc-700"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? "Exit FS" : "⛶ Fullscreen"}
          </button>
        </div>
      </div>

      {/* Graph container */}
      <div className={graphContainerClass} style={{ height: isFullscreen ? "100vh" : "650px" }}>
        {nodes.length > 0 ? (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeLabel=""
            nodeColor={(node: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              if (highlightedNode === node.id) return "#DC2626";
              return node.color;
            }}
            nodeRelSize={5}
            nodeVal={(node: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              if (highlightedNode === node.id) return 4;
              return node.val;
            }}
            linkColor={(link: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              const color = RELATIONSHIP_TYPE_COLORS[link.type as SkillRelationType];
              return color ? color + "66" : "rgba(113,113,122,0.2)"; // 40% opacity
            }}
            linkWidth={(link: any) => link.type === "compose_with" || link.type === "depend_on" ? 1.2 : 0.5} // eslint-disable-line @typescript-eslint/no-explicit-any
            linkDirectionalParticles={(link: any) => link.type === "depend_on" ? 2 : 0} // eslint-disable-line @typescript-eslint/no-explicit-any
            linkDirectionalParticleSpeed={0.005}
            linkDirectionalParticleColor={(link: any) => RELATIONSHIP_TYPE_COLORS[link.type as SkillRelationType] || "#f87171"} // eslint-disable-line @typescript-eslint/no-explicit-any
            backgroundColor="#09090b"
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            nodeCanvasObjectMode={() => "after"}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              // Highlight ring for searched node
              if (highlightedNode === node.id) {
                ctx.beginPath();
                ctx.arc(node.x || 0, node.y || 0, 8, 0, 2 * Math.PI);
                ctx.strokeStyle = "#DC2626";
                ctx.lineWidth = 2 / globalScale;
                ctx.stroke();
              }

              // Label at zoom level > 1.5
              if (globalScale < 1.5) return;
              const label = node.name || "";
              const fontSize = 10 / globalScale;
              ctx.font = `${fontSize}px Inter, sans-serif`;
              ctx.textAlign = "center";
              ctx.fillStyle = "#fafafa";
              ctx.fillText(label, node.x || 0, (node.y || 0) + 8 / globalScale);
            }}
            linkCanvasObjectMode={() => "after"}
            linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              // Show edge label when zoomed in
              if (globalScale < 2.5) return;
              const source = link.source;
              const target = link.target;
              if (!source?.x || !target?.x) return;

              const midX = (source.x + target.x) / 2;
              const midY = (source.y + target.y) / 2;
              const fontSize = 6 / globalScale;

              ctx.font = `${fontSize}px Inter, sans-serif`;
              ctx.textAlign = "center";
              ctx.fillStyle = RELATIONSHIP_TYPE_COLORS[link.type as SkillRelationType] || "#a1a1aa";
              ctx.fillText(link.type, midX, midY - 2 / globalScale);
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            Loading skill graph data...
          </div>
        )}
      </div>

      {/* Hovered node tooltip */}
      {hoveredNode && !isFullscreen && (
        <div className="mt-3 surface-panel p-3 inline-flex items-center gap-3">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: hoveredNode.color }} />
          <div>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{hoveredNode.name}</span>
            <span className="ml-2 text-xs capitalize text-zinc-500 dark:text-zinc-400">{hoveredNode.category.replace("-", " & ")}</span>
            {hoveredNode.tags && hoveredNode.tags.length > 0 && (
              <div className="mt-0.5 flex gap-1">
                {hoveredNode.tags.slice(0, 5).map((tag) => (
                  <span key={tag} className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{tag}</span>
                ))}
              </div>
            )}
          </div>
          <span className="text-[10px] text-zinc-400">Click to view →</span>
        </div>
      )}

      {/* Legend */}
      {!isFullscreen && (
        <div className="reveal mt-6 surface-panel p-5">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Category legend (nodes) */}
            <div>
              <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                Category Legend (Nodes)
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
            </div>

            {/* Relationship legend (edges) */}
            <div>
              <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                Relationship Legend (Edges)
              </h2>
              <div className="mt-3 flex flex-wrap gap-3">
                {(Object.keys(RELATIONSHIP_TYPE_COLORS) as SkillRelationType[]).map((type) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: RELATIONSHIP_TYPE_COLORS[type] }} />
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                      {RELATIONSHIP_TYPE_LABELS[type]} ({linkTypeCounts[type] || 0})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            Showing top {nodes.length} skills · {filteredLinks.length} connections · {collectionGroups.length} collections represented
          </p>
        </div>
      )}

      {!isFullscreen && (
        <EnterpriseCtaBand
          kicker="Skill graph"
          title="Explore skills in detail"
          description="Browse the full catalog with taxonomy filters, collections, and detailed specifications."
          primaryHref="/aixcelerator/skills"
          primaryLabel="Browse all skills"
          secondaryHref="/aixcelerator/skills/ontology"
          secondaryLabel="View ontology"
          className="mt-16"
        />
      )}
    </Layout>
  );
}
