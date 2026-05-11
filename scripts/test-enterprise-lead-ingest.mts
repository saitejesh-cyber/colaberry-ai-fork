#!/usr/bin/env node --experimental-strip-types
/**
 * Smoke test for src/lib/enterpriseLeadIngest.ts buildEnterprisePayload.
 *
 * The project does not have a test runner (no Jest/Vitest). This file follows
 * the existing scripts/*.mjs convention — runnable directly via Node 22.6+
 * with --experimental-strip-types, OR via `npx tsx scripts/test-enterprise-lead-ingest.mts`.
 *
 *   node --experimental-strip-types scripts/test-enterprise-lead-ingest.mts
 *
 * Exits 0 on pass, 1 on fail. Only tests the pure shape function — no network calls.
 */

import { buildEnterprisePayload } from "../src/lib/enterpriseLeadIngest.ts";

type TestCase = {
  name: string;
  run: () => void;
};

let passed = 0;
let failed = 0;

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) {
    throw new Error(`assertion failed: ${message}`);
  }
}

function deepEqual<T>(a: T, b: T, message: string) {
  const an = JSON.stringify(a);
  const bn = JSON.stringify(b);
  if (an !== bn) {
    throw new Error(`${message}\n  expected: ${bn}\n  actual:   ${an}`);
  }
}

const tests: TestCase[] = [
  {
    name: "all fields present → correct shape, company_size renamed, role/timeline appended",
    run: () => {
      const result = buildEnterprisePayload({
        name: "Ada Lovelace",
        email: "ada@example.com",
        company: "Analytical Engines Inc",
        role: "VP Engineering",
        teamSize: "50-100",
        timeline: "30-60 days",
        message: "Want a walkthrough of the agent catalog.",
        sourcePage: "request-demo",
        sourcePath: "/request-demo",
        metadata: {
          requestId: "dr_abc123",
          utmSource: "linkedin",
          utmMedium: "social",
          referrer: "https://www.linkedin.com/posts/colaberry",
        },
      });
      assert(result.ok, "expected ok:true");
      if (!result.ok) return;
      assert(result.payload.email === "ada@example.com", "email lowercased+trimmed");
      assert(result.payload.company === "Analytical Engines Inc", "company passed through");
      assert(result.payload.company_size === "50-100", "company_size renamed from teamSize");
      assert(result.payload.phone === null, "phone null (not collected today)");
      assert(
        result.payload.message ===
          "Want a walkthrough of the agent catalog.\n\nRole: VP Engineering\nTimeline: 30-60 days",
        `message has role+timeline suffix, got: ${result.payload.message}`
      );
      assert(result.payload.utm_source === "linkedin", "utm_source captured");
      assert(result.payload.referrer === "https://www.linkedin.com/posts/colaberry", "referrer captured");
      assert(result.payload.request_id === "dr_abc123", "request_id captured");
    },
  },
  {
    name: "missing company → returns { missingFields: ['company'] }",
    run: () => {
      const result = buildEnterprisePayload({
        name: "Test",
        email: "test@example.com",
        company: "",
      });
      assert(!result.ok, "expected ok:false");
      if (result.ok) return;
      deepEqual(result.missingFields, ["company"], "missingFields lists company");
    },
  },
  {
    name: "missing email → returns missingFields containing 'email'",
    run: () => {
      const result = buildEnterprisePayload({
        email: "",
        company: "Acme",
      });
      assert(!result.ok, "expected ok:false");
      if (result.ok) return;
      assert(result.missingFields.includes("email"), "missingFields contains email");
    },
  },
  {
    name: "role present, timeline absent → message suffix has Role only",
    run: () => {
      const result = buildEnterprisePayload({
        email: "x@y.com",
        company: "Acme",
        message: "Hello",
        role: "Director of Analytics",
      });
      assert(result.ok, "expected ok:true");
      if (!result.ok) return;
      assert(
        result.payload.message === "Hello\n\nRole: Director of Analytics",
        `expected role-only suffix, got: ${result.payload.message}`
      );
    },
  },
  {
    name: "empty role + timeline + message → message becomes null",
    run: () => {
      const result = buildEnterprisePayload({
        email: "x@y.com",
        company: "Acme",
      });
      assert(result.ok, "expected ok:true");
      if (!result.ok) return;
      assert(result.payload.message === null, `expected null message, got: ${result.payload.message}`);
    },
  },
  {
    name: "email gets normalized (trimmed + lowercased)",
    run: () => {
      const result = buildEnterprisePayload({
        email: "  Mixed.CASE@Example.COM  ",
        company: "Acme",
      });
      assert(result.ok, "expected ok:true");
      if (!result.ok) return;
      assert(
        result.payload.email === "mixed.case@example.com",
        `expected normalized email, got: ${result.payload.email}`
      );
    },
  },
  {
    name: "unset optional fields are omitted from payload (no undefined keys)",
    run: () => {
      const result = buildEnterprisePayload({
        email: "a@b.com",
        company: "Acme",
      });
      assert(result.ok, "expected ok:true");
      if (!result.ok) return;
      const keys = Object.keys(result.payload).sort();
      // Required keys always present, optional keys omitted entirely
      deepEqual(
        keys,
        ["company", "company_size", "email", "message", "name", "phone"].sort(),
        "only required keys present when optional fields are unset"
      );
    },
  },
];

for (const t of tests) {
  try {
    t.run();
    console.log(`  ok  ${t.name}`);
    passed += 1;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`  FAIL ${t.name}\n       ${msg}`);
    failed += 1;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
