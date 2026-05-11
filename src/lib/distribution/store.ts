/**
 * Distribution log store — writes one `distribution-log` row per
 * dispatch so every run produces a queryable audit trail in Strapi
 * admin.
 *
 * Design:
 *   - Never throws. A log-write failure must not take down the run —
 *     the caller (orchestrator) already tallied the dispatch in-memory;
 *     losing the persisted copy is strictly a degraded-observability
 *     failure, not a functional one.
 *   - Bearer-auth via `CMS_API_TOKEN`. CMS endpoints are NOT public.
 *   - Per-request `AbortController` timeout — a stuck CMS must not
 *     block the cron for longer than `CMS_LOG_TIMEOUT_MS`.
 *   - Truncates `payloadPreview` at 4 KB so a pathological Moltbook
 *     body doesn't blow up the Strapi text column.
 *   - `channel` is linked by `documentId` (Strapi v5 convention). We
 *     send the numeric/string documentId; Strapi's relation resolver
 *     matches it. For the static-fallback channels (documentId starts
 *     with `static:`) we skip the relation — they don't exist in CMS.
 */

import type { ChannelConfig, DispatchResult } from "./types";

const CMS_URL = (
  process.env.CMS_URL ||
  process.env.NEXT_PUBLIC_CMS_URL ||
  ""
)
  .trim()
  .replace(/\/$/, "");
const CMS_API_TOKEN = (process.env.CMS_API_TOKEN || "").trim();
const CMS_LOG_TIMEOUT_MS = Number(
  process.env.DISTRIBUTION_LOG_TIMEOUT_MS || 5000
);
const PAYLOAD_PREVIEW_MAX = 4096;

/** Inputs the orchestrator passes per dispatch. Thin, serializable. */
export interface WriteDispatchLogInput {
  readonly runId: string;
  readonly channel: ChannelConfig;
  readonly result: DispatchResult;
  /** The rendered draft text — stored as `payloadPreview` for auditing
   * without having to re-render. Caller may pass `undefined` for
   * platforms without a textual preview. */
  readonly payloadPreview?: string;
  /** Optional — the source entry's id/kind/title/url so the row is
   * queryable in admin without joining back to catalog content. */
  readonly entry?: {
    readonly id: string;
    readonly kind: string;
    readonly title: string;
    readonly url: string;
  };
}

/**
 * Write one `distribution-log` record. Swallows every error — returns
 * `true` on a persisted write, `false` if the write was skipped or
 * failed. Callers should not branch on the return; it's informational
 * for local logging only.
 */
export async function writeDispatchLog(
  input: WriteDispatchLogInput
): Promise<boolean> {
  if (!CMS_URL) return false;
  if (!CMS_API_TOKEN) return false;
  // Static-fallback channels live only in the frontend bundle — they
  // have no CMS row to link to. Skip the log so Strapi's relation
  // resolver doesn't reject the payload.
  if (input.channel.documentId.startsWith("static:")) return false;

  const body = buildLogPayload(input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CMS_LOG_TIMEOUT_MS);

  try {
    const res = await fetch(`${CMS_URL}/api/distribution-logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CMS_API_TOKEN}`,
      },
      body: JSON.stringify({ data: body }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(
        `[distribution.store] log write failed: ${res.status} ${text.slice(0, 160)}`
      );
      return false;
    }
    return true;
  } catch (err) {
    console.warn(
      `[distribution.store] log write error: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Batched wrapper for convenience — the orchestrator calls this once
 * per run after all per-dispatch results are known. Fires-and-forgets;
 * the per-row failures are swallowed inside `writeDispatchLog` so the
 * batch never rejects.
 */
export async function writeDispatchLogs(
  inputs: WriteDispatchLogInput[]
): Promise<{ attempted: number; persisted: number }> {
  let persisted = 0;
  for (const input of inputs) {
    const ok = await writeDispatchLog(input);
    if (ok) persisted += 1;
  }
  return { attempted: inputs.length, persisted };
}

/* ---------- helpers ---------------------------------------------------- */

function buildLogPayload(input: WriteDispatchLogInput): Record<string, unknown> {
  const { runId, channel, result, payloadPreview, entry } = input;
  const payload: Record<string, unknown> = {
    runId,
    platform: result.platform,
    status: result.status,
    idempotencyKey: result.idempotencyKey,
    remoteId: result.remoteId ?? null,
    errorCode: result.errorCode ?? null,
    errorMessage: result.message ?? null,
    attemptedAt: result.attemptedAt,
    payloadPreview: truncate(payloadPreview ?? "", PAYLOAD_PREVIEW_MAX),
    channel: channel.documentId,
  };
  if (entry) {
    payload.entryKind = entry.kind;
    payload.entryId = entry.id;
    payload.entryTitle = entry.title;
    payload.entryUrl = entry.url;
  }
  return payload;
}

function truncate(value: string, max: number): string {
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}
