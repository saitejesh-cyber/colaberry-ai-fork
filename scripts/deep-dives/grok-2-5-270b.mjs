/**
 * Deep-dive content for `grok-2-5-270b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary source: HuggingFace `xai-org/grok-2/config.json`
 * (xAI released Grok 2.5 as open-weights in August 2025. No formal
 * technical report at release time; architecture is inferred from the
 * shipped config.json.)
 */

export const slug = "grok-2-5-270b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Grok 2.5 is **xAI's first open-weights LLM release**, published to HuggingFace " +
      "as `xai-org/grok-2` in August 2025. At **270 B total parameters** it is a " +
      "sparse MoE in the frontier-class open-weight tier alongside DeepSeek-V3, " +
      "Kimi K2, and GLM-4.5. There is no formal technical report at release — the " +
      "architecture facts in this deep dive are taken directly from the shipped " +
      "`config.json`.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Strategically, Grok 2.5 plays the same role for xAI that GPT-OSS 120B plays " +
      "for OpenAI: the first open-weights release from a lab whose primary product " +
      "line is proprietary. Unlike GPT-OSS, Grok 2.5 is not under Apache 2.0 — it " +
      "ships under xAI's own source-available terms, which the buyer should check " +
      "before assuming commercial use rights.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Grok 2.5 270B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 270 B", "MoE"],
      ["Layers", "64", "all GQA"],
      ["Attention", "GQA", "standard grouped-query attention"],
      ["KV cache", "≈ 256 KiB/token", "heavy — no MLA compression"],
      ["Max position", "131,072", "128K native context"],
      ["Vocabulary", "131,072", "128K tokens"],
      ["Activation", "SiLU (SwiGLU)", "`hidden_act = silu`"],
      ["Normalization", "RMSNorm", "pre-norm"],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "GQA Without MLA", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "Grok 2.5 uses plain **Grouped-Query Attention** across all 64 layers with no " +
      "MLA compression, no sliding-window interleave, and no sparse-attention " +
      "kernel. This is a conservative choice that makes the model easy to serve on " +
      "any off-the-shelf inference stack (vLLM, SGLang, TGI) without custom " +
      "kernels. The price is a **heavy KV cache of ≈ 256 KiB per token** at 128 K " +
      "context — an order of magnitude larger than Kimi K2's MLA-based 68.6 KiB.",
  },
  {
    __component: "deep.paragraph",
    body:
      "For xAI's pitch — 'frontier-class open weights that run anywhere' — the " +
      "tradeoff makes sense. Grok 2.5 is optimized for ease of adoption, not " +
      "maximum serving efficiency. Teams with heavy long-context workloads should " +
      "reach for Kimi K2 or DeepSeek-V3 instead.",
  },

  { __component: "deep.heading", level: "h2", text: "MoE Details", anchor: "moe" },
  {
    __component: "deep.paragraph",
    body:
      "The shipped config.json confirms Grok 2.5 is an MoE, but does not publish " +
      "the exact expert count or top-k routing in the public release at the time " +
      "this deep dive was written. Total parameter count (≈ 270 B) and per-token " +
      "compute cost both suggest a similar MoE density to Llama 4 Maverick or GLM-" +
      "4.5, though without an xAI technical report the exact active-parameter " +
      "budget is not confirmed. Check the HuggingFace model card linked below for " +
      "any updates.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: xAI's Open-Weights Debut", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Grok 2.5 270B matters more as a **strategic milestone** than as a pure " +
      "architectural innovation — it puts xAI in the open-weights conversation for " +
      "the first time and gives researchers a frontier-class checkpoint that uses " +
      "only off-the-shelf attention primitives. There is no novel architectural " +
      "contribution versus DeepSeek-V3 or Llama 4; the bet is on the **pretraining " +
      "data mix and post-training** that xAI is known for. If you want to compare " +
      "xAI's training recipe directly against Meta's or DeepSeek's, Grok 2.5 is the " +
      "first time you can do that at scale.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Grok 2 — HuggingFace config.json",
        url: "https://huggingface.co/xai-org/grok-2/blob/main/config.json",
      },
      {
        label: "xAI Grok 2 model card — HuggingFace",
        url: "https://huggingface.co/xai-org/grok-2",
      },
    ],
  },
];
