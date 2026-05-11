import type { NextApiRequest, NextApiResponse } from "next";
import { isBearerAuthorized } from "../../lib/api-auth";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const yaml = require("js-yaml") as { load: (str: string) => unknown };

const MODELS_YML_URL =
  "https://raw.githubusercontent.com/rasbt/llm-architecture-gallery/main/models.yml";
const CMS_URL = (process.env.CMS_URL || process.env.NEXT_PUBLIC_CMS_URL || "").trim().replace(/\/$/, "");
const CMS_API_TOKEN = (process.env.CMS_API_TOKEN || "").trim();
const SYNC_SECRET = process.env.SYNC_SECRET || "";

/* ── YAML entry shape ──────────────────────────────────────────────── */

type GalleryEntry = {
  date?: string;
  summary?: string;
  scale?: string;
  context_tokens?: string;
  decoder_type?: string;
  attention?: string;
  layer_mix?: string;
  kv_cache_per_token_bf16?: string;
  highlight?: string;
  license_name?: string;
  config?: { repo?: string; url?: string };
  tech_report?: { url?: string };
};

/* ── Transform helpers ─────────────────────────────────────────────── */

function deriveSlug(name: string): string {
  return name
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const ORG_MAP: Record<string, string> = {
  llama: "Meta", deepseek: "DeepSeek", qwen: "Alibaba", gemma: "Google",
  phi: "Microsoft", mistral: "Mistral", mixtral: "Mistral", falcon: "TII",
  "command": "Cohere", olmo: "AI2", gpt: "OpenAI", starcoder: "BigCode",
  codestral: "Mistral", jamba: "AI21", dbrx: "Databricks", glm: "Zhipu AI",
  yi: "01.AI", internlm: "Shanghai AI Lab", arcee: "Arcee AI", xlstm: "NXAI",
  zamba: "Zyphra", granite: "IBM", nemotron: "NVIDIA", solar: "Upstage",
  smollm: "Hugging Face", grok: "xAI", pixtral: "Mistral",
};

function deriveOrganization(name: string, configRepo?: string): string {
  if (configRepo) {
    const org = configRepo.split("/")[0]?.toLowerCase() || "";
    for (const [key, val] of Object.entries(ORG_MAP)) {
      if (org.includes(key)) return val;
    }
  }
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(ORG_MAP)) {
    if (lower.includes(key)) return val;
  }
  return "Unknown";
}

function mapDecoderType(raw?: string): string {
  if (!raw) return "Dense";
  const lower = raw.toLowerCase();
  if (lower.includes("moe") || lower.includes("sparse")) return "MoE";
  if (lower.includes("hybrid")) return "Hybrid";
  if (lower.includes("recurrent") || lower.includes("ssm")) return "Recurrent";
  return "Dense";
}

function parseScale(scale?: string): { parameters: string; activeParameters?: string } {
  if (!scale) return { parameters: "Unknown" };
  const totalMatch = scale.match(/([\d.]+[TBMK])\s*(?:total|param)/i);
  const activeMatch = scale.match(/([\d.]+[TBMK])\s*active/i);
  const simpleMatch = scale.match(/^([\d.]+[TBMK])$/i);
  const parameters = totalMatch?.[1] || simpleMatch?.[1] || scale.replace(/\s*total.*/, "").trim();
  const activeParameters = activeMatch?.[1] || undefined;
  return { parameters, activeParameters };
}

function formatContextWindow(raw?: string): string {
  if (!raw) return "Unknown";
  const str = String(raw).replace(/,/g, "");
  const num = parseInt(str, 10);
  if (isNaN(num)) return raw;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(0)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return String(num);
}

function normalizeAttention(raw?: string): string {
  if (!raw) return "MHA";
  const attn = raw
    .replace(/with /gi, "+ ")
    .replace(/ and /gi, " + ")
    .replace(/gated attention/gi, "Gated Attn")
    .replace(/sliding-window/gi, "SWA")
    .replace(/sliding window/gi, "SWA")
    .trim();
  if (attn.length > 40) {
    if (attn.toLowerCase().includes("mla")) return "MLA";
    if (attn.toLowerCase().includes("gqa")) {
      const parts = ["GQA"];
      if (/qk.?norm/i.test(attn)) parts.push("QK-Norm");
      if (attn.toLowerCase().includes("swa")) parts.push("SWA");
      return parts.join(" + ");
    }
    if (attn.toLowerCase().includes("mqa")) return "MQA";
    return attn.slice(0, 40);
  }
  return attn;
}

function deriveKeyFeatures(entry: GalleryEntry): string[] {
  const features: string[] = [];
  const attn = (entry.attention || "").toLowerCase();
  const highlight = entry.highlight || "";
  if (attn.includes("mla")) features.push("Multi-head Latent Attention");
  else if (attn.includes("gqa")) features.push("Grouped Query Attention");
  else if (attn.includes("mqa")) features.push("Multi-Query Attention");
  if (attn.includes("swa") || attn.includes("sliding")) features.push("Sliding Window Attention");
  if (/qk.?norm/i.test(attn)) features.push("QK normalization");
  if (highlight.toLowerCase().includes("rope")) features.push("RoPE embeddings");
  if (highlight.toLowerCase().includes("swiglu")) features.push("SwiGLU activation");
  if (entry.layer_mix) features.push(`Layer mix: ${entry.layer_mix}`);
  if (entry.kv_cache_per_token_bf16 && entry.kv_cache_per_token_bf16 !== "N/A")
    features.push(`KV cache: ${entry.kv_cache_per_token_bf16}/token`);
  return features.slice(0, 6);
}

