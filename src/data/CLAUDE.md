# Data Directory

Static data files for the 5-type content knowledge graph.

## Taxonomy Files (1 per content type)

Each taxonomy file exports three things:

1. **Categories array** — `TaxonomyCategory[]` with slug, name, description, icon
2. **Classifier function** — `classify{Type}(item): string` returns category slug
3. **Ontology config** — `{TYPE}_ONTOLOGY_CONFIG: ContentOntologyConfig` with categories, relationship types, category colors

| File | Categories | Config Export |
|------|-----------|---------------|
| `skill-taxonomy.ts` | 10 categories | `SKILL_ONTOLOGY_CONFIG` |
| `mcp-taxonomy.ts` | 9 categories | `MCP_ONTOLOGY_CONFIG` |
| `agent-taxonomy.ts` | 8 categories | `AGENT_ONTOLOGY_CONFIG` |
| `podcast-taxonomy.ts` | 8 categories | `PODCAST_ONTOLOGY_CONFIG` |
| `tool-taxonomy.ts` | 12 categories | `TOOL_ONTOLOGY_CONFIG` |

## Collection Files (1 per content type)

Each exports `ContentCollection[]` with `itemSlugs`, `difficulty`, `keywordTags`, `linkCount`.

| File | Collections |
|------|------------|
| `skill-collections.ts` | 6+ (uses `skillSlugs` naming, has auto-generated merge) |
| `mcp-collections.ts` | 6 |
| `agent-collections.ts` | 6 |
| `podcast-collections.ts` | 6 |
| `tool-collections.ts` | 5 |

## Cross-Type Data

- `solution-stacks.ts` — `SolutionStack[]` with `items: SolutionStackItem[]` spanning multiple content types

## JSON Fallback Data

- `agents.json`, `mcps.json` — Static fallback when CMS is unavailable

## Adding a New Content Type

1. Create `{type}-taxonomy.ts` with categories, classifier, ontology config
2. Create `{type}-collections.ts` with curated collection bundles
3. Register in `src/lib/ontologyRegistry.ts` (`CONTENT_TYPE_META`, relation definitions)
4. Add CMS fetch functions in `src/lib/cms.ts`
5. Create 4 page files using generic templates

---

See `src/lib/ontologyTypes.ts` for type definitions.
