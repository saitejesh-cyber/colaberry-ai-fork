import type { NextApiRequest, NextApiResponse } from "next";
import {
  fetchPodcastEpisodes,
  getPodcastTrendingScore,
  type PodcastEpisode,
  type PodcastSortBy,
} from "../../lib/cms";

const PAGE_SIZE = 24;

function parseSort(raw: string): PodcastSortBy {
  if (raw === "trending") return "trending";
  return "latest";
}

function normalizeSearch(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 120);
}

function matchesSearch(episode: PodcastEpisode, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  const fields = [
    episode.title,
    episode.description,
    ...(episode.tags || []).map((t) => t.name),
    ...(episode.companies || []).map((c) => c.name),
  ];
  return fields.some((f) => f?.toLowerCase().includes(lower));
}

type ResponsePayload = {
  episodes: PodcastEpisode[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  total: number;
};

let cachedEpisodes: PodcastEpisode[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

async function getAllEpisodes(): Promise<PodcastEpisode[]> {
  const now = Date.now();
  if (cachedEpisodes && now - cacheTime < CACHE_TTL) return cachedEpisodes;
  cachedEpisodes = await fetchPodcastEpisodes();
  cacheTime = now;
  return cachedEpisodes;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponsePayload | { error: string }>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rawPage = Number(req.query.page) || 1;
    const page = Math.max(1, rawPage);
    const rawSort = String(req.query.sort || "latest");
    const activeSort = parseSort(rawSort);
    const rawType = String(req.query.type || "all").toLowerCase();
    const searchQuery = normalizeSearch(String(req.query.q || ""));

    const allEpisodes = await getAllEpisodes();

    // Filter by type
    const typeFiltered =
      rawType === "all"
        ? allEpisodes
        : allEpisodes.filter(
            (ep) => (ep.podcastType || "internal").toLowerCase() === rawType
          );

    // Filter by search
    const searched = typeFiltered.filter((ep) => matchesSearch(ep, searchQuery));

    // Sort
    const sorted =
      activeSort === "trending"
        ? [...searched].sort((a, b) => {
            const now = Date.now();
            const scoreDiff =
              getPodcastTrendingScore(b, now) - getPodcastTrendingScore(a, now);
            if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
            const bDate = Date.parse(b.publishedDate || b.updatedAt || "") || 0;
            const aDate = Date.parse(a.publishedDate || a.updatedAt || "") || 0;
            return bDate - aDate;
          })
        : searched;

    const total = sorted.length;
    const start = (page - 1) * PAGE_SIZE;
    const episodes = sorted.slice(start, start + PAGE_SIZE);
    const hasMore = start + PAGE_SIZE < total;

    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
    return res.status(200).json({ episodes, page, pageSize: PAGE_SIZE, hasMore, total });
  } catch {
    return res.status(500).json({ error: "Failed to fetch podcast episodes" });
  }
}
