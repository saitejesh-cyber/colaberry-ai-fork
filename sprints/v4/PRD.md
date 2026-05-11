# Sprint v4 — PRD: LLM Architecture Deep Dives (CMS Dynamic Zone)

**Status:** Planned
**Owner:** Frontend + CMS
**Target:** `/aixcelerator/llm-architectures/[slug]` detail pages
**Repos in scope:** `colaberry-ai-fork` (frontend) + `colaberry-ai-cms-fork` (Strapi v5 CMS)
**Date:** 2026-04-14

---

## Sprint Overview

Upgrade the LLM architecture detail pages with Raschka-style long-form technical
deep dives (Overview → Attention → Block Structure → FFN → Embeddings → Context →
Training → Verdict → References). Content is stored as a **Strapi Dynamic Zone**
on the `llm-architecture` content type — editable in Strapi admin, structured
enough to render consistently, and flexible enough to mix prose, tables,
callouts, code blocks, and reference lists. The frontend renders the zone as
semantic HTML with a `TechArticle` JSON-LD wrapper so AI answer engines can cite
our pages directly.

This sprint also closes a data gap: the CMS currently has **zero**
`llm-architecture` records, so all 79 models render from the static registry
fallback. We sync the registry into the CMS as the first task so Strapi admin
becomes the single editable source of truth.

## Goals

- [ ] All 79 LLM architectures from `src/data/llm-architectures-registry.json`
      are upserted into Strapi (CMS becomes the editable source of truth).
- [ ] `llm-architecture` content type has a `deepDive` **Dynamic Zone** attribute
      composed of 8 reusable components: `heading`, `paragraph`, `callout`,
      `code-block`, `table`, `list`, `image`, `references`.
- [ ] Frontend has a new `LLMArchitectureDeepDive` renderer component that maps
      each dynamic-zone block to semantic HTML inside a `.prose` container.
- [ ] Detail page renders deep-dive content with precedence:
      `deepDive zone` → `longDescription` richtext → no section.
- [ ] 5 flagship models have fully-authored deep dives (~1,500–2,000 words each):
      `llama-3-2-3b`, `glm-5-1`, `kimi-linear-48b-a3b`, `deepseek-v3`, `qwen3-next`.
- [ ] `TechArticle` JSON-LD with `articleBody`, `author`, `datePublished`,
      `about`, `citation` emitted on every detail page with a deep dive.

## User Stories

- As an **enterprise engineer** researching LLM architectures, I want to read
  a rigorous technical breakdown of each model's design choices (attention
  mechanism, FFN, normalization, training recipe), so I can make informed
  architecture bets without leaving Colaberry AI.
- As a **content editor**, I want to compose deep dives in Strapi admin using
  a fixed set of reusable blocks (heading, paragraph, callout, code, table,
  list, image, references), so I don't need engineering help to publish
  technical content.
- As an **AI answer engine** (ChatGPT / Claude / Perplexity), I want to find
  structured `TechArticle` schema with `articleBody` on every architecture
  detail page, so I can cite Colaberry AI as a primary source.
- As a **product manager**, I want authored content to fall back to the
  shorter `longDescription` field when a deep dive is missing, so detail
  pages never look empty during the rollout.
- As a **DevOps engineer**, I want the CMS sync to be idempotent (upsert by
  `slug`), so re-running the script is safe and CMS edits are never
  overwritten.

## Technical Architecture

### Tech Stack
- **Frontend:** Next.js 16.2.1 Pages Router, React 19, Tailwind Typography `.prose`
- **CMS:** Strapi v5 (`colaberry-ai-cms-fork`) — Dynamic Zones, reusable components
- **Fetch layer:** `src/lib/cms.ts` (`fetchLlmArchitectureBySlug` with populate)
- **Page:** `src/pages/aixcelerator/llm-architectures/[slug].tsx` (SSG + ISR 600s)
- **Renderer:** new `src/components/LLMArchitectureDeepDive.tsx`
- **AEO:** `TechArticle` JSON-LD injected via `next/head`

