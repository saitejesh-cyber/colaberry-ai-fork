# Colaberry AI — Frontend

## Tech Stack
- **Framework:** Next.js 16.1.6 (Pages Router) with React 19.2.3
- **Language:** TypeScript 5 (strict mode)
- **Styling:** Tailwind CSS 4 + PostCSS, CSS custom properties in `src/styles/globals.css`
- **Fonts:** Inter via `next/font/google` (variable `--font-inter`)
- **CMS:** Strapi v5 headless — fetched via `src/lib/cms.ts` using `NEXT_PUBLIC_CMS_URL`
- **Deployment:** Docker + Vercel-compatible

## Design System — Monochrome + Coral Accent

### Colors
| Token           | Light               | Dark                |
|-----------------|---------------------|---------------------|
| Background      | `#FFFFFF`           | `#09090B` zinc-950  |
| Surface         | `#FAFAFA` zinc-50   | `#18181B` zinc-900  |
| Text primary    | `#18181B` zinc-900  | `#FAFAFA` zinc-50   |
| Text muted      | `#71717A` zinc-500  | `#A1A1AA` zinc-400  |
| Border          | `#E4E4E7` zinc-200  | `#3F3F46` zinc-700  |
| Accent (coral)  | `#DC2626`           | `#F87171`           |

**Rule:** Coral `#DC2626` is used ONLY for CTAs and small accent dots. Everything else uses the zinc scale.

### Typography
- Font: Inter for all text (sans, display, serif all resolve to Inter)
- Scale: `display-2xl` (4.5rem) → `body-xs` (0.75rem) defined in `tailwind.config.ts`

### Components
- **Buttons:** Pill-shaped (`border-radius: 9999px`), no `translateY` hover
- **Cards:** Clean `1px` borders, no glassmorphism, no hover lift. Use `.surface-panel` CSS class
- **Architecture cards:** Numbered step indicators (zinc-900/zinc-100 circles), zinc-400 left border accent (`borderLeft: 3px solid #a1a1aa`), zinc dot markers, zinc footer strips (`bg-zinc-50/80 dark:bg-zinc-800/30`)
- **Relationship cards:** Zinc accent bar (`bg-zinc-300 dark:bg-zinc-600`), link icon in zinc background (`bg-zinc-100 dark:bg-zinc-800`), monospace code pill (`bg-zinc-100 dark:bg-zinc-800 rounded px-2 py-0.5`)
- **Quick links cards:** Icons wrapped in rounded-xl containers with hover transition (`bg-zinc-100 dark:bg-zinc-800`)
- **Info boxes ("How it works"):** Flat surface (`bg-zinc-50 dark:bg-zinc-900`), SVG icon in coral-tinted badge container, uppercase tracking label, relaxed leading text
- **Collection count badges:** Zinc monochrome (`bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300`) — never emerald/colored
- **`.chip-neutral` CSS class:** Uses zinc scale (zinc-100/200/600/700/800) — never slate
- **Animations:** 0.4s duration, 12px translateY, `cubic-bezier(0.16, 1, 0.3, 1)` easing
- **Animation nesting rule:** NEVER nest `.reveal-scale` or `.stagger-grid` inside a `.reveal` parent — IntersectionObserver only observes top-level `.reveal` elements, so nested animated children stay invisible (white space bug)
- **Header:** Fixed 64px height
- **Icons:** Use `ContentTypeIcon` / `ContentTypeIconSvg` for content type icons — never use emoji icons in production pages

