# Tasks: Auto-Publisher — Daily Updates to Developer/Agent Hangouts

## References
- **Spec:** `specs/auto-publisher/spec.md`
- **Plan:** `specs/auto-publisher/plan.md`
- **Sprint backlog:** `sprints/v3/TASKS.md` (20 high-level tasks — decomposed below into 30 atomic tasks)
- **Constitution:** `Constitution.md`

---

## Task Summary

| #  | Task                                                                          | Status | Agent          | Depends On              |
|----|-------------------------------------------------------------------------------|--------|----------------|-------------------------|
| 1  | Create `src/lib/publishers/types.ts` + `NotEnabledError`                       | TODO   | @frontend-dev  | —                       |
| 2  | Create `src/lib/publishers/config.ts` (all three platforms, `goLive=false`)   | TODO   | @frontend-dev  | Task 1                  |
| 3  | TEST (RED) — `hash.test.ts` canonical JSON + SHA-256 determinism              | TODO   | @testing       | Task 1                  |
| 4  | IMPL (GREEN) — `hash.ts` `canonicalize()` + `contentHash()`                   | TODO   | @frontend-dev  | Task 3                  |
| 5  | TEST (RED) — `candidates.test.ts` 24h window + 5-type poll                    | TODO   | @testing       | Task 1                  |
| 6  | IMPL (GREEN) — `candidates.ts` `selectCandidates()`                           | TODO   | @frontend-dev  | Task 5                  |
| 7  | Create `drivers/base.ts` abstract `BaseDriver` + render helper                | TODO   | @frontend-dev  | Task 1, Task 2          |
| 8  | TEST (RED) — `huggingface.test.ts` dry-run + charLimit + link                 | TODO   | @testing       | Task 7                  |
| 9  | IMPL (GREEN) — `drivers/huggingface.ts` `HuggingFaceDriver`                   | TODO   | @frontend-dev  | Task 8                  |
| 10 | TEST (RED) — `logger.test.ts` POST + bearer + error propagation               | TODO   | @testing       | Task 1                  |
| 11 | IMPL (GREEN) — `logger.ts` `writePublishLog` + `queryPublishLogByHash`        | TODO   | @frontend-dev  | Task 10                 |
| 12 | Write `specs/auto-publisher/cms-publish-log-schema.md` Strapi spec            | TODO   | @content-gen   | Task 1                  |
| 13 | TEST (RED) — `run.test.ts` orchestration (dupe/error/runId)                   | TODO   | @testing       | Task 1, Task 7          |
| 14 | IMPL (GREEN) — `src/lib/publishers/index.ts` `runPublishers()`                | TODO   | @frontend-dev  | Task 4, 6, 9, 11, 13    |
| 15 | IMPL — `/api/publishers/run` POST route (cron entry)                          | TODO   | @frontend-dev  | Task 14                 |
| 16 | IMPL — `/api/publishers/history` GET route (admin read)                       | TODO   | @frontend-dev  | Task 11                 |
| 17 | IMPL — `/api/publishers/preview` GET route (dry-run render only)              | TODO   | @frontend-dev  | Task 6, Task 9          |
| 18 | TEST (RED) — `x.test.ts` 280-char + dry-run guard                             | TODO   | @testing       | Task 7                  |
| 19 | IMPL (GREEN) — `drivers/x.ts` `XDriver` (blocked reason noted)                | TODO   | @frontend-dev  | Task 18                 |
| 20 | TEST (RED) — `moltbook.test.ts` schema + dry-run guard                        | TODO   | @testing       | Task 7                  |
| 21 | IMPL (GREEN) — `drivers/moltbook.ts` `MoltbookDriver`                         | TODO   | @frontend-dev  | Task 20                 |
| 22 | Wire `XDriver` + `MoltbookDriver` into `config.ts` + orchestrator map         | TODO   | @frontend-dev  | Task 19, 21, 14         |
| 23 | IMPL — `/admin/publishers` page structure + `SectionHeader` hero              | TODO   | @frontend-dev  | Task 16, Task 17        |
| 24 | IMPL — `PlatformControlPanel` + `TriggerButton` (inline components)           | TODO   | @frontend-dev  | Task 23                 |
| 25 | IMPL — `CandidateGrid` + `PublishLogTable` + `StatusBadge` (zinc+coral)       | TODO   | @frontend-dev  | Task 23                 |
| 26 | TEST — `/admin/publishers` render + dark mode + forbidden-color scan         | TODO   | @testing       | Task 24, Task 25        |
| 27 | Verify NFR-5: build-time grep — no `NEXT_PUBLIC_*` references to secrets      | TODO   | @testing       | Task 2, Task 15         |
| 28 | Write `docs/runbooks/auto-publisher-deployment.md` runbook                    | TODO   | @gcp-devops    | Task 15                 |
| 29 | HuggingFace `goLive=true` flip (Ram approval gated) — BLOCKED                 | TODO   | @frontend-dev  | Task 28, Ram sign-off   |
| 30 | Generate `sprints/v3/WALKTHROUGH.md` via `/walkthrough` skill                 | TODO   | @frontend-dev  | Tasks 1–27              |

**Status values:** TODO | IN PROGRESS | IN REVIEW | DONE
**Total tasks:** 30 (10 TEST tasks + 20 IMPL / config / docs tasks)

---

## Tasks

### Task 1: Create `src/lib/publishers/types.ts` + `NotEnabledError`

**Agent:** @frontend-dev
**Status:** TODO
**Depends on:** None
**Spec requirements:** NFR-1, FR-3, FR-12, US-3

