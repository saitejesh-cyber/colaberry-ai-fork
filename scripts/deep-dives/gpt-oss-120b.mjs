/**
 * Deep-dive content for `gpt-oss-120b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave A).
 *
 * Primary sources:
 *   - HuggingFace `openai/gpt-oss-120b/config.json`
 *   - OpenAI model card PDF (2025-08)
 *   - OpenAI announcement: "GPT-OSS: Open-Source GPT Models" (2025-08)
 *
 * GPT-OSS 120B is the larger of OpenAI's two open-weights MoE releases
 * from August 2025 — 117 B total parameters, 5.1 B active per token,
 * Apache 2.0. Same architecture family as GPT-OSS 20B but scaled up.
 */

export const slug = "gpt-oss-120b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "GPT-OSS 120B is the larger of OpenAI's two open-weights releases from August " +
      "2025, sibling to GPT-OSS 20B. At **117 B total parameters with 5.1 B active " +
      "per token**, it is OpenAI's first open-weights frontier-class MoE and the " +
      "flagship of the 'GPT-OSS' line. Like its smaller sibling, it ships under " +
      "**Apache 2.0** — the most permissive license available for a model at this " +
      "scale in the open ecosystem.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The architecture is a straightforward scale-up of GPT-OSS 20B: same design " +
      "family (MoE with alternating sliding-window and global attention, GQA 8:1, " +
      "tiktoken o200k vocabulary), just with more layers, more experts, and a " +
      "larger routed expert pool. Reading the GPT-OSS 20B deep dive first is the " +
      "fastest way to understand this one.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "GPT-OSS 120B configuration (source: HuggingFace config.json + OpenAI model card)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 117 B", "MoE"],
      ["Active parameters", "≈ 5.1 B", "per token"],
      ["Hidden size (`d_model`)", "2880", "`hidden_size` — same as GPT-OSS 20B"],
      ["Layers", "36", "18 sliding-window + 18 global (1:1 alternation)"],
      ["Query heads", "64", "`num_attention_heads`"],
      ["KV heads", "8", "`num_key_value_heads` (GQA 8:1)"],
      ["Head dimension", "64", "derived"],
      ["Routed experts", "128", "per MoE layer — 4× GPT-OSS 20B's 32"],
      ["Top-k per token", "4", "same routing regime as GPT-OSS 20B"],
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
    title: "Where did the extra parameters go?",
    body:
      "GPT-OSS 120B keeps the same hidden size (2880) as GPT-OSS 20B and adds only " +
      "12 more layers (36 vs 24), yet has ≈ 5.6× the total parameters. Almost all " +
      "of that scaling goes into the **expert pool**: 128 routed experts per layer " +
      "instead of 32. The active compute per token rises only modestly (3.6 B → " +
      "5.1 B) because top-k is still 4 and each individual expert FFN stays small. " +
      "This is a textbook 'scale by adding experts, not by widening active compute' " +
      "MoE playbook.",
  },

  { __component: "deep.heading", level: "h2", text: "Alternating Local-Global Attention", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "Like GPT-OSS 20B, GPT-OSS 120B alternates sliding-window attention (4,096-" +
      "token local window) with full-context global attention in a **1:1 pattern** " +
      "— 18 local layers, 18 global layers, interleaved. This is a much heavier " +
      "global-attention budget than Gemma 3's 5:1 local:global split. OpenAI is " +
      "explicitly buying long-context quality at the cost of KV cache size, trusting " +
      "the MoE to keep active FLOPs manageable even though half the layers pay full " +
      "quadratic attention cost.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The KV-cache footprint (per the OpenAI model card) is **≈ 72 KiB per token** " +
      "— very close to GPT-OSS 20B's 48 KiB/token, scaled by the ratio of total " +
      "layers (36 / 24). At the full 128 K context this is ≈ 9 GiB of KV cache, " +
      "which is an order of magnitude smaller than a comparable dense 117 B model " +
      "would need.",
  },

  { __component: "deep.heading", level: "h2", text: "MoE: Top-4 of 128", anchor: "moe" },
  {
    __component: "deep.paragraph",
    body:
      "Each token routes to **4 of 128 experts** (≈ 3.1% of the expert pool), a " +
      "sparser ratio than GPT-OSS 20B's 4-of-32 (12.5%). This is the same 'many " +
      "narrow experts, tight top-k' pattern DeepSeek-V3 and Qwen3-235B-A22B use at " +
      "similar scale. The expert FFNs stay small (same 2880 intermediate width as " +
      "GPT-OSS 20B), so the gain from scaling total parameters comes entirely from " +
      "specialization — more experts mean more disjoint skill-chunks the router " +
      "can assemble on demand.",
  },

  { __component: "deep.heading", level: "h2", text: "Deployment", anchor: "deployment" },
  {
    __component: "deep.paragraph",
    body:
      "At bf16 the full 117 B weight set is ≈ 234 GB — requires multi-GPU serving " +
      "(3× H100 80G, 8× A100 40G, or similar). Active compute per token at ≈ 5 B " +
      "puts per-token throughput in the same ballpark as a dense 5-6 B model, so " +
      "despite the large total footprint, single-token decode latency is fast. The " +
      "combination of Apache 2.0 licensing + MoE serving economics + frontier-class " +
      "quality makes GPT-OSS 120B the most commercially attractive open-weight MoE " +
      "in this size class — neither DeepSeek-V3 nor Llama 4 Maverick ship under a " +
      "license this permissive.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: OpenAI's Frontier Open Weights", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "GPT-OSS 120B is the most strategically significant open-weights release of " +
      "2025 — it is the first time OpenAI has published frontier-class weights " +
      "under a commercially permissive license since the original GPT-2 in 2019. " +
      "Benchmark-for-benchmark it is competitive with DeepSeek-V3 and Qwen3-235B-" +
      "A22B on standard reasoning and coding tasks, without clearly dominating " +
      "either. The differentiators are the **license** (Apache 2.0 vs Llama " +
      "Community / Qwen Research / DeepSeek research) and the **architectural " +
      "simplicity** (no MLA, no complex expert affinity routing — just GQA + " +
      "alternating SWA + top-4 MoE).",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "GPT-OSS 120B — HuggingFace config.json",
        url: "https://huggingface.co/openai/gpt-oss-120b/blob/main/config.json",
      },
      {
        label: "GPT-OSS Model Card — OpenAI PDF (2025-08)",
        url: "https://cdn.openai.com/pdf/419b6906-9da6-406c-a19d-1bb078ac7637/oai_gpt-oss_model_card.pdf",
      },
      {
        label: "Introducing GPT-OSS — OpenAI announcement",
        url: "https://openai.com/index/introducing-gpt-oss/",
      },
    ],
  },
];
