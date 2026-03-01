# Skills Catalog Data Sync

Colaberry skills now include a ClawHub top-downloads source layer.

## Source references
- `https://clawhub.ai/skills?sort=downloads`
- `https://agentskills.io/what-are-skills`
- `https://github.com/ZhanlinCui/Ultimate-Agent-Skills-Collection`

## CMS seed + import
- Seed sample + ClawHub top set:
  - `npm run seed:skills -- --publish`
- CSV import flow (for bulk updates):
  - `npm run import:skills -- --file ./path/to/skills.csv --publish`

## Dataset file
- `colaberry-ai-cms/scripts/templates/skills-clawhub-top-downloads.json`

This file is consumed by:
- `colaberry-ai-cms/scripts/seed-skills.js`

The same file/script should stay mirrored in:
- `colaberry-ai-cms-fork`
