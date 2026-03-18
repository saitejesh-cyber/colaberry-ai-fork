#!/usr/bin/env node
/**
 * Seed telemetry data for ALL MCP servers on dev CMS.
 * Sends events via the POST /api/mcp-telemetry endpoint on dev.
 */

const DEV_API = "https://dev.colaberry.ai/api/mcp-telemetry";
const CMS = "https://dev-cms.colaberry.ai";
const TOKEN = process.env.CMS_API_TOKEN || "e8a7e99a3d61233e32fbef071a307a3d455c2f9ef635ff494d949375c33bc6059fba4286d41ce3d88847638c3394b576efca1231df6cffd65d1accb8971af89720be18441488e0c602a332507ae4fd89ed05b75cf606bf76b39b462f6e528d9ce2c7f6c346bc90bdf3889c69a21e2f2c3cb116b503fb051bac85e08dac754a26";

const TOOLS = [
  "execute", "query", "search", "list", "get", "create", "update", "delete",
  "fetch", "analyze", "sync", "validate", "transform", "process", "connect"
];
const CLIENTS = ["Claude Desktop", "Cursor", "VS Code", "Windsurf", "Continue"];

// Fetch all slugs from CMS
async function getAllSlugs() {
  const slugs = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const url = `${CMS}/api/mcp-servers?pagination[page]=${page}&pagination[pageSize]=${pageSize}&fields[0]=slug`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!res.ok) { console.error("CMS error:", res.status); break; }
    const body = await res.json();
    const items = body.data || [];
    if (items.length === 0) break;
    for (const item of items) {
      const slug = item.attributes?.slug || item.slug;
      if (slug) slugs.push(slug);
    }
    const total = body.meta?.pagination?.total || 0;
    if (page * pageSize >= total) break;
    page++;
  }

  return slugs;
}

// Seed events for a single slug (3-8 random events)
async function seedSlug(slug) {
  const eventCount = 3 + Math.floor(Math.random() * 6); // 3 to 8 events
  let ok = 0;

  for (let i = 0; i < eventCount; i++) {
    const tool = TOOLS[Math.floor(Math.random() * TOOLS.length)];
    const client = CLIENTS[Math.floor(Math.random() * CLIENTS.length)];
    const latency = Math.floor(Math.random() * 900) + 50; // 50-950ms
    const success = Math.random() > 0.08; // ~92% success rate

    try {
      const res = await fetch(DEV_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, toolName: tool, clientName: client, latencyMs: latency, success })
      });
      if (res.ok) ok++;
    } catch (_) {}
  }
  return { slug, ok, total: eventCount };
}

// Process in batches to avoid overwhelming the server
async function seedBatch(slugs, batchSize = 20) {
  let done = 0;
  let totalOk = 0;

  for (let i = 0; i < slugs.length; i += batchSize) {
    const batch = slugs.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(s => seedSlug(s)));
    for (const r of results) totalOk += r.ok;
    done += batch.length;
    if (done % 200 === 0 || done === slugs.length) {
      console.log(`Progress: ${done}/${slugs.length} servers seeded (${totalOk} events)`);
    }
  }

  return totalOk;
}

async function main() {
  console.log("Fetching all MCP server slugs from dev CMS...");
  const slugs = await getAllSlugs();
  console.log(`Found ${slugs.length} servers. Seeding telemetry events...`);

  const totalEvents = await seedBatch(slugs, 20);
  console.log(`\nDone! Seeded ${totalEvents} telemetry events across ${slugs.length} servers.`);
}

main().catch(console.error);
