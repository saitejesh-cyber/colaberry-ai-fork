/**
 * Deep-dive content for `arcee-ai-trinity-large-400b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary sources:
 *   - HuggingFace `arcee-ai/Trinity-Large-Base/config.json`
 *   - Trinity technical report — arXiv:2602.17004
 */

export const slug = "arcee-ai-trinity-large-400b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Arcee AI's Trinity Large is a **400 B total / 13 B active parameter** " +
      "sparse MoE, released January 2026 as the largest model in Arcee's Trinity " +
      "family. Arcee has historically focused on model merging and SLERP-based " +
      "fine-tuning at small-to-medium scale; Trinity Large is their first " +
      "frontier-scale original pretrain. The config ships a distinctive " +
      "combination: **GQA + Gated Attention + 3:1 sliding-window ratio**.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Trinity Large 400B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 400 B", "MoE"],
      ["Active parameters", "≈ 13 B", "per token"],
      ["Layers", "60", "45 sliding-window + 15 global (3:1)"],
      ["Attention", "GQA + Gated Attention + SWA", "per config.json"],
      ["KV cache", "≈ 240 KiB/token", ""],
      ["Max position", "524,288", "512 K native — among the largest in the gallery"],
      ["Vocabulary", "≈ 200,000", ""],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "Gated Attention", anchor: "gated" },
  {
    __component: "deep.paragraph",
    body:
      "Trinity Large's 'Gated Attention' adds a learned gating term to the " +
      "standard attention output. After the normal `softmax(QK^T)V` computation, " +
      "the result is multiplied elementwise by a sigmoid-gated projection of the " +
      "input. This lets the model **suppress attention outputs per-token** at the " +
      "layer level, which acts as a soft skip connection when the attention " +
      "head's contribution is weak. It is a small change to standard attention " +
      "that mostly shows up as training stability and a modest quality bump, not " +
      "a throughput win.",
  },

  { __component: "deep.heading", level: "h2", text: "512K Native Context", anchor: "context" },
  {
    __component: "deep.paragraph",
    body:
      "At 512 K native context, Trinity Large is among the longest-context open-" +
      "weight models in this gallery (only Llama 4 Maverick's 1 M and the " +
      "Nemotron 3 family's 1 M are larger). The 3:1 sliding-window to global " +
      "ratio keeps the KV-cache footprint manageable (≈ 240 KiB/token) even at " +
      "this context length, though the Arcee team recommends at least 8× H100 " +
      "80G for full-context serving.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: Arcee's Frontier Debut", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Trinity Large 400B is Arcee AI's argument that a smaller lab can ship " +
      "frontier-scale MoE weights. The architecture is conservative — standard " +
      "GQA with a few quality-of-life additions (gated attention, SWA) rather " +
      "than novel primitives like MLA or DSA. The differentiator is the **512 K " +
      "context** and the Arcee team's model-merging expertise in post-training. " +
      "For long-document workloads where DeepSeek V3.2 is overkill and Llama 4 " +
      "Maverick is too expensive to serve, Trinity Large is worth benchmarking.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Trinity Large Base — HuggingFace config.json",
        url: "https://huggingface.co/arcee-ai/Trinity-Large-Base/blob/main/config.json",
      },
      {
        label: "Trinity technical report — arXiv:2602.17004",
        url: "https://arxiv.org/pdf/2602.17004",
      },
    ],
  },
];
