# Feature: Auto-Publisher — Daily Updates to Developer/Agent Hangouts

## Status: Draft

## Overview

Automated module that publishes daily updates from the colaberry.ai catalog (agents, MCPs, skills, tools, podcasts) to the communities where developers and AI agents spend time — **Hugging Face Hub**, **X (Twitter)**, and **Moltbook**. Every publish attempt is logged to Strapi for idempotency + audit. Defaults to dry-run per platform until Ram Katamaraja (CEO) explicitly approves go-live.

**Origin:** Ram Katamaraja → Sai Tejesh, 2026-04-09: "Sai — Can we create a module that will do daily updates to X, Moltbook, Hugging Face etc places where developers and agents hangout."

---

## User Stories

### US-1: Daily discovery on developer hangouts

**As** Ram (CEO)
**I want to** automatically post new Colaberry content to Hugging Face, X, and Moltbook every day
**So that** developers and AI agents discover Colaberry in the places they already spend time, without me manually posting

**Acceptance Criteria:**
- [ ] A daily cron runs against production and attempts to publish new content to every enabled platform
- [ ] "New content" = any agent / MCP / skill / tool / podcast created or updated in the last 24 h in Strapi
- [ ] When live on a platform, a successfully-posted item has an `externalId` + `externalUrl` in its PublishLog row
- [ ] Nothing ever posts to a platform where `goLive=false` — guaranteed by unit test + runtime check

### US-2: Idempotency on re-runs

**As** Sai (Engineering)
**I want to** prevent duplicate posts when the cron retries or redeploys happen
**So that** Colaberry never spams the same content twice to any platform

**Acceptance Criteria:**
- [ ] Every `PublishPayload` gets a deterministic SHA-256 `contentHash` computed from canonical JSON
- [ ] Before publishing, the module queries Strapi `PublishLog` for an existing row with the same `contentHash + platform + status ∈ {success, dry_run}`
- [ ] Duplicate detection writes a `status=skipped_duplicate` row and does NOT call the external API
- [ ] Unit test covers: same payload → same hash, reordered keys → same hash, whitespace changes → same hash

### US-3: Per-platform go-live gate

**As** Ram (CEO)
**I want to** explicitly sign off before any platform goes from dry-run to live
**So that** no post ever lands in the public internet without my approval and there's an audit trail of who said yes

**Acceptance Criteria:**
- [ ] Every driver defaults to `goLive=false` in `config.ts`
- [ ] Flipping a platform live requires a code change + PR review + recorded approval in the PR description and Basecamp
- [ ] Live path throws `NotEnabledError` if invoked while `goLive=false` (defense in depth)
- [ ] The first live post for each platform is verified manually against the real external URL before a second run is permitted

### US-4: Admin-viewable publish history

**As** Sai (Engineering)
**I want to** view the last 50 publish attempts in an admin UI
**So that** I can debug failures, show Ram what shipped, and spot duplicate / error patterns

**Acceptance Criteria:**
- [ ] `/admin/publishers` page renders recent PublishLog entries with status, platform, content title, timestamp
- [ ] Status badges use only zinc + coral (NO emerald / green / amber / blue per Constitution § 2.3)
- [ ] "Trigger dry-run now" button fires a manual invocation
- [ ] Page supports dark mode + responsive at 375px / 768px / 1280px

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority | User Story |
|----|-------------|----------|------------|
| FR-1 | Scheduled daily cron invokes `runPublishers()` at 14:00 UTC | Must | US-1 |
| FR-2 | Candidate selection queries all 5 content types (agents, MCPs, skills, tools, podcasts) for items updated in last 24 h | Must | US-1 |
| FR-3 | Content hash computed deterministically over canonical JSON of `{ platform, candidateId, contentVersion, renderedText, mediaUrls }` | Must | US-2 |
| FR-4 | Duplicate detection blocks any payload whose hash already exists in PublishLog with `status ∈ {success, dry_run}` | Must | US-2 |
| FR-5 | Hugging Face driver: dry-run implementation + live implementation gated by `goLive` flag | Must | US-1, US-3 |
| FR-6 | X (Twitter) driver: dry-run only, live path throws `NotEnabledError` | Should | US-1, US-3 |
| FR-7 | Moltbook driver: dry-run only, live path throws `NotEnabledError` | Should | US-1, US-3 |
| FR-8 | Every publish attempt writes a PublishLog entry to Strapi, even on error | Must | US-2, US-4 |
| FR-9 | `/api/publishers/run` accepts POST with timing-safe bearer auth via `PUBLISHER_CRON_TOKEN` | Must | US-1 |
| FR-10 | `/admin/publishers` page renders last 50 PublishLog entries + manual trigger | Must | US-4 |
| FR-11 | Error in one candidate does not abort the run; other candidates still process | Must | US-1 |
| FR-12 | Per-platform config carries both `enabled` and `goLive` flags, separate | Must | US-3 |

