#!/usr/bin/env node

/**
 * Enrich MCP server records in Strapi with content parsed from GitHub READMEs.
 *
 * Usage:
 *   node scripts/enrich-mcps.mjs [options]
 *
 * Options:
 *   --dry-run          Preview changes without updating Strapi
 *   --limit <n>        Only process first n servers (default: all)
 *   --url <cms-url>    Override CMS URL (default: NEXT_PUBLIC_CMS_URL)
 *   --token <token>    Override CMS API token (default: CMS_API_TOKEN)
 *   --reset            Ignore previous progress and start fresh
 *   --help             Show this help message
 *
 * Environment variables:
 *   NEXT_PUBLIC_CMS_URL    Strapi CMS base URL
 *   CMS_API_TOKEN          Strapi API token
 *   GITHUB_TOKEN           GitHub personal access token (optional, raises rate limits)
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);

function getArg(name, fallback = "") {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : fallback;
}
function hasFlag(name) {
  return args.includes(name);
}

if (hasFlag("--help")) {
  console.log(`
enrich-mcps — Populate empty MCP server fields from GitHub READMEs

Usage:
  node scripts/enrich-mcps.mjs [options]

Options:
  --dry-run          Preview changes without updating Strapi
  --limit <n>        Only process first n servers
  --url <cms-url>    Override CMS URL (default: NEXT_PUBLIC_CMS_URL)
  --token <token>    Override CMS API token (default: CMS_API_TOKEN)
  --reset            Ignore previous progress and start fresh
  --help             Show this help message

Environment variables:
  NEXT_PUBLIC_CMS_URL    Strapi CMS base URL
  CMS_API_TOKEN          Strapi API token
  GITHUB_TOKEN           GitHub PAT (optional, raises rate limits 60 → 5000/hr)

Examples:
  # Local dry run
  node scripts/enrich-mcps.mjs --dry-run --limit 10

  # All local servers
  GITHUB_TOKEN=ghp_xxx node scripts/enrich-mcps.mjs

  # Dev CMS (3,500+ servers)
  GITHUB_TOKEN=ghp_xxx CMS_API_TOKEN=<token> node scripts/enrich-mcps.mjs --url https://dev-cms.colaberry.ai
`);
  process.exit(0);
}

/* ---------- Config ------------------------------------------------------- */

const urlOverride = getArg("--url");
const tokenOverride = getArg("--token");
if (urlOverride) process.env.NEXT_PUBLIC_CMS_URL = urlOverride;
if (tokenOverride) process.env.CMS_API_TOKEN = tokenOverride;

const dryRun = hasFlag("--dry-run");
const resetProgress = hasFlag("--reset");
const limitArg = getArg("--limit");
const limit = limitArg ? Number.parseInt(limitArg, 10) : 0;

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

const githubToken = (process.env.GITHUB_TOKEN || "").trim();

if (!baseUrl) {
  console.error("Missing CMS URL. Set --url or NEXT_PUBLIC_CMS_URL.");
  process.exit(1);
}
if (!token && !dryRun) {
  console.error("Missing CMS token. Set --token or CMS_API_TOKEN.");
  process.exit(1);
}

/* ---------- Progress tracking -------------------------------------------- */

const PROGRESS_FILE = resolve(process.cwd(), ".enrich-progress.json");

function loadProgress() {
  if (resetProgress) return { processed: [], failed: [] };
  try {
    if (existsSync(PROGRESS_FILE)) {
      const data = JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
      return { processed: data.processed || [], failed: data.failed || [] };
    }
  } catch { /* ignore corrupt file */ }
  return { processed: [], failed: [] };
}

