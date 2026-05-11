# Sprint v5 — PRD: CMS-Driven Distribution Module

**Status:** Planned
**Owner:** Sai (SWE) · **Customer:** Ram (CEO)
**Target:** Convert runtime-only distribution POC into a CMS-configurable channel system
**Repos in scope:** `colaberry-ai-fork` (frontend) + `colaberry-ai-cms-fork` (Strapi v5 CMS)
**Date:** 2026-04-16
**Prior art:** Distribution POC shipped on `Release-1.0.beta` (commit `dee8775`) — `src/lib/distribution/*`, `src/pages/api/cron/catalog-distribution.ts`, `src/pages/api/internal/distribution-preview.ts`, `docs/distribution/README.md`

---

## Sprint Overview

Ram asked for a daily-update module that pushes catalog changes (agents, MCPs, skills,
podcasts, LLM architectures) to platforms where developers and agents hang out —
X, Moltbook, Hugging Face today; Dev.to / Hashnode / Reddit / Discord / Product
Hunt / HN / GitHub Discussions next. Sai committed to a **CMS-driven** shape:
a new Strapi content type (`distribution-channel`) holds per-platform config,
API-key references, post templates, and scheduling. A single cron reads new /
updated catalog entries and dispatches to every enabled channel — editable from
Strapi admin without a code deploy. This sprint makes good on that commitment
and persists every dispatch into a second content type (`distribution-log`) so
Ram gets a durable audit trail.

## Goals

- [ ] `distribution-channel` content type in Strapi with per-channel config
      (platform, enabled flag, `credentialRef` env-var name, post template,
      default window hours, dry-run flag).
- [ ] `distribution-log` content type capturing every dispatch: timestamp,
      channel, entry reference, status, remoteId, error, raw payload preview.
- [ ] Frontend fetches active channels from Strapi at cron time (with a
      env-var fallback so the cron never goes dark during CMS outage).
- [ ] Template engine supports Mustache-style `{{title}}`, `{{summary}}`,
      `{{url}}`, `{{#tags}}…{{/tags}}` — same renderer across every platform.
- [ ] Orchestrator iterates Strapi channels (not a hard-coded registry) so
      adding Dev.to / Reddit later is one new CMS row + one new client file.
- [ ] Every run persists a `distribution-log` entry per dispatch → queryable
      from Strapi admin.
- [ ] Security: API keys live in Cloud Run env vars; CMS only stores the
      `credentialRef` (env-var name). Plaintext secrets never touch the DB.
- [ ] Admin preview route still works end-to-end, now reading from CMS.
- [ ] Runbook updated with the new CMS-editable flow.

## User Stories

- As **Ram**, I want to enable / pause / retune per-platform post templates
  from Strapi admin, so the marketing team can iterate copy without waiting
  on a code deploy.
- As **Sai (SWE)**, I want to add a new platform (Dev.to, Reddit, etc.) by
  dropping in one `PlatformClient` file + one CMS row, so we can scale to
  10+ platforms without rewriting the orchestrator.
- As **the ops / audit reviewer**, I want a queryable `distribution-log`
  collection in Strapi admin, so every post we fired is traceable with
  status, error, and remoteId.
- As **a security reviewer**, I want API keys to live in Cloud Run env vars
  (not in the CMS DB), so compromising the CMS never leaks Twitter / Moltbook
  credentials.
- As **a content author**, I want per-channel post templates with
  `{{title}}` / `{{summary}}` / `{{url}}` tokens, so the same catalog entry
  renders in platform-appropriate copy.

## Technical Architecture

### Repos

```
colaberry-ai-cms-fork/                    colaberry-ai-fork/
└── src/api/                              ├── src/lib/distribution/
    ├── distribution-channel/             │   ├── channelConfig.ts      (NEW — CMS fetcher)
    │   └── content-types/                │   ├── template.ts           (NEW — Mustache interp)
    │       └── distribution-channel/     │   ├── store.ts              (NEW — log writer)
    │           └── schema.json           │   ├── types.ts              (↻ extended)
    └── distribution-log/                 │   ├── source.ts             (unchanged)
        └── content-types/                │   ├── templates.ts          (↻ uses template.ts)
            └── distribution-log/         │   ├── orchestrator.ts       (↻ iterates channels)
                └── schema.json           │   └── clients/              (unchanged)
                                          ├── src/pages/api/cron/
                                          │   └── catalog-distribution.ts  (↻ reads CMS)
                                          └── src/pages/api/internal/
                                              └── distribution-preview.ts  (↻ reads CMS)
```

### Data flow

