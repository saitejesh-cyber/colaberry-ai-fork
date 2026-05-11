# Sprint v6 — Tasks: Premiumness Foundation (Phase 1)

**Status:** Planned
**Total tasks:** 8
**Priority tiers:** P0 = must-ship, P1 = should-ship, P2 = nice-to-have
**Est. total time:** ~1 sprint. Zero new deps. Pure CSS + Tailwind config.

Sequenced so each task builds on the previous. Task 1 is setup; Task 8 is the
verification gate. Tasks 2–5 are the strategist's MVP (biggest lift, ship
first). Tasks 6–7 are polish that falls out naturally once the grid lands.

---

## P0 — Must Have (the foundation)

- [ ] **Task 1: Scaffold sprint artifacts + baseline capture** (P0)
  - Acceptance: `sprints/v6/PRD.md` + `sprints/v6/TASKS.md` committed on a
    working branch. Before any CSS edit, capture screenshots of `/`,
    `/aixcelerator`, `/aixcelerator/skills`, `/resources/podcasts` at 375 /
    768 / 1280 / 1440 / 1920 using `preview_screenshot`. Save to
    `sprints/v6/baseline/` (git-ignored if large). Notes on Lighthouse + LCP
    baseline for `/` saved to `sprints/v6/baseline.md`.
  - Files: `sprints/v6/PRD.md`, `sprints/v6/TASKS.md`, `sprints/v6/baseline.md`

- [ ] **Task 2: Enable Inter OpenType features + `.tabular` utility** (P0)
  - Acceptance: `body` rule in `globals.css` adds
    `font-feature-settings: "ss01", "ss03", "cv11", "cv06";
    font-optical-sizing: auto;`. New utility class
    `.tabular { font-feature-settings: "tnum", "lnum"; font-variant-numeric:
    tabular-nums lining-nums; }`. Applied to every metric digit in hero of
    `src/pages/index.tsx` and all counters in `EnterprisePageHero`. No body-
    copy regression. Visual diff: headlines pick up single-story `g` where
    supported; metric digits no longer shift width on count-up.
  - Files: `src/styles/globals.css` (body rule near line 238 + new utility),
    `src/pages/index.tsx` (metric digits ~line 508+),
    `src/components/EnterprisePageHero.tsx` (all counters)

- [ ] **Task 3: Add `hero-fluid` clamp token + apply to hero H1** (P0)
  - Acceptance: `tailwind.config.ts` `fontSize` map adds
    `"hero-fluid": ["clamp(2.75rem, 8.5vw, 7rem)", { lineHeight: "1.02",
    letterSpacing: "-0.035em" }]`. Hero H1 in `src/pages/index.tsx` replaces
    the stepped class chain (`text-display-md sm:text-display-lg
    lg:text-display-xl 2xl:text-display-2xl`) with `text-hero-fluid`.
    `text-balance` preserved. At 1440px the H1 reads ~6.5rem. No breakpoint
    jump between 375px and 1920px.
  - Files: `tailwind.config.ts:112-125`, `src/pages/index.tsx:445` (hero H1)

- [ ] **Task 4: Weight-contrast utilities (`.display-thin` + `.display-heavy`)** (P0)
  - Acceptance: `globals.css` adds `.display-thin { font-weight: 200;
    letter-spacing: -0.035em; }` and `.display-heavy { font-weight: 800;
    letter-spacing: -0.04em; }`. Hero H1 receives `.display-thin`. The rotator
    span (the word that animates in via `KineticHeading`) receives
    `.display-heavy`. Base `h1/h2/h3` reset at
    `globals.css:519-536` keeps its 700 default — utilities are opt-in.
    Visual: editorial weight contrast visible in one line. Dark + light
    parity confirmed.
  - Files: `src/styles/globals.css:519-536` (add utilities after the base
    reset), `src/pages/index.tsx:445-460` (hero H1 + rotator span)

- [ ] **Task 5: Editorial 12-col grid utilities + wire into hero + SectionHeader** (P0)
  - Acceptance: `globals.css` adds
    ```css
    .editorial-grid {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      column-gap: clamp(1rem, 2vw, 2rem);
      max-width: 90rem;
      margin-inline: auto;
      padding-inline: clamp(1.25rem, 4vw, 3rem);
    }
    .col-editorial-main  { grid-column: 2 / span 7; }
    .col-editorial-aside { grid-column: 9 / span 3; }
    .col-editorial-wide  { grid-column: 2 / span 10; }
    .col-editorial-break { grid-column: 1 / -1; }
    @media (max-width: 1023px) {
      .col-editorial-main,
      .col-editorial-aside,
      .col-editorial-wide { grid-column: 1 / -1; }
    }
    ```
    Hero section in `src/pages/index.tsx:433+` replaces its hardcoded
    `max-w-[90rem]` shell with `.editorial-grid` — text lands in
    `.col-editorial-main`, metric/aside block in `.col-editorial-aside`.
    `SectionHeader` (`src/components/SectionHeader.tsx`) opts into
    `.col-editorial-wide` when rendered inside an `.editorial-grid` parent
    (via a new optional `editorial` prop, default `false`, so consumers
    opt in). Stacks to 1-col below `lg`.
  - Files: `src/styles/globals.css` (new utility block), `src/pages/index.tsx`
    (hero shell refactor), `src/components/SectionHeader.tsx` (opt-in prop)

