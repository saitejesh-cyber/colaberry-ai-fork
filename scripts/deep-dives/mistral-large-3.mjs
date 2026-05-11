/**
 * Deep-dive content for `mistral-large-3`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary source: HuggingFace `mistralai/Mistral-Large-3-675B-Instruct-2512/params.json`
 * No separate technical report at release time.
 */

export const slug = "mistral-large-3";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Mistral Large 3 is Mistral AI's December 2025 frontier flagship — a " +
      "**673 B total / 41 B active parameter** sparse MoE that is Mistral's " +
      "first model to adopt **Multi-head Latent Attention (MLA)**, the attention " +
      "primitive DeepSeek introduced in V2. At this scale Mistral Large 3 directly " +
      "competes with DeepSeek V3.2, Kimi K2, and GLM-5 744B in the frontier open-" +
      "weight MoE tier.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Mistral Large 3 configuration (source: HuggingFace params.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 673 B", "MoE"],
      ["Active parameters", "≈ 41 B", "per token"],
      ["Layers", "61", "all MLA — same depth as DeepSeek V3 family"],
      ["Attention", "MLA", "Mistral's first MLA adoption"],
      ["KV cache", "≈ 68.6 KiB/token", "same MLA compression as DeepSeek V3"],
      ["Max position", "262,144", "256 K native"],
      ["Vocabulary", "131,072", "Tekken tokenizer"],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "Mistral Adopts MLA", anchor: "mla" },
  {
    __component: "deep.paragraph",
    body:
      "Mistral's earlier models — Mistral Nemo, Mistral Small 3.1, Mixtral — all " +
      "used standard GQA attention. Mistral Large 3 is the **first Mistral release " +
      "to ship MLA**, the key-value projection-through-latent-bottleneck technique " +
      "pioneered by DeepSeek V2 and scaled for DeepSeek V3. The KV cache " +
      "footprint drops to ≈ 68.6 KiB per token at 256 K native context — a " +
      "dramatic improvement over Mistral Small 3.1 24B's 160 KiB/token, which is " +
      "what enabled the context-window expansion from 128 K to 256 K without " +
      "exploding serving memory.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Structurally Mistral Large 3's 61-layer MLA stack is identical in depth " +
      "and attention primitive to DeepSeek V3, which makes this model a natural " +
      "A/B benchmark partner: same core architecture, different pretraining data " +
      "and MoE routing. Any performance gap between the two is attributable to " +
      "training recipe, not architectural choice.",
  },

  { __component: "deep.heading", level: "h2", text: "Tekken Tokenizer", anchor: "tokenizer" },
  {
    __component: "deep.paragraph",
    body:
      "Mistral Large 3 continues the **Tekken tokenizer** (131 K vocab) that " +
      "Mistral adopted with Nemo and has shipped on every release since. For " +
      "non-English text Tekken is noticeably more compressive than Llama 3's or " +
      "GPT-2's BPE — in combination with the 256 K context window, the effective " +
      "usable context on multilingual workloads is significantly larger than " +
      "Kimi K2's or DeepSeek V3.2's.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: Mistral Rejoins the Frontier", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Mistral Large 3 is architecturally unadventurous — it is best read as " +
      "'DeepSeek V3 scaled slightly larger with the Tekken tokenizer and Mistral " +
      "post-training'. The strategic significance is that Mistral, after the " +
      "Mistral Small tier's dominance in 2024–2025, has **returned to shipping " +
      "frontier-scale weights**. For commercial deployment, the license is " +
      "Mistral's non-Apache research license — more restrictive than Mistral " +
      "Small 3.1's Apache 2.0 — which should be checked against use case before " +
      "adopting.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Mistral Large 3 675B Instruct — HuggingFace params.json",
        url: "https://huggingface.co/mistralai/Mistral-Large-3-675B-Instruct-2512/blob/main/params.json",
      },
      {
        label: "DeepSeek V2 (arXiv:2405.04434) — the MLA paper",
        url: "https://arxiv.org/abs/2405.04434",
      },
    ],
  },
];
