import { useState } from "react";
import type { ParsedTool } from "../../lib/mcp-utils";

export default function MCPToolCard({ tool, index }: { tool: ParsedTool; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasDescription = Boolean(tool.description);
  return (
    <div className="rounded-lg border border-zinc-200 overflow-hidden dark:border-zinc-700">
      <button
        onClick={() => hasDescription && setExpanded(!expanded)}
        className={`w-full flex items-start gap-3 p-3.5 text-left transition-colors ${hasDescription ? "hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer" : "cursor-default"}`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold font-mono text-zinc-900 dark:text-zinc-100">{tool.name}</span>
          {hasDescription && !expanded && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">{tool.description}</p>
          )}
        </div>
        {hasDescription && (
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
      {expanded && hasDescription && (
        <div className="px-3.5 pb-3.5 pt-0 border-t border-zinc-100 dark:border-zinc-800">
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{tool.description}</p>
        </div>
      )}
    </div>
  );
}
