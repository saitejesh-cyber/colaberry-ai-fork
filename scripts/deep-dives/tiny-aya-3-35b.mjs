/**
 * Deep-dive content for `tiny-aya-3-35b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary sources:
 *   - HuggingFace `CohereLabs/tiny-aya-base/config.json`
 *   - Aya technical report — arXiv:2603.11510
 */

export const slug = "tiny-aya-3-35b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Tiny Aya 3.35B is Cohere's February 2026 **multilingual-first small " +
      "model**, part of the Aya research line that has historically focused on " +
      "coverage across long-tail languages. At 3.35 B dense parameters, it " +
      "competes with Llama 3.2 3B, SmolLM3 3B, and Qwen3-4B in the edge-tier " +
      "band. The distinctive design choices per the shipped `config.json` are " +
      "a **3:1 sliding-window to global attention ratio** and a very tight **8 " +
      "K context window** — one of the smallest in any 2026 release.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Tiny Aya 3.35B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 3.35 B", "dense"],
      ["Layers", "36", "27 sliding-window + 9 global (3:1)"],
      ["Attention", "GQA + 3:1 SWA + RoPE", ""],
      ["KV cache", "≈ 72 KiB/token", ""],
      ["Max position", "8,192", "8 K native — intentionally small"],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "Why 8K Context?", anchor: "context" },
  {
    __component: "deep.paragraph",
    body:
      "8 K is an unusually short context window by 2026 standards — nearly every " +
      "comparable small model ships at 128 K or longer. The Aya team's focus is " +
      "**multilingual coverage**, not long-context retrieval: budget that would " +
      "have gone into long-context pretraining instead goes into broader " +
      "language-mix coverage (the Aya line covers 100+ languages) and higher-" +
      "quality per-language data. For chat, translation, and summarization tasks " +
      "on languages that competing 3B models handle poorly, this is a better " +
      "budget allocation than an unused 128 K window.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The Multilingual Small Model", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Tiny Aya 3.35B is the **default 3B-class pick for multilingual " +
      "workloads** — especially any language outside the top 10 by training-" +
      "data volume. Architecturally it is conservative and nothing in the config " +
      "is novel, but Cohere's Aya line has consistently out-benchmarked general " +
      "3B models on long-tail languages, and the tight 8 K context is a feature " +
      "for the specific workload Aya targets, not a limitation.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Tiny Aya Base — HuggingFace config.json",
        url: "https://huggingface.co/CohereLabs/tiny-aya-base/blob/main/config.json",
      },
      {
        label: "Aya technical report — arXiv:2603.11510",
        url: "https://arxiv.org/pdf/2603.11510",
      },
    ],
  },
];
