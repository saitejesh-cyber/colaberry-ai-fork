#!/usr/bin/env node
/**
 * verify-demo-request-store.mjs
 *
 * Standalone assertion script for the pure helpers in
 * src/lib/demoRequestStore.ts. Covers:
 *   - buildCreatePayload shape + null-coercion
 *   - buildDeliveryUpdatePayload shape
 *   - status default = "new" at create time
 *   - metadata nesting preserved
 *
 * Node 24+ can execute .ts files natively via type-stripping, so we
 * dynamic-import the source TypeScript module directly. Run with:
 *
 *   node scripts/verify-demo-request-store.mjs
 *
 * Exits 0 on success, 1 on any assertion failure.
 */

import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

const sourceUrl = pathToFileURL(
  path.resolve(process.cwd(), "src/lib/demoRequestStore.ts"),
).href;

const { buildCreatePayload, buildDeliveryUpdatePayload } = await import(
  sourceUrl
);

const baseInput = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+44 20 7946 0958",
  company: "Analytical Engines",
  role: "Chief Engineer",
  teamSize: "10-50",
  timeline: "this-quarter",
  message: "We want to integrate the 3-layer ontology with our pipeline.",
  sourcePage: "request-demo",
  sourcePath: "/request-demo",
  requestId: "00000000-0000-4000-8000-000000000001",
  ipHash: "abc123def456abc123def456",
  userAgentHash: "fed456cba321fed456cba321",
  metadata: {
    utmSource: "linkedin",
    utmMedium: "organic",
    utmCampaign: "launch-week",
    utmTerm: "",
    utmContent: "",
    referrer: "https://www.linkedin.com/",
    userAgent: "Mozilla/5.0 (test)",
  },
};

// ── Test 1 ─ happy-path create payload shape ────────────────────────
{
  const payload = buildCreatePayload(baseInput);
  assert.ok(payload.data, "payload.data must exist");
  assert.equal(payload.data.name, "Ada Lovelace");
  assert.equal(payload.data.email, "ada@example.com");
  assert.equal(payload.data.status, "new", "default status must be 'new'");
  assert.equal(payload.data.emailDelivered, false, "emailDelivered default must be false");
  assert.equal(payload.data.phone, "+44 20 7946 0958", "phone propagates to Strapi payload");
  assert.equal(payload.data.company, "Analytical Engines");
  assert.equal(payload.data.sourcePage, "request-demo");
  assert.equal(payload.data.requestId, baseInput.requestId);
  assert.ok(payload.data.metadata, "metadata must be nested object");
  assert.equal(payload.data.metadata.utmSource, "linkedin");
  assert.equal(payload.data.metadata.utmTerm, null, "empty UTM terms coerce to null");
  console.log("✔ test 1: happy-path create payload");
}

// ── Test 2 ─ empty-string fields coerce to null ─────────────────────
{
  const sparseInput = {
    ...baseInput,
    phone: "",
    company: "",
    role: "",
    teamSize: "",
    timeline: "",
    message: "",
    sourcePath: "",
    metadata: {
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
      utmTerm: "",
      utmContent: "",
      referrer: "",
      userAgent: "",
    },
  };
  const payload = buildCreatePayload(sparseInput);
  assert.equal(payload.data.phone, null, "empty phone → null");
  assert.equal(payload.data.company, null, "empty company → null");
  assert.equal(payload.data.role, null);
  assert.equal(payload.data.teamSize, null);
  assert.equal(payload.data.timeline, null);
  assert.equal(payload.data.message, null);
  assert.equal(payload.data.sourcePath, null);
  assert.equal(payload.data.metadata.utmSource, null);
  assert.equal(payload.data.metadata.referrer, null);
  // Required fields stay as strings — never nulled
  assert.equal(payload.data.name, baseInput.name);
  assert.equal(payload.data.email, baseInput.email);
  console.log("✔ test 2: empty-string coercion to null for optional fields");
}

// ── Test 3 ─ sourcePage default when blank ──────────────────────────
{
  const input = { ...baseInput, sourcePage: "" };
  const payload = buildCreatePayload(input);
  assert.equal(payload.data.sourcePage, "unknown", "blank sourcePage → 'unknown'");
  console.log("✔ test 3: sourcePage default");
}

// ── Test 4 ─ delivery update payload (success) ──────────────────────
{
  const payload = buildDeliveryUpdatePayload({
    emailDelivered: true,
    emailProvider: "resend",
    emailError: null,
    deliveryAttemptedAt: "2026-04-09T12:00:00.000Z",
  });
  assert.equal(payload.data.emailDelivered, true);
  assert.equal(payload.data.emailProvider, "resend");
  assert.equal(payload.data.emailError, null);
  assert.equal(payload.data.deliveryAttemptedAt, "2026-04-09T12:00:00.000Z");
  // Must NOT leak any of the original lead fields — only delivery state
  assert.equal(payload.data.name, undefined, "delivery update must not touch name");
  assert.equal(payload.data.email, undefined, "delivery update must not touch email");
  assert.equal(payload.data.status, undefined, "delivery update must not touch status");
  console.log("✔ test 4: delivery update payload (success)");
}

// ── Test 5 ─ delivery update payload (failure carries error message) ─
{
  const payload = buildDeliveryUpdatePayload({
    emailDelivered: false,
    emailProvider: "sendgrid",
    emailError: "422 Unprocessable: recipient rejected",
    deliveryAttemptedAt: "2026-04-09T12:05:00.000Z",
  });
  assert.equal(payload.data.emailDelivered, false);
  assert.equal(payload.data.emailProvider, "sendgrid");
  assert.equal(payload.data.emailError, "422 Unprocessable: recipient rejected");
  console.log("✔ test 5: delivery update payload (failure)");
}

console.log("\nAll demo-request-store helper assertions passed.\n");
