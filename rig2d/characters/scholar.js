/*
 * The Scholar — first character built on Rig2D.
 * Everything visible is a part on a bone, so every piece follows the rig.
 */
(function (root) {
  'use strict';
  const R2 = root.Rig2D || require('../src/rig.js');
  const n2 = v => +(+v).toFixed(2);
  const pt = p => `${n2(p[0])},${n2(p[1])}`;

  const INK = '#2b1d16';
  const C = {
    skin: '#f4ead6', skinShade: '#c9b591', rim: '#ffc285',
    robe: '#2d6e72', robeDark: '#123a3e', robePattern: '#5aa6a2', rimWarm: '#ffb46a',
    trim: '#1d2a44', inner: '#efe5cf', gold: '#c38a2c', goldLight: '#f2cf7a', dot: '#e2b552', goldDark: '#7a4f14',
    hair: '#2a2330', hairLine: '#4c4258', hairSheen: '#8a7f9c', pants: '#2c2838', shoe: '#1f1b22', sole: '#efe5cf',
    jade: '#3fae7c', jadeLight: '#d0ffe6', wood: '#a0703c',
  };

  // Which lateral side (+1/-1) of a tube faces away from the light.
  function shadowSide(geo, light) {
    const a = geo.at(0.5, 1), b = geo.at(0.5, -1);
    return -light * (a[0] > b[0] ? 1 : -1);
  }
  function shade(geo, ctx, inset = 0.2, op = 0.55) {
    const s = shadowSide(geo, ctx.light);
    return `<path d="${s > 0 ? geo.band(0, 1, inset, 1.3) : geo.band(0, 1, -1.3, -inset)}" fill="${C.robeDark}" opacity="${op}"/>` +
      `<path d="${s > 0 ? geo.band(0, 1, -1.3, -0.82) : geo.band(0, 1, 0.82, 1.3)}" fill="${C.rimWarm}" opacity=".35"/>`;
  }

  // Layered collar band along a path given in tube (u, s) coordinates.
  function collarBand(geo, uvs) {
    const d = geo.line(uvs);
    let s = `<path d="${d}" stroke="${INK}" stroke-width="40" fill="none"/><path d="${d}" stroke="${C.trim}" stroke-width="32" fill="none"/><path d="${d}" stroke="${C.inner}" stroke-width="11" fill="none"/>`;
    const steps = 16;
    for (let i = 1; i < steps; i++) {
      const k = i / steps * (uvs.length - 1), j = Math.min(Math.floor(k), uvs.length - 2), f = k - j;
      const u = uvs[j][0] + (uvs[j + 1][0] - uvs[j][0]) * f, sv = uvs[j][1] + (uvs[j + 1][1] - uvs[j][1]) * f;
      const p = geo.at(u, sv), q = geo.at(u + 0.01, sv + (uvs[j + 1][1] - uvs[j][1]) * 0.01 / ((uvs[j + 1][0] - uvs[j][0]) || 1));
      let tx = q[0] - p[0], ty = q[1] - p[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      for (const sg of [-1, 1]) s += `<circle cx="${n2(p[0] - ty * 11 * sg)}" cy="${n2(p[1] + tx * 11 * sg)}" r="2.6" fill="${C.dot}"/>`;
    }
    return s;
  }

  function robeDetail(geo, ctx) {
    let s = shade(geo, ctx, 0.25, 0.5);
    for (let r = 0, u = 0.06; u < 0.93; u += 0.055, r++)
      for (let sv = -0.9 + (r % 2) * 0.11; sv < 0.95; sv += 0.22) {
        const p = geo.at(u, sv);
        s += `<path d="M${n2(p[0])},${n2(p[1] - 6)} l6,6 l-6,6 l-6,-6Z" fill="none" stroke="${C.robePattern}" stroke-width="1.6" opacity=".38"/>`;
      }
    for (const f of [[[0, -0.6], [0.16, -0.52], [0.34, -0.44]], [[0, 0.08], [0.18, 0.04], [0.35, 0.1]], [[0, 0.62], [0.15, 0.55], [0.33, 0.48]], [[0.62, -0.5], [0.72, -0.62]]])
      s += `<path d="${geo.line(f)}" stroke="${C.robeDark}" stroke-width="4.5" fill="none" opacity=".65" stroke-linecap="round"/>`;
    s += `<path d="${geo.band(0, 0.04, -1.2, 1.2)}" fill="${C.trim}"/><path d="${geo.line([[0.043, -1.2], [0.043, 0], [0.043, 1.2]])}" stroke="${C.gold}" stroke-width="4" fill="none"/>`;
    return s;
  }

  function robeOver(geo) {
    let s = collarBand(geo, [[0.94, 0.62], [0.8, 0.2], [0.64, -0.12]]);
    s += collarBand(geo, [[0.94, -0.62], [0.74, -0.05], [0.46, 0.52]]);
    // sash
    s += `<path d="${geo.band(0.395, 0.455, -1.03, 1.03)}" fill="${C.gold}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
    for (let sv = -0.84; sv <= 0.86; sv += 0.14) {
      const p = geo.at(0.425, sv);
      s += `<path d="M${n2(p[0])},${n2(p[1] - 8)} l8,8 l-8,8 l-8,-8Z" fill="none" stroke="${C.goldDark}" stroke-width="2.4"/>`;
    }
    s += `<path d="${geo.line([[0.452, -1], [0.452, 0], [0.452, 1]])}" stroke="${C.goldLight}" stroke-width="3" fill="none"/>`;
    // ties, knot, jade pendant
    for (const tie of [[[0.425, 0.42], [0.33, 0.38], [0.22, 0.44]], [[0.425, 0.5], [0.34, 0.6], [0.25, 0.58]]]) {
      const d = geo.line(tie);
      s += `<path d="${d}" stroke="${INK}" stroke-width="16" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${C.gold}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
    }
    const k = geo.at(0.425, 0.46), j = geo.at(0.205, 0.44);
    s += `<ellipse cx="${n2(k[0])}" cy="${n2(k[1])}" rx="23" ry="19" fill="${C.gold}" stroke="${INK}" stroke-width="5"/><path d="M${n2(k[0] - 11)},${n2(k[1] - 6)} q11,10 22,0" stroke="${C.goldDark}" stroke-width="3" fill="none"/>`;
    s += `<circle cx="${n2(j[0])}" cy="${n2(j[1] + 10)}" r="14" fill="${C.jade}" stroke="${INK}" stroke-width="4"/><circle cx="${n2(j[0] - 5)}" cy="${n2(j[1] + 5)}" r="4" fill="${C.jadeLight}"/><circle cx="${n2(j[0])}" cy="${n2(j[1] + 10)}" r="5" fill="none" stroke="#1f6a48" stroke-width="2"/>`;
    return s;
  }

  function sleeveDetail(geo, ctx) {
    let s = shade(geo, ctx, 0.15, 0.5);
    s += `<path d="${geo.line([[0.15, -0.3], [0.45, -0.1], [0.7, -0.35]])}" stroke="${C.robeDark}" stroke-width="4" fill="none" opacity=".6" stroke-linecap="round"/>`;
    s += `<path d="${geo.line([[0.5, 0.45], [0.75, 0.3]])}" stroke="${C.robeDark}" stroke-width="3.5" fill="none" opacity=".55" stroke-linecap="round"/>`;
    s += `<path d="${geo.band(0.84, 1, -1.3, 1.3)}" fill="${C.trim}"/><path d="${geo.line([[0.855, -1.2], [0.855, 0], [0.855, 1.2]])}" stroke="${C.gold}" stroke-width="3.5" fill="none"/>`;
    for (let sv = -0.7; sv <= 0.71; sv += 0.35) { const p = geo.at(0.93, sv); s += `<circle cx="${n2(p[0])}" cy="${n2(p[1])}" r="2.4" fill="${C.dot}"/>`; }
    return s;
  }

  const handBlob = R2.Blob({ cx: 12, cy: 0, rx: 21, ry: 18, seed: 5, wobble: 0.1 });
  function hand() {
    return `<path d="${handBlob.path}" fill="${C.skin}" stroke="${INK}" stroke-width="5"/>` +
      `<path d="M14,-10 Q24,-4 22,8" stroke="${C.skinShade}" stroke-width="5" fill="none" opacity=".7" stroke-linecap="round"/>`;
  }

  function shoe(sign) {
    return () => `<g transform="scale(1 ${sign})">` +
      `<rect x="-22" y="8" width="78" height="11" rx="5" fill="${C.sole}" stroke="${INK}" stroke-width="4"/>` +
      `<path d="M-20,10 C-22,-10 -4,-16 10,-15 C28,-13 42,-3 52,2 Q62,0 60,-8 Q66,2 58,10 Z" fill="${C.shoe}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>` +
      `<path d="M2,-12 Q14,-2 26,-6" stroke="#4a4450" stroke-width="3" fill="none"/><path d="M-12,-4 Q-10,4 -2,6" stroke="#4a4450" stroke-width="2.5" fill="none"/></g>`;
  }

  function brush() {
    return `<g transform="translate(14 0) rotate(${0})"><rect x="-6" y="-118" width="12" height="150" rx="4" fill="#c9a25a" stroke="${INK}" stroke-width="3.5"/>` +
      `<path d="M-6,-90 h12 M-6,-60 h12" stroke="#7a5a2a" stroke-width="3"/><path d="M-7,32 Q-9,52 0,74 Q9,52 7,32 Z" fill="#1a1414" stroke="${INK}" stroke-width="3"/></g>`;
  }

  function hairBack(ctx, blob, fs) {
    const top = blob.point(-Math.PI / 2, 1);
    const x = top[0] + fs.turn * blob.rx * 0.12, y = top[1] - 12;
    const bun = R2.Blob({ cx: x, cy: y, rx: 52, ry: 48, seed: 9, wobble: 0.06 });
    let s = `<path d="${bun.path}" fill="${C.hair}" stroke="${INK}" stroke-width="6"/>`;
    for (let i = 0; i < 5; i++) s += `<path d="M${n2(x - 34 + i * 16)},${n2(y - 40)} Q${n2(x - 38 + i * 18)},${n2(y)} ${n2(x - 30 + i * 14)},${n2(y + 40)}" stroke="${C.hairLine}" stroke-width="2.5" fill="none"/>`;
    s += `<path d="M${n2(x - 28)},${n2(y - 28)} Q${n2(x - 4)},${n2(y - 44)} ${n2(x + 20)},${n2(y - 36)}" stroke="${C.hairSheen}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>`;
    return s;
  }

  function hair(ctx, blob, fs) {
    const cy = blob.cy, ry = blob.ry, outer = [], inner = [];
    for (let i = 0; i <= 14; i++) outer.push(blob.point(Math.PI * (1.06 + 0.88 * i / 14), 1.035));
    for (let i = 14; i >= 0; i--) {
      const a = Math.PI * (1.06 + 0.88 * i / 14), q = blob.point(a, 0.98);
      const line = cy - ry * 0.64 + Math.abs(Math.cos(a)) * ry * 0.46;
      inner.push([q[0], Math.max(q[1], line)]);
    }
    let s = `<path d="${R2.openPath(outer)} L${inner.map(pt).join(' L')}Z" fill="${C.hair}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
    for (let i = 1; i < 10; i++) {
      const a = Math.PI * (1.1 + 0.8 * i / 10), o = blob.point(a, 1.0), q = inner[14 - Math.round(i * 1.4)];
      s += `<path d="M${pt(o)} Q${n2((o[0] + q[0]) / 2 + (i - 5) * 2)},${n2((o[1] + q[1]) / 2)} ${pt(q)}" stroke="${C.hairLine}" stroke-width="2.5" fill="none"/>`;
    }
    const h1 = blob.point(Math.PI * 1.3, 0.94), h2 = blob.point(Math.PI * 1.55, 0.97);
    s += `<path d="M${pt(h1)} Q${n2((h1[0] + h2[0]) / 2)},${n2(Math.min(h1[1], h2[1]) - 12)} ${pt(h2)}" stroke="${C.hairSheen}" stroke-width="5" fill="none" opacity=".65" stroke-linecap="round"/>`;
    // band + hairpin through the bun
    const top = blob.point(-Math.PI / 2, 1), bx = top[0] + fs.turn * blob.rx * 0.12, by = top[1] - 12;
    s += `<rect x="${n2(bx - 46)}" y="${n2(by + 26)}" width="92" height="14" rx="6" fill="${C.gold}" stroke="${INK}" stroke-width="3"/>`;
    s += `<line x1="${n2(bx - 112)}" y1="${n2(by - 14)}" x2="${n2(bx + 118)}" y2="${n2(by + 14)}" stroke="${INK}" stroke-width="14" stroke-linecap="round"/>` +
      `<line x1="${n2(bx - 112)}" y1="${n2(by - 14)}" x2="${n2(bx + 118)}" y2="${n2(by + 14)}" stroke="${C.wood}" stroke-width="7" stroke-linecap="round"/>` +
      `<circle cx="${n2(bx - 114)}" cy="${n2(by - 14)}" r="15" fill="${C.jade}" stroke="${INK}" stroke-width="4"/><circle cx="${n2(bx - 119)}" cy="${n2(by - 19)}" r="4.5" fill="${C.jadeLight}"/>` +
      `<path d="M${n2(bx + 112)},${n2(by + 12)} l18,-10 l2,22Z" fill="#d6ad55" stroke="${INK}" stroke-width="2.5"/>`;
    return s;
  }

  function spec() {
    const sk = R2.biped({});
    return {
      name: 'scholar', ink: INK, light: -1, bones: sk.bones, ik: sk.ik, dims: sk.dims,
      parts: [
        { name: 'legL', type: 'tube', bones: ['thighL', 'shinL'], widths: [36, 28, 24], fill: C.pants, z: 0, line: 5, capEnd: 'flat' },
        { name: 'legR', type: 'tube', bones: ['thighR', 'shinR'], widths: [36, 28, 24], fill: C.pants, z: 0, line: 5, capEnd: 'flat' },
        { name: 'shoeL', type: 'shape', bone: 'footL', z: 1, draw: shoe(-1) },
        { name: 'shoeR', type: 'shape', bone: 'footR', z: 1, draw: shoe(1) },
        { name: 'robe', type: 'tube', bones: ['hips', 'chest', 'neck'], extendStart: 150, widths: [232, 186, 152, 126, 84], fill: C.robe, z: 10, line: 7, capStart: 'flat', clipId: 'robe', detail: robeDetail, over: robeOver },
        { name: 'handL', type: 'shape', bone: 'handL', z: 18, draw: hand },
        { name: 'handR', type: 'shape', bone: 'handR', z: 18, draw: hand },
        { name: 'brush', type: 'shape', bone: 'handR', z: 19, visible: c => c.props.brush, draw: brush },
        { name: 'sleeveL', type: 'tube', bones: ['upperArmL', 'lowerArmL'], widths: [50, 52, 68], fill: C.robe, z: 20, line: 6, capEnd: 'flat', clipId: 'sleeveL', detail: sleeveDetail },
        { name: 'sleeveR', type: 'tube', bones: ['upperArmR', 'lowerArmR'], widths: [50, 52, 68], fill: C.robe, z: 20, line: 6, capEnd: 'flat', clipId: 'sleeveR', detail: sleeveDetail },
        {
          name: 'head', type: 'head', bone: 'head', z: 30,
          head: { rx: 152, ry: 138, wobble: 0.1, seed: 7, jaw: 0.7, crown: 0.3, skin: C.skin, shade: C.skinShade, rim: C.rim, line: 8 },
          back: hairBack, hair,
        },
      ],
    };
  }

  const Scholar = { spec, colors: C };
  if (typeof module !== 'undefined' && module.exports) module.exports = Scholar;
  else root.Scholar = Scholar;
})(typeof window !== 'undefined' ? window : globalThis);
