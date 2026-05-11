/**
 * Deep-dive content for `step-3-5-flash-196b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary sources:
 *   - HuggingFace `stepfun-ai/Step-3.5-Flash/config.json`
 *   - Step 3.5 technical report — arXiv:2602.10604
 */

export const slug = "step-3-5-flash-196b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Step 3.5 Flash is a **196 B total / 11 B active parameter** sparse MoE " +
      "from StepFun AI, released February 2026. The 'Flash' suffix matches the " +
      "positioning of Xiaomi MiMo-V2-Flash: low-latency serving at MoE scale. " +
      "Step 3.5 Flash uses a **3:1 sliding-window to global attention ratio** " +
      "with 36 local + 12 global layers across 48 total — a moderate global " +
      "budget similar to OLMo 3 but with much larger total parameter count.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Step 3.5 Flash 196B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 196 B", "MoE"],
      ["Active parameters", "≈ 11 B", "per token"],
      ["Layers", "48", "36 sliding-window + 12 global"],
      ["Attention", "GQA + 3:1 SWA", ""],
      ["KV cache", "≈ 192 KiB/token", ""],
      ["Max position", "262,144", "256 K native"],
      ["Vocabulary", "≈ 129,000", ""],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "3:1 Local-Global", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "Step 3.5 Flash's 3:1 ratio sits between GPT-OSS 120B's 1:1 (very global-" +
      "heavy) and Gemma 3 / MiMo-V2's 5:1 (very global-sparse). At this ratio " +
      "roughly 25% of layers attend to the full context, which preserves long-" +
      "range mixing at every fourth layer while keeping per-token attention " +
      "compute manageable. The 11 B active compute budget makes Step 3.5 Flash " +
      "serve at roughly the speed of a dense 11 B decoder.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: StepFun's Flash Tier", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Step 3.5 Flash is StepFun's answer to MiniMax M2 and Xiaomi MiMo-V2-Flash " +
      "— a latency-optimized MoE in the 200 B total-parameter band. The 3:1 " +
      "local-global ratio is a middle-ground choice and the overall design is " +
      "conservative. For Chinese-ecosystem deployments where StepFun is a known " +
      "vendor, this is the default 'fast MoE' pick.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Step 3.5 Flash — HuggingFace config.json",
        url: "https://huggingface.co/stepfun-ai/Step-3.5-Flash/blob/main/config.json",
      },
      {
        label: "Step 3.5 technical report — arXiv:2602.10604",
        url: "https://arxiv.org/pdf/2602.10604",
      },
    ],
  },
];
