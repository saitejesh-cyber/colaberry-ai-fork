# Sprint v4 — Tasks: LLM Architecture Deep Dives (CMS Dynamic Zone)

**Status:** Tasks 1–9 complete · Task 10 in progress (verification green, deploy pending)
**Total tasks:** 10
**Est. total time:** 60–90 min (AI agent) + flagship content authoring time

Tasks are sequenced so each builds on the previous. Priority: **P0** = must-ship,
**P1** = should-ship, **P2** = nice-to-have.

---

## P0 — Must Have (architecture + plumbing)

- [x] **Task 1: Scaffold Strapi reusable components under `deep` category** (P0) ✅
  - Acceptance: 8 new component JSON files exist in
    `colaberry-ai-cms-fork/src/components/deep/` for heading, paragraph,
    callout, code-block, table, list, image, references. `yarn develop`
    starts with no schema errors.
  - Files:
    - `colaberry-ai-cms-fork/src/components/deep/heading.json`
    - `colaberry-ai-cms-fork/src/components/deep/paragraph.json`
    - `colaberry-ai-cms-fork/src/components/deep/callout.json`
    - `colaberry-ai-cms-fork/src/components/deep/code-block.json`
    - `colaberry-ai-cms-fork/src/components/deep/table.json`
    - `colaberry-ai-cms-fork/src/components/deep/list.json`
    - `colaberry-ai-cms-fork/src/components/deep/image.json`
    - `colaberry-ai-cms-fork/src/components/deep/references.json`

- [x] **Task 2: Add `deepDive` Dynamic Zone to `llm-architecture` schema** (P0) ✅
  - Acceptance: `colaberry-ai-cms-fork/src/api/llm-architecture/content-types/llm-architecture/schema.json`
    has a new `deepDive` attribute of type `dynamiczone` referencing all 8
    `deep.*` components. Strapi admin shows the zone when editing a record.
    Draft+publish still works.
  - Files:
    - `colaberry-ai-cms-fork/src/api/llm-architecture/content-types/llm-architecture/schema.json`

- [x] **Task 3: CMS bootstrap — upsert 79 registry records into Strapi** (P0) ✅
  - Acceptance: Running
    `CMS_API_TOKEN=… node scripts/seed-llm-architectures-from-registry.mjs`
    against local Strapi creates or updates one `llm-architecture` record
    per entry in `src/data/llm-architectures-registry.json`. Script is
    idempotent (upsert by `slug`), never overwrites `deepDive` or
    `longDescription` on existing records.
  - Files:
    - `colaberry-ai-fork/scripts/seed-llm-architectures-from-registry.mjs` (new)
    - `colaberry-ai-fork/scripts/author-llm-deep-dive.mjs` — **kept** (not deleted);
      it's the file-sourced authoring pipeline for flagship deep dives. The seed
      script handles identity fields; the author script handles the `deepDive` zone.

- [x] **Task 4: Extend `LLMArchitecture` type + populate `deepDive` in fetch** (P0) ✅
  - Acceptance: `src/lib/cms.ts` exports a `DeepDiveBlock` union type
    (discriminated by `__component`) and the `LLMArchitecture` type includes
    `deepDive?: DeepDiveBlock[] | null`. `fetchLlmArchitectureBySlug` passes
    `populate[deepDive][populate]=*` so nested media and JSON fields come
    back. `npx tsc --noEmit` passes.
  - Files:
    - `src/lib/cms.ts`

- [x] **Task 5: Build `LLMArchitectureDeepDive` renderer component** (P0) ✅
  - Acceptance: New `src/components/LLMArchitectureDeepDive.tsx` accepts
    `blocks: DeepDiveBlock[]`, switches on `__component`, and renders each
    block as semantic HTML inside the parent `.prose` container. Handles all
    8 block types. Returns `null` when `blocks` is empty. Storybook/manual
    render verifies each block type.
  - Files:
    - `src/components/LLMArchitectureDeepDive.tsx` (new)

- [x] **Task 6: Wire renderer into detail page with precedence fallback** (P0) ✅
  - Acceptance: `src/pages/aixcelerator/llm-architectures/[slug].tsx` renders
    `<LLMArchitectureDeepDive blocks={arch.deepDive} />` when the zone has
    content, falls back to the existing `longDescription` richtext render
    when the zone is empty, and omits the section entirely when both are
    missing. Existing layout (diagram, specs, key features) is unchanged.
    `npm run build` passes with 0 errors.
  - Files:
    - `src/pages/aixcelerator/llm-architectures/[slug].tsx`

## P1 — Should Have (content + AEO)

- [x] **Task 7: Author Llama 3.2 3B flagship deep dive** (P1) ✅
  - Acceptance: `/aixcelerator/llm-architectures/llama-3-2-3b` renders a
    structured deep dive with Overview, Attention (GQA), Block Structure
    (hyperparameters table), SwiGLU FFN, Tied Embeddings, 128K Context,
    Prune+Distill Training, Verdict, References sections.
    **Achieved: 1,723 words** (target ≥1,500), 8 citations.
    Source policy honored: every numeric claim cites HuggingFace config.json,
    arXiv 2407.21783 (Llama 3 Herd), or NVIDIA Minitron paper.
  - Files:
    - `scripts/deep-dives/llama-3-2-3b.mjs` (30 blocks)
    - `scripts/author-llm-deep-dive.mjs` (authoring CLI)

