/**
 * Enterprise Accelerator Lead Ingestion — fire-and-forget forwarder.
 *
 * Why this exists: /api/demo-request currently writes leads to Strapi
 * and emails info@colaberry.com. The Enterprise Accelerator team at
 * enterprise.colaberry.ai also wants each lead mirrored into their
 * own ingestion endpoint so the enterprise CRM can de-dupe on email
 * and surface "is_new_lead" signals to sales-ops.
 *
 * This module is Step 4 of the /api/demo-request pipeline. It fires
 * AFTER the Strapi write and email send so a 5xx here never breaks
 * the user's submission — the lead is already durable in Strapi and
 * delivered to the sales inbox.
 *
 * Design notes:
 * - Guarded by ENTERPRISE_LEAD_INGEST_ENABLED="true" — kill-switch
 *   so we can dark-launch and roll back from Cloud Run env without
 *   redeploying the container.
 * - Never throws at the caller boundary. All failure modes are
 *   collapsed into a result object the handler can log-and-move-on.
 * - Pure payload shaper (buildEnterprisePayload) is exported so the
 *   verify script under scripts/verify-enterprise-lead-ingest.mjs
 *   can assert field mapping without touching the network.
 * - Mirrors the bearer + AbortController timeout pattern from
 *   src/lib/demoRequestStore.ts — no new auth conventions.
 *
 * Env vars (document in Cloud Run + .env.local):
 *   ENTERPRISE_LEAD_INGEST_URL      full URL (default below)
 *   ENTERPRISE_LEAD_INGEST_TOKEN    optional bearer token
 *   ENTERPRISE_LEAD_INGEST_TIMEOUT_MS   default 6000
 *   ENTERPRISE_LEAD_INGEST_ENABLED  "true" to activate Step 4
 *
 * The URL was decoded out of an ESP click-tracking wrapper supplied
 * by the enterprise team; do NOT hardcode the tracking wrapper —
 * it's GET-only and expires with the email campaign.
 */

import type { CreateDemoRequestInput } from "./demoRequestStore";

const DEFAULT_ENDPOINT =
  "https://enterprise.colaberry.ai/api/leads/ingest?source=colaberry&entry=request_demo_form";

const ENDPOINT = (process.env.ENTERPRISE_LEAD_INGEST_URL || DEFAULT_ENDPOINT).trim();
const TOKEN = (process.env.ENTERPRISE_LEAD_INGEST_TOKEN || "").trim();
const TIMEOUT_MS = Number(process.env.ENTERPRISE_LEAD_INGEST_TIMEOUT_MS || 6000);

/**
 * Schema accepted by the Enterprise endpoint per the hand-off:
 *   name, email, phone, company, company_size     → top level
 *   message                                       → top level (routed to metadata.message server-side)
 *
 * We also pass an extra top-level `context` object containing UTM +
 * source attribution. The endpoint is documented to ignore unknown
 * keys; if that changes, move these keys into `metadata` here.
 */
export interface EnterpriseLeadPayload {
  readonly name: string | null;
  readonly email: string;
  readonly phone: string | null;
  readonly company: string;
  readonly company_size: string | null;
  readonly message: string | null;
  readonly context: {
    readonly source_page: string | null;
    readonly source_path: string | null;
    readonly request_id: string;
    readonly utm_source: string | null;
    readonly utm_medium: string | null;
    readonly utm_campaign: string | null;
    readonly utm_term: string | null;
    readonly utm_content: string | null;
    readonly referrer: string | null;
  };
}

export interface EnterpriseIngestResult {
  readonly ok: boolean;
  readonly status: number;
  readonly leadId?: string;
  readonly isNew?: boolean;
  readonly missingFields?: readonly string[];
  readonly error?: string;
}

/**
 * True when the endpoint URL is configured (non-empty, well-formed
 * http(s) URL). Used by the /api/demo-request handler to decide
 * whether to skip Step 4 entirely in local-dev / missing-env.
 */
export function isEnterpriseIngestConfigured(): boolean {
  return ENDPOINT.length > 0 && /^https?:\/\//i.test(ENDPOINT);
}

/**
 * Nullish-safe string coercion — the Strapi pattern at
 * src/lib/demoRequestStore.ts uses the same "empty string → null"
 * rule so downstream consumers don't have to disambiguate.
 */
