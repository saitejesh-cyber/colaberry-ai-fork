#!/usr/bin/env node

/**
 * One-time migration: Fix auto-generated MCP server slugs and raw registry names.
 *
 * Usage:
 *   node scripts/fix-mcp-slugs.mjs [options]
 *
 * Options:
 *   --dry-run          Preview changes without updating Strapi
 *   --limit <n>        Only process first n servers
 *   --url <cms-url>    Override CMS URL (default: NEXT_PUBLIC_CMS_URL)
 *   --token <token>    Override CMS API token (default: CMS_API_TOKEN)
 *   --help             Show this help message
 *
 * Environment variables:
 *   NEXT_PUBLIC_CMS_URL    Strapi CMS base URL
 *   CMS_API_TOKEN          Strapi API token
 */

const args = process.argv.slice(2);

function getArg(name, fallback = "") {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : fallback;
}
function hasFlag(name) {
  return args.includes(name);
}

if (hasFlag("--help")) {
  console.log(`
fix-mcp-slugs — Fix auto-generated slugs and raw registry names

Usage:
  node scripts/fix-mcp-slugs.mjs [options]

Options:
  --dry-run          Preview changes without updating Strapi
  --limit <n>        Only process first n servers
  --url <cms-url>    Override CMS URL
  --token <token>    Override CMS API token
  --help             Show this help message

Examples:
  # Preview all fixes
  node scripts/fix-mcp-slugs.mjs --dry-run

  # Fix first 20 servers on local CMS
  node scripts/fix-mcp-slugs.mjs --limit 20

  # Fix on dev CMS
  CMS_API_TOKEN=xxx node scripts/fix-mcp-slugs.mjs --url https://dev-cms.colaberry.ai
`);
  process.exit(0);
}

/* ---------- Config ------------------------------------------------------- */

const urlOverride = getArg("--url");
const tokenOverride = getArg("--token");
if (urlOverride) process.env.NEXT_PUBLIC_CMS_URL = urlOverride;
if (tokenOverride) process.env.CMS_API_TOKEN = tokenOverride;

const dryRun = hasFlag("--dry-run");
const limitArg = getArg("--limit");
const limit = limitArg ? Number.parseInt(limitArg, 10) : 0;

const baseUrl = (
  process.env.CMS_URL ||
  process.env.NEXT_PUBLIC_CMS_URL ||
  process.env.STRAPI_URL ||
  ""
).trim().replace(/\/$/, "");

const token = (
  process.env.CMS_API_TOKEN ||
  process.env.STRAPI_TOKEN ||
  ""
).trim();

if (!baseUrl) {
  console.error("Missing CMS URL. Set --url or NEXT_PUBLIC_CMS_URL.");
  process.exit(1);
}
if (!token && !dryRun) {
  console.error("Missing CMS token. Set --token or CMS_API_TOKEN.");
  process.exit(1);
}

/* ---------- Helpers ------------------------------------------------------ */

async function fetchCMS(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`CMS ${res.status}: ${await res.text().catch(() => "")}`);
  }
  return res.json();
}

