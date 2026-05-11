import Layout from "../../components/Layout";
import Link from "next/link";
import Head from "next/head";
import type { GetStaticProps } from "next";
import SectionHeader from "../../components/SectionHeader";
import EnterpriseCtaBand from "../../components/EnterpriseCtaBand";
import ContentTypeIcon from "../../components/ContentTypeIcon";
import { coreCapabilities, modularLayers } from "../../data/platformCapabilities";
import { SOLUTION_STACKS } from "../../data/solution-stacks";
import { CONTENT_TYPE_META } from "../../lib/ontologyRegistry";
import { fetchCatalogCounts } from "../../lib/cms";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../lib/seo";
import type { ContentTypeName } from "../../lib/ontologyTypes";

/* ── Types ─────────────────────────────────────────────────────────── */

type CatalogCounts = {
  agents: number;
  mcpServers: number;
  skills: number;
  tools: number;
  podcasts: number;
};

type AIXceleratorProps = {
  counts: CatalogCounts;
  fetchError: boolean;
};

/* ── Data fetching ─────────────────────────────────────────────────── */

export const getStaticProps: GetStaticProps<AIXceleratorProps> = async () => {
  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";
  const visibilityFilter = allowPrivate ? undefined : "public";

  try {
    const counts = await fetchCatalogCounts(visibilityFilter);
    return {
      props: { counts, fetchError: false },
      revalidate: 600,
    };
  } catch {
    return {
      props: {
        counts: { agents: 160, mcpServers: 1500, skills: 500, tools: 400, podcasts: 246 },
        fetchError: true,
      },
      revalidate: 120,
    };
  }
};

/* ── Constants ─────────────────────────────────────────────────────── */

const ICON_MAP: Record<string, ContentTypeName> = {
  Agents: "agent",
  MCP: "mcp",
  Skills: "skill",
  Podcasts: "podcast",
  Tools: "tool",
};

const METRICS: {
  key: keyof CatalogCounts;
  label: string;
  type: ContentTypeName;
  href: string;
}[] = [
  { key: "skills", label: "Skills", type: "skill", href: "/aixcelerator/skills" },
  { key: "mcpServers", label: "MCP Servers", type: "mcp", href: "/aixcelerator/mcp" },
  { key: "agents", label: "Agents", type: "agent", href: "/aixcelerator/agents" },
  { key: "podcasts", label: "Episodes", type: "podcast", href: "/resources/podcasts" },
];

const GRAPH_LAYERS = [
  {
    step: "1",
    title: "Taxonomy",
    description: "Every artifact is classified into categories with structured metadata.",
  },
  {
    step: "2",
    title: "Relations",
    description: "Cross-type links map how agents use skills and connect via MCPs.",
  },
  {
    step: "3",
    title: "Collections",
    description: "Curated bundles group related artifacts into deployable patterns.",
  },
];

/* ── Pre-computed data (avoid re-creation on every render) ─────────── */

const visibleCore = coreCapabilities.filter((c) => c.href !== "/aixcelerator");
const featuredStacks = SOLUTION_STACKS.slice(0, 3);

/* ── Helpers ────────────────────────────────────────────────────────── */

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k+`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k+`;
  return `${n}+`;
}

/* ── Page ───────────────────────────────────────────────────────────── */

