#!/usr/bin/env node
/**
 * scripts/generate-demo-walkthrough.mjs
 * ------------------------------------------------------------
 * Walkthrough video generator for /demo/[slug] pages.
 *
 * Two modes:
 *
 *   --mode=tour       (default) Playwright records a scripted scroll through
 *                     the /demo/[slug] detail page on the local Next dev server.
 *                     Output: public/videos/<slug>-walkthrough.mp4
 *
 *   --mode=explainer  Playwright launches Chromium with a Y4M file as the
 *                     fake webcam input, drives the live VTON app through its
 *                     actual flow (face detection → photo mode → SKU cycle),
 *                     and records the product in action.
 *                     Output: public/videos/<slug>-explainer.mp4
 *                     Requires: tmp/fake-camera.y4m (see `prepare-fake-camera.mjs`)
 *
 * Requirements:
 *   - Playwright Chromium installed (`npx playwright install chromium`)
 *   - System `ffmpeg` in PATH (`brew install ffmpeg` on macOS)
 *   - For --mode=tour:      dev server at http://localhost:3000
 *   - For --mode=explainer: internet access to the Cloud Run VTON app
 *                           AND a prepared tmp/fake-camera.y4m (any face
 *                           video converted via `prepare-fake-camera.mjs`)
 *
 * Usage:
 *   # Tour mode (page scroll-through):
 *   node scripts/generate-demo-walkthrough.mjs
 *   node scripts/generate-demo-walkthrough.mjs --slug goggle-vton
 *
 *   # Explainer mode (real product in action):
 *   node scripts/prepare-fake-camera.mjs --input ~/face-clip.mp4
 *   node scripts/generate-demo-walkthrough.mjs --mode=explainer
 *
 *   # Flags:
 *   --slug <slug>                 which demo (default: goggle-vton)
 *   --mode <tour|explainer>       (default: tour)
 *   --host <url>                  dev server host for tour mode
 *   --vton-url <url>              VTON app URL for explainer mode
 *   --camera-file <path>          Y4M fake camera file for explainer mode
 *   --no-titles                   skip title + end cards (raw recording only)
 *   --headed                      run Chromium with UI (debug only)
 */

import { mkdir, rm, stat, writeFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, execFileSync } from "node:child_process";

import { chromium } from "playwright";

import { demos, getDemoBySlug } from "../src/data/demos.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");

// ------------------------------------------------------------ CLI args

const args = process.argv.slice(2);
function flag(name, fallback = null) {
  // Accept both "--foo=bar" and "--foo bar"
  const eqIdx = args.findIndex((a) => a.startsWith(`${name}=`));
  if (eqIdx !== -1) {
    return args[eqIdx].slice(name.length + 1);
  }
  const idx = args.findIndex((a) => a === name);
  if (idx === -1) return fallback;
  const next = args[idx + 1];
  if (!next || next.startsWith("--")) return true;
  return next;
}

const slug = flag("--slug") || "goggle-vton";
const mode = flag("--mode") || "tour";
const host = flag("--host") || "http://localhost:3000";
const vtonUrl =
  flag("--vton-url") || "https://vton-demo-956818257204.us-east1.run.app";
const cameraFile =
  flag("--camera-file") || join(REPO_ROOT, "tmp", "fake-camera.y4m");
const skipTitles = flag("--no-titles") === true;
const headed = flag("--headed") === true;

if (!["tour", "explainer"].includes(mode)) {
  console.error(`[ERR] Unknown mode "${mode}". Use --mode=tour or --mode=explainer.`);
  process.exit(1);
}

const demo = getDemoBySlug(slug);
if (!demo) {
  console.error(
    `[ERR] Unknown demo slug "${slug}". Live demos: ${demos
      .filter((d) => d.status === "live")
      .map((d) => d.slug)
      .join(", ")}`
  );
  process.exit(1);
}

// ------------------------------------------------------------ paths + constants

// Native 16:9 at 1440 wide so the video fills the detail-page hero slot
// (`aspect-video` / 16:9) without letterboxing. Previous 1440x900 (8:5) left
// black bars top+bottom at embed time.
const VIDEO_WIDTH = 1440;
const VIDEO_HEIGHT = 810;

