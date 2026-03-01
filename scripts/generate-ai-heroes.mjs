#!/usr/bin/env node
/**
 * generate-ai-heroes.mjs
 *
 * Generates premium photorealistic hero base images using Together AI (FLUX),
 * then feeds them into the existing cinematic pipeline.
 *
 * Free tier: 3 months unlimited access, no credit card required.
 * Sign up at https://api.together.ai — get your API key from the dashboard.
 *
 * Usage:
 *   node scripts/generate-ai-heroes.mjs --all              # Generate all 11 heroes
 *   node scripts/generate-ai-heroes.mjs --key platform      # Generate one hero
 *   node scripts/generate-ai-heroes.mjs --key platform,agents  # Generate specific heroes
 *   node scripts/generate-ai-heroes.mjs --dry-run           # Preview prompts only
 *   node scripts/generate-ai-heroes.mjs --all --no-backup   # Skip backing up originals
 *   node scripts/generate-ai-heroes.mjs --key platform --token YOUR_KEY  # Pass key inline
 *
 * API Key (pick one method):
 *   --token <key>              Pass directly on command line (easiest)
 *   TOGETHER_API_KEY env var   export TOGETHER_API_KEY=...
 *   .env.local file            TOGETHER_API_KEY=... in project root
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

// ── Config ──────────────────────────────────────────────────────────────────
const HERO_DIR = path.resolve("public/media/hero");
const PROMPTS_FILE = path.resolve("prompts/hero-prompts.json");
const BACKUP_DIR = path.resolve("public/media/hero/.backup");
const OUTPUT_WIDTH = 2560;
const OUTPUT_HEIGHT = 1440;

// Together AI config
const TOGETHER_API_URL = "https://api.together.xyz/v1/images/generations";
const FLUX_MODEL = "black-forest-labs/FLUX.1-schnell-Free";
const IMAGE_WIDTH = 1792;   // Wide aspect for hero banners
const IMAGE_HEIGHT = 1024;
const STEPS = 4;            // FLUX.1 schnell is optimized for 1-4 steps
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

// ── Parse CLI args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const noBackup = args.includes("--no-backup");
const allKeys = args.includes("--all");
const keyIdx = args.indexOf("--key");
const requestedKeys = keyIdx !== -1 && args[keyIdx + 1]
  ? args[keyIdx + 1].split(",").map((k) => k.trim())
  : null;

// ── Load prompts ────────────────────────────────────────────────────────────
if (!fs.existsSync(PROMPTS_FILE)) {
  console.error(`❌ Prompt file not found: ${PROMPTS_FILE}`);
  process.exit(1);
}

const prompts = JSON.parse(fs.readFileSync(PROMPTS_FILE, "utf-8"));
const allHeroKeys = Object.keys(prompts);

// Determine which keys to generate
let keysToGenerate;
if (allKeys || dryRun) {
  keysToGenerate = requestedKeys || allHeroKeys;
} else if (requestedKeys) {
  const invalid = requestedKeys.filter((k) => !prompts[k]);
  if (invalid.length) {
    console.error(`❌ Unknown hero key(s): ${invalid.join(", ")}`);
    console.error(`   Available: ${allHeroKeys.join(", ")}`);
    process.exit(1);
  }
  keysToGenerate = requestedKeys;
} else {
  console.log("Usage:");
  console.log("  node scripts/generate-ai-heroes.mjs --all");
  console.log("  node scripts/generate-ai-heroes.mjs --key platform");
  console.log("  node scripts/generate-ai-heroes.mjs --key platform,agents,mcp");
  console.log("  node scripts/generate-ai-heroes.mjs --dry-run");
  console.log("");
  console.log(`Available hero keys: ${allHeroKeys.join(", ")}`);
  process.exit(0);
}

// ── Dry run mode ────────────────────────────────────────────────────────────
if (dryRun) {
  console.log("🔍 DRY RUN — Showing prompts (no images will be generated)\n");
  for (const key of keysToGenerate) {
    const entry = prompts[key];
    console.log(`━━━ ${key.toUpperCase()} ━━━`);
    console.log(`Context: ${entry.context}`);
    console.log(`Prompt:  ${entry.prompt}`);
    console.log(`Model:   ${FLUX_MODEL}`);
    console.log(`Size:    ${IMAGE_WIDTH}x${IMAGE_HEIGHT} → ${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}`);
    console.log(`Output:  ${path.join(HERO_DIR, `hero-${key}.png`)}`);
    console.log("");
  }
  console.log(`Total: ${keysToGenerate.length} hero(es) would be generated.`);
  console.log(`Cost: FREE (Together AI — FLUX.1 Schnell free tier)`);
  process.exit(0);
}

// ── Resolve API key (--token flag > env var > .env.local file) ───────────────
const tokenIdx = args.indexOf("--token");
const tokenArg = tokenIdx !== -1 ? args[tokenIdx + 1] : null;

function readEnvFile() {
  const envPath = path.resolve(".env.local");
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, "utf-8");
  const match = content.match(/^TOGETHER_API_KEY=(.+)$/m);
  return match ? match[1].trim() : null;
}

const apiKey = tokenArg || process.env.TOGETHER_API_KEY || readEnvFile();
if (!apiKey) {
  console.error("❌ Together AI API key not found. Provide it using one of:");
  console.error("");
  console.error("   Option 1 (easiest): Pass inline with --token flag:");
  console.error("     node scripts/generate-ai-heroes.mjs --key platform --token YOUR_KEY");
  console.error("");
  console.error("   Option 2: Create .env.local in project root:");
  console.error("     echo 'TOGETHER_API_KEY=your-key' > .env.local");
  console.error("");
  console.error("   Option 3: Set environment variable:");
  console.error("     export TOGETHER_API_KEY=your-key");
  console.error("");
  console.error("   Get a free key at: https://api.together.ai → Settings → API Keys");
  process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function backupOriginal(key) {
  const src = path.join(HERO_DIR, `hero-${key}.png`);
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const dest = path.join(BACKUP_DIR, `hero-${key}-backup-${Date.now()}.png`);
  fs.copyFileSync(src, dest);
  console.log(`   📦 Backed up original → ${path.basename(dest)}`);
}

async function callTogetherAI(prompt, retries = MAX_RETRIES) {
  const seed = Math.floor(Math.random() * 999999);

  const body = {
    model: FLUX_MODEL,
    prompt,
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    steps: STEPS,
    n: 1,
    seed,
    response_format: "b64_json",
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout

      const res = await fetch(TOGETHER_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 300)}`);
      }

      const json = await res.json();

      if (!json.data || !json.data[0]) {
        throw new Error("No image data in response");
      }

      return json.data[0];
    } catch (err) {
      if (attempt < retries) {
        console.log(`   ⚠️  Attempt ${attempt}/${retries} failed: ${err.message.slice(0, 120)}`);
        console.log(`   ⏳ Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      } else {
        throw new Error(`All ${retries} attempts failed. Last error: ${err.message}`);
      }
    }
  }
}

async function generateHero(key) {
  const entry = prompts[key];
  const outFile = path.join(HERO_DIR, `hero-${key}.png`);
  const tempFile = path.join(HERO_DIR, `.hero-${key}-temp.png`);

  console.log(`\n🎨 Generating: ${key}`);
  console.log(`   Prompt: ${entry.prompt.slice(0, 100)}...`);
  console.log(`   🌐 Requesting from Together AI (FLUX.1 Schnell)...`);

  const startTime = Date.now();

  // Call Together AI
  const imageData = await callTogetherAI(entry.prompt);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`   ⏱️  Generated in ${elapsed}s`);

  // Decode base64 image
  let imageBuffer;
  if (imageData.b64_json) {
    imageBuffer = Buffer.from(imageData.b64_json, "base64");
    console.log(`   📷 Received base64 image (${(imageBuffer.length / 1024).toFixed(0)}KB)`);
  } else if (imageData.url) {
    // Fallback: download from URL if response_format was url
    console.log(`   ⬇️  Downloading from URL...`);
    const dlRes = await fetch(imageData.url);
    if (!dlRes.ok) throw new Error(`Download failed: ${dlRes.status}`);
    imageBuffer = Buffer.from(await dlRes.arrayBuffer());
    console.log(`   📷 Downloaded image (${(imageBuffer.length / 1024).toFixed(0)}KB)`);
  } else {
    throw new Error("No image data (b64_json or url) in response");
  }

  // Save raw image to temp file
  fs.writeFileSync(tempFile, imageBuffer);

  // Backup original
  if (!noBackup) await backupOriginal(key);

  // Resize to target dimensions (2560x1440) and save as PNG
  console.log(`   🔧 Resizing to ${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}...`);
  await sharp(tempFile)
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 6 })
    .toFile(outFile);

  // Clean up temp
  fs.unlinkSync(tempFile);

  const stat = fs.statSync(outFile);
  console.log(`   ✅ Saved: ${path.basename(outFile)} (${(stat.size / 1024 / 1024).toFixed(1)}MB)`);

  return outFile;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function run() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  🖼️  Colaberry AI — Premium Hero Image Generator     ║");
  console.log("║  Provider: Together AI (FREE tier)                   ║");
  console.log("║  Model: FLUX.1 Schnell (photorealistic)             ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`\nGenerating ${keysToGenerate.length} hero image(s)...`);
  console.log(`Cost: FREE 🎉\n`);

  const results = [];
  const errors = [];

  for (const key of keysToGenerate) {
    try {
      const outFile = await generateHero(key);
      results.push({ key, file: outFile });
    } catch (err) {
      console.error(`   ❌ FAILED: ${key} — ${err.message}`);
      errors.push({ key, error: err.message });
    }

    // Small delay between requests to be respectful
    if (keysToGenerate.indexOf(key) < keysToGenerate.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Summary
  console.log("\n════════════════════════════════════════════════════════");
  console.log(`✅ Generated: ${results.length}/${keysToGenerate.length}`);
  if (errors.length) {
    console.log(`❌ Failed: ${errors.length}`);
    errors.forEach((e) => console.log(`   - ${e.key}: ${e.error}`));
  }
  console.log("");
  console.log("Next steps:");
  console.log("  1. node scripts/generate-cinematic-heroes.mjs    (apply overlays)");
  console.log("  2. node scripts/generate-resource-heroes.mjs     (resource variants)");
  console.log("  3. Update HERO_ASSET_VERSION in src/lib/media.ts");
  console.log("  4. npm run build                                  (verify)");
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
