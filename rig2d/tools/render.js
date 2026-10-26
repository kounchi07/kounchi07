// Render a page that defines window.render(t) and window.DURATION to PNG frames + MP4.
// usage: node tools/render.js <page.html> <outDir> [--fps 30] [--stills 0.5,2,4] [--mp4 out.mp4]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const page = path.resolve(args[0]), out = path.resolve(args[1]);
const fps = +opt('--fps', 30), stills = opt('--stills'), mp4 = opt('--mp4');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + page);
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
  const dur = await p.evaluate(() => window.DURATION || 1);
  const times = stills ? stills.split(',').map(Number) : Array.from({ length: Math.round(dur * fps) }, (_, i) => i / fps);
  for (let i = 0; i < times.length; i++) {
    await p.evaluate(t => window.render(t), times[i]);
    if (errs.length) { console.error(`t=${times[i]}: ${errs.join('\n')}`); process.exit(1); }
    await p.screenshot({ path: `${out}/${String(i).padStart(4, '0')}.png` });
  }
  await b.close();
  if (mp4) execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps), '-i', `${out}/%04d.png`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.resolve(mp4)], { stdio: 'inherit' });
  console.log(`rendered ${times.length} frame(s)`);
})();
