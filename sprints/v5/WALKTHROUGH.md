# Sprint v5 — Walkthrough

## Summary

Sprint v5 upgraded the catalog distribution module from a v4 POC (hard-coded
platform list, hard-coded copy) into a CMS-driven pipeline where every
channel is editable in Strapi admin. Ops can now pause, enable, or re-template a
distribution channel without a code deploy; credentials stay in Cloud Run env
(referenced by name from CMS); every dispatch persists a `distribution-log`
row for admin audit. Ten platforms are reserved in the type union; three
ship with clients (X OAuth 1.0a, Moltbook bearer, Hugging Face dry-run
stub) and the remaining seven cleanly return `skipped: not-implemented`.

## Architecture Overview

```
                    ┌──────────────────────────────────────────────┐
                    │  Cloud Scheduler (daily) → bearer token      │
                    └──────────────────────┬───────────────────────┘
                                           │ POST
                                           ▼
          ┌──────────────────────────────────────────────────────────┐
          │  /api/cron/catalog-distribution.ts                       │
          │    • POST-only, Bearer CATALOG_DISTRIBUTION_SECRET       │
          │    • DRY_RUN unless CATALOG_DISTRIBUTION_LIVE=true       │
          │      OR ?live=true query                                 │
          │    • ?forceStatic=true → bypass CMS                      │
          └──────────────────────────┬───────────────────────────────┘
                                     │
                                     ▼
          ┌──────────────────────────────────────────────────────────┐
          │  orchestrator.runDistribution(options)                   │
          │                                                          │
          │  1. channelConfig.fetchEnabledChannels()                 │
          │     └─ Strapi `distribution-channel` → ChannelConfig[]   │
          │        (on failure: STATIC_CHANNELS fallback, never throws)
          │                                                          │
          │  2. source.fetchRecentEntries()                          │
          │     └─ Promise.allSettled over 5 CMS kinds               │
          │        lean `filters[updatedAt][$gt]` queries            │
          │                                                          │
          │  3. templates.buildDrafts(entry, {channels})             │
          │     └─ template.renderTemplate(tpl, entry, opts)         │
          │        Mustache-style, zero deps, X 280-char trim        │
          │                                                          │
          │  4. dispatch per channel with concurrency=3              │
          │     ├─ clients/x.ts        (OAuth 1.0a HMAC-SHA1)        │
          │     ├─ clients/moltbook.ts (Bearer + Idempotency-Key)    │
          │     ├─ clients/huggingface.ts (dry-run stub)             │
          │     └─ unknown platform   → skipped: not-implemented     │
          │                                                          │
          │  5. store.writeDispatchLogs(results)                     │
          │     └─ POST Strapi `distribution-log`, never throws      │
          │                                                          │
          │  6. return DistributionRunResult                         │
          └──────────────────────────────────────────────────────────┘

          ┌──────────────────────────────────────────────────────────┐
          │  /api/internal/distribution-preview.ts                   │
          │    • Admin-key auth (x-colaberry-admin-key)              │
          │    • Always DRY_RUN — hard-coded, ignores live flags     │
          │    • Accepts ?channel=<documentId> for single-channel    │
          │      preview, repeatable ?kind / ?platform, ?windowHours │
          └──────────────────────────────────────────────────────────┘

          ┌──────────────────────────────────────────────────────────┐
          │  CREDENTIAL OWNERSHIP                                    │
          │  Strapi `distribution-channel.credentialRef` = env NAME  │
          │  Cloud Run env[credentialRef]            = actual secret │
          │  resolveChannelCredential() reads at dispatch time       │
          │  → CMS never stores plaintext tokens                     │
          └──────────────────────────────────────────────────────────┘
```

## Files Created/Modified

### src/lib/distribution/types.ts
**Purpose**: Shared type contract for every distribution module, client, test, and API route.
**Key exports**:
- `Platform` — 10-member union (`x`, `moltbook`, `huggingface`, `devto`, `hashnode`, `reddit`, `discord`, `producthunt`, `hackernews`, `github`)
- `ContentKind` — 5 CMS content types eligible for distribution
- `DistributableEntry` — source-layer shape (id, kind, title, summary, url, tags, updatedAt, isNew)
- `PostDraft`, `DispatchResult`, `PlatformClient`, `DispatchOptions`, `DistributionRunResult`
- `ChannelConfig` — per-channel CMS config; `credentialRef` is an env-var NAME, never a secret

