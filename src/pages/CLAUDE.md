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

## Interactive Demos (`/demo/*`)

Client-facing AI demos — top-level "Demos" nav item (between Platform and Industries).

| Route | File | Purpose |
|-------|------|---------|
| `/demo` | `pages/demo/index.tsx` | Hub listing all demos (reads `src/data/demos.ts`) |
| `/demo/[slug]` | `pages/demo/[slug].tsx` | SSG detail page template (hero, metrics, features, tech stack, launch CTA). `revalidate: 3600`, `fallback: "blocking"` |
| `/demo/lens` | `pages/demo/lens.tsx` | Existing iframe wrapper for Goggle VTON (preserved URL). Has a "← Details" breadcrumb back to `/demo/goggle-vton` |

**Adding a new demo:** add one record to `src/data/demos.ts`. Hub card + detail page render automatically. **Reserved slugs:** `lens`, `index` (they'd collide with static files and silently make the detail page unreachable).

**AEO:** hub emits `ItemList` JSON-LD; detail page emits `WebApplication` JSON-LD.

## Per-Type Pages

Per-type ontology/graph/collections pages are thin wrappers around generic templates from `src/components/`. They import the type's `ContentOntologyConfig` and pass it to the template.

**Exception — Skills Ontology:** `/aixcelerator/skills/ontology` has a custom inline `OntologyDiagram` component (not the shared template) with its own SVG layout. Uses the same flat enterprise design system: dynamic category sizing, `var(--font-inter)` font, `useState(false)` hydration-safe dark mode.

**Exception — Platform Ontology:** `/aixcelerator/ontology` has a custom `PlatformDiagram` showing cross-type relationships (Agents, Skills, MCP Servers, Podcasts as interactive nodes). Flat enterprise style with solid zinc palette, no feDropShadow/blur/glow.

## AIXcelerator Overview (`/aixcelerator`)

The platform overview page uses live CMS data and static registry data:

| Section | Data Source | Pattern |
|---------|-----------|---------|
| Live catalog metrics | `fetchCatalogCounts()` | 4-col stats band (ISR 600s) |
| Core platform surface | `coreCapabilities` static | 3-col icon-led cards |
| Knowledge graph method | `GRAPH_LAYERS` const | 3-step numbered indicators |
| Cross-type links bar | `CONTENT_TYPE_META` | Inline type icons with labels |
| Solution stacks | `SOLUTION_STACKS.slice(0,3)` | 3-col cards with type count pills |
| Modular layers | `modularLayers` static | 4-col compact cards |
| Roadmap | Inline data | 2-col status badges |

**Card pattern:** Unified `gap-px` border grid — single `rounded-xl border` container with pixel-gap dividers. No `surface-panel` wrappers on content sections. No `card-feature`/`card-elevated` hover-lift.

## Dark Mode Safety Net Conflict

`globals.css` has safety-net overrides like `.dark .bg-zinc-900 { background-color: #18181B }` that clobber `dark:` Tailwind variants on the same element. When you need inverted colors (dark bg in light mode → light bg in dark mode), use `bg-zinc-950` instead of `bg-zinc-900` — there is no safety net for zinc-950.

**Affected pattern:** `bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950` (numbered indicators, status badges).

## Forbidden Colors

`emerald-*`, `green-*`, `blue-*`, `amber-*`, `slate-*` — use zinc equivalents. Exception: `text-red-600` for error states only.

---

See root `CLAUDE.md` for full design system and `Constitution.md` for immutable principles.
