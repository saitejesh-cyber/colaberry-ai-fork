/**
 * Distribution orchestrator — the one function the cron route calls.
 *
 * Sprint v5 pipeline:
 *   1. `fetchEnabledChannels()` — pull active channel configs from the
 *      Strapi `distribution-channel` collection. On CMS outage or empty
 *      response, falls back to `STATIC_CHANNELS` so the cron never goes
 *      dark.
 *   2. `fetchRecentEntries()` — pull catalog content updated in the last
 *      N hours from Strapi (where N is the max of every channel's
 *      `defaultWindowHours` unless the caller overrode it).
 *   3. `buildDrafts()` — render one `PostDraft` per (entry × channel)
 *      using each channel's CMS-editable `bodyTemplate`. Pure function.
 *   4. Dispatch each draft through the platform client registry, keyed
 *      by `channel.platform`. Unknown / not-yet-implemented platforms
 *      tag the dispatch as `skipped: not-implemented` — the orchestrator
 *      never throws for them.
 *   5. Aggregate into `DistributionRunResult`, including a per-channel
 *      breakdown for downstream audit.
 *
 * Design guarantees (unchanged from POC):
 *   - One platform's total failure does not take down the run.
 *   - DRY_RUN is the default. Live posting requires an explicit flag.
 *   - Every return path produces a serializable `DistributionRunResult`.
 */

import { fetchEnabledChannels } from "./channelConfig";
import { fetchRecentEntries } from "./source";
import { writeDispatchLogs, type WriteDispatchLogInput } from "./store";
import { buildDrafts } from "./templates";
import { moltbookClient } from "./clients/moltbook";
import { xClient } from "./clients/x";
import { huggingfaceClient } from "./clients/huggingface";
import type {
  ChannelConfig,
  ContentKind,
  DispatchOptions,
  DispatchResult,
  DistributionRunResult,
  Platform,
  PlatformClient,
  PlatformSummary,
  PostDraft,
} from "./types";

/** Registry of PlatformClients. A channel pointing at a platform NOT in
 * this map gets a synthesized `skipped: not-implemented` dispatch result.
 * Add a new client here after its module ships. */
const CLIENTS: Partial<Record<Platform, PlatformClient>> = {
  x: xClient,
  moltbook: moltbookClient,
  huggingface: huggingfaceClient,
};

/** Max concurrent dispatches per channel. */
const DISPATCH_CONCURRENCY = 3;

export interface RunOptions {
  /** When true, clients serialize the payload but never call external
   * APIs. Default true — live posting is explicit-opt-in. */
  dryRun?: boolean;
  /** Lookback window. Default: max of all enabled channels' `defaultWindowHours`. */
  windowHours?: number;
  /** Cap per kind in the source layer. Default 25. */
  maxPerKind?: number;
  /** Restrict to specific kinds. Empty / undefined = all. */
  kinds?: ContentKind[];
  /** Restrict to specific platforms. Empty / undefined = all enabled. */
  platforms?: Platform[];
  /** Restrict to a single channel by documentId (admin preview helper). */
  channelDocumentId?: string;
  /** Force the static fallback, skipping the CMS fetch. */
  forceStaticChannels?: boolean;
  /** Per-dispatch timeout. Default per-client. */
  timeoutMs?: number;
  /** Override Moltbook agent slug. */
  moltbookAgentSlug?: string;
  /** Override HF dataset id. */
  huggingfaceDatasetId?: string;
  /** Fixed "now" for deterministic tests. */
  nowMs?: number;
}

/**
 * Execute one distribution run. Never throws — top-level errors land in
 * `runErrors` so the cron route can return 200 with a structured body.
 */