- [x] **Task 8: Author 4 more flagship deep dives** (P1) ✅
  - Acceptance: Deep dives published in Strapi for:
    - `glm-5-744b` (Zhipu) — 78-layer MLA + DeepSeek Sparse Attention · **1,606 words**
      (slug corrected from PRD draft `glm-5-1` → actual registry slug `glm-5-744b`)
    - `kimi-linear-48b-a3b` (Moonshot) — 3:1 KDA + MLA hybrid · **1,651 words**
    - `deepseek-v3` (DeepSeek) — MLA + DeepSeekMoE + FP8 · **1,659 words**
    - `qwen3-next-80b-a3b` (Alibaba) — 3:1 Gated DeltaNet + Gated Attention · **1,642 words**
      (slug corrected from PRD draft `qwen3-next` → actual registry slug `qwen3-next-80b-a3b`)
    Each uses the same 8-section Raschka structure as Task 7, sourced from
    public tech reports and HuggingFace config.json only.
  - Files:
    - `scripts/deep-dives/glm-5-744b.mjs` (28 blocks)
    - `scripts/deep-dives/kimi-linear-48b-a3b.mjs` (28 blocks)
    - `scripts/deep-dives/deepseek-v3.mjs` (28 blocks)
    - `scripts/deep-dives/qwen3-next-80b-a3b.mjs` (27 blocks)

- [x] **Task 9: Add `TechArticle` JSON-LD with `articleBody` for AEO** (P1) ✅
  - Acceptance: Detail pages with a populated `deepDive` zone emit a
    `TechArticle` JSON-LD script including `headline`, `articleBody`
    (plaintext-flattened from deep-dive blocks), `wordCount`,
    `proficiencyLevel: "Expert"`, `dependencies`, `keywords`, `author`
    (Organization: Colaberry AI), `datePublished`, `dateModified`, `about`
    (model name + organization + decoder type), `citation` (structured
    CreativeWork array from the references block).
  - **Verified live on all 5 flagship pages** via production build:
    | Slug                     | wordCount | citations | proficiencyLevel |
    |--------------------------|-----------|-----------|------------------|
    | llama-3-2-3b             | 1,723     | 8         | Expert           |
    | deepseek-v3              | 1,659     | 6         | Expert           |
    | kimi-linear-48b-a3b      | 1,651     | 6         | Expert           |
    | qwen3-next-80b-a3b       | 1,642     | 6         | Expert           |
    | glm-5-744b               | 1,606     | 6         | Expert           |
  - Files:
    - `src/pages/aixcelerator/llm-architectures/[slug].tsx`
    - `src/lib/deepDiveToPlaintext.ts` (new helper — exports
      `deepDiveToPlaintext`, `deepDiveToCitations`, `deepDiveWordCount`)

## P2 — Nice to Have (polish + rollout)

- [~] **Task 10: Build verification + screenshot + deploy across branches** (P2)
  - Verification status (2026-04-14):
    - [x] `npx tsc --noEmit` — clean
    - [x] `npm run lint` — 0 errors (45 pre-existing `<img>` warnings in `Layout.tsx`
      unrelated to sprint v4)
    - [x] `npm run build` — 0 errors; `/aixcelerator/llm-architectures/[slug]`
      compiled as SSG with `fallback: "blocking"`
    - [x] Production server smoke test: all 5 flagship pages return HTTP 200
      with valid TechArticle JSON-LD (see Task 9 table)
    - [x] Word-count success criterion met: every flagship ≥ 1,500 words
    - [ ] Chrome MCP screenshot of `llama-3-2-3b` in dark mode (pending)
    - [ ] Commit squashed, cherry-picked onto `Release-1.0.beta`, `Release-2.0.beta`,
      `Release-2.0`, `dev` on both `origin` and `upstream` (pending)
    - [ ] Deployed to staging CMS + Cloud Run (pending)
  - Files: (git commits + deploy only, no file edits)

---

## Post-sprint backlog (not in v4)

- Backfill deep dives for the remaining 74 models (incremental post-sprint).
- Per-section anchor TOC with scroll-spy sidebar.
- MDX editor integration for richtext block.
- Multilingual deep dives (i18n).
- Lightbox / modal for architecture diagram zoom.

---

## Final status (2026-04-14)

**Tasks 1–9: complete.** All code + content shipped. Every flagship deep dive
clears the 1,500-word target with comfortable margin and emits valid
`TechArticle` JSON-LD with `wordCount`, `articleBody`, `citation`, and
`proficiencyLevel: "Expert"` for direct AI-answer-engine citation.

**Total deep-dive content shipped:** 8,281 plaintext words across 5 flagships,
141 Dynamic Zone blocks, 32 structured citations, all authored from HuggingFace
`config.json` and arXiv tech reports per the content source policy.

**Task 10 remaining:** dark-mode screenshot + multi-branch cherry-pick + Cloud
Run deploy. The code and content quality gates (tsc, lint, build, live page
render) are all green.
