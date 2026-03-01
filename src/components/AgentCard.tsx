import Link from "next/link";
import {
  formatShortDate,
  formatUsage,
  getStatusTone,
  capitalizeFirst,
} from "@/src/lib/catalogFormatters";

interface Agent {
  name: string;
  slug?: string;
  description?: string | null;
  industry?: string | null;
  status?: string | null;
  rating?: number | null;
  usageCount?: number | null;
  lastUpdated?: string | null;
  visibility?: string | null;
  source?: string | null;
  sourceName?: string | null;
  verified?: boolean | null;
}

export default function AgentCard({ agent }: { agent: Agent }) {
  const href = agent.slug ? `/aixcelerator/agents/${agent.slug}` : "/aixcelerator/agents";
  const statusTone = getStatusTone(agent.status);
  const statusLabel = capitalizeFirst(agent.status);
  const summary = agent.description || "Structured profile and delivery context available.";
  const industry = agent.industry || "General";
  const ratingLabel = typeof agent.rating === "number" ? agent.rating.toFixed(1) : null;
  const usageLabel =
    typeof agent.usageCount === "number" && agent.usageCount > 0 ? formatUsage(agent.usageCount) : null;
  const lastUpdatedLabel = formatShortDate(agent.lastUpdated);
  const metaParts: string[] = [];
  if (ratingLabel) metaParts.push(`R ${ratingLabel}`);
  if (usageLabel) metaParts.push(usageLabel);
  if (lastUpdatedLabel) metaParts.push(lastUpdatedLabel);
  if (agent.source) metaParts.push(capitalizeFirst(agent.source));

  return (
    <Link href={href} className="group block" aria-label={`View agent ${agent.name} details`}>
      <div className="catalog-card p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="chip chip-neutral rounded-full px-2.5 py-1 text-label font-semibold uppercase tracking-[0.12em]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
            Agent
          </span>
          <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500 transition-colors group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
            <path d="M6.5 3.5 11 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>

        <div className="mt-3">
          <h3 className="truncate text-caption font-semibold text-zinc-900 dark:text-zinc-50">{agent.name}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{summary}</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="chip chip-neutral rounded-full px-2.5 py-1 text-xs font-semibold">
            {industry}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusTone}`}
          >
            {statusLabel}
          </span>
          {agent.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--trusted-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--trusted-text)] ring-1 ring-inset ring-[var(--trusted-stroke)]">
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
                <path
                  d="M7.4 13.2 4.2 10l1.4-1.4 1.8 1.8 4.8-4.8 1.4 1.4-6.2 6.2Z"
                  fill="currentColor"
                />
              </svg>
              Verified
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-zinc-200/60 pt-3 dark:border-zinc-700/50">
          <div className="text-label font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
            {metaParts.length > 0 ? metaParts.join(" \u00b7 ") : "Quality monitored"}
          </div>
          <span className="text-label font-semibold text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">View →</span>
        </div>
      </div>
    </Link>
  );
}
