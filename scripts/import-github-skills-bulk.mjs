#!/usr/bin/env node

/**
 * Bulk import skills from multiple open-source GitHub repos into Strapi CMS.
 * Pulls from awesome-lists, SKILL.md file repos, and curated collections.
 *
 * Usage:
 *   node scripts/import-github-skills-bulk.mjs [options]
 *
 * Options:
 *   --dry-run          Preview without updating CMS
 *   --url <cms-url>    Override CMS URL
 *   --token <token>    Override CMS API token
 *   --repo <name>      Only import from a specific repo (by key)
 *   --list-repos       List all configured repos
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
import-github-skills-bulk — Import skills from open-source GitHub repos into Strapi CMS

Usage:
  node scripts/import-github-skills-bulk.mjs [options]

Options:
  --dry-run          Preview without updating CMS
  --url <cms-url>    Override CMS URL (default: NEXT_PUBLIC_CMS_URL)
  --token <token>    Override CMS API token (default: CMS_API_TOKEN)
  --repo <key>       Only import from a specific repo (use --list-repos to see keys)
  --list-repos       List all configured repos and exit
`);
  process.exit(0);
}

/* ---------- Config ------------------------------------------------------- */

const urlOverride = getArg("--url");
const tokenOverride = getArg("--token");
if (urlOverride) process.env.NEXT_PUBLIC_CMS_URL = urlOverride;
if (tokenOverride) process.env.CMS_API_TOKEN = tokenOverride;

const dryRun = hasFlag("--dry-run");
const onlyRepo = getArg("--repo");

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

const PROGRESS_FILE = resolve(process.cwd(), ".github-bulk-import-progress.json");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Repo Configurations ------------------------------------------ */

/**
 * Each repo config:
 *   key       — unique short name
 *   owner     — GitHub org/user
 *   repo      — repo name
 *   type      — "awesome-list" | "skill-files" | "readme-table"
 *   license   — license of the repo
 *   verified  — whether to mark imported skills as verified
 *   provider  — provider name in CMS
 */
const REPOS = [
  {
    key: "anthropics-skills",
    owner: "anthropics",
    repo: "skills",
    type: "skill-files",
    license: "MIT",
    verified: true,
    provider: "Anthropic",
  },
  {
    key: "microsoft-skills",
    owner: "microsoft",
    repo: "skills",
    type: "skill-files",
    license: "CC-BY-4.0",
    verified: true,
    provider: "Microsoft",
  },
  {
    key: "voltAgent-awesome-agent-skills",
    owner: "VoltAgent",
    repo: "awesome-agent-skills",
    type: "awesome-list",
    license: "Open",
    verified: false,
    provider: "VoltAgent Community",
  },
  {
    key: "antigravity-awesome-skills",
    owner: "sickn33",
    repo: "antigravity-awesome-skills",
    type: "awesome-list",
    license: "Open",
    verified: false,
    provider: "Antigravity Community",
  },
  {
    key: "voltAgent-openclaw",
    owner: "VoltAgent",
    repo: "awesome-openclaw-skills",
    type: "awesome-list",
    license: "Open",
    verified: false,
    provider: "OpenClaw Community",
  },
  {
    key: "composio-claude-skills",
    owner: "ComposioHQ",
    repo: "awesome-claude-skills",
    type: "awesome-list",
    license: "Open",
    verified: false,
    provider: "ComposioHQ Community",
  },
  {
    key: "karanb192-claude-skills",
    owner: "karanb192",
    repo: "awesome-claude-skills",
    type: "awesome-list",
    license: "Open",
    verified: false,
    provider: "Community",
  },
  {
    key: "heilcheng-awesome-skills",
    owner: "heilcheng",
    repo: "awesome-agent-skills",
    type: "awesome-list",
    license: "Open",
    verified: false,
    provider: "Community",
  },
  {
    key: "tech-leads-club",
    owner: "tech-leads-club",
    repo: "agent-skills",
    type: "skill-files",
    license: "Open",
    verified: true,
    provider: "Tech Leads Club",
  },
  {
    key: "medical-skills",
    owner: "FreedomIntelligence",
    repo: "OpenClaw-Medical-Skills",
    type: "awesome-list",
    license: "Open",
    verified: false,
    provider: "FreedomIntelligence",
  },
  {
    key: "supabase-skills",
    owner: "supabase",
    repo: "agent-skills",
    type: "skill-files",
    license: "Apache-2.0",
    verified: true,
    provider: "Supabase",
  },
];