**Description:**
Create the foundational type surface for the auto-publisher module. Export all interfaces defined in Plan Section "Data Model" (`PlatformName`, `PublishStatus`, `CandidateType`, `PublishCandidate`, `PublishPayload`, `PublishResult`, `PlatformConfig`, `PublishLogEntry`, `PublisherDriver`, `PublishRunSummary`) plus the `NotEnabledError` class. Zero runtime code beyond the error class; zero `any`.

**Files to change:**
- `src/lib/publishers/types.ts` — create new with all interfaces + `NotEnabledError`

**Acceptance Criteria:**
- [ ] All 9 interfaces + 1 error class from Plan Data Model exported
- [ ] Zero `any` types; all fields `readonly` where specified
- [ ] `NotEnabledError` carries `platform: PlatformName` and correct name
- [ ] `npx tsc --noEmit` passes

**Verification:**
```bash
npx tsc --noEmit
grep -c "any" src/lib/publishers/types.ts   # expect 0 hits (as a type)
```

---

### Task 2: Create `src/lib/publishers/config.ts` (all three platforms, `goLive=false`)

**Agent:** @frontend-dev
**Status:** TODO
**Depends on:** Task 1
**Spec requirements:** FR-5, FR-6, FR-7, FR-12, US-3, NFR-5

**Description:**
Export `PUBLISHER_PLATFORMS: readonly PlatformConfig[]` with all three entries (`huggingface`, `x`, `moltbook`), each with `enabled: true` and `goLive: false`. Export `getPublisherCronToken()` getter that reads `process.env.PUBLISHER_CRON_TOKEN` and throws at runtime (not at import) if missing. Include the `blockedReason` strings for X ("Ram $100/mo Basic-tier budget + handle decision pending") and Moltbook ("Build-for-Agents early access application pending").

**Files to change:**
- `src/lib/publishers/config.ts` — create new

**Acceptance Criteria:**
- [ ] Three platform entries, all `goLive: false`
- [ ] `charLimit` values: HF 2000, X 280, Moltbook 1000
- [ ] `getPublisherCronToken()` throws on call, not on module import
- [ ] Zero `NEXT_PUBLIC_*` references in file
- [ ] `npx tsc --noEmit` passes; `npm run build` passes

**Verification:**
```bash
npx tsc --noEmit
npm run build
grep "NEXT_PUBLIC_" src/lib/publishers/config.ts   # expect 0 hits
```

---

### Task 3: TEST (RED) — `hash.test.ts` canonical JSON + SHA-256 determinism

**Agent:** @testing
**Status:** TODO
**Depends on:** Task 1
**Spec requirements:** FR-3, NFR-2, US-2, EC-9

**Description:**
Write Vitest unit tests for the not-yet-implemented `canonicalize()` and `contentHash()` functions. Cover four cases from spec US-2: identical payloads produce the same hash, reordered keys produce the same hash, whitespace-only diffs produce the same hash, different platforms produce different hashes. Also include an emoji/special-char payload (EC-9).

**Files to change:**
- `src/lib/publishers/__tests__/hash.test.ts` — create new

**Acceptance Criteria:**
- [ ] At least 5 test cases described above
- [ ] Tests FAIL initially (RED) because `hash.ts` does not yet exist
- [ ] Tests import from `../hash` and `../types`
- [ ] `npx vitest run src/lib/publishers/__tests__/hash.test.ts` reports failures (not compile errors)

**Verification:**
```bash
npx vitest run src/lib/publishers/__tests__/hash.test.ts   # expect FAIL (RED phase)
```

---

### Task 4: IMPL (GREEN) — `hash.ts` `canonicalize()` + `contentHash()`

**Agent:** @frontend-dev
**Status:** TODO
**Depends on:** Task 3
**Spec requirements:** FR-3, NFR-1, NFR-2, US-2

**Description:**
Implement `canonicalize(value: unknown): string` (sorted keys, trimmed strings, stable stringify) and `contentHash(payload: PublishPayload): string` using `crypto.createHash("sha256")` over the canonical JSON of `{ platform, candidateId, contentVersion, renderedText, mediaUrls }`. Pure, synchronous, no I/O. All Task 3 tests must GREEN after this.

**Files to change:**
- `src/lib/publishers/hash.ts` — create new

**Acceptance Criteria:**
- [ ] `canonicalize()` sorts object keys recursively and trims strings
- [ ] `contentHash()` returns a 64-char hex string
- [ ] All Task 3 tests GREEN
- [ ] `npx tsc --noEmit` passes; zero `any`

**Verification:**
```bash
npx vitest run src/lib/publishers/__tests__/hash.test.ts   # expect PASS
npx tsc --noEmit
```

---

### Task 5: TEST (RED) — `candidates.test.ts` 24h window + 5-type poll

**Agent:** @testing
**Status:** TODO
**Depends on:** Task 1
**Spec requirements:** FR-2, NFR-2, US-1, EC-1

**Description:**
Write Vitest tests for `selectCandidates({ sinceHours })`, mocking `src/lib/cms.ts` (`fetchAllAgents`, `fetchAllMcps`, `fetchAllSkills`, `fetchAllTools`, `fetchAllPodcasts`). Cover: (a) items updated in last 24 h returned; (b) older items excluded; (c) drafts excluded; (d) all 5 types polled in parallel; (e) return array shape matches `PublishCandidate`; (f) empty input returns empty array (EC-1); (g) CMS error bubbles up.

**Files to change:**
- `src/lib/publishers/__tests__/candidates.test.ts` — create new

**Acceptance Criteria:**
- [ ] 6+ test cases described above
- [ ] Mocks `../../cms` with Vitest `vi.mock`
- [ ] Tests FAIL initially (RED)
- [ ] `npx vitest run` compiles cleanly

