/**
 * LLM Architecture taxonomy — 7 categories for classifying LLM architectures.
 * Part of the Colaberry AI Content Knowledge Graph Platform.
 * Categories based on decoder type, attention mechanism, and model scale.
 */

import type { ContentOntologyConfig, TaxonomyCategory, OntologyItem } from "../lib/ontologyTypes";

export const LLM_ARCHITECTURE_CATEGORIES: TaxonomyCategory[] = [
  {
    slug: "dense-transformer",
    label: "Dense Transformer",
    description: "Standard dense decoder-only transformer models with full attention.",
    keywords: ["dense", "mha", "gqa", "full attention", "standard", "rope", "qk-norm"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "mixture-of-experts",
    label: "Mixture of Experts",
    description: "Sparse MoE architectures with expert routing for efficient scaling.",
    keywords: ["moe", "expert", "routing", "sparse", "active parameters", "mixture"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "hybrid-architecture",
    label: "Hybrid Architecture",
    description: "Models combining attention with linear layers, SSMs, or recurrent blocks.",
    keywords: ["hybrid", "mamba", "ssm", "deltanet", "linear attention", "lightning"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "recurrent-models",
    label: "Recurrent Models",
    description: "Non-transformer architectures using recurrent mechanisms like xLSTM.",
    keywords: ["recurrent", "lstm", "xlstm", "rnn", "linear complexity"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "efficient-small",
    label: "Efficient & Small",
    description: "Compact models under 10B parameters optimized for on-device inference.",
    keywords: ["small", "compact", "efficient", "on-device", "lightweight", "nano", "tiny"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "long-context",
    label: "Long Context",
    description: "Models with 256K+ context windows or unlimited sequence length.",
    keywords: ["long context", "1m", "512k", "262k", "256k", "million token", "sliding window"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "other",
    label: "Other",
    description: "Architectures that don't fit neatly into the primary categories.",
    keywords: [],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
];

/** Parse "671B" → 671, "1T" → 1000, "270M" → 0.27 for comparison */
function parseParamSize(s: string): number {
  const m = s.match(/([\d.]+)\s*(T|B|M)/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  if (unit === "T") return n * 1000;
  if (unit === "M") return n / 1000;
  return n;
}

/** Parse context window string to numeric tokens */
function parseContextWindow(s: string): number {
  const cleaned = s.replace(/,/g, "").trim();
  if (/no\s+explicit/i.test(cleaned)) return Infinity;
  const mK = cleaned.match(/([\d.]+)\s*K/i);
  if (mK) return parseFloat(mK[1]) * 1000;
  const mM = cleaned.match(/([\d.]+)\s*M/i);
  if (mM) return parseFloat(mM[1]) * 1_000_000;
  return parseFloat(cleaned) || 0;
}

/**
 * Classify an LLM architecture into a taxonomy category.
 * Priority: decoder type > attention mechanism > model scale > context window.
 */
export function classifyLlmArchitecture(arch: {
  decoderType?: string | null;
  attention?: string | null;
  parameters?: string | null;
  contextWindow?: string | null;
  keyFeatures?: string[] | null;
  tags?: { slug?: string; name?: string }[] | null;
}): TaxonomyCategory {
  const decoderType = (arch.decoderType || "").toLowerCase();
  const attention = (arch.attention || "").toLowerCase();
  const params = parseParamSize(arch.parameters || "0");
  const ctx = parseContextWindow(arch.contextWindow || "0");
  const features = (arch.keyFeatures || []).join(" ").toLowerCase();

  // Recurrent models first — very distinct
  if (decoderType === "recurrent" || attention.includes("lstm") || features.includes("recurrent")) {
    return LLM_ARCHITECTURE_CATEGORIES.find(c => c.slug === "recurrent-models")!;
  }

  // Hybrid architectures — combine attention + linear/SSM
  if (decoderType === "hybrid" || features.includes("mamba") || features.includes("ssm") || attention.includes("deltanet")) {
    return LLM_ARCHITECTURE_CATEGORIES.find(c => c.slug === "hybrid-architecture")!;
  }

  // MoE models
  if (decoderType === "moe") {
    return LLM_ARCHITECTURE_CATEGORIES.find(c => c.slug === "mixture-of-experts")!;
  }

  // Efficient small models (under 10B total params)
  if (params > 0 && params < 10) {
    return LLM_ARCHITECTURE_CATEGORIES.find(c => c.slug === "efficient-small")!;
  }

  // Long context models (256K+)
  if (ctx >= 256_000) {
    return LLM_ARCHITECTURE_CATEGORIES.find(c => c.slug === "long-context")!;
  }

  // Default: Dense Transformer
  if (decoderType === "dense") {
    return LLM_ARCHITECTURE_CATEGORIES.find(c => c.slug === "dense-transformer")!;
  }

  return LLM_ARCHITECTURE_CATEGORIES[LLM_ARCHITECTURE_CATEGORIES.length - 1];
}

/** LLM Architecture ontology config for the content knowledge graph platform */
export const LLM_ARCHITECTURE_ONTOLOGY_CONFIG: ContentOntologyConfig = {
  contentType: "llm-architecture",
  label: "LLM Architectures",
  labelSingular: "LLM Architecture",
  icon: "🧠",
  basePath: "/aixcelerator/llm-architectures",
  catalogPath: "/aixcelerator/llm-architectures",
  nodeShape: "hexagon",
  categories: LLM_ARCHITECTURE_CATEGORIES,
  relationTypes: [
    { type: "evolved_from", label: "Evolved From", description: "Architecture lineage — newer models evolved from older ones.", color: "#60a5fa", directional: true },
    { type: "same_family", label: "Same Family", description: "Models from the same model family or series.", color: "#a78bfa", directional: false },
    { type: "shares_mechanism", label: "Shares Mechanism", description: "Models using the same attention or routing mechanism.", color: "#34d399", directional: false },
    { type: "competes_with", label: "Competes With", description: "Models released around the same time targeting similar use cases.", color: "#f87171", directional: false },
  ],
  categoryColors: {
    "dense-transformer": "#60a5fa",
    "mixture-of-experts": "#a78bfa",
    "hybrid-architecture": "#34d399",
    "recurrent-models": "#fbbf24",
    "efficient-small": "#38bdf8",
    "long-context": "#f87171",
    other: "#94a3b8",
  },
  classifyItem: (item: OntologyItem) => classifyLlmArchitecture(item as Parameters<typeof classifyLlmArchitecture>[0]),
};
