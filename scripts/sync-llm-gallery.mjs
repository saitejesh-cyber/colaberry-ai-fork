#!/usr/bin/env node
/**
 * Sync LLM Architecture Gallery data from Sebastian Raschka's public models.yml
 * (MIT-licensed, https://github.com/rasbt/llm-architecture-gallery)
 *
 * Fetches the YAML file, transforms each entry to our LLMArchitecture schema,
 * and writes src/data/llm-architectures-registry.json.
 *
 * Usage:
 *   node scripts/sync-llm-gallery.mjs                  # fetch + write JSON
 *   node scripts/sync-llm-gallery.mjs --dry-run        # fetch + print, no write
 *   node scripts/sync-llm-gallery.mjs --enrich         # also fetch HuggingFace config.json
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MODELS_YML_URL =
  "https://raw.githubusercontent.com/rasbt/llm-architecture-gallery/main/models.yml";
const OUTPUT_PATH = resolve(__dirname, "../src/data/llm-architectures-registry.json");

const DRY_RUN = process.argv.includes("--dry-run");
const ENRICH = process.argv.includes("--enrich");

/* ── Decoder type mapping ──────────────────────────────────────────── */

function mapDecoderType(raw) {
  if (!raw) return "Dense";
  const lower = raw.toLowerCase();
  if (lower.includes("moe") || lower.includes("sparse")) return "MoE";
  if (lower.includes("hybrid")) return "Hybrid";
  if (lower.includes("recurrent") || lower.includes("ssm")) return "Recurrent";
  return "Dense";
}

/* ── Parse scale string → parameters + activeParameters ────────────── */

function parseScale(scale) {
  if (!scale) return { parameters: "Unknown", activeParameters: undefined };
  // e.g. "671B total, 37B active (5.5% active)"
  const totalMatch = scale.match(/([\d.]+[TBMK])\s*(?:total|param)/i);
  const activeMatch = scale.match(/([\d.]+[TBMK])\s*active/i);
  // Simpler: "8B" or "70B"
  const simpleMatch = scale.match(/^([\d.]+[TBMK])$/i);

  const parameters = totalMatch?.[1] || simpleMatch?.[1] || scale.replace(/\s*total.*/, "").trim();
  const activeParameters = activeMatch?.[1] || undefined;

  return { parameters, activeParameters };
}

/* ── Derive slug from model name ───────────────────────────────────── */

function deriveSlug(name) {
  return name
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ── Derive organization from model name ───────────────────────────── */

const ORG_MAP = {
  llama: "Meta",
  "meta-llama": "Meta",
  deepseek: "DeepSeek",
  qwen: "Alibaba",
  gemma: "Google",
  gemini: "Google",
  phi: "Microsoft",
  mistral: "Mistral",
  mixtral: "Mistral",
  falcon: "TII",
  "command r": "Cohere",
  cohere: "Cohere",
  olmo: "AI2",
  gpt: "OpenAI",
  "o1": "OpenAI",
  "o3": "OpenAI",
  claude: "Anthropic",
  starcoder: "BigCode",
  codestral: "Mistral",
  bloom: "BigScience",
  jamba: "AI21",
  mpt: "MosaicML",
  dbrx: "Databricks",
  glm: "Zhipu AI",
  yi: "01.AI",
  internlm: "Shanghai AI Lab",
  "arcee": "Arcee AI",
  "xlstm": "NXAI",
  "zamba": "Zyphra",
  "granite": "IBM",
  "nemotron": "NVIDIA",
  "solar": "Upstage",
  "smollm": "Hugging Face",
  "grok": "xAI",
  "pixtral": "Mistral",
};

function deriveOrganization(name, configRepo) {
  // Try config repo first (e.g. "meta-llama/Meta-Llama-3-8B")
  if (configRepo) {
    const org = configRepo.split("/")[0]?.toLowerCase();
    for (const [key, val] of Object.entries(ORG_MAP)) {
      if (org.includes(key)) return val;
    }
  }
  // Try model name
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(ORG_MAP)) {
    if (lower.includes(key)) return val;
  }
  return "Unknown";
}

