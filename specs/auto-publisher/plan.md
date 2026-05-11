# Plan: Auto-Publisher — Daily Updates to Developer/Agent Hangouts

## Spec Reference
- **Spec:** `specs/auto-publisher/spec.md`
- **Status:** Draft
- **Sprint backlog:** `sprints/v3/PRD.md`, `sprints/v3/TASKS.md`
- **Origin:** Ram Katamaraja (CEO) to Sai Tejesh, 2026-04-09

---

## Architecture Decision

### Chosen Approach

The auto-publisher is a **stateless Next.js API route** (`/api/publishers/run`) invoked by a **Cloud Run Cron Job** on a daily schedule (14:00 UTC). The route authenticates with a timing-safe bearer check against `PUBLISHER_CRON_TOKEN`, then calls a pure-TypeScript orchestrator (`src/lib/publishers/index.ts#runPublishers()`). The orchestrator selects candidates from Strapi, iterates each enabled platform, computes a deterministic SHA-256 content hash over canonical JSON, short-circuits on duplicates via a Strapi `PublishLog` query, renders platform-specific posts via **one driver class per platform** (`HuggingFaceDriver`, `XDriver`, `MoltbookDriver`) that all implement a common `PublisherDriver` interface, and persists every attempt — success, dry-run, skipped, error — back to Strapi as a `PublishLog` row.

This approach was chosen because it reuses every mature primitive in the repo (Pages Router API, `src/lib/cms.ts`, `src/lib/api-auth.ts`, `src/lib/rate-limit.ts`, the existing cron pattern at `src/pages/api/cron/buzzsprout-sync.ts`), requires **zero new infrastructure** beyond one Cloud Run Cron Job and one Strapi content type, and isolates untrusted outbound I/O behind a thin driver boundary so each platform can be tested, rate-limited, and go-live-gated independently. Every driver defaults to `goLive=false` and throws `NotEnabledError` on the live path until Ram explicitly flips the flag in a reviewed PR — defense in depth against accidental publication.

### Alternatives Considered

| # | Option | Pros | Cons | Decision |
|---|--------|------|------|----------|
| A | Cron-triggered Next.js API route + per-driver classes + Strapi PublishLog (chosen) | Reuses existing cron pattern; zero new infra; driver isolation; Strapi gives Ram an audit UI for free; idempotency is a single Strapi query | Single-instance; no fan-out; Strapi must be up during the run | **Chosen** |
| B | Pub/Sub queue + Cloud Run worker + Firestore log | Horizontal scale; decouples trigger from work; crash-resilient via message redelivery | New infra surface (Pub/Sub, Firestore); duplicates Strapi as a source of truth; Ram loses the free audit UI; overkill for ~5 posts/day | Rejected — spec explicitly marks "Horizontal scaling / queue fan-out" as out of scope |
| C | Strapi webhook on `entry.create` triggering a one-shot publish | Real-time; no cron; zero scheduled infra | Fires on every edit (thrash); can't "batch daily updates"; loses the daily rhythm Ram asked for; harder to reason about idempotency because there's no natural run boundary | Rejected — spec requires scheduled daily cadence, not real-time |
| D | Third-party automation (Zapier / Make / n8n) | Zero code; fastest to ship | Secrets live in a third-party SaaS; no idempotency guarantee; no TypeScript types; violates Article 7 (secrets hygiene) and Article 8 (quality gates) | Rejected — fails Constitution compliance |

### Decision Rationale — the four sub-choices

**1. Cron-triggered API route (vs queue, vs webhook).**
The repo already ships `src/pages/api/cron/buzzsprout-sync.ts` with the exact pattern we need: POST-only, `isBearerAuthorized` timing-safe check, bearer token from Cloud Run env, no-store cache header, structured error logging. Copying that pattern gives us a production-proven shape in ~30 lines. A queue adds two services and no scaling benefit at ~5 posts/day. A webhook fires on every edit, which violates the "daily batch" intent.

**2. Strapi PublishLog (vs local KV, vs file).**
Idempotency requires durable state that survives deploys, scales across instances, and is visible to Ram. Strapi gives us (a) durability, (b) a free admin UI for Ram, (c) indexed queries on `contentHash` and `runId`, and (d) consistency with the rest of the CMS-first data strategy (Constitution Article 3.4). A local in-memory KV loses state on deploy and cannot guarantee `NFR-7` ("0 duplicate posts over 10 runs"). A file on disk doesn't survive Cloud Run's ephemeral filesystem. No contest.

