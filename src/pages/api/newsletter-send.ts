import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { defaultNewsletterItems } from "../../lib/newsletterCampaignDefaults";
import { buildNewsletterTemplate } from "../../lib/newsletterTemplate";
import { resolveSenderProvider, sendNewsletterEmail } from "../../lib/newsletterSender";

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL;
const CMS_TOKEN = process.env.CMS_API_TOKEN;
const ADMIN_KEY = process.env.NEWSLETTER_REPORT_API_KEY || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";
const REQUEST_TIMEOUT_MS = Number(process.env.NEWSLETTER_API_TIMEOUT_MS || 8000);
const MAX_BATCH_LIMIT = Number(process.env.NEWSLETTER_SEND_MAX_BATCH || 300);
const DEFAULT_BATCH_LIMIT = Number(process.env.NEWSLETTER_SEND_DEFAULT_BATCH || 25);
const DEFAULT_DRY_RUN = process.env.NEWSLETTER_SEND_DRY_RUN !== "false";

type CMSPagination = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
};

type CMSMeta = {
  pagination?: CMSPagination;
};

type SubscriberAttributes = {
  email?: string | null;
  status?: string | null;
};

type CMSCollectionResponse = {
  data?: Array<{
    id?: number | string;
    documentId?: string;
    attributes?: SubscriberAttributes;
  }>;
  meta?: CMSMeta;
};

type SendPayload = {
  mode?: unknown;
  recipientEmail?: unknown;
  subject?: unknown;
  heading?: unknown;
  intro?: unknown;
  ctaLabel?: unknown;
  ctaHref?: unknown;
  limit?: unknown;
  dryRun?: unknown;
  confirm?: unknown;
};

type Subscriber = {
  id: string;
  email: string;
};

function normalizeText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function readApiKey(req: NextApiRequest) {
  const fromHeader = req.headers["x-colaberry-admin-key"];
  const apiKey = Array.isArray(fromHeader) ? fromHeader[0] || "" : fromHeader || "";
  if (apiKey) return apiKey;
  const auth = req.headers.authorization;
  const bearer = Array.isArray(auth) ? auth[0] || "" : auth || "";
  const prefix = "Bearer ";
  if (bearer.startsWith(prefix)) {
    return bearer.slice(prefix.length).trim();
  }
  return "";
}

function isLocalDevelopmentRequest(req: NextApiRequest) {
  if (process.env.NODE_ENV === "production") return false;
  const rawHost = req.headers.host;
  const host = Array.isArray(rawHost) ? rawHost[0] || "" : rawHost || "";
  return /^localhost(?::\d+)?$/i.test(host) || /^127\.0\.0\.1(?::\d+)?$/i.test(host);
}

function isAuthorized(req: NextApiRequest) {
  if (isLocalDevelopmentRequest(req)) return true;
  if (!ADMIN_KEY) return false;
  return readApiKey(req) === ADMIN_KEY;
}

function parsePayload(req: NextApiRequest): SendPayload | null {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body as SendPayload;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as SendPayload;
    } catch {
      return null;
    }
  }
  return null;
}

