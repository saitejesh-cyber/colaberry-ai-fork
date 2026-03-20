# Scripts Index

All scripts live in the project root `scripts/` directory. This index organizes them by purpose.

## Import Scripts

| Script | Purpose | Source |
|--------|---------|--------|
| `import-clawhub-skills.mjs` | Import skills from ClawHub | ClawHub API/dataset |
| `import-ultimate-skills.mjs` | Import from ultimate skills dataset | CSV/JSON |
| `import-anthropic-skills.mjs` | Import Anthropic-specific skills | Anthropic catalog |
| `import-github-skills.mjs` | Import from GitHub sources | GitHub API |
| `import-github-skills-bulk.mjs` | Bulk GitHub skills import | GitHub API |
| `import-podcasts-csv.mjs` | Import podcast episodes | CSV file |

## Enrichment Scripts

| Script | Purpose |
|--------|---------|
| `enrich-skills.mjs` | Enrich skill metadata (descriptions, tags) |
| `enrich-mcps.mjs` | Enrich MCP server metadata |
| `enrich-no-github.mjs` | Enrich items without GitHub URLs |

## Generation Scripts

| Script | Purpose |
|--------|---------|
| `generate-collections.mjs` | Auto-generate skill collections from taxonomy |
| `generate-ai-heroes.mjs` | Generate AI hero images |
| `generate-cinematic-heroes.mjs` | Generate cinematic hero images |
| `generate-resource-heroes.mjs` | Generate resource page hero images |

## MCP-Specific Scripts

| Script | Purpose |
|--------|---------|
| `classify-mcp-industry.mjs` | Classify MCP servers by industry |
| `dedupe-mcp-servers.mjs` | Remove duplicate MCP entries |
| `fix-mcp-slugs.mjs` | Fix MCP server slug formatting |
| `fix-clawhub-source-urls.mjs` | Fix ClawHub source URL references |

## CMS & Sync Scripts

| Script | Purpose |
|--------|---------|
| `sync-buzzsprout.mjs` | Sync podcasts from Buzzsprout |
| `audit-data-readiness.mjs` | Audit data completeness |
| `seed-telemetry-dev.mjs` | Seed telemetry data for dev |

## Usage

All scripts are ES modules (`.mjs`). Run with Node.js:

```bash
node scripts/{script-name}.mjs
```

Some scripts require environment variables (CMS URL, API keys). Check each script's header for requirements.
