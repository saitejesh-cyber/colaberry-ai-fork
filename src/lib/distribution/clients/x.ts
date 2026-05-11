/**
 * X / Twitter v2 API client — POST a tweet via OAuth 1.0a user-context.
 *
 * We target `POST https://api.twitter.com/2/tweets` with a JSON body
 * `{ text }`. Writes require OAuth 1.0a user-context (app-only bearer
 * tokens can only read public endpoints). We sign per RFC 5849 with
 * HMAC-SHA1, using Node's `crypto` module — no extra deps.
 *
 * For v2 JSON-body endpoints, Twitter's signing spec says: do NOT include
 * the JSON body in the signature base string. Only OAuth params + query
 * params are signed. We follow that guidance.
 *
 * Credentials (all four required):
 *   TWITTER_API_KEY              (consumer key)
 *   TWITTER_API_SECRET           (consumer secret)
 *   TWITTER_ACCESS_TOKEN         (user access token)
 *   TWITTER_ACCESS_TOKEN_SECRET  (user access token secret)
 *
 * Contract: never throws. Returns a structured DispatchResult for every
 * code path (dry-run, skipped, sent, failed, timeout, network).
 */

import { createHmac, randomBytes } from "crypto";
import type {
  DispatchOptions,
  DispatchResult,
  PlatformClient,
  PostDraft,
  XPayload,
} from "../types";

const API_URL = "https://api.twitter.com/2/tweets";
const DEFAULT_TIMEOUT_MS = 10_000;
const X_CHAR_LIMIT = 280;

const CONSUMER_KEY = (process.env.TWITTER_API_KEY || "").trim();
const CONSUMER_SECRET = (process.env.TWITTER_API_SECRET || "").trim();
const ACCESS_TOKEN = (process.env.TWITTER_ACCESS_TOKEN || "").trim();
const ACCESS_TOKEN_SECRET = (process.env.TWITTER_ACCESS_TOKEN_SECRET || "").trim();

interface TweetResponseData {
  data?: { id?: string; text?: string };
  errors?: Array<{ message?: string; detail?: string }>;
  title?: string;
  detail?: string;
}