if (hasFlag("--list-repos")) {
  console.log("\nConfigured repositories:\n");
  for (const r of REPOS) {
    console.log(`  ${r.key.padEnd(35)} ${r.owner}/${r.repo} (${r.type}, ${r.license})`);
  }
  console.log();
  process.exit(0);
}

/* ---------- Category classification -------------------------------------- */

function classifySkill(name, summary) {
  const text = `${name} ${summary}`.toLowerCase();

  const officialPatterns = [
    /\bpdf\b/, /\bdocx?\b/, /\bword\b/, /\bexcel\b/, /\bxlsx?\b/,
    /\bpptx?\b/, /\bpowerpoint\b/, /\bslide/, /\bspreadsheet/,
    /\breact\s*best/i, /\bweb\s*design/i, /\bnext\.?js/i,
    /\bdocument\s*management/i, /\bframework\s*best/i,
  ];
  for (const p of officialPatterns) {
    if (p.test(text)) return { category: "Official Pre-built Skills", skillType: guessSubCategory(text, "official") };
  }

  const orchestrationPatterns = [
    /\borchestrat/, /\bparallel\s*dispatch/, /\bsub.?agent/,
    /\bskill\s*writer/, /\bmeta.?skill/, /\bagent\s*manag/,
    /\bmulti.?agent/, /\bagent\s*coordinat/, /\bself.?improv/,
    /\bfind.?skill/, /\bskill\s*discover/,
  ];
  for (const p of orchestrationPatterns) {
    if (p.test(text)) return { category: "Agent Orchestration Skills", skillType: "Agent Management" };
  }

  const devPatterns = [
    /\bcode\s*gen/, /\bscaffold/, /\bboilerplate/, /\btemplate\s*gen/,
    /\bunit\s*test/, /\btest\s*gen/, /\blint/, /\bcode\s*review/, /\bcode\s*quality/,
    /\bgit\b/, /\bcommit/, /\bci\/?cd/, /\bpipeline/,
    /\bdebug/, /\btask.?plan/, /\bplanning/,
    /\brefactor/, /\bcode\s*analy/,
    /\bcursor\b/, /\bvs\s*code/, /\bcopilot/, /\bide\b/,
    /\bgithub\b/, /\bdocker/, /\bdevops/, /\bbuild\b/,
    /\btypescript/, /\bjavascript/, /\bpython\b/, /\brust\b/,
    /\bapi\s*gen/, /\bswagger/, /\bopenapi/,
  ];
  for (const p of devPatterns) {
    if (p.test(text)) return { category: "Developer & Workflow Skills", skillType: guessSubCategory(text, "dev") };
  }

  const domainPatterns = [
    /\bkubernetes/, /\baws\b/, /\bcloudflare/, /\bterraform/, /\bazure\b/,
    /\bcloud\b/, /\binfrastructur/,
    /\bmeeting/, /\bschedul/, /\bcrm\b/, /\bsales/, /\bmarketing/,
    /\bmedical/, /\bhealthcare/, /\blegal\b/, /\bfinance/,
    /\bemail\b/, /\bcalendar/, /\bslack/, /\bnotion/,
    /\bdatabase/, /\bsql\b/, /\bpostgres/, /\bmongo/,
    /\bweather/, /\bscrape/, /\bcrawl/, /\bbrowser\s*auto/,
    /\bimage/, /\bdesign\b/, /\bfigma/, /\baudio/, /\btranslat/,
    /\bsearch\b/, /\brag\b/, /\bvector/, /\bauth/, /\bsecurity/,
  ];
  for (const p of domainPatterns) {
    if (p.test(text)) return { category: "Specialized Domain Skills", skillType: guessSubCategory(text, "domain") };
  }

  return { category: "Developer & Workflow Skills", skillType: "General" };
}

