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
 *   --force-update     Re-enrich ALL servers (even those with existing content)
 *   --synthesize       Build Overview from existing CMS fields (no GitHub needed)
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
  --force-update     Re-enrich ALL servers (even those with existing content)
  --synthesize       Build Overview from existing CMS fields (no GitHub needed)
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

  # Dev CMS
  GITHUB_TOKEN=ghp_xxx CMS_API_TOKEN=<token> node scripts/enrich-mcps.mjs --url https://dev-cms.colaberry.ai

  # Synthesize Overview for servers without GitHub URLs
  CMS_API_TOKEN=<token> node scripts/enrich-mcps.mjs --url https://dev-cms.colaberry.ai --synthesize

  # Re-enrich all servers with improved extraction
  GITHUB_TOKEN=ghp_xxx CMS_API_TOKEN=<token> node scripts/enrich-mcps.mjs --url https://dev-cms.colaberry.ai --force-update
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
const forceUpdate = hasFlag("--force-update");
const synthesizeMode = hasFlag("--synthesize");
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
    limitations: ["limitations", "known issues", "caveats", "drawbacks", "constraints", "known limitations"],
    exampleWorkflow: ["example", "workflow", "tutorial", "walkthrough", "demo", "quick start", "quickstart"],
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
  function extractBullets(body, maxItems = 12) {
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

  // Helper: convert plain text paragraphs + bullets to HTML
  function formatAsHtml(text) {
    if (!text) return "";
    const lines = text.split("\n");
    const htmlParts = [];
    let currentBullets = [];

    function flushBullets() {
      if (currentBullets.length) {
        htmlParts.push("<ul>" + currentBullets.map((b) => `<li>${b}</li>`).join("") + "</ul>");
        currentBullets = [];
      }
    }

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) { flushBullets(); continue; }

      // Bullet line
      const bulletMatch = trimmed.match(/^[-*•+]\s+(.*)/);
      if (bulletMatch) {
        currentBullets.push(formatInline(bulletMatch[1]));
        continue;
      }

      // Regular paragraph line
      flushBullets();
      htmlParts.push(`<p>${formatInline(trimmed)}</p>`);
    }
    flushBullets();
    return htmlParts.join("");
  }

  // Helper: convert inline markdown to HTML
  function formatInline(text) {
    return text
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/`([^`]+)`/g, "$1");
  }

  // --- Extract longDescription (rich, multi-section, HTML-formatted) ---
  const intro = sections.find((s) => s.title === "__intro__");
  let longDescParts = [];

  // 1. Start with intro
  if (intro) {
    const introText = extractParagraphs(intro.body, 2500);
    if (introText) longDescParts.push(introText);
  }

  // 2. If intro is thin, pull from additional descriptive sections
  const totalLen = () => longDescParts.join("\n\n").length;
  if (totalLen() < 800) {
    const descriptiveSections = ["about", "overview", "description", "introduction", "what is", "how it works", "architecture", "design"];
    for (const kw of descriptiveSections) {
      for (const s of sections) {
        if (s.title === "__intro__") continue;
        if (s.title.toLowerCase().includes(kw)) {
          const sectionText = extractParagraphs(s.body, 1500);
          if (sectionText && sectionText.length > 50) {
            longDescParts.push(sectionText);
          }
        }
      }
      if (totalLen() >= 2500) break;
    }
  }

  // 3. Fallback: try first non-intro section
  if (totalLen() < 50) {
    const firstSection = sections.find((s) => s.title !== "__intro__");
    if (firstSection) {
      const text = extractParagraphs(firstSection.body, 2500);
      if (text) longDescParts.push(text);
    }
  }

  // 4. Final fallback: extract from entire README
  if (totalLen() < 30) {
    const text = extractParagraphs(cleaned, 1500);
    if (text) longDescParts.push(text);
  }

  // Combine, cap at 2500 chars, convert to HTML
  let longDescRaw = longDescParts.join("\n\n");
  if (longDescRaw.length > 2500) longDescRaw = longDescRaw.slice(0, 2500).replace(/\s\S*$/, "");
  const longDescription = formatAsHtml(longDescRaw);

  // --- Extract field-specific content ---
  const result = {
    longDescription,
    keyBenefits: "",
    useCases: "",
    tools: "",
    capabilities: "",
    requirements: "",
    limitations: "",
    exampleWorkflow: "",
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
      const text = extractParagraphs(section.body, 800);
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

/* ---------- Synthesize mode ---------------------------------------------- */

/**
 * Build a rich HTML longDescription from existing CMS fields for servers
 * that have no GitHub sourceUrl and thus can't be enriched from a README.
 */
function synthesizeLongDescription(server) {
  const attrs = server.attributes || server;
  const parts = [];

  // Start with description
  if (attrs.description) {
    parts.push(`<p>${attrs.description}</p>`);
  }

  // Primary function (if different from description)
  if (attrs.primaryFunction && attrs.primaryFunction !== attrs.description) {
    parts.push(`<p><strong>Primary Function:</strong> ${attrs.primaryFunction}</p>`);
  }

  // Capabilities
  const caps = parseField(attrs.capabilities);
  if (caps.length) {
    parts.push(`<p><strong>Key Capabilities:</strong></p><ul>${caps.map((c) => `<li>${c}</li>`).join("")}</ul>`);
  }

  // Key benefits
  const benefits = parseField(attrs.keyBenefits);
  if (benefits.length) {
    parts.push(`<p><strong>Key Benefits:</strong></p><ul>${benefits.map((b) => `<li>${b}</li>`).join("")}</ul>`);
  }

  // Use cases
  const useCases = parseField(attrs.useCases);
  if (useCases.length) {
    parts.push(`<p><strong>Use Cases:</strong></p><ul>${useCases.map((u) => `<li>${u}</li>`).join("")}</ul>`);
  }

  // Tools
  const tools = parseField(attrs.tools);
  if (tools.length) {
    parts.push(`<p><strong>Available Tools:</strong></p><ul>${tools.map((t) => `<li>${t}</li>`).join("")}</ul>`);
  }

  // Server type + language context
  const specParts = [];
  if (attrs.serverType) specParts.push(`Server type: ${attrs.serverType}`);
  if (attrs.language) specParts.push(`Language: ${attrs.language}`);
  if (attrs.category) specParts.push(`Category: ${attrs.category}`);
  if (attrs.industry && attrs.industry !== "General") specParts.push(`Industry: ${attrs.industry}`);
  if (specParts.length) {
    parts.push(`<p><strong>Technical Details:</strong> ${specParts.join(" · ")}</p>`);
  }

  return parts.join("") || null;
}

/** Parse a pipe/newline/bullet-separated string into an array */
function parseField(val) {
  if (!val) return [];
  return val.split(/[|\n]/)
    .map((s) => s.replace(/^[-*•+]\s*/, "").trim())
    .filter((s) => s.length > 3);
}

async function runSynthesize() {
  console.log(`\n🔧 Synthesize mode: building Overview from existing CMS fields...\n`);
  console.log(`  CMS:          ${baseUrl}`);
  console.log(`  Dry run:      ${dryRun}`);

  let page = 1;
  const pageSize = 100;
  const candidates = [];

  while (true) {
    const params = new URLSearchParams({
      "sort": "updatedAt:desc",
      "pagination[page]": String(page),
      "pagination[pageSize]": String(pageSize),
      "filters[longDescription][$null]": "true",
    });
    // Only servers WITHOUT a sourceUrl (GitHub servers are handled by normal enrichment)
    if (!forceUpdate) {
      params.set("filters[$or][0][sourceUrl][$null]", "true");
      params.set("filters[$or][1][sourceUrl][$eq]", "");
    }

    const json = await fetchCMS(`/api/mcp-servers?${params}`);
    const items = json.data || [];
    if (!items.length) break;

    for (const item of items) {
      candidates.push(item);
    }

    const meta = json.meta?.pagination || {};
    if (page >= (meta.pageCount || 1)) break;
    page++;
  }

  console.log(`  Found ${candidates.length} servers to synthesize.\n`);
  if (!candidates.length) { console.log("  ✅ Nothing to synthesize.\n"); return; }

  const toProcess = limit ? candidates.slice(0, limit) : candidates;
  let enriched = 0;
  let skipped = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const server = toProcess[i];
    const attrs = server.attributes || server;
    const name = attrs.name || `id:${server.id}`;
    const documentId = server.documentId || String(server.id);
    const pct = (((i + 1) / toProcess.length) * 100).toFixed(1);

    process.stdout.write(`\r[${i + 1}/${toProcess.length}] (${pct}%) ${name.slice(0, 50).padEnd(50)}  `);

    const html = synthesizeLongDescription(server);
    if (!html || html.length < 50) {
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`\n  [DRY RUN] ${name} — longDescription (${html.length} chars):`);
      console.log(`    ${html.slice(0, 200)}...`);
    } else {
      await fetchCMS(`/api/mcp-servers/${documentId}`, {
        method: "PUT",
        body: JSON.stringify({ data: { longDescription: html } }),
      });
    }
    enriched++;
  }

  console.log(`\n\n━━━ Synthesize Summary ━━━`);
  console.log(`  Synthesized:  ${enriched}`);
  console.log(`  Skipped:      ${skipped} (too little data)`);
  console.log(`  Total:        ${toProcess.length}\n`);
}

/* ---------- Main --------------------------------------------------------- */

async function main() {
  // Dispatch to synthesize mode if requested
  if (synthesizeMode) {
    return runSynthesize();
  }
  console.log(`\n🔍 Fetching MCP servers with empty content fields...\n`);
  console.log(`  CMS:          ${baseUrl}`);
  console.log(`  Dry run:      ${dryRun}`);
  console.log(`  Force update: ${forceUpdate}`);
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
    });
    // --force-update: re-enrich ALL servers with GitHub URLs (even if already enriched)
    // Default: only enrich servers missing longDescription OR installCommand
    if (!forceUpdate) {
      params.set("filters[$or][0][longDescription][$null]", "true");
      params.set("filters[$or][1][installCommand][$null]", "true");
    }

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
      // Note: connectionUrl and configSnippetClaude may not exist in all CMS schemas
      const updatePayload = {
        data: {
          ...(content.longDescription ? { longDescription: content.longDescription } : {}),
          ...(content.keyBenefits ? { keyBenefits: content.keyBenefits } : {}),
          ...(content.useCases ? { useCases: content.useCases } : {}),
          ...(content.tools ? { tools: content.tools } : {}),
          ...(content.capabilities ? { capabilities: content.capabilities } : {}),
          ...(content.requirements ? { requirements: content.requirements } : {}),
          ...(content.limitations ? { limitations: content.limitations } : {}),
          ...(content.exampleWorkflow ? { exampleWorkflow: content.exampleWorkflow } : {}),
          ...(content.installCommand ? { installCommand: content.installCommand } : {}),
          ...(content.configSnippet ? { configSnippet: content.configSnippet } : {}),
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
