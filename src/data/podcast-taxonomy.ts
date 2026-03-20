/**
 * Podcast taxonomy — 8 categories for classifying podcast episodes.
 * Part of the Colaberry AI Content Knowledge Graph Platform.
 */

import type { ContentOntologyConfig, TaxonomyCategory, OntologyItem } from "../lib/ontologyTypes";

export const PODCAST_CATEGORIES: TaxonomyCategory[] = [
  {
    slug: "ai-ml",
    label: "AI & Machine Learning",
    description: "Episodes covering AI models, machine learning, LLMs, and neural networks.",
    keywords: ["ai", "machine learning", "llm", "gpt", "neural", "deep learning", "artificial intelligence", "model", "claude", "openai", "transformer"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "business-strategy",
    label: "Business & Strategy",
    description: "Episodes on business strategy, leadership, entrepreneurship, and enterprise adoption.",
    keywords: ["business", "strategy", "startup", "leadership", "venture", "enterprise", "ceo", "founder", "growth", "revenue", "management"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "tech-engineering",
    label: "Technology & Engineering",
    description: "Episodes on software engineering, cloud, DevOps, and system architecture.",
    keywords: ["engineering", "software", "cloud", "devops", "architecture", "infrastructure", "platform", "system", "backend", "frontend", "microservices"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "data-analytics",
    label: "Data & Analytics",
    description: "Episodes on data science, analytics, big data, and visualization.",
    keywords: ["data", "analytics", "big data", "visualization", "statistics", "pipeline", "warehouse", "etl", "dashboard", "insight"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "education-career",
    label: "Education & Career",
    description: "Episodes on learning, career development, upskilling, and certifications.",
    keywords: ["education", "career", "learning", "skills", "certification", "training", "upskill", "bootcamp", "course", "mentorship"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "industry",
    label: "Industry Deep Dives",
    description: "Episodes exploring AI adoption in specific industries.",
    keywords: ["healthcare", "finance", "retail", "manufacturing", "legal", "automotive", "energy", "pharma", "government", "banking", "insurance"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "product-design",
    label: "Product & Design",
    description: "Episodes on product management, UX design, and user experience.",
    keywords: ["product", "design", "ux", "user experience", "ui", "research", "prototype", "usability", "accessibility", "figma"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "other",
    label: "Other",
    description: "Episodes that don't fit neatly into the primary categories.",
    keywords: [],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
];

/**
 * Classify a podcast episode into a taxonomy category.
 * Uses tags, description, and title.
 */
export function classifyPodcast(podcast: {
  tags?: { slug?: string; name?: string }[] | null;
  description?: string | null;
  title?: string | null;
  category?: string | null;
}): TaxonomyCategory {
  const parts = [
    podcast.category || "",
    podcast.title || "",
    podcast.description || "",
    (podcast.tags || []).map((t) => t.slug || t.name || "").join(" "),
  ];
  const value = parts.join(" ").toLowerCase();
  if (!value.trim()) return PODCAST_CATEGORIES[PODCAST_CATEGORIES.length - 1];

  let bestMatch: TaxonomyCategory | null = null;
  let bestScore = 0;

  for (const cat of PODCAST_CATEGORIES) {
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

  return bestMatch || PODCAST_CATEGORIES[PODCAST_CATEGORIES.length - 1];
}

/** Podcast relationship types */
export type PodcastRelationType = "similar_to" | "sequel_to" | "references" | "belong_to";

/** Podcast ontology config for the content knowledge graph platform */
export const PODCAST_ONTOLOGY_CONFIG: ContentOntologyConfig = {
  contentType: "podcast",
  label: "Podcasts",
  labelSingular: "Podcast",
  icon: "🎙️",
  basePath: "/resources/podcasts",
  catalogPath: "/resources/podcasts",
  nodeShape: "hexagon",
  categories: PODCAST_CATEGORIES,
  relationTypes: [
    { type: "similar_to", label: "Similar To", description: "Episodes that share common tags or topics.", color: "#34d399", directional: false },
    { type: "sequel_to", label: "Sequel To", description: "Sequential episodes on the same topic.", color: "#60a5fa", directional: true },
    { type: "references", label: "References", description: "Episodes mentioning the same guests or companies.", color: "#fbbf24", directional: false },
    { type: "belong_to", label: "Belongs To", description: "Episodes in the same taxonomy category.", color: "#94a3b8", directional: false },
  ],
  categoryColors: {
    "ai-ml": "#60a5fa",
    "business-strategy": "#a78bfa",
    "tech-engineering": "#34d399",
    "data-analytics": "#fbbf24",
    "education-career": "#38bdf8",
    industry: "#f87171",
    "product-design": "#f472b6",
    other: "#94a3b8",
  },
  classifyItem: (item: OntologyItem) => classifyPodcast(item as Parameters<typeof classifyPodcast>[0]),
};
