/**
 * Deep-dive content for `sarvam-30b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary sources:
 *   - HuggingFace `sarvamai/sarvam-30b/config.json`
 *   - Sarvam AI blog: "Sarvam 30B & 105B" (2026-03)
 */

export const slug = "sarvam-30b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Sarvam 30B is the smaller sibling to **Sarvam 105B** in Sarvam AI's " +
      "March 2026 Indic-first release. At 30 B total / 2.4 B active, it is an " +
      "unusually sparse MoE — roughly an 8% active-to-total ratio, sparser than " +
      "Qwen3-30B-A3B (10% active) and GPT-OSS 20B (18% active). The intent: " +
      "Indic-language serving at mobile / edge GPU scale, leveraging the MoE's " +
      "small active compute to keep per-token cost cheap.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Sarvam 30B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 30 B", "MoE"],
      ["Active parameters", "≈ 2.4 B", "per token — very sparse"],
      ["Layers", "19", "shallow for this param count"],
      ["Attention", "GQA + QK-Norm", "no MLA at this tier"],
      ["KV cache", "≈ 19 KiB/token", ""],
      ["Max position", "131,072", "128 K native"],
      ["Vocabulary", "≈ 262,000", "same large Indic-coverage vocab as Sarvam 105B"],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "2.4B Active: The Mobile-MoE Bet", anchor: "active" },
  {
    __component: "deep.paragraph",
    body:
      "Per-token compute cost at **2.4 B active** puts Sarvam 30B in the same " +
      "serving-cost band as a dense 2.4 B model (Llama 3.2 1B, SmolLM3 3B). " +
      "But Sarvam 30B carries 12× the total parameters in its expert pool, " +
      "which means roughly 12× the knowledge capacity. This is the 'small " +
      "active, large total' MoE bet taken to an unusually sparse ratio — " +
      "Sarvam is betting that at edge deployment scale, where per-token " +
      "inference cost is the binding constraint, serving a sparse MoE is " +
      "preferable to serving a dense model of comparable compute cost.",
  },

  { __component: "deep.heading", level: "h2", text: "Same Indic Vocab as Sarvam 105B", anchor: "vocab" },
  {
    __component: "deep.paragraph",
    body:
      "The 262 K vocabulary is shared across the Sarvam family and is the key " +
      "to the serving-cost story on Indic workloads. See the Sarvam 105B deep " +
      "dive for a longer explanation of why large Indic vocabularies matter.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: Indic Edge MoE", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Sarvam 30B is **Sarvam AI's edge-tier pick** for Indic-language " +
      "workloads that cannot afford frontier serving cost. At 2.4 B active " +
      "compute per token, it should fit into consumer-GPU serving budgets " +
      "while providing meaningful knowledge capacity in long-tail Indic " +
      "languages. For general-purpose 30B use, Qwen3-30B-A3B is stronger; for " +
      "Indic workloads at mobile scale, Sarvam 30B is the default.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Sarvam 30B — HuggingFace config.json",
        url: "https://huggingface.co/sarvamai/sarvam-30b/blob/main/config.json",
      },
      {
        label: "Sarvam 30B & 105B — Sarvam AI blog",
        url: "https://www.sarvam.ai/blogs/sarvam-30b-105b",
      },
    ],
  },
];
