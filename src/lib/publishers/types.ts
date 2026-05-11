/**
 * Auto-Publisher — core type surface.
 *
 * Spec: specs/auto-publisher/spec.md
 * Plan: specs/auto-publisher/plan.md
 * Task: specs/auto-publisher/tasks.md — Task 1
 *
 * Pure type definitions + the NotEnabledError class. No runtime I/O.
 */

export type PlatformName = "huggingface" | "x" | "moltbook";

export type PublishStatus =
  | "success"
  | "dry_run"
  | "skipped_duplicate"
  | "error";

export type CandidateType = "agent" | "mcp" | "skill" | "tool" | "podcast";

/**
 * A CMS entry eligible for publication on the next run.
 */
export interface PublishCandidate {
  readonly id: string; // Strapi documentId
  readonly type: CandidateType;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly url: string; // absolute colaberry.ai URL
  readonly updatedAt: string; // ISO-8601
  readonly contentVersion: string; // stable per edit — derived from Strapi updatedAt
  readonly mediaUrls: readonly string[]; // zero or one in phase 1
}

/**
 * A rendered payload ready for a specific platform driver.
 * This is the shape that gets content-hashed for idempotency.
 */
export interface PublishPayload {
  readonly platform: PlatformName;
  readonly candidateId: string;
  readonly candidateType: CandidateType;
  readonly candidateSlug: string;
  readonly candidateTitle: string;
  readonly contentVersion: string;
  readonly renderedText: string;
  readonly mediaUrls: readonly string[];
}

/**
 * Result of a single driver.publish() call.
 * Discriminated union — narrow by `status`.
 */
export type PublishResult =
  | {
      readonly status: "success";
      readonly externalId: string;
      readonly externalUrl: string;
    }
  | {
      readonly status: "dry_run";
      readonly renderedText: string;
    }
  | {
      readonly status: "error";
      readonly errorMessage: string;
      readonly retryable: boolean;
    };

/**
 * Per-platform configuration.
 * `enabled` gates whether the driver is attempted at all.
 * `goLive` gates whether the driver may make real external calls.
 * Both default to false on new platforms for safety.
 */
export interface PlatformConfig {
  readonly name: PlatformName;
  readonly enabled: boolean;
  readonly goLive: boolean;
  readonly charLimit: number;
  readonly blockedReason?: string;
}

/**
 * A row persisted to Strapi `PublishLog` — one per publish attempt.
 */
export interface PublishLogEntry {
  readonly contentHash: string;
  readonly platform: PlatformName;
  readonly status: PublishStatus;
  readonly candidateType: CandidateType;
  readonly candidateSlug: string;
  readonly candidateTitle: string;
  readonly renderedText: string;
  readonly externalId?: string;
  readonly externalUrl?: string;
  readonly errorMessage?: string;
  readonly retryCount: number;
  readonly runId: string; // UUID v4 — one per runPublishers() invocation
  readonly publishedAt: string; // ISO-8601
}

/**
 * Contract every platform driver must satisfy.
 * Implementations live in src/lib/publishers/drivers/{platform}.ts.
 */
export interface PublisherDriver {
  readonly platform: PlatformName;
  render(candidate: PublishCandidate): PublishPayload;
  publish(
    payload: PublishPayload,
    config: PlatformConfig,
  ): Promise<PublishResult>;
}

/**
 * Summary returned from runPublishers() and echoed by /api/publishers/run.
 */
export interface PublishRunSummary {
  readonly runId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly attempted: number;
  readonly success: number;
  readonly dry_run: number;
  readonly skipped_duplicate: number;
  readonly errors: number;
}

/**
 * Defense-in-depth error thrown whenever a driver's live code path
 * is invoked while `goLive=false`. Must never reach an external API.
 */
export class NotEnabledError extends Error {
  readonly platform: PlatformName;

  constructor(platform: PlatformName, reason?: string) {
    const detail = reason ? ` (${reason})` : "";
    super(`Platform ${platform} is not go-live enabled${detail}`);
    this.name = "NotEnabledError";
    this.platform = platform;
  }
}
