#!/usr/bin/env node

/**
 * CLI tool to sync Buzzsprout episodes into Strapi CMS.
 *
 * Usage:
 *   node scripts/sync-buzzsprout.mjs [options]
 *
 * Options:
 *   --dry-run          Show what would be synced without creating
 *   --limit <n>        Only sync first n missing episodes
 *   --url <cms-url>    Override CMS URL (default: NEXT_PUBLIC_CMS_URL)
 *   --token <token>    Override CMS API token (default: CMS_API_TOKEN)
 *   --help             Show this help message
 *
 * Environment variables:
 *   BUZZSPROUT_API_TOKEN   Buzzsprout API token (required)
 *   BUZZSPROUT_PODCAST_ID  Buzzsprout podcast ID (default: 2456315)
 *   NEXT_PUBLIC_CMS_URL    Strapi CMS base URL
 *   CMS_API_TOKEN          Strapi API token
 */

import fs from "node:fs/promises";
import path from "node:path";

/* ---------- CLI argument parsing ---------------------------------------- */

const args = process.argv.slice(2);

function getArg(name, fallback = "") {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] || fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

if (hasFlag("--help") || hasFlag("-h")) {
  console.log(`
Buzzsprout → Strapi sync

Usage:
  node scripts/sync-buzzsprout.mjs [options]

Options:
  --dry-run          Show what would be synced without creating
  --limit <n>        Only sync first n missing episodes
  --url <cms-url>    Override CMS URL (default: NEXT_PUBLIC_CMS_URL)
  --token <token>    Override CMS API token (default: CMS_API_TOKEN)
  --help             Show this help message

Environment variables:
  BUZZSPROUT_API_TOKEN   Buzzsprout API token (required)
  BUZZSPROUT_PODCAST_ID  Buzzsprout podcast ID (default: 2456315)
  NEXT_PUBLIC_CMS_URL    Strapi CMS base URL
  CMS_API_TOKEN          Strapi API token
`);
  process.exit(0);
}

/* ---------- load .env files --------------------------------------------- */

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
        if (
          process.env[parsed.key] == null ||
          process.env[parsed.key] === ""
        ) {
          process.env[parsed.key] = parsed.value;
        }
      }
    } catch {
      // ignore missing env file
    }
  }
}

/* ---------- helpers (mirrored from buzzsproutSync.ts for ESM) ----------- */

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

