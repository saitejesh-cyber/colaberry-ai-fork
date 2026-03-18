/**
 * Curated skill collections — bundles of skills that work together.
 * Inspired by SkillNet's Skill Package Library concept.
 * These map to existing skill slugs in the CMS.
 */

export type SkillCollection = {
  slug: string;
  name: string;
  description: string;
  category: string;
  skillSlugs: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
};

export const SKILL_COLLECTIONS: SkillCollection[] = [
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
  },
];
