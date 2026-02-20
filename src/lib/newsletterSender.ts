type SupportedProvider = "resend" | "sendgrid" | "console";

type SendInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

type SendResult = {
  ok: boolean;
  provider: SupportedProvider;
  id?: string;
  error?: string;
};

const PROVIDER = (process.env.NEWSLETTER_PROVIDER || "console").toLowerCase() as SupportedProvider;
const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || "Colaberry AI <no-reply@colaberry.ai>";
const REPLY_TO = process.env.NEWSLETTER_REPLY_TO_EMAIL || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";

function hasUsableSecret(value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === "your_resend_api_key") return false;
  if (normalized === "your_sendgrid_api_key") return false;
  if (normalized.includes("changeme")) return false;
  if (normalized.includes("replace_with")) return false;
  if (normalized.includes("placeholder")) return false;
  return true;
}

function normalizeEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}

async function postWithRetry(
  url: string,
  init: RequestInit,
  retries = 2
): Promise<Response> {
  let attempt = 0;
  while (attempt <= retries) {
    const response = await fetch(url, init);
    if (response.ok) return response;

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt >= retries) {
      return response;
    }
    const delayMs = 400 * Math.pow(2, attempt);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    attempt += 1;
  }
  throw new Error("Retry loop ended unexpectedly");
}

async function sendViaResend(input: SendInput): Promise<SendResult> {
  if (!hasUsableSecret(RESEND_API_KEY)) {
    return { ok: false, provider: "resend", error: "RESEND_API_KEY is missing." };
  }

  const response = await postWithRetry("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [normalizeEmail(input.to)],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo || REPLY_TO || undefined,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return {
      ok: false,
      provider: "resend",
      error: `Resend ${response.status}: ${text || "send failed"}`,
    };
  }

  const payload = (await response.json()) as { id?: string };
  return { ok: true, provider: "resend", id: payload?.id };
}

function parseSendgridFrom(value: string) {
  const match = value.match(/^(.+?)\s*<([^>]+)>$/);
  if (!match) {
    return { email: value.trim(), name: "Colaberry AI" };
  }
  return {
    name: match[1].trim(),
    email: match[2].trim(),
  };
}

async function sendViaSendgrid(input: SendInput): Promise<SendResult> {
  if (!hasUsableSecret(SENDGRID_API_KEY)) {
    return { ok: false, provider: "sendgrid", error: "SENDGRID_API_KEY is missing." };
  }
  const from = parseSendgridFrom(FROM_EMAIL);
  const response = await postWithRetry("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: normalizeEmail(input.to) }],
        },
      ],
      from,
      reply_to: (input.replyTo || REPLY_TO) ? { email: (input.replyTo || REPLY_TO) } : undefined,
      subject: input.subject,
      content: [
        { type: "text/plain", value: input.text },
        { type: "text/html", value: input.html },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return {
      ok: false,
      provider: "sendgrid",
      error: `SendGrid ${response.status}: ${text || "send failed"}`,
    };
  }
  return { ok: true, provider: "sendgrid" };
}

function sendViaConsole(input: SendInput): SendResult {
  const preview = input.text.slice(0, 220);
  console.info("[newsletter-send:console]", JSON.stringify({ to: input.to, subject: input.subject, preview }));
  return { ok: true, provider: "console", id: "console-mode" };
}

export async function sendNewsletterEmail(input: SendInput): Promise<SendResult> {
  if (PROVIDER === "resend") {
    return sendViaResend(input);
  }
  if (PROVIDER === "sendgrid") {
    return sendViaSendgrid(input);
  }
  return sendViaConsole(input);
}

export function resolveSenderProvider(): SupportedProvider {
  if (PROVIDER === "resend" || PROVIDER === "sendgrid") return PROVIDER;
  return "console";
}