function guessSubCategory(text, parent) {
  if (parent === "official") {
    if (/pdf|docx?|word|xlsx?|excel|spreadsheet|pptx?|powerpoint|slide/.test(text)) return "Document Management";
    if (/react|next\.?js|web\s*design|framework/.test(text)) return "Web & Framework Best Practices";
    return "Document Management";
  }
  if (parent === "dev") {
    if (/code\s*gen|scaffold|boilerplate|template/.test(text)) return "Code Generation";
    if (/test|lint|code\s*review|code\s*quality/.test(text)) return "Code Quality";
    if (/git|commit|ci|pipeline|deploy|docker/.test(text)) return "Workflow Automation";
    if (/debug|plan|brainstorm/.test(text)) return "Planning & Debugging";
    return "Code Generation";
  }
  if (parent === "domain") {
    if (/kubernetes|aws|cloudflare|terraform|azure|cloud|infra|database|sql/.test(text)) return "Cloud & Infrastructure";
    if (/meeting|schedul|crm|sales|marketing|business|email|calendar|slack|legal|finance|medical/.test(text)) return "Business Operations";
    if (/art|video|brand|content|image|design|audio|music|translat/.test(text)) return "Content & Media";
    return "Business Operations";
  }
  return "General";
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/* ---------- GitHub API helpers ------------------------------------------- */

const GH_HEADERS = {
  "User-Agent": "colaberry-import/1.0",
  Accept: "application/vnd.github.v3+json",
};

async function ghFetch(url) {
  const res = await fetch(url, { headers: GH_HEADERS });
  if (res.status === 403 || res.status === 429) {
    console.warn("  ⚠ GitHub rate limit hit, waiting 60s...");
    await sleep(60000);
    return ghFetch(url);
  }
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${url}`);
  return res;
}

async function fetchReadmeRaw(owner, repo) {
  const res = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/readme`);
  const data = await res.json();
  const rawRes = await fetch(data.download_url, { headers: { "User-Agent": "colaberry-import/1.0" } });
  return rawRes.text();
}

async function fetchRepoTree(owner, repo, path = "") {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const res = await ghFetch(url);
  return res.json();
}

async function fetchRawFile(owner, repo, path) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "colaberry-import/1.0" } });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

/* ---------- Parsers for different repo types ------------------------------ */

/**
 * Parse awesome-list README — extracts skills from markdown tables and list items.
 * Handles multiple formats:
 *   - Table rows: | [name](url) | description |
 *   - List items: - [name](url) - description
 *   - Bold list:  - **[name](url)** — description
 */
function parseAwesomeList(readme, repoConfig) {
  const lines = readme.split("\n");
  const skills = [];
  let currentSection = "";

  for (const line of lines) {
    // Track section headings
    const headingMatch = line.match(/^#{1,4}\s+(.+)/);
    if (headingMatch) {
      currentSection = headingMatch[1].replace(/[^\w\s&/-]/g, "").trim();
      continue;
    }

    // Pattern 1: Table row — | [name](url) | description |
    const tableMatch = line.match(/\|\s*\*?\*?\[([^\]]+)\]\(([^)]+)\)\*?\*?\s*\|\s*([^|]+)/);
    if (tableMatch) {
      const [, name, url, desc] = tableMatch;
      skills.push(makeSkillEntry(name.trim(), url.trim(), desc.trim(), currentSection, repoConfig));
      continue;
    }

    // Pattern 2: List item — - [name](url) — description  OR  - **[name](url)** - description
    const listMatch = line.match(/^[-*]\s+\*?\*?\[([^\]]+)\]\(([^)]+)\)\*?\*?\s*[-–—:]*\s*(.*)/);
    if (listMatch) {
      const [, name, url, desc] = listMatch;
      if (name.length > 2 && desc.length > 5) {
        skills.push(makeSkillEntry(name.trim(), url.trim(), desc.trim(), currentSection, repoConfig));
      }
      continue;
    }

    // Pattern 3: Numbered list — 1. [name](url) — description
    const numMatch = line.match(/^\d+\.\s+\*?\*?\[([^\]]+)\]\(([^)]+)\)\*?\*?\s*[-–—:]*\s*(.*)/);
    if (numMatch) {
      const [, name, url, desc] = numMatch;
      if (name.length > 2 && desc.length > 5) {
        skills.push(makeSkillEntry(name.trim(), url.trim(), desc.trim(), currentSection, repoConfig));
      }
    }
  }

  return skills;
}

