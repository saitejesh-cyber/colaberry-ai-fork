import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  hasJsonContentType,
  hasRealBrowserHeaders,
  isAllowedOrigin,
  isKnownBot,
  validateBotToken,
  validateEmail as strictValidateEmail,
} from "../../lib/bot-defense";
import {
  createDemoRequest,
  isDemoRequestStoreConfigured,
  updateDemoRequestDelivery,
  CmsWriteError,
  type CreateDemoRequestInput,
} from "../../lib/demoRequestStore";
import {
  buildEnterprisePayload,
  forwardToEnterprise,
  isEnterpriseIngestConfigured,
} from "../../lib/enterpriseLeadIngest";
import { resolveSenderProvider, sendNewsletterEmail } from "../../lib/newsletterSender";
import { checkRateLimit, getClientIp } from "../../lib/rate-limit";

type DemoRequestPayload = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  teamSize?: string;
  timeline?: string;
  message?: string;
  sourcePage?: string;
  sourcePath?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
  website?: string;
  consent?: boolean | string;
  _bt?: string;
};

const TO_EMAIL = process.env.DEMO_REQUEST_TO_EMAIL || process.env.NEWSLETTER_REPLY_TO_EMAIL || "info@colaberry.com";
const REQUEST_TIMEOUT_MS = Number(process.env.DEMO_REQUEST_TIMEOUT_MS || 8000);
const MAX_MESSAGE_LENGTH = Number(process.env.DEMO_REQUEST_MAX_MESSAGE || 4000);
const HASH_SALT = process.env.DEMO_REQUEST_HASH_SALT || process.env.NEWSLETTER_HASH_SALT || "colaberry-demo-request";

/**
 * P1 feature flag — HMAC timing-token enforcement.
 *
 * When this flag is `"true"` AND `BOT_TOKEN_SECRET` is set on the runtime
 * environment, every POST must include a server-signed `_bt` token that:
 *   - was issued by GET /api/bot-token
 *   - is at least 5 s old (humans fill forms slower than that)
 *   - is at most 1 h old (limits replay window)
 * Blocked requests get a silent fake-success so bots cannot enumerate.
 *
 * Default OFF so the code can ship without a behaviour change. Flip on via
 * a single `gcloud run services update` once `BOT_TOKEN_SECRET` is set.
 */
const REQUIRE_BOT_TOKEN = process.env.DEMO_REQUEST_REQUIRE_BOT_TOKEN === "true";

function hashValue(value: string) {
  return crypto
    .createHash("sha256")
    .update(`${HASH_SALT}:${value}`)
    .digest("hex")
    .slice(0, 24);
}

function normalizeText(value: string | undefined, max = 240) {
  if (!value) return "";
  return String(value).trim().slice(0, max);
}

function normalizeEmail(value: string | undefined) {
  if (!value) return "";
  return String(value).trim().toLowerCase();
}

// nosemgrep: javascript.audit.detect-replaceall-sanitization — complete 5-entity HTML escape, safe for email body context
function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Belt-and-suspenders regex sanity check run alongside the strict
// validateEmail() from bot-defense (disposable-domain blocklist,
// consecutive-dots check, local-part length cap, multi-plus guard).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

/**
 * Silent fake-success response used when any bot-defense layer blocks the
 * submission. Anti-enumeration pattern: the response is byte-for-byte
 * indistinguishable from a real success so bots cannot probe which layer
 * caught them (closes the `delivery.attempted=false` enumeration leak
 * from the P0 implementation — the delivery block now mirrors a real
 * success, including the live sender provider).
 */
function silentSuccess(res: NextApiResponse) {
  return res.status(200).json({
    ok: true,
    message: "Thanks! We will reach out shortly to schedule a demo.",
    delivery: { attempted: true, sent: true, provider: resolveSenderProvider() },
  });
}

