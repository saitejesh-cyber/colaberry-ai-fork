/**
 * Template engine — render one `DistributableEntry` into one `PostDraft`
 * per CMS channel.
 *
 * Sprint v5 shift: post copy is no longer hard-coded per platform — it
 * comes from the Strapi `distribution-channel.bodyTemplate` field and is
 * rendered by the Mustache-style engine in `./template.ts`. This module
 * is the thin adapter that converts the rendered text into the platform-
 * canonical payload shape (`XPayload` / `MoltbookPayload` / `HuggingfacePayload`).
 *
 * Copy budgets:
 *   - X: 280 chars hard — enforced via `renderTemplate(maxLength)`. The
 *     engine truncates on a word boundary with an ellipsis suffix.
 *   - Moltbook: no copy budget. `titleTemplate` → title, `bodyTemplate` → body.
 *   - Hugging Face: the JSONL row carries the raw entry; the rendered text
 *     is the dry-run preview.
 *
 * Pure function — no I/O, no env reads. The orchestrator threads
 * `ChannelConfig[]` in; tests call this with a fixture.
 */

import { renderTemplate } from "./template";
import type {
  ChannelConfig,
  ContentKind,
  DistributableEntry,
  HuggingfacePayload,
  MoltbookPayload,
  Platform,
  PostDraft,
  XPayload,
} from "./types";

/** Default Moltbook agent identity — overridable per-run from the
 * orchestrator (env fallback for staging vs prod). */
const DEFAULT_MOLTBOOK_AGENT_SLUG = "colaberry-ai";

/** Default HF dataset target. One dataset for all kinds keeps the
 * downstream-consumer interface simple; rows carry `kind` for filtering. */
const DEFAULT_HF_DATASET_ID = "colaberry/catalog-updates";

const X_CHAR_BUDGET = 280;

export interface TemplateOptions {
  /** Override Moltbook agent identity (defaults to colaberry-ai). */
  moltbookAgentSlug?: string;
  /** Override HF dataset target. */
  huggingfaceDatasetId?: string;
  /** Channels to render for. Orchestrator passes only the enabled ones. */
  channels: ChannelConfig[];
}

/**
 * Render one entry into one draft per channel that supports it.
 *
 * A channel can restrict itself to specific content kinds via
 * `supportedKinds`; if the entry's kind isn't in the list we skip the
 * channel (returns fewer drafts than channels). An empty `supportedKinds`
 * means "all kinds allowed" — the common case.
 */
export function buildDrafts(
  entry: DistributableEntry,
  options: TemplateOptions
): PostDraft[] {
  const drafts: PostDraft[] = [];

  for (const channel of options.channels) {
    if (!channelSupportsKind(channel, entry.kind)) continue;
    const draft = buildDraftForChannel(entry, channel, {
      moltbookAgentSlug:
        options.moltbookAgentSlug ?? DEFAULT_MOLTBOOK_AGENT_SLUG,
      huggingfaceDatasetId:
        options.huggingfaceDatasetId ?? DEFAULT_HF_DATASET_ID,
    });
    if (draft) drafts.push(draft);
  }

  return drafts;
}

interface BuildCtx {
  moltbookAgentSlug: string;
  huggingfaceDatasetId: string;
}

function buildDraftForChannel(
  entry: DistributableEntry,
  channel: ChannelConfig,
  ctx: BuildCtx
): PostDraft | null {
  switch (channel.platform) {
    case "x":
      return buildXDraft(entry, channel);
    case "moltbook":
      return buildMoltbookDraft(entry, channel, ctx.moltbookAgentSlug);
    case "huggingface":
      return buildHuggingfaceDraft(entry, channel, ctx.huggingfaceDatasetId);
    // Platforms reserved in the CMS enum but not yet implemented in
    // clients: we still render a draft so the dry-run preview shows the
    // copy, and the orchestrator will tag the dispatch as
    // skipped/not-implemented via the unknown-platform path.
    case "devto":
    case "hashnode":
    case "reddit":
    case "discord":
    case "producthunt":
    case "hackernews":
    case "github":
      return buildGenericDraft(entry, channel);
  }
}

