# Design System Verification Prompt

Use this prompt template to verify a page against the locked theming standard.

## Checklist

### Colors
- [ ] Only zinc scale colors used (`zinc-50` through `zinc-950`)
- [ ] Coral `#DC2626` used ONLY for CTA buttons and small accent dots
- [ ] No forbidden colors: `emerald-*`, `green-*`, `blue-*`, `amber-*`, `slate-*`
- [ ] Exception check: `text-red-600` only for error states
- [ ] Exception check: `config.categoryColors` only in SVG category nodes

### Typography
- [ ] Font: Inter (via `--font-inter` CSS variable)
- [ ] No other font families referenced

### Components
- [ ] Buttons: `rounded-full` (pill-shaped), no `translateY` hover
- [ ] Cards: `.catalog-card` class, 1px border, no glassmorphism, no hover lift
- [ ] Filter panels: `.surface-panel` class
- [ ] Active filters: `.chip-brand` (coral)
- [ ] Default filters: `.chip-neutral` (zinc)
- [ ] Content sections: `.detail-section`

### Page Structure
- [ ] `.reveal` wrapper on hero section
- [ ] `SectionHeader` with `size="xl"`, kicker, title, description
- [ ] `.surface-panel` for filter/search bars
- [ ] `.stagger-grid` on card grids (NOT nested inside `.reveal`)
- [ ] `.reveal` on each major section
- [ ] `EnterpriseCtaBand` at page bottom

### Icons
- [ ] `ContentTypeIcon` / `ContentTypeIconSvg` used (never emoji)

### Dark Mode
- [ ] All elements have `dark:` Tailwind variants
- [ ] CSS vars swap between `:root` and `.dark` blocks
- [ ] Toggle works via `.dark` class on `<html>`

### Animations
- [ ] Duration: 0.4s max
- [ ] TranslateY: 12px
- [ ] Easing: `cubic-bezier(0.16, 1, 0.3, 1)`
- [ ] No nested `.reveal-scale`/`.stagger-grid` inside `.reveal`

## Quick Grep Commands

```bash
# Check for forbidden colors
grep -rnE "(emerald-|green-[0-9]|blue-[0-9]|amber-|slate-)" src/pages/{page}.tsx

# Check for emoji icons
grep -rnE "[\x{1F300}-\x{1F9FF}]" src/pages/{page}.tsx

# Check for any type
grep -rn ": any" src/pages/{page}.tsx
```
