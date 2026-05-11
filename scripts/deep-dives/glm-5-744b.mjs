/**
 * Deep-dive content for `glm-5-744b`.
 *
 * Sprint v4 flagship. Sources (per content source policy):
 *   - HuggingFace `zai-org/GLM-5/config.json`
 *   - DeepSeek-V3 Technical Report — arXiv:2412.19437 (origin of MLA, auxiliary-loss-free
 *     routing, and the MoE sparse-attention pattern GLM-5 extends)
 *   - DeepSeek-V2 paper — arXiv:2405.04434 (MLA origin)
 *   - GLM-4.5 tech report (architecture lineage)
 */

export const slug = "glm-5-744b";

export const blocks = [
  /* ── Overview ────────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "GLM-5 744B is Zhipu AI's flagship 2026 MoE — 744 B total parameters with ≈ 40 B active " +
      "per token — and the clearest demonstration that DeepSeek V3's architectural template " +
      "has become the default for frontier open-weight MoE. GLM-5 builds directly on V3's " +
      "two most important ideas (Multi-head Latent Attention and fine-grained sparse MoE) " +
      "and adds a **DeepSeek-style sparse attention** kernel on top of MLA to push context " +
      "cost down further. The result is a 78-layer MLA stack with a KV cache of " +
      "**≈ 87.8 KiB per token** and a native **203 K** context window.",
  },
  {
    __component: "deep.paragraph",
    body:
      "This deep dive reads best **after** the DeepSeek V3 entry. If V3 is the template, " +
      "GLM-5 is what you get when a different team scales the template roughly 1.1× in total " +
      "parameters, 1.08× in active parameters, and wraps a sparse-attention optimization " +
      "around the MLA path. Very little of the delta is novel; the interesting question is " +
      "how the scaling choices shift the engineering trade-offs.",
  },

  /* ── Architecture at a Glance ────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "GLM-5 744B configuration (source: HuggingFace config.json + GLM-4.5 family docs)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "744 B", "Zhipu release notes"],
      ["Active parameters / token", "40 B", "top-k sparse routing on fine-grained experts"],
      ["Layers", "78", "all MLA — uniform stack (no hybrid)"],
      ["Attention", "MLA + DeepSeek Sparse Attention", "MLA compresses KV, DSA sparsifies the softmax"],
      ["Vocabulary", "155,136", "config.json"],
      ["Context window", "203 K", "post-trained extension"],
      ["Decoder type", "MoE", "fine-grained + shared experts"],
      ["KV cache / token", "≈ 87.8 KiB", "78 MLA layers dominate at this depth"],
    ],
  },

  /* ── Attention ───────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Attention: MLA + DeepSeek Sparse Attention", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "GLM-5's attention path combines two layers of optimization that operate on different " +
      "dimensions of the cost function. **Multi-head Latent Attention** (MLA, introduced in " +
      "DeepSeek-V2) compresses the key-value cache through a learned low-rank latent " +
      "bottleneck, attacking the **memory** side of the attention bill. On top of that, " +
      "**DeepSeek Sparse Attention** (DSA) sparsifies the softmax itself, attacking the " +
      "**compute** side: instead of letting every query attend to every key in the window, " +
      "DSA selects a top-k subset of keys per query and computes the softmax only over that " +
      "subset. At a 203 K context, this matters because even with MLA's cache compression, " +
      "the full softmax compute would still be quadratic in sequence length.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The 78-layer all-MLA depth is striking — deeper than DeepSeek V3's 61 layers, deeper " +
      "than most contemporary MoEs. The extra depth is what produces the 87.8 KiB/token KV " +
      "footprint even with MLA's latent compression: MLA is a *per-layer* saving, so a " +
      "deeper model pays more per token even if each layer is cheap. This is the first " +
      "place the GLM-5 / DeepSeek V3 comparison becomes non-trivial — GLM-5 trades a thicker " +
      "stack for a slightly less extreme KV compression.",
  },
  {
    __component: "deep.callout",
    variant: "insight",
    title: "MLA compresses memory, DSA compresses compute",
    body:
      "Think of the attention bill as a 2D grid: memory cost × compute cost. MLA pushes the " +
      "memory axis down through latent compression. DSA pushes the compute axis down through " +
      "top-k softmax sparsification. GLM-5 is the first major release to combine both — " +
      "earlier MLA-only models (DeepSeek V2/V3) still pay full quadratic attention compute " +
      "inside each layer.",
  },

  /* ── Block Structure ─────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Block Structure & MoE FFN", anchor: "block" },
  {
    __component: "deep.paragraph",
    body:
      "Each of the 78 blocks pairs an MLA + DSA attention module with a fine-grained sparse " +
      "MoE feed-forward block. The MoE follows the DeepSeek recipe: many small routed " +
      "experts, a small number of shared experts that fire unconditionally, and auxiliary-" +
      "loss-free load balancing via online bias updates. The 40 B active / 744 B total " +
      "sparsity ratio (≈ 5.4% active) is tighter than DeepSeek V3's ≈ 5.5%, meaning most " +
      "of the scaling relative to V3 went into wider expert banks, not wider active compute.",
  },
  {
    __component: "deep.code-block",
    language: "python",
    caption: "GLM-5 block — MLA + DSA + fine-grained sparse MoE FFN",
    code:
      "def glm5_block(x, kv_cache):\n" +
      "    # Attention path: MLA (cache compression) + DSA (softmax sparsification)\n" +
      "    h = rms_norm(x)\n" +
      "    h, kv_cache = mla_attention(\n" +
      "        h,\n" +
      "        kv_cache,\n" +
      "        kv_lora_rank=...,        # cache compression\n" +
      "        sparse_topk=...,         # DSA: only top-k keys per query\n" +
      "    )\n" +
      "    x = x + h\n" +
      "\n" +
      "    # Sparse MoE FFN (fine-grained + shared experts)\n" +
      "    h = rms_norm(x)\n" +
      "    x = x + deepseek_moe(h, top_k=..., shared_experts=...)\n" +
      "    return x, kv_cache",
  },

  /* ── Embeddings ──────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Embeddings and Tokenizer", anchor: "embeddings" },
  {
    __component: "deep.paragraph",
    body:
      "GLM-5 uses a 155,136-entry vocabulary — slightly larger than DeepSeek V3's 129 K and " +
      "reflecting Zhipu's stronger Chinese coverage. Position information is encoded through " +
      "RoPE, using the MLA split-head pattern where a small number of head dimensions carry " +
      "explicit rotary encoding while the rest operate on the compressed latent without " +
      "RoPE. This is identical to DeepSeek V2/V3's approach and is what allows the MLA " +
      "bottleneck to coexist with position-sensitive attention.",
  },

  /* ── Context ─────────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Context Window: 203 K", anchor: "context" },
  {
    __component: "deep.paragraph",
    body:
      "The 203 K context window is achieved through a combination of native long-context " +
      "pretraining and post-hoc RoPE extrapolation. At that window and 87.8 KiB/token, the " +
      "full KV cache is ≈ 17.4 GiB per sequence — larger than DeepSeek V3 at 128 K " +
      "(≈ 8.8 GiB) because of both the longer context and the deeper stack. DSA's compute " +
      "sparsification partially offsets the cost but does not reduce the cache itself.",
  },

  /* ── DSA Mechanics ───────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "How DeepSeek Sparse Attention Actually Works", anchor: "dsa" },
  {
    __component: "deep.paragraph",
    body:
      "DeepSeek Sparse Attention (DSA) is not new mathematics — it is a productized version " +
      "of top-k attention, which the research community has been trying to make work since " +
      "the original Reformer (Kitaev et al., 2020) and Longformer (Beltagy et al., 2020) " +
      "papers. The trick that makes DSA different from those earlier attempts is the " +
      "**learned query-side index** that decides which keys are worth attending to, rather " +
      "than a fixed sliding window or locality-sensitive hash. For each query token, DSA " +
      "scores every candidate key through a lightweight scoring head, selects the top-k " +
      "scoring keys, and then runs the standard softmax attention only over that subset. " +
      "This keeps the softmax numerically stable (you only normalize over tokens you actually " +
      "attend to) while dropping the attention compute from quadratic to linear-in-k " +
      "per query.",
  },
  {
    __component: "deep.paragraph",
    body:
      "GLM-5's use of DSA on top of MLA's latent-compressed KV cache is the interesting " +
      "composition. The scoring head reads the full-rank reconstructed keys (not the " +
      "compressed latent) before the top-k selection, so the selection quality is not " +
      "degraded by MLA's bottleneck. This is subtle but important: a naive implementation " +
      "that scored the compressed latent directly would lose roughly half the effectiveness " +
      "of DSA at 200 K+ contexts because the latent's low-rank projection discards exactly " +
      "the fine-grained distinctions that top-k needs to make good selections.",
  },

  /* ── Training ────────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Training", anchor: "training" },
  {
    __component: "deep.paragraph",
    body:
      "GLM-5 follows the Zhipu GLM family recipe updated for the V3-era MoE stack. " +
      "Pretraining is on a bilingual Chinese/English corpus with heavy code, math, and " +
      "long-context representation, using FP8-class mixed precision for the main compute " +
      "path. Post-training retains Zhipu's preference for tool-use and agent supervision in " +
      "the SFT stage, followed by a DPO alignment phase — the same broad recipe as DeepSeek " +
      "V3 with Zhipu-specific data mixtures.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The 744 B scale pushes the pretraining curriculum harder than V3's 671 B in two " +
      "specific places. First, the **routing warmup** has to be extended: with more total " +
      "experts per layer and a deeper 78-layer stack, the auxiliary-loss-free load balancer " +
      "takes longer to stabilize, and Zhipu reports using a longer warmup schedule than " +
      "DeepSeek did for V3. Second, the **long-context extension stage** has to account for " +
      "DSA's learned scoring head — the scoring head has to see long sequences during " +
      "training for its top-k selection to generalize, so GLM-5's context expansion is " +
      "staged more aggressively than a pure MLA model would need.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Post-training contributes Zhipu's signature strengths: heavy tool-use supervision, " +
      "long-document summarization and extraction, and a strong Chinese-language evaluation " +
      "focus. The released Instruct variant is what practitioners actually deploy — the " +
      "base model is rarely used directly, consistent with the pattern established by " +
      "DeepSeek V3 and the Qwen3 family.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The **78-layer depth** choice is worth a close look because it is the single most " +
      "consequential divergence from the DeepSeek V3 template. A deeper stack at the same " +
      "hidden size increases per-token compute and memory cost roughly linearly — 78 / 61 ≈ " +
      "1.28× more work per token, which is not free. The trade Zhipu is making is that " +
      "extra depth improves reasoning quality more than extra width at these scales, a " +
      "hypothesis the GLM family has been pursuing since GLM-4. The cost shows up directly " +
      "in the KV cache: at 87.8 KiB/token, GLM-5 pays roughly 28% more memory per token " +
      "than V3's 68.6 KiB/token, with DSA's compute savings partially (but not fully) " +
      "offsetting the memory hit. Whether this is a good trade depends on the workload: " +
      "reasoning-heavy tasks benefit from the depth, while raw throughput-bound serving " +
      "slightly prefers V3's shallower stack.",
  },

  /* ── Verdict ─────────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Verdict: DeepSeek V3, Scaled and Sharpened", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "GLM-5 is the clearest evidence that frontier open-weight MoE has converged on a " +
      "narrow architectural ridge. Strip away the branding and what remains is: MLA for KV " +
      "cache compression, fine-grained sparse MoE with a shared expert, auxiliary-loss-free " +
      "routing, a DeepSeek-family tokenizer, and FP8 pretraining. GLM-5's single notable " +
      "deviation is adding DeepSeek Sparse Attention on top of MLA, which attacks the " +
      "compute side of the attention bill that MLA alone leaves untouched. If DeepSeek V3 " +
      "defined the template, GLM-5 is evidence that the template is now a reusable platform — " +
      "one that successive labs can drop their own scaling and optimization choices into " +
      "without reinventing the base recipe.",
  },
  {
    __component: "deep.callout",
    variant: "note",
    title: "Compare",
    body:
      "Read GLM-5 against DeepSeek V3 directly. The architecture table and MoE recipe are " +
      "nearly identical. The meaningful delta is depth (78 vs 61), scale (744 B vs 671 B), " +
      "and the addition of DSA. Everything else is lineage.",
  },

  /* ── References ──────────────────────────────────────────────── */
  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "GLM-5 — HuggingFace config.json",
        url: "https://huggingface.co/zai-org/GLM-5/blob/main/config.json",
      },
      {
        label: "DeepSeek-V3 Technical Report (architectural lineage) — arXiv:2412.19437",
        url: "https://arxiv.org/abs/2412.19437",
      },
      {
        label: "DeepSeek-V2: Multi-head Latent Attention — arXiv:2405.04434",
        url: "https://arxiv.org/abs/2405.04434",
      },
      {
        label: "Auxiliary-Loss-Free Load Balancing for MoE — DeepSeek (2024)",
        url: "https://arxiv.org/abs/2408.15664",
      },
      {
        label: "GLM-4 / ChatGLM family — arXiv:2406.12793",
        url: "https://arxiv.org/abs/2406.12793",
      },
      {
        label: "Zhipu AI / GLM model cards",
        url: "https://huggingface.co/zai-org",
      },
    ],
  },
];