function buildXDraft(
  entry: DistributableEntry,
  channel: ChannelConfig
): PostDraft {
  const text = renderTemplate(channel.bodyTemplate, entry, {
    escapeHtml: channel.escapeHtml,
    maxLength: X_CHAR_BUDGET,
  });
  const payload: XPayload = {
    platform: "x",
    text,
    replySettings: "everyone",
  };
  return {
    platform: "x",
    idempotencyKey: makeIdempotencyKey("x", entry),
    text,
    payload,
    sourceEntry: entry,
  };
}

function buildMoltbookDraft(
  entry: DistributableEntry,
  channel: ChannelConfig,
  agentSlug: string
): PostDraft {
  const title = channel.titleTemplate
    ? renderTemplate(channel.titleTemplate, entry, {
        escapeHtml: channel.escapeHtml,
      })
    : buildDefaultHeadline(entry);
  const body = renderTemplate(channel.bodyTemplate, entry, {
    escapeHtml: channel.escapeHtml,
  });
  const payload: MoltbookPayload = {
    platform: "moltbook",
    title,
    body,
    agentSlug,
    tags: entry.tags.slice(0, 8),
    canonicalUrl: entry.url,
  };
  return {
    platform: "moltbook",
    idempotencyKey: makeIdempotencyKey("moltbook", entry),
    text: `${title}\n\n${body}`,
    payload,
    sourceEntry: entry,
  };
}

function buildHuggingfaceDraft(
  entry: DistributableEntry,
  channel: ChannelConfig,
  repoId: string
): PostDraft {
  const preview = renderTemplate(channel.bodyTemplate, entry, {
    escapeHtml: false,
  });
  const payload: HuggingfacePayload = {
    platform: "huggingface",
    repoId,
    row: {
      id: entry.id,
      kind: entry.kind,
      title: entry.title,
      summary: entry.summary,
      url: entry.url,
      tags: entry.tags,
      updated_at: entry.updatedAt,
      is_new: entry.isNew,
      source: "colaberry.ai",
    },
  };
  return {
    platform: "huggingface",
    idempotencyKey: makeIdempotencyKey("huggingface", entry),
    text: preview,
    payload,
    sourceEntry: entry,
  };
}

/** Render a draft for a reserved-but-not-yet-implemented platform. The
 * orchestrator will tag its dispatch as "skipped: not-implemented"; we
 * still want the rendered text in the dry-run preview so CMS editors can
 * validate the template before the client ships. Cast to `XPayload` so
 * the existing union doesn't need loosening — the client layer is the
 * only consumer of `payload` and it rejects mismatched platforms. */
function buildGenericDraft(
  entry: DistributableEntry,
  channel: ChannelConfig
): PostDraft {
  const text = renderTemplate(channel.bodyTemplate, entry, {
    escapeHtml: channel.escapeHtml,
  });
  return {
    platform: channel.platform,
    idempotencyKey: makeIdempotencyKey(channel.platform, entry),
    text,
    payload: { platform: "x", text } as XPayload,
    sourceEntry: entry,
  };
}

/* ---------- helpers ----------------------------------------------------- */

function channelSupportsKind(
  channel: ChannelConfig,
  kind: ContentKind
): boolean {
  if (!channel.supportedKinds || channel.supportedKinds.length === 0) {
    return true;
  }
  return channel.supportedKinds.includes(kind);
}

function buildDefaultHeadline(entry: DistributableEntry): string {
  const verb = entry.isNew ? "New" : "Updated";
  const kindLabel = kindToLabel(entry.kind);
  return `${verb} ${kindLabel}: ${entry.title}`;
}

function kindToLabel(kind: ContentKind): string {
  switch (kind) {
    case "agent":
      return "agent";
    case "mcpServer":
      return "MCP server";
    case "skill":
      return "skill";
    case "podcastEpisode":
      return "podcast episode";
    case "llmArchitecture":
      return "LLM architecture";
  }
}

function makeIdempotencyKey(
  platform: Platform,
  entry: DistributableEntry
): string {
  return `${platform}:${entry.id}:${entry.updatedAt}`;
}
