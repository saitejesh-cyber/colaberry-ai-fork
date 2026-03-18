/**
 * Curated skill collections — bundles of skills that work together.
 * Inspired by SkillNet's Skill Package Library concept.
 *
 * Collections come from two sources:
 * 1. Hand-curated overrides (below) — always take priority
 * 2. Auto-generated from CMS data (generated-collections.json) — created by scripts/generate-collections.mjs
 */

/* ── Types ────────────────────────────────────────────────────────────── */

export type SkillCollection = {
  slug: string;
  name: string;
  description: string;
  category: string;
  skillSlugs: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  /** Top keyword tags for this collection (displayed as pills on cards) */
  keywordTags: string[];
  /** Number of inter-skill relationship links within the collection */
  linkCount: number;
  /** Whether this collection was auto-generated from CMS data */
  generated: boolean;
};

/* ── Hand-Curated Collections (override auto-generated if same slug) ── */

export const CURATED_COLLECTIONS: SkillCollection[] = [
  {
    slug: "data-pipeline",
    name: "Data Pipeline Skills",
    description: "End-to-end data processing: extraction, transformation, loading, and analysis.",
    category: "data-science",
    skillSlugs: [
      "data-extraction",
      "data-transformation",
      "data-validation",
      "data-visualization",
      "csv-processing",
      "json-processing",
    ],
    difficulty: "intermediate",
    keywordTags: ["data", "etl", "csv", "json", "analytics"],
    linkCount: 5,
    generated: false,
  },
  {
    slug: "web-automation",
    name: "Web Automation Skills",
    description: "Automate web tasks: scraping, form filling, browser control, and API integration.",
    category: "development",
    skillSlugs: [
      "web-scraping",
      "browser-automation",
      "api-integration",
      "form-automation",
      "http-requests",
    ],
    difficulty: "intermediate",
    keywordTags: ["web", "scraping", "browser", "api", "automation"],
    linkCount: 4,
    generated: false,
  },
  {
    slug: "content-generation",
    name: "Content Generation Skills",
    description: "AI-powered content creation: writing, summarization, translation, and editing.",
    category: "ai-generation",
    skillSlugs: [
      "text-generation",
      "summarization",
      "translation",
      "content-editing",
      "prompt-engineering",
    ],
    difficulty: "beginner",
    keywordTags: ["ai", "writing", "llm", "summarization", "content"],
    linkCount: 4,
    generated: false,
  },
  {
    slug: "security-audit",
    name: "Security Audit Skills",
    description: "Security scanning, vulnerability assessment, compliance checking, and threat analysis.",
    category: "security",
    skillSlugs: [
      "vulnerability-scanning",
      "code-review",
      "dependency-audit",
      "secrets-detection",
      "compliance-check",
    ],
    difficulty: "advanced",
    keywordTags: ["security", "vulnerability", "compliance", "audit", "secrets"],
    linkCount: 4,
    generated: false,
  },
  {
    slug: "devops-automation",
    name: "DevOps Automation Skills",
    description: "CI/CD pipelines, infrastructure provisioning, monitoring, and deployment automation.",
    category: "infrastructure",
    skillSlugs: [
      "ci-cd-pipeline",
      "container-management",
      "infrastructure-provisioning",
      "monitoring-alerting",
      "deployment-automation",
    ],
    difficulty: "advanced",
    keywordTags: ["devops", "ci/cd", "docker", "kubernetes", "deploy"],
    linkCount: 4,
    generated: false,
  },
  {
    slug: "research-assistant",
    name: "Research Assistant Skills",
    description: "Literature search, paper analysis, citation management, and hypothesis generation.",
    category: "research",
    skillSlugs: [
      "literature-search",
      "paper-analysis",
      "citation-management",
      "hypothesis-generation",
      "experiment-design",
    ],
    difficulty: "intermediate",
    keywordTags: ["research", "literature", "citation", "academic", "hypothesis"],
    linkCount: 4,
    generated: false,
  },
];

/* ── Auto-Generated Collections Import ───────────────────────────────── */

let generatedCollections: SkillCollection[] = [];
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const data = require("./generated-collections.json") as SkillCollection[];
  generatedCollections = data;
} catch {
  // File doesn't exist yet — that's fine, use curated only
}

/* ── Merge: curated overrides take priority ──────────────────────────── */

const curatedSlugs = new Set(CURATED_COLLECTIONS.map((c) => c.slug));
const merged = [
  ...CURATED_COLLECTIONS,
  ...generatedCollections.filter((c) => !curatedSlugs.has(c.slug)),
];

/** All skill collections — curated + auto-generated, deduplicated by slug */
export const SKILL_COLLECTIONS: SkillCollection[] = merged;