**3. Per-driver class (vs switch statement).**
Each platform has wildly different payload shapes, auth schemes, char limits, and error modes. A `switch` in one `publish()` function would be a ~400-line monster and would mean every driver change retests every other driver. A driver class per platform gives us (a) one test file per driver, (b) independent rate limiting, (c) independent `goLive` feature flags, (d) a clean `PublisherDriver` interface for future platforms (LinkedIn, Mastodon), and (e) a natural place to hang the `NotEnabledError` defense-in-depth check. The class overhead is negligible — each driver is ~100 lines.

**4. SHA-256 canonical JSON (vs timestamp, vs UUID).**
Idempotency requires a **deterministic** key: same content in → same key out. A timestamp is monotonic (wrong — every retry produces a new "identity"). A UUID is random (wrong — every run produces a new "identity"). Only a content-derived hash satisfies US-6 ("re-running the cron doesn't spam the same content twice"). SHA-256 is overkill cryptographically but is (a) already imported by `src/lib/rate-limit.ts`, (b) collision-resistant at 256 bits, (c) fast enough for ~25 payloads/day, and (d) easy to reason about. Canonicalization (sorted keys, trimmed strings) must be explicit so trivial edits (reordered JSON keys, whitespace) do not mint a new hash and re-publish.

---

## Constitution Compliance

### Technology Stack
- [x] Uses Pages Router (NOT App Router) — `src/pages/api/publishers/*.ts`, `src/pages/admin/publishers/index.tsx`
- [x] TypeScript strict mode, no `any` types — enforced across `src/lib/publishers/**`; the existing `src/lib/cms.ts` narrow-cast helpers will be wrapped in typed adapters
- [x] Tailwind CSS utilities (no inline styles) — admin page only
- [x] CMS data via `src/lib/cms.ts` with static fallback — candidate selection reuses `fetchAllAgents`, `fetchAllMcps`, `fetchAllSkills`, `fetchAllTools`, `fetchAllPodcasts`; fallback is N/A for the cron path (backend ops must fail loudly if CMS is down — matches EC-2)

### Design System (applies only to `/admin/publishers`, N/A for the lib/API)
- [x] Zinc monochrome + coral `#DC2626` accent only
- [x] No forbidden colors (emerald, green, blue, amber, slate) — status badges use `zinc-400` (dry_run), `zinc-600` (skipped_duplicate), `zinc-900` filled (success), `#DC2626` (error)
- [x] Both light and dark mode supported
- [x] Pill-shaped buttons, 1px border cards

### Page Structure (applies only to `/admin/publishers`, N/A for the lib/API)
- [x] `.reveal` hero + `SectionHeader` (kicker `"OPERATIONS"`, title `"Auto-Publisher"`, size `xl`)
- [x] `.surface-panel` for platform toggle + trigger bar
- [x] `.stagger-grid` on "Next candidates" preview cards (NOT nested in `.reveal` — per Article 5)
- [x] `EnterpriseCtaBand` at bottom
- [x] `ContentTypeIcon` for candidate cards

### Patterns
- [N/A] SkillNet 3-layer pattern — auto-publisher is not a content type; it's a backend ops module
- [N/A] Generic templates reused — no ontology/graph/collections here
- [N/A] `getStaticProps` for data fetching — the admin page MUST use `getServerSideProps` (live log data, admin-gated); the API routes are not pages

### Security (Article 7) — applies to both lib and admin
- [x] No secrets in client-side code. `HF_HUB_TOKEN`, `X_API_TOKEN`, `MOLTBOOK_TOKEN`, `PUBLISHER_CRON_TOKEN` are Cloud Run env only. Zero `NEXT_PUBLIC_*` references in `src/lib/publishers/**`. Build-time grep CI check (NFR-5) gates this.
- [x] All API routes implement rate limiting via `src/lib/rate-limit.ts` — `/api/publishers/run` capped at 10/hr per IP (NFR-3), `/api/publishers/history` at 60/hr, `/api/publishers/preview` at 30/hr.
- [x] Input sanitization — cron endpoints accept zero user input; admin manual-trigger button sends a static body; the `bot-defense.ts` helpers are overkill here (cron is bearer-gated, not public) so NOT used on the run endpoint — using them would risk false-positives blocking Cloud Run's own User-Agent.
- [x] CSP headers via existing middleware (`next.config.js` / `_middleware`) — admin page inherits.
- [x] No `dangerouslySetInnerHTML` — rendered log text is plain React children.

### Quality Gates (Article 8)
- [x] `npm run build` must pass — each task in sprints/v3/TASKS.md enforces this
- [x] `npx tsc --noEmit` must pass
- [x] `npm run lint` must pass
- [x] Vitest unit tests must pass before any PR merge