function deriveSlug(name) {
  if (!name.includes("/")) {
    return name.replace(/[^a-z0-9-]/gi, "-").toLowerCase().replace(/-+/g, "-").replace(/^-|-$/g, "");
  }
  const parts = name.split("/").filter(Boolean);
  const vendor = parts[0];
  const server = parts[parts.length - 1];
  const vendorClean = vendor.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const serverClean = server.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const combined = serverClean.startsWith(vendorClean) ? server : `${vendor}-${server}`;
  return combined.replace(/[^a-z0-9-]/gi, "-").toLowerCase().replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function cleanDisplayName(name) {
  if (!name.includes("/")) return name;
  const parts = name.split("/").filter(Boolean);
  const server = parts[parts.length - 1];
  const vendor = parts.length > 1 ? parts[0].replace(/^(app|ai|co|dev|io|com|org|net|cloud|api|hub|get|run|use|try)\./i, "") : null;
  const titleCase = (s) => s.replace(/[-_.]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const serverDisplay = titleCase(server);
  if (!vendor) return serverDisplay;
  const vendorDisplay = titleCase(vendor);
  if (serverDisplay.toLowerCase().includes(vendorDisplay.toLowerCase())) return serverDisplay;
  return `${vendorDisplay} ${serverDisplay}`;
}

/* ---------- Patterns for bad slugs --------------------------------------- */

// Auto-generated slugs from Strapi or manual entries
const BAD_SLUG_PATTERN = /^(server|mcp)-[a-z0-9]{5,}$/;

/* ---------- Main --------------------------------------------------------- */

async function main() {
  console.log(`\n🔧 Fix MCP Server Slugs & Names\n`);
  console.log(`  CMS:     ${baseUrl}`);
  console.log(`  Dry run: ${dryRun}`);
  if (limit) console.log(`  Limit:   ${limit}`);

  // Fetch all servers
  let page = 1;
  const pageSize = 100;
  const allServers = [];

  while (true) {
    const params = new URLSearchParams({
      "sort": "name:asc",
      "pagination[page]": String(page),
      "pagination[pageSize]": String(pageSize),
      "fields[0]": "name",
      "fields[1]": "slug",
      "fields[2]": "registryName",
    });

    const json = await fetchCMS(`/api/mcp-servers?${params}`);
    const items = json.data || [];
    if (!items.length) break;

    for (const item of items) {
      const attrs = item.attributes || item;
      allServers.push({
        id: item.id,
        documentId: item.documentId || String(item.id),
        name: attrs.name || "",
        slug: attrs.slug || "",
        registryName: attrs.registryName || "",
      });
    }

    const meta = json.meta?.pagination || {};
    if (page >= (meta.pageCount || 1)) break;
    page++;
  }

  console.log(`  Total servers: ${allServers.length}\n`);

  // Build set of existing slugs for collision detection
  const existingSlugs = new Set(allServers.map((s) => s.slug));

  // Find servers that need fixes
  const toFix = [];
  for (const server of allServers) {
    const needsSlugFix = BAD_SLUG_PATTERN.test(server.slug);
    const needsNameFix = server.name.includes("/");

    if (needsSlugFix || needsNameFix) {
      toFix.push({ ...server, needsSlugFix, needsNameFix });
    }
  }

  console.log(`  Bad slugs: ${toFix.filter((s) => s.needsSlugFix).length}`);
  console.log(`  Bad names: ${toFix.filter((s) => s.needsNameFix).length}`);
  console.log(`  Total to fix: ${toFix.length}\n`);

  if (toFix.length === 0) {
    console.log("  ✅ No fixes needed!\n");
    return;
  }

  const batch = limit ? toFix.slice(0, limit) : toFix;
  const redirects = [];
  let fixed = 0;
  let failed = 0;

  for (const server of batch) {
    const updates = {};

    // Fix slug — prefer clean display name over raw registryName for readable slugs
    if (server.needsSlugFix) {
      const displayName = server.name.includes("/") ? cleanDisplayName(server.name) : server.name;
      let newSlug = deriveSlug(displayName);

      // Truncate overly long slugs at a word boundary (max ~50 chars)
      if (newSlug.length > 50) {
        const truncated = newSlug.slice(0, 50).replace(/-[^-]*$/, "");
        newSlug = truncated || newSlug.slice(0, 50);
      }

      // Deduplicate
      let candidate = newSlug;
      let suffix = 1;
      while (existingSlugs.has(candidate) && candidate !== server.slug) {
        candidate = `${newSlug}-${suffix++}`;
      }
      newSlug = candidate;

      if (newSlug !== server.slug) {
        updates.slug = newSlug;
        existingSlugs.add(newSlug);
        redirects.push({ old: server.slug, new: newSlug, name: server.name });
      }
    }

    // Fix name
    if (server.needsNameFix) {
      const newName = cleanDisplayName(server.name);
      if (newName !== server.name) {
        updates.name = newName;
      }
    }

    if (Object.keys(updates).length === 0) continue;

    if (dryRun) {
      console.log(`  [DRY RUN] ${server.name}`);
      if (updates.slug) console.log(`    slug: ${server.slug} → ${updates.slug}`);
      if (updates.name) console.log(`    name: ${server.name} → ${updates.name}`);
    } else {
      try {
        await fetchCMS(`/api/mcp-servers/${server.documentId}`, {
          method: "PUT",
          body: JSON.stringify({ data: updates }),
        });
        fixed++;
      } catch (err) {
        console.log(`  ❌ ${server.name}: ${err.message}`);
        failed++;
      }
    }
  }

  // Output redirect map
  if (redirects.length > 0) {
    console.log(`\n━━━ Redirect Map (add to next.config.ts) ━━━\n`);
    for (const r of redirects) {
      console.log(`  { source: "/aixcelerator/mcp/${r.old}", destination: "/aixcelerator/mcp/${r.new}", permanent: true },`);
    }
  }

  console.log(`\n━━━ Summary ━━━`);
  if (dryRun) {
    console.log(`  Would fix:  ${batch.length} servers`);
    console.log(`  Redirects:  ${redirects.length}`);
  } else {
    console.log(`  Fixed:      ${fixed}`);
    console.log(`  Failed:     ${failed}`);
    console.log(`  Redirects:  ${redirects.length}`);
  }
  console.log();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