**How it works**: This file is the contract. Every new platform client must implement `PlatformClient`; every new channel row in Strapi normalizes to `ChannelConfig`. Deliberate narrow shape keeps the surface small — `DistributableEntry` only carries fields every platform needs so template authors can't reach for deep CMS graph data without an explicit source-layer change.

### src/lib/distribution/source.ts
**Purpose**: Pull recently-updated catalog entries from Strapi and normalize them into `DistributableEntry[]`.
**Key functions**:
- `fetchRecentEntries(options)` — runs `Promise.allSettled` across 5 `KIND_CONFIGS`; per-kind failures push into `errors[]` without dropping the whole run
- `fetchForKind()` — lean Strapi query with explicit `fields[n]=` projection (no deep `populate=*`), sorted by `updatedAt desc`, paginated to `maxPerKind`
- `normalizeRow()` — computes absolute URL from `urlPrefix + slug`, derives `isNew` via `createdAt >= cutoffIso && createdAt === updatedAt`

**How it works**: Deliberately bypasses the heavy `fetchSkills / fetchAgents / ...` helpers in `src/lib/cms.ts` because those populate deep graph relations (tags + companies + use-cases + agent links) the distribution module doesn't need. Each kind maps to `{collectionPath, urlPrefix, titleField, summaryField, visibilityFilter}` — adding a new kind is one more record in `KIND_CONFIGS`. The podcast `description` field is Strapi rich-text (block nodes) so `extractSummary` calls a `walkRichText` recursor to flatten to plain text.

### src/lib/distribution/channelConfig.ts
**Purpose**: Read the Strapi `distribution-channel` collection, normalize to `ChannelConfig[]`, fall back to hard-coded `STATIC_CHANNELS` on failure. Never throws.
**Key exports**:
- `STATIC_CHANNELS` — three fallback channels matching the v4 POC (X / Moltbook / HF) for when CMS is down
- `fetchEnabledChannels(options)` — returns `{channels, source: "cms"|"static", reason}`
- `resolveChannelCredential(channel)` — reads `process.env[channel.credentialRef]` at dispatch time; never logs the secret

**How it works**: The v5 architectural shift lives here. The fetcher targets `/api/distribution-channels?pagination[pageSize]=50&sort[0]=name:asc&publicationState=live`. Rows with invalid `platform` enum values or missing `credentialRef`/`bodyTemplate` are dropped with a console warn. `clampInt()` bounds `defaultWindowHours` to 1-336h and `maxPostsPerRun` to 1-200. The `reason` field is threaded into `runErrors[0]` so cron logs are self-diagnostic ("channel source: cms — loaded 3 channels from CMS" vs. "channel source: static — CMS fetch failed: CMS 401 Unauthorized").

### src/lib/distribution/template.ts
**Purpose**: Zero-dependency Mustache-style template engine scoped to distribution needs. Never throws.
**Key export**: `renderTemplate(template, entry, options)`

**Supported tokens**:
- Interpolation: `{{title}}`, `{{summary}}`, `{{url}}`, `{{kind}}`, `{{updatedAt}}`, `{{tags}}` (bare = comma-joined)
- Iteration: `{{#tags}}…{{.}}…{{/tags}}` (current item via `{{.}}`)
- Truthy section: `{{#isNew}}…{{/isNew}}`, `{{#hasTags}}…{{/hasTags}}`, `{{#hasSummary}}…{{/hasSummary}}`
- Inverted section: `{{^isNew}}…{{/isNew}}` (renders when key is falsy)

