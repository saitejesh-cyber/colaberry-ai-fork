# Components Directory

38+ React components, all PascalCase `.tsx` files.

## Generic Page Templates (3-Layer Ontology Pattern)

All 5 content types use these templates with a `ContentOntologyConfig`:

| Template | Purpose |
|----------|---------|
| `OntologyPageTemplate` | 3-layer SVG ontology diagram |
| `GraphPageTemplate` | ForceGraph2D + controls |
| `CollectionsPageTemplate` | Collections listing with search/filter |
| `CollectionDetailTemplate` | Collection detail + embedded graph |

## Shared Components (used on 15+ pages)

- `EnterprisePageHero` — Hero with kicker badge, heading, description, image
- `SectionHeader` — Section title with kicker, heading, description
- `EnterpriseCtaBand` — Dark CTA band at page bottom
- `ContentTypeIcon` / `ContentTypeIconSvg` — Premium SVG icons for 5 content types (never use emoji)
- `CollectionGraph` — Reusable embedded force-graph with legends
- `AgentCard`, `MCPCard`, `SkillCard`, `ToolCard` — Per-type catalog listing cards

## Rules

- **Cards:** Use `.catalog-card` CSS class, 1px border, **2px soft-UI micro-lift on hover** (`translate3d(0, -2px, 0) + var(--shadow-lg)`), no glassmorphism
- **Buttons:** Always pill-shaped (`rounded-full`), **2px micro-lift on hover** (`translate3d(0, -2px, 0) scale(1.008)`), 0.995 scale on `:active` with 80ms transition
- **Colors:** Zinc scale only + coral `#DC2626` for CTAs. Forbidden: emerald, blue, amber, slate
- **Dark mode:** Every component must have `dark:` Tailwind variants
- **Icons:** Use `ContentTypeIcon` — never emoji in production pages

## Animation Rules

- **Entry / reveal:** duration 0.4s, translateY 12px, easing `--ease-entry` (`cubic-bezier(0.22, 1, 0.36, 1)`)
- **Soft-UI hover / press:** easing `--ease-soft-ui` (`cubic-bezier(0.4, 0, 0.2, 1)`) — zero overshoot, right for all interaction feedback
- **Magnetic springs:** easing `--ease-magnetic` (`cubic-bezier(0.34, 1.56, 0.64, 1)`) — pointer-reactive CTAs ONLY, never content
- **Exit transitions:** easing `--ease-exit` (`cubic-bezier(0.64, 0, 0.78, 0)`)
- **Never hard-code a cubic-bezier** — always reference a CSS variable from the tokens above
- **Framer Motion:** `_app.tsx` wraps everything in `<LazyMotion features={domAnimation} strict>`. Import `{ m, useScroll, useTransform, useReducedMotion } from "framer-motion"` — use lowercase `m.*` not `motion.*` (smaller bundle)
- **`prefers-reduced-motion`:** a global guard in `globals.css` collapses all keyframe/transition durations + nukes reveal transforms. Framer Motion components must additionally respect `useReducedMotion()` — the `.hero-graph-bloom` pulse and parallax translations both do
- **NEVER** nest `.reveal-scale` or `.stagger-grid` inside a `.reveal` parent — IntersectionObserver only observes top-level elements

### Reveal System

The IntersectionObserver in `Layout.tsx` observes these classes and adds `.revealed`:
- `.reveal` — baseline fade + translateY
- `.reveal-left`, `.reveal-right`, `.reveal-scale` — directional / scale variants
- `.reveal-wipe` — **editorial clip-path wipe** (left-to-right, 1.1s, `cubic-bezier(0.77, 0, 0.175, 1)`). Reserved for flagship H2s. Opt-in via `<SectionHeader wipeTitle />` — keeps the underlying text crawlable pre-hydration.
- `.stagger-grid` — cascaded grid entry

## Sprint v5 Kinetic-Pacing Components

