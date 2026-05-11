import LLMArchitectureCard, { LLMCompareCard, type LLMArchCardProps } from "../../../components/LLMArchitectureCard";
import AeoQuickAnswer from "../../../components/AeoQuickAnswer";
import CatalogSnapshot from "../../../components/CatalogSnapshot";
import EnterpriseCtaBand from "../../../components/EnterpriseCtaBand";
import Layout from "../../../components/Layout";
import MiniOntologyDiagram from "../../../components/MiniOntologyDiagram";
import SectionHeader from "../../../components/SectionHeader";
import StatePanel from "../../../components/StatePanel";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GetStaticProps } from "next";
import { type LLMArchitecture, fetchLlmArchitectures } from "../../../lib/cms";
import { LLM_ARCHITECTURES, loadRegistryJSON, mergeWithRegistry } from "../../../data/llm-architectures";
import type { LLMArchitecture as DataLLMArch } from "../../../data/llm-architectures";
import { useRouter } from "next/router";
import Head from "next/head";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";
import { LLM_ARCHITECTURE_ONTOLOGY_CONFIG, classifyLlmArchitecture } from "../../../data/llm-architecture-taxonomy";

type PageProps = {
  architectures: LLMArchitecture[];
  fetchError: boolean;
  source: "cms" | "registry" | "static";
};

/**
 * Enrich CMS records with missing architectural fields from the static dataset
 * + Raschka registry. CMS values always win; static/registry only fills gaps.
 * Ensures card-level diagrams get the correct `numLayers` even when the CMS
 * schema omits it (otherwise the diagram falls back to an estimated layer count).
 */
function enrichArchitectures(cmsData: LLMArchitecture[]): LLMArchitecture[] {
  const registry = loadRegistryJSON();
  const staticBySlug = new Map(LLM_ARCHITECTURES.map((s) => [s.slug, s]));
  const registryBySlug = new Map(registry.map((r) => [r.slug, r]));
  return cmsData.map((cms) => {
    const s = staticBySlug.get(cms.slug);
    const r = registryBySlug.get(cms.slug);
    return {
      ...cms,
      numLayers: cms.numLayers ?? s?.numLayers ?? r?.numLayers ?? null,
      hiddenSize: cms.hiddenSize ?? s?.hiddenSize ?? r?.hiddenSize ?? null,
      vocabSize: cms.vocabSize ?? s?.vocabSize ?? r?.vocabSize ?? null,
      configUrl: cms.configUrl ?? s?.configUrl ?? r?.configUrl ?? null,
      paperUrl: cms.paperUrl ?? s?.paperUrl ?? r?.paperUrl ?? null,
      keyFeatures: cms.keyFeatures && cms.keyFeatures.length > 0
        ? cms.keyFeatures
        : (s?.keyFeatures ?? (Array.isArray(r?.keyFeatures) ? r.keyFeatures : []) ?? []),
    };
  });
}

export const getStaticProps: GetStaticProps<PageProps> = async () => {
  // 1. Try CMS first (same as MCP pattern)
  try {
    const cmsData = await fetchLlmArchitectures("public", { maxRecords: 500, sortBy: "latest" });
    if (cmsData.length > 0) {
      return {
        props: { architectures: enrichArchitectures(cmsData), fetchError: false, source: "cms" },
        revalidate: 600,
      };
    }
  } catch { /* fall through to registry */ }

  // 2. Fallback: merge registry JSON + static data
  try {
    const registryData = loadRegistryJSON();
    const merged = mergeWithRegistry(registryData);
    if (merged.length > 0) {
      // Convert data-file LLMArchitecture to CMS-compatible shape (add synthetic id)
      const compatible: LLMArchitecture[] = merged.map((a: DataLLMArch, i: number) => ({
        id: -(i + 1), // negative ids indicate non-CMS entries
        ...a,
        description: a.description ?? null,
        activeParameters: a.activeParameters ?? null,
        vocabSize: a.vocabSize ?? null,
        numLayers: a.numLayers ?? null,
        hiddenSize: a.hiddenSize ?? null,
        configUrl: a.configUrl ?? null,
        paperUrl: a.paperUrl ?? null,
      }));
      return {
        props: { architectures: compatible, fetchError: false, source: registryData.length > 0 ? "registry" : "static" },
        revalidate: 600,
      };
    }
  } catch { /* fall through to error */ }

  return {
    props: { architectures: [], fetchError: true, source: "static" },
    revalidate: 120,
  };
};

