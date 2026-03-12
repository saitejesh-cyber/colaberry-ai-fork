import type { NextApiRequest, NextApiResponse } from "next";
import { isRateLimited, getClientIp } from "../../lib/rate-limit";

type GitHubStatsResponse = {
  stars: number;
  forks: number;
  lastCommit: string | null;
};

const cache = new Map<string, { data: GitHubStatsResponse; expires: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (isRateLimited("github-stats", getClientIp(req), 60, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const owner = String(req.query.owner || "");
  const repo = String(req.query.repo || "").replace(/\.git$/, "");

  if (!owner || !repo || !/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) {
    return res.status(400).json({ error: "Invalid owner or repo" });
  }

  const cacheKey = `${owner}/${repo}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=7200");
    return res.status(200).json(cached.data);
  }

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "colaberry-ai",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!response.ok) {
      return res.status(response.status === 404 ? 404 : 502).json({ error: "GitHub API error" });
    }

    const data = await response.json();
    const stats: GitHubStatsResponse = {
      stars: data.stargazers_count ?? 0,
      forks: data.forks_count ?? 0,
      lastCommit: data.pushed_at ?? null,
    };

    cache.set(cacheKey, { data: stats, expires: Date.now() + CACHE_TTL_MS });
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=7200");
    return res.status(200).json(stats);
  } catch {
    return res.status(502).json({ error: "Failed to fetch GitHub data" });
  }
}
