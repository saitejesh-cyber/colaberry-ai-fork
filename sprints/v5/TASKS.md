# Sprint v5 — Tasks: CMS-Driven Distribution Module

**Status:** Planned
**Total tasks:** 10
**Est. total time:** ~2.5 weeks (mix of CMS schema, frontend fetcher, rewrite, docs)

Tasks are sequenced so each builds on the previous. Priority: **P0** = must-ship,
**P1** = should-ship, **P2** = nice-to-have.

---

## P0 — Must Have (CMS-driven pipeline end-to-end)

- [ ] **Task 1: Scaffold sprint artifacts + branch** (P0)
  - Acceptance: `sprints/v5/PRD.md` and `sprints/v5/TASKS.md` exist and
    are committed on a new working branch `sprint/v5-distribution-cms`.
    `.claude/skills/prd` invocation captured in the branch's first commit
    message. Basecamp todolist mirrors all P0/P1/P2 tasks.
  - Files: `sprints/v5/PRD.md`, `sprints/v5/TASKS.md`

- [ ] **Task 2: Add `distribution-channel` content type in Strapi** (P0)
  - Acceptance: `colaberry-ai-cms-fork/src/api/distribution-channel/` contains
    a schema with fields `name`, `platform` (enum), `enabled`, `dryRunOverride`,
    `credentialRef`, `bodyTemplate`, `titleTemplate`, `defaultWindowHours`,
    `maxPostsPerRun`, `supportedKinds` (json), `notes`. `yarn develop` starts
    with no schema errors. Draft+publish enabled. REST `find` + `findOne`
    permissions configured for Authenticated role.
  - Files:
    - `colaberry-ai-cms-fork/src/api/distribution-channel/content-types/distribution-channel/schema.json`
    - `colaberry-ai-cms-fork/src/api/distribution-channel/controllers/distribution-channel.ts`
    - `colaberry-ai-cms-fork/src/api/distribution-channel/routes/distribution-channel.ts`
    - `colaberry-ai-cms-fork/src/api/distribution-channel/services/distribution-channel.ts`

- [ ] **Task 3: Add `distribution-log` content type in Strapi** (P0)
  - Acceptance: `colaberry-ai-cms-fork/src/api/distribution-log/` contains
    a schema with fields `runId`, `channel` (relation → distribution-channel),
    `entryKind` (enum), `entryId`, `entryTitle`, `status` (enum),
    `remoteId`, `errorCode`, `errorMessage`, `idempotencyKey`, `payloadPreview`
    (text), `attemptedAt` (datetime). Indexed on `runId` + `channel` +
    `attemptedAt` for fast admin queries. Authenticated role can `create` +
    `find`.
  - Files:
    - `colaberry-ai-cms-fork/src/api/distribution-log/content-types/distribution-log/schema.json`
    - `colaberry-ai-cms-fork/src/api/distribution-log/controllers/distribution-log.ts`
    - `colaberry-ai-cms-fork/src/api/distribution-log/routes/distribution-log.ts`
    - `colaberry-ai-cms-fork/src/api/distribution-log/services/distribution-log.ts`

- [ ] **Task 4: Build `channelConfig.ts` fetcher with env-var fallback** (P0)
  - Acceptance: `src/lib/distribution/channelConfig.ts` exports
    `fetchEnabledChannels()` that GETs `/api/distribution-channels?filters[enabled][$eq]=true&pagination[pageSize]=50`
    via `fetchCMSJson` (NEVER raw `fetch`), normalizes to `ChannelConfig[]`,
    and falls back to a hard-coded `STATIC_CHANNELS` constant when the CMS
    call fails or returns empty (logs the fallback). Resolves `credentialRef`
    via `process.env[config.credentialRef]` at dispatch time — never inlines
    the secret into the returned object. `npx tsc --noEmit` passes.
  - Files:
    - `src/lib/distribution/channelConfig.ts` (new)
    - `src/lib/distribution/types.ts` (extend with `ChannelConfig`)

- [x] **Task 5: Build Mustache-style template engine** (P0)
  - Acceptance: `src/lib/distribution/template.ts` exports
    `renderTemplate(tpl: string, ctx: DistributableEntry): string` that
    handles `{{title}}`, `{{summary}}`, `{{url}}`, `{{isNew ? "New" : "Updated"}}`
    via a simple-ternary parser, and `{{#tags}}#{{.}} {{/tags}}` iteration.
    Unknown tokens render as empty string (never `undefined`). Escapes HTML
    inside `{{title}}` / `{{summary}}` only when a channel sets
    `escapeHtml: true`. Unit tests cover every supported token + malformed
    input.
  - Files:
    - `src/lib/distribution/template.ts` (new)
    - `src/lib/distribution/__tests__/template.test.ts` (new — Vitest or Jest)
  - Completed: 2026-04-16 — Engine shipped as Mustache-style `{{#tags}}{{.}}{{/tags}}`
    (sections not simple ternary, same effect). 44 unit tests under `node:test`
    (zero new deps) covering all interpolation tokens, iteration + truthy/inverted
    sections, `escapeHtml` (incl. URL immunity), `maxLength` word-boundary trim,
    unknown tokens, and malformed input (non-string template, unclosed `{{`,
    unclosed section, stray `{{/tag}}`). Run via
    `node --test src/lib/distribution/__tests__/template.test.ts`. Added
    `allowImportingTsExtensions: true` to `tsconfig.json` so TS imports resolve
    for Node 24 native type-stripping. `npm run build` + `npx tsc --noEmit` +
    `npx eslint` all clean.

