This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Podcast CSV Import

You can bulk import podcast episodes into Strapi from CSV.

### 1. Prepare CSV

Use `scripts/templates/podcast-import.template.csv` as the template.

### 2. Configure env

Set these values (in shell or `.env.local`):

- `NEXT_PUBLIC_CMS_URL` (or `STRAPI_URL`)
- `CMS_API_TOKEN` (or `STRAPI_TOKEN`)

### 3. Dry run

```bash
npm run import:podcasts:csv -- --file ./scripts/templates/podcast-import.template.csv --dry-run
```

### 4. Execute import

```bash
npm run import:podcasts:csv -- --file ./data/podcasts.csv
```

### Useful flags

- `--no-create-relations` skip auto-creating missing tags/companies
- `--strict` stop on first invalid row
- `--limit 20` import only first N rows

## Production Data Readiness Audit

Run a data gate check against Strapi before release:

```bash
npm run audit:data
```

Optional threshold overrides:

```bash
npm run audit:data -- --min-podcasts 200 --min-agents 40 --min-mcp 40 --min-use-cases 30 --verbose true
```

This verifies:

- published counts for podcasts, agents, MCP servers, and use cases
- podcast playability coverage (audio/embed presence)
- publish-date completeness for podcasts
- rich profile coverage on agent/MCP/use-case detail records
