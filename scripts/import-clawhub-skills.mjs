#!/usr/bin/env node

/**
 * Import skills from ClawHub.ai into Strapi CMS.
 *
 * Usage:
 *   node scripts/import-clawhub-skills.mjs [options]
 *
 * Options:
 *   --dry-run          Preview without updating CMS
 *   --limit <n>        Max skills to import (default: 500)
 *   --min-downloads <n> Minimum downloads threshold (default: 100)
 *   --url <cms-url>    Override CMS URL
 *   --token <token>    Override CMS API token
 *   --fetch-only       Only fetch from ClawHub, save JSON, don't seed CMS
 *   --seed-only        Only seed CMS from saved JSON (skip fetch)
 *   --help             Show help
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
function getArg(name, fallback = "") {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : fallback;
}
function hasFlag(name) { return args.includes(name); }

if (hasFlag("--help")) {
  console.log(`
import-clawhub-skills — Fetch top skills from ClawHub and seed into Strapi CMS

Usage:
  node scripts/import-clawhub-skills.mjs [options]

Options:
  --dry-run          Preview without updating CMS
  --limit <n>        Max skills to import (default: 500)
  --min-downloads <n> Minimum downloads threshold (default: 100)
  --url <cms-url>    Override CMS URL (default: NEXT_PUBLIC_CMS_URL)
  --token <token>    Override CMS API token (default: CMS_API_TOKEN)
  --fetch-only       Only fetch from ClawHub, save JSON, don't seed CMS
  --seed-only        Only seed CMS from saved JSON (skip fetch)

Examples:
  # Dry run — fetch top 100 skills, preview
  node scripts/import-clawhub-skills.mjs --dry-run --limit 100

  # Fetch only — save to JSON
  node scripts/import-clawhub-skills.mjs --fetch-only --limit 500

  # Seed CMS from saved JSON
  CMS_API_TOKEN=<token> node scripts/import-clawhub-skills.mjs --seed-only --url https://dev-cms.colaberry.ai
`);
  process.exit(0);
}

/* ---------- Config ------------------------------------------------------- */

const urlOverride = getArg("--url");
const tokenOverride = getArg("--token");
if (urlOverride) process.env.NEXT_PUBLIC_CMS_URL = urlOverride;
if (tokenOverride) process.env.CMS_API_TOKEN = tokenOverride;

const dryRun = hasFlag("--dry-run");
const fetchOnly = hasFlag("--fetch-only");
const seedOnly = hasFlag("--seed-only");
const limitArg = getArg("--limit");
const limit = limitArg ? Number.parseInt(limitArg, 10) : 500;
const minDownloads = Number.parseInt(getArg("--min-downloads", "100"), 10);

const baseUrl = (
  process.env.CMS_URL ||
  process.env.NEXT_PUBLIC_CMS_URL ||
  process.env.STRAPI_URL ||
  ""
).trim().replace(/\/$/, "");

const token = (
  process.env.CMS_API_TOKEN ||
  process.env.STRAPI_TOKEN ||
  ""
).trim();