### Premium Graph Patterns
- **Canvas node glow:** `ctx.save(); ctx.shadowColor = nodeColor; ctx.shadowBlur = 8; ctx.fill(); ctx.restore()` — always save/restore to isolate shadow state
- **Hover glow ring:** `ctx.shadowBlur = 18` on hovered node, extra ring stroke on highlighted nodes
- **Frosted-glass controls:** `absolute` positioned over canvas with `bg-zinc-900/70 backdrop-blur-md` — controls overlaid inside graph container
- **hexToRgba() helper:** Converts hex to rgba for proper alpha blending — never use `hex + "66"` suffix approach
- **Curved edges:** `linkCurvature={0.15}` for premium curved edge rendering
- **Directional particles:** `linkDirectionalParticles`, `linkDirectionalParticleWidth={2.5}` for animated flow
- **Text shadow labels:** Dark background text shadow for readability on dark canvas
- **Bottom gradient overlay:** `bg-gradient-to-t from-zinc-950/60 to-transparent` at bottom of graph container
- **SVG `<filter>` shadows in OntologyDiagram:** `feDropShadow` for node shadows, `centralShadow` with higher `stdDeviation` for central node, `layerShadow` for layer containers
- **SVG layer backgrounds:** Filled `<rect>` with solid borders and subtle fill opacity, pill-shaped labels (`rx="11"` behind text)
- **SVG font scale:** Layer labels 11px/700, central node 14px/700, category nodes 11.5px/600, relation items 11.5px/600, collection names 11.5px/700, legend 10.5px/500 — minimum font size is 9.5px (tags/annotations only)
- **SVG sizing:** viewBox `940×680`, category nodes `140×36`, collection cards `140×68`, central pill `120×38`, item nodes auto-width `30px` tall — generous padding creates premium feel
- **SVG color approach:** Category nodes use `config.categoryColors` with opacity fills (0.06 default, 0.15 hover), relation graph legend shows `rel.label` (human name) not `rel.type` (slug). Legend and edge lines use zinc monochrome — never colored per-type. Item nodes use `#71717a` (zinc-500), not emerald

### Dark Mode
- Toggle: `.dark` class on `<html>`, persisted in localStorage
- CSS vars swap between `:root` and `.dark` blocks in `globals.css`
- Components use `dark:` Tailwind variants for additional overrides

### Locked Theming Standard (MUST follow for ALL pages)

**Theming is locked and finalized.** All existing pages (Skills, Agents, MCPs, Tools, Podcasts — listing, detail, ontology, graph, collections) follow this standard. All future pages must match.

**Color Rule:** Only zinc scale + coral `#DC2626` accent. The following colors are **FORBIDDEN** in page code:
- `emerald-*`, `green-*` — no green for status/success indicators
- `blue-*` — no blue for headings or accents
- `amber-*` — no amber for badges
- `slate-*` — use zinc equivalents instead

**Exceptions:** `text-red-600` for error states only. Category node fills in SVG diagrams use `config.categoryColors` (these are content-type-specific by design).

**Page Structure Standard (every new page):**
1. `.reveal` wrapper on hero section with `SectionHeader` (`size="xl"`, kicker, title, description)
2. `.surface-panel` for filter/search bars
3. `.stagger-grid` on card grids (never combined with `.reveal` on same element)
4. `.reveal` on each major section
5. `EnterpriseCtaBand` at page bottom
6. Use `ContentTypeIcon` for content type icons — never emoji

**Locked Component Classes:**
- `.catalog-card` — listing cards (1px border, no hover lift)
- `.surface-panel` — filter/search panels
- `.chip-brand` — active filter (coral accent)
- `.chip-neutral` — default filter (zinc scale)
- `.detail-section` — content sections on detail pages

**SkillNet Pattern (standard for all content types):**
The 3-layer ontology approach (Taxonomy → Relation Graph → Collections) is Colaberry's unique knowledge graph method. All 5 content types use generic templates (`OntologyPageTemplate`, `GraphPageTemplate`, `CollectionsPageTemplate`, `CollectionDetailTemplate`) with `ContentOntologyConfig`.

## Project Structure
```
src/
├── components/     # 38 React components (incl. SkillCard, CollectionGraph, 4 page templates)
├── pages/          # 53+ pages (Pages Router, incl. ontology/graph/collections per content type)
├── styles/         # globals.css (design tokens + component classes)
├── lib/            # 16 utility modules (cms.ts, ontologyTypes.ts, ontologyRegistry.ts, graphUtils.ts, etc.)
├── data/           # Static data (5 taxonomy files, 5 collection files, solution-stacks.ts)
└── hooks/          # Custom React hooks
```

