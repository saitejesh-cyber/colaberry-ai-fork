/**
 * Deep-dive content for `gemma-4-31b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary sources:
 *   - HuggingFace `google/gemma-4-31B-it/config.json`
 *   - Gemma 4 model card (ai.google.dev)
 */

export const slug = "gemma-4-31b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Gemma 4 31B is the **dense variant** of the Gemma 4 family, released " +
      "April 2026 alongside the Gemma 4 26B-A4B MoE. At 30.7 B dense parameters " +
      "it is a direct successor to Gemma 3 27B, with the same **local-global " +
      "attention interleave, QK-Norm, and soft-cap** heritage but a doubled " +
      "context window (128 K → 256 K). For teams that cannot or will not " +
      "adopt MoE serving, Gemma 4 31B is the dense continuation of the Gemma 3 " +
      "lineage.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Gemma 4 31B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 30.7 B", "dense"],
      ["Layers", "60", "50 sliding-window + 10 global (5:1)"],
      ["Attention", "GQA + QK-Norm + SWA", "inherited from Gemma 3"],
      ["KV cache", "≈ 840 KiB/token", "large — dense attention on 60 layers"],
      ["Max position", "262,144", "256 K native"],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "840 KiB/Token KV Cache", anchor: "kv" },
  {
    __component: "deep.paragraph",
    body:
      "Gemma 4 31B's KV cache at ≈ **840 KiB per token** is the largest per-" +
      "token footprint in this gallery, which is a direct consequence of " +
      "running full-MHA-width attention across 60 layers on a dense stack. At " +
      "the full 256 K native context this is ≈ 215 GiB of KV cache per " +
      "sequence, which makes long-context serving expensive. The Gemma 4 31B " +
      "dense variant is therefore best matched to shorter-context workloads " +
      "where the per-token serving cost is amortized across reasonable " +
      "sequence lengths; for 128 K+ context workloads, the Gemma 4 26B-A4B MoE " +
      "variant is a much better economic fit.",
  },

  { __component: "deep.heading", level: "h2", text: "5:1 Local-Global Preserved", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "Like Gemma 3 27B and Gemma 4 26B-A4B, Gemma 4 31B uses a **5:1 sliding-" +
      "window to global ratio** — 50 local layers + 10 global layers. This is " +
      "the signature Gemma attention structure, chosen in Gemma 2 and scaled " +
      "up with each release. Gemma 3 27B's dual-RoPE frequencies (local θ=10K, " +
      "global θ=1M) and logit soft-capping (attention ≈ 50.0, output ≈ 30.0) " +
      "both carry over to Gemma 4.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The Dense Gemma Continuation", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Gemma 4 31B is for teams that **cannot adopt MoE serving**: fine-tuning " +
      "researchers working with standard dense-optimized frameworks, " +
      "hardware environments without MoE kernel support, or anyone whose " +
      "production pipeline is already tuned for Gemma 3 dense serving and does " +
      "not want to migrate the expert-routing infrastructure. Architecturally " +
      "it is a point upgrade to Gemma 3 27B with a doubled context window. For " +
      "new deployments where MoE is on the table, Gemma 4 26B-A4B is the " +
      "better economic choice.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Gemma 4 31B Instruction — HuggingFace config.json",
        url: "https://huggingface.co/google/gemma-4-31B-it/blob/main/config.json",
      },
      {
        label: "Gemma 4 Model Card — Google",
        url: "https://ai.google.dev/gemma/docs/core/model_card_4",
      },
    ],
  },
];
