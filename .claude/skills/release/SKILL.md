# Release Checklist

Pre-deployment verification checklist. Run this before pushing to `dev` or merging to `main`.

## Steps

1. **Git status** — Check for uncommitted changes:
   ```bash
   git status
   ```
   All changes should be committed or intentionally unstaged.

2. **TypeScript check** — Must have 0 errors:
   ```bash
   npx tsc --noEmit
   ```

3. **Lint check** — Must have 0 errors:
   ```bash
   npm run lint
   ```

4. **Production build** — Must complete successfully:
   ```bash
   npm run build
   ```

5. **Security scan** — Check for committed secrets:
   ```bash
   git ls-files | grep -iE '\.env|credentials|secret'
   ```

6. **Console.log cleanup** — Check for debug logging in production code:
   ```bash
   grep -rn "console.log" src/pages/ src/components/ src/lib/ --include="*.ts" --include="*.tsx"
   ```
   Remove any non-essential console.log statements.

7. **Dependency audit** — Check for known vulnerabilities:
   ```bash
   npm audit
   ```

8. **Output verdict**:
   - If all checks pass: "Ready to deploy"
   - If any check fails: List specific blockers with file:line references

## Post-Deploy Verification

After deployment, verify visually:
- [ ] Light mode renders correctly
- [ ] Dark mode renders correctly
- [ ] Mobile layout at 375px width
- [ ] Ontology SVG diagrams load
- [ ] Graph pages render with nodes
- [ ] Solution Stacks show item counts

See `docs/runbooks/deploy.md` for full deployment procedure.