// Embedded brand assets — Inter matches the site's next/font/google family
// so title + end cards are pixel-consistent with the page chrome.
const FONT_REGULAR = join(REPO_ROOT, "scripts", "assets", "fonts", "Inter-Regular.ttf");
const FONT_MEDIUM = join(REPO_ROOT, "scripts", "assets", "fonts", "Inter-Medium.ttf");
const FONT_BOLD = join(REPO_ROOT, "scripts", "assets", "fonts", "Inter-Bold.ttf");

// Brand palette (locked theming standard — see CLAUDE.md):
//   bg     zinc-950  #09090B
//   text   zinc-50   #FAFAFA
//   muted  zinc-400  #A1A1AA
//   dim    zinc-500  #71717A
//   coral  #DC2626 (CTAs + accent dots only)
const COLOR_BG = "0x09090B";
const COLOR_TEXT = "0xFAFAFA";
const COLOR_MUTED = "0xA1A1AA";
const COLOR_DIM = "0x71717A";
const COLOR_CORAL = "0xDC2626";

const OUTPUT_DIR = join(REPO_ROOT, "public", "videos");
const TMP_DIR = join(REPO_ROOT, "tmp", "walkthrough-recorder");
const RAW_VIDEO_DIR = join(TMP_DIR, "raw");
const TITLE_CARD = join(TMP_DIR, "title.mp4");
const END_CARD = join(TMP_DIR, "end.mp4");
const CONCAT_LIST = join(TMP_DIR, "concat.txt");

const OUTPUT_BASENAME = mode === "explainer" ? `${slug}-explainer` : `${slug}-walkthrough`;
const FINAL_MP4 = join(OUTPUT_DIR, `${OUTPUT_BASENAME}.mp4`);
const POSTER_JPG = join(OUTPUT_DIR, `${OUTPUT_BASENAME}-poster.jpg`);

// ------------------------------------------------------------ helpers

function logStep(...msgs) {
  // eslint-disable-next-line no-console
  console.log("•", ...msgs);
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    stdio: opts.silent ? ["ignore", "pipe", "pipe"] : "inherit",
    ...opts,
  });
  if (res.status !== 0) {
    const detail = opts.silent
      ? `\nstdout:\n${res.stdout?.toString() || ""}\nstderr:\n${res.stderr?.toString() || ""}`
      : "";
    throw new Error(`Command failed: ${cmd} ${args.join(" ")}${detail}`);
  }
  return res;
}

async function ensureFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
  } catch {
    throw new Error(
      "ffmpeg not found in PATH. Install via `brew install ffmpeg` (macOS)."
    );
  }
}

async function ensureDevServer() {
  try {
    const res = await fetch(`${host}/demo/${slug}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    throw new Error(
      `Dev server not reachable at ${host}/demo/${slug} — start it with \`npm run dev\` first. (${err.message})`
    );
  }
}

