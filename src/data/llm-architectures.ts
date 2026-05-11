/**
 * LLM Architecture Gallery — Combined dataset from:
 *   1. Raschka's LLM Architecture Gallery (Apache 2.0, fetched via sync-llm-gallery)
 *   2. HuggingFace model configs (public API)
 *   3. Manual overrides below (for models not in the registry)
 *
 * Data pipeline: scripts/sync-llm-gallery.mjs → src/data/llm-architectures-registry.json
 * API route:    POST /api/sync-llm-gallery (CMS upsert when content type is ready)
 *
 * Factual model specifications (parameter counts, attention types, context windows)
 * are non-copyrightable under US law (Feist v. Rural, 1991).
 */

/* ── Types ────────────────────────────────────────────────────────────── */

export type DecoderType = "Dense" | "MoE" | "Hybrid" | "Recurrent";

export type LLMArchitecture = {
  slug: string;
  name: string;
  organization: string;
  description?: string | null;
  parameters: string;
  activeParameters?: string;
  contextWindow: string;
  vocabSize?: string;
  numLayers?: number;
  hiddenSize?: number;
  releaseDate: string;
  decoderType: DecoderType;
  attention: string;
  keyFeatures: string[];
  configUrl?: string;
  paperUrl?: string;
};

/* ── Dataset ──────────────────────────────────────────────────────────── */

