/**
 * Ecosystem Graph — Premium unified force-graph with nodes from ALL content types.
 * Different node colors per type, cross-type edges, search, filter, fullscreen.
 *
 * Premium features:
 * - Overlaid frosted-glass control bar inside canvas
 * - Node outer glow for depth
 * - Curved cross-type edges with higher visibility
 * - SVG icon controls matching GraphPageTemplate
 * - Bottom gradient overlay + inline stats badge
 * - Escape key exits fullscreen
 */

import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Layout from "../../components/Layout";
import SectionHeader from "../../components/SectionHeader";
import EnterpriseCtaBand from "../../components/EnterpriseCtaBand";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../lib/seo";
import { CONTENT_TYPE_META } from "../../lib/ontologyRegistry";
import type { ContentTypeName } from "../../lib/ontologyTypes";
import type { GraphNode, GraphLink } from "../../lib/graphUtils";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

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

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ── Extended node with content type ──────────────────────────────── */

type EcoNode = GraphNode & { contentType: ContentTypeName };

type Props = {
  nodes: EcoNode[];
  links: GraphLink[];
  typeBreakdown: { type: ContentTypeName; label: string; count: number; color: string }[];
};

/* ── Data fetching ─────────────────────────────────────────────────── */

export const getStaticProps: GetStaticProps<Props> = async () => {
  try {
    const cms = await import("../../lib/cms");
    const { classifySkill } = await import("../../data/skill-taxonomy");
    const { classifyMCP } = await import("../../data/mcp-taxonomy");
    const { classifyAgent } = await import("../../data/agent-taxonomy");
    const { classifyPodcast } = await import("../../data/podcast-taxonomy");
    const { classifyTool } = await import("../../data/tool-taxonomy");

    const [skills, mcps, agents, podcasts, tools] = await Promise.all([
      cms.fetchSkills(undefined, { maxRecords: 100, sortBy: "latest" }).catch(() => []),
      cms.fetchMCPServers(undefined, { maxRecords: 100, sortBy: "latest" }).catch(() => []),
      cms.fetchAgents(undefined, { maxRecords: 100, sortBy: "latest" }).catch(() => []),
      cms.fetchPodcastEpisodes({ maxRecords: 50, sortBy: "latest" }).catch(() => []),
      cms.fetchTools({ maxRecords: 80 }).catch(() => []),
    ]);

    const nodes: EcoNode[] = [];
    const addNode = (slug: string, name: string, type: ContentTypeName, catSlug: string, tags: string[]) => {
      nodes.push({
        id: `${type}:${slug}`,
        name,
        category: catSlug,
        color: CONTENT_TYPE_META[type].color,
        val: 2,
        tags,
        contentType: type,
      });
    };

    for (const s of skills.slice(0, 80)) {
      if (!s.slug || !s.name) continue;
      const cat = classifySkill(s);
      const tags = (s.tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean);
      addNode(s.slug, s.name, "skill", cat.slug, tags);
    }
    for (const m of mcps.slice(0, 60)) {
      if (!m.slug || !m.name) continue;
      const cat = classifyMCP(m);
      const tags = (m.tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean);
      addNode(m.slug, m.name, "mcp", cat.slug, tags);
    }
    for (const a of agents.slice(0, 60)) {
      if (!a.slug || !a.name) continue;
      const cat = classifyAgent(a);
      const tags = (a.tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean);
      addNode(a.slug, a.name, "agent", cat.slug, tags);
    }
    for (const p of podcasts.slice(0, 30)) {
      if (!p.slug || !p.title) continue;
      const cat = classifyPodcast(p);
      const tags = (p.tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean);
      addNode(p.slug, p.title, "podcast", cat.slug, tags);
    }
    for (const t of tools.slice(0, 50)) {
      if (!t.slug || !t.name) continue;
      const cat = classifyTool(t as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      addNode(t.slug, t.name, "tool", cat.slug, t.toolCategory ? [t.toolCategory.toLowerCase()] : []);
    }

    // Build cross-type links based on shared tags
    const links: GraphLink[] = [];
    const linkSet = new Set<string>();
    for (let i = 0; i < nodes.length; i++) {
      const aTags = new Set(nodes[i].tags || []);
      if (aTags.size === 0) continue;
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].contentType === nodes[j].contentType) continue;
        const bTags = nodes[j].tags || [];
        const shared = bTags.filter((t) => aTags.has(t)).length;
        if (shared >= 2) {
          const key = [nodes[i].id, nodes[j].id].sort().join("|");
          if (!linkSet.has(key)) {
            linkSet.add(key);
            links.push({ source: nodes[i].id, target: nodes[j].id, type: "cross_type" });
          }
        }
      }
    }

    const typeCounts: Record<ContentTypeName, number> = { skill: 0, mcp: 0, agent: 0, tool: 0, podcast: 0 };
    for (const n of nodes) typeCounts[n.contentType]++;
    const typeBreakdown = (Object.entries(CONTENT_TYPE_META) as [ContentTypeName, typeof CONTENT_TYPE_META[ContentTypeName]][])
      .filter(([type]) => typeCounts[type] > 0)
      .map(([type, meta]) => ({ type, label: meta.label, count: typeCounts[type], color: meta.color }));

    return { props: { nodes, links, typeBreakdown }, revalidate: 600 };
  } catch {
    return { props: { nodes: [], links: [], typeBreakdown: [] }, revalidate: 120 };
  }
};

