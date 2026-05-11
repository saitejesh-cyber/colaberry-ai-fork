# Basecamp Todolist — POC: Daily Auto-Publisher (SDD + TDD)

**Target list:** Colaberry AI Website Development
**URL:** https://3.basecamp.com/3945211/buckets/6593808/todolists/9400838252
**Methodology:** Spec-Driven Development (SDD) + Product-Driven + Test-Driven Development (TDD)
**Project conventions:** `Constitution.md`, `specs/` directory, `.claude/skills/`, `.claude/agents/`
**NOT** traditional agile/waterfall. We do NOT separate planning from coding — `specs/` files are version-controlled artifacts that evolve with the code.

---

## Description (paste under todolist title in Basecamp)

> POC module that publishes daily colaberry.ai updates (new agents, MCP servers, skills, tools, podcast episodes) to platforms where developers and AI agents hang out — **Moltbook (primary, agent-native audience), Hugging Face, X, Mastodon**.
>
> Built using **Spec-Driven Development + TDD** (per Constitution.md). Every task starts with a failing test, ends with a green test + commit. Specs live under `specs/auto-publisher/`. Acknowledged to Ram.

---

## To-dos (5 SDD/TDD-aligned items)

### 1. SPEC — Auto-Publisher Product Requirements

**File:** `specs/auto-publisher/spec.md`
**Skill:** `/prd` (or `@spec-writer` agent)
**Assignee:** Sai Tejesh

Define WHAT and WHY before any code touches `src/`:

- **Two distinct user personas:**
  - Primary: **AI agents on Moltbook** discovering and integrating with colaberry.ai's catalog of agents, MCP servers, skills, and tools
  - Secondary: **human devs on HF / X / Mastodon** discovering colaberry.ai through automated daily content drops
