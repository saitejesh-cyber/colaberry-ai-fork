/**
 * Deep-dive content for `qwen3-0-6b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave A).
 *
 * Primary sources:
 *   - HuggingFace `Qwen/Qwen3-0.6B/config.json`
 *   - arXiv 2505.09388 ("Qwen3 Technical Report", Alibaba, 2025)
 *
 * Qwen3-0.6B is the smallest member of the Qwen3 dense family. Everything
 * distinctive about the family — QK-Norm, thinking-mode switch, YaRN RoPE
 * scaling — is already covered in the qwen3-32b dense-flagship deep dive;
 * this entry focuses on the small-model-specific choices.
 */

export const slug = "qwen3-0-6b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-0.6B is the smallest member of the Qwen3 family, released by Alibaba on 29 " +
      "April 2025. At ≈ 600 M parameters it competes directly with Llama 3.2 1B and " +
      "SmolLM3 3B for the on-device / edge deployment slot. It carries the family's two " +
      "defining features — **QK-Norm** inside attention and a **thinking-mode runtime " +
      "switch** in the tokenizer — down to a footprint small enough to run in a browser " +
      "WASM backend or a phone app at q4 quantization.",
  },
  {
    __component: "deep.paragraph",
    body:
      "For the architectural details that Qwen3-0.6B shares with every other Qwen3 dense " +
      "model — QK-Norm, YaRN long-context scaling, the thinking-mode fusion recipe — " +
      "read the **Qwen3-32B deep dive** in this gallery. This page focuses on what the " +
      "0.6B specifically does differently from its larger siblings.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Qwen3-0.6B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 596 M", "dense"],
      ["Hidden size (`d_model`)", "1024", "`hidden_size`"],
      ["Layers", "28", "`num_hidden_layers` — deep-but-narrow"],
      ["Query heads", "16", "`num_attention_heads`"],
      ["KV heads", "8", "`num_key_value_heads` (GQA 2:1)"],
      ["Head dimension", "128", "`head_dim` (explicit)"],
      ["FFN intermediate", "3,072", "`intermediate_size` (3× hidden)"],
      ["Vocabulary", "151,936", "same as larger Qwen3"],
      ["Max position (native)", "32,768", "`max_position_embeddings`"],
      ["RoPE base θ", "1,000,000", "`rope_theta`"],
      ["Normalization", "RMSNorm + QK-Norm", "pre-norm + per-head Q/K normalization"],
      ["Activation", "SiLU (SwiGLU)", "`hidden_act = silu`"],
      ["Embedding tying", "Yes", "`tie_word_embeddings = true`"],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "Deep-But-Narrow Topology", anchor: "topology" },
  {
    __component: "deep.paragraph",
    body:
      "The most interesting choice in Qwen3-0.6B is its **28 layers × 1024 hidden size**. " +
      "Compare to Llama 3.2 1B (16 layers × 2048): Qwen3 picked *more depth, less width*, " +
      "for a model in roughly the same parameter class. The depth-first choice buys more " +
      "iterative refinement per forward pass — which matters disproportionately for the " +
      "thinking-mode chain-of-thought workload the Qwen team explicitly targets. On short " +
      "tasks, width and depth are interchangeable for quality; on long reasoning chains, " +
      "depth wins.",
  },
  {
    __component: "deep.callout",
    variant: "insight",
    title: "The vocab-size-to-parameter trap",
    body:
      "At 0.6B, the `151,936 × 1,024 × 2 = 311 MB` embedding matrix is **over half the " +
      "total model weight** even before tying. Tying input and output embeddings halves " +
      "that to 156 MB. This is the same trap Llama 3.2 1B hits with its 128K vocabulary — " +
      "at small model sizes, the tokenizer vocab is not free. Qwen3-0.6B uses the full " +
      "Qwen3 152K vocab for cross-sibling compatibility, and pays for it with a smaller " +
      "non-embedding parameter budget.",
  },

  { __component: "deep.heading", level: "h2", text: "GQA 2:1: The Tightest in the Family", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-0.6B uses **Grouped-Query Attention 2:1** — 16 query heads share 8 KV heads. " +
      "This is the *loosest* GQA ratio in the Qwen3 family: larger siblings use 8:1 " +
      "(Qwen3-32B with 64Q/8KV) or even higher. At 0.6B the KV cache is already small in " +
      "absolute terms (`2 × 8 × 128 × 2 × 28 ≈ 112 KiB/token`), so the Qwen team could " +
      "afford a tighter ratio and preserve more per-query specialization. The same " +
      "**QK-Norm** from qwen3-32b is applied unchanged — RMSNorm on Q and K before the " +
      "dot product, ε = 1e-6.",
  },

  { __component: "deep.heading", level: "h2", text: "Thinking-Mode at 0.6B", anchor: "thinking" },
  {
    __component: "deep.paragraph",
    body:
      "The thinking-mode switch (`enable_thinking=True|False` in the chat template) works " +
      "the same way here as in the larger Qwen3 models: the same checkpoint jointly " +
      "handles `<think>…</think>` reasoning responses and direct answers, toggled by the " +
      "prompt format alone. The question every downstream user eventually asks is: **does " +
      "thinking-mode actually help at 0.6B?** The Qwen3 tech report Table 7 says yes, but " +
      "the delta shrinks with model size. On MATH, 0.6B in thinking mode outscores 0.6B in " +
      "direct-answer mode by ≈ 8 points; on MMLU the gap is closer to 2 points. At this " +
      "scale the CoT budget you can afford is genuinely limited — the model runs out of " +
      "context before the reasoning chain converges on harder problems.",
  },

  { __component: "deep.heading", level: "h2", text: "Deployment", anchor: "deployment" },
  {
    __component: "deep.paragraph",
    body:
      "At bf16 the full checkpoint is ≈ 1.2 GB. Quantized GGUF builds ship in q4_K_M at " +
      "≈ 380 MB and q5_K_M at ≈ 460 MB, both well inside any reasonable mobile app " +
      "bundle. With WebLLM and llama.cpp WASM builds, Qwen3-0.6B is one of the few " +
      "models in this gallery that can run fully in-browser — which, combined with the " +
      "thinking-mode toggle, makes it attractive for 'client-side reasoning assistant' " +
      "product surfaces that can't afford a server round-trip.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The Smallest Reasoner", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-0.6B is currently the smallest open model in this gallery that supports an " +
      "explicit reasoning mode. At 0.6B it is never going to match a 7B on hard math, " +
      "but it is the right checkpoint for workloads where you need *some* chain-of-" +
      "thought capability in a footprint small enough to deploy client-side. Read " +
      "qwen3-32b first for the shared architecture story, then come here for the " +
      "small-model-specific tradeoffs.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Qwen3-0.6B — HuggingFace config.json",
        url: "https://huggingface.co/Qwen/Qwen3-0.6B/blob/main/config.json",
      },
      {
        label: "Qwen3 Technical Report (Alibaba, 2025) — arXiv:2505.09388",
        url: "https://arxiv.org/abs/2505.09388",
      },
      {
        label: "Qwen3: Think Deeper, Act Faster — Qwen blog (2025-04-29)",
        url: "https://qwenlm.github.io/blog/qwen3/",
      },
    ],
  },
];
