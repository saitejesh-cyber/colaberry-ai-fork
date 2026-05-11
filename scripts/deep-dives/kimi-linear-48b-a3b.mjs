/**
 * Deep-dive content for `kimi-linear-48b-a3b`.
 *
 * Sprint v4 flagship. Sources (per content source policy):
 *   - Kimi Linear Technical Report — arXiv:2510.26692
 *   - HuggingFace `moonshotai/Kimi-Linear-48B-A3B-Base/config.json`
 *   - DeepSeek-V2 paper — arXiv:2405.04434 (origin of MLA, which Kimi reuses)
 *   - Gated DeltaNet / linear-attention foundations — arXiv:2412.06464
 */

export const slug = "kimi-linear-48b-a3b";

export const blocks = [
  /* ── Overview ────────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Kimi Linear 48B-A3B is Moonshot AI's bet that **linear attention is finally ready for " +
      "production** at meaningful scale. It is a 48 B-parameter / 3 B-active MoE with a " +
      "**hybrid attention stack**: most layers use a new linear-time attention variant called " +
      "**Kimi Delta Attention** (KDA), and every fourth layer swaps in Multi-head Latent " +
      "Attention (MLA, inherited from DeepSeek V2) to preserve the global dependency structure " +
      "that pure linear attention tends to lose. The result is a model that can carry a " +
      "**1 M-token context window** on a KV-cache footprint of just **7.9 KiB per token** — " +
      "roughly an order of magnitude smaller than any softmax-attention frontier model at " +
      "comparable quality.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The architectural thesis is worth stating directly: softmax attention is quadratic in " +
      "sequence length, but the thing you *actually* pay for at inference is the KV cache, " +
      "which is **linear** in sequence length. Linear-attention variants eliminate the " +
      "quadratic compute cost *and* reduce the cache to a constant-size recurrent state. The " +
      "long-standing objection has been quality at frontier scale. Kimi Linear is Moonshot's " +
      "answer: keep MLA around for a small number of anchor layers, use KDA for everything " +
      "else, and recover essentially all of the softmax baseline's quality.",
  },

  /* ── Architecture at a Glance ────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Kimi Linear 48B-A3B configuration (source: HuggingFace config.json + arXiv 2510.26692)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "48 B", "tech report"],
      ["Active parameters / token", "3 B", "MoE — one of the sparsest large models in release"],
      ["Layer mix", "20 KDA + 7 MLA (27 total)", "3:1 ratio — KDA for every 3 blocks, MLA for every 4th"],
      ["KDA attention", "Kimi Delta Attention", "linear — O(N) compute, constant-size recurrent state"],
      ["MLA attention", "Multi-head Latent Attention", "inherited from DeepSeek V2, used as anchor blocks"],
      ["Vocabulary", "163,840", "config.json"],
      ["Context window", "1,048,576 tokens (1 M)", "tech report"],
      ["KV cache / token", "≈ 7.9 KiB", "dominated by the 7 MLA layers — KDA layers contribute ~0"],
      ["Decoder type", "MoE", "sparse routed experts"],
    ],
  },

  /* ── Attention ───────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Attention: Hybrid KDA + MLA (3:1 Mix)", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "The central innovation is **Kimi Delta Attention** (KDA), a linear-attention family " +
      "member in the lineage of Linear Transformers (Katharopoulos et al., 2020), " +
      "DeltaNet (Schlag et al., 2021), and Gated DeltaNet (Yang et al., 2024). Instead of " +
      "computing a full sequence-by-sequence softmax over query-key inner products, KDA " +
      "maintains a **compact recurrent state matrix** that is updated token-by-token using a " +
      "delta-rule learning step. The formal update is effectively `S ← S + β · (v − S · k) · kᵀ`, " +
      "where the gating coefficient β is learned per-head, per-token. This update rule lets " +
      "the state selectively overwrite stale associations, which is the critical difference " +
      "between KDA and vanilla linear attention: vanilla Linear Transformers just " +
      "accumulate, so old tokens never get forgotten and the state saturates.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The KDA recurrent state has **no dependency on sequence length** — you read it in " +
      "O(1) per token, and the 'attention' computation is a matrix multiplication against " +
      "that state rather than against a growing cache. This is why 20 out of 27 layers " +
      "contribute essentially zero to the per-token KV-cache footprint. The entire 7.9 KiB/" +
      "token measurement comes from the 7 MLA layers.",
  },
  {
    __component: "deep.callout",
    variant: "insight",
    title: "Why hybrid instead of pure linear?",
    body:
      "Pure linear-attention architectures consistently underperform softmax baselines on " +
      "tasks that require **precise long-range retrieval** — needle-in-a-haystack, exact " +
      "copying, citation lookup. Moonshot's tech report shows that dropping MLA to zero " +
      "blocks collapses these evals. Keeping 7 MLA layers (≈ 26% of depth) recovers almost " +
      "all of the softmax baseline's retrieval quality while keeping 74% of layers at O(N) " +
      "compute. The 3:1 ratio is not arbitrary — it is the smallest MLA share that preserves " +
      "retrieval across their eval suite.",
  },
  {
    __component: "deep.table",
    caption: "KV cache footprint comparison at 1 M context (bf16)",
    headers: ["Model", "KV / token", "KV at 1 M tokens"],
    rows: [
      ["Llama 3.2 3B (GQA, 28 layers)", "≈ 112 KiB", "≈ 110 GiB"],
      ["DeepSeek V3 (MLA, 61 layers)", "≈ 68.6 KiB", "≈ 67 GiB"],
      ["**Kimi Linear** (KDA + MLA 3:1)", "**≈ 7.9 KiB**", "**≈ 7.7 GiB**"],
    ],
  },

  /* ── Block Structure ─────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Block Structure", anchor: "block" },
  {
    __component: "deep.paragraph",
    body:
      "The block stack alternates deterministically: three KDA blocks, then one MLA block, " +
      "repeated across the 27 layers to yield 20 KDA and 7 MLA. Every block uses pre-norm " +
      "RMSNorm around its attention and FFN paths, matching the Llama-family conventions. " +
      "The MoE FFN sits on top of both attention variants unchanged — from the FFN's " +
      "perspective, KDA and MLA produce tensors of the same shape.",
  },
  {
    __component: "deep.code-block",
    language: "python",
    caption: "Kimi Linear hybrid block stack (pseudocode)",
    code:
      "# 27-layer stack with 3:1 KDA:MLA ratio (20 KDA + 7 MLA)\n" +
      "def kimi_linear_stack(x):\n" +
      "    state = init_kda_recurrent_state()   # small, constant size\n" +
      "    kv_cache = init_mla_cache()          # latent-compressed, grows with seq\n" +
      "\n" +
      "    for layer_idx in range(27):\n" +
      "        if (layer_idx + 1) % 4 == 0:\n" +
      "            # Anchor block — full softmax via MLA\n" +
      "            x, kv_cache = mla_block(x, kv_cache)\n" +
      "        else:\n" +
      "            # Linear block — O(1) recurrent state update\n" +
      "            x, state = kda_block(x, state)\n" +
      "        x = moe_ffn(x)\n" +
      "    return x",
  },

  /* ── Experts ─────────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Experts: Sparse MoE with 94% Sparsity", anchor: "ffn" },
  {
    __component: "deep.paragraph",
    body:
      "With 48 B total parameters and just 3 B active per token, Kimi Linear has one of the " +
      "highest sparsity ratios of any released open model — roughly **94% of parameters sit " +
      "idle for any given token**. The MoE architecture inherits the DeepSeekMoE recipe: " +
      "fine-grained routed experts plus a small number of shared experts that fire " +
      "unconditionally. This pairing with the hybrid attention stack is what makes the " +
      "'48B/A3B' label meaningful: the active compute per token is small in both directions " +
      "— linear-time attention and sparse FFN.",
  },

  /* ── Context ─────────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Context Window: 1 M Tokens Natively", anchor: "context" },
  {
    __component: "deep.paragraph",
    body:
      "Kimi Linear targets **1,048,576 tokens** (2²⁰) as its native context window, not a " +
      "post-hoc extension. The architecture's whole point is to make long context affordable " +
      "at training time as well as inference, and the 1 M budget is chosen to leapfrog the " +
      "256K class that Qwen3-Next and GLM-5 occupy. At 1 M tokens, the ≈ 7.7 GiB KV footprint " +
      "is smaller than Llama 3.2 3B's 8K-token KV plus model weights combined — a direct " +
      "consequence of keeping 74% of layers in KDA's constant-state regime.",
  },

  /* ── Historical Lineage ──────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Historical Lineage: Why Linear Attention, Why Now", anchor: "history" },
  {
    __component: "deep.paragraph",
    body:
      "Linear attention has been a research target since Katharopoulos et al.'s 2020 " +
      "'Transformers are RNNs' paper, which proved that softmax attention could be replaced " +
      "with a kernel-feature-map variant that admits an O(N) recurrent-state form. The first " +
      "wave of results was underwhelming: pure linear-attention models consistently trailed " +
      "softmax baselines by several percentage points on standard language-modeling " +
      "benchmarks, and the gap widened on tasks requiring precise copying. DeltaNet (2021) " +
      "and its gated successors (Gated DeltaNet, 2024) closed most of that gap by introducing " +
      "learned forget gates, but until Kimi Linear the community had no release-scale " +
      "demonstration that the approach worked at frontier parameter counts with real-world " +
      "post-training.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Kimi Linear's contribution is therefore less about inventing KDA and more about " +
      "**proving the hybrid recipe works end-to-end**: a 48 B-parameter MoE, a 1 M-token " +
      "native context, and full Instruct post-training, all on a 3:1 KDA:MLA backbone that " +
      "a competent team can reproduce. That operational proof — and the 7.9 KiB/token cache " +
      "figure that goes with it — is why this model is in the flagship set rather than " +
      "sitting in the research-curiosity tier.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The **kernel implementation** of KDA is the piece that the tech report dwells on most, " +
      "because it is where the theoretical O(N) cost actually has to survive contact with GPU " +
      "memory hierarchies. A naive KDA implementation reads the recurrent state from HBM at " +
      "every token, which destroys the linear-compute advantage in practice; Kimi's kernel " +
      "instead keeps the state resident in SRAM across a chunk of tokens and only flushes at " +
      "chunk boundaries. This is essentially FlashAttention's 'tile-and-recompute' idea ported " +
      "to a recurrent-state architecture. The result is that KDA's prefill throughput at 256 K " +
      "tokens is roughly 3–5× faster than a comparable softmax block, and the gap widens " +
      "monotonically as the sequence gets longer.",
  },

  /* ── Training ────────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Training", anchor: "training" },
  {
    __component: "deep.paragraph",
    body:
      "Training follows the Moonshot Kimi K-series recipe with MoE-specific adaptations for " +
      "the hybrid-attention backbone. Pretraining uses a mixed Chinese/English corpus with " +
      "heavy code and mathematics weighting, followed by a staged long-context curriculum " +
      "that gradually expands the effective sequence length used during training. The long-" +
      "context stage is what pins KDA's delta-rule gating into a stable regime — without " +
      "staged curriculum, the learned gates drift and long-range retrieval degrades.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Post-training adds a long-context supervised fine-tuning phase that specifically " +
      "targets retrieval, tool-use, and multi-document synthesis at 256 K+ contexts. The " +
      "Instruct variant is what Moonshot ships as the default user-facing model; the base " +
      "model is primarily released for research and further fine-tuning. Because the 3:1 " +
      "hybrid ratio pushes most layers onto KDA's O(N) path, the effective training " +
      "wall-clock cost at long contexts is dramatically lower than a softmax baseline of " +
      "comparable depth — a second reason the long-context curriculum is practical at all.",
  },

  /* ── Verdict ─────────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Verdict: The Linear-Attention Pivot", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Kimi Linear is the first released model where a linear-attention variant carries the " +
      "bulk of the compute and the result is not a quality regression — it is a clean " +
      "trade: slightly more engineering complexity (two attention kernels, state management, " +
      "staged curriculum) in exchange for a 10× KV-cache reduction and a native 1 M context. " +
      "Expect to see the KDA-style gated delta rule copied into later releases from Moonshot " +
      "and others — and expect the 3:1 hybrid ratio to become a reference design point for " +
      "'linear-attention-first' models the way GQA 3:1 is the reference for compact dense " +
      "decoders.",
  },
  {
    __component: "deep.callout",
    variant: "note",
    title: "Compare next",
    body:
      "Qwen3-Next 80B-A3B uses the same 3:1 hybrid idea but with **Gated DeltaNet** instead " +
      "of KDA and **Gated Attention** instead of MLA. Read them back-to-back — the " +
      "architectural space is narrower than the marketing suggests.",
  },

  /* ── References ──────────────────────────────────────────────── */
  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Kimi Linear Technical Report — arXiv:2510.26692",
        url: "https://arxiv.org/abs/2510.26692",
      },
      {
        label: "Kimi Linear 48B-A3B Base — HuggingFace config.json",
        url: "https://huggingface.co/moonshotai/Kimi-Linear-48B-A3B-Base/blob/main/config.json",
      },
      {
        label: "Transformers are RNNs: Linear Attention (Katharopoulos et al., 2020) — arXiv:2006.16236",
        url: "https://arxiv.org/abs/2006.16236",
      },
      {
        label: "Linear Transformers with Learnable Kernels / DeltaNet (Schlag et al., 2021) — arXiv:2102.11174",
        url: "https://arxiv.org/abs/2102.11174",
      },
      {
        label: "Gated DeltaNet (Yang et al., 2024) — arXiv:2412.06464",
        url: "https://arxiv.org/abs/2412.06464",
      },
      {
        label: "DeepSeek-V2 — Origin of MLA — arXiv:2405.04434",
        url: "https://arxiv.org/abs/2405.04434",
      },
    ],
  },
];
