/**
 * Hugging Face Datasets client — POC stub.
 *
 * Design note (Sai):
 * HF doesn't expose a "append one row to a dataset" endpoint. The
 * supported shape is:
 *   1. Download the target JSONL/Parquet shard from the dataset repo.
 *   2. Append the new row(s) locally.
 *   3. Upload the file via the `/api/datasets/{repo}/commit/main`
 *      multi-part commit endpoint (or `@huggingface/hub`).
 *
 * Doing that safely in a cron handler requires file-locking against
 * concurrent runs and a conflict-resolution strategy for the shard we're
 * editing. That's out of scope for the POC — we're committing to Moltbook
 * + X first and treating HF as the follow-up.
 *
 * This stub preserves the `PlatformClient` contract so:
 *   - The orchestrator can iterate over every platform uniformly.
 *   - Dry-run mode prints the exact JSONL row we would have written,
 *     which is useful for validating the schema end-to-end.
 *   - Non-dry-run returns a structured `skipped` result with a clear
 *     `errorCode: "not-implemented"` so audit logs explain the gap.
 *
 * Flip to real-write mode = swap this file for a full commit-API
 * implementation; no changes needed in the orchestrator or templates.
 */

import type {
  DispatchOptions,
  DispatchResult,
  HuggingfacePayload,
  PlatformClient,
  PostDraft,
} from "../types";

const API_TOKEN = (process.env.HUGGINGFACE_API_TOKEN || "").trim();

export const huggingfaceClient: PlatformClient = {
  platform: "huggingface",

  /**
   * Reports `true` only when the token is configured AND the stub is
   * allowed to run in dry-run mode. The token check is symbolic — it
   * proves the operator intends to wire HF up; the real commit path is
   * still not implemented.
   */
  isEnabled(): boolean {
    return Boolean(API_TOKEN);
  },

  async dispatch(draft: PostDraft, options: DispatchOptions): Promise<DispatchResult> {
    const attemptedAt = new Date().toISOString();

    if (draft.platform !== "huggingface") {
      return {
        platform: "huggingface",
        idempotencyKey: draft.idempotencyKey,
        status: "failed",
        remoteId: null,
        message: `Wrong platform routed to huggingfaceClient: ${draft.platform}`,
        attemptedAt,
        errorCode: "routing",
      };
    }

    const payload = draft.payload as HuggingfacePayload;

    if (options.dryRun) {
      // Render the JSONL row we WOULD append, so dry-run exercises the
      // schema end-to-end even though we don't hit the network.
      const jsonl = JSON.stringify(payload.row);
      return {
        platform: "huggingface",
        idempotencyKey: draft.idempotencyKey,
        status: "dry-run",
        remoteId: null,
        message: `[dry-run] Would append to ${payload.repoId}: ${jsonl.slice(0, 200)}${
          jsonl.length > 200 ? "…" : ""
        }`,
        attemptedAt,
      };
    }

    if (!huggingfaceClient.isEnabled()) {
      return {
        platform: "huggingface",
        idempotencyKey: draft.idempotencyKey,
        status: "skipped",
        remoteId: null,
        message: "HUGGINGFACE_API_TOKEN not configured",
        attemptedAt,
        errorCode: "config",
      };
    }

    // Real commit path intentionally not implemented in the POC.
    // See the file header for the design note.
    return {
      platform: "huggingface",
      idempotencyKey: draft.idempotencyKey,
      status: "skipped",
      remoteId: null,
      message: `Hugging Face live commits not implemented in POC — target repo: ${payload.repoId}`,
      attemptedAt,
      errorCode: "not-implemented",
    };
  },
};
