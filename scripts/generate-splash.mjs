import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const CANVAS_W = 1242;
const CANVAS_H = 2688;
const BG = { r: 28, g: 26, b: 46, alpha: 1 };
/** Near full canvas width — maximum splash mark size (1242 canvas). */
const MARK_PX = 1100;
/** ~30pt @3× — larger than the original 22pt title. */
const TITLE_PX = 90;
const TITLE_LETTER_SPACING = -1.2;
const MARK_CENTER_Y = 0.4 * CANVAS_H;
const MARK_TOP = Math.round(MARK_CENTER_Y - MARK_PX / 2);
const MARK_LEFT = Math.round((CANVAS_W - MARK_PX) / 2);
/** Negative pulls the title into the mark’s transparent padding (tighter pairing). */
const GAP_BELOW_MARK = -52;

const markSvgPath = join(root, 'assets/images/app-icon-mark.svg');
const outPath = join(root, 'assets/splash.png');

const markSvg = readFileSync(markSvgPath, 'utf8');

const markPng = await sharp(Buffer.from(markSvg), { density: 512 })
  .resize(MARK_PX, MARK_PX, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .ensureAlpha()
  .png()
  .toBuffer();

const titleTop = MARK_TOP + MARK_PX + GAP_BELOW_MARK;
const titleStripH = Math.round(TITLE_PX + 28);
const titleSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${titleStripH}">
  <text
    x="${CANVAS_W / 2}"
    y="-10"
    dominant-baseline="hanging"
    text-anchor="middle"
    font-family="system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif"
    font-size="${TITLE_PX}"
    font-weight="500"
    fill="#FFFFFF"
    letter-spacing="${TITLE_LETTER_SPACING}"
  >Agree on a Time</text>
</svg>`;

const titlePng = await sharp(Buffer.from(titleSvg), { density: 300 })
  .resize(CANVAS_W, titleStripH, { fit: 'fill' })
  .ensureAlpha()
  .png()
  .toBuffer();

await sharp({
  create: {
    width: CANVAS_W,
    height: CANVAS_H,
    channels: 4,
    background: BG,
  },
})
  .composite([
    { input: markPng, left: MARK_LEFT, top: MARK_TOP },
    { input: titlePng, left: 0, top: titleTop },
  ])
  .png({ compressionLevel: 9, effort: 10, palette: false })
  .toFile(outPath);
