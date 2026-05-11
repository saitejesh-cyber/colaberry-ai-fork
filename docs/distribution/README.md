# Catalog Distribution Module — Runbook

**Owner:** Sai (SWE) · **Customer:** Ram (CEO)
**Current sprint:** v5 — CMS-driven channels (POC graduated; v4 POC preserved as static fallback).
**Default mode:** DRY_RUN. Live posting requires explicit opt-in (see §Live-Posting Flip).

## What it does

On a daily schedule:

1. Reads the list of distribution channels from the Strapi `distribution-channel` collection. Each row names a platform, an env-var reference for credentials, a post template, a content-kind restriction, and throttle caps.
2. Pulls every CMS catalog entry (agents, MCP servers, skills, podcast episodes, LLM architectures) whose `updatedAt` falls inside each channel's lookback window.
3. Renders a per-channel `PostDraft` via the Mustache-style template engine in `template.ts`.
4. Dispatches through the `PlatformClient` registry, keyed by `channel.platform`.
5. Writes one `distribution-log` row per dispatch for admin audit.
6. Returns a structured `DistributionRunResult`.

One channel failing never takes down the run. Every path returns a serializable result.

## Sprint v5 architectural shift

| v4 POC | v5 |
|---|---|
| Hard-coded platform list in `templates.ts` | Strapi `distribution-channel` collection — editable in admin |
| Hard-coded post copy | `bodyTemplate` / `titleTemplate` fields on each channel, rendered by `template.ts` |
| Credentials referenced directly by client code | `credentialRef` — CMS stores the env-var NAME; Cloud Run holds the secret |
| No audit trail | Every dispatch persisted as a `distribution-log` row |
| No static fallback for CMS outage | `STATIC_CHANNELS` constant + `forceStatic` flag recovery path |

The CMS never sees a plaintext secret. Ops can pause, enable, or retemplate a channel from Strapi admin without a code deploy.

## Module map

```
src/lib/distribution/
├── types.ts                 # Platform, DistributableEntry, PostDraft, ChannelConfig, DispatchResult
├── source.ts                # fetchRecentEntries — lean Strapi queries, per-kind isolation
├── channelConfig.ts         # fetchEnabledChannels — CMS → ChannelConfig[] with STATIC_CHANNELS fallback
├── template.ts              # renderTemplate — Mustache-style engine, zero deps
├── templates.ts             # buildDrafts — per-channel render (X 280, Moltbook title+body, HF JSONL)
├── store.ts                 # writeDispatchLog — persists one distribution-log row per dispatch
├── orchestrator.ts          # runDistribution — channels → source → templates → dispatch → log → result
└── clients/
    ├── x.ts                 # OAuth 1.0a (HMAC-SHA1) + v2 tweets
    ├── moltbook.ts          # Bearer auth + /posts
    └── huggingface.ts       # Stub — dry-run only (see §HF Stub Rationale)

src/pages/api/
├── cron/catalog-distribution.ts      # POST, bearer auth, DRY_RUN default
└── internal/distribution-preview.ts  # Admin-only, always DRY_RUN

scripts/
├── seed-distribution-channels.mjs    # Idempotent seed for X + Moltbook + HF
└── distribution-templates/
    ├── x.md                          # Template copy — 280-char budget enforced at render
    ├── moltbook.md
    └── huggingface.md

colaberry-ai-cms-fork/src/api/
├── distribution-channel/             # Strapi content type — channels
└── distribution-log/                 # Strapi content type — per-dispatch audit rows
```

## Environment variables

| Variable | Purpose | Required |
|---|---|---|
| `CMS_URL` | Strapi base URL (source fetches + channel config + log writes) | Yes |
| `CMS_API_TOKEN` | Strapi bearer token | Yes |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL used in post links (default `https://colaberry.ai`) | Recommended |
| `CATALOG_DISTRIBUTION_SECRET` | Shared secret for the `/api/cron/catalog-distribution` bearer | Yes (for cron) |
| `COLABERRY_ADMIN_KEY` | Admin key for `/api/internal/distribution-preview` | Yes (for preview) |
| `CATALOG_DISTRIBUTION_LIVE` | When `"true"`, cron posts live; otherwise DRY_RUN. `?live=true` query param also flips it. | No — DRY_RUN by default |
| `DISTRIBUTION_LOG_TIMEOUT_MS` | Per-write timeout for `distribution-log` persistence (default 5000) | No |
| `TWITTER_API_KEY` / `TWITTER_API_SECRET` / `TWITTER_ACCESS_TOKEN` / `TWITTER_ACCESS_TOKEN_SECRET` | OAuth 1.0a quartet | For live X |
| `MOLTBOOK_API_TOKEN` | Bearer token for Moltbook REST v1 | For live Moltbook |
| `MOLTBOOK_API_BASE_URL` | Override default `https://api.moltbook.com/v1` | No |
| `HUGGINGFACE_API_TOKEN` | Present = HF stub is `enabled`; not used to write in POC | Optional |

