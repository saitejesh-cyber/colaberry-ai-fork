# Deployment Runbook

## Pre-Deployment Checklist

Run all quality gates before deploying:

```bash
# 1. TypeScript type check — must have 0 errors
npx tsc --noEmit

# 2. Lint check — must have 0 errors
npm run lint

# 3. Full production build — must pass
npm run build
```

## Security Checks

```bash
# Check for .env files accidentally committed
git ls-files | grep -i '\.env'

# Check for console.log in production code
grep -rn "console.log" src/pages/ src/components/ src/lib/ --include="*.ts" --include="*.tsx" | grep -v "// debug"

# Run npm audit
npm audit
```

## Visual Verification

After deploying to dev/staging:

1. **Light mode** — Check 3+ pages for correct zinc colors, no forbidden colors
2. **Dark mode** — Toggle dark mode, verify all pages render correctly
3. **Mobile** — Test at 375px width minimum, verify responsive layout
4. **Ontology pages** — Verify SVG diagrams render with correct category counts
5. **Graph pages** — Verify ForceGraph2D loads with nodes and edges
6. **Solution Stacks** — Verify cards show item counts (not empty)

## Deployment Steps

### Vercel (Primary)
1. Push to `dev` branch
2. Vercel auto-deploys from `dev` → `dev.colaberry.ai`
3. Verify deployment at dev URL
4. Merge `dev` → `main` for production when ready

### Docker
```bash
docker build -t colaberry-ai .
docker run -p 3000:3000 -e NEXT_PUBLIC_CMS_URL=<cms-url> colaberry-ai
```

## Rollback

If deployment fails:
1. Check Vercel deployment logs for build errors
2. `git revert HEAD` to undo last commit if needed
3. Push revert to trigger clean deployment
