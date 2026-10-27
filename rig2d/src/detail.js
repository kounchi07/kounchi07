/*
 * Rig2D Detail — the small things that make a drawn object look finished instead of flat.
 * Every prop and set piece should use several of these (see docs/BUILD_LOG.md, Step 8):
 *
 *   Detail.ao(x, y, w, h, op)            soft contact shadow where an object sits on a surface (no filter: cheap)
 *   Detail.shade(x, y, w, h, o)          form shading on a box: dark band on the shadow side + lit edge
 *   Detail.edge(x1, y1, x2, y2, o)       thin highlight line along a lit edge
 *   Detail.wear(x, y, w, h, seed, o)     scuffs, scratches and dents (dark + light flecks)
 *   Detail.screws(points, r)             screw/nail heads with slots
 *   Detail.glass(x, y, w, h, o)          reflections on glass/varnish (two streaks + glint)
 *   Detail.label(x, y, w, h, o)          a product label: border, brand text, small emblem, fine print lines
 *   Detail.stitch(d, o)                  dashed seam along a path
 *   Detail.planks(x, y, w, h, o)         plank seams + grain + knots + nail pairs
 *   Detail.dust(x, y, w, h, seed, n)     tiny specks in the air / on surfaces
 *   Detail.engrave(x, y, w, h, seed, o)  ornamental scrolls for metalwork
 * All return SVG strings in the same ink style as the kit.
 */
