import Link from "next/link";

interface Agent {
  name: string;
  slug?: string;
  description?: string | null;
  industry?: string | null;
  status?: string | null;
  visibility?: string | null;
  source?: string | null;
  sourceName?: string | null;
  verified?: boolean | null;
}

export default function AgentCard({ agent }: { agent: Agent }) {
  const isPrivate = (agent.visibility || "Public").toLowerCase() === "private";
  const href = agent.slug ? `/aixcelerator/agents/${agent.slug}` : "/aixcelerator/agents";
  const statusKey = agent.status?.toLowerCase();
  const statusTone =
    statusKey === "active" || statusKey === "live"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-500/40"
      : statusKey === "beta"
        ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-500/40"
        : "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800/70 dark:text-slate-100 dark:ring-slate-600/70";
  const statusLabel = agent.status
    ? agent.status.charAt(0).toUpperCase() + agent.status.slice(1)
    : "Unknown";
  const sourceKey = (agent.source || "internal").toLowerCase();
  const sourceLabel =
    sourceKey === "external" ? "External" : sourceKey === "partner" ? "Partner" : "Internal";
  const sourceSuffix = agent.sourceName
    ? ` (${agent.sourceName})`
    : sourceKey === "internal"
      ? " (Colaberry)"
      : "";
  const sourceTone =
    sourceKey === "external"
      ? "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:ring-sky-500/40"
      : sourceKey === "partner"
        ? "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:ring-violet-500/40"
        : "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/70 dark:text-slate-100 dark:ring-slate-600/70";
  const visibilityTone = isPrivate
    ? "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/70 dark:text-slate-100 dark:ring-slate-600/70"
    : "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-500/40";
  const summary = agent.description || "Structured profile and delivery context available.";
  const industry = agent.industry || "General";

  return (
    <Link href={href} className="group block" aria-label={`View agent ${agent.name} details`}>
      <div className="surface-panel surface-hover surface-interactive border border-slate-200/80 bg-white/92 p-5 transition hover:-translate-y-1 hover:shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-blue/25 bg-brand-blue/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-deep">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-aqua" />
            Agent profile
          </span>
          <span className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep">
            →
          </span>
        </div>

        <div className="mt-3">
          <h3 className="truncate text-base font-semibold text-slate-900">{agent.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">{summary}</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="chip chip-brand rounded-full border border-brand-blue/20 bg-white px-2.5 py-1 text-xs font-semibold text-brand-deep">
            {industry}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusTone}`}
          >
            {statusLabel}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${visibilityTone}`}
          >
            {isPrivate ? "Private" : "Public"}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`max-w-full truncate rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${sourceTone}`}
          >
            {sourceLabel}
            {sourceSuffix}
          </span>
          {agent.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-500/40">
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

        <div className="mt-4 border-t border-slate-200/80 pt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Managed • Auditable • Versioned
        </div>
        <div className="mt-1 text-xs font-semibold text-brand-deep">View profile</div>
      </div>
    </Link>
  );
}
