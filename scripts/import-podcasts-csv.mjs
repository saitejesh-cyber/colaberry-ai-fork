#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);

function getArg(name, fallback = "") {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] || fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseBoolean(value) {
  if (value == null) return null;
  const text = String(value).trim().toLowerCase();
  if (!text) return null;
  if (["true", "1", "yes", "y"].includes(text)) return true;
  if (["false", "0", "no", "n"].includes(text)) return false;
  return null;
}

function parseInteger(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)) {
    const [month, day, year] = text.split("/").map((part) => Number(part));
    if (
      Number.isFinite(month) &&
      Number.isFinite(day) &&
      Number.isFinite(year) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      const monthPart = String(month).padStart(2, "0");
      const dayPart = String(day).padStart(2, "0");
      return `${year}-${monthPart}-${dayPart}`;
    }
  }

  const timestamp = Date.parse(text);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString().slice(0, 10);
}

function parseList(value) {
  if (value == null) return [];
  const text = String(value).trim();
  if (!text) return [];
  if (text.includes("|")) {
    return text
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (text.includes(";")) {
    return text
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJson(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function toBlocks(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return null;
  const paragraphs = normalized
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/g)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!paragraphs.length) return null;

  return paragraphs.map((paragraph) => ({
    type: "paragraph",
    children: [{ type: "text", text: paragraph }],
  }));
}

function cleanObject(input) {
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    output[key] = value;
  }
  return output;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  const normalized = String(text || "").replace(/^\uFEFF/, "");

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((entry) => String(entry).trim().length > 0)) {
    rows.push(row);
  }

  if (!rows.length) {
    return { headers: [], records: [] };
  }

  const headers = rows[0].map((header) => normalizeHeader(header));
  const records = rows.slice(1).map((items) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = String(items[index] || "").trim();
    });
    return record;
  });

  return { headers, records };
}

function valueFromAliases(record, aliases) {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(record, alias)) {
      return record[alias];
    }
  }
  return undefined;
}

