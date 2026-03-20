/**
 * Tool taxonomy — categories based on existing ToolCategory values from CMS.
 * Part of the Colaberry AI Content Knowledge Graph Platform.
 */

import type { ContentOntologyConfig, TaxonomyCategory, OntologyItem } from "../lib/ontologyTypes";

export const TOOL_CATEGORIES: TaxonomyCategory[] = [
  {
    slug: "communication",
    label: "Communication",
    description: "Messaging, email, and collaboration tools.",
    keywords: ["communication", "slack", "email", "discord", "teams", "messaging", "chat"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "database",
    label: "Database",
    description: "Database management and query tools.",
    keywords: ["database", "sql", "postgres", "mongo", "redis", "mysql", "sqlite"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "storage",
    label: "Storage",
    description: "File storage and cloud storage services.",
    keywords: ["storage", "s3", "blob", "drive", "dropbox", "gdrive", "file"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "developer",
    label: "Developer Tools",
    description: "Development, CI/CD, and version control tools.",
    keywords: ["developer", "github", "git", "ci", "cd", "build", "ide", "vscode", "code"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "analytics",
    label: "Analytics",
    description: "Data analytics, BI, and reporting tools.",
    keywords: ["analytics", "bi", "reporting", "dashboard", "metrics", "tracking"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "ai-ml",
    label: "AI & ML",
    description: "AI models, machine learning, and inference tools.",
    keywords: ["ai", "ml", "model", "llm", "embedding", "inference", "openai", "claude"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "crm",
    label: "CRM",
    description: "Customer relationship management tools.",
    keywords: ["crm", "salesforce", "hubspot", "customer", "lead", "pipeline"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "marketing",
    label: "Marketing",
    description: "Marketing automation and campaign tools.",
    keywords: ["marketing", "campaign", "email marketing", "seo", "social", "ads"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "productivity",
    label: "Productivity",
    description: "Project management, scheduling, and workflow tools.",
    keywords: ["productivity", "project", "task", "notion", "asana", "trello", "jira", "calendar", "scheduling"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "search",
    label: "Search",
    description: "Web search and knowledge retrieval tools.",
    keywords: ["search", "brave", "google", "bing", "web", "crawl", "index"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "cloud",
    label: "Cloud",
    description: "Cloud infrastructure and hosting tools.",
    keywords: ["cloud", "aws", "azure", "gcp", "vercel", "netlify", "docker", "kubernetes"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "other",
    label: "Other",
    description: "Tools that don't fit neatly into the primary categories.",
    keywords: [],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
];

/**
 * Classify a tool into a taxonomy category.
 * Uses toolCategory, description, and name.
 */
export function classifyTool(tool: {
  toolCategory?: string | null;
  category?: string | null;
  name?: string | null;
  description?: string | null;
  tags?: { slug?: string; name?: string }[] | null;
}): TaxonomyCategory {
  const parts = [
    tool.toolCategory || "",
    tool.category || "",
    tool.name || "",
    tool.description || "",
    (tool.tags || []).map((t) => t.slug || t.name || "").join(" "),
  ];
  const value = parts.join(" ").toLowerCase();
  if (!value.trim()) return TOOL_CATEGORIES[TOOL_CATEGORIES.length - 1];

  let bestMatch: TaxonomyCategory | null = null;
  let bestScore = 0;

  for (const cat of TOOL_CATEGORIES) {
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

  return bestMatch || TOOL_CATEGORIES[TOOL_CATEGORIES.length - 1];
}

/** Tool relationship types */
export type ToolRelationType = "similar_to" | "used_with" | "replaces" | "belong_to";

/** Tool ontology config for the content knowledge graph platform */
export const TOOL_ONTOLOGY_CONFIG: ContentOntologyConfig = {
  contentType: "tool",
  label: "Tools",
  labelSingular: "Tool",
  icon: "🔧",
  basePath: "/aixcelerator/tools",
  catalogPath: "/aixcelerator/tools",
  nodeShape: "triangle",
  categories: TOOL_CATEGORIES,
  relationTypes: [
    { type: "similar_to", label: "Similar To", description: "Tools that share common functionality.", color: "#34d399", directional: false },
    { type: "used_with", label: "Used With", description: "Tools commonly used together.", color: "#60a5fa", directional: false },
    { type: "replaces", label: "Replaces", description: "Tools that serve as alternatives to each other.", color: "#fbbf24", directional: false },
    { type: "belong_to", label: "Belongs To", description: "Tools in the same taxonomy category.", color: "#94a3b8", directional: false },
  ],
  categoryColors: {
    communication: "#a78bfa",
    database: "#60a5fa",
    storage: "#38bdf8",
    developer: "#34d399",
    analytics: "#fbbf24",
    "ai-ml": "#f87171",
    crm: "#fb923c",
    marketing: "#f472b6",
    productivity: "#a3e635",
    search: "#38bdf8",
    cloud: "#60a5fa",
    other: "#94a3b8",
  },
  classifyItem: (item: OntologyItem) => classifyTool(item as Parameters<typeof classifyTool>[0]),
};
