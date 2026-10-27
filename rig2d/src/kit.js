/*
 * Rig2D Character Kit — build any character from a description.
 *
 *   const Spec = Kit.character({
 *     name: 'thief',
 *     body:  { thigh: 120, shin: 110, chest: 110 },          // biped proportions
 *     skin:  '#f0dcc0',
 *     head:  { rx: 140, ry: 130, wobble: 0.12, seed: 21 },    // blob head
 *     hair:  { style: 'hood', color: '#22202a' },             // bun | short | bald | hood | long
 *     outfit:{ type: 'tunic', color: '#2b2b38', pattern: 'none', sash: '#7a2e2a' },
 *     pants: '#1f1d27', shoes: { color: '#151318' },
 *     face:  { mustache: true },
 *     props: [{ name: 'sack', bone: 'handR', draw: ctx => '...' }],
 *   });
 *   const hero = new Rig2D.Actor(Spec, { id: 'thief' });   // front + side views
 *
 * Every visual is generated from the description, so all characters share the
 * same rig, poses, walk cycle, face rig and ink style.
 */
(function (root) {
  'use strict';
  const R2 = root.Rig2D || require('./rig.js');
  const n2 = v => +(+v).toFixed(2);
  const pt = p => `${n2(p[0])},${n2(p[1])}`;

  function hex(c) { const v = parseInt(c.slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; }
  function mix(a, b, k) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); }
  const dk = (c, k) => mix(c, '#140c10', k), lt = (c, k) => mix(c, '#fff6e0', k);

  const DEFAULTS = {
    ink: '#2b1d16', light: -1,
    skin: '#f4ead6',
    head: { rx: 152, ry: 138, wobble: 0.1, seed: 7, jaw: 0.7, crown: 0.3, line: 8 },
    hair: { style: 'bun', color: '#2a2330', pin: true, pinColor: '#a0703c', bead: '#3fae7c', band: '#c38a2c' },
    outfit: {
      type: 'robe', color: '#2d6e72', pattern: 'diamond', trim: '#1d2a44', inner: '#efe5cf', dots: '#e2b552',
      sash: '#c38a2c', pendant: '#3fae7c', length: 150, rim: '#ffb46a',
    },
    pants: '#2c2838',
    shoes: { color: '#1f1b22', sole: '#efe5cf' },
    face: {},
    props: [],
  };

  function character(cfgIn) {
    const cfg = {
      name: cfgIn.name || 'character', ink: cfgIn.ink || DEFAULTS.ink, light: cfgIn.light == null ? DEFAULTS.light : cfgIn.light,
      skin: cfgIn.skin || DEFAULTS.skin, body: cfgIn.body || {},
      head: Object.assign({}, DEFAULTS.head, cfgIn.head),
      hair: Object.assign({}, DEFAULTS.hair, cfgIn.hair),
      outfit: Object.assign({}, DEFAULTS.outfit, cfgIn.outfit),
      pants: cfgIn.pants || DEFAULTS.pants,
      shoes: Object.assign({}, DEFAULTS.shoes, cfgIn.shoes),
      face: Object.assign({}, DEFAULTS.face, cfgIn.face),
      hat: Object.assign({ style: 'none', color: '#1d1a24', trim: '#c38a2c', plume: '#c0282a' }, cfgIn.hat),
      props: cfgIn.props || [],
      faceDefaults: cfgIn.faceDefaults || {},
      straightLegs: cfgIn.straightLegs,
    };
    const INK = cfg.ink, O = cfg.outfit;
    const C = {
      skin: cfg.skin, skinShade: mix(cfg.skin, '#8a6a48', 0.35), rim: '#ffc285',
      cloth: O.color, clothDark: dk(O.color, 0.6), clothFar: dk(O.color, 0.25), pattern: lt(O.color, 0.3),
      trim: O.trim, inner: O.inner, dots: O.dots, sash: O.sash, sashDark: dk(O.sash, 0.45), sashLight: lt(O.sash, 0.45),
      hair: cfg.hair.color, hairLine: lt(cfg.hair.color, 0.2), hairSheen: lt(cfg.hair.color, 0.45),
      pants: cfg.pants, pantsFar: dk(cfg.pants, 0.3), shoe: cfg.shoes.color, sole: cfg.shoes.sole,
    };

    // ---------- cloth helpers ----------
    function shade(geo, ctx, inset, op) {
      const a = geo.at(0.5, 1), b = geo.at(0.5, -1), s = -ctx.light * (a[0] > b[0] ? 1 : -1);
      return `<path d="${s > 0 ? geo.band(0, 1, inset, 1.3) : geo.band(0, 1, -1.3, -inset)}" fill="${C.clothDark}" opacity="${op}"/>` +
        `<path d="${s > 0 ? geo.band(0, 1, -1.3, -0.82) : geo.band(0, 1, 0.82, 1.3)}" fill="${O.rim}" opacity=".3"/>`;
    }
    function pattern(geo, u0, u1) {
      let s = '';
      if (O.pattern === 'none') return s;
      for (let r = 0, u = u0; u < u1; u += 0.055, r++)
        for (let sv = -0.9 + (r % 2) * 0.11; sv < 0.95; sv += 0.22) {
          const p = geo.at(u, sv);
          s += O.pattern === 'dots'
            ? `<circle cx="${n2(p[0])}" cy="${n2(p[1])}" r="2.6" fill="${C.pattern}" opacity=".45"/>`
            : `<path d="M${n2(p[0])},${n2(p[1] - 6)} l6,6 l-6,6 l-6,-6Z" fill="none" stroke="${C.pattern}" stroke-width="1.6" opacity=".38"/>`;
        }
      return s;
    }
    function folds(geo, list, w = 4.5) {
      return list.map(f => `<path d="${geo.line(f)}" stroke="${C.clothDark}" stroke-width="${w}" fill="none" opacity=".6" stroke-linecap="round"/>`).join('');
    }
    function collarBand(geo, uvs) {
      const d = geo.line(uvs);
      let s = `<path d="${d}" stroke="${INK}" stroke-width="40" fill="none"/><path d="${d}" stroke="${C.trim}" stroke-width="32" fill="none"/><path d="${d}" stroke="${C.inner}" stroke-width="11" fill="none"/>`;
      for (let i = 1; i < 16; i++) {
        const k = i / 16 * (uvs.length - 1), j = Math.min(Math.floor(k), uvs.length - 2), f = k - j;
        const u = uvs[j][0] + (uvs[j + 1][0] - uvs[j][0]) * f, sv = uvs[j][1] + (uvs[j + 1][1] - uvs[j][1]) * f;
        const p = geo.at(u, sv), q = geo.at(u + 0.01, sv + (uvs[j + 1][1] - uvs[j][1]) * 0.01 / ((uvs[j + 1][0] - uvs[j][0]) || 1));
        let tx = q[0] - p[0], ty = q[1] - p[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        for (const sg of [-1, 1]) s += `<circle cx="${n2(p[0] - ty * 11 * sg)}" cy="${n2(p[1] + tx * 11 * sg)}" r="2.6" fill="${C.dots}"/>`;
      }
      return s;
    }
    // u positions (0 = hem, 1 = neck tip) depend on how far the garment hangs below the hips
    const sk0 = R2.biped(cfg.body).dims;
    const hang = O.type === 'robe' ? O.length : O.type === 'armor' ? 90 : 46;
    const torsoLen = hang + sk0.spine + sk0.chest + sk0.neck;
    const U = { waist: (hang + sk0.spine * 0.12) / torsoLen, waistTop: (hang + sk0.spine * 0.4) / torsoLen };
    const sashBand = (geo, sd) => {
      if (!O.sash) return '';
      const a = U.waist, b = U.waistTop, m = (a + b) / 2;
      let s = `<path d="${geo.band(a, b, -1.03, 1.03)}" fill="${C.sash}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
      for (let sv = -0.84; sv <= 0.86; sv += 0.14) { const p = geo.at(m, sv); s += `<path d="M${n2(p[0])},${n2(p[1] - 8)} l8,8 l-8,8 l-8,-8Z" fill="none" stroke="${C.sashDark}" stroke-width="2.4"/>`; }
      s += `<path d="${geo.line([[b - 0.004, -1], [b - 0.004, 0], [b - 0.004, 1]])}" stroke="${C.sashLight}" stroke-width="3" fill="none"/>`;
      const ties = [[[m, sd], [m - 0.09, sd - 0.04], [m - 0.2, sd + 0.02]], [[m, sd + 0.08], [m - 0.08, sd + 0.18], [m - 0.17, sd + 0.16]]];
      for (const tie of ties) { const d = geo.line(tie); s += `<path d="${d}" stroke="${INK}" stroke-width="16" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${C.sash}" stroke-width="9" fill="none" stroke-linecap="round"/>`; }
      const k = geo.at(m, sd + 0.04);
      s += `<ellipse cx="${n2(k[0])}" cy="${n2(k[1])}" rx="22" ry="19" fill="${C.sash}" stroke="${INK}" stroke-width="5"/><path d="M${n2(k[0] - 10)},${n2(k[1] - 6)} q10,10 20,0" stroke="${C.sashDark}" stroke-width="3" fill="none"/>`;
      if (O.pendant) { const j = geo.at(m - 0.21, sd + 0.02); s += `<circle cx="${n2(j[0])}" cy="${n2(j[1] + 10)}" r="14" fill="${O.pendant}" stroke="${INK}" stroke-width="4"/><circle cx="${n2(j[0] - 5)}" cy="${n2(j[1] + 5)}" r="4" fill="${lt(O.pendant, 0.7)}"/>`; }
      return s;
    };

    const metal = O.metal || '#8d929c', metalDark = dk(metal, 0.45), metalLight = lt(metal, 0.5);
    function scales(geo, u0, u1, rows) {
      let s = '';
      for (let r = 0; r < rows; r++) {
        const u = u0 + (u1 - u0) * r / rows, du = (u1 - u0) / rows;
        for (let sv = -1.1 + (r % 2) * 0.09; sv < 1.1; sv += 0.18) {
          const a = geo.at(u, sv - 0.08), b = geo.at(u, sv + 0.08), c = geo.at(u + du * 1.05, sv);
          s += `<path d="M${pt(a)} L${pt(b)} Q${n2(b[0] + (c[0] - b[0]) * 0.2)},${n2(c[1])} ${pt(c)} Q${n2(a[0] + (c[0] - a[0]) * 0.2)},${n2(c[1])} ${pt(a)}Z" fill="${metal}" stroke="${INK}" stroke-width="2"/>` +
            `<path d="M${pt(geo.at(u + du * 0.25, sv - 0.04))} L${pt(geo.at(u + du * 0.75, sv - 0.04))}" stroke="${metalLight}" stroke-width="2" opacity=".7"/>`;
        }
      }
      return s;
    }
    const torsoDetail = (geo, ctx) => {
      if (O.type === 'armor') {
        let a = scales(geo, 0.05, U.waist - 0.01, 6) + scales(geo, U.waistTop + 0.01, 0.9, 9);
        return a + shade(geo, ctx, 0.25, 0.45) + `<path d="${geo.band(0, 0.04, -1.2, 1.2)}" fill="${C.trim}"/>`;
      }
      let s = shade(geo, ctx, 0.25, 0.5) + pattern(geo, 0.06, 0.93);
      s += folds(geo, [[[0, -0.6], [U.waist * 0.45, -0.52], [U.waist * 0.9, -0.44]], [[0, 0.08], [U.waist * 0.5, 0.04], [U.waist * 0.92, 0.1]], [[0, 0.62], [U.waist * 0.4, 0.55], [U.waist * 0.88, 0.48]], [[0.62, -0.5], [0.72, -0.62]]]);
      s += `<path d="${geo.band(0, 0.04, -1.2, 1.2)}" fill="${C.trim}"/><path d="${geo.line([[0.043, -1.2], [0.043, 0], [0.043, 1.2]])}" stroke="${C.sash || C.dots}" stroke-width="4" fill="none"/>`;
      return s;
    };
    const mirror = (p, r) => `<circle cx="${n2(p[0])}" cy="${n2(p[1])}" r="${r}" fill="${O.mirror || '#c8963f'}" stroke="${INK}" stroke-width="5"/><circle cx="${n2(p[0])}" cy="${n2(p[1])}" r="${r * 0.68}" fill="none" stroke="${dk(O.mirror || '#c8963f', 0.4)}" stroke-width="3"/>` +
      `<path d="M${n2(p[0] - r * 0.5)},${n2(p[1] - r * 0.2)} q${n2(r * 0.25)},${n2(-r * 0.4)} ${n2(r * 0.6)},${n2(-r * 0.45)}" stroke="#fff6c0" stroke-width="4" fill="none" opacity=".8" stroke-linecap="round"/>`;
    const torsoOverFront = geo => O.type === 'armor'
      ? sashBand(geo, 0.42) + mirror(geo.at(0.76, 0), 34) + `<path d="${geo.line([[0.93, -0.7], [0.97, 0], [0.93, 0.7]])}" stroke="${INK}" stroke-width="22" fill="none"/><path d="${geo.line([[0.93, -0.7], [0.97, 0], [0.93, 0.7]])}" stroke="${C.trim}" stroke-width="15" fill="none"/>`
      : collarBand(geo, [[0.94, 0.62], [0.8, 0.2], [0.64, -0.12]]) + collarBand(geo, [[0.94, -0.62], [0.74, -0.05], [U.waistTop + 0.01, 0.52]]) + sashBand(geo, 0.42);
    const torsoOverSide = geo => O.type === 'armor'
      ? sashBand(geo, 0.8) + mirror(geo.at(0.76, 0.55), 30)
      : collarBand(geo, [[0.95, -0.4], [0.8, 0.3], [U.waistTop + 0.15, 0.95]]) + sashBand(geo, 0.8);

    const sleeveDetail = (geo, ctx) => (O.type === 'armor' ? scales(geo, 0.02, 0.4, 3) : '') + shade(geo, ctx, 0.15, 0.5) +
      folds(geo, [[[0.15, -0.3], [0.45, -0.1], [0.7, -0.35]], [[0.5, 0.45], [0.75, 0.3]]], 4) +
      `<path d="${geo.band(0.84, 1, -1.3, 1.3)}" fill="${C.trim}"/><path d="${geo.line([[0.855, -1.2], [0.855, 0], [0.855, 1.2]])}" stroke="${C.sash || C.dots}" stroke-width="3.5" fill="none"/>` +
      [-0.7, -0.35, 0, 0.35, 0.7].map(sv => { const p = geo.at(0.93, sv); return `<circle cx="${n2(p[0])}" cy="${n2(p[1])}" r="2.4" fill="${C.dots}"/>`; }).join('');
    const legDetail = (geo, ctx) => {
      let s = shade(geo, ctx, 0.2, 0.4).replace(new RegExp(C.clothDark, 'g'), dk(C.pants, 0.6));
      if (O.type === 'tunic') for (let u = 0.6; u < 0.97; u += 0.08) s += `<path d="${geo.line([[u, -1.1], [u + 0.03, 0], [u + 0.05, 1.1]])}" stroke="${dk(C.pants, 0.5)}" stroke-width="3" fill="none"/>`; // shin wraps
      return s;
    };

    const handBlob = R2.Blob({ cx: 12, cy: 0, rx: 21, ry: 18, seed: (cfg.head.seed || 1) + 4, wobble: 0.1 });
    const hand = () => `<path d="${handBlob.path}" fill="${C.skin}" stroke="${INK}" stroke-width="5"/><path d="M14,-10 Q24,-4 22,8" stroke="${C.skinShade}" stroke-width="5" fill="none" opacity=".7" stroke-linecap="round"/>`;
    const shoe = sign => () => `<g transform="scale(1 ${sign})"><rect x="-22" y="8" width="78" height="11" rx="5" fill="${C.sole}" stroke="${INK}" stroke-width="4"/>` +
      `<path d="M-20,10 C-22,-10 -4,-16 10,-15 C28,-13 42,-3 52,2 Q62,0 60,-8 Q66,2 58,10 Z" fill="${C.shoe}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>` +
      `<path d="M2,-12 Q14,-2 26,-6" stroke="${lt(C.shoe, 0.25)}" stroke-width="3" fill="none"/></g>`;

    // ---------- hair ----------
    const H = cfg.hair;
    function bunPos(blob, fs) { const top = blob.point(-Math.PI / 2, 1); return [top[0] - fs.turn * blob.rx * 0.22, top[1] - 12 + Math.abs(fs.turn) * 6]; }
    function hairBack(ctx, blob, fs) {
      let s = '';
      if (H.style === 'kidbuns') for (const k of [-1, 1]) {
        const p = blob.point(Math.PI * (1.5 + k * 0.27), 1.0), x = p[0] - fs.turn * blob.rx * 0.15, y = p[1] - 8;
        const b = R2.Blob({ cx: x, cy: y, rx: 40, ry: 38, seed: 12 + k, wobble: 0.06 });
        s += `<path d="${b.path}" fill="${C.hair}" stroke="${INK}" stroke-width="6"/><path d="M${n2(x - 22)},${n2(y - 18)} q20,-14 38,0" stroke="${C.hairSheen}" stroke-width="4" fill="none" opacity=".7"/>` +
          `<path d="M${n2(x - 30)},${n2(y + 22)} q30,12 60,0" stroke="${H.band}" stroke-width="9" fill="none"/><path d="M${n2(x + k * 20)},${n2(y + 26)} q${k * 12},30 ${k * 4},60" stroke="${H.band}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
      }
      s += hatBack(blob, fs);
      if (H.style === 'bun' || H.style === 'topknot') {
        const k = H.style === 'topknot' ? 0.6 : 1;
        const [x, y0] = bunPos(blob, fs), y = y0 + (1 - k) * 30, bun = R2.Blob({ cx: x, cy: y, rx: 52 * k, ry: 48 * k, seed: 9, wobble: 0.06 });
        s += `<path d="${bun.path}" fill="${C.hair}" stroke="${INK}" stroke-width="6"/>`;
        for (let i = 0; i < 5; i++) s += `<path d="M${n2(x - 34 + i * 16)},${n2(y - 40)} Q${n2(x - 38 + i * 18)},${n2(y)} ${n2(x - 30 + i * 14)},${n2(y + 40)}" stroke="${C.hairLine}" stroke-width="2.5" fill="none"/>`;
        s += `<path d="M${n2(x - 28)},${n2(y - 28)} Q${n2(x - 4)},${n2(y - 44)} ${n2(x + 20)},${n2(y - 36)}" stroke="${C.hairSheen}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>`;
      }
      return s;
    }
    const headBlob = R2.Blob(Object.assign({ cx: 0, cy: -cfg.head.ry * 0.85 }, cfg.head));
    function longHair(ctx) {
      const blob = headBlob, fs = ctx.face;
      let s = '';
      {
        const dir = Math.sign(fs.turn) || 0, back = -dir * blob.rx * 0.35 * Math.abs(fs.turn);
        const l = blob.point(Math.PI * 0.95, 1.05), r = blob.point(Math.PI * 0.05, 1.05);
        s += `<path d="M${pt(l)} Q${n2(l[0] - 20 + back)},${n2(l[1] + blob.ry * 1.2)} ${n2(blob.cx + back)},${n2(blob.cy + blob.ry * 1.6)} Q${n2(r[0] + 20 + back)},${n2(r[1] + blob.ry * 1.2)} ${pt(r)} Z" fill="${C.hair}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
        for (let i = -3; i <= 3; i++) s += `<path d="M${n2(blob.cx + i * blob.rx * 0.25 + back * 0.5)},${n2(blob.cy + blob.ry * 0.3)} q${n2(i * 4)},${n2(blob.ry * 0.6)} ${n2(i * 6 + back * 0.5)},${n2(blob.ry * 1.1)}" stroke="${C.hairLine}" stroke-width="2.5" fill="none"/>`;
      }
      return s;
    }
    function hairCap(blob, fs, depth = 1) {
      const cx = blob.cx, cy = blob.cy, rx = blob.rx, ry = blob.ry, outer = [];
      const tw = Math.abs(fs.turn), dir = Math.sign(fs.turn) || 1;
      const prof = R2.EASE.inOut(R2.clamp((tw - 0.4) / 0.6, 0, 1));
      const a0 = Math.PI * (1.06 - (dir > 0 ? 0.3 * prof : 0)), a1 = Math.PI * (1.94 + (dir < 0 ? 0.3 * prof : 0));
      for (let i = 0; i <= 14; i++) outer.push(blob.point(a0 + (a1 - a0) * i / 14, 1.035));
      const front = [];
      for (let i = 14; i >= 0; i--) {
        const a = a0 + (a1 - a0) * i / 14, q = blob.point(a, 0.98);
        front.push([q[0], Math.max(q[1], cy - ry * 0.64 * depth + Math.abs(Math.cos(a)) * ry * 0.46)]);
      }
      const F = dir > 0 ? blob.point(a1, 0.98) : blob.point(a0, 0.98), B = dir > 0 ? blob.point(a0, 0.98) : blob.point(a1, 0.98);
      const X = k => cx + dir * k * rx;
      const dense = R2.catmull([F, [X(0.42), cy - ry * 0.6], [X(0.05), cy - ry * 0.56], [X(-0.28), cy - ry * 0.3], [X(-0.34), cy + ry * 0.12], [X(-0.5), cy + ry * 0.42], B], 6);
      const side = Array.from({ length: 15 }, (_, i) => dense[Math.round(i * (dense.length - 1) / 14)]);
      const p15 = dir > 0 ? side : side.slice().reverse();
      const inner = front.map((p, i) => [R2.lerp(p[0], p15[i][0], prof), R2.lerp(p[1], p15[i][1], prof)]);
      let s = `<path d="${R2.openPath(outer)} L${inner.map(pt).join(' L')}Z" fill="${C.hair}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
      for (let i = 1; i < 10; i++) {
        const a = a0 + (a1 - a0) * (0.05 + 0.9 * i / 10), o = blob.point(a, 1.0), q = inner[14 - Math.round(i * 1.4)];
        s += `<path d="M${pt(o)} Q${n2((o[0] + q[0]) / 2 + (i - 5) * 2)},${n2((o[1] + q[1]) / 2)} ${pt(q)}" stroke="${C.hairLine}" stroke-width="2.5" fill="none"/>`;
      }
      const h1 = blob.point(Math.PI * 1.3, 0.94), h2 = blob.point(Math.PI * 1.55, 0.97);
      s += `<path d="M${pt(h1)} Q${n2((h1[0] + h2[0]) / 2)},${n2(Math.min(h1[1], h2[1]) - 12)} ${pt(h2)}" stroke="${C.hairSheen}" stroke-width="5" fill="none" opacity=".65" stroke-linecap="round"/>`;
      return { svg: s, inner };
    }
    function hood(blob, fs) {
      // Wraps the whole head; only a band around the eyes stays open.
      const id = `hood-${cfg.name}-${Math.round(blob.rx)}`;
      const shift = fs.turn * blob.rx * 0.42, ey = blob.cy - blob.ry * 0.02, bh = blob.ry * 0.3;
      const bw = blob.rx * (1.5 - 0.65 * Math.abs(fs.turn));
      let s = `<clipPath id="${id}"><path d="${blob.path}"/></clipPath><g clip-path="url(#${id})">` +
        `<path d="M-999,-999 H999 V999 H-999Z M${n2(blob.cx + shift - bw / 2)},${n2(ey - bh / 2)} q${n2(bw / 2)},${n2(-bh * 0.25)} ${n2(bw)},0 v${n2(bh)} q${n2(-bw / 2)},${n2(bh * 0.2)} ${n2(-bw)},0Z" fill="${C.hair}" fill-rule="evenodd"/>`;
      s += `<path d="M${n2(blob.cx + shift - bw / 2)},${n2(ey - bh / 2)} q${n2(bw / 2)},${n2(-bh * 0.25)} ${n2(bw)},0 M${n2(blob.cx + shift - bw / 2)},${n2(ey + bh / 2)} q${n2(bw / 2)},${n2(bh * 0.2)} ${n2(bw)},0" stroke="${INK}" stroke-width="6" fill="none"/>`;
      for (let i = 0; i < 6; i++) s += `<path d="M${n2(blob.cx - blob.rx + i * blob.rx * 0.4)},${n2(blob.cy + blob.ry * 0.3)} q${n2(blob.rx * 0.1)},${n2(blob.ry * 0.25)} 0,${n2(blob.ry * 0.6)}" stroke="${C.hairLine}" stroke-width="3" fill="none" opacity=".7"/>`;
      s += `</g><path d="${blob.path}" fill="none" stroke="${INK}" stroke-width="8"/>`;
      // knot tails at the back
      const back = blob.point(Math.PI * (fs.turn > 0 ? 1.05 : -0.05), 1.0), sx = fs.turn > 0 ? -1 : 1;
      if (Math.abs(fs.turn) > 0.3) s += `<path d="M${pt(back)} q${n2(sx * 50)},${n2(-10)} ${n2(sx * 90)},${n2(30)} M${pt(back)} q${n2(sx * 40)},${n2(20)} ${n2(sx * 70)},${n2(60)}" stroke="${INK}" stroke-width="16" fill="none" stroke-linecap="round"/>` +
        `<path d="M${pt(back)} q${n2(sx * 50)},${n2(-10)} ${n2(sx * 90)},${n2(30)} M${pt(back)} q${n2(sx * 40)},${n2(20)} ${n2(sx * 70)},${n2(60)}" stroke="${C.hair}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
      return s;
    }
    function hairFront(ctx, blob, fs) {
      let s = '';
      if (['bun', 'long', 'short', 'kidbuns', 'topknot'].includes(H.style)) {
        const cap = hairCap(blob, fs, H.style === 'short' ? 0.95 : 1);
        s += cap.svg;
        if (H.style === 'short') for (let i = 3; i < 12; i += 2) { const q = cap.inner[i]; s += `<path d="M${n2(q[0] - 14)},${n2(q[1] - 6)} l14,${n2(18 + (i % 3) * 4)} l12,-20" fill="${C.hair}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`; }
      }
      if (H.style === 'bun') {
        const [bx, by] = bunPos(blob, fs);
        s += `<rect x="${n2(bx - 46)}" y="${n2(by + 26)}" width="92" height="14" rx="6" fill="${H.band}" stroke="${INK}" stroke-width="3"/>`;
        if (H.pin) s += `<line x1="${n2(bx - 112)}" y1="${n2(by - 14)}" x2="${n2(bx + 118)}" y2="${n2(by + 14)}" stroke="${INK}" stroke-width="14" stroke-linecap="round"/><line x1="${n2(bx - 112)}" y1="${n2(by - 14)}" x2="${n2(bx + 118)}" y2="${n2(by + 14)}" stroke="${H.pinColor}" stroke-width="7" stroke-linecap="round"/>` +
          `<circle cx="${n2(bx - 114)}" cy="${n2(by - 14)}" r="15" fill="${H.bead}" stroke="${INK}" stroke-width="4"/><circle cx="${n2(bx - 119)}" cy="${n2(by - 19)}" r="4.5" fill="${lt(H.bead, 0.7)}"/><path d="M${n2(bx + 112)},${n2(by + 12)} l18,-10 l2,22Z" fill="#d6ad55" stroke="${INK}" stroke-width="2.5"/>`;
      }
      if (H.style === 'bald') { const p = blob.point(Math.PI * 1.35, 0.8); s += `<ellipse cx="${n2(p[0])}" cy="${n2(p[1])}" rx="26" ry="12" fill="#fff" opacity=".45" transform="rotate(-25 ${n2(p[0])} ${n2(p[1])})"/>`; }
      if (H.style === 'hood') s += hood(blob, fs);
      return s + hatFront(blob, fs);
    }

    // ---------- hats ----------
    const T = cfg.hat;
    function hatBack(blob, fs) {
      const dir = Math.sign(fs.turn) || 0, tw = Math.abs(fs.turn);
      if (T.style === 'lunjin') {        // silk scholar cap: two long ribbons hang behind the head
        let s = '';
        for (const k of [-1, 1]) {
          const p = blob.point(Math.PI * (1.5 + k * 0.32 - dir * 0.2 * tw), 1.0), sway = Math.sin((fs._t || 0) * 2 + k) * 8;
          const ex = p[0] + k * 24 - dir * 70 * tw + sway, ey = p[1] + blob.ry * 1.3;
          s += `<path d="M${pt(p)} q${n2(k * 30 - dir * 40 * tw)},${n2(blob.ry * 0.6)} ${n2(ex - p[0])},${n2(ey - p[1])} l${k * 14},4 q${n2(-k * 10)},${n2(-blob.ry * 0.7)} ${n2(-(ex - p[0]) - k * 4)},${n2(-(ey - p[1]) - 4)}Z" fill="${T.color}" stroke="${INK}" stroke-width="4"/>`;
        }
        return s;
      }
      if (T.style === 'helmet') {        // red horsehair plume flows back
        const top = blob.point(-Math.PI / 2, 1.18), x = top[0] - fs.turn * blob.rx * 0.1, y = top[1] - 40;
        let s = '';
        for (let i = -4; i <= 4; i++) s += `<path d="M${n2(x)},${n2(y)} q${n2(i * 10 - dir * 60 * tw)},${n2(-40)} ${n2(i * 18 - dir * 110 * tw)},${n2(20 + Math.abs(i) * 6)}" stroke="${T.plume}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
        return s;
      }
      return '';
    }
    function hatFront(blob, fs) {
      const dir = Math.sign(fs.turn) || 0, tw = Math.abs(fs.turn), shift = -fs.turn * blob.rx * 0.12;
      if (T.style === 'lunjin') {
        const l = blob.point(Math.PI * 1.08, 1.03), r = blob.point(Math.PI * 1.92, 1.03), top = blob.cy - blob.ry * 1.32;
        const w = (r[0] - l[0]) * (0.86 - 0.12 * tw), cx = (l[0] + r[0]) / 2 + shift;
        let s = `<path d="M${pt(l)} Q${n2(blob.cx)},${n2(blob.cy - blob.ry * 0.62)} ${pt(r)} L${n2(cx + w / 2)},${n2(top + 20)} Q${n2(cx + w / 2)},${n2(top)} ${n2(cx + w / 2 - 20)},${n2(top)} L${n2(cx - w / 2 + 20)},${n2(top)} Q${n2(cx - w / 2)},${n2(top)} ${n2(cx - w / 2)},${n2(top + 20)}Z" fill="${T.color}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
        for (let i = 1; i < 5; i++) { const x = cx - w / 2 + w * i / 5; s += `<path d="M${n2(x)},${n2(top + 10)} Q${n2(x + 6)},${n2((top + l[1]) / 2)} ${n2(x - 4 + (i - 2.5) * 6)},${n2(l[1] - 10)}" stroke="${lt(T.color, 0.25)}" stroke-width="3" fill="none"/>`; }
        s += `<path d="M${pt(l)} Q${n2(blob.cx)},${n2(blob.cy - blob.ry * 0.62)} ${pt(r)}" stroke="${lt(T.color, 0.35)}" stroke-width="8" fill="none"/>`;
        s += `<path d="M${n2(cx - w * 0.3)},${n2(top + 14)} q${n2(w * 0.2)},-10 ${n2(w * 0.45)},-4" stroke="${lt(T.color, 0.5)}" stroke-width="5" fill="none" opacity=".7" stroke-linecap="round"/>`;
        return s;
      }
      if (T.style === 'helmet') {
        const pts = [];
        for (let i = 0; i <= 16; i++) pts.push(blob.point(Math.PI * (1.0 + i / 16), 1.1));
        const rimL = blob.point(Math.PI * 1.0, 1.1), rimR = blob.point(Math.PI * 2.0, 1.1);
        let s = `<path d="${R2.openPath(pts)} Q${n2(blob.cx)},${n2(blob.cy - blob.ry * 0.38)} ${pt(rimL)}Z" fill="${metal}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
        const ridgeX = blob.cx + fs.turn * blob.rx * 0.45;
        s += `<path d="M${n2(ridgeX)},${n2(blob.cy - blob.ry * 1.12)} Q${n2(ridgeX + fs.turn * 20)},${n2(blob.cy - blob.ry * 0.8)} ${n2(ridgeX + fs.turn * 30)},${n2(blob.cy - blob.ry * 0.42)}" stroke="${metalDark}" stroke-width="10" fill="none"/>`;
        for (let i = 1; i < 6; i++) { const p = blob.point(Math.PI * (1.0 + i / 6), 1.02); s += `<circle cx="${n2(p[0])}" cy="${n2(p[1] + 14)}" r="4" fill="${metalLight}" stroke="${INK}" stroke-width="1.5"/>`; }
        s += `<path d="M${pt(rimL)} Q${n2(blob.cx)},${n2(blob.cy - blob.ry * 0.38)} ${pt(rimR)}" stroke="${T.trim}" stroke-width="16" fill="none"/><path d="M${pt(rimL)} Q${n2(blob.cx)},${n2(blob.cy - blob.ry * 0.38)} ${pt(rimR)}" stroke="${INK}" stroke-width="4" fill="none" transform="translate(0 9)"/>`;
        // ear flaps of small plates
        for (const k of [-1, 1]) {
          if (k * fs.turn > 0.6) continue;
          const p = blob.point(Math.PI * (k < 0 ? 1.0 : 0.0), 1.08);
          for (let r = 0; r < 3; r++) s += `<rect x="${n2(p[0] - 20)}" y="${n2(p[1] + r * 26)}" width="40" height="30" rx="6" fill="${metal}" stroke="${INK}" stroke-width="3"/>`;
        }
        const top = blob.point(-Math.PI / 2, 1.18), x = top[0] - fs.turn * blob.rx * 0.1;
        s += `<path d="M${n2(x - 10)},${n2(top[1] + 10)} L${n2(x)},${n2(top[1] - 44)} L${n2(x + 10)},${n2(top[1] + 10)}Z" fill="${T.trim}" stroke="${INK}" stroke-width="4"/><circle cx="${n2(x)}" cy="${n2(top[1] - 44)}" r="9" fill="${T.trim}" stroke="${INK}" stroke-width="3"/>`;
        return s;
      }
      if (T.style === 'band') {
        const l = blob.point(Math.PI * 1.12, 1.02), r = blob.point(Math.PI * 1.88, 1.02);
        return `<path d="M${pt(l)} Q${n2(blob.cx + fs.turn * 30)},${n2(blob.cy - blob.ry * 0.82)} ${pt(r)}" stroke="${INK}" stroke-width="26" fill="none"/><path d="M${pt(l)} Q${n2(blob.cx + fs.turn * 30)},${n2(blob.cy - blob.ry * 0.82)} ${pt(r)}" stroke="${T.color}" stroke-width="18" fill="none"/>`;
      }
      return '';
    }
    function faceFront(ctx, blob, fs) {
      let s = '';
      if (cfg.face.mustache) {
        const prof = R2.clamp((Math.abs(fs.turn) - 0.65) / 0.35, 0, 1), shift = fs.turn * blob.rx * (0.3 + 0.25 * prof);
        const x = blob.cx + shift * 1.1, y = blob.cy + blob.ry * 0.3, w = blob.rx * 0.2 * (cfg.face.mustacheScale || 1) * (1 - 0.4 * prof);
        s += `<path d="M${n2(x)},${n2(y)} q${n2(-w * 0.6)},${n2(-w * 0.35)} ${n2(-w * 1.2)},${n2(w * 0.25)} q${n2(-w * 0.2)},${n2(w * 0.25)} ${n2(-w * 0.45)},${n2(w * 0.1)} q${n2(w * 0.9)},${n2(w * 0.1)} ${n2(w * 1.65)},${n2(-w * 0.25)} q${n2(w * 0.75)},${n2(w * 0.35)} ${n2(w * 1.65)},${n2(w * 0.25)} q${n2(-w * 0.25)},${n2(w * 0.15)} ${n2(-w * 0.45)},${n2(-w * 0.1)} q${n2(-w * 0.6)},${n2(-w * 0.6)} ${n2(-w * 1.2)},${n2(-w * 0.25)}Z" fill="${cfg.face.mustacheColor || C.hair}" stroke="${INK}" stroke-width="3"/>`;
      }
      if (cfg.face.beard) {
        const prof = R2.clamp((Math.abs(fs.turn) - 0.65) / 0.35, 0, 1), shift = fs.turn * blob.rx * (0.3 + 0.25 * prof);
        const x = blob.cx + shift * 1.1, y = blob.cy + blob.ry * 0.62, long = cfg.face.beard === 'long' ? 1.8 : 1, w = blob.rx * 0.16 * (1 - 0.3 * prof);
        const col = cfg.face.beardColor || C.hair;
        s += `<path d="M${n2(x - w)},${n2(y - 6)} Q${n2(x - w * 0.6)},${n2(y + 60 * long)} ${n2(x + fs.turn * 10)},${n2(y + 90 * long)} Q${n2(x + w * 0.6)},${n2(y + 60 * long)} ${n2(x + w)},${n2(y - 6)} Q${n2(x)},${n2(y + 10)} ${n2(x - w)},${n2(y - 6)}Z" fill="${col}" stroke="${INK}" stroke-width="3.5"/>` +
          `<path d="M${n2(x)},${n2(y + 8)} L${n2(x + fs.turn * 6)},${n2(y + 70 * long)} M${n2(x - w * 0.45)},${n2(y + 6)} L${n2(x - w * 0.25)},${n2(y + 50 * long)} M${n2(x + w * 0.45)},${n2(y + 6)} L${n2(x + w * 0.25)},${n2(y + 50 * long)}" stroke="${lt(col, 0.3)}" stroke-width="2" fill="none"/>`;
      }
      if (cfg.face.front) s += cfg.face.front(ctx, blob, fs);
      return s;
    }

    function headPart() {
      return {
        name: 'head', type: 'head', bone: 'head', z: 30,
        head: Object.assign({ skin: C.skin, shade: C.skinShade, rim: C.rim }, cfg.head),
        face: Object.assign({ hideMouth: H.style === 'hood' && !cfg.face.showMouth }, cfg.face.layout),
        back: hairBack, hair: hairFront, front: faceFront,
      };
    }

    function propParts(view) {
      return cfg.props.map(p => Object.assign({ type: 'shape', z: 19 }, p, view === 'side' && p.sideZ != null ? { z: p.sideZ } : {}));
    }

    const notSit = ctx => !(ctx.state && ctx.state.sit);
    // Kneeling: the robe pools on the floor over folded legs (hips frame, ground ~61 below the hips).
    const kneel = ctx => {
      const g = 61, d = `M-78,-14 C-96,30 -92,${g} -66,${g} L156,${g} C184,${g} 190,${g - 30} 160,${g - 52} C120,-18 40,-26 -78,-14Z`;
      return `<path d="${d}" fill="${C.cloth}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>` +
        `<path d="M-60,${g - 10} L150,${g - 10}" stroke="${C.trim}" stroke-width="14"/><path d="M-60,${g - 16} L150,${g - 16}" stroke="${C.sash || C.dots}" stroke-width="3"/>` +
        `<path d="M-40,0 Q-30,30 -36,${g - 18} M30,-10 Q46,22 40,${g - 18} M100,8 Q120,30 112,${g - 18}" stroke="${C.clothDark}" stroke-width="4.5" fill="none" opacity=".6" stroke-linecap="round"/>` +
        `<path d="M-70,-4 Q-84,30 -70,${g - 16}" stroke="${O.rim}" stroke-width="8" fill="none" opacity=".35"/>`;
    };
    const faceDefaults = () => Object.assign(H.style === 'hood' ? { blush: 0 } : {}, cfg.faceDefaults);

    // ---------- views ----------
    function front() {
      const sk = R2.biped(cfg.body), robe = O.type === 'robe';
      if (cfg.straightLegs !== false) { sk.ik.legL.rigid = true; sk.ik.legR.rigid = true; }  // stick-straight legs (style)
      const torsoW = robe ? [232, 186, 152, 126, 84] : O.type === 'armor' ? [206, 184, 168, 140, 88] : [176, 168, 160, 132, 86];
      const legW = robe ? [36, 28, 24] : [48, 40, 30];
      return {
        name: cfg.name, view: 'front', ink: INK, light: cfg.light, bones: sk.bones, ik: sk.ik, dims: sk.dims, face: faceDefaults(),
        parts: [
          { name: 'legL', type: 'tube', visible: notSit, bones: ['thighL', 'shinL'], widths: legW, fill: C.pants, z: 0, line: 5, capEnd: 'flat', smooth: false, clipId: 'legL', detail: legDetail },
          { name: 'legR', type: 'tube', visible: notSit, bones: ['thighR', 'shinR'], widths: legW, fill: C.pants, z: 0, line: 5, capEnd: 'flat', smooth: false, clipId: 'legR', detail: legDetail },
          { name: 'shoeL', type: 'shape', visible: notSit, bone: 'footL', z: 1, draw: shoe(-1) },
          { name: 'shoeR', type: 'shape', visible: notSit, bone: 'footR', z: 1, draw: shoe(1) },
          { name: 'torso', type: 'tube', bones: ['hips', 'chest', 'neck'], extendStart: ctx => hang * (1 - 0.72 * (ctx.state.sit || 0)), widths: torsoW, fill: C.cloth, z: 10, line: 7, capStart: 'flat', clipId: 'torso', detail: torsoDetail, over: torsoOverFront },
          { name: 'handL', type: 'shape', bone: 'handL', z: 18, draw: hand },
          { name: 'handR', type: 'shape', bone: 'handR', z: 18, draw: hand },
          { name: 'sleeveL', type: 'tube', bones: ['upperArmL', 'lowerArmL'], widths: robe ? [50, 52, 68] : [46, 44, 48], fill: C.cloth, z: 20, line: 6, capEnd: 'flat', clipId: 'sleeveL', detail: sleeveDetail },
          { name: 'sleeveR', type: 'tube', bones: ['upperArmR', 'lowerArmR'], widths: robe ? [50, 52, 68] : [46, 44, 48], fill: C.cloth, z: 20, line: 6, capEnd: 'flat', clipId: 'sleeveR', detail: sleeveDetail },
          headPart(),
          ...(H.style === 'long' ? [{ name: 'hairLong', type: 'shape', bone: 'head', frame: 90, z: 5, draw: longHair }] : []),
          ...propParts('front'),
        ],
      };
    }
    function side() {
      const sk = R2.bipedSide(cfg.body), robe = O.type === 'robe';
      if (cfg.straightLegs !== false) { sk.ik.legL.rigid = true; sk.ik.legR.rigid = true; }  // stick-straight legs (style)
      const torsoW = robe ? [196, 156, 128, 108, 76] : O.type === 'armor' ? [170, 160, 146, 118, 78] : [150, 146, 136, 112, 76];
      const legW = robe ? [36, 28, 24] : [48, 40, 30];
      const far = (part, fill) => Object.assign({}, part, { fill });
      return {
        name: cfg.name, view: 'side', ink: INK, light: cfg.light, bones: sk.bones, ik: sk.ik, dims: sk.dims,
        face: Object.assign({ turn: 1 }, faceDefaults()),
        parts: [
          far({ name: 'legL', type: 'tube', visible: notSit, bones: ['thighL', 'shinL'], widths: legW, z: -2, line: 5, capEnd: 'flat', smooth: false, clipId: 'legL', detail: legDetail }, C.pantsFar),
          { name: 'shoeL', type: 'shape', visible: notSit, bone: 'footL', z: -1, draw: shoe(1) },
          { name: 'handL', type: 'shape', bone: 'handL', z: 3, draw: hand },
          far({ name: 'sleeveL', type: 'tube', bones: ['upperArmL', 'lowerArmL'], widths: robe ? [46, 50, 64] : [42, 40, 44], z: 4, line: 6, capEnd: 'flat', clipId: 'sleeveL', detail: sleeveDetail }, C.clothFar),
          { name: 'legR', type: 'tube', visible: notSit, bones: ['thighR', 'shinR'], widths: legW, fill: C.pants, z: 0, line: 5, capEnd: 'flat', smooth: false, clipId: 'legR', detail: legDetail },
          { name: 'shoeR', type: 'shape', visible: notSit, bone: 'footR', z: 1, draw: shoe(1) },
          { name: 'torso', type: 'tube', bones: ['hips', 'chest', 'neck'], extendStart: ctx => hang * (1 - 0.72 * (ctx.state.sit || 0)), widths: torsoW, fill: C.cloth, z: 10, line: 7, capStart: 'flat', clipId: 'torso', detail: torsoDetail, over: torsoOverSide },
          { name: 'handR', type: 'shape', bone: 'handR', z: 18, draw: hand },
          { name: 'sleeveR', type: 'tube', bones: ['upperArmR', 'lowerArmR'], widths: robe ? [50, 52, 68] : [46, 44, 48], fill: C.cloth, z: 20, line: 6, capEnd: 'flat', clipId: 'sleeveR', detail: sleeveDetail },
          headPart(),
          ...(H.style === 'long' ? [{ name: 'hairLong', type: 'shape', bone: 'head', frame: 90, z: 2, draw: longHair }] : []),
          { name: 'kneel', type: 'shape', bone: 'hips', frame: 90, z: 11, visible: ctx => !!(ctx.state && ctx.state.sit), draw: kneel },
          ...propParts('side'),
        ],
      };
    }

    const specFn = (opts = {}) => (opts.view === 'side' ? side() : front());
    specFn.config = cfg;
    specFn.colors = C;
    return specFn;
  }

  const Kit = { character, mix, dk, lt, DEFAULTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = Kit;
  else root.Kit = Kit;
})(typeof window !== 'undefined' ? window : globalThis);
