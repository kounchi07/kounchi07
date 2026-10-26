// Render a page that defines window.render(t) and window.DURATION to PNG frames + MP4.
// usage: node tools/render.js <page.html> <outDir> [--fps 30] [--stills 0.5,2,4] [--mp4 out.mp4] [--workers 4]
// Frames already on disk are skipped, so an interrupted render can resume.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const page = path.resolve(args[0]), out = path.resolve(args[1]);
const fps = +opt('--fps', 30), stills = opt('--stills'), mp4 = opt('--mp4');
const workers = +opt('--workers', 1);

async function worker(b, times, ids) {
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + page);
  if (errs.length) throw new Error(errs.join('\n'));
  for (const i of ids) {
    const file = `${out}/${String(i).padStart(4, '0')}.png`;
    if (!stills && fs.existsSync(file)) continue;
    await p.evaluate(t => window.render(t), times[i]);
    if (errs.length) throw new Error(`t=${times[i]}: ${errs.join('\n')}`);
    await p.screenshot({ path: file });
  }
  await p.close();
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const probe = await b.newPage();
  await probe.goto('file://' + page);
  const dur = await probe.evaluate(() => window.DURATION || 1);
  await probe.close();
  const times = stills ? stills.split(',').map(Number) : Array.from({ length: Math.round(dur * fps) }, (_, i) => i / fps);
  const n = Math.max(1, workers), all = times.map((_, i) => i);
  await Promise.all(Array.from({ length: n }, (_, w) => worker(b, times, all.filter(i => i % n === w))));
  await b.close();
  if (mp4) execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps), '-i', `${out}/%04d.png`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.resolve(mp4)], { stdio: 'inherit' });
  console.log(`rendered ${times.length} frame(s)`);
})().catch(e => { console.error(e.message); process.exit(1); });
