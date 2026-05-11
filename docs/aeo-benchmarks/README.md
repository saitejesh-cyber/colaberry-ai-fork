# AEO Indexability Benchmarks

Weekly snapshots tracking how `www.colaberry.ai` scores against **15 direct competitors** on AI-search indexability (a.k.a. **AEO** — Answer Engine Optimization).

## Why this exists

`colaberry.ai` is purpose-built for LLM indexability — the entire site is a structured catalog of AI agents, MCP servers, skills, and architectures, intended to be discoverable by AI answer engines (ChatGPT, Claude, Perplexity, Gemini), not just by Google.

That investment only pays off if we **stay ahead of competitors**. Once the rest of the AI-catalog category notices what we've done with Schema.org, `/llms.txt`, and explicit bot allowlists, they'll catch up. This benchmark exists to alert us when that happens.

## The three-layer ranking model

AI search engines rank sites through three independent layers. Most companies only measure Layer 1; this benchmark covers all three.

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1 — INFRASTRUCTURE   (10 pts)                             │
│   Can the bot fetch + parse your site?                          │
│   How: scripts/aeo-benchmark.mjs (weekly cron)                  │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2 — AUTHORITY        (6 pts)                              │
│   Does the bot trust you?                                        │
│   How: scripts/aeo-benchmark.mjs (same script, separate signals)│
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3 — CITATION         (variable)                            │
│   Does an LLM actually cite you when users ask?                 │
│   How: scripts/aeo-citation-test.mjs (manual/quarterly,         │
│   requires Chrome MCP)                                           │
└─────────────────────────────────────────────────────────────────┘
```

**Total automated score: 16 points (Layer 1 + Layer 2). Layer 3 is a separate quarterly measurement.**

## Layer 1 — Infrastructure (10 pts, automated weekly)

| Dimension | Weight | Pass criteria | Why it matters |
|---|---|---|---|
| AI bot allowlist | 2.0 | GPTBot + ClaudeBot + PerplexityBot + Google-Extended named in robots.txt | Tells crawlers "welcome" — generic `User-agent: *` is silently de-prioritized by some engines |
| `/llms.txt` | 1.5 | HTTP 200 | Emerging standard manifest — direct signal to LLM crawlers |
| `/llms-full.txt` | 1.5 | HTTP 200 | Comprehensive content index — rich citation body |
| Homepage Schema.org | 2.0 | Any `"@type"` JSON-LD detected | Powers FAQ + Organization + WebSite signals in AI answers |
| Deep-page Schema.org | 1.5 | Same on a canonical deep URL per site | TechArticle / ItemList signals on catalog + article surfaces |
| Sitemap depth | 1.5 | ≥ 100 `<loc>` entries | Shows discoverable content at scale |

## Layer 2 — Authority (6 pts, automated weekly via free public APIs)

| Dimension | Weight | Pass criteria | Data source |
|---|---|---|---|
| Wikipedia article | 2.0 | English Wikipedia article exists | Wikipedia REST API |
| Domain age ≥ 3 years | 2.0 | Internet Archive first capture before today − 3 yrs | archive.org/wayback/available |
| GitHub presence (≥ 100 stars) | 2.0 | Top repo under `<domain-root>` org has ≥ 100 ⭐ | api.github.com/orgs/{org}/repos |

These are **proxies** for what AEO engines actually weigh — true backlinks / brand mentions would need paid SEO APIs (Ahrefs, Moz, SEMrush at $100s/month). The free proxies above are highly correlated and cost nothing.

## Layer 3 — Citation (separate quarterly run)

`scripts/aeo-citation-test.mjs` defines a 20-query test suite across 4 categories (branded / unbranded / competitive / adjacent). Run it manually via Chrome MCP against Perplexity / ChatGPT / Claude / Gemini and it produces `<ISO-WEEK>-citations.md` with the citation hit-rate per tracked domain.

**Why this isn't automated:** browser logins + CAPTCHAs. The benchmark script in CI uses only public HTTP probes.

## The competitor set (15 sites)

| Cluster | Sites |
|---|---|
| **AI catalogs** | huggingface.co · replicate.com · smithery.ai · ollama.com |
| **Inference + hosting** | modal.com · together.ai · fireworks.ai |
| **Agent frameworks** | langchain.com · crewai.com · voiceflow.com |
| **Frontier labs** | anthropic.com · openai.com · mistral.ai |
| **Vector / RAG** | pinecone.io |
| **Primary** | **www.colaberry.ai** |

Edit `SITES` in `scripts/aeo-benchmark.mjs` to evolve the watchlist as the category shifts.

## Running

### Weekly infrastructure benchmark (automated)

```bash
# Local
node scripts/aeo-benchmark.mjs
```

Writes `docs/aeo-benchmarks/<ISO-WEEK>.md` + `<ISO-WEEK>.json`.

In CI: `.github/workflows/aeo-benchmark.yml` runs Mondays 04:00 UTC and commits the report. Manual trigger: GitHub → Actions → "AEO Benchmark" → "Run workflow".

### Layer 3 citation test (manual/quarterly)

```bash
# Print the test suite (no browser automation)
node scripts/aeo-citation-test.mjs

# Run against Perplexity / ChatGPT — from a Claude Code session with
# Chrome MCP tools attached, ask Claude: "Run the AEO citation test suite."
```

Outputs `docs/aeo-benchmarks/<ISO-WEEK>-citations.md`.

## Alerting

The benchmark script exits **1** if `www.colaberry.ai` no longer leads Layer 1 (infrastructure — the layer where we have direct engineering control). The workflow fails → repo watchers get GitHub notifications. AEO degradation becomes a real signal, not something discovered by accident.

## Charting trends over time

The `.json` files load straight into spreadsheets. Quick CLI plot of weekly Layer 1 score:

```bash
ls docs/aeo-benchmarks/*.json | sort | while read f; do
  jq -r '"\(.week)\t\(.results[] | select(.isPrimary) | .score_layer_1)"' "$f"
done
```

## Adding a new dimension

If a new AEO signal emerges (e.g., AI agents start reading OpenGraph rich previews):

1. Add to `WEIGHTS` in `scripts/aeo-benchmark.mjs` with a sensible weight
2. Add the probe inside `auditSite()`
3. Add the column to `formatMarkdown()` table headers
4. Update this README's dimension table

Then re-run the benchmark to regenerate the current week's report.

---

**See also:** `docs/presentations/notebooklm-assets/12-AEO_INDEXABILITY_PROOF.md` — original 2026-04-29 indexability evidence pack.
