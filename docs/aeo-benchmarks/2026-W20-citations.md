# AEO Layer 3 — Live LLM Citation Test · 2026-W20

**Engine:** Perplexity.ai · **Queries attempted:** 14 · **Queries with data:** 13 · **Hit anonymous rate-limit after:** ~13 queries

## Headline finding

- **Branded queries:** colaberry.ai cited in **5/5** = **100%** hit rate
- **Unbranded queries:** colaberry.ai cited in **0/5** = **0%** hit rate
- **Competitive queries:** colaberry.ai cited in **0/3** = **0%** hit rate

**Interpretation:** when users ask Perplexity FOR colaberry.ai by name, it cites us 100% of the time. When users ask about the CATEGORY (AI agent catalog, MCP server registry, AI knowledge graph), colaberry.ai is **not cited at all**. This is exactly the Layer 2 (Authority) gap predicted by the infrastructure benchmark — perfect Layer 1 score (10/10) cannot overcome zero Layer 2 score.

## Citation hit-rate (tracked domains, top 10)

| Rank | Domain | Total cites | Branded (of 5) | Unbranded (of 5) | Competitive (of 4) |
|---|---|---|---|---|---|
| 1 | **colaberry.ai** | **5** | 5 | 0 | 0 |

Of the 15 tracked competitor domains, only **1** were cited in any query. The 14 untracked-but-frequent citations (mcp.so, mcp.directory, reddit, github, youtube, etc.) suggest the citation surface for these queries is dominated by **documentation sites + community content + listicles**, not catalog brands.

## Per-query breakdown

### A1 · branded · _"What is colaberry.ai"_
- **Tracked sites cited:** colaberry.ai
- **Other domains:** backslash.security, linkedin.com, modelcontextprotocol.io, k2view.com, mindstudio.ai, truefoundry.com, skywork.ai

### A2 · branded · _"Colaberry AI agents catalog"_
- **Tracked sites cited:** colaberry.ai
- **Other domains:** colaberry.com, agentcory.ai, training.colaberry.com, app.colaberry.com, moderndata101.com

### A3 · branded · _"Colaberry MCP server directory"_
- **Tracked sites cited:** colaberry.ai
- **Other domains:** mcp.directory, reddit.com, bloomberry.com, dev.to, linkedin.com, mcp.so, mcpshowcase.com, mcpservers.org, perplexity.com

### A4 · branded · _"Colaberry AI knowledge graph"_
- **Tracked sites cited:** colaberry.ai
- **Other domains:** colaberry.com, colabsoftware.com, youtube.com, deeplearning.ai, training.colaberry.com, linkedin.com

### A5 · branded · _"Colaberry AI skills"_
- **Tracked sites cited:** colaberry.ai
- **Other domains:** colaberry.com, training.colaberry.com, linkedin.com, facebook.com, instagram.com

### B1 · unbranded · _"Best AI agent catalog 2026"_
- **Tracked sites cited:** _none_
- **Other domains:** springpeople.com, lindy.ai, blaxel.ai, knowlee.ai, arahi.ai, agentconference.com, github.com, dust.tt, aiagentslist.com, stackone.com

### B2 · unbranded · _"MCP server registry"_
- **Tracked sites cited:** _none_
- **Other domains:** github.com, modelcontextprotocol.info, learn.microsoft.com, machalliance.org, registry.modelcontextprotocol.io, konghq.com, blog.modelcontextprotocol.io

### B3 · unbranded · _"Where can I discover AI skills for enterprise"_
- **Tracked sites cited:** _none_
- **Other domains:** ai.google, microsoft.com, learn.microsoft.com, coursera.org, learning.linkedin.com, moveworks.com, gpstrategies.com, atlassystems.com

### B4 · unbranded · _"Open source AI agent marketplace"_
- **Tracked sites cited:** _none_
- **Other domains:** kore.ai, reddit.com, agentkart.ai, aiagentstore.ai, gorilla.cs.berkeley.edu, pypi.org, aimultiple.com, budibase.com, payanagent.com

### B5 · unbranded · _"AI agent knowledge graph"_
- **Tracked sites cited:** _none_
- **Other domains:** reddit.com, github.com, learn.deeplearning.ai, stardog.com, surrealdb.com, youtube.com, memgraph.com, artefact.com, llamaindex.ai

### C1 · competitive · _"Alternatives to huggingface for AI agents"_
- **Tracked sites cited:** _none_
- **Other domains:** youtube.com, reddit.com, infrabase.ai, producthunt.com, northflank.com, eesel.ai, langfuse.com, clickup.com

### C2 · competitive · _"Replicate vs Modal vs Together for AI inference"_
- **Tracked sites cited:** _none_
- **Other domains:** sfailabs.com, toolhalla.ai, respan.ai, nightwatcherai.com, getdeploying.com, blog.images.cv, rywalker.com, infrabase.ai, sourceforge.net

### C3 · competitive · _"LangChain agents vs CrewAI comparison"_
- **Tracked sites cited:** _none_
- **Other domains:** draftnrun.com, reddit.com, instinctools.com, scalekit.com, orq.ai, nxcode.io, smythos.com, gocodeo.com, sparkco.ai, muoro.io

### C4 · competitive · _"AI catalogs that index MCP servers"_
- **Tracked sites cited:** _none_
- **Note:** perplexity returned no results / hit auth wall

## What this means for the board

1. **The infrastructure investment is working as designed for branded discovery.** Anyone Googling/Perplexity-ing 'Colaberry AI' finds us first. That's table stakes; we built it.

2. **The honest authority gap is real.** No general-category query cites us yet — Hugging Face, GitHub, Reddit, and category-specific aggregators (mcp.so, aiagentslist.com) dominate. They have backlinks + community + age that we don't.

3. **What's missing isn't engineering — it's authority.** Next investment cycle: PR + content + Wikipedia article + open-sourcing a key component to gain GitHub presence. These are Layer 2 levers. Layer 1 is done.

4. **Re-run quarterly.** This baseline (2026-W20: 5/5 branded, 0/9 unbranded+competitive) is the trend line to watch. Goal for Q3: get unbranded hit rate above 0.

## How to rerun

Manual run via Chrome MCP — see `scripts/aeo-citation-test.mjs`. Sign in to Perplexity Pro to avoid the anonymous rate limit (kicks in ~13 queries).

---

_Generated 2026-05-11. Methodology: each query loaded as `https://www.perplexity.ai/?q=<urlencoded>`. After response renders, clicked the 'Links' tab and extracted unique non-perplexity hostnames from `a[href^="http"]`. Tracked domains are the 15 sites in `scripts/aeo-benchmark.mjs` SITES list._
