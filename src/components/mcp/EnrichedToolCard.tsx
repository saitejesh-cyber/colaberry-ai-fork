import { useState } from "react";
import type { MCPToolSchema, MCPToolParameter } from "../../lib/cms";

function ParameterTable({ parameters }: { parameters: MCPToolParameter[] }) {
  if (parameters.length === 0) return null;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-700">
            <th className="py-2 pr-3 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Name</th>
            <th className="py-2 pr-3 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Type</th>
            <th className="py-2 pr-3 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Required</th>
            <th className="py-2 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Description</th>
          </tr>
        </thead>
        <tbody>
          {parameters.map((param) => (
            <tr key={param.name} className="border-b border-zinc-100 dark:border-zinc-800 even:bg-zinc-50 dark:even:bg-zinc-800/30">
              <td className="py-2 pr-3 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">{param.name}</td>
              <td className="py-2 pr-3">
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[0.6875rem] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{param.type}</span>
              </td>
              <td className="py-2 pr-3">
                {param.required && <span className="text-xs font-bold text-[#DC2626] dark:text-red-400">*</span>}
              </td>
              <td className="py-2 text-xs text-zinc-600 dark:text-zinc-400">{param.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function EnrichedToolCard({ tool, index }: { tool: MCPToolSchema; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasContent = Boolean(tool.description) || tool.parameters.length > 0;
  return (
    <div className="rounded-lg border border-zinc-200 overflow-hidden dark:border-zinc-700">
      <button
        onClick={() => hasContent && setExpanded(!expanded)}
        className={`w-full flex items-start gap-3 p-3.5 text-left transition-colors ${hasContent ? "hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer" : "cursor-default"}`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold font-mono text-zinc-900 dark:text-zinc-100">{tool.name}</span>
          {tool.description && !expanded && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">{tool.description}</p>
          )}
          {!expanded && tool.parameters.length > 0 && (
            <span className="mt-1 inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[0.625rem] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {tool.parameters.length} param{tool.parameters.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {hasContent && (
          <svg
            className={`h-4 w-4 shrink-0 mt-1.5 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m4 6 4 4 4-4" />
          </svg>
        )}
      </button>
      {expanded && hasContent && (
        <div className="px-3.5 pb-3.5 pt-0 border-t border-zinc-100 dark:border-zinc-800">
          {tool.description && (
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{tool.description}</p>
          )}
          <ParameterTable parameters={tool.parameters} />
        </div>
      )}
    </div>
  );
}

export { ParameterTable };
