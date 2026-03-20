import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";
import Layout from "../../../components/Layout";
import SectionHeader from "../../../components/SectionHeader";
import EnterpriseCtaBand from "../../../components/EnterpriseCtaBand";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";
import { SKILL_CATEGORIES } from "../../../data/skill-taxonomy";
import { SKILL_COLLECTIONS } from "../../../data/skill-collections";
import { fetchSkillCategoryCounts, fetchAllSkillTags } from "../../../lib/cms";
import { RELATIONSHIP_TYPE_COLORS, RELATIONSHIP_TYPE_LABELS } from "../../../lib/graphUtils";
import ContentTypeIcon from "../../../components/ContentTypeIcon";

/* ── Relationship metadata ─────────────────────────────────────────── */

const RELATIONSHIP_TYPES = [
  { type: "similar_to" as const, label: "Similar To", description: "Functionally equivalent or substitutable skills", color: "#34d399", dash: "8,4" },
  { type: "belong_to" as const, label: "Belong To", description: "Hierarchical categorization within larger workflows", color: "#fbbf24", dash: "" },
  { type: "compose_with" as const, label: "Compose With", description: "Skills that combine together with output-to-input flow", color: "#60a5fa", dash: "" },
  { type: "depend_on" as const, label: "Depend On", description: "Prerequisites and environment setup requirements", color: "#f87171", dash: "4,4" },
];

/* ── Representative skills for the relation graph layer ────────────── */
const REPRESENTATIVE_SKILLS = [
  { slug: "nextjs-expert", name: "nextjs-expert", x: 80, y: 30 },
  { slug: "react-patterns", name: "react-patterns", x: 200, y: 60 },
  { slug: "seaborn", name: "seaborn", x: 350, y: 20 },
  { slug: "matplotlib", name: "matplotlib", x: 480, y: 50 },
  { slug: "playwright", name: "playwright", x: 620, y: 30 },
  { slug: "browser-automation", name: "browser-automation", x: 750, y: 60 },
];

const REPRESENTATIVE_EDGES = [
  { from: 0, to: 1, type: "similar_to" as const },
  { from: 2, to: 3, type: "compose_with" as const },
  { from: 3, to: 2, type: "similar_to" as const },
  { from: 4, to: 5, type: "depend_on" as const },
  { from: 0, to: 2, type: "belong_to" as const },
];

/* ── Data fetching ─────────────────────────────────────────────────── */

type OntologyProps = {
  categoryCounts: Record<string, number>;
  totalSkills: number;
  totalCollections: number;
  totalCollectionSkills: number;
  topTags: { name: string; slug: string; count: number }[];
};

export const getStaticProps: GetStaticProps<OntologyProps> = async () => {
  try {
    const [categoryCounts, allTags] = await Promise.all([
      fetchSkillCategoryCounts(),
      fetchAllSkillTags(),
    ]);

    const totalSkills = Object.values(categoryCounts).reduce((s, c) => s + c, 0);
    const totalCollectionSkills = new Set(
      SKILL_COLLECTIONS.flatMap((c) => c.skillSlugs),
    ).size;

    return {
      props: {
        categoryCounts,
        totalSkills,
        totalCollections: SKILL_COLLECTIONS.length,
        totalCollectionSkills,
        topTags: allTags.slice(0, 30),
      },
      revalidate: 600,
    };
  } catch {
    return {
      props: {
        categoryCounts: {},
        totalSkills: 0,
        totalCollections: SKILL_COLLECTIONS.length,
        totalCollectionSkills: 0,
        topTags: [],
      },
      revalidate: 120,
    };
  }
};

/* ── Interactive SVG Ontology Diagram ──────────────────────────────── */

