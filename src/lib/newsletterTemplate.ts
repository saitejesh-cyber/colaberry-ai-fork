import { createUnsubscribeToken } from "./newsletterTokens";

const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";

export type NewsletterTemplateItem = {
  title: string;
  description?: string;
  href: string;
  label?: string;
};

export type NewsletterTemplateInput = {
  recipientEmail: string;
  subject?: string;
  preheader?: string;
  heading?: string;
  intro?: string;
  ctaLabel?: string;
  ctaHref?: string;
  items?: NewsletterTemplateItem[];
  siteUrl?: string;
};

export type NewsletterTemplateOutput = {
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
};

function normalizeText(value: string, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveUnsubscribeUrl(email: string, siteUrl: string) {
  const token = createUnsubscribeToken(email);
  if (token) {
    return `${siteUrl.replace(/\/$/, "")}/unsubscribe?token=${encodeURIComponent(token)}`;
  }
  return `${siteUrl.replace(/\/$/, "")}/unsubscribe?email=${encodeURIComponent(email)}`;
}

function buildTextItems(items: NewsletterTemplateItem[]) {
  return items
    .map((item, index) => {
      const title = normalizeText(item.title, 180);
      const description = normalizeText(item.description || "", 320);
      const href = normalizeText(item.href, 500);
      return `${index + 1}. ${title}${description ? `\n   ${description}` : ""}\n   ${href}`;
    })
    .join("\n\n");
}

function buildHtmlItems(items: NewsletterTemplateItem[]) {
  return items
    .map((item) => {
      const title = escapeHtml(normalizeText(item.title, 180));
      const description = escapeHtml(normalizeText(item.description || "", 320));
      const href = escapeHtml(normalizeText(item.href, 500));
      const label = escapeHtml(normalizeText(item.label || "Read more", 40));
      return `
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid #e2e8f0;">
            <div style="font-size:16px;font-weight:600;line-height:1.4;color:#0f172a;">${title}</div>
            ${description ? `<div style="margin-top:6px;font-size:14px;line-height:1.55;color:#334155;">${description}</div>` : ""}
            <div style="margin-top:10px;">
              <a href="${href}" target="_blank" rel="noreferrer noopener" style="font-size:13px;font-weight:600;color:#0f4da8;text-decoration:none;">${label} →</a>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

export function buildNewsletterTemplate(input: NewsletterTemplateInput): NewsletterTemplateOutput {
  const recipientEmail = normalizeText(input.recipientEmail, 180).toLowerCase();
  const siteUrl = normalizeText(input.siteUrl || DEFAULT_SITE_URL, 200) || DEFAULT_SITE_URL;
  const subject = normalizeText(input.subject || "Colaberry AI Weekly Signals", 140);
  const preheader = normalizeText(
    input.preheader || "Product updates, enterprise AI signals, and curated briefings.",
    180
  );
  const heading = normalizeText(input.heading || "Colaberry AI updates", 120);
  const intro = normalizeText(
    input.intro ||
      "Here are the latest releases and curated enterprise AI insights from the Colaberry platform.",
    420
  );
  const ctaLabel = normalizeText(input.ctaLabel || "Explore updates", 40);
  const ctaHref = normalizeText(input.ctaHref || `${siteUrl.replace(/\/$/, "")}/updates`, 500);
  const items = (input.items || []).slice(0, 12);
  const unsubscribeUrl = resolveUnsubscribeUrl(recipientEmail, siteUrl);

  const text = [
    `${subject}`,
    "",
    intro,
    "",
    items.length ? buildTextItems(items) : "No updates in this issue.",
    "",
    `Explore more: ${ctaHref}`,
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");

  const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f6fb;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding:28px 12px;background:#f3f6fb;">
      <tr>
        <td align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="640" style="max-width:640px;background:#ffffff;border:1px solid #dbe5f5;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:22px 24px;background:linear-gradient(120deg,#031833,#0f4da8);color:#ffffff;">
                <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.85;">Colaberry AI</div>
                <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;font-weight:700;">${escapeHtml(heading)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 24px 10px;">
                <p style="margin:0;font-size:15px;line-height:1.65;color:#334155;">${escapeHtml(intro)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  ${items.length ? buildHtmlItems(items) : '<tr><td style="padding:14px 0;color:#64748b;">No updates in this issue.</td></tr>'}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 24px 8px;">
                <a href="${escapeHtml(ctaHref)}" target="_blank" rel="noreferrer noopener" style="display:inline-block;background:#0f4da8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 16px;border-radius:999px;">${escapeHtml(ctaLabel)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 22px;font-size:12px;line-height:1.55;color:#64748b;border-top:1px solid #e2e8f0;">
                You are receiving this because you subscribed to Colaberry AI updates.
                <br />
                <a href="${escapeHtml(unsubscribeUrl)}" target="_blank" rel="noreferrer noopener" style="color:#0f4da8;text-decoration:underline;">Unsubscribe</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject,
    html,
    text,
    unsubscribeUrl,
  };
}
