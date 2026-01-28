type MCP = {
  name: string;
  description: string;
  industry: string;
};

export default function MCPCard({ mcp }: { mcp: MCP }) {
  return (
    <div className="surface-panel surface-hover p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900">
            {mcp.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">
            {mcp.description}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-brand-blue/20 bg-white px-2.5 py-1 text-xs font-semibold text-brand-deep">
          MCP
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-brand-blue/20 bg-white px-2.5 py-1 text-xs font-semibold text-brand-deep">
          {mcp.industry}
        </span>
        <span className="text-xs text-slate-500">TLS • Auth-ready • Observability</span>
      </div>
    </div>
  );
}
