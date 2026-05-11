/**
 * Deep-dive content for `xiaomi-mimo-v2-flash-309b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary source: HuggingFace `XiaomiMiMo/MiMo-V2-Flash/config.json`
 * Paper: arXiv 2601.02780 (MiMo-V2 technical report)
 */

export const slug = "xiaomi-mimo-v2-flash-309b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Xiaomi MiMo-V2-Flash is a **309 B total / 15 B active** sparse MoE from " +
      "Xiaomi's MiMo research line, released December 2025. The 'Flash' suffix " +
      "signals the focus: serving latency. Per the shipped `config.json`, the " +
      "entire attention stack is **sliding-window only** with a very high 5:1 " +
      "ratio of local to global layers (40 sliding-window + 8 global across 48 " +
      "total), which is the sparsest global-attention budget in any frontier MoE " +
      "in this gallery.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "MiMo-V2-Flash 309B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 309 B", "MoE"],
      ["Active parameters", "≈ 15 B", "per token"],
      ["Layers", "48", "40 sliding-window + 8 global"],
      ["Attention", "SWA", "heavy sliding-window emphasis"],
      ["KV cache", "≈ 144 KiB/token", "moderate thanks to SWA"],
      ["Max position", "262,144", "256 K native"],
      ["Vocabulary", "≈ 153,000", ""],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "5:1 Local-Global", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "MiMo-V2-Flash's 5:1 local-to-global ratio mirrors Gemma 3's pattern " +
      "exactly, but at much larger MoE scale. Only 8 of 48 layers attend to the " +
      "full 256 K context; the remaining 40 operate on a sliding window. This " +
      "keeps per-token attention cost low enough that the 15 B active-compute " +
      "budget produces snappy decode throughput — which is the 'Flash' " +
      "positioning. Teams that need maximum long-context recall should prefer " +
      "DeepSeek-V3 or Kimi K2 (both with MLA full-attention), but for high-" +
      "throughput agentic workloads the tradeoff lands well.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: Long-Context MoE Built for Latency", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "MiMo-V2-Flash pairs a **large expert pool** (309 B total) with **latency-" +
      "first attention** (heavy sliding-window). The result is a model that serves " +
      "at roughly dense-15 B-per-token speed while carrying nearly 20× that much " +
      "total knowledge in its expert pool. It is architecturally conservative in " +
      "every respect except the attention-layer ratio, which is the sparsest " +
      "global budget shipped at frontier scale.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "MiMo-V2-Flash — HuggingFace config.json",
        url: "https://huggingface.co/XiaomiMiMo/MiMo-V2-Flash/blob/main/config.json",
      },
      {
        label: "MiMo-V2 technical report — arXiv:2601.02780",
        url: "https://arxiv.org/pdf/2601.02780",
      },
    ],
  },
];
