/**
 * Deep-dive content for `gpt-oss-20b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave A).
 *
 * Primary sources:
 *   - HuggingFace `openai/gpt-oss-20b/config.json`
 *   - OpenAI announcement: "GPT-OSS: Open-Source GPT Models" (2025-08)
 *
 * GPT-OSS 20B is OpenAI's first open-weights release since GPT-2 — a 20B
 * parameter dense decoder released under Apache 2.0 in August 2025.
 */

export const slug = "gpt-oss-20b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "GPT-OSS 20B is OpenAI's smaller open-weights release from August 2025, " +
      "shipped alongside the larger GPT-OSS 120B. It is historically significant as " +
      "OpenAI's **first open-weights release since GPT-2** in 2019 — a six-year gap " +
      "during which OpenAI shipped only proprietary GPT-3, GPT-4, and GPT-4o " +
      "checkpoints. The GPT-OSS pair is released under **Apache 2.0**, matching the " +
      "most permissive licensing in the open ecosystem alongside Mistral.",
  },
  {
    __component: "deep.paragraph",
    body:
      "At 21 B total parameters (≈ 3.6 B active per token), GPT-OSS 20B is an MoE " +
      "that slots into the 'permissive-license mid-tier' band alongside Mistral " +
      "Small 3.1 24B and Qwen3-30B-A3B. The architecture is a straightforward modern " +
      "decoder with one distinctive choice: it uses a **strict 1:1 alternation of " +
      "sliding-window and full-global attention layers**, a much heavier global " +
      "budget than Gemma 3's 5:1 local-to-global interleave.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "GPT-OSS 20B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 21 B", "MoE"],
      ["Active parameters", "≈ 3.6 B", "per token"],
      ["Hidden size (`d_model`)", "2880", "`hidden_size`"],
      ["Layers", "24", "12 sliding-window + 12 global (1:1 alternation)"],
      ["Query heads", "64", "`num_attention_heads`"],
      ["KV heads", "8", "`num_key_value_heads` (GQA 8:1)"],
      ["Head dimension", "64", "derived"],
      ["FFN intermediate", "2880", "`intermediate_size` (1× hidden)"],
      ["Routed experts", "32", "per MoE layer"],
      ["Top-k per token", "4", "denser routing than Llama 4's top-1"],
      ["Vocabulary", "200,019", "`vocab_size` (tiktoken o200k family)"],
      ["Sliding window", "4,096", "`sliding_window` — applied on half the layers"],
      ["Max position", "131,072", "`max_position_embeddings`"],
      ["Normalization", "RMSNorm", "pre-norm"],
      ["Activation", "SiLU (SwiGLU)", "`hidden_act = silu`"],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },
  {
    __component: "deep.callout",
    variant: "insight",
    title: "Wait — GPT-OSS 20B is an MoE?",
    body:
      "Yes. Despite the 'GPT-OSS 20B' name suggesting a dense 20B, the underlying " +
      "config is an MoE with 32 routed experts and roughly 3.6 B active parameters " +
      "per token. The '20B' in the name refers to *total* parameters, not active " +
      "parameters. This is the same naming convention OpenAI used for its " +
      "proprietary GPT-4 class MoEs — they count total params for the model name. " +
      "The surprise here is that OpenAI's smallest open release is already MoE, " +
      "whereas Mistral / Llama wait until much higher total-parameter budgets " +
      "before going sparse.",
  },

  { __component: "deep.heading", level: "h2", text: "1:1 Alternating Local-Global Attention", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "GPT-OSS 20B alternates **sliding-window** layers (4,096-token window) with " +
      "**full-context global** layers in a strict 1:1 pattern — 12 local layers and " +
      "12 global layers, interleaved. This is a very different sparsity choice from " +
      "Gemma 3's 5:1 local:global ratio: Gemma amortizes the global-attention cost " +
      "heavily by making only ~17% of layers global, whereas GPT-OSS pays full " +
      "global-attention cost on half of the layer budget.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The tradeoff is deliberate. A 1:1 split preserves strong long-range mixing at " +
      "every other layer, which matters for 128K-context reasoning tasks where a " +
      "single 'attention relay' (Gemma-style) can lose relevant tokens as they " +
      "shift out of the local window faster than they can propagate. OpenAI is " +
      "buying long-context quality at the cost of KV-cache footprint: the full KV " +
      "cache at 128K is not as cheap as on an all-local model, but it is still " +
      "smaller than a pure-global 24-layer decoder of the same width.",
  },

  { __component: "deep.heading", level: "h2", text: "MoE Routing: Top-4 of 32", anchor: "moe" },
  {
    __component: "deep.paragraph",
    body:
      "Each token routes to **4 of 32 experts**, a denser routing regime than " +
      "Llama 4's top-1 but sparser than DeepSeek-V3 / Qwen3's top-8. With 32 " +
      "experts total per layer and top-4 selection, the effective expert capacity " +
      "at any given token is ≈ 12.5% of the full expert pool. The per-expert FFN " +
      "intermediate width is only 2880 (exactly 1× hidden) — much smaller than " +
      "the 3.5×–5× seen in dense FFNs — because MoE spreads capacity across " +
      "experts rather than concentrating it in each.",
  },

  { __component: "deep.heading", level: "h2", text: "Deployment: Apache 2.0 MoE", anchor: "deployment" },
  {
    __component: "deep.paragraph",
    body:
      "At bf16 the full 20 B weight set is ≈ 40 GB — fits on a single A100 40G or " +
      "H100 80G. Active-parameter compute is ≈ 3.6 B per token, so per-token " +
      "throughput is closer to a 4B dense model than a 20B dense. GPT-OSS 20B is " +
      "the first **Apache 2.0 MoE** in this gallery — neither Mixtral, Qwen3-30B-" +
      "A3B, nor Llama 4 Maverick ship under pure Apache 2.0 — which makes it " +
      "attractive for closed-source commercial products that need MoE serving " +
      "economics without the Llama Community License restrictions.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: OpenAI Rejoins the Open Ecosystem", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "GPT-OSS 20B's historical significance outweighs its benchmark numbers. " +
      "Benchmark-for-benchmark it is competitive but not dominant — Qwen3-30B-A3B " +
      "is stronger on reasoning, Mistral Small 3.1 is stronger on general dense " +
      "tasks. But as OpenAI's first open-weights checkpoint in six years, under a " +
      "genuinely permissive license, with a genuinely novel architectural " +
      "combination (all-local attention + top-4 of 32 MoE), it is a model you " +
      "should understand for reasons beyond pure deployment utility.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "GPT-OSS 20B — HuggingFace config.json",
        url: "https://huggingface.co/openai/gpt-oss-20b/blob/main/config.json",
      },
      {
        label: "GPT-OSS: Open-Source GPT Models — OpenAI announcement (2025-08)",
        url: "https://openai.com/index/introducing-gpt-oss/",
      },
    ],
  },
];
