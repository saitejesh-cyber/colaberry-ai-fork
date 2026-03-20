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
    itemSlugs: [],
    difficulty: "intermediate",
    keywordTags: ["github", "vscode", "git", "ci/cd", "debugging"],
    linkCount: 0,
    generated: false,
    contentType: "tool",
  },
  {
    slug: "data-stack",
    name: "Data Stack",
    description: "Modern data infrastructure — databases, warehouses, analytics, and visualization tools.",
    category: "database",
    itemSlugs: [],
    difficulty: "intermediate",
    keywordTags: ["database", "warehouse", "analytics", "visualization", "etl"],
    linkCount: 0,
    generated: false,
    contentType: "tool",
  },
  {
    slug: "ai-ml-toolkit",
    name: "AI/ML Toolkit",
    description: "AI-first tools — model providers, embedding services, vector databases, and inference engines.",
    category: "ai-ml",
    itemSlugs: [],
    difficulty: "advanced",
    keywordTags: ["openai", "claude", "embedding", "vector", "inference"],
    linkCount: 0,
    generated: false,
    contentType: "tool",
  },
  {
    slug: "collaboration-suite",
    name: "Collaboration Suite",
    description: "Team productivity tools — messaging, project management, document collaboration, and scheduling.",
    category: "productivity",
    itemSlugs: [],
    difficulty: "beginner",
    keywordTags: ["slack", "notion", "asana", "calendar", "docs"],
    linkCount: 0,
    generated: false,
    contentType: "tool",
  },
  {
    slug: "cloud-platform",
    name: "Cloud Platform",
    description: "Cloud-native tools — hosting, containers, serverless, CDN, and infrastructure management.",
    category: "cloud",
    itemSlugs: [],
    difficulty: "advanced",
    keywordTags: ["aws", "vercel", "docker", "kubernetes", "cdn"],
    linkCount: 0,
    generated: false,
    contentType: "tool",
  },
];
