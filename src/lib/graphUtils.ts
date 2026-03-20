/**
 * Shared graph utilities for content relationship visualizations.
 * Used by: graph pages, collection detail, ontology diagrams, detail mini-graphs.
 *
 * Supports all content types via generic OntologyItem/OntologyCollection types.
 * Skills-specific backward-compatible wrappers are kept for existing code.
 */

import type { SkillRelationType } from "../data/skill-taxonomy";
import type { OntologyItem, ContentOntologyConfig } from "./ontologyTypes";

/* ── Types ────────────────────────────────────────────────────────────── */

export type GraphNode = {
  id: string;
  name: string;
  category: string;
  color: string;
  val: number;
  tags?: string[];
  collections?: string[];
  /** Content type for cross-type graphs */
  contentType?: string;
};

export type GraphLink = {
  source: string;
  target: string;
  type: string;
};

export type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

/* ── Colors ───────────────────────────────────────────────────────────── */

/** Category node colors (zinc-friendly for monochrome design system) */
export const CATEGORY_COLORS: Record<string, string> = {
  // Skills
  development: "#60a5fa",
  "ai-generation": "#f87171",
  research: "#a78bfa",
  "data-science": "#34d399",
  business: "#fbbf24",
  testing: "#fb923c",
  productivity: "#38bdf8",
  security: "#f472b6",
  infrastructure: "#a3e635",
  other: "#94a3b8",
  // MCP Servers
  "database-storage": "#60a5fa",
  communication: "#a78bfa",
  "developer-tools": "#34d399",
  "ai-ml": "#f87171",
  "cloud-infra": "#fbbf24",
  "search-knowledge": "#38bdf8",
  "file-document": "#fb923c",
  "monitoring-analytics": "#f472b6",
  // Agents
  "code-development": "#60a5fa",
  "content-writing": "#a78bfa",
  "data-analytics": "#34d399",
  "research-analysis": "#fbbf24",
  "sales-marketing": "#f87171",
  "operations-workflow": "#38bdf8",
  "customer-support": "#fb923c",
  // Podcasts
  "business-strategy": "#a78bfa",
  "tech-engineering": "#34d399",
  "education-career": "#38bdf8",
  industry: "#fbbf24",
  "product-design": "#f472b6",
};

/** Relationship edge colors — works for any content type */
export const RELATIONSHIP_TYPE_COLORS: Record<string, string> = {
  // Universal
  similar_to: "#34d399",  // emerald
  belong_to: "#fbbf24",   // amber
  compose_with: "#60a5fa", // blue
  depend_on: "#f87171",    // red
  // MCP-specific
  interop_with: "#60a5fa",  // blue
  complement: "#fbbf24",    // amber
  // Agent-specific
  chains_with: "#60a5fa",   // blue
  integrates_with: "#fbbf24", // amber
  // Podcast-specific
  sequel_to: "#60a5fa",    // blue
  references: "#fbbf24",   // amber
  // Cross-type
  uses: "#60a5fa",         // blue
  connects_via: "#a78bfa", // violet
  provides: "#34d399",     // emerald
  implemented_by: "#fbbf24", // amber
  discusses: "#fb923c",    // orange
};

/** Relationship type display labels */
export const RELATIONSHIP_TYPE_LABELS: Record<string, string> = {
  // Universal
  similar_to: "Similar To",
  belong_to: "Belongs To",
  compose_with: "Composes With",
  depend_on: "Depends On",
  // MCP-specific
  interop_with: "Interoperates With",
  complement: "Complements",
  // Agent-specific
  chains_with: "Chains With",
  integrates_with: "Integrates With",
  // Podcast-specific
  sequel_to: "Sequel To",
  references: "References",
  // Cross-type
  uses: "Uses",
  connects_via: "Connects Via",
  provides: "Provides",
  implemented_by: "Implemented By",
  discusses: "Discusses",
};

/* ── Generic Graph Data Builder ────────────────────────────────────────── */

/** Generic item shape for graph building (backward-compatible with old SkillLike) */
type GraphBuildableItem = {
  slug: string;
  name: string;
  tags?: { slug?: string; name?: string }[] | null;
  category?: string | null;
  skillType?: string | null;
  prerequisites?: string | null;
  [key: string]: unknown;
};

