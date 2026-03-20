# CMS Sync Runbook

## Overview

Content is managed in Strapi v5 CMS and fetched at build time via `src/lib/cms.ts`. Each content type has CMS fetch functions with static fallback data.

## Configuration

Set the CMS URL in your environment:
```bash
NEXT_PUBLIC_CMS_URL=http://localhost:1337   # Local development
NEXT_PUBLIC_CMS_URL=https://cms.colaberry.ai # Production
```

## CMS Fetch Functions (`src/lib/cms.ts`)

| Function | Content Type |
|----------|-------------|
| `fetchSkills()` | Skills |
| `fetchMCPs()` | MCP Servers |
| `fetchAgents()` | AI Agents |
| `fetchTools()` | Tools |
| `fetchPodcasts()` | Podcasts |
| `fetch{Type}CategoryCounts()` | Category aggregation per type |
| `fetchAll{Type}Tags()` | Tag list for filters per type |

## Static Fallback Data (`src/data/`)

When CMS is unavailable, pages fall back to static data:
- `agents.json`, `mcps.json` — JSON fallback
- Taxonomy files provide category structure regardless of CMS state
- Collection files provide curated bundles (always static)

## Import Scripts (`scripts/`)

### Skills Import
```bash
node scripts/import-clawhub-skills.mjs      # ClawHub dataset
node scripts/import-ultimate-skills.mjs      # Ultimate skills dataset
node scripts/import-anthropic-skills.mjs     # Anthropic skills
node scripts/import-github-skills.mjs        # GitHub sources
node scripts/import-github-skills-bulk.mjs   # Bulk GitHub import
```

### Enrichment
```bash
node scripts/enrich-skills.mjs              # Enrich skill metadata
node scripts/enrich-mcps.mjs                # Enrich MCP metadata
```

### Generation
```bash
node scripts/generate-collections.mjs       # Auto-generate skill collections
```

### Podcasts
```bash
node scripts/import-podcasts-csv.mjs        # Import from CSV
node scripts/sync-buzzsprout.mjs            # Sync from Buzzsprout
```

## CMS Mirroring

Both CMS instances must stay in sync:
- `colaberry-ai-cms` — Primary
- `colaberry-ai-cms-fork` — Fork

See `docs/skills-data-sync.md` for detailed sync procedures.

## Adding a New Content Type to CMS

1. Create content type in Strapi admin
2. Add fetch functions in `src/lib/cms.ts`
3. Create taxonomy file in `src/data/`
4. Create collection file in `src/data/`
5. Register in `src/lib/ontologyRegistry.ts`
6. Create 4 page files using generic templates
