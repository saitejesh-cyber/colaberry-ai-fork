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

### Dark Mode
- Toggle: `.dark` class on `<html>`, persisted in localStorage
- CSS vars swap between `:root` and `.dark` blocks in `globals.css`
- Components use `dark:` Tailwind variants for additional overrides

### Locked Theming Standard (MUST follow for ALL pages)

**Theming is locked and finalized.** All existing pages follow this standard. All future pages must match.

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
├── components/     # 38 React components (see src/components/CLAUDE.md)
├── pages/          # 53+ pages (see src/pages/CLAUDE.md)
├── styles/         # globals.css (design tokens + component classes)
├── lib/            # 16 utility modules (see src/lib/CLAUDE.md)
├── data/           # Static data files (see src/data/CLAUDE.md)
└── hooks/          # Custom React hooks
```

## Key Files
- `src/styles/globals.css` — ALL CSS custom properties and component classes
- `tailwind.config.ts` — Zinc color scale, Inter fonts, animation keyframes
- `src/pages/_app.tsx` — Font loading (Inter), global layout wrapper
- `src/lib/cms.ts` — CMS fetch functions, TypeScript types, per-type helpers
- `src/lib/ontologyTypes.ts` — Shared type system: ContentOntologyConfig, ContentCollection, SolutionStack
- `src/lib/ontologyRegistry.ts` — Central registry + cross-type relation definitions
- `src/lib/graphUtils.ts` — Generic graph utilities: `buildGraphData()`, colors, topology
- `src/components/Layout.tsx` — Header + footer + nav (1,800 lines)
- `src/components/ContentTypeIcon.tsx` — Premium SVG icons for 5 content types

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
| Secrets Scanner | `security-secrets.md` | Find leaked API keys, tokens, committed `.env` files |
| Input Sanitization | `security-input.md` | Audit XSS, email injection, CSP headers |
| Rate Limiting | `security-ratelimit.md` | Check API routes for rate limits, brute force protection |
| Auth Architecture | `security-auth.md` | Audit admin route auth, timing-safe comparisons |
| API Security | `security-api.md` | CORS config, security headers, error leakage |
| File Uploads | `security-uploads.md` | Upload validation, path traversal, MIME type checks |
| Dependencies | `security-deps.md` | `npm audit`, Dockerfile hardening, supply chain risks |

## Spec-Driven Development (SDD)

Every non-trivial feature follows a 4-phase workflow: **Specify → Plan → Tasks → Implement**.

- **`Constitution.md`** — Immutable architectural principles. No spec can override.
- **`specs/`** — One directory per feature containing spec.md, plan.md, tasks.md.
- **SDD Agents:** `@spec-writer` (Specify), `@spec-planner` (Plan), `@spec-tasks` (Tasks), `@spec-reviewer` (Review)

See `specs/README.md` for the full workflow guide.

## Claude Code Skills

Reusable workflows in `.claude/skills/`:

| Skill | Purpose |
|-------|---------|
| `/code-review` | Structured review: design system, TypeScript, security, build |
| `/refactor` | Safe refactoring: read → plan → approve → edit → verify |
| `/release` | Pre-deployment checklist: tsc, lint, build, security |
| `/security-audit` | Orchestrate all 7 security agents |
| `/new-page` | Scaffold a new page following all standards |

## Git
- **Branch:** `dev`
- **Remote:** https://github.com/saitejesh-cyber/colaberry-ai-fork

## See Also
- `docs/architecture.md` — System architecture, route map, module map
- `docs/decisions/` — Architecture Decision Records (ADRs)
- `docs/runbooks/` — Deployment, security audit, CMS sync procedures
- `src/{components,pages,lib,data}/CLAUDE.md` — Directory-specific conventions
- `.claude/skills/` — Reusable workflows
- `.claude/agents/` — 16 specialized agents
- `Constitution.md` — Immutable architectural principles
- `tools/prompts/` — Reusable prompt templates
