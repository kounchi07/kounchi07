// Render a page that defines window.render(t) and window.DURATION to frames + MP4.
// usage: node tools/render.js <page.html[?query]> <outDir> [--fps 30] [--stills 0.5,2,4] [--mp4 out.mp4]
//        [--workers N] [--audio voice.wav] [--exact] [--range 10,14] [--flags "--num-raster-threads=1"]
//
// Fast mode (default for --mp4 when the page defines window.POST): the page is loaded with `?post`,
// so it skips its full-frame grade/bloom/vignette/grain/captions/fades; frames are captured as JPEG and
// ffmpeg applies those effects in one multi-threaded pass (tools/post.js). --exact keeps everything in
// the browser and writes PNG frames (slower; what stills show).
// Frames already on disk are skipped, so an interrupted render can resume.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const post = require('./post');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const [pageFile, query] = args[0].split('?');
const out = path.resolve(args[1]);
const fps = +opt('--fps', 30), stills = opt('--stills'), mp4 = opt('--mp4'), audio = opt('--audio');
const workers = +opt('--workers', Math.max(1, os.cpus().length));
const range = opt('--range') ? opt('--range').split(',').map(Number) : null;
const flags = opt('--flags') ? opt('--flags').split(' ') : [];
const url = q => 'file://' + path.resolve(pageFile) + (q ? '?' + q : '');

async function worker(b, pageUrl, times, ids, ext) {
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const cdp = await p.context().newCDPSession(p);
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(pageUrl);
  if (errs.length) throw new Error(errs.join('\n'));
  for (const i of ids) {
    const file = `${out}/${String(i).padStart(4, '0')}.${ext}`;
    if (!stills && fs.existsSync(file)) continue;
    await p.evaluate(t => window.render(t), times[i]);
    if (errs.length) throw new Error(`t=${times[i]}: ${errs.join('\n')}`);
    const shot = await cdp.send('Page.captureScreenshot', ext === 'jpg' ? { format: 'jpeg', quality: 94, optimizeForSpeed: true } : { format: 'png' });
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
  }
  await p.close();
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const t0 = Date.now();
  const b = await chromium.launch({ args: flags });
  const probe = await b.newPage();
  await probe.goto(url(query));
  const dur = await probe.evaluate(() => window.DURATION || 1);
  const fast = !!(mp4 && !stills && !args.includes('--exact') && await probe.evaluate(() => !!window.POST));
  await probe.close();
  let postCfg = null, pageUrl = url(query);
  if (fast) {
    pageUrl = url([query, 'post'].filter(Boolean).join('&'));
    const p2 = await b.newPage(); await p2.goto(pageUrl);
    postCfg = await p2.evaluate(() => JSON.parse(JSON.stringify(window.POST)));
    await p2.close();
  }
  let times = stills ? stills.split(',').map(Number) : Array.from({ length: Math.round(dur * fps) }, (_, i) => i / fps);
  if (range && !stills) times = times.filter(t => t >= range[0] && t < range[1]);
  const ext = fast ? 'jpg' : 'png';
  const n = Math.max(1, Math.min(workers, times.length)), all = times.map((_, i) => i);
  await Promise.all(Array.from({ length: n }, (_, w) => worker(b, pageUrl, times, all.filter(i => i % n === w), ext)));
  await b.close();
  const t1 = Date.now();
  if (mp4 && fast) post.encode({ frames: `${out}/%04d.jpg`, fps, post: postCfg, dir: out, out: path.resolve(mp4), audio, duration: dur });
  else if (mp4) {
    const a = ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps), '-i', `${out}/%04d.png`];
    if (audio) a.push('-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-af', 'loudnorm=I=-14:TP=-1', '-shortest');
    execFileSync('ffmpeg', a.concat(['-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.resolve(mp4)]), { stdio: 'inherit' });
  }
  const s = (Date.now() - t0) / 1000, cap = (t1 - t0) / 1000;
  console.log(`rendered ${times.length} frame(s) in ${s.toFixed(1)}s (capture ${cap.toFixed(1)}s = ${(times.length / cap).toFixed(1)} fps)${fast ? ' [fast]' : ''}`);
})().catch(e => { console.error(e.message); process.exit(1); });