/* ── Map YAML entry → Strapi-ready payload ─────────────────────────── */

function mapEntryToStrapi(name: string, entry: GalleryEntry) {
  const { parameters, activeParameters } = parseScale(entry.scale);
  return {
    slug: deriveSlug(name),
    name,
    organization: deriveOrganization(name, entry.config?.repo),
    description: entry.summary || null,
    parameters,
    activeParameters: activeParameters || null,
    contextWindow: formatContextWindow(entry.context_tokens),
    releaseDate: entry.date ? entry.date.slice(0, 7) : null,
    decoderType: mapDecoderType(entry.decoder_type),
    attention: normalizeAttention(entry.attention),
    keyFeatures: deriveKeyFeatures(entry).join(", "),
    configUrl: entry.config?.url || null,
    paperUrl: entry.tech_report?.url || null,
    licenseName: entry.license_name || null,
    layerMix: entry.layer_mix || null,
    kvCachePerToken: entry.kv_cache_per_token_bf16 || null,
    highlight: entry.highlight || null,
    registrySource: "raschka-llm-gallery",
    lastSyncedAt: new Date().toISOString(),
  };
}

/* ── CMS upsert (same pattern as sync-mcp-registry) ───────────────── */

async function findExisting(
  slug: string,
  name: string
): Promise<{ documentId: string } | null> {
  const headers: Record<string, string> = {};
  if (CMS_API_TOKEN) headers.Authorization = `Bearer ${CMS_API_TOKEN}`;

  // Check by slug
  const bySlug = `${CMS_URL}/api/llm-architectures?filters[slug][$eq]=${encodeURIComponent(slug)}&fields[0]=id&publicationState=live`;
  try {
    const res = await fetch(bySlug, { headers });
    if (res.ok) {
      const body = await res.json();
      if (body?.data?.[0]) return { documentId: body.data[0].documentId };
    }
  } catch { /* continue to fallback */ }

  // Fallback: check by name
  const byName = `${CMS_URL}/api/llm-architectures?filters[name][$eqi]=${encodeURIComponent(name)}&fields[0]=id&publicationState=live`;
  try {
    const res = await fetch(byName, { headers });
    if (res.ok) {
      const body = await res.json();
      if (body?.data?.[0]) return { documentId: body.data[0].documentId };
    }
  } catch { /* no match */ }

  return null;
}

async function upsertToStrapi(data: ReturnType<typeof mapEntryToStrapi>): Promise<"created" | "updated" | "skipped"> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (CMS_API_TOKEN) headers.Authorization = `Bearer ${CMS_API_TOKEN}`;

  const existing = await findExisting(data.slug, data.name);

  if (existing) {
    const res = await fetch(`${CMS_URL}/api/llm-architectures/${existing.documentId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ data }),
    });
    return res.ok ? "updated" : "skipped";
  } else {
    const res = await fetch(`${CMS_URL}/api/llm-architectures`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data }),
    });
    return res.ok ? "created" : "skipped";
  }
}

/* ── Fetch all models from Raschka's YAML ──────────────────────────── */

async function fetchGalleryModels(): Promise<Array<{ name: string; entry: GalleryEntry }>> {
  const res = await fetch(MODELS_YML_URL);
  if (!res.ok) throw new Error(`Failed to fetch models.yml: ${res.status}`);
  const text = await res.text();
  const data = yaml.load(text) as Record<string, GalleryEntry>;
  if (!data || typeof data !== "object") throw new Error("Invalid YAML");
  return Object.entries(data).map(([name, entry]) => ({ name, entry }));
}

/* ── Handler ───────────────────────────────────────────────────────── */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isBearerAuthorized(req, SYNC_SECRET)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const mode = (req.query.mode as string) || "cms";

  try {
    const models = await fetchGalleryModels();
    const results = { total: models.length, created: 0, updated: 0, skipped: 0, errors: 0 };

    if (mode === "cms" && CMS_URL) {
      // CMS upsert mode (same as MCP sync)
      for (const { name, entry } of models) {
        try {
          const mapped = mapEntryToStrapi(name, entry);
          const result = await upsertToStrapi(mapped);
          results[result]++;
        } catch {
          results.errors++;
        }
      }
    } else {
      // Return transformed data without CMS write (for local dev or when CMS is unavailable)
      const transformed = models.map(({ name, entry }) => mapEntryToStrapi(name, entry));
      return res.status(200).json({
        success: true,
        total: transformed.length,
        models: transformed,
        syncedAt: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      ...results,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("[sync-llm-gallery]", err instanceof Error ? err.message : err);
    return res.status(500).json({ error: "Sync failed" });
  }
}