**Verification:**
```bash
npx vitest run src/lib/publishers/__tests__/candidates.test.ts   # expect FAIL
```

---

### Task 6: IMPL (GREEN) — `candidates.ts` `selectCandidates()`

**Agent:** @frontend-dev
**Status:** TODO
**Depends on:** Task 5
**Spec requirements:** FR-2, NFR-1, US-1

**Description:**
Implement `selectCandidates({ sinceHours }): Promise<readonly PublishCandidate[]>`. Call all 5 `fetchAllX` helpers in `Promise.all`, filter by `updatedAt > now - sinceHours`, drop drafts, and map each raw CMS row through private typed mappers (`mapAgent`, `mapMcp`, `mapSkill`, `mapTool`, `mapPodcast`) into `PublishCandidate`. Errors bubble up (no swallow). All Task 5 tests GREEN.

**Files to change:**
- `src/lib/publishers/candidates.ts` — create new

**Acceptance Criteria:**
- [ ] All Task 5 tests GREEN
- [ ] Zero `any`; private mappers typed
- [ ] Parallel fetch via `Promise.all`
- [ ] `npx tsc --noEmit` + `npm run build` pass

**Verification:**
```bash
npx vitest run src/lib/publishers/__tests__/candidates.test.ts   # expect PASS
npx tsc --noEmit
```

---

### Task 7: Create `drivers/base.ts` abstract `BaseDriver` + render helper

**Agent:** @frontend-dev
**Status:** TODO
**Depends on:** Task 1, Task 2
**Spec requirements:** FR-5, FR-6, FR-7, FR-12, NFR-1

**Description:**
Create the shared driver base. Re-export `PublisherDriver` from `../types` for convenience, export an abstract `BaseDriver` class with a default `render()` helper (`buildRenderedText`) that truncates to `config.charLimit` and appends the absolute colaberry.ai URL. Concrete drivers extend this in later tasks. No I/O.

**Files to change:**
- `src/lib/publishers/drivers/base.ts` — create new

**Acceptance Criteria:**
- [ ] Exports `BaseDriver` abstract class and `PublisherDriver` re-export
- [ ] `buildRenderedText` respects `config.charLimit`
- [ ] Zero `any`; `npx tsc --noEmit` passes

**Verification:**
```bash
npx tsc --noEmit
```

---

### Task 8: TEST (RED) — `huggingface.test.ts` dry-run + charLimit + link

**Agent:** @testing
**Status:** TODO
**Depends on:** Task 7
**Spec requirements:** FR-5, NFR-2, US-1, US-3, EC-3, EC-4

**Description:**
Write Vitest tests for the not-yet-implemented `HuggingFaceDriver`. Mock `fetch`. Assert: (a) `goLive=false` makes zero fetch calls and returns `{ status: "dry_run", renderedText }`; (b) `renderedText.length <= 2000`; (c) rendered text contains `colaberry.ai`; (d) live path (`goLive=true`) throws `NotEnabledError`.

**Files to change:**
- `src/lib/publishers/__tests__/huggingface.test.ts` — create new

**Acceptance Criteria:**
- [ ] 4+ tests covering dry-run, charLimit, link, live-path throw
- [ ] `fetch` is mocked and `expect(fetch).not.toHaveBeenCalled()` asserted on dry-run
- [ ] Tests FAIL initially (RED)

**Verification:**
```bash
npx vitest run src/lib/publishers/__tests__/huggingface.test.ts   # expect FAIL
```

---

### Task 9: IMPL (GREEN) — `drivers/huggingface.ts` `HuggingFaceDriver`

**Agent:** @frontend-dev
**Status:** TODO
**Depends on:** Task 8
**Spec requirements:** FR-5, NFR-1, US-1, US-3, R-5

**Description:**
Implement `HuggingFaceDriver extends BaseDriver` with `platform: "huggingface"` and `charLimit: 2000`. `render()` produces an HF post payload. `publish()`: if `config.goLive === false`, return `{ status: "dry_run", renderedText }` without calling fetch. If `goLive === true`, throw `NotEnabledError` (stub — actual live implementation ships in Task 29). All Task 8 tests GREEN.

**Files to change:**
- `src/lib/publishers/drivers/huggingface.ts` — create new

**Acceptance Criteria:**
- [ ] All Task 8 tests GREEN
- [ ] `publish()` never calls fetch when `goLive=false`
- [ ] Live branch throws `NotEnabledError` with platform label
- [ ] `npx tsc --noEmit` + lint pass

**Verification:**
```bash
npx vitest run src/lib/publishers/__tests__/huggingface.test.ts   # expect PASS
npx tsc --noEmit
```

---

### Task 10: TEST (RED) — `logger.test.ts` POST + bearer + error propagation

**Agent:** @testing
**Status:** TODO
**Depends on:** Task 1
**Spec requirements:** FR-8, NFR-2, NFR-4, EC-7

**Description:**
Write Vitest tests for `writePublishLog` and `queryPublishLogByHash`. Mock `fetch`. Assert: POST to `${CMS_URL}/api/publish-logs`; `Authorization: Bearer` header present; all required fields serialized; `AbortSignal.timeout(10_000)` attached; non-2xx response throws; network error throws (no swallow — EC-7). Also assert `queryPublishLogByHash` returns `null` on 404 and the row on 200.

**Files to change:**
- `src/lib/publishers/__tests__/logger.test.ts` — create new

**Acceptance Criteria:**
- [ ] 5+ tests covering POST path, bearer header, timeout, error throw, hash query
- [ ] Tests FAIL initially (RED)

