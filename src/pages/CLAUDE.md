# Pages Directory

53+ page files using **Next.js Pages Router** (not App Router).

## Page Structure Standard (every page)

1. `.reveal` wrapper on hero section with `SectionHeader` (`size="xl"`, kicker, title, description)
2. `.surface-panel` for filter/search bars
3. `.stagger-grid` on card grids (never combined with `.reveal` on same element)
4. `.reveal` on each major section
5. `EnterpriseCtaBand` at page bottom
6. `ContentTypeIcon` for content type icons — never emoji

## Data Fetching

- Prefer `getStaticProps` (SSG) with `revalidate` for ISR
- CMS-first via `src/lib/cms.ts`, static fallback from `src/data/`
- Pattern: `const { data } = await fetchSkills()` with try/catch fallback

## Route Map

| Type | Listing | Detail | Ontology | Graph | Collections | Collection Detail |
|------|---------|--------|----------|-------|-------------|-------------------|
| Skills | `/aixcelerator/skills` | `/aixcelerator/skills/[slug]` | `/aixcelerator/skills/ontology` | `/aixcelerator/skills/graph` | `/aixcelerator/skills/collections` | `/aixcelerator/skills/collections/[slug]` |
| MCPs | `/aixcelerator/mcp` | `/aixcelerator/mcp/[slug]` | `/aixcelerator/mcp/ontology` | `/aixcelerator/mcp/graph` | `/aixcelerator/mcp/collections` | `/aixcelerator/mcp/collections/[slug]` |
| Agents | `/aixcelerator/agents` | `/aixcelerator/agents/[slug]` | `/aixcelerator/agents/ontology` | `/aixcelerator/agents/graph` | `/aixcelerator/agents/collections` | `/aixcelerator/agents/collections/[slug]` |
| Tools | `/aixcelerator/tools` | `/aixcelerator/tools/[slug]` | `/aixcelerator/tools/ontology` | `/aixcelerator/tools/graph` | `/aixcelerator/tools/collections` | `/aixcelerator/tools/collections/[slug]` |
| Podcasts | `/resources/podcasts` | `/resources/podcasts/[slug]` | `/resources/podcasts/ontology` | `/resources/podcasts/graph` | `/resources/podcasts/collections` | `/resources/podcasts/collections/[slug]` |

**Platform pages:** `/aixcelerator/ontology`, `/aixcelerator/ecosystem`, `/aixcelerator/solution-stacks`

## Per-Type Pages

Per-type ontology/graph/collections pages are thin wrappers around generic templates from `src/components/`. They import the type's `ContentOntologyConfig` and pass it to the template.

## Forbidden Colors

`emerald-*`, `green-*`, `blue-*`, `amber-*`, `slate-*` — use zinc equivalents. Exception: `text-red-600` for error states only.

---

See root `CLAUDE.md` for full design system and `Constitution.md` for immutable principles.