## Key Files
- `src/styles/globals.css` — ALL CSS custom properties and component classes
- `tailwind.config.ts` — Zinc color scale, Inter fonts, animation keyframes
- `src/pages/_app.tsx` — Font loading (Inter), global layout wrapper
- `src/lib/cms.ts` — CMS fetch functions, TypeScript types, per-type category count + tag helpers
- `src/lib/ontologyTypes.ts` — Shared type system: ContentOntologyConfig, ContentCollection, SolutionStack
- `src/lib/ontologyRegistry.ts` — Central registry + cross-type relation definitions
- `src/lib/graphUtils.ts` — Generic graph utilities: `buildGraphData()`, `buildGraphDataForType()`, colors, topology
- `src/lib/catalogFormatters.ts` — Shared formatting helpers + `toSkillFamily()`
- `src/components/Layout.tsx` — Header + footer + nav (1,800 lines)
- `src/data/skill-taxonomy.ts` — 10-category skill taxonomy + `classifySkill()` + `SKILL_ONTOLOGY_CONFIG`
- `src/data/mcp-taxonomy.ts` — 9-category MCP taxonomy + `classifyMCP()` + `MCP_ONTOLOGY_CONFIG`
- `src/data/agent-taxonomy.ts` — 8-category agent taxonomy + `classifyAgent()` + `AGENT_ONTOLOGY_CONFIG`
- `src/data/podcast-taxonomy.ts` — 8-category podcast taxonomy + `classifyPodcast()` + `PODCAST_ONTOLOGY_CONFIG`
- `src/data/tool-taxonomy.ts` — 12-category tool taxonomy + `classifyTool()` + `TOOL_ONTOLOGY_CONFIG`
- `src/data/solution-stacks.ts` — Cross-type curated bundles
- `src/components/ContentTypeIcon.tsx` — Premium SVG icons for 5 content types (HTML + raw SVG modes)

## Shared Components (used on 15+ pages)
- `EnterprisePageHero` — Hero section with kicker badge, heading, description, image
- `SectionHeader` — Section title with kicker, heading, description
- `EnterpriseCtaBand` — Dark CTA band at bottom of pages
- `AgentCard` / `MCPCard` / `SkillCard` / `ToolCard` — Catalog listing cards
- `OntologyPageTemplate` — Generic 3-layer SVG ontology page (accepts ContentOntologyConfig)
- `GraphPageTemplate` — Generic ForceGraph2D + controls page (accepts ContentOntologyConfig)
- `CollectionsPageTemplate` — Generic collections listing with search/filter
- `CollectionDetailTemplate` — Generic collection detail + embedded graph
- `CollectionGraph` — Reusable embedded force-graph with legends
- `ContentTypeIcon` / `ContentTypeIconSvg` — Premium SVG icons for all 5 content types (HTML + raw SVG contexts)

## Unified Content Knowledge Graph Platform

### Architecture
- **Platform Ontology** (`/aixcelerator/ontology`) — Meta-level diagram showing all 5 content types with cross-type relationships
- **Ecosystem Graph** (`/aixcelerator/ecosystem`) — Unified force-graph with nodes from ALL content types
- **Solution Stacks** (`/aixcelerator/solution-stacks`) — Cross-type curated bundles
- **Per-Type Ontology** — Each content type has ontology, graph, collections, collection detail pages

### Content Type Pages (4 pages per type using generic templates)
| Type | Ontology | Graph | Collections | Detail Collections |
|------|----------|-------|-------------|-------------------|
| Skills | `/aixcelerator/skills/ontology` | `/aixcelerator/skills/graph` | `/aixcelerator/skills/collections` | `/aixcelerator/skills/collections/[slug]` |
| MCPs | `/aixcelerator/mcp/ontology` | `/aixcelerator/mcp/graph` | `/aixcelerator/mcp/collections` | `/aixcelerator/mcp/collections/[slug]` |
| Agents | `/aixcelerator/agents/ontology` | `/aixcelerator/agents/graph` | `/aixcelerator/agents/collections` | `/aixcelerator/agents/collections/[slug]` |
| Tools | `/aixcelerator/tools/ontology` | `/aixcelerator/tools/graph` | `/aixcelerator/tools/collections` | `/aixcelerator/tools/collections/[slug]` |
| Podcasts | `/resources/podcasts/ontology` | `/resources/podcasts/graph` | `/resources/podcasts/collections` | `/resources/podcasts/collections/[slug]` |

### Ontology Framework
- **Type System:** `src/lib/ontologyTypes.ts` — ContentOntologyConfig, TaxonomyCategory, CrossTypeRelation, ContentCollection, SolutionStack
- **Registry:** `src/lib/ontologyRegistry.ts` — Maps ContentTypeName → config, defines 8 cross-type relations, CONTENT_TYPE_META
- **Graph Utils:** `src/lib/graphUtils.ts` — Generic `buildGraphData()` with callback-based classification, backward-compatible with skills
- **CMS Helpers:** `src/lib/cms.ts` — `fetch{MCP|Agent|Podcast|Tool}CategoryCounts()`, `fetchAll{MCP|Agent|Podcast|Tool}Tags()`