**Verification:**
```bash
npx vitest run src/lib/publishers/__tests__/logger.test.ts   # expect FAIL
```

---

### Task 11: IMPL (GREEN) — `logger.ts` `writePublishLog` + `queryPublishLogByHash`

**Agent:** @frontend-dev
**Status:** TODO
**Depends on:** Task 10
**Spec requirements:** FR-8, NFR-1, NFR-4, EC-7

**Description:**
Implement `writePublishLog(entry: PublishLogEntry): Promise<void>` and `queryPublishLogByHash(hash, platform): Promise<PublishLogEntry | null>`. Both use `fetch` with `Authorization: Bearer ${CMS_API_TOKEN}` and `AbortSignal.timeout(10_000)`. Throw on non-2xx. All Task 10 tests GREEN.

**Files to change:**
- `src/lib/publishers/logger.ts` — create new

**Acceptance Criteria:**
- [ ] All Task 10 tests GREEN
- [ ] 10-second `AbortSignal.timeout` applied
- [ ] Zero `any`; `npx tsc --noEmit` passes

**Verification:**
```bash
npx vitest run src/lib/publishers/__tests__/logger.test.ts   # expect PASS
npx tsc --noEmit
```

---

### Task 12: Write `specs/auto-publisher/cms-publish-log-schema.md` Strapi spec

**Agent:** @content-gen
**Status:** TODO
**Depends on:** Task 1
**Spec requirements:** FR-8, US-4, Dependency "Strapi PublishLog"

**Description:**
Write the companion spec document that the sibling CMS PR mirrors into a real Strapi content type. Include the 13 fields from Plan Section "CMS Content Type Changes" (types, required flags, indexes), permissions (public=none, authenticated=none, bearer-only writes), and the unique index on `contentHash` + indexed `runId`.

**Files to change:**
- `specs/auto-publisher/cms-publish-log-schema.md` — create new

**Acceptance Criteria:**
- [ ] All 13 fields documented with type, required flag, indexes
- [ ] Unique index on `contentHash` explicitly called out
- [ ] Permissions table (public role, authenticated role) documented
- [ ] Markdown lint-clean

**Verification:**
```bash
ls specs/auto-publisher/cms-publish-log-schema.md
```

---

### Task 13: TEST (RED) — `run.test.ts` orchestration (dupe/error/runId)

**Agent:** @testing
**Status:** TODO
**Depends on:** Task 1, Task 7
**Spec requirements:** FR-1, FR-4, FR-11, NFR-2, NFR-7, US-1, US-2, EC-5, EC-6, EC-8

**Description:**
Write Vitest tests for the not-yet-implemented `runPublishers()`. Mock `candidates.ts`, drivers, and `logger.ts`. Assert: (a) every `(candidate, enabledPlatform)` pair attempted; (b) duplicate hash writes `skipped_duplicate` and never calls driver; (c) driver throw logs `error` and run continues to next candidate (FR-11); (d) all attempts share the same `runId`; (e) summary counts match (attempted/success/dry_run/skipped_duplicate/errors).

**Files to change:**
- `src/lib/publishers/__tests__/run.test.ts` — create new

**Acceptance Criteria:**
- [ ] 5+ tests covering dupe, error isolation, shared runId, summary
- [ ] Tests FAIL initially (RED)

**Verification:**
```bash
npx vitest run src/lib/publishers/__tests__/run.test.ts   # expect FAIL
```

---

### Task 14: IMPL (GREEN) — `src/lib/publishers/index.ts` `runPublishers()`

**Agent:** @frontend-dev
**Status:** TODO
**Depends on:** Task 4, Task 6, Task 9, Task 11, Task 13
**Spec requirements:** FR-1, FR-4, FR-11, NFR-1, US-1, US-2

**Description:**
Implement `runPublishers(): Promise<PublishRunSummary>`. Generate `runId` via `crypto.randomUUID()`, call `selectCandidates({ sinceHours: 24 })`, then for each `(candidate, platform)` pair where the platform is `enabled`: render, hash, check dupe, dry-run or throw, and `writePublishLog`. Wrap per-candidate work in try/catch so one failure does not abort the run. Return `PublishRunSummary`. All Task 13 tests GREEN.

**Files to change:**
- `src/lib/publishers/index.ts` — create new

**Acceptance Criteria:**
- [ ] All Task 13 tests GREEN
- [ ] Per-candidate try/catch so FR-11 holds
- [ ] Single `runId` used across the whole run
- [ ] `npx tsc --noEmit` + `npm run build` pass

**Verification:**
```bash
npx vitest run src/lib/publishers/__tests__/run.test.ts   # expect PASS
npx tsc --noEmit && npm run build
```

---

### Task 15: IMPL — `/api/publishers/run` POST route (cron entry)

**Agent:** @frontend-dev
**Status:** TODO
**Depends on:** Task 14
**Spec requirements:** FR-1, FR-9, NFR-3, NFR-4, EC-2, EC-10

**Description:**
Create `src/pages/api/publishers/run.ts` mirroring the shape of `src/pages/api/cron/buzzsprout-sync.ts`. POST-only (405 on other methods with `Allow` header); timing-safe bearer check against `PUBLISHER_CRON_TOKEN` via `isBearerAuthorized`; rate-limited at 10/hr/IP via `src/lib/rate-limit.ts`; invokes `runPublishers()`; returns `PublishRunSummary`. On run failure return 503 with `runId`. `Cache-Control: no-store`.

**Files to change:**
- `src/pages/api/publishers/run.ts` — create new

