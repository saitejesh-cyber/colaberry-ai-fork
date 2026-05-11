#!/usr/bin/env node
/**
 * scripts/aeo-citation-test.mjs
 * ──────────────────────────────────────────────────────────────────────
 * LAYER 3 — actual LLM citation outcomes for www.colaberry.ai vs.
 * competitors. Runs a test-query suite against Perplexity / ChatGPT
 * Search / Claude / Gemini and measures: which sites get cited?
 *
 * HOW TO RUN
 *
 *   This script DRIVES A BROWSER via Chrome MCP. You need:
 *
 *   1. The Claude in Chrome extension installed + connected to your Mac
 *      (https://chrome.claude.com)
 *   2. A live Chrome session signed-in to:
 *        - perplexity.ai
 *        - chat.openai.com (optional — falls back to Perplexity-only mode)
 *        - claude.ai      (optional)
 *        - gemini.google.com (optional)
 *
 *   3. Run from a Claude Code session WITH Chrome MCP tools attached
 *      (the tools whose names start with `mcp__Claude_in_Chrome__`).
 *      Plain `node scripts/aeo-citation-test.mjs` will print the test
 *      plan but cannot execute browser queries on its own.
 *
 * THE TEST SUITE
 *
 *   20 queries × 4 categories (5 each):
 *
 *     A) Branded         : "colaberry agents", "what is colaberry.ai"
 *     B) Unbranded direct: "best AI agent catalog", "MCP server registry"
 *     C) Competitive     : "alternatives to huggingface for agents"
 *     D) Adjacent / wide : "AI knowledge graph", "LLM architecture wiki"
 *
 *   Each query is run on the largest accessible AI engine
 *   (Perplexity by default — no auth wall, structured citations). For
 *   each response we extract the cited domains and score:
 *
 *     - colaberry.ai cited:        +2 pts
 *     - Any direct competitor:     +1 pt (per competitor)
 *     - Total dataset: 20 queries × 1 engine = 20 scoring rounds
 *
 * OUTPUT
 *
 *   docs/aeo-benchmarks/<ISO-WEEK>-citations.md   (human report)
 *   docs/aeo-benchmarks/<ISO-WEEK>-citations.json (machine-readable)
 *
 * WHY THIS LIVES IN A SEPARATE SCRIPT
 *
 *   The infrastructure benchmark (aeo-benchmark.mjs) is fast (~30s),
 *   runs in CI, and uses only public HTTP probes. The citation test
 *   needs interactive browser sessions with the user's own logins,
 *   so it can't run in GitHub Actions reliably. It's meant to run
 *   manually before a board review, or quarterly, alongside the
 *   automated infra benchmark.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(REPO_ROOT, "docs/aeo-benchmarks");

// ────────────────────────────────────────────────────────────────────
// The test query suite — 20 queries across 4 categories
// Edit this list as Ram / Karun add new queries to monitor.
// ────────────────────────────────────────────────────────────────────

export const QUERIES = [
  // ── A. Branded queries (5) — should clearly cite colaberry.ai ─────
  { id: "A1", category: "branded", text: "What is colaberry.ai" },
  { id: "A2", category: "branded", text: "Colaberry AI agents catalog" },
  { id: "A3", category: "branded", text: "Colaberry MCP server directory" },
  { id: "A4", category: "branded", text: "Colaberry AI knowledge graph" },
  { id: "A5", category: "branded", text: "Colaberry AI skills" },

  // ── B. Unbranded direct (5) — what we want to win ────────────────
  { id: "B1", category: "unbranded", text: "Best AI agent catalog 2026" },
  { id: "B2", category: "unbranded", text: "MCP server registry" },
  { id: "B3", category: "unbranded", text: "Where can I discover AI skills for enterprise" },
  { id: "B4", category: "unbranded", text: "Open source AI agent marketplace" },
  { id: "B5", category: "unbranded", text: "AI agent knowledge graph" },

  // ── C. Competitive (5) — discovery via competitor comparison ─────
  { id: "C1", category: "competitive", text: "Alternatives to huggingface for AI agents" },
  { id: "C2", category: "competitive", text: "Replicate vs Modal vs Together for AI inference" },
  { id: "C3", category: "competitive", text: "LangChain agents vs CrewAI comparison" },
  { id: "C4", category: "competitive", text: "AI catalogs that index MCP servers" },
  { id: "C5", category: "competitive", text: "Best places to find AI agents 2026" },

  // ── D. Adjacent / wide (5) — AEO topics where we want to surface ─
  { id: "D1", category: "adjacent",   text: "LLM architecture deep dive resources" },
  { id: "D2", category: "adjacent",   text: "Llama 3.2 architecture explanation" },
  { id: "D3", category: "adjacent",   text: "Best resources for enterprise AI discovery" },
  { id: "D4", category: "adjacent",   text: "How to build an AI agent for business" },
  { id: "D5", category: "adjacent",   text: "What is Model Context Protocol" },
];

// Domains we're tracking citation hit-rate on
export const TRACKED_DOMAINS = [
  "colaberry.ai",
  "huggingface.co",
  "replicate.com",
  "smithery.ai",
  "ollama.com",
  "modal.com",
  "together.ai",
  "fireworks.ai",
  "langchain.com",
  "crewai.com",
  "voiceflow.com",
  "anthropic.com",
  "openai.com",
  "mistral.ai",
  "pinecone.io",
];

// ────────────────────────────────────────────────────────────────────
// Scoring helpers (export for the orchestrator)
// ────────────────────────────────────────────────────────────────────

export function scoreCitations(citationsByQuery) {
  // citationsByQuery: { queryId: [domainsCited] }
  const stats = {};
  for (const d of TRACKED_DOMAINS) {
    stats[d] = {
      total_citations: 0,
      branded: 0, unbranded: 0, competitive: 0, adjacent: 0,
      queries_cited_in: [],
    };
  }
  for (const q of QUERIES) {
    const cited = citationsByQuery[q.id] || [];
    for (const d of cited) {
      if (!stats[d]) continue;
      stats[d].total_citations++;
      stats[d][q.category]++;
      stats[d].queries_cited_in.push(q.id);
    }
  }
  return stats;
}

// ────────────────────────────────────────────────────────────────────
// Markdown formatter (the orchestrator passes in the citation data
// after running the actual browser queries)
// ────────────────────────────────────────────────────────────────────

export function formatCitationReport(citationsByQuery, dateStr, week, engine = "perplexity.ai") {
  const stats = scoreCitations(citationsByQuery);
  const ranked = TRACKED_DOMAINS.map((d) => ({ domain: d, ...stats[d] }))
    .sort((a, b) => b.total_citations - a.total_citations);

  const lines = [];
  lines.push(`# AEO Citation Test — ${week}`);
  lines.push("");
  lines.push(`**Run:** ${dateStr} · **Engine:** ${engine} · **Queries:** ${QUERIES.length} · **Tracked domains:** ${TRACKED_DOMAINS.length}`);
  lines.push("");
  lines.push(`## Citation hit-rate (which sites the AI engine actually cited)`);
  lines.push(``);
  lines.push(`| Rank | Domain | Total citations | Branded | Unbranded | Competitive | Adjacent |`);
  lines.push(`|---|---|---|---|---|---|---|`);
  ranked.forEach((r, i) => {
    const star = r.domain === "colaberry.ai" ? "**" : "";
    lines.push(`| ${i + 1} | ${star}${r.domain}${star} | ${star}${r.total_citations}${star} | ${r.branded} | ${r.unbranded} | ${r.competitive} | ${r.adjacent} |`);
  });
  lines.push("");
  lines.push(`## Per-query breakdown`);
  lines.push("");
  for (const q of QUERIES) {
    const cited = citationsByQuery[q.id] || [];
    const tracked = cited.filter((d) => TRACKED_DOMAINS.includes(d));
    lines.push(`**${q.id}** (${q.category}): _"${q.text}"_`);
    lines.push(`  - Tracked sites cited: ${tracked.length ? tracked.join(", ") : "_none_"}`);
    if (cited.length > tracked.length) {
      lines.push(`  - Other domains cited: ${cited.filter((d) => !TRACKED_DOMAINS.includes(d)).join(", ")}`);
    }
    lines.push("");
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`_Method: 20 queries run against ${engine} via Chrome MCP browser automation. Each cited domain is parsed from the response's source list. Tracked domains are the 15 sites in the AEO benchmark; "Other" includes news, docs, GitHub repos cited but outside our competitor watchlist._`);
  return lines.join("\n");
}

// ────────────────────────────────────────────────────────────────────
// Orchestrator entry — what to do when run via `node`
// ────────────────────────────────────────────────────────────────────

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function main() {
  console.log(`AEO citation test — query suite manifest`);
  console.log(``);
  console.log(`Total queries: ${QUERIES.length} across 4 categories`);
  for (const cat of ["branded", "unbranded", "competitive", "adjacent"]) {
    const items = QUERIES.filter((q) => q.category === cat);
    console.log(`  ${cat.padEnd(12)}: ${items.length} queries`);
    for (const q of items) console.log(`    ${q.id}. ${q.text}`);
  }
  console.log(``);
  console.log(`Tracked domains: ${TRACKED_DOMAINS.length}`);
  TRACKED_DOMAINS.forEach((d) => console.log(`  - ${d}`));
  console.log(``);
  console.log(`HOW TO RUN`);
  console.log(`  This script requires Chrome MCP browser automation to actually`);
  console.log(`  execute queries on perplexity.ai. The recommended workflow:`);
  console.log(``);
  console.log(`  1. From a Claude Code session with Chrome MCP tools attached:`);
  console.log(`     Open perplexity.ai in a Chrome tab the extension can see.`);
  console.log(`  2. Tell Claude: "run the AEO citation test suite". Claude will`);
  console.log(`     iterate through each query, capture the cited domains, and`);
  console.log(`     write the report to docs/aeo-benchmarks/<week>-citations.md`);
  console.log(`  3. Reproduce manually: open each query in Perplexity yourself,`);
  console.log(`     paste the response into a json file, then call`);
  console.log(`     formatCitationReport() from this module.`);
  console.log(``);
  console.log(`Run cadence: quarterly, or after any major SEO/AEO change.`);

  // Generate an empty stub report so the file exists in the repo for review
  const stub = formatCitationReport({}, new Date().toISOString().slice(0, 16) + " UTC (NOT YET RUN)", isoWeek(new Date()));
  const week = isoWeek(new Date());
  await mkdir(OUT_DIR, { recursive: true });
  const outPath = resolve(OUT_DIR, `${week}-citations-stub.md`);
  await writeFile(outPath, stub + `\n\n_⚠ This is a STUB report — no live queries have been run yet. To populate, run the test suite manually as described above._\n`);
  console.log(``);
  console.log(`Wrote stub report to ${outPath}`);
}

// Only run main() if invoked directly, not when imported
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
