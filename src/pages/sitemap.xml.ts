import type { GetServerSideProps } from "next";
import caseStudies from "../data/caseStudies.json";
import {
  fetchAgents,
  fetchArticles,
  fetchMCPServers,
  fetchPodcastEpisodes,
  fetchSkills,
  fetchUseCases,
} from "../lib/cms";

type SitemapUrl = {
  loc: string;
  lastmod?: string;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: string;
};

const STATIC_ROUTES: Array<{ path: string; changefreq: SitemapUrl["changefreq"]; priority: string }> = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/aixcelerator", changefreq: "weekly", priority: "0.9" },
  { path: "/aixcelerator/agents", changefreq: "daily", priority: "0.9" },
  { path: "/aixcelerator/mcp", changefreq: "daily", priority: "0.9" },
  { path: "/aixcelerator/skills", changefreq: "daily", priority: "0.9" },
  { path: "/use-cases", changefreq: "daily", priority: "0.8" },
  { path: "/industries", changefreq: "weekly", priority: "0.8" },
  { path: "/solutions", changefreq: "weekly", priority: "0.8" },
  { path: "/resources", changefreq: "daily", priority: "0.8" },
  { path: "/resources/podcasts", changefreq: "daily", priority: "0.8" },
  { path: "/resources/white-papers", changefreq: "weekly", priority: "0.7" },
  { path: "/resources/books", changefreq: "weekly", priority: "0.7" },
  { path: "/resources/case-studies", changefreq: "weekly", priority: "0.7" },
  { path: "/resources/articles", changefreq: "daily", priority: "0.8" },
  { path: "/updates", changefreq: "daily", priority: "0.8" },
  { path: "/request-demo", changefreq: "monthly", priority: "0.6" },
];

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai").replace(/\/$/, "");
  const allowPrivate = process.env.NEXT_PUBLIC_SHOW_PRIVATE === "true";
  const visibilityFilter = allowPrivate ? undefined : "public";

  const [agentsResult, mcpResult, skillsResult, useCaseResult, podcastResult, articleResult] = await Promise.allSettled([
    fetchAgents(visibilityFilter, { maxRecords: 1000 }),
    fetchMCPServers(visibilityFilter, { maxRecords: 1000 }),
    fetchSkills(visibilityFilter, { maxRecords: 1000 }),
    fetchUseCases(visibilityFilter, { maxRecords: 1000 }),
    fetchPodcastEpisodes(),
    fetchArticles({ maxRecords: 1000 }),
  ]);

  const urls: SitemapUrl[] = STATIC_ROUTES.map((route) => ({
    loc: `${siteUrl}${route.path}`,
    changefreq: route.changefreq,
    priority: route.priority,
  }));

  Object.keys(caseStudies || {}).forEach((industrySlug) => {
    urls.push({
      loc: `${siteUrl}/industries/${industrySlug}`,
      changefreq: "weekly",
      priority: "0.7",
    });
  });

  if (agentsResult.status === "fulfilled") {
    agentsResult.value.forEach((agent) => {
      if (!agent.slug) return;
      urls.push({
        loc: `${siteUrl}/aixcelerator/agents/${agent.slug}`,
        lastmod: toIsoDate(agent.lastUpdated),
        changefreq: "weekly",
        priority: "0.7",
      });
    });
  }

  if (mcpResult.status === "fulfilled") {
    mcpResult.value.forEach((server) => {
      if (!server.slug) return;
      urls.push({
        loc: `${siteUrl}/aixcelerator/mcp/${server.slug}`,
        lastmod: toIsoDate(server.lastUpdated),
        changefreq: "weekly",
        priority: "0.7",
      });
    });
  }

  if (skillsResult.status === "fulfilled") {
    skillsResult.value.forEach((skill) => {
      if (!skill.slug) return;
      urls.push({
        loc: `${siteUrl}/aixcelerator/skills/${skill.slug}`,
        lastmod: toIsoDate(skill.lastUpdated),
        changefreq: "weekly",
        priority: "0.7",
      });
    });
  }

  if (useCaseResult.status === "fulfilled") {
    useCaseResult.value.forEach((useCase) => {
      if (!useCase.slug) return;
      urls.push({
        loc: `${siteUrl}/use-cases/${useCase.slug}`,
        lastmod: toIsoDate(useCase.lastUpdated),
        changefreq: "weekly",
        priority: "0.7",
      });
    });
  }

  if (podcastResult.status === "fulfilled") {
    podcastResult.value.forEach((episode) => {
      if (!episode.slug) return;
      urls.push({
        loc: `${siteUrl}/resources/podcasts/${episode.slug}`,
        lastmod: toIsoDate(episode.publishedDate),
        changefreq: "monthly",
        priority: "0.6",
      });
    });
  }

  if (articleResult.status === "fulfilled") {
    articleResult.value.forEach((article) => {
      if (!article.slug) return;
      urls.push({
        loc: `${siteUrl}/resources/articles/${article.slug}`,
        lastmod: toIsoDate(article.updatedAt || article.publishedAt),
        changefreq: "weekly",
        priority: "0.7",
      });
    });
  }

  const uniqueUrls = dedupeUrls(urls);
  const xml = buildSitemapXml(uniqueUrls);

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.write(xml);
  res.end();

  return { props: {} };
};

export default function SitemapXml() {
  return null;
}

function toIsoDate(value?: string | null) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function dedupeUrls(items: SitemapUrl[]) {
  const byLoc = new Map<string, SitemapUrl>();
  items.forEach((item) => {
    const previous = byLoc.get(item.loc);
    if (!previous) {
      byLoc.set(item.loc, item);
      return;
    }
    if (!previous.lastmod && item.lastmod) {
      byLoc.set(item.loc, item);
    }
  });
  return Array.from(byLoc.values());
}

function buildSitemapXml(items: SitemapUrl[]) {
  const entries = items
    .map((item) => {
      const parts = [
        `<loc>${escapeXml(item.loc)}</loc>`,
        item.lastmod ? `<lastmod>${escapeXml(item.lastmod)}</lastmod>` : "",
        item.changefreq ? `<changefreq>${item.changefreq}</changefreq>` : "",
        item.priority ? `<priority>${item.priority}</priority>` : "",
      ]
        .filter(Boolean)
        .join("");
      return `<url>${parts}</url>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    entries +
    `</urlset>`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
