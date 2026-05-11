/**
 * Deep-dive content for `nanbeige-4-1-3b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary sources:
 *   - HuggingFace `Nanbeige/Nanbeige4.1-3B/config.json`
 *   - Nanbeige 4.1 technical report — arXiv:2602.13367
 */

export const slug = "nanbeige-4-1-3b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Nanbeige 4.1 3B is a **3 B dense decoder** from the Nanbeige team, " +
      "released February 2026. At this size it competes with Llama 3.2 3B, " +
      "SmolLM3 3B, and Qwen3-4B in the edge-deployment tier. The distinctive " +
      "feature per the config.json is the **262 K native context window**, which " +
      "is dramatically larger than any other 3B-class model in this gallery " +
      "(Llama 3.2 3B ships 128 K, Qwen3-4B ships 128 K).",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Nanbeige 4.1 3B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 3 B", "dense"],
      ["Layers", "32", "all GQA"],
      ["Attention", "GQA", "standard grouped-query"],
      ["KV cache", "≈ 64 KiB/token", ""],
      ["Max position", "262,144", "256 K native — unusually long for 3B"],
      ["Vocabulary", "≈ 166,000", ""],
      ["Normalization", "RMSNorm", "pre-norm"],
      ["Activation", "SiLU (SwiGLU)", ""],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "256K Context at 3B", anchor: "context" },
  {
    __component: "deep.paragraph",
    body:
      "Serving a 256 K context window on a 3 B model is unusual because the KV " +
      "cache cost scales linearly with context length while the weight cost " +
      "stays fixed. At 64 KiB/token × 256 K ≈ **16 GiB of KV cache**, which " +
      "exceeds the ≈ 6 GB bf16 weight footprint by almost 3×. The Nanbeige team's " +
      "bet is that edge deployments with abundant GPU RAM but tight per-token " +
      "inference cost (e.g. long-document summarization on a workstation GPU) " +
      "benefit from this tradeoff.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The Long-Context Edge Model", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Nanbeige 4.1 3B is the **longest-context 3B-class open weight model** in " +
      "the gallery. Architecturally it is conservative (plain GQA, no SWA, no " +
      "thinking mode). The value is the context length: if your workload is " +
      "'summarize very long documents cheaply on a single GPU', this is the " +
      "default pick. For general-purpose 3B use, Llama 3.2 3B and Qwen3-4B are " +
      "stronger and have broader tooling support.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Nanbeige 4.1 3B — HuggingFace config.json",
        url: "https://huggingface.co/Nanbeige/Nanbeige4.1-3B/blob/main/config.json",
      },
      {
        label: "Nanbeige 4.1 technical report — arXiv:2602.13367",
        url: "https://arxiv.org/pdf/2602.13367",
      },
    ],
  },
];
