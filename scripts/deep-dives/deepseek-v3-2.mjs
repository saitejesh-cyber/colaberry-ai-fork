/**
 * Deep-dive content for `deepseek-v3-2`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave B).
 *
 * Primary sources:
 *   - HuggingFace `deepseek-ai/DeepSeek-V3.2/config.json`
 *   - arXiv 2512.02556 (DeepSeek V3.2 technical report)
 */

export const slug = "deepseek-v3-2";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "DeepSeek V3.2 is the December 2025 refresh of the DeepSeek V3 flagship — " +
      "the same 671 B total / 37 B active MoE architecture as V3, scaled with an " +
      "updated pretraining mix and a new attention primitive: **DeepSeek Sparse " +
      "Attention (DSA)**. Reading the DeepSeek V3 deep dive first is the fastest " +
      "way to understand V3.2, because every structural decision (61 layers of " +
      "MLA, fine-grained expert routing with a shared expert, MLA KV compression " +
      "to ≈ 68.6 KiB/token) carries over unchanged.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "DeepSeek V3.2 configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 671 B", "MoE — same as DeepSeek V3"],
      ["Active parameters", "≈ 37 B", "per token — same as V3"],
      ["Layers", "61", "all MLA"],
      ["Attention", "MLA + DeepSeek Sparse Attention", "DSA is the V3.2 addition"],
      ["KV cache", "≈ 68.6 KiB/token", "MLA compression preserved"],
      ["Max position", "131,072", "128 K native"],
      ["Vocabulary", "129,280", ""],
      ["Precision", "bfloat16", ""],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "DeepSeek Sparse Attention", anchor: "dsa" },
  {
    __component: "deep.paragraph",
    body:
      "DSA is DeepSeek's answer to the 'full attention is quadratic at 128 K " +
      "context' problem that even MLA cannot solve on its own. Per the V3.2 tech " +
      "report (arXiv 2512.02556), DSA introduces a learned sparsity mask on top " +
      "of MLA attention: each query token only attends to a subset of the keys, " +
      "selected by a small router that is trained jointly with the rest of the " +
      "model. The net effect is **sub-quadratic attention compute** at long " +
      "context, while preserving MLA's KV-cache compression.",
  },
  {
    __component: "deep.paragraph",
    body:
      "This is a meaningfully more ambitious attention primitive than any Wave A " +
      "model ships. For comparison: Kimi K2 and GLM-4.5 use standard MLA or GQA " +
      "with full dense attention. DeepSeek V3.2 is the first open-weight frontier " +
      "MoE to layer learned attention sparsity on top of MLA, which is why its " +
      "long-context serving benchmarks leapfrog even the V3 baseline.",
  },

  { __component: "deep.heading", level: "h2", text: "What Stayed the Same", anchor: "unchanged" },
  {
    __component: "deep.paragraph",
    body:
      "Everything architectural outside the attention layers is the same as " +
      "DeepSeek V3: **61-layer MLA stack**, **fine-grained MoE with shared " +
      "expert**, **loss-free load balancing** (no auxiliary loss), **FP8 mixed " +
      "precision** training recipe, **Multi-Token Prediction** training objective. " +
      "The V3.2 deltas are entirely on the attention and post-training fronts.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The Long-Context Leader", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "DeepSeek V3.2 is the **long-context throughput leader** among open-weight " +
      "frontier MoEs as of late 2025. If your workload is long-context agentic " +
      "reasoning (128 K-range contexts with heavy retrieval), V3.2's DSA + MLA " +
      "combination is the most efficient serving story available. For shorter " +
      "contexts the advantage over V3 is smaller — DSA's gains scale with " +
      "sequence length, and at 4 K–16 K contexts the overhead of the sparsity " +
      "router can even cost a few percent.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "DeepSeek V3.2 — HuggingFace config.json",
        url: "https://huggingface.co/deepseek-ai/DeepSeek-V3.2/blob/main/config.json",
      },
      {
        label: "DeepSeek V3.2 technical report — arXiv:2512.02556",
        url: "https://arxiv.org/pdf/2512.02556",
      },
    ],
  },
];