(function (root) {
  'use strict';
  const R2 = root.Rig2D;
  const INK = '#2b1d16';
  const n2 = v => +(+v).toFixed(2);
  const rngOf = s => { const R = R2.rng(s); return [R, (a, b) => a + (b - a) * R()]; };
  let UID = 0;

  function hex(c) { const v = parseInt(c.slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; }
  function mix(a, b, k) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); }
  const dk = (c, k) => mix(c, '#140a06', k), lt = (c, k) => mix(c, '#fff8e8', k);

  // Contact shadow: a radial gradient ellipse (cheaper than a blur filter, and it never clips)
  function ao(x, y, w, h = w * 0.18, op = 0.45, color = '#1a0c06') {
    const id = `dt-ao${++UID}`;
    return `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${op}"/><stop offset=".55" stop-color="${color}" stop-opacity="${n2(op * 0.55)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>` +
      `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="${n2(w / 2)}" ry="${n2(h / 2)}" fill="url(#${id})"/>`;
  }

  // Form shading on a box-like shape: shadow band on `side` (-1 left / 1 right), bright edge on the other
  function shade(x, y, w, h, o = {}) {
    const side = o.side || 1, op = o.op == null ? 0.28 : o.op, bw = w * (o.band || 0.22), id = `dt-sh${++UID}`;
    const sx = side > 0 ? x + w - bw : x;
    return `<linearGradient id="${id}" x1="${side > 0 ? 0 : 1}" y1="0" x2="${side > 0 ? 1 : 0}" y2="0"><stop offset="0" stop-color="#140a06" stop-opacity="0"/><stop offset="1" stop-color="#140a06" stop-opacity="${op}"/></linearGradient>` +
      `<rect x="${n2(sx)}" y="${n2(y)}" width="${n2(bw)}" height="${n2(h)}" fill="url(#${id})"${o.rx ? ` rx="${o.rx}"` : ''}/>` +
      (o.edge === false ? '' : `<path d="M${n2(side > 0 ? x + 5 : x + w - 5)},${n2(y + 6)} V${n2(y + h - 6)}" stroke="#fff8e8" stroke-width="${o.ew || 4}" stroke-linecap="round" opacity="${o.eop || 0.45}"/>`);
  }

  const edge = (x1, y1, x2, y2, o = {}) => `<path d="M${n2(x1)},${n2(y1)} L${n2(x2)},${n2(y2)}" stroke="${o.color || '#fff8e8'}" stroke-width="${o.w || 4}" stroke-linecap="round" opacity="${o.op || 0.5}"/>`;

  function wear(x, y, w, h, seed = 1, o = {}) {
    const [R, rr] = rngOf(seed);
    const n = o.n || Math.max(4, Math.round(w * h / 9000));
    let s = '';
    for (let i = 0; i < n; i++) {
      const px = x + R() * w, py = y + R() * h, l = rr(6, o.len || 26), a = rr(-0.5, 0.5);
      const light = R() < 0.5;
      s += `<path d="M${n2(px)},${n2(py)} l${n2(Math.cos(a) * l)},${n2(Math.sin(a) * l)}" stroke="${light ? '#fff4dc' : '#1a0c06'}" stroke-width="${n2(rr(1.2, 2.6))}" stroke-linecap="round" opacity="${n2(rr(0.12, 0.3) * (o.op || 1))}"/>`;
      if (R() < 0.15) s += `<ellipse cx="${n2(px)}" cy="${n2(py)}" rx="${n2(rr(3, 7))}" ry="${n2(rr(2, 4))}" fill="#1a0c06" opacity="${n2(rr(0.08, 0.18) * (o.op || 1))}"/>`;
    }
    return s;
  }

  const screws = (pts, r = 6, color = '#b8a27a') => pts.map(([x, y], i) =>
    `<circle cx="${n2(x)}" cy="${n2(y)}" r="${r}" fill="${color}" stroke="${INK}" stroke-width="${n2(r * 0.35)}"/><path d="M${n2(x - r * 0.6)},${n2(y + (i % 2 ? r * 0.3 : -r * 0.3))} L${n2(x + r * 0.6)},${n2(y + (i % 2 ? -r * 0.3 : r * 0.3))}" stroke="${INK}" stroke-width="${n2(r * 0.3)}"/>`).join('');

  function glass(x, y, w, h, o = {}) {
    const op = o.op || 0.55;
    return `<path d="M${n2(x + w * 0.18)},${n2(y + h * 0.1)} L${n2(x + w * 0.18)},${n2(y + h * 0.8)}" stroke="#fff" stroke-width="${n2(Math.max(3, w * 0.09))}" stroke-linecap="round" opacity="${op}"/>` +
      `<path d="M${n2(x + w * 0.32)},${n2(y + h * 0.12)} L${n2(x + w * 0.32)},${n2(y + h * 0.35)}" stroke="#fff" stroke-width="${n2(Math.max(2, w * 0.04))}" stroke-linecap="round" opacity="${n2(op * 0.7)}"/>` +
      `<circle cx="${n2(x + w * 0.78)}" cy="${n2(y + h * 0.18)}" r="${n2(Math.max(2, w * 0.05))}" fill="#fff" opacity="${n2(op * 0.8)}"/>`;
  }

  // Product label with readable structure: border, brand word, emblem, fine print
  function label(x, y, w, h, o = {}) {
    const bg = o.bg || '#f6efe2', ink = o.ink || '#8a2e2a', [R] = rngOf(o.seed || 1);
    const brands = o.words || ['FINE', 'BEST', 'PURE', 'CO.', 'ROYAL', 'GOLD', 'STAR', 'FRESH', 'EXTRA', 'No.1'];
    const word = brands[Math.floor(R() * brands.length)];
    const fs = Math.max(6, Math.min(h * 0.32, w / (word.length * 0.62)));
    let s = `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="${n2(Math.min(4, h * 0.1))}" fill="${bg}" stroke="${INK}" stroke-width="${n2(Math.max(1, Math.min(3, w * 0.03)))}"/>` +
      `<rect x="${n2(x + w * 0.06)}" y="${n2(y + h * 0.08)}" width="${n2(w * 0.88)}" height="${n2(h * 0.84)}" fill="none" stroke="${ink}" stroke-width="${n2(Math.max(0.8, w * 0.015))}"/>` +
      `<text x="${n2(x + w / 2)}" y="${n2(y + h * 0.48)}" text-anchor="middle" font-size="${n2(fs)}" font-family="DejaVu Serif, serif" font-weight="700" fill="${ink}">${word}</text>`;
    if (h > 18) s += `<path d="M${n2(x + w * 0.2)},${n2(y + h * 0.66)} H${n2(x + w * 0.8)} M${n2(x + w * 0.28)},${n2(y + h * 0.78)} H${n2(x + w * 0.72)}" stroke="${ink}" stroke-width="${n2(Math.max(0.8, h * 0.04))}" opacity=".6"/>`;
    if (o.emblem !== false && h > 26) s += `<circle cx="${n2(x + w / 2)}" cy="${n2(y + h * 0.2)}" r="${n2(Math.min(w, h) * 0.07)}" fill="${ink}" opacity=".8"/>`;
    return s;
  }

  const stitch = (d, o = {}) => `<path d="${d}" fill="none" stroke="${o.color || '#fff4dc'}" stroke-width="${o.w || 2.5}" stroke-dasharray="${o.dash || '7 6'}" opacity="${o.op || 0.6}" stroke-linecap="round"/>`;

  function planks(x, y, w, h, o = {}) {
    const [R, rr] = rngOf(o.seed || 3), pw = o.width || 64, vertical = o.vertical !== false;
    const dark = o.dark || '#3a1e0c', light = o.light || '#b07a48';
    let s = '';
    if (vertical) {
      for (let px = x; px < x + w; px += pw) {
        const tone = rr(-1, 1);
        s += `<rect x="${n2(px)}" y="${n2(y)}" width="${pw}" height="${n2(h)}" fill="${tone > 0 ? light : dark}" opacity="${n2(Math.abs(tone) * 0.12)}"/>` +
          `<path d="M${n2(px)},${n2(y)} V${n2(y + h)}" stroke="${dark}" stroke-width="4" opacity=".8"/><path d="M${n2(px + 4)},${n2(y)} V${n2(y + h)}" stroke="${light}" stroke-width="2" opacity=".45"/>`;
        for (let gy = y + rr(20, 120); gy < y + h; gy += rr(60, 160)) s += `<path d="M${n2(px + rr(10, pw - 10))},${n2(gy)} q${n2(rr(-6, 6))},${n2(rr(20, 50))} ${n2(rr(-4, 4))},${n2(rr(50, 110))}" stroke="${dark}" stroke-width="${n2(rr(1, 2.4))}" fill="none" opacity=".35"/>`;
        if (R() < 0.35) { const ky = y + rr(40, h - 40), kx = px + pw / 2; s += `<ellipse cx="${n2(kx)}" cy="${n2(ky)}" rx="7" ry="11" fill="none" stroke="${dark}" stroke-width="2.5" opacity=".5"/><ellipse cx="${n2(kx)}" cy="${n2(ky)}" rx="3" ry="5" fill="${dark}" opacity=".5"/>`; }
        for (const ny of o.nails || []) s += `<circle cx="${n2(px + 12)}" cy="${n2(ny)}" r="3.2" fill="#2a2a2a" opacity=".7"/><circle cx="${n2(px + pw - 12)}" cy="${n2(ny)}" r="3.2" fill="#2a2a2a" opacity=".7"/>`;
      }
    } else {
      for (let py = y; py < y + h; py += pw) {
        const tone = rr(-1, 1);
        s += `<rect x="${n2(x)}" y="${n2(py)}" width="${n2(w)}" height="${pw}" fill="${tone > 0 ? light : dark}" opacity="${n2(Math.abs(tone) * 0.12)}"/><path d="M${n2(x)},${n2(py)} H${n2(x + w)}" stroke="${dark}" stroke-width="4" opacity=".8"/>`;
        for (let gx = x + rr(20, 160); gx < x + w; gx += rr(140, 320)) s += `<path d="M${n2(gx)},${n2(py + pw)} V${n2(py)}" stroke="${dark}" stroke-width="3" opacity=".6"/>`;
      }
    }
    return s;
  }

  function dust(x, y, w, h, seed = 5, n = 30, color = '#fff6dc') {
    const [R, rr] = rngOf(seed);
    let s = '';
    for (let i = 0; i < n; i++) s += `<circle cx="${n2(x + R() * w)}" cy="${n2(y + R() * h)}" r="${n2(rr(1, 3.2))}" fill="${color}" opacity="${n2(rr(0.15, 0.5))}"/>`;
    return s;
  }

  function engrave(x, y, w, h, seed = 2, o = {}) {
    const [R, rr] = rngOf(seed), col = o.color || '#6a4410';
    let s = '';
    const n = o.n || 3;
    for (let i = 0; i < n; i++) {
      const cx = x + w * (i + 0.5) / n, cy = y + h / 2, r = Math.min(w / n, h) * 0.32;
      s += `<path d="M${n2(cx - r)},${n2(cy)} q${n2(r * 0.5)},${n2(-r)} ${n2(r)},0 t${n2(r)},0" stroke="${col}" stroke-width="3" fill="none" opacity=".7"/>` +
        `<path d="M${n2(cx - r * 0.6)},${n2(cy + r * 0.5)} q${n2(r * 0.6)},${n2(r * 0.6)} ${n2(r * 1.2)},0" stroke="${col}" stroke-width="2.4" fill="none" opacity=".55"/>` +
        `<circle cx="${n2(cx)}" cy="${n2(cy - r * 0.15)}" r="${n2(r * 0.2)}" fill="none" stroke="${col}" stroke-width="2.4" opacity=".7"/>`;
    }
    return s;
  }

  const Detail = { ao, shade, edge, wear, screws, glass, label, stitch, planks, dust, engrave, mix, dk, lt, INK };
  if (typeof module !== 'undefined' && module.exports) module.exports = Detail;
  else root.Detail = Detail;
})(typeof window !== 'undefined' ? window : globalThis);
