/**
 * Deep-dive content for `olmo-3-7b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary sources:
 *   - HuggingFace `allenai/Olmo-3-1025-7B/config.json`
 *   - OLMo 3 technical report — arXiv:2512.13961 (AI2, 2025-11)
 */

export const slug = "olmo-3-7b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "OLMo 3 7B is the Allen Institute for AI's (AI2) November 2025 refresh of " +
      "its **fully open** OLMo line. Like OLMo 2 before it, OLMo 3 publishes not " +
      "just the weights but also the complete pretraining data, training code, and " +
      "intermediate checkpoints — it is the most transparent open-weight LLM " +
      "family in the ecosystem. At 7 B parameters it is a direct successor to " +
      "OLMo 2 7B (see that deep dive for the OLMo line's broader context).",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "OLMo 3 7B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 7 B", "dense"],
      ["Layers", "32", "24 sliding-window + 8 global"],
      ["Attention", "MHA + QK-Norm + SWA", "full multi-head, not GQA"],
      ["KV cache", "≈ 512 KiB/token", "heavy — MHA, no GQA sharing"],
      ["Max position", "65,536", "66 K native"],
      ["Vocabulary", "100,352", "100 K tokens"],
      ["Normalization", "RMSNorm", "pre-norm"],
      ["Activation", "SiLU (SwiGLU)", ""],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },
  {
    __component: "deep.callout",
    variant: "insight",
    title: "MHA, not GQA",
    body:
      "OLMo 3 7B is one of the few 2025-era models to keep **full multi-head " +
      "attention** (every head has its own K and V projections) instead of GQA. " +
      "This inflates the KV cache to ≈ 512 KiB/token — roughly 4× what a GQA 4:1 " +
      "model the same size would use. AI2's bet is that for a 7 B research model " +
      "at moderate context lengths, the extra KV footprint is worth the per-head " +
      "expressiveness. It makes OLMo 3 7B easier to study for attention-head " +
      "interpretability research: every head has independent keys and values to " +
      "probe.",
  },

  { __component: "deep.heading", level: "h2", text: "Local-Global Attention 3:1", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "OLMo 3 7B uses a **3:1 sliding-window to global ratio** (24 local layers + " +
      "8 global layers across 32 total). This is a middle ground between Gemma " +
      "3's 5:1 (very global-sparse) and GPT-OSS's 1:1 (global-heavy). The 3:1 " +
      "ratio is inherited from the OLMo 3 technical report's ablation studies, " +
      "which found it gave the best long-context quality per compute at the 7 B " +
      "scale.",
  },

  { __component: "deep.heading", level: "h2", text: "Fully-Open Pretraining", anchor: "training" },
  {
    __component: "deep.paragraph",
    body:
      "The OLMo line's primary value is **full training-data transparency**. The " +
      "OLMo 3 technical report (arXiv 2512.13961) publishes the exact token mix, " +
      "quality filter thresholds, and curriculum schedule — which is the kind of " +
      "reproducibility information that Llama, Qwen, DeepSeek, and Mistral all " +
      "withhold. For researchers studying pretraining-data effects, OLMo 3 is the " +
      "only frontier-era open-weight model where you can actually replicate the " +
      "recipe end-to-end.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The Research Baseline", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "OLMo 3 7B is the clearest 'fully reproducible' 7 B checkpoint in the open " +
      "ecosystem. It does not out-benchmark Qwen3-8B or Llama 3.1 8B on standard " +
      "suites, but for research and teaching it is uniquely valuable because you " +
      "can rerun the pretraining recipe yourself. Reach for OLMo 3 when " +
      "transparency and reproducibility matter more than raw benchmark rank.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "OLMo 3 7B — HuggingFace config.json",
        url: "https://huggingface.co/allenai/Olmo-3-1025-7B/blob/main/config.json",
      },
      {
        label: "OLMo 3: Open Language Models (AI2, 2025-11) — arXiv:2512.13961",
        url: "https://arxiv.org/pdf/2512.13961",
      },
    ],
  },
];
