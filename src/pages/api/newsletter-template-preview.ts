import type { NextApiRequest, NextApiResponse } from "next";
import {
  buildNewsletterTemplate,
} from "../../lib/newsletterTemplate";
import { defaultNewsletterItems } from "../../lib/newsletterCampaignDefaults";
import { isAdminAuthorized } from "../../lib/api-auth";

const ADMIN_KEY = process.env.NEWSLETTER_REPORT_API_KEY || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";

function normalizeText(value: unknown, maxLength = 200) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function readQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, message: "Method not allowed." });
  }
  if (!isAdminAuthorized(req, ADMIN_KEY)) {
    return res.status(401).json({ ok: false, message: "Unauthorized." });
  }

  const email = normalizeText(readQueryValue(req.query.email), 180).toLowerCase() || "sample@colaberry.ai";
  const format = normalizeText(readQueryValue(req.query.format), 12).toLowerCase() || "json";

  const template = buildNewsletterTemplate({
    recipientEmail: email,
    siteUrl: SITE_URL,
    subject: "Colaberry AI Signals Digest",
    heading: "Enterprise AI signals this week",
    preheader: "New platform updates, curated AI ratings, and deployment-ready insights.",
    intro:
      "A focused update on what shipped, what changed, and what matters for teams building with agents and MCP infrastructure.",
    ctaLabel: "Explore the platform",
    ctaHref: `${SITE_URL.replace(/\/$/, "")}/aixcelerator`,
    items: defaultNewsletterItems(SITE_URL),
  });

  if (format === "html") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(template.html);
  }
  if (format === "text") {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(template.text);
  }
  if (format !== "json") {
    return res.status(400).json({ ok: false, message: "Invalid format. Use json, html, or text." });
  }

  return res.status(200).json({
    ok: true,
    email,
    subject: template.subject,
    unsubscribeUrl: template.unsubscribeUrl,
    html: template.html,
    text: template.text,
  });
}