**How it works**: Single-pass parser. Finds `{{` markers, handles three cases: section open (`#`/`^`) recurses into `renderSection` with balanced-tag matching via `findSectionEnd`; section close (`/`) is a stray so skip; plain key dispatches to `renderVariable`. Unknown tokens render as `""` — `undefined` never leaks into a post. `options.escapeHtml` escapes `{{title}}` / `{{summary}}` / `{{.}}` but intentionally never escapes `{{url}}` (must stay a link). `options.maxLength` trims with `.trimEnd()` + `…` for X's 280-char budget. Malformed input (non-string template, unclosed `{{`, unclosed section, stray `{{/tag}}`) is handled gracefully — the engine warns but never crashes.

```ts
// Section rendering with nesting support
function findSectionEnd(template: string, from: number, key: string): number {
  const openA = `{{#${key}}}`, openB = `{{^${key}}}`, close = `{{/${key}}}`;
  let depth = 1, cursor = from;
  while (cursor < template.length) {
    const nextClose = template.indexOf(close, cursor);
    if (nextClose === -1) return -1;
    // ...increment depth on same-key opens, match on close
  }
}
```

### src/lib/distribution/templates.ts
**Purpose**: Pure adapter that converts one `DistributableEntry × ChannelConfig` into a `PostDraft` with the right platform-canonical payload shape.
**Key export**: `buildDrafts(entry, options)`

**How it works**: For each channel in `options.channels`, checks `channelSupportsKind` (empty `supportedKinds` = all), then dispatches on `channel.platform` to one of three builders:
- `buildXDraft` — single 280-char text field, `maxLength: 280` passed to the engine
- `buildMoltbookDraft` — separate title + body (title falls back to "New/Updated {kind}: {title}" if no `titleTemplate`), tags sliced to 8
- `buildHuggingfaceDraft` — payload is a JSONL `row` object (not rendered text); `text` carries the dry-run preview
- `buildGenericDraft` — any reserved-but-not-implemented platform (devto/hashnode/reddit/discord/producthunt/hackernews/github) gets a draft so dry-run previews still render the copy; the orchestrator later tags its dispatch as `skipped: not-implemented`

Idempotency key is uniform: `${platform}:${entry.id}:${entry.updatedAt}` via `makeIdempotencyKey`. Pure function — no I/O, no env reads.

### src/lib/distribution/orchestrator.ts
**Purpose**: The one function the cron + preview routes call. Drives channels → source → templates → dispatch → log pipeline. Never throws.
**Key export**: `runDistribution(options)`

**How it works**: Six phases per run:
1. **Channels** — `fetchEnabledChannels` with optional platform/channel-documentId filtering; first `runErrors` entry names the source
2. **Source** — `fetchRecentEntries` with derived `windowHours` (max of all channels' `defaultWindowHours` unless overridden); early-return if empty
3. **Templates** — iterate channels, slice entries to `channel.maxPostsPerRun`, fan out via `buildDrafts`; per-entry errors push to `runErrors` but never abort
4. **Dispatch** — group by channel → `dispatchWithConcurrency` with cap=3 workers per channel; unknown-platform short-circuit returns synthesized `skipped: not-implemented` results; `dryRun || channel.dryRunOverride` gives per-channel staging control
5. **Persist** — `writeDispatchLogs` via per-draft `draftIndex` map; swallows every error so observability loss never fails the run
6. **Finalize** — stable sort dispatches by platform+attemptedAt, return `DistributionRunResult`

```ts
const CLIENTS: Partial<Record<Platform, PlatformClient>> = {
  x: xClient, moltbook: moltbookClient, huggingface: huggingfaceClient,
};
// A channel pointing at a platform NOT in this map gets a synthesized
// `skipped: not-implemented` dispatch. Add a client, add a line here.
```

`makeRunId` builds `dist-YYYYMMDDTHHMMSSZ-<4rand>` — short enough for a Strapi string, readable in admin, collision-resistant for daily cron.

### src/lib/distribution/store.ts
**Purpose**: Persist one `distribution-log` row per dispatch. Never throws.
**Key exports**: `writeDispatchLog(input)`, `writeDispatchLogs(inputs)`

**How it works**: Bearer-auth POST to `/api/distribution-logs` with `AbortController` timeout (`DISTRIBUTION_LOG_TIMEOUT_MS`, default 5s). Payload truncates `payloadPreview` at 4 KB to protect the Strapi text column. Channels whose `documentId` starts with `static:` skip persistence — they don't exist in CMS so the relation resolver would reject. Every error path (no CMS URL, no token, non-2xx, network fault, timeout) returns `false` without throwing. The orchestrator awaits the writes so Cloud Run doesn't kill the process mid-flight.

### src/lib/distribution/clients/x.ts
**Purpose**: X/Twitter v2 tweet create via OAuth 1.0a user-context signing. Zero extra deps (Node's `crypto`).

**How it works**: Implements `PlatformClient`. Five early-return branches (wrong platform routed, over-280-char, empty text, dry-run, missing creds) before the network call. Production path builds `Authorization: OAuth ...` header via `buildOAuth1Header` — RFC 5849 HMAC-SHA1 with a 32-hex-char nonce from `randomBytes(16)`. Per Twitter v2's guidance the JSON body is intentionally NOT included in the signature base string. Uses RFC 3986 `percentEncode` (stricter than `encodeURIComponent` — also escapes `!`, `'`, `(`, `)`, `*`). Every catch path returns a structured `DispatchResult` with `errorCode: "timeout" | "network" | "routing" | "payload" | "config"` or the HTTP status.

### src/lib/distribution/clients/moltbook.ts
**Purpose**: Moltbook REST v1 `/posts` client with bearer token.

**How it works**: POSTs `{agent_slug, title, body, tags, canonical_url}` with `Authorization: Bearer` plus an `Idempotency-Key` header sourced from the draft's idempotency key (per Sai's research notes Moltbook dedupes on this header server-side within 24h). `MOLTBOOK_API_BASE_URL` env var overrides the default `https://api.moltbook.com/v1`. Same five-branch early-return pattern + structured failure results as the X client.

