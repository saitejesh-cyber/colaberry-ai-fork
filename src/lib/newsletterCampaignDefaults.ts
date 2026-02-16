import { NewsletterTemplateItem } from "./newsletterTemplate";

function normalizedBaseUrl(siteUrl: string) {
  return siteUrl.replace(/\/$/, "");
}

export function defaultNewsletterItems(siteUrl: string): NewsletterTemplateItem[] {
  const base = normalizedBaseUrl(siteUrl);
  return [
    {
      title: "Top-Rated AI News feed now integrated",
      description: "Curated ratings and rationale from GAI Insights are live in News & Updates.",
      href: `${base}/updates`,
      label: "Open updates",
    },
    {
      title: "Discovery assistant entry points",
      description: "Prompt-driven navigation to agents, MCP servers, use cases, and resources.",
      href: `${base}/assistant`,
      label: "Open assistant",
    },
    {
      title: "Enterprise-ready agent and MCP detail pages",
      description: "Expanded metadata and structured context for evaluation and deployment fit.",
      href: `${base}/aixcelerator`,
      label: "View platform",
    },
  ];
}