function nullIfEmpty(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Append role + timeline as a plain-text suffix to the message body.
 * The Enterprise schema doesn't define dedicated fields for either,
 * but we don't want to silently drop them — the sales team reads the
 * `message` field to qualify leads so preserving role/timeline there
 * is the safest mapping.
 */
function composeMessageWithContext(
  rawMessage: string | null,
  role: string | null,
  timeline: string | null,
): string | null {
  const parts: string[] = [];
  if (rawMessage) parts.push(rawMessage);
  const suffix: string[] = [];
  if (role) suffix.push(`Role: ${role}`);
  if (timeline) suffix.push(`Timeline: ${timeline}`);
  if (suffix.length > 0) parts.push(suffix.join("\n"));
  const combined = parts.join("\n\n").trim();
  return combined.length === 0 ? null : combined;
}

/**
 * Pure payload shaper — maps the internal CreateDemoRequestInput
 * (used by the Strapi write) to the Enterprise schema. Exposed so
 * scripts/verify-enterprise-lead-ingest.mjs can assert field mapping
 * without stubbing fetch.
 *
 * Does NOT validate required fields — that's the caller's job. See
 * enforceRequired() for the guard used by forwardToEnterprise().
 */
export function buildEnterprisePayload(
  input: CreateDemoRequestInput,
): EnterpriseLeadPayload {
  return {
    name: nullIfEmpty(input.name),
    email: input.email,
    phone: nullIfEmpty(input.phone),
    company: input.company,
    company_size: nullIfEmpty(input.teamSize),
    message: composeMessageWithContext(
      nullIfEmpty(input.message),
      nullIfEmpty(input.role),
      nullIfEmpty(input.timeline),
    ),
    context: {
      source_page: nullIfEmpty(input.sourcePage),
      source_path: nullIfEmpty(input.sourcePath),
      request_id: input.requestId,
      utm_source: nullIfEmpty(input.metadata.utmSource),
      utm_medium: nullIfEmpty(input.metadata.utmMedium),
      utm_campaign: nullIfEmpty(input.metadata.utmCampaign),
      utm_term: nullIfEmpty(input.metadata.utmTerm),
      utm_content: nullIfEmpty(input.metadata.utmContent),
      referrer: nullIfEmpty(input.metadata.referrer),
    },
  };
}

/**
 * Required-field guard per the Enterprise endpoint contract:
 *   Required: email, company
 *
 * Returns the list of missing fields, empty if all present. The
 * handler caller uses this to short-circuit BEFORE the network round
 * trip — we don't want to rely on the Enterprise endpoint's own 400
 * response for the client-contract validation.
 */
export function enforceRequired(payload: EnterpriseLeadPayload): string[] {
  const missing: string[] = [];
  if (!payload.email || payload.email.trim().length === 0) missing.push("email");
  if (!payload.company || payload.company.trim().length === 0) missing.push("company");
  return missing;
}

/**
 * POST the payload to the Enterprise ingestion endpoint. Never
 * throws: any error (timeout, 4xx, 5xx, network) resolves to a
 * result object with { ok: false, status, error }. The handler
 * logs and moves on — Step 4 is non-critical for user success.
 */
export async function forwardToEnterprise(
  payload: EnterpriseLeadPayload,
): Promise<EnterpriseIngestResult> {
  const missing = enforceRequired(payload);
  if (missing.length > 0) {
    return {
      ok: false,
      status: 0,
      missingFields: missing,
      error: `Missing required field(s): ${missing.join(", ")}`,
    };
  }

  if (!isEnterpriseIngestConfigured()) {
    return {
      ok: false,
      status: 0,
      error: "ENTERPRISE_LEAD_INGEST_URL is not configured",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (TOKEN.length > 0) {
      headers.Authorization = `Bearer ${TOKEN}`;
    }

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    // Try to parse JSON. Non-JSON 2xx is still "ok" but logs a warning.
    const contentType = response.headers.get("content-type") || "";
    let body: unknown = null;
    if (contentType.includes("application/json")) {
      body = await response.json().catch(() => null);
    } else {
      // Consume the body so the connection can be released; ignore content.
      await response.text().catch(() => "");
    }

    if (response.ok) {
      const parsed = (body ?? {}) as {
        success?: boolean;
        lead_id?: string;
        is_new_lead?: boolean;
      };
      return {
        ok: parsed.success !== false,
        status: response.status,
        leadId: typeof parsed.lead_id === "string" ? parsed.lead_id : undefined,
        isNew: typeof parsed.is_new_lead === "boolean" ? parsed.is_new_lead : undefined,
      };
    }

    // Non-2xx — extract missing_fields if the endpoint returned them
    // (the 400 contract the handoff documented).
    const parsedErr = (body ?? {}) as {
      missing_fields?: string[];
      error?: string;
      message?: string;
    };
    const errMsg =
      parsedErr.error ??
      parsedErr.message ??
      `HTTP ${response.status}`;

    return {
      ok: false,
      status: response.status,
      missingFields: Array.isArray(parsedErr.missing_fields)
        ? parsedErr.missing_fields
        : undefined,
      error: errMsg,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    const isAbort =
      error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      status: 0,
      error: isAbort ? `timeout after ${TIMEOUT_MS}ms` : message,
    };
  } finally {
    clearTimeout(timer);
  }
}
