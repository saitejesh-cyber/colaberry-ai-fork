/**
 * Agent taxonomy — 8 categories for classifying AI agents.
 * Part of the Colaberry AI Content Knowledge Graph Platform.
 */

import type { ContentOntologyConfig, TaxonomyCategory, OntologyItem } from "../lib/ontologyTypes";

export const AGENT_CATEGORIES: TaxonomyCategory[] = [
  {
    slug: "code-development",
    label: "Code & Development",
    description: "Agents for code generation, debugging, CI/CD, and software engineering.",
    keywords: ["code", "development", "developer", "github", "git", "debugging", "ci", "cd", "build", "deploy", "software", "programming", "coding", "devtools"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "content-writing",
    label: "Content & Writing",
    description: "Agents for content creation, copywriting, editing, and social media.",
    keywords: ["content", "writing", "copywriting", "blog", "social media", "seo", "article", "editorial", "creative", "marketing content", "copy"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "data-analytics",
    label: "Data & Analytics",
    description: "Agents for data analysis, reporting, dashboards, and visualization.",
    keywords: ["data", "analytics", "reporting", "dashboard", "visualization", "bi", "insight", "metrics", "kpi", "statistics", "sql"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "research-analysis",
    label: "Research & Analysis",
    description: "Agents for research, investigation, competitive analysis, and auditing.",
    keywords: ["research", "analysis", "investigation", "audit", "review", "competitive", "intelligence", "due diligence", "benchmark", "report"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "sales-marketing",
    label: "Sales & Marketing",
    description: "Agents for sales outreach, lead generation, CRM, and marketing campaigns.",
    keywords: ["sales", "marketing", "lead", "crm", "outreach", "campaign", "funnel", "prospect", "conversion", "pipeline", "email marketing"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "operations-workflow",
    label: "Operations & Workflow",
    description: "Agents for workflow automation, scheduling, operations, and process management.",
    keywords: ["operations", "workflow", "automation", "scheduling", "process", "orchestration", "task", "project management", "planning", "coordination"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "customer-support",
    label: "Customer & Support",
    description: "Agents for customer service, helpdesk, chatbots, and ticket management.",
    keywords: ["customer", "support", "helpdesk", "chat", "ticket", "service", "chatbot", "conversational", "faq", "onboarding", "user support"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "other",
    label: "Other",
    description: "Agents that don't fit neatly into the primary categories.",
    keywords: [],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
];

/**
 * Classify an agent into a taxonomy category.
 * Uses industry, executionModes, tools, and tags.
 */
export function classifyAgent(agent: {
  industry?: string | null;
  executionModes?: string | string[] | null;
  tools?: string | string[] | null;
  category?: string | null;
  tags?: { slug?: string; name?: string }[] | null;
}): TaxonomyCategory {
  const parts = [
    agent.industry || "",
    agent.category || "",
    Array.isArray(agent.executionModes) ? agent.executionModes.join(" ") : (agent.executionModes || ""),
    Array.isArray(agent.tools) ? agent.tools.join(" ") : (agent.tools || ""),
    (agent.tags || []).map((t) => t.slug || t.name || "").join(" "),
  ];
  const value = parts.join(" ").toLowerCase();
  if (!value.trim()) return AGENT_CATEGORIES[AGENT_CATEGORIES.length - 1];

  let bestMatch: TaxonomyCategory | null = null;
  let bestScore = 0;

  for (const cat of AGENT_CATEGORIES) {
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

  return bestMatch || AGENT_CATEGORIES[AGENT_CATEGORIES.length - 1];
}

/** Agent relationship types */
export type AgentRelationType = "similar_to" | "chains_with" | "integrates_with" | "belong_to";

/** Agent ontology config for the content knowledge graph platform */
export const AGENT_ONTOLOGY_CONFIG: ContentOntologyConfig = {
  contentType: "agent",
  label: "Agents",
  labelSingular: "Agent",
  icon: "🤖",
  basePath: "/aixcelerator/agents",
  catalogPath: "/aixcelerator/agents",
  nodeShape: "diamond",
  categories: AGENT_CATEGORIES,
  relationTypes: [
    { type: "similar_to", label: "Similar To", description: "Agents that share common tags or industry focus.", color: "#34d399", directional: false },
    { type: "chains_with", label: "Chains With", description: "Agents whose outputs feed into another agent's inputs.", color: "#60a5fa", directional: true },
    { type: "integrates_with", label: "Integrates With", description: "Agents that reference the same tools or services.", color: "#fbbf24", directional: false },
    { type: "belong_to", label: "Belongs To", description: "Agents in the same taxonomy category.", color: "#94a3b8", directional: false },
  ],
  categoryColors: {
    "code-development": "#60a5fa",
    "content-writing": "#a78bfa",
    "data-analytics": "#34d399",
    "research-analysis": "#fbbf24",
    "sales-marketing": "#f87171",
    "operations-workflow": "#38bdf8",
    "customer-support": "#fb923c",
    other: "#94a3b8",
  },
  classifyItem: (item: OntologyItem) => classifyAgent(item as Parameters<typeof classifyAgent>[0]),
};