### src/lib/distribution/clients/huggingface.ts
**Purpose**: Hugging Face stub. Dry-run only — live-commit path deferred. Preserves `PlatformClient` contract so the orchestrator iterates uniformly.

**How it works**: Dry-run returns the JSONL row we would have committed (useful for schema validation end-to-end). Non-dry-run + token present returns a structured `skipped` with `errorCode: "not-implemented"` and the target `repoId` in the message. Rationale is in the file header: HF Datasets doesn't expose a row-append endpoint; the supported shape is download-shard → append → multipart-commit, which needs file-locking against concurrent runs. Flip to live = swap this file; no orchestrator/template changes needed.

### src/pages/api/cron/catalog-distribution.ts
**Purpose**: Daily cron entry point. Cloud Scheduler POSTs once/day.

**How it works**: POST-only, `Allow: POST` on anything else. Bearer auth via `isBearerAuthorized(req, CATALOG_DISTRIBUTION_SECRET)` (timing-safe). `dryRun = !(LIVE_ENV_FLAG || liveFromQuery)` — both opts must be present for live posting, and env-var + query are independent toggles. `?forceStatic=true` flips `forceStaticChannels` for CMS-outage recovery. `?windowHours=` overrides the derived window (1..336). Outer `try/catch` wraps programmer-bug 500s — the orchestrator's own errors land in `runErrors` and still return 200 with a populated body. `Cache-Control: no-store` on every response.

### src/pages/api/internal/distribution-preview.ts
**Purpose**: Admin DRY_RUN preview — never posts live regardless of flags.

**How it works**: GET|POST accepted. Admin-key auth via `isAdminAuthorized(req, COLABERRY_ADMIN_KEY)` (localhost bypass in dev). `dryRun: true` is hard-coded in the `runDistribution` call — no flag path can flip it. Parses repeatable `?kind=` and `?platform=` (comma-separated OK via `parseRepeatable`), validates against `VALID_KINDS`/`VALID_PLATFORMS` arrays, and exposes `?channel=<documentId>` for single-channel dry-run previews + `?forceStatic=true` for fallback simulation.

### scripts/seed-distribution-channels.mjs
**Purpose**: Idempotent seed for the three Sprint v5 starter channels (X + Moltbook + HF). Re-running updates existing rows by `name` rather than duplicating.

