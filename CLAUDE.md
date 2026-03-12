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
├── components/     # 28 React components
├── pages/          # 30+ pages (Pages Router)
├── styles/         # globals.css (design tokens + component classes)
├── lib/            # 14 utility modules (cms.ts, seo.ts, etc.)
├── data/           # Static JSON data (agents.json, mcps.json)
└── hooks/          # Custom React hooks
```

## Key Files
- `src/styles/globals.css` — ALL CSS custom properties and component classes
- `tailwind.config.ts` — Zinc color scale, Inter fonts, animation keyframes
- `src/pages/_app.tsx` — Font loading (Inter), global layout wrapper
- `src/lib/cms.ts` — CMS fetch functions and TypeScript types
- `src/components/Layout.tsx` — Header + footer + nav (1,750 lines)

## Shared Components (used on 15+ pages)
- `EnterprisePageHero` — Hero section with kicker badge, heading, description, image
- `SectionHeader` — Section title with kicker, heading, description
- `EnterpriseCtaBand` — Dark CTA band at bottom of pages
- `AgentCard` / `MCPCard` — Catalog listing cards

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
