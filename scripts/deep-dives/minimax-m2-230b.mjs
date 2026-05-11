/**
 * Deep-dive content for `minimax-m2-230b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary source: HuggingFace `MiniMaxAI/MiniMax-M2/config.json`
 * MiniMax M2 was released in October 2025 as MiniMax's successor to the
 * MiniMax-01 and Text-01 lines. Architecture facts are taken from the
 * shipped config.json.
 */

export const slug = "minimax-m2-230b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "MiniMax M2 is a **230 B total / 10 B active parameter** sparse MoE from " +
      "MiniMax, released October 2025. It is the production successor to MiniMax's " +
      "earlier Text-01 and MiniMax-01 open-weight releases. Distinctive features, " +
      "per the shipped `config.json`, are the **197 K native context window**, " +
      "**GQA + QK-Norm** attention, and a **partial-RoPE** positional scheme — an " +
      "unusual combination that most of the open ecosystem does not ship.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "MiniMax M2 230B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 230 B", "MoE"],
      ["Active parameters", "≈ 10 B", "per token"],
      ["Layers", "62", "all GQA"],
      ["Attention", "GQA + QK-Norm + partial RoPE", "per config.json"],
      ["KV cache", "≈ 248 KiB/token", "heavy (no MLA)"],
      ["Max position", "201,728", "≈ 197 K native"],
      ["Vocabulary", "≈ 200,000", ""],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "Partial RoPE", anchor: "rope" },
  {
    __component: "deep.paragraph",
    body:
      "The M2 config.json applies RoPE rotations to **only a subset of each query " +
      "and key vector**, leaving the remaining dimensions positionless. This " +
      "'partial RoPE' pattern is a middle ground between full RoPE and NoPE (no " +
      "positional encoding at all). The rationale is that the positionless " +
      "dimensions can capture content-based associations that pure RoPE dimensions " +
      "cannot, while the rotated dimensions still give the model a relative-" +
      "position signal. It is the same trick Meta's Llama 3 team experimented with " +
      "but at a more aggressive ratio.",
  },

  { __component: "deep.heading", level: "h2", text: "MoE + QK-Norm", anchor: "moe" },
  {
    __component: "deep.paragraph",
    body:
      "At 230 B total / 10 B active, M2 is one of the sparser MoEs in the 200-300 " +
      "B total-parameter band (by comparison, GPT-OSS 120B is 117 B total / 5 B " +
      "active — MiniMax pushes the sparsity ratio further). **QK-Norm** is applied " +
      "to queries and keys before the attention operation, the same stability " +
      "trick Qwen3 and GLM-4.5 use to keep deep-transformer training well-behaved.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The Long-Context MoE", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "MiniMax M2's pitch is **197 K native context with 10 B active compute**: a " +
      "long-context MoE that serves at roughly the cost of a dense 10 B decoder. " +
      "The partial-RoPE design is the most architecturally interesting choice in " +
      "the config and may be part of how they trained stable to that context " +
      "length without YaRN. For context-heavy agentic workloads, M2 is worth " +
      "benchmarking against Kimi K2 and Qwen3-Next.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "MiniMax M2 — HuggingFace config.json",
        url: "https://huggingface.co/MiniMaxAI/MiniMax-M2/blob/main/config.json",
      },
    ],
  },
];
