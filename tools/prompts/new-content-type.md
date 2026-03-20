# Adding a New Content Type

Step-by-step guide for adding a 6th (or Nth) content type to the platform.

## Prerequisites

- Understand the SkillNet 3-layer pattern (see `docs/decisions/002-skillnet-pattern.md`)
- Review an existing type's files for reference (Skills recommended — most mature)

## Steps

### 1. Create Taxonomy File (`src/data/{type}-taxonomy.ts`)

Export three things:
```typescript
// 1. Categories array
export const {TYPE}_CATEGORIES: TaxonomyCategory[] = [
  { slug: "category-slug", name: "Category Name", description: "...", icon: "..." },
  // ... 6-12 categories
];

// 2. Classifier function
export function classify{Type}(item: CMSType): string {
  // Return category slug based on item properties
}

// 3. Ontology config
export const {TYPE}_ONTOLOGY_CONFIG: ContentOntologyConfig = {
  contentType: "{type}",
  categories: {TYPE}_CATEGORIES,
  relationshipTypes: [
    { type: "similar_to", label: "Similar To", description: "..." },
    { type: "used_with", label: "Used With", description: "..." },
    // ... 3-4 relationship types + always include belong_to
  ],
  categoryColors: {
    "category-slug": "#hexcolor",
    // ... one color per category (SVG diagram exception to zinc-only rule)
  },
};
```

### 2. Create Collection File (`src/data/{type}-collections.ts`)

```typescript
export const {TYPE}_COLLECTIONS: ContentCollection[] = [
  {
    slug: "collection-slug",
    name: "Collection Name",
    description: "...",
    category: "category-slug",
    itemSlugs: ["item-1", "item-2", "item-3", "item-4", "item-5"],
    difficulty: "beginner" | "intermediate" | "advanced",
    keywordTags: ["tag1", "tag2"],
    linkCount: 4,
    generated: false,
    contentType: "{type}",
  },
  // ... 5-6 collections
];
```

### 3. Register in Ontology Registry (`src/lib/ontologyRegistry.ts`)

- Add to `CONTENT_TYPE_META` map
- Add cross-type relations in `CROSS_TYPE_RELATIONS`
- Import and register the `ContentOntologyConfig`

### 4. Add CMS Functions (`src/lib/cms.ts`)

```typescript
export async function fetch{Types}(): Promise<CMSType[]> { ... }
export async function fetch{Type}CategoryCounts(): Promise<Record<string, number>> { ... }
export async function fetchAll{Type}Tags(): Promise<string[]> { ... }
```

### 5. Create 4 Page Files (thin wrappers)

```
src/pages/aixcelerator/{type}/ontology.tsx    → OntologyPageTemplate
src/pages/aixcelerator/{type}/graph.tsx       → GraphPageTemplate
src/pages/aixcelerator/{type}/collections/index.tsx → CollectionsPageTemplate
src/pages/aixcelerator/{type}/collections/[slug].tsx → CollectionDetailTemplate
```

### 6. Add to Navigation (`src/components/Layout.tsx`)

Add the new type to the navigation menu.

### 7. Verify

```bash
npx tsc --noEmit    # Type check
npm run build        # Full build
```

### 8. Update Documentation

- Add to `CLAUDE.md` type tables
- Add to `docs/architecture.md` route map
- Update `src/data/CLAUDE.md` file listing
