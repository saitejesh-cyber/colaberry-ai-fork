/**
 * Shared formatting helpers for catalog cards (Agents, MCPs, Skills, Use Cases).
 * Single source of truth — avoids duplicating logic in AgentCard / MCPCard.
 */

/* ── Date formatting ────────────────────────────────────────────────────── */

export function formatShortDate(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/* ── Usage count formatting ─────────────────────────────────────────────── */

export function formatUsage(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M uses`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K uses`;
  return `${value} uses`;
}

/* ── Status badge tone ──────────────────────────────────────────────────── */

const STATUS_TONES: Record<string, string> = {
  active:
    "bg-[var(--trusted-surface)] text-[var(--trusted-text)] ring-[var(--trusted-stroke)]",
  live:
    "bg-[var(--trusted-surface)] text-[var(--trusted-text)] ring-[var(--trusted-stroke)]",
  beta:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-500/40",
};

const DEFAULT_STATUS_TONE =
  "bg-[var(--neutral-fill)] text-[var(--neutral-text)] ring-[var(--neutral-stroke)]";

export function getStatusTone(status?: string | null): string {
  return STATUS_TONES[(status || "").toLowerCase()] ?? DEFAULT_STATUS_TONE;
}

/* ── Source badge tone ──────────────────────────────────────────────────── */

const SOURCE_TONES: Record<string, string> = {
  external:
    "bg-[var(--pivot-surface)] text-[var(--pivot-fill)] ring-[var(--pivot-stroke)] dark:text-[var(--pivot-text)]",
  partner:
    "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:ring-violet-500/40",
};

const DEFAULT_SOURCE_TONE =
  "bg-[var(--neutral-fill)] text-[var(--neutral-text)] ring-[var(--neutral-stroke)]";

export function getSourceTone(source?: string | null): string {
  return SOURCE_TONES[(source || "").toLowerCase()] ?? DEFAULT_SOURCE_TONE;
}

/* ── Visibility badge tone ──────────────────────────────────────────────── */

export function getVisibilityTone(visibility?: string | null): string {
  const isPrivate = (visibility || "Public").toLowerCase() === "private";
  return isPrivate ? DEFAULT_SOURCE_TONE : STATUS_TONES.active!;
}

/* ── Label formatting helpers ───────────────────────────────────────────── */

export function capitalizeFirst(value?: string | null): string {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getSourceLabel(source?: string | null, sourceName?: string | null): string {
  const key = (source || "internal").toLowerCase();
  const label = key === "external" ? "External" : key === "partner" ? "Partner" : "Internal";
  const suffix = sourceName
    ? ` (${sourceName})`
    : key === "internal"
      ? " (Colaberry)"
      : "";
  return `${label}${suffix}`;
}
