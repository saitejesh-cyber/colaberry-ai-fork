#!/usr/bin/env node
/**
 * scripts/aeo-benchmark.mjs — v2
 * ──────────────────────────────────────────────────────────────────────
 * AEO benchmark for www.colaberry.ai vs. 15 competitors across THREE
 * layers (the actual model of how AI search ranking works):
 *
 *   LAYER 1 — INFRASTRUCTURE (10 pts)
 *     Can the bot fetch + parse our site?
 *     1.  AI bot allowlist in robots.txt              (2.0)
 *     2.  /llms.txt present                            (1.5)
 *     3.  /llms-full.txt present                       (1.5)
 *     4.  Schema.org JSON-LD on homepage               (2.0)
 *     5.  Schema.org JSON-LD on deep canonical page    (1.5)
 *     6.  Sitemap depth ≥ 100 URLs                     (1.5)
 *
 *   LAYER 2 — AUTHORITY (6 pts) — proxies for backlinks / brand
 *     7.  Wikipedia article exists                     (2.0)
 *     8.  Domain age ≥ 3 years (archive.org proxy)     (2.0)
 *     9.  Public GitHub presence (≥ 100 stars)         (2.0)
 *
 *   LAYER 3 — CITATION (no points — separate script)
 *     Live LLM citation tests run by aeo-citation-test.mjs
 *     (Requires Chrome MCP browser automation — see that file.)
 *
 * Total possible: 16 points across Layers 1+2.
 *
 * Run locally:   node scripts/aeo-benchmark.mjs
 * Run via CI:    .github/workflows/aeo-benchmark.yml  (Mondays 04:00 UTC)
 *
 * Honesty note: a high Layer 1 score does NOT mean the site is "winning"
 * in AI search — it just means the foundation is in place. Layer 2 is
 * what compounds over months. Layer 3 is the actual outcome we care
 * about; run aeo-citation-test.mjs to measure that directly.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(REPO_ROOT, "docs/aeo-benchmarks");

// ────────────────────────────────────────────────────────────────────
// Expanded competitor set — 15 sites across 5 category clusters
// ────────────────────────────────────────────────────────────────────

const SITES = [
  // — Primary —
  { host: "www.colaberry.ai",  deep: "/aixcelerator/llm-architectures/llama-3-2-3b", label: "colaberry.ai",  category: "primary",            wikipedia: "Colaberry", isPrimary: true },

  // — Direct AI catalogs / agent registries —
  { host: "huggingface.co",    deep: "/models",                                       label: "huggingface.co", category: "AI catalog",        wikipedia: "Hugging_Face" },
  { host: "replicate.com",     deep: "/explore",                                      label: "replicate.com",  category: "AI catalog",        wikipedia: "Replicate_(company)" },
  { host: "smithery.ai",       deep: "/",                                              label: "smithery.ai",    category: "MCP registry",      wikipedia: null },
  { host: "ollama.com",        deep: "/library",                                       label: "ollama.com",     category: "AI catalog",        wikipedia: "Ollama" },

  // — Inference + hosting —
  { host: "modal.com",         deep: "/docs",                                          label: "modal.com",      category: "Inference",         wikipedia: null },
  { host: "together.ai",       deep: "/models",                                        label: "together.ai",    category: "Inference",         wikipedia: null },
  { host: "fireworks.ai",      deep: "/models",                                        label: "fireworks.ai",   category: "Inference",         wikipedia: null },

  // — Agent platforms / frameworks —
  { host: "langchain.com",     deep: "/products",                                      label: "langchain.com",  category: "Agent framework",   wikipedia: "LangChain" },
  { host: "crewai.com",        deep: "/",                                              label: "crewai.com",     category: "Agent framework",   wikipedia: null },
  { host: "voiceflow.com",     deep: "/",                                              label: "voiceflow.com",  category: "Agent framework",   wikipedia: null },

  // — Frontier labs (authority anchors) —
  { host: "anthropic.com",     deep: "/news",                                          label: "anthropic.com",  category: "Frontier lab",      wikipedia: "Anthropic" },
  { host: "openai.com",        deep: "/blog",                                          label: "openai.com",     category: "Frontier lab",      wikipedia: "OpenAI" },
  { host: "mistral.ai",        deep: "/news",                                          label: "mistral.ai",     category: "Frontier lab",      wikipedia: "Mistral_AI" },

  // — Vector / RAG infra (adjacent) —
  { host: "pinecone.io",       deep: "/learn",                                         label: "pinecone.io",    category: "Vector DB",         wikipedia: "Pinecone_(company)" },
];

const AI_BOTS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"];

const WEIGHTS = {
  // Layer 1 — Infrastructure
  robots_ai: 2.0,
  llms_txt: 1.5,
  llms_full: 1.5,
  schema_home: 2.0,
  schema_deep: 1.5,
  sitemap_depth: 1.5,
  // Layer 2 — Authority
  wikipedia: 2.0,
  domain_age: 2.0,
  github_presence: 2.0,
};
const MAX_TOTAL = Object.values(WEIGHTS).reduce((a, b) => a + b, 0); // 16
const MAX_LAYER_1 = 10;
const MAX_LAYER_2 = 6;

// ────────────────────────────────────────────────────────────────────
// HTTP helpers
// ────────────────────────────────────────────────────────────────────

async function fetchText(url, ua = "Mozilla/5.0 (compatible; AEO-Benchmark/2.0)") {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, { headers: { "User-Agent": ua }, signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    return { status: res.status, text: await res.text() };
  } catch {
    return { status: 0, text: "" };
  }
}

async function fetchHead(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { method: "HEAD", signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    return res.status;
  } catch {
    return 0;
  }
}

async function fetchJSON(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { Accept: "application/json" } });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────
// Layer 2 — Authority probes (all use FREE public APIs)
// ────────────────────────────────────────────────────────────────────

async function checkWikipedia(wikipediaSlug) {
  // Wikipedia API: returns 200 + page metadata if the article exists
  if (!wikipediaSlug) return false;
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikipediaSlug)}`;
  const data = await fetchJSON(url);
  if (!data) return false;
  // "missingtitle" or "type: disambiguation" → not a real article
  return data.type === "standard" || data.type === "no-extract";
}

async function checkArchiveFirstSeen(host) {
  // Internet Archive Wayback Machine — when was this domain first archived?
  // A site archived 5+ years ago has compounded authority signals from any source linking to it.
  const url = `https://archive.org/wayback/available?url=${encodeURIComponent(host)}&timestamp=2015`;
  const data = await fetchJSON(url);
  if (!data?.archived_snapshots?.closest?.timestamp) return null;
  const ts = data.archived_snapshots.closest.timestamp; // YYYYMMDDHHMMSS
  const year = parseInt(ts.slice(0, 4), 10);
  return year;
}

async function checkGithub(host) {
  // Strategy: derive org name from host (e.g., "colaberry.ai" → "colaberry"),
  // query GitHub API for org's most-starred repo.
  const orgGuess = host.replace(/^www\./, "").split(".")[0];
  const url = `https://api.github.com/orgs/${encodeURIComponent(orgGuess)}/repos?sort=stars&per_page=5`;
  const data = await fetchJSON(url);
  if (!Array.isArray(data) || data.length === 0) return 0;
  return Math.max(...data.map((r) => r.stargazers_count || 0));
}

// ────────────────────────────────────────────────────────────────────
// Audit one site
// ────────────────────────────────────────────────────────────────────

async function auditSite(site) {
  const base = `https://${site.host}`;
  const out = { ...site };

  // ── Layer 1 — Infrastructure ─────────────────────────────────────

  // 1. robots.txt — count AI bots explicitly allowlisted
  const robots = await fetchText(`${base}/robots.txt`);
  out.bots_listed = AI_BOTS.filter((b) =>
    new RegExp(`User-agent:\\s*${b}\\b`, "i").test(robots.text)
  );
  out.score_robots = (out.bots_listed.length / AI_BOTS.length) * WEIGHTS.robots_ai;

  // 2. /llms.txt
  out.has_llms_txt = (await fetchHead(`${base}/llms.txt`)) === 200;
  out.score_llms = out.has_llms_txt ? WEIGHTS.llms_txt : 0;

  // 3. /llms-full.txt
  out.has_llms_full = (await fetchHead(`${base}/llms-full.txt`)) === 200;
  out.score_llms_full = out.has_llms_full ? WEIGHTS.llms_full : 0;

  // 4. Homepage Schema.org JSON-LD
  const home = await fetchText(`${base}/`);
  out.schema_home_types = [...new Set([...home.text.matchAll(/"@type"\s*:\s*"([A-Za-z]+)"/g)].map((m) => m[1]))];
  out.score_schema_home = out.schema_home_types.length > 0 ? WEIGHTS.schema_home : 0;

  // 5. Deep page schema
  const deep = await fetchText(`${base}${site.deep}`);
  out.schema_deep_types = [...new Set([...deep.text.matchAll(/"@type"\s*:\s*"([A-Za-z]+)"/g)].map((m) => m[1]))];
  out.score_schema_deep = out.schema_deep_types.length > 0 ? WEIGHTS.schema_deep : 0;

  // 6. Sitemap URL count
  const sitemap = await fetchText(`${base}/sitemap.xml`);
  out.sitemap_urls = (sitemap.text.match(/<loc>[^<]+<\/loc>/g) || []).length;
  out.score_sitemap = out.sitemap_urls >= 100 ? WEIGHTS.sitemap_depth : 0;

  out.score_layer_1 = +(
    out.score_robots + out.score_llms + out.score_llms_full +
    out.score_schema_home + out.score_schema_deep + out.score_sitemap
  ).toFixed(2);

  // ── Layer 2 — Authority probes ───────────────────────────────────

  out.has_wikipedia = await checkWikipedia(site.wikipedia);
  out.score_wikipedia = out.has_wikipedia ? WEIGHTS.wikipedia : 0;

  out.archive_first_seen_year = await checkArchiveFirstSeen(site.host);
  const currentYear = new Date().getFullYear();
  out.domain_age_years = out.archive_first_seen_year ? currentYear - out.archive_first_seen_year : 0;
  out.score_domain_age = out.domain_age_years >= 3 ? WEIGHTS.domain_age : 0;

  out.github_max_stars = await checkGithub(site.host);
  out.score_github = out.github_max_stars >= 100 ? WEIGHTS.github_presence : 0;

  out.score_layer_2 = +(out.score_wikipedia + out.score_domain_age + out.score_github).toFixed(2);

  // Total
  out.total = +(out.score_layer_1 + out.score_layer_2).toFixed(2);

  return out;
}

// ────────────────────────────────────────────────────────────────────
// Format result as Markdown
// ────────────────────────────────────────────────────────────────────

function formatMarkdown(results, dateStr, isoWeek) {
  const sorted = [...results].sort((a, b) => b.total - a.total);
  const sortedByL1 = [...results].sort((a, b) => b.score_layer_1 - a.score_layer_1);
  const sortedByL2 = [...results].sort((a, b) => b.score_layer_2 - a.score_layer_2);
  const primary = sorted.find((r) => r.isPrimary);
  const primaryRank = sorted.findIndex((r) => r.isPrimary) + 1;
  const primaryRankL1 = sortedByL1.findIndex((r) => r.isPrimary) + 1;
  const primaryRankL2 = sortedByL2.findIndex((r) => r.isPrimary) + 1;

  const lines = [];
  lines.push(`# AEO Indexability Benchmark — ${isoWeek}`);
  lines.push("");
  lines.push(`**Run:** ${dateStr} · **Weekly cadence** · **Source:** \`scripts/aeo-benchmark.mjs\` (v2 — 15 sites · 2 layers · 16 pts)`);
  lines.push("");

  lines.push(`## Summary`);
  lines.push("");
  lines.push(`- **${primary.label}** ranked **#${primaryRank} of ${sorted.length}** overall with score **${primary.total} / ${MAX_TOTAL}**`);
  lines.push(`- **Layer 1 (Infrastructure):** #${primaryRankL1}, **${primary.score_layer_1} / ${MAX_LAYER_1}**`);
  lines.push(`- **Layer 2 (Authority):** #${primaryRankL2}, **${primary.score_layer_2} / ${MAX_LAYER_2}**`);
  const closest = sorted.filter((r) => !r.isPrimary)[0];
  if (closest) {
    lines.push(`- Closest competitor: **${closest.label}** at **${closest.total} / ${MAX_TOTAL}**`);
  }
  lines.push("");

  lines.push(`## Overall scorecard (Layer 1 + Layer 2)`);
  lines.push("");
  lines.push(`| Rank | Site | Category | L1 (infra) | L2 (authority) | **Total** |`);
  lines.push(`|---|---|---|---|---|---|`);
  sorted.forEach((r, i) => {
    const star = r.isPrimary ? "**" : "";
    lines.push(`| ${i + 1} | ${star}${r.label}${star} | ${r.category} | ${r.score_layer_1.toFixed(1)} / ${MAX_LAYER_1} | ${r.score_layer_2.toFixed(1)} / ${MAX_LAYER_2} | ${star}${r.total.toFixed(1)} / ${MAX_TOTAL}${star} |`);
  });
  lines.push("");

  lines.push(`## Layer 1 — Infrastructure (out of ${MAX_LAYER_1})`);
  lines.push(``);
  lines.push(`| Rank | Site | AI bots | /llms | /full | Home schema | Deep schema | Sitemap | L1 total |`);
  lines.push(`|---|---|---|---|---|---|---|---|---|`);
  sortedByL1.forEach((r, i) => {
    const star = r.isPrimary ? "**" : "";
    lines.push(`| ${i + 1} | ${star}${r.label}${star} | ${r.score_robots.toFixed(1)} | ${r.score_llms.toFixed(1)} | ${r.score_llms_full.toFixed(1)} | ${r.score_schema_home.toFixed(1)} | ${r.score_schema_deep.toFixed(1)} | ${r.score_sitemap.toFixed(1)} | ${star}${r.score_layer_1.toFixed(1)}${star} |`);
  });
  lines.push("");

  lines.push(`## Layer 2 — Authority (out of ${MAX_LAYER_2})`);
  lines.push(``);
  lines.push(`Proxies for backlinks / brand strength using free public APIs.`);
  lines.push(``);
  lines.push(`| Rank | Site | Wikipedia | Domain age (yrs) | Top GH stars | L2 total |`);
  lines.push(`|---|---|---|---|---|---|`);
  sortedByL2.forEach((r, i) => {
    const star = r.isPrimary ? "**" : "";
    const wikiBadge = r.has_wikipedia ? "✓" : "—";
    const ageBadge = r.domain_age_years > 0 ? r.domain_age_years.toString() : "—";
    const ghBadge = r.github_max_stars >= 100 ? r.github_max_stars.toLocaleString() : r.github_max_stars > 0 ? `${r.github_max_stars} (<100)` : "—";
    lines.push(`| ${i + 1} | ${star}${r.label}${star} | ${wikiBadge} (${r.score_wikipedia.toFixed(1)}) | ${ageBadge} (${r.score_domain_age.toFixed(1)}) | ${ghBadge} (${r.score_github.toFixed(1)}) | ${star}${r.score_layer_2.toFixed(1)}${star} |`);
  });
  lines.push("");

  lines.push(`## What this benchmark does NOT measure`);
  lines.push(``);
  lines.push(`- **Layer 3 (Citation):** actual LLM citations in answers from ChatGPT / Claude / Perplexity / Gemini. Run \`scripts/aeo-citation-test.mjs\` for that — needs Chrome MCP browser automation.`);
  lines.push(`- **Inbound backlink count:** would need paid Ahrefs/Moz/SEMrush. Wikipedia + domain age + GitHub stars are free proxies.`);
  lines.push(`- **Content freshness:** how often the site publishes new long-form content. Worth adding in v3.`);
  lines.push(`- **Brand mentions in news:** Google News doesn't expose a free API. Could add via NewsAPI free tier (100 req/day).`);
  lines.push(``);
  lines.push(`A site that wins Layers 1+2 has **the technical and authority foundation** to be cited by AI engines. Whether it IS being cited is Layer 3 — a separate measurement.`);
  lines.push("");

  lines.push(`## Per-site detail`);
  lines.push("");
  sorted.forEach((r) => {
    lines.push(`### ${r.label}${r.isPrimary ? " (primary)" : ""}  ·  ${r.category}`);
    lines.push(`**Layer 1 — Infrastructure (${r.score_layer_1.toFixed(1)} / ${MAX_LAYER_1})**`);
    lines.push(`- AI bots in robots.txt: ${r.bots_listed.length}/${AI_BOTS.length} ${r.bots_listed.length ? `(${r.bots_listed.join(", ")})` : "(none)"}`);
    lines.push(`- \`/llms.txt\`: ${r.has_llms_txt ? "✓" : "✗"} · \`/llms-full.txt\`: ${r.has_llms_full ? "✓" : "✗"}`);
    lines.push(`- Homepage schema: ${r.schema_home_types.length ? r.schema_home_types.join(", ") : "_none_"}`);
    lines.push(`- Deep-page (\`${r.deep}\`) schema: ${r.schema_deep_types.length ? r.schema_deep_types.join(", ") : "_none_"}`);
    lines.push(`- Sitemap URLs: ${r.sitemap_urls}`);
    lines.push(``);
    lines.push(`**Layer 2 — Authority (${r.score_layer_2.toFixed(1)} / ${MAX_LAYER_2})**`);
    lines.push(`- Wikipedia article: ${r.has_wikipedia ? "✓ exists" : "✗ none"}`);
    lines.push(`- Domain age (Wayback first-seen): ${r.domain_age_years > 0 ? `${r.domain_age_years} years (since ${r.archive_first_seen_year})` : "unknown"}`);
    lines.push(`- Top GitHub repo stars under \`${r.host.replace(/^www\./, "").split(".")[0]}\` org: ${r.github_max_stars.toLocaleString()}`);
    lines.push("");
  });

  lines.push(`## Method`);
  lines.push(``);
  lines.push(`9 dimensions across 2 layers, each weighted. Run \`node scripts/aeo-benchmark.mjs\` to reproduce.`);
  lines.push(``);
  lines.push(`### Layer 1 — Infrastructure (10 pts)`);
  lines.push(`| Dimension | Max | Pass criteria |`);
  lines.push(`|---|---|---|`);
  lines.push(`| AI bot allowlist | ${WEIGHTS.robots_ai} | GPTBot + ClaudeBot + PerplexityBot + Google-Extended named in robots.txt (0.5 each) |`);
  lines.push(`| /llms.txt | ${WEIGHTS.llms_txt} | HTTP 200 |`);
  lines.push(`| /llms-full.txt | ${WEIGHTS.llms_full} | HTTP 200 |`);
  lines.push(`| Homepage Schema.org | ${WEIGHTS.schema_home} | Any \`"@type"\` JSON-LD detected |`);
  lines.push(`| Deep-page Schema.org | ${WEIGHTS.schema_deep} | Same, on canonical deep URL per site |`);
  lines.push(`| Sitemap depth | ${WEIGHTS.sitemap_depth} | ≥ 100 \`<loc>\` entries |`);
  lines.push(``);
  lines.push(`### Layer 2 — Authority (6 pts) — free public-API proxies`);
  lines.push(`| Dimension | Max | Pass criteria | Data source |`);
  lines.push(`|---|---|---|---|`);
  lines.push(`| Wikipedia article | ${WEIGHTS.wikipedia} | English Wikipedia article exists | Wikipedia REST API |`);
  lines.push(`| Domain age ≥ 3 years | ${WEIGHTS.domain_age} | Internet Archive first capture before ${new Date().getFullYear() - 3} | archive.org/wayback/available |`);
  lines.push(`| GitHub presence (≥ 100 stars) | ${WEIGHTS.github_presence} | Top repo under \`<domain-root>\` org has ≥ 100 stars | api.github.com/orgs/{org}/repos |`);
  lines.push("");

  lines.push(`---`);
  lines.push(``);
  lines.push(`_Generated by \`scripts/aeo-benchmark.mjs\` v2. Next run: \`.github/workflows/aeo-benchmark.yml\` (Mondays 04:00 UTC). Layer 3 citation tests in \`scripts/aeo-citation-test.mjs\`._`);
  return lines.join("\n");
}

// ────────────────────────────────────────────────────────────────────
// Main
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
  const now = new Date();
  const dateStr = now.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const week = isoWeek(now);

  console.log(`AEO benchmark v2 · ${week} · ${dateStr}`);
  console.log(`Auditing ${SITES.length} sites across Layer 1 (infrastructure) + Layer 2 (authority)...`);

  const results = [];
  for (const site of SITES) {
    process.stdout.write(`  ${site.label.padEnd(20)} ... `);
    const r = await auditSite(site);
    console.log(`L1=${r.score_layer_1.toFixed(1)} L2=${r.score_layer_2.toFixed(1)} → total ${r.total.toFixed(1)} / ${MAX_TOTAL}`);
    results.push(r);
  }

  const md = formatMarkdown(results, dateStr, week);
  await mkdir(OUT_DIR, { recursive: true });
  const outPath = resolve(OUT_DIR, `${week}.md`);
  await writeFile(outPath, md, "utf-8");
  console.log(`\n✓ Wrote ${outPath}`);

  const jsonPath = resolve(OUT_DIR, `${week}.json`);
  await writeFile(jsonPath, JSON.stringify({ week, dateStr, results, weights: WEIGHTS }, null, 2));
  console.log(`✓ Wrote ${jsonPath}`);

  const sorted = [...results].sort((a, b) => b.total - a.total);
  const primary = sorted.find((r) => r.isPrimary);
  const primaryRank = sorted.findIndex((r) => r.isPrimary) + 1;
  console.log(`\n${primary.label} ranks #${primaryRank} of ${sorted.length} overall (${primary.total} / ${MAX_TOTAL})`);
  console.log(`  Layer 1 (infra):     ${primary.score_layer_1} / ${MAX_LAYER_1}`);
  console.log(`  Layer 2 (authority): ${primary.score_layer_2} / ${MAX_LAYER_2}`);

  // Alert if NOT leading on Layer 1 (the layer where we have direct control)
  const sortedL1 = [...results].sort((a, b) => b.score_layer_1 - a.score_layer_1);
  if (sortedL1[0]?.isPrimary !== true) {
    console.error(`\n⚠ ALERT: ${primary.label} no longer leads Layer 1 (infrastructure). Now ${primary.score_layer_1}; leader is ${sortedL1[0].label} at ${sortedL1[0].score_layer_1}`);
    process.exit(1);
  }
  console.log(`\n✓ ${primary.label} retains #1 on Layer 1 (${primary.score_layer_1} / ${MAX_LAYER_1})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
