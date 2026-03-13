#!/usr/bin/env node

/**
 * Import/enrich skills from the Agent-Skills-Hunter GitHub repo into Strapi CMS.
 * Cross-references with existing CMS skills by slug and enriches with richer data.
 *
 * Usage:
 *   node scripts/import-github-skills.mjs [options]
 *
 * Options:
 *   --dry-run          Preview without updating CMS
 *   --url <cms-url>    Override CMS URL
 *   --token <token>    Override CMS API token
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
function getArg(name, fallback = "") {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : fallback;
}
function hasFlag(name) { return args.includes(name); }

const urlOverride = getArg("--url");
const tokenOverride = getArg("--token");
if (urlOverride) process.env.NEXT_PUBLIC_CMS_URL = urlOverride;
if (tokenOverride) process.env.CMS_API_TOKEN = tokenOverride;

const dryRun = hasFlag("--dry-run");

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- GitHub README Parsing ---------------------------------------- */

const REPO = "ZhanlinCui/Agent-Skills-Hunter";
const REPO_URL = `https://github.com/${REPO}`;

/**
 * Map GitHub categories to Ram's 4-category taxonomy.
 */
function mapToRamCategory(ghCategory) {
  const cat = ghCategory.toLowerCase();

  if (cat.includes("agent orchestration")) return { category: "Agent Orchestration Skills", skillType: "Agent Management" };
  if (cat.includes("vercel")) return { category: "Official Pre-built Skills", skillType: "Web & Framework Best Practices" };
  if (cat.includes("document")) return { category: "Official Pre-built Skills", skillType: "Document Management" };

  if (cat.includes("creative") || cat.includes("design")) return { category: "Specialized Domain Skills", skillType: "Content & Media" };
  if (cat.includes("obsidian")) return { category: "Specialized Domain Skills", skillType: "Content & Media" };
  if (cat.includes("seo") || cat.includes("performance")) return { category: "Developer & Workflow Skills", skillType: "Code Quality" };
  if (cat.includes("integration") || cat.includes("automation")) return { category: "Specialized Domain Skills", skillType: "Business Operations" };

  if (cat.includes("development") || cat.includes("technical")) return { category: "Developer & Workflow Skills", skillType: "Code Generation" };
  if (cat.includes("debugging") || cat.includes("quality")) return { category: "Developer & Workflow Skills", skillType: "Code Quality" };
  if (cat.includes("planning") || cat.includes("workflow")) return { category: "Developer & Workflow Skills", skillType: "Planning & Debugging" };
  if (cat.includes("git")) return { category: "Developer & Workflow Skills", skillType: "Workflow Automation" };

  return { category: "Developer & Workflow Skills", skillType: "General" };
}

async function fetchGitHubReadme() {
  console.log("Fetching README from GitHub...");
  const res = await fetch(`https://api.github.com/repos/${REPO}/readme`, {
    headers: {
      Accept: "application/vnd.github.v3.raw",
      "User-Agent": "colaberry-import/1.0",
    },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.text();
}

function parseSkillsFromReadme(readme) {
  const lines = readme.split("\n");
  let currentCat = "";
  const skills = [];

  for (const line of lines) {
    // Match ### headings (category names)
    const catMatch = line.match(/^### [^\w]*(.+)$/);
    if (catMatch) {
      currentCat = catMatch[1].trim();
      continue;
    }

    // Match table rows: | **[name](path)** | description | includes |
    const rowMatch = line.match(/\| \*\*\[([^\]]+)\]\(([^)]+)\)\*\* \| ([^|]+)\|([^|]*)\|/);
    if (rowMatch) {
      const [, name, path, desc, includes] = rowMatch;
      const { category, skillType } = mapToRamCategory(currentCat);
      skills.push({
        name: name.trim(),
        slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        path: path.trim(),
        summary: desc.trim(),
        includes: includes.trim(),
        ghCategory: currentCat,
        category,
        skillType,
        sourceUrl: `${REPO_URL}/tree/main/${path.replace("./", "")}`,
      });
    }
  }

  return skills;
}

/**
 * Fetch SKILL.md content from the repo for richer description.
 */
async function fetchSkillMd(skillPath) {
  const cleanPath = skillPath.replace("./", "");
  const url = `https://raw.githubusercontent.com/${REPO}/main/${cleanPath}/SKILL.md`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "colaberry-import/1.0" } });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
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
  while (true) {
    const data = await fetchCMS(`/api/skills?pagination[page]=${page}&pagination[pageSize]=100&pagination[withCount]=true`);
    allSkills.push(...(data.data || []));
    if (allSkills.length >= (data.meta?.pagination?.total || 0)) break;
    page++;
  }
  return allSkills;
}

/* ---------- Main --------------------------------------------------------- */

async function main() {
  console.log("=== GitHub Agent-Skills-Hunter Import ===\n");

  const readme = await fetchGitHubReadme();
  const ghSkills = parseSkillsFromReadme(readme);
  console.log(`Parsed ${ghSkills.length} skills from README.\n`);

  if (!baseUrl && !dryRun) {
    console.error("Missing CMS URL.");
    process.exit(1);
  }

  // Fetch existing CMS skills
  let existingSkills = [];
  if (!dryRun) {
    console.log("Fetching existing CMS skills...");
    existingSkills = await fetchAllCMSSkills();
    console.log(`  Found ${existingSkills.length} existing skills.\n`);
  }

  const existingBySlug = new Map();
  for (const s of existingSkills) {
    existingBySlug.set(s.slug, s);
  }

  let created = 0, updated = 0, skipped = 0, failed = 0;

  for (const gh of ghSkills) {
    const existing = existingBySlug.get(gh.slug);

    if (dryRun) {
      const status = existing ? "UPDATE" : "CREATE";
      console.log(`  [${status}] ${gh.name} → ${gh.category} / ${gh.skillType}`);
      continue;
    }

    try {
      if (existing) {
        // Update with GitHub-sourced enrichment data
        const updates = {
          category: gh.category,
          skillType: gh.skillType,
          verified: true, // Curated in a high-quality repo
        };

        // Only update sourceUrl if it doesn't have one
        if (!existing.sourceUrl) {
          updates.sourceUrl = gh.sourceUrl;
          updates.sourceName = "Agent-Skills-Hunter";
        }

        await fetchCMS(`/api/skills/${existing.id}`, {
          method: "PUT",
          body: JSON.stringify({ data: updates }),
        });
        updated++;
      } else {
        // Create new skill
        const newSkill = {
          name: gh.name,
          slug: gh.slug,
          summary: gh.summary.length > 280 ? gh.summary.slice(0, 277) + "..." : gh.summary,
          category: gh.category,
          skillType: gh.skillType,
          provider: "Agent-Skills-Hunter",
          status: "live",
          visibility: "public",
          source: "external",
          sourceName: "Agent-Skills-Hunter",
          sourceUrl: gh.sourceUrl,
          verified: true,
        };
        await fetchCMS("/api/skills", {
          method: "POST",
          body: JSON.stringify({ data: newSkill }),
        });
        created++;
      }
      await sleep(100);
    } catch (err) {
      console.error(`  FAIL [${gh.slug}]: ${err.message}`);
      failed++;
    }
  }

  console.log(`
=== GitHub Import Complete ===
  Created: ${created}
  Updated: ${updated}
  Skipped: ${skipped}
  Failed:  ${failed}
  Total:   ${ghSkills.length}
`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
