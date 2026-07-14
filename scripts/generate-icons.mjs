#!/usr/bin/env node
/**
 * Regenerates favicon PNG/ICO and og-image from centered SVG sources.
 * Requires: rsvg-convert (librsvg)
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const dots = readFileSync(path.join(publicDir, 'favicon.svg'), 'utf8')
  .replace(/<style>[\s\S]*?<\/style>\s*/m, '')
  .match(/<g transform="translate\(32 32\)[\s\S]*?<\/g>/m)?.[0];

if (!dots) {
  console.error('Could not extract dot grid from favicon.svg');
  process.exit(1);
}

function iconSvg(bg, dotWhite) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${bg}"/>
  ${dots.replace(/class="dot-white"/g, `fill="${dotWhite}"`)}
</svg>`;
}

const lightSvg = iconSvg('#ffffff', '#e5e5e5');
const darkSvg = iconSvg('#0a0a0a', '#ffffff');

const lightPath = path.join(publicDir, '_icon-light.svg');
const darkPath = path.join(publicDir, '_icon-dark.svg');
writeFileSync(lightPath, lightSvg);
writeFileSync(darkPath, darkSvg);

function render(svgPath, outPath, size) {
  execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), '-o', outPath, svgPath], {
    stdio: 'inherit',
  });
}

const pngJobs = [
  [lightPath, 'favicon-16x16-light.png', 16],
  [lightPath, 'favicon-32x32-light.png', 32],
  [lightPath, 'favicon-48x48.png', 48],
  [lightPath, 'apple-touch-icon-light.png', 180],
  [lightPath, 'icon-192-light.png', 192],
  [lightPath, 'icon-512-light.png', 512],
  [darkPath, 'favicon-16x16-dark.png', 16],
  [darkPath, 'favicon-32x32-dark.png', 32],
  [darkPath, 'apple-touch-icon-dark.png', 180],
  [darkPath, 'icon-192-dark.png', 192],
  [darkPath, 'icon-512-dark.png', 512],
  [lightPath, 'favicon-16x16.png', 16],
  [lightPath, 'favicon-32x32.png', 32],
  [lightPath, 'apple-touch-icon.png', 180],
  [lightPath, 'icon-192.png', 192],
  [lightPath, 'icon-512.png', 512],
];

for (const [src, name, size] of pngJobs) {
  render(src, path.join(publicDir, name), size);
}

const transparentSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  ${dots.replace(/class="dot-white"/g, 'fill="#e5e5e5"')}
</svg>`;
const transparentPath = path.join(publicDir, '_icon-transparent.svg');
writeFileSync(transparentPath, transparentSvg);
render(transparentPath, path.join(publicDir, 'favicon-transparent-512.png'), 512);

// Minimal ICO (16 + 32) for Google / legacy browsers
const ico16 = readFileSync(path.join(publicDir, 'favicon-16x16-light.png'));
const ico32 = readFileSync(path.join(publicDir, 'favicon-32x32-light.png'));

function pngSize(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function buildIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const entries = [];
  let offset = 6 + count * 16;
  for (const img of images) {
    const entry = Buffer.alloc(16);
    const { w, h } = pngSize(img.data);
    entry.writeUInt8(w >= 256 ? 0 : w, 0);
    entry.writeUInt8(h >= 256 ? 0 : h, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += img.data.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

writeFileSync(path.join(publicDir, 'favicon.ico'), buildIco([
  { data: ico16 },
  { data: ico32 },
]));

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#141414"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g transform="translate(220 95) scale(6.8)">
    <rect width="64" height="64" rx="14" fill="#ffffff"/>
    ${dots.replace(/class="dot-white"/g, 'fill="#e5e5e5"')}
  </g>
  <text x="640" y="250" fill="#ffffff" font-family="Inter, system-ui, sans-serif" font-size="72" font-weight="800">Дети В ТОПЕ</text>
  <text x="640" y="330" fill="#a1a1aa" font-family="Inter, system-ui, sans-serif" font-size="36" font-weight="500">IT-школа для детей и подростков</text>
  <text x="640" y="400" fill="#71717a" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="400">Программирование · проекты · нейросети</text>
  <text x="640" y="520" fill="#e61e78" font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="600">detivtope.online</text>
</svg>`;

const ogSvgPath = path.join(publicDir, '_og-image.svg');
writeFileSync(ogSvgPath, ogSvg);
execFileSync('rsvg-convert', ['-w', '1200', '-h', '630', '-o', path.join(publicDir, 'og-image.png'), ogSvgPath], {
  stdio: 'inherit',
});

console.log('Icons and og-image regenerated.');
