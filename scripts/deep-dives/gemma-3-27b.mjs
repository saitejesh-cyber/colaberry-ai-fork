/**
 * Deep-dive content for `gemma-3-27b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave A).
 *
 * Primary sources:
 *   - HuggingFace `google/gemma-3-27b-it/config.json`
 *   - Google blog: "Introducing Gemma 3" (2025-03-12)
 *   - arXiv 2503.19786 ("Gemma 3 Technical Report", Google, 2025)
 */

export const slug = "gemma-3-27b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Gemma 3 27B is the largest member of Google's Gemma 3 family, released on 12 " +
      "March 2025. The Gemma line is Google's open-weight counterpart to Gemini — " +
      "architecturally distinct from Llama/Qwen/Mistral in two important ways: **local-" +
      "global attention interleaving** (5 local layers for every 1 global layer) and " +
      "**logit soft-capping** on attention logits and output logits to keep training " +
      "stable in the deep stack. It also ships with a 128K context window natively, " +
      "without requiring post-hoc RoPE scaling.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Gemma 3 is also the first fully multimodal member of the Gemma line — it ingests " +
      "images via a SigLIP-based vision encoder bolted on to the decoder — but this " +
      "deep dive focuses on the language modeling architecture. The vision branch is " +
      "out of scope for the LLM gallery.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Gemma 3 27B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 27 B", "dense"],
      ["Hidden size (`d_model`)", "5376", "`hidden_size`"],
      ["Layers", "62", "`num_hidden_layers`"],
      ["Query heads", "32", "`num_attention_heads`"],
      ["KV heads", "16", "`num_key_value_heads` (GQA 2:1)"],
      ["Head dimension", "128", "`head_dim`"],
      ["FFN intermediate", "21,504", "`intermediate_size` (4× hidden)"],
      ["Vocabulary", "262,144", "`vocab_size` — largest in the gallery"],
      ["Max position", "131,072", "`max_position_embeddings` — native 128K"],
      ["RoPE base θ (local)", "10,000", "for local-attention layers"],
      ["RoPE base θ (global)", "1,000,000", "for global-attention layers"],
      ["Normalization", "RMSNorm", "pre-norm + post-norm (double normalization)"],
      ["Activation", "GeGLU (GELU)", "`hidden_act = gelu_pytorch_tanh`"],
      ["Attention soft-cap", "50.0", "tanh soft-cap on pre-softmax logits"],
      ["Output soft-cap", "30.0", "tanh soft-cap on vocab logits"],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },
  {
    __component: "deep.callout",
    variant: "insight",
    title: "Gemma doesn't look like Llama",
    body:
      "Where Llama 3 uses SwiGLU + pre-norm + single-precision RoPE + no logit caps, " +
      "Gemma 3 uses GeGLU + double normalization (pre- AND post-) + two separate RoPE " +
      "frequencies for local and global layers + hard soft-caps on attention and output " +
      "logits. Almost every primitive is a deliberate divergence from the Meta family. " +
      "These choices are documented in §3 of the Gemma 3 tech report as stability " +
      "remedies for training very long-context models at 27B scale.",
  },

  { __component: "deep.heading", level: "h2", text: "Local-Global Attention Interleaving", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "The most distinctive Gemma 3 choice is **local-global attention interleaving**: " +
      "5 out of every 6 transformer layers use **sliding-window local attention** with " +
      "a 4,096-token window, and every 6th layer is a full-context **global attention**. " +
      "This is a 5:1 ratio — Gemma 2 used 1:1, Gemma 3 increased the sparsity. The " +
      "motivation is that full attention scales O(n²) in context length, and most of " +
      "the model's work at long context is local; only the global layers need to see " +
      "the full sequence.",
  },
  {
    __component: "deep.paragraph",
    body:
      "At 128K context, the compute savings are massive: instead of 62 full-attention " +
      "layers, you get ~10 full-attention layers and ~52 local-attention layers, each " +
      "of which only attends within a 4K window. The KV cache behavior is also " +
      "different — local layers cache only their 4K window, global layers cache the " +
      "full sequence — which complicates serving infrastructure but dramatically " +
      "reduces total KV memory at long context.",
  },

  { __component: "deep.heading", level: "h2", text: "Dual RoPE Frequencies", anchor: "rope" },
  {
    __component: "deep.paragraph",
    body:
      "Because local layers only need to encode positions within a 4K window, they use " +
      "a conservative `rope_theta = 10,000` — the original Llama 1 frequency. Global " +
      "layers, which need to encode up to 128K token positions, use `rope_theta = " +
      "1,000,000` like Llama 3. This is the first dense model in the gallery to use " +
      "two different RoPE frequencies in the same stack, and it is a consequence of " +
      "the local-global split: there's no single frequency that's optimal for both.",
  },

  { __component: "deep.heading", level: "h2", text: "Logit Soft-Capping", anchor: "softcap" },
  {
    __component: "deep.paragraph",
    body:
      "Gemma 3 applies a **tanh soft-cap** on both the attention logits (at 50.0) and " +
      "the final output logits (at 30.0): `logits ← cap * tanh(logits / cap)`. This " +
      "keeps attention and output distributions bounded during training, preventing " +
      "the softmax saturation failure mode that would otherwise appear in deep " +
      "transformer stacks. It is Gemma's answer to the same problem that Qwen3 solves " +
      "with QK-Norm and OLMo 2 solves with reordered RMSNorm + z-loss — three " +
      "different tools for the same underlying issue.",
  },

  { __component: "deep.heading", level: "h2", text: "FFN: GeGLU, Not SwiGLU", anchor: "ffn" },
  {
    __component: "deep.paragraph",
    body:
      "Gemma uses **GeGLU** (GELU-gated linear unit) where Llama/Qwen/Mistral use " +
      "SwiGLU. The difference is the gate activation — GELU vs SiLU — which delivers " +
      "nearly identical training loss in published ablations. Google's preference is " +
      "historical: Gemma inherits it from the pre-LLM T5 family. FFN intermediate " +
      "width is 21,504 = 4.0 × 5,376, a standard 4× expansion.",
  },

  { __component: "deep.heading", level: "h2", text: "262K Vocabulary", anchor: "vocab" },
  {
    __component: "deep.paragraph",
    body:
      "Gemma 3 uses a **262,144-token vocabulary** — the largest in this gallery, and " +
      "more than double Llama 3's 128K. The rationale per §2.2 of the tech report is " +
      "multilingual coverage: Gemma 3 supports 140+ languages out of the box, and a " +
      "larger vocabulary reduces the byte-per-token cost for non-Latin scripts like " +
      "Chinese, Arabic, and Hindi. The tradeoff is that the embedding matrix is " +
      "`262,144 × 5,376 × 2 = 2.7 GB` — about 10% of the 27B model's total footprint.",
  },

  { __component: "deep.heading", level: "h2", text: "Training & Deployment", anchor: "training" },
  {
    __component: "deep.paragraph",
    body:
      "Pretraining ran on ≈ 14T tokens (similar budget to Llama 3) with an explicit " +
      "multilingual focus. Post-training is the standard Google recipe: SFT → DPO → " +
      "RLHF with a reward model. At bf16 the full 27B is ≈ 54 GB, comfortably fitting " +
      "on a single H100 80G. Quantized q4 builds run on a 24 GB consumer GPU. The " +
      "model ships under the Gemma license — permissive for research and commercial " +
      "use with a Google-specified use policy.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: Google's Different-Shaped Answer", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Gemma 3 27B is the most architecturally distinctive dense open-weight model in " +
      "this gallery. Where Llama/Qwen/Mistral converge on a standard pre-norm SwiGLU " +
      "RoPE decoder, Gemma goes its own way on almost every primitive — local-global " +
      "attention, dual RoPE, GeGLU, logit soft-caps, 262K vocab. It is the right " +
      "choice when you need the 128K context natively (no YaRN scaling), or when " +
      "multilingual performance is a hard requirement, or when you want to study " +
      "what a non-Llama design space looks like at frontier quality.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Gemma 3 27B IT — HuggingFace config.json",
        url: "https://huggingface.co/google/gemma-3-27b-it/blob/main/config.json",
      },
      {
        label: "Introducing Gemma 3 — Google blog (2025-03-12)",
        url: "https://blog.google/technology/developers/gemma-3/",
      },
      {
        label: "Gemma 3 Technical Report (Google, 2025) — arXiv:2503.19786",
        url: "https://arxiv.org/abs/2503.19786",
      },
      {
        label: "Gemma 2: Improving Open Language Models at a Practical Size (2024) — arXiv:2408.00118 (local-global lineage)",
        url: "https://arxiv.org/abs/2408.00118",
      },
    ],
  },
];
