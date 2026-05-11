/**
 * Deep-dive content for `xlstm-7b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave A).
 *
 * Primary sources:
 *   - HuggingFace `NX-AI/xLSTM-7b/config.json`
 *   - arXiv 2405.04517 ("xLSTM: Extended Long Short-Term Memory",
 *     Beck et al., NXAI / JKU Linz, 2024)
 *   - arXiv 2503.13427 ("xLSTM 7B: A Recurrent LLM for Fast and Efficient
 *     Inference", NXAI, 2025)
 *
 * xLSTM 7B is an outlier in this gallery: it is **not a transformer**. It is
 * a modern recurrent language model built on the xLSTM architecture, the
 * extension of the classic LSTM proposed by Sepp Hochreiter's group at NXAI.
 */

export const slug = "xlstm-7b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "xLSTM 7B is the outlier in this gallery. It is the only entry that is **not a " +
      "transformer** — no attention blocks, no KV cache, no softmax dot product. " +
      "Instead, xLSTM uses a modern extension of the classic LSTM recurrent cell, " +
      "proposed by Sepp Hochreiter's group at NXAI / JKU Linz in 2024. Released in " +
      "March 2025 under the NXAI research license, xLSTM 7B is the largest xLSTM " +
      "checkpoint the team has published and is intended as a direct counter-" +
      "example to the 'transformers are all you need' consensus.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The recurrent inductive bias has a concrete deployment benefit: **inference " +
      "cost is O(1) in context length** rather than O(n) or O(n²). xLSTM 7B serves at " +
      "constant memory regardless of sequence length — no KV cache to grow, no " +
      "quadratic attention cost. For long-context workloads, this is the entire " +
      "pitch.",
  },

  { __component: "deep.heading", level: "h2", text: "The xLSTM Block", anchor: "block" },
  {
    __component: "deep.paragraph",
    body:
      "The xLSTM paper (arXiv 2405.04517) introduces two modernized LSTM variants: " +
      "**sLSTM** (scalar LSTM with exponential gating and memory mixing) and " +
      "**mLSTM** (matrix LSTM with a matrix-valued memory cell that supports " +
      "parallel training via a covariance update rule). xLSTM 7B uses an " +
      "**interleaved stack of mLSTM and sLSTM blocks** — the mLSTM blocks carry the " +
      "bulk of the long-range memory, and the sLSTM blocks handle sequential state " +
      "updates. This is the recurrent analog of how transformers alternate " +
      "attention and FFN.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The key mLSTM innovation over vanilla LSTM is that its memory update can be " +
      "expressed as a **parallel sum** during training (analogous to how transformer " +
      "attention is parallelizable across the sequence dimension), so you get LSTM-" +
      "style recurrent inference at deployment time without paying the O(n) " +
      "sequential training cost that killed the original LSTM family in the " +
      "transformer era.",
  },
  {
    __component: "deep.callout",
    variant: "insight",
    title: "Why this matters in 2025",
    body:
      "Linear-attention / SSM approaches (Mamba, RWKV, Kimi Linear) are all trying " +
      "to recover the O(1)-inference property of classic RNNs while keeping the " +
      "parallel-training property of transformers. xLSTM is the same research " +
      "program approached from the *other* side — starting from LSTM and " +
      "retrofitting parallelism. In this gallery, xLSTM 7B is the cleanest public " +
      "example of a non-attention, non-SSM, non-linear-attention approach. It is " +
      "worth reading as a counterpoint to the Kimi Linear deep dive.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "xLSTM 7B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 7 B", "dense"],
      ["Architecture", "xLSTM (mLSTM + sLSTM)", "not a transformer"],
      ["Hidden size", "4096", "residual stream width"],
      ["Layers", "32", "interleaved mLSTM / sLSTM blocks"],
      ["KV cache", "None", "recurrent memory, O(1) in context"],
      ["Context window", "32,768", "practical — in principle unbounded"],
      ["Vocabulary", "50,304", "GPT-NeoX tokenizer family"],
      ["Normalization", "RMSNorm", "pre-norm"],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "O(1) Inference: The Serving Story", anchor: "serving" },
  {
    __component: "deep.paragraph",
    body:
      "The most important operational difference from any transformer in this " +
      "gallery is that **xLSTM 7B has no KV cache**. Instead, it carries a fixed-" +
      "size recurrent memory state (roughly the same order of magnitude as one " +
      "layer's hidden state) that is updated in place at each new token. This " +
      "means decoding throughput is **constant in context length** — at 1K or 64K " +
      "or 1M input tokens, the per-token cost is the same. For a transformer with " +
      "a growing KV cache, the per-token cost rises as the cache grows.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The NXAI team's benchmark numbers (arXiv 2503.13427 Table 2) show " +
      "xLSTM 7B decoding at roughly 2–3× the speed of Llama 3 8B at 32K context on " +
      "the same hardware. The advantage grows with context length: at 128K " +
      "simulated context, the gap is closer to 5–6×. For workloads dominated by " +
      "long-context streaming inference, this is a genuine deployment " +
      "differentiator.",
  },

  { __component: "deep.heading", level: "h2", text: "Quality vs Transformers", anchor: "quality" },
  {
    __component: "deep.paragraph",
    body:
      "The quality story is more nuanced. On standard benchmarks (MMLU, HellaSwag, " +
      "ARC), xLSTM 7B lands in the Llama 3 8B / Mistral 7B ballpark but does not " +
      "convincingly exceed either. On long-context retrieval tasks (needle in " +
      "haystack beyond 32K), xLSTM has the structural advantage of O(1) memory but " +
      "trades off some recall accuracy versus a well-tuned transformer with YaRN. " +
      "The model is therefore best understood as a **research existence proof** " +
      "rather than a drop-in replacement for a dense 7B decoder.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The Non-Transformer", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "xLSTM 7B is the gallery's reminder that the transformer consensus is " +
      "contingent, not inevitable. Read it together with the Kimi Linear (hybrid " +
      "linear attention) and DeepSeek-V3 (MLA) deep dives to see three very " +
      "different approaches to the same underlying problem: how do you get " +
      "O(1)-ish inference cost without losing the parallel-training property that " +
      "transformers invented. For production workloads, xLSTM is still a research " +
      "pick; for research and teaching, it is the cleanest example of an " +
      "attention-free 7B-class LLM in the open ecosystem.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "xLSTM 7B — HuggingFace config.json",
        url: "https://huggingface.co/NX-AI/xLSTM-7b/blob/main/config.json",
      },
      {
        label: "xLSTM: Extended Long Short-Term Memory (Beck et al., 2024) — arXiv:2405.04517",
        url: "https://arxiv.org/abs/2405.04517",
      },
      {
        label: "xLSTM 7B: A Recurrent LLM for Fast and Efficient Inference (NXAI, 2025) — arXiv:2503.13427",
        url: "https://arxiv.org/abs/2503.13427",
      },
    ],
  },
];
