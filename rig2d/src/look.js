/*
 * Rig2D Look — the finishing pass that makes frames feel polished instead of dull.
 *
 *   Look.defs(opts)            <defs> with the grade/bloom filter, grain and light gradients
 *   <g filter="url(#look)">    wrap the whole picture (not captions) in the grade
 *   Look.soften(svg, opts)     thinner, tinted outlines for background art (characters keep bold ink)
 *   Look.glow(x, y, r, color)  soft light source (lanterns, torches, sun)
 *   Look.rays(x, y, ...)       sun rays / god rays
 *   Look.haze(y0, y1, color)   atmospheric haze band between depth layers
 *   Look.pool(x, y, rx, ry)    warm pool of light on the ground
 *
 * The grade: lifted blacks (shadows stay soft, never crushed), a gentle S-curve for
 * contrast in the mid-tones, extra saturation, and bloom so bright areas glow.
 */
(function (root) {
  'use strict';
  const n2 = v => +(+v).toFixed(2);

  function defs(o = {}) {
    const sat = o.saturation == null ? 1.4 : o.saturation;
    const lift = o.lift == null ? 0.06 : o.lift;           // black point
    const bloom = o.bloom == null ? 0.35 : o.bloom;
    const warm = o.warm == null ? 0.03 : o.warm;           // + warm, - cool
    // tone curve: lifted toe, gentle S through the mids, soft shoulder
    // inputs 0, 1/6 ... 1 -> outputs: soft (lifted) blacks, deeper lower-mids, brighter upper-mids, soft highlights
    const curve = [lift, 0.13, 0.28, 0.47, 0.68, 0.86, 0.97].map(v => n2(Math.min(1, v)));
    const r = curve.map(v => n2(Math.min(1, v + warm * 0.6))).join(' '), g = curve.join(' '), b = curve.map(v => n2(Math.max(0, v - warm))).join(' ');
    return `
<filter id="look" filterUnits="userSpaceOnUse" x="0" y="0" width="1080" height="1920" color-interpolation-filters="sRGB">
  <feComponentTransfer in="SourceGraphic" result="tone"><feFuncR type="table" tableValues="${r}"/><feFuncG type="table" tableValues="${g}"/><feFuncB type="table" tableValues="${b}"/></feComponentTransfer>
  <feColorMatrix in="tone" type="saturate" values="${sat}" result="graded"/>
  <feColorMatrix in="graded" type="matrix" values="0.33 0.5 0.17 0 0  0.33 0.5 0.17 0 0  0.33 0.5 0.17 0 0  0 0 0 1 0" result="lum"/>
  <feComponentTransfer in="lum" result="hot"><feFuncR type="linear" slope="3.2" intercept="-2.2"/><feFuncG type="linear" slope="3.2" intercept="-2.2"/><feFuncB type="linear" slope="3.2" intercept="-2.2"/></feComponentTransfer>
  <feComposite in="graded" in2="hot" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="hotColor"/>
  <feGaussianBlur in="hotColor" stdDeviation="22" result="bloomA"/>
  <feGaussianBlur in="hotColor" stdDeviation="6" result="bloomB"/>
  <feComposite in="bloomA" in2="bloomB" operator="arithmetic" k1="0" k2="${n2(bloom * 0.7)}" k3="${n2(bloom * 0.4)}" k4="0" result="bloom"/>
  <feBlend in="graded" in2="bloom" mode="screen"/>
</filter>
<filter id="look-grain" filterUnits="userSpaceOnUse" x="0" y="0" width="1080" height="1920">
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${o.grainSeed || 3}" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.9 0"/>
</filter>
<filter id="look-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
<radialGradient id="look-glow"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".25" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="look-ray" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="look-vign" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#1a0c10" stop-opacity="0"/><stop offset="1" stop-color="#1a0c10" stop-opacity=".28"/></radialGradient>`;
  }

  // Background art: tinted, thinner outlines so characters (bold ink) stand out.
  function soften(svg, o = {}) {
    const ink = o.ink || '#2b1d16', color = o.color || '#4a3426', k = o.k || 0.6;
    return svg.replace(new RegExp(`stroke="${ink}"`, 'g'), `stroke="${color}"`)
      .replace(/stroke-width="([\d.]+)"/g, (m, w) => `stroke-width="${n2(Math.max(1, w * k))}"`);
  }

  const gid = c => `look-g-${c.replace('#', '')}`;
  const glowGrad = c => `<radialGradient id="${gid(c)}"><stop offset="0" stop-color="${c}" stop-opacity=".95"/><stop offset=".3" stop-color="${c}" stop-opacity=".45"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  const glow = (x, y, r, color = '#ffb060', op = 0.6) =>
    `${glowGrad(color)}<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r)}" fill="url(#${gid(color)})" style="mix-blend-mode:screen" opacity="${op}"/>`;

  function rays(x, y, len = 2400, n = 7, spread = 70, rot = 100, color = '#ffe2b0', op = 0.18, t = 0) {
    let s = `<g style="mix-blend-mode:screen" opacity="${op}">`;
    for (let i = 0; i < n; i++) {
      const a = (rot - spread / 2 + spread * i / (n - 1) + Math.sin(t * 0.3 + i) * 1.2) * Math.PI / 180, w = 0.03 + (i % 3) * 0.015;
      const x1 = x + Math.cos(a - w) * len, y1 = y + Math.sin(a - w) * len, x2 = x + Math.cos(a + w) * len, y2 = y + Math.sin(a + w) * len;
      s += `<path d="M${n2(x)},${n2(y)} L${n2(x1)},${n2(y1)} L${n2(x2)},${n2(y2)}Z" fill="${color}" opacity="${n2(0.5 + 0.5 * Math.sin(t * 0.5 + i * 1.7))}"/>`;
    }
    return s + '</g>';
  }

  function haze(x0, x1, y0, y1, color = '#ffd2a8', op = 0.35, id = 'hz') {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0"/><stop offset=".6" stop-color="${color}" stop-opacity="${op}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>` +
      `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="url(#${id})"/>`;
  }

  const pool = (x, y, rx, ry, color = '#ffc070', op = 0.35) =>
    `${glowGrad(color)}<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="${n2(rx)}" ry="${n2(ry)}" fill="url(#${gid(color)})" opacity="${op}" style="mix-blend-mode:screen"/>`;

  // Soft contact shadow under a character or prop (blurred, multiply).
  const contact = (x, y, rx, ry, op = 0.42) =>
    `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="${n2(rx)}" ry="${n2(ry)}" fill="#2a1408" opacity="${op}" style="mix-blend-mode:multiply" filter="url(#look-soft)"/>`;

  const Look = { defs, soften, glow, rays, haze, pool, contact };
  if (typeof module !== 'undefined' && module.exports) module.exports = Look;
  else root.Look = Look;
})(typeof window !== 'undefined' ? window : globalThis);
