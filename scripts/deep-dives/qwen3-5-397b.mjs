/**
 * Deep-dive content for `qwen3-5-397b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary source: HuggingFace `Qwen/Qwen3.5-397B-A17B/config.json`
 */

export const slug = "qwen3-5-397b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3.5 397B-A17B is Alibaba's February 2026 follow-up to the Qwen3 " +
      "series. At **397 B total / 17 B active parameters** it sits between " +
      "Qwen3-235B-A22B (the Qwen3 flagship) and frontier MoEs like DeepSeek V3.2 " +
      "(671 B). The architectural leap is in the attention stack: Qwen3.5 drops " +
      "standard GQA entirely in favor of a **3:1 Gated DeltaNet + Gated " +
      "Attention** hybrid. This is the same direction Qwen3-Next 80B-A3B took, " +
      "now scaled to near-frontier total parameters.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Qwen3.5 397B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 397 B", "MoE"],
      ["Active parameters", "≈ 17 B", "per token"],
      ["Layer mix", "15 gated attention + 45 DeltaNet", "60 total layers"],
      ["Attention", "Gated DeltaNet + Gated Attention", "3:1 DeltaNet:attention ratio"],
      ["KV cache", "≈ 30 KiB/token", "very small thanks to DeltaNet dominance"],
      ["Max position", "262,144", "256 K native"],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "DeltaNet: Linear Attention, Linearized", anchor: "deltanet" },
  {
    __component: "deep.paragraph",
    body:
      "DeltaNet is a **linear-attention variant** in the same research family as " +
      "Mamba-2, RWKV-7, and Lightning Attention. Unlike classic linear attention, " +
      "DeltaNet uses a 'delta rule' state update — at each token, the model " +
      "computes a small correction to the current state rather than a full " +
      "rewrite. This gives the model tighter control over how its recurrent " +
      "memory state evolves over long sequences. Qwen3.5's 3:1 ratio means **75% " +
      "of layers are DeltaNet**, paying only linear-in-sequence cost, while the " +
      "remaining 25% pay full quadratic attention cost.",
  },
  {
    __component: "deep.paragraph",
    body:
      "This is architecturally the same direction as Kimi Linear 48B-A3B, " +
      "scaled up to near-frontier parameter count. Read the Kimi Linear deep " +
      "dive for a longer explanation of the linear-attention / full-attention " +
      "hybrid tradeoff. The KV cache drops to ≈ 30 KiB/token, which is 3–10× " +
      "smaller than similarly-sized pure-attention MoEs.",
  },

  { __component: "deep.heading", level: "h2", text: "Gated Attention", anchor: "gated" },
  {
    __component: "deep.paragraph",
    body:
      "The 15 full-attention layers are **gated attention**: standard attention " +
      "output multiplied elementwise by a sigmoid-gated projection of the input. " +
      "This acts as a soft gate that can suppress the attention contribution " +
      "per-token. Combined with DeltaNet, the full-attention layers can focus " +
      "their (limited) budget on the most globally-relevant patterns without " +
      "wasting capacity on easy cases.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: Qwen Goes Linear at Frontier Scale", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3.5 397B is the **largest public linear-attention hybrid** as of " +
      "early 2026 — bigger than Kimi Linear by an order of magnitude. It is the " +
      "clearest signal that Alibaba is committing to linear attention as the " +
      "scaling path for serving efficiency at frontier scale, rather than betting " +
      "on MLA (DeepSeek) or sparse attention (DeepSeek V3.2). For long-context " +
      "serving economics, it should be benchmarked directly against Ling 2.5 1T " +
      "and Kimi Linear.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Qwen3.5 397B-A17B — HuggingFace config.json",
        url: "https://huggingface.co/Qwen/Qwen3.5-397B-A17B/blob/main/config.json",
      },
    ],
  },
];
