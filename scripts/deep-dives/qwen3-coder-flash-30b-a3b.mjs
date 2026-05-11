/**
 * Deep-dive content for `qwen3-coder-flash-30b-a3b`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 2, Wave A).
 *
 * Primary sources:
 *   - HuggingFace `Qwen/Qwen3-Coder-30B-A3B-Instruct/config.json`
 *   - Qwen blog: "Qwen3-Coder: Agentic Coding in the World" (2025)
 *   - arXiv 2505.09388 ("Qwen3 Technical Report", Alibaba, 2025)
 *
 * Qwen3-Coder-Flash is a code-specialized fine-tune of the Qwen3-30B-A3B MoE
 * base. Same architecture, different training mix + post-training recipe.
 */

export const slug = "qwen3-coder-flash-30b-a3b";

export const blocks = [
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-Coder-Flash-30B-A3B is a **code-specialized** derivative of the Qwen3-30B-" +
      "A3B MoE base, released by Alibaba in 2025 as the 'Flash' tier of the Qwen3-Coder " +
      "line. Architecturally it is identical to the Qwen3-30B-A3B checkpoint covered in " +
      "its own deep dive — 30 B total parameters, 3 B active, 128 experts top-8, 48 " +
      "layers, GQA 8:1 attention, QK-Norm. The entire delta lives in the training data " +
      "mix and the post-training recipe, both of which are tuned for code generation, " +
      "code review, and agentic coding workflows.",
  },

  { __component: "deep.heading", level: "h2", text: "Same Architecture as Qwen3-30B-A3B", anchor: "architecture" },
  {
    __component: "deep.paragraph",
    body:
      "Rather than repeat the full spec table, we defer to the **qwen3-30b-a3b deep " +
      "dive** in this gallery. Every attention kernel, every expert router, every " +
      "QK-Norm step you need to understand for Qwen3-Coder-Flash is described there. " +
      "The Qwen team explicitly chose to keep the architecture unchanged so that the " +
      "coder variant could share inference infrastructure with the general-purpose " +
      "checkpoint — you can swap the weights on a running vLLM or TGI deployment " +
      "without reconfiguring anything.",
  },
  {
    __component: "deep.callout",
    variant: "note",
    title: "Why this model exists as a separate entry",
    body:
      "Qwen3-Coder-Flash and Qwen3-30B-A3B share every architectural primitive. What " +
      "differs is training data (code-heavy), post-training data (agentic coding " +
      "traces, repository-level tasks), and default sampling parameters (temperature " +
      "tuned for code). That's enough of a behavioral delta to warrant a separate " +
      "entry in this gallery even though the 'architecture' section could be four " +
      "words long.",
  },

  { __component: "deep.heading", level: "h2", text: "Training: Code-Heavy Pretraining Mix", anchor: "training" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-Coder-Flash is *not* a pure fine-tune. Per the Qwen3-Coder blog post, the " +
      "model goes through a **continued-pretraining** pass on a code-dominated corpus " +
      "(reportedly ≈ 70% code, 30% text, vs the general Qwen3 mix which is closer to " +
      "15% code). The continued-pretrain stage starts from the Qwen3-30B-A3B base " +
      "checkpoint and runs for several T tokens — substantially longer than a " +
      "typical SFT pass — which lets the MoE router learn to route coding tokens to " +
      "a specialized subset of experts.",
  },
  {
    __component: "deep.paragraph",
    body:
      "Post-training follows the Qwen3 four-stage recipe but with two important " +
      "differences. First, the reasoning-focused RL stage uses **code-execution " +
      "rewards** — the model's output is compiled and its unit tests are run, and the " +
      "pass rate is the reward signal (the same general idea as DeepSeek-R1's rule-" +
      "based rewards, specialized for code). Second, the final general-purpose RL " +
      "stage is replaced with **agentic-task SFT** — multi-turn traces of the model " +
      "using tools, editing files, and running commands in a sandboxed development " +
      "environment.",
  },

  { __component: "deep.heading", level: "h2", text: "Agentic Coding: The Target Workload", anchor: "agentic" },
  {
    __component: "deep.paragraph",
    body:
      "The Qwen3-Coder blog is explicit about the target deployment: **agentic coding " +
      "assistants** that edit files, run tests, and iterate on build failures over " +
      "many turns, not single-shot code completion. That motivates the specific " +
      "post-training choices — multi-turn SFT on sandbox traces, tool-use format " +
      "training, and a default chat template that leans toward the thinking-mode " +
      "switch for code-review style tasks.",
  },

  { __component: "deep.heading", level: "h2", text: "Benchmarks vs General Qwen3-30B-A3B", anchor: "benchmarks" },
  {
    __component: "deep.paragraph",
    body:
      "On code benchmarks (HumanEval, MBPP, LiveCodeBench, SWE-Bench) Qwen3-Coder-" +
      "Flash measurably outperforms the general Qwen3-30B-A3B from which it was " +
      "derived — which is expected given the continued-pretrain investment. More " +
      "interestingly, it *loses* a small amount on general-knowledge benchmarks like " +
      "MMLU and TriviaQA, because the code-heavy continued pretraining shifts the " +
      "capability distribution. If your workload is 90%+ code, this is the right " +
      "tradeoff; if you need a general assistant, the base Qwen3-30B-A3B is stronger.",
  },

  { __component: "deep.heading", level: "h2", text: "Verdict: The Agentic Coder Pick", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "Qwen3-Coder-Flash is the natural pick when you're building an agentic coding " +
      "assistant and want MoE serving economics. Its 3 B active cost makes it " +
      "substantially cheaper per token than dense 30B code models like Codestral " +
      "22B or DeepSeek-Coder-V2, while the underlying Qwen3 architecture gives you " +
      "the thinking-mode switch for code-review depth. For pure inline code " +
      "completion (where latency beats quality), a dense 7B coder is faster; for " +
      "agentic multi-turn coding, Qwen3-Coder-Flash is the default.",
  },

  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "Qwen3-Coder-30B-A3B-Instruct — HuggingFace config.json",
        url: "https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct/blob/main/config.json",
      },
      {
        label: "Qwen3-Coder: Agentic Coding in the World — Qwen blog (2025)",
        url: "https://qwenlm.github.io/blog/qwen3-coder/",
      },
      {
        label: "Qwen3 Technical Report (Alibaba, 2025) — arXiv:2505.09388",
        url: "https://arxiv.org/abs/2505.09388",
      },
    ],
  },
];
