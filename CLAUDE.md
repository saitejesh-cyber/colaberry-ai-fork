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
- **Animations:** 0.4s duration, 12px translateY, `cubic-bezier(0.16, 1, 0.3, 1)` easing
- **Header:** Fixed 64px height

### Dark Mode
- Toggle: `.dark` class on `<html>`, persisted in localStorage
- CSS vars swap between `:root` and `.dark` blocks in `globals.css`
- Components use `dark:` Tailwind variants for additional overrides

## Project Structure
```
src/
├── components/     # 30 React components (incl. SkillCard, CollectionGraph)
├── pages/          # 33+ pages (Pages Router, incl. skills/graph, skills/collections/[slug])
├── styles/         # globals.css (design tokens + component classes)
├── lib/            # 14 utility modules (cms.ts, seo.ts, catalogFormatters.ts, etc.)
├── data/           # Static data (agents.json, mcps.json, skill-taxonomy.ts, skill-collections.ts)
└── hooks/          # Custom React hooks
```

## Key Files
- `src/styles/globals.css` — ALL CSS custom properties and component classes
- `tailwind.config.ts` — Zinc color scale, Inter fonts, animation keyframes
- `src/pages/_app.tsx` — Font loading (Inter), global layout wrapper
- `src/lib/cms.ts` — CMS fetch functions, TypeScript types, `fetchRelatedSkills()`, `fetchSkillCategoryCounts()`, `fetchAllSkillTags()`
- `src/lib/catalogFormatters.ts` — Shared formatting helpers + `toSkillFamily()`
- `src/lib/graphUtils.ts` — Shared graph utilities: `buildGraphData()`, `CATEGORY_COLORS`, `RELATIONSHIP_TYPE_COLORS`, `computeConvexHull()`, `topologicalSort()`
- `src/components/Layout.tsx` — Header + footer + nav (1,750 lines)
- `src/data/skill-taxonomy.ts` — 10-category SkillNet-inspired taxonomy + `classifySkill()`
- `src/data/skill-collections.ts` — Curated + auto-generated skill bundles (extended type with `keywordTags`, `linkCount`, `generated`)
- `src/data/generated-collections.json` — Build-time generated collections from CMS data

## Shared Components (used on 15+ pages)
- `EnterprisePageHero` — Hero section with kicker badge, heading, description, image
- `SectionHeader` — Section title with kicker, heading, description
- `EnterpriseCtaBand` — Dark CTA band at bottom of pages
- `AgentCard` / `MCPCard` / `SkillCard` — Catalog listing cards (reusable components)

## Skills Ontology (SkillNet-inspired — Premium)
- **Taxonomy:** 10-category classification in `src/data/skill-taxonomy.ts` (Development, AI & Generation, Research, Data & Science, Business, Testing & QA, Productivity, Security, Infrastructure, Other)
- **Collections:** 6 curated + auto-generated bundles in `src/data/skill-collections.ts` with `keywordTags`, `linkCount`, `generated` fields. Script: `scripts/generate-collections.mjs` clusters by tag co-occurrence
- **Related Skills:** `fetchRelatedSkills()` in `src/lib/cms.ts` — ranks by shared tags, category, industry, skillType
- **Graph Visualization (Premium):** `src/pages/aixcelerator/skills/graph.tsx` — 500 skills, color-coded edges by 4 relationship types, search + zoom-to-node, edge type filtering checkboxes, fullscreen mode, animated directional particles on depend_on edges, dual legend (nodes + edges)
- **Ontology Page (Interactive):** `src/pages/aixcelerator/skills/ontology.tsx` — interactive SVG 3-layer diagram with live CMS data (category counts, tag cloud), clickable nodes linking to catalog/detail/collection pages, architecture explanation cards with live stats
- **Collections Page (Searchable):** `src/pages/aixcelerator/skills/collections/index.tsx` — search bar, category filter pills, enriched cards with keyword tags + "+N more" truncation
- **Graph Utilities:** `src/lib/graphUtils.ts` — `buildGraphData()` computes all 4 relationship types, `CATEGORY_COLORS`, `RELATIONSHIP_TYPE_COLORS`, `computeConvexHull()`, `topologicalSort()`, `countLinksByType()`
- **Collection Detail (Interactive):** `src/pages/aixcelerator/skills/collections/[slug].tsx` — embedded force-graph of collection skills with labeled relationship edges, skill pipeline flow visualization, keyword tag chips
- **Skill Detail Mini-Graph:** `src/pages/aixcelerator/skills/[slug].tsx` — sidebar "Skill Neighborhood" mini-graph showing current skill + 4 related skills with color-coded relationship edges, click-to-navigate
- **CollectionGraph Component:** `src/components/CollectionGraph.tsx` — reusable embedded force-graph with configurable height, labels, highlight, click callbacks, relationship legend
- **Relationship Types:** similar_to, depend_on, compose_with, belong_to (SkillNet ontology model)
- **Import Scripts:** `scripts/import-clawhub-skills.mjs`, `scripts/import-ultimate-skills.mjs`, `scripts/import-anthropic-skills.mjs`, `scripts/import-github-skills.mjs`, `scripts/generate-collections.mjs`

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

## Git
- **Branch:** `dev`
- **Remote:** https://github.com/saitejesh-cyber/colaberry-ai-fork