/* ── Derive key features from YAML fields ──────────────────────────── */

function deriveKeyFeatures(entry) {
  const features = [];
  const attn = (entry.attention || "").toLowerCase();
  const highlight = entry.highlight || "";

  // Attention type
  if (attn.includes("mla")) features.push("Multi-head Latent Attention");
  else if (attn.includes("gqa")) features.push("Grouped Query Attention");
  else if (attn.includes("mqa")) features.push("Multi-Query Attention");
  else if (attn.includes("mha")) features.push("Multi-Head Attention");
  if (attn.includes("sliding-window") || attn.includes("swa")) features.push("Sliding Window Attention");
  if (attn.includes("qk-norm") || attn.includes("qk norm")) features.push("QK normalization");

  // From highlight
  if (highlight.toLowerCase().includes("rope")) features.push("RoPE embeddings");
  if (highlight.toLowerCase().includes("swiglu")) features.push("SwiGLU activation");
  if (highlight.toLowerCase().includes("fp8")) features.push("FP8 training");
  if (highlight.toLowerCase().includes("moe") || highlight.toLowerCase().includes("expert"))
    features.push("Expert routing");

  // Layer mix info
  if (entry.layer_mix) features.push(`Layer mix: ${entry.layer_mix}`);

  // KV cache
  if (entry.kv_cache_per_token_bf16 && entry.kv_cache_per_token_bf16 !== "N/A")
    features.push(`KV cache: ${entry.kv_cache_per_token_bf16}/token`);

  return features.slice(0, 6); // Cap at 6
}

/* ── Normalize attention string to our format ──────────────────────── */

function normalizeAttention(raw) {
  if (!raw) return "MHA";
  // Simplify verbose descriptions
  let attn = raw
    .replace(/with /gi, "+ ")
    .replace(/ and /gi, " + ")
    .replace(/gated attention/gi, "Gated Attn")
    .replace(/sliding-window/gi, "SWA")
    .replace(/sliding window/gi, "SWA")
    .replace(/\d+:\d+\s*SWA\/global\s*attention/gi, "SWA")
    .trim();

  // Remove "3:1 SWA/global attention" type suffixes, keep core mechanism
  if (attn.length > 40) {
    // Too verbose, extract core
    if (attn.toLowerCase().includes("mla")) return "MLA";
    if (attn.toLowerCase().includes("gqa")) {
      const parts = ["GQA"];
      if (attn.toLowerCase().includes("qk-norm") || attn.toLowerCase().includes("qk norm"))
        parts.push("QK-Norm");
      if (attn.toLowerCase().includes("swa")) parts.push("SWA");
      return parts.join(" + ");
    }
    if (attn.toLowerCase().includes("mqa")) return "MQA";
    return attn.slice(0, 40);
  }

  return attn;
}

/* ── Format context window ─────────────────────────────────────────── */

function formatContextWindow(raw) {
  if (!raw) return "Unknown";
  const str = String(raw).replace(/,/g, "");
  const num = parseInt(str, 10);
  if (isNaN(num)) return raw;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(0)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return String(num);
}

/* ── Transform YAML entry to our LLMArchitecture schema ────────────── */

function transformEntry(name, entry) {
  const { parameters, activeParameters } = parseScale(entry.scale);
  const slug = deriveSlug(name);
  const org = deriveOrganization(name, entry.config?.repo);

  return {
    slug,
    name,
    organization: org,
    description: entry.summary || null,
    parameters,
    activeParameters: activeParameters || undefined,
    contextWindow: formatContextWindow(entry.context_tokens),
    releaseDate: entry.date ? entry.date.slice(0, 7) : "Unknown", // YYYY-MM
    decoderType: mapDecoderType(entry.decoder_type),
    attention: normalizeAttention(entry.attention),
    keyFeatures: deriveKeyFeatures(entry),
    configUrl: entry.config?.url || null,
    paperUrl: entry.tech_report?.url || null,
    // Registry-specific fields (not in our TS type but useful for enrichment)
    registrySource: "raschka-llm-gallery",
    licenseName: entry.license_name || null,
    layerMix: entry.layer_mix || null,
    kvCachePerToken: entry.kv_cache_per_token_bf16 || null,
    highlight: entry.highlight || null,
    lastSyncedAt: new Date().toISOString(),
  };
}

