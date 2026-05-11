#!/usr/bin/env node
/**
 * scripts/add-explainer-audio.mjs
 * ------------------------------------------------------------
 * Generates a voice-over track from a plain-text script via the macOS
 * `say` command, normalizes it with ffmpeg's `loudnorm` filter, and muxes
 * it into the existing explainer MP4 produced by `generate-demo-walkthrough.mjs`.
 *
 * Why `say` (not ElevenLabs / Azure / etc.)?
 *   - Zero cost, offline, deterministic, no API key
 *   - Shipped with macOS; the Colaberry dev machines are all Macs
 *   - Good enough for an internal baseline — swap to ElevenLabs later by
 *     dropping a .wav / .m4a alongside the script and passing --audio-file
 *
 * The script file supports `[[slnc <ms>]]` for inline silence, which we
 * use to land VO beats on the visual pipeline stages (detect -> classify
 * -> fit -> recommend -> render) without hard-coding per-segment timings.
 * See `scripts/vo/goggle-vton-explainer.txt`.
 *
 * Usage:
 *   node scripts/add-explainer-audio.mjs
 *   node scripts/add-explainer-audio.mjs --slug goggle-vton
 *
 *   # Override voice / rate (default: Samantha @ 165 wpm):
 *   node scripts/add-explainer-audio.mjs --voice Daniel --rate 170
 *
 *   # Provide a pre-recorded voice-over instead of TTS:
 *   node scripts/add-explainer-audio.mjs --audio-file path/to/vo.m4a
 *
 * Flags:
 *   --slug <slug>          which demo (default: goggle-vton)
 *   --script <path>        VO script (default: scripts/vo/<slug>-explainer.txt)
 *   --voice <name>         macOS `say` voice (default: Samantha)
 *   --rate <wpm>           words per minute (default: 165)
 *   --audio-file <path>    skip TTS, use this audio file as-is
 *   --music <path>         optional background music bed (not implemented yet)
 *   --keep-silent          also keep a copy of the muted MP4 at <name>-silent.mp4
 */

import { mkdir, stat, access, copyFile, rm } from "node:fs/promises";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, execFileSync } from "node:child_process";
import { platform } from "node:os";

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

const slug = flag("--slug") || "goggle-vton";
const voice = flag("--voice") || "Samantha";
const rate = Number(flag("--rate") || 165);
const scriptPath =
  flag("--script") || join(REPO_ROOT, "scripts", "vo", `${slug}-explainer.txt`);
const audioFileOverride = flag("--audio-file");
const keepSilent = flag("--keep-silent") === true;

// ------------------------------------------------------------ paths

const VIDEO_PATH = join(REPO_ROOT, "public", "videos", `${slug}-explainer.mp4`);
const VIDEO_SILENT = join(
  REPO_ROOT,
  "public",
  "videos",
  `${slug}-explainer-silent.mp4`
);
const TMP_DIR = join(REPO_ROOT, "tmp", "audio");
const RAW_AIFF = join(TMP_DIR, `${slug}-vo.aiff`);
const NORM_M4A = join(TMP_DIR, `${slug}-vo.m4a`);

// ------------------------------------------------------------ helpers

function logStep(...msgs) {
  // eslint-disable-next-line no-console
  console.log("•", ...msgs);
}

function run(cmd, argv, opts = {}) {
  const res = spawnSync(cmd, argv, {
    stdio: opts.silent ? ["ignore", "pipe", "pipe"] : "inherit",
    ...opts,
  });
  if (res.status !== 0) {
    const detail = opts.silent
      ? `\nstdout:\n${res.stdout?.toString() || ""}\nstderr:\n${
          res.stderr?.toString() || ""
        }`
      : "";
    throw new Error(`Command failed: ${cmd} ${argv.join(" ")}${detail}`);
  }
  return res;
}

async function ensureFile(path, hint) {
  try {
    await access(path);
  } catch {
    throw new Error(`Required file missing: ${path}${hint ? `\n  ${hint}` : ""}`);
  }
}

function ensureFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
  } catch {
    throw new Error("ffmpeg not found in PATH. `brew install ffmpeg`.");
  }
}

