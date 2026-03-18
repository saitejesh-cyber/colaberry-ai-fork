#!/usr/bin/env node

/**
 * Classify MCP servers into industries based on keyword matching.
 * Updates the `industry` field in Strapi CMS for all MCP servers.
 *
 * Usage:
 *   node scripts/classify-mcp-industry.mjs [options]
 *
 * Options:
 *   --dry-run          Preview classification without updating CMS
 *   --limit <n>        Only process first n servers
 *   --url <cms-url>    Override CMS URL
 *   --token <token>    Override CMS API token
 *   --reset            Ignore previous progress and start fresh
 *   --force            Re-classify servers that already have an industry
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
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
const resetProgress = hasFlag("--reset");
const force = hasFlag("--force");
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!baseUrl) {
  console.error("Missing CMS URL. Set --url or NEXT_PUBLIC_CMS_URL.");
  process.exit(1);
}
if (!token && !dryRun) {
  console.error("Missing CMS token. Set --token or CMS_API_TOKEN.");
  process.exit(1);
}

/* ---------- Progress tracking -------------------------------------------- */

const PROGRESS_FILE = resolve(process.cwd(), ".classify-industry-progress.json");

function loadProgress() {
  if (resetProgress) return { processed: [] };
  try {
    if (existsSync(PROGRESS_FILE)) {
      return JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
    }
  } catch { /* ignore */ }
  return { processed: [] };
}