export async function runDistribution(
  options: RunOptions = {}
): Promise<DistributionRunResult> {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const dryRun = options.dryRun ?? true;
  const runId = makeRunId(startMs);
  const runErrors: string[] = [];
  const dispatches: DispatchResult[] = [];
  // Per-draft correlation: each PostDraft keeps its channel + rendered
  // preview text so we can persist a `distribution-log` row after the
  // dispatch completes. Keyed by idempotencyKey (stable per draft).
  const draftIndex = new Map<
    string,
    { channel: ChannelConfig; preview: string; entry: PostDraft["sourceEntry"] }
  >();

  // 1) Channel layer — read from CMS (with fallback).
  const channelResult = await fetchEnabledChannels({
    platforms: options.platforms,
    onlyEnabled: true,
    forceStatic: options.forceStaticChannels,
  });
  let channels = channelResult.channels;
  if (options.channelDocumentId) {
    channels = channels.filter(
      (c) => c.documentId === options.channelDocumentId
    );
  }
  runErrors.push(
    `[orchestrator] channel source: ${channelResult.source} — ${channelResult.reason}`
  );

  const summary = buildSummaryForChannels(channels);
  const windowHours =
    options.windowHours ?? deriveWindowHours(channels) ?? 24;

  if (channels.length === 0) {
    return finishRun({
      startedAt,
      startMs,
      windowHours,
      entriesMatched: 0,
      draftsRendered: 0,
      summary,
      dispatches,
      runErrors,
      dryRun,
      channelsUsed: channelResult.source,
    });
  }

  // 2) Source layer — pull recent entries.
  let entries: Awaited<ReturnType<typeof fetchRecentEntries>>["entries"] = [];
  try {
    const fetched = await fetchRecentEntries({
      windowHours,
      maxPerKind: options.maxPerKind,
      kinds: options.kinds,
      nowMs: options.nowMs,
    });
    entries = fetched.entries;
    runErrors.push(...fetched.errors);
  } catch (err) {
    runErrors.push(
      `[orchestrator] source failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return finishRun({
      startedAt,
      startMs,
      windowHours,
      entriesMatched: 0,
      draftsRendered: 0,
      summary,
      dispatches,
      runErrors,
      dryRun,
      channelsUsed: channelResult.source,
    });
  }

  if (entries.length === 0) {
    return finishRun({
      startedAt,
      startMs,
      windowHours,
      entriesMatched: 0,
      draftsRendered: 0,
      summary,
      dispatches,
      runErrors,
      dryRun,
      channelsUsed: channelResult.source,
    });
  }

  // 3) Template layer — fan out each entry to one draft per channel.
  // Respect each channel's `maxPostsPerRun` cap by slicing the entries
  // list per channel before rendering drafts.
  const drafts: PostDraft[] = [];
  for (const channel of channels) {
    const scopedEntries = entries.slice(0, channel.maxPostsPerRun);
    for (const entry of scopedEntries) {
      try {
        const entryDrafts = buildDrafts(entry, {
          channels: [channel],
          moltbookAgentSlug: options.moltbookAgentSlug,
          huggingfaceDatasetId: options.huggingfaceDatasetId,
        });
        drafts.push(...entryDrafts);
      } catch (err) {
        runErrors.push(
          `[orchestrator] template failed for entry ${entry.id} on channel ${channel.name}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
  }

  // 4) Dispatch — group drafts by platform and run each group with
  // bounded concurrency. Unknown platforms short-circuit to a
  // skipped result per draft.
  const dispatchOptions: DispatchOptions = {
    dryRun,
    timeoutMs: options.timeoutMs,
  };

  const byChannel = new Map<string, { channel: ChannelConfig; drafts: PostDraft[] }>();
  // Pair drafts back to channels by (platform × order). Rendering above
  // iterates channels sequentially so we can reconstruct the grouping
  // without a separate lookup index.
  let cursor = 0;
  for (const channel of channels) {
    const scopedEntries = entries.slice(0, channel.maxPostsPerRun);
    const drafted = drafts.slice(cursor, cursor + scopedEntries.length);
    cursor += scopedEntries.length;
    // Channel might render fewer drafts than scopedEntries when
    // `supportedKinds` filters some out — trim trailing undefined slots.
    const compacted = drafted.filter((d): d is PostDraft => Boolean(d));
    if (compacted.length === 0) continue;
    byChannel.set(channel.documentId, { channel, drafts: compacted });
    for (const draft of compacted) {
      draftIndex.set(draft.idempotencyKey, {
        channel,
        preview: draft.text,
        entry: draft.sourceEntry,
      });
    }
  }

  const channelRuns = Array.from(byChannel.values()).map(
    async ({ channel, drafts: channelDrafts }) => {
      const effectiveDryRun = dryRun || channel.dryRunOverride;
      const client = CLIENTS[channel.platform];
      if (!client) {
        return channelDrafts.map<DispatchResult>((draft) => ({
          platform: draft.platform,
          idempotencyKey: draft.idempotencyKey,
          status: "skipped",
          remoteId: null,
          message: `Platform ${draft.platform} is reserved in CMS but no client is implemented yet.`,
          attemptedAt: new Date().toISOString(),
          errorCode: "not-implemented",
        }));
      }
      return dispatchWithConcurrency(
        channelDrafts,
        client,
        { ...dispatchOptions, dryRun: effectiveDryRun },
        DISPATCH_CONCURRENCY
      );
    }
  );

  const settled = await Promise.allSettled(channelRuns);
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      dispatches.push(...outcome.value);
      for (const result of outcome.value) {
        tallyResult(summary, result);
      }
    } else {
      runErrors.push(
        `[orchestrator] channel dispatch wrapper failed: ${
          outcome.reason instanceof Error
            ? outcome.reason.message
            : String(outcome.reason)
        }`
      );
    }
  }

  // Persist each dispatch as a `distribution-log` row for admin audit.
  // `writeDispatchLogs` swallows every error — observability failure
  // must not take down the run. We await so the cron doesn't return
  // before the writes land (Cloud Run would kill the process).
  const logInputs: WriteDispatchLogInput[] = [];
  for (const result of dispatches) {
    const link = draftIndex.get(result.idempotencyKey);
    if (!link) continue;
    logInputs.push({
      runId,
      channel: link.channel,
      result,
      payloadPreview: link.preview,
      entry: {
        id: link.entry.id,
        kind: link.entry.kind,
        title: link.entry.title,
        url: link.entry.url,
      },
    });
  }
  const logTally = await writeDispatchLogs(logInputs);
  runErrors.push(
    `[orchestrator] logs persisted: ${logTally.persisted}/${logTally.attempted}`
  );

  // Stable dispatch log: platform asc, then attemptedAt asc.
  dispatches.sort((a, b) => {
    const byPlat = a.platform.localeCompare(b.platform);
    return byPlat !== 0 ? byPlat : a.attemptedAt.localeCompare(b.attemptedAt);
  });

  return finishRun({
    startedAt,
    startMs,
    windowHours,
    entriesMatched: entries.length,
    draftsRendered: drafts.length,
    summary,
    dispatches,
    runErrors,
    dryRun,
    channelsUsed: channelResult.source,
  });
}

