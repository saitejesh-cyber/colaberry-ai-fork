#!/usr/bin/env node

/**
 * Import skills from the Ultimate-Agent-Skills-Collection GitHub repo into Strapi CMS.
 * Cross-references with existing CMS skills by slug to avoid duplicates.
 *
 * Usage:
 *   node scripts/import-ultimate-skills.mjs [options]
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

/* ---------- GitHub Config ------------------------------------------------ */

const REPO = "ZhanlinCui/Ultimate-Agent-Skills-Collection";
const REPO_URL = `https://github.com/${REPO}`;
const SOURCE_NAME = "Ultimate-Agent-Skills-Collection";

/* ---------- Category Mapping --------------------------------------------- */

/**
 * Map the repo's 11 categories to Ram's 4-category taxonomy.
 */
function mapToRamCategory(folderName) {
  const name = folderName.toLowerCase();

  if (name.includes("agent orchestration") || name.includes("agent-orchestration")) return { category: "Agent Orchestration Skills", skillType: "Agent Management" };
  if (name.includes("vercel")) return { category: "Official Pre-built Skills", skillType: "Web & Framework Best Practices" };
  if (name.includes("document")) return { category: "Official Pre-built Skills", skillType: "Document Management" };

  if (name.includes("creative") || name.includes("design")) return { category: "Specialized Domain Skills", skillType: "Content & Media" };
  if (name.includes("integration") || name.includes("automation")) return { category: "Specialized Domain Skills", skillType: "Business Operations" };

  if (name.includes("obsidian")) return { category: "Developer & Workflow Skills", skillType: "Planning & Debugging" };
  if (name.includes("development") || name.includes("technical")) return { category: "Developer & Workflow Skills", skillType: "Code Generation" };
  if (name.includes("seo") || name.includes("performance")) return { category: "Developer & Workflow Skills", skillType: "Code Quality" };
  if (name.includes("planning") || name.includes("workflow")) return { category: "Developer & Workflow Skills", skillType: "Planning & Debugging" };
  if (name.includes("debugging") || name.includes("quality")) return { category: "Developer & Workflow Skills", skillType: "Code Quality" };
  if (name.includes("git")) return { category: "Developer & Workflow Skills", skillType: "Workflow Automation" };

  return { category: "Developer & Workflow Skills", skillType: "General" };
}

/* ---------- GitHub API --------------------------------------------------- */

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Fetch the README to parse skill table entries.
 */
async function fetchReadme() {
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

/**
 * Parse skills from the README markdown table format.
 * Expected format: | **[name](path)** | description | includes |
 */
function parseSkillsFromReadme(readme) {
  const lines = readme.split("\n");
  let currentCat = "";
  const skills = [];

  for (const line of lines) {
    // Match ### headings (category names) — may have emoji prefixes
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
      const cleanPath = path.trim().replace(/^\.\//, "");
      skills.push({
        name: name.trim(),
        slug: slugify(name.trim()),
        path: cleanPath,
        summary: desc.trim(),
        includes: includes.trim(),
        ghCategory: currentCat,
        category,
        skillType,
        sourceUrl: `${REPO_URL}/tree/main/${cleanPath}`,
      });
    }
  }

  return skills;
}

/**
 * Fetch SKILL.md from a skill folder for richer description.
 */
async function fetchSkillMd(skillPath) {
  const url = `https://raw.githubusercontent.com/${REPO}/main/${skillPath}/SKILL.md`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "colaberry-import/1.0" } });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

/**
 * Parse SKILL.md frontmatter for extra metadata.
 */
function parseSkillMdFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) fm[kv[1].trim()] = kv[2].trim();
  }
  return fm;
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
  console.log("=== Ultimate-Agent-Skills-Collection Import ===\n");

  const readme = await fetchReadme();
  const ghSkills = parseSkillsFromReadme(readme);
  console.log(`Parsed ${ghSkills.length} skills from README.\n`);

  // Print category breakdown
  const cats = {};
  for (const s of ghSkills) {
    cats[s.category] = (cats[s.category] || 0) + 1;
  }
  console.log("Category breakdown:");
  for (const [cat, count] of Object.entries(cats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }
  console.log();

  if (!baseUrl && !dryRun) {
    console.error("Missing CMS URL. Set --url or NEXT_PUBLIC_CMS_URL.");
    process.exit(1);
  }
  if (!token && !dryRun) {
    console.error("Missing CMS token. Set --token or CMS_API_TOKEN.");
    process.exit(1);
  }

  // Fetch existing CMS skills for deduplication
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

    // Also check name-based slug variations
    const altSlug = slugify(gh.name.replace(/-/g, " "));
    const existingAlt = !existing ? existingBySlug.get(altSlug) : null;
    const match = existing || existingAlt;

    if (dryRun) {
      const status = match ? "EXISTS" : "NEW";
      console.log(`  [${status}] ${gh.name} → ${gh.category} / ${gh.skillType}`);
      if (status === "NEW") created++;
      else skipped++;
      continue;
    }

    try {
      if (match) {
        // Update with source info if missing
        const updates = {};
        if (!match.sourceUrl) {
          updates.sourceUrl = gh.sourceUrl;
        }
        if (!match.verified) {
          updates.verified = true;
        }
        // Update category if currently "General"
        if (match.skillType === "General" || !match.skillType) {
          updates.category = gh.category;
          updates.skillType = gh.skillType;
        }

        if (Object.keys(updates).length > 0) {
          await fetchCMS(`/api/skills/${match.documentId}`, {
            method: "PUT",
            body: JSON.stringify({ data: updates }),
          });
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Fetch SKILL.md for richer description
        let longDesc = null;
        const skillMd = await fetchSkillMd(gh.path);
        if (skillMd) {
          const fm = parseSkillMdFrontmatter(skillMd);
          // Use the body (after frontmatter) as longDescription
          const bodyMatch = skillMd.match(/^---\s*\n[\s\S]*?\n---\s*\n([\s\S]*)$/);
          if (bodyMatch && bodyMatch[1].trim().length > 50) {
            longDesc = bodyMatch[1].trim().slice(0, 5000);
          }
          // Override summary with frontmatter description if available
          if (fm.description && fm.description.length > gh.summary.length) {
            gh.summary = fm.description;
          }
        }

        const newSkill = {
          name: gh.name,
          slug: gh.slug,
          summary: gh.summary.length > 280 ? gh.summary.slice(0, 277) + "..." : gh.summary,
          longDescription: longDesc,
          category: gh.category,
          skillType: gh.skillType,
          provider: SOURCE_NAME,
          status: "live",
          visibility: "public",
          source: "external",
          sourceName: SOURCE_NAME,
          sourceUrl: gh.sourceUrl,
          verified: true,
        };
        await fetchCMS("/api/skills", {
          method: "POST",
          body: JSON.stringify({ data: newSkill }),
        });
        created++;
      }
      await sleep(150);
    } catch (err) {
      console.error(`  FAIL [${gh.slug}]: ${err.message}`);
      failed++;
    }
  }

  console.log(`
=== Ultimate-Agent-Skills-Collection Import Complete ===
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