const DATA_FILE = resolve(process.cwd(), "scripts/data/clawhub-skills-raw.json");
const PROGRESS_FILE = resolve(process.cwd(), ".clawhub-import-progress.json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Category classification -------------------------------------- */

/**
 * Classify a skill into Ram's 4-category taxonomy based on name + summary.
 */
function classifySkill(name, summary) {
  const text = `${name} ${summary}`.toLowerCase();

  // 1. Official Pre-built Skills (Anthropic/Vercel)
  const officialPatterns = [
    /\bpdf\b/, /\bdocx?\b/, /\bword\b/, /\bexcel\b/, /\bxlsx?\b/,
    /\bpptx?\b/, /\bpowerpoint\b/, /\bslide/, /\bspreadsheet/,
    /\breact\s*best/i, /\bweb\s*design\s*audit/i, /\bnext\.?js\s*optim/i,
    /\bdocument\s*management/i, /\bframework\s*best/i,
  ];
  for (const p of officialPatterns) {
    if (p.test(text)) return { category: "Official Pre-built Skills", skillType: guessSubCategory(text, "official") };
  }

  // 4. Agent Orchestration Skills (check before dev/domain since more specific)
  const orchestrationPatterns = [
    /\borchestrat/, /\bparallel\s*dispatch/, /\bsub.?agent/,
    /\bskill\s*writer/, /\bchat\s*compact/, /\bmeta.?skill/,
    /\bagent\s*manag/, /\bmulti.?agent/, /\bagent\s*coordinat/,
    /\bself.?improv/, /\bfind.?skill/, /\bskill\s*discover/,
  ];
  for (const p of orchestrationPatterns) {
    if (p.test(text)) return { category: "Agent Orchestration Skills", skillType: "Agent Management" };
  }

  // 2. Developer & Workflow Skills
  const devPatterns = [
    /\bcode\s*gen/, /\bscaffold/, /\bboilerplate/, /\btemplate\s*gen/,
    /\bunit\s*test/, /\btest\s*gen/, /\blint/, /\bcode\s*review/, /\bcode\s*quality/,
    /\bgit\b/, /\bcommit/, /\bpr\s*template/, /\bci\/?cd/, /\bpipeline/,
    /\bdebug/, /\btask.?plan/, /\bbrainstorm/, /\bplanning/,
    /\brefactor/, /\bcode\s*analy/, /\bast\b/, /\bsyntax/,
    /\bcursor\b/, /\bvs\s*code/, /\bcopilot/, /\bide\b/,
    /\bgithub\b/, /\bdocker/, /\bdevops/, /\bbuild\b/,
    /\btypescript/, /\bjavascript/, /\bpython\b/, /\brust\b/, /\bgo\b(?!ogle)/,
    /\bapi\s*gen/, /\bswagger/, /\bopenapi/,
    /\bexpress\b/, /\bdjango\b/, /\bflask\b/, /\bfastapi/,
    /\bnpm\b/, /\byarn\b/, /\bpackage/, /\bdependen/,
  ];
  for (const p of devPatterns) {
    if (p.test(text)) return { category: "Developer & Workflow Skills", skillType: guessSubCategory(text, "dev") };
  }

  // 3. Specialized Domain Skills
  const domainPatterns = [
    /\bkubernetes/, /\bk8s/, /\baws\b/, /\bcloudflare/, /\bterraform/,
    /\bazure\b/, /\bgcp\b/, /\bcloud\b/, /\binfrastructur/,
    /\bmeeting/, /\bschedul/, /\boffer\s*letter/, /\bcrm\b/, /\bsales/,
    /\bart\b/, /\bvideo\s*edit/, /\bremotio/, /\bbrand\b/, /\bcontent\s*creat/,
    /\bmedical/, /\bhealthcare/, /\blegal\b/, /\bfinance/, /\baccounting/,
    /\bmarketing/, /\bseo\b/, /\bsocial\s*media/,
    /\bemail\b/, /\bgmail/, /\bcalendar/, /\bslack/, /\bnotion/,
    /\bdatabase/, /\bsql\b/, /\bpostgres/, /\bmongo/, /\bredis/,
    /\bweather/, /\bnews\b/, /\bscrape/, /\bcrawl/, /\bbrowser\s*auto/,
    /\bimage/, /\bphoto/, /\bdesign\b/, /\bfigma/, /\bcanva/,
    /\baudio/, /\bmusic/, /\bpodcast/, /\btranscri/,
    /\btranslat/, /\blanguage/, /\bi18n/,
    /\bsearch\b/, /\brag\b/, /\bvector/, /\bembedding/,
    /\bauth/, /\bsecurity/, /\bencrypt/,
  ];
  for (const p of domainPatterns) {
    if (p.test(text)) return { category: "Specialized Domain Skills", skillType: guessSubCategory(text, "domain") };
  }

  // Default: Developer & Workflow (most ClawHub skills are dev-oriented)
  return { category: "Developer & Workflow Skills", skillType: "General" };
}

function guessSubCategory(text, parent) {
  if (parent === "official") {
    if (/pdf/.test(text)) return "Document Management";
    if (/docx?|word/.test(text)) return "Document Management";
    if (/xlsx?|excel|spreadsheet/.test(text)) return "Document Management";
    if (/pptx?|powerpoint|slide/.test(text)) return "Document Management";
    if (/react|next\.?js|web\s*design|framework/.test(text)) return "Web & Framework Best Practices";
    return "Document Management";
  }
  if (parent === "dev") {
    if (/code\s*gen|scaffold|boilerplate|template\s*gen/.test(text)) return "Code Generation";
    if (/test|lint|code\s*review|code\s*quality|security\s*scan/.test(text)) return "Code Quality";
    if (/git|commit|pr\s*template|ci|pipeline|deploy|docker/.test(text)) return "Workflow Automation";
    if (/debug|plan|brainstorm/.test(text)) return "Planning & Debugging";
    return "Code Generation";
  }
  if (parent === "domain") {
    if (/kubernetes|k8s|aws|cloudflare|terraform|azure|gcp|cloud|infra/.test(text)) return "Cloud & Infrastructure";
    if (/meeting|schedul|offer|crm|sales|marketing|business/.test(text)) return "Business Operations";
    if (/art|video|remotio|brand|content|image|photo|design|audio|music/.test(text)) return "Content & Media";
    if (/email|gmail|calendar|slack|notion/.test(text)) return "Business Operations";
    if (/database|sql|postgres|mongo|redis/.test(text)) return "Cloud & Infrastructure";
    if (/weather|news|scrape|crawl|browser/.test(text)) return "Content & Media";
    if (/search|rag|vector|embedding/.test(text)) return "Cloud & Infrastructure";
    if (/auth|security|encrypt/.test(text)) return "Cloud & Infrastructure";
    if (/medical|health|legal|finance|account/.test(text)) return "Business Operations";
    if (/translat|language|i18n/.test(text)) return "Content & Media";
    return "Business Operations";
  }
  return "General";
}

/* ---------- ClawHub API -------------------------------------------------- */

const CLAWHUB_API = "https://clawhub.ai/api/v1";

async function fetchClawHubSkills(maxSkills) {
  const allSkills = [];
  let cursor = null;
  let page = 0;

  console.log(`\nFetching top ${maxSkills} skills from ClawHub (sorted by downloads)...\n`);

  while (allSkills.length < maxSkills) {
    page++;
    const params = new URLSearchParams({ sort: "downloads", limit: "44" });
    if (cursor) params.set("cursor", cursor);

    const url = `${CLAWHUB_API}/skills?${params}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "colaberry-import/1.0" },
    });

    if (!res.ok) {
      console.error(`ClawHub API error: ${res.status}`);
      break;
    }

    const data = await res.json();
    const items = data.items || [];

    if (items.length === 0) break;

    // Filter by minimum downloads
    for (const item of items) {
      if (item.stats.downloads >= minDownloads && allSkills.length < maxSkills) {
        allSkills.push(item);
      }
    }

    const lastDl = items[items.length - 1]?.stats?.downloads || 0;
    console.log(`  Page ${page}: +${items.length} skills (total: ${allSkills.length}, last dl: ${lastDl})`);

    // Stop if downloads dropped below threshold
    if (lastDl < minDownloads) break;

    cursor = data.nextCursor;
    if (!cursor) break;

    // Be polite
    await sleep(200);
  }

  console.log(`\nFetched ${allSkills.length} skills from ClawHub.\n`);
  return allSkills;
}

/**
 * Fetch individual skill detail for richer content.
 */
async function fetchSkillDetail(slug) {
  try {
    const res = await fetch(`${CLAWHUB_API}/skills/${slug}`, {
      headers: { "User-Agent": "colaberry-import/1.0" },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/* ---------- Transform to CMS format -------------------------------------- */

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function transformToCMS(clawSkill) {
  const { slug, displayName, summary, stats, latestVersion, metadata } = clawSkill;
  const { category, skillType } = classifySkill(displayName, summary || "");

  return {
    name: displayName || slug,
    slug: slugify(slug || displayName),
    summary: summary ? (summary.length > 280 ? summary.slice(0, 277) + "..." : summary) : null,
    longDescription: null, // Will be enriched later
    category,
    skillType,
    provider: "ClawHub Community",
    status: "live",
    visibility: "public",
    source: "external",
    sourceName: "ClawHub",
    sourceUrl: slug ? `https://clawhub.ai/skills/${encodeURIComponent(slug)}` : null,
    verified: false,
    usageCount: stats?.downloads || 0,
    rating: stats?.stars ? Math.min(5, Math.round((stats.stars / 500) * 5 * 10) / 10) : null,
    keyBenefits: null,
    limitations: null,
    requirements: null,
    exampleWorkflow: latestVersion?.changelog || null,
    lastUpdated: clawSkill.updatedAt ? new Date(clawSkill.updatedAt).toISOString().split("T")[0] : null,
  };
}

/* ---------- CMS Operations ----------------------------------------------- */

async function fetchCMS(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CMS ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchAllCMSSkills() {
  const allSkills = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const data = await fetchCMS(`/api/skills?pagination[page]=${page}&pagination[pageSize]=${pageSize}&pagination[withCount]=true`);
    const items = data.data || [];
    allSkills.push(...items);

    const total = data.meta?.pagination?.total || 0;
    console.log(`  CMS page ${page}: ${items.length} skills (total in CMS: ${total})`);

    if (allSkills.length >= total || items.length === 0) break;
    page++;
  }

  return allSkills;
}

async function createSkill(skillData) {
  return fetchCMS("/api/skills", {
    method: "POST",
    body: JSON.stringify({ data: skillData }),
  });
}

async function updateSkill(id, skillData) {
  return fetchCMS(`/api/skills/${id}`, {
    method: "PUT",
    body: JSON.stringify({ data: skillData }),
  });
}

/* ---------- Progress tracking -------------------------------------------- */

function loadProgress() {
  try {
    if (existsSync(PROGRESS_FILE)) {
      return JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
    }
  } catch { /* ignore */ }
  return { created: [], updated: [], skipped: [], failed: [] };
}

function saveProgress(progress) {
  try {
    writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch { /* best effort */ }
}

/* ---------- Main --------------------------------------------------------- */

async function main() {
  console.log("=== ClawHub Skills Import ===");
  console.log(`  Limit: ${limit} | Min downloads: ${minDownloads} | Dry run: ${dryRun}`);

  // Phase 1: Fetch from ClawHub
  let clawSkills;

  if (seedOnly) {
    if (!existsSync(DATA_FILE)) {
      console.error(`No saved data found at ${DATA_FILE}. Run --fetch-only first.`);
      process.exit(1);
    }
    clawSkills = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
    console.log(`Loaded ${clawSkills.length} skills from saved data.`);
  } else {
    clawSkills = await fetchClawHubSkills(limit);

    // Save raw data
    writeFileSync(DATA_FILE, JSON.stringify(clawSkills, null, 2));
    console.log(`Saved raw data to ${DATA_FILE}`);

    if (fetchOnly) {
      console.log("\n--fetch-only mode. Skipping CMS seed.");
      // Print category breakdown
      const cats = {};
      for (const s of clawSkills) {
        const { category } = classifySkill(s.displayName, s.summary || "");
        cats[category] = (cats[category] || 0) + 1;
      }
      console.log("\nCategory breakdown:");
      for (const [cat, count] of Object.entries(cats).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${cat}: ${count}`);
      }
      return;
    }
  }

  // Phase 2: Seed into CMS
  if (!baseUrl) {
    console.error("Missing CMS URL. Set --url or NEXT_PUBLIC_CMS_URL.");
    process.exit(1);
  }
  if (!token && !dryRun) {
    console.error("Missing CMS token. Set --token or CMS_API_TOKEN.");
    process.exit(1);
  }

  console.log(`\nFetching existing skills from CMS (${baseUrl})...`);
  const existingSkills = dryRun ? [] : await fetchAllCMSSkills();
  const existingSlugs = new Map();
  for (const s of existingSkills) {
    existingSlugs.set(s.slug, s.id);
  }
  console.log(`  Found ${existingSkills.length} existing skills in CMS.`);

  // Transform and seed
  const progress = loadProgress();
  let created = 0, updated = 0, skipped = 0, failed = 0;

  console.log(`\nSeeding ${clawSkills.length} skills into CMS...\n`);

  for (let i = 0; i < clawSkills.length; i++) {
    const raw = clawSkills[i];
    const cmsData = transformToCMS(raw);
    const slug = cmsData.slug;

    // Skip if already processed in this run
    if (progress.created.includes(slug) || progress.updated.includes(slug)) {
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  [DRY] ${i + 1}. ${cmsData.name} → ${cmsData.category} / ${cmsData.skillType} (${cmsData.usageCount} dl)`);
      continue;
    }

    try {
      if (existingSlugs.has(slug)) {
        // Update existing — only update stats, never overwrite source info
        const existingId = existingSlugs.get(slug);
        await updateSkill(existingId, {
          usageCount: cmsData.usageCount,
          rating: cmsData.rating,
          lastUpdated: cmsData.lastUpdated,
        });
        updated++;
        progress.updated.push(slug);
        if ((updated + created) % 20 === 0) console.log(`  Progress: ${created} created, ${updated} updated, ${i + 1}/${clawSkills.length}`);
      } else {
        // Create new
        await createSkill(cmsData);
        created++;
        progress.created.push(slug);
        if ((updated + created) % 20 === 0) console.log(`  Progress: ${created} created, ${updated} updated, ${i + 1}/${clawSkills.length}`);
      }

      saveProgress(progress);
      // Throttle CMS writes
      await sleep(100);
    } catch (err) {
      console.error(`  FAIL [${slug}]: ${err.message}`);
      failed++;
      progress.failed.push(slug);
      saveProgress(progress);
    }
  }

  console.log(`
=== Import Complete ===
  Created: ${created}
  Updated: ${updated}
  Skipped: ${skipped}
  Failed:  ${failed}
  Total:   ${clawSkills.length}

Category breakdown:`);

  const cats = {};
  for (const s of clawSkills) {
    const { category } = classifySkill(s.displayName, s.summary || "");
    cats[category] = (cats[category] || 0) + 1;
  }
  for (const [cat, count] of Object.entries(cats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
