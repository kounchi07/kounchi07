/*
 * Rig2D Camera — keyframed camera moves, parallax layers, shake and depth blur.
 *
 *   const cam = Camera.track([
 *     { t: 0,   x: 540, y: 960, z: 1.0 },
 *     { t: 2.5, x: 900, y: 1100, z: 1.6, r: -2, ease: 'inOut' },   // pan + push-in + slight roll
 *   ]);
 *   const c = cam(t);                                  // { x, y, z, r }
 *   Camera.handheld(c, t, 0.6);                        // gentle drift
 *   Camera.shake(c, t, 18, t0);                        // impact shake that decays from t0
 *   layer.setAttribute('transform', Camera.transform(c, depth, origin));
 *
 * Parallax: every layer has a depth. 1 = the action plane, < 1 farther away (moves and zooms
 * less), > 1 nearer the lens (moves more). `origin` is the point where all layers line up.
 */
(function (root) {
  'use strict';
  const R2 = root.Rig2D || require('./rig.js');
  const W = 1080, H = 1920;

  function track(keys) {
    const ks = keys.slice().sort((a, b) => a.t - b.t);
    const val = (k, f, d) => (k[f] == null ? d : k[f]);
    return t => {
      let a = ks[0], b = ks[ks.length - 1];
      if (t <= a.t) b = a;
      else if (t >= b.t) a = b;
      else for (let i = 0; i < ks.length - 1; i++) if (t >= ks[i].t && t <= ks[i + 1].t) { a = ks[i]; b = ks[i + 1]; break; }
      const e = a === b ? 1 : (R2.EASE[b.ease || 'inOut'] || R2.EASE.inOut)((t - a.t) / (b.t - a.t));
      const lerp = (f, d) => R2.lerp(val(a, f, d), val(b, f, val(a, f, d)), e);
      return { x: lerp('x', W / 2), y: lerp('y', H / 2), z: lerp('z', 1), r: lerp('r', 0) };
    };
  }

  // Smooth 1D value noise in [-1, 1].
  function noise(x, seed = 1) {
    const h = n => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return h(i) * (1 - u) + h(i + 1) * u;
  }

  function handheld(c, t, amount = 1, seed = 3) {
    c.x += noise(t * 0.7, seed) * 9 * amount;
    c.y += noise(t * 0.6, seed + 1) * 7 * amount;
    c.r += noise(t * 0.5, seed + 2) * 0.35 * amount;
    return c;
  }

  function shake(c, t, amp, t0 = -Infinity, decay = 0.45, seed = 7) {
    const k = t0 === -Infinity ? 1 : Math.max(0, 1 - (t - t0) / decay);
    if (t < t0 || k <= 0) return c;
    c.x += noise(t * 38, seed) * amp * k;
    c.y += noise(t * 41, seed + 5) * amp * k;
    c.r += noise(t * 30, seed + 9) * amp * 0.04 * k;
    return c;
  }

  function transform(c, depth = 1, origin = [W / 2, H / 2]) {
    const tx = origin[0] + (c.x - origin[0]) * depth, ty = origin[1] + (c.y - origin[1]) * depth;
    const z = 1 + (c.z - 1) * depth;
    return `translate(${W / 2} ${H / 2}) rotate(${c.r.toFixed(3)}) scale(${z.toFixed(4)}) translate(${(-tx).toFixed(2)} ${(-ty).toFixed(2)})`;
  }

  // Whip pan between shots: returns { dx, blur } to add around the cut time.
  function whip(t, tCut, dur = 0.16, dir = 1) {
    const k = (t - tCut) / dur;
    if (k < -1 || k > 1) return { dx: 0, blur: 0 };
    const e = k < 0 ? -Math.pow(-k, 2) : Math.pow(k, 2);
    return { dx: -dir * e * W * 0.9, blur: (1 - Math.abs(k)) * 60 };
  }

  const Camera = { track, noise, handheld, shake, transform, whip, W, H };
  if (typeof module !== 'undefined' && module.exports) module.exports = Camera;
  else root.Camera = Camera;
})(typeof window !== 'undefined' ? window : globalThis);
