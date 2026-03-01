# Master UI/UX Prompt — Colaberry AI Platform

## Context

A comprehensive, reusable UI/UX master prompt that any engineer or AI can use to maintain Substack-level polish across the entire Colaberry AI platform. This document captures the design system, patterns, rules, and quality standards established across 35+ pages and 27 components.

---

## 1. Brand Identity — "Midnight Coral"

### Color Philosophy
| Role | Light | Dark | Usage |
|------|-------|------|-------|
| **Primary (Coral)** | `#DC2626` | `#F87171` | CTAs, active states, brand accents, links |
| **Accent (Emerald)** | `#059669` | `#10B981` | Success, verified, trust signals |
| **Ink** | `#111827` | `#F9FAFB` | Primary text, headlines |
| **Surface** | `#FAF9F6` | `#111827` | Page backgrounds |
| **Muted** | `#6B7280` | `#9CA3AF` | Secondary text, metadata |
| **Stroke** | `#E5E7EB` | `#374151` | Borders, dividers |
| **Error** | `#9D174D` | `#F9A8D4` | Validation errors, failures |

### Semantic Token Families
- **`pivot-*`** (coral): Primary actions, in-progress states, brand highlights
- **`trusted-*`** (emerald): Success, verified, live status badges
- **`failure-*`** (pink): Errors, risk indicators
- **`neutral-*`** (gray): Default surfaces, secondary text, borders

### Typography
| Scale | Size | Family | Usage |
|-------|------|--------|-------|
| `display-2xl` | 4.5rem | PT Serif (`font-display`) | Hero headlines (rare) |
| `display-xl` | 3.75rem | PT Serif | Page hero titles (rare) |
| `display-lg` | 3rem | PT Serif | Major section titles |
| `display-md` | 2.25rem | PT Serif | Page titles (most pages) |
| `display-sm` | 1.875rem | PT Serif | Section subtitles |
| `display-xs` | 1.5rem | PT Serif | Card headings, featured items |
| `body-lg` | 1.125rem | Source Sans | Lead paragraphs |
| `body-md` | 1rem | Source Sans | Body text (default) |
| `body-sm` | 0.875rem | Source Sans | Metadata, descriptions |
| `body-xs` | 0.75rem | Source Sans | Fine print, timestamps |
| `label` | 0.6875rem | Source Sans | Kickers, uppercase labels (tracking: 0.14em) |

**Rule**: Headlines use `font-display` (PT Serif). Body text uses default sans (Source Sans). Never mix — a title should not be sans-serif, a paragraph should not be serif.

