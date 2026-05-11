/**
 * Deep-dive content for `llama-3-2-1b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave A).
 *
 * Primary sources:
 *   - HuggingFace `meta-llama/Llama-3.2-1B/config.json`
 *   - Meta blog: "Llama 3.2: Revolutionizing edge AI..." (2024-09-25)
 *   - arXiv 2407.21783 ("The Llama 3 Herd of Models", Meta, 2024)
 *
 * Llama 3.2 1B is the smallest member of the 3.2 herd — a pruned + distilled
 * descendant of Llama 3.1 8B, targeting on-device deployment. Pair this dive
 * with the 3.2 3B flagship deep dive: both are born from the same pruning +
 * knowledge-distillation pipeline, they only differ in the amount of pruning.
 */

export const slug = "llama-3-2-1b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Llama 3.2 1B is Meta's smallest dense decoder in the 3.2 herd, released on 25 " +
      "September 2024 under the Llama 3.2 Community License. It is positioned as the " +
      "**on-device / edge** tier of the family — the model you run on a phone, a laptop " +
      "CPU, or a browser WASM backend. At bf16 the full checkpoint is ≈ 2.5 GB; at q4_K_M " +
      "it drops to ≈ 770 MB, which fits inside a mobile app bundle.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The 1B and the 3B are **twin sisters, not cousins**: per §2 of the Llama 3.2 " +
      "release notes, both were produced from the same Llama 3.1 8B base using a " +
      "two-stage recipe of structured pruning (SparseGPT-style) + knowledge distillation " +
      "from Llama 3.1 70B. The only difference between 1B and 3B is how aggressively the " +
      "pruning was applied. If you have read the 3.2 3B deep dive, everything you know " +
      "about the pruning+distillation recipe applies here — only the depth, hidden size, " +
      "and FFN width change.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.paragraph",
    body:
      "Every number below is read from the public HuggingFace `config.json` for " +
      "`meta-llama/Llama-3.2-1B`. The configuration is a scaled-down mirror of the 3.2 3B.",
  },
  {
    __component: "deep.table",
    caption: "Llama 3.2 1B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 1.24 B", "dense"],
      ["Hidden size (`d_model`)", "2048", "`hidden_size`"],
      ["Layers", "16", "`num_hidden_layers` — half of the 3B's 28"],
      ["Query heads", "32", "`num_attention_heads`"],
      ["KV heads", "8", "`num_key_value_heads` (GQA 4:1)"],
      ["Head dimension", "64", "derived: 2048 / 32"],
      ["FFN intermediate", "8,192", "`intermediate_size` (4× hidden)"],
      ["Vocabulary", "128,256", "`vocab_size` (same tiktoken as Llama 3)"],
      ["Max position", "131,072", "`max_position_embeddings`"],
      ["RoPE base θ", "500,000", "`rope_theta` (Llama 3 scaling)"],
      ["Normalization", "RMSNorm", "ε = 1e-5, pre-norm"],
      ["Activation", "SiLU (SwiGLU)", "`hidden_act = silu`"],
      ["Embedding tying", "Yes", "`tie_word_embeddings = true` — saves 260 MB at 1B scale"],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },
  {
    __component: "deep.callout",
    variant: "note",
    title: "Why tied embeddings here and not in 3B?",
    body:
      "At 1B the embedding matrix is `128,256 × 2,048 × 2 bytes ≈ 526 MB` — roughly 20% " +
      "of the model. Tying input and output embeddings halves that to ≈ 263 MB, which is " +
      "a meaningful on-device win. At the 3B scale the same matrix is a smaller fraction " +
      "of the total parameter budget, so Meta leaves them untied to preserve output-head " +
      "capacity. This is the single biggest structural difference between the 1B and 3B " +
      "siblings.",
  },

  { __component: "deep.heading", level: "h2", text: "GQA 4:1 + 16 Layers", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "Attention is **GQA 4:1** — 32 query heads share 8 KV heads — the same ratio the 3B " +
      "uses, and the same ratio Llama 3 8B uses. This is the single most consistent " +
      "architectural choice in the Llama herd: every model from 1B to 70B uses 4:1 GQA. " +
      "The KV cache footprint at bf16 is `2 × 8 × 64 × 2 × 16 = 32,768 bytes/token ≈ 32 " +
      "KiB/token`. At the full 131,072-token context that is **≈ 4.1 GiB of KV cache** — " +
      "2× the weight size. The cache dominates memory for any long-context workload.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The layer count is where 1B diverges most sharply from its siblings: **16 layers** " +
      "versus the 3B's 28 and the 8B's 32. Pruning depth is the cheapest way to shrink a " +
      "distilled model — it gives a linear reduction in both parameter count and KV cache " +
      "per token with minimal impact on benchmark numbers on short-context tasks. The " +
      "tradeoff the Meta team documents in the release notes is that 1B's reasoning ceiling " +
      "is noticeably lower than 3B's on multi-step chain-of-thought, because depth is " +
      "what buys you iterative refinement.",
  },

  { __component: "deep.heading", level: "h2", text: "Block Structure", anchor: "block" },
  {
    __component: "deep.code-block",
    language: "python",
    caption: "Llama 3.2 1B block — identical topology to 3B, only widths differ",
    code:
      "def llama_3_2_1b_block(x, kv_cache, rope_cos, rope_sin):\n" +
      "    # x shape: [batch, seq, 2048]\n" +
      "    h = rms_norm(x, eps=1e-5)\n" +
      "    h = grouped_query_attn(\n" +
      "        h,\n" +
      "        n_q_heads=32, n_kv_heads=8,   # 4:1 GQA\n" +
      "        head_dim=64,                   # smaller head dim than 3B's 128\n" +
      "        rope_cos=rope_cos, rope_sin=rope_sin,\n" +
      "        kv_cache=kv_cache,\n" +
      "    )\n" +
      "    x = x + h\n" +
      "\n" +
      "    h = rms_norm(x, eps=1e-5)\n" +
      "    h = swiglu_ffn(h, d_ff=8192)       # 4x hidden\n" +
      "    x = x + h\n" +
      "    return x",
  },
  {
    __component: "deep.paragraph",
    body:
      "Note the **head dimension is 64**, not the 128 used by every larger Llama. This " +
      "falls out of the hidden-size/head-count ratio: `2,048 / 32 = 64`. A smaller head " +
      "dim lowers the cost of each attention softmax and marginally speeds up inference on " +
      "accelerators where the per-head matmul is register-pressure bound — another small " +
      "on-device optimization.",
  },

  { __component: "deep.heading", level: "h2", text: "FFN: 4× Instead of 3.5×", anchor: "ffn" },
  {
    __component: "deep.paragraph",
    body:
      "The FFN intermediate width is **8,192 = 4.0 × 2,048**, a slightly higher expansion " +
      "ratio than the 3.5× used by Llama 3 8B. When you prune aggressively (1B from 8B), " +
      "you lose layers and attention heads faster than you lose FFN capacity, so " +
      "maintaining a wide FFN-to-hidden ratio is how you preserve representational " +
      "throughput under the remaining depth. Across all 16 layers, the FFN alone holds " +
      "`3 × 2,048 × 8,192 × 16 ≈ 805 M parameters — about 65% of the 1.24 B total`. The " +
      "FFN is even more dominant here than in larger Llamas.",
  },

  { __component: "deep.heading", level: "h2", text: "Context & RoPE", anchor: "context" },
  {
    __component: "deep.paragraph",
    body:
      "Llama 3.2 1B inherits the **131,072-token context** and `rope_theta = 500,000` " +
      "from the Llama 3.1 base it was distilled from. The Llama 3 RoPE scaling scheme is " +
      "applied unchanged. Whether 1B can usefully *use* 128K context is a different " +
      "question — the tech report's needle-in-haystack plots show meaningful recall " +
      "degradation beyond ≈ 32K tokens at this model size, because the smaller residual " +
      "stream has less capacity to maintain long-range associative memory. For on-device " +
      "use cases the practical window is more like 16K–32K.",
  },

  { __component: "deep.heading", level: "h2", text: "Training: Distilled, Not Pretrained From Scratch", anchor: "training" },
  {
    __component: "deep.paragraph",
    body:
      "Per §2 of the Llama 3.2 release notes, 1B was **not pretrained from scratch**. It " +
      "was produced by structured pruning of Llama 3.1 8B followed by logit-level " +
      "knowledge distillation from Llama 3.1 70B. The pruning stage removes layers, " +
      "attention heads, and FFN columns in a dependency-aware way; the distillation stage " +
      "trains the pruned student on ≈ 9T tokens with a KL-divergence loss against the 70B " +
      "teacher's next-token distribution. This is the same pipeline used for the 3.2 3B — " +
      "only the target size differs.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Post-training follows the Llama 3 family recipe: SFT on curated instructions, " +
      "rejection sampling against the SFT checkpoint, and DPO with Llama 3-generated " +
      "preference pairs. There is no RLHF with PPO in the 3.2 herd — Meta moved to " +
      "pure DPO for the smaller 3.2 models. The Instruct variant that ships on " +
      "HuggingFace is the post-DPO checkpoint.",
  },

  { __component: "deep.heading", level: "h2", text: "Deployment: On-Device First", anchor: "deployment" },
  {
    __component: "deep.paragraph",
    body:
      "Llama 3.2 1B is the first Llama model Meta positions unambiguously for **on-device " +
      "inference**. At bf16 the checkpoint is ≈ 2.5 GB; at q4_0 it drops to ≈ 770 MB; at " +
      "q3_K_S it fits under 500 MB. Meta provides official MLC-LLM, ExecuTorch, and MLX " +
      "builds, and Apple's Core ML team published a reference deployment for A17 Pro / M-" +
      "series at Llama 3.2 launch. The intended use cases are summarization, rewriting, " +
      "lightweight RAG, and structured output extraction — not open-ended reasoning.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The Pocket Llama", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Llama 3.2 1B is the smallest truly useful member of the Llama herd — small enough " +
      "to deploy inside a mobile app, capable enough to handle the rewriting + " +
      "summarization + RAG-assistant workloads that dominate on-device LLM product " +
      "surface area today. If you need genuine chain-of-thought reasoning, step up to " +
      "the 3B; if you need tool-use and agentic flows, step up to the 8B. But for a " +
      "'text-button' product feature that has to run offline, this is the right " +
      "checkpoint.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Llama 3.2 1B — HuggingFace config.json",
        url: "https://huggingface.co/meta-llama/Llama-3.2-1B/blob/main/config.json",
      },
      {
        label: "Llama 3.2: Revolutionizing edge AI and vision — Meta blog (2024-09-25)",
        url: "https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/",
      },
      {
        label: "The Llama 3 Herd of Models (Meta, 2024) — arXiv:2407.21783",
        url: "https://arxiv.org/abs/2407.21783",
      },
      {
        label: "GQA: Training Generalized Multi-Query Transformer Models (Ainslie et al., 2023) — arXiv:2305.13245",
        url: "https://arxiv.org/abs/2305.13245",
      },
      {
        label: "SparseGPT: Massive Language Models Can Be Accurately Pruned in One-Shot — arXiv:2301.00774",
        url: "https://arxiv.org/abs/2301.00774",
      },
    ],
  },
];
