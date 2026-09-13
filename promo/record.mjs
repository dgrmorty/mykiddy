import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EXPLAINER = path.join(__dirname, 'explainer');
const PUBLIC = path.join(ROOT, 'public');
const OUT_DIR = path.join(__dirname, 'out');
const GSAP = path.join(ROOT, 'node_modules', 'gsap', 'dist', 'gsap.min.js');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function resolveUrl(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  if (clean === '/' || clean === '/index.html') return path.join(EXPLAINER, 'index.html');
  if (clean === '/vendor/gsap.min.js') return GSAP;
  if (clean.startsWith('/avatars/')) return path.join(PUBLIC, clean);
  if (clean === '/logo-vtope.png') return path.join(PUBLIC, 'logo-vtope.png');
  const local = path.join(EXPLAINER, clean.replace(/^\//, ''));
  if (local.startsWith(EXPLAINER) && fs.existsSync(local)) return local;
  const pub = path.join(PUBLIC, clean.replace(/^\//, ''));
  if (pub.startsWith(PUBLIC) && fs.existsSync(pub)) return pub;
  return null;
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const file = resolveUrl(req.url || '/');
      if (!file || !fs.existsSync(file)) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      const ext = path.extname(file);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}/` });
    });
  });
}

function encodeWavMono(samples, sampleRate) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7fff, 44 + i * 2);
  }
  return buf;
}

function synthSoundtrack(durationSec, cues) {
  const sr = 48000;
  const n = Math.ceil(durationSec * sr);
  const samples = new Float32Array(n);
  const add = (start, fn, len) => {
    const i0 = Math.max(0, Math.floor(start * sr));
    for (let i = 0; i < len; i++) {
      if (i0 + i >= n) break;
      samples[i0 + i] += fn(i / sr, i);
    }
  };
  for (const cue of cues) {
    if (cue.type === 'click') {
      add(cue.t, (t) => {
        const env = Math.exp(-t * 70);
        return Math.sin(2 * Math.PI * (2100 - t * 9000) * t) * env * 0.32
          + (Math.random() * 2 - 1) * Math.exp(-t * 120) * 0.08;
      }, Math.floor(sr * 0.07));
    } else if (cue.type === 'whoosh') {
      add(cue.t, (t) => {
        const env = Math.sin(Math.PI * Math.min(1, t / 0.22)) * 0.07;
        return (Math.random() * 2 - 1) * env;
      }, Math.floor(sr * 0.24));
    } else if (cue.type === 'pop') {
      add(cue.t, (t) => {
        const env = Math.exp(-t * 18);
        return (Math.sin(2 * Math.PI * 520 * t) + 0.5 * Math.sin(2 * Math.PI * 780 * t)) * env * 0.18;
      }, Math.floor(sr * 0.18));
    }
  }
  return encodeWavMono(samples, sr);
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}`));
    });
  });
}

function hasBin(cmd) {
  return new Promise((resolve) => {
    const child = spawn('which', [cmd], { stdio: 'ignore' });
    child.on('exit', (code) => resolve(code === 0));
  });
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    console.log('Installing playwright…');
    await run('npm', ['install', '-D', 'playwright']);
    return await import('playwright');
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const framesDir = path.join(OUT_DIR, 'frames');
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  const { server, url } = await startServer();
  const { chromium } = await loadPlaywright();

  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1080 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__promoReady === true, { timeout: 60000 });
  const duration = await page.evaluate(() => window.__promoDuration);
  const cues = await page.evaluate(() => window.__SFX_CUES);
  const fps = 30;
  const total = Math.ceil(duration * fps);
  console.log(`Timeline ${duration.toFixed(2)}s, ${total + 1} frames, ${cues.length} sfx cues`);

  await page.evaluate(() => {
    gsap.ticker.lagSmoothing(0);
    window.__promoTimeline.pause(0);
  });

  for (let i = 0; i <= total; i++) {
    const t = Math.min(duration, i / fps);
    await page.evaluate((time) => {
      window.__seekPromo(time);
      return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, t);
    await page.screenshot({
      path: path.join(framesDir, `${String(i).padStart(5, '0')}.jpg`),
      type: 'jpeg',
      quality: 92,
    });
    if (i % 30 === 0) console.log(`frame ${i}/${total} @ ${t.toFixed(2)}s`);
  }

  await context.close();
  await browser.close();
  server.close();

  const wavPath = path.join(OUT_DIR, 'sfx.wav');
  fs.writeFileSync(wavPath, synthSoundtrack(duration + 0.4, cues));

  const mp4 = path.join(OUT_DIR, 'detivtope-explainer.mp4');
  if (!(await hasBin('ffmpeg'))) {
    throw new Error('ffmpeg is required to encode the explainer');
  }
  await run('ffmpeg', [
    '-y',
    '-framerate', String(fps),
    '-i', path.join(framesDir, '%05d.jpg'),
    '-i', wavPath,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-vf', 'scale=1080:1080:flags=lanczos',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', '15',
    '-preset', 'slow',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    '-movflags', '+faststart',
    mp4,
  ]);
  fs.rmSync(framesDir, { recursive: true, force: true });
  console.log(`Wrote ${mp4}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