export const xClient: PlatformClient = {
  platform: "x",

  isEnabled(): boolean {
    return Boolean(
      CONSUMER_KEY && CONSUMER_SECRET && ACCESS_TOKEN && ACCESS_TOKEN_SECRET
    );
  },

  async dispatch(draft: PostDraft, options: DispatchOptions): Promise<DispatchResult> {
    const attemptedAt = new Date().toISOString();

    if (draft.platform !== "x") {
      return {
        platform: "x",
        idempotencyKey: draft.idempotencyKey,
        status: "failed",
        remoteId: null,
        message: `Wrong platform routed to xClient: ${draft.platform}`,
        attemptedAt,
        errorCode: "routing",
      };
    }

    const payload = draft.payload as XPayload;
    const text = payload.text || draft.text || "";

    // Belt-and-suspenders: template engine already truncates, but we
    // guard here too since a hand-built payload could be oversize.
    if (text.length > X_CHAR_LIMIT) {
      return {
        platform: "x",
        idempotencyKey: draft.idempotencyKey,
        status: "failed",
        remoteId: null,
        message: `Tweet exceeds ${X_CHAR_LIMIT}-char limit (${text.length})`,
        attemptedAt,
        errorCode: "payload",
      };
    }

    if (!text.trim()) {
      return {
        platform: "x",
        idempotencyKey: draft.idempotencyKey,
        status: "failed",
        remoteId: null,
        message: "Empty tweet text",
        attemptedAt,
        errorCode: "payload",
      };
    }

    if (options.dryRun) {
      return {
        platform: "x",
        idempotencyKey: draft.idempotencyKey,
        status: "dry-run",
        remoteId: null,
        message: `[dry-run] Would tweet (${text.length}/280): ${text.slice(0, 80)}${
          text.length > 80 ? "…" : ""
        }`,
        attemptedAt,
      };
    }

    if (!xClient.isEnabled()) {
      return {
        platform: "x",
        idempotencyKey: draft.idempotencyKey,
        status: "skipped",
        remoteId: null,
        message:
          "X credentials not configured (need TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET)",
        attemptedAt,
        errorCode: "config",
      };
    }

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const authHeader = buildOAuth1Header({
        method: "POST",
        url: API_URL,
        // No query params, and per Twitter's v2 signing guidance the
        // JSON body is NOT included in the signature base string.
        queryParams: {},
        consumerKey: CONSUMER_KEY,
        consumerSecret: CONSUMER_SECRET,
        token: ACCESS_TOKEN,
        tokenSecret: ACCESS_TOKEN_SECRET,
      });

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      const rawText = await response.text().catch(() => "");
      let parsed: TweetResponseData = {};
      try {
        parsed = rawText ? (JSON.parse(rawText) as TweetResponseData) : {};
      } catch {
        // Non-JSON error bodies show up from Twitter occasionally; we
        // keep rawText in the message below.
      }

      if (!response.ok) {
        const apiMessage =
          parsed.errors?.[0]?.detail ||
          parsed.errors?.[0]?.message ||
          parsed.detail ||
          parsed.title ||
          rawText.slice(0, 160);
        return {
          platform: "x",
          idempotencyKey: draft.idempotencyKey,
          status: "failed",
          remoteId: null,
          message: `X ${response.status}: ${apiMessage}`,
          attemptedAt,
          errorCode: String(response.status),
        };
      }

      const tweetId = parsed.data?.id ?? null;
      return {
        platform: "x",
        idempotencyKey: draft.idempotencyKey,
        status: "sent",
        remoteId: tweetId,
        message: tweetId ? `Tweet posted (id=${tweetId})` : "Tweet posted",
        attemptedAt,
      };
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      const message = isAbort
        ? `X request timed out after ${timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : String(err);
      return {
        platform: "x",
        idempotencyKey: draft.idempotencyKey,
        status: "failed",
        remoteId: null,
        message,
        attemptedAt,
        errorCode: isAbort ? "timeout" : "network",
      };
    } finally {
      clearTimeout(timeoutId);
    }
  },
};

/* ---------- OAuth 1.0a signing (RFC 5849) ------------------------------ */

interface OAuth1Params {
  method: "POST" | "GET";
  url: string;
  queryParams: Record<string, string>;
  consumerKey: string;
  consumerSecret: string;
  token: string;
  tokenSecret: string;
}

/**
 * Build the `Authorization: OAuth ...` header value for a signed request.
 * Exported-as-default-free so tests can call this directly if needed.
 */
function buildOAuth1Header(params: OAuth1Params): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: params.consumerKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: params.token,
    oauth_version: "1.0",
  };

  // Signature base: all OAuth params + query params, percent-encoded,
  // sorted by key, joined with &. JSON body is intentionally excluded
  // (v2 endpoints — see file header).
  const allParams: Record<string, string> = {
    ...oauthParams,
    ...params.queryParams,
  };

  const sortedEncoded = Object.keys(allParams)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(allParams[key])}`)
    .join("&");

  const signatureBase = [
    params.method.toUpperCase(),
    percentEncode(params.url),
    percentEncode(sortedEncoded),
  ].join("&");

  const signingKey = `${percentEncode(params.consumerSecret)}&${percentEncode(
    params.tokenSecret
  )}`;

  const signature = createHmac("sha1", signingKey)
    .update(signatureBase)
    .digest("base64");

  const headerParams: Record<string, string> = {
    ...oauthParams,
    oauth_signature: signature,
  };

  // Header form: OAuth k1="v1", k2="v2", ... — values percent-encoded
  // and wrapped in double quotes, sorted by key.
  const headerBody = Object.keys(headerParams)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(headerParams[key])}"`)
    .join(", ");

  return `OAuth ${headerBody}`;
}

/** RFC 3986 percent-encoding — stricter than `encodeURIComponent`
 * because we also encode `!`, `'`, `(`, `)`, `*`. */
function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function generateNonce(): string {
  // 32 hex chars = 128 bits. Twitter requires uniqueness per consumer +
  // timestamp; crypto-random is safer than Math.random under clock skew.
  return randomBytes(16).toString("hex");
}
