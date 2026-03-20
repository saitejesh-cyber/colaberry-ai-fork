# ADR-002: SkillNet 3-Layer Pattern as Standard for All Content Types

**Status:** Accepted
**Date:** 2026-03-01
**Decision Makers:** Ram (CEO), Engineering Team

## Context

The SkillNet implementation for Skills had a unique 3-layer ontology approach: Taxonomy (categories) → Relation Graph (connections) → Collections (curated bundles). Ram's directive: "I like the way SkillNet has organized Ontologies and Collections" — apply this pattern to all content types.

## Decision

Standardize the SkillNet 3-layer pattern across all 5 content types (Skills, MCPs, Agents, Tools, Podcasts) using **generic page templates** with `ContentOntologyConfig`.

### Pattern
1. **Ontology Page** — SVG diagram showing taxonomy categories, relationship types, and collections
2. **Graph Page** — Interactive ForceGraph2D with nodes colored by category, filterable
3. **Collections Page** — Curated bundles listing with search and difficulty filter
4. **Collection Detail** — Single collection with item list + embedded neighborhood graph

### Implementation
- 4 generic templates: `OntologyPageTemplate`, `GraphPageTemplate`, `CollectionsPageTemplate`, `CollectionDetailTemplate`
- Each content type defines a `ContentOntologyConfig` in its taxonomy file
- Per-type pages are thin wrappers that pass config to templates
- Central registry in `src/lib/ontologyRegistry.ts` maps types to configs

## Consequences

- **Positive:** 20 knowledge graph pages from 4 templates. Adding a new content type requires only data files + thin page wrappers. Consistent UX across all types.
- **Negative:** Per-type customization is limited by template flexibility. The generic approach means all types share the same visual layout.
- **Trade-off accepted:** Consistency over per-type customization.
