# System Architecture

## Overview

Colaberry AI is a **Unified Content Knowledge Graph Platform** built on Next.js 16 (Pages Router), React 19, TypeScript 5, and Tailwind CSS 4. It organizes AI ecosystem content into 5 content types connected by a knowledge graph.

**CMS:** Strapi v5 headless via `src/lib/cms.ts` (env: `NEXT_PUBLIC_CMS_URL`)
**Deployment:** Docker + Vercel-compatible, SSG with ISR

---

## Content Architecture

### 5 Content Types

| Type | Listing Route | Categories | Relationship Types |
|------|--------------|-----------|-------------------|
| Skills | `/aixcelerator/skills` | 10 | similar_to, depend_on, compose_with, belong_to |
| MCPs | `/aixcelerator/mcp` | 9 | similar_to, interop_with, complement, belong_to |
| Agents | `/aixcelerator/agents` | 8 | similar_to, chains_with, integrates_with, belong_to |
| Tools | `/aixcelerator/tools` | 12 | similar_to, used_with, replaces, belong_to |
| Podcasts | `/resources/podcasts` | 8 | similar_to, sequel_to, references, belong_to |

### SkillNet 3-Layer Pattern (per content type)

Each content type has 4 knowledge graph pages built from generic templates:

1. **Ontology** (`OntologyPageTemplate`) — SVG diagram: Taxonomy categories → Relationship types → Collections
2. **Graph** (`GraphPageTemplate`) — Interactive ForceGraph2D with nodes, edges, filters
3. **Collections** (`CollectionsPageTemplate`) — Curated bundles with search/filter
4. **Collection Detail** (`CollectionDetailTemplate`) — Single collection + embedded graph

### Cross-Type Relationships (Platform Level)

| Source | Target | Relation |
|--------|--------|----------|
| Agent | Skill | USES |
| Agent | MCP | CONNECTS_VIA |
| MCP | Tool | PROVIDES |
| Skill | Tool | IMPLEMENTED_BY |
| Podcast | Agent/MCP/Skill/Tool | DISCUSSES |

### Platform-Level Pages

- `/aixcelerator/ontology` — Meta-level diagram showing all 5 types with cross-type relationships
- `/aixcelerator/ecosystem` — Unified force-graph with nodes from ALL content types
- `/aixcelerator/solution-stacks` — Cross-type curated bundles

---

## Data Flow

```
Strapi v5 CMS ──→ src/lib/cms.ts ──→ getStaticProps (SSG + ISR)
                                          │
                                          ▼
                                   React components
                                          │
                                          ▼
Static fallback ←── src/data/*.ts ←── (if CMS unavailable)
```

- **Primary:** CMS fetch via `fetch{Type}()` functions in `cms.ts`
- **Fallback:** Static JSON/TS data in `src/data/`
- **Classification:** Per-type `classify{Type}()` functions map items to taxonomy categories

---

## Module Map

### Core Modules (`src/lib/`)

| Module | Purpose |
|--------|---------|
| `cms.ts` | CMS fetch, types, category counts, tag helpers |
| `ontologyTypes.ts` | Shared type system (`ContentOntologyConfig`, `TaxonomyCategory`, `ContentCollection`, `SolutionStack`) |
| `ontologyRegistry.ts` | Central registry: `ContentTypeName` → config, 8 cross-type relations, `CONTENT_TYPE_META` |
| `graphUtils.ts` | Generic `buildGraphData()`, `buildGraphDataForType()`, colors, convex hull, topological sort |
| `catalogFormatters.ts` | Formatting helpers, `toSkillFamily()` |
| `api-auth.ts` | Admin auth with timing-safe comparisons |
| `rate-limit.ts` | Shared rate limiter for API routes |

### Data Files (`src/data/`)

- 5 taxonomy files: categories + classifier + `ContentOntologyConfig`
- 5 collection files: `ContentCollection[]` with curated bundles
- `solution-stacks.ts`: Cross-type `SolutionStack[]`

### Component Hierarchy

```
Generic Templates (accept ContentOntologyConfig)
├── OntologyPageTemplate
├── GraphPageTemplate
├── CollectionsPageTemplate
└── CollectionDetailTemplate

Shared Components (used on 15+ pages)
├── EnterprisePageHero
├── SectionHeader
├── EnterpriseCtaBand
├── ContentTypeIcon / ContentTypeIconSvg
├── CollectionGraph
└── AgentCard / MCPCard / SkillCard / ToolCard

Page-Specific
├── Layout.tsx (header + footer + nav, 1800 lines)
└── Per-type detail pages with mini-graphs
```

---

## Full Route Map

### Per-Type Pages (5 types x 6 pages = 30 routes)

| Type | Listing | Detail | Ontology | Graph | Collections | Collection Detail |
|------|---------|--------|----------|-------|-------------|-------------------|
| Skills | `/aixcelerator/skills` | `/aixcelerator/skills/[slug]` | `/aixcelerator/skills/ontology` | `/aixcelerator/skills/graph` | `/aixcelerator/skills/collections` | `/aixcelerator/skills/collections/[slug]` |
| MCPs | `/aixcelerator/mcp` | `/aixcelerator/mcp/[slug]` | `/aixcelerator/mcp/ontology` | `/aixcelerator/mcp/graph` | `/aixcelerator/mcp/collections` | `/aixcelerator/mcp/collections/[slug]` |
| Agents | `/aixcelerator/agents` | `/aixcelerator/agents/[slug]` | `/aixcelerator/agents/ontology` | `/aixcelerator/agents/graph` | `/aixcelerator/agents/collections` | `/aixcelerator/agents/collections/[slug]` |
| Tools | `/aixcelerator/tools` | `/aixcelerator/tools/[slug]` | `/aixcelerator/tools/ontology` | `/aixcelerator/tools/graph` | `/aixcelerator/tools/collections` | `/aixcelerator/tools/collections/[slug]` |
| Podcasts | `/resources/podcasts` | `/resources/podcasts/[slug]` | `/resources/podcasts/ontology` | `/resources/podcasts/graph` | `/resources/podcasts/collections` | `/resources/podcasts/collections/[slug]` |

### Platform Pages

| Route | Purpose |
|-------|---------|
| `/aixcelerator/ontology` | Platform-level ontology diagram |
| `/aixcelerator/ecosystem` | Unified ecosystem graph |
| `/aixcelerator/solution-stacks` | Cross-type solution stacks |
| `/aixcelerator/solution-stacks/[slug]` | Individual stack detail |

### Other Pages

Homepage, About, Contact, and additional marketing/resource pages — see `src/pages/` for full listing.

---

## Import Scripts (`scripts/`)

| Script | Purpose |
|--------|---------|
| `import-clawhub-skills.mjs` | Import skills from ClawHub |
| `import-ultimate-skills.mjs` | Import from ultimate skills dataset |
| `import-anthropic-skills.mjs` | Import Anthropic-specific skills |
| `import-github-skills.mjs` | Import from GitHub sources |
| `import-podcasts-csv.mjs` | Import podcast episodes from CSV |
| `generate-collections.mjs` | Auto-generate skill collections |
| `enrich-skills.mjs` | Enrich skill metadata |
| `enrich-mcps.mjs` | Enrich MCP metadata |