**How it works**: Reads templates from sibling `scripts/distribution-templates/{x,moltbook,huggingface}.md` files so copy edits don't touch JS. Uses `filters[name][$eq]` lookup → branch on existence → POST or PUT. Both writes append `?status=published` so Strapi v5's draft/publish system lands content on the published version (otherwise v5 defaults to draft and the frontend fetcher never sees the rows). Channels seed as `enabled: false` on purpose — ops flips them on from admin once dry-run previews look right. `--dry-run` CLI flag prints the payload without writing; `--url`/`--token` override env.

### scripts/distribution-templates/{x,moltbook,huggingface}.md
**Purpose**: Template copy in portable Markdown so editors iterate without touching JS.

- `x.md` — `{{#isNew}}New{{/isNew}}{{^isNew}}Updated{{/isNew}} {{kind}}: {{title}}\n\n{{summary}}\n\n{{url}}` — engine trims to 280 chars at render
- `moltbook.md` — `{{summary}}\n\nRead more on colaberry.ai: {{url}}\n\n{{#hasTags}}Tags: {{tags}}{{/hasTags}}`
- `huggingface.md` — `{{title}} — {{summary}}\n\nCanonical URL: {{url}}\nKind: {{kind}}\nUpdated: {{updatedAt}}` (dry-run preview only)

### src/lib/distribution/__tests__/template.test.ts
**Purpose**: 44 unit tests for `renderTemplate`. Uses Node 20+ built-in `node:test` + `node:assert/strict` — zero new dependencies.

**How it works**: 7 `describe` suites:
- Interpolation tokens (10 tests): every supported token, bare `{{tags}}` comma-join, whitespace-tolerant tokens, unknown → empty, multi-token, empty `{{}}` skipped
- Tags iteration (5 tests): `{{#tags}}#{{.}}{{/tags}}`, empty-tags case, `{{^tags}}` inverted, mixed entry-level tokens inside loop
- Truthy + inverted sections (10 tests): `{{#isNew}}`/`{{^isNew}}` both branches, `{{#hasTags}}`, `{{#hasSummary}}` with whitespace-only detection
- escapeHtml (5 tests): raw on false, escaped `<`/`>`/`&`/`"`/`'` on true, summary + iterated tags escaping, URL immunity
- maxLength (5 tests): under-budget passthrough, word-boundary `.trimEnd()` + ellipsis, `maxLength=0` falsy, X 280-char budget
- Malformed input (6 tests): empty string, non-string (undefined/null/42), unclosed `{{`, unclosed section warns + renders trailing verbatim, stray `{{/foo}}`, whitespace preserved
- Real seed templates (4 tests): X isNew + updated branches, X under 280 with giant summary, Moltbook title template

Run via `node --test src/lib/distribution/__tests__/template.test.ts`.

### tsconfig.json
**Purpose**: Enable TypeScript resolution of `.ts` extension imports required by Node 24 native type-stripping.
**Change**: Added `"allowImportingTsExtensions": true,` after `"isolatedModules": true,`. Safe because `"noEmit": true` is already set (the flag is only restricted when emitting).

### docs/distribution/README.md
**Purpose**: End-to-end runbook for ops and future contributors.

**Contents**: v4 vs. v5 architectural shift table · module map · full env-var matrix · Strapi admin field-by-field walkthrough for channels and logs · HTTP endpoint reference with curl examples (preview, channel=documentId preview, forceStatic preview, dry-run cron, live cron) · CMS fallback behavior · step-by-step live-posting flip checklist · HF stub rationale · open items list for v6 (real Dev.to/Reddit/Discord/Hashnode/PH/HN/GitHub clients, log retention policy, dedupe store, retry queue, cross-run posting budget) · verification checklist.

### sprints/v5/PRD.md, sprints/v5/TASKS.md
**Purpose**: Sprint planning artifacts. TASKS.md tracks completion — Task 5 (template engine) marked `[x]` with full completion note including test-runner choice, all 44 test names, the `allowImportingTsExtensions` config change, and lint/tsc/build verification.