---

## P1 — Should Have (polish that falls out naturally)

- [ ] **Task 6: Enforce modular spacing scale (`.section-pad-{sm,md,lg}`)** (P1)
  - Acceptance: `globals.css` rewrites `--section-gap-lg` to
    `clamp(4rem, 8vw, 7.5rem)`, keeps `-sm` / `-md` scaled relatively. Adds
    utilities `.section-pad-sm { padding-block: var(--section-gap-sm); }`,
    `.section-pad-md { padding-block: var(--section-gap-md); }`,
    `.section-pad-lg { padding-block: var(--section-gap-lg); }`. Every
    top-level `<section>` in `src/pages/index.tsx`,
    `src/pages/aixcelerator/skills/index.tsx`, and
    `src/pages/aixcelerator/mcp.tsx` replaces arbitrary `py-10 / py-14 /
    py-16` with one of the utilities. Consistent vertical rhythm visible
    scrolling from hero → footer at 1440×900.
  - Files: `src/styles/globals.css:119-122`, `src/pages/index.tsx`,
    `src/pages/aixcelerator/skills/index.tsx`,
    `src/pages/aixcelerator/mcp.tsx`, `src/pages/aixcelerator/agents.tsx`

- [ ] **Task 7: `text-wrap: balance` sweep + SectionHeader max-width lock** (P1)
  - Acceptance: `globals.css` adds `h1, h2, h3 { text-wrap: balance; }` at
    the top of the heading reset block. `SectionHeader` title receives
    `text-wrap: balance; max-width: 24ch;` inline (via `className` or
    `style`). Manual check at 1024 / 1280 / 1440 — no orphaned single-word
    second lines on any section title across `/`, `/aixcelerator`,
    `/aixcelerator/skills`, `/aixcelerator/mcp`, `/resources/podcasts`.
    Body prose leading locked to 1.65; caption to 1.45 (verify existing
    `body-md` / `caption` tokens in `tailwind.config.ts` already match —
    no edit needed if so).
  - Files: `src/styles/globals.css:519-536` (heading reset),
    `src/components/SectionHeader.tsx` (title wrapper)

---

## P2 — Nice to Have (verification + docs)

- [ ] **Task 8: Verification gate (build + lint + tsc + AEO curl + visual diff + CLAUDE.md)** (P2)
  - Acceptance:
    - `npm run build` 0 errors, 0 new warnings
    - `npx tsc --noEmit` clean
    - `npm run lint` clean
    - `bash scripts/post-edit-color-guard.sh` clean (no new forbidden hues)
    - `curl -s http://localhost:3000 | grep -i "discover"` returns hero copy
    - `preview_screenshot` at 375 / 768 / 1280 / 1440 / 1920 for `/`,
      `/aixcelerator`, `/aixcelerator/skills`, `/resources/podcasts`; diff
      against `sprints/v6/baseline/`; all diffs intentional and documented
      in `sprints/v6/WALKTHROUGH.md`
    - `CLAUDE.md` "Locked Theming Standard" block updated with new utilities
      (`.tabular`, `.display-thin`, `.display-heavy`, `.editorial-grid`,
      `.section-pad-*`, `text-hero-fluid`)
    - `src/styles/CLAUDE.md` (if it exists) or `src/components/CLAUDE.md`
      updated to reference the new grid + weight utilities
  - Files: `CLAUDE.md`, `sprints/v6/WALKTHROUGH.md` (new),
    screenshots under `sprints/v6/after/`

---

## Sprint acceptance (all 8 tasks)

- [ ] `npm run build` clean, `npx tsc --noEmit` clean, `npm run lint` clean
- [ ] Hero H1 scales continuously 375px → 1920px; no breakpoint jumps
- [ ] Editorial weight-contrast visible in hero (200 + 800 within one line)
- [ ] Metric digits are tabular-width (no jump on count-up)
- [ ] Every top-level section uses `.section-pad-*` + `.editorial-grid`
- [ ] No orphan single-word second lines on any `SectionHeader` title
- [ ] Pre-hydration HTML contains full hero copy (curl + grep)
- [ ] Color-guard clean
- [ ] `CLAUDE.md` reflects the new utilities
- [ ] `prefers-reduced-motion: reduce` toggle — no new motion introduced
      (Phase 1 is CSS-only)

---

## Out of scope for v6 (see v7 + v8)

- `MarqueeStrip`, `MagneticButton`, scroll-linked kinetic reveals beyond
  `KineticHeading` — Sprint v7 (Motion).
- `BrandPreloader`, `<AnimatePresence>` route choreography, glass sticky
  header via `useScroll`, hero product-mockup WebP, global noise overlay
  moved to `Layout`, 4th elevation stop, activation of `--surface-glass` /
  `--surface-frosted` on panels + CTA band — Sprint v8 (Finesse).

## Deployment order (when sprint ships)

1. Ship to `dev` / `Release-2.0.beta` first; manual visual + AEO check.
2. Merge to `Release-1.0.beta`; re-run verification.
3. Cloud Build trigger deploys to `colaberry-ai-prod`.
4. Post-deploy: re-run `curl -s https://colaberry.ai | grep -i "discover"`
   and Lighthouse SEO audit on the three primary routes.
