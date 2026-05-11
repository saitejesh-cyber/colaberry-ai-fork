/**
 * Colaberry AI Catalog Distribution — shared type contract.
 *
 * A daily cron pulls catalog entries updated in the last N hours
 * (`fetchRecentEntries`), renders a per-platform `PostDraft` for each via
 * `buildDraft`, then dispatches each draft through a platform client that
 * implements `PlatformClient`. The orchestrator returns a structured
 * `DistributionRunResult` suitable for logging, alerting, and feeding back
 * into a future Strapi audit content type.
 *
 * Sources: Ram (CEO) asked for daily updates to developer/agent watering
 * holes. Sai (SWE) scoped the POC to X + Moltbook + Hugging Face; this
 * file is the contract every client + test must conform to.
 */

/** Supported distribution targets. Add a new union member and ship a new
 * client module + template case — nothing else needs editing. Sprint v5
 * reserved the developer/agent-community platform set even though clients
 * ship incrementally; the CMS enum mirrors this union exactly. */
export type Platform =
  | "x"
  | "moltbook"
  | "huggingface"
  | "devto"
  | "hashnode"
  | "reddit"
  | "discord"
  | "producthunt"
  | "hackernews"
  | "github";

/** The 5 CMS content types eligible for distribution. Sprint v4 shipped
 * `llmArchitecture`; podcasts are the highest-velocity source today. */
export type ContentKind =
  | "agent"
  | "mcpServer"
  | "skill"
  | "podcastEpisode"
  | "llmArchitecture";

/** A single piece of catalog content normalized for distribution. Source
 * layer (`source.ts`) produces these; templates + clients consume them.
 * Shape deliberately thin — we only carry what every platform needs. */
export interface DistributableEntry {
  /** Stable CMS documentId — used for deduplication and idempotency. */
  id: string;
  kind: ContentKind;
  /** Human-readable title — the anchor line of every post. */
  title: string;
  /** 1-2 sentence plain-text description — truncated per platform. */
  summary: string;
  /** Absolute URL on colaberry.ai to the detail page for this entry. */
  url: string;
  /** Optional list of tag/topic strings — become hashtags on X. */
  tags: string[];
  /** ISO-8601 timestamp of the CMS update that qualified this entry.
   * Used for "new vs. updated" copy decisions and for idempotency keys. */
  updatedAt: string;
  /** Whether this is brand-new (within window AND createdAt == updatedAt)
   * or an update to an existing entry. Changes headline verb. */
  isNew: boolean;
}

/** Rendered post, ready to dispatch to a specific platform. One
 * `DistributableEntry` fans out to N `PostDraft`s (one per enabled
 * platform). Platform-specific shape lives in `payload` because X, Moltbook
 * and HF each want very different things (text, JSON doc, dataset row). */
export interface PostDraft {
  platform: Platform;
  /** Stable dedupe key — `${platform}:${entry.id}:${entry.updatedAt}`.
   * Clients echo this back on the result so we can detect duplicate
   * posts if the cron fires twice. */
  idempotencyKey: string;
  /** Plain-text rendered copy — some platforms (X) use this directly; HF
   * Discussions uses it as the post body. Always populated. */
  text: string;
  /** Platform-specific payload shape. Each client narrows on `platform`. */
  payload: XPayload | MoltbookPayload | HuggingfacePayload;
  /** Pass-through for structured logging — a reference back to the
   * source entry so the audit log has full context. */
  sourceEntry: DistributableEntry;
}

/** X/Twitter v2 tweet create payload shape. */
export interface XPayload {
  platform: "x";
  text: string;
  /** Reply settings — "everyone" | "mentionedUsers" | "following". */
  replySettings?: "everyone" | "mentionedUsers" | "following";
}

/** Moltbook REST v1 post payload shape (per Sai's research notes). */
export interface MoltbookPayload {
  platform: "moltbook";
  title: string;
  body: string;
  /** Agent registry slug on Moltbook — identifies our agent identity. */
  agentSlug: string;
  tags: string[];
  /** Canonical URL back to colaberry.ai — rendered as a link card. */
  canonicalUrl: string;
}

/** Hugging Face Datasets API payload — one JSONL row appended to the
 * configured dataset repo. Discussions posting is a separate client method. */
export interface HuggingfacePayload {
  platform: "huggingface";
  /** Target dataset repo, e.g. "colaberry/agent-catalog". */
  repoId: string;
  /** Row to append to the dataset (JSON-serializable). */
  row: Record<string, string | number | boolean | null | string[]>;
}

