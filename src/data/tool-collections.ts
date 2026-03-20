/**
 * Curated tool collections — bundles of tools that work together.
 * Part of the Colaberry AI Content Knowledge Graph Platform.
 */

import type { ContentCollection } from "../lib/ontologyTypes";

export const TOOL_COLLECTIONS: ContentCollection[] = [
  {
    slug: "developer-toolkit",
    name: "Developer Toolkit",
    description: "Essential developer tools — source control, CI/CD, code editors, and debugging utilities.",
    category: "developer",
    itemSlugs: ["github", "vscode", "docker", "postman", "terminal", "git"],
    difficulty: "intermediate",
    keywordTags: ["github", "vscode", "git", "ci/cd", "debugging"],
    linkCount: 5,
    generated: false,
    contentType: "tool",
  },
  {
    slug: "data-stack",
    name: "Data Stack",
    description: "Modern data infrastructure — databases, warehouses, analytics, and visualization tools.",
    category: "database",
    itemSlugs: ["postgres", "redis", "snowflake", "dbt", "metabase", "airflow"],
    difficulty: "intermediate",
    keywordTags: ["database", "warehouse", "analytics", "visualization", "etl"],
    linkCount: 5,
    generated: false,
    contentType: "tool",
  },
  {
    slug: "ai-ml-toolkit",
    name: "AI/ML Toolkit",
    description: "AI-first tools — model providers, embedding services, vector databases, and inference engines.",
    category: "ai-ml",
    itemSlugs: ["openai", "claude", "pinecone", "langchain", "huggingface", "jupyter"],
    difficulty: "advanced",
    keywordTags: ["openai", "claude", "embedding", "vector", "inference"],
    linkCount: 5,
    generated: false,
    contentType: "tool",
  },
  {
    slug: "collaboration-suite",
    name: "Collaboration Suite",
    description: "Team productivity tools — messaging, project management, document collaboration, and scheduling.",
    category: "productivity",
    itemSlugs: ["slack", "notion", "asana", "google-workspace", "figma", "miro"],
    difficulty: "beginner",
    keywordTags: ["slack", "notion", "asana", "calendar", "docs"],
    linkCount: 5,
    generated: false,
    contentType: "tool",
  },
  {
    slug: "cloud-platform",
    name: "Cloud Platform",
    description: "Cloud-native tools — hosting, containers, serverless, CDN, and infrastructure management.",
    category: "cloud",
    itemSlugs: ["aws", "vercel", "docker", "kubernetes", "cloudflare", "terraform"],
    difficulty: "advanced",
    keywordTags: ["aws", "vercel", "docker", "kubernetes", "cdn"],
    linkCount: 5,
    generated: false,
    contentType: "tool",
  },
];
