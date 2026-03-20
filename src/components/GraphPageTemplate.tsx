/**
 * GraphPageTemplate — Premium enterprise interactive force-graph page.
 * Full ForceGraph2D with search, edge filtering, zoom, fullscreen, dual legend.
 * Used by: skills/graph, mcp/graph, agents/graph, tools/graph, podcasts/graph
 *
 * Premium features:
 * - Radial gradient canvas background with subtle vignette
 * - Node outer glow via shadow blur for depth
 * - Thicker, more visible edges with curvature
 * - SVG icon controls (zoom, fullscreen, search)
 * - Hover glow ring on canvas + rich tooltip panel
 * - Responsive control bar with frosted-glass effect
 */

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SectionHeader from "./SectionHeader";
import EnterpriseCtaBand from "./EnterpriseCtaBand";
import {
  RELATIONSHIP_TYPE_COLORS,
  RELATIONSHIP_TYPE_LABELS,
  type GraphNode,
  type GraphLink,
} from "../lib/graphUtils";
import type { ContentOntologyConfig } from "../lib/ontologyTypes";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

/* ── Props ────────────────────────────────────────────────────────────── */

export type GraphPageTemplateProps = {
  config: ContentOntologyConfig;
  nodes: GraphNode[];
  links: GraphLink[];
  categoryBreakdown: { slug: string; label: string; count: number; color: string }[];
  linkTypeCounts: Record<string, number>;
  totalCollections?: number;
};

/* ── Inline SVG Icons ─────────────────────────────────────────────────── */

const IconZoomIn = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
);
const IconZoomOut = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
);
const IconMaximize = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
);
const IconMinimize = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
);
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
);
const IconReset = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
);

/* ── Hex to RGBA helper ──────────────────────────────────────────────── */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ── Component ────────────────────────────────────────────────────────── */

