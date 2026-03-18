#!/usr/bin/env node

/**
 * Import skills from the official Anthropic skills repo (anthropics/skills) into Strapi CMS.
 * Cross-references with existing CMS skills by slug to avoid duplicates.
 *
 * Usage:
 *   node scripts/import-anthropic-skills.mjs [options]
 *
 * Options:
 *   --dry-run          Preview without updating CMS
 *   --url <cms-url>    Override CMS URL
 *   --token <token>    Override CMS API token
 */

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

const REPO = "anthropics/skills";
const REPO_URL = `https://github.com/${REPO}`;
const SOURCE_NAME = "Anthropic Official";
const SKILLS_DIR = "skills"; // Skills are under /skills/ directory

/* ---------- Category Mapping --------------------------------------------- */

/**
 * Map Anthropic skill categories (folder names) to Ram's 4-category taxonomy.
 */
function mapToRamCategory(categoryFolder, skillName) {
  const cat = categoryFolder.toLowerCase();
  const name = skillName.toLowerCase();

  // Document skills
  if (cat.includes("document") || /\b(pdf|docx?|xlsx?|pptx?|word|excel|powerpoint|spreadsheet)\b/.test(name)) {
    return { category: "Official Pre-built Skills", skillType: "Document Management" };
  }

  // Agent orchestration
  if (cat.includes("orchestration") || /\b(dispatch|sub.?agent|skill.?writer|compactor|orchestrat)\b/.test(name)) {
    return { category: "Agent Orchestration Skills", skillType: "Agent Management" };
  }

  // Creative & Design
  if (cat.includes("creative") || cat.includes("design")) {
    return { category: "Specialized Domain Skills", skillType: "Content & Media" };
  }

  // Enterprise & Communication
  if (cat.includes("enterprise") || cat.includes("communication")) {
    return { category: "Specialized Domain Skills", skillType: "Business Operations" };
  }

  // Development & Technical
  if (cat.includes("development") || cat.includes("technical")) {
    return { category: "Developer & Workflow Skills", skillType: "Code Generation" };
  }

  // Web & Framework
  if (cat.includes("web") || cat.includes("framework") || cat.includes("vercel")) {
    return { category: "Official Pre-built Skills", skillType: "Web & Framework Best Practices" };
  }

  // Planning & Workflow
  if (cat.includes("planning") || cat.includes("workflow")) {
    return { category: "Developer & Workflow Skills", skillType: "Planning & Debugging" };
  }

  // Debugging & Quality
  if (cat.includes("debugging") || cat.includes("quality") || cat.includes("testing")) {
    return { category: "Developer & Workflow Skills", skillType: "Code Quality" };
  }

  return { category: "Official Pre-built Skills", skillType: "General" };
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ---------- GitHub API --------------------------------------------------- */

/**
 * List top-level skill folders under /skills/ directory.
 * Each folder IS a skill (not a category containing skills).
 */
async function fetchSkillFolders() {
  console.log("Fetching skill folders from GitHub...");
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${SKILLS_DIR}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "colaberry-import/1.0",
    },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const items = await res.json();
  return items.filter((item) => item.type === "dir");
}

/**
 * Fetch and parse SKILL.md from a skill folder.
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
 * Parse SKILL.md frontmatter for name & description.
 */
function parseSkillMd(content) {
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return { name: null, description: null, body: content };

  const fm = {};
  for (const line of fmMatch[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) fm[kv[1].trim()] = kv[2].trim();
  }

  const bodyMatch = content.match(/^---\s*\n[\s\S]*?\n---\s*\n([\s\S]*)$/);
  return {
    name: fm.name || null,
    description: fm.description || null,
    body: bodyMatch ? bodyMatch[1].trim() : "",
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
  console.log("=== Anthropic Official Skills Import ===\n");

  // Step 1: Discover all skills — each top-level folder in /skills/ is a skill
  const skillFolders = await fetchSkillFolders();
  console.log(`Found ${skillFolders.length} skill folders.\n`);

  const allSkills = [];

  for (const dir of skillFolders) {
    const { category, skillType } = mapToRamCategory(dir.name, dir.name);
    allSkills.push({
      folderName: dir.name,
      path: dir.path,
      category,
      skillType,
      sourceUrl: `${REPO_URL}/tree/main/${dir.path}`,
    });
  }

  console.log(`Total skills discovered: ${allSkills.length}\n`);

  // Category breakdown
  const cats = {};
  for (const s of allSkills) {
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

  // Step 2: Fetch SKILL.md for each and import
  for (const skill of allSkills) {
    const slug = slugify(skill.folderName);

    // Check for existing by slug
    const existing = existingBySlug.get(slug);

    if (dryRun) {
      // In dry-run, still try to fetch SKILL.md for display
      const skillMd = await fetchSkillMd(skill.path);
      const parsed = skillMd ? parseSkillMd(skillMd) : { name: null, description: null };
      const displayName = parsed.name || skill.folderName;
      const status = existing ? "EXISTS" : "NEW";
      console.log(`  [${status}] ${displayName} → ${skill.category} / ${skill.skillType}`);
      if (parsed.description) console.log(`           ${parsed.description.slice(0, 80)}...`);
      if (status === "NEW") created++;
      else skipped++;
      await sleep(200);
      continue;
    }

    try {
      // Fetch SKILL.md for metadata
      const skillMd = await fetchSkillMd(skill.path);
      const parsed = skillMd ? parseSkillMd(skillMd) : { name: null, description: null, body: "" };

      const displayName = parsed.name || skill.folderName.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const summary = parsed.description || `${displayName} — an official Anthropic skill.`;

      if (existing) {
        // Update source info if missing
        const updates = {};
        if (!existing.sourceUrl) {
          updates.sourceUrl = skill.sourceUrl;
          updates.sourceName = SOURCE_NAME;
        }
        if (!existing.verified) {
          updates.verified = true;
        }

        if (Object.keys(updates).length > 0) {
          await fetchCMS(`/api/skills/${existing.documentId}`, {
            method: "PUT",
            body: JSON.stringify({ data: updates }),
          });
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Create new skill
        const longDesc = parsed.body && parsed.body.length > 50 ? parsed.body.slice(0, 5000) : null;
        const newSkill = {
          name: displayName,
          slug,
          summary: summary.length > 280 ? summary.slice(0, 277) + "..." : summary,
          longDescription: longDesc,
          category: skill.category,
          skillType: skill.skillType,
          provider: SOURCE_NAME,
          status: "live",
          visibility: "public",
          source: "external",
          sourceName: SOURCE_NAME,
          sourceUrl: skill.sourceUrl,
          verified: true,
        };
        await fetchCMS("/api/skills", {
          method: "POST",
          body: JSON.stringify({ data: newSkill }),
        });
        created++;
      }
      await sleep(200);
    } catch (err) {
      console.error(`  FAIL [${slug}]: ${err.message}`);
      failed++;
    }
  }

  console.log(`
=== Anthropic Official Skills Import Complete ===
  Created: ${created}
  Updated: ${updated}
  Skipped: ${skipped}
  Failed:  ${failed}
  Total:   ${allSkills.length}
`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