### Per-Type Taxonomy
| Type | Categories | Relationship Types | Collection Count |
|------|-----------|-------------------|-----------------|
| Skills | 10 (dev, ai, research, data, business, testing, productivity, security, infra, other) | similar_to, depend_on, compose_with, belong_to | 6+ |
| MCPs | 9 (db, communication, dev-tools, ai-ml, cloud, search, file, monitoring, other) | similar_to, interop_with, complement, belong_to | 6 |
| Agents | 8 (code, content, data, research, sales, ops, support, other) | similar_to, chains_with, integrates_with, belong_to | 6 |
| Podcasts | 8 (ai-ml, business, tech, data, education, industry, product, other) | similar_to, sequel_to, references, belong_to | 6 |
| Tools | 12 (communication, database, storage, developer, analytics, ai-ml, crm, marketing, productivity, search, cloud, other) | similar_to, used_with, replaces, belong_to | 5 |

### Cross-Type Relationships (Platform Level)
- Agent → Skill: USES
- Agent → MCP: CONNECTS_VIA
- MCP → Tool: PROVIDES
- Skill → Tool: IMPLEMENTED_BY
- Podcast → Agent/MCP/Skill/Tool: DISCUSSES

### Skills-Specific (Original SkillNet Implementation)
- **Import Scripts:** `scripts/import-clawhub-skills.mjs`, `scripts/import-ultimate-skills.mjs`, `scripts/import-anthropic-skills.mjs`, `scripts/import-github-skills.mjs`, `scripts/generate-collections.mjs`
- **Skill Detail Mini-Graph:** `src/pages/aixcelerator/skills/[slug].tsx` — sidebar neighborhood graph

## Build & Validation
```bash
npm run build        # Full production build — must pass with 0 errors
npm run lint         # ESLint check
npx tsc --noEmit     # TypeScript type check (no emit)
npm run dev          # Local dev server
```

## Security Agents
Seven specialized security agents in `.claude/agents/` for continuous security auditing:

| Agent | File | Purpose |
|-------|------|---------|
| Secrets Scanner | `security-secrets.md` | Find leaked API keys, tokens, committed `.env` files, `NEXT_PUBLIC_` exposure |
| Input Sanitization | `security-input.md` | Audit XSS, email injection, CSP headers, `dangerouslySetInnerHTML` |
| Rate Limiting | `security-ratelimit.md` | Check all API routes for rate limits, IP spoofing, brute force protection |
| Auth Architecture | `security-auth.md` | Audit admin route auth, localhost bypass, timing-safe comparisons |
| API Security | `security-api.md` | CORS config, security headers, error leakage, SSRF prevention |
| File Uploads | `security-uploads.md` | Upload validation, path traversal, MIME type checks |
| Dependencies | `security-deps.md` | `npm audit`, Dockerfile hardening, supply chain risks |

## Spec-Driven Development (SDD)

Every non-trivial feature follows a 4-phase workflow: **Specify → Plan → Tasks → Implement**.

### Architecture
- **`Constitution.md`** — Immutable architectural principles (tech stack, design system, page structure, quality gates). No spec can override.
- **`specs/`** — One directory per feature containing spec.md, plan.md, tasks.md, and optional detail files.
- **`specs/_templates/`** — Templates for each document type (spec, plan, tasks, verification).

### SDD Agents (in `.claude/agents/`)
| Agent | File | Phase | Purpose |
|-------|------|-------|---------|
| Spec Writer | `spec-writer.md` | Specify | Translate feature requests into detailed specs (WHAT + WHY) |
| Tech Planner | `spec-planner.md` | Plan | Generate implementation plans from specs (HOW) |
| Task Decomposer | `spec-tasks.md` | Tasks | Break plans into small, reviewable tasks (1-3 files each) |
| Spec Reviewer | `spec-reviewer.md` | Review | Validate quality, completeness, Constitution compliance |

### Workflow
1. `@spec-writer` creates `specs/{feature}/spec.md` — user stories, acceptance criteria, edge cases
2. `@spec-planner` creates `specs/{feature}/plan.md` — architecture, file changes, testing strategy
3. `@spec-tasks` creates `specs/{feature}/tasks.md` — numbered tasks assigned to implementation agents
4. Implementation agents (`@frontend-dev`, `@testing`, etc.) execute tasks one at a time
5. `@spec-reviewer` validates any document for quality and cross-document consistency

See `specs/README.md` for the full guide.

## Git
- **Branch:** `dev`
- **Remote:** https://github.com/saitejesh-cyber/colaberry-ai-fork
