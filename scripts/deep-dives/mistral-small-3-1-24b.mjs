/**
 * Deep-dive content for `mistral-small-3-1-24b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave A).
 *
 * Primary sources:
 *   - HuggingFace `mistralai/Mistral-Small-3.1-24B-Base-2503/config.json`
 *   - Mistral blog: "Mistral Small 3.1" (2025-03)
 */

export const slug = "mistral-small-3-1-24b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Mistral Small 3.1 24B is the March 2025 refresh of Mistral's 'small' dense tier, " +
      "released under Apache 2.0. At 24 B parameters it sits between Llama 3.1 8B and " +
      "Llama 3.1 70B / Qwen3-32B in the dense decoder lineup, with a specific " +
      "positioning: 'the largest model you can serve at full 128K context on a single " +
      "A100 80G.' Mistral has historically owned the 'permissive-license workhorse' " +
      "slot of the open ecosystem, and Mistral Small 3.1 continues that line.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The 3.1 release is an incremental refresh of Mistral Small 3 — same 24B " +
      "architecture, updated pretraining mix, extended context window, refined " +
      "post-training. The headline changes from 3.0 to 3.1 are the **context " +
      "extension from 32K to 128K** and **multimodal vision support** via a SigLIP " +
      "encoder. This deep dive focuses on the language modeling architecture.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Mistral Small 3.1 24B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 23.6 B", "dense"],
      ["Hidden size (`d_model`)", "5120", "`hidden_size`"],
      ["Layers", "40", "`num_hidden_layers`"],
      ["Query heads", "32", "`num_attention_heads`"],
      ["KV heads", "8", "`num_key_value_heads` (GQA 4:1)"],
      ["Head dimension", "128", "`head_dim`"],
      ["FFN intermediate", "32,768", "`intermediate_size` (6.4× hidden)"],
      ["Vocabulary", "131,072", "`vocab_size` (Mistral Tekken tokenizer)"],
      ["Max position", "131,072", "`max_position_embeddings` — native 128K"],
      ["RoPE base θ", "1,000,000,000", "`rope_theta` — 1 billion"],
      ["Normalization", "RMSNorm", "ε = 1e-5, pre-norm"],
      ["Activation", "SiLU (SwiGLU)", "`hidden_act = silu`"],
      ["Embedding tying", "No", "`tie_word_embeddings = false`"],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },
  {
    __component: "deep.callout",
    variant: "insight",
    title: "RoPE θ = 1,000,000,000",
    body:
      "Mistral Small 3.1 sets `rope_theta` to **one billion** — three orders of " +
      "magnitude higher than Llama 3's 500,000 and Gemma 3's 1,000,000. The " +
      "extremely high base frequency gives every token position a unique, slowly-" +
      "varying rotation, which Mistral's team reports helps maintain long-context " +
      "attention quality out to the full 128K without needing a post-hoc scaling " +
      "scheme like YaRN. It is the most aggressive RoPE θ in any model in this " +
      "gallery.",
  },

  { __component: "deep.heading", level: "h2", text: "Extremely Wide FFN", anchor: "ffn" },
  {
    __component: "deep.paragraph",
    body:
      "The FFN intermediate width is **32,768 = 6.4 × 5,120** — far wider than the " +
      "3.5×–4× standard across Llama/Qwen/Gemma. Mistral has consistently favored " +
      "wider FFNs at this scale (Mistral Nemo 12B uses a similar ratio). The " +
      "tradeoff is that roughly **70% of the 24B parameter budget lives in the FFN**: " +
      "`3 × 5,120 × 32,768 × 40 ≈ 20.1 B`. If you are looking at Mistral Small 3.1 " +
      "for fine-tuning, the FFN is the layer to focus LoRA adapters on — everything " +
      "else is a rounding error by comparison.",
  },

  { __component: "deep.heading", level: "h2", text: "GQA 4:1", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "Attention is standard GQA 4:1 — 32 query heads, 8 KV heads, 128-dim per head. " +
      "The KV cache footprint at bf16 is `2 × 8 × 128 × 2 × 40 ≈ 160 KiB/token`, " +
      "which at the full 131K context is **≈ 21 GiB of KV cache**. The total memory " +
      "budget at full context is ≈ 47 GB (26 GB weights + 21 GB KV), which is exactly " +
      "what fits on a single A100 80G with room for a modest batch. This is the " +
      "'single-A100 long-context' design goal Mistral explicitly calls out in the " +
      "release blog.",
  },

  { __component: "deep.heading", level: "h2", text: "Tokenizer: Tekken", anchor: "tokenizer" },
  {
    __component: "deep.paragraph",
    body:
      "Mistral Small 3.1 uses the **Tekken** tokenizer — a 131,072-vocab BPE " +
      "variant that Mistral introduced with the Nemo 12B release and has since " +
      "applied to all new models. Tekken is reportedly 30% more compressive than " +
      "Llama 3's tokenizer on non-English text and delivers similar byte-per-token " +
      "ratios on code. At the 128K context window, better compression directly " +
      "translates into more effective context — Mistral Small 3.1 can fit " +
      "noticeably more source material into the same token budget than a " +
      "Llama-tokenized 128K window.",
  },

  { __component: "deep.heading", level: "h2", text: "Deployment: Apache 2.0", anchor: "deployment" },
  {
    __component: "deep.paragraph",
    body:
      "Mistral Small 3.1 ships under **Apache 2.0** — the most permissive " +
      "commercial-use license of any model in this gallery, more permissive than " +
      "the Llama 3 Community License or the Gemma license. At bf16 the full 24B is " +
      "≈ 48 GB, which fits on a single H100 80G or A100 80G. Quantized Q4 builds " +
      "run on a 24 GB consumer GPU. Mistral publishes both a Base and Instruct " +
      "variant; most downstream users pull the Instruct.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The Apache Workhorse", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Mistral Small 3.1 24B is the default pick when **license permissiveness** " +
      "is a hard constraint — it is the only Apache 2.0 model in this size class. " +
      "Architecturally it is a conservative, well-engineered dense decoder with " +
      "one interesting twist (the extreme RoPE θ for 128K stability). If you need " +
      "thinking-mode reasoning, pick Qwen3-32B instead; if you need the absolute " +
      "strongest open-weight 24B on benchmarks, benchmark comparisons are close " +
      "enough that license and tokenizer usually decide. For commercial product " +
      "deployment, Apache 2.0 usually wins.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Mistral Small 3.1 24B Base — HuggingFace config.json",
        url: "https://huggingface.co/mistralai/Mistral-Small-3.1-24B-Base-2503/blob/main/config.json",
      },
      {
        label: "Mistral Small 3.1 — Mistral blog (2025-03)",
        url: "https://mistral.ai/news/mistral-small-3-1/",
      },
      {
        label: "Mistral Small 3 — Mistral blog (2025-01)",
        url: "https://mistral.ai/news/mistral-small-3/",
      },
    ],
  },
];
