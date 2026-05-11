/**
 * Deep-dive content for `ling-2-5-1t`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary source: HuggingFace `inclusionAI/Ling-2.5-1T/config.json`
 * No separate technical report at release time.
 */

export const slug = "ling-2-5-1t";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Ling 2.5 1T is a **1 T total / 63 B active parameter** sparse MoE from " +
      "Ant Group's inclusionAI research team, released February 2026. It is one " +
      "of the handful of open-weight trillion-parameter models alongside Kimi K2 " +
      "and Kimi K2.5. What makes Ling 2.5 distinctive is the **attention stack**: " +
      "the shipped `config.json` shows a 10-layer MLA + 70-layer Lightning " +
      "Attention interleave, an aggressive hybrid that most labs have not yet " +
      "committed to at frontier scale.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Ling 2.5 1T configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 1 T", "MoE"],
      ["Active parameters", "≈ 63 B", "per token — much denser than Kimi K2's 32B"],
      ["Layers", "80", "10 MLA + 70 Lightning Attention"],
      ["Attention", "MLA + Lightning Attention", "hybrid"],
      ["KV cache", "≈ 11.2 KiB/token", "tiny — thanks to Lightning Attention"],
      ["Max position", "262,144", "256 K native"],
      ["Vocabulary", "≈ 157,000", ""],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "Lightning Attention Dominates", anchor: "lightning" },
  {
    __component: "deep.paragraph",
    body:
      "Lightning Attention is a **linear-attention variant** — subquadratic " +
      "attention cost in sequence length, with a fixed-size 'memory state' per " +
      "layer rather than a growing KV cache. It is in the same family as Mamba-2, " +
      "RWKV-7, and Kimi Linear's attention primitive (see the Kimi Linear deep " +
      "dive for a longer explanation of how linear attention works).",
  },
  {
    __component: "deep.paragraph",
    body:
      "Ling 2.5's **10 MLA + 70 Lightning** ratio is unusually heavy on linear " +
      "attention: only ~12% of layers pay quadratic attention cost. This is why " +
      "the KV cache is only ≈ 11.2 KiB/token at 1 T total parameters, an order " +
      "of magnitude smaller than Kimi K2's 68.6 KiB despite identical total " +
      "parameter count. For very long context workloads (256 K native), Ling 2.5 " +
      "should serve at much higher throughput than any pure-MLA trillion model.",
  },

  { __component: "deep.heading", level: "h2", text: "63B Active: Denser than Peer MoEs", anchor: "active" },
  {
    __component: "deep.paragraph",
    body:
      "Most trillion-class MoEs keep active compute low — Kimi K2 and K2.5 both " +
      "run 32 B active. Ling 2.5 runs **63 B active**, nearly double, which " +
      "means per-token compute cost is closer to a dense 63 B decoder than a " +
      "dense 32 B. The tradeoff: Ling 2.5 is a more expensive model to serve per " +
      "token, but it gets more expert compute per decision, which shows up in " +
      "reasoning benchmarks. This is a deliberate different bet than Kimi's " +
      "'scale total parameters, keep active tight' posture.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The Linear-Attention Trillion", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Ling 2.5 1T is the **most aggressive linear-attention / MLA hybrid** at " +
      "trillion-parameter scale. For teams willing to adopt a non-standard " +
      "attention kernel (Lightning Attention needs custom CUDA to hit its " +
      "theoretical throughput), the serving economics at 256 K context are " +
      "unmatched by any pure-transformer peer. Read together with the Kimi " +
      "Linear and xLSTM 7B deep dives for the broader 'post-transformer' " +
      "research landscape.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Ling 2.5 1T — HuggingFace config.json",
        url: "https://huggingface.co/inclusionAI/Ling-2.5-1T/blob/main/config.json",
      },
    ],
  },
];