**Acceptance Criteria:**
- [ ] Non-POST returns 405 with `Allow: POST`
- [ ] Missing/invalid token returns 401 with no error detail
- [ ] Rate limit hit returns 429 with `Retry-After`
- [ ] Successful run returns `PublishRunSummary` JSON
- [ ] `npx tsc --noEmit` + `npm run build` pass

**Verification:**
```bash
npx tsc --noEmit
npm run build
npm run lint
```

---

### Task 16: IMPL — `/api/publishers/history` GET route (admin read)

**Agent:** @frontend-dev
**Status:** TODO
**Depends on:** Task 11
**Spec requirements:** FR-10, NFR-3, US-4

**Description:**
Create `src/pages/api/publishers/history.ts`. GET-only (405 otherwise). Bearer auth against `ADMIN_API_KEY`. Rate-limited at 60/hr/IP. Returns the last 50 `PublishLog` rows from Strapi, newest first. `Cache-Control: no-store`.

**Files to change:**
- `src/pages/api/publishers/history.ts` — create new

**Acceptance Criteria:**
- [ ] Non-GET returns 405; invalid auth returns 401
- [ ] Returns at most 50 rows sorted by `publishedAt` desc
- [ ] Rate-limited at 60/hr/IP
- [ ] `npx tsc --noEmit` passes

**Verification:**
```bash
npx tsc --noEmit
npm run build
```

---

### Task 17: IMPL — `/api/publishers/preview` GET route (dry-run render only)

**Agent:** @frontend-dev
**Status:** TODO
**Depends on:** Task 6, Task 9
**Spec requirements:** FR-10, NFR-3, US-4

**Description:**
Create `src/pages/api/publishers/preview.ts`. GET-only. Bearer auth against `ADMIN_API_KEY`. Rate-limited at 30/hr/IP. Invokes `selectCandidates({ sinceHours: 24 })` and each enabled driver's `render()` — never `publish()`. Returns the payload array the admin page shows in the "Next candidates" grid.

**Files to change:**
- `src/pages/api/publishers/preview.ts` — create new

**Acceptance Criteria:**
- [ ] Never calls any driver `publish()`
- [ ] Returns array of `{ candidate, payloads: PublishPayload[] }`
- [ ] Rate-limited at 30/hr/IP
- [ ] `npx tsc --noEmit` + build pass

**Verification:**
```bash
npx tsc --noEmit
npm run build
```

---

### Task 18: TEST (RED) — `x.test.ts` 280-char + dry-run guard

**Agent:** @testing
**Status:** TODO
**Depends on:** Task 7
**Spec requirements:** FR-6, NFR-2, US-1, US-3

**Description:**
Write Vitest tests for the not-yet-implemented `XDriver`. Assert: (a) `renderedText.length <= 280`; (b) includes colaberry.ai link; (c) `goLive=false` yields zero fetch calls; (d) `goLive=true` throws `NotEnabledError`.

**Files to change:**
- `src/lib/publishers/__tests__/x.test.ts` — create new

**Acceptance Criteria:**
- [ ] 4 tests covering 280 cap, link, dry-run, live-throw
- [ ] Tests FAIL initially (RED)

**Verification:**
```bash
npx vitest run src/lib/publishers/__tests__/x.test.ts   # expect FAIL
```

---

### Task 19: IMPL (GREEN) — `drivers/x.ts` `XDriver`

**Agent:** @frontend-dev
**Status:** TODO
**Depends on:** Task 18
**Spec requirements:** FR-6, NFR-1, US-3

**Description:**
Implement `XDriver extends BaseDriver` with `platform: "x"` and `charLimit: 280`. Dry-run only — live path always throws `NotEnabledError`. Config `blockedReason` is `"Ram $100/mo Basic-tier budget + handle decision pending"`. All Task 18 tests GREEN.

**Files to change:**
- `src/lib/publishers/drivers/x.ts` — create new

**Acceptance Criteria:**
- [ ] All Task 18 tests GREEN
- [ ] Live branch always throws `NotEnabledError`
- [ ] `npx tsc --noEmit` passes

**Verification:**
```bash
npx vitest run src/lib/publishers/__tests__/x.test.ts   # expect PASS
npx tsc --noEmit
```

---

### Task 20: TEST (RED) — `moltbook.test.ts` schema + dry-run guard

**Agent:** @testing
**Status:** TODO
**Depends on:** Task 7
**Spec requirements:** FR-7, NFR-2, US-1, US-3

**Description:**
Write Vitest tests for the not-yet-implemented `MoltbookDriver`. Assert: (a) rendered payload shape matches Moltbook's documented schema (placeholder until final docs arrive); (b) `charLimit: 1000` respected; (c) `goLive=false` yields zero fetch calls; (d) live throws `NotEnabledError`.

**Files to change:**
- `src/lib/publishers/__tests__/moltbook.test.ts` — create new

**Acceptance Criteria:**
- [ ] 4 tests covering schema, charLimit, dry-run, live-throw
- [ ] Tests FAIL initially (RED)

**Verification:**
```bash
npx vitest run src/lib/publishers/__tests__/moltbook.test.ts   # expect FAIL
```

---

### Task 21: IMPL (GREEN) — `drivers/moltbook.ts` `MoltbookDriver`

**Agent:** @frontend-dev
**Status:** TODO
**Depends on:** Task 20
**Spec requirements:** FR-7, NFR-1, US-3

**Description:**
Implement `MoltbookDriver extends BaseDriver` with `platform: "moltbook"` and `charLimit: 1000`. Dry-run only — live path always throws `NotEnabledError`. Config `blockedReason` is `"Build-for-Agents early access application pending"`. All Task 20 tests GREEN.

**Files to change:**
- `src/lib/publishers/drivers/moltbook.ts` — create new

