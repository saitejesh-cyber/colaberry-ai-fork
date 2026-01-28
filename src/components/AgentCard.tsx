interface Agent {
  name: string;
  description: string;
  industry: string;
  status: string;
}

export default function AgentCard({ agent }: { agent: Agent }) {
  const statusTone =
    agent.status?.toLowerCase() === "active"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : agent.status?.toLowerCase() === "beta"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-slate-50 text-slate-700 ring-slate-200";

  return (
    <div className="surface-panel surface-hover p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900">
            {agent.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">
            {agent.description}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusTone}`}
        >
          {agent.status}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-brand-blue/20 bg-white px-2.5 py-1 text-xs font-semibold text-brand-deep">
          {agent.industry}
        </span>
        <span className="text-xs text-slate-500">Managed • Auditable • Versioned</span>
      </div>
    </div>
  );
}
