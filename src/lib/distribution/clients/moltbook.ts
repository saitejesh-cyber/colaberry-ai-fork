/**
 * Moltbook REST API v1 client.
 *
 * Per Sai's research: Moltbook exposes a REST surface at moltbook.com
 * with agent registration, posting, and heartbeat endpoints. This client
 * implements the `/posts` endpoint (creating a new post as our
 * registered agent).
 *
 * Auth: Bearer token stored in MOLTBOOK_API_TOKEN.
 * Base: configurable via MOLTBOOK_API_BASE_URL (default https://api.moltbook.com/v1).
 *
 * The client is resilient: it never throws, it returns a structured
 * `DispatchResult` for every path (success, skip, failure, dry-run). One
 * platform failing must not take down the whole run.
 */

import type {
  DispatchOptions,
  DispatchResult,
  MoltbookPayload,
  PlatformClient,
  PostDraft,
} from "../types";

const API_BASE = (
  process.env.MOLTBOOK_API_BASE_URL || "https://api.moltbook.com/v1"
)
  .trim()
  .replace(/\/$/, "");
const API_TOKEN = (process.env.MOLTBOOK_API_TOKEN || "").trim();
const DEFAULT_TIMEOUT_MS = 10_000;

interface MoltbookPostResponse {
  id?: string;
  url?: string;
}

export const moltbookClient: PlatformClient = {
  platform: "moltbook",

  isEnabled(): boolean {
    return Boolean(API_TOKEN);
  },

  async dispatch(draft: PostDraft, options: DispatchOptions): Promise<DispatchResult> {
    const attemptedAt = new Date().toISOString();

    if (draft.platform !== "moltbook") {
      return {
        platform: "moltbook",
        idempotencyKey: draft.idempotencyKey,
        status: "failed",
        remoteId: null,
        message: `Wrong platform routed to moltbookClient: ${draft.platform}`,
        attemptedAt,
        errorCode: "routing",
      };
    }

    const payload = draft.payload as MoltbookPayload;

    if (options.dryRun) {
      return {
        platform: "moltbook",
        idempotencyKey: draft.idempotencyKey,
        status: "dry-run",
        remoteId: null,
        message: `[dry-run] Would POST to ${API_BASE}/posts as agent="${payload.agentSlug}" (title: "${payload.title}")`,
        attemptedAt,
      };
    }

    if (!moltbookClient.isEnabled()) {
      return {
        platform: "moltbook",
        idempotencyKey: draft.idempotencyKey,
        status: "skipped",
        remoteId: null,
        message: "MOLTBOOK_API_TOKEN not configured",
        attemptedAt,
        errorCode: "config",
      };
    }

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
          // Moltbook-side idempotency — identical keys within 24h are
          // deduped server-side per Sai's research notes.
          "Idempotency-Key": draft.idempotencyKey,
        },
        body: JSON.stringify({
          agent_slug: payload.agentSlug,
          title: payload.title,
          body: payload.body,
          tags: payload.tags,
          canonical_url: payload.canonicalUrl,
        }),
        signal: controller.signal,
      });

      const text = await response.text().catch(() => "");

      if (!response.ok) {
        return {
          platform: "moltbook",
          idempotencyKey: draft.idempotencyKey,
          status: "failed",
          remoteId: null,
          message: `Moltbook ${response.status}: ${text.slice(0, 160)}`,
          attemptedAt,
          errorCode: String(response.status),
        };
      }

      let parsed: MoltbookPostResponse = {};
      try {
        parsed = text ? (JSON.parse(text) as MoltbookPostResponse) : {};
      } catch {
        // Non-JSON success body is acceptable — we just won't have a remoteId.
      }

      return {
        platform: "moltbook",
        idempotencyKey: draft.idempotencyKey,
        status: "sent",
        remoteId: parsed.id ?? null,
        message: parsed.url
          ? `Posted to ${parsed.url}`
          : `Posted (id=${parsed.id ?? "?"})`,
        attemptedAt,
      };
    } catch (err) {
      const message =
        err instanceof Error
          ? err.name === "AbortError"
            ? `Moltbook request timed out after ${timeoutMs}ms`
            : err.message
          : String(err);
      return {
        platform: "moltbook",
        idempotencyKey: draft.idempotencyKey,
        status: "failed",
        remoteId: null,
        message,
        attemptedAt,
        errorCode: err instanceof Error && err.name === "AbortError" ? "timeout" : "network",
      };
    } finally {
      clearTimeout(timeoutId);
    }
  },
};
