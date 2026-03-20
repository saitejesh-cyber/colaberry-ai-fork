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
    items: [
      { type: "agent", slug: "support-bot", name: "Support Bot" },
      { type: "agent", slug: "ticket-triager", name: "Ticket Triager" },
      { type: "skill", slug: "text-generation", name: "Text Generation" },
      { type: "skill", slug: "summarization", name: "Summarization" },
      { type: "mcp", slug: "slack-mcp", name: "Slack MCP" },
      { type: "mcp", slug: "gmail-mcp", name: "Gmail MCP" },
      { type: "tool", slug: "slack", name: "Slack" },
    ],
    keywordTags: ["chatbot", "support", "nlp", "slack", "zendesk", "ticketing"],
  },
  {
    slug: "data-pipeline-suite",
    name: "Data Pipeline Suite",
    description: "Modern data engineering — ETL skills, database and warehouse MCP servers, analytics agents, and visualization tools.",
    category: "data-analytics",
    items: [
      { type: "agent", slug: "data-analyst", name: "Data Analyst" },
      { type: "agent", slug: "etl-orchestrator", name: "ETL Orchestrator" },
      { type: "skill", slug: "data-extraction", name: "Data Extraction" },
      { type: "skill", slug: "data-transformation", name: "Data Transformation" },
      { type: "skill", slug: "data-visualization", name: "Data Visualization" },
      { type: "mcp", slug: "postgres-mcp", name: "Postgres MCP" },
      { type: "mcp", slug: "redis-mcp", name: "Redis MCP" },
      { type: "tool", slug: "metabase", name: "Metabase" },
      { type: "tool", slug: "airflow", name: "Airflow" },
    ],
    keywordTags: ["etl", "database", "warehouse", "analytics", "visualization", "pipeline"],
  },
  {
    slug: "content-automation-platform",
    name: "Content Automation Platform",
    description: "AI-powered content factory — writing agents, SEO skills, CMS MCP servers, and publishing tools.",
    category: "content-writing",
    items: [
      { type: "agent", slug: "content-writer", name: "Content Writer" },
      { type: "agent", slug: "seo-optimizer", name: "SEO Optimizer" },
      { type: "skill", slug: "text-generation", name: "Text Generation" },
      { type: "skill", slug: "content-editing", name: "Content Editing" },
      { type: "skill", slug: "prompt-engineering", name: "Prompt Engineering" },
      { type: "mcp", slug: "notion-mcp", name: "Notion MCP" },
      { type: "tool", slug: "notion", name: "Notion" },
    ],
    keywordTags: ["content", "writing", "seo", "cms", "publishing", "automation"],
  },
  {
    slug: "security-audit-toolkit",
    name: "Security Audit Toolkit",
    description: "Comprehensive security auditing — vulnerability scanning agents, security skills, SIEM MCP servers, and compliance tools.",
    category: "security",
    items: [
      { type: "agent", slug: "incident-responder", name: "Incident Responder" },
      { type: "skill", slug: "vulnerability-scanning", name: "Vulnerability Scanning" },
      { type: "skill", slug: "code-review", name: "Code Review" },
      { type: "skill", slug: "dependency-audit", name: "Dependency Audit" },
      { type: "skill", slug: "secrets-detection", name: "Secrets Detection" },
      { type: "mcp", slug: "github-mcp", name: "GitHub MCP" },
      { type: "tool", slug: "github", name: "GitHub" },
    ],
    keywordTags: ["security", "audit", "vulnerability", "compliance", "siem", "scanning"],
  },
  {
    slug: "developer-productivity-pack",
    name: "Developer Productivity Pack",
    description: "Full developer workflow — code review agents, development skills, GitHub MCP servers, and CI/CD tools.",
    category: "developer",
    items: [
      { type: "agent", slug: "ci-cd-runner", name: "CI/CD Runner" },
      { type: "agent", slug: "deploy-bot", name: "Deploy Bot" },
      { type: "skill", slug: "ci-cd-pipeline", name: "CI/CD Pipeline" },
      { type: "skill", slug: "container-management", name: "Container Management" },
      { type: "mcp", slug: "github-mcp", name: "GitHub MCP" },
      { type: "mcp", slug: "gitlab-mcp", name: "GitLab MCP" },
      { type: "tool", slug: "vscode", name: "VS Code" },
      { type: "tool", slug: "docker", name: "Docker" },
      { type: "tool", slug: "github", name: "GitHub" },
    ],
    keywordTags: ["developer", "code review", "github", "ci/cd", "productivity", "devops"],
  },
];