### CLAUDE.md
**Purpose**: Root project spec.
**Additions**: New entries under Key Files pointing to `src/lib/distribution/*` with concise descriptions of each module's responsibility + the cron + preview routes + the seed script + template files + docs runbook.

## Data Flow

```
1. Cloud Scheduler fires (daily, bearer-auth)
        │
        ▼
2. cron handler: parseLiveFlag, parseWindowHours, forceStatic
        │
        ▼
3. orchestrator.runDistribution(options)
        │
        ├─▶ channelConfig.fetchEnabledChannels()
        │     └─▶ GET Strapi /api/distribution-channels
        │           (on fail: STATIC_CHANNELS, never throws)
        │
        ├─▶ source.fetchRecentEntries()
        │     └─▶ Promise.allSettled([
        │           GET /api/agents?filters[updatedAt][$gt]=…,
        │           GET /api/mcp-servers?…,
        │           GET /api/skills?…,
        │           GET /api/podcast-episodes?…,
        │           GET /api/llm-architectures?…
        │         ])
        │     └─ normalizeRow → DistributableEntry[]
        │
        ├─▶ for each channel:
        │     scopedEntries = entries.slice(0, channel.maxPostsPerRun)
        │     for each entry in scopedEntries:
        │       drafts.push(...buildDrafts(entry, {channels:[channel]}))
        │
        ├─▶ for each channel-drafts group (concurrency=3):
        │     if CLIENTS[platform] missing:
        │       synthesize skipped: not-implemented
        │     else:
        │       effectiveDryRun = dryRun || channel.dryRunOverride
        │       client.dispatch(draft, {dryRun, timeoutMs})
        │       → DispatchResult (never throws)
        │
        ├─▶ store.writeDispatchLogs(logInputs)
        │     └─▶ POST Strapi /api/distribution-logs (one row each)
        │           (skip when documentId starts with "static:")
        │           (swallows every error)
        │
        ▼
4. return DistributionRunResult — 200 OK, Cache-Control: no-store
```

Single-channel admin preview follows the same path with `channelDocumentId` set and `dryRun: true` hard-coded in the API route.

## Test Coverage

- **Unit (44 tests, `node:test`)** — `src/lib/distribution/__tests__/template.test.ts`:
  - Interpolation tokens (10)
  - Tags iteration + inverted (5)
  - Truthy sections `isNew` / `hasTags` / `hasSummary` + inverted (10)
  - `escapeHtml` with URL immunity (5)
  - `maxLength` word-boundary trim + X 280 budget (5)
  - Malformed input (6)
  - Real seed-template parity (4)
- **Integration / E2E** — none shipped this sprint. The orchestrator, source layer, channelConfig fetcher, store, and clients are covered only by type-check + manual DRY_RUN preview against local Strapi.
- **Verification performed**:
  - `npx tsc --noEmit` clean across `colaberry-ai-fork`
  - `npm run lint` — 0 errors, 0 new warnings from distribution module
  - `npm run build` — 91 pages compiled clean in 2.9s
  - Admin preview (`/api/internal/distribution-preview`) returns populated `dispatches[]` against seeded local Strapi
  - Static-fallback path fires on CMS outage; `runErrors[0]` correctly names the source

## Security Measures