/** Generic collection shape for graph building */
type GraphBuildableCollection = {
  slug: string;
  itemSlugs?: string[];
  skillSlugs?: string[];
};

/** Callback type for custom relationship computation */
export type RelationshipComputer = (
  items: GraphBuildableItem[],
  collections: GraphBuildableCollection[],
  addLink: (src: string, tgt: string, type: string) => void,
  nodeMap: Map<string, GraphNode>,
) => void;

/**
 * Build graph data from items and optional collection context.
 * Default behavior computes all 4 SkillNet relationship types.
 * Pass custom `computeRelationships` to override for different content types.
 */
export function buildGraphData(
  skills: GraphBuildableItem[],
  collections: GraphBuildableCollection[],
  classifyFn: (s: { category?: string | null; skillType?: string | null }) => { slug: string },
  computeRelationships?: RelationshipComputer,
): GraphData {
  const linkSet = new Set<string>();
  const links: GraphLink[] = [];

  const addLink = (src: string, tgt: string, type: string) => {
    const key = [src, tgt].sort().join("|") + "|" + type;
    if (!linkSet.has(key)) {
      linkSet.add(key);
      links.push({ source: src, target: tgt, type });
    }
  };

  // Normalize collection shape (support both itemSlugs and skillSlugs)
  const normalizedCollections = collections.map((c) => ({
    slug: c.slug,
    itemSlugs: c.itemSlugs || c.skillSlugs || [],
  }));

  // Build slug → collection membership map
  const itemCollections: Record<string, string[]> = {};
  for (const col of normalizedCollections) {
    for (const slug of col.itemSlugs) {
      (itemCollections[slug] ??= []).push(col.slug);
    }
  }

  // Build nodes
  const nodes: GraphNode[] = skills.map((item) => {
    const cat = classifyFn(item);
    const tagStrings = (item.tags || [])
      .map((t) => (t.slug || t.name || "").toLowerCase())
      .filter(Boolean);
    return {
      id: item.slug,
      name: item.name,
      category: cat.slug,
      color: CATEGORY_COLORS[cat.slug] || "#a1a1aa",
      val: 1 + tagStrings.length * 0.5,
      tags: tagStrings,
      collections: itemCollections[item.slug] || [],
    };
  });

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Use custom relationship computation if provided
  if (computeRelationships) {
    computeRelationships(skills, normalizedCollections, addLink, nodeMap);
  } else {
    // Default: compute all 4 SkillNet relationship types
    computeDefaultRelationships(skills, normalizedCollections, addLink, nodeMap);
  }

  return { nodes, links };
}

/** Default relationship computation (SkillNet 4-type model) */
function computeDefaultRelationships(
  skills: GraphBuildableItem[],
  collections: { slug: string; itemSlugs: string[] }[],
  addLink: (src: string, tgt: string, type: string) => void,
  nodeMap: Map<string, GraphNode>,
): void {
  // Phase 1: similar_to — shared tags ≥ 1
  for (let i = 0; i < skills.length; i++) {
    const a = skills[i];
    const aTags = new Set(
      (a.tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean),
    );
    if (aTags.size === 0) continue;

    for (let j = i + 1; j < skills.length; j++) {
      const b = skills[j];
      const bTags = (b.tags || [])
        .map((t) => (t.slug || t.name || "").toLowerCase())
        .filter(Boolean);
      const shared = bTags.filter((t) => aTags.has(t)).length;
      if (shared >= 1) {
        addLink(a.slug, b.slug, "similar_to");
      }
    }
  }

  // Phase 2: belong_to — same category sequential links
  const classifyFromNode = (item: GraphBuildableItem) => {
    const node = nodeMap.get(item.slug);
    return node?.category || "other";
  };

  const byCategory: Record<string, GraphBuildableItem[]> = {};
  for (const item of skills) {
    const cat = classifyFromNode(item);
    (byCategory[cat] ??= []).push(item);
  }
  for (const catItems of Object.values(byCategory)) {
    for (let i = 0; i < catItems.length - 1 && i < 80; i++) {
      addLink(catItems[i].slug, catItems[i + 1].slug, "belong_to");
    }
  }

  // Phase 3: compose_with — items in the same collection
  for (const col of collections) {
    const slugsInGraph = col.itemSlugs.filter((s) => nodeMap.has(s));
    for (let i = 0; i < slugsInGraph.length - 1; i++) {
      addLink(slugsInGraph[i], slugsInGraph[i + 1], "compose_with");
    }
  }

  // Phase 4: depend_on — parse prerequisites text for item slug references
  for (const item of skills) {
    if (!item.prerequisites) continue;
    const prereqText = (item.prerequisites as string).toLowerCase();
    for (const other of skills) {
      if (other.slug === item.slug) continue;
      if (!nodeMap.has(other.slug)) continue;
      const otherName = other.name.toLowerCase();
      if (
        prereqText.includes(other.slug) ||
        (otherName.length > 4 && prereqText.includes(otherName))
      ) {
        addLink(other.slug, item.slug, "depend_on");
      }
    }
  }
}

