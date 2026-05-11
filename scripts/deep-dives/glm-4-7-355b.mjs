/**
 * Deep-dive content for `glm-4-7-355b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary sources:
 *   - HuggingFace `zai-org/GLM-4.7/config.json`
 *   - arXiv 2508.06471 (GLM-4.5 family technical report — GLM-4.7 is an
 *     incremental refresh of the same architecture)
 */

export const slug = "glm-4-7-355b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "GLM-4.7 355B is Zhipu AI's December 2025 refresh of GLM-4.5 — same " +
      "355 B total / 32 B active MoE architecture, **92 layers deep**, same GQA + " +
      "QK-Norm attention stack. The deltas versus GLM-4.5 are an extended context " +
      "window (≈ 203 K vs GLM-4.5's 128 K) and refreshed post-training. Read the " +
      "GLM-4.5 355B deep dive first — it covers the architecture story; this one " +
      "focuses only on the GLM-4.7 changes.",
  },

  { __component: "deep.heading", level: "h2", text: "What Changed from GLM-4.5", anchor: "changes" },
  {
    __component: "deep.list",
    style: "bullet",
    items: [
      "**Context window**: 128K → ~203K native. Likely a longer-context continued-pretraining phase, given the identical RoPE base frequency in the config.",
      "**Post-training**: Refreshed agentic, reasoning, and coding SFT mix. The GLM-4.7 team ships both a base and chat variant on HuggingFace.",
      "**Architecture**: No structural changes. Same 92-layer MoE stack, same GQA + QK-Norm, same 32 B active compute per token, same 368 KiB/token KV cache footprint.",
    ],
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "GLM-4.7 355B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 355 B", "MoE — same as GLM-4.5"],
      ["Active parameters", "≈ 32 B", "per token"],
      ["Layers", "92", "second-deepest model in the gallery"],
      ["Attention", "GQA + QK-Norm", "no MLA"],
      ["KV cache", "≈ 368 KiB/token", "heavy compared to MLA models"],
      ["Max position", "202,752", "≈ 203 K — GLM-4.7's key upgrade"],
      ["Vocabulary", "151,552", "same as GLM-4.5"],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: GLM-4.5 + Longer Context", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "GLM-4.7 is a **point release**, not a new generation. For teams already " +
      "running GLM-4.5 the upgrade path is a drop-in replacement with a longer " +
      "native context. For new deployments, GLM-4.7 is the default pick in the " +
      "GLM-4.x family. The next architectural generation is GLM-5 744B (see that " +
      "deep dive), which scales the expert pool significantly.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "GLM-4.7 — HuggingFace config.json",
        url: "https://huggingface.co/zai-org/GLM-4.7/blob/main/config.json",
      },
      {
        label: "GLM-4.5: Agentic, Reasoning, and Coding Foundation Models (Zhipu AI) — arXiv:2508.06471",
        url: "https://arxiv.org/pdf/2508.06471",
      },
    ],
  },
];