### Constitution conflicts
None identified. The admin page at `/admin/publishers` is a new route, but it's scoped under `/admin/` which is a new top-level operational section (not present in `src/pages/admin/` today). If a future sprint introduces an `/admin` index or auth middleware, this page will need to slot in — flagged as a dependency, not a conflict.

---

## Data Model

### New TypeScript Interfaces — `src/lib/publishers/types.ts`

```typescript
// Platform identifier union — drives config, driver map, and PublishLog enum
export type PlatformName = "huggingface" | "x" | "moltbook";

// Status union — matches Strapi PublishLog enum exactly
export type PublishStatus = "dry_run" | "success" | "error" | "skipped_duplicate";

// Content type union — narrowed from ContentTypeName in ontologyRegistry
export type CandidateType = "agent" | "mcp" | "skill" | "tool" | "podcast";

// A candidate is a CMS entry eligible for publication
export interface PublishCandidate {
  readonly id: string;              // Strapi documentId
  readonly type: CandidateType;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly url: string;             // absolute colaberry.ai URL
  readonly updatedAt: string;       // ISO-8601
  readonly contentVersion: string;  // Strapi updatedAt or version hash — stable per edit
  readonly mediaUrls: readonly string[]; // zero or one entry in phase 1
}

// Rendered payload ready for a specific platform
export interface PublishPayload {
  readonly platform: PlatformName;
  readonly candidateId: string;
  readonly candidateType: CandidateType;
  readonly candidateSlug: string;
  readonly candidateTitle: string;
  readonly contentVersion: string;
  readonly renderedText: string;
  readonly mediaUrls: readonly string[];
}

// Result of a single driver.publish() call
export type PublishResult =
  | { readonly status: "success"; readonly externalId: string; readonly externalUrl: string }
  | { readonly status: "dry_run"; readonly renderedText: string }
  | { readonly status: "error"; readonly errorMessage: string; readonly retryable: boolean };

// Per-platform configuration — enabled gates ALL calls, goLive gates live vs dry-run
export interface PlatformConfig {
  readonly name: PlatformName;
  readonly enabled: boolean;   // if false, driver is skipped entirely
  readonly goLive: boolean;    // if false, driver must return dry_run even when called
  readonly charLimit: number;  // e.g. 280 for X, 2000 for HF, 1000 for Moltbook
  readonly blockedReason?: string; // audit note, e.g. "Ram $100/mo budget pending"
}

// Row persisted to Strapi PublishLog
export interface PublishLogEntry {
  readonly contentHash: string;
  readonly platform: PlatformName;
  readonly status: PublishStatus;
  readonly candidateType: CandidateType;
  readonly candidateSlug: string;
  readonly candidateTitle: string;
  readonly renderedText: string;
  readonly externalId?: string;
  readonly externalUrl?: string;
  readonly errorMessage?: string;
  readonly retryCount: number;
  readonly runId: string;         // UUID v4, one per runPublishers() invocation
  readonly publishedAt: string;   // ISO-8601
}

// Driver contract — every platform implements this exact shape
export interface PublisherDriver {
  readonly platform: PlatformName;
  render(candidate: PublishCandidate): PublishPayload;
  publish(payload: PublishPayload, config: PlatformConfig): Promise<PublishResult>;
}

// runPublishers() return shape — reported by /api/publishers/run
export interface PublishRunSummary {
  readonly runId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly attempted: number;
  readonly success: number;
  readonly dry_run: number;
  readonly skipped_duplicate: number;
  readonly errors: number;
}

// Custom error thrown when a live call is attempted while goLive=false
export class NotEnabledError extends Error {
  constructor(public readonly platform: PlatformName) {
    super(`Platform ${platform} is not go-live enabled`);
    this.name = "NotEnabledError";
  }
}
```

### Existing Types to Reuse

| Type | File | Usage |
|------|------|-------|
| `Skill`, `MCP`, `Agent`, `Tool`, `Podcast` record shapes | `src/lib/cms.ts` | Input to `candidates.ts` mappers that narrow each CMS entry into a `PublishCandidate` |
| `ContentTypeName` | `src/lib/ontologyRegistry.ts` | Source of truth — `CandidateType` is a narrowed subset |
| `RateLimitInfo`, `checkRateLimit`, `getClientIp` | `src/lib/rate-limit.ts` | Applied to all 3 API routes |
| `isBearerAuthorized`, `getBearerToken` | `src/lib/api-auth.ts` | Timing-safe auth on `/api/publishers/run` (matches `src/pages/api/cron/buzzsprout-sync.ts` pattern) |

---

## Component Hierarchy

