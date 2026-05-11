#!/usr/bin/env node
/**
 * verify-enterprise-lead-ingest.mjs
 *
 * Standalone assertion script for the pure helpers in
 * src/lib/enterpriseLeadIngest.ts. Covers:
 *   - buildEnterprisePayload shape + field renaming (teamSize → company_size)
 *   - buildEnterprisePayload null-coercion for empty strings
 *   - role + timeline preserved in message suffix
 *   - enforceRequired returns missing-field list
 *   - isEnterpriseIngestConfigured true when URL is set
 *
 * Node 24+ can execute .ts files natively via type-stripping, so we
 * dynamic-import the source TypeScript module directly. Run with:
 *
 *   node scripts/verify-enterprise-lead-ingest.mjs
 *
 * Exits 0 on success, 1 on any assertion failure.
 */

import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

const sourceUrl = pathToFileURL(
  path.resolve(process.cwd(), "src/lib/enterpriseLeadIngest.ts"),
).href;

const { buildEnterprisePayload, enforceRequired, isEnterpriseIngestConfigured } =
  await import(sourceUrl);

const baseInput = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+44 20 7946 0958",
  company: "Analytical Engines",
  role: "Chief Engineer",
  teamSize: "10-50",
  timeline: "this-quarter",
  message: "Integrate the 3-layer ontology with our pipeline.",
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
    referrer: "https://www.linkedin.com/feed/",
    userAgent: "Mozilla/5.0 (Macintosh)",
  },
};

// ─── Case 1 ───────────────────────────────────────────────────────
// All fields populated — payload maps cleanly, teamSize renamed to
// company_size, role + timeline appended as message suffix.
{
  const payload = buildEnterprisePayload(baseInput);
  assert.equal(payload.name, "Ada Lovelace", "name maps to top level");
  assert.equal(payload.email, "ada@example.com", "email preserved");
  assert.equal(payload.phone, "+44 20 7946 0958", "phone propagates when provided");
  assert.equal(payload.company, "Analytical Engines", "company preserved");
  assert.equal(payload.company_size, "10-50", "teamSize renamed to company_size");
  assert.equal(
    payload.message,
    "Integrate the 3-layer ontology with our pipeline.\n\nRole: Chief Engineer\nTimeline: this-quarter",
    "role + timeline appended as message suffix",
  );
  assert.equal(payload.context.source_page, "request-demo");
  assert.equal(payload.context.source_path, "/request-demo");
  assert.equal(payload.context.request_id, baseInput.requestId);
  assert.equal(payload.context.utm_source, "linkedin");
  assert.equal(payload.context.utm_term, null, "empty UTM fields collapse to null");
  assert.equal(payload.context.utm_content, null);
  assert.equal(payload.context.referrer, "https://www.linkedin.com/feed/");
  console.log("✓ Case 1: full-fields payload mapping");
}

// ─── Case 2 ───────────────────────────────────────────────────────
// Empty company → enforceRequired flags it, buildEnterprisePayload
// still builds (pure shape) so the guard is the only gatekeeper.
{
  const payload = buildEnterprisePayload({ ...baseInput, company: "" });
  const missing = enforceRequired(payload);
  assert.deepEqual(missing, ["company"], "missing company is flagged");
  assert.equal(payload.company, "", "buildEnterprisePayload does not filter");
  console.log("✓ Case 2: missing company flagged by enforceRequired");
}

// ─── Case 3 ───────────────────────────────────────────────────────
// Empty email → enforceRequired flags it.
{
  const payload = buildEnterprisePayload({ ...baseInput, email: "" });
  const missing = enforceRequired(payload);
  assert.deepEqual(missing, ["email"], "missing email is flagged");
  console.log("✓ Case 3: missing email flagged");
}

// ─── Case 4 ───────────────────────────────────────────────────────
// Empty both email + company → both flagged.
{
  const payload = buildEnterprisePayload({ ...baseInput, email: "", company: "" });
  const missing = enforceRequired(payload);
  assert.deepEqual(missing, ["email", "company"], "both missing fields flagged");
  console.log("✓ Case 4: missing email + company both flagged");
}

// ─── Case 5 ───────────────────────────────────────────────────────
// Role present, timeline absent — suffix includes role only.
{
  const payload = buildEnterprisePayload({ ...baseInput, timeline: "" });
  assert.equal(
    payload.message,
    "Integrate the 3-layer ontology with our pipeline.\n\nRole: Chief Engineer",
    "role-only suffix",
  );
  console.log("✓ Case 5: role only (no timeline) suffix");
}

// ─── Case 6 ───────────────────────────────────────────────────────
// Both role + timeline absent AND message absent — message is null.
{
  const payload = buildEnterprisePayload({
    ...baseInput,
    message: "",
    role: "",
    timeline: "",
  });
  assert.equal(payload.message, null, "fully empty message + no suffix → null");
  console.log("✓ Case 6: empty message + no role/timeline → null");
}

// ─── Case 7 ───────────────────────────────────────────────────────
// Message absent but role present — message becomes just the suffix.
{
  const payload = buildEnterprisePayload({ ...baseInput, message: "", timeline: "" });
  assert.equal(payload.message, "Role: Chief Engineer", "suffix-only message body");
  console.log("✓ Case 7: empty message + role-only → suffix only");
}

// ─── Case 8 ───────────────────────────────────────────────────────
// Empty phone → null (not "", because Enterprise schema prefers
// explicit absence over empty string).
{
  const payload = buildEnterprisePayload({ ...baseInput, phone: "" });
  assert.equal(payload.phone, null, "empty phone collapses to null");
  console.log("✓ Case 8: empty phone collapses to null");
}

// ─── Case 9 ───────────────────────────────────────────────────────
// Whitespace-only phone → null (normalizeText on the server would
// already trim, but the pure shaper should match that invariant).
{
  const payload = buildEnterprisePayload({ ...baseInput, phone: "   " });
  assert.equal(payload.phone, null, "whitespace-only phone collapses to null");
  console.log("✓ Case 9: whitespace-only phone collapses to null");
}

// ─── Case 10 ──────────────────────────────────────────────────────
// isEnterpriseIngestConfigured returns true when URL is set (default
// endpoint is non-empty, so this should always be true unless the
// env explicitly overrides with an empty string).
{
  const configured = isEnterpriseIngestConfigured();
  assert.equal(configured, true, "default endpoint is configured");
  console.log("✓ Case 10: default endpoint configured");
}

console.log("\nAll enterprise-lead-ingest assertions passed.");
process.exit(0);
