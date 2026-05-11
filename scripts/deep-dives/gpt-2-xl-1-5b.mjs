/**
 * Deep-dive content for `gpt-2-xl-1-5b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave A).
 *
 * Primary sources:
 *   - HuggingFace `gpt2-xl/config.json`
 *   - Radford et al. 2019, "Language Models are Unsupervised Multitask Learners"
 *     (the GPT-2 paper, OpenAI)
 *   - OpenAI blog: "Better Language Models and Their Implications" (2019-02)
 *
 * GPT-2 XL is the historical anchor of this gallery. It's the model that
 * defined 'decoder-only transformer LLM' as a category in 2019 and still
 * serves as the baseline against which every modern primitive is measured.
 */

export const slug = "gpt-2-xl-1-5b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "GPT-2 XL is OpenAI's 1.5 B parameter decoder-only language model, originally " +
      "released in stages through 2019. It is the **historical anchor** of this " +
      "gallery — the model that established 'decoder-only autoregressive " +
      "transformer with byte-pair tokenization, trained on filtered web text' as " +
      "the dominant LLM recipe, a recipe that every modern open-weight model in " +
      "this gallery (Llama, Qwen, Gemma, DeepSeek, Phi) still inherits at its " +
      "structural core.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Reading this deep dive is the cheapest way to see what has and has not " +
      "changed in dense decoder design between 2019 and 2025. Every modern primitive " +
      "— GQA, SwiGLU, RMSNorm, RoPE, long-context pretraining — is an upgrade over " +
      "a specific GPT-2 choice, and it is much easier to understand why they exist " +
      "when you see the pre-upgrade baseline in one place.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "GPT-2 XL configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 1.5 B", "dense"],
      ["Hidden size (`d_model`)", "1600", "`n_embd`"],
      ["Layers", "48", "`n_layer`"],
      ["Attention heads", "25", "`n_head` — all full MHA"],
      ["Head dimension", "64", "derived: 1600 / 25"],
      ["FFN intermediate", "6,400", "4× hidden (no gating)"],
      ["Vocabulary", "50,257", "`vocab_size` — BPE, no special multilingual handling"],
      ["Max position", "1,024", "`n_positions` — learned absolute embeddings"],
      ["Normalization", "LayerNorm", "post-norm in original, pre-norm in the XL checkpoint"],
      ["Activation", "GELU", "`activation_function = gelu_new`"],
      ["Attention", "Dense MHA", "no GQA, no flash attention kernel at release"],
      ["Position encoding", "Learned absolute", "`wpe` — NOT RoPE, NOT ALiBi"],
      ["Embedding tying", "Yes", "`tie_word_embeddings = true`"],
      ["Precision", "float32 (originally)", "bf16 / fp16 retrofitted later"],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "What GPT-2 Doesn't Have", anchor: "missing" },
  {
    __component: "deep.paragraph",
    body:
      "The most informative way to read GPT-2 XL is by listing everything it " +
      "*doesn't* have that modern dense decoders do. None of these were in the " +
      "architecture in 2019:",
  },
  {
    __component: "deep.list",
    style: "bullet",
    items: [
      "**RoPE / ALiBi** — GPT-2 uses learned absolute positional embeddings, which is why the context window is capped at 1,024 tokens. Every modern decoder uses a relative position scheme (RoPE for Llama/Qwen/Mistral, ALiBi for a few others) that can extrapolate to longer sequences.",
      "**GQA / MQA / MLA** — every attention head carries its own K and V projections. There is no sharing between heads. The KV cache at full 1,024 context is tiny in absolute terms, but the per-head memory cost does not scale gracefully to 128K context.",
      "**SwiGLU / GeGLU** — the FFN is a plain two-layer MLP with GELU activation, no gating. Modern gated-MLP variants (SwiGLU in Llama/Qwen, GeGLU in Gemma) deliver measurable quality gains at the same parameter count.",
      "**RMSNorm** — GPT-2 uses LayerNorm, which subtracts the mean before normalizing. RMSNorm (introduced later) skips the mean subtraction and is both faster and marginally better-behaved during training.",
      "**Long context pretraining** — GPT-2 was pretrained at 1,024 tokens and cannot be extended to longer contexts without retraining the position embeddings. Modern RoPE-based models are pretrained at 4K–32K and scaled to 128K+ via YaRN or Llama 3 RoPE scaling.",
      "**Instruction tuning / RLHF** — GPT-2 is a base pretrained model only. There is no SFT, no RLHF, no DPO. The notion of 'chat template' did not exist in 2019; the model is a pure next-token predictor.",
    ],
  },

  { __component: "deep.heading", level: "h2", text: "What GPT-2 Does Have (That Still Matters)", anchor: "legacy" },
  {
    __component: "deep.paragraph",
    body:
      "The structural choices that GPT-2 *did* get right, and that every modern " +
      "model in this gallery still uses unchanged:",
  },
  {
    __component: "deep.list",
    style: "bullet",
    items: [
      "**Decoder-only, causal autoregressive.** GPT-2 established this as the default over the encoder-decoder architecture of the original 'Attention Is All You Need' paper. Every model in this gallery is decoder-only.",
      "**Byte-pair tokenization.** The GPT-2 BPE tokenizer (with a 50K vocab) pioneered the byte-fallback scheme that every modern tokenizer (tiktoken, SentencePiece, Tekken) still uses to handle out-of-vocabulary characters.",
      "**Pre-norm residual blocks.** Although the very original GPT-2 paper used post-norm, the widely-shipped checkpoint (including GPT-2 XL) moved to pre-norm — where the LayerNorm is applied *before* the attention and FFN sub-blocks, not after — because pre-norm trains more stably at depth. Every modern decoder in this gallery uses pre-norm.",
      "**Web-text pretraining.** GPT-2 was trained on WebText (Reddit-sourced outbound links), which established 'crawled web text filtered by quality proxies' as the dominant pretraining data paradigm. Llama 3, Qwen3, DeepSeek-V3, and everything else still follow the same basic recipe (just with much more data and much better filters).",
    ],
  },

  { __component: "deep.heading", level: "h2", text: "Training", anchor: "training" },
  {
    __component: "deep.paragraph",
    body:
      "GPT-2 XL was pretrained on **WebText** — about 40 GB of filtered web text " +
      "scraped from Reddit-outbound links. The pretraining budget was approximately " +
      "**10 B tokens**, three orders of magnitude smaller than Llama 3's 15 T. " +
      "There was no post-training: GPT-2 XL is a pure pretrained checkpoint. When " +
      "you use it today (e.g. for research or for teaching), you are interacting " +
      "with the raw next-token predictor with no instruction tuning layer.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: Read This First", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "GPT-2 XL has no production role in 2025 — any modern 1B-class model (Llama " +
      "3.2 1B, Qwen3-0.6B, Gemma 3 270M, SmolLM3 3B) will out-benchmark it by a " +
      "large margin while being smaller and cheaper to serve. Its value is " +
      "**historical and pedagogical**. Read this deep dive first, then read any " +
      "modern dense decoder deep dive — you will see each upgrade (RoPE, GQA, " +
      "SwiGLU, RMSNorm, long context, instruction tuning) as a specific fix to a " +
      "specific GPT-2 limitation, which is by far the clearest way to understand " +
      "why modern LLM architecture looks the way it does.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "GPT-2 XL — HuggingFace config.json",
        url: "https://huggingface.co/gpt2-xl/blob/main/config.json",
      },
      {
        label: "Language Models are Unsupervised Multitask Learners (Radford et al., OpenAI, 2019)",
        url: "https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf",
      },
      {
        label: "Better Language Models and Their Implications — OpenAI blog (2019-02-14)",
        url: "https://openai.com/research/better-language-models",
      },
      {
        label: "Attention Is All You Need (Vaswani et al., 2017) — arXiv:1706.03762 (the transformer paper)",
        url: "https://arxiv.org/abs/1706.03762",
      },
    ],
  },
];
