import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');
const assetsImagesDir = join(root, 'assets', 'images');

const BACKGROUND = '#0A0A0B';
const CORAL = '#FF6B5C';
const CORAL_HIGHLIGHT = '#FF8A7D';

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img">
  <title>Agree on a Time favicon</title>
  <desc>Off-black tile with a coral italic period mark for the When. visual identity.</desc>
  <rect width="512" height="512" rx="112" fill="${BACKGROUND}"/>
  <g transform="translate(256 294) skewX(-8)">
    <ellipse cx="0" cy="0" rx="112" ry="126" fill="${CORAL}"/>
    <ellipse cx="-34" cy="-44" rx="26" ry="18" fill="${CORAL_HIGHLIGHT}" opacity=".36"/>
  </g>
</svg>
`;

const safariMaskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <path d="M256 166c69 0 122 59 122 132s-53 132-122 132-122-59-122-132 53-132 122-132z"/>
</svg>
`;

const manifest = {
  name: 'Agree on a Time',
  short_name: 'Agree',
  description: 'Find a time that works for everyone.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: BACKGROUND,
  theme_color: CORAL,
  icons: [
    {
      src: '/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icon-maskable-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: '/icon-maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};

function encodePngIco(images) {
  const headerLength = 6;
  const directoryLength = 16 * images.length;
  let imageOffset = headerLength + directoryLength;

  const directoryEntries = images.map(({ size, buffer }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(imageOffset, 12);
    imageOffset += buffer.length;
    return entry;
  });

  const header = Buffer.alloc(headerLength);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  return Buffer.concat([header, ...directoryEntries, ...images.map(({ buffer }) => buffer)]);
}

async function renderPng(size, path, sourceSvg = faviconSvg) {
  await sharp(Buffer.from(sourceSvg), { density: 384 })
    .resize(size, size, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toFile(path);
}

mkdirSync(publicDir, { recursive: true });
mkdirSync(assetsImagesDir, { recursive: true });

writeFileSync(join(publicDir, 'favicon.svg'), faviconSvg);
writeFileSync(join(publicDir, 'safari-pinned-tab.svg'), safariMaskSvg);
writeFileSync(join(publicDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

await renderPng(48, join(assetsImagesDir, 'favicon.png'));
await renderPng(180, join(publicDir, 'apple-touch-icon.png'));
await renderPng(192, join(publicDir, 'icon-192.png'));
await renderPng(512, join(publicDir, 'icon-512.png'));
await renderPng(192, join(publicDir, 'icon-maskable-192.png'));
await renderPng(512, join(publicDir, 'icon-maskable-512.png'));

const icoImages = await Promise.all(
  [16, 32, 48].map(async (size) => ({
    size,
    buffer: await sharp(Buffer.from(faviconSvg), { density: 384 })
      .resize(size, size, { fit: 'fill' })
      .png({ compressionLevel: 9 })
      .toBuffer(),
  })),
);
writeFileSync(join(publicDir, 'favicon.ico'), encodePngIco(icoImages));

console.log('Generated web brand icon assets.');