- **`HeroGraphBloom`** — SVG "coded motion" graph constellation (25 nodes, 20+ edges). Uses `<m.line>` with `pathLength: 0 → 1` for stroke-trace entry, then staggered `<m.circle>` fade-ins. Center node = coral; primaries white; secondaries muted zinc. Deterministic seeded positions (SSR-safe). Mounts in `/pages/index.tsx` hero (replaces legacy `.hero-orb-*`).
- **`KineticHeading`** — Line-mask word-by-word reveal (110% y-offset, 0.9s, 0.08s stagger). Server-renders the plain `text` prop via an `sr-only` span so AEO crawlers still see the full copy. Accepts `children` for appended content (e.g. the hero word rotator sits as a child of the H1).

### Site-wide Kinetic-Pacing Rollout (Sprint v5.1)

The kinetic-pacing treatment is applied site-wide, not just the homepage. Two shared components are the single lever for ~45 pages:

- **`SectionHeader`** — when `as="h1"` (and not `wipeTitle`), the title is rendered through `KineticHeading` automatically. The `rd1` className (reveal / reveal-delay-1) is forwarded so the IntersectionObserver cascade still participates. This covers **~29 pages** that use `<SectionHeader as="h1" />` as their page H1 with a single edit. `h2`/`h3` headings keep the plain `<HeadingTag>` path so `.reveal-wipe` (editorial clip-path) stays reserved for flagship H2s.
- **`EnterprisePageHero`** — carries three scroll-linked parallax layers (grain `z-[-30]`, radial mesh `z-[-20]`, coral punch `z-[-10]`) inside a `relative isolate overflow-hidden` section wrapper, with magnitudes `grainY ±10`, `meshY ±32`, `coralY ±30` (lighter than the homepage PlatformTabsSection since page heroes scroll in different viewport positions). The H1 is rendered via `KineticHeading` with `duration=0.9, stagger=0.08`. This covers **~16 detail/listing pages** that mount `<EnterprisePageHero />` as their top hero.

Raw-`<h1>` pages that sit outside the two shared components are wired individually: `src/pages/resources/podcasts/index.tsx`, `src/pages/resources/podcasts/[slug].tsx` (tighter pacing: `duration=0.7, stagger=0.05` for shorter episode titles), `src/pages/privacy-policy.tsx`, `src/pages/cookie-policy.tsx`. `demo/lens.tsx` and `brand-preview.tsx` are intentionally skipped (low-priority utility surfaces).

All KineticHeading mounts respect `useReducedMotion()` — under reduced-motion the plain title renders in a single static `<Tag>`, and the parallax `useTransform` ranges collapse to `[0, 0]` so no y-drift happens.

## Graph Components

- Use `react-force-graph-2d` via `next/dynamic` (no SSR)
- Canvas glow: always `ctx.save()` / `ctx.restore()` to isolate shadow state
- Use `hexToRgba()` helper for alpha blending — never `hex + "66"` suffix
- Curved edges: `linkCurvature={0.15}`, directional particles for animated flow

## SVG Ontology Diagrams

**Full-page ontology** (`OntologyPageTemplate`):
- Dynamic viewBox width computed from widest category row; height auto from layer count
- Flat enterprise design — NO feDropShadow, no blur, no glow, no animated dashes
- Three layers: Taxonomy → Relation Graph → Collections, separated by text+line headers with chevron arrows
- Dynamic category node sizing: `charWidth=6.2, padX=24, height=32, gap=10`
- Category nodes use `config.categoryColors` with opacity fills (0.06 default, 0.15 hover)
- Font: `var(--font-inter), Inter, system-ui, sans-serif` for SSR-safe Next.js font inheritance
- `useIsDark()` initializes with `useState(false)` to prevent SSR hydration mismatch

**Mini taxonomy diagram** (`MiniOntologyDiagram`):
- Flat bordered card — no glassmorphism, no backdrop-blur, no feDropShadow
- viewBox `420×dynamic`, hub pill `120x44`, category nodes `30px` height
- Solid thin bezier connection lines (0.75px default, 1.5px hover)
- Zinc-monochrome palette: `surfaceFill` for nodes, `lineStroke` for connections
- Category color accent dots (3px radius) with `config.categoryColors`
- CSS: `.mini-ontology-card` (flat bordered card), `.mini-ontology-explore-link` (hover-reveal pill)
- Hover: category color tint fill + highlighted connection line

---

See root `CLAUDE.md` for full design system and `Constitution.md` for immutable principles.