/* ---------- helpers ----------------------------------------------------- */

async function dispatchWithConcurrency(
  drafts: PostDraft[],
  client: PlatformClient,
  options: DispatchOptions,
  concurrency: number
): Promise<DispatchResult[]> {
  const results: DispatchResult[] = new Array(drafts.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, drafts.length) },
    async () => {
      while (true) {
        const index = cursor++;
        if (index >= drafts.length) return;
        const draft = drafts[index];
        try {
          results[index] = await client.dispatch(draft, options);
        } catch (err) {
          results[index] = {
            platform: draft.platform,
            idempotencyKey: draft.idempotencyKey,
            status: "failed",
            remoteId: null,
            message: `Client threw: ${err instanceof Error ? err.message : String(err)}`,
            attemptedAt: new Date().toISOString(),
            errorCode: "client-exception",
          };
        }
      }
    }
  );
  await Promise.all(workers);
  return results;
}

function buildSummaryForChannels(
  channels: ChannelConfig[]
): Record<Platform, PlatformSummary> {
  const base: Record<Platform, PlatformSummary> = {
    x: emptySummary(),
    moltbook: emptySummary(),
    huggingface: emptySummary(),
    devto: emptySummary(),
    hashnode: emptySummary(),
    reddit: emptySummary(),
    discord: emptySummary(),
    producthunt: emptySummary(),
    hackernews: emptySummary(),
    github: emptySummary(),
  };
  for (const channel of channels) {
    base[channel.platform].enabled = true;
  }
  return base;
}

function emptySummary(): PlatformSummary {
  return { enabled: false, sent: 0, skipped: 0, failed: 0, dryRun: 0 };
}

function deriveWindowHours(channels: ChannelConfig[]): number | null {
  if (channels.length === 0) return null;
  return Math.max(...channels.map((c) => c.defaultWindowHours));
}

function tallyResult(
  summary: Record<Platform, PlatformSummary>,
  result: DispatchResult
): void {
  const row = summary[result.platform];
  if (!row) return;
  switch (result.status) {
    case "sent":
      row.sent += 1;
      break;
    case "skipped":
      row.skipped += 1;
      break;
    case "failed":
      row.failed += 1;
      break;
    case "dry-run":
      row.dryRun += 1;
      break;
  }
}

interface FinishArgs {
  startedAt: string;
  startMs: number;
  windowHours: number;
  entriesMatched: number;
  draftsRendered: number;
  summary: Record<Platform, PlatformSummary>;
  dispatches: DispatchResult[];
  runErrors: string[];
  dryRun: boolean;
  channelsUsed: "cms" | "static";
}

/** Build a stable run id of the form `dist-YYYYMMDDTHHMMSSZ-<4rand>`.
 * Short enough to fit in a Strapi string field, readable in admin,
 * and collision-resistant enough for a daily cron. */
function makeRunId(startMs: number): string {
  const d = new Date(startMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  const suffix = Math.random().toString(36).slice(2, 6);
  return `dist-${stamp}-${suffix}`;
}

function finishRun(args: FinishArgs): DistributionRunResult {
  const finishedAt = new Date().toISOString();
  return {
    startedAt: args.startedAt,
    finishedAt,
    windowHours: args.windowHours,
    entriesMatched: args.entriesMatched,
    draftsRendered: args.draftsRendered,
    summary: args.summary,
    dispatches: args.dispatches,
    runErrors: args.runErrors,
    dryRun: args.dryRun,
  };
  // `channelsUsed` is deliberately omitted from the persisted result
  // shape — it's already captured in `runErrors[0]` for audit, and the
  // type surface stays compatible with the v4 cron handler.
}
