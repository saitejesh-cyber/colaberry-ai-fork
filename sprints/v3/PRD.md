# Sprint v3 — PRD: Auto-Publisher (Daily Updates to Developer/Agent Hangouts)

## Status: Draft — Awaiting Ram approval

## Overview

Build a module that publishes daily updates from colaberry.ai to the places where developers and AI agents hang out — **Hugging Face Hub**, **X (Twitter)**, and **Moltbook** (the "front page of the agent internet"). The module selects newsworthy items from the Strapi CMS (new agents, MCPs, skills, tools, podcasts), renders platform-specific posts, and publishes them on a daily cron — with idempotency, dry-run mode, and an admin-viewable publish history log. Scope is a **POC**: one platform live end-to-end (Hugging Face), the other two scaffolded behind feature flags and blocked on external approvals.

**Source request:** Ram Katamaraja (CEO) → Sai Tejesh, 2026-04-09:
> "Sai — Can we create a module that will do daily updates to X, Moltbook, Hugging Face etc places where developers and agents hangout."

## Goals

- Ship a working **Hugging Face** publisher end-to-end in production with dry-run → live toggle behind Ram's explicit go-live approval.
- Scaffold **X (Twitter)** and **Moltbook** drivers behind feature flags, ready to flip on once external prerequisites clear.
- Persist a `PublishLog` entry in Strapi for every publish attempt (success, skipped-duplicate, dry-run, error) so we have a source-of-truth audit trail.
- Guarantee **idempotency**: a given content item + platform never publishes twice, even if the cron re-runs or CMS is edited.
- Treat publishing as **untrusted boundary work** — all outbound calls are fully typed, rate-limited, and wrapped in timeout + retry with exponential backoff.
- Follow SDD + TDD strictly: spec → plan → tasks → red-green-refactor for every driver.

## User Stories

- **US-1 — As Ram (CEO)**, I want daily updates about new colaberry.ai content to land automatically on Hugging Face / X / Moltbook, so that developers and AI agents discover Colaberry in the places they already spend time — without me having to manually post each day.
- **US-2 — As Sai (Engineering)**, I want every publish attempt logged to Strapi with content hash + status + platform + timestamp, so that I can debug failures, prove idempotency, and show Ram what shipped.
- **US-3 — As a developer on Hugging Face**, I want to see colaberry.ai's daily "what's new" post in the HF org feed, so that I can discover new agents / MCPs / skills without leaving HF.
- **US-4 — As an AI agent browsing Moltbook**, I want colaberry.ai's daily update to appear as an indexable post with structured metadata, so that I can cite and link to Colaberry content when answering user queries.
- **US-5 — As Ram (CEO)**, I want a per-platform "go-live" toggle that defaults to `dry-run`, so that no post ever goes live without my explicit sign-off and the first live post is traceable to a specific approval.
- **US-6 — As Sai (Engineering)**, I want the module to skip duplicates via SHA-256 content hash, so that re-running the cron (e.g. after a deploy) doesn't spam the same content twice.

## Technical Architecture

### Tech Stack
- **Runtime:** Next.js 16 API routes + scheduled invocation (Cloud Run Jobs cron or `vercel.json` cron)
- **Language:** TypeScript strict (no `any`)
- **CMS:** Strapi v5 — new `PublishLog` collection type (`api::publish-log.publish-log`)
- **Content source:** Existing Strapi content types (agents, mcps, skills, tools, podcasts) via `src/lib/cms.ts`
- **Secrets:** Cloud Run environment variables only (never `NEXT_PUBLIC_*`)
- **Hashing:** Node `crypto.createHash("sha256")` on a canonical JSON of the post payload
- **Testing:** Vitest (unit) + Playwright (admin page E2E)
- **Observability:** `console.log` structured JSON — Cloud Logging scrapes

### Component Diagram

```
┌─────────────────────────┐
│  Cloud Run Cron Job     │
│  (daily @ 14:00 UTC)    │
└───────────┬─────────────┘
            │ POST /api/publishers/run
            ▼
┌──────────────────────────────────────────────┐
│  /api/publishers/run  (Next.js API route)    │
│  ┌────────────────────────────────────────┐  │
│  │ 1. Auth: timing-safe bearer check       │  │
│  │ 2. Load candidates from Strapi          │  │
│  │ 3. For each candidate × platform:       │  │
│  │    - Compute contentHash                │  │
│  │    - Skip if hash already in PublishLog │  │
│  │    - Render platform-specific post      │  │
│  │    - Call driver.publish(payload)       │  │
│  │    - Write PublishLog entry             │  │
│  └────────────────────────────────────────┘  │
└──┬──────────────┬──────────────┬─────────────┘
   │              │              │
   ▼              ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────┐
│ HfDriver│  │  XDriver │  │MoltDriver│
│ (LIVE)  │  │(DRY-RUN) │  │(DRY-RUN) │
└────┬────┘  └─────┬────┘  └─────┬────┘
     │             │              │
     ▼             ▼              ▼
┌──────────┐  ┌─────────┐  ┌──────────┐
│ HF Hub   │  │ X v2    │  │ Moltbook │
│ API      │  │ API     │  │ API      │
└──────────┘  └─────────┘  └──────────┘
     │             │              │
     └─────┬───────┴──────┬───────┘
           ▼              ▼
      ┌──────────────────────────┐
      │  Strapi: PublishLog      │
      │  (content hash indexed)  │
      └──────────────────────────┘
```