/* ── Optional: Enrich from HuggingFace config.json ─────────────────── */

async function enrichFromHuggingFace(arch) {
  if (!arch.configUrl) return arch;
  // Convert blob URL to raw URL
  const rawUrl = arch.configUrl
    .replace("/blob/main/", "/raw/main/")
    .replace("huggingface.co", "huggingface.co");

  try {
    const res = await fetch(rawUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return arch;
    const config = await res.json();

    // Extract vocab size
    if (config.vocab_size && !arch.vocabSize) {
      const v = config.vocab_size;
      arch.vocabSize = v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v);
    }

    // Detect attention type from num_key_value_heads
    if (config.num_key_value_heads && config.num_attention_heads) {
      const kvh = config.num_key_value_heads;
      const ah = config.num_attention_heads;
      if (kvh === 1 && !arch.attention.includes("MQA")) {
        arch.attention = arch.attention.replace(/^(MHA|GQA)/, "MQA");
      } else if (kvh < ah && kvh > 1 && !arch.attention.includes("GQA")) {
        arch.attention = arch.attention.replace(/^MHA/, "GQA");
      }
    }

    // Hidden size
    if (config.hidden_size) {
      arch.hiddenSize = config.hidden_size;
    }

    // Num layers
    if (config.num_hidden_layers) {
      arch.numLayers = config.num_hidden_layers;
    }

    return arch;
  } catch {
    // Silently skip — HuggingFace may be rate-limited or repo gated
    return arch;
  }
}

/* ── Main ──────────────────────────────────────────────────────────── */

async function main() {
  console.log(`\n🔄 Fetching models.yml from Raschka's LLM Architecture Gallery...\n`);

  const res = await fetch(MODELS_YML_URL);
  if (!res.ok) {
    console.error(`❌ Failed to fetch models.yml: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const yamlText = await res.text();
  const data = yaml.load(yamlText);

  if (!data || typeof data !== "object") {
    console.error("❌ Failed to parse models.yml");
    process.exit(1);
  }

  const entries = Object.entries(data);
  console.log(`📊 Found ${entries.length} models in registry\n`);

  let architectures = entries.map(([name, entry]) => transformEntry(name, entry));

  // Optional HuggingFace enrichment
  if (ENRICH) {
    console.log("🔬 Enriching from HuggingFace config.json files...\n");
    const BATCH_SIZE = 5;
    for (let i = 0; i < architectures.length; i += BATCH_SIZE) {
      const batch = architectures.slice(i, i + BATCH_SIZE);
      const enriched = await Promise.all(batch.map(enrichFromHuggingFace));
      architectures.splice(i, BATCH_SIZE, ...enriched);
      if (i + BATCH_SIZE < architectures.length) {
        // Rate limit: 500 req / 5 min = ~1.6/s, batches of 5 every 3s is safe
        await new Promise((r) => setTimeout(r, 3000));
      }
      process.stdout.write(`  ${Math.min(i + BATCH_SIZE, architectures.length)}/${architectures.length}\r`);
    }
    console.log("\n");
  }

  // Sort by release date descending (newest first)
  architectures.sort((a, b) => (b.releaseDate || "").localeCompare(a.releaseDate || ""));

  if (DRY_RUN) {
    console.log(JSON.stringify(architectures, null, 2));
    console.log(`\n✅ Dry run complete. ${architectures.length} models transformed.`);
    return;
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(architectures, null, 2) + "\n");
  console.log(`✅ Wrote ${architectures.length} models to ${OUTPUT_PATH}`);

  // Print summary
  const byType = {};
  for (const a of architectures) {
    byType[a.decoderType] = (byType[a.decoderType] || 0) + 1;
  }
  console.log("\nBy decoder type:");
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count}`);
  }
}

main().catch((err) => {
  console.error("❌ Sync failed:", err);
  process.exit(1);
});
