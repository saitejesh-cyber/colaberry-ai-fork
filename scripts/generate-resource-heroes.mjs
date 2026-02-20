import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const WIDTH = 2560;
const HEIGHT = 1440;
const HERO_DIR = path.resolve("public/media/hero");

const ITEMS = [
  {
    key: "podcasts",
    source: "hero-agents.png",
    title: "podcasts",
    warm: { x: 1980, y: 360, rx: 760, ry: 420, opacity: 0.26 },
    cool: { x: 1760, y: 930, rx: 960, ry: 500, opacity: 0.21 },
    leftOpacity: 0.8,
  },
  {
    key: "whitepapers",
    source: "hero-resources.png",
    title: "whitepapers",
    warm: { x: 1960, y: 340, rx: 740, ry: 420, opacity: 0.24 },
    cool: { x: 1800, y: 900, rx: 980, ry: 540, opacity: 0.22 },
    leftOpacity: 0.82,
  },
  {
    key: "books",
    source: "hero-platform.png",
    title: "books",
    warm: { x: 1980, y: 350, rx: 760, ry: 440, opacity: 0.25 },
    cool: { x: 1860, y: 920, rx: 1000, ry: 560, opacity: 0.21 },
    leftOpacity: 0.8,
  },
  {
    key: "case-studies",
    source: "hero-updates.png",
    title: "case-studies",
    warm: { x: 1960, y: 330, rx: 760, ry: 420, opacity: 0.24 },
    cool: { x: 1800, y: 940, rx: 980, ry: 560, opacity: 0.22 },
    leftOpacity: 0.82,
  },
];

function baseOverlays(item) {
  const grade = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#07131F" stop-opacity="0.46"/>
          <stop offset="0.58" stop-color="#0F2844" stop-opacity="0.30"/>
          <stop offset="1" stop-color="#113E5A" stop-opacity="0.36"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
    </svg>
  `);

  const warm = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="w" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="#FFBD66" stop-opacity="${item.warm.opacity}"/>
          <stop offset="1" stop-color="#FFBD66" stop-opacity="0"/>
        </radialGradient>
        <filter id="b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="68"/></filter>
      </defs>
      <ellipse cx="${item.warm.x}" cy="${item.warm.y}" rx="${item.warm.rx}" ry="${item.warm.ry}" fill="url(#w)" filter="url(#b)"/>
    </svg>
  `);

  const cool = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="c" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="#2FD7FF" stop-opacity="${item.cool.opacity}"/>
          <stop offset="1" stop-color="#2FD7FF" stop-opacity="0"/>
        </radialGradient>
        <filter id="b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="76"/></filter>
      </defs>
      <ellipse cx="${item.cool.x}" cy="${item.cool.y}" rx="${item.cool.rx}" ry="${item.cool.ry}" fill="url(#c)" filter="url(#b)"/>
    </svg>
  `);


  const left = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="s" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#03070F" stop-opacity="0.94"/>
          <stop offset="0.58" stop-color="#03070F" stop-opacity="${item.leftOpacity}"/>
          <stop offset="1" stop-color="#03070F" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="${Math.round(WIDTH * 0.58)}" height="${HEIGHT}" fill="url(#s)"/>
    </svg>
  `);

  return [
    { input: grade, blend: "overlay" },
    { input: warm, blend: "screen" },
    { input: cool, blend: "screen" },
    { input: left, blend: "multiply" },
  ];
}