```
Cron tick (daily @ 14:00 UTC)
   │
   ├─► channelConfig.ts → GET /api/distribution-channels?filters[enabled][$eq]=true
   │       │
   │       └─► fallback to static HARD_CODED_CHANNELS if CMS is down
   │
   ├─► source.ts  → fetchRecentEntries()          (unchanged)
   │
   ├─► for each channel:
   │     ├─► template.ts.render(entry, channel.template) → PostDraft
   │     ├─► clients[channel.platform].dispatch(draft)    → DispatchResult
   │     └─► store.ts.writeLog(channel, entry, result)    → POST /api/distribution-logs
   │
   └─► return DistributionRunResult
```

### `distribution-channel` schema (Strapi content type)

| Field | Type | Notes |
|---|---|---|
| `name` | string, required | Human label, e.g. "X — daily catalog" |
| `platform` | enum: `x`, `moltbook`, `huggingface`, `devto`, `hashnode`, `reddit`, `discord`, `producthunt`, `hackernews`, `github` | Source of truth for client routing |
| `enabled` | bool, default `false` | Hard off-switch per channel |
| `dryRunOverride` | bool, default `false` | Force dry-run even when cron is live |
| `credentialRef` | string, required | Env-var NAME (e.g. `TWITTER_API_KEY`) — **never the secret itself** |
| `bodyTemplate` | text (long), required | Mustache-style — `{{title}}`, `{{summary}}`, `{{url}}`, `{{#tags}}{{.}}{{/tags}}` |
| `titleTemplate` | text, optional | Platforms that have a title field (Moltbook, Dev.to, Hashnode) |
| `defaultWindowHours` | int, default `24` | Lookback for this channel; cron can still override via `?windowHours=` |
| `maxPostsPerRun` | int, default `25` | Per-channel throttle |
| `supportedKinds` | json | Array of `ContentKind`; empty = all |
| `notes` | text | Free-form ops notes |

### `distribution-log` schema (Strapi content type)

| Field | Type | Notes |
|---|---|---|
| `runId` | uid, required | Groups all dispatches in one cron run |
| `channel` | relation → `distribution-channel` | Denorm `platform` too for quick filters |
| `entryKind` | enum: `agent` \| `mcpServer` \| `skill` \| `podcastEpisode` \| `llmArchitecture` | |
| `entryId` | string | Strapi documentId of the source entry |
| `entryTitle` | string | Denormalized for audit-ability even if the entry is later deleted |
| `status` | enum: `sent`, `dry-run`, `skipped`, `failed` | |
| `remoteId` | string, nullable | Platform-side id (tweet id, post slug, etc.) |
| `errorCode` | string, nullable | E.g. `timeout`, `payload`, `401` |
| `errorMessage` | text, nullable | Full error detail |
| `idempotencyKey` | string | `${platform}:${entryId}:${updatedAt}` |
| `payloadPreview` | text | First 400 chars of the rendered post |
| `attemptedAt` | datetime | |

## Out of Scope (defer to v9+)

- Platform clients for Dev.to, Hashnode, Reddit, Discord, Product Hunt, HN,
  GitHub Discussions — content types support them; clients ship later.
- Encrypted-at-rest CMS secret storage (we're using `credentialRef` → env var
  pattern so this never matters in v5).
- Per-user / team posting budgets, rate-limit scheduling across days.
- Real Hugging Face dataset writes (stub stays; see `docs/distribution/README.md`
  §HF Stub Rationale).
- Retry-on-failure queue — v5 logs failures but never retries them.
- A Strapi admin dashboard widget showing per-platform tallies — v5 exposes
  the `/admin/content-manager` link only.

## Dependencies

- **Distribution POC on `Release-1.0.beta`** — commit `dee8775` provides the
  plumbing (`PlatformClient` contract, `runDistribution`, clients for X +
  Moltbook + HF stub, cron + preview routes).
- **Strapi v5 write access** — `CMS_API_TOKEN` must have create + update
  permissions for both new content types.
- **Cloud Run env vars** — Twitter / Moltbook credentials continue to live
  in the service env, referenced by name from the CMS (`credentialRef`).
- **Existing `CATALOG_DISTRIBUTION_SECRET` + `COLABERRY_ADMIN_KEY`** — unchanged.

## Open Decisions (confirm during PRD review)

1. **`credentialRef` security pattern** — CMS stores the env-var NAME only;
   the actual secret stays in Cloud Run. Recommended. Alternative would be
   encrypted-at-rest secrets in Strapi (more infra to build, deferred to v9).
2. **POC preservation during migration** — Task 2's fetcher degrades gracefully
   to the hard-coded registry when CMS is unreachable, so the cron never goes
   dark. Explicit callout for Ram's awareness.
3. **Log retention** — v5 never deletes logs; we'll add a v6 task for a
   retention policy (e.g. 90 days) once we see real volume.