function ensureSay() {
  if (platform() !== "darwin") {
    throw new Error(
      "`say` is macOS-only. Use --audio-file <path> on other platforms, or run on a Mac."
    );
  }
  try {
    execFileSync("say", ["-v", "?"], { stdio: "ignore" });
  } catch {
    throw new Error("`say` command unavailable.");
  }
}

function probeDuration(path) {
  const res = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      path,
    ],
    { encoding: "utf8" }
  );
  if (res.status !== 0) throw new Error(`ffprobe failed on ${path}`);
  return parseFloat(res.stdout.trim());
}

// ------------------------------------------------------------ main

async function main() {
  ensureFfmpeg();
  await ensureFile(VIDEO_PATH, `Run \`node scripts/generate-demo-walkthrough.mjs --mode=explainer\` first.`);
  await mkdir(TMP_DIR, { recursive: true });

  let audioForMux;

  if (audioFileOverride) {
    logStep(`Using provided audio file: ${audioFileOverride}`);
    audioForMux = resolve(audioFileOverride);
    await ensureFile(audioForMux);
  } else {
    ensureSay();
    await ensureFile(
      scriptPath,
      `Write a VO script at scripts/vo/${slug}-explainer.txt (supports [[slnc <ms>]] for silence).`
    );

    logStep(`Synthesizing VO with say (voice=${voice}, rate=${rate})`);
    logStep(`  script : ${scriptPath}`);
    await rm(RAW_AIFF, { force: true });
    run("say", ["-v", voice, "-r", String(rate), "-f", scriptPath, "-o", RAW_AIFF]);

    const voDuration = probeDuration(RAW_AIFF);
    logStep(`  raw VO duration: ${voDuration.toFixed(2)}s`);

    logStep("Normalizing + encoding to AAC (loudnorm I=-16 LRA=11 TP=-1.5)");
    await rm(NORM_M4A, { force: true });
    run("ffmpeg", [
      "-y",
      "-i",
      RAW_AIFF,
      // Broadcast-safe target loudness for voice-over content
      "-af",
      "loudnorm=I=-16:LRA=11:TP=-1.5,highpass=f=80,lowpass=f=12000",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ar",
      "48000",
      "-ac",
      "2",
      NORM_M4A,
    ]);
    audioForMux = NORM_M4A;
  }

  const videoDuration = probeDuration(VIDEO_PATH);
  const audioDuration = probeDuration(audioForMux);
  logStep(
    `Durations: video ${videoDuration.toFixed(2)}s · audio ${audioDuration.toFixed(2)}s`
  );
  if (audioDuration > videoDuration + 0.5) {
    logStep(
      `  [warn] audio is ${(audioDuration - videoDuration).toFixed(
        2
      )}s longer than video — will be truncated via -shortest`
    );
  }

  // Keep a silent backup before overwriting (the generator writes a silent
  // MP4 and we want to preserve it once — future runs skip this if it exists).
  if (keepSilent || !(await fileExists(VIDEO_SILENT))) {
    logStep(`Preserving silent copy -> ${basename(VIDEO_SILENT)}`);
    await copyFile(VIDEO_PATH, VIDEO_SILENT);
  }

  const tmpOut = join(TMP_DIR, `${slug}-explainer-with-audio.mp4`);
  await rm(tmpOut, { force: true });

  logStep("Muxing audio into explainer MP4");
  run("ffmpeg", [
    "-y",
    "-i",
    VIDEO_SILENT, // video from the preserved silent copy
    "-i",
    audioForMux,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy", // don't re-encode video (faster, no quality loss)
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    "-shortest",
    tmpOut,
  ]);

  // Replace the live video file atomically
  await copyFile(tmpOut, VIDEO_PATH);
  await rm(tmpOut, { force: true });

  const st = await stat(VIDEO_PATH);
  const mb = (st.size / (1024 * 1024)).toFixed(2);

  // eslint-disable-next-line no-console
  console.log(
    [
      "",
      "Done.",
      `  Video  : ${VIDEO_PATH}  (${mb} MB, now with audio)`,
      `  Silent : ${VIDEO_SILENT}  (preserved, untouched)`,
      "",
      "Verify with:",
      "  ffprobe -v error -show_streams public/videos/" + basename(VIDEO_PATH),
      "",
    ].join("\n")
  );
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("\n[ERR]", err.message);
  process.exit(1);
});