- **Credential ownership separation** — Strapi `credentialRef` stores env-var NAMES only; Cloud Run env holds the actual secret; `resolveChannelCredential` reads `process.env[channel.credentialRef]` at dispatch time and never logs the value.
- **Cron bearer auth** — `isBearerAuthorized(req, CATALOG_DISTRIBUTION_SECRET)` (timing-safe comparison) guards the daily route.
- **Admin-key auth** — `isAdminAuthorized(req, COLABERRY_ADMIN_KEY)` on the preview route with localhost bypass only in dev.
- **DRY_RUN default** — live posting requires BOTH a valid secret AND either `CATALOG_DISTRIBUTION_LIVE=true` env or `?live=true` query. Admin preview hard-codes `dryRun: true` — no flag can flip it.
- **Per-channel `dryRunOverride`** — stage new channels in prod without risking a real post.
- **OAuth 1.0a signing** — X uses HMAC-SHA1 per RFC 5849 with a `crypto.randomBytes(16)` nonce; RFC 3986 percent-encoding (stricter than `encodeURIComponent`).
- **Moltbook idempotency** — `Idempotency-Key: ${platform}:${entry.id}:${entry.updatedAt}` header dedupes server-side within 24h.
- **Payload-preview truncation** — `store.ts` caps `payloadPreview` at 4 KB to protect the Strapi text column against pathological content.
- **Per-request timeouts** — every outbound fetch (CMS channel fetch, source fetch, dispatch, log write) has an `AbortController` timeout: 10s channels/dispatches, 15s source, 5s log writes.
- **`Cache-Control: no-store`** on every distribution response — no caching of dispatch state in intermediate layers.
- **Non-throwing contract end to end** — one channel's network blip, one failed log write, one malformed template, one broken entry never takes down the run. Every error is accumulated into `runErrors` or `dispatches[].errorCode`.

## Known Limitations

- **No integration/E2E tests for the orchestrator, source, channelConfig, store, or clients.** Only the template engine is unit-tested. Live path is exercised manually against the admin preview endpoint.
- **HF client is dry-run only.** Real commit path is out of scope — requires file-locking strategy against concurrent cron runs.
- **Seven platforms reserved, not implemented** (devto/hashnode/reddit/discord/producthunt/hackernews/github) — draft previews render but dispatches are stubbed `skipped: not-implemented`.
- **No cross-run dedupe store.** Idempotency keys are stable but we rely on each platform's own dedupe (Moltbook's `Idempotency-Key` header; Twitter has none). A pre-flight lookup against `distribution-log` within the last 24h would close the gap.
- **No retry queue.** Failed dispatches wait for the next cron tick — there's no exponential-backoff retry loop.
- **No log retention policy.** `distribution-log` rows accumulate indefinitely. A scheduled Strapi prune job is flagged for v6+ once volume warrants it.
- **No per-day-per-platform posting budget.** `maxPostsPerRun` caps one run but doesn't coordinate across runs.
- **Template engine has intentional non-features** — nested sections (`{{#tags}}{{#hasTags}}…`), partials/includes, and lambdas are explicitly out of scope for v5.
- **`channelsUsed` source is threaded through `runErrors[0]` as a string** rather than a typed field on `DistributionRunResult` — keeps the cron's serialized shape v4-compatible but makes programmatic introspection awkward.
- **Task 5 is the only task marked complete in `TASKS.md`.** Tasks 1-4, 6-10 describe work that was delivered in the initial v5 commit (3ed5bb2) but weren't back-filled with completion notes.

## What's Next

Priorities for Sprint v6+ based on the limitations + PRD trajectory:

1. **Back-fill integration tests** for orchestrator + source + channelConfig with a mocked Strapi fixture — lock down the contract before adding new platforms.
2. **Dedupe store** — pre-flight lookup against `distribution-log` by `idempotencyKey` within the last 24h. Cheapest safety net against double-posting.
3. **Retry queue** — a small Cloud Tasks or PostgreSQL-backed queue for `status=failed` dispatches with exponential backoff.
4. **Real clients for the next-highest-value platforms** — Dev.to and Hashnode first (CMS-native, bearer auth, simple POST), then Reddit (OAuth) and Discord (webhook URL). Adding a new client = implement `PlatformClient`, add a line to `CLIENTS` in orchestrator.ts, done.
5. **Log retention + admin dashboard widget** — scheduled Strapi prune job (default retain 90 days) + a compact "last 7 runs" tile on the admin home.
6. **Cross-run posting budget** — a per-platform daily cap enforced by scanning `distribution-log` before dispatch.
7. **HF live commit** — once the file-locking strategy is chosen, swap `clients/huggingface.ts` for a real commit-API implementation. No other module changes needed.
8. **`channelsUsed` as a typed field** on `DistributionRunResult` so monitoring can alert on sustained `static` fallbacks.