function saveProgress(progress) {
  try {
    writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch { /* best effort */ }
}

/* ---------- CMS helpers -------------------------------------------------- */

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

async function fetchAllMCPs() {
  const all = [];
  let page = 1;
  const pageSize = 100;
  while (true) {
    const params = new URLSearchParams({
      "pagination[page]": String(page),
      "pagination[pageSize]": String(pageSize),
      "sort": "name:asc",
    });
    const json = await fetchCMS(`/api/mcp-servers?${params}`);
    const items = json.data || [];
    if (!items.length) break;
    all.push(...items);
    const meta = json.meta?.pagination || {};
    if (page >= (meta.pageCount || 1)) break;
    page++;
  }
  return all;
}

/* ---------- Industry taxonomy -------------------------------------------- */

/**
 * Each industry has a list of keyword patterns.
 * Patterns are matched case-insensitively against the full text corpus.
 * More specific industries are checked first; "General" is the fallback.
 *
 * Weight: each keyword match adds 1 point. Industry with highest score wins.
 * To boost specificity, some keywords are weighted higher (prefixed with *2).
 */
const INDUSTRY_RULES = [
  {
    industry: "Finance & Payments",
    keywords: [
      "payment", "stripe", "paypal", "invoice", "banking", "bank",
      "crypto", "cryptocurrency", "bitcoin", "ethereum", "solana", "wallet",
      "trading", "fintech", "accounting", "ledger", "defi",
      "financial", "revenue", "billing", "checkout", "money", "currency",
      "stock", "stocks", "portfolio", "hedge", "forex",
    ],
  },
  {
    industry: "Healthcare & Life Sciences",
    keywords: [
      "health", "medical", "fhir", "clinical", "patient", "pharma",
      "biotech", "hospital", "diagnosis", "ehr", "healthcare",
      "genomic", "drug", "therapy", "dental", "radiology",
    ],
  },
  {
    industry: "E-Commerce & Retail",
    keywords: [
      "shopify", "ecommerce", "e-commerce", "shopping cart", "inventory",
      "marketplace", "woocommerce", "magento", "retail",
      "product catalog", "fulfillment", "amazon seller",
    ],
  },
  {
    industry: "Security & Identity",
    keywords: [
      "security", "oauth", "sso", "encryption", "firewall",
      "rbac", "identity management", "secrets manager", "vault", "credential",
      "vulnerability", "pentest", "penetration test",
      "2fa", "mfa", "zero trust", "malware", "antivirus",
      "authentication service", "authorization",
    ],
  },
  {
    industry: "AI & Machine Learning",
    keywords: [
      "llm", "embedding", "vector", "openai", "anthropic", "gemini",
      "huggingface", "hugging face", "ml ", "machine learning",
      "neural", "transformer", "fine-tune", "fine tune",
      "training", "inference", "rag", "langchain", "llamaindex",
      "diffusion", "stable diffusion", "image generation",
      "text generation", "copilot", "chatbot",
    ],
  },
  {
    industry: "Data & Analytics",
    keywords: [
      "database", "sql", "postgres", "postgresql", "mysql", "mongo",
      "mongodb", "redis", "analytics", "bi ", "business intelligence",
      "data warehouse", "snowflake", "bigquery", "big query",
      "clickhouse", "elasticsearch", "elastic", "supabase",
      "tableau", "metabase", "grafana", "prometheus",
      "etl", "data pipeline", "dbt", "airflow", "spark",
    ],
  },
  {
    industry: "Cloud & Infrastructure",
    keywords: [
      "aws", "azure", "gcp", "google cloud", "cloud run",
      "serverless", "lambda", "kubernetes", "k8s", "terraform",
      "infrastructure", "devops", "ci/cd", "cicd",
      "docker", "container", "helm", "ansible", "pulumi",
      "cloudflare", "vercel", "netlify", "heroku", "railway",
      "nginx", "dns", "cdn", "load balancer",
    ],
  },
  {
    industry: "Developer Tools",
    keywords: [
      "git", "github", "gitlab", "bitbucket", "code review",
      "ide ", "vscode", "vs code", "cursor", "neovim",
      "debug", "debugger", "lint", "linter", "eslint", "prettier",
      "npm", "package manager", "build tool", "webpack", "vite",
      "testing", "test runner", "jest", "pytest", "ci pipeline",
      "sdk", "cli tool", "developer", "dev tool",
      "code generation", "refactor", "transpile", "compile",
      "monorepo", "turbo", "nx ", "bazel",
    ],
  },
  {
    industry: "Communication",
    keywords: [
      "email", "gmail", "outlook", "smtp", "imap",
      "slack", "discord", "telegram", "whatsapp",
      "sms", "twilio", "messaging", "chat", "notification",
      "push notification", "webhook", "teams", "microsoft teams",
      "intercom", "zendesk", "helpdesk",
    ],
  },
  {
    industry: "Content & Media",
    keywords: [
      "cms", "headless cms", "contentful", "sanity", "strapi",
      "markdown", "blog", "image", "video", "audio",
      "media", "design", "figma", "canva",
      "youtube", "podcast", "streaming", "transcription",
      "pdf", "document", "wordpress", "ghost",
      "social media", "twitter", "instagram", "tiktok",
      "webflow", "website builder", "wix",
    ],
  },
  {
    industry: "Productivity & Workflow",
    keywords: [
      "calendar", "task", "project management",
      "notion", "jira", "trello", "asana", "todoist",
      "workflow", "automation", "zapier", "n8n", "make.com",
      "airtable", "spreadsheet", "google sheets",
      "crm", "salesforce", "hubspot", "pipedrive", "zoho",
      "erp", "monday.com", "linear", "clickup",
    ],
  },
  {
    industry: "Search & Web",
    keywords: [
      "search engine", "web search", "scrape", "scraper", "scraping",
      "browser", "puppeteer", "playwright", "selenium",
      "crawler", "crawl", "web extraction",
      "seo", "sitemap", "indexing",
    ],
  },
  {
    industry: "Storage & Files",
    keywords: [
      "file storage", "s3 bucket", "object storage",
      "drive", "google drive", "dropbox", "onedrive", "box.com",
      "upload", "download", "file manager", "file system",
      "backup", "sync", "rsync", "ftp", "sftp",
    ],
  },
  {
    industry: "Education & Research",
    keywords: [
      "education", "learning", "course", "student", "teacher",
      "university", "academic", "research", "paper", "arxiv",
      "scholar", "citation", "bibliography", "lms",
      "quiz", "exam", "tutoring", "curriculum",
    ],
  },
  {
    industry: "IoT & Hardware",
    keywords: [
      "iot", "sensor", "raspberry pi", "arduino", "mqtt",
      "smart home", "home assistant", "zigbee", "z-wave",
      "embedded", "firmware", "hardware", "robotics",
      "3d print", "cad", "manufacturing",
    ],
  },
];

/**
 * Classify a single MCP server into an industry based on its text fields.
 */
function classifyIndustry(server) {
  const attrs = server.attributes || server;
  const name = (attrs.name || "").toLowerCase();
  const parts = [
    attrs.name || "",
    attrs.description || "",
    attrs.primaryFunction || "",
    attrs.capabilities || "",
    attrs.tools || "",
    attrs.keyBenefits || "",
    attrs.useCases || "",
  ];
  const corpus = parts.join(" ").toLowerCase();

  // Score each industry
  const scores = [];
  for (const rule of INDUSTRY_RULES) {
    let score = 0;
    const matched = [];
    for (const kw of rule.keywords) {
      const kwLower = kw.toLowerCase();
      // Use word-boundary-ish matching: check if keyword appears in corpus
      // For short keywords (<=3 chars), require word boundaries
      let found = false;
      if (kwLower.length <= 3) {
        const regex = new RegExp(`\\b${escapeRegex(kwLower)}\\b`, "i");
        found = regex.test(corpus);
      } else {
        found = corpus.includes(kwLower);
      }
      if (found) {
        // Keywords found in name get 3x weight (more signal)
        const inName = name.includes(kwLower);
        score += inName ? 3 : 1;
        matched.push(kw);
      }
    }
    if (score > 0) {
      scores.push({ industry: rule.industry, score, matched });
    }
  }

  if (scores.length === 0) {
    return { industry: "General", score: 0, matched: [] };
  }

  // Sort by score descending, then by specificity (more specific industries first)
  scores.sort((a, b) => b.score - a.score);
  return scores[0];
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ---------- Main --------------------------------------------------------- */

async function main() {
  console.log("=== MCP Server Industry Classification ===\n");
  console.log(`  CMS:       ${baseUrl}`);
  console.log(`  Dry run:   ${dryRun}`);
  console.log(`  Force:     ${force}`);
  console.log(`  Limit:     ${limit || "all"}\n`);

  // Fetch all MCP servers
  console.log("Fetching all MCP servers from CMS...");
  const allServers = await fetchAllMCPs();
  console.log(`  Found ${allServers.length} total MCP servers.\n`);

  // Filter to those needing classification
  const candidates = force
    ? allServers
    : allServers.filter((s) => {
        const attrs = s.attributes || s;
        return !attrs.industry || attrs.industry === "General";
      });
  console.log(`  ${candidates.length} servers need industry classification.\n`);

  const toProcess = limit ? candidates.slice(0, limit) : candidates;

  // Load progress for resume
  const progress = loadProgress();
  const alreadyDone = new Set(progress.processed);

  // Classify all
  const breakdown = {};
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const server = toProcess[i];
    const attrs = server.attributes || server;
    const name = attrs.name || `id:${server.id}`;
    const documentId = server.documentId || String(server.id);

    if (alreadyDone.has(documentId)) {
      skipped++;
      continue;
    }

    const result = classifyIndustry(server);
    const pct = (((i + 1) / toProcess.length) * 100).toFixed(1);

    // Track breakdown
    breakdown[result.industry] = (breakdown[result.industry] || 0) + 1;

    if (dryRun) {
      if (result.industry !== "General" || i < 20) {
        console.log(`  [${pct}%] ${name} → ${result.industry} (score: ${result.score}, keywords: ${result.matched.slice(0, 5).join(", ")})`);
      }
      updated++;
      continue;
    }

    try {
      await fetchCMS(`/api/mcp-servers/${documentId}`, {
        method: "PUT",
        body: JSON.stringify({ data: { industry: result.industry } }),
      });
      updated++;
      progress.processed.push(documentId);

      if (i % 50 === 0) {
        saveProgress(progress);
      }

      if (result.industry !== "General") {
        console.log(`  [${pct}%] ${name} → ${result.industry} (${result.matched.slice(0, 3).join(", ")})`);
      }

      await sleep(150);
    } catch (err) {
      console.error(`  FAIL [${name}]: ${err.message}`);
      failed++;
    }
  }

  // Save final progress
  if (!dryRun) {
    saveProgress(progress);
  }

  // Print breakdown
  console.log(`\n=== Industry Breakdown ===`);
  const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  for (const [industry, count] of sorted) {
    const bar = "█".repeat(Math.min(50, Math.round((count / toProcess.length) * 100)));
    console.log(`  ${industry.padEnd(28)} ${String(count).padStart(5)}  ${bar}`);
  }

  console.log(`\n=== Classification Complete ===`);
  console.log(`  Updated:  ${updated}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Total:    ${toProcess.length}`);
  console.log(`  Industries: ${Object.keys(breakdown).length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
