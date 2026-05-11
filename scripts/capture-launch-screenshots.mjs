#!/usr/bin/env node
/**
 * capture-launch-screenshots.mjs
 *
 * Captures the live production site (www.colaberry.ai) in both LIGHT and
 * DARK mode across every major page, section-by-section. Used to regenerate
 * the `screenshots-linkedin-launch/` folder for the v1 launch LinkedIn post.
 *
 * Usage:
 *   node scripts/capture-launch-screenshots.mjs
 *   node scripts/capture-launch-screenshots.mjs --only=homepage      # single page
 *   node scripts/capture-launch-screenshots.mjs --base=http://localhost:3000
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

const BASE_URL = args.base || "https://www.colaberry.ai";
const OUTPUT_DIR = path.join(PROJECT_ROOT, "screenshots-linkedin-launch");
const VIEWPORT = { width: 1486, height: 826 };
const SECTION_STRIDE = 0.8; // overlap between sections
const MAX_SECTIONS = 6;

const PAGES = [
  { name: "homepage", path: "/" },
  { name: "aixcelerator", path: "/aixcelerator" },
  { name: "platform-ontology", path: "/aixcelerator/ontology" },
  { name: "ecosystem", path: "/aixcelerator/ecosystem" },
  { name: "solution-stacks", path: "/aixcelerator/solution-stacks" },
  { name: "agents-catalog", path: "/aixcelerator/agents" },
  { name: "agents-ontology", path: "/aixcelerator/agents/ontology" },
  { name: "agents-graph", path: "/aixcelerator/agents/graph" },
  { name: "agents-collections", path: "/aixcelerator/agents/collections" },
  { name: "mcp-catalog", path: "/aixcelerator/mcp" },
  { name: "mcp-ontology", path: "/aixcelerator/mcp/ontology" },
  { name: "mcp-graph", path: "/aixcelerator/mcp/graph" },
  { name: "mcp-collections", path: "/aixcelerator/mcp/collections" },
  { name: "skills-catalog", path: "/aixcelerator/skills" },
  { name: "skills-ontology", path: "/aixcelerator/skills/ontology" },
  { name: "skills-graph", path: "/aixcelerator/skills/graph" },
  { name: "skills-collections", path: "/aixcelerator/skills/collections" },
  { name: "podcasts", path: "/resources/podcasts" },
  { name: "podcasts-ontology", path: "/resources/podcasts/ontology" },
  { name: "podcasts-graph", path: "/resources/podcasts/graph" },
  { name: "podcasts-collections", path: "/resources/podcasts/collections" },
  { name: "industries", path: "/industries" },
  { name: "request-demo", path: "/request-demo" },
  { name: "updates", path: "/updates" },
];

function selectPages() {
  if (!args.only) return PAGES;
  const only = String(args.only).split(",");
  return PAGES.filter((p) => only.includes(p.name));
}

async function killBanners(page) {
  await page.evaluate(() => {
    const killSelectors = [
      '[class*="cookie"]',
      '[id*="cookie"]',
      '[class*="consent"]',
      '[id*="consent"]',
    ];
    killSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el instanceof HTMLElement && el.offsetHeight > 0 && el.offsetHeight < 400) {
          el.remove();
        }
      });
    });
  });
}

async function setMode(page, mode) {
  await page.evaluate((m) => {
    const root = document.documentElement;
    if (m === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try { localStorage.setItem("theme", m); } catch {}
  }, mode);
  await page.waitForTimeout(400);
}

async function scrollFullPage(page) {
  await page.evaluate(async () => {
    const totalHeight = document.body.scrollHeight;
    let y = 0;
    while (y < totalHeight) {
      y += 400;
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 500));
  });
}

async function captureSections(page, pageName, mode) {
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  const stride = VIEWPORT.height * SECTION_STRIDE;
  const sections = Math.min(MAX_SECTIONS, Math.max(1, Math.ceil(totalHeight / stride)));

  const saved = [];
  for (let i = 0; i < sections; i++) {
    const scrollY = i * stride;
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(500);

    const filename = `${pageName}-${mode}-section${i + 1}.png`;
    const fullPath = path.join(OUTPUT_DIR, filename);
    await page.screenshot({ path: fullPath, type: "png", fullPage: false });
    saved.push(filename);
    console.log(`  ✓ ${filename}`);
  }
  return saved;
}

(async () => {
  console.log(`📸 Capturing ${selectPages().length} page(s) × 2 modes × up to ${MAX_SECTIONS} sections`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Output:   ${OUTPUT_DIR}`);

  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2, // retina output
    colorScheme: "light",
  });
  const page = await context.newPage();

  let totalFiles = 0;
  const results = [];

  for (const { name, path: pagePath } of selectPages()) {
    const url = `${BASE_URL}${pagePath}`;
    console.log(`\n🌐 ${name} → ${url}`);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      // Give it a beat for client-side hydration + CMS fetches
      await page.waitForTimeout(1500);
      await killBanners(page);

      // LIGHT MODE
      await setMode(page, "light");
      await scrollFullPage(page);
      const light = await captureSections(page, name, "light");

      // DARK MODE
      await setMode(page, "dark");
      await scrollFullPage(page);
      const dark = await captureSections(page, name, "dark");

      totalFiles += light.length + dark.length;
      results.push({ name, url, light: light.length, dark: dark.length });
    } catch (err) {
      console.error(`  ✗ failed: ${err.message}`);
      results.push({ name, url, error: err.message });
    }
  }

  await browser.close();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Done. ${totalFiles} screenshots saved to:`);
  console.log(`   ${OUTPUT_DIR}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.table(results);
})();
