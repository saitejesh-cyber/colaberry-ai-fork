/**
 * Deep-dive content for `gemma-3-270m`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave A).
 *
 * Primary sources:
 *   - HuggingFace `google/gemma-3-270m/config.json`
 *   - arXiv 2503.19786 ("Gemma 3 Technical Report", Google, 2025)
 *
 * Gemma 3 270M is the smallest family member — the tinyest Gemma ever, aimed
 * at on-device / WASM / edge deployment. Shares local-global attention with
 * the larger Gemma 3 siblings covered in gemma-3-27b.
 */

export const slug = "gemma-3-270m";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Gemma 3 270M is the **smallest** member of Google's Gemma 3 family at just 270 " +
      "million parameters — the tiniest Gemma ever shipped. Released in 2025, it is " +
      "positioned for on-device, in-browser, and IoT deployment profiles where even " +
      "the 1B-class models (Llama 3.2 1B, Qwen3-0.6B) are too large. At q4 " +
      "quantization the model footprint drops to the low hundreds of MB, fitting " +
      "comfortably inside a mobile app bundle or a browser download.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The family architecture — local-global attention interleaving, GeGLU, logit " +
      "soft-capping, dual RoPE frequencies — is covered in the **gemma-3-27b deep " +
      "dive**. This page focuses on what's specifically interesting about the 270M " +
      "checkpoint at its extreme small size.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Gemma 3 270M configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 268 M", "dense"],
      ["Hidden size (`d_model`)", "640", "`hidden_size`"],
      ["Layers", "18", "`num_hidden_layers`"],
      ["Query heads", "4", "`num_attention_heads`"],
      ["KV heads", "1", "`num_key_value_heads` (MQA, not GQA)"],
      ["Head dimension", "256", "`head_dim` — large relative to hidden"],
      ["FFN intermediate", "2,048", "`intermediate_size` (3.2× hidden)"],
      ["Vocabulary", "262,144", "same 262K vocab as full family"],
      ["Max position", "32,768", "`max_position_embeddings` — shorter than 27B's 128K"],
      ["Attention", "Local/global 5:1", "same interleaving as 27B"],
      ["Normalization", "RMSNorm", "pre-norm + post-norm"],
      ["Activation", "GeGLU", "`hidden_act = gelu_pytorch_tanh`"],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },
  {
    __component: "deep.callout",
    variant: "insight",
    title: "The vocab is bigger than the model",
    body:
      "At 270 M total parameters and a 262,144-token vocabulary with 640-dim hidden, " +
      "the embedding matrix alone is **`262,144 × 640 × 2 = 335 MB`** — larger than " +
      "the rest of the model combined. With embedding tying enabled, that's still " +
      "more than 50% of the model's footprint. Google's choice to keep the full " +
      "262K vocab at 270M is deliberate: it preserves multilingual coverage at the " +
      "smallest size, and the alternative (a smaller vocab specific to 270M) would " +
      "break tokenizer-level compatibility with the rest of the family.",
  },

  { __component: "deep.heading", level: "h2", text: "MQA, Not GQA", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "Gemma 3 270M uses **Multi-Query Attention** — 4 query heads share a single KV " +
      "head — not GQA. At this scale the KV cache dominates any memory budget, and " +
      "collapsing to a single KV head is the cheapest possible attention " +
      "configuration. The head dimension bumps up to 256 (larger than the 128 used " +
      "everywhere else in the gallery) to keep the per-head representational budget " +
      "from collapsing alongside the head count.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The **local-global attention interleaving** from the larger Gemma 3 siblings " +
      "is applied unchanged here: 5 local layers (4K sliding window) for every 1 " +
      "global layer. At 18 total layers that works out to 15 local and 3 global. " +
      "Because the native context is 32K rather than 128K, the compute savings from " +
      "sliding-window local attention are smaller in absolute terms than at the 27B " +
      "scale, but the architectural choice is preserved for consistency.",
  },

  { __component: "deep.heading", level: "h2", text: "Deployment: Browser-Scale", anchor: "deployment" },
  {
    __component: "deep.paragraph",
    body:
      "At bf16 the full checkpoint is ≈ 540 MB. At q4_K_M it drops to ≈ 180 MB, and " +
      "at q3_K_S to ≈ 130 MB. The model is small enough to bundle inside a mobile " +
      "app, stream as a web download, or embed in a browser extension. WebLLM and " +
      "llama.cpp-WASM builds both ship Gemma 3 270M as one of their reference " +
      "models. Typical use cases: autocomplete, short rewriting, structured output " +
      "extraction, and smart-reply generation — not open-ended conversation.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The Smallest Serious Gemma", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Gemma 3 270M is for workloads where even the ~1B class is too heavy. It is " +
      "noticeably weaker than Llama 3.2 1B and Qwen3-0.6B on general benchmarks, " +
      "which is expected at 270 M, but it carries the same Gemma 3 family " +
      "architecture — so if you have already committed to Gemma for tokenizer " +
      "compatibility or multilingual coverage, this is the smallest checkpoint you " +
      "can pick without leaving the family.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Gemma 3 270M — HuggingFace config.json",
        url: "https://huggingface.co/google/gemma-3-270m/blob/main/config.json",
      },
      {
        label: "Gemma 3 Technical Report (Google, 2025) — arXiv:2503.19786",
        url: "https://arxiv.org/abs/2503.19786",
      },
      {
        label: "Introducing Gemma 3 — Google blog (2025-03-12)",
        url: "https://blog.google/technology/developers/gemma-3/",
      },
    ],
  },
];
