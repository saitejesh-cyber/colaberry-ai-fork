#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function normalizeBoolean(value, fallback = false) {
  if (value == null || value === "") return fallback;
  const text = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "y", "on"].includes(text);
}

function parseNumber(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseEnvLine(line) {
  if (!line || line.trim().startsWith("#")) return null;
  const index = line.indexOf("=");
  if (index <= 0) return null;
  const key = line.slice(0, index).trim();
  const raw = line.slice(index + 1).trim();
  const value = raw.replace(/^['"]|['"]$/g, "");
  if (!key) return null;
  return { key, value };
}

async function loadEnvFiles() {
  const files = [".env.local", ".env.production", ".env"];
  for (const file of files) {
    const resolved = path.resolve(file);
    try {
      const text = await fs.readFile(resolved, "utf8");
      for (const line of text.split(/\r?\n/g)) {
        const parsed = parseEnvLine(line);
        if (!parsed) continue;
        if (!process.env[parsed.key]) {
          process.env[parsed.key] = parsed.value;
        }
      }
    } catch {
      // ignore missing env files
    }
  }
}

async function cmsFetch(baseUrl, token, pathnameWithQuery) {
  const response = await fetch(`${baseUrl}${pathnameWithQuery}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}${text ? ` | ${text}` : ""}`);
  }
  return response.json();
}

async function fetchAllPages(baseUrl, token, endpoint, baseQuery, pageSize = 100) {
  const results = [];
  let page = 1;

  while (true) {
    const query = `${baseQuery}${baseQuery.includes("?") ? "&" : "?"}pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
    const json = await cmsFetch(baseUrl, token, `${endpoint}${query}`);
    const items = Array.isArray(json?.data) ? json.data : [];
    if (!items.length) break;
    results.push(...items);
    const pageCount = Number(json?.meta?.pagination?.pageCount || page);
    if (page >= pageCount) break;
    page += 1;
  }

  return results;
}

function safeText(value) {
  return String(value || "").trim();
}

function hasRichDescription(attrs) {
  return Boolean(
    safeText(attrs?.description) ||
      safeText(attrs?.whatItDoes) ||
      safeText(attrs?.longDescription) ||
      (Array.isArray(attrs?.description) && attrs.description.length > 0) ||
      (Array.isArray(attrs?.longDescription) && attrs.longDescription.length > 0)
  );
}

function ratio(items, predicate) {
  if (!items.length) return 0;
  return items.filter(predicate).length / items.length;
}

function pct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function checkMetric(name, value, target, formatter = (v) => String(v)) {
  const ok = value >= target;
  return {
    name,
    ok,
    value: formatter(value),
    target: formatter(target),
  };
}

function printChecks(checks) {
  const width = Math.max(...checks.map((entry) => entry.name.length), 16);
  console.log("");
  console.log("Data readiness checks");
  for (const check of checks) {
    const state = check.ok ? "PASS" : "FAIL";
    const label = check.name.padEnd(width, " ");
    console.log(`  ${state}  ${label}  value=${check.value}  target>=${check.target}`);
  }
}

async function main() {
  if (hasFlag("--help") || hasFlag("-h")) {
    console.log(`
CMS data readiness audit

Usage:
  npm run audit:data
  npm run audit:data -- --min-podcasts 200 --min-agents 40 --min-mcp 40 --min-use-cases 30

Options:
  --url <cms-url>
  --token <cms-token>
  --min-podcasts <n>
  --min-agents <n>
  --min-mcp <n>
  --min-use-cases <n>
  --min-rich-ratio <0..1>
  --min-podcast-playable-ratio <0..1>
  --verbose true
`);
    return;
  }

  await loadEnvFiles();

  const baseUrl = (
    readArg("--url") ||
    process.env.NEXT_PUBLIC_CMS_URL ||
    process.env.STRAPI_URL ||
    ""
  ).replace(/\/$/, "");
  const token = readArg("--token") || process.env.CMS_API_TOKEN || process.env.STRAPI_TOKEN || "";

  if (!baseUrl) throw new Error("Missing CMS URL. Use --url or set NEXT_PUBLIC_CMS_URL/STRAPI_URL.");
  if (!token) throw new Error("Missing CMS token. Use --token or set CMS_API_TOKEN/STRAPI_TOKEN.");

  const minPodcasts = parseNumber(readArg("--min-podcasts") || process.env.AUDIT_MIN_PODCASTS, 200);
  const minAgents = parseNumber(readArg("--min-agents") || process.env.AUDIT_MIN_AGENTS, 40);
  const minMcp = parseNumber(readArg("--min-mcp") || process.env.AUDIT_MIN_MCP, 40);
  const minUseCases = parseNumber(readArg("--min-use-cases") || process.env.AUDIT_MIN_USE_CASES, 30);
  const minRichRatio = Number.parseFloat(
    readArg("--min-rich-ratio") || process.env.AUDIT_MIN_RICH_RATIO || "0.8"
  );
  const minPodcastPlayableRatio = Number.parseFloat(
    readArg("--min-podcast-playable-ratio") || process.env.AUDIT_MIN_PODCAST_PLAYABLE_RATIO || "0.95"
  );
  const verbose = normalizeBoolean(readArg("--verbose"), false);

  const [podcastsRaw, agentsRaw, mcpsRaw, useCasesRaw] = await Promise.all([
    fetchAllPages(
      baseUrl,
      token,
      "/api/podcast-episodes",
      "?publicationState=live&filters[podcastStatus][$eq]=published&fields[0]=slug&fields[1]=title&fields[2]=publishedDate&fields[3]=audioUrl&fields[4]=buzzsproutEmbedCode&fields[5]=description"
    ),
    fetchAllPages(
      baseUrl,
      token,
      "/api/agents",
      "?publicationState=live&fields[0]=slug&fields[1]=name&fields[2]=description&fields[3]=whatItDoes&fields[4]=longDescription"
    ),
    fetchAllPages(
      baseUrl,
      token,
      "/api/mcp-servers",
      "?publicationState=live&fields[0]=slug&fields[1]=name&fields[2]=description&fields[3]=primaryFunction&fields[4]=longDescription"
    ),
    fetchAllPages(
      baseUrl,
      token,
      "/api/use-cases",
      "?publicationState=live&fields[0]=slug&fields[1]=title&fields[2]=summary&fields[3]=problem&fields[4]=approach&fields[5]=outcomes&fields[6]=longDescription"
    ),
  ]);

  const podcasts = podcastsRaw.map((row) => row?.attributes || {});
  const agents = agentsRaw.map((row) => row?.attributes || {});
  const mcps = mcpsRaw.map((row) => row?.attributes || {});
  const useCases = useCasesRaw.map((row) => row?.attributes || {});

  const playableRatio = ratio(
    podcasts,
    (item) => Boolean(safeText(item.audioUrl) || safeText(item.buzzsproutEmbedCode))
  );
  const datedPodcastRatio = ratio(podcasts, (item) => Boolean(safeText(item.publishedDate)));
  const richAgentRatio = ratio(agents, hasRichDescription);
  const richMcpRatio = ratio(mcps, hasRichDescription);
  const richUseCaseRatio = ratio(
    useCases,
    (item) =>
      hasRichDescription(item) ||
      Boolean(safeText(item.summary) || safeText(item.problem) || safeText(item.approach))
  );

  const checks = [
    checkMetric("Published podcasts", podcasts.length, minPodcasts),
    checkMetric("Published agents", agents.length, minAgents),
    checkMetric("Published MCP servers", mcps.length, minMcp),
    checkMetric("Published use cases", useCases.length, minUseCases),
    checkMetric("Playable podcast ratio", playableRatio, minPodcastPlayableRatio, pct),
    checkMetric("Podcast publish-date ratio", datedPodcastRatio, 0.98, pct),
    checkMetric("Rich agent profile ratio", richAgentRatio, minRichRatio, pct),
    checkMetric("Rich MCP profile ratio", richMcpRatio, minRichRatio, pct),
    checkMetric("Rich use-case profile ratio", richUseCaseRatio, minRichRatio, pct),
  ];

  printChecks(checks);

  if (verbose) {
    console.log("");
    console.log("Counts");
    console.log(`  Podcasts: ${podcasts.length}`);
    console.log(`  Agents:   ${agents.length}`);
    console.log(`  MCP:      ${mcps.length}`);
    console.log(`  Use cases:${useCases.length}`);
  }

  const failed = checks.filter((check) => !check.ok);
  if (failed.length) {
    console.log("");
    console.error(`Data readiness failed: ${failed.length} check(s) below threshold.`);
    process.exit(1);
  }

  console.log("");
  console.log("All data readiness checks passed.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Data readiness audit failed: ${message}`);
  process.exit(1);
});
