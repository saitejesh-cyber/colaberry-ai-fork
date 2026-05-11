/**
 * Deep-dive content for `nemotron-3-nano-30b-a3b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary sources:
 *   - HuggingFace `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16/config.json`
 *   - NVIDIA Nemotron 3 Nano technical report (research.nvidia.com)
 */

export const slug = "nemotron-3-nano-30b-a3b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "NVIDIA Nemotron 3 Nano 30B-A3B is a **30 B total / 3 B active** hybrid " +
      "Mamba-2 + transformer MoE, released December 2025. It is the middle member " +
      "of NVIDIA's Nemotron 3 family (Nano 4B dense, Nano 30B-A3B MoE, Super " +
      "120B-A12B MoE) and the clearest demonstration of NVIDIA's big architectural " +
      "bet: **state-space-model layers can replace most attention layers at " +
      "frontier quality**, cutting KV cache by 1–2 orders of magnitude.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Nemotron 3 Nano 30B-A3B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 30 B", "MoE (hybrid)"],
      ["Active parameters", "≈ 3 B", "per token"],
      ["Layer mix", "6 GQA + 23 Mamba-2 + 23 MoE", "deeply unbalanced toward SSM"],
      ["KV cache", "≈ 6 KiB/token", "roughly 50× smaller than GQA-only 30B MoEs"],
      ["Max position", "1,048,576", "1 M native context"],
      ["Vocabulary", "≈ 131,000", ""],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "Mamba-2 Dominates the Stack", anchor: "mamba" },
  {
    __component: "deep.paragraph",
    body:
      "Per the Nemotron 3 Nano technical report, only **6 of 29 sequence-mixing " +
      "layers use attention (GQA)**. The remaining 23 are **Mamba-2 state-space " +
      "model** layers — selective SSM blocks that carry a fixed-size recurrent " +
      "state, giving **O(1) inference cost in context length** for the vast " +
      "majority of the compute graph. The GQA layers are there to preserve a " +
      "small amount of full attention where it matters most (early embedding " +
      "resolution, long-range retrieval).",
  },
  {
    __component: "deep.paragraph",
    body:
      "This is why the KV cache is ≈ **6 KiB per token**: only the 6 GQA layers " +
      "contribute. Compare to Qwen3-30B-A3B's standard GQA stack (full KV cache " +
      "on all layers) and you get a 50×+ reduction in long-context memory " +
      "footprint, which is what makes the 1 M native context window practical to " +
      "serve.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: SSM-First Frontier MoE", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Nemotron 3 Nano 30B-A3B is **the flagship argument that Mamba-2 is " +
      "competitive with attention at MoE scale**. For long-context workloads " +
      "(documents, codebases, retrieval), its KV-cache footprint is transformative " +
      "versus any pure-attention MoE in this gallery. The cost is research-risk: " +
      "SSM inference kernels are less mature than attention kernels, so serving " +
      "stacks need NVIDIA's own optimized runtime to hit the theoretical " +
      "performance. Read together with the xLSTM 7B deep dive to see two different " +
      "non-attention approaches to the same long-context problem.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Nemotron 3 Nano 30B-A3B — HuggingFace config.json",
        url: "https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16/blob/main/config.json",
      },
      {
        label: "NVIDIA Nemotron 3 Nano Technical Report",
        url: "https://research.nvidia.com/labs/nemotron/files/NVIDIA-Nemotron-3-Nano-Technical-Report.pdf",
      },
      {
        label: "Mamba: Linear-Time Sequence Modeling (Gu & Dao, 2023) — arXiv:2312.00752",
        url: "https://arxiv.org/abs/2312.00752",
      },
    ],
  },
];
