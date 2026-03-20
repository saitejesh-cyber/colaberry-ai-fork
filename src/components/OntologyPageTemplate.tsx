/**
 * OntologyPageTemplate — Generic 3-layer ontology page for any content type.
 * Renders interactive SVG diagram, architecture cards, relationship types, quick links.
 * Used by: skills/ontology, mcp/ontology, agents/ontology, tools/ontology, podcasts/ontology
 */

import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";
import SectionHeader from "./SectionHeader";
import EnterpriseCtaBand from "./EnterpriseCtaBand";
import type { ContentOntologyConfig, ContentCollection } from "../lib/ontologyTypes";
import ContentTypeIcon from "./ContentTypeIcon";

/* ── Props ────────────────────────────────────────────────────────────── */

export type OntologyPageTemplateProps = {
  config: ContentOntologyConfig;
  categoryCounts: Record<string, number>;
  totalItems: number;
  collections: ContentCollection[];
  topTags: { name: string; slug: string; count: number }[];
  /** Representative items shown in the relation graph layer */
  representativeItems?: { slug: string; name: string; x: number; y: number }[];
  /** Representative edges between items */
  representativeEdges?: { from: number; to: number; type: string }[];
};

/* ── SVG Ontology Diagram ─────────────────────────────────────────────── */

