/**
 * Auto-Publisher — platform configuration.
 *
 * Spec: specs/auto-publisher/spec.md
 * Plan: specs/auto-publisher/plan.md
 * Task: specs/auto-publisher/tasks.md — Task 2
 *
 * All three platforms default to goLive=false. Flipping a platform live
 * requires a reviewed PR with Ram Katamaraja's recorded approval in the
 * PR description AND a corresponding Basecamp comment.
 *
 * No secrets live in this file. Tokens are read from process.env at
 * call time (not import time) via the getter helpers so missing env
 * vars do not break the build or typecheck.
 */

import type { PlatformConfig, PlatformName } from "./types";

export const PUBLISHER_PLATFORMS: readonly PlatformConfig[] = [
  {
    name: "huggingface",
    enabled: true,
    goLive: false, // DO NOT flip without Ram approval — see specs/auto-publisher/tasks.md Task 29
    charLimit: 2000,
  },
  {
    name: "x",
    enabled: true,
    goLive: false,
    charLimit: 280,
    blockedReason:
      "Ram $100/mo X Basic-tier budget + @colaberry handle decision pending",
  },
  {
    name: "moltbook",
    enabled: true,
    goLive: false,
    charLimit: 1000,
    blockedReason: "Moltbook Build-for-Agents early access application pending",
  },
] as const;

/**
 * Publisher mode — overrideable via env var, defaults to dry-run for safety.
 * Even with goLive=true on a platform, setting PUBLISHER_MODE=dry-run at
 * the process level forces every driver to return `dry_run`.
 */
export type PublisherMode = "dry-run" | "live";

export function getPublisherMode(): PublisherMode {
  const raw = process.env.PUBLISHER_MODE;
  return raw === "live" ? "live" : "dry-run";
}

/**
 * Effective goLive state for a platform — combines the process-level mode
 * with the per-platform flag. Both must agree before a live call is made.
 */
export function isPlatformLive(config: PlatformConfig): boolean {
  return config.goLive && getPublisherMode() === "live";
}

/**
 * Cron bearer token getter. Throws at call time (not import time) so
 * the module can be imported during build / typecheck without failing.
 * In development, a missing token is allowed so local tests can stub.
 */
export function getPublisherCronToken(): string {
  const token = process.env.PUBLISHER_CRON_TOKEN;
  if (!token || token.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "PUBLISHER_CRON_TOKEN is missing or too short in production env",
      );
    }
    return "dev-publisher-cron-token-not-for-production-use-0000";
  }
  return token;
}

/**
 * Lookup a platform's config by name. Throws on unknown platforms so
 * typos are caught at the orchestrator boundary.
 */
export function getPlatformConfig(platform: PlatformName): PlatformConfig {
  const found = PUBLISHER_PLATFORMS.find((p) => p.name === platform);
  if (!found) {
    throw new Error(`Unknown publisher platform: ${platform}`);
  }
  return found;
}
