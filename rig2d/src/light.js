/*
 * Rig2D Light — scene light falling on characters (the Ricks Clips look: light reflects off the side of a
 * face that faces the window, the fire or the sun; the other side falls into shadow).
 *
 *   Light.render(actor, { x, y, scale, t, light })   drop-in for actor.render(...)
 *   Light.PRESETS                                     day, golden, overcast, interior, night, candle, forge
 *   Light.preset('night', { source: { x, y } })       a preset with overrides
 *
 * The light is DIRECTIONAL, not an even tint: the skin keeps its own color where the light doesn't reach, and gets
 *   1. Key        the side facing the source reflects the light's color (and glows at the edge), fading across the face
 *   2. Shine      a soft bright spot near the lit edge
 *   3. Rim        a bright edge just inside the outline on the lit side
 *   4. Shadow     the far side falls softly into the scene's shadow color
 *   5. Ambient    optional faint cast of the surrounding light (e.g. moonlight at night; 0 in daylight)
 *   6. Pattern    optional light shapes from the set (window blinds, leaves) falling on the skin
 *   7. Cast       a shadow on the ground, pointing away from the light
 * Every part lights itself from its own outline (cheap, and each limb shades like a rounded form): heads
 * draw the face light; sleeves, legs, torsos and shapes that declare `lightShape` (hands, shoes, props) get
 * the light's color on the lit side, the shade on the far side, a glow and a rim; at night clothes dim toward
 * the ambient color (`bodyDim`). `affect: 'skin'` lights only the face.
 *
 * Direction: `dir` is where the light comes FROM, in screen degrees (0 = from the right, 180 = from the
 * left, -90 = from above), or `source: {x, y}` (a candle, window or sun in the scene) and every
 * character works out its own direction. `back: true` = light behind the characters (sunset): stronger
 * rim, shadow toward the camera.
 */
