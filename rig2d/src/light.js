/*
 * Rig2D Light — makes any character match the light of the scene it stands in.
 *
 *   Light.render(actor, { x, y, scale, t, light })   drop-in for actor.render(...)
 *   Light.PRESETS                                     day, golden, night, candle, forge, interior, overcast
 *   Light.preset('night', { source: { x, y } })       a preset with overrides
 *
 * What it does to the character (all from its silhouette, so it works for any rig, prop or outfit):
 *   1. Tint      face, clothes AND outline are multiplied by the light color, and the blacks are lifted
 *                toward the ambient color (night = lavender faces, candle = warm cream, ...).
 *   2. Shading   a soft gradient across the body: brighter on the side facing the light, darker on the far side.
 *   3. Rim       a thin bright line just inside the outline on the lit side (body, legs, head, props).
 *   4. Pattern   optional light/shadow shapes from the set (window blinds, leaves) projected onto the body.
 *   5. Shadow    a cast shadow on the ground, pointing away from the light.
 *
 * Light direction: `dir` is where the light comes FROM, in screen degrees (0 = from the right,
 * 180 = from the left, -90 = from above). Or give `source: {x, y}` (world point, e.g. a candle or a
 * window) and every character works out its own direction. `back: true` = the light is behind the
 * characters (sunset behind them): the shadow falls toward the camera and the rim gets stronger.
 */
