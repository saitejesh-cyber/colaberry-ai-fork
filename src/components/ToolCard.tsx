import Link from "next/link";

type ToolCardProps = {
  name: string;
  slug?: string;
  description?: string | null;
  toolCategory?: string | null;
  mcpServerCount?: number;
};

function formatCategory(cat?: string | null): string {
  if (!cat) return "Other";
  return cat.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ToolCard({ name, slug, description, toolCategory, mcpServerCount = 0 }: ToolCardProps) {
  const href = slug ? `/aixcelerator/tools/${slug}` : "/aixcelerator/tools";
  const summary = description || "End tool that MCP servers connect to.";
  const category = formatCategory(toolCategory);

  return (
    <Link href={href} className="group block" aria-label={`View tool ${name} details`}>
      <div className="catalog-card p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="chip chip-neutral rounded-full px-2.5 py-1 text-label font-semibold uppercase tracking-[0.12em]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
            Tool
          </span>
          <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-400 transition-colors group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
            <path d="M6.5 3.5 11 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>

        <div className="mt-3">
          <h3 className="truncate text-caption font-semibold text-zinc-900 dark:text-zinc-50">{name}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{summary}</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="chip chip-neutral rounded-full px-2.5 py-1 text-xs font-semibold">
            {category}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-zinc-200/60 pt-3 dark:border-zinc-700/50">
          <div className="text-label font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
            {mcpServerCount > 0 ? `${mcpServerCount} MCP server${mcpServerCount !== 1 ? "s" : ""}` : "Catalog listed"}
          </div>
          <span className="text-label font-semibold text-zinc-400 dark:text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">View →</span>
        </div>
      </div>
    </Link>
  );
}
