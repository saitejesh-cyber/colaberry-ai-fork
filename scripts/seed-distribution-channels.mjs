#!/usr/bin/env node
/**
 * seed-distribution-channels.mjs
 *
 * Seeds the three Sprint v5 starter channels (X, Moltbook, Hugging Face)
 * into Strapi's `distribution-channel` collection. Idempotent by `name` —
 * re-running updates the existing rows rather than duplicating.
 *
 * Templates are sourced from `scripts/distribution-templates/<slug>.md`
 * so editors can iterate copy without touching JS.
 *
 * Channels seeded with `enabled: false` on purpose. Ops flips them on
 * from the admin UI once they're happy with the rendered dry-run
 * preview. This matches the POC's conservative default.
 *
 * Usage:
 *   CMS_API_TOKEN=<token> node scripts/seed-distribution-channels.mjs
 *
 *   # Dry run — prints the payload, writes nothing.
 *   node scripts/seed-distribution-channels.mjs --dry-run
 *
 *   # Custom CMS URL (default: http://localhost:1338).
 *   node scripts/seed-distribution-channels.mjs --url https://api.colaberry.ai
 *
 * Sprint: v5 — CMS-driven distribution module
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

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

if (!dryRun && !token) {
  console.error("ERROR: CMS_API_TOKEN required (or pass --dry-run).");
  process.exit(2);
}

/* ── Template loading ───────────────────────────────────────────── */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const templateDir = resolve(__dirname, "distribution-templates");

function loadTemplate(slug) {
  const path = resolve(templateDir, `${slug}.md`);
  try {
    return readFileSync(path, "utf8").trim();
  } catch (err) {
    console.error(`ERROR: failed to read ${path}: ${err.message}`);
    process.exit(1);
  }
}

/* ── Channel seeds ──────────────────────────────────────────────── */

const CHANNELS = [
  {
    name: "X — daily catalog",
    platform: "x",
    enabled: false,
    dryRunOverride: false,
    credentialRef: "TWITTER_API_KEY",
    bodyTemplate: loadTemplate("x"),
    defaultWindowHours: 24,
    maxPostsPerRun: 10,
    supportedKinds: ["agent", "mcpServer", "skill", "podcastEpisode", "llmArchitecture"],
    escapeHtml: false,
    notes: "X / Twitter — 280 char budget enforced by template engine.",
  },
  {
    name: "Moltbook — daily catalog",
    platform: "moltbook",
    enabled: false,
    dryRunOverride: false,
    credentialRef: "MOLTBOOK_API_TOKEN",
    bodyTemplate: loadTemplate("moltbook"),
    titleTemplate: "{{#isNew}}New{{/isNew}}{{^isNew}}Updated{{/isNew}}: {{title}}",
    defaultWindowHours: 24,
    maxPostsPerRun: 25,
    supportedKinds: ["agent", "mcpServer", "skill", "llmArchitecture"],
    escapeHtml: false,
    notes: "Moltbook — developer-first community. No copy budget; HTML allowed.",
  },
  {
    name: "Hugging Face — catalog stub",
    platform: "huggingface",
    enabled: false,
    dryRunOverride: true,
    credentialRef: "HUGGINGFACE_API_TOKEN",
    bodyTemplate: loadTemplate("huggingface"),
    defaultWindowHours: 24,
    maxPostsPerRun: 25,
    supportedKinds: ["agent", "mcpServer", "llmArchitecture"],
    escapeHtml: false,
    notes:
      "HF is dry-run-only in v5 — the JSONL commit path ships in a later sprint.",
  },
];

/* ── HTTP helpers ───────────────────────────────────────────────── */

const COLLECTION_URL = `${cmsUrl}/api/distribution-channels`;
const headers = () => ({
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

async function findByName(name) {
  const q = new URLSearchParams({
    "filters[name][$eq]": name,
    "pagination[pageSize]": "1",
  });
  const res = await fetch(`${COLLECTION_URL}?${q.toString()}`, {
    headers: headers(),
  });
  if (!res.ok) {
    throw new Error(`CMS ${res.status} looking up "${name}"`);
  }
  const json = await res.json();
  const rows = Array.isArray(json?.data) ? json.data : [];
  return rows[0] || null;
}

async function createChannel(payload) {
  const res = await fetch(`${COLLECTION_URL}?status=published`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ data: payload }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`CMS create failed: ${res.status} ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

async function updateChannel(documentId, payload) {
  const res = await fetch(
    `${COLLECTION_URL}/${documentId}?status=published`,
    {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ data: payload }),
    }
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`CMS update failed: ${res.status} ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

/* ── Main ───────────────────────────────────────────────────────── */

async function upsertOne(channel) {
  if (dryRun) {
    console.log(`[dry-run] would upsert "${channel.name}":`);
    console.log(JSON.stringify(channel, null, 2));
    return;
  }
  const existing = await findByName(channel.name);
  if (existing) {
    const documentId = existing.documentId || existing.id;
    await updateChannel(documentId, channel);
    console.log(`✓ updated "${channel.name}" (documentId=${documentId})`);
    return;
  }
  const created = await createChannel(channel);
  const documentId = created?.data?.documentId || created?.data?.id;
  console.log(`✓ created "${channel.name}" (documentId=${documentId})`);
}

async function main() {
  console.log(`Target CMS: ${cmsUrl}`);
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Channels: ${CHANNELS.length}`);
  console.log("");
  for (const channel of CHANNELS) {
    try {
      await upsertOne(channel);
    } catch (err) {
      console.error(`✗ failed "${channel.name}": ${err.message}`);
      process.exitCode = 1;
    }
  }
  console.log("");
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
