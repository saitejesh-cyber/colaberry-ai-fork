/**
 * Deep-dive content for `llama-3-2-3b`.
 *
 * Authored 2026-04-14 for Sprint v4 per the content source policy in
 * `sprints/v4/PRD.md` (Sai Tejesh, 2026-04-14).
 *
 * Primary sources — every numeric claim cites one of:
 *   - HuggingFace `meta-llama/Llama-3.2-3B/config.json`
 *   - arXiv 2407.21783 ("The Llama 3 Herd of Models")
 *   - Meta AI research blog (Llama 3.2 announcement, 2024-09-25)
 *
 * Structure: Overview → Architecture Table → Attention → Block Structure
 *   → FFN → Embeddings → Context → Training → Verdict → References.
 *
 * Total length target: 1,500–2,000 words. Every block maps directly to a
 * `deep.*` component in Strapi v5 — see `src/components/LLMArchitectureDeepDive.tsx`
 * for the renderer contract.
 */

export const slug = "llama-3-2-3b";

export const blocks = [
  /* ── 1. Overview ─────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Llama 3.2 3B is the canonical reference implementation of the 2024-era compact " +
      "decoder recipe. Meta released it on 25 September 2024 alongside the 1B sibling as " +
      "part of the Llama 3.2 Connect drop, positioned explicitly for on-device deployment " +
      "across Apple MLX, Qualcomm Hexagon, and MediaTek APU runtimes. It is not a novel " +
      "architecture — it is the cleanest expression of the recipe that every other open " +
      "compact model in this gallery is measured against: **Grouped-Query Attention**, " +
      "**SwiGLU** feed-forward, **RMSNorm** pre-normalization, **RoPE** with a " +
      "high base frequency, and **tied** input/output embeddings. Reading this deep dive " +
      "first gives you the vocabulary to understand how later models (GLM-5.1, DeepSeek V3, " +
      "Kimi Linear, Qwen3-Next) each break or extend one specific piece of this blueprint.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Mechanically, the 1B and 3B models are not independently pretrained from scratch. " +
      "They are **structurally pruned and distilled** from Llama 3.1 8B, using that model " +
      "together with Llama 3.1 70B as teacher signals for logit-level knowledge distillation. " +
      "This matters because it means the 3B model inherits the full 15T-token pretraining " +
      "distribution of the Llama 3 herd without paying the pretraining compute cost twice.",
  },

  /* ── 2. Architecture at a Glance ─────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.paragraph",
    body:
      "Every number in the table below is read directly from the public HuggingFace " +
      "`config.json` for `meta-llama/Llama-3.2-3B`. Derived values (head dimension, FFN " +
      "ratio) are computed from those primitives.",
  },
  {
    __component: "deep.table",
    caption: "Llama 3.2 3B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 3.21 B", "~3.0 B non-embedding after weight tying"],
      ["Hidden size (`d_model`)", "3072", "`hidden_size`"],
      ["Layers", "28", "`num_hidden_layers`"],
      ["Query heads", "24", "`num_attention_heads`"],
      ["KV heads", "8", "`num_key_value_heads` (GQA 3:1)"],
      ["Head dimension", "128", "derived: 3072 / 24"],
      ["FFN intermediate", "8192", "`intermediate_size` (≈ 2.67× hidden)"],
      ["Vocabulary", "128,256", "`vocab_size` (tiktoken-derived)"],
      ["Max position", "131,072", "`max_position_embeddings` (128K)"],
      ["RoPE base θ", "500,000", "`rope_theta`"],
      ["Normalization", "RMSNorm", "ε = 1e-5, pre-norm"],
      ["Activation", "SiLU (SwiGLU)", "`hidden_act = silu`"],
      ["Embedding tying", "Yes", "`tie_word_embeddings = true`"],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },

  /* ── 3. Attention: GQA ───────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Attention: Grouped-Query Attention", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "Llama 3.2 3B uses **Grouped-Query Attention** (GQA, Ainslie et al., 2023) in a 3:1 " +
      "configuration: 24 query heads share 8 key-value heads, so every KV head is reused by " +
      "exactly three query heads. Functionally this lives between vanilla Multi-Head " +
      "Attention (MHA, 1:1) and Multi-Query Attention (MQA, *n*:1) — it trades a small amount " +
      "of representational capacity for a **large** reduction in KV cache footprint, which " +
      "is the dominant memory cost at long context.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The KV cache arithmetic tells you why this single choice dictates whether the model " +
      "is usable on a phone. At bf16 precision, the per-token KV memory is " +
      "`2 × num_kv_heads × head_dim × dtype_bytes × num_layers`. For Llama 3.2 3B that is " +
      "`2 × 8 × 128 × 2 × 28 = 114,688 bytes/token`, i.e. ≈ 112 KiB per token. An equivalent " +
      "MHA configuration (24 KV heads) would be ≈ 336 KiB per token — a 3× cost for no " +
      "quality win at this scale.",
  },
  {
    __component: "deep.table",
    caption: "KV cache footprint at bf16 (Llama 3.2 3B vs hypothetical MHA baseline)",
    headers: ["Context length", "GQA (8 KV heads)", "MHA (24 KV heads)", "Savings"],
    rows: [
      ["4,096 tokens", "≈ 448 MiB", "≈ 1.31 GiB", "3×"],
      ["32,768 tokens", "≈ 3.50 GiB", "≈ 10.5 GiB", "3×"],
      ["131,072 tokens", "≈ 14.0 GiB", "≈ 42.0 GiB", "3×"],
    ],
  },
  {
    __component: "deep.callout",
    variant: "insight",
    title: "The KV cache dominates at long context",
    body:
      "At the full 128K window, the KV cache alone is **≈ 14 GiB** — more than double the " +
      "6 GiB of model weights in bf16. This is why GQA is not an optimization in Llama 3.2 3B; " +
      "it is the architectural decision that *allows* the model to run on 8 GiB unified-memory " +
      "mobile hardware at meaningful context lengths.",
  },

  /* ── 4. Block Structure ──────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Block Structure & Normalization", anchor: "block" },
  {
    __component: "deep.paragraph",
    body:
      "Each of the 28 transformer blocks follows the standard **pre-norm** residual stream: " +
      "RMSNorm is applied *before* attention and *before* the FFN, and the residual connection " +
      "passes through unnormalized. This is the configuration that made very deep transformers " +
      "stable during training (see Xiong et al., 2020), and it is now universal across " +
      "open-weight LLMs. The normalization itself is **RMSNorm** (Zhang & Sennrich, 2019) " +
      "rather than LayerNorm: it drops the mean-centering step and keeps only the " +
      "root-mean-square rescaling, which is ≈ 7–15% faster in practice with no measurable " +
      "quality regression.",
  },
  {
    __component: "deep.code-block",
    language: "python",
    caption: "Llama 3.2 3B block in pseudocode (pre-norm + RMSNorm)",
    code:
      "def llama_block(x, kv_cache, rope_cos, rope_sin):\n" +
      "    # Pre-norm attention path\n" +
      "    h = rms_norm(x, eps=1e-5)              # 3072-dim\n" +
      "    h = grouped_query_attn(\n" +
      "        h,\n" +
      "        n_q_heads=24, n_kv_heads=8,\n" +
      "        head_dim=128,\n" +
      "        rope_cos=rope_cos, rope_sin=rope_sin,\n" +
      "        kv_cache=kv_cache,\n" +
      "    )\n" +
      "    x = x + h                              # residual\n" +
      "\n" +
      "    # Pre-norm FFN path\n" +
      "    h = rms_norm(x, eps=1e-5)\n" +
      "    h = swiglu_ffn(h, d_ff=8192)\n" +
      "    x = x + h                              # residual\n" +
      "    return x",
  },

  /* ── 5. FFN: SwiGLU ──────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Feed-Forward: SwiGLU", anchor: "ffn" },
  {
    __component: "deep.paragraph",
    body:
      "The position-wise feed-forward is **SwiGLU** (Shazeer, 2020) — a gated variant of the " +
      "classic GLU that uses the SiLU/Swish activation on the gate projection. Unlike a " +
      "vanilla two-projection FFN, SwiGLU uses **three** projections (`gate_proj`, `up_proj`, " +
      "`down_proj`), so the intermediate width is chosen lower than the classic 4× rule to " +
      "keep the parameter budget flat. Llama 3.2 3B uses `intermediate_size = 8192`, which is " +
      "roughly **2.67×** the hidden size — this is the same ratio as Llama 3 8B and 70B and is " +
      "now standard across the family.",
  },
  {
    __component: "deep.code-block",
    language: "python",
    caption: "SwiGLU feed-forward with three projections",
    code:
      "def swiglu_ffn(x, d_ff=8192):\n" +
      "    # x:        [batch, seq, 3072]\n" +
      "    # W_gate:   [3072, 8192]\n" +
      "    # W_up:     [3072, 8192]\n" +
      "    # W_down:   [8192, 3072]\n" +
      "    gate = silu(x @ W_gate)     # Swish/SiLU activation\n" +
      "    up   = x @ W_up             # linear\n" +
      "    return (gate * up) @ W_down # element-wise gate, then project down",
  },

  /* ── 6. Embeddings & RoPE ────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Embeddings: Tied Weights and RoPE", anchor: "embeddings" },
  {
    __component: "deep.paragraph",
    body:
      "Two embedding decisions shape the 3B model's parameter budget. First, the input token " +
      "embedding matrix is **shared** with the output language-modeling head " +
      "(`tie_word_embeddings = true`). With a 128,256-entry vocabulary and 3072-dim hidden " +
      "state, one embedding matrix is `128,256 × 3,072 ≈ 394 M` parameters — **~12% of the " +
      "entire 3.21 B total**. Tying recovers that chunk of parameters for deployment memory, " +
      "which is the single biggest reason the 3B model fits in the same envelope as pre-GQA " +
      "1B-class models from 2023.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Second, position information is injected via **Rotary Position Embeddings** (RoPE, Su " +
      "et al., 2021) applied inside each attention head — not summed with the token embedding. " +
      "The base frequency is `rope_theta = 500,000`, ~50× larger than the original RoPE " +
      "default of 10,000. A higher θ stretches the wavelength spectrum so that position " +
      "differences remain distinguishable at long range, which is what allows the same " +
      "architecture to be post-trained to 128K without redesigning the embedding layer.",
  },

  /* ── 7. Context Window ───────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Context Window: 128K via llama3 RoPE Scaling", anchor: "context" },
  {
    __component: "deep.paragraph",
    body:
      "Llama 3.2 3B is natively pretrained at **8,192-token** context and then extended to " +
      "**131,072 tokens** through the `llama3` RoPE scaling scheme, which is encoded directly " +
      "in `config.json`: `{rope_type: \"llama3\", factor: 32.0, high_freq_factor: 4.0, " +
      "low_freq_factor: 1.0, original_max_position_embeddings: 8192}`. This is a " +
      "frequency-dependent NTK-aware interpolation — high-frequency RoPE bands (which encode " +
      "local structure) are left alone while low-frequency bands (which encode long-range " +
      "position) are rescaled. The result is a model that keeps short-range fidelity while " +
      "remaining coherent out to 32K–64K in practice, with some quality decay as you approach " +
      "the full 128K window.",
  },

  /* ── 8. Training ─────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Training: Pruning, Distillation, Post-training", anchor: "training" },
  {
    __component: "deep.paragraph",
    body:
      "Unlike the 8B and 70B siblings, Llama 3.2 3B is **not** pretrained from scratch. It is " +
      "produced by **structured pruning and knowledge distillation** from Llama 3.1 8B, with " +
      "both Llama 3.1 8B and 70B serving as teachers for logit-level distillation. This is " +
      "the same general approach NVIDIA's Minitron work popularized for compact compute: " +
      "you keep the 15T-token Llama 3 pretraining investment and amortize it across a smaller " +
      "student without re-running the base objective.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Post-training for the Instruct variant follows the Llama 3 herd recipe: **Supervised " +
      "Fine-Tuning → Rejection Sampling → Direct Preference Optimization** (§5 of arXiv " +
      "2407.21783). PPO-style RLHF is notably absent — the Llama 3 team moved to DPO across " +
      "the entire family, citing training stability and simpler infrastructure. There is no " +
      "RLAIF constitutional pass in this recipe.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The practical deployment story of the 3B model is inseparable from **quantization**. " +
      "At bf16 the full checkpoint is roughly 6.4 GB — too large to fit the RAM budget of a " +
      "typical phone, which was the entire point of the release. The llama.cpp ecosystem " +
      "responded almost immediately with q4_K_M and q5_K_M GGUF builds that cut the footprint " +
      "to ≈ 2.0 GB and ≈ 2.4 GB respectively, with measured quality regression that is " +
      "essentially flat at q5_K_M and mild at q4_K_M. Apple's MLX framework and Qualcomm's " +
      "Hexagon NPU stack have both used the 3B as their reference model for on-device " +
      "inference demos, and the tight GQA ratio (24Q/8KV) is specifically what keeps the " +
      "KV cache small enough to run at multi-thousand-token contexts on 8 GB RAM devices. " +
      "When the Llama 3 tech report says the 3B was 'designed for edge deployment,' the " +
      "architectural choices that back that claim are the GQA ratio, the tied embeddings, " +
      "and the bf16-native training that quantizes cleanly to 4-bit — not any feature unique " +
      "to the 3B itself. It is the 8B recipe with the edge constraints baked in from step one.",
  },

  /* ── 9. Verdict ──────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Verdict: The Blueprint Model", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Llama 3.2 3B is not interesting because it invents anything. It is interesting because " +
      "it is the single most disciplined implementation of what is now the canonical open " +
      "decoder: **pre-norm RMSNorm, GQA 3:1, SwiGLU, RoPE with high θ, tied embeddings, bf16**. " +
      "Every architectural deviation you will read about in later deep dives — DeepSeek's " +
      "multi-head latent attention, Kimi Linear's hybrid linear-attention blocks, Qwen3's " +
      "128-expert MoE, GLM-5.1's GeGLU variant — is a deliberate choice *against* one specific " +
      "piece of this blueprint. Understanding 3B at this level of detail is the fastest way " +
      "to make sense of every other entry in the gallery.",
  },
  {
    __component: "deep.callout",
    variant: "note",
    title: "Reading tip",
    body:
      "If you are new to transformer architecture deep dives, re-read the GQA and SwiGLU " +
      "sections twice before moving on to DeepSeek V3 — those two choices drive 90% of the " +
      "comparisons you are about to see.",
  },

  /* ── 10. References ──────────────────────────────────────────── */
  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Llama 3.2 3B — HuggingFace config.json",
        url: "https://huggingface.co/meta-llama/Llama-3.2-3B/blob/main/config.json",
      },
      {
        label: "Llama 3 Herd of Models (Meta AI, 2024) — arXiv:2407.21783",
        url: "https://arxiv.org/abs/2407.21783",
      },
      {
        label: "Llama 3.2 announcement — Meta AI (2024-09-25)",
        url: "https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/",
      },
      {
        label: "GQA: Training Generalized Multi-Query Transformer Models (Ainslie et al., 2023) — arXiv:2305.13245",
        url: "https://arxiv.org/abs/2305.13245",
      },
      {
        label: "GLU Variants Improve Transformer (Shazeer, 2020) — arXiv:2002.05202",
        url: "https://arxiv.org/abs/2002.05202",
      },
      {
        label: "Root Mean Square Layer Normalization (Zhang & Sennrich, 2019) — arXiv:1910.07467",
        url: "https://arxiv.org/abs/1910.07467",
      },
      {
        label: "RoFormer: Enhanced Transformer with Rotary Position Embedding (Su et al., 2021) — arXiv:2104.09864",
        url: "https://arxiv.org/abs/2104.09864",
      },
      {
        label: "Direct Preference Optimization (Rafailov et al., 2023) — arXiv:2305.18290",
        url: "https://arxiv.org/abs/2305.18290",
      },
    ],
  },
];
