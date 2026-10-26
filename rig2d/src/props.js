/*
 * Rig2D Props — a library of detailed, reusable props drawn in the same ink
 * style as the characters. Every prop takes plain options and returns SVG.
 *
 *   Props.book({ x, y, w, h, color })            y = bottom of the book
 *   Props.vase({ x, y, w, h, color, motif })     x = center, y = base
 *   Props.candle({ x, y })                       returns { svg, flame: [x, y] }
 *   Props.lantern({ x, y, r, glow })             y = hook point
 *   Props.table({ x, y, w, h })                  y = table top
 *   Props.chest({ x, y, w, h })                  y = floor
 *   Props.teaset({ x, y })                       y = surface it sits on
 *   Props.scrolls({ x, y, rows })                y = surface
 *   Props.plant({ x, y, s })                     y = surface
 *   Props.woodGrain({ x, y, w, h, seed })        grain + knots inside a rect
 *
 * `light` (-1 = from the left, 1 = from the right) decides which side is shaded.
 */
(function (root) {
  'use strict';
  const R2 = root.Rig2D || require('./rig.js');
  const INK = '#2b1d16';
  const n2 = v => +(+v).toFixed(2);
  let UID = 0;
  const uid = p => `pr-${p}${++UID}`;

  function hex(c) { const v = parseInt(c.slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; }
  function mix(a, b, k) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); }
  const dk = (c, k) => mix(c, '#1a0f0a', k), lt = (c, k) => mix(c, '#fff6e0', k);

  function woodGrain({ x, y, w, h, seed = 1, color = '#4a2a17', knots = 1, vertical = false, op = 0.45 }) {
    const R = R2.rng(seed), rr = (a, b) => a + (b - a) * R(), id = uid('wg');
    let s = `<clipPath id="${id}"><rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}"/></clipPath><g clip-path="url(#${id})" stroke="${color}" fill="none" opacity="${op}">`;
    const L = vertical ? w : h, along = vertical ? h : w, lines = Math.max(3, Math.round(L / 7));
    const kp = Array.from({ length: knots }, () => [rr(0.15, 0.85), rr(0.2, 0.8)]);
    for (let i = 0; i < lines; i++) {
      const off = (i + 0.5) / lines * L;
      let d = '';
      for (let k = 0; k <= 12; k++) {
        const a = k / 12 * along;
        let bend = Math.sin(k * 0.9 + i * 0.7 + seed) * 1.6;
        for (const [ka, kb] of kp) { const dx = a - ka * along, dy = off - kb * L; bend += 9 * Math.exp(-(dx * dx) / 900) * Math.sign(dy || 1) * Math.exp(-(dy * dy) / 300); }
        const px = vertical ? x + off + bend : x + a, py = vertical ? y + a : y + off + bend;
        d += (k ? ' L' : 'M') + `${n2(px)},${n2(py)}`;
      }
      s += `<path d="${d}" stroke-width="${n2(rr(1, 2.2))}"/>`;
    }
    for (const [ka, kb] of kp) {
      const cx = vertical ? x + kb * w : x + ka * w, cy = vertical ? y + ka * h : y + kb * h;
      s += `<ellipse cx="${n2(cx)}" cy="${n2(cy)}" rx="${vertical ? 4 : 9}" ry="${vertical ? 9 : 4}" stroke-width="2"/><ellipse cx="${n2(cx)}" cy="${n2(cy)}" rx="${vertical ? 2 : 4}" ry="${vertical ? 4 : 2}" fill="${color}"/>`;
    }
    return s + '</g>';
  }

  function book({ x, y, w, h, color = '#7a2e2a', seed = 1, lean = 0, light = -1, gold = '#d8b25a' }) {
    const R = R2.rng(seed), top = y - h;
    let s = `<g transform="rotate(${n2(lean)} ${n2(x + (lean < 0 ? w : 0))} ${n2(y)})">`;
    s += `<rect x="${n2(x)}" y="${n2(top)}" width="${n2(w)}" height="${n2(h)}" rx="3" fill="${color}"/>`;
    const shadeX = light < 0 ? x + w * 0.66 : x, hiX = light < 0 ? x + 2 : x + w - 5;
    s += `<rect x="${n2(shadeX)}" y="${n2(top + 1)}" width="${n2(w * 0.34)}" height="${n2(h - 2)}" fill="${dk(color, 0.45)}" opacity=".6"/>`;
    s += `<rect x="${n2(hiX)}" y="${n2(top + 3)}" width="3" height="${n2(h - 6)}" fill="${lt(color, 0.5)}" opacity=".55"/>`;
    // raised hubs
    for (const k of [0.1, 0.86]) {
      const yy = top + h * k;
      s += `<rect x="${n2(x - 1)}" y="${n2(yy)}" width="${n2(w + 2)}" height="7" rx="2" fill="${dk(color, 0.15)}" stroke="${INK}" stroke-width="1.5"/><line x1="${n2(x + 1)}" y1="${n2(yy + 1.5)}" x2="${n2(x + w - 1)}" y2="${n2(yy + 1.5)}" stroke="${lt(color, 0.45)}" stroke-width="1.2"/>`;
    }
    for (const k of [0.2, 0.76]) s += `<line x1="${n2(x + 2)}" y1="${n2(top + h * k)}" x2="${n2(x + w - 2)}" y2="${n2(top + h * k)}" stroke="${gold}" stroke-width="1.4"/>`;
    // title label with brush glyphs
    const ly = top + h * 0.3, lh = h * 0.3;
    s += `<rect x="${n2(x + w * 0.18)}" y="${n2(ly)}" width="${n2(w * 0.64)}" height="${n2(lh)}" rx="1.5" fill="#ece0c4" stroke="${INK}" stroke-width="1.3"/>`;
    for (let g = 0; g < 3; g++) {
      const gy = ly + lh * (0.22 + g * 0.27), gx = x + w * 0.5;
      s += `<path d="M${n2(gx - w * 0.16)},${n2(gy)} l${n2(w * 0.32)},${n2(R() * 2 - 1)} M${n2(gx + (R() - 0.5) * w * 0.1)},${n2(gy - 3)} l${n2(R() * 2 - 1)},${n2(6)}" stroke="#3a2418" stroke-width="1.4" stroke-linecap="round"/>`;
    }
    // ornament + worn corners
    s += `<path d="M${n2(x + w / 2)},${n2(top + h * 0.66)} l4,4 l-4,4 l-4,-4Z" fill="${gold}"/>`;
    s += `<path d="M${n2(x + 2)},${n2(top + 6)} q2,-4 6,-4 M${n2(x + w - 2)},${n2(y - 6)} q-2,4 -6,4" stroke="${lt(color, 0.6)}" stroke-width="2" fill="none" opacity=".7"/>`;
    s += `<rect x="${n2(x)}" y="${n2(top)}" width="${n2(w)}" height="${n2(h)}" rx="3" fill="none" stroke="${INK}" stroke-width="3"/></g>`;
    return s;
  }

  // Lying book seen from the front edge: cover, page block with page lines.
  function bookFlat({ x, y, w, h = 26, color = '#2f4f6f', rot = 0, gold = '#d8b25a' }) {
    return `<g transform="rotate(${n2(rot)} ${n2(x + w / 2)} ${n2(y)})"><rect x="${n2(x)}" y="${n2(y - h)}" width="${n2(w)}" height="${n2(h)}" rx="4" fill="${color}" stroke="${INK}" stroke-width="3.5"/>` +
      `<rect x="${n2(x + 6)}" y="${n2(y - h + 5)}" width="${n2(w - 12)}" height="${n2(h - 10)}" fill="#efe2c4" stroke="${INK}" stroke-width="1.5"/>` +
      [0.3, 0.5, 0.7].map(k => `<line x1="${n2(x + 8)}" y1="${n2(y - h + 5 + (h - 10) * k)}" x2="${n2(x + w - 8)}" y2="${n2(y - h + 5 + (h - 10) * k)}" stroke="#c8b590" stroke-width="1"/>`).join('') +
      `<rect x="${n2(x + w * 0.4)}" y="${n2(y - h - 1)}" width="${n2(w * 0.2)}" height="4" fill="${gold}" stroke="${INK}" stroke-width="1"/></g>`;
  }

  function vase({ x, y, w, h, color = '#3f6f8a', band = '#e8d7a0', motif = 'cloud', light = -1, seed = 1 }) {
    const id = uid('vs');
    const body = `M${n2(x - w * 0.3)},${n2(y)} C${n2(x - w * 0.64)},${n2(y - h * 0.3)} ${n2(x - w * 0.62)},${n2(y - h * 0.78)} ${n2(x - w * 0.22)},${n2(y - h * 0.86)} L${n2(x - w * 0.19)},${n2(y - h * 0.96)} L${n2(x + w * 0.19)},${n2(y - h * 0.96)} L${n2(x + w * 0.22)},${n2(y - h * 0.86)} C${n2(x + w * 0.62)},${n2(y - h * 0.78)} ${n2(x + w * 0.64)},${n2(y - h * 0.3)} ${n2(x + w * 0.3)},${n2(y)} Z`;
    let s = `<clipPath id="${id}"><path d="${body}"/></clipPath><path d="${body}" fill="${color}"/><g clip-path="url(#${id})">`;
    // motif band
    const by = y - h * 0.52, bh = h * 0.2;
    s += `<rect x="${n2(x - w)}" y="${n2(by - bh / 2)}" width="${n2(w * 2)}" height="${n2(bh)}" fill="${dk(color, 0.25)}"/>`;
    s += `<line x1="${n2(x - w)}" y1="${n2(by - bh / 2)}" x2="${n2(x + w)}" y2="${n2(by - bh / 2)}" stroke="${band}" stroke-width="3"/><line x1="${n2(x - w)}" y1="${n2(by + bh / 2)}" x2="${n2(x + w)}" y2="${n2(by + bh / 2)}" stroke="${band}" stroke-width="3"/>`;
    const step = w * 0.32;
    for (let k = -2; k <= 2; k++) {
      const cx = x + k * step;
      if (motif === 'cloud') s += `<path d="M${n2(cx - step * 0.35)},${n2(by + 3)} a${n2(step * 0.18)},${n2(step * 0.18)} 0 1 1 ${n2(step * 0.3)},-2 a${n2(step * 0.14)},${n2(step * 0.14)} 0 1 1 ${n2(step * 0.3)},2" stroke="${band}" stroke-width="2.2" fill="none"/>`;
      else if (motif === 'wave') s += `<path d="M${n2(cx - step / 2)},${n2(by + bh * 0.3)} q${n2(step / 4)},${n2(-bh * 0.6)} ${n2(step / 2)},0 q${n2(step / 4)},${n2(-bh * 0.6)} ${n2(step / 2)},0" stroke="${band}" stroke-width="2.2" fill="none"/>`;
      else s += `<circle cx="${n2(cx)}" cy="${n2(by)}" r="${n2(bh * 0.18)}" fill="${band}"/>`;
    }
    // shoulder petals + base lines
    for (let k = -3; k <= 3; k++) s += `<path d="M${n2(x + k * w * 0.13)},${n2(y - h * 0.84)} q${n2(w * 0.05)},${n2(h * 0.09)} ${n2(w * 0.1)},0" stroke="${band}" stroke-width="1.8" fill="none" opacity=".85"/>`;
    s += `<line x1="${n2(x - w)}" y1="${n2(y - h * 0.18)}" x2="${n2(x + w)}" y2="${n2(y - h * 0.18)}" stroke="${band}" stroke-width="2"/>`;
    // shading: core shadow, reflected light, glaze highlight
    s += `<ellipse cx="${n2(x - light * w * 0.42)}" cy="${n2(y - h * 0.45)}" rx="${n2(w * 0.32)}" ry="${n2(h * 0.6)}" fill="${dk(color, 0.6)}" opacity=".45"/>`;
    s += `<ellipse cx="${n2(x - light * w * 0.6)}" cy="${n2(y - h * 0.4)}" rx="${n2(w * 0.06)}" ry="${n2(h * 0.3)}" fill="${lt(color, 0.3)}" opacity=".3"/>`;
    s += `<path d="M${n2(x + light * w * 0.32)},${n2(y - h * 0.74)} Q${n2(x + light * w * 0.46)},${n2(y - h * 0.5)} ${n2(x + light * w * 0.34)},${n2(y - h * 0.22)}" stroke="#fff" stroke-width="${n2(Math.max(3, w * 0.06))}" fill="none" opacity=".45" stroke-linecap="round"/>`;
    s += `<circle cx="${n2(x + light * w * 0.28)}" cy="${n2(y - h * 0.78)}" r="${n2(w * 0.03 + 1)}" fill="#fff" opacity=".7"/></g>`;
    s += `<path d="${body}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
    // lip with opening, foot ring, chip
    s += `<ellipse cx="${n2(x)}" cy="${n2(y - h * 0.96)}" rx="${n2(w * 0.25)}" ry="${n2(h * 0.045 + 2)}" fill="${lt(color, 0.15)}" stroke="${INK}" stroke-width="3"/><ellipse cx="${n2(x)}" cy="${n2(y - h * 0.96)}" rx="${n2(w * 0.16)}" ry="${n2(h * 0.025 + 1)}" fill="#1a0f0a"/>`;
    s += `<rect x="${n2(x - w * 0.33)}" y="${n2(y - 5)}" width="${n2(w * 0.66)}" height="7" rx="3" fill="${dk(color, 0.3)}" stroke="${INK}" stroke-width="2.5"/>`;
    s += `<path d="M${n2(x + w * 0.12)},${n2(y - h * 0.995)} l3,4 l3,-3" stroke="${INK}" stroke-width="1.5" fill="${lt(color, 0.5)}"/>`;
    return s;
  }

  function candle({ x, y, light = -1 }) {
    let s = `<ellipse cx="${n2(x)}" cy="${n2(y + 6)}" rx="66" ry="15" fill="#000" opacity=".35"/>`;
    // brass dish with engraved rings and a loop handle
    s += `<path d="M${n2(x + 52)},${n2(y - 4)} q34,-6 30,14 q-4,14 -26,6" stroke="${INK}" stroke-width="10" fill="none"/><path d="M${n2(x + 52)},${n2(y - 4)} q34,-6 30,14 q-4,14 -26,6" stroke="#c8963f" stroke-width="5" fill="none"/>`;
    s += `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="60" ry="15" fill="#b8862f" stroke="${INK}" stroke-width="4"/><ellipse cx="${n2(x)}" cy="${n2(y - 4)}" rx="46" ry="10" fill="#e2b45a"/><ellipse cx="${n2(x)}" cy="${n2(y - 4)}" rx="36" ry="7" fill="none" stroke="#a5752a" stroke-width="1.6"/>`;
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; s += `<circle cx="${n2(x + Math.cos(a) * 53)}" cy="${n2(y + Math.sin(a) * 12)}" r="1.6" fill="#7a5418"/>`; }
    s += `<path d="M${n2(x - 40)},${n2(y - 6)} q10,-5 22,-3" stroke="#fff3c0" stroke-width="3" fill="none" opacity=".8" stroke-linecap="round"/>`;
    // candle body with wax pool, drips and soot
    const top = y - 120;
    s += `<path d="M${n2(x - 30)},${n2(top)} L${n2(x - 30)},${n2(y - 4)} Q${n2(x)},${n2(y + 6)} ${n2(x + 30)},${n2(y - 4)} L${n2(x + 30)},${n2(top)} Z" fill="#efdcb4" stroke="${INK}" stroke-width="4"/>`;
    s += `<rect x="${n2(x + (light < 0 ? 10 : -30))}" y="${n2(top + 4)}" width="20" height="${n2(y - top - 10)}" fill="#c9a77a" opacity=".55"/>`;
    s += `<rect x="${n2(x + (light < 0 ? -24 : 18))}" y="${n2(top + 6)}" width="5" height="${n2(y - top - 16)}" fill="#fff8e6" opacity=".8"/>`;
    s += `<ellipse cx="${n2(x)}" cy="${n2(top)}" rx="30" ry="8" fill="#fff6e0" stroke="${INK}" stroke-width="3"/><ellipse cx="${n2(x)}" cy="${n2(top + 1)}" rx="13" ry="3.5" fill="#f2d79a"/>`;
    s += `<path d="M${n2(x - 26)},${n2(top + 2)} q-3,26 3,36 q7,-6 4,-34 M${n2(x + 15)},${n2(top + 4)} q2,40 9,50 q6,-12 1,-50 M${n2(x - 6)},${n2(top + 6)} q0,14 4,18 q4,-6 2,-18" fill="#fff4dc" stroke="${INK}" stroke-width="2.5"/>`;
    s += `<line x1="${n2(x)}" y1="${n2(top - 2)}" x2="${n2(x + 1)}" y2="${n2(top - 18)}" stroke="#1a1010" stroke-width="3.5" stroke-linecap="round"/><circle cx="${n2(x + 1)}" cy="${n2(top - 18)}" r="2" fill="#ff7a2a"/>`;
    return { svg: s, flame: [x, top - 6] };
  }

  function lantern({ x, y, r = 72, glow = '#e2582f', glowId = null, glyph = true }) {
    const cy = y + 40 + r;
    let s = `<line x1="${n2(x)}" y1="${n2(y)}" x2="${n2(x)}" y2="${n2(y + 32)}" stroke="${INK}" stroke-width="4"/><circle cx="${n2(x)}" cy="${n2(y + 4)}" r="6" fill="none" stroke="#7a5a2a" stroke-width="3"/>`;
    const cap = (yy, flip) => `<path d="M${n2(x - r * 0.5)},${n2(yy)} L${n2(x + r * 0.5)},${n2(yy)} L${n2(x + r * 0.44)},${n2(yy + 16 * flip)} L${n2(x - r * 0.44)},${n2(yy + 16 * flip)} Z" fill="#3a2214" stroke="${INK}" stroke-width="3"/>` +
      Array.from({ length: 7 }, (_, i) => `<rect x="${n2(x - r * 0.4 + i * r * 0.133 - 2)}" y="${n2(yy + (flip > 0 ? 4 : -12))}" width="4" height="8" fill="#6a4426"/>`).join('') +
      `<line x1="${n2(x - r * 0.5)}" y1="${n2(yy)}" x2="${n2(x + r * 0.5)}" y2="${n2(yy)}" stroke="#c8963f" stroke-width="2"/>`;
    s += cap(y + 30, 1);
    s += `<ellipse cx="${n2(x)}" cy="${n2(cy)}" rx="${n2(r)}" ry="${n2(r * 0.97)}" fill="${glowId ? `url(#${glowId})` : glow}" stroke="${INK}" stroke-width="5"/>`;
    for (const k of [-0.85, -0.55, -0.25, 0.05, 0.35, 0.65]) s += `<path d="M${n2(x + k * r * 0.28)},${n2(cy - r * 0.92)} Q${n2(x + k * r * 1.32)},${n2(cy)} ${n2(x + k * r * 0.28)},${n2(cy + r * 0.92)}" stroke="#7a2416" stroke-width="2.4" fill="none" opacity=".7"/>`;
    for (const k of [-0.55, 0, 0.55]) s += `<path d="M${n2(x - Math.sqrt(1 - k * k) * r * 0.98)},${n2(cy + k * r)} Q${n2(x)},${n2(cy + k * r + 6)} ${n2(x + Math.sqrt(1 - k * k) * r * 0.98)},${n2(cy + k * r)}" stroke="#7a2416" stroke-width="1.6" fill="none" opacity=".5"/>`;
    if (glyph) s += `<path d="M${n2(x - 16)},${n2(cy - 26)} l32,0 M${n2(x - 18)},${n2(cy - 10)} l36,0 M${n2(x)},${n2(cy - 30)} l0,46 M${n2(x - 14)},${n2(cy + 4)} q14,14 28,0 M${n2(x - 8)},${n2(cy + 24)} l16,0" stroke="#4a120a" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    s += `<ellipse cx="${n2(x - r * 0.42)}" cy="${n2(cy - r * 0.35)}" rx="${n2(r * 0.16)}" ry="${n2(r * 0.3)}" fill="#ffe2a0" opacity=".35"/>`;
    s += cap(cy + r * 0.97 - 2, -1).replace(/translate/g, 'translate');
    const ty = cy + r + 12;
    s += `<circle cx="${n2(x)}" cy="${n2(ty)}" r="8" fill="#d6ad55" stroke="${INK}" stroke-width="2.5"/><path d="M${n2(x - 6)},${n2(ty + 8)} l12,0 l-3,10 l-6,0Z" fill="#b8322a" stroke="${INK}" stroke-width="2"/>`;
    for (let i = -4; i <= 4; i++) s += `<line x1="${n2(x + i * 1.2)}" y1="${n2(ty + 18)}" x2="${n2(x + i * 3.2)}" y2="${n2(ty + 64 - Math.abs(i) * 4)}" stroke="#b8322a" stroke-width="2.5"/>`;
    return s;
  }

  function table({ x, y, w, h, seed = 3, light = -1 }) {
    const top = 26, apron = 34, legW = 26;
    let s = `<ellipse cx="${n2(x + w / 2)}" cy="${n2(y + h)}" rx="${n2(w * 0.55)}" ry="16" fill="#000" opacity=".45"/>`;
    for (const lx of [x + 18, x + w - 18 - legW]) {
      s += `<path d="M${n2(lx)},${n2(y + top)} L${n2(lx + legW)},${n2(y + top)} L${n2(lx + legW - 2)},${n2(y + h - 22)} Q${n2(lx + legW + 8)},${n2(y + h - 8)} ${n2(lx + legW + 10)},${n2(y + h)} L${n2(lx - 10)},${n2(y + h)} Q${n2(lx - 8)},${n2(y + h - 8)} ${n2(lx + 2)},${n2(y + h - 22)} Z" fill="#6a3f25" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
      for (const k of [0.35, 0.42]) s += `<line x1="${n2(lx + 1)}" y1="${n2(y + top + (h - top) * k)}" x2="${n2(lx + legW - 1)}" y2="${n2(y + top + (h - top) * k)}" stroke="${INK}" stroke-width="2"/>`;
      s += `<rect x="${n2(lx + (light < 0 ? 3 : legW - 8))}" y="${n2(y + top + 4)}" width="5" height="${n2(h - top - 34)}" fill="#a06a40" opacity=".5"/>`;
    }
    // top slab with bevel, grain and highlight
    s += `<path d="M${n2(x + 14)},${n2(y)} L${n2(x + w - 14)},${n2(y)} L${n2(x + w)},${n2(y + top)} L${n2(x)},${n2(y + top)} Z" fill="#8a552e"/>`;
    s += woodGrain({ x, y, w, h: top, seed, knots: 1, color: '#5a3018' });
    s += `<path d="M${n2(x + 14)},${n2(y)} L${n2(x + w - 14)},${n2(y)} L${n2(x + w)},${n2(y + top)} L${n2(x)},${n2(y + top)} Z" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
    s += `<line x1="${n2(x + 18)}" y1="${n2(y + 4)}" x2="${n2(x + w - 18)}" y2="${n2(y + 4)}" stroke="#c48a55" stroke-width="2.5" opacity=".8"/>`;
    // apron with carved cloud scroll and brass nails
    s += `<rect x="${n2(x)}" y="${n2(y + top)}" width="${n2(w)}" height="${apron}" fill="#5d341c" stroke="${INK}" stroke-width="5"/>`;
    s += woodGrain({ x: x + 3, y: y + top + 3, w: w - 6, h: apron - 6, seed: seed + 5, knots: 0, color: '#3a1e0e', op: 0.35 });
    const mid = x + w / 2, ay = y + top + apron / 2;
    s += `<path d="M${n2(mid - 50)},${n2(ay)} q12,-12 24,0 q-12,10 -18,2 M${n2(mid + 50)},${n2(ay)} q-12,-12 -24,0 q12,10 18,2 M${n2(mid - 24)},${n2(ay)} q24,10 48,0" stroke="#c7953f" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    for (const nx of [x + 10, x + w - 10]) s += `<circle cx="${n2(nx)}" cy="${n2(ay)}" r="3.5" fill="#d6ad55" stroke="${INK}" stroke-width="1.5"/>`;
    s += `<line x1="${n2(x + 4)}" y1="${n2(y + top + apron - 3)}" x2="${n2(x + w - 4)}" y2="${n2(y + top + apron - 3)}" stroke="#1c0f08" stroke-width="3" opacity=".6"/>`;
    return s;
  }

  function chest({ x, y, w, h, seed = 7, color = '#6b3d22' }) {
    const top = y - h, lid = h * 0.32;
    let s = `<ellipse cx="${n2(x + w / 2)}" cy="${n2(y + 2)}" rx="${n2(w * 0.56)}" ry="14" fill="#000" opacity=".45"/>`;
    s += `<rect x="${n2(x)}" y="${n2(top + lid)}" width="${n2(w)}" height="${n2(h - lid)}" fill="${color}"/>`;
    s += woodGrain({ x, y: top + lid, w, h: h - lid, seed, knots: 1, color: '#3a1e0e' });
    for (let k = 1; k < 3; k++) s += `<line x1="${n2(x)}" y1="${n2(top + lid + (h - lid) * k / 3)}" x2="${n2(x + w)}" y2="${n2(top + lid + (h - lid) * k / 3)}" stroke="${INK}" stroke-width="2.5"/>`;
    s += `<path d="M${n2(x)},${n2(top + lid)} L${n2(x)},${n2(top + 10)} Q${n2(x + w / 2)},${n2(top - 12)} ${n2(x + w)},${n2(top + 10)} L${n2(x + w)},${n2(top + lid)} Z" fill="${lt(color, 0.08)}" stroke="${INK}" stroke-width="4"/>`;
    s += `<rect x="${n2(x)}" y="${n2(top)}" width="${n2(w)}" height="${n2(h)}" fill="none"/>`;
    s += `<rect x="${n2(x)}" y="${n2(top + lid)}" width="${n2(w)}" height="${n2(h - lid)}" fill="none" stroke="${INK}" stroke-width="4"/>`;
    // brass corners, straps, lock
    const brass = '#c8963f';
    for (const [cx, cy, sx, sy] of [[x, top + lid, 1, 1], [x + w, top + lid, -1, 1], [x, y, 1, -1], [x + w, y, -1, -1]])
      s += `<path d="M${n2(cx)},${n2(cy)} l${n2(22 * sx)},0 l${n2(-22 * sx)},${n2(22 * sy)} Z" fill="${brass}" stroke="${INK}" stroke-width="2.5"/><circle cx="${n2(cx + 6 * sx)}" cy="${n2(cy + 6 * sy)}" r="2" fill="#7a5418"/>`;
    for (const k of [0.2, 0.8]) s += `<rect x="${n2(x + w * k - 7)}" y="${n2(top + 4)}" width="14" height="${n2(h - 4)}" fill="${brass}" stroke="${INK}" stroke-width="2.5" opacity=".95"/>` +
      [0.2, 0.5, 0.8].map(q => `<circle cx="${n2(x + w * k)}" cy="${n2(top + 4 + (h - 4) * q)}" r="2.2" fill="#7a5418"/>`).join('');
    const lx = x + w / 2;
    s += `<path d="M${n2(lx - 16)},${n2(top + lid - 6)} h32 v26 q-16,10 -32,0 Z" fill="${brass}" stroke="${INK}" stroke-width="3"/><circle cx="${n2(lx)}" cy="${n2(top + lid + 6)}" r="4" fill="${INK}"/><path d="M${n2(lx)},${n2(top + lid + 8)} v7" stroke="${INK}" stroke-width="3"/>`;
    s += `<path d="M${n2(x + 6)},${n2(top + 8)} Q${n2(x + w / 2)},${n2(top - 8)} ${n2(x + w - 30)},${n2(top + 4)}" stroke="#c48a55" stroke-width="2.5" fill="none" opacity=".6"/>`;
    return s;
  }

  function teaset({ x, y, color = '#3f6f8a' }) {
    let s = `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="92" ry="12" fill="#5a3418" stroke="${INK}" stroke-width="3"/><ellipse cx="${n2(x)}" cy="${n2(y - 3)}" rx="84" ry="8" fill="#7a4a26"/>`;
    // teapot
    const px = x - 18, py = y - 6;
    s += `<path d="M${n2(px + 34)},${n2(py - 40)} q30,-6 34,-30 q4,-6 -4,-4 q-8,22 -32,20" fill="${color}" stroke="${INK}" stroke-width="3"/>`;
    s += `<path d="M${n2(px - 34)},${n2(py - 42)} q-28,-2 -24,22 q4,16 22,12" stroke="${INK}" stroke-width="9" fill="none"/><path d="M${n2(px - 34)},${n2(py - 42)} q-28,-2 -24,22 q4,16 22,12" stroke="${dk(color, 0.2)}" stroke-width="4" fill="none"/>`;
    s += `<path d="M${n2(px - 38)},${n2(py)} C${n2(px - 52)},${n2(py - 40)} ${n2(px - 30)},${n2(py - 62)} ${n2(px)},${n2(py - 62)} C${n2(px + 30)},${n2(py - 62)} ${n2(px + 52)},${n2(py - 40)} ${n2(px + 38)},${n2(py)} Z" fill="${color}" stroke="${INK}" stroke-width="3.5"/>`;
    s += `<path d="M${n2(px - 40)},${n2(py - 28)} Q${n2(px)},${n2(py - 22)} ${n2(px + 40)},${n2(py - 28)}" stroke="#e8d7a0" stroke-width="2.5" fill="none"/>`;
    s += `<path d="M${n2(px + 16)},${n2(py - 54)} q16,10 18,34" stroke="${dk(color, 0.5)}" stroke-width="10" fill="none" opacity=".4"/><path d="M${n2(px - 26)},${n2(py - 48)} q-8,14 -6,28" stroke="#fff" stroke-width="4" fill="none" opacity=".5" stroke-linecap="round"/>`;
    s += `<ellipse cx="${n2(px)}" cy="${n2(py - 62)}" rx="22" ry="6" fill="${lt(color, 0.15)}" stroke="${INK}" stroke-width="3"/><circle cx="${n2(px)}" cy="${n2(py - 72)}" r="7" fill="${color}" stroke="${INK}" stroke-width="3"/>`;
    // cups
    for (const cx of [x + 50, x + 74]) s += `<path d="M${n2(cx - 12)},${n2(y - 26)} L${n2(cx + 12)},${n2(y - 26)} L${n2(cx + 9)},${n2(y - 6)} L${n2(cx - 9)},${n2(y - 6)} Z" fill="#efe5cf" stroke="${INK}" stroke-width="3"/><ellipse cx="${n2(cx)}" cy="${n2(y - 26)}" rx="12" ry="3.5" fill="#7a4a1e" stroke="${INK}" stroke-width="2"/><line x1="${n2(cx - 10)}" y1="${n2(y - 18)}" x2="${n2(cx + 10)}" y2="${n2(y - 18)}" stroke="${color}" stroke-width="2.5"/>`;
    return s;
  }

  function scrolls({ x, y, rows = 3 }) {
    let s = '';
    for (let r = 0; r < rows; r++) for (let c = 0; c < rows + 1 - r; c++) {
      const cx = x + c * 30 + r * 15, cy = y - 14 - r * 26;
      s += `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="14" fill="#e6d3a8" stroke="${INK}" stroke-width="3"/><circle cx="${n2(cx)}" cy="${n2(cy)}" r="9" fill="none" stroke="#b8975f" stroke-width="1.5"/><circle cx="${n2(cx)}" cy="${n2(cy)}" r="4.5" fill="#7a4a1e" stroke="${INK}" stroke-width="1.5"/>`;
      if ((r + c) % 2 === 0) s += `<path d="M${n2(cx - 13)},${n2(cy + 4)} q13,6 26,0" stroke="#b03a2e" stroke-width="3" fill="none"/>`;
    }
    return s;
  }

  function plant({ x, y, s: k = 1, seed = 4 }) {
    const R = R2.rng(seed), rr = (a, b) => a + (b - a) * R();
    let s = `<g transform="translate(${n2(x)} ${n2(y)}) scale(${n2(k)})">`;
    for (let i = 0; i < 11; i++) {
      const a = -160 + i * 14 + rr(-6, 6), L = rr(60, 100), rad = a * Math.PI / 180, ex = Math.cos(rad) * L, ey = Math.sin(rad) * L;
      s += `<path d="M0,-40 Q${n2(ex * 0.4 - 6)},${n2(ey * 0.6 - 50)} ${n2(ex)},${n2(ey - 40)} Q${n2(ex * 0.6 + 6)},${n2(ey * 0.4 - 34)} 0,-40 Z" fill="${i % 2 ? '#4f7d3a' : '#5f9444'}" stroke="${INK}" stroke-width="3"/><path d="M0,-40 Q${n2(ex * 0.5)},${n2(ey * 0.5 - 42)} ${n2(ex * 0.9)},${n2(ey * 0.9 - 40)}" stroke="#2f5224" stroke-width="2" fill="none"/>`;
    }
    s += `<path d="M-38,-48 L38,-48 L29,0 L-29,0 Z" fill="#b65e38" stroke="${INK}" stroke-width="4"/><path d="M8,-46 L22,-46 L18,-2 L6,-2Z" fill="#8a3f22" opacity=".5"/><rect x="-42" y="-54" width="84" height="12" rx="3" fill="#c96d43" stroke="${INK}" stroke-width="3"/><ellipse cx="0" cy="-54" rx="36" ry="4" fill="#3a2214"/>`;
    s += `<path d="M-32,-26 L32,-26" stroke="#8a3f22" stroke-width="3"/><path d="M-22,-18 q6,-6 12,0 q6,6 12,0 q6,-6 12,0" stroke="#e8c27a" stroke-width="2" fill="none"/><path d="M-30,-40 l4,30" stroke="#e08a60" stroke-width="3" opacity=".6"/></g>`;
    return s;
  }

  const Props = { book, bookFlat, vase, candle, lantern, table, chest, teaset, scrolls, plant, woodGrain, mix, dk, lt, INK };
  if (typeof module !== 'undefined' && module.exports) module.exports = Props;
  else root.Props = Props;
})(typeof window !== 'undefined' ? window : globalThis);
