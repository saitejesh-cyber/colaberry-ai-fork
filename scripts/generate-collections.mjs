#!/usr/bin/env node

/**
 * Auto-generate skill collections from CMS data using tag co-occurrence clustering.
 * Outputs to src/data/generated-collections.json.
 *
 * Usage:
 *   node scripts/generate-collections.mjs [options]
 *
 * Options:
 *   --dry-run               Preview without writing files
 *   --url <cms-url>         Override CMS URL
 *   --token <token>         Override CMS API token
 *   --min-cluster-size <n>  Minimum skills per collection (default: 8)
 *   --max-collections <n>   Maximum collections to generate (default: 30)
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
function getArg(name, fallback = "") {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : fallback;
}
function hasFlag(name) { return args.includes(name); }

const urlOverride = getArg("--url");
const tokenOverride = getArg("--token");
if (urlOverride) process.env.NEXT_PUBLIC_CMS_URL = urlOverride;
if (tokenOverride) process.env.CMS_API_TOKEN = tokenOverride;

const dryRun = hasFlag("--dry-run");
const MIN_CLUSTER_SIZE = parseInt(getArg("--min-cluster-size", "8"), 10);
const MAX_COLLECTIONS = parseInt(getArg("--max-collections", "30"), 10);

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── Taxonomy (ported from src/data/skill-taxonomy.ts) ───────────────── */

const SKILL_CATEGORIES = [
  { slug: "development", label: "Development", keywords: ["development", "developer", "workflow", "coding", "code", "frontend", "backend", "api", "sdk", "cli", "devtools", "git", "debug"] },
  { slug: "ai-generation", label: "AI & Generation", keywords: ["ai", "aigc", "generation", "llm", "prompt", "gpt", "claude", "model", "inference", "embedding", "chat", "pre-built", "prebuilt", "official"] },
  { slug: "research", label: "Research", keywords: ["research", "literature", "academic", "paper", "citation", "hypothesis", "analysis", "study"] },
  { slug: "data-science", label: "Data & Science", keywords: ["data", "science", "analytics", "pipeline", "visualization", "bioinformatics", "statistics", "ml", "machine learning", "dataset"] },
  { slug: "business", label: "Business", keywords: ["business", "enterprise", "crm", "finance", "sales", "marketing", "operations", "management", "domain", "cloud"] },
  { slug: "testing", label: "Testing & QA", keywords: ["testing", "test", "qa", "quality", "ci", "cd", "automation", "validation", "unit", "integration", "e2e"] },
  { slug: "productivity", label: "Productivity", keywords: ["productivity", "automation", "workflow", "document", "email", "calendar", "scheduling", "notification", "task"] },
  { slug: "security", label: "Security", keywords: ["security", "compliance", "vulnerability", "audit", "auth", "access", "encryption", "firewall", "threat"] },
  { slug: "infrastructure", label: "Infrastructure", keywords: ["infrastructure", "devops", "cloud", "docker", "kubernetes", "aws", "azure", "gcp", "terraform", "deploy", "orchestration", "dispatch", "meta"] },
  { slug: "other", label: "Other", keywords: [] },
];

function classifySkill(skill) {
  const value = `${skill.category || ""} ${skill.skillType || ""}`.toLowerCase();
  if (!value.trim()) return SKILL_CATEGORIES[SKILL_CATEGORIES.length - 1];
  let bestMatch = null;
  let bestScore = 0;
  for (const cat of SKILL_CATEGORIES) {
    if (cat.slug === "other") continue;
    let score = 0;
    for (const kw of cat.keywords) {
      if (value.includes(kw)) score++;
    }
    if (score > bestScore) { bestScore = score; bestMatch = cat; }
  }
  return bestMatch || SKILL_CATEGORIES[SKILL_CATEGORIES.length - 1];
}

/* ── CMS Fetch ───────────────────────────────────────────────────────── */

