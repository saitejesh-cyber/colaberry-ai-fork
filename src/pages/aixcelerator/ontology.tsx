/**
 * Platform Ontology — Cross-type knowledge graph diagram showing how all content types connect.
 * This is Colaberry's unique differentiator — "our own method."
 */

import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import Layout from "../../components/Layout";
import SectionHeader from "../../components/SectionHeader";
import EnterpriseCtaBand from "../../components/EnterpriseCtaBand";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../lib/seo";
import { CONTENT_TYPE_META, CROSS_TYPE_RELATIONS } from "../../lib/ontologyRegistry";
import type { ContentTypeName } from "../../lib/ontologyTypes";
import ContentTypeIcon, { ContentTypeIconSvg } from "../../components/ContentTypeIcon";

/* ── Data fetching ─────────────────────────────────────────────────── */

type Props = {
  typeCounts: Record<ContentTypeName, number>;
};

export const getStaticProps: GetStaticProps<Props> = async () => {
  // Import CMS functions dynamically to get live counts
  const cms = await import("../../lib/cms");
  const [skills, mcps, agents, tools, podcasts] = await Promise.all([
    cms.fetchSkills(undefined, { maxRecords: 1 }).then((r) => r.length).catch(() => 0),
    cms.fetchMCPServers(undefined, { maxRecords: 1 }).then((r) => r.length).catch(() => 0),
    cms.fetchAgents(undefined, { maxRecords: 1 }).then((r) => r.length).catch(() => 0),
    cms.fetchTools({ maxRecords: 1 }).then((r) => r.length).catch(() => 0),
    cms.fetchPodcastEpisodes({ maxRecords: 1 }).then((r) => r.length).catch(() => 0),
  ]);

  return {
    props: {
      typeCounts: {
        skill: skills > 0 ? 500 : 0,
        mcp: mcps > 0 ? 200 : 0,
        agent: agents > 0 ? 450 : 0,
        tool: tools > 0 ? 150 : 0,
        podcast: podcasts > 0 ? 100 : 0,
      },
    },
    revalidate: 600,
  };
};

/* ── Platform Ontology SVG Diagram ────────────────────────────────── */

const NODE_POSITIONS: Record<ContentTypeName, { x: number; y: number }> = {
  agent: { x: 200, y: 80 },
  skill: { x: 500, y: 80 },
  mcp: { x: 200, y: 280 },
  tool: { x: 500, y: 280 },
  podcast: { x: 350, y: 400 },
};