function parsePayload(req: NextApiRequest): DemoRequestPayload | null {
  if (!req.body) return null;
  if (typeof req.body === "object") return req.body as DemoRequestPayload;
  try {
    return JSON.parse(req.body) as DemoRequestPayload;
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Request timeout")), timeoutMs);
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, message: "Method not allowed." });
  }

  // Per-IP flood guard — runs BEFORE any parsing so abusers get throttled
  // even if they never send valid JSON. Tightened from 10/60s → 12/10min
  // to match the podcast-subscribe + newsletter-subscribe envelope.
  const ip = getClientIp(req);
  const rlIp = checkRateLimit("demo-request-ip", ip, 12, 10 * 60_000);
  if (rlIp.limited) {
    res.setHeader("Retry-After", String(rlIp.retryAfterSec));
    res.setHeader("X-RateLimit-Limit", String(rlIp.limit));
    res.setHeader("X-RateLimit-Remaining", "0");
    return res.status(429).json({ ok: false, message: "Too many requests. Please try again shortly." });
  }

  // Bot defense layers 1-4 — silent fake-success on any block so bots
  // cannot enumerate which layer caught them (OWASP A01, matches
  // podcast-subscribe + newsletter-subscribe pattern per CLAUDE.md).
  //  Layer 1  — known-bot UA / too-short UA
  //  Layer 2  — missing real-browser headers (accept, accept-language, user-agent)
  //  Layer 3  — origin/referer must be one of our hosts
  //  Layer 4  — content-type must be application/json
  if (
    isKnownBot(req) ||
    !hasRealBrowserHeaders(req) ||
    !isAllowedOrigin(req) ||
    !hasJsonContentType(req)
  ) {
    return silentSuccess(res);
  }

  const payload = parsePayload(req);
  if (!payload) {
    return res.status(400).json({ ok: false, message: "Invalid request payload." });
  }

  // Layer 5 — Honeypot: a real browser never touches this hidden field.
  // Silent fake-success so the bot believes it worked and moves on.
  if (payload.website && String(payload.website).trim().length > 0) {
    return silentSuccess(res);
  }

  // Layer 6 — CRLF header-injection guard across every text field. Only
  // header-injecting bots produce \r\n in form fields, so silent fake-success
  // is safe (no real user ever sees this path).
  const textFieldsForCrlfCheck = [
    payload.name,
    payload.email,
    payload.company,
    payload.role,
    payload.teamSize,
    payload.timeline,
    payload.message,
    payload.sourcePage,
    payload.sourcePath,
    payload.utmSource,
    payload.utmMedium,
    payload.utmCampaign,
    payload.utmTerm,
    payload.utmContent,
    payload.referrer,
  ];
  if (textFieldsForCrlfCheck.some((v) => typeof v === "string" && /[\r\n]/.test(v))) {
    return silentSuccess(res);
  }

  const email = normalizeEmail(payload.email);

  // Layer 7 — Strict email validator: 254-char cap, CRLF, consecutive-dots,
  // local-part length, multi-plus, disposable-domain blocklist — plus a
  // regex sanity check. Returns 400 on bad format so real users with a
  // typo get corrective feedback (bots do not iterate the demo-request
  // form the way they scrape signup endpoints, so enumeration risk is low).
  const emailResult = strictValidateEmail(email);
  if (!emailResult.valid || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ ok: false, message: "A valid work email is required." });
  }

  // Layer 8 — Per-email rate limit (now that the email is parsed).
  // 6 attempts per 10 min per email, matching the subscribe endpoints.
  const rlEmail = checkRateLimit("demo-request-email", email, 6, 10 * 60_000);
  if (rlEmail.limited) {
    res.setHeader("Retry-After", String(rlEmail.retryAfterSec));
    res.setHeader("X-RateLimit-Limit", String(rlEmail.limit));
    res.setHeader("X-RateLimit-Remaining", "0");
    return res.status(429).json({ ok: false, message: "Too many requests. Please try again shortly." });
  }

  // Layer 9 — P1: HMAC timing token. Feature-flagged so the code can ship
  // inert until BOT_TOKEN_SECRET is set on Cloud Run. When enforced, the
  // token must be >=5 s old and <=1 h old, signed with BOT_TOKEN_SECRET.
  // Silent fake-success on any failure (missing / expired / too-fast /
  // invalid signature) so bots cannot enumerate the layer.
  if (REQUIRE_BOT_TOKEN) {
    const tokenResult = validateBotToken(payload._bt, 5000);
    if (!tokenResult.valid) {
      return silentSuccess(res);
    }
  }

  // Layer 10 — P2: explicit consent to be contacted. Matches the pattern
  // in podcast-subscribe / newsletter-subscribe. Real users see a 400
  // with a corrective message; bots that scrape the form definition and
  // submit without ticking the box get the same 400.
  const consent = payload.consent === true || payload.consent === "true";
  if (!consent) {
    return res.status(400).json({
      ok: false,
      message: "Please confirm you agree to be contacted about your request.",
    });
  }

  const name = normalizeText(payload.name, 120);
  const company = normalizeText(payload.company, 160);

  // Layer 11 — P2: company is required. The Enterprise Accelerator
  // ingestion endpoint (Step 4) contract requires email + company, and
  // making it a pure CMS-optional field on our side would silently ship
  // Strapi leads that the enterprise CRM then rejects. Enforce here as
  // the belt-and-suspenders server guard — the real validation is
  // client-side in DemoRequestForm (fail-fast before fetch).
  if (!company) {
    return res.status(400).json({
      ok: false,
      message: "Please include your company name so we can prepare the right walkthrough.",
    });
  }
  // Phone is optional. Normalize to strip control chars + length-cap at
  // 64 (safe margin for international formats with country code +
  // separators). Format validation stays loose — we'd rather accept a
  // slightly unusual legit number than reject a real buyer because of
  // regex theatre.
  const phone = normalizeText(payload.phone, 64);
  const role = normalizeText(payload.role, 120);
  const teamSize = normalizeText(payload.teamSize, 120);
  const timeline = normalizeText(payload.timeline, 120);
  const message = normalizeText(payload.message, MAX_MESSAGE_LENGTH);
  const sourcePage = normalizeText(payload.sourcePage, 120) || "request-demo";
  const sourcePath = normalizeText(payload.sourcePath, 240);
  const utmSource = normalizeText(payload.utmSource, 140);
  const utmMedium = normalizeText(payload.utmMedium, 140);
  const utmCampaign = normalizeText(payload.utmCampaign, 180);
  const utmTerm = normalizeText(payload.utmTerm, 160);
  const utmContent = normalizeText(payload.utmContent, 160);
  const referrer = normalizeText(payload.referrer, 360);

  const subject = `Demo request${company ? ` — ${company}` : ""}`;
  const htmlName = escapeHtml(name || "Not provided");
  const htmlEmail = escapeHtml(email);
  const htmlPhone = escapeHtml(phone || "Not provided");
  const htmlCompany = escapeHtml(company || "Not provided");
  const htmlRole = escapeHtml(role || "Not provided");
  const htmlTeamSize = escapeHtml(teamSize || "Not provided");
  const htmlTimeline = escapeHtml(timeline || "Not provided");
  const htmlSourcePage = escapeHtml(sourcePage);
  const htmlSourcePath = escapeHtml(sourcePath || "Unknown");
  const htmlUtmSource = escapeHtml(utmSource || "Not provided");
  const htmlUtmMedium = escapeHtml(utmMedium || "Not provided");
  const htmlUtmCampaign = escapeHtml(utmCampaign || "Not provided");
  const htmlUtmTerm = escapeHtml(utmTerm || "Not provided");
  const htmlUtmContent = escapeHtml(utmContent || "Not provided");
  const htmlReferrer = escapeHtml(referrer || "Not provided");
  const htmlMessage = escapeHtml(message || "No additional notes provided.");
  const detailLines = [
    `Name: ${name || "Not provided"}`,
    `Email: ${email}`,
    `Phone: ${phone || "Not provided"}`,
    `Company: ${company || "Not provided"}`,
    `Role: ${role || "Not provided"}`,
    `Team size: ${teamSize || "Not provided"}`,
    `Timeline: ${timeline || "Not provided"}`,
    `Source page: ${sourcePage}`,
    `Source path: ${sourcePath || "Unknown"}`,
    `UTM source: ${utmSource || "Not provided"}`,
    `UTM medium: ${utmMedium || "Not provided"}`,
    `UTM campaign: ${utmCampaign || "Not provided"}`,
    `UTM term: ${utmTerm || "Not provided"}`,
    `UTM content: ${utmContent || "Not provided"}`,
    `Referrer: ${referrer || "Not provided"}`,
    "",
    "Message:",
    message || "No additional notes provided.",
  ];

  const text = detailLines.join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;">
      <h2 style="margin:0 0 12px;">New demo request</h2>
      <table style="border-collapse:collapse;font-size:14px;line-height:1.5;">
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Name</td><td>${htmlName}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Email</td><td>${htmlEmail}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Phone</td><td>${htmlPhone}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Company</td><td>${htmlCompany}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Role</td><td>${htmlRole}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Team size</td><td>${htmlTeamSize}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Timeline</td><td>${htmlTimeline}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Source page</td><td>${htmlSourcePage}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Source path</td><td>${htmlSourcePath}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">UTM source</td><td>${htmlUtmSource}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">UTM medium</td><td>${htmlUtmMedium}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">UTM campaign</td><td>${htmlUtmCampaign}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">UTM term</td><td>${htmlUtmTerm}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">UTM content</td><td>${htmlUtmContent}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Referrer</td><td>${htmlReferrer}</td></tr>
      </table>
      <p style="margin:16px 0 4px;font-weight:600;">Message</p>
      <p style="margin:0;">${htmlMessage}</p>
    </div>
  `;

  // Step 1 — persist the lead to Strapi BEFORE attempting email delivery.
  // This makes the lead durable even if the email provider drops the
  // message. If Strapi is unreachable we still continue to the email
  // step (degraded — logged — but user still gets a response).
  const requestId = crypto.randomUUID();
  const userAgentHeader = String(req.headers["user-agent"] || "").slice(0, 500);
  const createInput: CreateDemoRequestInput = {
    name,
    email,
    phone,
    company,
    role,
    teamSize,
    timeline,
    message,
    sourcePage,
    sourcePath,
    requestId,
    ipHash: hashValue(ip),
    userAgentHash: hashValue(userAgentHeader || "unknown"),
    metadata: {
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      referrer,
      userAgent: userAgentHeader,
    },
  };

  let documentId: string | null = null;
  if (isDemoRequestStoreConfigured()) {
    try {
      const record = await createDemoRequest(createInput);
      documentId = record.documentId;
    } catch (error) {
      const message = error instanceof CmsWriteError ? error.message : "unknown CMS error";
      console.error(`[demo-request] ${requestId} CMS write failed: ${message}`);
      // Deliberately swallow — the email path is still attempted so
      // we never fail a user submission because of a CMS outage.
    }
  } else {
    console.warn(`[demo-request] ${requestId} CMS not configured — lead will only be emailed`);
  }

  // Step 2 — attempt email delivery.
  let emailOk = false;
  let emailError: string | null = null;
  const provider = resolveSenderProvider();

  try {
    const delivery = await withTimeout(
      sendNewsletterEmail({
        to: TO_EMAIL,
        subject,
        text,
        html,
        replyTo: email,
      }),
      REQUEST_TIMEOUT_MS
    );

    emailOk = delivery.ok;
    if (!delivery.ok) {
      emailError = delivery.error ?? "unknown delivery error";
      console.error(`[demo-request] ${requestId} send failed: ${emailError}`);
    }
  } catch (error) {
    emailError = error instanceof Error ? error.message : "unknown error";
    console.error(`[demo-request] ${requestId} send threw: ${emailError}`);
  }

  // Step 3 — annotate the CMS record with the delivery outcome so
  // sales-ops can see which leads delivered and which need manual
  // follow-up. Fire-and-forget: never fails the user response.
  if (documentId) {
    try {
      await updateDemoRequestDelivery(documentId, {
        emailDelivered: emailOk,
        emailProvider: provider,
        emailError,
        deliveryAttemptedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof CmsWriteError ? error.message : "unknown CMS error";
      console.error(`[demo-request] ${requestId} delivery-update failed: ${message}`);
    }
  }

  // Step 4 — forward to the Enterprise Accelerator lead ingestion
  // endpoint. Kill-switch via ENTERPRISE_LEAD_INGEST_ENABLED so we can
  // dark-launch and roll back from Cloud Run env without redeploying.
  // Fire-and-forget: the lead is already durable in Strapi (Step 1)
  // and delivered to the sales inbox (Step 2) — a 5xx here never
  // fails the user's submission.
  if (
    process.env.ENTERPRISE_LEAD_INGEST_ENABLED === "true" &&
    isEnterpriseIngestConfigured()
  ) {
    try {
      const enterprisePayload = buildEnterprisePayload(createInput);
      const result = await forwardToEnterprise(enterprisePayload);
      if (result.ok) {
        console.log(
          `[demo-request] ${requestId} enterprise accepted lead_id=${result.leadId ?? "(none)"} is_new=${result.isNew ?? "(unknown)"}`,
        );
      } else if (result.missingFields && result.missingFields.length > 0) {
        console.error(
          `[demo-request] ${requestId} enterprise rejected missing_fields=[${result.missingFields.join(",")}]`,
        );
      } else {
        console.error(
          `[demo-request] ${requestId} enterprise forward failed: status=${result.status} ${result.error ?? ""}`.trim(),
        );
      }
    } catch (error) {
      // forwardToEnterprise is documented as non-throwing, so a throw
      // here would indicate a bug — log with full context so we can
      // fix it without masking a Step 1/2/3 success.
      const message = error instanceof Error ? error.message : "unknown error";
      console.error(
        `[demo-request] ${requestId} enterprise forward threw unexpectedly: ${message}`,
      );
    }
  }

  // Always return 200 to the user — the lead is either in Strapi or
  // has been logged. Never leak CMS/email internal state to the client.
  return res.status(200).json({
    ok: true,
    message: emailOk
      ? "Thanks! We will reach out shortly to schedule a demo."
      : "Thanks! Your request was received. We will follow up shortly.",
    delivery: {
      attempted: true,
      sent: emailOk,
      provider,
    },
  });
}
