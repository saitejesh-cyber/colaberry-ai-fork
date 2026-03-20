# Code Review

Structured code review for the Colaberry AI platform. Checks design system compliance, TypeScript quality, page structure, security, and accessibility.

## Steps

1. **Identify changed files** — Run `git diff --name-only` to find all modified files
2. **Design system compliance** — For each `.tsx`/`.ts` file, check:
   - No forbidden Tailwind colors: `emerald-*`, `green-*`, `blue-*`, `amber-*`, `slate-*`
   - Buttons use `rounded-full` (pill-shaped)
   - Cards use `.catalog-card` CSS class, no hover lift
   - Correct component classes: `.surface-panel`, `.chip-brand`, `.chip-neutral`
   - `ContentTypeIcon` used for content type icons (never emoji)
3. **TypeScript quality** — Check:
   - No `any` types
   - Proper interfaces/types for all props
   - Strict mode compliance
4. **Page structure** — For new/modified pages, verify:
   - `.reveal` wrapper on hero with `SectionHeader` (`size="xl"`)
   - `.surface-panel` for filter/search bars
   - `.stagger-grid` on card grids (not nested inside `.reveal`)
   - `EnterpriseCtaBand` at page bottom
5. **Dark mode** — All components have `dark:` Tailwind variants
6. **Animation nesting** — No `.reveal-scale` or `.stagger-grid` nested inside `.reveal` parent
7. **Security** — No hardcoded secrets, API routes use rate limiting and auth
8. **Build verification** — Run:
   ```bash
   npx tsc --noEmit
   npm run lint
   ```
9. **Output report** — Structured pass/fail per category with specific file:line references

## Output Format

```
## Code Review Report

### Design System: PASS/FAIL
- [details]

### TypeScript: PASS/FAIL
- [details]

### Page Structure: PASS/FAIL
- [details]

### Dark Mode: PASS/FAIL
- [details]

### Security: PASS/FAIL
- [details]

### Build: PASS/FAIL
- tsc: 0 errors
- lint: 0 errors
```
