/**
 * Deep-dive content for `nemotron-3-super-120b-a12b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary sources:
 *   - HuggingFace `nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16/config.json`
 *   - NVIDIA Nemotron 3 Super technical report (research.nvidia.com)
 */

export const slug = "nemotron-3-super-120b-a12b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Nemotron 3 Super 120B-A12B is the **flagship of NVIDIA's Nemotron 3 " +
      "family**, released March 2026. At **120 B total / 12 B active " +
      "parameters** it is the largest hybrid-Mamba-2 model in this gallery. The " +
      "Nemotron 3 family argument — that SSM layers should dominate the " +
      "sequence-mixing stack — scales all the way up to 120 B total parameters " +
      "here without reverting to attention. Read the Nemotron 3 Nano 30B-A3B " +
      "deep dive first for context on the family's core bet.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Nemotron 3 Super 120B-A12B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 120 B", "MoE (hybrid)"],
      ["Active parameters", "≈ 12 B", "per token"],
      ["Layer mix", "8 GQA + 40 Mamba-2 + 40 MoE", "88 layers total"],
      ["Attention layers", "8", "only ~17% of sequence-mixing layers"],
      ["KV cache", "≈ 8 KiB/token", "tiny — dramatic vs any pure-attention peer"],
      ["Max position", "1,048,576", "1 M native"],
      ["Vocabulary", "≈ 131,000", ""],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "1M Context at 8 KiB KV per Token", anchor: "context" },
  {
    __component: "deep.paragraph",
    body:
      "The headline number: Nemotron 3 Super's KV cache footprint at 1 M native " +
      "context is roughly **8 KiB per token**, producing ≈ 8 GiB of KV cache at " +
      "full context. Compare this to Llama 4 Maverick at 1 M context (~192 " +
      "GiB of KV cache per the Maverick deep dive) and the scale of the savings " +
      "is obvious. This is not a marginal optimization — it is a categorically " +
      "different serving economics story.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The tradeoff is empirical: Mamba-2 hybrids have not yet proven to match " +
      "full-attention transformers on every capability axis, particularly on " +
      "pinpoint long-range retrieval (the classic needle-in-haystack test). " +
      "NVIDIA's tech report argues the gap is small and closing at the 120 B " +
      "scale, but benchmark your specific workload before committing.",
  },

  { __component: "deep.heading", level: "h2", text: "MoE: 40 Routed Expert Layers", anchor: "moe" },
  {
    __component: "deep.paragraph",
    body:
      "Of the 88 total layers, 40 are MoE feed-forward layers (interleaved with " +
      "the Mamba-2 + GQA stack), giving Nemotron 3 Super its 120 B total / 12 B " +
      "active budget. The MoE design is otherwise conventional — NVIDIA's " +
      "architectural innovation is concentrated in the sequence-mixing stack, " +
      "not the FFN layer. Active compute per token at ≈ 12 B puts per-token " +
      "serving cost in the same band as Qwen3-30B-A3B or Llama 4 Scout.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The SSM Frontier", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Nemotron 3 Super 120B-A12B is the **most aggressive SSM-first frontier " +
      "model in the open ecosystem**. For workloads where 1 M context serving " +
      "cost is the dominant constraint — long-document analysis, whole-" +
      "codebase agentic tasks, multi-hour streaming inference — it is the " +
      "default choice. For standard short-context reasoning it is competitive " +
      "with pure-attention peers but not obviously ahead, so the case for " +
      "adoption rests on the serving-cost story.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Nemotron 3 Super 120B-A12B — HuggingFace config.json",
        url: "https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16/blob/main/config.json",
      },
      {
        label: "NVIDIA Nemotron 3 Super Technical Report",
        url: "https://research.nvidia.com/labs/nemotron/files/NVIDIA-Nemotron-3-Super-Technical-Report.pdf",
      },
    ],
  },
];