**Acceptance Criteria:**
- [ ] All Task 20 tests GREEN
- [ ] Live branch always throws `NotEnabledError`
- [ ] `npx tsc --noEmit` passes

**Verification:**
```bash
npx vitest run src/lib/publishers/__tests__/moltbook.test.ts   # expect PASS
npx tsc --noEmit
```

---

### Task 22: Wire `XDriver` + `MoltbookDriver` into `config.ts` + orchestrator map

**Agent:** @frontend-dev
**Status:** TODO
**Depends on:** Task 14, Task 19, Task 21
**Spec requirements:** FR-5, FR-6, FR-7, FR-12

**Description:**
Update `src/lib/publishers/index.ts` to register the X and Moltbook drivers in the platform-to-driver map alongside HuggingFace so `runPublishers()` iterates all three enabled platforms. Confirm the existing `run.test.ts` still passes with the expanded map. No new files.

**Files to change:**
- `src/lib/publishers/index.ts` — extend driver map with `x` and `moltbook`

**Acceptance Criteria:**
- [ ] Orchestrator now calls all three drivers for each candidate
- [ ] All existing tests (`run.test.ts`, `huggingface.test.ts`, `x.test.ts`, `moltbook.test.ts`) GREEN
- [ ] `npx tsc --noEmit` + `npm run build` pass

**Verification:**
```bash
npx vitest run src/lib/publishers
npx tsc --noEmit && npm run build
```

---

### Task 23: IMPL — `/admin/publishers` page structure + `SectionHeader` hero

**Agent:** @frontend-dev
**Status:** TODO
**Depends on:** Task 16, Task 17
**Spec requirements:** FR-10, NFR-6, US-4

**Description:**
Scaffold `src/pages/admin/publishers/index.tsx` with the locked page structure: `Layout` wrapper, `.reveal` hero containing `SectionHeader` (kicker `"OPERATIONS"`, title `"Auto-Publisher"`, description `"Daily updates to Hugging Face, X, Moltbook"`, `size="xl"`), placeholder `.reveal` sections for control panel / candidates / log, and `EnterpriseCtaBand` at the bottom. Uses `getServerSideProps` to fetch `/api/publishers/history` and `/api/publishers/preview` server-side with `ADMIN_API_KEY`.

**Files to change:**
- `src/pages/admin/publishers/index.tsx` — create new

**Acceptance Criteria:**
- [ ] `.reveal` hero with `SectionHeader` `size="xl"` renders
- [ ] `EnterpriseCtaBand` at page bottom
- [ ] Page renders correctly in light mode AND dark mode
- [ ] Zero forbidden colors (emerald, green, blue, amber, slate)
- [ ] `getServerSideProps` typed; zero `any`
- [ ] `npm run build` passes

**Verification:**
```bash
npm run build
npx tsc --noEmit
npm run lint
# Visual: localhost:3000/admin/publishers in light + dark mode
```

---

### Task 24: IMPL — `PlatformControlPanel` + `TriggerButton` (inline components)

**Agent:** @frontend-dev
**Status:** TODO
**Depends on:** Task 23
**Spec requirements:** FR-10, FR-12, US-3, US-4

**Description:**
Add the `.surface-panel` platform control bar inline in `src/pages/admin/publishers/index.tsx`. Three platform chips (`.chip-brand` if `goLive`, `.chip-neutral` if dry-run) with status dots in zinc scale only (`zinc-400` dry, `zinc-900` filled live, `#DC2626` error). Add "Trigger dry-run now" pill button (`rounded-full`, coral `#DC2626` background) that POSTs to `/api/publishers/run` with the admin token and refreshes the log table on response.

**Files to change:**
- `src/pages/admin/publishers/index.tsx` — add `PlatformControlPanel` + `TriggerButton` inline

**Acceptance Criteria:**
- [ ] Three platform chips rendered with correct zinc/coral states
- [ ] Trigger button is `rounded-full`, coral background, no `translateY` hover
- [ ] Trigger button fires POST and handles success + error
- [ ] Renders correctly in light mode AND dark mode
- [ ] Zero forbidden colors (emerald, green, blue, amber, slate)

**Verification:**
```bash
npm run build
npx tsc --noEmit
# Visual: click Trigger button, verify POST fires and log refreshes
```

---

### Task 25: IMPL — `CandidateGrid` + `PublishLogTable` + `StatusBadge` (zinc+coral)

**Agent:** @frontend-dev
**Status:** TODO
**Depends on:** Task 23
**Spec requirements:** FR-10, NFR-6, US-4

**Description:**
Add the "Next candidates (preview)" `.stagger-grid` (NOT nested inside `.reveal` — Article 5) with `CandidateCard` items using `ContentTypeIcon`, and the "Recent publish log (last 50)" `PublishLogTable` with `StatusBadge` component. Status dots: `zinc-400` dry_run, `zinc-600` skipped_duplicate, `zinc-900` filled success, `#DC2626` error. No emoji.

**Files to change:**
- `src/pages/admin/publishers/index.tsx` — add grid, table, and badge inline components

**Acceptance Criteria:**
- [ ] `.stagger-grid` is a sibling of `.reveal`, not nested inside one
- [ ] `ContentTypeIcon` used for content-type icons (no emoji)
- [ ] `StatusBadge` uses only zinc + coral (NO emerald/green/amber/blue/slate)
- [ ] Table responsive at 375px (collapses to stacked cards), 768px, 1280px
- [ ] Renders correctly in light mode AND dark mode
- [ ] `npm run build` passes

**Verification:**
```bash
npm run build
npx tsc --noEmit
npm run lint
# Visual: verify log table + candidate grid in light + dark mode at 375/768/1280px
```

