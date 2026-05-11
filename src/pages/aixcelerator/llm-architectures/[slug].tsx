import type { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import Head from "next/head";
import Layout from "../../../components/Layout";
import SectionHeader from "../../../components/SectionHeader";
import EnterpriseCtaBand from "../../../components/EnterpriseCtaBand";
import ArchitectureDiagram from "../../../components/ArchitectureDiagram";
import LLMArchitectureDeepDive from "../../../components/LLMArchitectureDeepDive";
import { LLMArchitecture, fetchLlmArchitectureBySlug } from "../../../lib/cms";
import {
  deepDiveToPlaintext,
  deepDiveToCitations,
  deepDiveWordCount,
} from "../../../lib/deepDiveToPlaintext";
import { seoTags, canonicalUrl as buildCanonical, type SeoMeta } from "../../../lib/seo";
import { classifyLlmArchitecture } from "../../../data/llm-architecture-taxonomy";
import { LLM_ARCHITECTURES, loadRegistryJSON, mergeWithRegistry } from "../../../data/llm-architectures";
import type { LLMArchitecture as DataLLMArch } from "../../../data/llm-architectures";

const DECODER_DOT: Record<string, string> = {
  Dense: "bg-zinc-400 dark:bg-zinc-500",
  MoE: "bg-[#DC2626]",
  Hybrid: "bg-zinc-600 dark:bg-zinc-300",
  Recurrent: "bg-zinc-500 dark:bg-zinc-400",
};

type DetailProps = {
  arch: LLMArchitecture;
};

export const getStaticPaths: GetStaticPaths = async () => {
  return { paths: [], fallback: "blocking" };
};

/**
 * Enrich a CMS LLMArchitecture record with missing architectural fields
 * (numLayers, hiddenSize, vocabSize, configUrl, paperUrl, keyFeatures)
 * from the static dataset + Raschka registry. CMS values always win;
 * static/registry only fills in `null`/`undefined` gaps.
 *
 * Why: the CMS schema for `llm-architecture` is sparse — many records don't
 * carry per-block details like `numLayers`. Without this backfill, the
 * ArchitectureDiagram falls back to an estimated layer count (e.g. 128)
 * instead of the actual value (e.g. 78 for GLM-5.1).
 */
function enrichArchitecture(cms: LLMArchitecture): LLMArchitecture {
  const staticEntry = LLM_ARCHITECTURES.find((s) => s.slug === cms.slug);
  const registryEntry = loadRegistryJSON().find((r) => r.slug === cms.slug);

  return {
    ...cms,
    numLayers: cms.numLayers ?? staticEntry?.numLayers ?? registryEntry?.numLayers ?? null,
    hiddenSize: cms.hiddenSize ?? staticEntry?.hiddenSize ?? registryEntry?.hiddenSize ?? null,
    vocabSize: cms.vocabSize ?? staticEntry?.vocabSize ?? registryEntry?.vocabSize ?? null,
    configUrl: cms.configUrl ?? staticEntry?.configUrl ?? registryEntry?.configUrl ?? null,
    paperUrl: cms.paperUrl ?? staticEntry?.paperUrl ?? registryEntry?.paperUrl ?? null,
    keyFeatures: cms.keyFeatures && cms.keyFeatures.length > 0
      ? cms.keyFeatures
      : (staticEntry?.keyFeatures ?? (Array.isArray(registryEntry?.keyFeatures) ? registryEntry.keyFeatures : []) ?? []),
  };
}

/**
 * Convert a data-file `LLMArchitecture` (sparse, all-optional) into the
 * CMS-shape `LLMArchitecture` used by the detail page. Mirrors the conversion
 * in `index.tsx` getStaticProps fallback so detail and listing share the same
 * shape contract. Synthetic negative `id` flags non-CMS origin.
 */
function dataToCmsArch(a: DataLLMArch, idHint = -1): LLMArchitecture {
  return {
    id: idHint,
    slug: a.slug,
    name: a.name,
    organization: a.organization,
    description: a.description ?? null,
    longDescription: null,
    parameters: a.parameters,
    activeParameters: a.activeParameters ?? null,
    contextWindow: a.contextWindow,
    vocabSize: a.vocabSize ?? null,
    numLayers: a.numLayers ?? null,
    hiddenSize: a.hiddenSize ?? null,
    releaseDate: a.releaseDate,
    decoderType: a.decoderType,
    attention: a.attention,
    keyFeatures: a.keyFeatures ?? [],
    configUrl: a.configUrl ?? null,
    paperUrl: a.paperUrl ?? null,
    visibility: "public",
    verified: false,
    tags: [],
    // Static/registry entries never carry deep-dive content — only
    // CMS-backed records can. Explicit `null` lets the precedence
    // fallback in the page skip the deep-dive branch.
    deepDive: null,
  };
}

export const getStaticProps: GetStaticProps<DetailProps> = async ({ params }) => {
  const slug = String(params?.slug || "");
  if (!slug) return { notFound: true, revalidate: 120 };

  // 1. Try CMS first
  try {
    const arch = await fetchLlmArchitectureBySlug(slug);
    if (arch) {
      return { props: { arch: enrichArchitecture(arch) }, revalidate: 600 };
    }
  } catch { /* fall through to registry/static */ }

  // 2. Fallback: registry JSON merged with static dataset
  //    (Same data source the listing page uses when CMS is empty / missing the slug)
  try {
    const merged = mergeWithRegistry(loadRegistryJSON());
    const dataEntry = merged.find((a) => a.slug === slug);
    if (dataEntry) {
      const cmsShape = dataToCmsArch(dataEntry);
      return { props: { arch: enrichArchitecture(cmsShape) }, revalidate: 600 };
    }
  } catch { /* fall through */ }

  // 3. Final fallback: pure static dataset
  const staticEntry = LLM_ARCHITECTURES.find((a) => a.slug === slug);
  if (staticEntry) {
    const cmsShape = dataToCmsArch(staticEntry);
    return { props: { arch: enrichArchitecture(cmsShape) }, revalidate: 600 };
  }

  return { notFound: true, revalidate: 120 };
};

export default function LLMArchitectureDetail({ arch }: DetailProps) {
  const category = classifyLlmArchitecture(arch);
  const dot = DECODER_DOT[arch.decoderType] || DECODER_DOT.Dense;
  const paramLabel = arch.activeParameters
    ? `${arch.activeParameters} active / ${arch.parameters} total`
    : arch.parameters;

  const seoMeta: SeoMeta = {
    title: `${arch.name} — LLM Architecture | Colaberry AI`,
    description: arch.description || `${arch.name} by ${arch.organization}: ${arch.decoderType} decoder with ${arch.parameters} parameters and ${arch.contextWindow} context window.`,
    canonical: buildCanonical(`/aixcelerator/llm-architectures/${arch.slug}`),
    ogType: "article",
  };

  /* ── TechArticle JSON-LD (Sprint v4 AEO) ─────────────────────────────
   * When a deep-dive is present, we emit the richer variant so AI answer
   * engines (ChatGPT, Claude, Perplexity) can cite Colaberry directly:
   *   - `articleBody` is the flattened plaintext of every deep-dive block
   *   - `wordCount` is computed from the same serialization
   *   - `citation` is the structured reference list
   *   - `proficiencyLevel: "Expert"` marks this as a technical deep dive
   * When no deep-dive exists, we fall back to the minimal stub that was
   * already on the page before v4.
   */
  const hasDeepDive = Array.isArray(arch.deepDive) && arch.deepDive.length > 0;
  const articleBody = hasDeepDive ? deepDiveToPlaintext(arch.deepDive) : undefined;
  const citations = hasDeepDive ? deepDiveToCitations(arch.deepDive) : [];
  const wordCount = hasDeepDive ? deepDiveWordCount(arch.deepDive) : 0;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: arch.name,
    name: arch.name,
    description: seoMeta.description,
    url: seoMeta.canonical,
    inLanguage: "en",
    author: {
      "@type": "Organization",
      name: "Colaberry AI",
      url: "https://colaberry.ai",
    },
    publisher: {
      "@type": "Organization",
      name: "Colaberry AI",
      url: "https://colaberry.ai",
    },
    about: {
      "@type": "Thing",
      name: `${arch.name} — ${arch.organization} ${arch.decoderType} LLM architecture`,
    },
    datePublished: arch.releaseDate,
    dateModified: new Date().toISOString().slice(0, 10),
  };
  if (hasDeepDive) {
    jsonLd.articleBody = articleBody;
    jsonLd.wordCount = wordCount;
    jsonLd.proficiencyLevel = "Expert";
    jsonLd.dependencies = `Transformer, ${arch.attention}, ${arch.decoderType} decoder`;
    jsonLd.keywords = [
      arch.name,
      arch.organization,
      arch.decoderType,
      arch.attention,
      `${arch.parameters} parameters`,
      `${arch.contextWindow} context`,
      "LLM architecture",
      "deep dive",
    ].join(", ");
    if (citations.length > 0) jsonLd.citation = citations;
  }

  /* ── Spec rows for the fact sheet ──────────────────────────────────── */
  const specs: { label: string; value: string }[] = [
    { label: "Parameters", value: paramLabel },
    { label: "Context Window", value: arch.contextWindow },
    { label: "Decoder Type", value: arch.decoderType },
    { label: "Attention", value: arch.attention },
  ];
  if (arch.activeParameters) specs.push({ label: "Active Parameters", value: arch.activeParameters });
  if (arch.numLayers) specs.push({ label: "Layers", value: String(arch.numLayers) });
  if (arch.hiddenSize) specs.push({ label: "Hidden Size", value: arch.hiddenSize.toLocaleString() });
  if (arch.vocabSize) specs.push({ label: "Vocabulary Size", value: arch.vocabSize });
  specs.push({ label: "Release Date", value: arch.releaseDate });
  specs.push({ label: "Category", value: category.label });
  specs.push({ label: "Organization", value: arch.organization });

  return (
    <Layout>
      <Head>
        <title>{seoMeta.title}</title>
        {seoTags(seoMeta).map(({ key, ...props }) => (
          "rel" in props ? <link key={key} {...props} /> : <meta key={key} {...props} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      </Head>

      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <nav className="mb-6 text-sm text-zinc-500 dark:text-zinc-400" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5">
          <li><Link href="/aixcelerator" className="hover:text-zinc-700 dark:hover:text-zinc-200">AIXcelerator</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/aixcelerator/llm-architectures" className="hover:text-zinc-700 dark:hover:text-zinc-200">LLM Architectures</Link></li>
          <li aria-hidden="true">/</li>
          <li className="truncate text-zinc-900 dark:text-zinc-50 font-medium">{arch.name}</li>
        </ol>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="reveal">
        <div className="mb-3 flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">{arch.decoderType}</span>
          {arch.verified && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">Verified</span>
          )}
        </div>
        <SectionHeader
          as="h1"
          size="xl"
          kicker={`${arch.organization} · ${arch.releaseDate}`}
          title={arch.name}
          description={arch.description || `${arch.decoderType} decoder architecture with ${arch.attention} attention mechanism.`}
        />
      </div>

      {/* ── Architecture Diagram (full-width focal point) ──────────────────
          Layout philosophy (Raschka-style): the architecture diagram is THE
          focal point — stack it full-width at the top, specs below. Users
          come to these pages to see the architecture; everything else is
          supporting context. On ultra-wide screens we cap the width so the
          SVG doesn't become absurdly large, but let it grow much bigger
          than the old side-by-side 360px cap. */}
      <div className="reveal mt-8">
        <ArchitectureDiagram
          name={arch.name}
          decoderType={arch.decoderType}
          attention={arch.attention}
          parameters={arch.parameters}
          contextWindow={arch.contextWindow}
          activeParameters={arch.activeParameters}
          vocabSize={arch.vocabSize}
          hiddenSize={arch.hiddenSize}
          numLayers={arch.numLayers}
          keyFeatures={arch.keyFeatures}
          className="mx-auto w-full max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl"
        />
      </div>

      {/* ── Quick Specs Strip + Resource Pills ─────────────────────────────
          Horizontal strip sitting directly beneath the diagram. Mirrors the
          Raschka gallery pattern where key specs accompany the diagram as a
          single line of context. */}
      <div className="reveal mt-6 mx-auto w-full max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-50">{paramLabel}</span>
          <span className="text-zinc-300 dark:text-zinc-600">|</span>
          <span className="text-zinc-600 dark:text-zinc-400">{arch.contextWindow} context</span>
          <span className="text-zinc-300 dark:text-zinc-600">|</span>
          <span className="text-zinc-600 dark:text-zinc-400">{arch.attention}</span>
          <span className="text-zinc-300 dark:text-zinc-600">|</span>
          <span className="text-zinc-600 dark:text-zinc-400">{arch.decoderType}</span>
        </div>
        {(arch.configUrl || arch.paperUrl) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {arch.configUrl && (
              <a href={arch.configUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
                config.json
              </a>
            )}
            {arch.paperUrl && (
              <a href={arch.paperUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
                Tech report
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── Fact Sheet ─────────────────────────────────────────────────── */}
      <section className="reveal mt-8 mx-auto w-full max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Architecture Specifications</h2>
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {specs.map((s) => (
              <div key={s.label} className="flex items-baseline justify-between gap-4 px-5 py-3">
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{s.label}</span>
                <span className="text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Key Features ───────────────────────────────────────────────── */}
      {arch.keyFeatures.length > 0 && (
        <section className="reveal detail-section mt-8 mx-auto w-full max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Key Features</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {arch.keyFeatures.map((f) => (
              <span key={f} className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{f}</span>
            ))}
          </div>
        </section>
      )}

      {/* ── Deep-Dive Content ──────────────────────────────────────────────
          Precedence:
            1. `deepDive` Strapi Dynamic Zone (Sprint v4) — structured,
               editor-composed blocks rendered via LLMArchitectureDeepDive.
            2. `longDescription` richtext (legacy fallback) — raw HTML
               rendered inside a .prose container.
            3. Neither present — section omitted entirely.
          Separating the two paths keeps the transition incremental: new
          flagship models get the dynamic zone, older records can keep
          using longDescription until an editor migrates them. */}
      {arch.deepDive && arch.deepDive.length > 0 ? (
        <section className="reveal detail-section mt-8 mx-auto w-full max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Deep Dive</h2>
          <div className="mt-3">
            <LLMArchitectureDeepDive blocks={arch.deepDive} />
          </div>
        </section>
      ) : arch.longDescription ? (
        <section className="reveal detail-section mt-8 mx-auto w-full max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Description</h2>
          <div className="mt-3 prose prose-zinc dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: arch.longDescription }} />
        </section>
      ) : null}

      {/* External links are in the diagram sidebar above */}

      {/* ── Tags ───────────────────────────────────────────────────────── */}
      {arch.tags && arch.tags.length > 0 && (
        <section className="reveal detail-section mt-8 mx-auto w-full max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Tags</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {arch.tags.map((t) => (
              <span key={t.slug} className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{t.name}</span>
            ))}
          </div>
        </section>
      )}

      <EnterpriseCtaBand
        kicker="Enterprise AI platform"
        title="Compare, evaluate, and deploy LLM architectures at scale"
        description="Colaberry AI provides architecture specifications, benchmark comparisons, and deployment guidance for enterprise AI teams."
        primaryHref="/request-demo"
        primaryLabel="Request demo"
        secondaryHref="/aixcelerator/llm-architectures"
        secondaryLabel="Back to gallery"
        className="mt-10"
      />
    </Layout>
  );
}
