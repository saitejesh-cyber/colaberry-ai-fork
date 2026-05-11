/**
 * Deep-dive content for `sarvam-105b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary sources:
 *   - HuggingFace `sarvamai/sarvam-105b/config.json`
 *   - Sarvam AI blog: "Sarvam 30B & 105B" (2026-03)
 */

export const slug = "sarvam-105b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Sarvam 105B is the larger of Sarvam AI's March 2026 pair of open-weight " +
      "MoEs, targeted at **Indic-language workloads**. At 105 B total / 10.3 B " +
      "active, it is a mid-tier MoE with one of the more unusual attention " +
      "stacks in this gallery: **MLA + KV LayerNorm + NoPE + RoPE mixed**. The " +
      "config.json shows 32 MLA layers, a 262 K vocabulary (one of the largest " +
      "in this gallery — explicitly sized for Indic scripts), and a 131 K " +
      "context window.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Sarvam 105B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 105 B", "MoE"],
      ["Active parameters", "≈ 10.3 B", "per token"],
      ["Layers", "32", "all MLA"],
      ["Attention", "MLA + KV LayerNorm + NoPE + RoPE", "hybrid position scheme"],
      ["KV cache", "≈ 36 KiB/token", "MLA compression"],
      ["Max position", "131,072", "128 K native"],
      ["Vocabulary", "≈ 262,000", "large — sized for Indic scripts"],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "NoPE + RoPE Hybrid", anchor: "position" },
  {
    __component: "deep.paragraph",
    body:
      "Sarvam 105B is one of the few models in this gallery to ship a **hybrid " +
      "NoPE + RoPE positional scheme**: some layers use no positional " +
      "information at all, others use standard RoPE. 'NoPE' (no positional " +
      "encoding) layers let the model rely purely on content-based attention " +
      "patterns, which research in 2024 showed can be surprisingly effective " +
      "for in-context learning tasks. Mixing NoPE with RoPE layers is an " +
      "attempt to get the best of both: content-addressable memory on some " +
      "layers, relative-position awareness on others.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The config also adds **KV LayerNorm** — a LayerNorm applied to keys and " +
      "values before the attention operation. This is an attention-stability " +
      "trick in the same family as QK-Norm, pioneered in a handful of open-" +
      "weight models but not yet standard.",
  },

  { __component: "deep.heading", level: "h2", text: "262K Vocabulary for Indic Coverage", anchor: "vocab" },
  {
    __component: "deep.paragraph",
    body:
      "The 262 K vocabulary is **twice the size of most peer models** (Llama 3 " +
      "ships 128 K, Qwen3 ships 152 K). Sarvam's pitch: Indic scripts " +
      "(Devanagari, Tamil, Bengali, etc.) need dense tokenizer coverage to " +
      "avoid the byte-per-token penalty that hits English-optimized BPE " +
      "tokenizers on non-Latin scripts. At 262 K tokens, a Sarvam tokenization " +
      "of Hindi or Tamil text is roughly 2–3× more compressive than the same " +
      "text under Llama 3's tokenizer, which directly translates to better " +
      "effective context and lower inference cost on Indic workloads.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The Indic-First Frontier", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Sarvam 105B is the **default pick for Indic-language production " +
      "workloads** at the 100 B-class tier. Its architectural novelty is in " +
      "the position-encoding hybrid and the large vocabulary, both directly " +
      "serving the Indic-coverage mission. For English-only use cases, " +
      "Qwen3-235B-A22B or DeepSeek-V3 benchmark higher. For Indic-first teams " +
      "that cannot use closed Indian models (e.g., Krutrim, Bhashini), Sarvam " +
      "105B is the strongest open-weight option.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Sarvam 105B — HuggingFace config.json",
        url: "https://huggingface.co/sarvamai/sarvam-105b/blob/main/config.json",
      },
      {
        label: "Sarvam 30B & 105B — Sarvam AI blog",
        url: "https://www.sarvam.ai/blogs/sarvam-30b-105b",
      },
    ],
  },
];
