/**
 * Shared type system for the Colaberry AI Content Knowledge Graph Platform.
 * Defines content-type-agnostic ontology types used across all content types.
 *
 * Architecture:
 * - Each content type (skill, agent, mcp, tool, podcast) has its own taxonomy config
 * - All configs share these types for consistency
 * - Cross-type relationships define the platform-level knowledge graph
 */

/* ── Content Type Identifiers ──────────────────────────────────────────── */

export type ContentTypeName = "skill" | "agent" | "mcp" | "tool" | "podcast";

/* ── Taxonomy Category ─────────────────────────────────────────────────── */

export type TaxonomyCategory = {
  slug: string;
  label: string;
  description: string;
  /** Keywords used to auto-classify items from raw text fields */
  keywords: string[];
  /** Tailwind classes for category pills */
  tone: string;
};

/* ── Relationship Types ────────────────────────────────────────────────── */

export type RelationTypeConfig = {
  type: string;
  label: string;
  description: string;
  color: string;
  /** Whether to show directional particles (e.g., depend_on) */
  directional: boolean;
};

/* ── Cross-Type Relationships (Platform Level) ─────────────────────────── */

export type CrossTypeRelation = {
  sourceType: ContentTypeName;
  targetType: ContentTypeName;
  relationType: string;
  label: string;
  description: string;
  color: string;
};

/* ── Content Ontology Config (per content type) ────────────────────────── */

export type ContentOntologyConfig = {
  contentType: ContentTypeName;
  label: string;          // "Skills", "Agents", "MCP Servers"
  labelSingular: string;  // "Skill", "Agent", "MCP Server"
  icon: string;           // "⚡", "🤖", "🔌"
  basePath: string;       // "/aixcelerator/skills"
  catalogPath: string;    // "/aixcelerator/skills"
  /** Node shape for cross-type graphs */
  nodeShape: "circle" | "diamond" | "square" | "triangle" | "hexagon";
  categories: TaxonomyCategory[];
  relationTypes: RelationTypeConfig[];
  /** Category slug → hex color for graph nodes */
  categoryColors: Record<string, string>;
  /** Classify any item into a taxonomy category */
  classifyItem: (item: OntologyItem) => TaxonomyCategory;
};

/* ── Generic Item Shape ────────────────────────────────────────────────── */

/** Minimal shape any CMS item needs for graph/taxonomy operations */
export type OntologyItem = {
  slug: string;
  name: string;
  tags?: { slug?: string; name?: string }[] | null;
  category?: string | null;
  [key: string]: unknown;
};

/* ── Generic Collection ────────────────────────────────────────────────── */

export type ContentCollection = {
  slug: string;
  name: string;
  description: string;
  category: string;
  /** Item slugs belonging to this collection */
  itemSlugs: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  /** Top keyword tags displayed as pills on cards */
  keywordTags: string[];
  /** Number of inter-item relationship links */
  linkCount: number;
  /** Whether auto-generated from CMS data */
  generated: boolean;
  /** Content type this collection belongs to, or "platform" for cross-type */
  contentType: ContentTypeName | "platform";
};

/* ── Solution Stack (Cross-Type Collection) ────────────────────────────── */

export type SolutionStackItem = {
  type: ContentTypeName;
  slug: string;
  name: string;
};

export type SolutionStack = {
  slug: string;
  name: string;
  description: string;
  category: string;
  items: SolutionStackItem[];
  keywordTags: string[];
};