export const LLM_ARCHITECTURES: LLMArchitecture[] = [
  // ── 2019 ───────────────────────────────────────────────────────────
  {
    slug: "gpt-2-xl",
    name: "GPT-2 XL",
    organization: "OpenAI",
    parameters: "1.5B",
    contextWindow: "1,024",
    releaseDate: "2019-11",
    decoderType: "Dense",
    attention: "MHA",
    keyFeatures: ["Byte-pair encoding", "Layer normalization", "Autoregressive pretraining"],
    configUrl: "https://huggingface.co/openai-community/gpt2-xl/blob/main/config.json",
  },
  // ── 2024 ───────────────────────────────────────────────────────────
  {
    slug: "llama-3-8b",
    name: "Llama 3",
    organization: "Meta",
    parameters: "8B",
    contextWindow: "8,192",
    releaseDate: "2024-04",
    decoderType: "Dense",
    attention: "GQA + RoPE",
    keyFeatures: ["Grouped Query Attention", "RoPE embeddings", "SwiGLU activation"],
    configUrl: "https://huggingface.co/meta-llama/Meta-Llama-3-8B/blob/main/config.json",
  },
  {
    slug: "llama-3-2-1b",
    name: "Llama 3.2",
    organization: "Meta",
    parameters: "1B",
    contextWindow: "128K",
    releaseDate: "2024-09",
    decoderType: "Dense",
    attention: "GQA",
    keyFeatures: ["Lightweight dense model", "Long context", "GQA efficiency"],
  },
  {
    slug: "olmo-2-7b",
    name: "OLMo 2",
    organization: "AI2",
    parameters: "7B",
    contextWindow: "4,096",
    releaseDate: "2024-11",
    decoderType: "Dense",
    attention: "MHA + QK-Norm",
    keyFeatures: ["Fully open-source", "QK normalization", "Dolma dataset"],
    configUrl: "https://huggingface.co/allenai/OLMo-2-7B/blob/main/config.json",
  },
  {
    slug: "phi-4-14b",
    name: "Phi-4",
    organization: "Microsoft",
    parameters: "14B",
    contextWindow: "16,384",
    vocabSize: "100K",
    releaseDate: "2024-12",
    decoderType: "Dense",
    attention: "GQA + RoPE",
    keyFeatures: ["Data quality focus", "Synthetic training data", "Strong reasoning"],
    configUrl: "https://huggingface.co/microsoft/phi-4/blob/main/config.json",
  },
  {
    slug: "deepseek-v3",
    name: "DeepSeek V3",
    organization: "DeepSeek",
    parameters: "671B",
    activeParameters: "37B",
    contextWindow: "128K",
    releaseDate: "2024-12",
    decoderType: "MoE",
    attention: "MLA",
    keyFeatures: ["Multi-head Latent Attention", "Expert routing", "FP8 training"],
    paperUrl: "https://arxiv.org/pdf/2412.19437",
  },
  // ── 2025 Q1 ────────────────────────────────────────────────────────
  {
    slug: "deepseek-r1",
    name: "DeepSeek R1",
    organization: "DeepSeek",
    parameters: "671B",
    activeParameters: "37B",
    contextWindow: "128K",
    releaseDate: "2025-01",
    decoderType: "MoE",
    attention: "MLA",
    keyFeatures: ["Reasoning-focused", "Chain-of-thought", "MLA efficiency"],
  },
  {
    slug: "gemma-3-27b",
    name: "Gemma 3",
    organization: "Google",
    parameters: "27B",
    contextWindow: "128K",
    vocabSize: "262K",
    releaseDate: "2025-03",
    decoderType: "Dense",
    attention: "GQA + QK-Norm + SWA",
    keyFeatures: ["Sliding Window Attention", "QK normalization", "Large vocabulary"],
    configUrl: "https://huggingface.co/google/gemma-3-27b/blob/main/config.json",
  },
  {
    slug: "mistral-small-3-1",
    name: "Mistral Small 3.1",
    organization: "Mistral",
    parameters: "24B",
    contextWindow: "128K",
    releaseDate: "2025-03",
    decoderType: "Dense",
    attention: "GQA",
    keyFeatures: ["Efficient dense model", "Strong multilingual", "128K context"],
  },
  {
    slug: "xlstm-7b",
    name: "xLSTM",
    organization: "NXAI",
    parameters: "7B",
    contextWindow: "No explicit limit",
    releaseDate: "2025-03",
    decoderType: "Recurrent",
    attention: "mLSTM (recurrent)",
    keyFeatures: ["Extended LSTM architecture", "Linear complexity", "No attention mechanism"],
    paperUrl: "https://arxiv.org/pdf/2405.04517",
  },
  // ── 2025 Q2 ────────────────────────────────────────────────────────
  {
    slug: "llama-4-maverick",
    name: "Llama 4 Maverick",
    organization: "Meta",
    parameters: "400B",
    activeParameters: "17B",
    contextWindow: "1M",
    releaseDate: "2025-04",
    decoderType: "MoE",
    attention: "GQA",
    keyFeatures: ["1M context window", "MoE routing", "Efficient inference"],
  },
  {
    slug: "qwen3-235b",
    name: "Qwen3 (235B-A22B)",
    organization: "Alibaba",
    parameters: "235B",
    activeParameters: "22B",
    contextWindow: "128K",
    releaseDate: "2025-04",
    decoderType: "MoE",
    attention: "GQA + QK-Norm",
    keyFeatures: ["Thinking mode toggle", "MoE architecture", "Multilingual"],
    configUrl: "https://huggingface.co/Qwen/Qwen3-235B-A22B/blob/main/config.json",
  },
  {
    slug: "qwen3-32b",
    name: "Qwen3 (32B)",
    organization: "Alibaba",
    parameters: "32B",
    contextWindow: "128K",
    releaseDate: "2025-04",
    decoderType: "Dense",
    attention: "GQA + QK-Norm",
    keyFeatures: ["Dense variant", "QK normalization", "Thinking mode"],
  },
  {
    slug: "qwen3-8b",
    name: "Qwen3 (8B)",
    organization: "Alibaba",
    parameters: "8B",
    contextWindow: "128K",
    releaseDate: "2025-04",
    decoderType: "Dense",
    attention: "GQA + QK-Norm",
    keyFeatures: ["Compact dense model", "128K context", "Thinking mode"],
  },
  {
    slug: "qwen3-4b",
    name: "Qwen3 (4B)",
    organization: "Alibaba",
    parameters: "4B",
    contextWindow: "32,768",
    vocabSize: "151K",
    releaseDate: "2025-04",
    decoderType: "Dense",
    attention: "GQA + QK-Norm",
    keyFeatures: ["Small efficient model", "Thinking mode", "Large vocab"],
  },
  {
    slug: "smollm3-3b",
    name: "SmolLM3",
    organization: "Hugging Face",
    parameters: "3B",
    contextWindow: "131K",
    releaseDate: "2025-06",
    decoderType: "Dense",
    attention: "GQA + NoPE",
    keyFeatures: ["No positional embeddings", "Compact architecture", "Long context"],
  },
  // ── 2025 Q3 ────────────────────────────────────────────────────────
  {
    slug: "kimi-k2",
    name: "Kimi K2",
    organization: "Moonshot AI",
    parameters: "1T",
    activeParameters: "32B",
    contextWindow: "128K",
    releaseDate: "2025-07",
    decoderType: "MoE",
    attention: "MLA",
    keyFeatures: ["Trillion-parameter MoE", "MLA attention", "32B active params"],
  },
  {
    slug: "glm-4-5",
    name: "GLM-4.5",
    organization: "Zhipu AI",
    parameters: "355B",
    activeParameters: "32B",
    contextWindow: "128K",
    releaseDate: "2025-07",
    decoderType: "MoE",
    attention: "GQA + QK-Norm",
    keyFeatures: ["Chinese-English bilingual", "MoE routing", "Strong benchmarks"],
  },
  {
    slug: "glm-4-5-air",
    name: "GLM-4.5-Air",
    organization: "Zhipu AI",
    parameters: "106B",
    activeParameters: "12B",
    contextWindow: "128K",
    releaseDate: "2025-07",
    decoderType: "MoE",
    attention: "GQA",
    keyFeatures: ["Lightweight GLM variant", "12B active", "Fast inference"],
  },
  {
    slug: "qwen3-coder-flash",
    name: "Qwen3 Coder Flash",
    organization: "Alibaba",
    parameters: "30B",
    activeParameters: "3.3B",
    contextWindow: "256K",
    releaseDate: "2025-07",
    decoderType: "MoE",
    attention: "GQA",
    keyFeatures: ["Code-specialized", "256K context", "3.3B active params"],
  },
  // ── 2025 Q3 continued ──────────────────────────────────────────────
  {
    slug: "gpt-oss-120b",
    name: "GPT-OSS (120B)",
    organization: "OpenAI",
    parameters: "117B",
    activeParameters: "5.1B",
    contextWindow: "128K",
    releaseDate: "2025-08",
    decoderType: "MoE",
    attention: "GQA + SWA",
    keyFeatures: ["Open-source GPT", "Sliding Window Attention", "Sparse routing"],
  },
  {
    slug: "gpt-oss-20b",
    name: "GPT-OSS (20B)",
    organization: "OpenAI",
    parameters: "21B",
    activeParameters: "3.6B",
    contextWindow: "128K",
    releaseDate: "2025-08",
    decoderType: "MoE",
    attention: "GQA + SWA",
    keyFeatures: ["Compact open-source GPT", "SWA", "MoE routing"],
  },
  {
    slug: "gemma-3-270m",
    name: "Gemma 3 (270M)",
    organization: "Google",
    parameters: "270M",
    contextWindow: "128K",
    vocabSize: "262K",
    releaseDate: "2025-08",
    decoderType: "Dense",
    attention: "MQA + QK-Norm + SWA",
    keyFeatures: ["Ultra-small model", "Multi-Query Attention", "On-device capable"],
  },
  {
    slug: "grok-2-5",
    name: "Grok 2.5",
    organization: "xAI",
    parameters: "270B",
    contextWindow: "131K",
    releaseDate: "2025-08",
    decoderType: "MoE",
    attention: "GQA",
    keyFeatures: ["xAI flagship", "MoE architecture", "Real-time data access"],
  },
  // ── 2025 Q3–Q4 ────────────────────────────────────────────────────
  {
    slug: "qwen3-next",
    name: "Qwen3 Next",
    organization: "Alibaba",
    parameters: "80B",
    activeParameters: "3B",
    contextWindow: "262K",
    releaseDate: "2025-09",
    decoderType: "Hybrid",
    attention: "Gated DeltaNet + Gated Attention",
    keyFeatures: ["Hybrid linear + transformer", "DeltaNet blocks", "262K context"],
  },
  {
    slug: "minimax-m2",
    name: "MiniMax M2",
    organization: "MiniMax",
    parameters: "230B",
    activeParameters: "10B",
    contextWindow: "196K",
    releaseDate: "2025-10",
    decoderType: "MoE",
    attention: "GQA + QK-Norm",
    keyFeatures: ["10B active MoE", "196K context", "Efficient routing"],
  },
  {
    slug: "kimi-linear",
    name: "Kimi Linear",
    organization: "Moonshot AI",
    parameters: "48B",
    activeParameters: "3B",
    contextWindow: "1M",
    releaseDate: "2025-10",
    decoderType: "Hybrid",
    attention: "MLA + Kimi Delta Attention",
    keyFeatures: ["1M context", "Linear attention hybrid", "Delta attention mechanism"],
  },
  {
    slug: "olmo-3-32b",
    name: "OLMo 3 (32B)",
    organization: "AI2",
    parameters: "32B",
    contextWindow: "65K",
    releaseDate: "2025-11",
    decoderType: "Dense",
    attention: "GQA + QK-Norm + SWA",
    keyFeatures: ["Fully open-source", "SWA + QK-Norm", "Dolma 2 dataset"],
  },
  {
    slug: "olmo-3-7b",
    name: "OLMo 3 (7B)",
    organization: "AI2",
    parameters: "7B",
    contextWindow: "65K",
    releaseDate: "2025-11",
    decoderType: "Dense",
    attention: "MHA + QK-Norm + SWA",
    keyFeatures: ["Open weights + data", "MHA with SWA", "Research-friendly"],
  },
  {
    slug: "intellect-3",
    name: "INTELLECT-3",
    organization: "Prime Intellect",
    parameters: "106B",
    activeParameters: "12B",
    contextWindow: "128K",
    releaseDate: "2025-11",
    decoderType: "MoE",
    attention: "GQA",
    keyFeatures: ["Decentralized training", "Open-source MoE", "12B active"],
  },
  // ── 2025 Q4 ────────────────────────────────────────────────────────
  {
    slug: "deepseek-v3-2",
    name: "DeepSeek V3.2",
    organization: "DeepSeek",
    parameters: "671B",
    activeParameters: "37B",
    contextWindow: "128K",
    releaseDate: "2025-12",
    decoderType: "MoE",
    attention: "MLA + Sparse Attention",
    keyFeatures: ["Sparse attention upgrade", "MLA V2", "Improved routing"],
  },
  {
    slug: "mistral-large-3",
    name: "Mistral Large 3",
    organization: "Mistral",
    parameters: "673B",
    activeParameters: "41B",
    contextWindow: "262K",
    releaseDate: "2025-12",
    decoderType: "MoE",
    attention: "MLA",
    keyFeatures: ["MLA adoption", "262K context", "41B active params"],
  },
  {
    slug: "nemotron-3-nano-30b",
    name: "Nemotron 3 Nano",
    organization: "NVIDIA",
    parameters: "30B",
    activeParameters: "3B",
    contextWindow: "1M",
    releaseDate: "2025-12",
    decoderType: "Hybrid",
    attention: "Mostly Mamba-2 + GQA",
    keyFeatures: ["Mamba-2 SSM blocks", "1M context", "Hybrid SSM-transformer"],
  },
  {
    slug: "xiaomi-mimo-v2-flash",
    name: "Xiaomi MiMo-V2-Flash",
    organization: "Xiaomi",
    parameters: "309B",
    activeParameters: "15B",
    contextWindow: "262K",
    releaseDate: "2025-12",
    decoderType: "MoE",
    attention: "SWA",
    keyFeatures: ["SWA-only attention", "15B active", "Fast inference"],
  },
  {
    slug: "glm-4-7",
    name: "GLM-4.7",
    organization: "Zhipu AI",
    parameters: "355B",
    activeParameters: "32B",
    contextWindow: "202K",
    releaseDate: "2025-12",
    decoderType: "MoE",
    attention: "GQA + QK-Norm",
    keyFeatures: ["Extended context", "Improved GLM series", "202K window"],
  },
  // ── 2026 Q1 ────────────────────────────────────────────────────────
  {
    slug: "arcee-trinity-large",
    name: "Arcee AI Trinity Large",
    organization: "Arcee AI",
    parameters: "400B",
    activeParameters: "13B",
    contextWindow: "512K",
    releaseDate: "2026-01",
    decoderType: "MoE",
    attention: "GQA + Gated + SWA",
    keyFeatures: ["512K context", "Gated attention", "13B active MoE"],
  },
  {
    slug: "kimi-k2-5",
    name: "Kimi K2.5",
    organization: "Moonshot AI",
    parameters: "1T",
    activeParameters: "32B",
    contextWindow: "256K",
    releaseDate: "2026-01",
    decoderType: "MoE",
    attention: "MLA",
    keyFeatures: ["Trillion-param v2", "256K context", "Improved MLA"],
  },
  // ── 2026 Q1 continued ──────────────────────────────────────────────
  {
    slug: "glm-5",
    name: "GLM-5",
    organization: "Zhipu AI",
    parameters: "744B",
    activeParameters: "40B",
    contextWindow: "202K",
    releaseDate: "2026-02",
    decoderType: "MoE",
    attention: "MLA + Sparse Attention",
    keyFeatures: ["MLA adoption", "Sparse attention", "40B active"],
  },
  {
    slug: "step-3-5-flash",
    name: "Step 3.5 Flash",
    organization: "StepFun",
    parameters: "196B",
    activeParameters: "11B",
    contextWindow: "262K",
    releaseDate: "2026-02",
    decoderType: "MoE",
    attention: "GQA + SWA",
    keyFeatures: ["Fast inference MoE", "SWA", "11B active"],
  },
  {
    slug: "nanbeige-4-1",
    name: "Nanbeige 4.1",
    organization: "Nanbeige",
    parameters: "3B",
    contextWindow: "262K",
    releaseDate: "2026-02",
    decoderType: "Dense",
    attention: "GQA",
    keyFeatures: ["Ultra-compact", "262K context", "Chinese-focused"],
  },
  {
    slug: "minimax-m2-5",
    name: "MiniMax-M2.5",
    organization: "MiniMax",
    parameters: "230B",
    activeParameters: "10B",
    contextWindow: "196K",
    releaseDate: "2026-02",
    decoderType: "MoE",
    attention: "GQA + QK-Norm",
    keyFeatures: ["M2 upgrade", "10B active", "Improved routing"],
  },
  {
    slug: "tiny-aya",
    name: "Tiny Aya",
    organization: "Cohere",
    parameters: "3.35B",
    contextWindow: "8,192",
    releaseDate: "2026-02",
    decoderType: "Dense",
    attention: "GQA + SWA + NoPE",
    keyFeatures: ["No positional embeddings", "Massively multilingual", "Compact"],
  },
  {
    slug: "ling-2-5",
    name: "Ling 2.5",
    organization: "Inclusion AI",
    parameters: "1T",
    activeParameters: "63B",
    contextWindow: "256K",
    releaseDate: "2026-02",
    decoderType: "Hybrid",
    attention: "Lightning Attention + MLA",
    keyFeatures: ["Lightning linear attention", "MLA hybrid", "63B active"],
  },
  {
    slug: "qwen3-5",
    name: "Qwen3.5",
    organization: "Alibaba",
    parameters: "397B",
    activeParameters: "17B",
    contextWindow: "262K",
    releaseDate: "2026-02",
    decoderType: "Hybrid",
    attention: "Gated DeltaNet + Gated Attention",
    keyFeatures: ["Hybrid architecture", "DeltaNet + transformer", "17B active"],
  },
  // ── 2026 Q1 late ───────────────────────────────────────────────────
  {
    slug: "sarvam-30b",
    name: "Sarvam (30B)",
    organization: "Sarvam AI",
    parameters: "30B",
    activeParameters: "2.4B",
    contextWindow: "131K",
    releaseDate: "2026-03",
    decoderType: "MoE",
    attention: "GQA + QK-Norm",
    keyFeatures: ["India-focused", "2.4B active", "Multilingual Indic"],
  },
  {
    slug: "sarvam-105b",
    name: "Sarvam (105B)",
    organization: "Sarvam AI",
    parameters: "105B",
    activeParameters: "10.3B",
    contextWindow: "131K",
    releaseDate: "2026-03",
    decoderType: "MoE",
    attention: "MLA",
    keyFeatures: ["MLA architecture", "Indic language focus", "10.3B active"],
  },
  {
    slug: "mistral-small-4",
    name: "Mistral Small 4",
    organization: "Mistral",
    parameters: "119B",
    activeParameters: "6.63B",
    contextWindow: "256K",
    releaseDate: "2026-03",
    decoderType: "MoE",
    attention: "MLA",
    keyFeatures: ["MLA adoption", "256K context", "Efficient MoE"],
  },
  {
    slug: "nemotron-3-super",
    name: "Nemotron 3 Super",
    organization: "NVIDIA",
    parameters: "120B",
    activeParameters: "12B",
    contextWindow: "1M",
    releaseDate: "2026-03",
    decoderType: "Hybrid",
    attention: "Mostly Mamba-2 + GQA",
    keyFeatures: ["Mamba-2 SSM", "1M context", "12B active hybrid"],
  },
  {
    slug: "nemotron-3-nano-4b",
    name: "Nemotron 3 Nano (4B)",
    organization: "NVIDIA",
    parameters: "4B",
    contextWindow: "262K",
    releaseDate: "2026-03",
    decoderType: "Hybrid",
    attention: "Mostly Mamba-2 + GQA",
    keyFeatures: ["Ultra-compact hybrid", "Mamba-2 blocks", "262K context"],
  },
  // ── 2026 Q2 ────────────────────────────────────────────────────────
  {
    slug: "gemma-4-31b",
    name: "Gemma 4 (31B)",
    organization: "Google",
    parameters: "30.7B",
    contextWindow: "256K",
    vocabSize: "262K",
    releaseDate: "2026-04",
    decoderType: "Dense",
    attention: "GQA + QK-Norm + SWA",
    keyFeatures: ["256K context", "Large vocabulary", "SWA + QK-Norm"],
  },
  {
    slug: "gemma-4-26b-a4b",
    name: "Gemma 4 (26B-A4B)",
    organization: "Google",
    parameters: "25.2B",
    activeParameters: "3.8B",
    contextWindow: "256K",
    vocabSize: "262K",
    releaseDate: "2026-04",
    decoderType: "MoE",
    attention: "GQA + QK-Norm + SWA",
    keyFeatures: ["MoE Gemma variant", "3.8B active", "SWA + QK-Norm"],
  },
  {
    slug: "gemma-4-e2b",
    name: "Gemma 4 (E2B)",
    organization: "Google",
    parameters: "5.1B",
    contextWindow: "128K",
    vocabSize: "262K",
    releaseDate: "2026-04",
    decoderType: "Dense",
    attention: "MQA + QK-Norm + SWA",
    keyFeatures: ["Effective 2.3B parameters", "MQA efficiency", "On-device"],
  },
  {
    slug: "gemma-4-e4b",
    name: "Gemma 4 (E4B)",
    organization: "Google",
    parameters: "8B",
    contextWindow: "128K",
    vocabSize: "262K",
    releaseDate: "2026-04",
    decoderType: "Dense",
    attention: "GQA + QK-Norm + SWA",
    keyFeatures: ["Effective 4.5B parameters", "Distilled", "Efficient"],
  },
  {
    slug: "glm-5-1",
    name: "GLM-5.1",
    organization: "Zhipu AI",
    parameters: "744B",
    activeParameters: "40B",
    contextWindow: "202K",
    vocabSize: "155K",
    numLayers: 78,
    hiddenSize: 6144,
    releaseDate: "2026-04",
    decoderType: "MoE",
    attention: "MLA + Sparse Attention",
    keyFeatures: ["GLM-5 refresh", "MLA + DeepSeek Sparse Attention", "40B active", "Layer mix: 78 MLA"],
  },
];