function OntologyDiagram({
  config,
  categoryCounts,
  totalItems,
  topTags,
  collections,
  representativeItems,
  representativeEdges,
}: {
  config: ContentOntologyConfig;
  categoryCounts: Record<string, number>;
  totalItems: number;
  topTags: { name: string; slug: string; count: number }[];
  collections: ContentCollection[];
  representativeItems: { slug: string; name: string; x: number; y: number }[];
  representativeEdges: { from: number; to: number; type: string }[];
}) {
  const router = useRouter();
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [hoveredCollection, setHoveredCollection] = useState<string | null>(null);

  const categories = config.categories.filter((c) => c.slug !== "other").slice(0, 6);
  const topCollections = collections.slice(0, 6);
  const relTypes = config.relationTypes;

  const catWidth = 140;
  const catSpacing = 150;
  const catStartX = 20;
  const svgWidth = 940;
  const svgHeight = 680;

  const handleCategoryClick = useCallback(
    (slug: string) => router.push(`${config.catalogPath}?category=${slug}`),
    [router, config.catalogPath],
  );

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full min-w-[700px]"
        style={{ maxHeight: `${svgHeight}px`, fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
      >
        <defs>
          <filter id="nodeShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.06" />
          </filter>
          <filter id="centralShadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="3" stdDeviation="8" floodOpacity="0.12" />
          </filter>
          <filter id="layerShadow" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="0" dy="1" stdDeviation="3" floodOpacity="0.04" />
          </filter>
          <marker id="arrowhead" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto">
            <path d="M0 0 L10 4 L0 8 Z" className="fill-zinc-300 dark:fill-zinc-600" />
          </marker>
          <style>{`
            @keyframes dashMove { to { stroke-dashoffset: -24; } }
            .animated-edge { animation: dashMove 2s linear infinite; }
          `}</style>
        </defs>

        {/* Background */}
        <rect width={svgWidth} height={svgHeight} rx="16" className="fill-white dark:fill-zinc-900" />

        {/* ─── LAYER 1: TAXONOMY ─── */}
        <rect x="16" y="12" width={svgWidth - 32} height="220" rx="12" className="fill-zinc-50/80 dark:fill-zinc-800/20" filter="url(#layerShadow)" />
        <rect x="16" y="12" width={svgWidth - 32} height="220" rx="12" fill="none" className="stroke-zinc-200/50 dark:stroke-zinc-700/40" strokeWidth="1" />

        {/* Layer label */}
        <rect x="28" y="22" width={config.label.length * 8.5 + 100} height="22" rx="11" className="fill-zinc-100 dark:fill-zinc-700/40" />
        <text x="40" y="37" className="fill-zinc-500 dark:fill-zinc-400" fontSize="11" fontWeight="700" letterSpacing="0.08em">
          {config.label.toUpperCase()} TAXONOMY
        </text>

        {/* Central node — large premium pill */}
        <rect x={svgWidth / 2 - 60} y="52" width="120" height="38" rx="19" className="fill-zinc-900 dark:fill-zinc-100" filter="url(#centralShadow)" />
        <text x={svgWidth / 2} y="76" textAnchor="middle" className="fill-white dark:fill-zinc-900" fontSize="14" fontWeight="700" letterSpacing="-0.02em">{config.label}</text>
        <text x={svgWidth / 2} y="98" textAnchor="middle" className="fill-zinc-400 dark:fill-zinc-500" fontSize="11" fontWeight="500">
          {totalItems.toLocaleString()} total
        </text>

        <text x={svgWidth / 2} y="118" textAnchor="middle" className="fill-zinc-400 dark:fill-zinc-500" fontSize="9.5" fontWeight="500" fontStyle="italic">has_category</text>

        {/* Category nodes — large, rounded, with accent fills */}
        {categories.map((cat, i) => {
          const x = catStartX + i * catSpacing;
          const y = 128;
          const count = categoryCounts[cat.slug] || 0;
          const isHovered = hoveredCategory === cat.slug;
          const color = config.categoryColors[cat.slug] || "#a1a1aa";

          return (
            <g
              key={cat.slug}
              onClick={() => handleCategoryClick(cat.slug)}
              onMouseEnter={() => setHoveredCategory(cat.slug)}
              onMouseLeave={() => setHoveredCategory(null)}
              style={{ cursor: "pointer" }}
            >
              <line x1={svgWidth / 2} y1="90" x2={x + catWidth / 2} y2={y} className="stroke-zinc-200 dark:stroke-zinc-700" strokeWidth="1" strokeDasharray="4,3" />
              <rect x={x} y={y} width={catWidth} height="36" rx="10" fill={color} opacity={isHovered ? 0.15 : 0.06} />
              <rect x={x} y={y} width={catWidth} height="36" rx="10" fill="none" stroke={color} strokeWidth={isHovered ? 2 : 1.2} filter="url(#nodeShadow)" />
              <text x={x + catWidth / 2} y={y + 20} textAnchor="middle" dominantBaseline="middle" fontSize="11.5" fontWeight="600" fill={color}>{cat.label}</text>
              <text x={x + catWidth / 2} y={y + 50} textAnchor="middle" className="fill-zinc-400 dark:fill-zinc-500" fontSize="10" fontWeight="500">{count.toLocaleString()}</text>
            </g>
          );
        })}

        {/* Top tags row */}
        <text x={svgWidth / 2} y="192" textAnchor="middle" className="fill-zinc-400 dark:fill-zinc-500" fontSize="9.5" fontWeight="500" fontStyle="italic">has_tag</text>
        {topTags.slice(0, 7).map((tag, i) => {
          const tagWidth = tag.name.length * 6.5 + 18;
          const totalTagWidth = topTags.slice(0, 7).reduce((s, t) => s + t.name.length * 6.5 + 24, 0);
          let x = (svgWidth - totalTagWidth) / 2;
          for (let j = 0; j < i; j++) {
            x += topTags[j].name.length * 6.5 + 24;
          }
          return (
            <g key={tag.slug}>
              <rect x={x} y="200" width={tagWidth} height="22" rx="11" className="fill-zinc-100 dark:fill-zinc-800/60" />
              <text x={x + tagWidth / 2} y="214" textAnchor="middle" className="fill-zinc-500 dark:fill-zinc-400" fontSize="9.5" fontWeight="500">{tag.name}</text>
            </g>
          );
        })}

        {/* Arrow between Layer 1 and 2 */}
        <line x1={svgWidth / 2} y1="234" x2={svgWidth / 2} y2="260" className="stroke-zinc-300 dark:stroke-zinc-600" strokeWidth="1.5" markerEnd="url(#arrowhead)" />

        {/* ─── LAYER 2: RELATION GRAPH ─── */}
        <rect x="16" y="264" width={svgWidth - 32} height="160" rx="12" className="fill-zinc-50/80 dark:fill-zinc-800/20" filter="url(#layerShadow)" />
        <rect x="16" y="264" width={svgWidth - 32} height="160" rx="12" fill="none" className="stroke-zinc-200/50 dark:stroke-zinc-700/40" strokeWidth="1" />

        {/* Layer label pill */}
        <rect x="28" y="274" width={config.labelSingular.length * 8.5 + 140} height="22" rx="11" className="fill-zinc-100 dark:fill-zinc-700/40" />
        <text x="40" y="289" className="fill-zinc-500 dark:fill-zinc-400" fontSize="11" fontWeight="700" letterSpacing="0.08em">
          {config.labelSingular.toUpperCase()} RELATION GRAPH
        </text>

        {/* Edge legend — right-aligned */}
        {relTypes.slice(0, 4).map((rel, i) => (
          <g key={rel.type}>
            <line x1={490 + i * 115} y1="284" x2={514 + i * 115} y2="284" className="stroke-zinc-400 dark:stroke-zinc-500" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={rel.directional ? "5,4" : "none"} />
            <text x={519 + i * 115} y="288" fontSize="9.5" fontWeight="500" className="fill-zinc-500 dark:fill-zinc-400">{rel.label}</text>
          </g>
        ))}

        {/* Representative edges */}
        {representativeEdges.map((edge, i) => {
          const from = representativeItems[edge.from];
          const to = representativeItems[edge.to];
          if (!from || !to) return null;
          const rel = relTypes.find((r) => r.type === edge.type);
          return (
            <line
              key={i}
              x1={from.x + 55} y1={from.y + 310}
              x2={to.x + 55} y2={to.y + 310}
              stroke="#a1a1aa"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={rel?.directional ? "6,4" : "none"}
              opacity="0.6"
            />
          );
        })}

        {/* Representative item nodes */}
        {representativeItems.map((item, i) => {
          const isHovered = hoveredItem === i;
          const nodeWidth = item.name.length * 8 + 24;
          return (
            <g
              key={item.slug}
              onMouseEnter={() => setHoveredItem(i)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => router.push(`${config.basePath}/${item.slug}`)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={item.x} y={item.y + 300}
                width={nodeWidth} height="30" rx="8"
                fill="#71717a"
                opacity={isHovered ? 0.18 : 0.06}
              />
              <rect
                x={item.x} y={item.y + 300}
                width={nodeWidth} height="30" rx="8"
                fill="none"
                stroke="#71717a" strokeWidth={isHovered ? 2.5 : 1.5}
                filter="url(#nodeShadow)"
              />
              <text
                x={item.x + nodeWidth / 2} y={item.y + 319}
                textAnchor="middle" fontSize="11.5" fontWeight="600"
                className="fill-zinc-700 dark:fill-zinc-300"
              >{item.name}</text>
            </g>
          );
        })}

        {/* Arrow between Layer 2 and 3 */}
        <line x1={svgWidth / 2} y1="426" x2={svgWidth / 2} y2="452" className="stroke-zinc-300 dark:stroke-zinc-600" strokeWidth="1.5" markerEnd="url(#arrowhead)" />

        {/* ─── LAYER 3: COLLECTION LIBRARY ─── */}
        <rect x="16" y="456" width={svgWidth - 32} height="130" rx="12" className="fill-zinc-50/80 dark:fill-zinc-800/20" filter="url(#layerShadow)" />
        <rect x="16" y="456" width={svgWidth - 32} height="130" rx="12" fill="none" className="stroke-zinc-200/50 dark:stroke-zinc-700/40" strokeWidth="1" />

        {/* Layer label pill */}
        <rect x="28" y="466" width={config.labelSingular.length * 8.5 + 150} height="22" rx="11" className="fill-zinc-100 dark:fill-zinc-700/40" />
        <text x="40" y="481" className="fill-zinc-500 dark:fill-zinc-400" fontSize="11" fontWeight="700" letterSpacing="0.08em">
          {config.labelSingular.toUpperCase()} COLLECTION LIBRARY
        </text>

        {topCollections.map((col, i) => {
          const colWidth = 140;
          const colSpacing = 148;
          const x = 28 + i * colSpacing;
          const y = 496;
          const isHovered = hoveredCollection === col.slug;

          return (
            <g
              key={col.slug}
              onClick={() => router.push(`${config.basePath}/collections/${col.slug}`)}
              onMouseEnter={() => setHoveredCollection(col.slug)}
              onMouseLeave={() => setHoveredCollection(null)}
              style={{ cursor: "pointer" }}
            >
              <rect x={x} y={y} width={colWidth} height="68" rx="10" className={isHovered ? "fill-zinc-100 dark:fill-zinc-800" : "fill-white dark:fill-zinc-800/40"} filter="url(#nodeShadow)" />
              <rect x={x} y={y} width={colWidth} height="68" rx="10" fill="none" className="stroke-zinc-200 dark:stroke-zinc-700" strokeWidth={isHovered ? 1.5 : 0.8} />
              <text x={x + colWidth / 2} y={y + 28} textAnchor="middle" fontSize="11.5" fontWeight="700" className="fill-zinc-800 dark:fill-zinc-200">{col.slug}</text>
              <text x={x + colWidth / 2} y={y + 48} textAnchor="middle" className="fill-zinc-400 dark:fill-zinc-500" fontSize="10" fontWeight="500">{col.itemSlugs.length} items</text>
            </g>
          );
        })}

        {/* Legend — premium floating card */}
        <rect x="16" y="598" width="240" height="72" rx="10" className="fill-white dark:fill-zinc-800/50" filter="url(#layerShadow)" />
        <rect x="16" y="598" width="240" height="72" rx="10" fill="none" className="stroke-zinc-200/50 dark:stroke-zinc-700/40" strokeWidth="0.8" />
        {[
          { shape: "circle" as const, label: "Category", fill: "#71717a" },
          { shape: "rect" as const, label: config.labelSingular, fill: "#71717a" },
          { shape: "dashed-rect" as const, label: "Collection", fill: "#a1a1aa" },
        ].map((item, i) => (
          <g key={item.label}>
            {item.shape === "circle" && <circle cx="34" cy={616 + i * 18} r="5" fill={item.fill} />}
            {item.shape === "rect" && <rect x="29" y={611 + i * 18} width="10" height="10" rx="3" fill={item.fill} />}
            {item.shape === "dashed-rect" && <rect x="29" y={611 + i * 18} width="10" height="10" rx="3" fill="none" stroke={item.fill} strokeWidth="1.5" strokeDasharray="2,2" />}
            <text x="50" y={620 + i * 18} fontSize="10.5" fontWeight="500" className="fill-zinc-600 dark:fill-zinc-400">{item.label}</text>
          </g>
        ))}
        {relTypes.slice(0, 4).map((rel, i) => (
          <g key={rel.type}>
            <line x1="140" y1={616 + i * 18} x2="164" y2={616 + i * 18} className="stroke-zinc-400 dark:stroke-zinc-500" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={rel.directional ? "5,4" : "none"} />
            <text x="172" y={620 + i * 18} fontSize="10.5" fontWeight="500" className="fill-zinc-600 dark:fill-zinc-400">{rel.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ── Default representative items generator ─────────────────────────── */

const DEFAULT_POSITIONS = [
  { x: 60, y: 20 }, { x: 200, y: 55 }, { x: 350, y: 15 },
  { x: 500, y: 50 }, { x: 650, y: 20 }, { x: 780, y: 55 },
];

const DEFAULT_EDGES = [
  { from: 0, to: 1, type: "" },
  { from: 2, to: 3, type: "" },
  { from: 3, to: 2, type: "" },
  { from: 4, to: 5, type: "" },
  { from: 0, to: 2, type: "" },
];

/* ── Main Template Component ──────────────────────────────────────────── */

export default function OntologyPageTemplate({
  config,
  categoryCounts,
  totalItems,
  collections,
  topTags,
  representativeItems: repItemsProp,
  representativeEdges: repEdgesProp,
}: OntologyPageTemplateProps) {
  const catCount = config.categories.filter((c) => c.slug !== "other").length;
  const totalCollectionItems = new Set(collections.flatMap((c) => c.itemSlugs)).size;
  const relTypes = config.relationTypes;

  // Use provided representative items or generate defaults
  const representativeItems = repItemsProp || DEFAULT_POSITIONS.slice(0, 6).map((pos, i) => ({
    slug: `item-${i}`,
    name: `item-${i}`,
    ...pos,
  }));

  const representativeEdges = repEdgesProp || DEFAULT_EDGES.map((e, i) => ({
    ...e,
    type: relTypes[i % relTypes.length]?.type || "similar_to",
  }));

  return (
    <>
      <div className="reveal grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-start">
        <div>
          <SectionHeader
            as="h1"
            size="xl"
            kicker="Ontology"
            title={`${config.labelSingular} Ontology`}
            description={`${config.labelSingular} Ontology organizes individual ${config.label.toLowerCase()} into a structured, composable network, enabling agents to reason, plan, and execute complex tasks as an extensible, maintainable capability system.`}
          />
          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-zinc-950/30">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#DC2626]/10 dark:bg-[#DC2626]/15">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-[#DC2626] dark:text-[#F87171]" aria-hidden="true"><path d="M12 16v-4m0-4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#DC2626] dark:text-[#F87171]">How it works</span>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  When querying for a task, the system traverses this graph to identify the necessary collections and {config.label.toLowerCase()} to construct a capable agent.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive 3-Layer Architecture Diagram */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <OntologyDiagram
            config={config}
            categoryCounts={categoryCounts}
            totalItems={totalItems}
            topTags={topTags}
            collections={collections}
            representativeItems={representativeItems}
            representativeEdges={representativeEdges}
          />
        </div>
      </div>

      {/* Architecture Explanation Cards */}
      <section className="reveal mt-12">
        <SectionHeader size="md" kicker="Architecture" title="Three-Layer Design" description={`How ${config.label.toLowerCase()} are organized from abstract taxonomy to deployable collections.`} />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="catalog-card overflow-hidden p-0" style={{ borderLeft: "3px solid #a1a1aa" }}>
            <div className="p-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">1</span>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{config.labelSingular} Taxonomy</h3>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">The Abstraction Layer</div>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                The top layer defines the broad categorization and detailed tags of {config.label.toLowerCase()}. It organizes capabilities into categories such as:
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                {config.categories.filter((c) => c.slug !== "other").slice(0, 3).map((cat) => (
                  <li key={cat.slug} className="flex items-center gap-2">
                    <span className="h-1 w-1 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                    {cat.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-zinc-200/60 bg-zinc-50/80 px-6 py-2.5 dark:border-zinc-700/50 dark:bg-zinc-800/30">
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Classification & Vocabulary — <span className="font-semibold text-zinc-700 dark:text-zinc-300">{catCount} categories</span>, <span className="font-semibold text-zinc-700 dark:text-zinc-300">{topTags.length}+ tags</span>
              </div>
            </div>
          </div>

          <div className="catalog-card overflow-hidden p-0" style={{ borderLeft: "3px solid #a1a1aa" }}>
            <div className="p-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">2</span>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{config.labelSingular} Relation Graph</h3>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">The Semantic Layer</div>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                The middle layer instantiates specific {config.label.toLowerCase()} and defines how they interact. It maps relationships using edges like:
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                {relTypes.map((rel) => (
                  <li key={rel.type} className="flex items-center gap-2">
                    <span className="h-1 w-1 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                    {rel.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-zinc-200/60 bg-zinc-50/80 px-6 py-2.5 dark:border-zinc-700/50 dark:bg-zinc-800/30">
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Reasoning & Composition — <span className="font-semibold text-zinc-700 dark:text-zinc-300">{totalItems.toLocaleString()} {config.label.toLowerCase()}</span>, <span className="font-semibold text-zinc-700 dark:text-zinc-300">{relTypes.length} relationship types</span>
              </div>
            </div>
          </div>

          <div className="catalog-card overflow-hidden p-0" style={{ borderLeft: "3px solid #a1a1aa" }}>
            <div className="p-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">3</span>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{config.labelSingular} Collection</h3>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">The Execution Layer</div>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Groups related {config.label.toLowerCase()} into deployable units. These are the actual functional toolkits agents load at runtime:
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                {collections.slice(0, 4).map((col) => (
                  <li key={col.slug} className="flex items-center gap-2">
                    <span className="h-1 w-1 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                    <Link href={`${config.basePath}/collections/${col.slug}`} className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-200">
                      {col.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-zinc-200/60 bg-zinc-50/80 px-6 py-2.5 dark:border-zinc-700/50 dark:bg-zinc-800/30">
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Deployment & Execution — <span className="font-semibold text-zinc-700 dark:text-zinc-300">{collections.length} collections</span>, <span className="font-semibold text-zinc-700 dark:text-zinc-300">{totalCollectionItems} {config.label.toLowerCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Relationship Types Section */}
      <section className="reveal mt-12">
        <SectionHeader size="md" kicker="Edges" title="Relationship Types" description={`How ${config.label.toLowerCase()} connect and depend on each other within the ontology.`} />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {relTypes.map((rel) => (
            <div key={rel.type} className="catalog-card overflow-hidden p-0">
              <div className="h-0.5 bg-zinc-300 dark:bg-zinc-600" />
              <div className="p-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-zinc-500 dark:text-zinc-400" aria-hidden="true"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{rel.label}</span>
                </div>
                <code className="mt-2 inline-block rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{rel.type}</code>
                <p className="mt-2.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{rel.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="reveal mt-12 grid gap-4 sm:grid-cols-3">
        <Link href={`${config.basePath}/graph`} className="group catalog-card p-5 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 transition-colors group-hover:bg-zinc-200 dark:bg-zinc-800 dark:group-hover:bg-zinc-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-zinc-600 dark:text-zinc-300" aria-hidden="true"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <div className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">{config.labelSingular} Graph</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Interactive force-graph with {totalItems.toLocaleString()}+ {config.label.toLowerCase()}</div>
          <div className="mt-2.5 text-xs font-semibold text-[#DC2626] group-hover:underline dark:text-[#F87171]">Explore →</div>
        </Link>
        <Link href={`${config.basePath}/collections`} className="group catalog-card p-5 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 transition-colors group-hover:bg-zinc-200 dark:bg-zinc-800 dark:group-hover:bg-zinc-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-zinc-600 dark:text-zinc-300" aria-hidden="true"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <div className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">Collections</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{collections.length} curated {config.labelSingular.toLowerCase()} bundles</div>
          <div className="mt-2.5 text-xs font-semibold text-[#DC2626] group-hover:underline dark:text-[#F87171]">Browse →</div>
        </Link>
        <Link href={config.catalogPath} className="group catalog-card p-5 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 transition-colors group-hover:bg-zinc-200 dark:bg-zinc-800 dark:group-hover:bg-zinc-700">
            <ContentTypeIcon type={config.contentType} size={20} className="text-zinc-600 dark:text-zinc-300" />
          </span>
          <div className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">{config.label} Catalog</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Browse all {config.label.toLowerCase()} with taxonomy filters</div>
          <div className="mt-2.5 text-xs font-semibold text-[#DC2626] group-hover:underline dark:text-[#F87171]">Browse →</div>
        </Link>
      </section>

      <EnterpriseCtaBand
        kicker={`${config.label} ontology`}
        title={`Explore the ${config.labelSingular.toLowerCase()} network`}
        description={`Discover how ${config.label.toLowerCase()} connect, compose, and depend on each other across the platform.`}
        primaryHref={`${config.basePath}/graph`}
        primaryLabel={`View ${config.labelSingular.toLowerCase()} graph`}
        secondaryHref={config.catalogPath}
        secondaryLabel={`Browse all ${config.label.toLowerCase()}`}
        className="mt-16"
      />
    </>
  );
}
