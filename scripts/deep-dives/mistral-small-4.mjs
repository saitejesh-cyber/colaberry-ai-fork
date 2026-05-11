/**
 * Deep-dive content for `mistral-small-4`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary sources:
 *   - HuggingFace `mistralai/Mistral-Small-4-119B-2603/config.json`
 *   - Mistral blog: "Mistral Small 4" (2026-03)
 */

export const slug = "mistral-small-4";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Mistral Small 4 is Mistral's March 2026 major-version bump to its 'small' " +
      "tier. The name is misleading: at **119 B total / 6.63 B active " +
      "parameters** it is no longer 'small' in any literal sense — it is now a " +
      "full sparse MoE, a dramatic departure from Mistral Small 3.1 24B's dense " +
      "architecture. The other architectural shift is **MLA**: Mistral Small 4 " +
      "drops GQA in favor of Multi-head Latent Attention, joining Mistral Large " +
      "3 in Mistral's MLA transition.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Mistral Small 4 configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 119 B", "MoE — dense → MoE transition"],
      ["Active parameters", "≈ 6.63 B", "per token"],
      ["Layers", "36", "all MLA"],
      ["Attention", "MLA", "Mistral's second MLA release after Mistral Large 3"],
      ["KV cache", "≈ 22.5 KiB/token", "dramatic drop vs Mistral Small 3.1's 160 KiB"],
      ["Max position", "262,144", "256 K native"],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "Dense → MoE Transition", anchor: "moe" },
  {
    __component: "deep.paragraph",
    body:
      "The Mistral Small tier started at 7 B dense (Mistral 7B), went to 12 B " +
      "dense (Nemo), then 24 B dense (Small 3 / 3.1), and now jumps to **119 B " +
      "total / 6.63 B active MoE**. Per-token compute at 6.63 B is roughly a " +
      "quarter of Mistral Small 3.1's 24 B dense active compute — so Small 4 " +
      "actually serves *faster* than its predecessor while carrying 5× the total " +
      "parameter count. This is the standard 'scale total parameters while " +
      "keeping or shrinking active compute' MoE playbook.",
  },

  { __component: "deep.heading", level: "h2", text: "MLA at Mid-Size", anchor: "mla" },
  {
    __component: "deep.paragraph",
    body:
      "The adoption of **MLA** cuts KV-cache footprint from Mistral Small 3.1's " +
      "160 KiB/token to just **22.5 KiB/token** — a 7× reduction. This is what " +
      "makes the 256 K native context window economically serveable at this " +
      "parameter count. With 22.5 KiB × 256 K ≈ 5.8 GiB of KV cache per " +
      "sequence, Small 4 fits full-context workloads into single-GPU serving in " +
      "a way Mistral Small 3.1 could only dream of.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: Small in Name Only", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Mistral Small 4 is **architecturally a new generation, not a point " +
      "release**. It abandons Mistral's dense-small heritage in favor of MoE " +
      "serving economics, and adopts MLA to make long-context workloads " +
      "practical. For teams whose production workload was Mistral Small 3.1 " +
      "with 128 K context, Small 4 is a drop-in upgrade that roughly doubles " +
      "the context window, cuts per-token serving cost, and raises total " +
      "knowledge capacity 5×. The license should be checked — Small 4's release " +
      "terms differ from Small 3.1's Apache 2.0.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Mistral Small 4 — HuggingFace config.json",
        url: "https://huggingface.co/mistralai/Mistral-Small-4-119B-2603/blob/main/config.json",
      },
      {
        label: "Mistral Small 4 — Mistral blog",
        url: "https://mistral.ai/news/mistral-small-4",
      },
    ],
  },
];