export default function GraphPageTemplate({
  config,
  nodes,
  links,
  categoryBreakdown,
  linkTypeCounts,
  totalCollections = 0,
}: GraphPageTemplateProps) {
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const edgeTypeKeys = useMemo(
    () => config.relationTypes.map((r) => r.type),
    [config.relationTypes],
  );

  const [enabledEdgeTypes, setEnabledEdgeTypes] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const key of config.relationTypes.map((r) => r.type)) {
      initial[key] = true;
    }
    return initial;
  });

  const graphRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Track hovered node ID for canvas glow ring
  const hoveredNodeIdRef = useRef<string | null>(null);

  const filteredLinks = useMemo(
    () => links.filter((l) => enabledEdgeTypes[l.type]),
    [links, enabledEdgeTypes],
  );

  const graphData = useMemo(
    () => ({ nodes: [...nodes], links: [...filteredLinks] }),
    [nodes, filteredLinks],
  );

  const handleNodeClick = useCallback((node: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (node?.id) {
      window.location.href = `${config.basePath}/${node.id}`;
    }
  }, [config.basePath]);

  const handleNodeHover = useCallback((node: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    hoveredNodeIdRef.current = node?.id || null;
    setHoveredNode(node || null);
  }, []);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    const query = searchQuery.toLowerCase();
    const match = nodes.find(
      (n) => n.name.toLowerCase().includes(query) || n.id.toLowerCase().includes(query),
    );
    if (match && graphRef.current) {
      setHighlightedNode(match.id);
      const internalNode = graphRef.current.graphData().nodes.find((n: any) => n.id === match.id); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (internalNode) {
        graphRef.current.centerAt(internalNode.x, internalNode.y, 1000);
        graphRef.current.zoom(4, 1000);
      }
      setTimeout(() => setHighlightedNode(null), 3000);
    }
  }, [searchQuery, nodes]);

  const toggleEdgeType = useCallback((type: string) => {
    setEnabledEdgeTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const zoomIn = useCallback(() => graphRef.current?.zoom(graphRef.current.zoom() * 1.5, 300), []);
  const zoomOut = useCallback(() => graphRef.current?.zoom(graphRef.current.zoom() / 1.5, 300), []);
  const zoomReset = useCallback(() => graphRef.current?.zoomToFit(400, 50), []);

  // Escape key exits fullscreen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isFullscreen]);

  // Directional edge types for this config
  const directionalTypes = useMemo(
    () => config.relationTypes.filter((r) => r.directional).map((r) => r.type),
    [config.relationTypes],
  );

  /* ── Control bar button classes ──────────────────────────────────────── */
  const ctrlBtn = "flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800/80 text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white";
  const ctrlBtnWide = "flex h-8 items-center justify-center gap-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/80 px-3 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white";

  const graphContainerClass = isFullscreen
    ? "fixed inset-0 z-50"
    : "reveal relative mt-4 overflow-hidden rounded-2xl border border-zinc-200/80 shadow-lg dark:border-zinc-700/60 dark:shadow-zinc-950/50";

  return (
    <>
      {!isFullscreen && (
        <div className="reveal grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <SectionHeader
            as="h1"
            size="xl"
            kicker="Ontology"
            title={`${config.labelSingular} Relationship Graph`}
            description={`Visualize connections between ${config.label.toLowerCase()} based on shared tags, categories, and dependencies. Click a node to view the ${config.labelSingular.toLowerCase()}.`}
          />
          <Link
            href={config.catalogPath}
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            ← Back to catalog
          </Link>
        </div>
      )}

      {/* Graph container with overlaid controls */}
      <div className={graphContainerClass} style={{ height: isFullscreen ? "100vh" : "680px" }}>
        {/* Overlaid control bar — frosted glass */}
        <div className={`absolute top-0 left-0 right-0 z-10 flex flex-wrap items-center gap-2.5 px-4 py-3 ${isFullscreen ? "bg-zinc-950/80" : "bg-zinc-900/70"} backdrop-blur-md`}>
          {/* Search */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={`Search ${config.label.toLowerCase()}...`}
                className="h-8 w-44 rounded-lg border border-zinc-600/50 bg-zinc-800/60 pl-8 pr-3 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/50"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500">
                <IconSearch />
              </span>
            </div>
            <button onClick={handleSearch} className={ctrlBtnWide} title="Search">Find</button>
          </div>

          {/* Separator */}
          <div className="mx-1 h-5 w-px bg-zinc-700/50" />

          {/* Edge type filters */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Edges</span>
            {edgeTypeKeys.map((type) => (
              <button
                key={type}
                onClick={() => toggleEdgeType(type)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-all ${
                  enabledEdgeTypes[type]
                    ? "border border-zinc-600/40 bg-zinc-800/60 text-zinc-200"
                    : "border border-transparent bg-transparent text-zinc-600 line-through"
                }`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full transition-opacity"
                  style={{ backgroundColor: RELATIONSHIP_TYPE_COLORS[type] || "#a1a1aa", opacity: enabledEdgeTypes[type] ? 1 : 0.2 }}
                />
                {RELATIONSHIP_TYPE_LABELS[type] || type}
                <span className="text-zinc-500">({linkTypeCounts[type] || 0})</span>
              </button>
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Zoom + fullscreen */}
          <div className="flex items-center gap-1">
            <button onClick={zoomIn} className={ctrlBtn} title="Zoom in"><IconZoomIn /></button>
            <button onClick={zoomOut} className={ctrlBtn} title="Zoom out"><IconZoomOut /></button>
            <button onClick={zoomReset} className={ctrlBtn} title="Reset zoom"><IconReset /></button>
            <div className="mx-0.5 h-5 w-px bg-zinc-700/50" />
            <button
              onClick={() => setIsFullscreen((prev) => !prev)}
              className={ctrlBtnWide}
              title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
            >
              {isFullscreen ? <><IconMinimize /> Exit</> : <><IconMaximize /> Fullscreen</>}
            </button>
          </div>
        </div>

        {/* Canvas */}
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
              const color = RELATIONSHIP_TYPE_COLORS[link.type];
              return color ? hexToRgba(color, 0.45) : "rgba(113,113,122,0.18)";
            }}
            linkWidth={(link: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              return directionalTypes.includes(link.type) ? 1.5 : 0.8;
            }}
            linkCurvature={0.15}
            linkDirectionalParticles={(link: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              return directionalTypes.includes(link.type) ? 3 : 0;
            }}
            linkDirectionalParticleSpeed={0.004}
            linkDirectionalParticleWidth={2.5}
            linkDirectionalParticleColor={(link: any) => RELATIONSHIP_TYPE_COLORS[link.type] || "#f87171"} // eslint-disable-line @typescript-eslint/no-explicit-any
            backgroundColor="#09090b"
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            cooldownTicks={80}
            nodeCanvasObjectMode={() => "after"}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              const x = node.x || 0;
              const y = node.y || 0;
              const nodeColor = node.color || "#a1a1aa";
              const isHighlighted = highlightedNode === node.id;
              const isHovered = hoveredNodeIdRef.current === node.id;
              const r = Math.sqrt(Math.max(node.val || 1, 0.5)) * 5;

              // Outer glow — always visible, gives depth
              ctx.save();
              ctx.shadowColor = nodeColor;
              ctx.shadowBlur = isHovered ? 18 : isHighlighted ? 22 : 8;
              ctx.beginPath();
              ctx.arc(x, y, r / globalScale, 0, 2 * Math.PI);
              ctx.fillStyle = isHighlighted ? "#DC2626" : nodeColor;
              ctx.fill();
              ctx.restore();

              // Highlight ring
              if (isHighlighted || isHovered) {
                ctx.beginPath();
                ctx.arc(x, y, (r + 4) / globalScale, 0, 2 * Math.PI);
                ctx.strokeStyle = isHighlighted ? "#DC2626" : hexToRgba(nodeColor, 0.6);
                ctx.lineWidth = 2 / globalScale;
                ctx.stroke();
              }

              // Label — visible at moderate zoom
              if (globalScale < 1.2) return;
              const label = node.name || "";
              const fontSize = Math.max(10 / globalScale, 2.5);
              ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";

              // Text shadow for readability
              ctx.fillStyle = "rgba(9,9,11,0.7)";
              ctx.fillText(label, x + 0.5, y + (r + 3) / globalScale + 0.5);
              ctx.fillStyle = "#e4e4e7";
              ctx.fillText(label, x, y + (r + 3) / globalScale);
            }}
            linkCanvasObjectMode={() => "after"}
            linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              if (globalScale < 2.5) return;
              const source = link.source;
              const target = link.target;
              if (!source?.x || !target?.x) return;
              const midX = (source.x + target.x) / 2;
              const midY = (source.y + target.y) / 2;
              const fontSize = Math.max(6 / globalScale, 1.5);
              ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
              ctx.textAlign = "center";
              ctx.fillStyle = RELATIONSHIP_TYPE_COLORS[link.type] || "#a1a1aa";
              ctx.fillText(RELATIONSHIP_TYPE_LABELS[link.type] || link.type, midX, midY - 3 / globalScale);
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            Loading graph data...
          </div>
        )}

        {/* Bottom gradient overlay for depth */}
        {!isFullscreen && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-zinc-950/60 to-transparent" />
        )}

        {/* Inline stats badge — bottom-left of canvas */}
        {!isFullscreen && (
          <div className="absolute bottom-3 left-4 z-10 flex items-center gap-3 rounded-lg bg-zinc-900/70 px-3 py-1.5 text-[10px] text-zinc-400 backdrop-blur-sm">
            <span><strong className="text-zinc-200">{nodes.length}</strong> nodes</span>
            <span className="h-3 w-px bg-zinc-700" />
            <span><strong className="text-zinc-200">{filteredLinks.length}</strong> edges</span>
            {totalCollections > 0 && (
              <>
                <span className="h-3 w-px bg-zinc-700" />
                <span><strong className="text-zinc-200">{totalCollections}</strong> collections</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Hovered node tooltip */}
      {hoveredNode && !isFullscreen && (
        <div className="mt-3 inline-flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <span className="mt-0.5 h-3 w-3 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: hoveredNode.color }} />
          <div>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{hoveredNode.name}</span>
            <span className="ml-2 text-xs capitalize text-zinc-500 dark:text-zinc-400">{hoveredNode.category.replace("-", " & ")}</span>
            {hoveredNode.tags && hoveredNode.tags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {hoveredNode.tags.slice(0, 6).map((tag) => (
                  <span key={tag} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{tag}</span>
                ))}
              </div>
            )}
          </div>
          <span className="mt-0.5 shrink-0 text-[10px] font-medium text-zinc-400">Click to view →</span>
        </div>
      )}

      {/* Legend */}
      {!isFullscreen && (
        <div className="reveal mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                Category Legend
              </h2>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.slug} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                      {cat.label} <span className="text-zinc-400 dark:text-zinc-500">({cat.count})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                Relationship Legend
              </h2>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {edgeTypeKeys.map((type) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-5 rounded-full" style={{ backgroundColor: RELATIONSHIP_TYPE_COLORS[type] || "#a1a1aa" }} />
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                      {RELATIONSHIP_TYPE_LABELS[type] || type} <span className="text-zinc-400 dark:text-zinc-500">({linkTypeCounts[type] || 0})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!isFullscreen && (
        <EnterpriseCtaBand
          kicker={`${config.labelSingular} graph`}
          title={`Explore ${config.label.toLowerCase()} in detail`}
          description={`Browse the full catalog with taxonomy filters, collections, and detailed specifications.`}
          primaryHref={config.catalogPath}
          primaryLabel={`Browse all ${config.label.toLowerCase()}`}
          secondaryHref={`${config.basePath}/ontology`}
          secondaryLabel="View ontology"
          className="mt-16"
        />
      )}
    </>
  );
}
