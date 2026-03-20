/**
 * Central registry for all content type ontology configurations.
 * Maps each ContentTypeName to its taxonomy, relationships, and classification logic.
 * Also defines cross-type relationships for the platform knowledge graph.
 */

import type {
  ContentTypeName,
  ContentOntologyConfig,
  CrossTypeRelation,
} from "./ontologyTypes";

/* ── Lazy-loaded configs (avoid circular imports) ──────────────────────── */

let _registry: Record<ContentTypeName, ContentOntologyConfig> | null = null;

function loadRegistry(): Record<ContentTypeName, ContentOntologyConfig> {
  if (_registry) return _registry;

  // Import each taxonomy config — lazy to avoid circular deps
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SKILL_ONTOLOGY_CONFIG } = require("../data/skill-taxonomy");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MCP_ONTOLOGY_CONFIG } = require("../data/mcp-taxonomy");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PODCAST_ONTOLOGY_CONFIG } = require("../data/podcast-taxonomy");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AGENT_ONTOLOGY_CONFIG } = require("../data/agent-taxonomy");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TOOL_ONTOLOGY_CONFIG } = require("../data/tool-taxonomy");

  _registry = {
    skill: SKILL_ONTOLOGY_CONFIG,
    mcp: MCP_ONTOLOGY_CONFIG,
    podcast: PODCAST_ONTOLOGY_CONFIG,
    agent: AGENT_ONTOLOGY_CONFIG,
    tool: TOOL_ONTOLOGY_CONFIG,
  };

  return _registry;
}

/* ── Public API ────────────────────────────────────────────────────────── */

/** Get ontology config for a specific content type */
export function getOntologyConfig(type: ContentTypeName): ContentOntologyConfig {
  return loadRegistry()[type];
}

/** Get all registered content type names */
export function getAllContentTypes(): ContentTypeName[] {
  return ["skill", "agent", "mcp", "tool", "podcast"];
}

/** Get all ontology configs */
export function getAllOntologyConfigs(): ContentOntologyConfig[] {
  const reg = loadRegistry();
  return getAllContentTypes().map((t) => reg[t]);
}

/* ── Cross-Type Relationships (Platform Knowledge Graph) ──────────────── */

export const CROSS_TYPE_RELATIONS: CrossTypeRelation[] = [
  {
    sourceType: "agent",
    targetType: "skill",
    relationType: "uses",
    label: "Uses",
    description: "Agents use skills to perform specific tasks and capabilities.",
    color: "#60a5fa", // blue
  },
  {
    sourceType: "agent",
    targetType: "mcp",
    relationType: "connects_via",
    label: "Connects Via",
    description: "Agents connect to external services through MCP servers.",
    color: "#a78bfa", // violet
  },
  {
    sourceType: "mcp",
    targetType: "tool",
    relationType: "provides",
    label: "Provides",
    description: "MCP servers provide access to tools and external capabilities.",
    color: "#34d399", // emerald
  },
  {
    sourceType: "skill",
    targetType: "tool",
    relationType: "implemented_by",
    label: "Implemented By",
    description: "Skills are implemented using specific tools and technologies.",
    color: "#fbbf24", // amber
  },
  {
    sourceType: "podcast",
    targetType: "agent",
    relationType: "discusses",
    label: "Discusses",
    description: "Podcast episodes discuss agents, their capabilities and use cases.",
    color: "#fb923c", // orange
  },
  {
    sourceType: "podcast",
    targetType: "mcp",
    relationType: "discusses",
    label: "Discusses",
    description: "Podcast episodes discuss MCP servers and integration patterns.",
    color: "#fb923c", // orange
  },
  {
    sourceType: "podcast",
    targetType: "skill",
    relationType: "discusses",
    label: "Discusses",
    description: "Podcast episodes discuss skills, techniques and best practices.",
    color: "#fb923c", // orange
  },
  {
    sourceType: "podcast",
    targetType: "tool",
    relationType: "discusses",
    label: "Discusses",
    description: "Podcast episodes discuss tools and their applications.",
    color: "#fb923c", // orange
  },
];

/** Get cross-type relations involving a specific content type */
export function getCrossTypeRelationsFor(type: ContentTypeName): CrossTypeRelation[] {
  return CROSS_TYPE_RELATIONS.filter(
    (r) => r.sourceType === type || r.targetType === type,
  );
}

/** Content type display metadata for the platform ontology diagram */
export const CONTENT_TYPE_META: Record<ContentTypeName, {
  label: string;
  icon: string;
  nodeShape: "circle" | "diamond" | "square" | "triangle" | "hexagon";
  color: string;
}> = {
  skill: { label: "Skills", icon: "⚡", nodeShape: "circle", color: "#60a5fa" },
  agent: { label: "Agents", icon: "🤖", nodeShape: "diamond", color: "#a78bfa" },
  mcp: { label: "MCP Servers", icon: "🔌", nodeShape: "square", color: "#34d399" },
  tool: { label: "Tools", icon: "🔧", nodeShape: "triangle", color: "#fbbf24" },
  podcast: { label: "Podcasts", icon: "🎙️", nodeShape: "hexagon", color: "#fb923c" },
};