```
AdminPublishersPage (src/pages/admin/publishers/index.tsx)
|-- Layout (global wrapper)
|-- .reveal (hero)
|   `-- SectionHeader
|         kicker="OPERATIONS"
|         title="Auto-Publisher"
|         description="Daily updates to Hugging Face, X, Moltbook"
|         size="xl"
|-- .reveal
|   `-- PlatformControlPanel (.surface-panel)
|         |-- PlatformChip x 3 (.chip-brand if live, .chip-neutral if dry-run)
|         |     |-- platform name
|         |     `-- status dot (zinc-400 dry / zinc-900 live / #DC2626 error)
|         `-- TriggerButton (rounded-full, coral #DC2626 bg, calls POST /api/publishers/run)
|-- .reveal
|   |-- SectionHeader size="md" title="Next candidates (preview)"
|   `-- CandidateGrid (.stagger-grid)   [NOT nested inside outer .reveal — Article 5]
|         `-- CandidateCard (.catalog-card) x N
|               |-- ContentTypeIcon
|               |-- candidate.title
|               |-- candidate.summary
|               `-- renderedText preview per platform
|-- .reveal
|   |-- SectionHeader size="md" title="Recent publish log (last 50)"
|   `-- PublishLogTable
|         `-- PublishLogRow x 50
|               |-- timestamp
|               |-- platform chip
|               |-- StatusBadge (zinc-400 / zinc-600 / zinc-900 / #DC2626)
|               |-- candidateTitle
|               `-- externalUrl link (if success) or errorMessage (if error)
`-- EnterpriseCtaBand
```

### Existing Components to Reuse

| Component | File | Reuse Type |
|-----------|------|-----------|
| `SectionHeader` | `src/components/SectionHeader.tsx` | Direct use |
| `EnterpriseCtaBand` | `src/components/EnterpriseCtaBand.tsx` | Direct use |
| `ContentTypeIcon` | `src/components/ContentTypeIcon.tsx` | Direct use |
| `Layout` | `src/components/Layout.tsx` | Direct use |

### New Components to Create

| Component | File | Purpose |
|-----------|------|---------|
| `PlatformControlPanel` | inline in `src/pages/admin/publishers/index.tsx` | Shows platform enable/live status + trigger button |
| `CandidateCard` | inline in `src/pages/admin/publishers/index.tsx` | Preview card for a candidate's rendered text per platform |
| `StatusBadge` | inline in `src/pages/admin/publishers/index.tsx` | Zinc-only status badge (no dedicated component — small enough to inline) |
| `PublishLogTable` | inline in `src/pages/admin/publishers/index.tsx` | Scrollable table of last 50 log entries |

All four are kept **inline in the page file** (not extracted to `src/components/`) because they are used nowhere else and extracting them would create a naming-collision risk with the locked 38-component catalog described in `src/components/CLAUDE.md`.

---

## File Changes

Files are ordered by **dependency** — each row only depends on rows above it. Every file maps to at least one task in `sprints/v3/TASKS.md`.

| # | File | Action | Description | Task(s) |
|---|------|--------|-------------|---------|
| 1 | `src/lib/publishers/types.ts` | Create | All interfaces from Data Model section above. Zero runtime code. Exports `NotEnabledError` as the only class. | Task 1 |
| 2 | `src/lib/publishers/config.ts` | Create | Exports `PUBLISHER_PLATFORMS: readonly PlatformConfig[]`. All three platforms with `goLive: false`. `huggingface.enabled=true`, `x.enabled=true` with `blockedReason`, `moltbook.enabled=true` with `blockedReason`. Also exports `PUBLISHER_CRON_TOKEN` getter (throws if missing at runtime, NOT at import — so build doesn't break in CI). | Task 1 |
| 3 | `src/lib/publishers/hash.ts` | Create | Exports `canonicalize(value: unknown): string` (sorted keys, trimmed strings, stable stringify) and `contentHash(payload: PublishPayload): string` via `crypto.createHash("sha256")`. Pure, synchronous, no I/O. | Task 3 (impl, after Task 2 tests) |
| 4 | `src/lib/publishers/__tests__/hash.test.ts` | Create | Vitest: identical payloads to same hash, reordered keys to same hash, whitespace to same hash, different platforms to different hashes. Four test cases minimum. | Task 2 |
| 5 | `src/lib/publishers/candidates.ts` | Create | Exports `selectCandidates({ sinceHours }): Promise<readonly PublishCandidate[]>`. Calls `fetchAllAgents`/`fetchAllMcps`/`fetchAllSkills`/`fetchAllTools`/`fetchAllPodcasts` from `src/lib/cms.ts` in parallel, filters by `updatedAt > now - sinceHours`, filters out drafts, maps each into `PublishCandidate`. Per-type mappers are private helpers. Errors bubble up (no swallow). | Task 5 |
| 6 | `src/lib/publishers/__tests__/candidates.test.ts` | Create | Vitest: mocks `src/lib/cms.ts`, asserts 24h filter, draft filter, all-5-types polling, return-type contract. | Task 4 |
| 7 | `src/lib/publishers/logger.ts` | Create | Exports `writePublishLog(entry: PublishLogEntry): Promise<void>`. POSTs to `${CMS_URL}/api/publish-logs` with `Authorization: Bearer ${CMS_API_TOKEN}`. 10s `AbortSignal.timeout`. Throws on non-2xx — caller decides how to handle (NFR-4, EC-7). Also exports `queryPublishLogByHash(hash, platform): Promise<PublishLogEntry \| null>` for idempotency lookup. | Task 9 |
| 8 | `src/lib/publishers/__tests__/logger.test.ts` | Create | Vitest: mocks `fetch`, asserts POST path, bearer header, required fields, network error throws. | Task 8 |
| 9 | `src/lib/publishers/drivers/base.ts` | Create | Exports `PublisherDriver` interface (re-exported from types for convenience) and `BaseDriver` abstract class with default `render()` helper (`buildRenderedText`) that truncates to `config.charLimit` and appends the colaberry.ai URL. Concrete drivers extend this. | Task 7 |
| 10 | `src/lib/publishers/drivers/huggingface.ts` | Create | `class HuggingFaceDriver extends BaseDriver`. `platform: "huggingface"`, `charLimit: 2000`. `render()` produces a HF post payload object. `publish()`: if `config.goLive === false`, return `{ status: "dry_run", renderedText }` immediately (no fetch). If `goLive === true`, throw `NotEnabledError` (stub — Task 19 flips this). | Task 7 |
| 11 | `src/lib/publishers/__tests__/huggingface.test.ts` | Create | Vitest: asserts no network call when `goLive=false`, assert charLimit, assert colaberry.ai link in rendered text. | Task 6 |
| 12 | `src/lib/publishers/drivers/x.ts` | Create | `class XDriver extends BaseDriver`. `platform: "x"`, `charLimit: 280`. Dry-run only. Live path always throws `NotEnabledError`. Config comment: `blockedReason: "Ram $100/mo Basic-tier budget + handle decision pending"`. | Task 15 |
| 13 | `src/lib/publishers/__tests__/x.test.ts` | Create | Vitest: 280-char limit, link present, `goLive=false` guarantees no network. | Task 15 |
| 14 | `src/lib/publishers/drivers/moltbook.ts` | Create | `class MoltbookDriver extends BaseDriver`. `platform: "moltbook"`, `charLimit: 1000`. Dry-run only. Live path throws. Config comment: `blockedReason: "Build-for-Agents early access application pending"`. | Task 16 |
| 15 | `src/lib/publishers/__tests__/moltbook.test.ts` | Create | Vitest: schema shape, `goLive=false` guarantees no network. | Task 16 |
| 16 | `src/lib/publishers/index.ts` | Create | Exports `runPublishers(): Promise<PublishRunSummary>`. Flow: generate `runId` (UUID v4 via `crypto.randomUUID`), call `selectCandidates({ sinceHours: 24 })`, for each `(candidate, platform)` pair: render, hash, query dupe, skip or dry-run or publish, `writePublishLog`. Catches per-candidate errors so one failure doesn't abort the run (FR-11). Returns `PublishRunSummary`. | Task 11 |
| 17 | `src/lib/publishers/__tests__/run.test.ts` | Create | Vitest: mocks candidates/drivers/logger. Asserts (a) every candidate x platform attempted, (b) dupe to skipped_duplicate (no driver call), (c) driver throw to error log + run continues, (d) shared runId. | Task 10 |
| 18 | `src/pages/api/publishers/run.ts` | Create | POST-only. Timing-safe bearer check against `PUBLISHER_CRON_TOKEN`. Rate-limited `10/hr/IP` via `checkRateLimit`. Invokes `runPublishers()`. Returns `PublishRunSummary`. Non-POST to 405, bad auth to 401, rate-limited to 429, run failure to 503 with runId. Mirrors `src/pages/api/cron/buzzsprout-sync.ts` shape. | Task 12 |
| 19 | `src/pages/api/publishers/history.ts` | Create | GET-only. Bearer auth against `ADMIN_API_KEY`. Rate-limited `60/hr/IP`. Returns last 50 `PublishLog` entries from Strapi, newest first. | Task 14 |
| 20 | `src/pages/api/publishers/preview.ts` | Create | GET-only. Bearer auth against `ADMIN_API_KEY`. Rate-limited `30/hr/IP`. Runs `selectCandidates({ sinceHours: 24 })` + drivers' `render()` ONLY (never `publish()`). Returns the payload array the admin page renders in the "next candidates" grid. | Task 13 (supporting) |
| 21 | `src/pages/admin/publishers/index.tsx` | Create | Admin page per Component Hierarchy above. Uses `getServerSideProps` to call `/api/publishers/history` + `/api/publishers/preview` server-side with the admin token. Renders locked theming only. Includes "Trigger dry-run now" button that POSTs to `/api/publishers/run` from the client (admin token is passed through a session cookie or admin header — wires into existing admin auth). | Task 13 |
| 22 | `docs/runbooks/auto-publisher-deployment.md` | Create | Cloud Run Cron Job creation command, required env vars, log-viewing instructions, go-live flip checklist with Ram sign-off capture procedure. | Task 17 |
| 23 | `specs/auto-publisher/cms-publish-log-schema.md` | Create | Strapi `api::publish-log.publish-log` schema.json mirror — all 13 fields from PRD Section "Strapi PublishLog Content Type", unique index on `contentHash`, index on `runId`, public role no permissions, bearer-only write. | Task 9 (companion) |

No modifications to existing files. Zero risk of clobbering in-flight work on `Release-1.0.beta` or the Substack signup path.

---

## API Changes

### New API Routes

| Route | Method | Purpose | Auth | Rate Limit |
|-------|--------|---------|------|------------|
| `/api/publishers/run` | POST | Cron entrypoint — invokes `runPublishers()`. Returns `PublishRunSummary`. | Bearer `PUBLISHER_CRON_TOKEN` (timing-safe via `isBearerAuthorized`) | 10/hr/IP |
| `/api/publishers/history` | GET | Admin read — last 50 PublishLog rows, newest first. | Bearer `ADMIN_API_KEY` | 60/hr/IP |
| `/api/publishers/preview` | GET | Admin dry-run render — selects candidates + renders but never calls `publish()`. | Bearer `ADMIN_API_KEY` | 30/hr/IP |

All three routes:
- Return `Cache-Control: no-store`
- Log structured JSON on error via `console.error` (Cloud Logging-friendly)
- Non-matching method returns 405 with an `Allow` header
- Missing/invalid auth returns 401 with no error detail (anti-enumeration)
- Rate-limit hit returns 429 with `Retry-After` header

### CMS Content Type Changes

| Content Type | Change | Fields |
|-------------|--------|--------|
| `api::publish-log.publish-log` | **Create** (new) | See below |

**`PublishLog` fields (matches PRD Section "Strapi PublishLog Content Type"):**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `contentHash` | string, **unique index** | yes | SHA-256 hex, 64 chars — idempotency key |
| `platform` | enum: `huggingface` \| `x` \| `moltbook` | yes | Matches `PlatformName` |
| `status` | enum: `dry_run` \| `success` \| `error` \| `skipped_duplicate` | yes | Matches `PublishStatus` |
| `candidateType` | enum: `agent` \| `mcp` \| `skill` \| `tool` \| `podcast` | yes | Matches `CandidateType` |
| `candidateSlug` | string | yes | Links back to CMS item |
| `candidateTitle` | string | yes | Denormalized for admin UI |
| `renderedText` | text | yes | Full text we tried to post |
| `externalId` | string | no | Platform's returned post ID (on success) |
| `externalUrl` | string | no | Public URL of the live post |
| `errorMessage` | text | no | Captured exception (on error) |
| `retryCount` | integer, default `0` | yes | Incremented by future retry logic (out of scope phase 1) |
| `runId` | string, **indexed** | yes | UUID v4 per cron invocation |
| `publishedAt` | datetime | yes | ISO-8601 |

**Permissions (Strapi):**
- Public role: **no** permissions (no read, no write)
- Authenticated role: **no** permissions
- Writes exclusively via bearer token in `src/lib/publishers/logger.ts`

CMS companion PR lives in the `colaberry-ai-cms-fork` repo — Task 18 — and must be merged before the first production cron run.

---

## Testing Strategy

### Unit Tests (Vitest) — 100% of `src/lib/publishers/` business logic (NFR-2)

| Test file | Covers | Key assertions |
|-----------|--------|---------------|
| `__tests__/hash.test.ts` | `canonicalize`, `contentHash` | Same-input same-output, key-order invariance, whitespace invariance, platform discrimination |
| `__tests__/candidates.test.ts` | `selectCandidates` | 24h window filter, draft exclusion, all 5 types polled, return-type contract, error bubbling |
| `__tests__/logger.test.ts` | `writePublishLog`, `queryPublishLogByHash` | POST path, bearer header, required fields, network error throws |
| `__tests__/huggingface.test.ts` | `HuggingFaceDriver` | `goLive=false` no network, charLimit respected, colaberry.ai link present, `NotEnabledError` on live path |
| `__tests__/x.test.ts` | `XDriver` | 280-char cap, `NotEnabledError` on live path |
| `__tests__/moltbook.test.ts` | `MoltbookDriver` | Schema shape, `NotEnabledError` on live path |
| `__tests__/run.test.ts` | `runPublishers` orchestration | Per-candidate try/catch, dupe skip, shared runId, summary counts |

All tests follow TDD red-green-refactor — the **test task precedes the impl task** in `sprints/v3/TASKS.md` for every module.

### Integration / E2E Tests (Playwright)

- [ ] `/admin/publishers` renders in both light + dark mode with mock fixture data
- [ ] "Trigger dry-run now" button successfully calls `/api/publishers/run`, shows a success toast, refreshes the log table
- [ ] Zero forbidden colors (emerald/green/blue/amber/slate) detected by a DOM-scan assertion

### Manual Verification

- [ ] Light mode visual check — status badges legible, coral CTA button visible
- [ ] Dark mode visual check — no safety-net conflicts on `bg-zinc-950`
- [ ] Mobile responsive (375px) — table collapses to stacked cards
- [ ] Tablet (768px), desktop (1280px)
- [ ] Trigger dry-run locally with `PUBLISHER_MODE=dry-run`, verify `PublishLog` rows appear in Strapi admin
- [ ] Verify `renderedText` of each dry-run against each platform's real char limit / schema doc
- [ ] Go-live gate test: attempt to call a driver's live path while `goLive=false` — must throw `NotEnabledError`

### Build gates (blocking)

- [ ] `npx tsc --noEmit` zero errors
- [ ] `npm run lint` zero errors
- [ ] `npm run build` zero errors
- [ ] `vitest run src/lib/publishers` all green

---

## Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R-1 | **Secret leak** — `HF_HUB_TOKEN` or `PUBLISHER_CRON_TOKEN` accidentally committed or exposed via `NEXT_PUBLIC_*` | Med | High | (a) Build-time grep CI check that fails the build if any `NEXT_PUBLIC_*` references a driver secret (NFR-5). (b) Secrets live only in Cloud Run env, never in `.env.local` checked in. (c) `@security-secrets` agent run before every release. (d) `getPublisherCronToken()` helper throws at runtime, not import time — so missing secrets don't mask other build errors. |
| R-2 | **Duplicate posts** — hash collision, race on double-fire, or Strapi query lag lets the same payload go live twice | Low | High | (a) SHA-256 (256-bit collision resistance) + canonical JSON over platform + candidateId + contentVersion. (b) Idempotency check against Strapi `PublishLog` **before** the external call. (c) Unique index on `contentHash` in Strapi — DB-level defense. (d) Unit test `run.test.ts` asserts dupe skip, `hash.test.ts` asserts determinism. (e) EC-8 test: cron double-fire in same minute writes `skipped_duplicate` for everything. (f) NFR-7: 0 duplicates over 10 runs is a measurable success metric. |
| R-3 | **External API changes** — HF/X/Moltbook changes payload shape, auth scheme, or URL | High (over a year horizon) | Med | (a) Each driver is isolated — one change recompiles one file. (b) 10s `AbortSignal.timeout` (NFR-4) so a broken API doesn't hang the cron. (c) Structured `PublishLog.errorMessage` makes detection trivial. (d) Vitest mocks pin the expected request shape, so any drift surfaces as a test failure when we update the driver. (e) For X and Moltbook — defer live integration until we have written integration tests against a staging API. |
| R-4 | **Platform rate limiting by HF / X / Moltbook** — spike of publishes triggers a 429 or ban | Med | Med | (a) Daily cadence, one post per type per day, max ~5 posts/day per platform — well below any documented rate limit. (b) Per-driver 10s `AbortSignal.timeout`. (c) `EC-4` documents 429 handling: error log, next cron retries. (d) Backoff is OUT of scope phase 1 (out-of-scope list item) — if 429 becomes common, sprint v4 adds exponential backoff. (e) Internal rate limit on `/api/publishers/run` (10/hr/IP) prevents admin-button abuse. |
| R-5 | **Ram go-live gate bypass** — someone flips `goLive=true` without Ram's sign-off, or a driver is re-architected and the `NotEnabledError` defense is removed | Low | **Critical** (reputation risk) | (a) **Code-level defense:** every driver checks `config.goLive` and throws `NotEnabledError` in the live branch (defense in depth — even if `config.goLive` is flipped by mistake, the driver's live implementation is a stub that throws until manually built). (b) **PR review:** sprints/v3/TASKS.md Task 19 requires Ram's written approval captured in the PR description + Basecamp comment. (c) **Test-level defense:** each driver test asserts `goLive=false` produces zero network calls. (d) **Audit trail:** first live post for each platform must be manually verified against the public URL before a second run is permitted (spec US-3). (e) **Runbook:** `docs/runbooks/auto-publisher-deployment.md` Task 17 documents the flip procedure, including the sign-off capture step. |
| R-6 | **Strapi unavailable during cron run** (EC-2) — entire run fails | Med | Low | (a) Run fails loudly, `/api/publishers/run` returns 503 with `runId`. (b) Nothing is posted externally (we never reached the driver). (c) Next cron run retries automatically — 24h tolerance is fine for a daily post. (d) Cloud Logging captures the error for alerting. |
| R-7 | **PublishLog write fails after a successful live post** (EC-7) — we can't audit the post we just published | Low | Med | (a) Do NOT retry the external post (we'd duplicate). (b) Log the discrepancy to Cloud Logging with the `runId` + `externalId`. (c) Sprint v4 can add a reconciliation job that re-posts missing PublishLog rows. (d) Rare: Strapi outage during the ~100ms window between an external API return and the log write. |

---

## Estimated Effort

Aligned with the **20 tasks** in `sprints/v3/TASKS.md` (14 P0 + 4 P1 + 2 P2). Each task is budgeted ~10 min (the TDD cycle for a single file) per the sprint doc's "Duration" column.

| Phase | Tasks | Task IDs | Complexity |
|-------|-------|----------|------------|
| Types + Config | 1 | Task 1 | Low |
| Hash module (test + impl) | 2 | Task 2, 3 | Low |
| Candidates (test + impl) | 2 | Task 4, 5 | Medium (CMS mapping across 5 types) |
| HF Driver (test + impl) | 2 | Task 6, 7 | Medium (establishes BaseDriver pattern) |
| Logger + CMS schema spec | 2 | Task 8, 9 | Low |
| Orchestrator (test + impl) | 2 | Task 10, 11 | Medium (per-candidate error boundary) |
| Cron API route | 1 | Task 12 | Low (mirrors buzzsprout-sync) |
| Admin page | 1 | Task 13 | Medium (locked theming, dark mode, no forbidden colors) |
| History API | 1 | Task 14 | Low |
| **P0 subtotal** | **14** | 1-14 | — |
| X driver (test + impl) | 1 | Task 15 | Low (pattern matches HF) |
| Moltbook driver (test + impl) | 1 | Task 16 | Low |
| Deployment runbook | 1 | Task 17 | Low |
| CMS sibling PR (PublishLog schema) | 1 | Task 18 | Low (CMS repo, not this repo) |
| **P1 subtotal** | **4** | 15-18 | — |
| HF go-live flip (Ram approval gated) | 1 | Task 19 | Low (one-line flag) |
| `/walkthrough` sprint review | 1 | Task 20 | Low |
| **P2 subtotal** | **2** | 19-20 | — |
| **Total** | **20 tasks** | — | — |

**Estimated total developer time:** ~3.5 hours of focused TDD work (not counting Ram approval wait time for Task 19, CMS sibling PR merge time for Task 18, and Cloud Run deployment time for Task 17).

**Critical path:** Task 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 (all P0, strictly linear by dependency). P1 tasks 15-16 can run in parallel with Task 13-14. Tasks 17-18 can run in parallel with any code task.

---

## Open Questions Flagged to Sprint Backlog

These remain from `specs/auto-publisher/spec.md` Section "Open Questions" and are **not** resolved by this plan:

- Ram: Approve $100/mo X Basic tier budget? (Blocks X driver live path — Task 15 ships dry-run only regardless.)
- Ram: What is the X handle?
- Ram: Daily vs weekly cadence? (Plan assumes daily @ 14:00 UTC per FR-1; a change would only edit the cron schedule in Task 17's runbook.)
- Sai: Moltbook Build-for-Agents application status.
- Sai: Does `colaberry` HF org exist?
- Team: Should dry-run logs be visible to non-admin users? (Plan assumes admin-only — `ADMIN_API_KEY` bearer on `/api/publishers/history`.)
- Team: Per-content-type daily cap to avoid flooding? (Plan assumes no cap — all candidates go. If we add a cap, it lives in `candidates.ts` as a post-filter.)

None of these block P0 delivery. All P0 work ships in dry-run mode with zero external side effects, so the blockers above only gate P2 Task 19 (the actual HF go-live flip).