function makeSkillEntry(name, url, description, section, repoConfig) {
  const slug = slugify(name);
  const { category, skillType } = classifySkill(name, description);
  return {
    name,
    slug,
    summary: description.length > 280 ? description.slice(0, 277) + "..." : description,
    category,
    skillType,
    provider: repoConfig.provider,
    sourceUrl: url.startsWith("http") ? url : `https://github.com/${repoConfig.owner}/${repoConfig.repo}`,
    sourceName: `${repoConfig.owner}/${repoConfig.repo}`,
    verified: repoConfig.verified,
    section,
  };
}

/**
 * Parse skill-files repos — repos with SKILL.md files in subdirectories.
 * Each subdirectory containing a SKILL.md is treated as a skill.
 */
async function parseSkillFilesRepo(repoConfig) {
  const { owner, repo } = repoConfig;
  console.log(`  Listing directories in ${owner}/${repo}...`);

  const skills = [];

  try {
    const contents = await fetchRepoTree(owner, repo);
    const dirs = contents.filter((c) => c.type === "dir" && !c.name.startsWith("."));

    for (const dir of dirs) {
      await sleep(100); // Rate limit
      const skillMd = await fetchRawFile(owner, repo, `${dir.name}/SKILL.md`);
      if (!skillMd) continue;

      // Parse SKILL.md — extract name and description from frontmatter or content
      const parsed = parseSkillMd(skillMd, dir.name);
      const { category, skillType } = classifySkill(parsed.name, parsed.summary);

      skills.push({
        name: parsed.name,
        slug: slugify(parsed.name),
        summary: parsed.summary.length > 280 ? parsed.summary.slice(0, 277) + "..." : parsed.summary,
        longDescription: parsed.longDescription || null,
        category,
        skillType,
        provider: repoConfig.provider,
        sourceUrl: `https://github.com/${owner}/${repo}/tree/main/${dir.name}`,
        sourceName: `${owner}/${repo}`,
        verified: repoConfig.verified,
      });

      console.log(`    Found: ${parsed.name}`);
    }
  } catch (err) {
    console.warn(`  ⚠ Error fetching ${owner}/${repo}: ${err.message}`);
  }

  return skills;
}

/**
 * Parse SKILL.md content — extracts name/description from YAML frontmatter or first lines.
 */
