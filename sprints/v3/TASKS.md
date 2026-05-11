# Sprint v3 — Tasks: Auto-Publisher

## Status: Draft — Awaiting Ram approval

## Methodology: SDD + TDD (strict)
- **Test-first:** Every implementation task is preceded by its test task. Red → Green → Refactor.
- **Constitution gate:** Each task must leave `npx tsc --noEmit`, `npm run lint`, `npm run build` at 0 errors.
- **Per-platform go-live gate:** No driver flips from `dry-run` → `live` without explicit Ram approval recorded in the PublishLog description.

---

## P0 — Must Have (Hugging Face end-to-end)

- [ ] Task 1: Scaffold `src/lib/publishers/` + types + config (P0)
  - Acceptance: Directory exists. `types.ts` defines `PublishCandidate`, `PublishPayload`, `PublishResult`, `PublishStatus`, `PlatformName` — all strict, zero `any`. `config.ts` exports `PUBLISHER_PLATFORMS` with per-platform `{ name, enabled, goLive }` flags, all defaulting to `goLive=false`. `npx tsc --noEmit` passes.
  - Files: `src/lib/publishers/types.ts`, `src/lib/publishers/config.ts`
  - Duration: ~10 min

- [ ] Task 2: TEST — content hash canonicalization (P0)
  - Acceptance: `src/lib/publishers/__tests__/hash.test.ts` exists. Tests prove: (a) identical payloads → identical hash, (b) reordered object keys → same hash, (c) trailing whitespace variants → same hash, (d) different platform/content → different hash. All tests initially FAIL (red).
  - Files: `src/lib/publishers/__tests__/hash.test.ts`
  - Duration: ~10 min

- [ ] Task 3: IMPL — content hash module (P0)
  - Acceptance: `src/lib/publishers/hash.ts` exports `contentHash(payload): string` using `crypto.createHash("sha256")` on a canonical JSON (sorted keys, trimmed strings). All Task 2 tests GREEN.
  - Files: `src/lib/publishers/hash.ts`
  - Duration: ~10 min

- [ ] Task 4: TEST — candidate selection from Strapi (P0)
  - Acceptance: `candidates.test.ts` exists. Mocks `src/lib/cms.ts` to return fixture entries. Tests prove: (a) items created/updated in last 24 h are returned, (b) older items are excluded, (c) draft/unpublished items excluded, (d) all 5 content types (agent, mcp, skill, tool, podcast) are polled, (e) returns `PublishCandidate[]` matching the type contract. All tests initially FAIL.
  - Files: `src/lib/publishers/__tests__/candidates.test.ts`
  - Duration: ~10 min

- [ ] Task 5: IMPL — candidate selection (P0)
  - Acceptance: `candidates.ts` exports `selectCandidates({ sinceHours })`. Queries Strapi via `fetchAllAgents()`/`fetchAllMcps()`/etc. All Task 4 tests GREEN. Zero `any`. Errors from CMS surface up (no swallow).
  - Files: `src/lib/publishers/candidates.ts`
  - Duration: ~10 min

- [ ] Task 6: TEST — HuggingFace driver in dry-run mode (P0)
  - Acceptance: `huggingface.test.ts` exists. Mocks `fetch`. Tests prove: (a) `goLive=false` → NO network call made, returns `{ status: "dry_run", renderedText }`, (b) payload renders within HF post length limit, (c) payload includes link back to colaberry.ai. Tests FAIL initially.
  - Files: `src/lib/publishers/__tests__/huggingface.test.ts`
  - Duration: ~10 min

- [ ] Task 7: IMPL — HuggingFace driver (dry-run path) (P0)
  - Acceptance: `drivers/huggingface.ts` exports `class HuggingFaceDriver implements PublisherDriver`. Renders a candidate into HF post format. Honors `goLive=false` — never calls fetch. Task 6 tests GREEN. Live path is a TODO stub that throws `NotEnabledError` if reached.
  - Files: `src/lib/publishers/drivers/base.ts`, `src/lib/publishers/drivers/huggingface.ts`
  - Duration: ~10 min

- [ ] Task 8: TEST — Strapi PublishLog writer (P0)
  - Acceptance: `logger.test.ts` exists. Mocks `fetch` to Strapi. Tests prove: (a) `writePublishLog(entry)` POSTs to `/api/publish-logs` with bearer token, (b) all required fields present, (c) network error → throws, does NOT swallow. Tests FAIL initially.
  - Files: `src/lib/publishers/__tests__/logger.test.ts`
  - Duration: ~10 min

- [ ] Task 9: IMPL — PublishLog writer + CMS content type spec (P0)
  - Acceptance: `logger.ts` exports `writePublishLog(entry): Promise<void>`. Task 8 tests GREEN. A companion spec file `specs/auto-publisher/cms-publish-log-schema.md` documents the Strapi content type so the CMS sibling PR can mirror it.
  - Files: `src/lib/publishers/logger.ts`, `specs/auto-publisher/cms-publish-log-schema.md`
  - Duration: ~10 min

- [ ] Task 10: TEST — top-level `runPublishers()` orchestration (P0)
  - Acceptance: `run.test.ts` exists. Mocks candidates, drivers, logger. Tests prove: (a) each candidate × enabled platform is attempted, (b) duplicate contentHash → `skipped_duplicate` log, no driver call, (c) dry-run → log written, no external call, (d) driver throw → `status=error` log, other candidates still process, (e) every attempt carries the same `runId`. Tests FAIL initially.
  - Files: `src/lib/publishers/__tests__/run.test.ts`
  - Duration: ~10 min

