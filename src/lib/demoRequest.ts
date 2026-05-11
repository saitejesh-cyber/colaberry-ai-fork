export type DemoRequestInput = {
  name?: string;
  email: string;
  phone?: string;
  company?: string;
  role?: string;
  teamSize?: string;
  timeline?: string;
  message?: string;
  website?: string;
  sourcePage?: string;
  sourcePath?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
  /** P2 consent checkbox — required by the server. */
  consent?: boolean;
  /** P1 bot-token — HMAC-signed timing token from GET /api/bot-token. */
  _bt?: string;
};

export type DemoRequestResponse = {
  ok: boolean;
  message: string;
};

export const DEFAULT_DEMO_REQUEST_MESSAGE =
  "Share your goals, current stack, and the workflows you want to accelerate.";

export async function submitDemoRequest(payload: DemoRequestInput): Promise<DemoRequestResponse> {
  const response = await fetch("/api/demo-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      message: payload.message || DEFAULT_DEMO_REQUEST_MESSAGE,
    }),
  });

  const json = (await response.json()) as {
    ok?: boolean;
    message?: string;
  };

  if (!response.ok || !json?.ok) {
    return {
      ok: false,
      message: json?.message || "Unable to send request right now.",
    };
  }

  return {
    ok: true,
    message: json.message || "Thanks! We will reach out shortly.",
  };
}

/**
 * P1 — fetch a fresh HMAC-signed timing token from GET /api/bot-token.
 * Returns an empty string if the endpoint is unavailable, the secret is
 * not configured, or the client is offline. The server gracefully
 * degrades to silent fake-success if the token is missing (when the
 * DEMO_REQUEST_REQUIRE_BOT_TOKEN feature flag is on).
 */
export async function fetchBotToken(): Promise<string> {
  try {
    const response = await fetch("/api/bot-token", {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    if (!response.ok) return "";
    const json = (await response.json()) as { token?: string };
    return typeof json.token === "string" ? json.token : "";
  } catch {
    return "";
  }
}

/**
 * Stricter client-side work-email validator. Mirrors the constraints the
 * server-side `validateEmail()` from `bot-defense.ts` enforces so users
 * get corrective feedback before round-tripping. Still permissive enough
 * to accept any real work address.
 */
const CLIENT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export function isValidWorkEmail(value: string) {
  const email = value.trim();
  if (email.length < 5 || email.length > 254) return false;
  if (/[\r\n\t]/.test(email)) return false;
  if (!CLIENT_EMAIL_PATTERN.test(email)) return false;
  const atCount = (email.match(/@/g) || []).length;
  if (atCount !== 1) return false;
  const [local, domain] = email.split("@");
  if (!local || !domain) return false;
  if (local.length > 64) return false;
  if (local.includes("..") || domain.includes("..")) return false;
  if ((local.match(/\+/g) || []).length > 1) return false;
  const domainParts = domain.split(".");
  if (domainParts.length < 2) return false;
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-z]+$/i.test(tld)) return false;
  return true;
}