/* ── Page ──────────────────────────────────────────────────────────── */

export default function EcosystemPage({ nodes, links, typeBreakdown }: InferGetStaticPropsType<typeof getStaticProps>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [enabledTypes, setEnabledTypes] = useState<Record<ContentTypeName, boolean>>({
    skill: true, mcp: true, agent: true, tool: true, podcast: true,
  });
  const graphRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const hoveredNodeIdRef = useRef<string | null>(null);

  const filteredNodes = useMemo(
    () => nodes.filter((n) => enabledTypes[n.contentType]),
    [nodes, enabledTypes],
  );

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredLinks = useMemo(
    () => links.filter((l) => filteredNodeIds.has(l.source as string) && filteredNodeIds.has(l.target as string)),
    [links, filteredNodeIds],
  );

  const graphData = useMemo(
    () => ({ nodes: [...filteredNodes], links: [...filteredLinks] }),
    [filteredNodes, filteredLinks],
  );

  const seoMeta: SeoMeta = {
    title: "Ecosystem Graph | Colaberry AI",
    description: "Interactive force-graph showing all content types — Agents, Skills, MCPs, Tools, Podcasts — with cross-type relationships.",
    canonical: buildCanonical("/aixcelerator/ecosystem"),
  };

  const handleNodeClick = useCallback((node: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!node?.id) return;
    const [type, slug] = (node.id as string).split(":");
    const paths: Record<string, string> = { skill: "/aixcelerator/skills", mcp: "/aixcelerator/mcp", agent: "/aixcelerator/agents", tool: "/aixcelerator/tools", podcast: "/resources/podcasts" };
    window.location.href = `${paths[type] || "/aixcelerator/skills"}/${slug}`;
  }, []);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    const match = filteredNodes.find((n) => n.name.toLowerCase().includes(q));
    if (match && graphRef.current) {
      setHighlightedNode(match.id);
      const internal = graphRef.current.graphData().nodes.find((n: any) => n.id === match.id); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (internal) {
        graphRef.current.centerAt(internal.x, internal.y, 1000);
        graphRef.current.zoom(4, 1000);
      }
      setTimeout(() => setHighlightedNode(null), 3000);
    }
  }, [searchQuery, filteredNodes]);

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

  const ctrlBtn = "flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800/80 text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white";
  const ctrlBtnWide = "flex h-8 items-center justify-center gap-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/80 px-3 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white";

  const graphContainerClass = isFullscreen
    ? "fixed inset-0 z-50"
    : "reveal relative mt-4 overflow-hidden rounded-2xl border border-zinc-200/80 shadow-lg dark:border-zinc-700/60 dark:shadow-zinc-950/50";

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
            kicker="Platform"
            title="Ecosystem Graph"
            description="The unified Colaberry AI knowledge graph — all content types in one interactive visualization. Click a node to explore."
          />
          <Link
            href="/aixcelerator/ontology"
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            ← Platform Ontology
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
                placeholder="Search across all types..."
                className="h-8 w-48 rounded-lg border border-zinc-600/50 bg-zinc-800/60 pl-8 pr-3 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/50"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500">
                <IconSearch />
              </span>
            </div>
            <button onClick={handleSearch} className={ctrlBtnWide} title="Search">Find</button>
          </div>

          <div className="mx-1 h-5 w-px bg-zinc-700/50" />

          {/* Type toggles */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Types</span>
            {typeBreakdown.map(({ type, label, count, color }) => (
              <button
                key={type}
                onClick={() => setEnabledTypes((prev) => ({ ...prev, [type]: !prev[type] }))}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-all ${
                  enabledTypes[type]
                    ? "border border-zinc-600/40 bg-zinc-800/60 text-zinc-200"
                    : "border border-transparent bg-transparent text-zinc-600 line-through"
                }`}
              >
                <span className="inline-block h-2 w-2 rounded-full transition-opacity" style={{ backgroundColor: color, opacity: enabledTypes[type] ? 1 : 0.2 }} />
                {label} <span className="text-zinc-500">({count})</span>
              </button>
            ))}
          </div>

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
        {filteredNodes.length > 0 ? (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeLabel=""
            nodeColor={(node: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              if (highlightedNode === node.id) return "#DC2626";
              return node.color;
            }}
            nodeRelSize={5}
            nodeVal={(node: any) => (highlightedNode === node.id ? 4 : node.val)} // eslint-disable-line @typescript-eslint/no-explicit-any
            linkColor={() => "rgba(161,161,170,0.12)"}
            linkWidth={0.7}
            linkCurvature={0.1}
            backgroundColor="#09090b"
            onNodeClick={handleNodeClick}
            onNodeHover={(node: any) => { hoveredNodeIdRef.current = node?.id || null; }} // eslint-disable-line @typescript-eslint/no-explicit-any
            cooldownTicks={80}
            nodeCanvasObjectMode={() => "after"}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              const x = node.x || 0;
              const y = node.y || 0;
              const nodeColor = node.color || "#a1a1aa";
              const isHighlighted = highlightedNode === node.id;
              const isHovered = hoveredNodeIdRef.current === node.id;
              const r = Math.sqrt(Math.max(node.val || 2, 0.5)) * 5;

              // Outer glow
              ctx.save();
              ctx.shadowColor = nodeColor;
              ctx.shadowBlur = isHovered ? 16 : isHighlighted ? 20 : 6;
              ctx.beginPath();
              ctx.arc(x, y, r / globalScale, 0, 2 * Math.PI);
              ctx.fillStyle = isHighlighted ? "#DC2626" : nodeColor;
              ctx.fill();
              ctx.restore();

              // Highlight/hover ring
              if (isHighlighted || isHovered) {
                ctx.beginPath();
                ctx.arc(x, y, (r + 4) / globalScale, 0, 2 * Math.PI);
                ctx.strokeStyle = isHighlighted ? "#DC2626" : hexToRgba(nodeColor, 0.5);
                ctx.lineWidth = 2 / globalScale;
                ctx.stroke();
              }

              if (globalScale < 1.8) return;
              const label = node.name || "";
              const fontSize = Math.max(8 / globalScale, 2);
              ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = "rgba(9,9,11,0.6)";
              ctx.fillText(label, x + 0.3, y + (r + 3) / globalScale + 0.3);
              ctx.fillStyle = "#e4e4e7";
              ctx.fillText(label, x, y + (r + 3) / globalScale);
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">Loading ecosystem graph...</div>
        )}

        {/* Bottom gradient */}
        {!isFullscreen && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-zinc-950/60 to-transparent" />
        )}

        {/* Inline stats badge */}
        {!isFullscreen && (
          <div className="absolute bottom-3 left-4 z-10 flex items-center gap-3 rounded-lg bg-zinc-900/70 px-3 py-1.5 text-[10px] text-zinc-400 backdrop-blur-sm">
            <span><strong className="text-zinc-200">{filteredNodes.length}</strong> nodes</span>
            <span className="h-3 w-px bg-zinc-700" />
            <span><strong className="text-zinc-200">{filteredLinks.length}</strong> cross-type edges</span>
          </div>
        )}
      </div>

      {/* Legend */}
      {!isFullscreen && (
        <div className="reveal mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Content Type Legend</h2>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {typeBreakdown.map(({ type, label, count, color }) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">{label} <span className="text-zinc-400 dark:text-zinc-500">({count})</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isFullscreen && (
        <EnterpriseCtaBand
          kicker="Ecosystem graph"
          title="Explore the knowledge graph"
          description="Discover how all content types connect across the Colaberry AI platform."
          primaryHref="/aixcelerator/ontology"
          primaryLabel="Platform ontology"
          secondaryHref="/aixcelerator/skills"
          secondaryLabel="Browse skills"
          className="mt-16"
        />
      )}
    </Layout>
  );
}
