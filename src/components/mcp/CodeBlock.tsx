import { useState, useCallback } from "react";

export default function CodeBlock({ label, code, language }: { label: string; code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/60">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">{label}</span>
        <div className="flex items-center gap-2">
          <span className="rounded bg-zinc-200/60 px-2 py-0.5 text-[0.625rem] font-medium text-zinc-500 dark:bg-zinc-700/60 dark:text-zinc-400">{language}</span>
          <button
            onClick={handleCopy}
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
            aria-label="Copy to clipboard"
          >
            {copied ? (
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 8.5 3 3 5-6.5" /></svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="9" height="9" rx="1.5" /><path d="M5 11H3.5A1.5 1.5 0 0 1 2 9.5v-7A1.5 1.5 0 0 1 3.5 1h7A1.5 1.5 0 0 1 12 2.5V5" /></svg>
            )}
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}