function OntologyDiagram({
  categoryCounts,
  totalSkills,
  topTags,
}: {
  categoryCounts: Record<string, number>;
  totalSkills: number;
  topTags: { name: string; slug: string; count: number }[];
}) {
  const router = useRouter();
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [hoveredSkill, setHoveredSkill] = useState<number | null>(null);
  const [hoveredCollection, setHoveredCollection] = useState<string | null>(null);

  const categories = SKILL_CATEGORIES.filter((c) => c.slug !== "other").slice(0, 6);
  const collections = SKILL_COLLECTIONS.slice(0, 6);

  const catColors: Record<string, string> = {
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

  const catWidth = 120;
  const catSpacing = 145;
  const catStartX = 40;
  const svgWidth = 920;

  const handleCategoryClick = useCallback(
    (slug: string) => router.push(`/aixcelerator/skills?category=${slug}`),
    [router],
  );

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgWidth} 520`}
        className="w-full min-w-[700px]"
        style={{ maxHeight: "520px" }}
      >
        {/* Background */}
        <rect width={svgWidth} height="520" rx="12" className="fill-white dark:fill-zinc-900" />

        {/* ─── LAYER 1: SKILL TAXONOMY ─── */}
        <rect x="12" y="8" width={svgWidth - 24} height="170" rx="8" fill="none" className="stroke-zinc-200 dark:stroke-zinc-700" strokeWidth="1" strokeDasharray="6,3" />
        <text x="24" y="28" className="fill-zinc-400 dark:fill-zinc-500" fontSize="9" fontWeight="700" letterSpacing="0.12em">SKILL TAXONOMY</text>

        {/* Central Skills node */}
        <rect x={svgWidth / 2 - 40} y="38" width="80" height="28" rx="14" className="fill-zinc-900 dark:fill-zinc-100" />
        <text x={svgWidth / 2} y="56" textAnchor="middle" className="fill-white dark:fill-zinc-900" fontSize="11" fontWeight="700">Skills</text>
        <text x={svgWidth / 2} y="70" textAnchor="middle" className="fill-zinc-400" fontSize="8">
          {totalSkills.toLocaleString()} total
        </text>

        {/* has_category label */}
        <text x={svgWidth / 2} y="86" textAnchor="middle" className="fill-zinc-400" fontSize="8" fontStyle="italic">has_category</text>

        {/* Category nodes */}
        {categories.map((cat, i) => {
          const x = catStartX + i * catSpacing;
          const y = 96;
          const count = categoryCounts[cat.slug] || 0;
          const isHovered = hoveredCategory === cat.slug;

          return (
            <g
              key={cat.slug}
              onClick={() => handleCategoryClick(cat.slug)}
              onMouseEnter={() => setHoveredCategory(cat.slug)}
              onMouseLeave={() => setHoveredCategory(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Line from Skills to category */}
              <line
                x1={svgWidth / 2}
                y1="66"
                x2={x + catWidth / 2}
                y2={y}
                className="stroke-zinc-300 dark:stroke-zinc-600"
                strokeWidth="0.8"
                strokeDasharray="3,2"
              />
              {/* Category pill */}
              <rect
                x={x}
                y={y}
                width={catWidth}
                height="26"
                rx="6"
                fill={isHovered ? catColors[cat.slug] : "transparent"}
                stroke={catColors[cat.slug]}
                strokeWidth="1.5"
                opacity={isHovered ? 0.15 : 1}
              />
              <rect
                x={x}
                y={y}
                width={catWidth}
                height="26"
                rx="6"
                fill="none"
                stroke={catColors[cat.slug]}
                strokeWidth={isHovered ? 2 : 1.5}
              />
              <text
                x={x + catWidth / 2}
                y={y + 14}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                fontWeight="600"
                fill={catColors[cat.slug]}
              >
                {cat.label}
              </text>
              {/* Count badge */}
              <text
                x={x + catWidth / 2}
                y={y + 36}
                textAnchor="middle"
                className="fill-zinc-400"
                fontSize="8"
              >
                {count.toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Top tags row */}
        <text x={svgWidth / 2} y="148" textAnchor="middle" className="fill-zinc-400" fontSize="8" fontStyle="italic">has_tag</text>
        {topTags.slice(0, 8).map((tag, i) => {
          const tagWidth = tag.name.length * 5.5 + 12;
          const totalTagWidth = topTags.slice(0, 8).reduce((s, t) => s + t.name.length * 5.5 + 16, 0);
          let x = (svgWidth - totalTagWidth) / 2;
          for (let j = 0; j < i; j++) {
            x += topTags[j].name.length * 5.5 + 16;
          }
          return (
            <g key={tag.slug}>
              <rect x={x} y="155" width={tagWidth} height="16" rx="8" className="fill-zinc-100 dark:fill-zinc-800" />
              <text x={x + tagWidth / 2} y="166" textAnchor="middle" className="fill-zinc-500 dark:fill-zinc-400" fontSize="7.5">{tag.name}</text>
            </g>
          );
        })}

        {/* ─── Arrow between Layer 1 and 2 ─── */}
        <line x1={svgWidth / 2} y1="180" x2={svgWidth / 2} y2="198" className="stroke-zinc-400 dark:stroke-zinc-500" strokeWidth="1" markerEnd="url(#arrowhead)" />

        {/* ─── LAYER 2: SKILL RELATION GRAPH ─── */}
        <rect x="12" y="200" width={svgWidth - 24} height="120" rx="8" fill="none" className="stroke-zinc-200 dark:stroke-zinc-700" strokeWidth="1" strokeDasharray="6,3" />
        <text x="24" y="218" className="fill-zinc-400 dark:fill-zinc-500" fontSize="9" fontWeight="700" letterSpacing="0.12em">SKILL RELATION GRAPH</text>

        {/* Edge legend */}
        {RELATIONSHIP_TYPES.map((rel, i) => (
          <g key={rel.type}>
            <line
              x1={520 + i * 100}
              y1="214"
              x2={540 + i * 100}
              y2="214"
              className="stroke-zinc-400 dark:stroke-zinc-500"
              strokeWidth="1.5"
              strokeDasharray={rel.dash || "none"}
            />
            <text x={544 + i * 100} y="217" fontSize="7" className="fill-zinc-500 dark:fill-zinc-400">{rel.label}</text>
          </g>
        ))}

        {/* Representative skill nodes + edges */}
        {REPRESENTATIVE_EDGES.map((edge, i) => {
          const from = REPRESENTATIVE_SKILLS[edge.from];
          const to = REPRESENTATIVE_SKILLS[edge.to];
          const rel = RELATIONSHIP_TYPES.find((r) => r.type === edge.type);
          return (
            <line
              key={i}
              x1={from.x + 50}
              y1={from.y + 234}
              x2={to.x + 50}
              y2={to.y + 234}
              className="stroke-zinc-400 dark:stroke-zinc-500"
              strokeWidth="1"
              strokeDasharray={rel?.dash || "none"}
              opacity="0.6"
            />
          );
        })}

        {REPRESENTATIVE_SKILLS.map((skill, i) => {
          const isHovered = hoveredSkill === i;
          return (
            <g
              key={skill.slug}
              onMouseEnter={() => setHoveredSkill(i)}
              onMouseLeave={() => setHoveredSkill(null)}
              onClick={() => router.push(`/aixcelerator/skills/${skill.slug}`)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={skill.x}
                y={skill.y + 228}
                width={skill.name.length * 7 + 16}
                height="22"
                rx="4"
                fill={isHovered ? "#34d399" : "transparent"}
                opacity={isHovered ? 0.15 : 1}
                stroke="#34d399"
                strokeWidth={isHovered ? 1.5 : 1}
              />
              <text
                x={skill.x + (skill.name.length * 7 + 16) / 2}
                y={skill.y + 242}
                textAnchor="middle"
                fontSize="9"
                fontWeight="500"
                className="fill-zinc-700 dark:fill-zinc-300"
              >
                {skill.name}
              </text>
            </g>
          );
        })}

        {/* ─── Arrow between Layer 2 and 3 ─── */}
        <line x1={svgWidth / 2} y1="322" x2={svgWidth / 2} y2="340" className="stroke-zinc-400 dark:stroke-zinc-500" strokeWidth="1" markerEnd="url(#arrowhead)" />

        {/* ─── LAYER 3: SKILL PACKAGE LIBRARY ─── */}
        <rect x="12" y="342" width={svgWidth - 24} height="100" rx="8" fill="none" className="stroke-zinc-200 dark:stroke-zinc-700" strokeWidth="1" strokeDasharray="6,3" />
        <text x="24" y="362" className="fill-zinc-400 dark:fill-zinc-500" fontSize="9" fontWeight="700" letterSpacing="0.12em">SKILL PACKAGE LIBRARY</text>

        {collections.map((col, i) => {
          const colWidth = 130;
          const colSpacing = 143;
          const x = 25 + i * colSpacing;
          const y = 372;
          const isHovered = hoveredCollection === col.slug;

          return (
            <g
              key={col.slug}
              onClick={() => router.push(`/aixcelerator/skills/collections/${col.slug}`)}
              onMouseEnter={() => setHoveredCollection(col.slug)}
              onMouseLeave={() => setHoveredCollection(null)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={x}
                y={y}
                width={colWidth}
                height="52"
                rx="6"
                className={isHovered ? "fill-zinc-100 dark:fill-zinc-800" : "fill-zinc-50 dark:fill-zinc-800/50"}
                stroke={isHovered ? "#71717a" : ""}
                strokeWidth={isHovered ? 1.5 : 0}
              />
              <rect
                x={x}
                y={y}
                width={colWidth}
                height="52"
                rx="6"
                fill="none"
                className="stroke-zinc-200 dark:stroke-zinc-700"
                strokeWidth="1"
                strokeDasharray="4,2"
              />
              <text
                x={x + colWidth / 2}
                y={y + 20}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                className="fill-zinc-700 dark:fill-zinc-300"
              >
                {col.slug}
              </text>
              <text
                x={x + colWidth / 2}
                y={y + 36}
                textAnchor="middle"
                fontSize="8"
                className="fill-zinc-400"
              >
                {col.skillSlugs.length} skills
              </text>
            </g>
          );
        })}

        {/* Legend box */}
        <rect x="12" y="454" width="200" height="58" rx="6" className="fill-zinc-50 dark:fill-zinc-800/50" />
        <rect x="12" y="454" width="200" height="58" rx="6" fill="none" className="stroke-zinc-200 dark:stroke-zinc-700" strokeWidth="0.5" />
        {[
          { shape: "circle", label: "Category", fill: "#71717a" },
          { shape: "rect", label: "Skill", fill: "#71717a" },
          { shape: "dashed-rect", label: "Package", fill: "#a1a1aa" },
        ].map((item, i) => (
          <g key={item.label}>
            {item.shape === "circle" && <circle cx="28" cy={470 + i * 14} r="4" fill={item.fill} />}
            {item.shape === "rect" && <rect x="24" y={466 + i * 14} width="8" height="8" rx="2" fill={item.fill} />}
            {item.shape === "dashed-rect" && <rect x="24" y={466 + i * 14} width="8" height="8" rx="2" fill="none" stroke={item.fill} strokeDasharray="2,1" />}
            <text x="40" y={473 + i * 14} fontSize="8" className="fill-zinc-600 dark:fill-zinc-400">{item.label}</text>
          </g>
        ))}
        {RELATIONSHIP_TYPES.map((rel, i) => (
          <g key={rel.type}>
            <line x1="120" y1={470 + i * 14} x2="138" y2={470 + i * 14} className="stroke-zinc-400 dark:stroke-zinc-500" strokeWidth="1.2" strokeDasharray={rel.dash || "none"} />
            <text x="144" y={473 + i * 14} fontSize="8" className="fill-zinc-600 dark:fill-zinc-400">{rel.label}</text>
          </g>
        ))}

        {/* Arrowhead marker definition */}
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <path d="M0 0 L8 3 L0 6 Z" className="fill-zinc-400 dark:fill-zinc-500" />
          </marker>
          {/* Animated dash for edges */}
          <style>{`
            @keyframes dashMove { to { stroke-dashoffset: -20; } }
            .animated-edge { animation: dashMove 2s linear infinite; }
          `}</style>
        </defs>
      </svg>
    </div>
  );
}

/* ── Page component ─────────────────────────────────────────────────── */

export default function OntologyPage({
  categoryCounts,
  totalSkills,
  totalCollections,
  totalCollectionSkills,
  topTags,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const seoMeta: SeoMeta = {
    title: "Skill Ontology | Colaberry AI",
    description: "How skills are organized into a structured, composable network — taxonomy, relation graph, and package library.",
    canonical: buildCanonical("/aixcelerator/skills/ontology"),
  };

  const catCount = SKILL_CATEGORIES.filter((c) => c.slug !== "other").length;

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) =>
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        )}
      </Head>

      <div className="reveal grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-start">
        <div>
          <SectionHeader
            as="h1"
            size="xl"
            kicker="Ontology"
            title="Skill Ontology"
            description="Skill Ontology organizes individual skills into a structured, composable network, enabling agents to reason, plan, and execute complex tasks as an extensible, maintainable capability system."
          />
          <div className="mt-6 rounded-xl border border-zinc-200/80 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span className="mr-1.5 inline-block rounded bg-[#DC2626]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#DC2626] dark:text-[#F87171]">How it works</span>
              When querying for a task, the system traverses this graph to identify the necessary collections and skills to construct a capable agent.
            </p>
          </div>
        </div>

        {/* Interactive 3-Layer Architecture Diagram */}
        <div className="reveal-scale rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <OntologyDiagram
            categoryCounts={categoryCounts}
            totalSkills={totalSkills}
            topTags={topTags}
          />
        </div>
      </div>

      {/* Architecture Explanation Cards */}
      <section className="reveal mt-12">
        <SectionHeader size="md" kicker="Architecture" title="Three-Layer Design" description="How skills are organized from abstract taxonomy to deployable packages." />
        <div className="mt-6 stagger-grid grid gap-4 sm:grid-cols-3">
          <div className="catalog-card p-6">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">1. Skill Taxonomy</h3>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">The Abstraction Layer</div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              The top layer defines the broad categorization and detailed tags of skills. It organizes capabilities into categories such as:
            </p>
            <ul className="mt-2 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <li>Development, AI & Generation, Testing</li>
              <li>Research, Data & Science</li>
              <li>Business, Productivity, Security</li>
            </ul>
            <div className="mt-3 text-[10px] text-zinc-400">
              Purpose: Classification & Vocabulary — <span className="font-semibold">{catCount} categories</span>, <span className="font-semibold">{topTags.length}+ tags</span>
            </div>
          </div>

          <div className="catalog-card p-6">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">2. Skill Relation Graph</h3>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">The Semantic Layer</div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              The middle layer instantiates specific skills and defines how they interact. It maps relationships using edges like:
            </p>
            <ul className="mt-2 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <li>compose_with: Combining patterns</li>
              <li>similar_to: Mapping alternatives</li>
              <li>depend_on: Establishing prerequisites</li>
              <li>belong_to: Sub-component within a larger skill</li>
            </ul>
            <div className="mt-3 text-[10px] text-zinc-400">
              Purpose: Reasoning & Composition — <span className="font-semibold">{totalSkills.toLocaleString()} skills</span>, <span className="font-semibold">4 relationship types</span>
            </div>
          </div>

          <div className="catalog-card p-6">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">3. Skill Collection</h3>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">The Execution Layer</div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              Groups related skills into deployable units. These are the actual functional toolkits agents load at runtime. Examples:
            </p>
            <ul className="mt-2 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              {SKILL_COLLECTIONS.slice(0, 4).map((col) => (
                <li key={col.slug}>
                  <Link href={`/aixcelerator/skills/collections/${col.slug}`} className="hover:text-zinc-900 dark:hover:text-zinc-200">
                    {col.slug}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-[10px] text-zinc-400">
              Purpose: Deployment & Execution — <span className="font-semibold">{totalCollections} collections</span>, <span className="font-semibold">{totalCollectionSkills} skills</span>
            </div>
          </div>
        </div>
      </section>

      {/* Relationship Types Section */}
      <section className="reveal mt-12">
        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
          Relationship Types
        </h2>
        <div className="mt-4 stagger-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {RELATIONSHIP_TYPES.map((rel) => (
            <div key={rel.type} className="catalog-card p-5">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{rel.label}</span>
              </div>
              <code className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">{rel.type}</code>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{rel.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="reveal mt-12 stagger-grid grid gap-4 sm:grid-cols-3">
        <Link href="/aixcelerator/skills/graph" className="group catalog-card p-5 text-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="mx-auto text-zinc-500 dark:text-zinc-400" aria-hidden="true"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <div className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">Skill Graph</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Interactive force-graph with {totalSkills.toLocaleString()}+ skills</div>
          <div className="mt-2 text-xs font-semibold text-[#DC2626] group-hover:underline dark:text-[#F87171]">Explore →</div>
        </Link>
        <Link href="/aixcelerator/skills/collections" className="group catalog-card p-5 text-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="mx-auto text-zinc-500 dark:text-zinc-400" aria-hidden="true"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <div className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">Collections</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{totalCollections} curated skill bundles</div>
          <div className="mt-2 text-xs font-semibold text-[#DC2626] group-hover:underline dark:text-[#F87171]">Browse →</div>
        </Link>
        <Link href="/aixcelerator/skills" className="group catalog-card p-5 text-center">
          <ContentTypeIcon type="skill" size={22} className="mx-auto text-zinc-500 dark:text-zinc-400" />
          <div className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">Skills Catalog</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Browse all skills with taxonomy filters</div>
          <div className="mt-2 text-xs font-semibold text-[#DC2626] group-hover:underline dark:text-[#F87171]">Browse →</div>
        </Link>
      </section>

      <EnterpriseCtaBand
        kicker="Skills ontology"
        title="Explore the skill network"
        description="Discover how AI skills connect, compose, and depend on each other across the platform."
        primaryHref="/aixcelerator/skills/graph"
        primaryLabel="View skill graph"
        secondaryHref="/aixcelerator/skills"
        secondaryLabel="Browse all skills"
        className="mt-16"
      />
    </Layout>
  );
}
