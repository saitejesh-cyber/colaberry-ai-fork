/**
 * Demo Request Store — Strapi-backed lead durability layer.
 *
 * Why this exists: /api/demo-request previously only called
 * sendNewsletterEmail(). If the email provider dropped the message
 * the lead was lost forever — no audit trail, no retry queue.
 *
 * This module writes the lead to Strapi BEFORE attempting delivery,
 * then updates the record with the delivery outcome. Even if email
 * fails, the lead is durable in the CMS and visible at
 * https://www.cms.colaberry.ai/admin/content-manager/collection-types/api::demo-request.demo-request.
 *
 * Security:
 * - Bearer token auth via CMS_API_TOKEN (same pattern as
 *   newsletter-subscribe.ts — no public Strapi permissions).
 * - Per-request AbortController timeout so a stuck CMS never blocks
 *   the demo-request handler beyond DEMO_REQUEST_CMS_TIMEOUT_MS.
 * - All inputs are assumed already-normalized/sanitized by the
 *   caller (demo-request.ts does HTML-escape + length-cap + CRLF
 *   rejection). This module does NOT re-sanitize, it only serializes.
 * - Zero `any` — every field is typed. Errors throw CmsWriteError
 *   so the handler can decide whether to degrade gracefully.
 */

const CMS_URL = (process.env.CMS_URL || process.env.NEXT_PUBLIC_CMS_URL || "")
  .trim()
  .replace(/\/$/, "");
const CMS_API_TOKEN = (process.env.CMS_API_TOKEN || "").trim();
const CMS_TIMEOUT_MS = Number(
  process.env.DEMO_REQUEST_CMS_TIMEOUT_MS || 6000,
);

export type DemoRequestStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "closed"
  | "spam";

export type DemoRequestSourcePage =
  | "request-demo"
  | "homepage-wizard"
  | "unknown"
  | string;

/**
 * Input to createDemoRequest — everything the handler gathers before
 * it attempts email delivery. All string fields must be pre-normalized
 * (trimmed, length-capped, CRLF-rejected) by the caller.
 */
export interface CreateDemoRequestInput {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly company: string;
  readonly role: string;
  readonly teamSize: string;
  readonly timeline: string;
  readonly message: string;
  readonly sourcePage: DemoRequestSourcePage;
  readonly sourcePath: string;
  readonly requestId: string; // UUID v4 for correlation with logs
  readonly ipHash: string; // SHA-256-truncated, never raw IP
  readonly userAgentHash: string; // SHA-256-truncated, never raw UA
  readonly metadata: {
    readonly utmSource: string;
    readonly utmMedium: string;
    readonly utmCampaign: string;
    readonly utmTerm: string;
    readonly utmContent: string;
    readonly referrer: string;
    readonly userAgent: string;
  };
}

/**
 * Delivery outcome fields written back AFTER sendNewsletterEmail
 * resolves (success or failure). Never mutates the original lead
 * fields — only sets delivery state.
 */
export interface UpdateDemoRequestDeliveryInput {
  readonly emailDelivered: boolean;
  readonly emailProvider: string;
  readonly emailError: string | null;
  readonly deliveryAttemptedAt: string; // ISO-8601
}

/**
 * Thin wrapper around the Strapi `documentId` returned from POST.
 * Status is always "new" at create time — a separate update call
 * sets delivery outcome so we never have inconsistent intermediate
 * state in the CMS.
 */
export interface DemoRequestRecord {
  readonly documentId: string;
  readonly createdAt: string;
  readonly status: DemoRequestStatus;
}

export class CmsWriteError extends Error {
  readonly httpStatus: number | null;

  constructor(message: string, httpStatus: number | null = null) {
    super(message);
    this.name = "CmsWriteError";
    this.httpStatus = httpStatus;
  }
}

export class CmsNotConfiguredError extends Error {
  constructor() {
    super(
      "CMS_URL or CMS_API_TOKEN is not configured — demo requests cannot be persisted",
    );
    this.name = "CmsNotConfiguredError";
  }
}

/**
 * True if the Strapi write path is fully configured. The handler
 * uses this to decide whether to skip the CMS write entirely in
 * local-dev / missing-env situations (never fails the whole request
 * just because CMS is unreachable).
 */
export function isDemoRequestStoreConfigured(): boolean {
  return (
    CMS_URL.length > 0 &&
    /^https?:\/\//i.test(CMS_URL) &&
    CMS_API_TOKEN.length > 0
  );
}