### Non-Functional Requirements

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-1 | TypeScript strict — zero `any` in `src/lib/publishers/` | 100% | `tsc --noEmit` |
| NFR-2 | Test coverage of business logic | 100% of hash, candidates, logger, run modules | Vitest |
| NFR-3 | Rate limit on `/api/publishers/run` | Max 10 calls per IP per hour | `src/lib/rate-limit.ts` |
| NFR-4 | Outbound HTTP timeout | 10s per call | `AbortSignal.timeout(10_000)` |
| NFR-5 | Secrets never exposed in client | 0 `NEXT_PUBLIC_*` references to driver tokens | Build-time grep |
| NFR-6 | Admin page Lighthouse score | ≥ 90 perf, ≥ 95 a11y | Lighthouse |
| NFR-7 | Idempotency guarantee | 0 duplicate live posts over 10 consecutive runs | Query PublishLog |

---

## UI/UX Requirements

### Design System Compliance (from Constitution.md)
- [x] Uses zinc monochrome + coral `#DC2626` accent only
- [x] No forbidden colors (emerald, green, blue, amber, slate)
- [x] Both light and dark mode supported
- [x] Responsive at 375px (mobile), 768px (tablet), 1280px (desktop)
- [x] Uses locked component classes (`.catalog-card`, `.surface-panel`, `.chip-brand`, `.chip-neutral`)
- [x] Pill-shaped buttons (`rounded-full`), no `translateY` hover
- [x] Cards: 1px borders, no glassmorphism, no hover lift

### Page Structure Compliance
- [x] `.reveal` wrapper on hero section with `SectionHeader` (`size="xl"`, kicker, title, description)
- [x] `.surface-panel` for filter/search bars
- [x] `.stagger-grid` on card grids (NOT nested inside `.reveal`)
- [x] `.reveal` on each major section
- [x] `EnterpriseCtaBand` at page bottom
- [x] `ContentTypeIcon` for content type icons (never emoji)

### Wireframe / Layout Description — `/admin/publishers`

```
┌────────────────────────────────────────────────────────────┐
│  .reveal                                                    │
│  SectionHeader  kicker="OPERATIONS"                         │
│                 title="Auto-Publisher"                      │
│                 description="Daily updates to HF, X,        │
│                              Moltbook"  size="xl"           │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│  .surface-panel                                             │
│  [Platform: HF ✓] [X dry-run] [Moltbook dry-run]            │
│  [Mode: dry-run]  [ Trigger now ]                           │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│  .reveal  "Next candidates (next run preview)"              │
│  .stagger-grid:                                             │
│    ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│    │ Agent X  │ │ MCP Y    │ │ Skill Z  │                   │
│    │ ContentTypeIcon                                        │
│    │ rendered text preview                                  │
│    └──────────┘ └──────────┘ └──────────┘                   │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│  .reveal  "Recent publish log (last 50)"                    │
│  Table:                                                     │
│  ┌─────────┬──────────┬────────┬────────────┬───────────┐   │
│  │ When    │ Platform │ Status │ Title      │ External  │   │
│  ├─────────┼──────────┼────────┼────────────┼───────────┤   │
│  │ 14:00   │ HF       │ ●dry   │ Claude MCP │ —         │   │
│  │ 14:00   │ X        │ ●dry   │ Claude MCP │ —         │   │
│  └─────────┴──────────┴────────┴────────────┴───────────┘   │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│  EnterpriseCtaBand                                          │
└────────────────────────────────────────────────────────────┘
```

Status dot colors: `zinc-400` = dry_run, `zinc-600` = skipped_duplicate, `coral #DC2626` = error, `zinc-900` filled = success. No greens.

---

## Edge Cases

