/**
 * Deep-dive content for `qwen3-30b-a3b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave A).
 *
 * Primary sources:
 *   - HuggingFace `Qwen/Qwen3-30B-A3B/config.json`
 *   - arXiv 2505.09388 ("Qwen3 Technical Report", Alibaba, 2025)
 *
 * Qwen3-30B-A3B is the smaller of the two Qwen3 MoE checkpoints — 30B total,
 * 3B active per token. Shares the family's QK-Norm + thinking-mode features
 * with the dense siblings but adds sparse routing.
 */

export const slug = "qwen3-30b-a3b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-30B-A3B is the smaller of the two Qwen3 MoE checkpoints: **30 B total " +
      "parameters, 3 B active per token**. Released on 29 April 2025 alongside the " +
      "Qwen3-235B-A22B flagship MoE and the dense family. The A3B suffix is Qwen's " +
      "notation for 'Active 3 Billion' — the model routes each token to a sparse " +
      "subset of experts that together carry ≈ 3 B active parameters, giving you 7B-" +
      "class inference cost with 30B-class model capacity.",
  },
  {
    __component: "deep.paragraph",
    body:
      "This is the lowest-cost way to get access to Qwen3 MoE behavior. For the family " +
      "architecture story — QK-Norm, thinking-mode switch, YaRN RoPE — see qwen3-32b. " +
      "For the high-end MoE flagship with more experts and larger active budget, see " +
      "the qwen3-235b-a22b deep dive.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Qwen3-30B-A3B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 30.5 B", "MoE"],
      ["Active parameters", "≈ 3.3 B", "per token"],
      ["Hidden size (`d_model`)", "2048", "`hidden_size`"],
      ["Layers", "48", "`num_hidden_layers`"],
      ["Query heads", "32", "`num_attention_heads`"],
      ["KV heads", "4", "`num_key_value_heads` (GQA 8:1)"],
      ["Head dimension", "128", "`head_dim`"],
      ["Routed experts", "128", "`num_experts`"],
      ["Top-k per token", "8", "`num_experts_per_tok`"],
      ["Expert FFN intermediate", "768", "`moe_intermediate_size`"],
      ["Shared experts", "0", "pure routed, no dense shared expert"],
      ["Vocabulary", "151,936", "Qwen tiktoken"],
      ["Max position (native)", "32,768", "`max_position_embeddings`"],
      ["Max position (YaRN)", "131,072", "via `rope_scaling`"],
      ["Normalization", "RMSNorm + QK-Norm", "pre-norm + Q/K norm"],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "128 Experts, Top-8 Routing", anchor: "moe" },
  {
    __component: "deep.paragraph",
    body:
      "The routing topology is **128 experts with top-8 selection per token**. This is a " +
      "wider expert pool than DeepSeek-V3 (256 experts, top-8) scaled down to the 30B " +
      "budget. The smaller per-expert FFN (only 768 intermediate dims versus V3's larger " +
      "experts) is what lets this fit into the 30B envelope while still selecting 8 " +
      "experts per token — the Qwen team chose 'many small experts' over 'few large " +
      "experts' to maximize specialization diversity at a constrained total-parameter " +
      "budget.",
  },
  {
    __component: "deep.callout",
    variant: "note",
    title: "No shared expert",
    body:
      "Unlike DeepSeek-V3 and Kimi Linear, which each reserve one 'shared' dense expert " +
      "that every token runs through, Qwen3-30B-A3B routes all computation through the " +
      "sparse expert pool. This is a pure-MoE design. The tradeoff is that the model " +
      "relies entirely on the router learning good general-purpose expert coverage — " +
      "there is no fallback dense path for tokens the router fails to place well.",
  },

  { __component: "deep.heading", level: "h2", text: "GQA 8:1: Tight Attention", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "Attention uses a tight **GQA 8:1 ratio** (32 Q / 4 KV), matching Qwen3-32B. The " +
      "48-layer depth makes the KV cache noticeably larger than the 32B's: " +
      "`2 × 4 × 128 × 2 × 48 ≈ 96 KiB/token`, which at 128K context gives **≈ 12 GiB** " +
      "of KV alone — non-trivial relative to the 30B total weight footprint. The same " +
      "QK-Norm from qwen3-32b is applied inside every block.",
  },

  { __component: "deep.heading", level: "h2", text: "Serving: 30B Capacity, 7B Cost", anchor: "serving" },
  {
    __component: "deep.paragraph",
    body:
      "At bf16 the full 30B weight set is ≈ 60 GB, but per-token compute only touches " +
      "≈ 3.3 B active parameters. That inference profile fits neatly onto a single A100 " +
      "80G or H100 80G, with room for substantial KV cache. The effective throughput " +
      "per GPU hour is closer to a 7B dense model's than a 30B dense model's — which " +
      "is the entire point of the A3B design. The catch is memory: you need to hold " +
      "all 128 experts in memory even though any given token activates only 8 of them.",
  },

  { __component: "deep.heading", level: "h2", text: "Thinking-Mode at MoE Scale", anchor: "thinking" },
  {
    __component: "deep.paragraph",
    body:
      "The thinking-mode runtime switch works identically here as in the dense Qwen3 " +
      "checkpoints — same chat template, same `<think>…</think>` format, same joint SFT " +
      "recipe. At MoE scale it matters more because the reasoning-heavy tokens tend to " +
      "route to a specialized subset of experts, which the model learns during the " +
      "reasoning-focused RL stage of the four-stage post-training recipe. Qwen3 tech " +
      "report Figure 5 shows that per-expert usage becomes noticeably more specialized " +
      "on thinking-mode traces than on direct-answer traces.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The 'Cheap MoE' Pick", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-30B-A3B is the right checkpoint when you want MoE serving economics (7B-" +
      "class per-token cost) and Qwen3 thinking-mode behavior in a model small enough " +
      "to fit a single 80 GB GPU without pipeline parallelism. If you need frontier " +
      "benchmark numbers, step up to Qwen3-235B-A22B. If you need on-device or " +
      "single-GPU consumer-class deployment, the dense Qwen3-8B will be cheaper because " +
      "MoE memory dominance at small scale is a bad tradeoff.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Qwen3-30B-A3B — HuggingFace config.json",
        url: "https://huggingface.co/Qwen/Qwen3-30B-A3B/blob/main/config.json",
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