function motifOverlay(kind) {
  if (kind === "podcasts") {
    return Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="a" x1="1440" y1="1120" x2="2340" y2="420" gradientUnits="userSpaceOnUse">
            <stop stop-color="#80CFFF"/>
            <stop offset="0.55" stop-color="#B9E7FF"/>
            <stop offset="1" stop-color="#FFD79A"/>
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#a)" stroke-linecap="round" opacity="0.9">
          <path d="M1440 1010C1600 920 1740 980 1890 860C2020 760 2150 810 2340 690" stroke-width="8"/>
          <path d="M1440 1080C1600 1010 1750 1040 1900 950C2030 860 2160 900 2340 820" stroke-width="3" opacity="0.8"/>
        </g>
        <g fill="#E8F7FF" opacity="0.95">
          <circle cx="1440" cy="1010" r="7"/>
          <circle cx="1890" cy="860" r="7"/>
          <circle cx="2340" cy="690" r="7"/>
        </g>
        <g stroke="#95D3FF" stroke-opacity="0.56" stroke-width="2" fill="none">
          <path d="M1480 420V560"/>
          <path d="M1540 390V590"/>
          <path d="M1600 350V630"/>
          <path d="M1660 390V590"/>
          <path d="M1720 420V560"/>
          <path d="M1780 460V520"/>
          <path d="M1840 430V550"/>
          <path d="M1900 390V590"/>
          <path d="M1960 350V630"/>
          <path d="M2020 390V590"/>
          <path d="M2080 430V550"/>
        </g>
      </svg>
    `);
  }

  if (kind === "whitepapers") {
    return Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <g opacity="0.95">
          <rect x="1500" y="280" width="700" height="250" rx="24" fill="#16314F" fill-opacity="0.84" stroke="#8ED0FF" stroke-opacity="0.45"/>
          <rect x="1460" y="360" width="700" height="250" rx="24" fill="#132B45" fill-opacity="0.88" stroke="#8ED0FF" stroke-opacity="0.45"/>
          <rect x="1420" y="440" width="700" height="250" rx="24" fill="#0F233C" fill-opacity="0.92" stroke="#8ED0FF" stroke-opacity="0.45"/>
        </g>
        <g stroke="#9CD8FF" stroke-opacity="0.62" stroke-width="2" fill="none">
          <path d="M1500 520H2040"/>
          <path d="M1500 560H1960"/>
          <path d="M1500 600H1880"/>
          <path d="M1500 640H2000"/>
        </g>
      </svg>
    `);
  }

  if (kind === "books") {
    return Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <g opacity="0.96">
          <path d="M1460 830V470C1460 430 1488 400 1528 400H1890C1930 400 1958 430 1958 470V830C1914 794 1866 776 1812 776H1606C1552 776 1504 794 1460 830Z" fill="#17314E" fill-opacity="0.9" stroke="#8FD1FF" stroke-opacity="0.45"/>
          <path d="M1958 830V470C1958 430 1986 400 2026 400H2388C2428 400 2456 430 2456 470V830C2412 794 2364 776 2310 776H2104C2050 776 2002 794 1958 830Z" fill="#122A43" fill-opacity="0.9" stroke="#8FD1FF" stroke-opacity="0.45"/>
          <path d="M1958 470V840" stroke="#A7DFFF" stroke-opacity="0.65" stroke-width="2"/>
        </g>
        <g stroke="#9CD8FF" stroke-opacity="0.58" stroke-width="2" fill="none">
          <path d="M1530 500H1880"/>
          <path d="M1530 540H1840"/>
          <path d="M1530 580H1860"/>
          <path d="M1530 620H1800"/>
          <path d="M2030 500H2380"/>
          <path d="M2030 540H2340"/>
          <path d="M2030 580H2360"/>
          <path d="M2030 620H2300"/>
        </g>
      </svg>
    `);
  }

  return Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="a" x1="1460" y1="1080" x2="2360" y2="430" gradientUnits="userSpaceOnUse">
          <stop stop-color="#82D1FF"/>
          <stop offset="0.55" stop-color="#BEE8FF"/>
          <stop offset="1" stop-color="#FFD79A"/>
        </linearGradient>
      </defs>
      <g opacity="0.95">
        <rect x="1460" y="360" width="260" height="200" rx="20" fill="#16314F" fill-opacity="0.9" stroke="#8ED0FF" stroke-opacity="0.42"/>
        <rect x="1750" y="320" width="300" height="240" rx="20" fill="#132A44" fill-opacity="0.9" stroke="#8ED0FF" stroke-opacity="0.42"/>
        <rect x="2080" y="390" width="260" height="170" rx="20" fill="#10243C" fill-opacity="0.9" stroke="#8ED0FF" stroke-opacity="0.42"/>
      </g>
      <g stroke="url(#a)" stroke-linecap="round" fill="none">
        <path d="M1480 1030C1640 930 1780 980 1930 860C2060 760 2190 810 2360 700" stroke-width="8"/>
        <path d="M1480 1100C1640 1020 1790 1040 1940 950C2070 870 2200 910 2360 830" stroke-width="3" opacity="0.8"/>
      </g>
      <g fill="#E8F7FF" opacity="0.95">
        <circle cx="1480" cy="1030" r="7"/>
        <circle cx="1930" cy="860" r="7"/>
        <circle cx="2360" cy="700" r="7"/>
      </g>
    </svg>
  `);
}

async function generate(item) {
  const sourcePath = path.join(HERO_DIR, item.source);
  const outWebp = path.join(HERO_DIR, `hero-${item.key}-cinematic.webp`);
  const outJpg = path.join(HERO_DIR, `hero-${item.key}-cinematic.jpg`);

  const pipeline = sharp(sourcePath)
    .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })
    .removeAlpha()
    .modulate({ brightness: 0.96, saturation: 1.2 })
    .linear(1.08, -8)
    .gamma(1.02)
    .composite([...baseOverlays(item), { input: motifOverlay(item.title), blend: "screen" }])
    .sharpen({ sigma: 1.05, m1: 0.2, m2: 1.4, x1: 2, y2: 10, y3: 20 });

  await Promise.all([
    pipeline.clone().webp({ quality: 86, effort: 6, smartSubsample: true }).toFile(outWebp),
    pipeline.clone().jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:4:4" }).toFile(outJpg),
  ]);

  return [outWebp, outJpg];
}

async function run() {
  await fs.mkdir(HERO_DIR, { recursive: true });

  for (const item of ITEMS) {
    const [webp, jpg] = await generate(item);
    console.log(`Generated ${path.basename(webp)} and ${path.basename(jpg)}`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