/* ── Content-Type-Specific Graph Builder ──────────────────────────────── */

/**
 * Build graph data using an ontology config's classify function and relationship types.
 * Convenience wrapper around buildGraphData for non-skill content types.
 */
export function buildGraphDataForType(
  items: OntologyItem[],
  collections: GraphBuildableCollection[],
  config: ContentOntologyConfig,
  customRelationships?: RelationshipComputer,
): GraphData {
  const classifyFn = (item: { category?: string | null; skillType?: string | null }) => {
    return config.classifyItem(item as OntologyItem);
  };

  return buildGraphData(
    items as GraphBuildableItem[],
    collections,
    classifyFn,
    customRelationships,
  );
}

/* ── Convex Hull ──────────────────────────────────────────────────────── */

type Point = { x: number; y: number };

/** Compute the convex hull of a set of 2D points (Graham scan). */
export function computeConvexHull(points: Point[]): Point[] {
  if (points.length < 3) return [...points];

  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);

  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  // Lower hull
  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  // Upper hull
  const upper: Point[] = [];
  for (const p of sorted.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  // Concat, removing last point of each half (duplicate)
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/* ── Topological Sort ────────────────────────────────────────────────── */

/**
 * Topological sort for dependency flow visualization.
 * Returns array of levels, where each level contains node IDs
 * that can execute in parallel.
 */
export function topologicalSort(
  nodeIds: string[],
  edges: { source: string; target: string }[],
): string[][] {
  const inDegree: Record<string, number> = {};
  const adj: Record<string, string[]> = {};

  for (const id of nodeIds) {
    inDegree[id] = 0;
    adj[id] = [];
  }

  for (const { source, target } of edges) {
    if (adj[source] && inDegree[target] !== undefined) {
      adj[source].push(target);
      inDegree[target]++;
    }
  }

  const levels: string[][] = [];
  let queue = nodeIds.filter((id) => inDegree[id] === 0);

  while (queue.length > 0) {
    levels.push([...queue]);
    const next: string[] = [];
    for (const node of queue) {
      for (const neighbor of adj[node] || []) {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) {
          next.push(neighbor);
        }
      }
    }
    queue = next;
  }

  // Append any remaining nodes (cycles) to the last level
  const placed = new Set(levels.flat());
  const remaining = nodeIds.filter((id) => !placed.has(id));
  if (remaining.length > 0) {
    levels.push(remaining);
  }

  return levels;
}

/* ── Link Type Counts ────────────────────────────────────────────────── */

/** Count links grouped by relationship type. */
export function countLinksByType(links: GraphLink[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const link of links) {
    counts[link.type] = (counts[link.type] || 0) + 1;
  }
  return counts;
}

/* ── Backward Compatibility ──────────────────────────────────────────── */

/** @deprecated Use GraphBuildableItem instead */
export type SkillLike = GraphBuildableItem;
/** @deprecated Use GraphBuildableCollection instead */
export type CollectionLike = GraphBuildableCollection;

// Re-export SkillRelationType for backward compatibility
export type { SkillRelationType } from "../data/skill-taxonomy";