Additional env-var NAMES can be referenced from any new channel's `credentialRef` field — the orchestrator resolves them at dispatch time via `process.env[credentialRef]`.

## Strapi admin — channel walkthrough

Admin URL: `https://www.cms.colaberry.ai/admin/content-manager/collection-types/api::distribution-channel.distribution-channel`.

| Field | Type | Notes |
|---|---|---|
| `name` | String (unique) | Human label — shown in logs. |
| `platform` | Enum | One of `x`, `moltbook`, `huggingface`, `devto`, `hashnode`, `reddit`, `discord`, `producthunt`, `hackernews`, `github`. Unknown values are ignored. |
| `enabled` | Boolean | Hard off-switch. Orchestrator skips `enabled=false` rows entirely. |
| `dryRunOverride` | Boolean | Force dry-run for this channel even when the cron is live. Useful for staging new channels in prod. |
| `credentialRef` | String | Env-var NAME. Never the secret. Example: `TWITTER_API_KEY`. |
| `bodyTemplate` | Text | Mustache-style — supports `{{title}}`, `{{summary}}`, `{{url}}`, `{{kind}}`, `{{updatedAt}}`, `{{tags}}`, iteration via `{{#tags}}{{.}}{{/tags}}`, conditionals via `{{#isNew}}…{{/isNew}}` + `{{^isNew}}…{{/isNew}}`, `{{#hasTags}}`, `{{#hasSummary}}`. Unknown tokens render as empty string. |
| `titleTemplate` | Text | Used only by platforms with a distinct title (Moltbook, Dev.to, Hashnode). Ignored otherwise. |
| `defaultWindowHours` | Integer (1–336) | Lookback window. The run uses the max of all enabled channels unless overridden. |
| `maxPostsPerRun` | Integer (1–200) | Per-channel throttle. Protects against a big CMS bulk edit blasting hundreds of posts. |
| `supportedKinds` | JSON array | Restrict to specific content kinds. Empty/unset = all kinds. Valid: `agent`, `mcpServer`, `skill`, `podcastEpisode`, `llmArchitecture`. |
| `escapeHtml` | Boolean | When true, `{{title}}` / `{{summary}}` are HTML-escaped before interpolation. |
| `notes` | Text | Free-form ops notes. Not rendered anywhere. |

Seed the initial three channels with the idempotent script:

```
CMS_API_TOKEN=<token> node scripts/seed-distribution-channels.mjs
```

Channels seed as `enabled: false`. Flip them on from admin once the preview looks right.

## HTTP endpoints

### `POST /api/cron/catalog-distribution`

Production cron target. Cloud Scheduler calls this once/day.

- **Auth:** `Authorization: Bearer $CATALOG_DISTRIBUTION_SECRET`
- **Mode:** DRY_RUN unless `CATALOG_DISTRIBUTION_LIVE=true` env OR `?live=true` query.
- **Query params:**
  - `windowHours` (1–336) — override the derived window.
  - `forceStatic=true` — bypass CMS, use the hard-coded `STATIC_CHANNELS` fallback (recovery only).
- **Returns:** `DistributionRunResult` — full dispatch log + per-platform tally.

### `GET|POST /api/internal/distribution-preview`

Admin preview — always DRY_RUN, never posts live regardless of flags.

- **Auth:** `x-colaberry-admin-key: $COLABERRY_ADMIN_KEY` (or `Authorization: Bearer`).
- **Query params:** `windowHours`, repeatable `kind`, repeatable `platform` (comma-separated OK), `channel=<documentId>` (single-channel dry-run), `forceStatic=true`.
- **Returns:** `DistributionRunResult` with all dispatches marked `status: "dry-run"`.

Examples:

```
# Preview the next 24h run across every enabled channel:
curl -H "x-colaberry-admin-key: $KEY" \
  "https://colaberry.ai/api/internal/distribution-preview"

# Preview only podcasts + skills to Moltbook:
curl -H "x-colaberry-admin-key: $KEY" \
  "https://colaberry.ai/api/internal/distribution-preview?kind=podcastEpisode&kind=skill&platform=moltbook"

# Preview a single channel by documentId:
curl -H "x-colaberry-admin-key: $KEY" \
  "https://colaberry.ai/api/internal/distribution-preview?channel=abc123xyz"

# Force static fallback (simulate CMS outage):
curl -H "x-colaberry-admin-key: $KEY" \
  "https://colaberry.ai/api/internal/distribution-preview?forceStatic=true"

# DRY_RUN the real cron route:
curl -X POST -H "Authorization: Bearer $CATALOG_DISTRIBUTION_SECRET" \
  "https://colaberry.ai/api/cron/catalog-distribution"

# Live cron run (requires flag):
curl -X POST -H "Authorization: Bearer $CATALOG_DISTRIBUTION_SECRET" \
  "https://colaberry.ai/api/cron/catalog-distribution?live=true"
```