function readEnvFileLine(line) {
  if (!line || line.trim().startsWith("#")) return null;
  const index = line.indexOf("=");
  if (index <= 0) return null;
  const key = line.slice(0, index).trim();
  const rawValue = line.slice(index + 1).trim();
  const value = rawValue.replace(/^['"]|['"]$/g, "");
  if (!key) return null;
  return { key, value };
}

async function loadEnvFiles() {
  const files = [".env.local", ".env"];
  for (const file of files) {
    const resolved = path.resolve(file);
    try {
      const text = await fs.readFile(resolved, "utf8");
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const parsed = readEnvFileLine(line);
        if (!parsed) continue;
        if (process.env[parsed.key] == null || process.env[parsed.key] === "") {
          process.env[parsed.key] = parsed.value;
        }
      }
    } catch {
      // ignore missing env file
    }
  }
}

function usage() {
  console.log(`
Podcast CSV importer

Usage:
  node scripts/import-podcasts-csv.mjs --file ./path/to/podcasts.csv [options]

Options:
  --file <path>              CSV file path (required)
  --url <cms-url>            Strapi base URL (default: NEXT_PUBLIC_CMS_URL or STRAPI_URL)
  --token <api-token>        Strapi API token (default: CMS_API_TOKEN or STRAPI_TOKEN)
  --dry-run                  Parse and validate, no create/update calls
  --no-create-relations      Do not auto-create missing tags/companies
  --strict                   Stop at first row error
  --limit <n>                Process only first n rows

CSV columns (supported):
  title, slug, publishedDate, podcastStatus, podcastType, episodeNumber, duration,
  audioUrl, buzzsproutEpisodeId, buzzsproutEmbedCode, useNativePlayer, description,
  tags, companies, platformLinks (JSON),
  appleUrl, spotifyUrl, youtubeUrl, substackUrl, twitterUrl

Examples:
  node scripts/import-podcasts-csv.mjs --file ./scripts/templates/podcast-import.template.csv --dry-run
  node scripts/import-podcasts-csv.mjs --file ./data/podcasts.csv
`);
}

const PLATFORM_COLUMN_MAP = [
  { aliases: ["appleurl", "applepodcasturl"], platform: "apple" },
  { aliases: ["spotifyurl"], platform: "spotify" },
  { aliases: ["youtubeurl"], platform: "youtube" },
  { aliases: ["substackurl"], platform: "substack" },
  { aliases: ["twitterurl", "xurl"], platform: "twitter" },
];

const ALLOWED_PLATFORMS = new Set(["apple", "spotify", "youtube", "substack", "twitter"]);

function normalizePlatformLinks(record) {
  const links = [];
  const platformLinksJson = valueFromAliases(record, ["platformlinks"]);
  const parsedPlatformLinks = parseJson(platformLinksJson);
  if (Array.isArray(parsedPlatformLinks)) {
    for (const item of parsedPlatformLinks) {
      const platform = String(item?.platform || "")
        .trim()
        .toLowerCase();
      const url = String(item?.url || "").trim();
      if (!ALLOWED_PLATFORMS.has(platform) || !url) continue;
      links.push({ platform, url });
    }
  }

  for (const mapping of PLATFORM_COLUMN_MAP) {
    const value = valueFromAliases(record, mapping.aliases);
    if (!value) continue;
    const url = String(value).trim();
    if (!url) continue;
    links.push({ platform: mapping.platform, url });
  }

  const deduped = [];
  const seen = new Set();
  for (const link of links) {
    const key = `${link.platform}:${link.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(link);
  }
  return deduped;
}

function normalizeStatus(value, fallback = "draft") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "published" || normalized === "draft") return normalized;
  return fallback;
}

function normalizeType(value, fallback = "internal") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "internal" || normalized === "external") return normalized;
  return fallback;
}

function toRequestErrorMessage(response, text) {
  return `${response.status} ${response.statusText}${text ? ` | ${text}` : ""}`;
}

async function run() {
  if (hasFlag("--help") || hasFlag("-h")) {
    usage();
    process.exit(0);
  }

  await loadEnvFiles();

  const csvFile = getArg("--file");
  const dryRun = hasFlag("--dry-run");
  const createRelations = !hasFlag("--no-create-relations");
  const strictMode = hasFlag("--strict");
  const limit = Number.parseInt(getArg("--limit", "0"), 10);

  if (!csvFile) {
    usage();
    console.error("Missing --file argument.");
    process.exit(1);
  }

  const baseUrl = (getArg("--url") || process.env.NEXT_PUBLIC_CMS_URL || process.env.STRAPI_URL || "").replace(
    /\/$/,
    ""
  );
  const token = getArg("--token") || process.env.CMS_API_TOKEN || process.env.STRAPI_TOKEN || "";

  if (!baseUrl) {
    console.error("Missing CMS URL. Set --url or NEXT_PUBLIC_CMS_URL/STRAPI_URL.");
    process.exit(1);
  }
  if (!token && !dryRun) {
    console.error("Missing CMS token. Set --token or CMS_API_TOKEN/STRAPI_TOKEN.");
    process.exit(1);
  }

  const resolvedCsvFile = path.resolve(csvFile);
  const csvText = await fs.readFile(resolvedCsvFile, "utf8");
  const { records } = parseCsv(csvText);

  const rows = Number.isFinite(limit) && limit > 0 ? records.slice(0, limit) : records;
  if (!rows.length) {
    console.log("No records found in CSV.");
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  async function request(pathname, options = {}) {
    const response = await fetch(`${baseUrl}${pathname}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(toRequestErrorMessage(response, text));
    }
    return response.json();
  }

  const tagCache = new Map();
  const companyCache = new Map();

  async function resolveCollectionItem(collectionPath, nameValue, cache, options = {}) {
    const normalizedName = String(nameValue || "").trim();
    if (!normalizedName) return null;
    const candidateSlug = slugify(normalizedName);
    if (!candidateSlug) return null;
    if (cache.has(candidateSlug)) return cache.get(candidateSlug);

    if (dryRun) {
      const dryRunRef = { id: candidateSlug, documentId: candidateSlug, slug: candidateSlug };
      cache.set(candidateSlug, dryRunRef);
      return dryRunRef;
    }

    const found = await request(
      `${collectionPath}?publicationState=preview&filters[slug][$eq]=${encodeURIComponent(
        candidateSlug
      )}&fields[0]=slug&fields[1]=name&fields[2]=id&pagination[pageSize]=1`
    );
    const existing = found?.data?.[0];
    if (existing) {
      cache.set(candidateSlug, existing);
      return existing;
    }

    if (!options.createMissing) {
      return null;
    }

    let created;
    try {
      created = await request(`${collectionPath}?status=published`, {
        method: "POST",
        body: JSON.stringify({
          data: {
            name: normalizedName,
            slug: candidateSlug,
          },
        }),
      });
    } catch {
      created = await request(collectionPath, {
        method: "POST",
        body: JSON.stringify({
          data: {
            name: normalizedName,
            slug: candidateSlug,
          },
        }),
      });
    }

    const item = created?.data || null;
    if (item) {
      cache.set(candidateSlug, item);
    }
    return item;
  }

  function relationRef(item) {
    if (!item) return null;
    if (item.documentId != null) return item.documentId;
    if (item.id != null) return item.id;
    return null;
  }

  async function resolveTags(rawTags) {
    const values = parseList(rawTags);
    const refs = [];
    for (const value of values) {
      const item = await resolveCollectionItem("/api/tags", value, tagCache, {
        createMissing: createRelations,
      });
      const ref = relationRef(item);
      if (ref != null) refs.push(ref);
    }
    return refs;
  }

  async function resolveCompanies(rawCompanies) {
    const values = parseList(rawCompanies);
    const refs = [];
    for (const value of values) {
      const item = await resolveCollectionItem("/api/companies", value, companyCache, {
        createMissing: createRelations,
      });
      const ref = relationRef(item);
      if (ref != null) refs.push(ref);
    }
    return refs;
  }

  async function findEpisodeBySlug(slug) {
    if (dryRun) return null;
    const json = await request(
      `/api/podcast-episodes?publicationState=preview&filters[slug][$eq]=${encodeURIComponent(
        slug
      )}&fields[0]=title&fields[1]=slug&fields[2]=id&fields[3]=podcastStatus&pagination[pageSize]=1`
    );
    return json?.data?.[0] || null;
  }

  async function writeEpisode(existing, payload, publishStatus) {
    const targetId = existing?.documentId ?? existing?.id ?? null;
    const method = targetId ? "PUT" : "POST";
    const endpoint = targetId
      ? `/api/podcast-episodes/${encodeURIComponent(String(targetId))}`
      : "/api/podcast-episodes";
    const withStatusEndpoint = publishStatus ? `${endpoint}?status=${publishStatus}` : endpoint;

    if (dryRun) {
      return {
        dryRun: true,
        method,
        endpoint: withStatusEndpoint,
      };
    }

    try {
      return await request(withStatusEndpoint, {
        method,
        body: JSON.stringify({ data: payload }),
      });
    } catch (error) {
      if (!publishStatus) throw error;
      return request(endpoint, {
        method,
        body: JSON.stringify({ data: payload }),
      });
    }
  }

  const summary = {
    total: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;
    try {
      const titleValue = valueFromAliases(row, ["title", "name"]);
      const title = String(titleValue || "").trim();
      if (!title) {
        throw new Error("title is required");
      }

      const slugValue = valueFromAliases(row, ["slug"]);
      const slug = String(slugValue || "").trim() || slugify(title);
      if (!slug) {
        throw new Error("slug could not be derived");
      }

      const existing = await findEpisodeBySlug(slug);

      const publishedDateInput = valueFromAliases(row, ["publisheddate", "date"]);
      const publishedDate =
        publishedDateInput === undefined ? undefined : parseDate(publishedDateInput);

      const statusInput = valueFromAliases(row, ["podcaststatus", "status"]);
      const podcastStatus =
        statusInput === undefined
          ? existing
            ? undefined
            : "draft"
          : normalizeStatus(statusInput, "draft");

      const typeInput = valueFromAliases(row, ["podcasttype", "type"]);
      const podcastType =
        typeInput === undefined
          ? existing
            ? undefined
            : "internal"
          : normalizeType(typeInput, "internal");

      const descriptionInput = valueFromAliases(row, ["description", "summary"]);
      const descriptionBlocks =
        descriptionInput === undefined ? undefined : toBlocks(descriptionInput);

      const useNativePlayerInput = valueFromAliases(row, ["usenativeplayer", "nativeplayer"]);
      const useNativePlayer =
        useNativePlayerInput === undefined ? undefined : parseBoolean(useNativePlayerInput);

      const episodeNumberInput = valueFromAliases(row, ["episodenumber", "episode"]);
      const episodeNumber =
        episodeNumberInput === undefined ? undefined : parseInteger(episodeNumberInput);

      const tagsInput = valueFromAliases(row, ["tags"]);
      const companiesInput = valueFromAliases(row, ["companies", "company"]);

      const [tags, companies] = await Promise.all([
        tagsInput === undefined ? undefined : resolveTags(tagsInput),
        companiesInput === undefined ? undefined : resolveCompanies(companiesInput),
      ]);

      const platformLinks = normalizePlatformLinks(row);
      const hasPlatformColumns =
        valueFromAliases(row, ["platformlinks"]) !== undefined ||
        PLATFORM_COLUMN_MAP.some((entry) => valueFromAliases(row, entry.aliases) !== undefined);

      const transcriptSegmentsInput = valueFromAliases(row, ["transcriptsegments"]);
      const transcriptSegments =
        transcriptSegmentsInput === undefined ? undefined : parseJson(transcriptSegmentsInput);

      const transcriptGeneratedAtInput = valueFromAliases(row, ["transcriptgeneratedat"]);
      const transcriptGeneratedAt =
        transcriptGeneratedAtInput === undefined
          ? undefined
          : String(transcriptGeneratedAtInput || "").trim() || null;

      const payload = cleanObject({
        title,
        slug,
        publishedDate,
        podcastStatus,
        podcastType,
        episodeNumber,
        duration:
          valueFromAliases(row, ["duration"]) === undefined
            ? undefined
            : String(valueFromAliases(row, ["duration"]) || "").trim() || null,
        audioUrl:
          valueFromAliases(row, ["audiourl"]) === undefined
            ? undefined
            : String(valueFromAliases(row, ["audiourl"]) || "").trim() || null,
        buzzsproutEpisodeId:
          valueFromAliases(row, ["buzzsproutepisodeid"]) === undefined
            ? undefined
            : String(valueFromAliases(row, ["buzzsproutepisodeid"]) || "").trim() || null,
        buzzsproutEmbedCode:
          valueFromAliases(row, ["buzzsproutembedcode"]) === undefined
            ? undefined
            : String(valueFromAliases(row, ["buzzsproutembedcode"]) || "").trim() || null,
        description: descriptionBlocks,
        useNativePlayer,
        transcriptStatus:
          valueFromAliases(row, ["transcriptstatus"]) === undefined
            ? undefined
            : String(valueFromAliases(row, ["transcriptstatus"]) || "").trim() || null,
        transcriptSource:
          valueFromAliases(row, ["transcriptsource"]) === undefined
            ? undefined
            : String(valueFromAliases(row, ["transcriptsource"]) || "").trim() || null,
        transcriptGeneratedAt,
        transcriptSrt:
          valueFromAliases(row, ["transcriptsrt"]) === undefined
            ? undefined
            : String(valueFromAliases(row, ["transcriptsrt"]) || "").trim() || null,
        transcriptVtt:
          valueFromAliases(row, ["transcriptvtt"]) === undefined
            ? undefined
            : String(valueFromAliases(row, ["transcriptvtt"]) || "").trim() || null,
        transcriptSegments,
        tags,
        companies,
        platformLinks: hasPlatformColumns ? platformLinks : undefined,
      });

      if (Object.keys(payload).length <= 2) {
        summary.skipped += 1;
        console.log(`[row ${rowNumber}] skipped (${slug}) - no updatable fields found`);
        continue;
      }

      const publishStatus =
        payload.podcastStatus && String(payload.podcastStatus).toLowerCase() === "published"
          ? "published"
          : undefined;

      await writeEpisode(existing, payload, publishStatus);

      if (existing) {
        summary.updated += 1;
        console.log(`[row ${rowNumber}] updated: ${slug}`);
      } else {
        summary.created += 1;
        console.log(`[row ${rowNumber}] created: ${slug}`);
      }
    } catch (error) {
      summary.failed += 1;
      const reason = error instanceof Error ? error.message : "unknown error";
      console.error(`[row ${rowNumber}] failed: ${reason}`);
      if (strictMode) {
        console.error("Stopping due to --strict.");
        break;
      }
    }
  }

  console.log("");
  console.log("Import summary");
  console.log(`  total:   ${summary.total}`);
  console.log(`  created: ${summary.created}`);
  console.log(`  updated: ${summary.updated}`);
  console.log(`  skipped: ${summary.skipped}`);
  console.log(`  failed:  ${summary.failed}`);
  console.log(`  dryRun:  ${dryRun ? "yes" : "no"}`);
}

run().catch((error) => {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(reason);
  process.exit(1);
});
