/**
 * Deep-dive content for `qwen3-32b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 1).
 *
 * Primary sources — every numeric claim cites one of:
 *   - HuggingFace `Qwen/Qwen3-32B/config.json`
 *   - arXiv 2505.09388 ("Qwen3 Technical Report", Alibaba, 2025)
 *   - Qwen blog: "Qwen3: Think Deeper, Act Faster" (2025-04-29)
 *
 * Qwen3-32B is the **dense** reference model in the Qwen3 family — the
 * counterpart to the Qwen3-Next 80B-A3B flagship that already has a deep dive.
 * It shares the family's two most distinctive architectural choices —
 * **QK-Norm** and the **thinking-mode switch** — with none of the MoE or
 * linear-attention complications, which makes it the cleanest surface on
 * which to explain those two ideas.
 */

export const slug = "qwen3-32b";

export const blocks = [
  /* ── 1. Overview ─────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-32B is the dense reference model of the Qwen3 family, released by Alibaba on " +
      "29 April 2025 together with the 0.6B / 1.7B / 4B / 8B / 14B dense siblings and the " +
      "Qwen3-Next 80B-A3B and Qwen3-235B-A22B MoE variants. At 32B parameters it is the " +
      "largest purely dense checkpoint in the family and is positioned as the workhorse " +
      "model for reasoning-heavy workloads that cannot tolerate the serving complexity of " +
      "an MoE. The architecture is a standard pre-norm decoder with two Qwen3-specific " +
      "twists: **QK-Norm** inside the attention block, and a runtime **thinking-mode " +
      "switch** in the tokenizer that toggles chain-of-thought output without a model " +
      "swap.",
  },
  {
    __component: "deep.paragraph",
    body:
      "If you have read the Qwen3-Next 80B-A3B flagship deep dive, this model is the " +
      "'remove the interesting parts' version: no gated linear attention, no MoE, no 3:1 " +
      "hybrid stack. What remains is the set of choices that every Qwen3 model shares, " +
      "which makes this the cleanest place to look at QK-Norm and the thinking-mode " +
      "switch in isolation.",
  },

  /* ── 2. Architecture at a Glance ─────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.paragraph",
    body:
      "Every number below is read from the public HuggingFace `config.json` for " +
      "`Qwen/Qwen3-32B`. The derived FFN ratio and head dimension are computed from " +
      "those primitives.",
  },
  {
    __component: "deep.table",
    caption: "Qwen3-32B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 32.8 B", "dense"],
      ["Hidden size (`d_model`)", "5120", "`hidden_size`"],
      ["Layers", "64", "`num_hidden_layers`"],
      ["Query heads", "64", "`num_attention_heads`"],
      ["KV heads", "8", "`num_key_value_heads` (GQA 8:1)"],
      ["Head dimension", "128", "`head_dim` (explicit in config)"],
      ["FFN intermediate", "25,600", "`intermediate_size` (5× hidden)"],
      ["Vocabulary", "151,936", "`vocab_size` (Qwen tiktoken)"],
      ["Max position (native)", "32,768", "`max_position_embeddings`"],
      ["Max position (scaled)", "131,072", "via YaRN `rope_scaling`"],
      ["RoPE base θ", "1,000,000", "`rope_theta`"],
      ["Normalization", "RMSNorm", "pre-norm, plus QK-Norm inside attention"],
      ["Activation", "SiLU (SwiGLU)", "`hidden_act = silu`"],
      ["Embedding tying", "No", "`tie_word_embeddings = false`"],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },

  /* ── 3. Attention: GQA 8:1 with QK-Norm ──────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Attention: GQA 8:1 with QK-Norm", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-32B uses **Grouped-Query Attention** in an 8:1 configuration: 64 query heads " +
      "share 8 KV heads. This is the tightest GQA ratio in the gallery so far — Llama 3.2 " +
      "3B uses 3:1, Llama 3 8B uses 4:1, Phi-4 uses 4:1 — and it is the ratio at which " +
      "GQA starts approaching Multi-Query Attention (MQA) in KV-cache footprint while " +
      "still retaining per-group query specialization. With 64 layers, the absolute KV " +
      "cache is still substantial, but the *per-layer* cost is minimal.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The distinctive choice in Qwen3 attention is **QK-Norm**: before the " +
      "query-key dot product, both Q and K are passed through an RMSNorm " +
      "(`q_norm`, `k_norm` in the Qwen3 code). This is not standard in the Llama " +
      "family — Llama 3 does not do it — and it was popularized by the " +
      "ViT-22B paper (Dehghani et al., 2023) as a remedy for attention-logit " +
      "explosions during training of very deep transformers. In Qwen3 the same " +
      "logic applies: the 64-layer dense stack is deep enough that without QK-Norm " +
      "the softmax in later layers saturates on a handful of high-magnitude tokens, " +
      "which the Qwen team report as a concrete training-stability issue in §3 of " +
      "the tech report.",
  },
  {
    __component: "deep.code-block",
    language: "python",
    caption: "Qwen3 attention with QK-Norm (the distinguishing line is q_norm / k_norm)",
    code:
      "def qwen3_attn(x, rope_cos, rope_sin, kv_cache):\n" +
      "    q = x @ W_q           # [..., 64, 128]\n" +
      "    k = x @ W_k           # [..., 8, 128]\n" +
      "    v = x @ W_v           # [..., 8, 128]\n" +
      "\n" +
      "    # --- QK-Norm: the Qwen3 distinguishing step ---\n" +
      "    q = rms_norm(q, eps=1e-6)   # q_norm\n" +
      "    k = rms_norm(k, eps=1e-6)   # k_norm\n" +
      "\n" +
      "    q = apply_rope(q, rope_cos, rope_sin)\n" +
      "    k = apply_rope(k, rope_cos, rope_sin)\n" +
      "    k, v = update_kv_cache(kv_cache, k, v)\n" +
      "\n" +
      "    # Repeat k,v across query groups (GQA 8:1)\n" +
      "    k = k.repeat_interleave(8, dim=-2)\n" +
      "    v = v.repeat_interleave(8, dim=-2)\n" +
      "\n" +
      "    logits = (q @ k.transpose(-1,-2)) / sqrt(128)\n" +
      "    return softmax(logits).masked_fill(causal_mask, 0) @ v @ W_o",
  },
  {
    __component: "deep.callout",
    variant: "insight",
    title: "QK-Norm vs logit soft-capping",
    body:
      "QK-Norm and Gemma 2's logit soft-capping are two different answers to the same " +
      "question: how do you keep attention logits bounded in very deep transformers? " +
      "QK-Norm is cheaper at inference (no per-token tanh) and Gemma's soft-cap is " +
      "simpler to add post-hoc. Qwen3 picks QK-Norm; Gemma 2 picks soft-cap. Both work.",
  },

  /* ── 4. Block Structure & FFN ────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Block Structure & FFN", anchor: "block" },
  {
    __component: "deep.paragraph",
    body:
      "The 64 transformer blocks follow the standard pre-norm recipe (RMSNorm → attention " +
      "→ residual → RMSNorm → FFN → residual), extended with QK-Norm inside the attention " +
      "sub-block as described above. The FFN intermediate width is **25,600 = 5.0 × " +
      "5,120** — noticeably wider than Llama 3's 3.5× or Llama 3.2 3B's 2.67×. That extra " +
      "FFN capacity is what carries most of the reasoning performance of the dense 32B " +
      "model. The FFN alone holds `3 × 5,120 × 25,600 ≈ 393 M` parameters per layer, and " +
      "across 64 layers that is **≈ 25.2 B — about 77% of the 32.8 B total**. As always " +
      "with modern dense decoders: the FFN is where the model lives.",
  },

  /* ── 5. Context Window & RoPE ────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Context Window: 32K Native, 128K via YaRN", anchor: "context" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-32B is natively pretrained at **32,768 tokens** with `rope_theta = 1,000,000` " +
      "— twice the base frequency of the Llama 3 family. At inference time the config " +
      "enables **YaRN** (Peng et al., 2023) scaling via the `rope_scaling` block, " +
      "extending the effective window to **131,072 tokens**. YaRN is a " +
      "frequency-dependent NTK-aware interpolation that is conceptually similar to the " +
      "`llama3` scaling scheme but uses a slightly different attention-temperature " +
      "correction; the Qwen team chose it to match the tokenizer and vocab they inherited " +
      "from Qwen2, which was already YaRN-aware.",
  },

  /* ── 6. Thinking-Mode Switch ─────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "The Thinking-Mode Switch", anchor: "thinking-mode" },
  {
    __component: "deep.paragraph",
    body:
      "Every Qwen3 model ships with a **runtime switch** that toggles chain-of-thought " +
      "reasoning on or off without swapping the underlying weights. In the tokenizer " +
      "chat template this is exposed as a flag (`enable_thinking=True|False`); at " +
      "generation time, thinking mode causes the model to first emit content inside a " +
      "`<think>…</think>` block and then produce its final answer. The key claim in §4 " +
      "of the Qwen3 tech report is that **the same checkpoint** is jointly trained to do " +
      "both — there is no 'reasoning' sibling, the way DeepSeek R1 is an RL descendant of " +
      "DeepSeek V3. Thinking mode is a single-model capability toggled at the prompt " +
      "level.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Mechanically, the joint training works because the post-training SFT data mixes " +
      "two formats: reasoning traces that end in a `<think>` block followed by an answer, " +
      "and direct-answer examples with no `<think>` block. At inference time, the chat " +
      "template either emits a leading `<think>` open tag (forcing the model into " +
      "reasoning mode) or emits a leading answer tag (forcing a direct response). The " +
      "model has learned to condition its output distribution on which tag opened the " +
      "assistant turn. This is the simplest possible way to get two behavioral modes out " +
      "of a single set of weights, and it is what the Qwen team considers the key " +
      "contribution of the Qwen3 post-training recipe.",
  },

  /* ── 7. Training ─────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Training: 36T Tokens + Joint SFT", anchor: "training" },
  {
    __component: "deep.paragraph",
    body:
      "Pretraining ran on a **≈ 36 T-token** corpus — more than double the Llama 3 herd's " +
      "15T — with an explicit multilingual emphasis (the tech report calls out 119 " +
      "languages). The corpus breakdown reported in §2 of the tech report is heavy on " +
      "code and STEM content, consistent with the family's positioning toward reasoning " +
      "workloads. All Qwen3 dense models share this pretraining corpus; the dense vs MoE " +
      "variants fork only at fine-tuning time.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Post-training follows the Qwen3 four-stage recipe described in §4 of the tech " +
      "report: **long CoT cold-start SFT → reasoning-focused RL → thinking-mode fusion " +
      "SFT → general-purpose RL**. The fusion stage is where the same checkpoint is " +
      "taught to handle both thinking and non-thinking prompts — it is trained on a mixed " +
      "batch containing both `<think>…</think>` completions and direct answers, with the " +
      "prompt format as the only signal telling the model which mode to use. This is the " +
      "critical innovation that lets Qwen3 avoid shipping a separate reasoning model.",
  },

  /* ── 8. Verdict ──────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Verdict: Dense, Deep, and Mode-Switched", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-32B is the Qwen family's answer to 'give me a reasoning-capable open model " +
      "without the serving complexity of MoE.' The architecture is not novel — QK-Norm " +
      "was published two years earlier for ViT, YaRN was published for Llama-family " +
      "long-context extension, and the 64-layer 5120-hidden topology is boring — but the " +
      "**thinking-mode switch** is a genuinely useful product decision that saves " +
      "downstream users from having to deploy two models when they want both a fast-answer " +
      "mode and a slow-reasoning mode. Pair this deep dive with the Qwen3-Next 80B-A3B " +
      "flagship to see how the same family scales the same idea into a hybrid " +
      "linear-attention MoE without losing the mode switch.",
  },

  /* ── 9. References ───────────────────────────────────────────── */
  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Qwen3-32B — HuggingFace config.json",
        url: "https://huggingface.co/Qwen/Qwen3-32B/blob/main/config.json",
      },
      {
        label: "Qwen3 Technical Report (Alibaba, 2025) — arXiv:2505.09388",
        url: "https://arxiv.org/abs/2505.09388",
      },
      {
        label: "Qwen3: Think Deeper, Act Faster — Qwen blog (2025-04-29)",
        url: "https://qwenlm.github.io/blog/qwen3/",
      },
      {
        label: "Scaling Vision Transformers to 22 Billion Parameters (Dehghani et al., 2023) — arXiv:2302.05442 (QK-Norm origin)",
        url: "https://arxiv.org/abs/2302.05442",
      },
      {
        label: "YaRN: Efficient Context Window Extension (Peng et al., 2023) — arXiv:2309.00071",
        url: "https://arxiv.org/abs/2309.00071",
      },
      {
        label: "GQA: Training Generalized Multi-Query Transformer Models (Ainslie et al., 2023) — arXiv:2305.13245",
        url: "https://arxiv.org/abs/2305.13245",
      },
    ],
  },
];
