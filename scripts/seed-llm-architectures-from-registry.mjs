#!/usr/bin/env node
/**
 * seed-llm-architectures-from-registry.mjs
 *
 * Bootstrap the `llm-architecture` collection in Strapi from
 * `src/data/llm-architectures-registry.json`.
 *
 * Behaviour:
 *   - Reads the registry JSON (single source of truth synced from
 *     Raschka's public models.yml via `scripts/sync-llm-gallery.mjs`).
 *   - For each entry: `GET /api/llm-architectures?filters[slug][$eq]=<slug>`
 *       - 0 hits  → POST to create.
 *       - 1+ hits → PUT to update — BUT we only touch fields the registry
 *                    owns (name, organization, parameters, contextWindow,
 *                    decoderType, attention, keyFeatures, configUrl,
 *                    paperUrl, releaseDate, description). We **never**
 *                    overwrite `longDescription` or `deepDive` (human-edited
 *                    content in Strapi admin).
 *
 * This script is idempotent. Safe to re-run after a registry sync.
 *
 * Usage:
 *   # Bootstrap against local Strapi (reads .env.local)
 *   CMS_API_TOKEN=<token> \
 *     node scripts/seed-llm-architectures-from-registry.mjs
 *
 *   # Dry-run — print what would happen, no writes
 *   node scripts/seed-llm-architectures-from-registry.mjs --dry-run
 *
 *   # Target a non-local Strapi
 *   CMS_API_TOKEN=<token> \
 *     node scripts/seed-llm-architectures-from-registry.mjs \
 *       --url https://dev-cms.colaberry.ai
 *
 * Sprint: v4 — LLM Architecture Deep Dives (CMS Dynamic Zone)
 */

import process from "node:process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/* ── Arg parsing ───────────────────────────────────────────────────── */

function arg(name, fallback = undefined) {
  const flag = `--${name}`;
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const next = process.argv[idx + 1];
  if (!next || next.startsWith("--")) return true;
  return next;
}

// Strip trailing slash — Strapi's security middleware rejects `//api/…`
// as "Malicious Path", which silently bites scripts that inherit a
// `NEXT_PUBLIC_CMS_URL` ending in `/`.
const cmsUrl = (
  arg("url") ||
  process.env.NEXT_PUBLIC_CMS_URL ||
  process.env.CMS_URL ||
  "http://localhost:1338"
).replace(/\/+$/, "");

const token = arg("token") || process.env.CMS_API_TOKEN;
const dryRun = Boolean(arg("dry-run", false));

if (!dryRun && !token) {
  console.error("ERROR: CMS_API_TOKEN env var or --token flag required (or pass --dry-run to skip write).");
  process.exit(2);
}

/* ── Load registry ─────────────────────────────────────────────────── */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const registryPath = resolve(__dirname, "../src/data/llm-architectures-registry.json");

let registry;
try {
  registry = JSON.parse(readFileSync(registryPath, "utf-8"));
} catch (err) {
  console.error(`ERROR: failed to read registry at ${registryPath}:`, err.message);
  process.exit(1);
}

if (!Array.isArray(registry) || registry.length === 0) {
  console.error(`ERROR: registry at ${registryPath} is empty or malformed.`);
  process.exit(1);
}

console.log(`[seed] Loaded ${registry.length} entries from registry.`);
console.log(`[seed] Target CMS: ${cmsUrl}${dryRun ? " (DRY RUN)" : ""}`);

/* ── Strapi decoderType enum validation ────────────────────────────── */

const VALID_DECODER_TYPES = ["Dense", "MoE", "Hybrid", "Recurrent"];

function normalizeDecoderType(raw) {
  if (!raw) return "Dense";
  return VALID_DECODER_TYPES.includes(raw) ? raw : "Dense";
}

/* ── Registry entry → Strapi payload ───────────────────────────────── */

function toStrapiPayload(entry) {
  return {
    slug: entry.slug,
    name: entry.name,
    organization: entry.organization || "Unknown",
    description: entry.description ?? null,
    parameters: entry.parameters || "Unknown",
    activeParameters: entry.activeParameters ?? null,
    contextWindow: entry.contextWindow || "Unknown",
    vocabSize: entry.vocabSize ?? null,
    releaseDate: entry.releaseDate || "Unknown",
    decoderType: normalizeDecoderType(entry.decoderType),
    attention: entry.attention || "MHA",
    keyFeatures: Array.isArray(entry.keyFeatures) ? entry.keyFeatures : [],
    configUrl: entry.configUrl ?? null,
    paperUrl: entry.paperUrl ?? null,
    visibility: "public",
    verified: true,
    // NOTE: we intentionally omit `longDescription` and `deepDive` so
    // re-running this script never clobbers human-edited content.
  };
}

