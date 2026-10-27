// Post pass for fast renders: the expensive full-frame effects run in ffmpeg (multi-threaded, ~10x
// cheaper than SVG filters in the browser) instead of in every Chromium screenshot.
//
// A page opts in by defining window.POST and honouring `?post` (skip its own grade, vignette, grain,
// captions and fades). POST = {
//   grade:    { saturation, lift, bloom, warm }          same numbers as Look.defs()
//   vignette: { opacity: 0.28, color: '#1a0c10' }
//   grain:    0.05                                       overlay strength
//   captions: { style: { font, size, outline, color, hot, y, pop }, words: [[start, end, text, hot], ...] }
//   fades:    [{ type: 'in'|'out', start, duration }]    to/from black, applied last
// }
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const f4 = v => (+v).toFixed(4);
const ass = c => { const h = c.replace('#', ''); return `&H00${h.substr(4, 2)}${h.substr(2, 2)}${h.substr(0, 2)}`.toUpperCase(); };
const tc = t => { t = Math.max(0, t); const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60; return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`; };

// Tone curve + saturation + bloom, matching Look.defs() (look.js).
function gradeChain(g = {}) {
  const sat = g.saturation == null ? 1.4 : g.saturation, lift = g.lift == null ? 0.06 : g.lift;
  const bloom = g.bloom == null ? 0.35 : g.bloom, warm = g.warm == null ? 0.03 : g.warm;
  const curve = [lift, 0.13, 0.28, 0.47, 0.68, 0.86, 0.97];
  const pts = vals => vals.map((v, i) => `${f4(i / 6)}/${f4(Math.min(1, Math.max(0, v)))}`).join(' ');
  const r = pts(curve.map(v => v + warm * 0.6)), gg = pts(curve), b = pts(curve.map(v => v - warm));
  return {
    grade: `curves=r='${r}':g='${gg}':b='${b}',eq=saturation=${sat}`,
    // bloom: bright parts (above ~69% like the SVG threshold), two blur sizes, screened back on
    bloom: bloom > 0 ? { k1: f4(bloom * 0.7), k2: f4(bloom * 0.4) } : null,
  };
}

function vignettePng(dir, v) {
  const file = path.join(dir, 'post_vignette.png');
  const c = (v.color || '#1a0c10').replace('#', ''), op = v.opacity == null ? 0.28 : v.opacity;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16));
  const a = `255*${op}*clip((hypot((X/W-0.5)/0.75,(Y/H-0.5)/0.75)-0.6)/0.4,0,1)`;
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=black:s=1080x1920,format=rgba',
    '-vf', `geq=r=${r}:g=${g}:b=${b}:a='${a}'`, '-frames:v', '1', file]);
  return file;
}

function captionsAss(dir, cap) {
  const st = Object.assign({ font: 'Inter Black', size: 98, outline: 6.5, color: '#ffffff', hot: '#ffd84a', ink: '#1a0e0a', y: 1540, pop: 1.2, popTime: 0.09 }, cap.style || {});
  let s = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n` +
    `[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n` +
    `Style: Cap,${st.font},${st.size},${ass(st.color)},${ass(st.color)},${ass(st.ink)},&H8C000000,0,0,0,0,100,100,0,0,1,${st.outline},3,2,0,0,0,1\n\n` +
    `[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const p = Math.round(st.pop * 100), ms = Math.round(st.popTime * 1000);
  for (const [t0, t1, text, hot] of cap.words) {
    if (!text || t1 <= t0) continue;
    s += `Dialogue: 0,${tc(t0)},${tc(t1)},Cap,,0,0,0,,{\\an2\\pos(540,${st.y + Math.round(st.size * 0.2)})\\fscx${p}\\fscy${p}\\t(0,${ms},\\fscx100\\fscy100)${hot ? `\\c${ass(st.hot)}&` : ''}}${String(text).replace(/[{}]/g, '')}\n`;
  }
  const file = path.join(dir, 'post_captions.ass');
  fs.writeFileSync(file, s);
  return file;
}

// Encode frames (pattern) + post effects (+ optional audio) into an MP4.
function encode({ frames, fps, post, dir, out, audio, duration }) {
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps), '-i', frames];
  const graph = [];
  let last = '0:v', nIn = 1, lab = 0;
  const G = gradeChain(post.grade);
  // RGB throughout: blend modes are only correct on RGB planes (JPEG frames arrive as YUV)
  graph.push(`[${last}]format=gbrp,${G.grade},format=gbrp[g]`); last = 'g';
  if (G.bloom) {
    // bloom at quarter resolution (blur radius scaled to match): same look, ~20x cheaper
    graph.push(`[g]split=2[gA][gB]`, `[gB]colorlevels=rimin=0.6875:gimin=0.6875:bimin=0.6875,scale=270:480,split=2[h1][h2]`,
      `[h1]gblur=sigma=5.5,colorchannelmixer=rr=${G.bloom.k1}:gg=${G.bloom.k1}:bb=${G.bloom.k1}[bA]`,
      `[h2]gblur=sigma=1.5,colorchannelmixer=rr=${G.bloom.k2}:gg=${G.bloom.k2}:bb=${G.bloom.k2}[bB]`,
      `[bA][bB]blend=all_mode=addition,scale=1080:1920:flags=bilinear[bl]`, `[gA][bl]blend=all_mode=screen[gb]`);
    last = 'gb';
  }
  if (post.vignette) {
    args.push('-i', vignettePng(dir, post.vignette));
    graph.push(`[${last}][${nIn++}:v]overlay=format=auto[vg]`); last = 'vg';
  }
  if (post.grain) {
    graph.push(`[${last}]noise=c0s=${Math.round(post.grain * 120)}:c0f=t+u[gr]`); last = 'gr';
  }
  if (post.captions && post.captions.words && post.captions.words.length) {
    const f = captionsAss(dir, post.captions).replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
    graph.push(`[${last}]ass='${f}'[cp]`); last = 'cp';
  }
  for (const fd of post.fades || []) {
    graph.push(`[${last}]fade=t=${fd.type}:st=${fd.start}:d=${fd.duration}[f${lab}]`); last = `f${lab++}`;
  }
  graph.push(`[${last}]format=yuv420p[v]`);
  if (audio) args.push('-i', audio);
  args.push('-filter_complex', graph.join(';'), '-map', '[v]');
  if (audio) args.push('-map', `${nIn}:a`, '-c:a', 'aac', '-b:a', '192k', '-af', 'loudnorm=I=-14:TP=-1', '-shortest');
  if (duration) args.push('-t', String(duration));
  args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-movflags', '+faststart', out);
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
}

module.exports = { encode, gradeChain, captionsAss };
