/**
 * Deep-dive content for `olmo-2-7b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 1).
 *
 * Primary sources — every numeric claim cites one of:
 *   - HuggingFace `allenai/OLMo-2-1124-7B/config.json`
 *   - arXiv 2501.00656 ("OLMo 2: Training 7B and 13B Open Language Models",
 *     Allen Institute for AI, 2024)
 *   - AI2 blog: "OLMo 2: The best fully open language model to date"
 *     (2024-11-26)
 *   - Dolma 1.7 data release — https://allenai.org/olmo
 *
 * OLMo 2 7B's entire value proposition is **full openness**: the data, the
 * training code, the training logs, every intermediate checkpoint, and the
 * post-training recipe are all released under open licenses. This deep dive
 * leans into the training-stability recipe (QK-Norm, reordered normalization,
 * decoupled weight decay) that the OLMo 2 paper popularized, because the
 * architecture itself is otherwise a fairly standard 2024-era dense decoder.
 */

export const slug = "olmo-2-7b";

export const blocks = [
  /* ── 1. Overview ─────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "OLMo 2 7B is the November 2024 release from the Allen Institute for AI (AI2) of a " +
      "**fully open** 7B dense decoder. 'Fully open' here is a much stronger claim than " +
      "'open weights': AI2 releases the pretraining corpus (**Dolma 1.7**, ≈ 5 T tokens), " +
      "the training code, the hyperparameters, the training logs, every intermediate " +
      "checkpoint, and the full post-training recipe (Tulu 3). If your goal is to " +
      "*reproduce* a modern LLM pretraining run rather than just use one, OLMo 2 7B is " +
      "currently the only realistic option.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The architecture is a pre-norm RMSNorm decoder, but AI2 made a specific set of " +
      "**training-stability** choices that differ from the Llama 3 / Qwen3 defaults and " +
      "are worth reading about on their own. The OLMo 2 technical report (arXiv " +
      "2501.00656) documents each choice as a direct response to a training instability " +
      "observed in OLMo 1. In that sense OLMo 2 is half an open model and half a " +
      "training-stability cookbook for anyone attempting to pretrain a 7B-class decoder " +
      "from scratch.",
  },

  /* ── 2. Architecture at a Glance ─────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.paragraph",
    body:
      "Every number below is read from the public HuggingFace `config.json` for " +
      "`allenai/OLMo-2-1124-7B`. The most surprising number in this table is the KV head " +
      "count — OLMo 2 7B uses **Multi-Head Attention** (1:1 Q:KV ratio), not Grouped-" +
      "Query Attention.",
  },
  {
    __component: "deep.table",
    caption: "OLMo 2 7B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 7.3 B", "dense"],
      ["Hidden size (`d_model`)", "4096", "`hidden_size`"],
      ["Layers", "32", "`num_hidden_layers`"],
      ["Query heads", "32", "`num_attention_heads`"],
      ["KV heads", "32", "`num_key_value_heads` — **MHA, not GQA**"],
      ["Head dimension", "128", "derived: 4096 / 32"],
      ["FFN intermediate", "11,008", "`intermediate_size` (≈ 2.7× hidden)"],
      ["Vocabulary", "100,278", "`vocab_size` (cl100k-aligned)"],
      ["Max position", "4,096", "`max_position_embeddings`"],
      ["RoPE base θ", "500,000", "`rope_theta`"],
      ["Normalization", "RMSNorm + QK-Norm", "pre-norm + per-head Q/K normalization"],
      ["Activation", "SiLU (SwiGLU)", "`hidden_act = silu`"],
      ["Embedding tying", "No", "`tie_word_embeddings = false`"],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },
  {
    __component: "deep.callout",
    variant: "note",
    title: "MHA at 7B? Really?",
    body:
      "Yes — OLMo 2 7B uses 1:1 Multi-Head Attention, not GQA. The tech report explains " +
      "this as a deliberate choice to maximize quality per parameter at a small model " +
      "scale, since the KV cache footprint of a 4K-context MHA 7B is still manageable " +
      "(≈ 2 GiB at full context). For a long-context deployment you would pick " +
      "differently — but OLMo 2's target is research reproducibility, not 128K context.",
  },

  /* ── 3. Stability Recipe: QK-Norm + Reordered Norms ─────────── */
  { __component: "deep.heading", level: "h2", text: "The OLMo 2 Stability Recipe", anchor: "stability" },
  {
    __component: "deep.paragraph",
    body:
      "The most important section of the OLMo 2 tech report is §3, which walks through " +
      "the instabilities observed in the original OLMo 1 and describes the specific " +
      "changes that fixed them. Three changes matter enough to flag:",
  },
  {
    __component: "deep.list",
    style: "number",
    items: [
      "**QK-Norm**. An RMSNorm is applied to the query and key projections inside each attention head, before the Q·Kᵀ dot product. This is the same technique Qwen3 adopted (and that ViT-22B popularized). Without it, OLMo 1 exhibited attention-logit explosions in deep layers during the second half of pretraining; with it, the same runs remained stable.",
      "**Reordered RMSNorm placement**. Standard pre-norm applies RMSNorm *before* each sub-block. OLMo 2 instead follows a hybrid where the RMSNorm is placed **after** the attention and FFN sub-blocks (but still on the residual stream, not the output). This matches the original Transformer's post-LN topology more closely and was measured to improve gradient flow in the 7B depth range.",
      "**Z-loss on attention logits**. A small auxiliary loss term penalizes the log-sum-exp of the pre-softmax attention logits, preventing them from growing unboundedly even when QK-Norm is engaged. This is a belt-and-braces stability measure that AI2 recommends for anyone attempting a 7B pretraining run on a non-proprietary training stack.",
    ],
  },
  {
    __component: "deep.paragraph",
    body:
      "None of these changes are architectural novelty in the 'we invented a new " +
      "attention mechanism' sense. They are training-recipe hygiene — the kind of " +
      "detail that frontier labs know internally but rarely publish in enough detail to " +
      "reproduce. The fact that AI2 not only published them but tied each one to a " +
      "concrete pre-fix / post-fix ablation is what makes OLMo 2 uniquely valuable for " +
      "the open research community.",
  },

  /* ── 4. Block Structure ──────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Block Structure", anchor: "block" },
  {
    __component: "deep.code-block",
    language: "python",
    caption: "OLMo 2 block with QK-Norm and post-sub-block RMSNorm",
    code:
      "def olmo2_block(x, rope_cos, rope_sin):\n" +
      "    # Attention sub-block — no pre-LN, QK-Norm inside\n" +
      "    q = x @ W_q\n" +
      "    k = x @ W_k\n" +
      "    v = x @ W_v\n" +
      "    q = rms_norm(q, eps=1e-5)    # QK-Norm\n" +
      "    k = rms_norm(k, eps=1e-5)    # QK-Norm\n" +
      "    q = apply_rope(q, rope_cos, rope_sin)\n" +
      "    k = apply_rope(k, rope_cos, rope_sin)\n" +
      "    attn_out = mha(q, k, v)\n" +
      "    x = x + rms_norm(attn_out)   # post-sub-block norm on the residual add\n" +
      "\n" +
      "    # FFN sub-block\n" +
      "    ffn_out = swiglu_ffn(x, d_ff=11008)\n" +
      "    x = x + rms_norm(ffn_out)    # post-sub-block norm on the residual add\n" +
      "    return x",
  },

  /* ── 5. Dolma 1.7: The Pretraining Corpus ────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Dolma 1.7: The Pretraining Corpus", anchor: "dolma" },
  {
    __component: "deep.paragraph",
    body:
      "OLMo 2 7B is pretrained on **Dolma 1.7**, a ≈ 5 T-token corpus that is *also* " +
      "released publicly under an open license. This is the single biggest difference " +
      "between OLMo and every other model in the gallery: when you read the Llama 3 8B " +
      "tech report you are told 'we trained on 15T tokens with extensive quality " +
      "filtering' and you have to take Meta's word for it; when you read the OLMo 2 " +
      "tech report, you can download the exact training tokens and replay them.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The corpus is a mix of Common Crawl (≈ 60%), curated code (≈ 15%, The Stack), " +
      "academic papers (≈ 10%, peS2o), reference text (≈ 8%, Wikipedia + books), and a " +
      "long multilingual tail. AI2 documents the filter chain — quality classifiers, " +
      "deduplication thresholds, toxicity removal — at a level of detail that no " +
      "frontier-lab tech report matches. If you want to understand what 'high-quality " +
      "open pretraining data' means operationally in 2025, Dolma 1.7 is the reference " +
      "specification.",
  },

  /* ── 6. Tulu 3 Post-Training ─────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Post-Training: The Tulu 3 Recipe", anchor: "post-training" },
  {
    __component: "deep.paragraph",
    body:
      "Post-training for the Instruct variant of OLMo 2 7B follows the **Tulu 3** " +
      "recipe, also released openly by AI2 in late 2024. The recipe has three stages: " +
      "an SFT pass on a large open instruction-following dataset, a **DPO** pass on " +
      "open preference pairs, and a final RL pass using **reinforcement learning from " +
      "verifiable rewards** (RLVR) — the same family of rule-based reward approaches " +
      "that later appeared in DeepSeek-R1. Every ingredient — the SFT data, the " +
      "preference pairs, the RLVR tasks — is published. You can reproduce the entire " +
      "pipeline end to end.",
  },

  /* ── 7. Deployment & Limitations ─────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Deployment & Limitations", anchor: "deployment" },
  {
    __component: "deep.paragraph",
    body:
      "At bf16 the full checkpoint is ≈ 14.6 GB, which fits on a single 24 GB consumer " +
      "GPU. Quantized GGUF builds via llama.cpp are available in q4_K_M at ≈ 4.1 GB and " +
      "q5_K_M at ≈ 5.0 GB. The most important deployment limitation is the **4,096-token " +
      "context window** — OLMo 2 7B is not a long-context model and does not ship with " +
      "a post-training RoPE extension the way Llama 3.1 or Qwen3 do. If your workload " +
      "needs 32K or 128K context, this is not the right model; the tech report says as " +
      "much and recommends alternatives.",
  },
  {
    __component: "deep.paragraph",
    body:
      "On benchmark quality, OLMo 2 7B lands in the neighborhood of Llama 3.1 8B on " +
      "most reasoning and code benchmarks (see Table 4 of the tech report for the full " +
      "comparison). It is measurably weaker than Qwen 2.5 7B on multilingual tasks, " +
      "which is expected given the English-heavy Dolma mix. For its target audience — " +
      "researchers who need a fully reproducible 7B baseline — benchmark dominance is " +
      "not the point; the point is that you can train your own variant.",
  },

  /* ── 8. Verdict ──────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Verdict: The Reproducibility Model", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "OLMo 2 7B occupies a position in this gallery that no other model does: it is the " +
      "**reproducibility reference**. Every other entry — Llama, Qwen, DeepSeek, GLM, " +
      "Kimi, Mistral, Phi — publishes weights and a tech report but holds back the " +
      "training data and the training code. OLMo 2 publishes everything. That makes it " +
      "the right model to cite in any open-research context where the question is 'can " +
      "I verify the claim?' rather than 'can I serve this at lowest cost?' And the " +
      "training-stability recipe (QK-Norm, reordered norms, z-loss on attention logits) " +
      "is genuinely useful independent of the weights — you can take those ideas to any " +
      "7B pretraining run of your own and expect them to help.",
  },

  /* ── 9. References ───────────────────────────────────────────── */
  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "OLMo 2 7B — HuggingFace config.json",
        url: "https://huggingface.co/allenai/OLMo-2-1124-7B/blob/main/config.json",
      },
      {
        label: "OLMo 2: Training 7B and 13B Open Language Models (AI2, 2024) — arXiv:2501.00656",
        url: "https://arxiv.org/abs/2501.00656",
      },
      {
        label: "OLMo 2: The best fully open language model to date — AI2 blog (2024-11-26)",
        url: "https://allenai.org/blog/olmo2",
      },
      {
        label: "Dolma: An Open Corpus of Three Trillion Tokens (Soldaini et al., 2024) — arXiv:2402.00159",
        url: "https://arxiv.org/abs/2402.00159",
      },
      {
        label: "Tulu 3: Pushing Frontiers in Open Language Model Post-Training — arXiv:2411.15124",
        url: "https://arxiv.org/abs/2411.15124",
      },
      {
        label: "Scaling Vision Transformers to 22 Billion Parameters (Dehghani et al., 2023) — arXiv:2302.05442 (QK-Norm origin)",
        url: "https://arxiv.org/abs/2302.05442",
      },
    ],
  },
];