| # | Case | Expected Behavior |
|---|------|-------------------|
| EC-1 | No new content in last 24 h | Cron completes, writes 0 log entries, returns `{ attempted: 0 }` — not an error |
| EC-2 | Strapi unavailable | `runPublishers()` throws, `/api/publishers/run` returns 503 with run-id, nothing posted externally |
| EC-3 | HF API times out (>10s) | `status=error`, `errorMessage=timeout`, `retryCount=0`, run continues to next candidate |
| EC-4 | HF API returns 429 rate-limited | `status=error`, `errorMessage=rate_limited`, next cron run retries |
| EC-5 | Duplicate hash found | `status=skipped_duplicate`, no external call, no error |
| EC-6 | Live flag flipped but API token missing | `NotEnabledError` caught, `status=error`, `errorMessage=missing_token`, run continues |
| EC-7 | PublishLog write fails after successful external post | Log error to Cloud Logging, DO NOT retry the external post (already published) |
| EC-8 | Cron invoked twice in same minute (double-fire) | Second invocation sees duplicate hashes from first, writes `skipped_duplicate` for everything — safe |
| EC-9 | Content with special chars / emoji in title | Canonical JSON encodes correctly, hash is stable, render respects platform char limits |
| EC-10 | Cron token missing or invalid | 401 Unauthorized, no work done, no log written |

---

## Out of Scope

- **Engagement feedback loop** — reading likes/comments back into Strapi (phase 2)
- **AI-generated post copy** via Claude / OpenAI — phase 1 uses deterministic templates
- **Multi-image / carousel posts** — text + single image only
- **LinkedIn, Mastodon, Reddit, Lobste.rs, Bluesky** — only the 3 Ram named
- **Admin rich editor for drafts** — read-only log + manual re-trigger
- **Horizontal scaling / queue fan-out** — single cron, single instance
- **Webhook-triggered publishing** — scheduled cron only
- **Rollback / unpublish** — once posted externally, cannot be undone
- **Cross-posting deduplication** (e.g. don't post the same thing to X if it's already on HF) — out of scope for phase 1

---

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Strapi `PublishLog` content type | CMS | Pending — sprint task (CMS sibling PR) |
| Hugging Face Hub API token (org scope) | Secret | Pending — free, obtainable |
| Hugging Face `colaberry` org on Hub | External | Needs verification |
| X API Basic tier ($100/mo) | Budget | **Blocked — Ram approval pending** |
| X handle for Colaberry | Decision | **Blocked — Ram decision pending** |
| Moltbook Build-for-Agents early access | External | **Blocked — application submitted** |
| Cloud Run Cron Job | Infra | Pending — sprint task |
| `PUBLISHER_CRON_TOKEN` in Cloud Run env | Secret | Pending — sprint task |
| Constitution.md | Governance | Ready |
| `src/lib/rate-limit.ts` | Code | Ready |
| `src/lib/cms.ts` | Code | Ready |

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| HF first successful live post | 1 within 7 days of spec approval | Query PublishLog: `status=success, platform=huggingface` |
| Duplicate posts over 30 days | 0 | Query PublishLog: GROUP BY contentHash, platform WHERE status IN (success, dry_run) HAVING count > 1 |
| Error rate | < 5% | Aggregate status counts in PublishLog |
| Test coverage | 100% of `src/lib/publishers/` | Vitest coverage |
| Build / lint / tsc | 0 errors | `npm run build && npx tsc --noEmit && npm run lint` |

---

## Open Questions

- [ ] **Ram:** Approve $100/mo X Basic tier budget? (Blocks X driver live path.)
- [ ] **Ram:** What's the X handle? `@colaberry_ai`, `@colaberryai`, `@colaberry`? (Blocks X driver registration.)
- [ ] **Ram:** Approve daily post frequency of 1 per platform, or prefer weekly round-up? (Affects cron schedule.)
- [ ] **Sai:** Has the Moltbook Build-for-Agents early access application been submitted yet, and what's the expected response time?
- [ ] **Sai:** Does the existing `colaberry` HF org exist, or do we need to create it? (If create: who owns the admin account?)
- [ ] **Team:** Should dry-run logs be visible to non-admin users for transparency, or admin-only? Currently spec'd as admin-only.
- [ ] **Team:** Do we want a per-content-type cap (e.g. max 1 post per type per day) to avoid flooding, or let all 5 types go out?
