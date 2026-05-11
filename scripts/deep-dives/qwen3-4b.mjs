/**
 * Deep-dive content for `qwen3-4b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave A).
 *
 * Primary sources:
 *   - HuggingFace `Qwen/Qwen3-4B/config.json`
 *   - arXiv 2505.09388 ("Qwen3 Technical Report", Alibaba, 2025)
 *
 * Qwen3-4B is the "small dense" tier of the Qwen3 family. Read the qwen3-32b
 * deep dive for shared architecture (QK-Norm, thinking-mode switch, YaRN).
 */

export const slug = "qwen3-4b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-4B sits in the 'small dense workhorse' slot of the Qwen3 family, released by " +
      "Alibaba on 29 April 2025. It is the smallest Qwen3 that comfortably handles " +
      "production tool-use workloads and the point in the family where thinking-mode " +
      "starts delivering its full benefit. At 4B parameters it is directly comparable to " +
      "Llama 3.2 3B in footprint — but carries the Qwen3 thinking-mode switch and the " +
      "family's QK-Norm attention stabilization.",
  },
  {
    __component: "deep.paragraph",
    body:
      "This page focuses on the 4B-specific numbers. For the family-wide architecture " +
      "story — QK-Norm, the thinking-mode tokenizer switch, the four-stage post-training " +
      "recipe — read the **Qwen3-32B deep dive**, which is the dense reference for the " +
      "whole herd.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Qwen3-4B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 4.0 B", "dense"],
      ["Hidden size (`d_model`)", "2560", "`hidden_size`"],
      ["Layers", "36", "`num_hidden_layers`"],
      ["Query heads", "32", "`num_attention_heads`"],
      ["KV heads", "8", "`num_key_value_heads` (GQA 4:1)"],
      ["Head dimension", "128", "`head_dim`"],
      ["FFN intermediate", "9,728", "`intermediate_size` (≈ 3.8× hidden)"],
      ["Vocabulary", "151,936", "Qwen tiktoken"],
      ["Max position (native)", "32,768", "`max_position_embeddings`"],
      ["Max position (YaRN)", "131,072", "via `rope_scaling`"],
      ["RoPE base θ", "1,000,000", "`rope_theta`"],
      ["Normalization", "RMSNorm + QK-Norm", "pre-norm + Q/K norm"],
      ["Activation", "SiLU (SwiGLU)", "`hidden_act = silu`"],
      ["Embedding tying", "Yes", "`tie_word_embeddings = true`"],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "36 Layers: Deeper Than Llama 3.2 3B", anchor: "topology" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-4B is **36 layers deep** — noticeably deeper than Llama 3.2 3B's 28 layers " +
      "at a comparable parameter count. This is consistent with the Qwen3 family's " +
      "depth-first preference: given a parameter budget, Qwen3 spends it on more " +
      "transformer blocks rather than wider hidden dimensions. The motivation per §3 of " +
      "the tech report is that **depth is what amortizes chain-of-thought cost** — each " +
      "additional layer gives the model another opportunity to refine an in-progress " +
      "reasoning step during a `<think>…</think>` pass.",
  },
  {
    __component: "deep.callout",
    variant: "note",
    title: "Depth vs width at 4B",
    body:
      "Qwen3-4B: 36 layers × 2560 hidden. Llama 3.2 3B: 28 × 3072. Roughly the same " +
      "parameter count, but Qwen3 pays for 8 extra layers by narrowing the residual " +
      "stream by 512 dimensions. Which is 'better' depends on your workload — wider " +
      "hidden states are faster on GPUs that are matmul-bound, deeper stacks are better " +
      "for reasoning depth.",
  },

  { __component: "deep.heading", level: "h2", text: "GQA 4:1 with QK-Norm", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "Attention is **GQA 4:1** — 32 Q heads, 8 KV heads, 128-dim per head. The " +
      "KV cache footprint at bf16 is `2 × 8 × 128 × 2 × 36 ≈ 144 KiB/token`, putting the " +
      "full 131,072-token context at **≈ 18 GiB** — larger than the bf16 weight " +
      "footprint. QK-Norm is applied before the dot product exactly as in qwen3-32b " +
      "(RMSNorm on Q and K, ε = 1e-6). See the qwen3-32b dive for the pseudocode — the " +
      "4B uses the same attention kernel, just with smaller widths.",
  },

  { __component: "deep.heading", level: "h2", text: "Thinking-Mode at 4B: The Sweet Spot", anchor: "thinking" },
  {
    __component: "deep.paragraph",
    body:
      "4B is the first Qwen3 size at which the thinking-mode / direct-answer gap on hard " +
      "reasoning benchmarks becomes a *product-relevant* delta rather than a benchmark " +
      "curiosity. On AIME 2024 the Qwen3 tech report reports ≈ 17 points of thinking-" +
      "mode lift at 4B, compared to ≈ 8 points at 0.6B. The mechanism is the same — the " +
      "same checkpoint is jointly SFT'd on both reasoning and direct-answer data, and the " +
      "chat template injects either `<think>` or a direct-answer opening — but at 4B the " +
      "model has enough capacity to actually converge on the reasoning chains it starts.",
  },

  { __component: "deep.heading", level: "h2", text: "Deployment", anchor: "deployment" },
  {
    __component: "deep.paragraph",
    body:
      "At bf16 the full checkpoint is ≈ 8 GB. At q4_K_M it drops to ≈ 2.4 GB — small " +
      "enough for a 24 GB consumer GPU to serve at full 131K context. Typical " +
      "throughput on a single RTX 4090 is in the 25–35 tok/s range for single-stream " +
      "decoding at 8K context, 12–18 tok/s at 32K, dropping further as the KV cache " +
      "fills. Thinking-mode roughly triples per-query compute because the model emits " +
      "substantially more tokens before the final answer.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The 4B To Beat", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-4B is the small-dense model to beat in 2025 for reasoning-flavored " +
      "workloads. It is measurably stronger than Llama 3.2 3B on math and code " +
      "benchmarks (Qwen3 tech report Table 5), holds parity on multilingual tasks, and " +
      "brings the thinking-mode switch that Llama 3.2 simply does not have. The only " +
      "time you would not pick it over Llama 3.2 3B is if the extra 1B parameters of " +
      "memory footprint breaks your deployment budget.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Qwen3-4B — HuggingFace config.json",
        url: "https://huggingface.co/Qwen/Qwen3-4B/blob/main/config.json",
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