---

### Task 26: TEST — `/admin/publishers` render + dark mode + forbidden-color scan

**Agent:** @testing
**Status:** TODO
**Depends on:** Task 24, Task 25
**Spec requirements:** FR-10, NFR-2, NFR-6, US-4

**Description:**
Write integration tests for the admin page. Mock `getServerSideProps` data. Assert: page renders; `StatusBadge` shows correct zinc dot per status; DOM-scan assertion fails if any class name contains `emerald`, `green`, `blue`, `amber`, or `slate`; light and dark mode both render without error.

**Files to change:**
- `src/pages/admin/publishers/__tests__/index.test.tsx` — create new

**Acceptance Criteria:**
- [ ] Renders with fixture data
- [ ] DOM scan asserts zero forbidden color class names
- [ ] Light + dark mode both covered
- [ ] `npx vitest run` passes

**Verification:**
```bash
npx vitest run src/pages/admin/publishers/__tests__/index.test.tsx
```

---

### Task 27: Verify NFR-5 — build-time grep for `NEXT_PUBLIC_*` secret leaks

**Agent:** @testing
**Status:** TODO
**Depends on:** Task 2, Task 15
**Spec requirements:** NFR-5, R-1

**Description:**
Add a guard test (or CI grep step) that fails if any file under `src/lib/publishers/` or `src/pages/api/publishers/` contains a `NEXT_PUBLIC_*` reference to driver tokens (`HF_HUB_TOKEN`, `X_API_TOKEN`, `MOLTBOOK_TOKEN`, `PUBLISHER_CRON_TOKEN`, `ADMIN_API_KEY`, `CMS_API_TOKEN`). Simple Vitest test that reads the files and asserts the absence of the pattern is acceptable.

**Files to change:**
- `src/lib/publishers/__tests__/secrets-guard.test.ts` — create new

**Acceptance Criteria:**
- [ ] Test scans all publisher source files
- [ ] Fails if any `NEXT_PUBLIC_` prefix touches a secret env var name
- [ ] Passes against current implementation
- [ ] `npx vitest run` passes

**Verification:**
```bash
npx vitest run src/lib/publishers/__tests__/secrets-guard.test.ts
```

---

### Task 28: Write `docs/runbooks/auto-publisher-deployment.md` runbook

**Agent:** @gcp-devops
**Status:** TODO
**Depends on:** Task 15
**Spec requirements:** FR-1, US-3, R-5, Dependency "Cloud Run Cron Job"

**Description:**
Document the Cloud Run Cron Job creation command (daily 14:00 UTC), required env vars (`PUBLISHER_CRON_TOKEN`, `HF_HUB_TOKEN`, `ADMIN_API_KEY`, `CMS_API_TOKEN`, `PUBLISHER_MODE=dry-run`), log-viewing instructions, and the go-live flip checklist with Ram sign-off capture (PR description + Basecamp comment).

**Files to change:**
- `docs/runbooks/auto-publisher-deployment.md` — create new

**Acceptance Criteria:**
- [ ] `gcloud` command(s) documented verbatim
- [ ] All required env vars listed with source (Secret Manager vs env)
- [ ] Go-live flip checklist includes Ram sign-off step
- [ ] Markdown lint-clean

**Verification:**
```bash
ls docs/runbooks/auto-publisher-deployment.md
```

---

### Task 29: HuggingFace `goLive=true` flip (Ram approval gated) — BLOCKED

**Agent:** @frontend-dev
**Status:** TODO (**BLOCKED on Ram sign-off**)
**Depends on:** Task 28, Ram written approval
**Spec requirements:** FR-5, US-3, R-5

**Description:**
With Ram's explicit written approval captured in the PR description and Basecamp comment, flip `huggingface.goLive = true` in `src/lib/publishers/config.ts` and implement the live `publish()` path in `drivers/huggingface.ts` (POST to HF Hub API with `HF_HUB_TOKEN`, 10s timeout, parse `externalId`/`externalUrl`). First live run must produce exactly one `status=success` PublishLog row, manually verified against the public HF URL (per US-3).

**Files to change:**
- `src/lib/publishers/config.ts` — flip `goLive`
- `src/lib/publishers/drivers/huggingface.ts` — implement live `publish()`

**Acceptance Criteria:**
- [ ] Ram approval captured in PR description
- [ ] Live path uses `AbortSignal.timeout(10_000)` (NFR-4)
- [ ] First live run produces exactly one `status=success` row
- [ ] Manual verification of public HF URL recorded in runbook
- [ ] `npx tsc --noEmit` + `npm run build` pass

**Verification:**
```bash
npx tsc --noEmit && npm run build
# Trigger once against prod, query PublishLog: status=success platform=huggingface
```

---

### Task 30: Generate `sprints/v3/WALKTHROUGH.md` via `/walkthrough` skill

**Agent:** @frontend-dev
**Status:** TODO
**Depends on:** Tasks 1–27
**Spec requirements:** US-4 (audit), Success Metrics

**Description:**
Run the `/walkthrough` skill to produce `sprints/v3/WALKTHROUGH.md`. Document architecture (types → utils → drivers → orchestrator → API → admin UI), data flow, test coverage, which platforms are live vs dry-run, known limitations, and next-sprint hooks.

**Files to change:**
- `sprints/v3/WALKTHROUGH.md` — create new

**Acceptance Criteria:**
- [ ] Architecture diagram / description included
- [ ] Coverage numbers from `vitest run src/lib/publishers` cited
- [ ] Per-platform live/dry-run status table included
- [ ] Markdown lint-clean

