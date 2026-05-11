/**
 * Deep-dive content for `qwen3-next-80b-a3b`.
 *
 * Sprint v4 flagship. Sources (per content source policy):
 *   - HuggingFace `Qwen/Qwen3-Next-80B-A3B-Instruct/config.json`
 *   - Qwen3 Technical Report — arXiv:2505.09388
 *   - Gated DeltaNet — arXiv:2412.06464 (attention family)
 *   - Qwen3-Next release blog (Alibaba Qwen Team, 2025)
 */

export const slug = "qwen3-next-80b-a3b";

export const blocks = [
  /* ── Overview ────────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-Next 80B-A3B is Alibaba's hybrid-attention MoE flagship — a deliberate parallel " +
      "to Moonshot's Kimi Linear but built from a different set of building blocks. It has " +
      "**80 B total parameters with 3 B active per token**, a **3:1 Gated DeltaNet ↔ Gated " +
      "Attention** layer mix, and a **262 K-token** native context window. Where Kimi Linear " +
      "pairs Kimi Delta Attention with MLA, Qwen3-Next pairs **Gated DeltaNet** " +
      "(a linear-attention variant in the DeltaNet family) with **Gated Attention** " +
      "(a softmax-attention variant that adds an output gate on top of the attention mix). " +
      "The hybrid ratio is the same 3:1 — linear for three of every four blocks, " +
      "full-attention for the fourth.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Reading this immediately after the Kimi Linear deep dive is the intended experience. " +
      "Both models converge on the same design insight — that the linear-attention community's " +
      "long-standing quality gap closes once you interleave a small fraction of softmax-style " +
      "'anchor' blocks — but each team fills in the boxes with its own preferred primitive.",
  },

  /* ── Architecture at a Glance ────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Qwen3-Next 80B-A3B configuration (source: HuggingFace config.json + Qwen blog)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "80 B", "Qwen blog"],
      ["Active parameters / token", "3 B", "MoE"],
      ["Layer mix", "36 DeltaNet + 12 Gated Attention (48 total)", "3:1 hybrid ratio"],
      ["Linear-attention path", "Gated DeltaNet", "O(N) compute, recurrent state"],
      ["Full-attention path", "Gated Attention", "softmax + learned output gate"],
      ["Vocabulary", "151,936", "config.json"],
      ["Context window", "262,144 tokens (256 K)", "native, no post-hoc extension"],
      ["KV cache / token", "≈ 24 KiB", "dominated by the 12 Gated Attention layers"],
      ["Decoder type", "MoE", "sparse routed experts"],
    ],
  },

  /* ── Attention ───────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Attention: Gated DeltaNet + Gated Attention", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "The linear-attention blocks use **Gated DeltaNet** (Yang et al., 2024), which is a " +
      "cousin of Kimi's KDA in the same DeltaNet family tree. Both variants start from the " +
      "delta-rule recurrent-state update introduced by Schlag et al. (2021) and add a gating " +
      "mechanism that lets the model selectively overwrite stored associations rather than " +
      "monotonically accumulate them. The practical effect — a constant-size state, O(N) " +
      "compute, and strong long-range associative recall — is shared across the family. The " +
      "distinguishing detail is the gate parametrization: Gated DeltaNet uses a learned " +
      "per-head scalar gate plus a channel-wise decay, which is simpler to train but slightly " +
      "less expressive than KDA's fine-grained beta gating.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The full-attention blocks use **Gated Attention** — a softmax attention block with an " +
      "additional elementwise **output gate** applied after the attention readout and before " +
      "the residual add. The output gate's job is to let the model suppress the attention " +
      "block's contribution for tokens where attention is a bad fit (for example, when the " +
      "residual stream already contains the right answer and attention would add noise). In " +
      "a pure-softmax model this trick is small; in a hybrid model where Gated Attention is " +
      "the minority path, giving it an explicit off-switch lets it specialize in precisely " +
      "the situations where DeltaNet struggles — long-range lookups, exact copying, precise " +
      "retrieval.",
  },
  {
    __component: "deep.callout",
    variant: "insight",
    title: "The convergent 3:1 hybrid",
    body:
      "Both Kimi Linear (27 layers, 20 KDA + 7 MLA) and Qwen3-Next (48 layers, 36 DeltaNet + " +
      "12 Gated Attention) landed on the **same 3:1 linear-to-softmax ratio** independently. " +
      "The specific primitives differ but the structural answer is identical: one softmax " +
      "block for every three linear blocks is enough to preserve long-range retrieval while " +
      "pushing the bulk of compute onto the linear path.",
  },

  /* ── Block Structure ─────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Block Structure & MoE FFN", anchor: "block" },
  {
    __component: "deep.paragraph",
    body:
      "Each block follows the now-universal pre-norm recipe: RMSNorm → (Gated DeltaNet | " +
      "Gated Attention) → residual → RMSNorm → MoE FFN → residual. The FFN uses a sparse " +
      "Mixture-of-Experts routing similar in spirit to Qwen2-MoE and DeepSeekMoE, with " +
      "fine-grained experts and a small number of shared experts always active. The sparsity " +
      "ratio — 3 B active out of 80 B total — is one of the most aggressive in the released " +
      "open-weight field, on par with Kimi Linear's 48B/A3B.",
  },
  {
    __component: "deep.code-block",
    language: "python",
    caption: "Qwen3-Next hybrid stack layout (pseudocode)",
    code:
      "# 48-layer stack, 3:1 linear-to-softmax ratio\n" +
      "#   blocks 0,1,2 = Gated DeltaNet\n" +
      "#   block 3       = Gated Attention\n" +
      "#   repeat ×12 → 36 DeltaNet + 12 Gated Attention\n" +
      "def qwen3_next_stack(x):\n" +
      "    state = init_deltanet_state()   # O(1) per layer\n" +
      "    kv_cache = init_attn_cache()    # only the 12 gated-attn layers populate this\n" +
      "\n" +
      "    for layer_idx in range(48):\n" +
      "        if (layer_idx + 1) % 4 == 0:\n" +
      "            x, kv_cache = gated_attention_block(x, kv_cache)\n" +
      "        else:\n" +
      "            x, state = gated_deltanet_block(x, state)\n" +
      "        x = moe_ffn_sparse(x)       # 3 B active of 80 B total\n" +
      "    return x",
  },

  /* ── Embeddings & Position ───────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Embeddings, RoPE, and Positional Handling", anchor: "embeddings" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-Next uses a 151,936-entry vocabulary (shared with the rest of the Qwen3 family) " +
      "and RoPE for position information. The interesting wrinkle is that RoPE behaves " +
      "differently in the linear-attention path than in the softmax path: for the Gated " +
      "Attention blocks, RoPE is applied exactly as in Llama-family models; for the Gated " +
      "DeltaNet blocks, position is encoded implicitly through the recurrent state and the " +
      "learned channel-wise decay, which naturally attenuates older positions. This means " +
      "there is **no single 'context length cap' imposed by RoPE scaling** — the 256 K window " +
      "is determined by training curriculum and memory, not by how many rotation periods " +
      "you can stretch a position embedding across.",
  },

  /* ── Context ─────────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Context Window: 256 K Natively", anchor: "context" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-Next is trained natively at 262,144 tokens, the same ballpark as GLM-5's 203 K " +
      "and an order of magnitude short of Kimi Linear's 1 M. The ≈ 24 KiB/token KV-cache " +
      "footprint comes out to ≈ 6.3 GiB for a full 256 K sequence — small enough to fit " +
      "single-GPU inference at bf16 with reasonable headroom for the rest of the serving " +
      "stack. The choice of 256 K over 1 M is a deliberate product decision: it keeps the " +
      "training curriculum tractable while still covering the overwhelming majority of " +
      "real-world long-document workloads.",
  },

  /* ── Convergence with Kimi Linear ────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Direct Comparison with Kimi Linear", anchor: "compare-kimi" },
  {
    __component: "deep.paragraph",
    body:
      "The two hybrid flagships are worth lining up side by side because their differences " +
      "are almost entirely in the primitives, not the structure. Qwen3-Next chooses " +
      "**Gated DeltaNet** for its linear path; Kimi Linear chooses **Kimi Delta Attention**, " +
      "which adds a more expressive per-head beta gate. Qwen3-Next chooses **Gated Attention** " +
      "for its softmax path; Kimi Linear chooses **MLA**, which bolts latent-compression onto " +
      "the attention cache. Qwen3-Next settles at a **256 K context** with 24 KiB/token KV; " +
      "Kimi Linear pushes to **1 M** with 7.9 KiB/token. Qwen3-Next sits at 80 B / 3 B active; " +
      "Kimi Linear sits at 48 B / 3 B. Both use the same 3:1 linear:softmax ratio.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The practical takeaway: if your workload is bounded by a 100–250 K window, Qwen3-Next " +
      "is architecturally cheaper to serve because you do not need to carry MLA's additional " +
      "kernel complexity. If your workload routinely exceeds 500 K tokens, Kimi Linear's MLA " +
      "anchor layers amortize their cost against the long-context compression story and you " +
      "come out ahead. Either way, the 3:1 hybrid is the design you are evaluating — the " +
      "branded primitive names are a secondary choice.",
  },

  /* ── Training ────────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Training", anchor: "training" },
  {
    __component: "deep.paragraph",
    body:
      "Pretraining follows the Qwen3 family recipe: a large multilingual and multi-domain " +
      "corpus with strong code and math representation, staged sequence-length expansion, " +
      "and a DeepSeekMoE-style sparse routing objective. Post-training uses the now-standard " +
      "SFT → rejection sampling → DPO pipeline, with Qwen-specific tool-use and agent-mode " +
      "supervised stages layered in. The base and Instruct variants are both released.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Qwen's distinguishing training contribution is the **tool-use supervised stage**, " +
      "which exposes the model to a large corpus of synthetic multi-turn tool invocations — " +
      "web search, code execution, file retrieval, and function calling — during post-" +
      "training. This is why Qwen3-Next is consistently one of the strongest open-weight " +
      "models on agentic benchmarks despite its aggressive sparsity ratio. The tool-use " +
      "stage runs on the Instruct variant only; the base model is released with vanilla " +
      "language-modeling pretraining and is not agent-ready out of the box.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The 80 B / 3 B sparsity ratio is the point worth dwelling on. With only 3.75% of " +
      "parameters active per token, Qwen3-Next is one of the sparsest models that has made " +
      "it to a shipped Instruct release — sparser than DeepSeek V3 (5.5%) and GLM-5 744B " +
      "(5.4%), roughly tied with Kimi Linear on absolute active count. High sparsity is " +
      "cheap in FLOPs but expensive in **router training stability**: the more experts per " +
      "layer, the longer it takes for the auxiliary-loss-free balancer to converge, and the " +
      "higher the chance that a small number of experts capture a disproportionate share of " +
      "tokens early in training. The Qwen3 tech report notes that the routing warmup runs " +
      "across several billion tokens before the balancer is trusted to drive routing " +
      "decisions alone — roughly 3× longer than the Qwen2-MoE warmup, which is the cost of " +
      "pushing sparsity this hard at this scale.",
  },
  {
    __component: "deep.callout",
    variant: "note",
    title: "Deployment economics",
    body:
      "At 3 B active and the 256 K context's ≈ 6.3 GiB KV footprint, Qwen3-Next fits " +
      "comfortably in the memory envelope of a single H100/H200 for inference — the 80 B " +
      "total weights are the binding constraint, not the attention cache. This is the " +
      "commercial sweet spot the team clearly targeted: one-box serving for 100 K+ contexts " +
      "without the kernel-engineering tax of MLA or DSA.",
  },

  /* ── Verdict ─────────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Verdict: The Convergent Hybrid", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "The interesting story here is not any single feature — it is the **convergence**. " +
      "Two independent labs, working from different linear-attention primitives (KDA vs " +
      "Gated DeltaNet) and different softmax primitives (MLA vs Gated Attention), landed on " +
      "the same hybrid ratio (3:1), the same MoE philosophy (fine-grained sparse + shared), " +
      "and the same extreme sparsity (≈ 3 B active out of 48–80 B total). If you remember " +
      "one thing about Qwen3-Next, remember this: it is the model that confirms the hybrid " +
      "linear/softmax design space has stabilized, and the 'right answer' is now narrow " +
      "enough that two independent teams are landing inside the same small box.",
  },

  /* ── References ──────────────────────────────────────────────── */
  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Qwen3-Next 80B-A3B Instruct — HuggingFace config.json",
        url: "https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Instruct/blob/main/config.json",
      },
      {
        label: "Qwen3 Technical Report — arXiv:2505.09388",
        url: "https://arxiv.org/abs/2505.09388",
      },
      {
        label: "Gated DeltaNet (Yang et al., 2024) — arXiv:2412.06464",
        url: "https://arxiv.org/abs/2412.06464",
      },
      {
        label: "Qwen3-Next Release Blog — Qwen Team (Alibaba)",
        url: "https://qwenlm.github.io/blog/qwen3/",
      },
      {
        label: "Kimi Linear Technical Report (companion hybrid architecture) — arXiv:2510.26692",
        url: "https://arxiv.org/abs/2510.26692",
      },
      {
        label: "DeltaNet (Schlag et al., 2021) — arXiv:2102.11174",
        url: "https://arxiv.org/abs/2102.11174",
      },
    ],
  },
];