/**
 * Build the Strapi POST body from the create-input. Pure function —
 * no I/O, no env reads, safe to unit-test. Exposed for the verify
 * script under scripts/verify-demo-request-store.mjs.
 */
export function buildCreatePayload(input: CreateDemoRequestInput): {
  readonly data: Record<string, unknown>;
} {
  return {
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      company: input.company || null,
      role: input.role || null,
      teamSize: input.teamSize || null,
      timeline: input.timeline || null,
      message: input.message || null,
      sourcePage: input.sourcePage || "unknown",
      sourcePath: input.sourcePath || null,
      status: "new" as DemoRequestStatus,
      emailDelivered: false,
      requestId: input.requestId,
      ipHash: input.ipHash,
      userAgentHash: input.userAgentHash,
      metadata: {
        utmSource: input.metadata.utmSource || null,
        utmMedium: input.metadata.utmMedium || null,
        utmCampaign: input.metadata.utmCampaign || null,
        utmTerm: input.metadata.utmTerm || null,
        utmContent: input.metadata.utmContent || null,
        referrer: input.metadata.referrer || null,
        userAgent: input.metadata.userAgent || null,
      },
    },
  };
}

/**
 * Build the Strapi PUT body for delivery-outcome updates. Pure.
 */
export function buildDeliveryUpdatePayload(
  input: UpdateDemoRequestDeliveryInput,
): { readonly data: Record<string, unknown> } {
  return {
    data: {
      emailDelivered: input.emailDelivered,
      emailProvider: input.emailProvider,
      emailError: input.emailError,
      deliveryAttemptedAt: input.deliveryAttemptedAt,
    },
  };
}

/**
 * Minimal Strapi response shape for a single-entry write. We only
 * read the fields we care about — everything else is ignored.
 */
interface StrapiSingleResponse {
  readonly data?: {
    readonly id?: number;
    readonly documentId?: string;
    readonly createdAt?: string;
    readonly attributes?: {
      readonly documentId?: string;
      readonly createdAt?: string;
      readonly status?: string;
    };
  };
}

async function cmsFetch(
  path: string,
  init: RequestInit,
): Promise<StrapiSingleResponse> {
  if (!isDemoRequestStoreConfigured()) {
    throw new CmsNotConfiguredError();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CMS_TIMEOUT_MS);

  try {
    const response = await fetch(`${CMS_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CMS_API_TOKEN}`,
        ...(init.headers || {}),
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new CmsWriteError(
        `Strapi ${response.status}: ${text.slice(0, 300) || "request failed"}`,
        response.status,
      );
    }

    return (await response.json()) as StrapiSingleResponse;
  } catch (error) {
    if (error instanceof CmsWriteError) throw error;
    if (error instanceof CmsNotConfiguredError) throw error;
    const message =
      error instanceof Error ? error.message : "unknown CMS write failure";
    throw new CmsWriteError(message);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Persist a new demo-request lead to Strapi. Returns the documentId
 * so the caller can PUT a delivery-status update once email delivery
 * has been attempted.
 *
 * Throws CmsWriteError on any failure — the handler catches and
 * degrades (still sends email, still returns 200, but logs the loss).
 */
export async function createDemoRequest(
  input: CreateDemoRequestInput,
): Promise<DemoRequestRecord> {
  const body = buildCreatePayload(input);
  const response = await cmsFetch("/api/demo-requests", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const entry = response.data;
  const documentId =
    entry?.documentId || entry?.attributes?.documentId || null;

  if (!documentId) {
    throw new CmsWriteError(
      "Strapi response missing documentId — cannot correlate delivery update",
    );
  }

  const createdAt =
    entry?.createdAt ||
    entry?.attributes?.createdAt ||
    new Date().toISOString();

  return {
    documentId,
    createdAt,
    status: "new",
  };
}

/**
 * Update the delivery-outcome fields on an existing demo-request.
 * Called AFTER sendNewsletterEmail resolves (success or failure) so
 * the admin UI can show which leads delivered successfully and which
 * need manual follow-up because the email bounced.
 *
 * Throws CmsWriteError on failure — the handler logs and continues
 * (the lead is already durable in the CMS, this just annotates it).
 */
export async function updateDemoRequestDelivery(
  documentId: string,
  input: UpdateDemoRequestDeliveryInput,
): Promise<void> {
  if (!documentId) {
    throw new CmsWriteError("documentId is required to update delivery");
  }
  const body = buildDeliveryUpdatePayload(input);
  await cmsFetch(`/api/demo-requests/${encodeURIComponent(documentId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