- User stories per persona, written as testable assertions
- Acceptance criteria — every criterion must be expressible as a passing test
- Non-goals (what we explicitly don't build in v0 — e.g., reply handling, comment threads, image generation)
- Success metrics: Moltbook agent interactions, HF post engagement, X impression count, downstream CMS event rate (clicks back to colaberry.ai)
- **Constitution.md compliance gate** — every produced post must obey the design system rules (no forbidden colors in any image, attribution footer mandatory, AEO microdata where applicable)
- Risk register — API costs ($100/mo X Basic), platform ToS automation rules, credential leakage, content quality drift, kill-switch coverage

### 2. PLAN — Auto-Publisher Architecture & Test Strategy

**File:** `specs/auto-publisher/plan.md`
**Skill / Agent:** `@spec-planner`
**Assignee:** Sai Tejesh

Define HOW with TDD as the planning unit:

- **Publisher interface contract** — single TypeScript interface every platform adapter implements (`postFromContent(item, dryRun) → PublishLogEntry`)
- **Dry-run vs live mode separation** — dry-run is the default mode and is itself a first-class "platform" implementing the same interface, writing only to `PublishLog`
- **Credential management** — all tokens via Cloud Run Secret Manager only. Zero secrets in git. Local dev has no real credentials, only dry-run.
- **Kill switch design** — `PUBLISHER_ENABLED=false` env var stops everything within one cron cycle without redeploy
- **Test pyramid:**
  - Unit: `contentSelector`, `templates`, `dryRunPublisher`, per-platform formatters
  - Integration: publisher interface contract test (every adapter must satisfy)
  - E2E: dry-run against real Strapi CMS data, verifying `PublishLog` rows
- **Test-first ordering** — every public function gets a failing test in the same commit as its skeleton, before any real implementation
- **Failure modes + idempotency** — retries with exponential backoff, idempotency key `runId × platform × contentSlug`, dedupe via `PublishLog` lookup before each post
- **Constitution.md mapping** — list which articles each component must not violate

### 3. TASKS — Auto-Publisher Atomic Test-First Task Breakdown

**File:** `specs/auto-publisher/tasks.md`
**Skill / Agent:** `@spec-tasks`
**Assignee:** Sai Tejesh

Break the plan into atomic, dependency-ordered tasks. **Each task is one red→green→refactor cycle.**

- Format per task:
  - `id` (e.g., `T-001`)
  - `priority` (P0/P1/P2)
  - `failing test file path` (where the red test goes first)
  - `production file path` (what gets written to make test green)
  - `acceptance assertion` (the exact assertion the test must satisfy)
  - `depends_on` (other task IDs)
  - `constitution_gate` (which Constitution articles this must not violate)
- Task ordering follows dependency graph:
  1. Strapi `PublishLog` content type (mirror PR in `colaberry-ai-cms-fork`)
  2. Publisher interface + dry-run adapter (no network)
  3. Content selector (last-24h CMS query + dedupe)
  4. Templates (per-platform with attribution footer)
  5. Cron endpoint (shared-secret guarded)
  6. Hugging Face adapter (free, lowest risk → first real adapter)
  7. Moltbook adapter (BLOCKED on Build-for-Agents early access)
  8. X adapter (BLOCKED on Ram budget approval)
  9. Mastodon adapter (stretch)
  10. Hidden admin dashboard `/admin/publish-log` (added to `RELEASE_HIDDEN_PATHS`)
- **Parallelization map** — which tasks can run in parallel across multiple terminals/agents

### 4. BUILD — Auto-Publisher TDD Implementation Loop

**Skill:** `/dev`
**Assignee:** Sai Tejesh

Implement tasks from `specs/auto-publisher/tasks.md` strictly via red→green→refactor:

1. Pick highest-priority unstarted task from `tasks.md`
2. Write the failing test first → run tests → confirm RED
3. Write minimum production code to satisfy the test
4. Run tests → confirm GREEN
5. Refactor with tests still green
6. Commit with `feat(auto-publisher): T-XXX <task name>` referencing task ID
7. Update `tasks.md` status field
8. Repeat

**External blockers (do not block internal tasks):**
- Moltbook Build-for-Agents early access application — apply via moltbook.com (Ram + Sai)
- X Basic tier budget approval ($100/mo) — Ram decision
- colaberry X handle decision — Ram decision

**Parallel CMS work:** Mirror PR in `colaberry-ai-cms-fork` for the new Strapi `PublishLog` content type with lifecycle hooks.

### 5. VERIFY — Auto-Publisher Sprint Review & Production Demo

**Skill:** `/walkthrough`
**Assignee:** Sai Tejesh

Sprint-level verification before any platform goes live:

- Run dry-run on prod for 48h, audit `PublishLog` rows for:
  - Content quality (no thin posts under min-word threshold)
  - Dedupe correctness (no item posted twice)
  - Template rendering correctness per platform
  - Attribution footer present on every post
- Generate sprint review document via `/walkthrough` skill — architecture, code walkthrough, data flow diagrams, dry-run screenshots
- Post walkthrough on Basecamp under "Colaberry AI Website Development" project for Ram + Karun review
- **Per-platform go-live gate** — each platform requires explicit Y/N approval from Ram before flipping `PUBLISHER_LIVE_<platform>=true` env var
- **Order of go-live:** HF (lowest risk, free) → Moltbook (when access approved) → X (when budget approved) → Mastodon (stretch)

---

## Constitution.md compliance (mandatory across all 5 to-dos)

- All code changes pass `npm run build`, `npm run lint`, `npx tsc --noEmit`
- Zero forbidden colors (`emerald`, `green`, `blue`, `amber`, `slate`) in any new file or generated content
- Dark mode default for any new admin UI
- No emoji in production pages (only in generated posts where the platform's audience expects it)
- AEO-first: anything user-visible has structured data
- Locked theming standard for `/admin/publish-log`

## Definition of Done (for the whole sprint)

- All 5 to-dos checked off
- `specs/auto-publisher/{spec,plan,tasks}.md` exist and are kept in sync with code
- 100% of new code has tests written before the production code (verifiable by commit history)
- Dry-run running for ≥ 48h on prod with valid `PublishLog` rows
- At least one platform (HF) live in production with Ram's explicit approval
- Kill switch verified — `PUBLISHER_ENABLED=false` stops all posting within ≤ 1 cron cycle
- Sprint review walkthrough posted to Basecamp
