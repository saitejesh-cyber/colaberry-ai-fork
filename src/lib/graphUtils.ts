/**
 * Shared graph utilities for skill relationship visualizations.
 * Used by: graph page, collection detail, ontology diagram, skill detail mini-graph.
 */

import type { SkillRelationType } from "../data/skill-taxonomy";

/* ── Types ────────────────────────────────────────────────────────────── */

export type GraphNode = {
  id: string;
  name: string;
  category: string;
  color: string;
  val: number;
  tags?: string[];
  collections?: string[];
};

export type GraphLink = {
  source: string;
  target: string;
  type: SkillRelationType;
};

export type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

/* ── Colors ───────────────────────────────────────────────────────────── */

/** Category node colors (zinc-friendly for monochrome design system) */
export const CATEGORY_COLORS: Record<string, string> = {
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
};

/** Relationship edge colors — distinct from node colors */
export const RELATIONSHIP_TYPE_COLORS: Record<SkillRelationType, string> = {
  similar_to: "#34d399",  // emerald
  belong_to: "#fbbf24",   // amber
  compose_with: "#60a5fa", // blue
  depend_on: "#f87171",    // red
};

/** Relationship type display labels */
export const RELATIONSHIP_TYPE_LABELS: Record<SkillRelationType, string> = {
  similar_to: "Similar To",
  belong_to: "Belongs To",
  compose_with: "Composes With",
  depend_on: "Depends On",
};

/* ── Graph Data Builder ──────────────────────────────────────────────── */

type SkillLike = {
  slug: string;
  name: string;
  tags?: { slug?: string; name?: string }[] | null;
  category?: string | null;
  skillType?: string | null;
  prerequisites?: string | null;
};

type CollectionLike = {
  slug: string;
  skillSlugs: string[];
};

/**
 * Build graph data from skills and optional collection context.
 * Computes all 4 relationship types: similar_to, belong_to, compose_with, depend_on.
 */
export function buildGraphData(
  skills: SkillLike[],
  collections: CollectionLike[],
  classifyFn: (s: { category?: string | null; skillType?: string | null }) => { slug: string },
): GraphData {
  const linkSet = new Set<string>();
  const links: GraphLink[] = [];

  const addLink = (src: string, tgt: string, type: SkillRelationType) => {
    const key = [src, tgt].sort().join("|") + "|" + type;
    if (!linkSet.has(key)) {
      linkSet.add(key);
      links.push({ source: src, target: tgt, type });
    }
  };

  // Build slug → collection membership map
  const skillCollections: Record<string, string[]> = {};
  for (const col of collections) {
    for (const slug of col.skillSlugs) {
      (skillCollections[slug] ??= []).push(col.slug);
    }
  }

  // Build nodes
  const nodes: GraphNode[] = skills.map((skill) => {
    const cat = classifyFn(skill);
    const tagStrings = (skill.tags || [])
      .map((t) => (t.slug || t.name || "").toLowerCase())
      .filter(Boolean);
    return {
      id: skill.slug,
      name: skill.name,
      category: cat.slug,
      color: CATEGORY_COLORS[cat.slug] || "#a1a1aa",
      val: 1 + tagStrings.length * 0.5,
      tags: tagStrings,
      collections: skillCollections[skill.slug] || [],
    };
  });

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

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
  const byCategory: Record<string, SkillLike[]> = {};
  for (const skill of skills) {
    const cat = classifyFn(skill).slug;
    (byCategory[cat] ??= []).push(skill);
  }
  for (const catSkills of Object.values(byCategory)) {
    for (let i = 0; i < catSkills.length - 1 && i < 80; i++) {
      addLink(catSkills[i].slug, catSkills[i + 1].slug, "belong_to");
    }
  }

  // Phase 3: compose_with — skills in the same collection
  for (const col of collections) {
    const slugsInGraph = col.skillSlugs.filter((s) => nodeMap.has(s));
    for (let i = 0; i < slugsInGraph.length - 1; i++) {
      addLink(slugsInGraph[i], slugsInGraph[i + 1], "compose_with");
    }
  }

  // Phase 4: depend_on — parse prerequisites text for skill slug references
  for (const skill of skills) {
    if (!skill.prerequisites) continue;
    const prereqText = skill.prerequisites.toLowerCase();
    for (const other of skills) {
      if (other.slug === skill.slug) continue;
      if (!nodeMap.has(other.slug)) continue;
      // Check if the prerequisite mentions the other skill's name or slug
      const otherName = other.name.toLowerCase();
      if (
        prereqText.includes(other.slug) ||
        (otherName.length > 4 && prereqText.includes(otherName))
      ) {
        addLink(other.slug, skill.slug, "depend_on");
      }
    }
  }

  return { nodes, links };
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
