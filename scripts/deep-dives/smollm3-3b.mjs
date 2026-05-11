/**
 * Deep-dive content for `smollm3-3b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave A).
 *
 * Primary sources:
 *   - HuggingFace `HuggingFaceTB/SmolLM3-3B/config.json`
 *   - HuggingFace blog: "SmolLM3" (2025)
 *
 * SmolLM3 is the HuggingFace research team's third SmolLM iteration — a
 * deliberately simple dense decoder aimed at on-device / edge deployment
 * with fully open training data.
 */

export const slug = "smollm3-3b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "SmolLM3 3B is the HuggingFace research team's third-generation 'small language " +
      "model' release, a 3B dense decoder built from the ground up as a fully-open " +
      "alternative to Llama 3.2 3B and Qwen3-4B in the on-device slot. Like OLMo 2, " +
      "SmolLM3 publishes its entire training corpus (the 'smollm-corpus' dataset " +
      "release on HuggingFace Hub) alongside the weights — which is what separates it " +
      "from the Meta / Alibaba / Microsoft alternatives in this size class.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Architecturally SmolLM3 is a textbook pre-norm decoder — RMSNorm, SwiGLU, GQA, " +
      "RoPE — with nothing particularly novel. The value proposition, like OLMo 2, " +
      "lies in reproducibility: the entire pretraining data mix is public, the " +
      "training recipe is documented, and the HuggingFace team has published " +
      "ablations of every major design choice.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "SmolLM3 3B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 3.08 B", "dense"],
      ["Hidden size (`d_model`)", "2048", "`hidden_size`"],
      ["Layers", "36", "`num_hidden_layers` — deep for this size"],
      ["Query heads", "16", "`num_attention_heads`"],
      ["KV heads", "4", "`num_key_value_heads` (GQA 4:1)"],
      ["Head dimension", "128", "derived"],
      ["FFN intermediate", "11,008", "`intermediate_size` (5.4× hidden)"],
      ["Vocabulary", "128,256", "`vocab_size` (Llama 3 tokenizer-compatible)"],
      ["Max position", "65,536", "`max_position_embeddings`"],
      ["RoPE base θ", "5,000,000", "`rope_theta` (higher than Llama's 500K)"],
      ["Normalization", "RMSNorm", "pre-norm"],
      ["Activation", "SiLU (SwiGLU)", "`hidden_act = silu`"],
      ["Embedding tying", "Yes", "`tie_word_embeddings = true`"],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "Deep-and-Narrow Topology", anchor: "topology" },
  {
    __component: "deep.paragraph",
    body:
      "SmolLM3 3B is **36 layers deep × 2048 wide** — the same 36-layer depth as " +
      "Qwen3-4B despite being roughly 75% of Qwen3-4B's parameter count. This is an " +
      "extreme depth-first topology. The HuggingFace team's ablation in the SmolLM3 " +
      "blog post shows this consistently outperformed shallower-and-wider variants at " +
      "matched compute for reasoning benchmarks. It is the same bet the Qwen3 team " +
      "made, applied to a model half the size.",
  },
  {
    __component: "deep.callout",
    variant: "note",
    title: "FFN expansion: 5.4×",
    body:
      "The FFN intermediate width of 11,008 gives a 5.4× expansion ratio — noticeably " +
      "higher than Llama 3's 3.5× or Qwen3's 3.0×. This is the same number OLMo 2 7B " +
      "uses (11,008 on a 4,096 hidden, 2.7×). HF reuses it here at half the hidden " +
      "width, pushing the ratio up. The rationale is the same depth-first argument: " +
      "if you've narrowed the residual stream, a proportionally wider FFN keeps " +
      "per-layer representational throughput reasonable.",
  },

  { __component: "deep.heading", level: "h2", text: "GQA 4:1", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "Attention is standard GQA 4:1 (16 Q / 4 KV heads, 128 head dim). No QK-Norm, " +
      "no soft-cap, no latent KV. The KV cache footprint at bf16 is `2 × 4 × 128 × 2 " +
      "× 36 ≈ 72 KiB/token`, which at the full 65K context is ≈ 4.7 GiB — manageable " +
      "on consumer hardware alongside the ≈ 6 GB bf16 weight footprint.",
  },

  { __component: "deep.heading", level: "h2", text: "Training: Fully Open Corpus", anchor: "training" },
  {
    __component: "deep.paragraph",
    body:
      "SmolLM3 was pretrained on the public **smollm-corpus** dataset release — a " +
      "curated mixture dominated by filtered web text (FineWeb), code (The Stack), " +
      "academic papers (peS2o), and a synthetic instruction-following component. " +
      "Total pretraining tokens are in the ≈ 11T range. Every component of this " +
      "corpus is published on HuggingFace Hub under open licenses, so you can " +
      "reproduce the pretraining run end-to-end if you have the compute budget.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Post-training follows SFT → DPO, using the HuggingFace team's own open " +
      "preference datasets (UltraFeedback-derived). There is no RLHF pass; the SmolLM " +
      "team's ablations consistently favor DPO at this scale for cost reasons.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The Open 3B Reference", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "SmolLM3 is the **fully-open reference** for a 3B-class dense model. It is " +
      "architecturally unremarkable by design — the value is that you can download " +
      "the weights, the data, and the training code, and replay any step of the " +
      "pipeline. On benchmarks it lands close to Llama 3.2 3B on general tasks and " +
      "slightly behind Qwen3-4B on reasoning tasks, which is expected given the " +
      "smaller size and the absence of Qwen3's thinking-mode RL. For research, " +
      "ablations, or teaching, it is the 3B model to pick.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "SmolLM3 3B — HuggingFace config.json",
        url: "https://huggingface.co/HuggingFaceTB/SmolLM3-3B/blob/main/config.json",
      },
      {
        label: "SmolLM3 — HuggingFace blog",
        url: "https://huggingface.co/blog/smollm3",
      },
      {
        label: "SmolLM corpus — HuggingFace Hub",
        url: "https://huggingface.co/datasets/HuggingFaceTB/smollm-corpus",
      },
    ],
  },
];
