import path from "node:path";
import sharp from "sharp";

const HEROES = [
  {
    key: "platform",
    warm: { x: 2020, y: 360, rx: 760, ry: 460, opacity: 0.27 },
    cool: { x: 1760, y: 900, rx: 980, ry: 540, opacity: 0.22 },
    left: 0.8,
  },
  {
    key: "agents",
    warm: { x: 1860, y: 330, rx: 740, ry: 420, opacity: 0.26 },
    cool: { x: 1960, y: 820, rx: 960, ry: 520, opacity: 0.2 },
    left: 0.76,
  },
  {
    key: "mcp",
    warm: { x: 1960, y: 420, rx: 760, ry: 440, opacity: 0.24 },
    cool: { x: 1760, y: 900, rx: 980, ry: 560, opacity: 0.22 },
    left: 0.82,
  },
  {
    key: "resources",
    warm: { x: 2050, y: 420, rx: 760, ry: 450, opacity: 0.25 },
    cool: { x: 1800, y: 880, rx: 940, ry: 520, opacity: 0.21 },
    left: 0.8,
  },
  {
    key: "solutions",
    warm: { x: 1980, y: 380, rx: 760, ry: 430, opacity: 0.25 },
    cool: { x: 1840, y: 900, rx: 980, ry: 560, opacity: 0.22 },
    left: 0.8,
  },
  {
    key: "industries",
    warm: { x: 2000, y: 390, rx: 760, ry: 440, opacity: 0.24 },
    cool: { x: 1800, y: 900, rx: 960, ry: 540, opacity: 0.21 },
    left: 0.8,
  },
  {
    key: "updates",
    warm: { x: 2000, y: 420, rx: 760, ry: 450, opacity: 0.24 },
    cool: { x: 1780, y: 900, rx: 960, ry: 540, opacity: 0.21 },
    left: 0.8,
  },
];

const WIDTH = 2560;
const HEIGHT = 1440;
const HERO_DIR = path.resolve("public/media/hero");

function overlays(config) {
  const warm = config.warm;
  const cool = config.cool;

  const toneMap = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#071220" stop-opacity="0.45"/>
          <stop offset="0.58" stop-color="#0F2744" stop-opacity="0.30"/>
          <stop offset="1" stop-color="#123B57" stop-opacity="0.38"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grade)"/>
    </svg>
  `);

  const warmGlow = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="#FFBA5D" stop-opacity="${warm.opacity}"/>
          <stop offset="1" stop-color="#FFBA5D" stop-opacity="0"/>
        </radialGradient>
        <filter id="b" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="64"/>
        </filter>
      </defs>
      <ellipse cx="${warm.x}" cy="${warm.y}" rx="${warm.rx}" ry="${warm.ry}" fill="url(#g)" filter="url(#b)"/>
    </svg>
  `);

  const coolGlow = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="#34D5FF" stop-opacity="${cool.opacity}"/>
          <stop offset="1" stop-color="#34D5FF" stop-opacity="0"/>
        </radialGradient>
        <filter id="b" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="72"/>
        </filter>
      </defs>
      <ellipse cx="${cool.x}" cy="${cool.y}" rx="${cool.rx}" ry="${cool.ry}" fill="url(#g)" filter="url(#b)"/>
    </svg>
  `);

  const leftScrim = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="s" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#04080F" stop-opacity="0.92"/>
          <stop offset="0.56" stop-color="#04080F" stop-opacity="${config.left}"/>
          <stop offset="1" stop-color="#04080F" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="${Math.round(WIDTH * 0.56)}" height="${HEIGHT}" fill="url(#s)"/>
    </svg>
  `);

  const subtleGrid = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="p" width="88" height="88" patternUnits="userSpaceOnUse">
          <path d="M88 0H0V88" stroke="#A7BEDD" stroke-opacity="0.07" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#p)"/>
    </svg>
  `);

  const grain = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <filter id="n">
        <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="2" seed="11"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 0.055"/>
        </feComponentTransfer>
      </filter>
      <rect width="100%" height="100%" filter="url(#n)"/>
    </svg>
  `);

  return [
    { input: toneMap, blend: "overlay" },
    { input: warmGlow, blend: "screen" },
    { input: coolGlow, blend: "screen" },
    { input: subtleGrid, blend: "soft-light" },
    { input: leftScrim, blend: "multiply" },
    { input: grain, blend: "soft-light" },
  ];
}

async function renderHero(config) {
  const inFile = path.join(HERO_DIR, `hero-${config.key}.png`);
  const outWebp = path.join(HERO_DIR, `hero-${config.key}-cinematic.webp`);
  const outJpg = path.join(HERO_DIR, `hero-${config.key}-cinematic.jpg`);

  const pipeline = sharp(inFile)
    .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })
    .removeAlpha()
    .modulate({ brightness: 0.96, saturation: 1.2 })
    .linear(1.08, -8)
    .gamma(1.03)
    .composite(overlays(config))
    .sharpen({ sigma: 1, m1: 0.2, m2: 1.4, x1: 2, y2: 10, y3: 20 });

  await Promise.all([
    pipeline
      .clone()
      .webp({ quality: 86, effort: 6, smartSubsample: true })
      .toFile(outWebp),
    pipeline
      .clone()
      .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toFile(outJpg),
  ]);

  return { outWebp, outJpg };
}

async function run() {
  for (const hero of HEROES) {
    const out = await renderHero(hero);
    console.log(`Generated ${path.basename(out.outWebp)} and ${path.basename(out.outJpg)}`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
