/**
 * Channel config fetcher — reads the Strapi `distribution-channel`
 * collection, normalizes it to `ChannelConfig[]`, and falls back to a
 * hard-coded `STATIC_CHANNELS` constant when the CMS call fails or
 * returns zero rows.
 *
 * Ownership split (Sprint v5 architectural commitment):
 *   - CMS stores: name, platform, enabled flag, `credentialRef` (env-var
 *     NAME only), post templates, scheduling, content-kind restrictions.
 *   - Cloud Run env stores: the actual API keys / tokens. CMS never sees
 *     a plaintext secret. The orchestrator resolves `credentialRef` via
 *     `process.env[cfg.credentialRef]` at dispatch time.
 *
 * The fallback path exists so the cron never goes dark during a CMS
 * outage. It mirrors the POC's hard-coded platform list and reads the
 * same env vars the clients already consume.
 *
 * Contract: `fetchEnabledChannels()` never throws. On error it logs +
 * returns the static fallback.
 */

import type { ChannelConfig, ContentKind, Platform } from "./types";

const CMS_URL = (
  process.env.CMS_URL ||
  process.env.NEXT_PUBLIC_CMS_URL ||
  ""
)
  .trim()
  .replace(/\/$/, "");
const CMS_API_TOKEN = (process.env.CMS_API_TOKEN || "").trim();
const FETCH_TIMEOUT_MS = 10_000;
const VALID_PLATFORMS: Platform[] = [
  "x",
  "moltbook",
  "huggingface",
  "devto",
  "hashnode",
  "reddit",
  "discord",
  "producthunt",
  "hackernews",
  "github",
];
const VALID_KINDS: ContentKind[] = [
  "agent",
  "mcpServer",
  "skill",
  "podcastEpisode",
  "llmArchitecture",
];

/** Hard-coded fallback — matches the original POC's three-platform
 * registry. Used when the CMS is unreachable or returns no rows.
 * Templates here are deliberately minimal; the CMS-backed version is the
 * real source of truth once the seed script populates it. */
export const STATIC_CHANNELS: ChannelConfig[] = [
  {
    documentId: "static:x",
    name: "X — daily catalog (fallback)",
    platform: "x",
    enabled: Boolean(process.env.TWITTER_API_KEY && process.env.TWITTER_ACCESS_TOKEN),
    dryRunOverride: false,
    credentialRef: "TWITTER_API_KEY",
    bodyTemplate:
      "{{#isNew}}New{{/isNew}}{{^isNew}}Updated{{/isNew}}: {{title}}\n\n{{summary}}\n\n{{url}}",
    defaultWindowHours: 24,
    maxPostsPerRun: 25,
    supportedKinds: [],
    escapeHtml: false,
  },
  {
    documentId: "static:moltbook",
    name: "Moltbook — daily catalog (fallback)",
    platform: "moltbook",
    enabled: Boolean(process.env.MOLTBOOK_API_TOKEN),
    dryRunOverride: false,
    credentialRef: "MOLTBOOK_API_TOKEN",
    bodyTemplate: "{{summary}}\n\nRead more: {{url}}",
    titleTemplate: "{{#isNew}}New{{/isNew}}{{^isNew}}Updated{{/isNew}}: {{title}}",
    defaultWindowHours: 24,
    maxPostsPerRun: 25,
    supportedKinds: [],
    escapeHtml: false,
  },
  {
    documentId: "static:huggingface",
    name: "Hugging Face — catalog stub (fallback)",
    platform: "huggingface",
    enabled: false,
    dryRunOverride: true,
    credentialRef: "HUGGINGFACE_API_TOKEN",
    bodyTemplate: "{{title}} — {{summary}} ({{url}})",
    defaultWindowHours: 24,
    maxPostsPerRun: 25,
    supportedKinds: [],
    escapeHtml: false,
  },
];

interface StrapiChannelRow {
  id: number;
  documentId?: string;
  name?: string;
  platform?: string;
  enabled?: boolean;
  dryRunOverride?: boolean;
  credentialRef?: string;
  bodyTemplate?: string;
  titleTemplate?: string | null;
  defaultWindowHours?: number;
  maxPostsPerRun?: number;
  supportedKinds?: unknown;
  escapeHtml?: boolean;
  notes?: string | null;
}

interface StrapiListResponse<T> {
  data: T[];
  meta?: { pagination?: { total?: number } };
}

export interface FetchChannelsOptions {
  /** Restrict to specific platforms. Empty/undefined = all. */
  platforms?: Platform[];
  /** When true, only rows with `enabled=true` are returned. Default true. */
  onlyEnabled?: boolean;
  /** Force the static fallback — used by dry-run scripts and tests. */
  forceStatic?: boolean;
}

