/**
 * SkillNet-inspired 10-category taxonomy for AI skills.
 * Maps existing CMS category/skillType values to standardized categories.
 * Based on: https://skillnet.openkg.cn/ ontology structure.
 */

export type SkillCategory = {
  slug: string;
  label: string;
  description: string;
  /** Keywords used to auto-classify skills from raw category/skillType text */
  keywords: string[];
  /** Color for category pills — zinc scale only (coral reserved for CTAs) */
  tone: string;
};

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    slug: "development",
    label: "Development",
    description: "Frontend, backend, APIs, code generation, and software engineering skills.",
    keywords: ["development", "developer", "workflow", "coding", "code", "frontend", "backend", "api", "sdk", "cli", "devtools", "git", "debug"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "ai-generation",
    label: "AI & Generation",
    description: "LLM prompting, content generation, image synthesis, and AIGC skills.",
    keywords: ["ai", "aigc", "generation", "llm", "prompt", "gpt", "claude", "model", "inference", "embedding", "chat", "pre-built", "prebuilt", "official"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "research",
    label: "Research",
    description: "Literature retrieval, hypothesis generation, and academic research skills.",
    keywords: ["research", "literature", "academic", "paper", "citation", "hypothesis", "analysis", "study"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "data-science",
    label: "Data & Science",
    description: "Data pipelines, analytics, visualization, bioinformatics, and scientific computing.",
    keywords: ["data", "science", "analytics", "pipeline", "visualization", "bioinformatics", "statistics", "ml", "machine learning", "dataset"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "business",
    label: "Business",
    description: "Enterprise operations, CRM, finance, sales, and business process skills.",
    keywords: ["business", "enterprise", "crm", "finance", "sales", "marketing", "operations", "management", "domain", "cloud"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "testing",
    label: "Testing & QA",
    description: "Test automation, quality assurance, CI/CD validation, and testing frameworks.",
    keywords: ["testing", "test", "qa", "quality", "ci", "cd", "automation", "validation", "unit", "integration", "e2e"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "productivity",
    label: "Productivity",
    description: "Workflow automation, document processing, email, scheduling, and productivity tools.",
    keywords: ["productivity", "automation", "workflow", "document", "email", "calendar", "scheduling", "notification", "task"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "security",
    label: "Security",
    description: "Security auditing, compliance, vulnerability scanning, and access control skills.",
    keywords: ["security", "compliance", "vulnerability", "audit", "auth", "access", "encryption", "firewall", "threat"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "infrastructure",
    label: "Infrastructure",
    description: "DevOps, cloud provisioning, container orchestration, and infrastructure-as-code.",
    keywords: ["infrastructure", "devops", "cloud", "docker", "kubernetes", "aws", "azure", "gcp", "terraform", "deploy", "orchestration", "dispatch", "meta"],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
  {
    slug: "other",
    label: "Other",
    description: "Skills that don't fit neatly into the primary categories.",
    keywords: [],
    tone: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
  },
];

/**
 * Classify a skill into a taxonomy category based on its category + skillType fields.
 * Returns the best-matching category label, or "Other" as fallback.
 */
export function classifySkill(skill: {
  category?: string | null;
  skillType?: string | null;
}): SkillCategory {
  const value = `${skill.category || ""} ${skill.skillType || ""}`.toLowerCase();
  if (!value.trim()) return SKILL_CATEGORIES[SKILL_CATEGORIES.length - 1];

  let bestMatch: SkillCategory | null = null;
  let bestScore = 0;

  for (const cat of SKILL_CATEGORIES) {
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

  return bestMatch || SKILL_CATEGORIES[SKILL_CATEGORIES.length - 1];
}

/** Relationship types between skills (SkillNet ontology) */
export type SkillRelationType = "similar_to" | "depend_on" | "compose_with" | "belong_to";