### Spacing Rhythm
- Base unit: **4px** (Tailwind's `1` = 0.25rem)
- Section gaps: `4rem` (sm) → `5rem` (md) → `6rem` (lg) via `.section-spacing`
- Card padding: `p-4` (16px) for compact, `p-5` (20px) for sidebar, `p-6` (24px) for sections
- Content max-width: `max-w-7xl` (56rem / 896px)
- Responsive padding: `px-4 sm:px-6` (16px → 24px)

### Border Radius
- Chips/badges: `rounded-md` (0.5rem)
- Buttons: `rounded-md` (0.375rem) via `.btn`
- Cards: `rounded-xl` (1rem) via `--radius-xl`
- Panels: `rounded-xl` (1rem) via `.surface-panel`
- Images: `rounded-xl` (1rem) or `rounded-lg` (0.75rem)

### Shadows
- `--shadow-sm`: Resting state (cards, panels)
- `--shadow-md`: Hover state (card hover, dropdown)
- `--shadow-lg`: Elevated state (modals, popovers)
- `--shadow-xl`: Maximum elevation (full-screen overlays)

### Transitions
- **150ms** (`--transition-fast`): Micro-interactions (focus rings, color changes)
- **300ms** (`--transition-base`): Standard hover effects, card lift
- **500ms** (`--transition-slow`): Page transitions, reveal animations
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` for all UI motion

---

## 2. Component Library

### Buttons
| Class | When to use | Light | Dark |
|-------|-------------|-------|------|
| `.btn-primary` | Default actions | Charcoal bg, white text | White bg, charcoal text |
| `.btn-cta` | High-priority CTAs | Coral bg, white text | Light coral bg, dark text |
| `.btn-secondary` | Alternative actions | White bg, charcoal border | Dark bg, gray border |
| `.btn-ghost` | Tertiary actions | Gray bg, subtle border | Dark gray bg, subtle border |
| `.btn-sm` | Compact buttons | Smaller padding, uppercase | Same |
| `.btn-compact` | Inline buttons | Minimal padding | Same |
| `.btn-icon` | Icon-only (36×36px) | Square, no padding | Same |

**Button rules**:
- Always pair CTA with a secondary alternative
- Minimum hit target: 44×44px on mobile (`min-h-[44px]`)
- Loading state: change text, disable, show spinner
- Focus: `0 0 0 3px var(--stroke-focus)` ring

### Cards
| Class | When to use |
|-------|-------------|
| `.card-elevated` | Standard content cards (episodes, articles, catalog items) |
| `.card-feature` | Featured content with overflow-hidden |
| `.card-glass` | Transparent/glassmorphism cards |
| `.catalog-card` | Catalog items (agents, skills, MCPs) with metadata badges |
| `.section-card` | Section containers with hover lift |

**Card rules**:
- Hover: `border-color: var(--pivot-stroke)` + `box-shadow: var(--shadow-md)` — NO translateY lift on cards (only on `.hover-lift`)
- Never nest cards inside cards
- Always have a clear click target (Link wrapping or button)

### Chips & Badges
| Class | When to use |
|-------|-------------|
| `.chip` | Default tag/category chip |
| `.chip-brand` | Primary brand chip (coral border) |
| `.chip-muted` | Secondary/subtle chip |
| `.badge-verified` | Trust/verified signal (green) |
| `.badge-external` | External source (coral) |
| `.badge-beta` | Beta/experimental (amber) |
| `.badge-private` | Private/restricted (gray) |

### Surfaces
| Class | When to use |
|-------|-------------|
| `.surface-panel` | Sidebar panels, info boxes |
| `.hero-surface` | Hero image containers with gradient overlay |
| `.section-shell` | Glass-effect section containers |
| `.section-card` | Clickable section containers |

### State Indicators
- **`<StatePanel>`** for all loading/empty/error states:
  - `variant="error"`: Red icon, error message
  - `variant="empty"`: Neutral icon, empty state message
  - Always provide `title` + `description`
  - Optional `action` button for recovery

---

## 3. Page Layout Patterns

### Standard Page Structure
```
<Layout>
  <Head> (SEO tags, structured data)
  <EnterprisePageHero> OR compact header
  <section> Main content area
  <EnterpriseCtaBand> (optional CTA section)
</Layout>
```

### Hero Patterns (choose one per page)

**Pattern A — `<EnterprisePageHero>`** (most pages):
- Kicker badge (coral, with green dot) + H1 title + description
- Optional image panel (right side on desktop)
- Optional chips, metrics, action buttons
- Use for: catalog pages, resource indexes, solutions, industries

**Pattern B — Compact header** (content-heavy pages):
- Simple H1 title + optional subtitle/controls
- Use for: podcast listing, search, detail pages

**Pattern C — No hero** (utility pages):
- Direct content without hero section
- Use for: legal pages, unsubscribe, internal tools

### Two-Column Sidebar Layout
Used on detail pages and podcast listing:
```
lg:grid lg:grid-cols-[minmax(0,1fr)_300-360px] lg:gap-6-8 lg:items-start
```
- Left: Main content (flexible width)
- Right: `<aside>` with `.surface-panel lg:sticky lg:top-24`
- Mobile: Sidebar hidden (`hidden lg:block`)

### Catalog Layout
Used for agents, skills, MCPs, use cases:
```
<EnterprisePageHero>
<CatalogSearchBox>
Filter controls (chips/dropdowns)
Grid: sm:grid-cols-2 lg:grid-cols-3
Infinite scroll sentinel
```

---

## 4. Interaction Patterns

### Forms
- **Validation**: Progressive — show errors only after field is touched (blur)
- **Loading**: Button text changes + disabled state
- **Success**: Replace form with success panel or show inline message
- **Error**: Inline field errors with `aria-invalid` + `aria-describedby`
- **Required fields**: `*` indicator + validation on submit
- **Consent**: Checkbox required before submission (newsletter, demos)

### Navigation
- **Header**: 72-82px height, compacts on scroll >100px
- **Dropdowns**: Click to open (not hover), close on outside click
- **Workspace sidebar**: Collapsible (Cmd+B), 272px expanded / 88px collapsed
- **Breadcrumbs**: On detail pages, show path back to parent
- **Active state**: Coral underline/background on current nav item

### Animations
- **Entrance**: `.reveal` class + IntersectionObserver → `.revealed` triggers `reveal-up`
- **Stagger**: `.stagger-grid.revealed > *` with nth-child delays (0.06s increments)
- **Cards**: Rise-in on mount (`.rise-in` + `.rise-delay-N`)
- **Reduced motion**: All animations disabled via `prefers-reduced-motion: reduce`

### Audio/Media
- **Inline playback**: Hidden `<audio>` element at page level, play/pause via state
- **Play button**: Always visible on artwork (glass effect: `bg-white/90 backdrop-blur-sm`)
- **Duration badge**: Clock icon + time text overlay on artwork
- **Player embed**: Lazy-loaded via IntersectionObserver + requestIdleCallback

---

## 5. Dark Mode Rules

### Strategy
1. CSS custom properties on `:root` (light) and `.dark` (dark)
2. Tailwind `dark:` prefix for component-specific overrides
3. `localStorage.getItem("theme")` persisted, toggled in header

### Key Mappings
| Light | Dark | Element |
|-------|------|---------|
| `#FAF9F6` (warm white) | `#111827` (navy) | Page background |
| `#1F2937` (charcoal) | `#F9FAFB` (near white) | Primary text, btn-primary bg |
| `#DC2626` (coral) | `#F87171` (light coral) | CTA buttons, brand accents |
| `#E5E7EB` (light gray) | `#374151` (dark gray) | Borders, dividers |
| `rgba(240,244,251,0.92)` | `rgba(15,27,48,0.86)` | Section shells (glass) |

### Rules
- Every foreground color needs a `dark:` counterpart
- Shadows deepen in dark mode (higher opacity)
- Borders lighten slightly (rgba white channels)
- Images: Apply `brightness(0.92) contrast(1.05)` in dark mode for embeds
- Never use pure white `#FFFFFF` text in dark mode — use `#F9FAFB` or `#E2E8F0`

---

## 6. Responsive Design Rules

### Breakpoints
| Name | Width | Usage |
|------|-------|-------|
| **Mobile** | <640px | Single column, stacked layout |
| **sm** | ≥640px | Two-column grids, wider forms |
| **lg** | ≥1024px | Three-column grids, sidebar visible |
| **xl** | ≥1280px | Maximum content width, spacious layout |

### Mobile-First Rules
- Default styles are mobile (single column, stacked)
- Add complexity with `sm:`, `lg:`, `xl:` prefixes
- Touch targets: minimum 44×44px
- Sidebar: hidden on mobile, visible on lg+
- Hero image: hidden or full-width stacked on mobile
- Font scaling: `text-sm sm:text-base lg:text-lg`

---

## 7. Accessibility Standards

### ARIA Patterns
- Forms: `aria-invalid`, `aria-describedby` for errors
- Modals: `role="dialog"`, `aria-modal="true"`, focus trap
- Live regions: `aria-live="polite"` for async updates
- Navigation: `aria-current="page"` for active items
- Buttons vs Links: Use `<button>` for actions, `<Link>` for navigation

### Keyboard
- `Tab` cycles through interactive elements
- `Escape` closes modals, dropdowns, search
- `Cmd+K` opens search dialog
- `Cmd+B` toggles workspace sidebar
- Skip-to-content link at top of page

### Color Contrast
- Text on surfaces: minimum 4.5:1 ratio
- Large text (18px+ bold or 24px+): minimum 3:1 ratio
- Interactive elements: 3:1 against adjacent colors
- Focus rings: `var(--stroke-focus)` with 3px spread

---

## 8. SEO & Performance

### SEO Checklist (per page)
- `<title>` tag with page context + "| Colaberry AI"
- Meta description (120-160 chars)
- Canonical URL
- Open Graph tags (title, description, image, type)
- Twitter Card (summary_large_image)
- Structured data (JSON-LD): ItemList, BreadcrumbList, Organization
- Semantic headings (single H1, hierarchical H2-H4)

### Performance
- Images: Next.js `<Image>` with `sizes` prop, `quality={90}`, `unoptimized` only for external
- Lazy loading: IntersectionObserver for below-fold content
- Dynamic imports: `next/dynamic` with `ssr: false` for modals, banners
- Deferred scripts: `requestIdleCallback` for non-critical embeds
- Infinite scroll: 24 items per page, sentinel-based loading

---

## 9. Quality Checklist (for every change)

### Before submitting
- [ ] TypeScript: `npx tsc --noEmit` — zero errors
- [ ] Build: `npm run build` — all routes clean
- [ ] Dark mode: Every new element has dark mode styles
- [ ] Mobile: Layout stacks/adapts correctly below 640px
- [ ] Accessibility: ARIA attributes on interactive elements
- [ ] Focus states: Visible focus rings on all interactive elements
- [ ] Loading states: Skeleton or StatePanel while data loads
- [ ] Error states: Graceful fallback when data unavailable
- [ ] Animations: Respects `prefers-reduced-motion`
- [ ] No hardcoded colors: Use CSS variables or Tailwind brand tokens
- [ ] No orphaned imports: Remove unused imports after refactoring
- [ ] Consistent patterns: Matches established component patterns in this doc

---

## 10. File Reference

### Critical Paths
| File | Purpose |
|------|---------|
| `src/styles/globals.css` | All CSS custom properties, component classes, animations |
| `tailwind.config.ts` | Brand colors, fonts, spacing, animations |
| `src/components/Layout.tsx` | Root shell (header, nav, sidebar, footer) |
| `src/components/EnterprisePageHero.tsx` | Standard page hero pattern |
| `src/components/EnterpriseCtaBand.tsx` | Dark CTA band pattern |
| `src/components/SectionHeader.tsx` | Section title component |
| `src/components/StatePanel.tsx` | Loading/empty/error states |
| `src/components/NewsletterSignup.tsx` | Newsletter form (compact/full) |
| `src/components/PremiumMediaCard.tsx` | Featured content cards |
| `src/components/AgentCard.tsx` | Catalog card pattern |
| `src/components/MCPCard.tsx` | Catalog card pattern |
| `src/components/CatalogSearchBox.tsx` | Catalog search input |
| `src/lib/seo.ts` | SEO tag generation utilities |
| `src/lib/tracking.ts` | UTM/referrer tracking utilities |
| `src/lib/cms.ts` | CMS data fetching and type definitions |

### Page Count by Section
| Section | Pages | Pattern |
|---------|-------|---------|
| Homepage | 1 | Custom layout |
| Resources | 10 | EnterprisePageHero + grids |
| AIXcelerator | 7 | EnterprisePageHero + catalog |
| Industries | 2 | EnterprisePageHero/custom |
| Solutions/Use Cases | 3 | EnterprisePageHero + catalog |
| Other (assistant, search, demo, updates) | 4 | Mixed |
| Legal/Utility | 4 | Minimal |
| Internal | 2 | Admin dashboard |
| **Total** | **33** | |
