import type { NextApiRequest, NextApiResponse } from "next";
import { resolveSenderProvider, sendNewsletterEmail } from "../../lib/newsletterSender";

type DemoRequestPayload = {
  name?: string;
  email?: string;
  company?: string;
  role?: string;
  teamSize?: string;
  timeline?: string;
  message?: string;
  sourcePage?: string;
  sourcePath?: string;
  website?: string;
};

const TO_EMAIL = process.env.DEMO_REQUEST_TO_EMAIL || process.env.NEWSLETTER_REPLY_TO_EMAIL || "info@colaberry.com";
const REQUEST_TIMEOUT_MS = Number(process.env.DEMO_REQUEST_TIMEOUT_MS || 8000);
const MAX_MESSAGE_LENGTH = Number(process.env.DEMO_REQUEST_MAX_MESSAGE || 4000);

function normalizeText(value: string | undefined, max = 240) {
  if (!value) return "";
  return String(value).trim().slice(0, max);
}

function normalizeEmail(value: string | undefined) {
  if (!value) return "";
  return String(value).trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
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

  const payload = parsePayload(req);
  if (!payload) {
    return res.status(400).json({ ok: false, message: "Invalid request payload." });
  }

  const email = normalizeEmail(payload.email);
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ ok: false, message: "A valid email is required." });
  }

  if (payload.website && String(payload.website).trim().length > 0) {
    return res.status(200).json({ ok: true, message: "Thanks! We will be in touch." });
  }

  const name = normalizeText(payload.name, 120);
  const company = normalizeText(payload.company, 160);
  const role = normalizeText(payload.role, 120);
  const teamSize = normalizeText(payload.teamSize, 120);
  const timeline = normalizeText(payload.timeline, 120);
  const message = normalizeText(payload.message, MAX_MESSAGE_LENGTH);
  const sourcePage = normalizeText(payload.sourcePage, 120) || "request-demo";
  const sourcePath = normalizeText(payload.sourcePath, 240);

  const subject = `Demo request${company ? ` — ${company}` : ""}`;
  const detailLines = [
    `Name: ${name || "Not provided"}`,
    `Email: ${email}`,
    `Company: ${company || "Not provided"}`,
    `Role: ${role || "Not provided"}`,
    `Team size: ${teamSize || "Not provided"}`,
    `Timeline: ${timeline || "Not provided"}`,
    `Source page: ${sourcePage}`,
    `Source path: ${sourcePath || "Unknown"}`,
    "",
    "Message:",
    message || "No additional notes provided.",
  ];

  const text = detailLines.join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;">
      <h2 style="margin:0 0 12px;">New demo request</h2>
      <table style="border-collapse:collapse;font-size:14px;line-height:1.5;">
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Name</td><td>${name || "Not provided"}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Email</td><td>${email}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Company</td><td>${company || "Not provided"}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Role</td><td>${role || "Not provided"}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Team size</td><td>${teamSize || "Not provided"}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Timeline</td><td>${timeline || "Not provided"}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Source page</td><td>${sourcePage}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Source path</td><td>${sourcePath || "Unknown"}</td></tr>
      </table>
      <p style="margin:16px 0 4px;font-weight:600;">Message</p>
      <p style="margin:0;">${message || "No additional notes provided."}</p>
    </div>
  `;

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

    if (!delivery.ok) {
      console.error("[demo-request] send failed", delivery.error);
      return res.status(200).json({
        ok: true,
        message:
          "Thanks! Your request was received. We will follow up shortly.",
        delivery: {
          attempted: true,
          sent: false,
          provider: resolveSenderProvider(),
        },
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Thanks! We will reach out shortly to schedule a demo.",
      delivery: {
        attempted: true,
        sent: true,
        provider: resolveSenderProvider(),
      },
    });
  } catch (error) {
    console.error("[demo-request] error", error);
    return res.status(500).json({ ok: false, message: "Unable to send request right now." });
  }
}
