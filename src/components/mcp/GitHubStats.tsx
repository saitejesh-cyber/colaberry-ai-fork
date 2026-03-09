import { useState, useEffect } from "react";

type GitHubStatsData = {
  stars: number;
  forks: number;
  lastCommit: string | null;
};

export default function GitHubStats({ sourceUrl }: { sourceUrl?: string | null }) {
  const [stats, setStats] = useState<GitHubStatsData | null>(null);
  const match = sourceUrl?.match(/github\.com\/([^/]+)\/([^/]+)/);

  useEffect(() => {
    if (!match) return;
    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, "");
    fetch(`/api/github-stats?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(cleanRepo)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {});
  }, [sourceUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!stats) return null;

  return (
    <>
      <span className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor"><path d="M8 .2a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.2c0 .21.15.46.55.38A8.01 8.01 0 0 0 8 .2Z" /></svg>
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{stats.stars.toLocaleString()}</span>
        <span>stars</span>
      </span>
      <span className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor"><path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 0-1.5 0v.878H6.75v-.878a2.25 2.25 0 1 0-1.5 0ZM8 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm0 1.5a3 3 0 1 0 0-6v-3h.75a2.25 2.25 0 0 0 2.25-2.25V3a.75.75 0 0 0-1.5 0v.75a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75V3a.75.75 0 0 0-1.5 0v.75A2.25 2.25 0 0 0 7.25 6H8v3a3 3 0 0 0 0 6Z" /></svg>
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{stats.forks.toLocaleString()}</span>
        <span>forks</span>
      </span>
    </>
  );
}