### Component Diagram (ASCII)

```
┌──────────────────────────────────────────────────────────────────┐
│  Strapi v5 CMS (colaberry-ai-cms-fork)                           │
│                                                                  │
│  Content Type: llm-architecture                                  │
│  ├─ slug, name, organization, parameters, ...existing fields     │
│  ├─ longDescription: richtext     [legacy fallback]              │
│  └─ deepDive: DynamicZone ◀──── NEW                              │
│       │                                                          │
│       ├─ deep.heading       { level, text, anchor }              │
│       ├─ deep.paragraph     { body: richtext }                   │
│       ├─ deep.callout       { variant, title, body }             │
│       ├─ deep.code-block    { language, code, caption }          │
│       ├─ deep.table         { caption, headers, rows }           │
│       ├─ deep.list          { style, items }                     │
│       ├─ deep.image         { media, caption, alt }              │
│       └─ deep.references    { items: [{ label, url }] }          │
└──────────────────────────────────────────────────────────────────┘
                          │
                          │ REST API (populate=deepDive.*)
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  Frontend (colaberry-ai-fork)                                    │
│                                                                  │
│  src/lib/cms.ts                                                  │
│    └─ fetchLlmArchitectureBySlug(slug)  ─────┐                   │
│       LLMArchitecture type now includes      │                   │
│       deepDive?: DeepDiveBlock[]             │                   │
│                                              ▼                   │
│  src/pages/aixcelerator/llm-architectures/[slug].tsx             │
│    ├─ getStaticProps: CMS → registry → static (unchanged)        │
│    ├─ SEO: TechArticle JSON-LD with articleBody                  │
│    └─ <LLMArchitectureDeepDive blocks={arch.deepDive} />         │
│             │                                                    │
│             ▼                                                    │
│    src/components/LLMArchitectureDeepDive.tsx   ◀──── NEW        │
│    ├─ Block type discriminator (switch on __component)           │
│    ├─ <HeadingBlock />     renders h2/h3/h4                      │
│    ├─ <ParagraphBlock />   renders richtext via dangerouslySet   │
│    ├─ <CalloutBlock />     renders blockquote with variant       │
│    ├─ <CodeBlock />        renders <pre><code> with language     │
│    ├─ <TableBlock />       renders <table> with headers/rows     │
│    ├─ <ListBlock />        renders ul/ol with items              │
│    ├─ <ImageBlock />       renders <figure> with caption         │
│    └─ <ReferencesBlock />  renders final <ul> of links           │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. CMS Sync (one-time bootstrap)
   registry JSON (79 models) ──► upsert script ──► Strapi REST API
                                                        │
                                                        ▼
                                            llm-architecture records
                                            (deepDive zone empty)

2. Author Content (human, per flagship model)
   Strapi admin ──► compose deepDive zone blocks ──► publish

3. Runtime Render
   User hits /llm-architectures/llama-3-2-3b
        │
        ▼
   getStaticProps (ISR 600s)
        │
        ├─► CMS fetch (populate=deepDive.*)
        │   ├─ HIT: arch.deepDive = [block, block, ...]
        │   └─ MISS: fall through to registry/static (no deepDive)
        │
        ▼
   Detail page renders <LLMArchitectureDeepDive blocks={...} />
        │
        ▼
   Browser receives: diagram + specs + deep-dive HTML + TechArticle JSON-LD
```

### Strapi Component Schemas (reference)

All components live under the `deep` category in Strapi:

| Component | Fields |
|---|---|
| `deep.heading` | `level` enum(h2/h3/h4), `text` string, `anchor` string |
| `deep.paragraph` | `body` richtext (markdown) |
| `deep.callout` | `variant` enum(note/warning/insight), `title` string, `body` text |
| `deep.code-block` | `language` string, `code` text, `caption` string |
| `deep.table` | `caption` string, `headers` JSON (string[]), `rows` JSON (string[][]) |
| `deep.list` | `style` enum(bullet/number), `items` JSON (string[]) |
| `deep.image` | `media` media(image), `caption` string, `alt` string |
| `deep.references` | `items` JSON ([{ label, url }]) |

