# Components Directory

38+ React components, all PascalCase `.tsx` files.

## Generic Page Templates (SkillNet Pattern)

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

- **Cards:** Use `.catalog-card` CSS class, 1px border, no hover lift, no glassmorphism
- **Buttons:** Always pill-shaped (`rounded-full`), no `translateY` hover
- **Colors:** Zinc scale only + coral `#DC2626` for CTAs. Forbidden: emerald, blue, amber, slate
- **Dark mode:** Every component must have `dark:` Tailwind variants
- **Icons:** Use `ContentTypeIcon` — never emoji in production pages

## Animation Rules

- Duration: 0.4s, translateY: 12px, easing: `cubic-bezier(0.16, 1, 0.3, 1)`
- **NEVER** nest `.reveal-scale` or `.stagger-grid` inside a `.reveal` parent — IntersectionObserver only observes top-level elements

## Graph Components

- Use `react-force-graph-2d` via `next/dynamic` (no SSR)
- Canvas glow: always `ctx.save()` / `ctx.restore()` to isolate shadow state
- Use `hexToRgba()` helper for alpha blending — never `hex + "66"` suffix
- Curved edges: `linkCurvature={0.15}`, directional particles for animated flow

## SVG Ontology Diagrams

- viewBox `940x680`, category nodes `140x36`, central pill `120x38`
- `feDropShadow` filters for node shadows
- Font scale: layer labels 11px/700, category nodes 11.5px/600, minimum 9.5px (tags only)
- Category nodes use `config.categoryColors` with opacity fills (0.06 default, 0.15 hover)

---

See root `CLAUDE.md` for full design system and `Constitution.md` for immutable principles.