function toBlocks(text) {
  const stripped = String(text || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();

  if (!stripped) return null;

  const paragraphs = stripped
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

function formatDuration(seconds) {
  if (!seconds || !Number.isFinite(seconds)) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function toDateString(isoDate) {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function buildEmbedCode(podcastId, episodeId) {
  return `<div id="buzzsprout-player-${episodeId}"></div><script src="https://www.buzzsprout.com/${podcastId}/${episodeId}.js?container_id=buzzsprout-player-${episodeId}&player=small" type="text/javascript" charset="utf-8"></script>`;
}

/* ---------- main -------------------------------------------------------- */

async function run() {
  await loadEnvFiles();

  // CLI overrides
  const urlOverride = getArg("--url");
  const tokenOverride = getArg("--token");
  if (urlOverride) process.env.NEXT_PUBLIC_CMS_URL = urlOverride;
  if (tokenOverride) process.env.CMS_API_TOKEN = tokenOverride;

  const dryRun = hasFlag("--dry-run");
  const limitArg = getArg("--limit");
  const limit = limitArg ? Number.parseInt(limitArg, 10) : 0;

  const baseUrl = (
    process.env.CMS_URL ||
    process.env.NEXT_PUBLIC_CMS_URL ||
    process.env.STRAPI_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");

  const token = (
    process.env.CMS_API_TOKEN ||
    process.env.STRAPI_TOKEN ||
    ""
  ).trim();

  const buzzsproutToken = (
    process.env.BUZZSPROUT_API_TOKEN || ""
  ).trim();

  const podcastId = (
    process.env.BUZZSPROUT_PODCAST_ID || "2456315"
  ).trim();

  if (!baseUrl) {
    console.error(
      "Missing CMS URL. Set --url or NEXT_PUBLIC_CMS_URL."
    );
    process.exit(1);
  }
  if (!token && !dryRun) {
    console.error(
      "Missing CMS token. Set --token or CMS_API_TOKEN."
    );
    process.exit(1);
  }
  if (!buzzsproutToken) {
    console.error(
      "Missing BUZZSPROUT_API_TOKEN. Get it from Buzzsprout → My Account."
    );
    process.exit(1);
  }

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  async function strapiRequest(pathname, options = {}) {
    const response = await fetch(`${baseUrl}${pathname}`, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Strapi ${options.method || "GET"} ${pathname} failed: ${response.status} ${text}`
      );
    }
    return response.json();
  }

  // ── Step 1: Fetch Buzzsprout episodes ──
  console.log(`Fetching episodes from Buzzsprout (podcast ${podcastId})...`);
  const bzResponse = await fetch(
    `https://www.buzzsprout.com/api/${podcastId}/episodes.json`,
    {
      headers: {
        Authorization: `Token token=${buzzsproutToken}`,
        "Content-Type": "application/json",
        "User-Agent": "ColaberryAI-Sync/1.0",
      },
    }
  );

  if (!bzResponse.ok) {
    const text = await bzResponse.text().catch(() => "");
    console.error(
      `Buzzsprout API failed: ${bzResponse.status} ${text}`
    );
    process.exit(1);
  }

  const allBzEpisodes = await bzResponse.json();
  const bzEpisodes = allBzEpisodes.filter(
    (ep) => !ep.private && !ep.inactive_at
  );
  console.log(
    `  Found ${bzEpisodes.length} active episodes on Buzzsprout.`
  );

  // ── Step 2: Fetch existing Strapi episodes ──
  console.log("Fetching existing episodes from Strapi...");
  const existingIds = new Set();
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await strapiRequest(
      `/api/podcast-episodes?publicationState=preview&fields[0]=buzzsproutEpisodeId&fields[1]=slug&pagination[page]=${page}&pagination[pageSize]=100`
    );
    const items = response?.data ?? [];
    for (const item of items) {
      if (item.buzzsproutEpisodeId) {
        existingIds.add(String(item.buzzsproutEpisodeId));
      }
    }
    const pageCount =
      response?.meta?.pagination?.pageCount ?? 1;
    hasMore = page < pageCount;
    page += 1;
  }

  console.log(
    `  Found ${existingIds.size} episodes in Strapi.`
  );

  // ── Step 3: Find missing ──
  const missing = bzEpisodes.filter(
    (ep) => !existingIds.has(String(ep.id))
  );
  missing.sort(
    (a, b) =>
      new Date(b.published_at).getTime() -
      new Date(a.published_at).getTime()
  );

  const toProcess =
    Number.isFinite(limit) && limit > 0
      ? missing.slice(0, limit)
      : missing;

  console.log(
    `\n${missing.length} episodes missing from Strapi.`
  );
  if (limit > 0 && missing.length > limit) {
    console.log(`  (processing first ${limit} only)`);
  }

  if (toProcess.length === 0) {
    console.log("Nothing to sync — all episodes already in Strapi.");
    return;
  }

  // ── Step 4: Tag resolution cache ──
  const tagCache = new Map();

  async function resolveTag(tagName) {
    const normalized = tagName.trim();
    if (!normalized) return null;
    const candidateSlug = slugify(normalized);
    if (!candidateSlug) return null;

    if (tagCache.has(candidateSlug)) {
      const cached = tagCache.get(candidateSlug);
      return cached.documentId ?? cached.id;
    }

    if (dryRun) {
      tagCache.set(candidateSlug, {
        id: candidateSlug,
        documentId: candidateSlug,
      });
      return candidateSlug;
    }

    const found = await strapiRequest(
      `/api/tags?filters[slug][$eq]=${encodeURIComponent(candidateSlug)}&fields[0]=slug&fields[1]=name&fields[2]=id&pagination[pageSize]=1`
    );
    const existing = found?.data?.[0];
    if (existing) {
      tagCache.set(candidateSlug, existing);
      return existing.documentId ?? existing.id;
    }

    // Create — gracefully skip if Strapi rejects
    try {
      let created;
      try {
        created = await strapiRequest(`/api/tags?status=published`, {
          method: "POST",
          body: JSON.stringify({
            data: { name: normalized, slug: candidateSlug },
          }),
        });
      } catch {
        created = await strapiRequest(`/api/tags`, {
          method: "POST",
          body: JSON.stringify({
            data: { name: normalized, slug: candidateSlug },
          }),
        });
      }
      const item = created?.data;
      if (item) {
        tagCache.set(candidateSlug, item);
        return item.documentId ?? item.id;
      }
    } catch {
      // Tag creation failed (e.g. Strapi 500) — skip gracefully
      console.warn(`[tag] could not create "${normalized}", skipping`);
    }
    return null;
  }

  async function resolveTags(buzzsproutTags) {
    if (!buzzsproutTags) return [];
    const names = buzzsproutTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const refs = [];
    for (const name of names) {
      const ref = await resolveTag(name);
      if (ref != null) refs.push(ref);
    }
    return refs;
  }

  // ── Step 5: Sync each missing episode ──
  const summary = { synced: 0, failed: 0 };

  for (let i = 0; i < toProcess.length; i += 1) {
    const ep = toProcess[i];
    const slug = slugify(ep.title);
    const prefix = `[${i + 1}/${toProcess.length}]`;

    try {
      const tags = await resolveTags(ep.tags);
      const payload = {
        title: ep.title,
        slug,
        publishedDate: toDateString(ep.published_at),
        podcastStatus: "published",
        podcastType: "internal",
        episodeNumber: ep.episode_number ?? null,
        duration: formatDuration(ep.duration),
        audioUrl: ep.audio_url || null,
        buzzsproutEpisodeId: String(ep.id),
        buzzsproutEmbedCode: buildEmbedCode(podcastId, ep.id),
        useNativePlayer: false,
        description: toBlocks(ep.description),
        transcriptStatus: "pending",
        ...(tags.length > 0 ? { tags } : {}),
      };

      if (dryRun) {
        console.log(
          `${prefix} would create: ${slug} (${ep.title})`
        );
        summary.synced += 1;
        continue;
      }

      let result;
      try {
        result = await strapiRequest(
          `/api/podcast-episodes?status=published`,
          {
            method: "POST",
            body: JSON.stringify({ data: payload }),
          }
        );
      } catch {
        result = await strapiRequest(`/api/podcast-episodes`, {
          method: "POST",
          body: JSON.stringify({ data: payload }),
        });
      }

      summary.synced += 1;
      console.log(`${prefix} created: ${slug}`);
    } catch (error) {
      summary.failed += 1;
      const reason =
        error instanceof Error ? error.message : String(error);
      console.error(`${prefix} failed: ${slug} — ${reason}`);
    }
  }

  // ── Summary ──
  console.log("");
  console.log("Sync summary");
  console.log(`  buzzsprout episodes: ${bzEpisodes.length}`);
  console.log(`  already in strapi:   ${existingIds.size}`);
  console.log(`  missing:             ${missing.length}`);
  console.log(`  synced:              ${summary.synced}`);
  console.log(`  failed:              ${summary.failed}`);
  console.log(`  dry-run:             ${dryRun ? "yes" : "no"}`);
}

run().catch((error) => {
  const reason =
    error instanceof Error ? error.message : String(error);
  console.error(reason);
  process.exit(1);
});