function saveProgress(progress) {
  try {
    writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch { /* best effort */ }
}

/* ---------- GitHub rate limit tracking ----------------------------------- */

let ghRateLimitRemaining = githubToken ? 5000 : 60;
let ghRateLimitReset = 0;

function updateRateLimit(res) {
  const remaining = res.headers.get("x-ratelimit-remaining");
  const reset = res.headers.get("x-ratelimit-reset");
  if (remaining != null) ghRateLimitRemaining = Number(remaining);
  if (reset != null) ghRateLimitReset = Number(reset);
}

async function waitForRateLimit() {
  if (ghRateLimitRemaining > 10) return;
  const now = Math.floor(Date.now() / 1000);
  const waitSec = Math.max(0, ghRateLimitReset - now) + 5;
  console.log(`  ⏳ GitHub rate limit low (${ghRateLimitRemaining} remaining). Waiting ${waitSec}s for reset...`);
  await sleep(waitSec * 1000);
  ghRateLimitRemaining = githubToken ? 5000 : 60;
}

/* ---------- Helpers ------------------------------------------------------ */

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
    throw new Error(`CMS ${res.status}: ${await res.text().catch(() => "")}`);
  }
  return res.json();
}

async function fetchGitHubReadme(owner, repo) {
  await waitForRateLimit();

  const headers = {
    Accept: "application/vnd.github.v3.raw",
    "User-Agent": "colaberry-enrich",
  };
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`;

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
  updateRateLimit(res);

  if (res.status === 403 || res.status === 429) {
    // Rate limited — wait and retry once
    console.log("  ⏳ Rate limited, waiting for reset...");
    const resetTime = Number(res.headers.get("x-ratelimit-reset") || 0);
    const waitSec = Math.max(0, resetTime - Math.floor(Date.now() / 1000)) + 5;
    await sleep(waitSec * 1000);
    ghRateLimitRemaining = githubToken ? 5000 : 60;
    // Retry
    const retry = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
    updateRateLimit(retry);
    if (!retry.ok) return null;
    return retry.text();
  }

  if (!res.ok) return null;
  return res.text();
}

/**
 * Parse a GitHub README into structured content fields.
 * Splits by ## headings, matches section titles to target fields via keywords,
 * and extracts bullet lists / paragraphs.
 */
function parseReadmeContent(name, readme) {
  // Clean markdown artifacts
  const cleaned = readme
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, "") // badge links [![...](...)][...]
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")               // badge images ![...](...)
    .replace(/<\/?(?:p|br|div|span|img|a|table|tr|td|th|thead|tbody|hr)[^>]*>/gi, "") // HTML tags
    .replace(/<!--[\s\S]*?-->/g, "");                    // HTML comments

  // Split into sections by ## or ### headings
  const sectionRegex = /^#{1,3}\s+(.+)$/gm;
  const sections = [];
  let lastIndex = 0;
  let lastTitle = null;
  let match;

  while ((match = sectionRegex.exec(cleaned)) !== null) {
    if (lastTitle !== null) {
      sections.push({ title: lastTitle, body: cleaned.slice(lastIndex, match.index).trim() });
    } else {
      // Everything before the first heading = intro
      sections.push({ title: "__intro__", body: cleaned.slice(0, match.index).trim() });
    }
    lastTitle = match[1].trim();
    lastIndex = match.index + match[0].length;
  }
  // Push last section
  if (lastTitle !== null) {
    sections.push({ title: lastTitle, body: cleaned.slice(lastIndex).trim() });
  } else {
    // No headings at all — treat entire README as intro
    sections.push({ title: "__intro__", body: cleaned.trim() });
  }

  // Keyword map: field → heading keywords (case-insensitive)
  const fieldKeywords = {
    keyBenefits: ["features", "key features", "benefits", "highlights", "why"],
    useCases: ["use cases", "usage", "examples", "use"],
    tools: ["tools", "api", "endpoints", "actions", "commands", "available tools", "functions", "methods"],
    capabilities: ["capabilities", "what it does", "supported", "overview"],
    requirements: ["requirements", "prerequisites", "dependencies", "system requirements", "installation", "install", "setup", "getting started"],
  };

  // Helper: clean markdown formatting from text
  function cleanMarkdown(text) {
    return text
      .replace(/\*\*([^*]+)\*\*/g, "$1")       // **bold** → bold
      .replace(/\*([^*]+)\*/g, "$1")            // *italic* → italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")  // [link](url) → link
      .replace(/`([^`]+)`/g, "$1")              // `code` → code
      .replace(/\*{2,}/g, "")                   // leftover ** markers
      .trim();
  }

  // Helper: extract bullet items from section body
  function extractBullets(body, maxItems = 8) {
    const lines = body.split("\n");
    const bullets = [];
    let inCodeBlock = false;
    for (const line of lines) {
      if (line.trim().startsWith("```")) { inCodeBlock = !inCodeBlock; continue; }
      if (inCodeBlock) continue;
      const trimmed = line.trim();
      const bulletMatch = trimmed.match(/^[-*+]\s+(.*)/);
      if (bulletMatch) {
        const text = cleanMarkdown(bulletMatch[1]);
        if (text.length > 5 && text.length < 300) {
          bullets.push(text);
        }
      }
      if (bullets.length >= maxItems) break;
    }
    return bullets;
  }

  // Helper: extract paragraphs from body (skip code blocks, badges, etc.)
  function extractParagraphs(body, maxChars = 800) {
    const lines = body.split("\n");
    const paragraphs = [];
    let inCodeBlock = false;
    let current = [];

    for (const line of lines) {
      if (line.trim().startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;

      const trimmed = line.trim();
      // Skip bullets, badges, empty lines, short lines
      if (!trimmed) {
        if (current.length) {
          paragraphs.push(current.join(" "));
          current = [];
        }
        continue;
      }
      if (trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("|")) continue;
      if (trimmed.startsWith("#")) continue;
      if (trimmed.length < 20) continue;

      current.push(cleanMarkdown(trimmed));
    }
    if (current.length) paragraphs.push(current.join(" "));

    // Join until maxChars
    let result = "";
    for (const p of paragraphs) {
      if (result.length + p.length > maxChars) break;
      result += (result ? "\n\n" : "") + p;
    }
    return result;
  }

  // Helper: find a section matching keywords
  function findSection(keywords) {
    for (const kw of keywords) {
      for (const s of sections) {
        if (s.title === "__intro__") continue;
        if (s.title.toLowerCase().includes(kw.toLowerCase())) {
          return s;
        }
      }
    }
    return null;
  }

  // --- Extract longDescription ---
  const intro = sections.find((s) => s.title === "__intro__");
  let longDescription = "";
  if (intro) {
    longDescription = extractParagraphs(intro.body, 800);
  }
  // Fallback: try the first non-intro section (body under # Title heading)
  if (!longDescription || longDescription.length < 50) {
    const firstSection = sections.find((s) => s.title !== "__intro__");
    if (firstSection) {
      longDescription = extractParagraphs(firstSection.body, 800);
    }
  }
  // Fallback: try "about" or "overview" or "description" sections
  if (!longDescription || longDescription.length < 50) {
    const aboutSection = findSection(["about", "overview", "description", "introduction"]);
    if (aboutSection) {
      longDescription = extractParagraphs(aboutSection.body, 800);
    }
  }
  // Final fallback: extract cleaned paragraphs from entire README
  if (!longDescription || longDescription.length < 30) {
    longDescription = extractParagraphs(cleaned, 500);
  }

  // --- Extract field-specific content ---
  const result = {
    longDescription,
    keyBenefits: "",
    useCases: "",
    tools: "",
    capabilities: "",
    requirements: "",
    installCommand: "",
    configSnippet: "",
    configSnippetClaude: "",
    connectionUrl: "",
  };

  for (const [field, keywords] of Object.entries(fieldKeywords)) {
    const section = findSection(keywords);
    if (!section) continue;

    const bullets = extractBullets(section.body);
    if (bullets.length > 0) {
      result[field] = bullets.map((b) => `• ${b}`).join("\n");
    } else {
      // No bullets found — try paragraphs
      const text = extractParagraphs(section.body, 500);
      if (text) result[field] = text;
    }
  }

  // --- Fallback: derive keyBenefits from intro bullets if empty ---
  if (!result.keyBenefits && intro) {
    const introBullets = extractBullets(intro.body);
    if (introBullets.length > 0) {
      result.keyBenefits = introBullets.map((b) => `• ${b}`).join("\n");
    }
  }

  // --- Fallback: derive capabilities from features if available ---
  if (!result.capabilities && result.keyBenefits) {
    result.capabilities = result.keyBenefits;
  }

  // --- Extract install command from code blocks ---
  const installKeywords = ["installation", "install", "setup", "getting started", "quick start", "quickstart", "usage"];
  const installPatterns = /^\s*(npm\s+install|npm\s+i\s|npx\s|pip\s+install|pip3\s+install|pipx\s+install|docker\s+(?:run|pull)|brew\s+install|cargo\s+install|go\s+install|uv\s+(?:pip|tool)|uvx\s)/;
  for (const kw of installKeywords) {
    if (result.installCommand) break;
    for (const s of sections) {
      if (s.title === "__intro__") continue;
      if (!s.title.toLowerCase().includes(kw)) continue;
      // Extract code blocks from the section body
      const codeBlockRegex = /```(?:bash|sh|shell|zsh|console|terminal|text)?\s*\n([\s\S]*?)```/g;
      let cbMatch;
      while ((cbMatch = codeBlockRegex.exec(s.body)) !== null) {
        const lines = cbMatch[1].split("\n").map((l) => l.replace(/^\$\s*/, "").trim()).filter(Boolean);
        for (const line of lines) {
          if (installPatterns.test(line) && line.length < 200) {
            result.installCommand = line;
            break;
          }
        }
        if (result.installCommand) break;
      }
    }
  }
  // Fallback: search entire README for install-looking code blocks
  if (!result.installCommand) {
    const globalCodeBlocks = /```(?:bash|sh|shell|zsh|console|terminal|text)?\s*\n([\s\S]*?)```/g;
    let gcbMatch;
    while ((gcbMatch = globalCodeBlocks.exec(cleaned)) !== null) {
      const lines = gcbMatch[1].split("\n").map((l) => l.replace(/^\$\s*/, "").trim()).filter(Boolean);
      for (const line of lines) {
        if (installPatterns.test(line) && line.length < 200) {
          result.installCommand = line;
          break;
        }
      }
      if (result.installCommand) break;
    }
  }

  // --- Extract config snippet (MCP client JSON config) ---
  const configKeywords = ["configuration", "config", "setup", "claude", "usage", "getting started", "quick start"];
  const jsonBlockRegex = /```(?:json|jsonc)?\s*\n([\s\S]*?)```/g;
  for (const kw of configKeywords) {
    if (result.configSnippet) break;
    for (const s of sections) {
      if (s.title === "__intro__") continue;
      if (!s.title.toLowerCase().includes(kw)) continue;
      let jMatch;
      jsonBlockRegex.lastIndex = 0;
      while ((jMatch = jsonBlockRegex.exec(s.body)) !== null) {
        const block = jMatch[1].trim();
        // Look for MCP config patterns
        if (block.includes("mcpServers") || block.includes("mcp-server") || block.includes('"command"') || block.includes('"args"')) {
          // Check if it's specifically a Claude Desktop config
          const isClaude = s.title.toLowerCase().includes("claude") || block.includes("claude_desktop_config") || block.includes("Claude");
          if (isClaude && !result.configSnippetClaude) {
            result.configSnippetClaude = block;
          }
          if (!result.configSnippet) {
            result.configSnippet = block;
          }
        }
      }
    }
  }
  // Fallback: search entire README for JSON blocks with MCP config
  if (!result.configSnippet) {
    let gjMatch;
    jsonBlockRegex.lastIndex = 0;
    while ((gjMatch = jsonBlockRegex.exec(cleaned)) !== null) {
      const block = gjMatch[1].trim();
      if (block.includes("mcpServers") || (block.includes('"command"') && block.includes('"args"'))) {
        const isClaude = block.includes("claude_desktop_config") || block.includes("Claude");
        if (isClaude && !result.configSnippetClaude) {
          result.configSnippetClaude = block;
        }
        if (!result.configSnippet) {
          result.configSnippet = block;
        }
        break;
      }
    }
  }

  // --- Extract connection URL ---
  // Look for sse://, ws://, wss:// URLs, or https:// URLs with mcp/server in path
  const urlPatterns = /(?:sse|wss?):\/\/[^\s"'<>)]+|https?:\/\/[^\s"'<>)]*(?:mcp|\/sse)[^\s"'<>)]*/gi;
  const urlMatch = cleaned.match(urlPatterns);
  if (urlMatch) {
    // Filter out common non-connection URLs (docs, badges, github, images)
    const connectionUrl = urlMatch.find((u) =>
      !u.includes("github.com") &&
      !u.includes("badge") &&
      !u.includes("shields.io") &&
      !u.includes("img.") &&
      !u.includes(".md") &&
      !u.includes("npmjs.com") &&
      !u.includes("pypi.org") &&
      (u.startsWith("sse://") || u.startsWith("ws://") || u.startsWith("wss://") || u.includes("/sse") || u.includes("/mcp"))
    );
    if (connectionUrl) {
      // Clean trailing markdown artifacts (backticks, brackets, periods)
      result.connectionUrl = connectionUrl.replace(/[`\]).,;]+$/, "");
    }
  }

  return result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatETA(elapsedMs, done, total) {
  if (done === 0) return "calculating...";
  const msPerItem = elapsedMs / done;
  const remainingMs = msPerItem * (total - done);
  const mins = Math.ceil(remainingMs / 60000);
  if (mins < 1) return "<1min";
  if (mins < 60) return `${mins}min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}

/* ---------- Main --------------------------------------------------------- */

async function main() {
  console.log(`\n🔍 Fetching MCP servers with empty content fields...\n`);
  console.log(`  CMS:          ${baseUrl}`);
  console.log(`  Dry run:      ${dryRun}`);
  console.log(`  GitHub token: ${githubToken ? "yes (5,000 req/hr)" : "no (60 req/hr — add GITHUB_TOKEN for speed)"}`);
  if (limit) console.log(`  Limit:        ${limit}`);

  // Load resume progress
  const progress = loadProgress();
  const processedSet = new Set(progress.processed);
  if (processedSet.size > 0 && !resetProgress) {
    console.log(`  Resuming:     ${processedSet.size} already processed (use --reset to start fresh)`);
  }

  // Fetch servers that have a sourceUrl but are missing key content
  let page = 1;
  const pageSize = 100;
  const candidates = [];

  while (true) {
    // Fetch servers that have a GitHub sourceUrl but are missing content OR
    // install/config fields needed for the API tab and ConnectSidebar.
    const params = new URLSearchParams({
      "sort": "updatedAt:desc",
      "pagination[page]": String(page),
      "pagination[pageSize]": String(pageSize),
      "filters[sourceUrl][$notNull]": "true",
      "filters[sourceUrl][$ne]": "",
      // Match servers missing longDescription OR installCommand
      "filters[$or][0][longDescription][$null]": "true",
      "filters[$or][1][installCommand][$null]": "true",
    });

    const json = await fetchCMS(`/api/mcp-servers?${params}`);
    const items = json.data || [];
    if (!items.length) break;

    for (const item of items) {
      const attrs = item.attributes || item;
      const sourceUrl = attrs.sourceUrl || "";
      const ghMatch = sourceUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (ghMatch) {
        const documentId = item.documentId || String(item.id);
        // Skip already-processed servers (resume support)
        if (processedSet.has(documentId)) continue;
        candidates.push({
          id: item.id,
          documentId,
          name: attrs.name || "",
          slug: attrs.slug || "",
          sourceUrl,
          owner: ghMatch[1],
          repo: ghMatch[2].replace(/\.git$/, ""),
        });
      }
    }

    const meta = json.meta?.pagination || {};
    if (page >= (meta.pageCount || 1)) break;
    page++;
  }

  const totalInCMS = candidates.length + processedSet.size;
  console.log(`\n  Found ${candidates.length} servers to enrich (${processedSet.size} already done, ${totalInCMS} total with GitHub URLs).`);

  if (candidates.length === 0) {
    console.log("\n  ✅ All servers already enriched! Use --reset to re-process.\n");
    return;
  }

  const toProcess = limit ? candidates.slice(0, limit) : candidates;
  let enriched = 0;
  let skipped = 0;
  let failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < toProcess.length; i++) {
    const server = toProcess[i];
    const pct = (((i + 1) / toProcess.length) * 100).toFixed(1);
    const eta = formatETA(Date.now() - startTime, i, toProcess.length);

    process.stdout.write(`\r[${i + 1}/${toProcess.length}] (${pct}%) ${server.name.slice(0, 40).padEnd(40)} | GH: ${ghRateLimitRemaining} rem | ETA: ${eta}  `);

    try {
      // Fetch README (single GitHub API call per server)
      const readme = await fetchGitHubReadme(server.owner, server.repo);
      if (!readme) {
        skipped++;
        progress.processed.push(server.documentId);
        if (i % 20 === 0) saveProgress(progress);
        continue;
      }

      // Parse README content directly (no AI needed)
      const content = parseReadmeContent(server.name, readme);

      // Build update payload — only non-empty fields
      const updatePayload = {
        data: {
          ...(content.longDescription ? { longDescription: content.longDescription } : {}),
          ...(content.keyBenefits ? { keyBenefits: content.keyBenefits } : {}),
          ...(content.useCases ? { useCases: content.useCases } : {}),
          ...(content.tools ? { tools: content.tools } : {}),
          ...(content.capabilities ? { capabilities: content.capabilities } : {}),
          ...(content.requirements ? { requirements: content.requirements } : {}),
          ...(content.installCommand ? { installCommand: content.installCommand } : {}),
          ...(content.configSnippet ? { configSnippet: content.configSnippet } : {}),
          ...(content.configSnippetClaude ? { configSnippetClaude: content.configSnippetClaude } : {}),
          ...(content.connectionUrl ? { connectionUrl: content.connectionUrl } : {}),
        },
      };

      const fieldCount = Object.keys(updatePayload.data).length;

      if (dryRun) {
        console.log(`\n  [DRY RUN] ${server.name} — ${fieldCount} fields:`);
        for (const [f, val] of Object.entries(updatePayload.data)) {
          const preview = typeof val === "string" && val.length > 80 ? val.slice(0, 80) + "..." : val;
          console.log(`    ${f}: ${preview}`);
        }
      } else {
        await fetchCMS(`/api/mcp-servers/${server.documentId}`, {
          method: "PUT",
          body: JSON.stringify(updatePayload),
        });
      }

      enriched++;
      progress.processed.push(server.documentId);

      // Save progress every 10 servers
      if (enriched % 10 === 0) saveProgress(progress);

      // Smart rate limiting: slow down when GitHub quota is low
      if (ghRateLimitRemaining < 100) {
        await sleep(2000);
      } else if (ghRateLimitRemaining < 500) {
        await sleep(1000);
      } else {
        await sleep(300);
      }
    } catch (err) {
      console.log(`\n  ❌ ${server.name}: ${err.message}`);
      failed++;
      progress.failed.push(server.documentId);

      // Back off on errors
      await sleep(2000);
    }
  }

  // Final save
  saveProgress(progress);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log(`\n\n━━━ Summary ━━━`);
  console.log(`  Enriched:     ${enriched}`);
  console.log(`  Skipped:      ${skipped} (no README)`);
  console.log(`  Failed:       ${failed}`);
  console.log(`  Total:        ${toProcess.length}`);
  console.log(`  Time:         ${elapsed}s`);
  console.log(`  Progress:     ${progress.processed.length} total processed (saved to .enrich-progress.json)`);
  if (failed > 0) {
    console.log(`\n  💡 Re-run the script to retry failed servers (progress is saved).`);
  }
  console.log();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