**Verification:**
```bash
ls sprints/v3/WALKTHROUGH.md
```

---

## Quality Gates (Run After All Tasks)

### Build & Type Safety
- [ ] `npm run build` — 0 errors
- [ ] `npx tsc --noEmit` — 0 type errors
- [ ] `npm run lint` — 0 lint errors
- [ ] `npx vitest run src/lib/publishers` — all GREEN
- [ ] `npx vitest run src/pages/admin/publishers` — all GREEN

### Visual Verification (`/admin/publishers`)
- [ ] Light mode — all sections render correctly
- [ ] Dark mode — all sections render correctly
- [ ] Mobile (375px) — log table collapses to stacked cards
- [ ] Tablet (768px) — layout correct
- [ ] Desktop (1280px) — layout correct

### Design System Compliance
- [ ] No forbidden colors (emerald, green, blue, amber, slate) in new files
- [ ] Coral `#DC2626` used only for CTAs + error state dots
- [ ] Locked component classes used: `.reveal`, `.surface-panel`, `.stagger-grid`, `.catalog-card`, `.chip-brand`, `.chip-neutral`
- [ ] Animation nesting rule respected (`.stagger-grid` NOT nested in `.reveal`)
- [ ] `ContentTypeIcon` used (no emoji)
- [ ] `SectionHeader` `size="xl"` on hero

### Security Compliance
- [ ] Zero `NEXT_PUBLIC_*` references to any driver secret (NFR-5, Task 27)
- [ ] All 3 API routes rate-limited (NFR-3)
- [ ] Timing-safe bearer auth on `/api/publishers/run` (FR-9)
- [ ] `AbortSignal.timeout(10_000)` on every outbound fetch (NFR-4)
- [ ] Every driver defaults to `goLive=false` (US-3 defense in depth)
- [ ] Every driver's live path throws `NotEnabledError` until Task 29

### Idempotency Compliance
- [ ] SHA-256 `contentHash` over canonical JSON (FR-3)
- [ ] Duplicate query hits Strapi BEFORE external call (FR-4)
- [ ] Unique index on `contentHash` in Strapi schema (Task 12)
- [ ] `run.test.ts` asserts shared `runId` and dupe-skip (Task 13)

### Traceability
- [ ] FR-1 → Task 14, 15, 28
- [ ] FR-2 → Task 5, 6
- [ ] FR-3 → Task 3, 4
- [ ] FR-4 → Task 13, 14
- [ ] FR-5 → Task 8, 9, 29
- [ ] FR-6 → Task 18, 19
- [ ] FR-7 → Task 20, 21
- [ ] FR-8 → Task 10, 11, 12
- [ ] FR-9 → Task 15
- [ ] FR-10 → Task 16, 17, 23, 24, 25
- [ ] FR-11 → Task 13, 14
- [ ] FR-12 → Task 2, 7, 22
- [ ] NFR-1 → Task 1, 4, 6, 9, 11, 14 (zero `any`)
- [ ] NFR-2 → Task 3, 5, 8, 10, 13, 18, 20, 26
- [ ] NFR-3 → Task 15, 16, 17
- [ ] NFR-4 → Task 11, 29
- [ ] NFR-5 → Task 2, 27
- [ ] NFR-6 → Task 23, 24, 25 (Lighthouse)
- [ ] NFR-7 → Task 13, 14 + Task 12 DB unique index
- [ ] US-1 → Task 5, 6, 14, 15
- [ ] US-2 → Task 3, 4, 13, 14
- [ ] US-3 → Task 2, 9, 19, 21, 29
- [ ] US-4 → Task 16, 23, 24, 25, 26

### Edge-Case Coverage
- [ ] EC-1 (no new content) → Task 5, 6, 13
- [ ] EC-2 (Strapi down) → Task 15 (503 with runId)
- [ ] EC-3 (HF timeout) → Task 29 (AbortSignal.timeout)
- [ ] EC-4 (HF 429) → Task 29 (status=error)
- [ ] EC-5 (duplicate hash) → Task 13, 14
- [ ] EC-6 (live flag on, token missing) → Task 29
- [ ] EC-7 (log write fails post-publish) → Task 10, 11
- [ ] EC-8 (double-fire) → Task 13 (dupe skip)
- [ ] EC-9 (emoji/special chars) → Task 3, 4
- [ ] EC-10 (missing cron token) → Task 15 (401)

### Spec Coverage — all covered
All 12 FRs, 7 NFRs, 4 user stories, and 10 edge cases are mapped to at least one task above. No gaps.

---

## Blocked / External-Dependency Tasks

| Task | Blocker | Owner | Workaround |
|------|---------|-------|------------|
| Task 29 | Ram written approval for HF go-live + HF org confirmation | Ram / Sai | Ship Tasks 1–28 in dry-run mode; Task 29 is a one-line flag flip once approved |
| (X live) | Ram $100/mo X Basic tier budget + handle decision | Ram | `XDriver` ships dry-run only in Task 19 — no live task scheduled |
| (Moltbook live) | Build-for-Agents early access application | Sai | `MoltbookDriver` ships dry-run only in Task 21 — no live task scheduled |
| Task 12 companion CMS PR | Sibling PR in `colaberry-ai-cms-fork` must merge before first prod run | Sai | Task 12 produces the spec; the actual Strapi schema lives in the CMS repo and is out of this repo's scope |
| Task 28 Cloud Run Cron Job | `PUBLISHER_CRON_TOKEN` provisioning in Cloud Run env | @gcp-devops | Documented in runbook; actual provisioning happens at deploy time |

None of the blocked items gate the P0 dry-run delivery (Tasks 1–27) — all P0 work ships with zero external side effects.
