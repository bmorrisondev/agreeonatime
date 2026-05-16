import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "assets/images/app-icon.svg");
const outPath = join(root, "assets/images/icon.png");

const W = 1024;
const H = 1024;

/**
 * Deterministic neutral grain (Sharp's SVG stack often drops feTurbulence filters).
 * `intensity` = half-range around mid-gray 128 (e.g. 10 → 118..138).
 */
function grainRgbaBuffer(width, height, intensity) {
  const buf = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const h = Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca6b);
      const u = (h >>> 0) / 4294967296;
      const g = Math.round(128 + (u - 0.5) * 2 * intensity);
      const v = Math.max(0, Math.min(255, g));
      const o = (y * width + x) * 4;
      buf[o] = v;
      buf[o + 1] = v;
      buf[o + 2] = v;
      buf[o + 3] = 255;
    }
  }
  return buf;
}

/** Finer / higher-frequency noise (different mix so it doesn’t stack correlated with coarse). */
function fineGrainRgbaBuffer(width, height, intensity) {
  const buf = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const h =
        Math.imul(x, 2246822519) ^
        Math.imul(y, 4294967291) ^
        Math.imul(x ^ (y << 1), 0xcccccccd);
      const u = (h >>> 0) / 4294967296;
      const g = Math.round(128 + (u - 0.5) * 2 * intensity);
      const v = Math.max(0, Math.min(255, g));
      const o = (y * width + x) * 4;
      buf[o] = v;
      buf[o + 1] = v;
      buf[o + 2] = v;
      buf[o + 3] = 255;
    }
  }
  return buf;
}

const svg = readFileSync(svgPath, "utf8");

const basePng = await sharp(Buffer.from(svg), { density: 300 })
  .resize(W, H, { fit: "fill" })
  .ensureAlpha()
  .png()
  .toBuffer();

const coarsePng = await sharp(grainRgbaBuffer(W, H, 10), {
  raw: { width: W, height: H, channels: 4 },
})
  .png()
  .toBuffer();

const finePng = await sharp(fineGrainRgbaBuffer(W, H, 5), {
  raw: { width: W, height: H, channels: 4 },
})
  .png()
  .toBuffer();

await sharp(basePng)
  .composite([
    { input: coarsePng, blend: "overlay" },
    { input: finePng, blend: "soft-light" },
  ])
  .flatten({ background: "#1C1A2E" })
  .png({ compressionLevel: 9 })
  .toFile(outPath);