## Reading `distribution-log` from admin

After each run every dispatch lands in
`https://www.cms.colaberry.ai/admin/content-manager/collection-types/api::distribution-log.distribution-log`.

Key fields: `runId` (groups a whole run), `platform`, `status` (sent / dry-run / skipped / failed), `idempotencyKey`, `remoteId`, `errorCode`, `errorMessage`, `payloadPreview`. Relation to `channel` links back to the originating CMS row.

Filter by `runId` to see one run end-to-end. Filter by `status=failed` for alerting triage.

## CMS fallback behavior

If the Strapi call fails (timeout, 401, zero rows) the orchestrator falls back to `STATIC_CHANNELS` — three hard-coded channels matching the v4 POC. The first entry in `runErrors` names the source (`cms` or `static`) and the reason. Cron keeps working through a CMS outage.

Force the fallback explicitly:

```
curl -H "x-colaberry-admin-key: $KEY" \
  "https://colaberry.ai/api/internal/distribution-preview?forceStatic=true"
```

## Live-posting flip (do this carefully)

1. Set credentials in the Cloud Run service for `colaberry-ai-prod`:
   - All four `TWITTER_*` OAuth 1.0a keys.
   - `MOLTBOOK_API_TOKEN` (ask Moltbook team — Sai has the registration follow-up).
2. Seed channels with the script, or create them in admin. Leave `enabled=false`.
3. Preview via the admin route. Verify every entry's copy renders as expected.
4. Flip one channel to `enabled=true` but keep `dryRunOverride=true`. Run preview again and verify it's picked up.
5. Call the cron with `?live=true`. Watch `dispatches[]` for `status=sent` and `remoteId` values.
6. Once confirmed, set `CATALOG_DISTRIBUTION_LIVE=true` in Cloud Run env to make daily runs live by default. Clear `dryRunOverride` on any channel ready for real posting.

## HF stub rationale

Hugging Face Datasets doesn't expose a row-append endpoint. The supported flow is download-shard → append → multipart-commit. Safe cron use of that flow needs file-locking against concurrent runs and a conflict-resolution strategy we haven't chosen yet. The stub preserves the `PlatformClient` contract so:

- The orchestrator iterates every channel uniformly.
- Dry-run prints the exact JSONL row — useful for schema validation.
- Live calls return a structured `skipped` with `errorCode: "not-implemented"` so audit logs explain the gap.

Swap `src/lib/distribution/clients/huggingface.ts` for a real implementation when the sync strategy is agreed; no other module changes are needed.

## Open items (flag for v6)

- **Real clients for Dev.to / Reddit / Discord / Hashnode / Product Hunt / Hacker News / GitHub** — the CMS enum already lists them; platforms without a client get a `skipped: not-implemented` dispatch.
- **Log retention policy** — `distribution-log` rows accumulate fast. Add a scheduled Strapi prune job (retain N days) once the collection has meaningful volume.
- **Dedupe store** — the idempotency key is stable, but we still rely on each platform's own dedupe (Moltbook's `Idempotency-Key` header, Twitter has none). A pre-flight lookup against `distribution-log` for the same key in the last 24 h would close the gap.
- **Retry queue** — failed dispatches currently wait for the next cron tick. A dedicated retry loop with exponential backoff would improve delivery reliability without doubling the cron frequency.
- **Posting-budget-per-day-per-platform** — `maxPostsPerRun` caps one run, but doesn't coordinate across runs. Add when we exceed the current 25/run cap.

## Verification checklist

- [x] `npx tsc --noEmit` clean
- [x] `npm run lint` — 0 errors, 0 new warnings from distribution module
- [x] Preview returns populated `dispatches[]` when channels are seeded
- [x] Static fallback triggers on CMS outage; `runErrors[0]` names the source
- [ ] Live run posts a single test entry to Moltbook, logs `remoteId` (pending token)
- [ ] Live run posts a single test tweet, logs Twitter `remoteId` (pending OAuth 1.0a keys)
- [ ] `distribution-log` row count matches `dispatches.length` post-run
