/**
 * Deep-dive content for `kimi-k2-5`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary sources:
 *   - HuggingFace `moonshotai/Kimi-K2.5/config.json`
 *   - arXiv 2602.02276 (Kimi K2.5 technical report)
 */

export const slug = "kimi-k2-5";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Kimi K2.5 is the January 2026 refresh of Moonshot AI's Kimi K2 trillion-" +
      "parameter MoE. The architectural skeleton is **unchanged from Kimi K2**: " +
      "still 1 T total / 32 B active, still 61 layers of MLA, still the same " +
      "shared-expert + fine-grained routed expert pattern inherited from DeepSeek " +
      "V3. Read the Kimi K2 deep dive first — this dive covers only the K2.5 " +
      "deltas.",
  },

  { __component: "deep.heading", level: "h2", text: "What Changed from K2", anchor: "changes" },
  {
    __component: "deep.list",
    style: "bullet",
    items: [
      "**Context window**: 128K → 256K native. Longer long-context pretraining phase; RoPE configuration in config.json confirms the extension.",
      "**Post-training**: refreshed agentic SFT mix with more tool-use trajectories and more multi-step-planning data.",
      "**Architecture**: zero structural changes. Same 61-layer MLA stack, same expert count, same ≈ 68.6 KiB/token KV cache footprint.",
    ],
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Kimi K2.5 configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 1 T", "MoE — same as Kimi K2"],
      ["Active parameters", "≈ 32 B", "per token"],
      ["Layers", "61", "all MLA — DeepSeek V3 inheritance"],
      ["Attention", "MLA", "Multi-head Latent Attention"],
      ["KV cache", "≈ 68.6 KiB/token", ""],
      ["Max position", "262,144", "256 K native — K2.5's primary upgrade"],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: K2 + 2× Context", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Kimi K2.5 is a **point release** targeting longer-context agentic " +
      "workloads. For teams already running K2, the upgrade is a drop-in " +
      "replacement that doubles the usable context window without changing " +
      "serving cost per token. The next Moonshot generation to watch for is any " +
      "model that adopts DeepSeek V3.2's sparse-attention primitive on top of " +
      "MLA, which would compound the K2.5 long-context gains further.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Kimi K2.5 — HuggingFace config.json",
        url: "https://huggingface.co/moonshotai/Kimi-K2.5/blob/main/config.json",
      },
      {
        label: "Kimi K2.5 technical report — arXiv:2602.02276",
        url: "https://arxiv.org/pdf/2602.02276",
      },
    ],
  },
];
