/**
 * Deep-dive content for `gemma-4-26b-a4b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary sources:
 *   - HuggingFace `google/gemma-4-26B-A4B-it/config.json`
 *   - Gemma 4 model card (ai.google.dev)
 */

export const slug = "gemma-4-26b-a4b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Gemma 4 26B-A4B is **Google's first MoE release in the Gemma line**, " +
      "published April 2026. At 25.2 B total / 3.8 B active it is a sparse MoE " +
      "in the same band as Qwen3-30B-A3B. The Gemma 3 → Gemma 4 transition is " +
      "therefore a **dense → MoE generational shift** that mirrors what Mistral " +
      "did with Small 4. Structural inheritances from Gemma 3 — **local-global " +
      "attention interleave, QK-Norm, large vocabulary** — are preserved, " +
      "making this a natural A/B partner for the Gemma 3 27B deep dive.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Gemma 4 26B-A4B configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 25.2 B", "MoE — Gemma's first"],
      ["Active parameters", "≈ 3.8 B", "per token"],
      ["Layers", "30", "25 sliding-window + 5 global (5:1)"],
      ["Attention", "GQA + QK-Norm + SWA", "inherited from Gemma 3"],
      ["KV cache", "≈ 210 KiB/token", ""],
      ["Max position", "262,144", "256 K native — double Gemma 3's 128 K"],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "Google's First Gemma MoE", anchor: "moe" },
  {
    __component: "deep.paragraph",
    body:
      "Gemma 1, Gemma 2, and Gemma 3 were all dense. Gemma 4 26B-A4B is the " +
      "**first MoE release in the Gemma family**, alongside a dense " +
      "Gemma 4 31B variant. Per-token compute at 3.8 B active is lower than " +
      "Gemma 3 27B's 27 B dense compute by nearly 7×, so Gemma 4 26B-A4B serves " +
      "dramatically faster than Gemma 3 27B while carrying slightly less total " +
      "capacity. This is a deliberate tradeoff: Google is betting that for " +
      "Gemma's typical deployment context (single-GPU inference on consumer " +
      "hardware), serving speed matters more than peak quality.",
  },

  { __component: "deep.heading", level: "h2", text: "Local-Global 5:1 Preserved", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "The **5:1 sliding-window to global attention ratio** — Gemma 3's " +
      "signature choice — carries over unchanged to Gemma 4. Only 5 of 30 " +
      "layers attend to the full 256 K context, which keeps per-token KV " +
      "cost manageable even as the context window doubled from 128 K to 256 K. " +
      "QK-Norm on queries and keys is also preserved, as is Gemma's distinctive " +
      "logit soft-capping.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: Gemma Goes MoE", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Gemma 4 26B-A4B is **architecturally conservative within the Gemma " +
      "family** — it inherits every Gemma 3 design choice and adds MoE on top " +
      "— but **strategically significant** as Google's signal that MoE is now " +
      "the default for Gemma deployments. For teams running Gemma 3 27B in " +
      "production, Gemma 4 26B-A4B is a drop-in upgrade that roughly doubles " +
      "serving throughput and doubles context window while preserving the " +
      "same local-global attention semantics.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Gemma 4 26B-A4B Instruction — HuggingFace config.json",
        url: "https://huggingface.co/google/gemma-4-26B-A4B-it/blob/main/config.json",
      },
      {
        label: "Gemma 4 Model Card — Google",
        url: "https://ai.google.dev/gemma/docs/core/model_card_4",
      },
    ],
  },
];