- [ ] Task 11: IMPL — `runPublishers()` orchestration (P0)
  - Acceptance: `src/lib/publishers/index.ts` exports `runPublishers()`. Task 10 tests GREEN. Generates one UUID per invocation. Catches per-candidate errors so one failure doesn't abort the run.
  - Files: `src/lib/publishers/index.ts`
  - Duration: ~10 min

- [ ] Task 12: IMPL — `/api/publishers/run` API route (P0)
  - Acceptance: `src/pages/api/publishers/run.ts` — POST only, timing-safe bearer check against `PUBLISHER_CRON_TOKEN`, rate-limited via `src/lib/rate-limit.ts`, invokes `runPublishers()`, returns `{ runId, attempted, success, dry_run, errors }`. Non-POST → 405. Missing/invalid token → 401. Build passes.
  - Files: `src/pages/api/publishers/run.ts`
  - Duration: ~10 min

- [ ] Task 13: IMPL — admin UI at `/admin/publishers` (P0)
  - Acceptance: `src/pages/admin/publishers/index.tsx` renders (a) last 50 PublishLog entries from Strapi with status badges in zinc + coral only (NO emerald/green/amber), (b) next candidates preview, (c) "Trigger dry-run now" button calling `/api/publishers/run` with admin token. Uses locked theming: `.surface-panel`, `.stagger-grid`, `.reveal`, `SectionHeader`, dark mode support. No forbidden colors.
  - Files: `src/pages/admin/publishers/index.tsx`
  - Duration: ~10 min (follow-on Task 14 may split the fetch)

- [ ] Task 14: IMPL — `/api/publishers/history` read endpoint for admin (P0)
  - Acceptance: GET endpoint, admin bearer auth, returns last 50 PublishLog entries from Strapi. Rate-limited. TypeScript strict. Build passes.
  - Files: `src/pages/api/publishers/history.ts`
  - Duration: ~10 min

---

## P1 — Should Have (scaffold blocked platforms + ops)

- [ ] Task 15: TEST + IMPL — X driver (dry-run only) (P1)
  - Acceptance: `x.test.ts` + `drivers/x.ts`. Dry-run path proves: renders within 280 chars, includes link, honors `goLive=false`. Live path is `NotEnabledError` stub. Feature flag wired so even if `enabled=true`, `goLive=false` blocks the live call. Comment in `config.ts` cites "Blocked on Ram $100/mo budget + handle decision".
  - Files: `src/lib/publishers/drivers/x.ts`, `src/lib/publishers/__tests__/x.test.ts`
  - Duration: ~10 min

- [ ] Task 16: TEST + IMPL — Moltbook driver (dry-run only) (P1)
  - Acceptance: `moltbook.test.ts` + `drivers/moltbook.ts`. Dry-run path proves: renders valid Moltbook schema (once published, adjust), honors `goLive=false`. Live path is `NotEnabledError` stub. Comment in `config.ts` cites "Blocked on Build-for-Agents early access".
  - Files: `src/lib/publishers/drivers/moltbook.ts`, `src/lib/publishers/__tests__/moltbook.test.ts`
  - Duration: ~10 min

- [ ] Task 17: Cloud Run Cron Job + env vars runbook (P1)
  - Acceptance: `docs/runbooks/auto-publisher-deployment.md` documents: (a) `gcloud run jobs create` for daily 14:00 UTC schedule, (b) required env vars (`PUBLISHER_CRON_TOKEN`, `HF_HUB_TOKEN`, `PUBLISHER_MODE=dry-run`), (c) how to view logs, (d) how to flip a platform live (explicit Ram sign-off step). NOT executed — just documented.
  - Files: `docs/runbooks/auto-publisher-deployment.md`
  - Duration: ~10 min

- [ ] Task 18: Sibling PR in `colaberry-ai-cms-fork` for PublishLog content type (P1)
  - Acceptance: Strapi schema.json for `api::publish-log.publish-log` matches `specs/auto-publisher/cms-publish-log-schema.md`. Admin UI visible in Strapi. Public role has NO permissions (only bearer-token writes allowed). Verified locally against dev CMS.
  - Files: CMS repo — `src/api/publish-log/**`
  - Duration: ~10 min (CMS side)

---

## P2 — Nice to Have

- [ ] Task 19: HuggingFace LIVE go-live gate (P2, requires Ram approval) (P2)
  - Acceptance: With Ram's explicit written approval (captured in PR description + Basecamp comment), flip `huggingface.goLive = true` in `config.ts`. First live run produces exactly one `status=success` PublishLog row. Verify post is visible on HF Hub. Runbook updated with the timestamp + approver.
  - Files: `src/lib/publishers/config.ts` (one-line flag flip)
  - Duration: ~5 min + verification

- [ ] Task 20: `/walkthrough` sprint review (P2)
  - Acceptance: `sprints/v3/WALKTHROUGH.md` generated. Documents: architecture, data flow, test coverage, what's live vs dry-run, known limitations, next sprint hooks.
  - Files: `sprints/v3/WALKTHROUGH.md`
  - Duration: ~10 min

---

## Completion Criteria

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → 0 errors
- [ ] All P0 tests passing (`vitest run src/lib/publishers`)
- [ ] All P0 tasks complete
- [ ] Admin UI visible, uses only zinc + coral, light + dark verified
- [ ] At least one successful HuggingFace dry-run in production (PublishLog row with `status=dry_run`)
- [ ] Ram sign-off recorded before ANY `goLive=true` flip
