/**
 * Cross-type solution stacks — curated bundles spanning multiple content types.
 * Part of the Colaberry AI Content Knowledge Graph Platform.
 */

import type { SolutionStack } from "../lib/ontologyTypes";

export const SOLUTION_STACKS: SolutionStack[] = [
  {
    slug: "ai-customer-service-stack",
    name: "AI Customer Service Stack",
    description: "End-to-end AI customer support — agents for chat and ticketing, NLP skills, Slack and Zendesk MCP servers, and helpdesk tools.",
    category: "customer-support",
    items: [],
    keywordTags: ["chatbot", "support", "nlp", "slack", "zendesk", "ticketing"],
  },
  {
    slug: "data-pipeline-suite",
    name: "Data Pipeline Suite",
    description: "Modern data engineering — ETL skills, database and warehouse MCP servers, analytics agents, and visualization tools.",
    category: "data-analytics",
    items: [],
    keywordTags: ["etl", "database", "warehouse", "analytics", "visualization", "pipeline"],
  },
  {
    slug: "content-automation-platform",
    name: "Content Automation Platform",
    description: "AI-powered content factory — writing agents, SEO skills, CMS MCP servers, and publishing tools.",
    category: "content-writing",
    items: [],
    keywordTags: ["content", "writing", "seo", "cms", "publishing", "automation"],
  },
  {
    slug: "security-audit-toolkit",
    name: "Security Audit Toolkit",
    description: "Comprehensive security auditing — vulnerability scanning agents, security skills, SIEM MCP servers, and compliance tools.",
    category: "security",
    items: [],
    keywordTags: ["security", "audit", "vulnerability", "compliance", "siem", "scanning"],
  },
  {
    slug: "developer-productivity-pack",
    name: "Developer Productivity Pack",
    description: "Full developer workflow — code review agents, development skills, GitHub MCP servers, and CI/CD tools.",
    category: "developer",
    items: [],
    keywordTags: ["developer", "code review", "github", "ci/cd", "productivity", "devops"],
  },
];