async function cmsFetch<T>(path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${CMS_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CMS_TOKEN}`,
        ...(init.headers || {}),
      },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`CMS ${response.status}: ${text || "request failed"}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSubscribedSubscribers(limit: number): Promise<Subscriber[]> {
  const pageSize = 100;
  const rows: Subscriber[] = [];
  let page = 1;

  while (rows.length < limit) {
    const response = await cmsFetch<CMSCollectionResponse>(
      `/api/newsletter-subscribers?pagination[page]=${page}&pagination[pageSize]=${pageSize}&filters[status][$eq]=subscribed&fields[0]=email&fields[1]=status&sort=createdAt:desc`
    );

    const items = response.data || [];
    for (const item of items) {
      const attrs = item.attributes || {};
      const email = normalizeText(attrs.email, 200).toLowerCase();
      if (!email) continue;
      rows.push({
        id: String(item.documentId || item.id || ""),
        email,
      });
      if (rows.length >= limit) break;
    }

    const pageCount = response.meta?.pagination?.pageCount || page;
    if (page >= pageCount) break;
    page += 1;
  }

  return rows.slice(0, limit);
}

function parseBoolean(value: unknown, defaultValue: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return defaultValue;
}

function parsePositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function createTemplateForRecipient(email: string, payload: SendPayload) {
  const subject = normalizeText(payload.subject, 180) || "Colaberry AI Signals Digest";
  const heading = normalizeText(payload.heading, 140) || "Enterprise AI signals this week";
  const intro =
    normalizeText(payload.intro, 700) ||
    "A focused update on what shipped, what changed, and what matters for teams building with agents and MCP infrastructure.";
  const ctaLabel = normalizeText(payload.ctaLabel, 50) || "Explore the platform";
  const ctaHref = normalizeText(payload.ctaHref, 500) || `${SITE_URL.replace(/\/$/, "")}/aixcelerator`;

  return buildNewsletterTemplate({
    recipientEmail: email,
    subject,
    heading,
    intro,
    ctaLabel,
    ctaHref,
    siteUrl: SITE_URL,
    items: defaultNewsletterItems(SITE_URL),
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, message: "Method not allowed." });
  }
  if (!CMS_URL || !CMS_TOKEN) {
    return res.status(503).json({ ok: false, message: "Newsletter send is unavailable." });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, message: "Unauthorized." });
  }

  const payload = parsePayload(req);
  if (!payload) {
    return res.status(400).json({ ok: false, message: "Invalid payload." });
  }

  const mode = normalizeText(payload.mode, 20).toLowerCase() || "test";
  if (mode !== "test" && mode !== "campaign") {
    return res.status(400).json({ ok: false, message: "Invalid mode. Use test or campaign." });
  }

  const dryRun = parseBoolean(payload.dryRun, DEFAULT_DRY_RUN);
  const provider = resolveSenderProvider();
  const requestId = crypto.randomUUID();

  try {
    if (mode === "test") {
      const email = normalizeText(payload.recipientEmail, 200).toLowerCase();
      if (!email) {
        return res.status(400).json({ ok: false, message: "recipientEmail is required in test mode." });
      }

      const template = createTemplateForRecipient(email, payload);
      if (dryRun) {
        return res.status(200).json({
          ok: true,
          requestId,
          mode,
          dryRun,
          provider,
          result: {
            recipient: email,
            subject: template.subject,
            unsubscribeUrl: template.unsubscribeUrl,
          },
        });
      }

      const sendResult = await sendNewsletterEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
      if (!sendResult.ok) {
        return res.status(502).json({
          ok: false,
          requestId,
          mode,
          provider,
          message: sendResult.error || "Unable to send test email.",
        });
      }

      return res.status(200).json({
        ok: true,
        requestId,
        mode,
        dryRun: false,
        provider,
        result: {
          recipient: email,
          messageId: sendResult.id || null,
        },
      });
    }

    const confirm = normalizeText(payload.confirm, 20).toUpperCase();
    if (confirm !== "SEND") {
      return res.status(400).json({
        ok: false,
        message: "Campaign send requires confirm=SEND.",
      });
    }

    const limit = Math.min(parsePositiveInt(payload.limit, DEFAULT_BATCH_LIMIT), MAX_BATCH_LIMIT);
    const recipients = await fetchSubscribedSubscribers(limit);
    if (!recipients.length) {
      return res.status(200).json({
        ok: true,
        requestId,
        mode,
        dryRun,
        provider,
        total: 0,
        sent: 0,
        failed: 0,
      });
    }

    let sent = 0;
    let failed = 0;
    const failures: Array<{ email: string; error: string }> = [];

    for (const recipient of recipients) {
      const template = createTemplateForRecipient(recipient.email, payload);
      if (dryRun) {
        sent += 1;
        continue;
      }

      const sendResult = await sendNewsletterEmail({
        to: recipient.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
      if (sendResult.ok) {
        sent += 1;
      } else {
        failed += 1;
        failures.push({
          email: recipient.email,
          error: sendResult.error || "send failed",
        });
      }
    }

    return res.status(200).json({
      ok: true,
      requestId,
      mode,
      dryRun,
      provider,
      total: recipients.length,
      sent,
      failed,
      failures: failures.slice(0, 25),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error(`[newsletter-send] ${requestId} ${message}`);
    return res.status(500).json({
      ok: false,
      requestId,
      message: "Newsletter send failed.",
    });
  }
}
