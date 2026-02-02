import Link from "next/link";

type MCP = {
  name: string;
  slug?: string;
  description?: string | null;
  industry?: string | null;
  visibility?: string;
};

export default function MCPCard({ mcp }: { mcp: MCP }) {
  const isPrivate = (mcp.visibility || "Public").toLowerCase() === "private";
  const visibilityTone = isPrivate
    ? "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/70 dark:text-slate-100 dark:ring-slate-600/70"
    : "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-500/40";

  const href = mcp.slug ? `/aixcelerator/mcp/${mcp.slug}` : "/aixcelerator/mcp";

  return (
    <Link href={href} className="group block">
      <div className="surface-panel border-t-4 border-brand-blue/20 p-5 transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900">
            {mcp.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">
            {mcp.description || "Details coming soon."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${visibilityTone}`}
          >
            {isPrivate ? (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                <path
                  d="M6 10V8a6 6 0 1 1 12 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1Zm2 0h8V8a4 4 0 1 0-8 0v2Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                <path
                  d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm6.9 9h-3.45a15.7 15.7 0 0 0-1.2-6.03A8.02 8.02 0 0 1 18.9 11Zm-5.55 0H10.6a13.7 13.7 0 0 1 1.4-5.33A13.7 13.7 0 0 1 13.35 11ZM5.1 11a8.02 8.02 0 0 1 4.65-6.03A15.7 15.7 0 0 0 8.55 11H5.1Zm3.45 2h3.45a13.7 13.7 0 0 1-1.4 5.33A13.7 13.7 0 0 1 8.55 13Zm5.4 0h3.45a15.7 15.7 0 0 1-1.2 6.03A8.02 8.02 0 0 1 13.95 13Zm-8.85 0h3.45a15.7 15.7 0 0 0 1.2 6.03A8.02 8.02 0 0 1 5.1 13Z"
                  fill="currentColor"
                />
              </svg>
            )}
            {isPrivate ? "Private" : "Public"}
          </span>
          <span className="chip chip-brand shrink-0 rounded-full border border-brand-blue/20 bg-white px-2.5 py-1 text-xs font-semibold text-brand-deep">
            MCP
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="chip chip-brand rounded-full border border-brand-blue/20 bg-white px-2.5 py-1 text-xs font-semibold text-brand-deep">
          {mcp.industry || "General"}
        </span>
        <span className="text-xs text-slate-500">TLS • Auth-ready • Observability</span>
      </div>
      </div>
    </Link>
  );
}