/* ── Strapi helpers ────────────────────────────────────────────────── */

const headers = token
  ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
  : { "Content-Type": "application/json" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Strapi ships with an aggressive default rate limiter (`@strapi/provider-
 * ratelimit` via koa2-ratelimit) that caps anonymous/authenticated requests
 * per IP per minute. Seeding 52 records × 2 calls each (find + create)
 * trivially blows the budget. We:
 *   1. Throttle every request with a baseline delay (BETWEEN_REQ_MS).
 *   2. Retry 429s with exponential backoff (up to MAX_RETRIES).
 */
const BETWEEN_REQ_MS = 400;
const MAX_RETRIES = 6;

async function fetchWithRetry(url, init, label) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, init);
    if (res.ok) return res;
    if (res.status === 429) {
      const backoffMs = Math.min(30_000, 1500 * Math.pow(2, attempt));
      console.log(`    ↻ ${label} got 429; backing off ${backoffMs}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
      await sleep(backoffMs);
      continue;
    }
    // Non-retryable HTTP error — throw with body text
    throw new Error(`${label} failed: ${res.status} ${await res.text()}`);
  }
  throw new Error(`${label} exhausted ${MAX_RETRIES + 1} retries on 429`);
}

async function findBySlug(slug) {
  const url = `${cmsUrl}/api/llm-architectures?filters[slug][$eq]=${encodeURIComponent(slug)}`;
  const res = await fetchWithRetry(url, { headers }, `GET ${slug}`);
  const json = await res.json();
  await sleep(BETWEEN_REQ_MS);
  return json?.data?.[0] || null;
}

async function createRecord(payload) {
  const res = await fetchWithRetry(
    `${cmsUrl}/api/llm-architectures`,
    { method: "POST", headers, body: JSON.stringify({ data: payload }) },
    `POST ${payload.slug}`,
  );
  const json = await res.json();
  await sleep(BETWEEN_REQ_MS);
  return json;
}

async function updateRecord(documentId, payload) {
  const res = await fetchWithRetry(
    `${cmsUrl}/api/llm-architectures/${documentId}`,
    { method: "PUT", headers, body: JSON.stringify({ data: payload }) },
    `PUT ${payload.slug}`,
  );
  const json = await res.json();
  await sleep(BETWEEN_REQ_MS);
  return json;
}

/* ── Main loop ─────────────────────────────────────────────────────── */

const stats = { created: 0, updated: 0, skipped: 0, failed: 0 };
const failures = [];

for (let i = 0; i < registry.length; i++) {
  const entry = registry[i];
  const payload = toStrapiPayload(entry);
  const progress = `[${i + 1}/${registry.length}]`;

  if (dryRun) {
    console.log(`${progress} DRY-RUN ${payload.slug} (${payload.name})`);
    stats.skipped++;
    continue;
  }

  try {
    const existing = await findBySlug(payload.slug);
    if (existing) {
      const docId = existing.documentId || existing.id;
      await updateRecord(docId, payload);
      console.log(`${progress} UPDATED ${payload.slug} (doc=${docId})`);
      stats.updated++;
    } else {
      await createRecord(payload);
      console.log(`${progress} CREATED ${payload.slug}`);
      stats.created++;
    }
  } catch (err) {
    console.error(`${progress} FAILED  ${payload.slug}: ${err.message}`);
    failures.push({ slug: payload.slug, error: err.message });
    stats.failed++;
  }
}

/* ── Summary ───────────────────────────────────────────────────────── */

console.log("\n[seed] Summary");
console.log(`  created: ${stats.created}`);
console.log(`  updated: ${stats.updated}`);
console.log(`  skipped: ${stats.skipped}`);
console.log(`  failed:  ${stats.failed}`);

if (failures.length > 0) {
  console.error("\n[seed] Failures:");
  for (const f of failures) console.error(`  - ${f.slug}: ${f.error}`);
  process.exit(1);
}

process.exit(0);
