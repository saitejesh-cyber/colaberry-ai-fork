/**
 * Deep-dive content for `qwen3-8b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave A).
 *
 * Primary sources:
 *   - HuggingFace `Qwen/Qwen3-8B/config.json`
 *   - arXiv 2505.09388 ("Qwen3 Technical Report", Alibaba, 2025)
 *
 * Qwen3-8B is the direct competitor to Llama 3.1 8B / Phi-4 in the dense
 * mid-tier slot. Read qwen3-32b for shared family architecture details.
 */

export const slug = "qwen3-8b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-8B is the family's direct answer to Llama 3.1 8B and Phi-4 14B in the " +
      "dense mid-tier slot. Released on 29 April 2025 by Alibaba, it packs the Qwen3 " +
      "family's distinctive features — **QK-Norm**, **thinking-mode runtime switch**, " +
      "**YaRN-extended 128K context** — into a footprint that runs at full bf16 on a " +
      "single 24 GB consumer GPU. This page covers the 8B-specific numbers and points " +
      "at the Qwen3-32B deep dive for the family-wide architecture story.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Qwen3-8B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 8.2 B", "dense"],
      ["Hidden size (`d_model`)", "4096", "`hidden_size`"],
      ["Layers", "36", "`num_hidden_layers`"],
      ["Query heads", "32", "`num_attention_heads`"],
      ["KV heads", "8", "`num_key_value_heads` (GQA 4:1)"],
      ["Head dimension", "128", "`head_dim`"],
      ["FFN intermediate", "12,288", "`intermediate_size` (3× hidden)"],
      ["Vocabulary", "151,936", "Qwen tiktoken"],
      ["Max position (native)", "32,768", "`max_position_embeddings`"],
      ["Max position (YaRN)", "131,072", "via `rope_scaling`"],
      ["RoPE base θ", "1,000,000", "`rope_theta`"],
      ["Normalization", "RMSNorm + QK-Norm", "pre-norm + Q/K norm"],
      ["Activation", "SiLU (SwiGLU)", "`hidden_act = silu`"],
      ["Embedding tying", "No", "`tie_word_embeddings = false`"],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },
  {
    __component: "deep.callout",
    variant: "insight",
    title: "Same depth as Qwen3-4B, twice the width",
    body:
      "Qwen3-8B and Qwen3-4B both have **36 layers**. The extra parameters at 8B come " +
      "entirely from wider hidden size (4096 vs 2560) and wider FFN. This is unusual — " +
      "most families scale depth with parameter count — and it means the 8B has the " +
      "same chain-of-thought reasoning depth as the 4B but with richer per-layer " +
      "representations. If you're picking between 4B and 8B for a thinking-mode " +
      "workload, the lift comes from representational capacity, not additional " +
      "reasoning steps.",
  },

  { __component: "deep.heading", level: "h2", text: "Attention: GQA 4:1 with QK-Norm", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-8B uses GQA 4:1 (32 Q / 8 KV), the same ratio as Llama 3.1 8B — which " +
      "makes 8B-to-8B comparisons clean. Where the models diverge is inside the " +
      "attention block: Qwen3 applies RMSNorm on Q and K (**QK-Norm**) before the dot " +
      "product, Llama 3.1 does not. On long-context retrieval benchmarks the Qwen team " +
      "reports this QK-Norm choice accounts for a measurable chunk of the family's " +
      "stability advantage in the second half of pretraining — see qwen3-32b for the " +
      "full pseudocode and the family-wide story.",
  },
  {
    __component: "deep.paragraph",
    body:
      "At bf16, the KV cache footprint is `2 × 8 × 128 × 2 × 36 ≈ 144 KiB/token`. At " +
      "full 128K context that is **≈ 18 GiB of KV cache** — more than twice the " +
      "weight footprint and the dominant memory cost for long-context serving. In " +
      "practice, deploying Qwen3-8B at full context means either accepting the 42+ " +
      "GiB total memory budget (needs an A100 40G + offload, or a single H100) or " +
      "quantizing the KV cache.",
  },

  { __component: "deep.heading", level: "h2", text: "Thinking-Mode at 8B", anchor: "thinking" },
  {
    __component: "deep.paragraph",
    body:
      "8B is where the Qwen3 thinking-mode switch starts looking close to frontier " +
      "performance on reasoning benchmarks. The Qwen3 tech report (Table 5) reports " +
      "Qwen3-8B with thinking mode matching or exceeding Qwen2.5-14B on AIME 2024 and " +
      "MATH, while in direct-answer mode it holds parity with Llama 3.1 8B on general " +
      "QA. This is the core product argument for the thinking-mode recipe: **one " +
      "checkpoint, two behaviors**, picked at prompt time based on whether the user " +
      "needs latency or reasoning depth.",
  },

  { __component: "deep.heading", level: "h2", text: "Deployment", anchor: "deployment" },
  {
    __component: "deep.paragraph",
    body:
      "At bf16 the full checkpoint is ≈ 16 GB, which fits inside a 24 GB consumer GPU " +
      "with room for an 8K–16K KV cache. For full 128K serving, plan on an A100 40G, " +
      "or quantize to q4 (≈ 5 GB weights + smaller KV) and stay on consumer hardware. " +
      "The Qwen team publishes official GPTQ and AWQ 4-bit builds alongside the bf16 " +
      "release, with the usual mild quality regression at 4-bit on reasoning tasks " +
      "(thinking mode is slightly more sensitive to quantization than direct mode).",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The Thinking 8B", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "If you are deploying an 8B-class dense decoder today and your workload " +
      "benefits from *any* chain-of-thought reasoning, Qwen3-8B is the default pick " +
      "over Llama 3.1 8B. The only reasons to prefer Llama 3.1 are (a) the Llama " +
      "licensing and ecosystem are better established, or (b) your downstream " +
      "tooling depends on a specific Llama tokenizer. For greenfield reasoning " +
      "workloads at this scale, the Qwen3 thinking-mode switch is the differentiator.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Qwen3-8B — HuggingFace config.json",
        url: "https://huggingface.co/Qwen/Qwen3-8B/blob/main/config.json",
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
