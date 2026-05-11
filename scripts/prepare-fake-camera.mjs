#!/usr/bin/env node
/**
 * scripts/prepare-fake-camera.mjs
 * ------------------------------------------------------------
 * Convert any short face video (mp4 / mov / webm) into a Y4M file that
 * Chromium can use as a fake webcam via `--use-file-for-fake-video-capture`.
 *
 * Chromium auto-loops the Y4M during playback, so a ~10–15 second clip is
 * plenty for a 45-second product explainer recording.
 *
 * Tips for the input clip:
 *   - One clearly visible front-facing face (single subject).
 *   - Good lighting, minimal movement.
 *   - 10–20 seconds is ideal (Y4M is uncompressed → larger clips = huge files).
 *   - A smartphone selfie video works perfectly.
 *   - CC0 stock options: pexels.com, pixabay.com (filter to "people" + "face").
 *
 * Usage:
 *   node scripts/prepare-fake-camera.mjs --input ~/face-clip.mp4
 *   node scripts/prepare-fake-camera.mjs --input ~/face-clip.mp4 --output tmp/fake-camera.y4m
 *   node scripts/prepare-fake-camera.mjs --input ~/face-clip.mp4 --width 640 --height 480 --duration 12
 *
 * The default output resolution (640x480) + 30 fps keeps the Y4M under ~400 MB
 * for a 12-second clip. MediaPipe works fine at 640x480 — going higher just
 * grows the file.
 */

import { access, mkdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, execFileSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");

// ------------------------------------------------------------ CLI args

const args = process.argv.slice(2);
function flag(name, fallback = null) {
  const eqIdx = args.findIndex((a) => a.startsWith(`${name}=`));
  if (eqIdx !== -1) return args[eqIdx].slice(name.length + 1);
  const idx = args.findIndex((a) => a === name);
  if (idx === -1) return fallback;
  const next = args[idx + 1];
  if (!next || next.startsWith("--")) return true;
  return next;
}

const input = flag("--input");
const output = flag("--output") || join(REPO_ROOT, "tmp", "fake-camera.y4m");
const width = Number(flag("--width") || 640);
const height = Number(flag("--height") || 480);
const duration = Number(flag("--duration") || 12);
const fps = Number(flag("--fps") || 30);

if (!input) {
  console.error(
    [
      "[ERR] Missing --input",
      "",
      "Usage:",
      "  node scripts/prepare-fake-camera.mjs --input <path-to-face-video.mp4>",
      "",
      "Any MP4 / MOV / WEBM with a clearly-visible face works.",
      "A quick smartphone selfie video is usually fastest.",
    ].join("\n")
  );
  process.exit(1);
}

// ------------------------------------------------------------ helpers

function logStep(...msgs) {
  // eslint-disable-next-line no-console
  console.log("•", ...msgs);
}

function run(cmd, cmdArgs) {
  const res = spawnSync(cmd, cmdArgs, { stdio: "inherit" });
  if (res.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${cmdArgs.join(" ")}`);
  }
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

async function ensureInput() {
  try {
    await access(resolve(input));
  } catch {
    throw new Error(`Input file not found: ${input}`);
  }
}

// ------------------------------------------------------------ main

async function main() {
  await ensureFfmpeg();
  await ensureInput();

  const outputAbs = resolve(output);
  await mkdir(dirname(outputAbs), { recursive: true });

  logStep(`Input      : ${resolve(input)}`);
  logStep(`Output     : ${outputAbs}`);
  logStep(`Target     : ${width}x${height} @ ${fps}fps, ${duration}s`);

  // Convert to Y4M:
  //   - yuv420p is the only pixel format Chromium's fake-camera accepts
  //   - yuv4mpegpipe == Y4M container
  //   - force sar=1/1 so MediaPipe treats aspect as square (no distorted face)
  //   - trim to `duration` seconds; Chromium auto-loops the file
  run("ffmpeg", [
    "-y",
    "-i", resolve(input),
    "-t", String(duration),
    "-vf", `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=${fps},setsar=1/1`,
    "-pix_fmt", "yuv420p",
    "-f", "yuv4mpegpipe",
    outputAbs,
  ]);

  const st = await stat(outputAbs);
  const mb = (st.size / (1024 * 1024)).toFixed(2);

  // eslint-disable-next-line no-console
  console.log(
    [
      "",
      "Done.",
      `  Y4M : ${outputAbs}  (${mb} MB)`,
      "",
      "Next: record the explainer video:",
      "  node scripts/generate-demo-walkthrough.mjs --mode=explainer",
      "",
    ].join("\n")
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("\n[ERR]", err.message);
  process.exit(1);
});
