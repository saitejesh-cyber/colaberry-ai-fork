/**
 * Deep-dive content for `deepseek-r1`.
 *
 * Authored 2026-04-15 (Sprint v4 backlog batch 1).
 *
 * Primary sources — every numeric claim cites one of:
 *   - HuggingFace `deepseek-ai/DeepSeek-R1/config.json`
 *   - arXiv 2501.12948 ("DeepSeek-R1: Incentivizing Reasoning Capability in
 *     LLMs via Reinforcement Learning", DeepSeek, 2025)
 *   - arXiv 2412.19437 ("DeepSeek-V3 Technical Report", DeepSeek, 2024)
 *   - arXiv 2402.03300 ("DeepSeekMath: Pushing the Limits of Mathematical
 *     Reasoning in Open Language Models" — origin of GRPO)
 *
 * DeepSeek-R1 is *architecturally identical* to DeepSeek-V3 (already covered
 * in the V3 flagship deep dive). The entire reason R1 exists as a separate
 * model is its **reinforcement-learning post-training recipe** — the GRPO
 * algorithm, the rule-based reward functions, and the R1-Zero vs R1 story.
 * This deep dive leans into that story and explicitly defers to the V3 deep
 * dive for architectural details.
 */

export const slug = "deepseek-r1";

export const blocks = [
  /* ── 1. Overview ─────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Overview", anchor: "overview" },
  {
    __component: "deep.paragraph",
    body:
      "DeepSeek-R1 is a reasoning-specialized language model released on 20 January 2025 " +
      "under an MIT license. It is architecturally identical to **DeepSeek-V3**: same " +
      "671 B total parameters, same 37 B active, same Multi-head Latent Attention (MLA), " +
      "same DeepSeekMoE routing, same 61 layers, same 128K context. Every structural " +
      "choice covered in the V3 flagship deep dive applies here unchanged. What makes R1 " +
      "a separate entry in the gallery is the **reinforcement-learning post-training " +
      "recipe** that turns V3 into a chain-of-thought reasoner — and in particular the " +
      "published evidence that a very large base model can learn emergent reflection and " +
      "self-verification from pure RL signal, with no supervised reasoning data at all.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The paper (arXiv 2501.12948) describes **two distinct checkpoints**: **DeepSeek-" +
      "R1-Zero**, which is trained from V3-base using only reinforcement learning and no " +
      "supervised fine-tuning at all, and **DeepSeek-R1**, which adds a cold-start SFT " +
      "stage before RL plus a final supervised refinement pass to clean up readability " +
      "and formatting. R1-Zero is the scientifically interesting artifact — it is the " +
      "cleanest published demonstration that reasoning behavior can emerge from a reward " +
      "signal alone — and R1 is the deployment-ready version. Most downstream users will " +
      "pull R1, not R1-Zero.",
  },

  /* ── 2. Architecture: Identical to V3 ────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Architecture: Identical to DeepSeek-V3", anchor: "architecture" },
  {
    __component: "deep.paragraph",
    body:
      "The architecture is a line-for-line copy of DeepSeek-V3. Rather than repeat the " +
      "full table, we summarize the key numbers here and point you at the V3 flagship " +
      "deep dive for the MLA derivation and the DeepSeekMoE routing details.",
  },
  {
    __component: "deep.table",
    caption: "DeepSeek-R1 configuration (source: HuggingFace config.json, identical to V3)",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      ["Total parameters", "≈ 671 B", "MoE"],
      ["Active parameters", "≈ 37 B", "per token"],
      ["Layers", "61", "3 dense + 58 MoE (same as V3)"],
      ["Attention", "MLA", "Multi-head Latent Attention"],
      ["Hidden size", "7168", "`hidden_size`"],
      ["MLA latent KV dim", "512", "`kv_lora_rank`"],
      ["Routed experts", "256", "`n_routed_experts`"],
      ["Top-k per token", "8", "`num_experts_per_tok`"],
      ["Shared experts", "1", "`n_shared_experts`"],
      ["Context window", "128,000", "`max_position_embeddings`"],
      ["Vocabulary", "129,280", "`vocab_size`"],
      ["Precision", "bfloat16 (FP8 for pretrain)", "same mixed-precision stack as V3"],
    ],
  },
  {
    __component: "deep.callout",
    variant: "note",
    title: "Why repeat V3's specs here?",
    body:
      "Because readers pulling R1 from HuggingFace often assume it is a new architecture " +
      "— the 'R' prefix suggests a fresh model. It is not. Every attention kernel, every " +
      "expert router, every FP8 quantization recipe you need to understand for R1 is in " +
      "the DeepSeek-V3 deep dive. Go read that first, then come back.",
  },

  /* ── 3. GRPO: The RL Algorithm ───────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "GRPO: The RL Algorithm That Makes R1 Feasible", anchor: "grpo" },
  {
    __component: "deep.paragraph",
    body:
      "The reinforcement learning algorithm used in R1 is **Group Relative Policy " +
      "Optimization** (GRPO), originally introduced in the DeepSeekMath paper (arXiv " +
      "2402.03300). GRPO is a variant of PPO that removes the separately-trained value " +
      "network — instead of a learned critic estimating the advantage of each token, " +
      "GRPO samples a *group* of completions for each prompt and uses the mean reward of " +
      "the group as an implicit baseline. The advantage of any single completion is just " +
      "its reward minus the group mean.",
  },
  {
    __component: "deep.paragraph",
    body:
      "This sounds like a minor optimization but it is a large practical unlock for a " +
      "671 B MoE. A standard PPO setup would require a second 671 B value network, which " +
      "doubles the memory footprint and roughly doubles the compute per step. GRPO " +
      "eliminates that cost entirely. In §2.2 of the DeepSeekMath paper the authors " +
      "report that GRPO matches or beats PPO on math benchmarks with roughly half the " +
      "training compute — and at the V3 scale, 'half the compute' is the difference " +
      "between 'feasible' and 'not feasible.' Without GRPO, R1 would simply not exist as " +
      "an open-weight model.",
  },
  {
    __component: "deep.code-block",
    language: "python",
    caption: "GRPO update step — no value network, group-relative baseline",
    code:
      "def grpo_step(policy, prompts, reward_fn, group_size=16):\n" +
      "    # 1) Sample a group of completions per prompt\n" +
      "    completions = [\n" +
      "        [policy.sample(p) for _ in range(group_size)]\n" +
      "        for p in prompts\n" +
      "    ]\n" +
      "\n" +
      "    # 2) Score each completion with the reward model / rules\n" +
      "    rewards = [[reward_fn(p, c) for c in group] for p, group in zip(prompts, completions)]\n" +
      "\n" +
      "    # 3) Group-relative advantage — no learned critic!\n" +
      "    advantages = []\n" +
      "    for group_rewards in rewards:\n" +
      "        mean = sum(group_rewards) / len(group_rewards)\n" +
      "        std  = stddev(group_rewards) + 1e-8\n" +
      "        advantages.append([(r - mean) / std for r in group_rewards])\n" +
      "\n" +
      "    # 4) PPO-style clipped objective with KL penalty to a frozen reference\n" +
      "    return ppo_clipped_loss(policy, completions, advantages, kl_ref=frozen_policy)",
  },

  /* ── 4. Rule-Based Rewards ───────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Rule-Based Rewards, Not a Reward Model", anchor: "rewards" },
  {
    __component: "deep.paragraph",
    body:
      "The second critical choice in the R1-Zero recipe is that the reward function is " +
      "**rule-based, not learned**. For math problems the reward is a binary check that " +
      "the final answer matches the ground truth (extracted from a known answer set). " +
      "For code problems the reward is whether the generated program compiles and passes " +
      "the unit tests. For format compliance there is an auxiliary reward that checks " +
      "whether the response correctly wraps its reasoning in `<think>…</think>` tags. " +
      "No neural reward model is trained anywhere in the R1-Zero pipeline.",
  },
  {
    __component: "deep.paragraph",
    body:
      "The tradeoff is honest: rule-based rewards only work on domains where you have " +
      "ground truth and can verify it cheaply (math, code, structured output). Outside " +
      "those domains — creative writing, dialog, helpfulness — you still need a neural " +
      "reward model or preference data, which is why the full R1 (not R1-Zero) adds a " +
      "cold-start SFT pass and a second RL pass with more general-purpose rewards. The " +
      "domains where R1 is strongest — competitive math, programming contests, formal " +
      "reasoning — are exactly the domains where rule-based rewards are cleanest.",
  },

  /* ── 5. R1-Zero: Emergent Reasoning From Pure RL ─────────────── */
  { __component: "deep.heading", level: "h2", text: "R1-Zero: Emergent Reasoning From Pure RL", anchor: "r1-zero" },
  {
    __component: "deep.paragraph",
    body:
      "R1-Zero is the scientifically interesting half of the paper. The team takes the " +
      "V3-base checkpoint (no post-training, no SFT, no RLHF) and applies GRPO with " +
      "rule-based rewards directly, with no supervised reasoning data at all. The " +
      "published curve in Figure 2 of arXiv 2501.12948 shows that accuracy on the 2024 " +
      "AIME math benchmark rises from essentially random at step 0 to matching an " +
      "OpenAI-o1-preview-level score over a few thousand RL steps.",
  },
  {
    __component: "deep.paragraph",
    body:
      "More importantly, the *shape* of the model's outputs changes as training " +
      "progresses. Early in RL the model produces short direct answers; later in RL it " +
      "produces progressively longer chains of thought, sometimes including " +
      "self-corrections and meta-reasoning phrases like 'let me reconsider' or 'wait, " +
      "I think I made an error.' The DeepSeek team highlights one particular training " +
      "step they call the **'aha moment'** — the point at which R1-Zero spontaneously " +
      "begins reflecting on its own reasoning mid-generation. This was not trained for; " +
      "it emerges from the group-relative reward signal alone, because reflective " +
      "completions tend to earn higher rule-based scores on hard problems.",
  },
  {
    __component: "deep.callout",
    variant: "insight",
    title: "Why this matters beyond DeepSeek",
    body:
      "R1-Zero is the first open, reproducible existence proof that long-chain reasoning " +
      "can be elicited from a base LLM via RL alone, with no supervised chain-of-thought " +
      "data. Every 'reasoning model' that shipped in 2025 — including Qwen3's " +
      "thinking-mode recipe and GLM-5's reasoning variant — draws its recipe, its " +
      "hyperparameters, or both from this paper.",
  },

  /* ── 6. The Full R1 Recipe ───────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "R1: Cold-Start SFT → RL → SFT → RL", anchor: "r1-recipe" },
  {
    __component: "deep.paragraph",
    body:
      "The full R1 checkpoint (what you actually download from HuggingFace) adds " +
      "supervised stages around the R1-Zero RL pass, for two reasons: R1-Zero's outputs " +
      "are sometimes hard to read (mixing languages, producing poorly formatted chains " +
      "of thought), and R1-Zero does not generalize well outside the rule-reward " +
      "domains. The full recipe described in §2.3 of arXiv 2501.12948 is four stages:",
  },
  {
    __component: "deep.list",
    style: "number",
    items: [
      "**Cold-start SFT** — a small dataset of high-quality reasoning traces (hand-curated + filtered R1-Zero outputs) is used to teach V3-base the basic `<think>…</think>` format before any RL.",
      "**Reasoning-focused RL** — GRPO with rule-based rewards, the same core loop as R1-Zero but starting from the cold-start checkpoint instead of V3-base.",
      "**Rejection-sampling SFT** — generate many completions from the post-RL checkpoint, keep only the best ones (scored by the rule-based rewards), and do another SFT pass. This distills the RL gains into a more readable model.",
      "**General-purpose RL** — a final RL pass using a mix of rule-based rewards (for math/code) and neural preference rewards (for helpfulness / harmlessness).",
    ],
  },

  /* ── 7. Distilled R1 Checkpoints ─────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Distilled R1 Checkpoints", anchor: "distilled" },
  {
    __component: "deep.paragraph",
    body:
      "Alongside the full 671 B R1, DeepSeek released six **distilled** variants: " +
      "DeepSeek-R1-Distill-Qwen-1.5B / 7B / 14B / 32B and DeepSeek-R1-Distill-Llama-8B / " +
      "70B. These are **not** GRPO-trained models. They are Qwen and Llama base " +
      "checkpoints SFT'd on a large corpus of reasoning traces generated by the full " +
      "R1 — classic teacher-student distillation, with R1 as the teacher. This is the " +
      "most practical way to get R1-style reasoning behavior on a budget: the 32B " +
      "distilled variant matches the full R1 on many reasoning benchmarks while fitting " +
      "on a single 80 GB GPU at bf16.",
  },

  /* ── 8. Verdict ──────────────────────────────────────────────── */
  { __component: "deep.heading", level: "h2", text: "Verdict: A Training Recipe, Not an Architecture", anchor: "verdict" },
  {
    __component: "deep.paragraph",
    body:
      "DeepSeek-R1 is the purest example in this gallery of a model whose identity lives " +
      "entirely in its **training recipe**, not its architecture. If you change the R1 " +
      "weights back to plain V3 you still have a 671 B MoE with MLA and DeepSeekMoE — " +
      "you just lose the reasoning behavior. Read this deep dive together with the V3 " +
      "flagship dive to see the full picture: V3 gives you the compute-efficient " +
      "architecture that made this scale of RL feasible, and R1 gives you the algorithm " +
      "(GRPO) and the reward design that converted that compute into emergent reasoning " +
      "on frontier benchmarks.",
  },

  /* ── 9. References ───────────────────────────────────────────── */
  {
    __component: "deep.references",
    heading: "References",
    items: [
      {
        label: "DeepSeek-R1 — HuggingFace config.json",
        url: "https://huggingface.co/deepseek-ai/DeepSeek-R1/blob/main/config.json",
      },
      {
        label: "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning (DeepSeek, 2025) — arXiv:2501.12948",
        url: "https://arxiv.org/abs/2501.12948",
      },
      {
        label: "DeepSeek-V3 Technical Report (DeepSeek, 2024) — arXiv:2412.19437",
        url: "https://arxiv.org/abs/2412.19437",
      },
      {
        label: "DeepSeekMath: Pushing the Limits of Mathematical Reasoning (origin of GRPO) — arXiv:2402.03300",
        url: "https://arxiv.org/abs/2402.03300",
      },
      {
        label: "Proximal Policy Optimization Algorithms (Schulman et al., 2017) — arXiv:1707.06347",
        url: "https://arxiv.org/abs/1707.06347",
      },
      {
        label: "DeepSeek-R1 distilled checkpoints — HuggingFace collection",
        url: "https://huggingface.co/collections/deepseek-ai/deepseek-r1-678e1e131c0169c0bc89728d",
      },
    ],
  },
];