(function (root) {
  'use strict';
  const n2 = v => +(+v).toFixed(2);
  const rgb = c => { const h = c.replace('#', ''); const f = h.length === 3 ? h.split('').map(x => x + x).join('') : h; return [0, 2, 4].map(i => parseInt(f.substr(i, 2), 16)); };
  const toward1 = (c, k) => rgb(c).map(v => 255 + (v - 255) * k);              // white blended toward c
  const mul = (...cs) => 'rgb(' + [0, 1, 2].map(i => Math.round(cs.reduce((a, c) => a * c[i] / 255, 255))).join(',') + ')';

  const PRESETS = {
    //          light color      glow       shine       rim color + strength           far-side shadow                ambient cast (0 = none)            dir      ground shadow
    day:      { bodyDim: 0, color: '#ffeccc', key: 0.25, spec: 0.3, rim: '#ffffff', rimOp: 0.55, shade: '#4a5290', shadeOp: 0.16, amb: '#9fb4ff', ambTint: 0, dir: -55, shadow: 0.32 },
    golden:   { bodyDim: 0.1, color: '#ffbe6a', key: 0.6, spec: 0.45, rim: '#ffd486', rimOp: 0.9, shade: '#5a2a50', shadeOp: 0.3, amb: '#c08aa0', ambTint: 0.05, dir: -20, shadow: 0.38 },
    overcast: { bodyDim: 0.08, color: '#eef2fa', key: 0.15, spec: 0.12, rim: '#ffffff', rimOp: 0.3, shade: '#2c3550', shadeOp: 0.16, amb: '#b8c2d4', ambTint: 0.06, dir: -80, shadow: 0.18 },
    interior: { bodyDim: 0.08, color: '#ffdcaa', key: 0.38, spec: 0.3, rim: '#fff0cc', rimOp: 0.55, shade: '#3a2030', shadeOp: 0.24, amb: '#d8b8a0', ambTint: 0.04, dir: -60, shadow: 0.3 },
    night:    { bodyDim: 0.75, color: '#ffb45a', key: 0.6, spec: 0.4, rim: '#ffc27a', rimOp: 0.95, shade: '#140c34', shadeOp: 0.45, amb: '#8a7ad8', ambTint: 0.22, dir: 0, shadow: 0.4 },
    candle:   { bodyDim: 0.5, color: '#ffa040', key: 0.7, spec: 0.5, rim: '#ffb24a', rimOp: 1.0, shade: '#2a0c18', shadeOp: 0.5, amb: '#a07060', ambTint: 0.12, dir: 0, shadow: 0.45 },
    forge:    { bodyDim: 0.25, color: '#ff9a30', key: 0.8, spec: 0.6, rim: '#ffb040', rimOp: 1.0, shade: '#2a0812', shadeOp: 0.45, amb: '#c08060', ambTint: 0.08, dir: 0, shadow: 0.45 },
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
    const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2, W = bx1 - bx0, H = by1 - by0;
    const [ux, uy] = toward(L, cx, cy);
    const back = L.back ? 1 : 0;
    const lit = {
      color: L.color || '#fff', key: L.key == null ? 0.3 : L.key, spec: L.spec == null ? 0.3 : L.spec,
      rim: L.rim || '#fff', rimOp: Math.min(1, (L.rimOp == null ? 0.6 : L.rimOp) * (back ? 1.1 : 1)), rimWidth: (L.rimWidth || 7) * (back ? 1.3 : 1),
      shade: L.shade || '#000', shadeOp: L.shadeOp == null ? 0.25 : L.shadeOp, amb: L.amb || '#fff', ambTint: L.ambTint || 0, dx: ux, dy: uy,
    };
    // body light colors (clothes, hands, shoes, props that declare an outline): lit side takes the light's
    // color, the far side the shade, everything dimmed toward the ambient color at night (bodyDim)
    if (L.affect !== 'skin') {
      const dim = toward1(lit.amb, L.bodyDim || 0);
      lit.body = { lit: mul(toward1(lit.color, lit.key * 0.75), dim), mid: mul([255, 255, 255], dim), far: mul(toward1(lit.shade, lit.shadeOp), dim), glow: lit.key * 0.55 };
    }
    const base = Object.assign({}, o, { light: ux >= 0 ? 1 : -1 });
    const id = `lt${o.id || ''}${uid++}`;
    const inner = actor.render(Object.assign({}, base, { lit, uid: id }));
    const reg = `x="${n2(bx0)}" y="${n2(by0)}" width="${n2(W)}" height="${n2(H)}"`;
    const skinOnly = L.affect === 'skin';

    let defs = '';
    let out = '';

    // 7. cast shadow on the ground: skew away from the light, squash (toward the camera when backlit)
    const shOp = L.shadow == null ? 0.3 : L.shadow;
    if (shOp > 0 && o.castShadow !== false) {
      const gy = o.ground == null ? y : o.ground;
      const skew = n2(ux * (L.shadowLen || 0.9)), squash = n2(back ? -0.32 : 0.22);
      defs += `<filter id="${id}-sh" filterUnits="userSpaceOnUse" x="${n2(bx0 - W)}" y="${n2(by0 - H)}" width="${n2(W * 3)}" height="${n2(H * 3)}"><feGaussianBlur stdDeviation="${n2(Math.min(3, 2 * s))}"/></filter>`;
      out += `<g opacity="${n2(shOp)}" filter="url(#${id}-sh)" transform="translate(${n2(x)} ${n2(gy)}) matrix(1 0 ${skew} ${squash} 0 0) translate(${n2(-x)} ${n2(-gy)})">${actor.render(Object.assign({}, base, { mask: 'silhouette' }))}</g>`;
    }
    out += inner;

    // 6. set light pattern (e.g. blinds) on all skin, heads included
    if (L.pattern) {
      defs += `<mask id="${id}-p" maskUnits="userSpaceOnUse" ${reg}>${actor.render(Object.assign({}, base, { mask: 'skin' }))}</mask>`;
      out += `<g mask="url(#${id}-p)" style="mix-blend-mode:${L.pattern.blend || 'screen'}" opacity="${n2(L.pattern.opacity == null ? 0.5 : L.pattern.opacity)}">${L.pattern.svg}</g>`;
    }
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
