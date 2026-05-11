/**
 * Deep-dive content for `kimi-k2`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave A).
 *
 * Primary sources:
 *   - HuggingFace `moonshotai/Kimi-K2-Base/config.json`
 *   - arXiv 2507.20534 ("Kimi K2: Open Agentic Intelligence", Moonshot AI, 2025-07)
 *
 * Kimi K2 is Moonshot AI's trillion-parameter open-weights MoE flagship —
 * 1 T total / 32 B active, MLA attention (DeepSeek-V3 style), 61 layers.
 * Released July 2025 as one of the largest open-weight LLMs ever published.
 */

export const slug = "kimi-k2";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Kimi K2 is Moonshot AI's open-weights flagship, released July 2025 on " +
      "HuggingFace as `moonshotai/Kimi-K2-Base`. At **1 T total parameters / 32 B " +
      "active per token**, it is one of the largest open-weight LLMs ever " +
      "published, directly competitive with DeepSeek-V3 and Qwen3-235B-A22B in the " +
      "open-weight frontier-class MoE category.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Architecturally, Kimi K2 is best understood as a **DeepSeek-V3 scale-up**. " +
      "It reuses the same core recipe — **Multi-head Latent Attention (MLA)**, " +
      "fine-grained MoE with a shared expert, 61 layers, the same RoPE + pre-norm " +
      "structure — and scales expert capacity upward. Reading the DeepSeek-V3 deep " +
      "dive first gives you most of the architectural story already.",
  },

  { __component: "deep.heading", level: "h2", text: "Architecture at a Glance", anchor: "specs" },
  {
    __component: "deep.table",
    caption: "Kimi K2 configuration (source: HuggingFace config.json)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 1 T", "MoE"],
      ["Active parameters", "≈ 32 B", "per token"],
      ["Layers", "61", "same depth as DeepSeek-V3"],
      ["Attention", "MLA", "Multi-head Latent Attention"],
      ["KV cache", "≈ 68.6 KiB/token", "per the Kimi K2 tech report"],
      ["Vocabulary", "163,840", "`vocab_size`"],
      ["Max position", "131,072", "`max_position_embeddings` — 128K native"],
      ["Normalization", "RMSNorm", "pre-norm"],
      ["Activation", "SiLU (SwiGLU)", "`hidden_act = silu`"],
      ["Precision", "bfloat16", "`torch_dtype`"],
    ],
  },

  { __component: "deep.heading", level: "h2", text: "MLA: The DeepSeek-V3 Inheritance", anchor: "mla" },
  {
    __component: "deep.paragraph",
    body:
      "Kimi K2's attention blocks use **Multi-head Latent Attention (MLA)**, the " +
      "same attention compression technique DeepSeek introduced in DeepSeek-V2 and " +
      "scaled up for DeepSeek-V3. MLA projects keys and values through a low-rank " +
      "latent bottleneck before the attention operation, which collapses the KV " +
      "cache to a single shared representation per token. The result is a KV cache " +
      "footprint of **≈ 68.6 KiB per token** at 128K context — much smaller than " +
      "Qwen3-235B-A22B (which uses standard GQA) despite Kimi K2 being ≈ 4× larger " +
      "in total parameter count.",
  },
  {
    __component: "deep.paragraph",
    body:
      "See the DeepSeek-V3 deep dive for a full explanation of MLA's geometry — " +
      "the latent projection, the decoupled RoPE keys, and why MLA is friendlier to " +
      "long-context serving than GQA. Kimi K2 inherits that entire stack unchanged " +
      "except for the parameter count.",
  },

  { __component: "deep.heading", level: "h2", text: "MoE: Fine-Grained With Shared Expert", anchor: "moe" },
  {
    __component: "deep.paragraph",
    body:
      "Kimi K2's MoE design follows the DeepSeek-V3 pattern: **many fine-grained " +
      "routed experts** (hundreds per MoE layer) with a small **shared expert** " +
      "that is always active. The shared expert absorbs the 'common subroutines' " +
      "every token needs, which lets the routed experts specialize more " +
      "aggressively on domain-specific patterns without duplicating baseline " +
      "knowledge across every expert. Per-token top-k is relatively tight (single-" +
      "digit) to keep active FLOPs at the 32 B budget.",
  },
  {
    __component: "deep.callout",
    variant: "insight",
    title: "Why 1T total, 32B active?",
    body:
      "The Kimi K2 tech report (arXiv 2507.20534) argues that for agentic long-" +
      "horizon tasks, **total parameters (knowledge capacity) matter more than " +
      "active parameters (per-token compute)**. A 32B-active MoE serves roughly as " +
      "cheaply as a dense 32B model per token, but it has access to a 30× larger " +
      "knowledge store. For a model pitched at coding agents, research assistants, " +
      "and tool-use workloads — where recall of rare facts and APIs matters more " +
      "than raw token throughput — scaling the expert pool at fixed active compute " +
      "is a deliberate product bet.",
  },

  { __component: "deep.heading", level: "h2", text: "Training: Agentic Emphasis", anchor: "training" },
  {
    __component: "deep.paragraph",
    body:
      "The Kimi K2 technical report is explicit about its agentic focus: the " +
      "post-training pipeline emphasizes **tool use, multi-turn planning, and " +
      "long-horizon task completion** rather than pure single-turn QA. The model " +
      "was trained with synthetic agentic trajectories (multi-step tool call " +
      "sequences) in addition to standard instruction tuning and RLHF. This makes " +
      "Kimi K2 strong out-of-the-box on agentic benchmarks like SWE-bench, " +
      "but less focused on single-turn chatbot benchmarks like MT-Bench where " +
      "Qwen3-235B-A22B-Thinking and DeepSeek-V3 are more tuned.",
  },

  { __component: "deep.heading", level: "h2", text: "Deployment: Serving 1T Total Parameters", anchor: "deployment" },
  {
    __component: "deep.paragraph",
    body:
      "At bf16 the full 1 T weight set is ≈ 2 TB — this is not a single-node " +
      "model. Kimi K2 is designed for distributed serving: expert-parallelism " +
      "across many GPUs, with MLA keeping the per-token KV cache small enough that " +
      "long-context workloads stay viable. Active compute per token at ≈ 32 B " +
      "means per-token throughput is comparable to a dense 32 B model (e.g. " +
      "Qwen3-32B), but the total memory budget is two orders of magnitude larger. " +
      "Expect 8× H100 80G as the minimum practical serving node.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The Agentic Open-Weight Trillion", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Kimi K2 is the answer to 'what if you applied DeepSeek-V3's architecture to " +
      "a knowledge-heavy agentic workload and scaled it out?'. Architecturally it " +
      "breaks no new ground — MLA, fine-grained MoE, shared expert, 61 layers are " +
      "all DeepSeek-V3 inheritances. The innovation is strategic: **picking 1 T " +
      "total parameters as a deliberate capacity bet** for agentic tasks, and " +
      "releasing it open-weight. If your workload is agentic (tool use, code " +
      "agents, research) and you have serving budget for a distributed MoE, Kimi " +
      "K2 is the open-weight default. For chat workloads, DeepSeek-V3 or Qwen3-" +
      "235B-A22B are more cost-effective.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Kimi-K2-Base — HuggingFace config.json",
        url: "https://huggingface.co/moonshotai/Kimi-K2-Base/blob/main/config.json",
      },
      {
        label: "Kimi K2: Open Agentic Intelligence (Moonshot AI, 2025-07) — arXiv:2507.20534",
        url: "https://arxiv.org/pdf/2507.20534",
      },
      {
        label: "DeepSeek-V2 (arXiv:2405.04434) — the MLA paper",
        url: "https://arxiv.org/abs/2405.04434",
      },
    ],
  },
];
