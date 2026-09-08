#!/usr/bin/env node
/**
 * Regenerates favicon PNG/ICO from favicon.svg.
 * Rebuilds og-image.png from public/logo-vtope.png (white 1200×630 lockup).
 * Requires: rsvg-convert (librsvg)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

const logoLockup = path.join(publicDir, 'logo-vtope.png');
if (!existsSync(logoLockup)) {
  console.error('Missing public/logo-vtope.png — cannot build og-image.png');
  process.exit(1);
}
const ogSvgPath = path.join(publicDir, '_og-image.svg');
const logoHref = pathToFileURL(logoLockup).href;
writeFileSync(
  ogSvgPath,
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#ffffff"/>
  <image href="${logoHref}" xlink:href="${logoHref}" x="140" y="40" width="920" height="550" preserveAspectRatio="xMidYMid meet"/>
</svg>`,
);
execFileSync('rsvg-convert', ['-w', '1200', '-h', '630', '-o', path.join(publicDir, 'og-image.png'), ogSvgPath], {
  stdio: 'inherit',
});
unlinkSync(ogSvgPath);

console.log('Icons and og-image regenerated from logo-vtope.png.');
