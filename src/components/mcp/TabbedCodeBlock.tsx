import { useState } from "react";
import CopyButton from "./CopyButton";
import CodeBlock from "./CodeBlock";

export type CodeTab = { label: string; code: string; language: string };

export default function TabbedCodeBlock({ tabs }: { tabs: CodeTab[] }) {
  const [active, setActive] = useState(0);
  if (tabs.length === 0) return null;
  if (tabs.length === 1) return <CodeBlock label={tabs[0].label} code={tabs[0].code} language={tabs[0].language} />;
  const current = tabs[active];
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center gap-0 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActive(i)}
            className={`px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
              i === active
                ? "border-b-2 border-[#DC2626] text-zinc-900 dark:border-red-400 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="relative">
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <span className="rounded bg-zinc-200/60 px-2 py-0.5 text-[0.625rem] font-medium text-zinc-500 dark:bg-zinc-700/60 dark:text-zinc-400">{current.language}</span>
          <CopyButton text={current.code} />
        </div>
        <pre className="overflow-x-auto p-4 pr-24 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
          <code>{current.code}</code>
        </pre>
      </div>
    </div>
  );
}
