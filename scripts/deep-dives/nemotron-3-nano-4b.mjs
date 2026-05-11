/**
 * Deep-dive content for `nemotron-3-nano-4b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary sources:
 *   - HuggingFace `nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16/config.json`
 *   - NVIDIA blog: "Nemotron 3 Nano 4B" (HuggingFace blog)
 */

export const slug = "nemotron-3-nano-4b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Nemotron 3 Nano 4B is NVIDIA's **4 B hybrid Mamba-2 + transformer dense " +
      "decoder**, released March 2026 as the smallest member of the Nemotron 3 " +
      "family. Unlike the larger Nemotron 3 Nano 30B-A3B (which is MoE), the 4 B " +
      "is dense but keeps the family's signature architectural bet: **state-" +
      "space-model layers dominate the sequence-mixing stack, with attention " +
      "reserved for a handful of key positions**.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Nemotron 3 Nano 4B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 4 B", "dense (hybrid)"],
      ["Layer mix", "4 GQA + 21 Mamba-2 + 17 FFN", "attention is a tiny fraction"],
      ["Attention layers", "4", "only 4 attention layers in the entire model"],
      ["KV cache", "≈ 16 KiB/token", "tiny — only the 4 GQA layers contribute"],
      ["Max position", "262,144", "256 K native"],
      ["Vocabulary", "≈ 131,000", ""],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "Only 4 Attention Layers", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "Nemotron 3 Nano 4B is the clearest expression of NVIDIA's 'attention is " +
      "a seasoning, not a staple' bet. Only **4 of 25 sequence-mixing layers " +
      "use attention** — the other 21 are Mamba-2 state-space model layers, each " +
      "with a fixed recurrent state instead of a growing KV cache. The 4 " +
      "attention layers are placed at strategic positions in the stack (early " +
      "for tokenization resolution, periodically throughout for cross-token " +
      "information routing) rather than uniformly interleaved.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The serving consequence: at 256 K context, this 4 B model uses roughly " +
      "the same long-context memory as a 500 M pure-attention model would. It " +
      "is by far the cheapest long-context option in the 3B–4B band. The " +
      "research-risk side is the same as the 30B-A3B variant: Mamba-2 inference " +
      "kernels need NVIDIA's own runtime to hit peak throughput.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: SSM-First 4B", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Nemotron 3 Nano 4B is the **most SSM-heavy small model in the gallery**. " +
      "For edge deployments that need long-document processing (codebases, " +
      "documents, agentic workloads) on hardware that cannot afford per-token " +
      "KV-cache growth, this is the default research pick. For general-purpose " +
      "4B use where ecosystem support matters more than long-context serving " +
      "cost, Llama 3.2 3B or Qwen3-4B are safer bets.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Nemotron 3 Nano 4B — HuggingFace config.json",
        url: "https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16/blob/main/config.json",
      },
      {
        label: "NVIDIA Nemotron 3 Nano 4B — HuggingFace blog",
        url: "https://huggingface.co/blog/nvidia/nemotron-3-nano-4b",
      },
    ],
  },
];
