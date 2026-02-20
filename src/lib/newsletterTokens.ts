import crypto from "crypto";

const TOKEN_SECRET = process.env.NEWSLETTER_UNSUBSCRIBE_SECRET || "";

function toBase64Url(input: string) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function sign(payload: string) {
  return crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
}

export function createUnsubscribeToken(email: string): string | null {
  if (!TOKEN_SECRET) return null;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;
  const payload = toBase64Url(normalizedEmail);
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  if (!TOKEN_SECRET || !token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expectedSignature = sign(payload);
  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
  try {
    const email = fromBase64Url(payload).trim().toLowerCase();
    return email || null;
  } catch {
    return null;
  }
}