(function (root) {
  'use strict';
  const n2 = v => +(+v).toFixed(2);
  const hex = c => { const h = c.replace('#', ''); const f = h.length === 3 ? h.split('').map(x => x + x).join('') : h; return [0, 2, 4].map(i => parseInt(f.substr(i, 2), 16) / 255); };

  const PRESETS = {
    //            light color   tint  exposure ambient     lift  rim color  rim  shade color  shade key   dir
    day:      { color: '#fff3e2', tint: 0.08, exposure: 1.02, ambient: '#8fa8ff', lift: 0.02, rim: '#fff6dc', rimOp: 0.55, shade: '#3c4380', shadeOp: 0.13, key: 0.08, dir: -55, shadow: 0.32 },
    golden:   { color: '#ffd29e', tint: 0.32, exposure: 1.0, ambient: '#7a3e52', lift: 0.05, rim: '#ffd27e', rimOp: 0.62, shade: '#4a2650', shadeOp: 0.32, key: 0.16, dir: -20, shadow: 0.38 },
    overcast: { color: '#e8ecf4', tint: 0.18, exposure: 0.97, ambient: '#6a7890', lift: 0.04, rim: '#ffffff', rimOp: 0.3, shade: '#2c3550', shadeOp: 0.2, key: 0.05, dir: -80, shadow: 0.18 },
    interior: { color: '#ffe6c4', tint: 0.22, exposure: 1.0, ambient: '#5a3a30', lift: 0.04, rim: '#fff0cc', rimOp: 0.5, shade: '#3a2030', shadeOp: 0.26, key: 0.12, dir: -60, shadow: 0.3 },
    night:    { color: '#aaa2e8', tint: 0.5, exposure: 0.86, ambient: '#2a1c5c', lift: 0.07, rim: '#ffc27a', rimOp: 0.75, shade: '#140c34', shadeOp: 0.42, key: 0.14, dir: 0, shadow: 0.4 },
    candle:   { color: '#ffc48a', tint: 0.45, exposure: 0.95, ambient: '#3a1608', lift: 0.05, rim: '#ffb24a', rimOp: 0.9, shade: '#2a0c18', shadeOp: 0.45, key: 0.22, dir: 0, shadow: 0.45 },
    forge:    { color: '#ffbe70', tint: 0.5, exposure: 1.05, ambient: '#4a1606', lift: 0.06, rim: '#ff9a2a', rimOp: 1.0, shade: '#2a0812', shadeOp: 0.42, key: 0.28, dir: 0, shadow: 0.45 },
  };
  const preset = (name, over = {}) => Object.assign({ name }, PRESETS[name], over);

  // Unit vector pointing from the character toward the light.
  function toward(L, cx, cy) {
    if (L.source) { const dx = L.source.x - cx, dy = L.source.y - cy, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; }
    const a = (L.dir == null ? -55 : L.dir) * Math.PI / 180;
    return [Math.cos(a), Math.sin(a)];
  }

  // World-space box around the posed character (bone joints + generous margin for hair, hats, props).
  function box(ch, x, y, s) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const flip = ch._flip ? -1 : 1;
    for (const b of ch.order) {
      for (const [px, py] of [[b.world[4], b.world[5]], [b.world[4] + b.world[0] * b.length, b.world[5] + b.world[1] * b.length]]) {
        const wx = x + px * s * flip, wy = y + py * s;
        x0 = Math.min(x0, wx); x1 = Math.max(x1, wx); y0 = Math.min(y0, wy); y1 = Math.max(y1, wy);
      }
    }
    const m = 190 * s;
    return [x0 - m, y0 - m * 1.2, x1 + m, y1 + m * 0.35];
  }

  let uid = 0;
  function render(actor, o = {}) {
    const L = typeof o.light === 'string' ? preset(o.light) : o.light;
    const s = o.scale || 1, x = o.x || 0, y = o.y || 0;
    if (!L) return actor.render(o);
    const ch = actor.current || actor;
    ch._flip = actor.state && actor.state.facing < 0;
    const [bx0, by0, bx1, by1] = box(ch, x, y, s);
    const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
    const [ux, uy] = toward(L, cx, cy);
    // the rig's own head shading follows the scene light (+1 = light from screen right)
    const inner = actor.render(Object.assign({}, o, { light: ux >= 0 ? 1 : -1 }));
    const id = `lt${o.id || ''}${uid++}`, W = bx1 - bx0, H = by1 - by0;
    const reg = `filterUnits="userSpaceOnUse" x="${n2(bx0)}" y="${n2(by0)}" width="${n2(W)}" height="${n2(H)}"`;

    // 1. tint: out = in * k + ambient * lift  (outline included, so lines pick up the scene color too)
    const c = hex(L.color || '#ffffff'), a = hex(L.ambient || '#000000'), tint = L.tint == null ? 0.2 : L.tint, ex = L.exposure || 1, lift = L.lift || 0;
    const k = c.map(v => n2((1 - tint + tint * v) * ex)), off = a.map(v => n2(v * lift));
    const mat = `${k[0]} 0 0 0 ${off[0]}  0 ${k[1]} 0 0 ${off[1]}  0 0 ${k[2]} 0 ${off[2]}  0 0 0 1 0`;

    // 3. rim: band just inside the silhouette (erode past the outline), on the side facing the light
    const line = (L.line || 7) * s, rw = (L.rimWidth || 6) * Math.min(1, s) * (L.back ? 1.2 : 1);
    const rimOp = (L.rimOp == null ? 0.6 : L.rimOp) * (L.back ? 1.1 : 1);

    // 2. shading gradient across the box, along the light direction
    const g1 = [cx + ux * W / 2, cy + uy * H / 2], g0 = [cx - ux * W / 2, cy - uy * H / 2];

    // 5. cast shadow: skew away from the light, squash onto the ground (toward camera when backlit)
    const shOp = L.shadow == null ? 0.3 : L.shadow;
    const skew = n2(ux * (L.shadowLen || 0.9)), squash = n2(L.back ? -0.32 : 0.22);

    let defs = `<g id="${id}-c">${inner}</g>` +
      `<filter id="${id}-tint" ${reg} color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${mat}"/></filter>` +
      `<filter id="${id}-white" ${reg}><feFlood flood-color="#fff"/><feComposite in2="SourceAlpha" operator="in"/></filter>` +
      `<mask id="${id}-m" maskUnits="userSpaceOnUse" x="${n2(bx0)}" y="${n2(by0)}" width="${n2(W)}" height="${n2(H)}"><use href="#${id}-c" filter="url(#${id}-white)"/></mask>` +
      `<filter id="${id}-rim" ${reg}><feMorphology in="SourceAlpha" operator="erode" radius="${n2(line)}" result="in"/>` +
      `<feOffset in="in" dx="${n2(-ux * rw)}" dy="${n2(-uy * rw)}" result="sh"/><feComposite in="in" in2="sh" operator="out" result="band"/>` +
      `<feGaussianBlur in="band" stdDeviation="${n2(0.6 * s)}" result="bb"/><feFlood flood-color="${L.rim || '#fff'}"/><feComposite in2="bb" operator="in"/></filter>` +
      `<linearGradient id="${id}-g" gradientUnits="userSpaceOnUse" x1="${n2(g1[0])}" y1="${n2(g1[1])}" x2="${n2(g0[0])}" y2="${n2(g0[1])}">` +
      `<stop offset="0" stop-color="${L.shade || '#000'}" stop-opacity="0"/><stop offset=".45" stop-color="${L.shade || '#000'}" stop-opacity="${n2((L.shadeOp || 0.25) * 0.35)}"/><stop offset="1" stop-color="${L.shade || '#000'}" stop-opacity="${n2(L.shadeOp || 0.25)}"/></linearGradient>` +
      `<linearGradient id="${id}-k" gradientUnits="userSpaceOnUse" x1="${n2(g1[0])}" y1="${n2(g1[1])}" x2="${n2(cx)}" y2="${n2(cy)}">` +
      `<stop offset="0" stop-color="${L.color || '#fff'}" stop-opacity="${n2(L.key || 0.1)}"/><stop offset="1" stop-color="${L.color || '#fff'}" stop-opacity="0"/></linearGradient>` +
      `<filter id="${id}-sh" ${reg.replace(/y="[^"]+"/, `y="${n2(by0 - H)}"`).replace(/height="[^"]+"/, `height="${n2(H * 3)}"`)} x="-50%"><feFlood flood-color="${L.shadowColor || '#1a0c14'}"/><feComposite in2="SourceAlpha" operator="in"/><feGaussianBlur stdDeviation="${n2(6 * s)}"/></filter>`;

    let out = '';
    if (shOp > 0 && o.castShadow !== false) {
      const gy = o.ground == null ? y : o.ground;
      out += `<g opacity="${n2(shOp)}" style="mix-blend-mode:multiply"><use href="#${id}-c" filter="url(#${id}-sh)" transform="translate(${n2(x)} ${n2(gy)}) matrix(1 0 ${skew} ${squash} 0 0) translate(${n2(-x)} ${n2(-gy)})"/></g>`;
    }
    out += `<use href="#${id}-c" filter="url(#${id}-tint)"/>` +
      `<g mask="url(#${id}-m)"><rect x="${n2(bx0)}" y="${n2(by0)}" width="${n2(W)}" height="${n2(H)}" fill="url(#${id}-g)" style="mix-blend-mode:multiply"/>` +
      `<rect x="${n2(bx0)}" y="${n2(by0)}" width="${n2(W)}" height="${n2(H)}" fill="url(#${id}-k)" style="mix-blend-mode:screen"/>` +
      (L.pattern ? `<g style="mix-blend-mode:${L.pattern.blend || 'screen'}" opacity="${n2(L.pattern.opacity == null ? 0.5 : L.pattern.opacity)}">${L.pattern.svg}</g>` : '') + `</g>` +
      `<use href="#${id}-c" filter="url(#${id}-rim)" opacity="${n2(Math.min(1, rimOp))}" style="mix-blend-mode:screen"/>`;
    return `<g class="lit"><defs>${defs}</defs>${out}</g>`;
  }

  // Window-blind stripes (light or shadow) across a region, for Light pattern.svg.
  function blinds(x0, y0, x1, y1, o = {}) {
    const n = o.n || 9, gap = (y1 - y0) / n, w = gap * (o.fill || 0.45), sk = o.skew || 0.35;
    let s = '';
    for (let i = 0; i < n; i++) { const y = y0 + i * gap; s += `<path d="M${x0},${n2(y)} L${x1},${n2(y + (x1 - x0) * sk)} L${x1},${n2(y + (x1 - x0) * sk + w)} L${x0},${n2(y + w)}Z" fill="${o.color || '#fff4d8'}"/>`; }
    return s;
  }

  const Light = { render, preset, PRESETS, blinds };
  if (typeof module !== 'undefined' && module.exports) module.exports = Light;
  else root.Light = Light;
})(typeof window !== 'undefined' ? window : globalThis);