export default function AIXcelerator({ counts }: AIXceleratorProps) {
  const seoMeta: SeoMeta = {
    title: "AIXcelerator Platform | Colaberry AI - Enterprise Agent Delivery",
    description: "AIXcelerator is the core platform for governed AI agent delivery. Discover agents, MCP servers, skills, and use cases in one enterprise operating surface.",
    canonical: buildCanonical("/aixcelerator"),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "AIXcelerator",
          "applicationCategory": "Enterprise AI Platform",
          "description": "Core platform for governed AI agent delivery, observability, and evaluation.",
          "url": buildCanonical("/aixcelerator"),
          "provider": { "@type": "Organization", "name": "Colaberry AI" },
        }).replace(/</g, "\\u003c") }} />
      </Head>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="reveal flex flex-col gap-4">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 py-1 pl-2.5 pr-3.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-600 dark:bg-red-400" />
          Enterprise agent operating surface
        </div>
        <SectionHeader
          as="h1"
          size="xl"
          title="AIXcelerator"
          description="The core platform for governed agent delivery. Move from opportunity and workflow definition to production execution — then close the loop with observability and evaluation."
        />
      </div>

      {/* ── Live catalog metrics ──────────────────────────────────── */}
      <div className="reveal mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-700 md:grid-cols-4">
        {METRICS.map(({ key, label, type, href }) => (
          <Link
            key={key}
            href={href}
            className="group flex flex-col gap-1 bg-zinc-50 px-5 py-4 transition-colors duration-150 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800/80"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                <ContentTypeIcon type={type} size={13} />
              </span>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
            </div>
            <span className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{formatCount(counts[key])}</span>
          </Link>
        ))}
      </div>

      {/* ── Core platform surface ─────────────────────────────────── */}
      <section className="reveal section-spacing">
        <SectionHeader
          kicker="Core"
          title="Core platform surface"
          description="The trusted foundation for agent delivery, governance, and observability."
          size="md"
        />
        <div className="stagger-grid mt-6 grid gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-700 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCore.map((capability) => {
            const iconType = ICON_MAP[capability.title];
            return (
              <Link
                key={capability.href}
                href={capability.href}
                className="group flex flex-col gap-3 bg-zinc-50 p-6 transition-colors duration-150 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800/80"
                aria-label={`Open ${capability.title}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {iconType ? (
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        <ContentTypeIcon type={iconType} size={18} />
                      </span>
                    ) : null}
                    <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">{capability.title}</span>
                  </div>
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-zinc-300 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400">
                    <path d="M6.5 3.5 11 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </div>
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{capability.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Knowledge graph method ────────────────────────────────── */}
      <section className="reveal section-spacing">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            kicker="Method"
            title="Structured knowledge graph"
            description="Unlike flat catalogs, every artifact is classified, linked across types, and bundled into deployable collections."
            size="md"
          />
          <Link href="/aixcelerator/ontology" className="btn btn-secondary mt-3 sm:mt-0">
            Explore ontology
          </Link>
        </div>
        <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-700 sm:grid-cols-2 lg:grid-cols-3">
          {GRAPH_LAYERS.map((layer) => (
            <div key={layer.step} className="flex items-start gap-3 bg-zinc-50 p-6 dark:bg-zinc-900">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">
                {layer.step}
              </span>
              <div>
                <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">{layer.title}</span>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{layer.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Cross-type relationship summary */}
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Cross-type links</span>
          <span aria-hidden="true" className="h-3 w-px bg-zinc-300 dark:bg-zinc-600" />
          {Object.entries(CONTENT_TYPE_META).filter(([k]) => k !== "tool").map(([key, meta]) => (
            <span key={key} className="inline-flex items-center gap-1.5 text-[13px] text-zinc-600 dark:text-zinc-300">
              <ContentTypeIcon type={key as ContentTypeName} size={13} className="text-zinc-400 dark:text-zinc-500" />
              {meta.label}
            </span>
          ))}
        </div>
      </section>

      {/* ── Solution stacks ───────────────────────────────────────── */}
      <section className="reveal section-spacing">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            kicker="Stacks"
            title="Solution stacks"
            description="Pre-assembled bundles that combine agents, skills, and MCPs into deployment-ready patterns."
            size="md"
          />
          <Link href="/aixcelerator/solution-stacks" className="btn btn-secondary mt-3 sm:mt-0">
            View all stacks
          </Link>
        </div>
        <div className="stagger-grid mt-6 grid gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-700 sm:grid-cols-2 lg:grid-cols-3">
          {featuredStacks.map((stack) => {
            const typeCounts = stack.items.reduce<Record<string, number>>((acc, item) => {
              acc[item.type] = (acc[item.type] || 0) + 1;
              return acc;
            }, {});
            return (
              <Link
                key={stack.slug}
                href={`/aixcelerator/solution-stacks#${stack.slug}`}
                className="group flex flex-col gap-3 bg-zinc-50 p-6 transition-colors duration-150 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800/80"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">{stack.name}</span>
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-zinc-300 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400">
                    <path d="M6.5 3.5 11 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </div>
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{stack.description}</p>
                <div className="mt-auto flex flex-wrap gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  {Object.entries(typeCounts).map(([type, count]) => (
                    <span key={type} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      <ContentTypeIcon type={type as ContentTypeName} size={10} />
                      {count} {CONTENT_TYPE_META[type as ContentTypeName]?.label || type}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Modular capability layers ────────────────────────────── */}
      <section className="reveal section-spacing">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            kicker="Layers"
            title="Modular capability layers"
            description="First-class capabilities introduced incrementally on top of the core."
            size="md"
          />
          <Link href="/resources" className="btn btn-secondary mt-3 sm:mt-0">
            Explore resources
          </Link>
        </div>

        <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-700 sm:grid-cols-2 xl:grid-cols-4">
          {modularLayers.map((capability) => {
            const iconType = ICON_MAP[capability.title];
            return (
              <Link
                key={capability.href}
                href={capability.href}
                className="group flex items-start gap-3 bg-zinc-50 p-6 transition-colors duration-150 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800/80"
                aria-label={`Open ${capability.title}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    {iconType ? (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        <ContentTypeIcon type={iconType} size={14} />
                      </span>
                    ) : (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 4h12M2 8h12M2 12h12" />
                        </svg>
                      </span>
                    )}
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{capability.title}</span>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">{capability.description}</p>
                </div>
                <svg aria-hidden="true" viewBox="0 0 16 16" className="mt-1 h-3.5 w-3.5 shrink-0 text-zinc-300 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400">
                  <path d="M6.5 3.5 11 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Roadmap ───────────────────────────────────────────────── */}
      <section className="reveal section-spacing">
        <SectionHeader
          kicker="Roadmap"
          title="Discovery layer next steps"
          description="Clear milestones that deepen how teams and LLMs explore the catalog."
          size="md"
        />
        <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-700 sm:grid-cols-2">
          <RoadmapItem
            title="LLM-friendly detail pages"
            status="Now live"
            description="Structured profiles for Agents and MCP servers with metadata-first layouts."
          />
          <RoadmapItem
            title="Chatbot exploration layer"
            status="Planned"
            description="Conversational discovery across agents, MCPs, and knowledge signals."
          />
        </div>
      </section>

      {/* ── CTA band ──────────────────────────────────────────────── */}
      <EnterpriseCtaBand
        kicker="Get started"
        title="Ready to accelerate agent delivery?"
        description="Explore the AIXcelerator catalog or request a live demo with our team."
        primaryHref="/request-demo"
        primaryLabel="Book a demo"
        secondaryHref="/aixcelerator/agents"
        secondaryLabel="Browse agents"
      />
    </Layout>
  );
}

/* ── Sub-components ────────────────────────────────────────────────── */

function RoadmapItem({
  title,
  status,
  description,
}: {
  title: string;
  status: string;
  description: string;
}) {
  const isLive = status.toLowerCase().includes("live");
  return (
    <div className="flex flex-col gap-2 bg-zinc-50 p-6 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">{title}</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${isLive ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"}`}>
          {isLive ? <span aria-hidden="true" className="h-1 w-1 rounded-full bg-current opacity-60" /> : null}
          {status}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
    </div>
  );
}
