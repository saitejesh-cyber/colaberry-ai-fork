# Sprint v6 — PRD: Premiumness Foundation (Typography · Grid · Spacing)

**Status:** Planned
**Source plan:** `/Users/colaberry016gmail.com/.claude/plans/snazzy-splashing-fiddle.md`
(Senior Design Strategist audit — Colaberry AI vs. Avenue Code, 2026-04-15)
**Phase:** 1 of 3 (Foundation). Sprint v7 = Motion, Sprint v8 = Finesse.

---

## Overview

Close the typographic and editorial-hierarchy gap between `colaberry.ai` and
premium editorial-agency benchmarks (Avenue Code) **without new dependencies**,
without touching color lock, IA, or copy. Zero JS delta. Ship-first priority
per strategist: biggest perceived-tier lift for the least engineering cost.

Sprint v5 already shipped the motion primitives (`HeroGraphBloom`,
`KineticHeading`, ease tokens, soft-UI micro-lift, reduced-motion guard,
`LazyMotion` wrapper). What's missing is the **foundation underneath the
motion** — OpenType features, a fluid hero scale, weight-contrast headline
system, a real 12-column editorial grid, and a modular vertical rhythm.

---

## Goals

- Hero H1 scales continuously 375px → 1920px via `clamp()`; no breakpoint jumps.
- Editorial weight-contrast visible within one headline (Inter 200 + 800).
- Every homepage + listing section uses a named 12-col grid + `.section-pad-*`
  spacing utility. No more arbitrary `max-w-[90rem]` / `py-10`.
- Metric digits are tabular (no width jump on count-up).
- Inter OpenType features (`ss01`, `cv11`, optical sizing) enabled globally.
- `text-wrap: balance` sweep on `h1`–`h3` site-wide — zero orphans at
  1024/1280/1440.
- AEO sacred: plain HTML contains full hero/section copy (pre-hydration curl
  test passes).
- Color-guard clean: no new `blue-*`, `green-*`, `emerald-*`, `amber-*`,
  `slate-*`. Only zinc + coral `#DC2626`.

---

## User Stories

- As a first-time visitor, I see a headline that fills the viewport with
  deliberate weight-contrast, so the site reads as editorial-premium at a
  glance.
- As a prospect scrolling listings, I feel consistent vertical rhythm across
  every page, so the product feels systematized rather than assembled.
- As a user with a 13" laptop, the hero scales smoothly without awkward
  breakpoint stutters between 1024px and 1440px.
- As an AI crawler (ChatGPT/Claude/Perplexity), I still receive the full hero
  copy in plain HTML before hydration.
- As a user with Reduce Motion enabled, nothing in this sprint introduces new
  motion (Phase 1 is CSS-only).

---

## Technical Architecture

**Stack (unchanged):** Next.js 16 Pages Router · React 19 · Tailwind 4 · CSS
custom properties in `globals.css` · Inter via `next/font/google`.

```
┌───────────────────────────────────────────────────────────────┐
│ tailwind.config.ts                                            │
│   └─ fontSize.hero-fluid: clamp(2.75rem, 8.5vw, 7rem)         │
├───────────────────────────────────────────────────────────────┤
│ src/styles/globals.css                                        │
│   ├─ body { font-feature-settings; font-optical-sizing }      │
│   ├─ .tabular { tnum, lnum, tabular-nums }                    │
│   ├─ .display-thin  { font-weight: 200 }                      │
│   ├─ .display-heavy { font-weight: 800 }                      │
│   ├─ .editorial-grid + .col-editorial-{main,aside,wide,break} │
│   ├─ .section-pad-{sm,md,lg} → var(--section-gap-*)           │
│   └─ h1/h2/h3 { text-wrap: balance }                          │
├───────────────────────────────────────────────────────────────┤
│ src/components/SectionHeader.tsx                              │
│   └─ title wrapper: text-wrap: balance, max-width: 24ch       │
├───────────────────────────────────────────────────────────────┤
│ src/pages/index.tsx                                           │
│   ├─ Hero H1: text-hero-fluid + .display-thin                 │
│   ├─ Rotator span: .display-heavy                             │
│   ├─ Metric digits: .tabular                                  │
│   ├─ Wrap hero in .editorial-grid                             │
│   └─ Each section → .section-pad-{sm|md|lg}                   │
└───────────────────────────────────────────────────────────────┘
```

**Data flow:** None. This sprint is pure CSS + Tailwind config + component
class edits. No fetching, no API, no new runtime cost.

---

## Out of Scope

Explicitly deferred — tracked for v7 / v8:

- **Sprint v7 (Motion):** `MarqueeStrip`, `MagneticButton`, scroll-linked
  kinetic reveals beyond `KineticHeading`, custom ease palette expansion
  (already partially in v5), new reduced-motion paths. From plan Section D,
  items 2.3 / 2.4 / 2.5 / 2.7.
- **Sprint v8 (Finesse):** `BrandPreloader`, `<AnimatePresence>` route
  choreography, glass sticky header via `useScroll`, hero product-mockup WebP
  artifacts, global noise grain overlay moved to `Layout`, 4th elevation stop,
  amplified shadow scale, activation of `--surface-glass` / `--surface-frosted`
  on panels + CTA band. From plan Section E, items 3.1 / 3.2 / 3.3 / 3.4 /
  3.5 / 3.6 / 3.7.
- **Color tokens:** No changes to `--accent-*` or zinc palette.
- **Content / copy / IA:** Untouched.
- **Dark mode parity for new utilities:** Validated in this sprint, but no
  new dark-mode logic added (utilities are color-agnostic).

---

## Dependencies

- **Sprint v5 must be shipped** (it is — per CLAUDE.md: `HeroGraphBloom`,
  `KineticHeading`, ease tokens, `LazyMotion`, reduced-motion guard are live
  on `Release-1.0.beta`).
- **Constitution.md** — color lock still applies; no new hues.
- **No new npm packages.** `package.json` unchanged.

---

## Acceptance (sprint-level)

- [ ] `npm run build` — 0 errors, 0 new warnings.
- [ ] `npx tsc --noEmit` — clean.
- [ ] `npm run lint` — clean.
- [ ] `curl -s http://localhost:3000 | grep -i "discover"` — hero H1 copy
      present in pre-hydration HTML.
- [ ] Lighthouse (local) — SEO ≥ 100 on `/`, `/aixcelerator`,
      `/aixcelerator/skills`, `/resources/podcasts`. LCP delta ≤ +100ms.
- [ ] Manual visual check at 375 / 768 / 1280 / 1440 / 1920 — no orphan
      single-word second lines on hero or any `SectionHeader` title.
- [ ] Hero metric digits are fixed-width (no jump when counting up).
- [ ] Grep clean: `post-edit-color-guard.sh` passes; no new `blue-*`,
      `green-*`, `emerald-*`, `amber-*`, `slate-*`.
- [ ] `prefers-reduced-motion: reduce` toggle (macOS Accessibility) — page
      renders identically to Phase 1 baseline (no new motion added).

---

## Ship Order (strategist's MVP call)

Per the plan's own guidance, these four land first and buy the biggest
perceived-tier lift:

1. **Task 2** — Enable OpenType features globally + `.tabular` utility.
2. **Task 3** — Add fluid hero clamp token + apply to H1.
3. **Task 4** — Weight-contrast utilities + apply to hero + rotator.
4. **Task 5** — Editorial 12-col grid utilities + wire into hero +
   `SectionHeader` consumers.

Tasks 6–7 (spacing scale + balance sweep) are polish that falls out naturally
once the grid lands. Task 8 is the validation gate.