/** Result of dispatching one draft through one client. */
export interface DispatchResult {
  platform: Platform;
  idempotencyKey: string;
  status: "sent" | "skipped" | "failed" | "dry-run";
  /** The platform's returned ID (tweet ID, moltbook post ID, HF commit
   * SHA, etc.) — null on failure or dry-run. */
  remoteId: string | null;
  /** Human-readable reason, always present on skipped/failed/dry-run. */
  message: string;
  /** ISO-8601 timestamp the dispatch returned. */
  attemptedAt: string;
  /** HTTP status or "network" / "auth" / "rate-limit" etc. */
  errorCode?: string;
}

/** Shape every platform client must implement. Keep the surface minimal
 * so adding a new platform = implementing this one interface. */
export interface PlatformClient {
  platform: Platform;
  /** Whether this client is configured (has credentials, is enabled). If
   * false the orchestrator skips it entirely with status: "skipped". */
  isEnabled(): boolean;
  /** Dispatch one draft. Must be idempotent-aware — if the same
   * idempotencyKey was recently posted, return status "skipped" with a
   * non-null `message`. Never throws — returns a failed result instead,
   * so one platform's failure doesn't take down the whole run. */
  dispatch(draft: PostDraft, options: DispatchOptions): Promise<DispatchResult>;
}

export interface DispatchOptions {
  /** Default true in POC. When true, clients serialize the request but
   * do NOT hit the external API. Still returns a realistic result shape
   * so the orchestrator and tests behave identically to live mode. */
  dryRun: boolean;
  /** Per-dispatch timeout in ms. Default 10_000. */
  timeoutMs?: number;
}

/** Top-level result of a single orchestrator run. Serializable — this is
 * what the cron route returns and what the future audit content type
 * will store. */
export interface DistributionRunResult {
  /** ISO-8601 timestamp the run started. */
  startedAt: string;
  /** ISO-8601 timestamp the run finished. */
  finishedAt: string;
  /** Lookback window size in hours that was used to pick entries. */
  windowHours: number;
  /** Entries matched by the source layer. */
  entriesMatched: number;
  /** Drafts rendered (entriesMatched × enabled platforms). */
  draftsRendered: number;
  /** Per-platform tally of dispatch outcomes. */
  summary: Record<Platform, PlatformSummary>;
  /** Full per-dispatch log — every draft, every result, in order. */
  dispatches: DispatchResult[];
  /** Top-level errors the orchestrator itself hit (not per-dispatch). */
  runErrors: string[];
  /** Whether this run was a DRY_RUN (no external calls). */
  dryRun: boolean;
}

export interface PlatformSummary {
  enabled: boolean;
  sent: number;
  skipped: number;
  failed: number;
  dryRun: number;
}

/** Sprint v5 — per-channel config fetched from the Strapi
 * `distribution-channel` content type. `credentialRef` is an env-var NAME
 * (e.g. "TWITTER_API_KEY") — never the secret itself. The CMS stores
 * names only; secrets live in Cloud Run env and are resolved at dispatch
 * time via `process.env[credentialRef]`. */
export interface ChannelConfig {
  /** CMS documentId — stable across edits, used to key per-channel logs. */
  documentId: string;
  /** Human label shown in admin + in logs. */
  name: string;
  /** Must match the `Platform` union for the client registry to route. */
  platform: Platform;
  /** Hard off-switch — orchestrator skips disabled channels entirely. */
  enabled: boolean;
  /** Force DRY_RUN for this channel even when the cron runs live. Used to
   * stage a new channel in prod without risking a real post. */
  dryRunOverride: boolean;
  /** Env-var NAME — NOT the secret. Resolved at dispatch time. */
  credentialRef: string;
  /** Mustache-style template for the post body. Always required. */
  bodyTemplate: string;
  /** Optional title template — used by platforms that have a title field
   * (Moltbook, Dev.to, Hashnode). Ignored otherwise. */
  titleTemplate?: string;
  /** Lookback window in hours for this channel. Overridable by the cron
   * route via `?windowHours=`. */
  defaultWindowHours: number;
  /** Per-channel posting throttle per run. Protects against a big CMS bulk
   * edit blasting hundreds of posts. */
  maxPostsPerRun: number;
  /** Restrict to specific content kinds. Empty/undefined = all. */
  supportedKinds: ContentKind[];
  /** When true, `{{title}}` / `{{summary}}` are HTML-escaped before render. */
  escapeHtml: boolean;
  /** Free-form ops notes from CMS admin. Not rendered anywhere. */
  notes?: string;
}
