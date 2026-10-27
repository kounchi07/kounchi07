// Render a page that defines window.render(t) and window.DURATION to frames + MP4.
// usage: node tools/render.js <page.html[?query]> <outDir> [--fps 30] [--stills 0.5,2,4] [--mp4 out.mp4]
//        [--workers N] [--audio voice.wav] [--exact] [--range 10,14] [--flags "--num-raster-threads=1"] [--serve]
//
// Fast mode (default for --mp4 when the page defines window.POST): the page is loaded with `?post`,
// so it skips its full-frame grade/bloom/vignette/grain/captions/fades; frames are captured as JPEG and
// ffmpeg applies those effects in one multi-threaded pass (tools/post.js). --exact keeps everything in
// the browser and writes PNG frames (slower; what stills show).
// Dissolves: if the page defines window.CUTS = [{ t, dur, zoom }] and render(t, { side: 'before'|'after', cut })
// (draw the outgoing / incoming shot at time t), frames inside a cut's window blend the two: the outgoing shot
// fades out while pushing in (zoom), the incoming one settles from a slight zoom. Pages without CUTS are unchanged.
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
// --serve: load the page from a local static server (needed for ES modules, e.g. the Three.js pages in 3d/)
let base = null;
const url = q => (base ? base + '/' + path.relative(process.cwd(), path.resolve(pageFile)).split(path.sep).join('/') : 'file://' + path.resolve(pageFile)) + (q ? '?' + q : '');
function serve() {
  const http = require('http');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.css': 'text/css' };
  const srv = http.createServer((req, res) => {
    const f = path.join(process.cwd(), decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(process.cwd()) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => { base = `http://127.0.0.1:${srv.address().port}`; r(srv); }));
}

async function worker(b, pageUrl, times, ids, ext) {
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const cdp = await p.context().newCDPSession(p);
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(pageUrl);
  if (errs.length) throw new Error(errs.join('\n'));
  const grab = () => cdp.send('Page.captureScreenshot', ext === 'jpg' ? { format: 'jpeg', quality: 94, optimizeForSpeed: true } : { format: 'png' });
  const cuts = await p.evaluate(() => window.CUTS || []);
  for (const i of ids) {
    const file = `${out}/${String(i).padStart(4, '0')}.${ext}`;
    if (!stills && fs.existsSync(file)) continue;
    const t = times[i];
    // dissolve window: blend the outgoing shot over the incoming one (see header)
    const cut = cuts.find(c => t >= c.t - c.dur / 2 && t < c.t + c.dur / 2);
    let shot;
    if (cut) {
      const k = (t - (cut.t - cut.dur / 2)) / cut.dur, e = k * k * (3 - 2 * k);
      await p.evaluate(([t, c]) => window.render(t, { side: 'before', cut: c }), [t, cut.t]);
      const before = (await grab()).data;
      await p.evaluate(([t, c]) => window.render(t, { side: 'after', cut: c }), [t, cut.t]);
      await p.evaluate(async ([src, e, z]) => {
        const img = document.createElement('img');
        img.id = '__xf'; img.src = src;
        img.style.cssText = `position:fixed;left:0;top:0;width:1080px;height:1920px;z-index:99;opacity:${1 - e};transform:scale(${1 + z * e});transform-origin:50% 50%`;
        document.body.appendChild(img);
        await img.decode();
        const svg = document.querySelector('svg');
        svg.style.transformOrigin = '50% 50%'; svg.style.transform = `scale(${1 + z * 0.5 * (1 - e)})`;
      }, [`data:image/${ext === 'jpg' ? 'jpeg' : 'png'};base64,${before}`, e, cut.zoom == null ? 0.08 : cut.zoom]);
      shot = await grab();
      await p.evaluate(() => { document.getElementById('__xf').remove(); document.querySelector('svg').style.transform = ''; });
    } else {
      await p.evaluate(t => window.render(t), t);
      shot = await grab();
    }
    if (errs.length) throw new Error(`t=${t}: ${errs.join('\n')}`);
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
  }
  await p.close();
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const server = args.includes('--serve') ? await serve() : null;
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
  if (server) server.close();
  console.log(`rendered ${times.length} frame(s) in ${s.toFixed(1)}s (capture ${cap.toFixed(1)}s = ${(times.length / cap).toFixed(1)} fps)${fast ? ' [fast]' : ''}`);
})().catch(e => { console.error(e.message); process.exit(1); });
