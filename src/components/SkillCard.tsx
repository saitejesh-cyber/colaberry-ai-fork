import Link from "next/link";
import {
  formatShortDate,
  getStatusTone,
  capitalizeFirst,
  toSkillFamily,
} from "@/src/lib/catalogFormatters";

interface SkillCardData {
  id?: number;
  name: string;
  slug?: string;
  summary?: string | null;
  category?: string | null;
  skillType?: string | null;
  provider?: string | null;
  industry?: string | null;
  status?: string | null;
  source?: string | null;
  sourceName?: string | null;
  verified?: boolean | null;
  lastUpdated?: string | null;
  agents?: unknown[];
  mcpServers?: unknown[];
  useCases?: unknown[];
}

export default function SkillCard({ skill }: { skill: SkillCardData }) {
  const category = skill.category || toSkillFamily(skill);
  const provider = skill.provider || skill.sourceName || "Provider pending";
  const statusTone = getStatusTone(skill.status);
  const statusLabel = capitalizeFirst(skill.status);
  const sourceLabel = capitalizeFirst(skill.source || "internal");
  const metadata = [category, provider, skill.industry].filter(Boolean).join(" · ");
  const relationCount =
    (skill.agents?.length || 0) +
    (skill.mcpServers?.length || 0) +
    (skill.useCases?.length || 0);
  const href = `/aixcelerator/skills/${skill.slug || skill.id}`;
  const lastUpdatedLabel = formatShortDate(skill.lastUpdated);

  return (
    <Link href={href} className="group block" aria-label={`View skill ${skill.name} details`}>
      <div className="catalog-card p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="chip chip-neutral rounded-full px-2.5 py-1 text-label font-semibold uppercase tracking-[0.12em]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
            Skill
          </span>
          <svg aria-hidden="true" viewBox="0 0 16 16" className="card-arrow h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-400 transition-colors group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
            <path d="M6.5 3.5 11 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>

        <div className="mt-3">
          <h3 className="truncate text-caption font-semibold text-zinc-900 dark:text-zinc-50">{skill.name}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {skill.summary || "Skill profile summary will appear after content update."}
          </p>
        </div>

        <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{metadata || "Category and provider pending"}</div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="chip chip-neutral rounded-full px-2.5 py-1 text-xs font-semibold">{category}</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusTone}`}>
            {statusLabel}
          </span>
          <span className="chip chip-neutral rounded-full px-2.5 py-1 text-xs font-semibold">
            {sourceLabel}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-zinc-200/60 pt-3 dark:border-zinc-700/50">
          <div className="text-label font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
            {lastUpdatedLabel || "Update pending"} · {relationCount} linked
          </div>
          <span className="text-label font-semibold text-zinc-400 dark:text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">View →</span>
        </div>
      </div>
    </Link>
  );
}
