# ADR-001: Zinc Monochrome + Coral Accent Design System

**Status:** Accepted (Locked)
**Date:** 2026-02-15
**Decision Makers:** Ram (CEO), Engineering Team

## Context

The platform had accumulated inconsistent color usage across 53+ pages — emerald for success states, blue for headings, amber for badges, slate mixed with zinc. This created visual fragmentation and made the brand feel disjointed.

## Decision

Lock the design system to **zinc monochrome + coral `#DC2626` accent only**.

### Rules
- Coral `#DC2626` is used ONLY for CTA buttons and small accent dots
- Everything else uses the zinc scale (`zinc-50` through `zinc-950`)
- **Forbidden colors in page code:** `emerald-*`, `green-*`, `blue-*`, `amber-*`, `slate-*`
- **Exception:** `text-red-600` for error states, `config.categoryColors` for SVG category nodes

### Color Tokens
| Token | Light | Dark |
|-------|-------|------|
| Background | `#FFFFFF` | `#09090B` zinc-950 |
| Surface | `#FAFAFA` zinc-50 | `#18181B` zinc-900 |
| Text primary | `#18181B` zinc-900 | `#FAFAFA` zinc-50 |
| Text muted | `#71717A` zinc-500 | `#A1A1AA` zinc-400 |
| Border | `#E4E4E7` zinc-200 | `#3F3F46` zinc-700 |
| Accent | `#DC2626` | `#F87171` |

## Consequences

- **Positive:** Clean, premium visual identity. Consistent brand across all pages. Easier dark mode support (zinc maps cleanly).
- **Negative:** No semantic color coding (green=success, red=error) — must use icons/text instead. Category differentiation in graphs requires the `categoryColors` exception.
- **Enforcement:** Constitution.md Article 2, `.claude/hooks/` color guard, code review skill checks.
