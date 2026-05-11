/**
 * Deep-dive content for `qwen3-235b-a22b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave A).
 *
 * Primary sources:
 *   - HuggingFace `Qwen/Qwen3-235B-A22B/config.json`
 *   - arXiv 2505.09388 ("Qwen3 Technical Report", Alibaba, 2025)
 */

export const slug = "qwen3-235b-a22b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-235B-A22B is the **frontier MoE flagship** of the Qwen3 family — 235 B " +
      "total parameters, 22 B active per token, released on 29 April 2025 by Alibaba. " +
      "In per-token compute cost it is comparable to a dense 22B model, but the 235B " +
      "total parameter budget delivers frontier-level benchmark performance on math, " +
      "code, and reasoning. This is the Qwen3 model to compare directly against " +
      "DeepSeek-V3 (671B total / 37B active) — the two flagship open-weight MoEs of " +
      "2025.",
  },
  {
    __component: "deep.paragraph",
    body:
      "For the family-wide story — QK-Norm, the thinking-mode switch, the four-stage " +
      "post-training recipe — read the Qwen3-32B dense-flagship deep dive. This page " +
      "focuses on the MoE-specific scaling choices that differ from the 30B-A3B " +
      "sibling.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Qwen3-235B-A22B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 235 B", "MoE"],
      ["Active parameters", "≈ 22 B", "per token"],
      ["Hidden size (`d_model`)", "4096", "`hidden_size`"],
      ["Layers", "94", "`num_hidden_layers`"],
      ["Query heads", "64", "`num_attention_heads`"],
      ["KV heads", "4", "`num_key_value_heads` (GQA 16:1)"],
      ["Head dimension", "128", "`head_dim`"],
      ["Routed experts", "128", "`num_experts`"],
      ["Top-k per token", "8", "`num_experts_per_tok`"],
      ["Expert FFN intermediate", "1536", "`moe_intermediate_size`"],
      ["Shared experts", "0", "pure routed"],
      ["Vocabulary", "151,936", "Qwen tiktoken"],
      ["Max position (native)", "32,768", "`max_position_embeddings`"],
      ["Max position (YaRN)", "131,072", "via `rope_scaling`"],
      ["Normalization", "RMSNorm + QK-Norm", "pre-norm + Q/K norm"],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "94 Layers: The Deepest in the Gallery", anchor: "depth" },
  {
    __component: "deep.paragraph",
    body:
      "At **94 layers**, Qwen3-235B-A22B is the deepest transformer in this gallery. " +
      "DeepSeek-V3 has 61, Llama 3 70B has 80, Kimi Linear has 61. Qwen3's depth-first " +
      "preference — spend capacity on more transformer blocks rather than wider layers " +
      "— is pushed to its limit here. The motivation per §3 of the tech report is " +
      "reasoning: each additional layer buys another opportunity for in-context " +
      "refinement during a thinking-mode chain of thought. At 94 layers the model can " +
      "sustain substantially longer implicit reasoning chains before running out of " +
      "iterative capacity.",
  },
  {
    __component: "deep.callout",
    variant: "insight",
    title: "Depth has a cost",
    body:
      "94 layers means 94 sequential dependencies per token. Inference latency per " +
      "decoded token is proportional to layer count, so Qwen3-235B serves slower per " +
      "token than a 61-layer MoE of the same active-parameter budget. Alibaba's bet is " +
      "that for reasoning-mode workloads, quality per token matters more than tokens " +
      "per second — a bet the benchmark numbers in §5 of the tech report back up.",
  },

  { __component: "deep.heading", level: "h2", text: "GQA 16:1: Extreme KV Cache Reduction", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "Attention uses **GQA 16:1** — 64 query heads share just 4 KV heads. This is the " +
      "tightest GQA ratio in any model in this gallery, approaching Multi-Query " +
      "Attention (MQA) in KV-cache footprint. With 94 layers, the KV cache at bf16 is " +
      "`2 × 4 × 128 × 2 × 94 ≈ 188 KiB/token`; at full 128K context that is **≈ 24 " +
      "GiB** of KV alone. Without the aggressive 16:1 ratio, deploying the 235B at " +
      "full context would be prohibitively expensive in memory terms. QK-Norm is " +
      "applied unchanged from the family recipe.",
  },

  { __component: "deep.heading", level: "h2", text: "MoE Routing: 128 Experts, Top-8", anchor: "moe" },
  {
    __component: "deep.paragraph",
    body:
      "The routing topology is the same as the smaller 30B-A3B sibling: 128 experts per " +
      "layer, top-8 selected per token, no shared dense expert. What changes at 235B is " +
      "the **expert size** — each expert's FFN intermediate is 1536 (vs 768 in 30B-" +
      "A3B), so each activated expert carries more capacity. The routing counts stay " +
      "constant because increasing experts-per-token drives latency linearly and " +
      "Alibaba chose to spend the capacity increase on wider experts instead.",
  },

  { __component: "deep.heading", level: "h2", text: "Serving: Multi-GPU Required", anchor: "serving" },
  {
    __component: "deep.paragraph",
    body:
      "At bf16 the full 235B weight set is ≈ 470 GB — well beyond a single GPU. Typical " +
      "deployment uses 8-way tensor parallelism on 8× H100 80G or equivalent. The " +
      "per-token active-parameter cost (22 B) is comparable to a dense 22B model, which " +
      "means throughput per GPU hour is roughly 2-3× that of a dense 70B at similar " +
      "quality. This is the core scaling argument for MoE at frontier scale.",
  },

  { __component: "deep.heading", level: "h2", text: "Benchmarks vs DeepSeek-V3", anchor: "benchmarks" },
  {
    __component: "deep.paragraph",
    body:
      "The head-to-head comparison in §5 of the Qwen3 tech report puts Qwen3-235B-A22B " +
      "in thinking mode roughly on par with DeepSeek-V3 on MATH and AIME, slightly " +
      "behind on GPQA, and ahead on multilingual tasks. The two models are remarkably " +
      "close given their very different architectural bets — V3 spends capacity on MLA " +
      "(latent KV) and DeepSeekMoE, Qwen3 spends it on depth and thinking-mode RL. " +
      "For most workloads, the pick between them comes down to serving " +
      "infrastructure, not benchmark quality.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The Reasoning Frontier", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-235B-A22B is one of two serious open-weight frontier reasoning models " +
      "available in 2025, alongside DeepSeek-V3/R1. Pick it over DeepSeek-V3 if you " +
      "specifically need the thinking-mode runtime switch (single checkpoint, two " +
      "behaviors) or if your deployment is memory-constrained and you want the tighter " +
      "KV cache that GQA 16:1 delivers. Pick DeepSeek-V3 if you need its MLA latent KV " +
      "and the 128K-native long-context quality.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Qwen3-235B-A22B — HuggingFace config.json",
        url: "https://huggingface.co/Qwen/Qwen3-235B-A22B/blob/main/config.json",
      },
      {
        label: "Qwen3 Technical Report (Alibaba, 2025) — arXiv:2505.09388",
        url: "https://arxiv.org/abs/2505.09388",
      },
      {
        label: "Qwen3: Think Deeper, Act Faster — Qwen blog (2025-04-29)",
        url: "https://qwenlm.github.io/blog/qwen3/",
      },
    ],
  },
];