export interface FetchChannelsResult {
  channels: ChannelConfig[];
  /** "cms" when the CMS returned rows; "static" when we fell back. */
  source: "cms" | "static";
  /** Human-readable reason we chose this source. */
  reason: string;
}

/**
 * Return the list of channels the orchestrator should iterate.
 *
 * Never throws. On any error path we fall back to `STATIC_CHANNELS` and
 * explain why in `reason` so cron logs stay diagnosable.
 */
export async function fetchEnabledChannels(
  options: FetchChannelsOptions = {}
): Promise<FetchChannelsResult> {
  const onlyEnabled = options.onlyEnabled ?? true;

  if (options.forceStatic) {
    return {
      channels: filterChannels(STATIC_CHANNELS, options, onlyEnabled),
      source: "static",
      reason: "forceStatic=true",
    };
  }

  if (!CMS_URL) {
    return {
      channels: filterChannels(STATIC_CHANNELS, options, onlyEnabled),
      source: "static",
      reason: "CMS_URL not configured",
    };
  }

  try {
    const rows = await fetchChannelRows();
    const normalized = rows
      .map(normalizeRow)
      .filter((row): row is ChannelConfig => row !== null);

    if (normalized.length === 0) {
      return {
        channels: filterChannels(STATIC_CHANNELS, options, onlyEnabled),
        source: "static",
        reason: "CMS returned zero valid channels",
      };
    }

    return {
      channels: filterChannels(normalized, options, onlyEnabled),
      source: "cms",
      reason: `loaded ${normalized.length} channels from CMS`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[distribution.channelConfig] CMS fetch failed: ${msg}`);
    return {
      channels: filterChannels(STATIC_CHANNELS, options, onlyEnabled),
      source: "static",
      reason: `CMS fetch failed: ${msg}`,
    };
  }
}

/** Resolve the live secret for a channel at dispatch time. Returns `""`
 * (empty string) when the env var is missing — clients already treat that
 * as "not configured" via `isEnabled()`. Never logs the secret. */
export function resolveChannelCredential(channel: ChannelConfig): string {
  if (!channel.credentialRef) return "";
  const value = process.env[channel.credentialRef];
  return typeof value === "string" ? value.trim() : "";
}

async function fetchChannelRows(): Promise<StrapiChannelRow[]> {
  const url =
    `${CMS_URL}/api/distribution-channels` +
    `?pagination[pageSize]=50` +
    `&sort[0]=name:asc` +
    `&publicationState=live`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: CMS_API_TOKEN
        ? { Authorization: `Bearer ${CMS_API_TOKEN}` }
        : {},
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `CMS ${res.status} ${res.statusText} ${text.slice(0, 140)}`
      );
    }
    const json = (await res.json()) as StrapiListResponse<StrapiChannelRow>;
    return Array.isArray(json.data) ? json.data : [];
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeRow(row: StrapiChannelRow): ChannelConfig | null {
  const platform = row.platform as Platform | undefined;
  if (!platform || !VALID_PLATFORMS.includes(platform)) {
    console.warn(
      `[distribution.channelConfig] Skipping row — unknown platform: ${row.platform}`
    );
    return null;
  }
  if (!row.credentialRef || !row.bodyTemplate) {
    console.warn(
      `[distribution.channelConfig] Skipping row "${row.name}" — missing credentialRef or bodyTemplate`
    );
    return null;
  }
  return {
    documentId: row.documentId || String(row.id),
    name: (row.name || "").trim() || `Unnamed ${platform}`,
    platform,
    enabled: Boolean(row.enabled),
    dryRunOverride: Boolean(row.dryRunOverride),
    credentialRef: row.credentialRef.trim(),
    bodyTemplate: row.bodyTemplate,
    titleTemplate: row.titleTemplate?.trim() || undefined,
    defaultWindowHours: clampInt(row.defaultWindowHours, 1, 336, 24),
    maxPostsPerRun: clampInt(row.maxPostsPerRun, 1, 200, 25),
    supportedKinds: normalizeKinds(row.supportedKinds),
    escapeHtml: Boolean(row.escapeHtml),
    notes: row.notes?.trim() || undefined,
  };
}

function normalizeKinds(value: unknown): ContentKind[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v): v is ContentKind => VALID_KINDS.includes(v as ContentKind));
}

function clampInt(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function filterChannels(
  list: ChannelConfig[],
  options: FetchChannelsOptions,
  onlyEnabled: boolean
): ChannelConfig[] {
  let out = list;
  if (onlyEnabled) {
    out = out.filter((c) => c.enabled);
  }
  if (options.platforms?.length) {
    const allow = new Set(options.platforms);
    out = out.filter((c) => allow.has(c.platform));
  }
  return out;
}