async function ensureVtonReachable() {
  try {
    const res = await fetch(vtonUrl, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    throw new Error(
      `VTON app not reachable at ${vtonUrl} — check internet access or override via --vton-url. (${err.message})`
    );
  }
}

async function ensureCameraFile() {
  try {
    await access(cameraFile);
  } catch {
    throw new Error(
      [
        `Fake-camera Y4M file not found at ${cameraFile}.`,
        "Generate one first:",
        "  node scripts/prepare-fake-camera.mjs --input <path/to/any-face-video.mp4>",
        "",
        "Any MP4 / MOV / WEBM with a single front-facing face works (smartphone selfie video, stock clip, etc.).",
      ].join("\n")
    );
  }
}

// Escape single quotes for ffmpeg drawtext
function ffText(s) {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'");
}

async function findRawWebm() {
  const { readdir } = await import("node:fs/promises");
  const files = await readdir(RAW_VIDEO_DIR);
  const webm = files.find((f) => f.endsWith(".webm"));
  if (!webm) throw new Error("Playwright did not produce a .webm recording");
  return join(RAW_VIDEO_DIR, webm);
}

// ------------------------------------------------------------ tour mode: scroll through detail page

async function recordTour() {
  logStep(`Recording page tour for /demo/${slug} at ${host}`);

  await rm(RAW_VIDEO_DIR, { recursive: true, force: true });
  await mkdir(RAW_VIDEO_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({
    viewport: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: RAW_VIDEO_DIR,
      size: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
    },
    colorScheme: "dark",
  });
  const page = await context.newPage();

  await context.addCookies([
    { name: "cb-consent", value: "accepted", url: host },
  ]);

  await page.goto(`${host}/demo/${slug}`, { waitUntil: "networkidle" });

  const acceptBtn = page.getByRole("button", { name: /accept all cookies/i });
  if (await acceptBtn.count()) {
    await acceptBtn.first().click({ trial: false }).catch(() => {});
    await page.waitForTimeout(400);
  }

  // Hero hold
  await page.waitForTimeout(2500);

  // Slow scroll down to metrics band
  await page.evaluate(async () => {
    const target = 680;
    const steps = 60;
    for (let i = 0; i < steps; i++) {
      window.scrollBy(0, target / steps);
      await new Promise((r) => setTimeout(r, 50));
    }
  });
  await page.waitForTimeout(1200);

  const featuresHeading = page.getByRole("heading", { name: /core capabilities/i });
  if (await featuresHeading.count()) {
    await featuresHeading.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(2500);
  }

  const techHeading = page.getByRole("heading", { name: /technology stack/i });
  if (await techHeading.count()) {
    await techHeading.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(2800);
  }

  const launchCta = page.getByRole("heading", {
    name: new RegExp(`launch the live ${demo.title}`, "i"),
  });
  if (await launchCta.count()) {
    await launchCta.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(1800);

  await context.close();
  await browser.close();

  const rawWebm = await findRawWebm();
  logStep(`Raw tour recording: ${rawWebm}`);
  return rawWebm;
}

// ------------------------------------------------------------ explainer mode: drive VTON with fake camera

async function recordExplainer() {
  logStep(`Recording product explainer against ${vtonUrl}`);
  logStep(`Fake camera source: ${cameraFile}`);

  await rm(RAW_VIDEO_DIR, { recursive: true, force: true });
  await mkdir(RAW_VIDEO_DIR, { recursive: true });

  // Chromium flags enable a fake media device fed by our Y4M file. This is
  // the only way to give the VTON demo (getUserMedia → MediaPipe) real face
  // frames without attaching an actual webcam.
  //
  // MediaPipe's face-detection model ships as WASM + ONNX/TFLite assets that
  // require SharedArrayBuffer (cross-origin isolation) and accelerated canvas
  // to initialize. Headless Chromium blocks some of these by default, so we
  // opt in explicitly — without these, the VTON app shows "Failed to load
  // face detection model" and the pipeline never starts.
  const browser = await chromium.launch({
    headless: !headed,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-video-capture=${cameraFile}`,
      // MediaPipe + WASM essentials
      "--enable-features=SharedArrayBuffer",
      "--enable-unsafe-webgpu",
      "--ignore-gpu-blocklist",
      "--enable-gpu-rasterization",
      "--use-gl=angle",
      "--use-angle=default",
      // Reduce CPU jitter during recording
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
    ],
  });

  const vtonOrigin = new URL(vtonUrl).origin;
  const context = await browser.newContext({
    viewport: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: RAW_VIDEO_DIR,
      size: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
    },
    colorScheme: "dark",
    permissions: ["camera"],
    // Grant camera permission to the VTON origin so getUserMedia resolves
    // without a prompt (the --use-fake-ui flag also suppresses the prompt).
  });
  await context.grantPermissions(["camera"], { origin: vtonOrigin });

  const page = await context.newPage();

  // Forward page console errors / failed requests to our stdout so a failing
  // model fetch ("Failed to load face detection model") is visible in the
  // generator run log instead of only in the final MP4.
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      logStep(`  [page ${msg.type()}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    logStep(`  [page error] ${err.message}`);
  });
  page.on("requestfailed", (req) => {
    logStep(`  [request failed] ${req.url()} — ${req.failure()?.errorText}`);
  });

  await page.goto(vtonUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });

  // The beats below mirror the VTON LangGraph pipeline documented in
  // Goggle_VTON_Architecture.pdf §6.1:
  //   detect → classify → fit → recommend → render
  //
  // 0) Wait for the React SPA to mount — we need the canvas/video to
  //    exist before we can hide the hero + pin the studio card. Cold
  //    Cloud Run starts can take a few seconds.
  logStep("Init: waiting for VTON UI to mount");
  await page
    .waitForFunction(() => document.querySelector("canvas, video") !== null, {
      timeout: 45_000,
    })
    .catch(() => {});

  // Remove the hero card that sits above the try-on studio. Previous
  // attempts used inline `display:none` but React re-renders wiped the
  // style. We now install a persistent MutationObserver that re-hides
  // the hero every time React recreates it, plus a CSS stylesheet that
  // pins the studio card to the top of the viewport.
  //
  // We target the hero by the page's unique headline text — safer than
  // hashed class names which can change between deploys.
  logStep("Pinning try-on studio to top of viewport (hero hidden persistently)");
  await page.evaluate(() => {
    const HERO_MATCH = /virtual try-on for premium eyewear|move between live try-on/i;

    const findHeroRoot = () => {
      const el = Array.from(document.querySelectorAll("h1, h2, p")).find(
        (n) => HERO_MATCH.test(n.textContent || "")
      );
      if (!el) return null;
      // Bubble up until we hit a direct child of main / body / root.
      let node = el;
      for (let i = 0; i < 8 && node.parentElement; i++) {
        const parent = node.parentElement;
        if (
          parent === document.body ||
          parent.id === "root" ||
          parent.tagName === "MAIN"
        ) break;
        node = parent;
      }
      return node;
    };

    const hideHero = () => {
      const hero = findHeroRoot();
      if (hero && hero.style.display !== "none") {
        hero.style.setProperty("display", "none", "important");
      }
    };

    hideHero();

    // Re-hide on any DOM mutation. Scoped to <main> / <body> so we catch
    // React re-renders. Cheap enough — <100 mutations over 30 s of
    // recording — and beats fighting React over the scroll position.
    const observer = new MutationObserver(hideHero);
    observer.observe(document.body, { childList: true, subtree: true });
    // Expose on window so we could disconnect later if needed
    window.__heroObserver = observer;

    window.scrollTo(0, 0);
  });

  await page.waitForTimeout(400);

  // Scroll the camera to the top of the viewport (hero is gone, so
  // camera element should already be near the top, but confirm).
  await page.evaluate(() => {
    const cam = document.querySelector("video") || document.querySelector("canvas");
    if (cam) {
      const rect = cam.getBoundingClientRect();
      // If cam is already near top (< 100 px) leave it. Otherwise nudge.
      if (rect.top > 100) window.scrollBy(0, rect.top - 30);
    }
  });

  const scrollInfo = await page.evaluate(() => {
    const cam =
      document.querySelector("video") || document.querySelector("canvas");
    const rect = cam?.getBoundingClientRect();
    const heroEl = Array.from(document.querySelectorAll("h1, h2, p")).find(
      (n) => /virtual try-on for premium eyewear/i.test(n.textContent || "")
    );
    return {
      scrollY: window.scrollY,
      camTop: rect?.top ?? null,
      camBottom: rect?.bottom ?? null,
      heroVisible: heroEl ? heroEl.offsetHeight > 0 : "not-found",
    };
  });
  logStep(
    `  scrollY=${scrollInfo.scrollY}  camTop=${scrollInfo.camTop}  camBottom=${scrollInfo.camBottom}  heroVisible=${scrollInfo.heroVisible}`
  );

  // Now wait for MediaPipe to finish loading its WASM model + receive
  // first frame from the fake camera. Cold Cloud Run starts need ~6 s.
  // We do this AFTER hero-hide so the first frames the recorder sees
  // already have the studio card pinned at the top.
  logStep("Waiting for MediaPipe + first camera frame (6s)");
  await page.waitForTimeout(6000);

  // 1) DETECT — MediaPipe 478-point face mesh tracks the fake-camera feed.
  //    Landing state is "Position Your Face" with a live overlay.
  logStep("Beat 1: DETECT — live face mesh (5s)");
  await page.waitForTimeout(5000);

  // Enter the 3D try-on mode. The VTON app's studio header has a toggle
  // with two labels: "VIEW FRAMES" and "VIEW 3D TRY ON". Clicking the 3D
  // label (or the container holding it) switches the canvas to the live
  // Three.js overlay with a selected goggle SKU.
  logStep("Beat 1.5: switch to 3D try-on");
  const tryOn3dBtn = page
    .getByRole("button", { name: /view 3d try on/i })
    .or(page.getByText(/view 3d try on/i));
  if (await tryOn3dBtn.count()) {
    await tryOn3dBtn.first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  // 2) CLASSIFY — trigger the shape classifier via guided photo capture.
  //    The hero panel has a "Guided photo capture" affordance; clicking it
  //    flips the studio into capture mode and exposes a "Capture" button.
  logStep("Beat 2: CLASSIFY — guided photo capture");
  const guidedCaptureBtn = page
    .getByRole("button", { name: /guided photo capture|photo mode/i })
    .or(page.getByText(/guided photo capture/i));
  if (await guidedCaptureBtn.count()) {
    await guidedCaptureBtn.first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(2000);

    const captureBtn = page
      .getByRole("button", { name: /^capture|capture photo|take photo/i })
      .or(page.getByText(/^capture$/i));
    if (await captureBtn.count()) {
      await captureBtn.first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(3000);
    } else {
      await page.waitForTimeout(3000);
    }
  } else {
    logStep("  guided-capture affordance not found — holding on 3D view");
    await page.waitForTimeout(5000);
  }

  // 3) FIT — cycle 3 SKUs so viewers see trimesh width-scoring variety.
  //    "Try All Frames" enters a grid; "Try Another" advances through
  //    individual SKUs. We fall back to any "next frame" / arrow button.
  logStep("Beat 3: FIT — SKU cycle (3 frames)");
  const tryAllBtn = page
    .getByRole("button", { name: /try all frames|all frames|view frames/i })
    .or(page.getByText(/try all frames/i));
  if (await tryAllBtn.count()) {
    await tryAllBtn.first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(2000);
  }
  for (let i = 0; i < 3; i++) {
    const nextBtn = page
      .getByRole("button", { name: /try another|next frame|next goggle/i })
      .or(page.getByText(/try another/i));
    if ((await nextBtn.count()) === 0) break;
    await nextBtn.first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  // 4) RECOMMEND — the LangGraph + GPT-4.1 "Fit recommendations" panel.
  //    The hero exposes a "Fit recommendations" affordance that scrolls to
  //    or opens the recommendations block.
  logStep("Beat 4: RECOMMEND — expert-optician picks (5s)");
  const recsAffordance = page
    .getByRole("button", { name: /fit recommendations|recommended for you/i })
    .or(page.getByText(/fit recommendations|recommended for you/i));
  if (await recsAffordance.count()) {
    await recsAffordance.first().scrollIntoViewIfNeeded().catch(() => {});
    await recsAffordance.first().click({ force: true }).catch(() => {});
  }
  await page.waitForTimeout(5000);

  // 5) RENDER — return to live camera for the closing Three.js + R3F overlay.
  logStep("Beat 5: RENDER — back to live (5s)");
  const liveBtn = page
    .getByRole("button", { name: /^live( mode)?$|realtime 3d overlay/i })
    .or(page.getByText(/^live( mode)?$/i));
  if (await liveBtn.count()) {
    await liveBtn.first().click({ force: true }).catch(() => {});
  }
  await page.waitForTimeout(5000);

  await context.close();
  await browser.close();

  const rawWebm = await findRawWebm();
  logStep(`Raw explainer recording: ${rawWebm}`);
  return rawWebm;
}

// ------------------------------------------------------------ ffmpeg: title + end cards
//
// Both cards render at VIDEO_WIDTHxVIDEO_HEIGHT with the locked brand palette
// (zinc + coral accent, Inter typography). The end card hosts the brand
// lockup: coral dot + "colaberry" (Regular) + "AI" (Bold) + "RESEARCH LABS"
// microcopy — mirrors the header logo at src/components/Layout.tsx.

function renderTitleCard(outPath, { kicker, title, subtitle, duration }) {
  // Stacked, center-aligned, vertical rhythm tuned for 1440x810.
  const kickerY = 300;
  const dotY = 330; // between kicker and title
  const titleY = 362;
  const subtitleY = 478;

  const dotX = Math.round((VIDEO_WIDTH - 12) / 2);
  const filter = [
    // small coral accent square between kicker and title
    `drawbox=x=${dotX}:y=${dotY}:w=12:h=12:color=${COLOR_CORAL}@1:t=fill`,
    // kicker (uppercase, tracked via content — ffmpeg drawtext has no
    // letter-spacing; we pass the caller's pre-uppercased string)
    `drawtext=fontfile=${FONT_MEDIUM}:text='${ffText(kicker)}':fontcolor=${COLOR_MUTED}:fontsize=20:x=(w-text_w)/2:y=${kickerY}`,
    // big display title
    `drawtext=fontfile=${FONT_BOLD}:text='${ffText(title)}':fontcolor=${COLOR_TEXT}:fontsize=76:x=(w-text_w)/2:y=${titleY}`,
    // pipeline subtitle
    `drawtext=fontfile=${FONT_REGULAR}:text='${ffText(subtitle)}':fontcolor=${COLOR_MUTED}:fontsize=26:x=(w-text_w)/2:y=${subtitleY}`,
  ].join(",");

  run("ffmpeg", [
    "-y",
    "-f", "lavfi",
    "-i", `color=c=${COLOR_BG}:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:d=${duration}:r=30`,
    "-vf", filter,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "veryfast",
    "-profile:v", "high",
    "-crf", "20",
    outPath,
  ]);
}

function renderEndCard(outPath, { kicker, cta, duration }) {
  // The brand lockup is "colaberry" (Regular) + "AI" (Bold) — mirrors the
  // site header logo at src/components/Layout.tsx. The coral accent sits
  // centered BETWEEN the kicker and the lockup (matching the title card)
  // rather than next to the wordmark — keeps the lockup clean and reads
  // as an intentional brand mark rather than a floating dot.
  //
  // We pre-compute all absolute pixel positions in JS because ffmpeg
  // drawtext expressions with literal divisions (e.g. `(iw-458)/2`) fail
  // silently on some builds; `(w-text_w)/2` still works fine.
  const logoFontSize = 92;
  const kickerY = 260;
  const dotY = 298;
  const logoY = 330;
  const researchY = 452;
  const ctaY = 538;

  // Empirically measured advance widths for Inter:
  //   "colaberry" Regular  ~ 0.49em × 9 chars
  //   "AI"        Bold     ~ 0.54em × 2 chars
  const wCol = Math.round("colaberry".length * logoFontSize * 0.49);
  const wAI = Math.round("AI".length * logoFontSize * 0.54);
  const gap = 16;
  const totalW = wCol + gap + wAI;
  const lockupX = Math.round((VIDEO_WIDTH - totalW) / 2);
  const aiX = lockupX + wCol + gap;

  // Coral accent centered horizontally above the lockup
  const dotX = Math.round((VIDEO_WIDTH - 12) / 2);

  const filter = [
    // kicker (small caps, above everything)
    `drawtext=fontfile=${FONT_MEDIUM}:text='${ffText(kicker)}':fontcolor=${COLOR_MUTED}:fontsize=18:x=(w-text_w)/2:y=${kickerY}`,
    // coral accent square — centered, separates kicker from logo
    `drawbox=x=${dotX}:y=${dotY}:w=12:h=12:color=${COLOR_CORAL}@1:t=fill`,
    // brand lockup: Regular "colaberry" + Bold "AI"
    `drawtext=fontfile=${FONT_REGULAR}:text='colaberry':fontcolor=${COLOR_TEXT}:fontsize=${logoFontSize}:x=${lockupX}:y=${logoY}`,
    `drawtext=fontfile=${FONT_BOLD}:text='AI':fontcolor=${COLOR_TEXT}:fontsize=${logoFontSize}:x=${aiX}:y=${logoY}`,
    // RESEARCH LABS microcopy (tracked caps via literal spacing)
    `drawtext=fontfile=${FONT_MEDIUM}:text='R E S E A R C H   L A B S':fontcolor=${COLOR_DIM}:fontsize=15:x=(w-text_w)/2:y=${researchY}`,
    // CTA row
    `drawtext=fontfile=${FONT_REGULAR}:text='${ffText(cta)}':fontcolor=${COLOR_MUTED}:fontsize=22:x=(w-text_w)/2:y=${ctaY}`,
  ].join(",");

  run("ffmpeg", [
    "-y",
    "-f", "lavfi",
    "-i", `color=c=${COLOR_BG}:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:d=${duration}:r=30`,
    "-vf", filter,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "veryfast",
    "-profile:v", "high",
    "-crf", "20",
    outPath,
  ]);
}

// ------------------------------------------------------------ ffmpeg: normalise raw webm → 1440x900 mp4

async function normaliseRaw(rawWebm) {
  const normalised = join(TMP_DIR, `${OUTPUT_BASENAME}-body.mp4`);
  // Playwright records with variable-frame-rate WebM; the duration
  // metadata and real content length can disagree by 20+ seconds. We
  // normalise by:
  //   1. Trimming the leading 3 s (page still loading, hero not yet
  //      hidden, scroll not yet applied).
  //   2. Capping the total body length at 34 s for explainer mode —
  //      the sum of our beat timings is ~36 s, and the VO audio is
  //      ~38 s; 34 s + 2.6 s title + 2.8 s end = ~39.4 s, which
  //      matches the narration duration cleanly.
  const trimFront = mode === "explainer" ? 3 : 0;
  const bodyDuration = mode === "explainer" ? 34 : null;
  const trimArgs = [
    ...(trimFront > 0 ? ["-ss", String(trimFront)] : []),
    ...(bodyDuration ? ["-t", String(bodyDuration)] : []),
  ];
  run("ffmpeg", [
    "-y",
    ...trimArgs,
    "-i", rawWebm,
    "-vf",
    `scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=decrease,pad=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=${COLOR_BG},fps=30`,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "veryfast",
    "-profile:v", "high",
    "-crf", "20",
    "-an",
    normalised,
  ]);
  return normalised;
}

// ------------------------------------------------------------ ffmpeg: concat + poster

async function concat(parts) {
  const body = parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
  await writeFile(CONCAT_LIST, body, "utf8");
  run("ffmpeg", [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", CONCAT_LIST,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "veryfast",
    "-profile:v", "high",
    "-crf", "20",
    "-movflags", "+faststart",
    "-an",
    FINAL_MP4,
  ]);
}

async function extractPoster() {
  run("ffmpeg", [
    "-y",
    "-ss", "0.5",
    "-i", FINAL_MP4,
    "-frames:v", "1",
    "-q:v", "3",
    POSTER_JPG,
  ]);
}

// ------------------------------------------------------------ main

async function main() {
  await ensureFfmpeg();

  if (mode === "tour") {
    await ensureDevServer();
  } else {
    await ensureVtonReachable();
    await ensureCameraFile();
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(TMP_DIR, { recursive: true });

  const rawWebm =
    mode === "explainer" ? await recordExplainer() : await recordTour();
  const body = await normaliseRaw(rawWebm);

  let parts;
  if (skipTitles) {
    parts = [body];
  } else {
    logStep("Rendering title + end cards");
    // Explainer subtitle names the LangGraph pipeline stages so a viewer who
    // drops in mid-clip can map what they see to the architecture doc:
    //   Goggle_VTON_Architecture.pdf section 6.1 — detect -> classify -> fit
    //   -> recommend -> render.
    // Inter-based cards support the Unicode arrow (U+2192) cleanly now that
    // we ship Inter Regular/Medium/Bold as fontfiles.
    const titleSubtitle =
      mode === "explainer"
        ? "Detect  \u2192  Classify  \u2192  Fit  \u2192  Recommend  \u2192  Render"
        : "A guided walkthrough";
    const endKicker = mode === "explainer" ? "TRY IT YOURSELF" : "TRY IT LIVE";

    renderTitleCard(TITLE_CARD, {
      kicker: demo.category.toUpperCase(),
      title: demo.title,
      subtitle: titleSubtitle,
      duration: 2.6,
    });
    renderEndCard(END_CARD, {
      kicker: endKicker,
      cta: `Launch the live demo  \u2192  colaberry.ai/demo/${slug}`,
      duration: 2.8,
    });
    parts = [TITLE_CARD, body, END_CARD];
  }

  logStep("Concatenating final MP4");
  await concat(parts);

  logStep("Extracting poster frame");
  await extractPoster();

  const st = await stat(FINAL_MP4);
  const mb = (st.size / (1024 * 1024)).toFixed(2);

  // eslint-disable-next-line no-console
  console.log(
    [
      "",
      "Done.",
      `  Mode   : ${mode}`,
      `  Video  : ${FINAL_MP4}  (${mb} MB)`,
      `  Poster : ${POSTER_JPG}`,
      "",
      "Next: set in src/data/demos.ts:",
      `  videoEmbedUrl: "/videos/${OUTPUT_BASENAME}.mp4",`,
      `  videoPoster:   "/videos/${OUTPUT_BASENAME}-poster.jpg",`,
      "",
    ].join("\n")
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("\n[ERR]", err.message);
  process.exit(1);
});
