import type { GetServerSideProps } from "next";
import {
  fetchAgents,
  fetchMCPServers,
  fetchSkills,
  fetchUseCases,
  fetchPodcastEpisodes,
  fetchArticles,
  fetchBooks,
  fetchCaseStudies,
} from "../lib/cms";

type CmsItem = { name?: string | null; title?: string | null; slug?: string | null; description?: string | null; summary?: string | null };

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://colaberry.ai";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1200");

  const [agentsR, mcpR, skillsR, useCasesR, podcastsR, articlesR, booksR, caseStudiesR] =
    await Promise.allSettled([
      fetchAgents("public"),
      fetchMCPServers("public"),
      fetchSkills("public"),
      fetchUseCases("public"),
      fetchPodcastEpisodes(),
      fetchArticles(),
      fetchBooks(),
      fetchCaseStudies(),
    ]);

  const agents = agentsR.status === "fulfilled" ? agentsR.value : [];
  const mcpServers = mcpR.status === "fulfilled" ? mcpR.value : [];
  const skills = skillsR.status === "fulfilled" ? skillsR.value : [];
  const useCases = useCasesR.status === "fulfilled" ? useCasesR.value : [];
  const podcasts = podcastsR.status === "fulfilled" ? podcastsR.value : [];
  const articles = articlesR.status === "fulfilled" ? articlesR.value : [];
  const books = booksR.status === "fulfilled" ? booksR.value : [];
  const caseStudies = caseStudiesR.status === "fulfilled" ? caseStudiesR.value : [];

  const lines: string[] = [
    "# Colaberry AI — Full Content Index",
    `# Generated: ${new Date().toISOString()}`,
    `# Site: ${SITE}`,
    "",
    `## Agents (${agents.length})`,
    "",
  ];

  for (const a of agents as CmsItem[]) {
    const name = a.name || a.title || "Untitled";
    const slug = a.slug || "";
    const desc = (a.description || a.summary || "").replace(/\n/g, " ").slice(0, 200);
    lines.push(`- ${name} | ${SITE}/aixcelerator/agents/${slug} | ${desc}`);
  }

  lines.push("", `## MCP Servers (${mcpServers.length})`, "");
  for (const m of mcpServers as CmsItem[]) {
    const name = m.name || m.title || "Untitled";
    const slug = m.slug || "";
    const desc = (m.description || m.summary || "").replace(/\n/g, " ").slice(0, 200);
    lines.push(`- ${name} | ${SITE}/aixcelerator/mcp/${slug} | ${desc}`);
  }

  lines.push("", `## Skills (${skills.length})`, "");
  for (const s of skills as CmsItem[]) {
    const name = s.name || s.title || "Untitled";
    const slug = s.slug || "";
    const desc = (s.description || s.summary || "").replace(/\n/g, " ").slice(0, 200);
    lines.push(`- ${name} | ${SITE}/aixcelerator/skills/${slug} | ${desc}`);
  }

  lines.push("", `## Use Cases (${useCases.length})`, "");
  for (const u of useCases as CmsItem[]) {
    const name = u.name || u.title || "Untitled";
    const slug = u.slug || "";
    const desc = (u.description || u.summary || "").replace(/\n/g, " ").slice(0, 200);
    lines.push(`- ${name} | ${SITE}/use-cases/${slug} | ${desc}`);
  }

  lines.push("", `## Podcast Episodes (${podcasts.length})`, "");
  for (const p of podcasts as CmsItem[]) {
    const title = p.title || "Untitled";
    const slug = p.slug || "";
    const desc = (p.description || p.summary || "").replace(/\n/g, " ").slice(0, 200);
    lines.push(`- ${title} | ${SITE}/resources/podcasts/${slug} | ${desc}`);
  }

  lines.push("", `## Articles (${articles.length})`, "");
  for (const a of articles as CmsItem[]) {
    const title = a.title || "Untitled";
    const slug = a.slug || "";
    const desc = (a.description || a.summary || "").replace(/\n/g, " ").slice(0, 200);
    lines.push(`- ${title} | ${SITE}/resources/articles/${slug} | ${desc}`);
  }

  lines.push("", `## Books (${books.length})`, "");
  for (const b of books as CmsItem[]) {
    const title = b.title || "Untitled";
    const desc = (b.description || b.summary || "").replace(/\n/g, " ").slice(0, 200);
    lines.push(`- ${title} | ${SITE}/resources/books | ${desc}`);
  }

  lines.push("", `## Case Studies (${caseStudies.length})`, "");
  for (const c of caseStudies as CmsItem[]) {
    const title = c.title || "Untitled";
    const desc = (c.description || c.summary || "").replace(/\n/g, " ").slice(0, 200);
    lines.push(`- ${title} | ${SITE}/resources/case-studies | ${desc}`);
  }

  lines.push("", "---", `# End of index. Total items: ${agents.length + mcpServers.length + skills.length + useCases.length + podcasts.length + articles.length + books.length + caseStudies.length}`);

  res.write(lines.join("\n"));
  res.end();

  return { props: {} };
};

export default function LlmsFullTxt() {
  return null;
}