## Content Source Policy (per Sai Tejesh investigation, 2026-04-14)

Karun Swaroop asked how Sebastian Raschka's LLM Architecture Gallery is
actually built. Sai walked through the gallery's source pages and
confirmed it is **statically compiled**, not API-driven. Our deep-dive
authoring follows the same primary-source strategy:

1. **Primary technical sources**
   - GitHub: [`rasbt/LLMs-from-scratch`](https://github.com/rasbt/LLMs-from-scratch) — reference implementations of every architecture
   - Sebastian's newsletter at `magazine.sebastianraschka.com`:
     - `/p/the-big-llm-architecture-comparison`
     - `/p/technical-deepseek`
     - `/p/a-dream-of-spring-for-open-weight`
2. **Model config data** — the numeric specs (params, layer count, heads, hidden size, vocab) come from HuggingFace `config.json`:
   - Pattern: `https://huggingface.co/{org}/{model}/blob/main/config.json`
   - Examples: `openai-community/gpt2-xl`, `meta-llama/Meta-Llama-3-8B`, `Qwen/Qwen3-235B-A22B`
3. **Architecture diagrams** — self-hosted WebP images under `sebastianraschka.com/llm-architecture-gallery/images/architectures/`. We do **not** hotlink or re-host these; our detail pages render our own `ArchitectureDiagram` SVG component instead.
4. **Supplementary references**
   - arXiv papers (e.g., `arxiv.org/pdf/2407.21783` for Llama 3 herd)
   - Artificial Analysis benchmarks at `artificialanalysis.ai/models/`
   - Vendor tech reports (OpenAI system cards, DeepSeek tech reports, Qwen3 report, etc.)

**Rule for deep-dive authors (Tasks 7 & 8):** every numeric claim must
cite a HuggingFace config.json, an arXiv paper, or a vendor tech report.
Raschka's commentary is useful framing but is **not** a primary source
and must never be quoted or paraphrased in published content. Each
deep dive ends with a `deep.references` block listing every source used.

Author attribution: this content source policy was contributed by
**Sai Tejesh (Sr. Software Engineer, Full Stack)** on 2026-04-14.

## Out of Scope (v5+)

- **Lightbox / modal for diagram zoom** — the full-width diagram already fills
  the viewport; a modal is diminishing returns for the current layout.
- **AI-agent-authored content generation** — every v4 deep dive is
  human-authored from public sources (HuggingFace cards, arXiv, config.json).
  No LLM-drafted content ships in this sprint.
- **MDX / rich markdown preview in Strapi admin** — plain richtext textarea is
  fine for v4; MDX syntax highlighting is a v5 nice-to-have.
- **Per-section anchor TOC / sticky sidebar** — cheap to add later once we see
  how editors actually structure deep dives.
- **Multilingual deep dives** — English only for v4.
- **Diff / review workflow for draft content** — editors use Strapi's built-in
  draft+publish; no extra approval gate.
- **Backfill deep dives for all 79 models** — v4 ships 5 flagship models; the
  rest can be added incrementally post-sprint.

## Dependencies

- ✅ Sprint v3 (Auto-Publisher) — no direct dependency, runs independently.
- ✅ `longDescription` richtext field on `llm-architecture` — already exists,
  used as the fallback when `deepDive` is empty.
- ✅ Tailwind Typography plugin — already wired into the detail page via
  `.prose prose-zinc dark:prose-invert`.
- ✅ Local Strapi instance running at `http://localhost:1338` with an API
  token that has write access to `llm-architecture`.
- ✅ `src/data/llm-architectures-registry.json` — 79 records, source of truth
  for the CMS bootstrap upsert.
- ⬜ Strapi `CMS_API_TOKEN` environment variable present in `.env.local` for
  the bootstrap script.
- ⬜ 8 new reusable components created in `colaberry-ai-cms-fork/src/components/deep/`.

---

See `TASKS.md` for the atomic task breakdown.
