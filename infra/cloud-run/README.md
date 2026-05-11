# `infra/cloud-run/` — Cloud Run service snapshots

Point-in-time exports of the production Cloud Run service definitions, checked into the repo as a disaster-recovery source of truth.

## Why

On **2026-04-08** a series of 20 `Services.ReplaceService` calls against `colaberry-ai-prod` dropped 13 environment variables — including `PODCAST_SYNC_SECRET` and `BUZZSPROUT_API_TOKEN` — causing the `buzzsprout-sync-6h` Cloud Scheduler job to return 401 UNAUTHENTICATED on every run. 5 podcast episodes (Apr 8–14) failed to sync before the issue was caught and fixed on 2026-04-15.

The root cause was that all sensitive values lived inline in the Cloud Run service spec with no checked-in source of truth. A single bad `Services.ReplaceService` wiped them with no way to restore besides manually re-typing values from 1Password.

This directory makes future incidents a **single-command restore**.

## Files

| File | Service | Project | Region |
|------|---------|---------|--------|
| `colaberry-ai-prod.yaml` | `colaberry-ai-prod` (prod, www.colaberry.ai) | `colaberryaiwebsite` | `us-east1` |
| `colaberry-ai.yaml` | `colaberry-ai` (dev, dev.colaberry.ai) | `colaberryaiwebsite` | `us-east1` |

Both services were migrated to Secret Manager refs on **2026-04-15** in the same canary-based flow (`--no-traffic --tag=canary` → test → `update-traffic --to-latest` → `remove-tags=canary`). Dev had **never** successfully run the `buzzsprout-sync-dev-6h` scheduler before this migration — it returned 401 on every single run for 14+ days — because `PODCAST_SYNC_SECRET` and `BUZZSPROUT_API_TOKEN` were never configured on the dev service. A fresh 64-char hex `PODCAST_SYNC_SECRET` was generated for dev, stored in `podcast-sync-secret-dev`, and the scheduler's `Authorization: Bearer …` header was rotated to match.

## What's in the snapshot

- Full service spec as produced by `gcloud run services describe ... --format=export`
- All env vars (plain values for non-sensitive config)
- **Secret Manager refs** for sensitive values — the YAML contains the secret *reference*, not the value itself:
  - prod: `PODCAST_SYNC_SECRET` (→`podcast-sync-secret`), `BUZZSPROUT_API_TOKEN` (→`buzzsprout-api-token`), `CMS_API_TOKEN` (→`cms-api-token-prod`), `NEWSLETTER_UNSUBSCRIBE_SECRET`, `NEWSLETTER_REPORT_API_KEY`
  - dev: `PODCAST_SYNC_SECRET` (→`podcast-sync-secret-dev`), `BUZZSPROUT_API_TOKEN` (→`buzzsprout-api-token`, **shared with prod** — same Buzzsprout podcast ID), `CMS_API_TOKEN` (→`cms-api-token-dev`)
- Traffic config (100% → LATEST)
- Container image URI pinned to a specific SHA

## What's NOT in the snapshot

- **Secret values.** Those live in Secret Manager (`gcloud secrets list --project=colaberryaiwebsite`). To rotate a value: `echo -n "new-value" | gcloud secrets versions add <secret-name> --data-file=-`. The service picks up the new version on the next cold start (with `key: latest`).
- Build artifacts / image contents (those live in Artifact Registry).
- Secret Manager IAM bindings (checked into code via Terraform in a future sprint; for now, grant `roles/secretmanager.secretAccessor` to `956818257204-compute@developer.gserviceaccount.com` on each secret).

## How to restore from this snapshot

If the prod service ever gets into a bad state (env vars wiped, wrong image, bad traffic routing, etc.):

```bash
# 1. Verify you're authenticated against the right project
gcloud config set project colaberryaiwebsite

# Pick the service: colaberry-ai-prod (prod) or colaberry-ai (dev)
SERVICE=colaberry-ai-prod
YAML=infra/cloud-run/${SERVICE}.yaml
HOST=https://www.colaberry.ai   # dev: https://dev.colaberry.ai

# 2. Dry-run: diff current against snapshot
diff <(gcloud run services describe "$SERVICE" --region=us-east1 --format=export) "$YAML"

# 3. Apply — this performs a Services.ReplaceService, creating a new revision
gcloud run services replace "$YAML" \
  --region=us-east1 --project=colaberryaiwebsite

# 4. Verify traffic, env vars, and a probe request
gcloud run services describe "$SERVICE" \
  --region=us-east1 --project=colaberryaiwebsite \
  --format="value(status.traffic[].revisionName,status.traffic[].percent)"

curl -sS "$HOST/api/podcasts?limit=1"
```

The new revision will use the current Secret Manager values (because the secret refs use `:latest`), so rotated secrets are preserved.

## How to update the snapshot

**The checked-in YAML drifts from reality on every deploy.** Re-snapshot after any intentional service-level change:

```bash
gcloud run services describe colaberry-ai-prod \
  --region=us-east1 --project=colaberryaiwebsite \
  --format=export > infra/cloud-run/colaberry-ai-prod.yaml

git add infra/cloud-run/colaberry-ai-prod.yaml
git commit -m "infra: snapshot colaberry-ai-prod after <change>"
```

Run this after:
- Adding or removing env vars
- Adding a new Secret Manager ref
- Changing resource limits (CPU, memory, concurrency, scaling)
- Changing the service account
- Changing traffic allocation

Re-snapshotting after every image deploy is overkill — the image URI pinned in the YAML will drift, but that's OK because restore-time the image in Artifact Registry will be fine as long as it hasn't been garbage-collected.

## Alerting

A log-based metric `buzzsprout_sync_failures` watches for non-200 responses from the `buzzsprout-sync-6h` Cloud Scheduler job. If the scheduler starts returning 401/500/etc., an alert fires within minutes instead of waiting 7 days for a human to notice stale podcast content on the homepage.

Query the metric for either environment:
```bash
# prod
gcloud logging read 'resource.type="cloud_scheduler_job" AND resource.labels.job_id="buzzsprout-sync-6h" AND httpRequest.status!=200' \
  --project=colaberryaiwebsite --limit=20

# dev
gcloud logging read 'resource.type="cloud_scheduler_job" AND resource.labels.job_id="buzzsprout-sync-dev-6h" AND httpRequest.status!=200' \
  --project=colaberryaiwebsite --limit=20
```

## Follow-ups (not yet done)

- [x] ~~Snapshot `colaberry-ai` (dev) to `colaberry-ai.yaml` after restoring its env vars~~ — done 2026-04-15 (fresh `PODCAST_SYNC_SECRET` generated, scheduler header rotated, dev's first-ever 200 from `buzzsprout-sync-dev-6h` recorded at `2026-04-15T14:20:06Z`)
- [ ] Terraform for Secret Manager + IAM bindings so the whole state is reproducible
- [ ] Migrate `cloudbuild.yaml` to always use `--set-secrets=` for sensitive values on first deploy, so a fresh project bootstrap doesn't need manual secret creation
