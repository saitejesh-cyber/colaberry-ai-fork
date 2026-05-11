/**
 * Deep-dive content for `llama-4-maverick`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave A).
 *
 * Primary sources:
 *   - HuggingFace `meta-llama/Llama-4-Maverick-17B-128E-Instruct/config.json`
 *   - Meta blog: "The Llama 4 herd" (2025-04-05)
 *
 * Llama 4 Maverick is Meta's mid-tier Llama 4 MoE — 17B active / 400B total,
 * 128 experts, natively multimodal, Meta's first MoE.
 */

export const slug = "llama-4-maverick";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Llama 4 Maverick is the mid-tier model in Meta's Llama 4 herd, released on 5 " +
      "April 2025 alongside Llama 4 Scout (17B active / 109B total) and Llama 4 " +
      "Behemoth (a much larger frontier-class MoE that was still in training at " +
      "launch). Maverick is **17 B active parameters per token / 400 B total**, " +
      "arranged as a Mixture-of-Experts with 128 routed experts, and it is Meta's " +
      "first production MoE release — a meaningful strategic shift from the " +
      "dense-only Llama 1 / 2 / 3 lineage.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Maverick is also **natively multimodal** — the same checkpoint ingests text " +
      "and images through a unified early-fusion architecture, which Meta calls " +
      "'early fusion' to distinguish from the encoder-bolted-on-top approach of " +
      "Llama 3.2 Vision. This deep dive focuses on the language modeling side.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Llama 4 Maverick configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 400 B", "MoE"],
      ["Active parameters", "≈ 17 B", "per token"],
      ["Hidden size (`d_model`)", "5120", "`hidden_size`"],
      ["Layers", "48", "`num_hidden_layers`"],
      ["Query heads", "40", "`num_attention_heads`"],
      ["KV heads", "8", "`num_key_value_heads` (GQA 5:1)"],
      ["Head dimension", "128", "`head_dim`"],
      ["Routed experts", "128", "`num_local_experts`"],
      ["Top-k per token", "1", "`num_experts_per_tok` — top-1 routing"],
      ["Shared experts", "1", "a dense 'always-on' expert"],
      ["Interleave pattern", "dense + MoE alternating", "not every layer is MoE"],
      ["Vocabulary", "202,048", "`vocab_size` — expanded for multimodal"],
      ["Max position", "1,048,576", "`max_position_embeddings` — 1 M native"],
      ["RoPE base θ", "500,000", "`rope_theta`"],
      ["Normalization", "RMSNorm", "pre-norm"],
      ["Activation", "SiLU (SwiGLU)", "`hidden_act = silu`"],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },
  {
    __component: "deep.callout",
    variant: "insight",
    title: "Top-1 routing with a shared expert",
    body:
      "Most MoE decoders in this gallery (DeepSeek-V3, Qwen3, Kimi Linear) route " +
      "each token to the top-k experts with k=8 or more. Llama 4 Maverick routes " +
      "to **top-1** — exactly one routed expert per token — plus always runs the " +
      "shared expert. This is a much sparser routing regime. Meta's bet is that " +
      "one well-chosen expert plus a consistent dense fallback is easier to train " +
      "stably than top-8 and gives you more total parameters per active FLOP.",
  },

  { __component: "deep.heading", level: "h2", text: "1 M Native Context Window", anchor: "context" },
  {
    __component: "deep.paragraph",
    body:
      "Maverick ships with a **1,048,576-token native context window** (`max_" +
      "position_embeddings = 1 M`) — the largest in this gallery by an order of " +
      "magnitude. This is not a post-hoc YaRN extension; the model is pretrained on " +
      "long-context data with RoPE positions up to 1M. The Llama 4 blog post " +
      "reports consistent needle-in-haystack recall at 1M context, which is a " +
      "significant engineering achievement at MoE scale.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The serving cost at 1M context is nontrivial: with GQA 5:1 and 48 layers, " +
      "the KV cache is `2 × 8 × 128 × 2 × 48 ≈ 192 KiB/token`, which at 1M tokens " +
      "is **≈ 192 GiB of KV cache alone**. In practice, deploying Maverick at full " +
      "context requires multi-GPU tensor parallelism or aggressive KV cache " +
      "quantization.",
  },

  { __component: "deep.heading", level: "h2", text: "Dense + MoE Interleaving", anchor: "interleave" },
  {
    __component: "deep.paragraph",
    body:
      "Not every Maverick layer is an MoE layer. Following a pattern similar to " +
      "DeepSeek-V3 and Kimi Linear, Llama 4 alternates dense FFN layers with MoE " +
      "FFN layers, with a dense-heavy pattern in the earliest layers (where routed " +
      "specialization is least useful) and increasing MoE coverage deeper in the " +
      "stack. The exact ratio is configurable per checkpoint — Maverick leans " +
      "dense-first to make pretraining stable.",
  },

  { __component: "deep.heading", level: "h2", text: "Multimodal: Early Fusion", anchor: "multimodal" },
  {
    __component: "deep.paragraph",
    body:
      "Maverick is natively multimodal via **early fusion**: image patches are " +
      "tokenized into the same residual stream as text tokens, and the MoE router " +
      "sees them as just another token type. This is architecturally cleaner than " +
      "the Llama 3.2 Vision approach (which bolted a SigLIP encoder on top of a " +
      "text-only decoder) and delivers measurably better image-text reasoning on " +
      "benchmarks like MMMU and ChartQA. The cost is that the vision tokenizer is " +
      "part of the pretraining recipe, not a bolt-on — you cannot swap it out " +
      "post-hoc.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: Meta's First MoE", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Llama 4 Maverick is strategically important as Meta's first production MoE — " +
      "it marks the end of the dense-only Llama era and puts Meta directly in " +
      "competition with DeepSeek, Qwen, and Mistral in the open-weight MoE space. " +
      "Architecturally it is distinctive for the **top-1 routing** with a shared " +
      "expert (an unusually sparse regime) and the **1M native context** (the " +
      "largest in the gallery). For product deployment, the combination of " +
      "multimodality, long context, and the Llama license makes it the right pick " +
      "when those three requirements stack up at once; for pure text reasoning, " +
      "Qwen3-235B-A22B and DeepSeek-V3 remain stronger per-token.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Llama 4 Maverick 17B 128E Instruct — HuggingFace config.json",
        url: "https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct/blob/main/config.json",
      },
      {
        label: "The Llama 4 herd: The beginning of a new era of natively multimodal AI — Meta blog (2025-04-05)",
        url: "https://ai.meta.com/blog/llama-4-multimodal-intelligence/",
      },
      {
        label: "The Llama 3 Herd of Models (Meta, 2024) — arXiv:2407.21783",
        url: "https://arxiv.org/abs/2407.21783",
      },
    ],
  },
];