async function fetchAllSkills() {
  const skills = [];
  let page = 1;
  const pageSize = 100;
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  console.log(`📡 Fetching skills from ${baseUrl}/api/skills ...`);

  while (true) {
    const url = `${baseUrl}/api/skills?pagination[page]=${page}&pagination[pageSize]=${pageSize}&populate[tags][fields][0]=name&populate[tags][fields][1]=slug&fields[0]=name&fields[1]=slug&fields[2]=summary&fields[3]=category&fields[4]=skillType&fields[5]=prerequisites`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`CMS ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const batch = json.data || [];
    if (batch.length === 0) break;

    for (const item of batch) {
      skills.push({
        slug: item.slug,
        name: item.name,
        summary: item.summary || "",
        category: item.category || "",
        skillType: item.skillType || "",
        prerequisites: item.prerequisites || "",
        tags: (item.tags || []).map((t) => ({
          slug: t.slug || "",
          name: t.name || "",
        })),
      });
    }

    const { pageCount } = json.meta?.pagination || {};
    if (page >= (pageCount || 1)) break;
    page++;
    if (page % 10 === 0) console.log(`  ... page ${page} (${skills.length} skills so far)`);
    await sleep(50);
  }

  console.log(`✅ Fetched ${skills.length} skills total`);
  return skills;
}

/* ── Tag Co-occurrence Clustering ────────────────────────────────────── */

function clusterByTags(skills) {
  // Step 1: Build tag → skills index
  const tagSkills = new Map();
  for (const skill of skills) {
    const tags = (skill.tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean);
    for (const tag of tags) {
      if (!tagSkills.has(tag)) tagSkills.set(tag, []);
      tagSkills.get(tag).push(skill.slug);
    }
  }

  // Step 2: Build tag co-occurrence matrix — how often two tags appear together
  const coOccurrence = new Map(); // "tagA|tagB" → count
  for (const skill of skills) {
    const tags = (skill.tags || []).map((t) => (t.slug || t.name || "").toLowerCase()).filter(Boolean);
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const key = [tags[i], tags[j]].sort().join("|");
        coOccurrence.set(key, (coOccurrence.get(key) || 0) + 1);
      }
    }
  }

  // Step 3: Build tag clusters using greedy connected-components
  // Tags with co-occurrence ≥ 3 are "connected"
  const tagAdj = new Map();
  for (const [key, count] of coOccurrence.entries()) {
    if (count < 3) continue;
    const [a, b] = key.split("|");
    if (!tagAdj.has(a)) tagAdj.set(a, new Set());
    if (!tagAdj.has(b)) tagAdj.set(b, new Set());
    tagAdj.get(a).add(b);
    tagAdj.get(b).add(a);
  }

  // BFS to find connected components of tags
  const visited = new Set();
  const clusters = [];
  for (const tag of tagAdj.keys()) {
    if (visited.has(tag)) continue;
    const cluster = [];
    const queue = [tag];
    while (queue.length > 0) {
      const current = queue.pop();
      if (visited.has(current)) continue;
      visited.add(current);
      cluster.push(current);
      for (const neighbor of tagAdj.get(current) || []) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }
    clusters.push(cluster);
  }

  // Step 4: Convert tag clusters to skill collections
  const slugIndex = new Map(skills.map((s) => [s.slug, s]));
  const collections = [];

  for (const tagCluster of clusters) {
    // Find all skills that have at least 1 tag in this cluster
    const skillSlugs = new Set();
    for (const tag of tagCluster) {
      for (const slug of tagSkills.get(tag) || []) {
        skillSlugs.add(slug);
      }
    }

    if (skillSlugs.size < MIN_CLUSTER_SIZE) continue;

    // Determine primary category (mode of skills' categories)
    const catCounts = {};
    for (const slug of skillSlugs) {
      const skill = slugIndex.get(slug);
      if (!skill) continue;
      const cat = classifySkill(skill).slug;
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    }
    const primaryCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "other";

    // Sort tags by frequency (how many skills they appear in within this cluster)
    const tagFreq = tagCluster.map((tag) => ({
      tag,
      count: (tagSkills.get(tag) || []).filter((s) => skillSlugs.has(s)).length,
    })).sort((a, b) => b.count - a.count);

    // Name from top 2-3 tags
    const topTags = tagFreq.slice(0, 3).map((t) => t.tag);
    const slug = topTags.join("-").replace(/[^a-z0-9-]/g, "").slice(0, 60);
    const name = topTags.map((t) => t.replace(/-/g, " ")).join(", ");

    // Description from top skills
    const topSkills = [...skillSlugs].slice(0, 5).map((s) => slugIndex.get(s)?.name || s);
    const catLabel = SKILL_CATEGORIES.find((c) => c.slug === primaryCategory)?.label || "Other";
    const description = `${catLabel} skills including ${topSkills.slice(0, 3).join(", ")}${skillSlugs.size > 3 ? `, and ${skillSlugs.size - 3} more` : ""}.`;

    // Keyword tags — top 5 tags by frequency
    const keywordTags = tagFreq.slice(0, 8).map((t) => t.tag);

    // Difficulty based on cluster size: small = advanced, large = beginner
    const difficulty = skillSlugs.size > 20 ? "beginner" : skillSlugs.size > 10 ? "intermediate" : "advanced";

    collections.push({
      slug,
      name,
      description,
      category: primaryCategory,
      skillSlugs: [...skillSlugs],
      difficulty,
      keywordTags,
      linkCount: Math.min(skillSlugs.size - 1, 20), // approximate
      generated: true,
    });
  }

  // Sort by skill count descending, take top N
  collections.sort((a, b) => b.skillSlugs.length - a.skillSlugs.length);
  return collections.slice(0, MAX_COLLECTIONS);
}

/* ── Main ─────────────────────────────────────────────────────────────── */

async function main() {
  console.log("🏗️  Generate Skill Collections");
  console.log(`   CMS: ${baseUrl}`);
  console.log(`   Min cluster size: ${MIN_CLUSTER_SIZE}`);
  console.log(`   Max collections: ${MAX_COLLECTIONS}`);
  console.log(`   Dry run: ${dryRun}`);
  console.log();

  if (!baseUrl) {
    console.error("❌ No CMS URL found. Set NEXT_PUBLIC_CMS_URL or use --url");
    process.exit(1);
  }

  const skills = await fetchAllSkills();
  const collections = clusterByTags(skills);

  console.log(`\n📦 Generated ${collections.length} collections:`);
  for (const col of collections) {
    console.log(`   ${col.slug} — ${col.skillSlugs.length} skills [${col.category}] tags: ${col.keywordTags.slice(0, 4).join(", ")}`);
  }

  const totalSkills = new Set(collections.flatMap((c) => c.skillSlugs)).size;
  console.log(`\n📊 Total: ${collections.length} collections, ${totalSkills} unique skills`);

  if (dryRun) {
    console.log("\n🔍 Dry run — no files written");
    return;
  }

  // Write generated-collections.json
  const outPath = resolve(__dirname, "../src/data/generated-collections.json");
  writeFileSync(outPath, JSON.stringify(collections, null, 2));
  console.log(`\n✅ Written to ${outPath}`);

  // Write stats
  const statsPath = resolve(__dirname, "../src/data/generated-collection-stats.json");
  const stats = {
    generatedAt: new Date().toISOString(),
    totalCollections: collections.length,
    totalUniqueSkills: totalSkills,
    totalSkillsInCms: skills.length,
    categoryCounts: {},
  };
  for (const col of collections) {
    stats.categoryCounts[col.category] = (stats.categoryCounts[col.category] || 0) + 1;
  }
  writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  console.log(`✅ Stats written to ${statsPath}`);
}

main().catch((err) => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