const pageSize = 24;

type ViewMode = "detailed" | "compact";
type SortMode = "latest" | "alphabetical" | "params";

export default function LLMArchitecturesPage({ architectures, fetchError, source }: PageProps) {
  const router = useRouter();

  /* ── View & filter state ───────────────────────────────────────────── */
  const [viewMode, setViewMode] = useState<ViewMode>("detailed");
  const [search, setSearch] = useState("");
  const [decoderFilter, setDecoderFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [visibleCount, setVisibleCount] = useState(pageSize);

  /* ── Diff tool state ───────────────────────────────────────────────── */
  const [diffOpen, setDiffOpen] = useState(false);
  const [modelA, setModelA] = useState("");
  const [modelB, setModelB] = useState("");

  const effectiveSearch = (router.query.q as string) || search;

  /* ── Derived data ──────────────────────────────────────────────────── */
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const arch of architectures) {
      const cat = classifyLlmArchitecture(arch);
      counts[cat.slug] = (counts[cat.slug] || 0) + 1;
    }
    return counts;
  }, [architectures]);

  const organizations = useMemo(
    () => [...new Set(architectures.map((a) => a.organization))].sort(),
    [architectures],
  );

  const decoderTypes = useMemo(
    () => [...new Set(architectures.map((a) => a.decoderType))].sort(),
    [architectures],
  );

  const archBySlug = useMemo(() => {
    const map: Record<string, LLMArchitecture> = {};
    for (const a of architectures) if (a.slug) map[a.slug] = a;
    return map;
  }, [architectures]);

  /* ── Filtering + sorting ───────────────────────────────────────────── */
  const filtered = useMemo(() => {
    return architectures.filter((arch) => {
      if (decoderFilter !== "all" && arch.decoderType !== decoderFilter) return false;
      if (orgFilter !== "all" && arch.organization !== orgFilter) return false;
      if (effectiveSearch) {
        const hay = [arch.name, arch.organization, arch.attention, arch.decoderType, ...(arch.keyFeatures || [])].join(" ").toLowerCase();
        if (!hay.includes(effectiveSearch.toLowerCase())) return false;
      }
      return true;
    });
  }, [architectures, decoderFilter, orgFilter, effectiveSearch]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortMode === "alphabetical") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "params") {
      list.sort((a, b) => parseParamSize(b.parameters) - parseParamSize(a.parameters));
    } else {
      list.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
    }
    return list;
  }, [filtered, sortMode]);

  const visibleArchitectures = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;
  const hasResults = sorted.length > 0;

  /* ── Diff lookup ───────────────────────────────────────────────────── */
  const archA = modelA ? archBySlug[modelA] : null;
  const archB = modelB ? archBySlug[modelB] : null;

  /* ── Infinite scroll sentinel ──────────────────────────────────────── */
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore) {
          setVisibleCount((c) => c + pageSize);
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore]);

  /* ── SEO ───────────────────────────────────────────────────────────── */
  const archCount = architectures.length;
  const orgCount = organizations.length;
  const seoMeta: SeoMeta = {
    title: `LLM Architecture Gallery — ${archCount}+ Models | Colaberry AI`,
    description: `Compare ${archCount}+ large language model architectures from ${orgCount} organizations. Dense transformers, MoE, hybrid SSM, and recurrent models with parameters, context windows, and attention mechanisms.`,
    canonical: buildCanonical("/aixcelerator/llm-architectures"),
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "LLM Architecture Gallery",
    description: seoMeta.description,
    numberOfItems: archCount,
    itemListElement: architectures.slice(0, 12).map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: a.name,
      url: buildCanonical(`/aixcelerator/llm-architectures/${a.slug}`),
    })),
  };

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      </Head>

      {/* Data source attribution (AEO-indexable) */}
      <span className="sr-only" data-source={source}>
        Architecture data sourced from HuggingFace config.json files, ArXiv papers, and vendor technical reports.
        Registry sync powered by Raschka&apos;s LLM Architecture Gallery (Apache 2.0).
      </span>

      {fetchError && (
        <div className="mb-6">
          <StatePanel
            variant="error"
            title="Live architecture data is temporarily unavailable"
            description="Showing cached catalog entries while we reconnect to the CMS."
            action={
              <button
                type="button"
                onClick={() => router.replace(router.asPath)}
                className="btn btn-secondary btn-sm"
              >
                Retry
              </button>
            }
          />
        </div>
      )}

      <div className="reveal grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <SectionHeader
            as="h1"
            size="xl"
            kicker="LLM Architecture Gallery"
            title="LLM Architectures"
            description="A comprehensive catalog of large language model architectures — decoder types, attention mechanisms, parameter counts, and context windows — curated for enterprise AI research and evaluation."
          />
        </div>
        <div className="hidden lg:block">
          <MiniOntologyDiagram
            config={LLM_ARCHITECTURE_ONTOLOGY_CONFIG}
            categoryCounts={categoryCounts}
            totalItems={architectures.length}
          />
        </div>
      </div>

      <AeoQuickAnswer
        question="What LLM architectures does Colaberry AI catalog?"
        answer={`Colaberry AI catalogs ${archCount}+ large language model architectures from ${orgCount} organizations including Meta, Google, OpenAI, DeepSeek, Alibaba, and Mistral. The gallery covers Dense Transformers, Mixture-of-Experts (MoE), Hybrid SSM-Transformer, and Recurrent models with architecture specifications, attention mechanisms, and context window sizes.`}
        facts={[`${archCount} architectures`, `${orgCount} organizations`, "4 decoder types", "LLM-indexed"]}
      />

      <CatalogSnapshot
        stats={[
          { label: "Architectures", value: archCount.toLocaleString(), note: "Curated gallery" },
          { label: "Organizations", value: String(orgCount), note: "Global AI labs" },
          { label: "Decoder Types", value: String(decoderTypes.length), note: "Dense · MoE · Hybrid · Recurrent" },
        ]}
      />

      {/* ── Architecture Diff Tool ──────────────────────────────────────── */}
      <section className="reveal mt-6 sm:mt-8">
        <button
          type="button"
          onClick={() => setDiffOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-left transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <div className="flex items-center gap-3">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="18" rx="1.5" />
              <rect x="14" y="3" width="7" height="18" rx="1.5" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Architecture Diff Tool</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Compare two models side by side</p>
            </div>
          </div>
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className={`h-4 w-4 text-zinc-400 transition-transform dark:text-zinc-500 ${diffOpen ? "rotate-180" : ""}`}
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>

        {diffOpen && (
          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="diff-model-a" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Model A
                </label>
                <select
                  id="diff-model-a"
                  value={modelA}
                  onChange={(e) => setModelA(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200/80 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10"
                >
                  <option value="">Select model…</option>
                  {architectures.map((a) => (
                    <option key={a.slug} value={a.slug} disabled={a.slug === modelB}>
                      {a.name} ({a.organization})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="diff-model-b" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Model B
                </label>
                <select
                  id="diff-model-b"
                  value={modelB}
                  onChange={(e) => setModelB(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200/80 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10"
                >
                  <option value="">Select model…</option>
                  {architectures.map((a) => (
                    <option key={a.slug} value={a.slug} disabled={a.slug === modelA}>
                      {a.name} ({a.organization})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {archA && archB ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <LLMCompareCard arch={archA as LLMArchCardProps} />
                <LLMCompareCard arch={archB as LLMArchCardProps} />
              </div>
            ) : (
              <p className="mt-4 text-center text-sm text-zinc-400 dark:text-zinc-500">
                Select two models above to compare their architecture specifications.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── Filters + View Toggle ────────────────────────────────────────── */}
      <section className="reveal surface-panel mt-6 p-6 sm:mt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader
            kicker="Filters"
            title="Search and filter"
            description="Find architectures by decoder type, organization, parameters, and features."
            size="md"
          />
          {/* View mode toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 p-1 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setViewMode("detailed")}
              aria-label="Detailed view"
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "detailed"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                <rect x="1" y="1" width="6" height="6" rx="1" />
                <rect x="9" y="1" width="6" height="6" rx="1" />
                <rect x="1" y="9" width="6" height="6" rx="1" />
                <rect x="9" y="9" width="6" height="6" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("compact")}
              aria-label="Compact view"
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "compact"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                <rect x="1" y="1" width="14" height="3" rx="1" />
                <rect x="1" y="6" width="14" height="3" rx="1" />
                <rect x="1" y="11" width="14" height="3" rx="1" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12">
          <div className="sm:col-span-2 md:col-span-3 lg:col-span-4">
            <label htmlFor="llm-search" className="sr-only">Search architectures</label>
            <div className="relative group">
              <input
                id="llm-search"
                name="llm-search"
                type="search"
                placeholder="Search models, orgs, attention..."
                value={effectiveSearch}
                onChange={(e) => { setSearch(e.target.value); setVisibleCount(pageSize); }}
                className="w-full rounded-lg border border-zinc-200/80 bg-zinc-50 px-4 py-2 pr-11 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200 dark:placeholder:text-zinc-500"
              />
              <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 dark:text-zinc-500" fill="none">
                <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" />
                <path d="M16.25 16.25 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="llm-decoder" className="sr-only">Filter by decoder type</label>
            <select
              id="llm-decoder"
              value={decoderFilter}
              onChange={(e) => { setDecoderFilter(e.target.value); setVisibleCount(pageSize); }}
              className="w-full rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200"
            >
              <option value="all">All decoder types</option>
              {decoderTypes.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="llm-org" className="sr-only">Filter by organization</label>
            <select
              id="llm-org"
              value={orgFilter}
              onChange={(e) => { setOrgFilter(e.target.value); setVisibleCount(pageSize); }}
              className="w-full rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200"
            >
              <option value="all">All organizations</option>
              {organizations.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex gap-2 lg:col-span-4">
            {(["latest", "alphabetical", "params"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSortMode(mode)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                  sortMode === mode ? "chip-brand" : "chip chip-neutral"
                }`}
              >
                {mode === "latest" ? "Latest" : mode === "alphabetical" ? "A–Z" : "Params ↓"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Jump-to Navigation ──────────────────────────────────────────── */}
      {hasResults && sorted.length > 6 && (
        <nav className="reveal mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900" aria-label="Jump to architecture card">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Jump to model</p>
          <div className="flex flex-wrap gap-1.5">
            {sorted.slice(0, 30).map((a) => (
              <a
                key={a.slug}
                href={`#card-${a.slug}`}
                className="rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                {a.name}
              </a>
            ))}
            {sorted.length > 30 && (
              <span className="px-2 py-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">+{sorted.length - 30} more</span>
            )}
          </div>
        </nav>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {hasResults ? (
        <>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            Showing {visibleArchitectures.length} of {sorted.length} architecture{sorted.length !== 1 ? "s" : ""}
          </p>

          {viewMode === "detailed" ? (
            <div className="reveal stagger-grid mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
              {visibleArchitectures.map((a) => (
                <div key={a.slug || String(a.id)} id={`card-${a.slug}`} className="h-full">
                  <LLMArchitectureCard arch={a as LLMArchCardProps} viewMode="detailed" />
                </div>
              ))}
            </div>
          ) : (
            <div className="reveal mt-6 flex flex-col gap-2 sm:mt-8">
              {visibleArchitectures.map((a) => (
                <LLMArchitectureCard key={a.slug || String(a.id)} arch={a as LLMArchCardProps} viewMode="compact" />
              ))}
            </div>
          )}

          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + pageSize)}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-6 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Load more architectures
              </button>
            </div>
          )}
          <div ref={sentinelRef} className="h-px" />
        </>
      ) : (
        <div className="reveal mt-8 text-center">
          <p className="text-lg font-medium text-zinc-600 dark:text-zinc-400">No architectures match your filters</p>
          <button
            type="button"
            onClick={() => { setSearch(""); setDecoderFilter("all"); setOrgFilter("all"); }}
            className="mt-4 rounded-full bg-[#DC2626] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
          >
            Clear filters
          </button>
        </div>
      )}

      <EnterpriseCtaBand
        kicker="Enterprise AI platform"
        title="Compare, evaluate, and deploy LLM architectures at scale"
        description="Colaberry AI provides architecture specifications, benchmark comparisons, and deployment guidance across dense transformers, MoE, hybrid, and recurrent models."
        primaryHref="/request-demo"
        primaryLabel="Request demo"
        secondaryHref="/aixcelerator"
        secondaryLabel="Explore platform"
        className="mt-10"
      />
    </Layout>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function parseParamSize(s: string): number {
  const m = s.match(/([\d.]+)\s*(T|B|M)/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  if (unit === "T") return n * 1000;
  if (unit === "M") return n / 1000;
  return n;
}
