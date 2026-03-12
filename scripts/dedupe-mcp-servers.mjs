#!/usr/bin/env node
/**
 * dedupe-mcp-servers.mjs
 *
 * Finds and removes duplicate MCP servers in the Strapi CMS.
 * Groups servers by normalized name and keeps the "best" entry per group.
 *
 * Usage:
 *   node scripts/dedupe-mcp-servers.mjs --dry-run          # preview only (default)
 *   node scripts/dedupe-mcp-servers.mjs --execute           # actually delete duplicates
 *
 * Environment:
 *   CMS_URL       — Strapi base URL (default: http://localhost:1337)
 *   CMS_API_TOKEN — Strapi API token with delete permissions
 */

const CMS_URL = (process.env.CMS_URL || process.env.NEXT_PUBLIC_CMS_URL || "http://localhost:1337").replace(/\/$/, "");
const CMS_API_TOKEN = process.env.CMS_API_TOKEN || "";
const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");
const VERBOSE = args.includes("--verbose") || args.includes("-v");

if (!CMS_API_TOKEN) {
  console.error("Error: CMS_API_TOKEN environment variable is required.");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${CMS_API_TOKEN}`,
};

/** Fetch all MCP servers from Strapi (paginated). */
async function fetchAllServers() {
  const all = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const url =
      `${CMS_URL}/api/mcp-servers` +
      `?pagination[page]=${page}&pagination[pageSize]=${pageSize}` +
      `&fields[0]=name&fields[1]=slug&fields[2]=registryName` +
      `&fields[3]=longDescription&fields[4]=capabilities&fields[5]=keyBenefits` +
      `&fields[6]=installCommand&fields[7]=sourceUrl&fields[8]=description` +
      `&fields[9]=configSnippet&fields[10]=tools&fields[11]=useCases` +
      `&publicationState=live`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch page ${page}: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    const data = json?.data || [];
    if (data.length === 0) break;

    for (const item of data) {
      all.push({
        documentId: item.documentId,
        id: item.id,
        name: item.name || "",
        slug: item.slug || "",
        registryName: item.registryName || "",
        longDescription: item.longDescription || "",
        capabilities: item.capabilities || "",
        keyBenefits: item.keyBenefits || "",
        installCommand: item.installCommand || "",
        sourceUrl: item.sourceUrl || "",
        description: item.description || "",
        configSnippet: item.configSnippet || "",
        tools: item.tools || "",
        useCases: item.useCases || "",
      });
    }

    const pagination = json?.meta?.pagination;
    if (!pagination || page >= pagination.pageCount) break;
    page++;
  }

  return all;
}

/** Score an entry by content richness. Higher = better. */
function contentScore(server) {
  let score = 0;
  if (server.longDescription) score += 10;
  if (server.capabilities) score += 5;
  if (server.keyBenefits) score += 5;
  if (server.useCases) score += 4;
  if (server.tools) score += 4;
  if (server.installCommand) score += 3;
  if (server.configSnippet) score += 3;
  if (server.sourceUrl) score += 3;
  if (server.description) score += 2;
  // Prefer shorter slugs (original imports, not -16 suffix copies)
  score += Math.max(0, 50 - server.slug.length);
  return score;
}

/** Normalize a name for grouping. */
function normalizeName(name) {
  return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Delete a server by documentId. */
async function deleteServer(documentId) {
  const res = await fetch(`${CMS_URL}/api/mcp-servers/${documentId}`, {
    method: "DELETE",
    headers,
  });
  return res.ok;
}

async function main() {
  console.log(`\n🔍 Fetching all MCP servers from ${CMS_URL}...\n`);

  const servers = await fetchAllServers();
  console.log(`  Total servers in CMS: ${servers.length}\n`);

  // Group by normalized name
  const groups = new Map();
  for (const server of servers) {
    const key = normalizeName(server.name);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(server);
  }

  // Find duplicate groups
  const duplicateGroups = [];
  for (const [name, entries] of groups) {
    if (entries.length > 1) {
      duplicateGroups.push({ name, entries });
    }
  }

  if (duplicateGroups.length === 0) {
    console.log("✅ No duplicates found.\n");
    return;
  }

  // Sort groups by duplicate count descending
  duplicateGroups.sort((a, b) => b.entries.length - a.entries.length);

  let totalDuplicates = 0;
  const toDelete = [];

  console.log(`⚠️  Found ${duplicateGroups.length} duplicate groups:\n`);
  console.log("─".repeat(80));

  for (const { name, entries } of duplicateGroups) {
    // Score each entry and pick the best
    const scored = entries.map((e) => ({ ...e, score: contentScore(e) }));
    scored.sort((a, b) => b.score - a.score);

    const keeper = scored[0];
    const dupes = scored.slice(1);
    totalDuplicates += dupes.length;

    console.log(`\n  "${name}" — ${entries.length} entries (removing ${dupes.length})`);
    console.log(`    ✓ KEEP: slug="${keeper.slug}" score=${keeper.score} docId=${keeper.documentId}`);
    for (const dupe of dupes) {
      console.log(`    ✗ DELETE: slug="${dupe.slug}" score=${dupe.score} docId=${dupe.documentId}`);
      toDelete.push(dupe);
    }
  }

  console.log("\n" + "─".repeat(80));
  console.log(`\n  Summary: ${totalDuplicates} duplicates across ${duplicateGroups.length} groups`);
  console.log(`  Unique servers after dedup: ${servers.length - totalDuplicates}\n`);

  if (!EXECUTE) {
    console.log("  ℹ️  DRY RUN — no changes made. Use --execute to delete duplicates.\n");
    return;
  }

  // Execute deletions
  console.log(`  🗑️  Deleting ${toDelete.length} duplicate entries...\n`);
  let deleted = 0;
  let failed = 0;

  for (const entry of toDelete) {
    const ok = await deleteServer(entry.documentId);
    if (ok) {
      deleted++;
      if (VERBOSE) console.log(`    ✓ Deleted: ${entry.slug} (${entry.documentId})`);
    } else {
      failed++;
      console.error(`    ✗ Failed to delete: ${entry.slug} (${entry.documentId})`);
    }
    // Small delay to avoid overwhelming the CMS
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\n  ✅ Done: ${deleted} deleted, ${failed} failed.\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
