# New Page

Scaffold a new page following all Colaberry AI platform standards — locked theming, page structure, and the SkillNet pattern.

## Steps

1. **Gather requirements** — Ask the user:
   - What content type? (skills, mcp, agents, tools, podcasts, or custom)
   - What page type? (listing, detail, ontology, graph, collections, collection-detail, or custom)
   - What route path? (e.g., `/aixcelerator/new-feature`)
   - Any special requirements?

2. **Choose template approach**:

   **If per-type knowledge graph page** (ontology/graph/collections/collection-detail):
   - Use the corresponding generic template (`OntologyPageTemplate`, `GraphPageTemplate`, `CollectionsPageTemplate`, `CollectionDetailTemplate`)
   - Import the type's `ContentOntologyConfig` from its taxonomy file
   - The page file should be a thin wrapper (~30-50 lines)

   **If custom page:**
   - Scaffold with standard page structure (see step 3)

3. **Apply page structure standard**:
   ```tsx
   // 1. .reveal wrapper on hero
   <div className="reveal">
     <SectionHeader size="xl" kicker="..." title="..." description="..." />
   </div>

   // 2. .surface-panel for filters
   <div className="surface-panel">...</div>

   // 3. .stagger-grid on card grids (NOT inside .reveal)
   <div className="stagger-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
     {items.map(item => <Card key={item.slug} />)}
   </div>

   // 4. .reveal on each section
   <div className="reveal">...</div>

   // 5. EnterpriseCtaBand at bottom
   <EnterpriseCtaBand />
   ```

4. **Enforce design rules**:
   - Colors: zinc scale only + coral `#DC2626` for CTAs
   - No forbidden colors: emerald, green, blue, amber, slate
   - Icons: `ContentTypeIcon` — never emoji
   - Dark mode: `dark:` variants on all elements
   - Data fetching: `getStaticProps` with CMS-first, static fallback

5. **Verify**:
   ```bash
   npx tsc --noEmit    # Type check
   npm run build        # Full build
   ```

6. **Output**: Created file path, route URL, verification results

## References

- Page structure: `src/pages/CLAUDE.md`
- Component conventions: `src/components/CLAUDE.md`
- Design system: Root `CLAUDE.md`
- Constitution: `Constitution.md`
