#!/usr/bin/env node

/**
 * Fix broken ClawHub source URLs in Strapi CMS.
 *
 * Many skills have sourceUrl set to https://clawhub.ai/skills/{slug} but
 * those pages don't actually exist on ClawHub. This script:
 *   1. Fetches all skills with ClawHub sourceUrls from CMS
 *   2. Checks each slug against ClawHub API
 *   3. If the skill doesn't exist on ClawHub, sets sourceUrl/docsUrl to null
 *
 * Usage:
 *   node scripts/fix-clawhub-source-urls.mjs [options]
 *
 * Options:
 *   --dry-run       Preview changes without updating CMS
 *   --url <url>     Override CMS URL
 *   --token <token> Override CMS API token
 *   --use-cache     Use local ClawHub raw data instead of API calls
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
function getArg(name, fallback = "") {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : fallback;
}
function hasFlag(name) { return args.includes(name); }

const dryRun = hasFlag("--dry-run");
const useCache = hasFlag("--use-cache");

const urlOverride = getArg("--url");
const tokenOverride = getArg("--token");
if (urlOverride) process.env.NEXT_PUBLIC_CMS_URL = urlOverride;
if (tokenOverride) process.env.CMS_API_TOKEN = tokenOverride;

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

const CLAWHUB_API = "https://clawhub.ai/api/v1";
const RAW_DATA_FILE = resolve(process.cwd(), "scripts/data/clawhub-skills-raw.json");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- CMS helpers -------------------------------------------------- */

async function fetchCMS(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CMS ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchAllCMSSkillsWithClawHubUrls() {
  const all = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const data = await fetchCMS(
      `/api/skills?filters[sourceUrl][$contains]=clawhub.ai&fields[0]=slug&fields[1]=sourceUrl&fields[2]=docsUrl&fields[3]=sourceName&fields[4]=documentId&pagination[page]=${page}&pagination[pageSize]=${pageSize}`
    );
    all.push(...data.data);
    if (page >= data.meta.pagination.pageCount) break;
    page++;
  }

  return all;
}

async function updateSkill(documentId, data) {
  return fetchCMS(`/api/skills/${documentId}`, {
    method: "PUT",
    body: JSON.stringify({ data }),
  });
}

/* ---------- ClawHub validation ------------------------------------------- */

function loadClawHubCache() {
  if (!existsSync(RAW_DATA_FILE)) return null;
  const raw = JSON.parse(readFileSync(RAW_DATA_FILE, "utf-8"));
  const slugs = new Set(raw.map((s) => s.slug));
  return slugs;
}

async function checkClawHubAPI(slug) {
  try {
    const res = await fetch(`${CLAWHUB_API}/skills/${encodeURIComponent(slug)}`, {
      headers: { "User-Agent": "colaberry-fix/1.0" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ---------- Main --------------------------------------------------------- */

async function main() {
  console.log("=== Fix Broken ClawHub Source URLs ===");
  console.log(`  CMS: ${baseUrl}`);
  console.log(`  Dry run: ${dryRun}`);
  console.log(`  Use cache: ${useCache}\n`);

  if (!baseUrl) {
    console.error("Missing CMS URL. Set --url or NEXT_PUBLIC_CMS_URL.");
    process.exit(1);
  }
  if (!token && !dryRun) {
    console.error("Missing CMS token. Set --token or CMS_API_TOKEN.");
    process.exit(1);
  }

  // Load ClawHub slug cache if available
  let clawHubSlugs = null;
  if (useCache) {
    clawHubSlugs = loadClawHubCache();
    if (clawHubSlugs) {
      console.log(`Loaded ${clawHubSlugs.size} valid ClawHub slugs from cache.\n`);
    } else {
      console.log("No cache file found, will use API calls.\n");
    }
  }

  // Fetch all skills with ClawHub URLs
  console.log("Fetching skills with ClawHub URLs from CMS...");
  const skills = await fetchAllCMSSkillsWithClawHubUrls();
  console.log(`  Found ${skills.length} skills with ClawHub URLs.\n`);

  let fixed = 0, valid = 0, failed = 0;

  for (let i = 0; i < skills.length; i++) {
    const skill = skills[i];
    const slug = skill.slug;

    // Extract ClawHub slug from sourceUrl
    const urlMatch = skill.sourceUrl?.match(/clawhub\.ai\/skills\/(.+?)$/);
    const clawSlug = urlMatch ? decodeURIComponent(urlMatch[1]) : slug;

    // Check if skill exists on ClawHub
    let existsOnClawHub = false;

    if (clawHubSlugs) {
      existsOnClawHub = clawHubSlugs.has(clawSlug);
    } else {
      existsOnClawHub = await checkClawHubAPI(clawSlug);
      await sleep(50); // Rate limit API calls
    }

    if (existsOnClawHub) {
      valid++;
      continue;
    }

    // Skill doesn't exist on ClawHub — fix it
    if (dryRun) {
      console.log(`  [FIX] ${slug} → sourceUrl: null (was: ${skill.sourceUrl})`);
      fixed++;
      continue;
    }

    try {
      const updates = { sourceUrl: null };
      // Also clear docsUrl if it points to the same broken ClawHub page
      if (skill.docsUrl?.includes("clawhub.ai")) {
        updates.docsUrl = null;
      }

      await updateSkill(skill.documentId, updates);
      fixed++;

      if (fixed % 50 === 0) {
        console.log(`  Progress: ${fixed} fixed, ${valid} valid, ${i + 1}/${skills.length}`);
      }

      await sleep(50);
    } catch (err) {
      console.error(`  FAIL [${slug}]: ${err.message.slice(0, 100)}`);
      failed++;
    }
  }

  console.log(`
=== Fix Complete ===
  Total with ClawHub URLs: ${skills.length}
  Valid (exist on ClawHub): ${valid}
  Fixed (set to null):      ${fixed}
  Failed:                   ${failed}
`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
