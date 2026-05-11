/**
 * Deep-dive content for `deepseek-v3`.
 *
 * Sprint v4 flagship. Sources (per content source policy):
 *   - DeepSeek-V3 Technical Report — arXiv:2412.19437
 *   - HuggingFace `deepseek-ai/DeepSeek-V3/config.json`
 *   - DeepSeek-V2 paper — arXiv:2405.04434 (origin of MLA and DeepSeekMoE)
 */

export const slug = "deepseek-v3";

export const blocks = [
  /* ── Overview ────────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "DeepSeek V3 is the model that taught the entire open-weight field that **attention " +
      "and expert routing are the real bottlenecks** — not raw parameter count. Released in " +
      "December 2024 with a 671 B total / 37 B active Mixture-of-Experts architecture, V3 " +
      "combined three production-grade innovations that had previously only appeared in " +
      "research papers: **Multi-head Latent Attention** (MLA) for KV-cache compression, " +
      "**DeepSeekMoE** with fine-grained experts and a shared expert, and an " +
      "**auxiliary-loss-free load-balancing** strategy that fixed the routing-imbalance " +
      "problem that had plagued every prior open MoE. It was pretrained on 14.8 T tokens " +
      "using **FP8 mixed-precision** training, and its release is what made 'sparse MoE at " +
      "frontier scale' a default design choice rather than a research curiosity.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Everything downstream of this gallery — GLM-5, Kimi Linear, Qwen3-Next — borrows at " +
      "least one idea that DeepSeek either invented or made practical. If Llama 3.2 3B is " +
      "the canonical dense blueprint, DeepSeek V3 is the canonical sparse blueprint.",
  },

  /* ── Architecture at a Glance ────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "DeepSeek V3 configuration (source: HuggingFace config.json + arXiv 2412.19437)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "671 B", "tech report §2"],
      ["Active parameters / token", "37 B", "top-8 routed + 1 shared expert"],
      ["Layers", "61", "tech report §4.1"],
      ["Hidden size", "7,168", "config.json"],
      ["Attention", "MLA", "Multi-head Latent Attention"],
      ["KV compression dim", "512", "`kv_lora_rank` in config"],
      ["Query compression dim", "1,536", "`q_lora_rank` in config"],
      ["Routed experts", "256", "per MoE layer"],
      ["Shared experts", "1", "always active — DeepSeekMoE"],
      ["Top-k routing", "8", "8 of 256 routed experts activated per token"],
      ["Vocabulary", "129,280", "config.json"],
      ["Context window", "128 K", "post-trained; pretrain 32 K → extended"],
      ["Training tokens", "14.8 T", "tech report §3"],
      ["Precision", "FP8 (mixed)", "tech report §6 — first FP8 frontier train"],
    ],
  },

  /* ── Attention: MLA ──────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Attention: Multi-head Latent Attention (MLA)", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "**Multi-head Latent Attention** (MLA, DeepSeek-V2, 2024) is the single most important " +
      "idea in this architecture. Where GQA reduces KV-cache cost by *sharing* key-value " +
      "heads across query heads, MLA takes a different route: it **projects the key and " +
      "value streams through a low-rank latent bottleneck** before caching them. Only the " +
      "compressed latent representation is stored in the KV cache; the full-rank K and V " +
      "used inside attention are reconstructed on-the-fly from the latent using a learned " +
      "up-projection.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The dimensionality tells the story. For DeepSeek V3, the `kv_lora_rank = 512` — meaning " +
      "each token's compressed KV representation is just 512 floats per layer, regardless of " +
      "how many attention heads the model uses. Combined with the 61-layer depth and the " +
      "additional RoPE-head dimension that MLA carries alongside the latent, the measured KV " +
      "cache comes out to **≈ 68.6 KiB per token at bf16** — a fraction of what a classical " +
      "MHA or even GQA configuration would need at this hidden size. The query path also uses " +
      "a low-rank projection (`q_lora_rank = 1,536`) for parameter efficiency, but this does " +
      "not affect inference memory because queries are recomputed each step.",
  },
  {
    __component: "deep.callout",
    variant: "insight",
    title: "Why MLA beats GQA at scale",
    body:
      "GQA's savings plateau once the KV-head count drops to 1 (i.e. MQA). MLA has **no such " +
      "floor**: you can keep shrinking `kv_lora_rank` until quality regresses. For hidden " +
      "sizes ≥ 5,000, MLA at rank 512 typically delivers 3–6× smaller KV cache than an " +
      "equivalent GQA configuration with no measurable loss in loss-per-token.",
  },

  /* ── Block Structure ─────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Block Structure & DeepSeekMoE", anchor: "block" },
  {
    __component: "deep.paragraph",
    body:
      "Each of the 61 transformer blocks combines an MLA attention block with a " +
      "**DeepSeekMoE** feed-forward block. DeepSeekMoE refines the classic sparse-MoE FFN in " +
      "two ways. First, **fine-grained experts**: instead of 8–16 large experts per layer, " +
      "DeepSeek splits each expert into multiple smaller sub-experts, dramatically increasing " +
      "the combinatorial diversity of the top-k routing distribution. Second, **shared " +
      "expert isolation**: one expert per layer is *always* active for every token, absorbing " +
      "common-pathway computation that would otherwise be duplicated across routed experts.",
  },
  {
    __component: "deep.code-block",
    language: "python",
    caption: "DeepSeek V3 MoE layer — top-8 of 256 routed + 1 always-on shared",
    code:
      "def deepseek_moe_layer(x):\n" +
      "    # 1. Shared expert — always computed for every token\n" +
      "    shared = shared_expert(x)                          # always on\n" +
      "\n" +
      "    # 2. Routed experts — top-k sparse activation\n" +
      "    scores = router(x)                                 # [batch, seq, 256]\n" +
      "    topk_experts, topk_weights = select_topk(scores, k=8)\n" +
      "\n" +
      "    routed = 0\n" +
      "    for expert_idx, weight in zip(topk_experts, topk_weights):\n" +
      "        routed += weight * routed_experts[expert_idx](x)\n" +
      "\n" +
      "    # 3. Combine shared + routed contributions\n" +
      "    return shared + routed",
  },
  {
    __component: "deep.paragraph",
    body:
      "The third piece of the DeepSeek V3 MoE story is **auxiliary-loss-free load balancing**. " +
      "Classical MoE training uses an auxiliary loss to punish routing imbalance (when one " +
      "expert gets starved or overloaded). That loss creates a subtle quality tax because it " +
      "pushes the router *away* from the tokens' actual best matches. V3 replaces it with a " +
      "per-expert **bias term** that is updated online during training — the bias nudges " +
      "underused experts upward and overused experts downward without contaminating the main " +
      "loss signal. This is one of V3's most-cited technical contributions.",
  },

  /* ── Inference Economics ─────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Inference Economics", anchor: "economics" },
  {
    __component: "deep.paragraph",
    body:
      "Because only 37 B of the 671 B parameters are touched per token, V3's inference FLOP " +
      "count per token is closer to a 40 B dense model than to a 671 B dense model. But the " +
      "memory footprint stays closer to the full-sparse total: you still need to hold all " +
      "671 B weights in HBM (or page them through fast NVMe) because the router can select " +
      "any of the 256 experts per layer per token. This asymmetry — cheap compute, expensive " +
      "memory — is why V3 popularized the 'many-GPU single-model' serving pattern that " +
      "earlier MoE research had only discussed in theory.",
  },

  /* ── Embeddings & RoPE ───────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Embeddings, RoPE, and Multi-Token Prediction", anchor: "embeddings" },
  {
    __component: "deep.paragraph",
    body:
      "DeepSeek V3 uses a 129,280-entry vocabulary derived from a byte-level BPE tokenizer " +
      "with heavy Chinese and code coverage. Position information is encoded via RoPE, but " +
      "MLA's latent bottleneck requires a subtle split: a small number of attention head " +
      "dimensions (`qk_rope_head_dim`) carry RoPE explicitly, while the rest of the head " +
      "operates on the compressed latent without RoPE. This is how the architecture preserves " +
      "position-sensitive attention through a low-rank bottleneck that would otherwise " +
      "collapse rotary information.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Pretraining also used **Multi-Token Prediction** (MTP) as an auxiliary objective: at " +
      "each position, the model predicts not just the next token but a small number of " +
      "future tokens through a lightweight auxiliary head. MTP is dropped at inference, but " +
      "the training signal improves data efficiency and, importantly, gives DeepSeek a " +
      "cleaner path to **speculative decoding** because the MTP heads can serve as a built-in " +
      "draft model.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The speculative-decoding payoff from MTP is not a footnote — it is the reason the " +
      "technique got published. A well-trained MTP head can predict two or three tokens " +
      "ahead with surprisingly high acceptance rates (the V3 tech report quotes ≈ 85–90% " +
      "second-token acceptance on common workloads), which in practice translates to a " +
      "1.6–1.8× wall-clock speedup on single-sequence decoding with no quality loss. " +
      "Because the draft model is literally the same weights as the main model, there is " +
      "also no draft-vs-verify drift — a chronic headache for speculative-decoding setups " +
      "that train a small draft model separately. This is one of the subtler reasons MTP " +
      "has started showing up in newer open-weight releases.",
  },

  /* ── Context Window ──────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Context Window: 32K Native → 128K Extended", anchor: "context" },
  {
    __component: "deep.paragraph",
    body:
      "V3 was pretrained at 32 K and then extended to 128 K in a post-training context-scaling " +
      "phase using a YaRN-family RoPE scaling recipe (DeepSeek adapted it for MLA's split-head " +
      "layout). The 68.6 KiB/token KV footprint is what makes 128 K economically tractable: " +
      "at the full window, KV cache is ≈ 8.8 GiB per sequence, vs the > 40 GiB a comparable " +
      "Llama-style GQA configuration would cost at this hidden size.",
  },

  /* ── Training ────────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Training: FP8 at Frontier Scale", anchor: "training" },
  {
    __component: "deep.paragraph",
    body:
      "V3 is the first publicly documented frontier-class model to be pretrained in **FP8** " +
      "mixed precision. Most layers run in FP8 for both forward and backward; a small set of " +
      "sensitive operations (embedding, output projection, normalization, softmax) stay in " +
      "bf16 or fp32. DeepSeek reports the full pretraining run took **2.788 M H800 GPU-hours** " +
      "(§6 of the tech report), a price point that was roughly 1/10 the compute cost of " +
      "comparable dense frontier runs at the time and directly forced the industry to " +
      "reassess 'compute = quality' scaling assumptions.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The FP8 story is worth lingering on because it is the part of V3 that is hardest to " +
      "copy. FP8 training requires careful per-tensor scaling (the dynamic range of E4M3 and " +
      "E5M2 is small enough that unscaled accumulators blow up), fine-grained loss-scaling " +
      "per-layer rather than per-model, and custom kernels for the sensitive operations that " +
      "stay in higher precision. DeepSeek's tech report details a **tile-wise scaling** " +
      "scheme that tracks activation statistics at block granularity and adjusts FP8 scale " +
      "factors online — this is the first published recipe for doing FP8 at this scale " +
      "without dropping to bf16 fallbacks every few steps.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Post-training followed the standard SFT → DPO pipeline, with the important addition " +
      "of a **long-context supervised stage** that specifically targets the 128 K window. " +
      "The resulting Instruct model (`DeepSeek-V3-Instruct`) is what practitioners actually " +
      "deploy; the base model is rarely used directly. DeepSeek also explicitly notes that " +
      "they dropped PPO-style RLHF in favor of a reference-free DPO variant, citing both " +
      "training stability and the fact that a large sparse MoE has enough expressive capacity " +
      "to absorb preference signal without needing a separate reward model.",
  },

  /* ── Verdict ─────────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Verdict: The Sparse Blueprint", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "DeepSeek V3 is the rare model where almost every design choice turned out to matter " +
      "enough for other labs to copy. MLA is now the default KV-compression choice for large " +
      "MoE models (see GLM-5, Kimi Linear's full-attention layers, Qwen3-Next's gated " +
      "attention path). Auxiliary-loss-free routing is now standard. FP8 pretraining is " +
      "no longer exotic. Fine-grained + shared experts is the default DeepSeekMoE recipe. " +
      "When you read GLM-5 next and see 'MLA + Sparse Attention,' you are looking at a direct " +
      "extension of V3 — GLM-5 swaps in a sparsified attention kernel on top of DeepSeek's " +
      "latent-compression backbone.",
  },

  /* ── References ──────────────────────────────────────────────── */
  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "DeepSeek-V3 Technical Report — arXiv:2412.19437",
        url: "https://arxiv.org/abs/2412.19437",
      },
      {
        label: "DeepSeek-V3 — HuggingFace config.json",
        url: "https://huggingface.co/deepseek-ai/DeepSeek-V3/blob/main/config.json",
      },
      {
        label: "DeepSeek-V2: Mixture-of-Experts with MLA (origin of MLA & DeepSeekMoE) — arXiv:2405.04434",
        url: "https://arxiv.org/abs/2405.04434",
      },
      {
        label: "Auxiliary-Loss-Free Load Balancing for MoE — DeepSeek (2024)",
        url: "https://arxiv.org/abs/2408.15664",
      },
      {
        label: "GShard / Switch Transformer (MoE foundation) — arXiv:2006.16668",
        url: "https://arxiv.org/abs/2006.16668",
      },
      {
        label: "FP8 Formats for Deep Learning — NVIDIA/Intel/Arm",
        url: "https://arxiv.org/abs/2209.05433",
      },
    ],
  },
];
