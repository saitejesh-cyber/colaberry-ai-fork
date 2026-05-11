/**
 * Deep-dive content for `glm-4-5-355b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave A).
 *
 * Primary sources:
 *   - HuggingFace `zai-org/GLM-4.5/config.json`
 *   - arXiv 2508.06471 ("GLM-4.5: Agentic, Reasoning, and Coding Foundation
 *     Models", Zhipu AI, 2025-08)
 *
 * GLM-4.5 is Zhipu AI's July 2025 open-weights flagship — 355 B total / 32 B
 * active MoE, 92 layers, GQA + QK-Norm. Same model family as the newer
 * GLM-5 flagship deep-dive already in the gallery.
 */

export const slug = "glm-4-5-355b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "GLM-4.5 is Zhipu AI's July 2025 open-weights flagship MoE, published " +
      "alongside a technical report titled *GLM-4.5: Agentic, Reasoning, and Coding " +
      "Foundation Models* (arXiv 2508.06471). The model is **355 B total " +
      "parameters / 32 B active per token**, making it a direct competitor to " +
      "DeepSeek-V3 (671 B/37 B) and Kimi K2 (1 T/32 B) in the open-weight frontier " +
      "MoE tier. It is the immediate predecessor to GLM-5 744B, which shares the " +
      "same architectural family scaled up — reading the GLM-5 deep dive first " +
      "gives you most of the context.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "GLM-4.5 configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 355 B", "MoE"],
      ["Active parameters", "≈ 32 B", "per token"],
      ["Layers", "92", "much deeper than DeepSeek-V3's 61"],
      ["Attention", "GQA + QK-Norm", "not MLA"],
      ["KV cache", "≈ 368 KiB/token", "per the tech report (heavy vs MLA models)"],
      ["Vocabulary", "151,552", "`vocab_size`"],
      ["Max position", "131,072", "`max_position_embeddings` — 128K native"],
      ["Normalization", "RMSNorm", "pre-norm"],
      ["Activation", "SiLU (SwiGLU)", "`hidden_act = silu`"],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },
  {
    __component: "deep.callout",
    variant: "insight",
    title: "92 layers is unusually deep",
    body:
      "GLM-4.5 is the second-deepest model in this gallery (after Qwen3-235B-A22B's " +
      "94). At 92 layers it is significantly deeper than DeepSeek-V3 (61) and Kimi " +
      "K2 (61), which means more sequential residual-stream transformations per " +
      "token and potentially more nuanced per-layer specialization. The cost is " +
      "training stability: deep MoE training is notoriously sensitive to " +
      "optimizer instability, and the GLM team's reliance on QK-Norm is likely at " +
      "least partly a response to this.",
  },

  { __component: "deep.heading", level: "h2", text: "GQA + QK-Norm, Not MLA", anchor: "attention" },
  {
    __component: "deep.paragraph",
    body:
      "Unlike DeepSeek-V3 and Kimi K2, GLM-4.5 does **not** use Multi-head Latent " +
      "Attention. It uses the more conventional combination of **Grouped-Query " +
      "Attention (GQA)** with **Query-Key normalization (QK-Norm)** — the same " +
      "attention stack Qwen3 uses. This is a deliberate design choice: GQA is " +
      "simpler to implement and works out of the box with every major inference " +
      "framework, whereas MLA requires custom kernels and is only recently well-" +
      "supported outside DeepSeek's own serving stack.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The tradeoff is KV-cache footprint: at **≈ 368 KiB per token**, GLM-4.5's " +
      "KV cache is ~5× larger than Kimi K2's 68.6 KiB at comparable serving " +
      "scale. At 128 K context this is ≈ 46 GiB of KV cache per sequence, which " +
      "meaningfully affects serving batch sizes on multi-tenant deployments. The " +
      "GLM team is betting that the implementation simplicity of GQA outweighs " +
      "the extra memory cost.",
  },

  { __component: "deep.heading", level: "h2", text: "Training: Agentic + Reasoning + Coding", anchor: "training" },
  {
    __component: "deep.paragraph",
    body:
      "The GLM-4.5 technical report's subtitle — 'Agentic, Reasoning, and Coding " +
      "Foundation Models' — is an explicit signal that the post-training pipeline " +
      "targets three distinct capability axes:",
  },
  {
    __component: "deep.list",
    style: "bullet",
    items: [
      "**Agentic**: tool-use trajectories, multi-step planning, and long-horizon task completion — similar to Kimi K2's emphasis.",
      "**Reasoning**: chain-of-thought pretraining data and an RL phase optimized against verifiable rewards on math and logical-deduction benchmarks — comparable to Qwen3's thinking mode.",
      "**Coding**: code-heavy pretraining mix plus code-execution rewards during RL (run the generated code, check the output, reward correctness).",
    ],
  },
  {
    __component: "deep.paragraph",
    body:
      "This triple-targeted post-training is why GLM-4.5 benchmarks strongly on " +
      "SWE-bench and the GPQA-Diamond reasoning set but is less differentiated on " +
      "general conversational benchmarks like MT-Bench — the pretraining budget " +
      "was spent buying specific capability curves rather than general quality.",
  },

  { __component: "deep.heading", level: "h2", text: "Deployment", anchor: "deployment" },
  {
    __component: "deep.paragraph",
    body:
      "At bf16 the full 355 B weight set is ≈ 710 GB — requires multi-GPU " +
      "distributed serving. Active compute per token at ≈ 32 B means per-token " +
      "throughput is comparable to a dense 32 B decoder (Qwen3-32B, Yi-34B), but " +
      "the total memory budget is an order of magnitude larger. Expect 8× H100 " +
      "80G as the minimum practical serving configuration. The tech report " +
      "publishes reference serving throughput numbers against SGLang and vLLM.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The Zhipu Foundation", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "GLM-4.5 is Zhipu AI's strongest open-weights release of 2025 and the " +
      "immediate architectural foundation for GLM-5 744B. It is the right pick " +
      "if you need a frontier-class open-weight MoE with **standard GQA** (for " +
      "inference-framework simplicity), **agentic-tuned post-training** (for " +
      "tool-use workloads), and a **deep stack** (for per-layer specialization). " +
      "For MLA-based memory efficiency, DeepSeek-V3 or Kimi K2 are more " +
      "attractive; for reasoning-mode benchmarks, Qwen3-235B-A22B-Thinking is " +
      "slightly ahead.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "GLM-4.5 — HuggingFace config.json",
        url: "https://huggingface.co/zai-org/GLM-4.5/blob/main/config.json",
      },
      {
        label: "GLM-4.5: Agentic, Reasoning, and Coding Foundation Models (Zhipu AI, 2025-08) — arXiv:2508.06471",
        url: "https://arxiv.org/pdf/2508.06471",
      },
    ],
  },
];
