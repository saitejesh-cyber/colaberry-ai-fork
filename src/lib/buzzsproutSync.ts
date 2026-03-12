/**
 * Buzzsprout → Strapi CMS sync library.
 *
 * Fetches episodes from the Buzzsprout API, compares with existing Strapi
 * podcast episodes by `buzzsproutEpisodeId`, and creates any missing episodes.
 *
 * Reuses helper patterns from `scripts/import-podcasts-csv.mjs`.
 */

/* ---------- env vars ---------------------------------------------------- */

const CMS_URL = (
  process.env.CMS_URL ||
  process.env.NEXT_PUBLIC_CMS_URL ||
  ""
)
  .trim()
  .replace(/\/$/, "");

const CMS_API_TOKEN = (process.env.CMS_API_TOKEN || "").trim();

const BUZZSPROUT_API_TOKEN = (
  process.env.BUZZSPROUT_API_TOKEN || ""
).trim();

const BUZZSPROUT_PODCAST_ID = (
  process.env.BUZZSPROUT_PODCAST_ID || "2456315"
).trim();

/* ---------- types ------------------------------------------------------- */

/** Buzzsprout API episode shape (subset of fields we need). */
export interface BuzzsproutEpisode {
  id: number;
  title: string;
  audio_url: string;
  artwork_url?: string;
  description: string;
  summary?: string;
  artist?: string;
  tags?: string;
  published_at: string;
  duration: number; // seconds
  hq?: boolean;
  guid?: string;
  inactive_at?: string | null;
  episode_number?: number;
  season_number?: number;
  explicit?: boolean;
  private?: boolean;
  total_plays?: number;
}

/** Payload shape for creating a Strapi PodcastEpisode. */
export interface StrapiEpisodePayload {
  title: string;
  slug: string;
  publishedDate: string | null;
  podcastStatus: string;
  podcastType: string;
  episodeNumber: number | null;
  duration: string | null;
  audioUrl: string | null;
  buzzsproutEpisodeId: string | null;
  buzzsproutEmbedCode: string | null;
  useNativePlayer: boolean;
  description: unknown[] | null;
  transcriptStatus: string;
  tags?: unknown[];
  platformLinks?: { platform: string; url: string }[];
}

export interface SyncResult {
  synced: number;
  skipped: number;
  failed: number;
  total: number;
  errors: string[];
  details: { title: string; slug: string; action: string }[];
}

export interface SyncOptions {
  dryRun?: boolean;
  limit?: number;
}

/* ---------- helpers (adapted from import-podcasts-csv.mjs) -------------- */