### Data Flow

1. **Cron trigger** fires `POST /api/publishers/run` with `Authorization: Bearer ${PUBLISHER_CRON_TOKEN}`.
2. **Candidate selection**: `src/lib/publishers/candidates.ts` queries Strapi for content created/updated in the last 24 h across all 5 content types. Returns `PublishCandidate[]`.
3. **Per-platform loop**: For each enabled platform (`publishers.config.ts`), render the candidate into a `PublishPayload`.
4. **Content hash**: `sha256(canonicalize({ platform, candidateId, contentVersion, text, media }))`. Check Strapi `PublishLog` for existing hash.
5. **Dry-run gate**: If `PUBLISHER_MODE=dry-run` or platform's `goLive=false`, do NOT call the external API. Write log with `status=dry_run`.
6. **Live publish**: Driver calls the external API, returns `{ externalId, url }`. Write log with `status=success`.
7. **Error path**: Any exception → write log with `status=error`, captured message, retry count. Surface in admin UI.

### Module Layout

```
src/lib/publishers/
├── index.ts                 # runPublishers() — main entry
├── config.ts                # platform list, dry-run flags, cron token
├── candidates.ts            # select newsworthy items from Strapi
├── hash.ts                  # canonicalize + sha256 a payload
├── logger.ts                # writePublishLog() to Strapi
├── types.ts                 # PublishCandidate, PublishPayload, PublishResult, PublishStatus
├── drivers/
│   ├── base.ts              # PublisherDriver interface
│   ├── huggingface.ts       # LIVE — first target
│   ├── x.ts                 # DRY-RUN — needs Ram $100/mo budget
│   └── moltbook.ts          # DRY-RUN — needs Build-for-Agents early access
└── __tests__/
    ├── hash.test.ts
    ├── candidates.test.ts
    ├── huggingface.test.ts
    ├── x.test.ts
    ├── moltbook.test.ts
    └── run.test.ts

src/pages/api/publishers/
├── run.ts                   # cron entrypoint (POST, bearer auth)
└── preview.ts               # admin preview (GET, admin auth) — dry-run render

src/pages/admin/publishers/
└── index.tsx                # admin UI: publish log + next candidates + manual trigger
```

### Strapi `PublishLog` Content Type

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| contentHash | string (unique, indexed) | yes | SHA-256 hex — idempotency key |
| platform | enum (huggingface, x, moltbook) | yes | |
| status | enum (dry_run, success, error, skipped_duplicate) | yes | |
| candidateType | enum (agent, mcp, skill, tool, podcast) | yes | |
| candidateSlug | string | yes | Links back to CMS item |
| candidateTitle | string | yes | Denormalized for admin UI |
| renderedText | text | yes | What we tried to post |
| externalId | string | no | Platform's returned post ID (on success) |
| externalUrl | string | no | Public URL of the post |
| errorMessage | text | no | Captured exception (on error) |
| retryCount | integer | yes, default 0 | |
| runId | string (indexed) | yes | UUID per cron invocation |
| publishedAt | datetime | yes | |

## Out of Scope (v4+)

- **Engagement feedback loop** — reading likes/comments back into Strapi (phase 2).
- **AI-generated post copy** via Claude/OpenAI — phase 1 uses deterministic templates.
- **Multi-image / carousel posts** — text + single image only.
- **LinkedIn, Mastodon, Reddit, Lobste.rs** — deferred, only the three Ram named.
- **Admin UI rich editing of drafts** — read-only log + manual re-trigger only.
- **Horizontal scaling / queue-based fan-out** — single cron, single instance is enough.
- **Real-time webhook-triggered publishing** — scheduled cron only.
- **Rollback / unpublish** — once posted externally, cannot be undone from our module.

## Dependencies

| Dependency | Type | Owner | Status |
|------------|------|-------|--------|
| Strapi `PublishLog` content type | CMS | Sai | Not started — sprint task |
| Hugging Face Hub API token (org scope) | Secret | Sai | Not started — free, obtainable today |
| Hugging Face org `colaberry` on Hub | External | Sai | Needs verification |
| X API Basic tier ($100/mo) | Budget | **Ram** | **Blocked — awaiting budget approval** |
| X handle for Colaberry | Decision | **Ram** | **Blocked — awaiting handle decision** |
| Moltbook Build-for-Agents early access | External | Sai | **Blocked — application submitted** |
| Cloud Run Cron Job schedule | Infra | Sai | Not started — sprint task |
| `PUBLISHER_CRON_TOKEN` in Cloud Run env | Secret | Sai | Not started — sprint task |
| Constitution.md compliance | Governance | — | Mandatory gate |
| Sprint v2 security hardening merged | Code | — | In progress (separate track) |

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Hugging Face first live post | 1 successful post within 7 days of spec approval | PublishLog row with `status=success, platform=huggingface` |
| Duplicate prevention | 0 duplicate posts after 10 cron runs | PublishLog query — no two rows with same `contentHash` & `status=success` |
| Dry-run fidelity | 100% of dry-run renders are valid for the target platform | Manual review of `renderedText` vs platform char limits / schema |
| Error rate | < 5% of publish attempts in `status=error` | PublishLog aggregate |
| Test coverage | 100% of `src/lib/publishers/` business logic | Vitest coverage report |
| Constitution gates | All 3 gates green (tsc, lint, build) | CI / local `npm run build` |
```
