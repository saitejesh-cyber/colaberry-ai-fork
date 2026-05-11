#!/usr/bin/env node
/**
 * author-llm-deep-dive.mjs
 *
 * Pushes a structured deep-dive payload (headings, paragraphs, callouts,
 * code blocks, tables, lists, references) into the `deepDive` Dynamic Zone
 * on an `llm-architecture` record in Strapi v5.
 *
 * Deep-dive content is stored as plain JS modules under
 * `scripts/deep-dives/<slug>.mjs`, each exporting:
 *    export const slug = "<slug>";
 *    export const blocks = [ ...DeepDiveBlock[] ];
 *
 * Usage:
 *   # Push the Llama 3.2 3B flagship
 *   CMS_API_TOKEN=<token> node scripts/author-llm-deep-dive.mjs --slug llama-3-2-3b
 *
 *   # Push every content module under scripts/deep-dives/
 *   CMS_API_TOKEN=<token> node scripts/author-llm-deep-dive.mjs --all
 *
 *   # Dry run (prints what would be pushed, writes nothing)
 *   node scripts/author-llm-deep-dive.mjs --slug llama-3-2-3b --dry-run
 *
 * Design choices:
 *   - Idempotent: fully replaces `deepDive` for the target record, so
 *     re-running with updated content overwrites cleanly.
 *   - Only touches `deepDive`. Never writes `longDescription` or any
 *     registry-owned field.
 *   - Shares the same rate-limit + retry pattern as
 *     `scripts/seed-llm-architectures-from-registry.mjs` (Strapi's default
 *     rate limiter bites aggressively on write bursts).
 *
 * Sprint: v4 — LLM Architecture Deep Dives (CMS Dynamic Zone)
 */

import process from "node:process";
import { readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/* ── Arg parsing ─────────────────────────────────────────────────── */

function arg(name, fallback = undefined) {
  const flag = `--${name}`;
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const next = process.argv[idx + 1];
  if (!next || next.startsWith("--")) return true;
  return next;
}

const cmsUrl = (
  arg("url") ||
  process.env.NEXT_PUBLIC_CMS_URL ||
  process.env.CMS_URL ||
  "http://localhost:1338"
).replace(/\/+$/, "");

const token = arg("token") || process.env.CMS_API_TOKEN;
const dryRun = Boolean(arg("dry-run", false));
const slugArg = arg("slug");
const all = Boolean(arg("all", false));

if (!slugArg && !all) {
  console.error("ERROR: pass --slug <slug> or --all");
  process.exit(2);
}
if (!dryRun && !token) {
  console.error("ERROR: CMS_API_TOKEN required (or pass --dry-run).");
  process.exit(2);
}

/* ── Load deep-dive modules ─────────────────────────────────────── */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const contentDir = resolve(__dirname, "deep-dives");

async function loadContent(slug) {
  const path = join(contentDir, `${slug}.mjs`);
  try {
    statSync(path);
  } catch {
    throw new Error(`Content module not found: ${path}`);
  }
  const mod = await import(pathToFileURL(path).href);
  if (!Array.isArray(mod.blocks) || mod.blocks.length === 0) {
    throw new Error(`${path} exports no blocks[]`);
  }
  if (!mod.slug) throw new Error(`${path} missing exported slug`);
  if (mod.slug !== slug) {
    throw new Error(`${path} slug mismatch: file=${slug} module=${mod.slug}`);
  }
  return mod;
}

async function loadAllContent() {
  let entries;
  try {
    entries = readdirSync(contentDir);
  } catch {
    throw new Error(`Content directory missing: ${contentDir}`);
  }
  const slugs = entries
    .filter((f) => f.endsWith(".mjs"))
    .map((f) => f.replace(/\.mjs$/, ""))
    .sort();
  const mods = [];
  for (const slug of slugs) mods.push(await loadContent(slug));
  return mods;
}

/* ── Strapi helpers ─────────────────────────────────────────────── */

const headers = token
  ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
  : { "Content-Type": "application/json" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BETWEEN_REQ_MS = 400;
const MAX_RETRIES = 6;

async function fetchWithRetry(url, init, label) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, init);
    if (res.ok) return res;
    if (res.status === 429) {
      const backoffMs = Math.min(30_000, 1500 * Math.pow(2, attempt));
      console.log(`    ↻ ${label} got 429; backing off ${backoffMs}ms`);
      await sleep(backoffMs);
      continue;
    }
    throw new Error(`${label} failed: ${res.status} ${await res.text()}`);
  }
  throw new Error(`${label} exhausted ${MAX_RETRIES} retries on 429`);
}

async function findDocumentIdBySlug(slug) {
  const url =
    `${cmsUrl}/api/llm-architectures` +
    `?filters%5Bslug%5D%5B%24eq%5D=${encodeURIComponent(slug)}` +
    `&pagination%5BpageSize%5D=1`;
  const res = await fetchWithRetry(url, { headers }, `GET ${slug}`);
  const json = await res.json();
  const rec = json?.data?.[0];
  await sleep(BETWEEN_REQ_MS);
  if (!rec) return null;
  return rec.documentId;
}

async function pushDeepDive(slug, blocks) {
  console.log(`\n▸ ${slug}: ${blocks.length} blocks`);
  if (dryRun) {
    console.log("  (dry run — no write)");
    console.log(`  Block summary:`);
    for (const b of blocks) console.log(`    - ${b.__component}`);
    return { slug, ok: true, dryRun: true };
  }

  const documentId = await findDocumentIdBySlug(slug);
  if (!documentId) {
    console.log(`  ✖ NOT FOUND in Strapi — run seed-llm-architectures-from-registry.mjs first.`);
    return { slug, ok: false, reason: "not-found" };
  }
  console.log(`  documentId: ${documentId}`);

  // Strapi v5 draft+publish: default PUT updates the draft only. We pass
  // `?status=published` so the write lands directly on the published
  // version — otherwise the frontend (which reads published by default)
  // sees the old empty deepDive.
  const url = `${cmsUrl}/api/llm-architectures/${documentId}?status=published`;
  const res = await fetchWithRetry(
    url,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({ data: { deepDive: blocks } }),
    },
    `PUT ${slug}`,
  );
  await res.json();
  await sleep(BETWEEN_REQ_MS);
  console.log(`  ✔ pushed ${blocks.length} blocks (published)`);
  return { slug, ok: true };
}

/* ── Run ────────────────────────────────────────────────────────── */

async function main() {
  const modules = all ? await loadAllContent() : [await loadContent(slugArg)];
  console.log(`[author] Target CMS: ${cmsUrl}${dryRun ? " (DRY RUN)" : ""}`);
  console.log(`[author] Modules: ${modules.map((m) => m.slug).join(", ")}`);

  const results = [];
  for (const mod of modules) {
    try {
      results.push(await pushDeepDive(mod.slug, mod.blocks));
    } catch (err) {
      console.error(`  ✖ ${mod.slug}: ${err.message}`);
      results.push({ slug: mod.slug, ok: false, reason: err.message });
    }
  }

  const ok = results.filter((r) => r.ok).length;
  const fail = results.length - ok;
  console.log(`\n[author] Done. ${ok} ok, ${fail} failed.`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
