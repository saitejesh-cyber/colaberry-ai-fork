/**
 * Deep-dive content for `olmo-3-32b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary sources:
 *   - HuggingFace `allenai/Olmo-3-32B-Think/config.json`
 *   - OLMo 3 technical report — arXiv:2512.13961 (AI2, 2025-11)
 */

export const slug = "olmo-3-32b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "OLMo 3 32B (`Olmo-3-32B-Think`) is the **reasoning-tuned flagship** of " +
      "AI2's November 2025 OLMo 3 release, sibling to OLMo 3 7B. At 32 B dense " +
      "parameters it is the largest model in the fully-open OLMo line and the " +
      "first OLMo checkpoint tuned for explicit chain-of-thought reasoning (the " +
      "'-Think' suffix). Like all OLMo releases, it publishes full pretraining " +
      "data and training code — the only 32 B-class open-weight model with this " +
      "level of transparency.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "OLMo 3 32B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 32 B", "dense"],
      ["Layers", "64", "48 sliding-window + 16 global (3:1)"],
      ["Attention", "GQA + QK-Norm + SWA", "moved to GQA at this scale"],
      ["KV cache", "≈ 256 KiB/token", "half the OLMo 3 7B footprint thanks to GQA"],
      ["Max position", "65,536", "66 K native"],
      ["Vocabulary", "100,352", "100 K tokens"],
      ["Normalization", "RMSNorm", "pre-norm"],
      ["Activation", "SiLU (SwiGLU)", ""],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "MHA → GQA Transition", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "OLMo 3 7B keeps full multi-head attention, but OLMo 3 32B **switches to " +
      "GQA** — the extra parameter budget at 32 B makes the KV cache cost of MHA " +
      "prohibitive at the 66 K native context window. This is a practical " +
      "concession: at 7 B, AI2 can afford 512 KiB/token KV for research clarity; " +
      "at 32 B, they cut it in half with GQA while keeping the same 3:1 local-" +
      "global attention pattern.",
  },

  { __component: "deep.heading", level: "h2", text: "Reasoning Tuning", anchor: "reasoning" },
  {
    __component: "deep.paragraph",
    body:
      "The `-Think` suffix on the checkpoint name indicates post-training for " +
      "explicit reasoning output (chain-of-thought), similar to Qwen3's thinking " +
      "mode and DeepSeek-R1's reasoning pretraining. Per the OLMo 3 tech report, " +
      "the reasoning-mode pipeline uses a combination of SFT on verified math/code " +
      "reasoning traces and RL with verifiable rewards. Reach for the `-Base` " +
      "checkpoint (not shipped as a separate CMS entry) if you want the raw " +
      "pretraining weights without the reasoning tuning.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The Transparent 32B", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "OLMo 3 32B is the **only 32 B-class open-weight model with full training-" +
      "recipe transparency**. It trades some raw benchmark performance versus " +
      "Qwen3-32B and Mistral Small 3.1 for complete reproducibility of the " +
      "pretraining run. For research on data-mix effects, tokenizer design, " +
      "and reasoning-tuning ablations at 32 B scale, it is the default choice.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "OLMo 3 32B Think — HuggingFace config.json",
        url: "https://huggingface.co/allenai/Olmo-3-32B-Think/blob/main/config.json",
      },
      {
        label: "OLMo 3: Open Language Models (AI2, 2025-11) — arXiv:2512.13961",
        url: "https://arxiv.org/pdf/2512.13961",
      },
    ],
  },
];
