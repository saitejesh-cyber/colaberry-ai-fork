/**
 * MCP Server taxonomy — 9 categories for classifying MCP servers.
 * Part of the Colaberry AI Content Knowledge Graph Platform.
 */

import type { ContentOntologyConfig, TaxonomyCategory, OntologyItem } from "../lib/ontologyTypes";

export const MCP_CATEGORIES: TaxonomyCategory[] = [
  {
    slug: "database-storage",
    label: "Database & Storage",
    description: "Database connectors, object storage, and data persistence MCP servers.",
    keywords: ["database", "sql", "postgres", "postgresql", "mongo", "mongodb", "redis", "sqlite", "mysql", "s3", "storage", "dynamo", "supabase", "firebase", "prisma"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "communication",
    label: "Communication",
    description: "Messaging, email, and team collaboration MCP servers.",
    keywords: ["slack", "email", "discord", "teams", "messaging", "chat", "notification", "sms", "telegram", "whatsapp", "communication"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "developer-tools",
    label: "Developer Tools",
    description: "Source control, CI/CD, code review, and development workflow MCP servers.",
    keywords: ["github", "git", "gitlab", "bitbucket", "code", "ci", "cd", "build", "debug", "lint", "ide", "vscode", "developer", "jira", "linear"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "ai-ml",
    label: "AI & ML",
    description: "LLM providers, embedding services, model serving, and AI pipeline MCP servers.",
    keywords: ["ai", "llm", "embedding", "model", "inference", "openai", "claude", "anthropic", "vector", "rag", "huggingface", "ml", "machine learning"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "cloud-infra",
    label: "Cloud & Infrastructure",
    description: "Cloud providers, container orchestration, and infrastructure-as-code MCP servers.",
    keywords: ["aws", "azure", "gcp", "cloud", "docker", "kubernetes", "terraform", "serverless", "lambda", "cloudflare", "vercel", "infrastructure"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "search-knowledge",
    label: "Search & Knowledge",
    description: "Web search, knowledge bases, wiki, and retrieval MCP servers.",
    keywords: ["search", "knowledge", "wiki", "rag", "retrieval", "index", "brave", "google", "bing", "wikipedia", "crawl", "scrape", "web"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "file-document",
    label: "File & Document",
    description: "File management, document processing, and cloud drive MCP servers.",
    keywords: ["file", "document", "pdf", "drive", "dropbox", "markdown", "notion", "confluence", "gdrive", "sharepoint", "filesystem"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "monitoring-analytics",
    label: "Monitoring & Analytics",
    description: "Observability, logging, metrics, and analytics MCP servers.",
    keywords: ["monitoring", "logging", "analytics", "metrics", "alerting", "grafana", "datadog", "sentry", "prometheus", "observability", "apm"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "other",
    label: "Other",
    description: "MCP servers that don't fit neatly into the primary categories.",
    keywords: [],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
];

/**
 * Classify an MCP server into a taxonomy category.
 * Uses serverType, primaryFunction, capabilities, and tags.
 */
export function classifyMCP(mcp: {
  serverType?: string | null;
  primaryFunction?: string | null;
  capabilities?: string | string[] | null;
  category?: string | null;
  tags?: { slug?: string; name?: string }[] | null;
}): TaxonomyCategory {
  const parts = [
    mcp.serverType || "",
    mcp.primaryFunction || "",
    mcp.category || "",
    Array.isArray(mcp.capabilities) ? mcp.capabilities.join(" ") : (mcp.capabilities || ""),
    (mcp.tags || []).map((t) => t.slug || t.name || "").join(" "),
  ];
  const value = parts.join(" ").toLowerCase();
  if (!value.trim()) return MCP_CATEGORIES[MCP_CATEGORIES.length - 1];

  let bestMatch: TaxonomyCategory | null = null;
  let bestScore = 0;

  for (const cat of MCP_CATEGORIES) {
    if (cat.slug === "other") continue;
    let score = 0;
    for (const keyword of cat.keywords) {
      if (value.includes(keyword)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = cat;
    }
  }

  return bestMatch || MCP_CATEGORIES[MCP_CATEGORIES.length - 1];
}

/** MCP relationship types */
export type MCPRelationType = "similar_to" | "interop_with" | "complement" | "belong_to";

/** MCP ontology config for the content knowledge graph platform */
export const MCP_ONTOLOGY_CONFIG: ContentOntologyConfig = {
  contentType: "mcp",
  label: "MCP Servers",
  labelSingular: "MCP Server",
  icon: "🔌",
  basePath: "/aixcelerator/mcp",
  catalogPath: "/aixcelerator/mcp",
  nodeShape: "square",
  categories: MCP_CATEGORIES,
  relationTypes: [
    { type: "similar_to", label: "Similar To", description: "MCP servers that share common tags or capabilities.", color: "#34d399", directional: false },
    { type: "interop_with", label: "Interoperates With", description: "MCP servers that share linked tools and work together.", color: "#60a5fa", directional: false },
    { type: "complement", label: "Complements", description: "MCP servers providing complementary capabilities in the same collection.", color: "#fbbf24", directional: false },
    { type: "belong_to", label: "Belongs To", description: "MCP servers in the same taxonomy category.", color: "#94a3b8", directional: false },
  ],
  categoryColors: {
    "database-storage": "#60a5fa",
    communication: "#a78bfa",
    "developer-tools": "#34d399",
    "ai-ml": "#f87171",
    "cloud-infra": "#fbbf24",
    "search-knowledge": "#38bdf8",
    "file-document": "#fb923c",
    "monitoring-analytics": "#f472b6",
    other: "#94a3b8",
  },
  classifyItem: (item: OntologyItem) => classifyMCP(item as Parameters<typeof classifyMCP>[0]),
};
