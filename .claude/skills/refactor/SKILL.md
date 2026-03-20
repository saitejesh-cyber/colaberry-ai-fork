# Safe Refactor

Safe refactoring workflow that reads before writing, plans before editing, and verifies after each change.

## Steps

1. **Scope analysis** — Read all files in the refactoring scope to understand current patterns
2. **Reference search** — Search for all imports, usages, and references of the target code across the codebase using grep/glob
3. **Impact assessment** — List all files that will be affected by the change
4. **Draft plan** — Present the refactoring plan to the user:
   - What changes in each file
   - What stays the same
   - Downstream effects
   - Risk assessment
5. **User approval** — Wait for explicit approval before making any edits
6. **Incremental edits** — Make changes one file at a time, starting with:
   - Types/interfaces first
   - Then utility modules
   - Then components
   - Then pages (last, most downstream)
7. **Per-file verification** — After each file edit, run:
   ```bash
   npx tsc --noEmit
   ```
   Stop immediately if type errors appear.
8. **Final verification** — After all files are edited:
   ```bash
   npm run build
   npm run lint
   ```
9. **Summary** — Show `git diff --stat` summary of all changes

## Rules

- Never edit a file you haven't read first
- Never make changes without user approval of the plan
- Stop on first type error — don't cascade broken changes
- Follow dependency order: types → utils → data → components → pages
- Preserve the locked theming standard (zinc + coral only)