function parseSkillMd(content, dirName) {
  let name = dirName.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  let summary = "";
  let longDescription = "";

  // Try YAML frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const nameMatch = fm.match(/(?:name|title):\s*["']?(.+?)["']?\s*$/m);
    if (nameMatch) name = nameMatch[1].trim();

    const descMatch = fm.match(/description:\s*["']?(.+?)["']?\s*$/m);
    if (descMatch) summary = descMatch[1].trim();

    // Body after frontmatter
    longDescription = content.slice(fmMatch[0].length).trim();
  } else {
    // No frontmatter — use first heading and paragraph
    const headingMatch = content.match(/^#\s+(.+)/m);
    if (headingMatch) name = headingMatch[1].trim();

    // First paragraph after heading
    const lines = content.split("\n");
    for (const line of lines) {
      if (line.startsWith("#") || line.trim() === "") continue;
      if (line.trim().length > 10) {
        summary = line.trim();
        break;
      }
    }

    longDescription = content;
  }

  // Fallback summary from content
  if (!summary && longDescription) {
    const firstPara = longDescription.split("\n\n")[0]?.replace(/[#*_`]/g, "").trim();
    if (firstPara) summary = firstPara.slice(0, 280);
  }

  if (!summary) summary = `${name} — AI agent skill.`;

  return { name, summary, longDescription: longDescription.slice(0, 5000) };
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

/* ---------- Progress tracking -------------------------------------------- */

function loadProgress() {
  if (existsSync(PROGRESS_FILE)) {
    return JSON.parse(readFileSync(PROGRESS_FILE, "utf8"));
  }
  return { created: [], updated: [], skipped: [], failed: [] };
}

function saveProgress(progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

/* ---------- Main --------------------------------------------------------- */

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  GitHub Bulk Skills Import — Open Source Repos              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  if (!baseUrl && !dryRun) {
    console.error("Missing CMS URL. Set NEXT_PUBLIC_CMS_URL or use --url.");
    process.exit(1);
  }

  const repos = onlyRepo ? REPOS.filter((r) => r.key === onlyRepo) : REPOS;
  if (repos.length === 0) {
    console.error(`Unknown repo key: ${onlyRepo}. Use --list-repos to see options.`);
    process.exit(1);
  }

  // Fetch existing CMS skills for dedup
  let existingBySlug = new Map();
  if (!dryRun) {
    console.log("Fetching existing CMS skills for dedup...");
    const existing = await fetchAllCMSSkills();
    for (const s of existing) {
      existingBySlug.set(s.slug, s);
    }
    console.log(`  Found ${existing.length} existing skills.\n`);
  }

  const progress = dryRun ? { created: [], updated: [], skipped: [], failed: [] } : loadProgress();
  let totalCreated = 0, totalSkipped = 0, totalFailed = 0;

  for (const repoConfig of repos) {
    console.log(`\n── ${repoConfig.owner}/${repoConfig.repo} (${repoConfig.type}) ──`);

    let skills = [];

    try {
      if (repoConfig.type === "awesome-list") {
        const readme = await fetchReadmeRaw(repoConfig.owner, repoConfig.repo);
        skills = parseAwesomeList(readme, repoConfig);
      } else if (repoConfig.type === "skill-files") {
        skills = await parseSkillFilesRepo(repoConfig);
      }
    } catch (err) {
      console.error(`  ⚠ Failed to fetch ${repoConfig.owner}/${repoConfig.repo}: ${err.message}`);
      continue;
    }

    console.log(`  Parsed ${skills.length} skills.`);

    if (dryRun) {
      for (const s of skills.slice(0, 10)) {
        console.log(`    [PREVIEW] ${s.name} → ${s.category} / ${s.skillType}`);
      }
      if (skills.length > 10) console.log(`    ... and ${skills.length - 10} more.`);
      continue;
    }

    // Seed into CMS
    let repoCreated = 0, repoSkipped = 0, repoFailed = 0;

    for (const skill of skills) {
      // Skip if already in CMS
      if (existingBySlug.has(skill.slug)) {
        repoSkipped++;
        continue;
      }

      // Skip if already processed in a previous run
      if (progress.created.includes(skill.slug) || progress.skipped.includes(skill.slug)) {
        repoSkipped++;
        continue;
      }

      try {
        const cmsData = {
          name: skill.name,
          slug: skill.slug,
          summary: skill.summary,
          category: skill.category,
          skillType: skill.skillType,
          provider: skill.provider,
          status: "live",
          visibility: "public",
          source: "external",
          sourceName: skill.sourceName,
          sourceUrl: skill.sourceUrl,
          verified: skill.verified,
          industry: "Cross-industry",
        };

        if (skill.longDescription) {
          cmsData.longDescription = skill.longDescription;
        }

        await fetchCMS("/api/skills", {
          method: "POST",
          body: JSON.stringify({ data: cmsData }),
        });

        existingBySlug.set(skill.slug, { slug: skill.slug });
        progress.created.push(skill.slug);
        repoCreated++;
        totalCreated++;

        if (repoCreated % 50 === 0) {
          console.log(`    Progress: ${repoCreated} created, ${repoSkipped} skipped...`);
          saveProgress(progress);
        }

        await sleep(100);
      } catch (err) {
        // If it's a duplicate slug error, mark as skipped
        if (err.message.includes("unique") || err.message.includes("already")) {
          progress.skipped.push(skill.slug);
          repoSkipped++;
          totalSkipped++;
        } else {
          progress.failed.push(skill.slug);
          repoFailed++;
          totalFailed++;
          if (repoFailed <= 5) {
            console.error(`    FAIL [${skill.slug}]: ${err.message.slice(0, 100)}`);
          }
        }
      }
    }

    saveProgress(progress);
    console.log(`  ✓ Created: ${repoCreated} | Skipped: ${repoSkipped} | Failed: ${repoFailed}`);
  }

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Import Complete                                            ║
╠══════════════════════════════════════════════════════════════╣
║  Created: ${String(totalCreated).padEnd(48)}║
║  Skipped: ${String(totalSkipped).padEnd(48)}║
║  Failed:  ${String(totalFailed).padEnd(48)}║
╚══════════════════════════════════════════════════════════════╝
`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
