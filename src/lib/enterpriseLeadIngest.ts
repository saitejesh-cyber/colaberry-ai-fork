/**
 * Enterprise Accelerator lead ingest client.
 *
 * Pipes Request Demo submissions into the Enterprise lead-ingestion API at
 * `enterprise.colaberry.ai/api/leads/ingest` in addition to the existing
 * email-delivery path. The forward is fire-and-forget: errors are logged but
 * never bubble back to the user-facing /api/demo-request response, so the
 * user UX is unchanged even if the enterprise endpoint is degraded.
 *
 * IMPORTANT — endpoint URL provenance:
 *   The original task brief listed an ESP click-tracking wrapper URL of the
 *   shape `http://track.colaberry.com/track/click/<msg_id>/...?p=<base64>`.
 *   That is a GET-only email-link redirector, not a production POST endpoint.
 *   The base64 `p=` parameter decoded to the real destination used below.
 *   See: docs/decisions/ for context, or `Test plan` in the snazzy plan file.
 *
 * Kill-switch: set `ENTERPRISE_LEAD_INGEST_ENABLED=true` to enable. Defaults
 * to disabled so this can be dark-launched and toggled per environment with
 * a Cloud Run env-var update (no redeploy required).
 */

const DEFAULT_ENTERPRISE_URL =
  "https://enterprise.colaberry.ai/api/leads/ingest?source=colaberry&entry=request_demo_form";

const DEFAULT_TIMEOUT_MS = 6000;

/** Marketing-form payload as built by /api/demo-request after normalization. */
export type DemoRequestCreateInput = {
  name?: string;
  email: string;
  company?: string;
  role?: string;
  teamSize?: string;
  timeline?: string;
  message?: string;
  sourcePage?: string;
  sourcePath?: string;
  /** Optional UTM / referrer context — passed through to the enterprise side. */
  metadata?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
    referrer?: string;
    requestId?: string;
  };
};

/** Wire shape sent to the enterprise endpoint. Unknown keys are tolerated per its `ingest` contract. */
export type EnterpriseLeadPayload = {
  name: string | null;
  email: string;
  phone: string | null;
  company: string;
  company_size: string | null;
  message: string | null;
  // Context passthrough — top-level so the enterprise side can index against UTM
  // without nesting traversal. If the endpoint later rejects unknown keys, swap
  // to `context: { ... }` here (single-line change).
  source_page?: string;
  source_path?: string;
  request_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
};

export type EnterpriseForwardResult = {
  ok: boolean;
  status: number;
  leadId?: string;
  isNew?: boolean;
  missingFields?: string[];
  error?: string;
};

function readEnv(name: string): string {
  return String(process.env[name] || "").trim();
}

