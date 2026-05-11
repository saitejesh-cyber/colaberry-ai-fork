/**
 * Deep-dive content for `minimax-m2-5-230b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary source: HuggingFace `MiniMaxAI/MiniMax-M2.5/config.json`
 */

export const slug = "minimax-m2-5-230b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "MiniMax M2.5 is MiniMax's February 2026 refresh of MiniMax M2 — same " +
      "230 B total / 10 B active MoE architecture, same 62-layer GQA stack, same " +
      "QK-Norm attention stability trick. The primary delta versus M2 is in " +
      "post-training and the data mix, not architecture. Read the MiniMax M2 " +
      "230B deep dive first — this one covers only the deltas.",
  },

  { __component: "deep.heading", level: "h2", text: "What Changed from M2", anchor: "changes" },
  {
    __component: "deep.list",
    style: "bullet",
    items: [
      "**Partial RoPE removed**: M2.5's config.json applies full RoPE to every query/key dimension, dropping M2's partial-RoPE experiment. MiniMax apparently found the content-based dimensions weren't pulling their weight at scale.",
      "**Post-training refresh**: updated agentic and reasoning SFT mixes.",
      "**Architecture otherwise unchanged**: 62 layers, 10 B active, ≈ 248 KiB/token KV cache, 197 K native context.",
    ],
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "MiniMax M2.5 230B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 230 B", "MoE — same as M2"],
      ["Active parameters", "≈ 10 B", "per token"],
      ["Layers", "62", "all GQA"],
      ["Attention", "GQA + QK-Norm", "partial RoPE dropped"],
      ["KV cache", "≈ 248 KiB/token", ""],
      ["Max position", "≈ 201,728", "197 K native"],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: M2 + Better Post-Training", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "MiniMax M2.5 is a **point release** targeted at improving downstream " +
      "quality rather than architectural efficiency. For teams already running " +
      "M2 the upgrade is a drop-in. The quiet interesting signal is the removal " +
      "of partial RoPE: MiniMax was one of the few labs experimenting with " +
      "partial positional encoding at frontier scale, and rolling it back " +
      "suggests the research community's 'full RoPE is enough' consensus was " +
      "correct for this scale band.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "MiniMax M2.5 — HuggingFace config.json",
        url: "https://huggingface.co/MiniMaxAI/MiniMax-M2.5/blob/main/config.json",
      },
    ],
  },
];
