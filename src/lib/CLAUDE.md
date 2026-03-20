# Lib Directory

Utility modules, all camelCase `.ts` files. Every function must be typed — no `any`.

## Key Modules

| Module | Purpose |
|--------|---------|
| `cms.ts` | CMS fetch functions, TypeScript types, per-type category count + tag helpers |
| `ontologyTypes.ts` | Shared type system: `ContentOntologyConfig`, `TaxonomyCategory`, `CrossTypeRelation`, `ContentCollection`, `SolutionStack` |
| `ontologyRegistry.ts` | Central registry mapping `ContentTypeName` → config, defines 8 cross-type relations, `CONTENT_TYPE_META` |
| `graphUtils.ts` | Generic `buildGraphData()` with callback-based classification, backward-compatible with skills |
| `catalogFormatters.ts` | Shared formatting helpers + `toSkillFamily()` |

## Security Modules

| Module | Purpose |
|--------|---------|
| `api-auth.ts` | Admin auth with timing-safe comparisons |
| `rate-limit.ts` | Shared rate limiter for API routes |

## CMS Fetch Patterns

Per-type helpers follow naming convention:
- `fetch{ContentType}CategoryCounts()` — category aggregation
- `fetchAll{ContentType}Tags()` — tag list for filters

Example: `fetchMCPCategoryCounts()`, `fetchAllAgentTags()`

## Graph Utilities

`buildGraphData()` is generic with callback-based classification:
- Accepts items + classifier function → returns nodes/links
- `buildGraphDataForType()` wraps it for specific content types
- Colors, convex hull, topological sort utilities included

---

See root `CLAUDE.md` for full project context.