/* ── Derived filter values ────────────────────────────────────────────── */

export const ALL_ORGANIZATIONS = [...new Set(LLM_ARCHITECTURES.map((m) => m.organization))].sort();

export const ALL_DECODER_TYPES: DecoderType[] = ["Dense", "MoE", "Hybrid", "Recurrent"];

/** Parse "671B" → 671, "1T" → 1000, "270M" → 0.27 for sorting */
export function parseParamSize(s: string): number {
  const m = s.match(/([\d.]+)\s*(T|B|M)/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  if (unit === "T") return n * 1000;
  if (unit === "M") return n / 1000;
  return n;
}

/* ── Registry JSON shape (from sync-llm-gallery script) ────────────── */

export type RegistryLLMEntry = {
  slug: string;
  name: string;
  organization: string;
  description?: string | null;
  parameters: string;
  activeParameters?: string | null;
  contextWindow: string;
  releaseDate?: string | null;
  decoderType: string;
  attention: string;
  keyFeatures: string[] | string;
  configUrl?: string | null;
  paperUrl?: string | null;
  licenseName?: string | null;
  layerMix?: string | null;
  kvCachePerToken?: string | null;
  highlight?: string | null;
  registrySource?: string;
  lastSyncedAt?: string;
  /* HuggingFace config.json enrichment fields */
  numLayers?: number;
  hiddenSize?: number;
  vocabSize?: string;
};

/**
 * Merge registry data with static overrides.
 * Registry entries are primary; static entries fill gaps (models not in registry).
 * Static entries can override registry entries by slug (manual corrections).
 */
export function mergeWithRegistry(registryEntries: RegistryLLMEntry[]): LLMArchitecture[] {
  const merged = new Map<string, LLMArchitecture>();

  // 1. Load registry entries first
  for (const entry of registryEntries) {
    const features = Array.isArray(entry.keyFeatures)
      ? entry.keyFeatures
      : (entry.keyFeatures || "").split(", ").filter(Boolean);

    merged.set(entry.slug, {
      slug: entry.slug,
      name: entry.name,
      organization: entry.organization,
      parameters: entry.parameters,
      activeParameters: entry.activeParameters || undefined,
      contextWindow: entry.contextWindow,
      vocabSize: entry.vocabSize || undefined,
      numLayers: entry.numLayers || undefined,
      hiddenSize: entry.hiddenSize || undefined,
      releaseDate: entry.releaseDate || "Unknown",
      decoderType: (entry.decoderType as DecoderType) || "Dense",
      attention: entry.attention,
      keyFeatures: features,
      configUrl: entry.configUrl || undefined,
      paperUrl: entry.paperUrl || undefined,
    });
  }

  // 2. Static overrides: add missing models, override existing by slug
  for (const arch of LLM_ARCHITECTURES) {
    if (!merged.has(arch.slug)) {
      merged.set(arch.slug, arch);
    }
    // If slug exists in registry but static has richer data, merge fields
    const existing = merged.get(arch.slug);
    if (existing) {
      if (arch.vocabSize && !existing.vocabSize) existing.vocabSize = arch.vocabSize;
    }
  }

  return Array.from(merged.values());
}

/**
 * Load registry JSON file (build-time only, for getStaticProps).
 * Returns empty array if file doesn't exist.
 */
export function loadRegistryJSON(): RegistryLLMEntry[] {
  // Dynamic import for Node.js — only works in getStaticProps, not browser
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const data = require("./llm-architectures-registry.json") as RegistryLLMEntry[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** All unique attention sub-types across the merged dataset */
export function getAllAttentionTypes(archs: LLMArchitecture[]): string[] {
  return [...new Set(
    archs.flatMap((m) =>
      m.attention.split(/\s*\+\s*/).map((a) => a.trim()),
    ),
  )].sort();
}

/** Legacy: computed from static data only (for backward compat) */
export const ALL_ATTENTION_TYPES = getAllAttentionTypes(LLM_ARCHITECTURES);