function readEnvNumber(name: string, fallback: number): number {
  const raw = readEnv(name);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** True when the env declares a usable enterprise ingest URL. */
export function isEnterpriseIngestConfigured(): boolean {
  const url = readEnv("ENTERPRISE_LEAD_INGEST_URL") || DEFAULT_ENTERPRISE_URL;
  return Boolean(url) && /^https?:\/\//i.test(url);
}

/** True when the enterprise forward is allowed to fire (kill-switch). */
export function isEnterpriseIngestEnabled(): boolean {
  const flag = readEnv("ENTERPRISE_LEAD_INGEST_ENABLED").toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes" || flag === "on";
}

/** Returns the resolved endpoint URL (env override > default). */
export function resolveEnterpriseIngestUrl(): string {
  return readEnv("ENTERPRISE_LEAD_INGEST_URL") || DEFAULT_ENTERPRISE_URL;
}

function trimOrNull(value: string | undefined): string | null {
  const trimmed = String(value || "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function appendRoleAndTimeline(message: string, role?: string, timeline?: string): string | null {
  const base = String(message || "").trim();
  const suffixParts: string[] = [];
  const trimmedRole = String(role || "").trim();
  const trimmedTimeline = String(timeline || "").trim();
  if (trimmedRole) suffixParts.push(`Role: ${trimmedRole}`);
  if (trimmedTimeline) suffixParts.push(`Timeline: ${trimmedTimeline}`);
  const suffix = suffixParts.length > 0 ? `\n\n${suffixParts.join("\n")}` : "";
  const composed = `${base}${suffix}`.trim();
  return composed.length > 0 ? composed : null;
}

/**
 * Pure payload shaper — maps the marketing-form fields onto the enterprise
 * schema. Exposed for unit testing and one-off scripted forwards. Performs
 * the minimal required-field guard (email + company); when a required field
 * is missing it returns a missingFields list and the caller MUST skip the
 * HTTP call.
 */
export function buildEnterprisePayload(
  input: DemoRequestCreateInput
): { ok: true; payload: EnterpriseLeadPayload } | { ok: false; missingFields: string[] } {
  const missingFields: string[] = [];
  const email = String(input.email || "").trim().toLowerCase();
  const company = String(input.company || "").trim();
  if (!email) missingFields.push("email");
  if (!company) missingFields.push("company");
  if (missingFields.length > 0) {
    return { ok: false, missingFields };
  }

  const payload: EnterpriseLeadPayload = {
    name: trimOrNull(input.name),
    email,
    phone: null, // marketing form does not collect phone today
    company,
    company_size: trimOrNull(input.teamSize),
    message: appendRoleAndTimeline(input.message || "", input.role, input.timeline),
  };

  const sourcePage = trimOrNull(input.sourcePage);
  if (sourcePage) payload.source_page = sourcePage;
  const sourcePath = trimOrNull(input.sourcePath);
  if (sourcePath) payload.source_path = sourcePath;

  const meta = input.metadata ?? {};
  const requestId = trimOrNull(meta.requestId);
  if (requestId) payload.request_id = requestId;
  const utmSource = trimOrNull(meta.utmSource);
  if (utmSource) payload.utm_source = utmSource;
  const utmMedium = trimOrNull(meta.utmMedium);
  if (utmMedium) payload.utm_medium = utmMedium;
  const utmCampaign = trimOrNull(meta.utmCampaign);
  if (utmCampaign) payload.utm_campaign = utmCampaign;
  const utmContent = trimOrNull(meta.utmContent);
  if (utmContent) payload.utm_content = utmContent;
  const utmTerm = trimOrNull(meta.utmTerm);
  if (utmTerm) payload.utm_term = utmTerm;
  const referrer = trimOrNull(meta.referrer);
  if (referrer) payload.referrer = referrer;

  return { ok: true, payload };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("enterprise forward timeout")), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * POSTs a single lead to the enterprise ingest endpoint. Never throws — the
 * caller treats this as fire-and-forget. On any failure we return an
 * EnterpriseForwardResult with `ok: false` and a structured reason.
 */
export async function forwardToEnterprise(
  input: DemoRequestCreateInput
): Promise<EnterpriseForwardResult> {
  const built = buildEnterprisePayload(input);
  if (!built.ok) {
    return { ok: false, status: 0, missingFields: built.missingFields, error: "missing required fields" };
  }

  const url = resolveEnterpriseIngestUrl();
  const token = readEnv("ENTERPRISE_LEAD_INGEST_TOKEN");
  const timeoutMs = readEnvNumber("ENTERPRISE_LEAD_INGEST_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await withTimeout(
      fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(built.payload),
      }),
      timeoutMs
    );

    let json: Record<string, unknown> = {};
    try {
      json = (await response.json()) as Record<string, unknown>;
    } catch {
      // body may be empty / non-JSON — fall through with status-only result
    }

    if (!response.ok) {
      const errBody = typeof json.error === "string" ? json.error : undefined;
      return { ok: false, status: response.status, error: errBody || `HTTP ${response.status}` };
    }

    const leadId =
      typeof json.lead_id === "string"
        ? json.lead_id
        : typeof json.id === "string"
        ? json.id
        : undefined;
    const isNew =
      typeof json.is_new_lead === "boolean"
        ? json.is_new_lead
        : typeof json.isNew === "boolean"
        ? json.isNew
        : undefined;

    return { ok: true, status: response.status, leadId, isNew };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return { ok: false, status: 0, error: message };
  }
}