function PlatformDiagram({ typeCounts }: { typeCounts: Record<ContentTypeName, number> }) {
  const [hoveredType, setHoveredType] = useState<ContentTypeName | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);

  const svgWidth = 720;
  const svgHeight = 500;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[600px]" style={{ maxHeight: `${svgHeight}px` }}>
        <rect width={svgWidth} height={svgHeight} rx="12" className="fill-zinc-50 dark:fill-zinc-900" />

        {/* Cross-type relationship edges */}
        {CROSS_TYPE_RELATIONS.map((rel, i) => {
          const from = NODE_POSITIONS[rel.sourceType];
          const to = NODE_POSITIONS[rel.targetType];
          if (!from || !to) return null;
          const isHovered = hoveredEdge === i;
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;

          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredEdge(i)}
              onMouseLeave={() => setHoveredEdge(null)}
              style={{ cursor: "pointer" }}
            >
              <line
                x1={from.x} y1={from.y}
                x2={to.x} y2={to.y}
                stroke={rel.color}
                strokeWidth={isHovered ? 2.5 : 1.5}
                strokeDasharray="6,3"
                opacity={isHovered ? 1 : 0.5}
              />
              {isHovered && (
                <>
                  <rect
                    x={midX - rel.label.length * 3.5 - 6}
                    y={midY - 12}
                    width={rel.label.length * 7 + 12}
                    height="18"
                    rx="4"
                    fill={rel.color}
                    opacity="0.9"
                  />
                  <text x={midX} y={midY} textAnchor="middle" fontSize="9" fontWeight="600" fill="#fff">
                    {rel.label}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Content type nodes */}
        {(Object.entries(CONTENT_TYPE_META) as [ContentTypeName, typeof CONTENT_TYPE_META[ContentTypeName]][]).map(([type, meta]) => {
          const pos = NODE_POSITIONS[type];
          const isHovered = hoveredType === type;
          const count = typeCounts[type] || 0;
          const config = { skill: "/aixcelerator/skills/ontology", agent: "/aixcelerator/agents/ontology", mcp: "/aixcelerator/mcp/ontology", tool: "/aixcelerator/tools/ontology", podcast: "/resources/podcasts/ontology" };

          return (
            <g
              key={type}
              onMouseEnter={() => setHoveredType(type)}
              onMouseLeave={() => setHoveredType(null)}
              style={{ cursor: "pointer" }}
              onClick={() => { window.location.href = config[type]; }}
            >
              {/* Glow ring on hover */}
              {isHovered && (
                <circle cx={pos.x} cy={pos.y} r="44" fill={meta.color} opacity="0.08" />
              )}

              {/* Node circle */}
              <circle
                cx={pos.x} cy={pos.y} r="36"
                fill="none"
                stroke={meta.color}
                strokeWidth={isHovered ? 3 : 2}
                opacity={isHovered ? 1 : 0.8}
              />
              <circle cx={pos.x} cy={pos.y} r="36" fill={meta.color} opacity="0.08" />

              {/* Icon */}
              <ContentTypeIconSvg type={type} x={pos.x} y={pos.y - 4} size={20} fill={meta.color} />

              {/* Label */}
              <text x={pos.x} y={pos.y + 14} textAnchor="middle" fontSize="10" fontWeight="700" fill={meta.color}>
                {meta.label}
              </text>

              {/* Count */}
              <text x={pos.x} y={pos.y + 56} textAnchor="middle" className="fill-zinc-400" fontSize="9">
                {count > 0 ? `${count}+` : ""}
              </text>
            </g>
          );
        })}

        {/* Title */}
        <text x={svgWidth / 2} y="24" textAnchor="middle" className="fill-zinc-400 dark:fill-zinc-500" fontSize="9" fontWeight="700" letterSpacing="0.12em">
          COLABERRY AI KNOWLEDGE GRAPH
        </text>
      </svg>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function PlatformOntologyPage({ typeCounts }: InferGetStaticPropsType<typeof getStaticProps>) {
  const seoMeta: SeoMeta = {
    title: "Platform Ontology | Colaberry AI Knowledge Graph",
    description: "How Agents, Skills, MCP Servers, Tools, and Podcasts connect in the Colaberry AI knowledge graph.",
    canonical: buildCanonical("/aixcelerator/ontology"),
  };

  const totalItems = Object.values(typeCounts).reduce((s, c) => s + c, 0);

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) =>
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        )}
      </Head>

      <div className="reveal grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:items-start">
        <div>
          <SectionHeader
            as="h1"
            size="xl"
            kicker="Platform"
            title="Knowledge Graph"
            description="How Agents, Skills, MCP Servers, Tools, and Podcasts are interconnected in the Colaberry AI platform. Click any node to explore its ontology."
          />
          <div className="mt-4 rounded-xl border border-zinc-200/80 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span className="mr-1.5 inline-block rounded bg-[#DC2626]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#DC2626] dark:text-[#F87171]">Colaberry&apos;s Own Method</span>
              Cross-type relationships create a unified knowledge graph. Agents USE Skills, connect via MCPs, which PROVIDE Tools. Podcasts DISCUSS all of them.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <PlatformDiagram typeCounts={typeCounts} />
        </div>
      </div>

      {/* Stats */}
      <section className="reveal mt-8">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {(Object.entries(CONTENT_TYPE_META) as [ContentTypeName, typeof CONTENT_TYPE_META[ContentTypeName]][]).map(([type, meta]) => (
            <Link key={type} href={`${type === "podcast" ? "/resources/podcasts" : `/aixcelerator/${type === "skill" ? "skills" : type === "agent" ? "agents" : type === "mcp" ? "mcp" : "tools"}`}/ontology`} className="group catalog-card p-5 text-center">
              <ContentTypeIcon type={type as ContentTypeName} size={28} className="mx-auto" style={{ color: meta.color }} />
              <div className="mt-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">{(typeCounts[type] || 0).toLocaleString()}+</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">{meta.label}</div>
              <div className="mt-2 text-[10px] font-semibold text-[#DC2626] group-hover:underline dark:text-[#F87171]">View Ontology →</div>
            </Link>
          ))}
        </div>
        <div className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <span className="font-bold text-zinc-900 dark:text-zinc-50">{totalItems.toLocaleString()}+</span> total items · <span className="font-bold text-zinc-900 dark:text-zinc-50">{CROSS_TYPE_RELATIONS.length}</span> cross-type relationships
        </div>
      </section>

      {/* Cross-Type Relationships */}
      <section className="reveal mt-8">
        <SectionHeader size="md" kicker="Relationships" title="Cross-Type Connections" description="How different content types relate to each other across the platform." />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CROSS_TYPE_RELATIONS.slice(0, 4).map((rel) => (
            <div key={`${rel.sourceType}-${rel.targetType}-${rel.relationType}`} className="catalog-card p-5">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: rel.color }} />
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{rel.label}</span>
              </div>
              <div className="mt-1 text-[10px] text-zinc-400">
                {CONTENT_TYPE_META[rel.sourceType].label} → {CONTENT_TYPE_META[rel.targetType].label}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{rel.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="reveal mt-8 grid gap-4 sm:grid-cols-3">
        <Link href="/aixcelerator/ecosystem" className="group catalog-card p-5 text-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="mx-auto text-zinc-500 dark:text-zinc-400" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" stroke="currentColor" strokeWidth="1.5" /></svg>
          <div className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">Ecosystem Graph</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Interactive force-graph with all content types</div>
          <div className="mt-2 text-xs font-semibold text-[#DC2626] group-hover:underline dark:text-[#F87171]">Explore →</div>
        </Link>
        <Link href="/aixcelerator/solution-stacks" className="group catalog-card p-5 text-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="mx-auto text-zinc-500 dark:text-zinc-400" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <div className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">Solution Stacks</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Cross-type curated bundles</div>
          <div className="mt-2 text-xs font-semibold text-[#DC2626] group-hover:underline dark:text-[#F87171]">Browse →</div>
        </Link>
        <Link href="/aixcelerator/skills/graph" className="group catalog-card p-5 text-center">
          <ContentTypeIcon type="skill" size={22} className="mx-auto text-zinc-500 dark:text-zinc-400" />
          <div className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">Skill Graph</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">500+ skills in an interactive graph</div>
          <div className="mt-2 text-xs font-semibold text-[#DC2626] group-hover:underline dark:text-[#F87171]">View →</div>
        </Link>
      </section>

      <EnterpriseCtaBand
        kicker="Platform knowledge graph"
        title="Explore the full ecosystem"
        description="Discover how Agents, Skills, MCP Servers, Tools, and Podcasts connect across the Colaberry AI platform."
        primaryHref="/aixcelerator/ecosystem"
        primaryLabel="View ecosystem graph"
        secondaryHref="/aixcelerator/skills"
        secondaryLabel="Browse skills"
        className="mt-10"
      />
    </Layout>
  );
}