- [ ] **Task 6: Rewrite `templates.ts` + `orchestrator.ts` to iterate CMS channels** (P0)
  - Acceptance: `buildDrafts()` in `templates.ts` takes a `ChannelConfig[]`
    (not the hard-coded platform list) and calls `renderTemplate()` per
    channel. `runDistribution()` in `orchestrator.ts` calls
    `fetchEnabledChannels()` first, builds drafts per channel, and dispatches
    via the client registry keyed by `channel.platform`. Backward-compat:
    when CMS is empty + no static channels, orchestrator returns a
    `DistributionRunResult` with `entries=0, dispatches=[], errors=["no channels"]`
    (doesn't throw). `npx tsc --noEmit` passes. Existing POC tests still pass.
  - Files:
    - `src/lib/distribution/templates.ts`
    - `src/lib/distribution/orchestrator.ts`

---

## P1 — Should Have (persistence + observability)

- [ ] **Task 7: Build `store.ts` to persist every dispatch as a `distribution-log`** (P1)
  - Acceptance: `src/lib/distribution/store.ts` exports `writeDispatchLog(runId, channel, entry, result)`
    that POSTs a `distribution-log` record. Uses `fetchCMSJson` with bearer auth.
    **Never throws** — logs + swallows errors so a log-write failure can't
    take down the run. Orchestrator calls `writeDispatchLog` after every
    `client.dispatch`. Each run uses a shared UUID `runId`.
  - Files:
    - `src/lib/distribution/store.ts` (new)
    - `src/lib/distribution/orchestrator.ts` (wire in)

- [ ] **Task 8: Seed initial `distribution-channel` rows via script** (P1)
  - Acceptance: `scripts/seed-distribution-channels.mjs` POSTs three rows
    (X, Moltbook, Hugging Face) matching the current POC behavior — idempotent
    by `name` (skip if exists). Reads templates from
    `scripts/distribution-templates/{x,moltbook,huggingface}.md` so copy is
    easy to iterate without touching JS. Runnable as
    `CMS_API_TOKEN=… node scripts/seed-distribution-channels.mjs`.
  - Files:
    - `scripts/seed-distribution-channels.mjs` (new)
    - `scripts/distribution-templates/x.md` (new)
    - `scripts/distribution-templates/moltbook.md` (new)
    - `scripts/distribution-templates/huggingface.md` (new)

---

## P2 — Nice to Have (admin polish + docs)

- [ ] **Task 9: Update cron + preview routes to reflect CMS-driven mode** (P2)
  - Acceptance: `src/pages/api/cron/catalog-distribution.ts` and
    `src/pages/api/internal/distribution-preview.ts` return the
    `DistributionRunResult` with a new `channels` field summarizing
    per-channel counts. Preview route supports `?channel=<documentId>` to
    dry-run a single channel. `curl -H "x-colaberry-admin-key: $KEY" \
    "http://localhost:3000/api/internal/distribution-preview"` returns
    a populated response listing every enabled CMS channel.
  - Files:
    - `src/pages/api/cron/catalog-distribution.ts`
    - `src/pages/api/internal/distribution-preview.ts`

- [ ] **Task 10: Refresh `docs/distribution/README.md` for v5** (P2)
  - Acceptance: Runbook documents the CMS-editable flow: how to add a channel
    in Strapi admin (field-by-field walkthrough), the `credentialRef` → env
    var pattern, how to read `distribution-log` from admin, how to dry-run
    a single channel, and how the fallback works when CMS is down. Mentions
    open items for v9 (real clients for Dev.to / Reddit / Discord, log
    retention policy, retry queue). Linked from root `CLAUDE.md` Key Files
    block.
  - Files:
    - `docs/distribution/README.md`
    - `CLAUDE.md` (update Key Files pointers)

---

## Sprint acceptance (all 10 tasks)

- [ ] `npx tsc --noEmit` clean across both repos
- [ ] `npm run lint` — 0 errors, 0 new warnings
- [ ] `npm run build` — succeeds in both `colaberry-ai-fork` and `colaberry-ai-cms-fork`
- [ ] Seed script creates 3 channels in local Strapi; admin UI shows them
- [ ] Admin preview endpoint returns populated `dispatches[]` with every
      enabled CMS channel (against local Strapi)
- [ ] One `distribution-log` row per dispatch visible in
      `/admin/content-manager/collection-types/api::distribution-log.distribution-log`
- [ ] Cron route in DRY_RUN mode returns identical tally to preview route
- [ ] Ram can pause / enable a channel from Strapi admin without a code deploy

## Deployment order (when sprint ships)

1. Merge + deploy CMS (`colaberry-ai-cms-fork` → `colaberry-ai-cms-prod`) first.
   Schema-only — safe to deploy before frontend.
2. Run seed script against prod CMS to create the three starter channels
   (enabled=false by default — ops flips them on once happy).
3. Deploy frontend (`colaberry-ai-fork` → `colaberry-ai-prod`).
4. DRY_RUN preview end-to-end before flipping any channel to `enabled=true`.