export function slugify(value: string): string {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Convert plain-text or very simple HTML into Strapi rich-text blocks.
 * Strips HTML tags and splits on double-newlines to create paragraphs.
 */
export function toBlocks(
  text: string
): { type: string; children: { type: string; text: string }[] }[] | null {
  // Strip HTML tags (Buzzsprout descriptions are HTML)
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

/** Convert Buzzsprout duration (seconds) to MM:SS string. */
export function formatDuration(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/** Convert ISO date string to YYYY-MM-DD. */
export function toDateString(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Build the standard Buzzsprout embed code HTML snippet. */
export function buildEmbedCode(podcastId: string, episodeId: number): string {
  return `<div id="buzzsprout-player-${episodeId}"></div><script src="https://www.buzzsprout.com/${podcastId}/${episodeId}.js?container_id=buzzsprout-player-${episodeId}&player=small" type="text/javascript" charset="utf-8"></script>`;
}

/* ---------- Strapi helpers ---------------------------------------------- */

function strapiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (CMS_API_TOKEN) {
    headers.Authorization = `Bearer ${CMS_API_TOKEN}`;
  }
  return headers;
}

async function strapiRequest<T = unknown>(
  pathname: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${CMS_URL}${pathname}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...strapiHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Strapi ${options.method || "GET"} ${pathname} failed: ${response.status} ${text}`
    );
  }
  return response.json() as Promise<T>;
}

/* ---------- tag resolution ---------------------------------------------- */

const tagCache = new Map<string, { id: number; documentId?: string }>();

async function resolveTag(
  tagName: string
): Promise<string | number | null> {
  const normalized = tagName.trim();
  if (!normalized) return null;
  const candidateSlug = slugify(normalized);
  if (!candidateSlug) return null;

  if (tagCache.has(candidateSlug)) {
    const cached = tagCache.get(candidateSlug)!;
    return cached.documentId ?? cached.id;
  }

  // Search existing tag
  const found = await strapiRequest<{
    data?: { id: number; documentId?: string; slug?: string }[];
  }>(
    `/api/tags?filters[slug][$eq]=${encodeURIComponent(candidateSlug)}&fields[0]=slug&fields[1]=name&fields[2]=id&pagination[pageSize]=1`
  );

  const existing = found?.data?.[0];
  if (existing) {
    tagCache.set(candidateSlug, existing);
    return existing.documentId ?? existing.id;
  }

  // Create missing tag — gracefully skip if Strapi rejects
  try {
    let created: { data?: { id: number; documentId?: string } | null };
    try {
      created = await strapiRequest<typeof created>(
        `/api/tags?status=published`,
        {
          method: "POST",
          body: JSON.stringify({ data: { name: normalized, slug: candidateSlug } }),
        }
      );
    } catch {
      // Fallback without status query param (older Strapi versions)
      created = await strapiRequest<typeof created>(`/api/tags`, {
        method: "POST",
        body: JSON.stringify({ data: { name: normalized, slug: candidateSlug } }),
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

/** Parse Buzzsprout comma-separated tags and resolve each in Strapi. */
async function resolveTags(
  buzzsproutTags: string | undefined | null
): Promise<(string | number)[]> {
  if (!buzzsproutTags) return [];
  const names = buzzsproutTags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const refs: (string | number)[] = [];
  for (const name of names) {
    const ref = await resolveTag(name);
    if (ref != null) refs.push(ref);
  }
  return refs;
}

/* ---------- Buzzsprout API ---------------------------------------------- */

export async function fetchBuzzsproutEpisodes(): Promise<BuzzsproutEpisode[]> {
  if (!BUZZSPROUT_API_TOKEN) {
    throw new Error(
      "BUZZSPROUT_API_TOKEN is not set. Get it from Buzzsprout \u2192 My Account."
    );
  }

  const url = `https://www.buzzsprout.com/api/${BUZZSPROUT_PODCAST_ID}/episodes.json`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Token token=${BUZZSPROUT_API_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "ColaberryAI-Sync/1.0",
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Buzzsprout API failed: ${response.status} ${text}`
    );
  }

  const episodes = (await response.json()) as BuzzsproutEpisode[];
  // Filter out private/inactive episodes
  return episodes.filter(
    (ep) => !ep.private && !ep.inactive_at
  );
}

/* ---------- Strapi: existing episodes ----------------------------------- */

interface StrapiEpisodeMinimal {
  id: number;
  documentId?: string;
  buzzsproutEpisodeId?: string | null;
  slug?: string;
}

/**
 * Fetch all existing podcast episodes from Strapi and return a map of
 * buzzsproutEpisodeId → true for quick lookup.
 */
export async function fetchExistingBuzzsproutIds(): Promise<
  Set<string>
> {
  const ids = new Set<string>();
  let page = 1;
  const pageSize = 100;
  let hasMore = true;

  while (hasMore) {
    const response = await strapiRequest<{
      data?: StrapiEpisodeMinimal[];
      meta?: { pagination?: { pageCount?: number } };
    }>(
      `/api/podcast-episodes?publicationState=preview&fields[0]=buzzsproutEpisodeId&fields[1]=slug&pagination[page]=${page}&pagination[pageSize]=${pageSize}`
    );

    const items = response?.data ?? [];
    for (const item of items) {
      if (item.buzzsproutEpisodeId) {
        ids.add(String(item.buzzsproutEpisodeId));
      }
    }

    const pageCount = response?.meta?.pagination?.pageCount ?? 1;
    hasMore = page < pageCount;
    page += 1;
  }

  return ids;
}

/* ---------- mapping ----------------------------------------------------- */

export async function mapBuzzsproutToStrapi(
  episode: BuzzsproutEpisode,
  options?: { dryRun?: boolean }
): Promise<StrapiEpisodePayload> {
  const slug = slugify(episode.title);
  const tags =
    options?.dryRun ? [] : await resolveTags(episode.tags);

  const payload: StrapiEpisodePayload = {
    title: episode.title,
    slug,
    publishedDate: toDateString(episode.published_at),
    podcastStatus: "published",
    podcastType: "internal",
    episodeNumber: episode.episode_number ?? null,
    duration: formatDuration(episode.duration),
    audioUrl: episode.audio_url || null,
    buzzsproutEpisodeId: String(episode.id),
    buzzsproutEmbedCode: buildEmbedCode(
      BUZZSPROUT_PODCAST_ID,
      episode.id
    ),
    useNativePlayer: false,
    description: toBlocks(episode.description),
    transcriptStatus: "pending",
  };

  if (tags.length > 0) {
    payload.tags = tags;
  }

  // Build platform links from Buzzsprout audio URL
  const platformLinks: { platform: string; url: string }[] = [];
  if (episode.audio_url) {
    // The Buzzsprout public page link can be constructed
    const publicUrl = `https://www.buzzsprout.com/${BUZZSPROUT_PODCAST_ID}/episodes/${episode.id}`;
    platformLinks.push({ platform: "substack", url: publicUrl });
  }
  if (platformLinks.length > 0) {
    payload.platformLinks = platformLinks;
  }

  return payload;
}

/* ---------- create episode in Strapi ------------------------------------ */

async function createEpisodeInStrapi(
  payload: StrapiEpisodePayload
): Promise<{ id: number; documentId?: string }> {
  // Try with published status first
  let result: { data?: { id: number; documentId?: string } | null };
  try {
    result = await strapiRequest<typeof result>(
      `/api/podcast-episodes?status=published`,
      {
        method: "POST",
        body: JSON.stringify({ data: payload }),
      }
    );
  } catch {
    // Fallback without status query param
    result = await strapiRequest<typeof result>(`/api/podcast-episodes`, {
      method: "POST",
      body: JSON.stringify({ data: payload }),
    });
  }

  if (!result?.data) {
    throw new Error(`Failed to create episode: ${payload.slug}`);
  }
  return result.data;
}

/* ---------- main sync orchestrator -------------------------------------- */

export async function syncBuzzsproutToStrapi(
  options: SyncOptions = {}
): Promise<SyncResult> {
  const { dryRun = false, limit } = options;

  if (!CMS_URL) {
    throw new Error(
      "CMS URL is not configured. Set NEXT_PUBLIC_CMS_URL or CMS_URL."
    );
  }

  const result: SyncResult = {
    synced: 0,
    skipped: 0,
    failed: 0,
    total: 0,
    errors: [],
    details: [],
  };

  // Step 1: Fetch both sides in parallel
  const [buzzsproutEpisodes, existingIds] = await Promise.all([
    fetchBuzzsproutEpisodes(),
    fetchExistingBuzzsproutIds(),
  ]);

  // Step 2: Find missing episodes (in Buzzsprout but not in Strapi)
  const missing = buzzsproutEpisodes.filter(
    (ep) => !existingIds.has(String(ep.id))
  );

  // Sort by published date descending (newest first)
  missing.sort(
    (a, b) =>
      new Date(b.published_at).getTime() -
      new Date(a.published_at).getTime()
  );

  const toProcess =
    Number.isFinite(limit) && limit! > 0
      ? missing.slice(0, limit)
      : missing;

  result.total = toProcess.length;
  result.skipped = buzzsproutEpisodes.length - missing.length;

  if (toProcess.length === 0) {
    return result;
  }

  // Step 3: Create each missing episode
  for (const episode of toProcess) {
    try {
      const payload = await mapBuzzsproutToStrapi(episode, { dryRun });

      if (dryRun) {
        result.synced += 1;
        result.details.push({
          title: episode.title,
          slug: payload.slug,
          action: "would-create",
        });
        continue;
      }

      await createEpisodeInStrapi(payload);
      result.synced += 1;
      result.details.push({
        title: episode.title,
        slug: payload.slug,
        action: "created",
      });
    } catch (error) {
      result.failed += 1;
      const reason =
        error instanceof Error ? error.message : String(error);
      result.errors.push(`${episode.title}: ${reason}`);
      result.details.push({
        title: episode.title,
        slug: slugify(episode.title),
        action: "failed",
      });
    }
  }

  return result;
}
