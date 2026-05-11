/**
 * Deep-dive content for `llama-3-8b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 1 — the "reference siblings"
 * that extend the 5 flagship deep dives with direct architectural comparisons).
 *
 * Primary sources — every numeric claim cites one of:
 *   - HuggingFace `meta-llama/Meta-Llama-3-8B/config.json`
 *   - arXiv 2407.21783 ("The Llama 3 Herd of Models")
 *   - Meta AI research blog (Llama 3 announcement, 2024-04-18)
 *
 * Cross-reference: this is the model that was *pretrained from scratch* on
 * 15T tokens and then *pruned + distilled* into the `llama-3-2-3b` flagship.
 * Read these two deep dives side-by-side to see the full picture of the
 * Llama 3 herd recipe.
 */

export const slug = "llama-3-8b";

export const blocks = [
  /* ── 1. Overview ─────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Llama 3 8B is the mid-tier entry in Meta's April 2024 Llama 3 release and, more " +
      "importantly, the **ancestor checkpoint** from which the Llama 3.2 1B and 3B edge " +
      "models are later distilled. Everything you read about the compact 3B in the " +
      "flagship deep dive traces back to this model: the tokenizer, the 15T-token " +
      "pretraining distribution, the SwiGLU + RMSNorm + RoPE primitive stack, and the " +
      "post-training recipe. Unlike the 3B, the 8B is **pretrained from scratch** — it " +
      "pays the full compute bill for the Llama 3 data mixture rather than inheriting it " +
      "via distillation. Reading this deep dive gives you the 'before' picture; the " +
      "Llama 3.2 3B dive gives you the 'after'.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The 8B was released on 18 April 2024 alongside the 70B, with both models sharing " +
      "the same architectural family and differing only in width and depth. A later point " +
      "release — Llama 3.1 8B, July 2024 — kept the 8B weights intact but **extended the " +
      "context window from 8,192 to 131,072 tokens** via the same `llama3` RoPE scaling " +
      "scheme later inherited by the 3.2 family. The architecture primitives did not " +
      "change between 3.0 and 3.1; only the scaling config did.",
  },

  /* ── 2. Architecture at a Glance ─────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.paragraph",
    body:
      "Every number in the table below is read directly from the public HuggingFace " +
      "`config.json` for `meta-llama/Meta-Llama-3-8B`. The 3.1 refresh keeps every " +
      "primitive identical and only changes the context-length config (call it out in the " +
      "notes column).",
  },
  {
    __component: "deep.table",
    caption: "Llama 3 8B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 8.03 B", "non-embedding ≈ 6.98 B (untied)"],
      ["Hidden size (`d_model`)", "4096", "`hidden_size`"],
      ["Layers", "32", "`num_hidden_layers`"],
      ["Query heads", "32", "`num_attention_heads`"],
      ["KV heads", "8", "`num_key_value_heads` (GQA 4:1)"],
      ["Head dimension", "128", "derived: 4096 / 32"],
      ["FFN intermediate", "14,336", "`intermediate_size` (≈ 3.5× hidden)"],
      ["Vocabulary", "128,256", "`vocab_size` (tiktoken-derived)"],
      ["Max position (3.0)", "8,192", "`max_position_embeddings`"],
      ["Max position (3.1)", "131,072", "same weights, `llama3` RoPE scaling"],
      ["RoPE base θ", "500,000", "`rope_theta` (unchanged across 3.0 → 3.1)"],
      ["Normalization", "RMSNorm", "ε = 1e-5, pre-norm"],
      ["Activation", "SiLU (SwiGLU)", "`hidden_act = silu`"],
      ["Embedding tying", "No", "`tie_word_embeddings = false`"],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },

  /* ── 3. Attention: GQA 4:1 ───────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Attention: GQA 4:1", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "The 8B uses **Grouped-Query Attention** in a 4:1 configuration: 32 query heads " +
      "share 8 KV heads, so every KV head is reused by exactly four query heads. This is " +
      "a tighter ratio than the 3:1 used in the 3B distilled model (24 Q / 8 KV), and it " +
      "is the ratio that the 3B *inherits* — the number of KV heads is preserved across " +
      "the prune-and-distill step, only the query heads are reduced.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The KV cache footprint at bf16 follows the same formula as the 3B: " +
      "`2 × num_kv_heads × head_dim × dtype_bytes × num_layers`. For Llama 3 8B that is " +
      "`2 × 8 × 128 × 2 × 32 = 131,072 bytes/token`, i.e. exactly **128 KiB per token** — " +
      "about 14% larger per token than the 3B, which is the linear cost of the extra four " +
      "layers. At the original 8K context the cache is ≈ 1.0 GiB; after the 3.1 scaling " +
      "pass to 128K, a single full-context request pulls ≈ 16 GiB of KV memory, which is " +
      "why 8B at 128K is a server-class workload rather than a phone-class one.",
  },
  {
    __component: "deep.table",
    caption: "KV cache footprint at bf16 (Llama 3 8B)",
    headers: ["Context length", "KV cache", "Notes"],
    rows: [
      ["8,192 tokens (3.0)", "≈ 1.0 GiB", "original release"],
      ["32,768 tokens (3.1)", "≈ 4.0 GiB", "via llama3 RoPE scaling"],
      ["131,072 tokens (3.1)", "≈ 16.0 GiB", "full 128K window"],
    ],
  },

  /* ── 4. Block Structure & Normalization ──────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Block Structure & Normalization", anchor: "block" },
  {
    __component: "deep.paragraph",
    body:
      "The 32 transformer blocks follow the now-standard **pre-norm** layout: RMSNorm is " +
      "applied before the attention sub-block, the residual stream carries the " +
      "unnormalized hidden state, and a second RMSNorm precedes the FFN sub-block. This " +
      "is the identical topology used in Llama 2, Mistral, Qwen, and every open decoder " +
      "released after 2023 — the Llama 3 paper does not claim any novelty here. What *is* " +
      "Llama-3-specific is the **training-stability** choice to keep RMSNorm (not " +
      "LayerNorm), and to keep θ=500,000 from the start of pretraining rather than " +
      "patching it in post-hoc.",
  },
  {
    __component: "deep.code-block",
    language: "python",
    caption: "Llama 3 8B block in pseudocode (identical topology to Llama 3.2 3B)",
    code:
      "def llama_block(x, kv_cache, rope_cos, rope_sin):\n" +
      "    # x shape: [batch, seq, 4096]\n" +
      "    h = rms_norm(x, eps=1e-5)\n" +
      "    h = grouped_query_attn(\n" +
      "        h,\n" +
      "        n_q_heads=32, n_kv_heads=8,  # 4:1 GQA\n" +
      "        head_dim=128,\n" +
      "        rope_cos=rope_cos, rope_sin=rope_sin,\n" +
      "        kv_cache=kv_cache,\n" +
      "    )\n" +
      "    x = x + h\n" +
      "\n" +
      "    h = rms_norm(x, eps=1e-5)\n" +
      "    h = swiglu_ffn(h, d_ff=14336)     # 3.5x hidden\n" +
      "    x = x + h\n" +
      "    return x",
  },

  /* ── 5. FFN: SwiGLU 3.5× ─────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Feed-Forward: SwiGLU with 3.5× Intermediate", anchor: "ffn" },
  {
    __component: "deep.paragraph",
    body:
      "The FFN uses the same **SwiGLU** three-projection pattern as every modern Llama " +
      "descendant. The notable number in the 8B config is the FFN intermediate width: " +
      "**14,336 = 3.5 × 4,096**. That is a deliberately non-integer ratio — the Llama 2 " +
      "7B used 11,008 ≈ 2.69× and the Llama 3.2 3B uses 8,192 ≈ 2.67×. The bump to 3.5× in " +
      "Llama 3 8B puts more parameter budget into the FFN relative to the attention stack, " +
      "which is consistent with the broader observation (Hoffmann et al., Chinchilla 2022) " +
      "that FFN width is the cheaper lever for adding capacity once you have fixed the " +
      "pretraining data budget.",
  },
  {
    __component: "deep.paragraph",
    body:
      "In absolute terms, the SwiGLU block in 8B holds `3 × 4,096 × 14,336 ≈ 176 M` " +
      "parameters per layer, and across 32 layers that is **≈ 5.63 B parameters — " +
      "roughly 70% of the entire model weight budget**. The attention projection stack " +
      "(Q, K, V, O) accounts for only ≈ 1.08 B parameters. If you want to understand " +
      "where the compute and memory go in a modern dense decoder, the answer is: the FFN.",
  },

  /* ── 6. Embeddings & RoPE ────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Embeddings: Untied, with High-θ RoPE", anchor: "embeddings" },
  {
    __component: "deep.paragraph",
    body:
      "Unlike the edge-targeted 3B, Llama 3 8B **does not tie** the input embedding matrix " +
      "to the output language-modeling head. With a 128,256-entry vocabulary and " +
      "4,096-dim hidden state, that is `128,256 × 4,096 ≈ 525 M` parameters per " +
      "embedding matrix, so untying costs roughly another 525 M parameters compared to a " +
      "tied variant. Meta accepted that cost because at 8B the quality argument for " +
      "untied embeddings (separate projections can specialize) outweighs the parameter " +
      "savings — the opposite tradeoff from the 3B.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Position information is injected via **Rotary Position Embeddings** with " +
      "`rope_theta = 500,000`, set from the very start of pretraining rather than patched " +
      "in afterwards. This single choice is what makes the later Llama 3.1 8B context " +
      "extension (8K → 128K) cheap: a high base frequency leaves the low-frequency RoPE " +
      "bands already spread out enough that the YaRN-style `llama3` scaling scheme only " +
      "has to rescale them, not re-learn them from scratch.",
  },

  /* ── 7. Context Window ───────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Context Window: 8K → 128K via Llama 3.1", anchor: "context" },
  {
    __component: "deep.paragraph",
    body:
      "The original 3.0 release was natively pretrained at **8,192 tokens**. Three months " +
      "later, Llama 3.1 shipped the same weights with a long-context post-training pass " +
      "and the `llama3` RoPE scaling entry added to `config.json`: " +
      "`{rope_type: \"llama3\", factor: 8.0, high_freq_factor: 4.0, low_freq_factor: 1.0, " +
      "original_max_position_embeddings: 8192}`. The effect is frequency-dependent NTK " +
      "interpolation: high-frequency bands stay untouched (they already encode local " +
      "order) while low-frequency bands are stretched by a factor of 8 to cover 131,072 " +
      "positions. This is the exact same scaling recipe later reused for the 3.2 compact " +
      "models, which is why the entire family moves cleanly to 128K without changing " +
      "anything about the attention kernel or the tokenizer.",
  },

  /* ── 8. Training ─────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Training: 15T Tokens, DPO, and Deliberate Simplicity", anchor: "training" },
  {
    __component: "deep.paragraph",
    body:
      "Pretraining ran on a **15T-token** corpus — roughly 7.5× the 2T tokens of Llama 2 — " +
      "with an aggressive data-quality filter stack and a 5% increase in multilingual " +
      "coverage compared to the earlier family. The compute budget was ≈ 1.3 M H100-hours " +
      "for the 8B alone (and ≈ 6.4 M for the 70B), reported in §3 of the Llama 3 herd " +
      "paper. Mixed-precision training used **bfloat16 everywhere**, with a cosine " +
      "learning-rate schedule and a linear warmup.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Post-training is the step where Llama 3 deliberately diverged from the rest of the " +
      "frontier. Instead of PPO-style RLHF (Llama 2's approach), the Llama 3 team moved to " +
      "**Supervised Fine-Tuning → Rejection Sampling → Direct Preference Optimization** " +
      "(DPO) — a strictly offline preference-learning recipe that is significantly cheaper " +
      "to run and easier to stabilize than PPO. No reward model is trained in the RL " +
      "sense; the preference pairs directly shape the policy via the DPO loss. Every model " +
      "in the Llama 3 herd — 8B, 70B, and the later 1B/3B/405B variants — uses this same " +
      "SFT → RS → DPO recipe, with no constitutional / RLAIF pass.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The practical impact of the 8B is as a **student model for downstream work**. It " +
      "is the smallest Llama 3 checkpoint that is pretrained from scratch (the 1B and 3B " +
      "are distilled from it and the 70B), which makes it the cleanest base for " +
      "fine-tuning, continued pretraining, or domain adaptation. A substantial fraction " +
      "of the 2024–2025 open-model ecosystem — WizardLM-2 8B, OpenChat-3.5, Nous Hermes 2, " +
      "countless domain adapters on HuggingFace — is built on top of exactly this " +
      "checkpoint. When you read 'Llama 3 8B Instruct' in a downstream project's tech " +
      "report, you are reading about the SFT → RS → DPO version of this exact 32-layer, " +
      "32-Q/8-KV, 128K-vocab architecture.",
  },

  /* ── 9. Verdict ──────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Verdict: The Base of the Herd", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Llama 3 8B is not interesting for what it invents — it is interesting because it is " +
      "the **pretraining-from-scratch** anchor point of a family that otherwise propagates " +
      "via distillation. The 3.2 1B and 3B inherit its tokenizer, its pretraining " +
      "distribution, its RoPE configuration, and its block topology; the 3.1 refresh " +
      "inherits its weights and just rescales RoPE for long context. If you remove the 8B " +
      "from the family tree, you also lose the 1B, the 3B, and every fine-tune that calls " +
      "itself a 'Llama 3' derivative.",
  },
  {
    __component: "deep.callout",
    variant: "insight",
    title: "Read 3B and 8B together",
    body:
      "The 4:1 vs 3:1 GQA ratio, the tied vs untied embedding choice, and the 3.5× vs " +
      "2.67× FFN ratio are the *entire* story of how Meta adapted the 8B recipe for edge " +
      "deployment. Hold the two configs side by side and every decision becomes legible.",
  },

  /* ── 10. References ──────────────────────────────────────────── */
  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Llama 3 8B — HuggingFace config.json",
        url: "https://huggingface.co/meta-llama/Meta-Llama-3-8B/blob/main/config.json",
      },
      {
        label: "Llama 3.1 8B — HuggingFace config.json (long-context variant)",
        url: "https://huggingface.co/meta-llama/Meta-Llama-3.1-8B/blob/main/config.json",
      },
      {
        label: "The Llama 3 Herd of Models (Meta AI, 2024) — arXiv:2407.21783",
        url: "https://arxiv.org/abs/2407.21783",
      },
      {
        label: "Introducing Meta Llama 3 — Meta AI blog (2024-04-18)",
        url: "https://ai.meta.com/blog/meta-llama-3/",
      },
      {
        label: "GQA: Training Generalized Multi-Query Transformer Models (Ainslie et al., 2023) — arXiv:2305.13245",
        url: "https://arxiv.org/abs/2305.13245",
      },
      {
        label: "Direct Preference Optimization (Rafailov et al., 2023) — arXiv:2305.18290",
        url: "https://arxiv.org/abs/2305.18290",
      },
      {
        label: "YaRN: Efficient Context Window Extension of Large Language Models (Peng et al., 2023) — arXiv:2309.00071",
        url: "https://arxiv.org/abs/2309.00071",
      },
    ],
  },
];
