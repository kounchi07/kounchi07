/*
 * Rig2D — a small 2D skeleton/rig engine that renders to SVG.
 *
 * Concepts
 *  - Bones form a hierarchy. Each bone points along its local +x axis.
 *    Angles are in degrees, 0 = screen right, positive = clockwise (SVG y is down).
 *    Bone scale: sx stretches ALONG the bone, sy stretches ACROSS it.
 *  - IK chains (two bones) place a hand/foot at a target; the solver writes
 *    rotations back into the bones, so IK and FK mix freely (see `weight`).
 *  - Parts are what you see: tubes (sleeves, legs, torsos that bend with the
 *    bones), shapes (rigid art attached to a bone) and heads (blob + face rig).
 *  - A pose/state is plain data: { bones, ik, face, z, props }. Timelines
 *    interpolate any numeric field, so anything in a state can be animated.
 *
 * Works in the browser (global `Rig2D`) and in Node (`require`).
 */
(function (root) {
  'use strict';

  const DEG = Math.PI / 180;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const n2 = v => +(+v).toFixed(2);
  const pt = p => `${n2(p[0])},${n2(p[1])}`;
  const angDiff = (a, b) => ((a - b + 540) % 360) - 180;

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ---------- 2D affine matrices [a b c d e f] ----------
  const M = {
    id: () => [1, 0, 0, 1, 0, 0],
    mul: (m, n) => [
      m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
      m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]],
    tr: (x, y) => [1, 0, 0, 1, x, y],
    rot: a => { const c = Math.cos(a * DEG), s = Math.sin(a * DEG); return [c, s, -s, c, 0, 0]; },
    sc: (x, y) => [x, 0, 0, y, 0, 0],
    apply: (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]],
    angle: m => Math.atan2(m[1], m[0]) / DEG,
    str: m => `matrix(${m.map(v => +v.toFixed(4)).join(' ')})`,
  };

  // ---------- easing ----------
  const EASE = {
    linear: x => x,
    step: x => (x < 1 ? 0 : 1),
    in: x => x * x * x,
    out: x => 1 - Math.pow(1 - x, 3),
    inOut: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    back: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    elastic: x => (x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1),
  };

  // ---------- curves ----------
  // Closed Catmull-Rom through points, written as cubic Beziers.
  function closedPath(pts) {
    const n = pts.length;
    let d = `M${pt(pts[0])}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += ` C${n2(p1[0] + (p2[0] - p0[0]) / 6)},${n2(p1[1] + (p2[1] - p0[1]) / 6)} ` +
        `${n2(p2[0] - (p3[0] - p1[0]) / 6)},${n2(p2[1] - (p3[1] - p1[1]) / 6)} ${pt(p2)}`;
    }
    return d + 'Z';
  }

  function openPath(pts) {
    const n = pts.length, P = i => pts[clamp(i, 0, n - 1)];
    let d = `M${pt(pts[0])}`;
    for (let i = 0; i < n - 1; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      d += ` C${n2(p1[0] + (p2[0] - p0[0]) / 6)},${n2(p1[1] + (p2[1] - p0[1]) / 6)} ` +
        `${n2(p2[0] - (p3[0] - p1[0]) / 6)},${n2(p2[1] - (p3[1] - p1[1]) / 6)} ${pt(p2)}`;
    }
    return d;
  }

  function catmull(pts, seg) {
    const out = [], n = pts.length, P = i => pts[clamp(i, 0, n - 1)];
    for (let i = 0; i < n - 1; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      for (let s = 0; s < seg; s++) {
        const t = s / seg, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(k => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t +
          (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
      }
    }
    out.push(pts[n - 1]);
    return out;
  }

  // ---------- blob: an organic, never-perfect closed shape ----------
  // Radius is wobbled by a few low harmonics with seeded phases, so the same
  // seed always gives the same head, and `point(angle, scale)` lets hair,
  // shading and accessories hug the exact outline.
  function Blob(o) {
    const r = rng(o.seed || 1), w = o.wobble == null ? 0.07 : o.wobble;
    const H = [[2, w * 0.55], [3, w * 0.3], [4, w * 0.16], [5, w * 0.1]].map(([h, a]) => [h, r() * 6.283, a]);
    const k = a => 1 + H.reduce((s, [h, ph, amp]) => s + amp * Math.sin(h * a + ph), 0);
    const cx = o.cx || 0, cy = o.cy || 0;
    const point = (a, sc = 1) => {
      const kk = k(a) * sc;
      const jaw = 1 + (o.jaw || 0) * Math.max(0, Math.sin(a)) * 0.12; // widen lower half
      const crown = 1 - (o.crown || 0) * Math.max(0, -Math.sin(a)) * 0.1; // narrow top
      return [cx + Math.cos(a) * o.rx * kk * jaw * crown, cy + Math.sin(a) * o.ry * kk];
    };
    const n = o.n || 12;
    const pts = Array.from({ length: n }, (_, i) => point(i / n * Math.PI * 2 + (o.rot || 0)));
    return { point, pts, path: closedPath(pts), rx: o.rx, ry: o.ry, cx, cy };
  }

  // ---------- tube: a width-varying ribbon along a smooth spine ----------
  // smooth = false keeps straight segments between joints (rigid limbs with a clean knee/elbow).
  function linear(pts, seg) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++)
      for (let s = 0; s < seg; s++) out.push([lerp(pts[i][0], pts[i + 1][0], s / seg), lerp(pts[i][1], pts[i + 1][1], s / seg)]);
    out.push(pts[pts.length - 1]);
    return out;
  }
  function tubeGeo(ctrl, widths, seg = 10, smooth = true) {
    const S = smooth ? catmull(ctrl, seg) : linear(ctrl, seg), n = S.length;
    const L = [0];
    for (let i = 1; i < n; i++) L[i] = L[i - 1] + Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1]);
    const total = L[n - 1] || 1, U = L.map(l => l / total);
    const W = u => {
      if (widths.length === 1) return widths[0];
      const x = clamp(u, 0, 1) * (widths.length - 1), i = Math.min(Math.floor(x), widths.length - 2);
      return lerp(widths[i], widths[i + 1], x - i);
    };
    const N = S.map((p, i) => {
      const a = S[Math.max(0, i - 1)], b = S[Math.min(n - 1, i + 1)];
      const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
      return [-ty / l, tx / l];
    });
    // Point at normalized length u, lateral offset s in [-1, 1] of the half width.
    const at = (u, s = 0) => {
      u = clamp(u, 0, 1);
      let i = 0;
      while (i < n - 2 && U[i + 1] < u) i++;
      const f = (u - U[i]) / ((U[i + 1] - U[i]) || 1);
      const p = [lerp(S[i][0], S[i + 1][0], f), lerp(S[i][1], S[i + 1][1], f)];
      const nn = [lerp(N[i][0], N[i + 1][0], f), lerp(N[i][1], N[i + 1][1], f)];
      const h = W(u) / 2 * s;
      return [p[0] + nn[0] * h, p[1] + nn[1] * h];
    };
    const outline = (capStart = 'round', capEnd = 'round') => {
      const left = S.map((p, i) => at(U[i], 1)), right = S.map((p, i) => at(U[i], -1));
      let d = `M${pt(left[0])}`;
      for (let i = 1; i < n; i++) d += ` L${pt(left[i])}`;
      const re = W(1) / 2, rs = W(0) / 2;
      d += capEnd === 'round' ? ` A${n2(re)},${n2(re)} 0 0 0 ${pt(right[n - 1])}` : ` L${pt(right[n - 1])}`;
      for (let i = n - 2; i >= 0; i--) d += ` L${pt(right[i])}`;
      if (capStart === 'round') d += ` A${n2(rs)},${n2(rs)} 0 0 0 ${pt(left[0])}`;
      return d + 'Z';
    };
    // Region between u0..u1 and lateral s0..s1, following the bend.
    const band = (u0, u1, s0 = -1, s1 = 1, steps = 10) => {
      const a = [], b = [];
      for (let i = 0; i <= steps; i++) { const u = lerp(u0, u1, i / steps); a.push(at(u, s1)); b.push(at(u, s0)); }
      return `M${a.map(pt).join(' L')} L${b.reverse().map(pt).join(' L')}Z`;
    };
    const line = uvs => openPath(uvs.map(([u, s]) => at(u, s)));
    return { S, U, W, at, outline, band, line, length: total };
  }

  // ---------- face rig ----------
  const FACE_DEFAULTS = {
    lookX: 0, lookY: 0,                 // pupils, -1..1
    blink: 0, blinkL: 0, blinkR: 0,     // 0 open .. 1 closed
    eyeWide: 0,                         // >= .5 switches dot eyes to big ring eyes
    eyeSmile: 0,                        // closed eyes curve up (happy) when > .5
    lidTop: 0, lidTopL: 0, lidTopR: 0,  // flat upper lid (sleepy / smug), 0..1
    browRaise: 0, browRaiseL: 0, browRaiseR: 0, // -1..1
    browAngle: 0, browAngleL: 0, browAngleR: 0, // + = inner ends down (angry), - = worried
    browCurve: 0.25,
    mouthOpen: 0, mouthSmile: 0.15, mouthWidth: 1, mouthX: 0,
    mouthShape: 'auto',                 // auto | o | grit | wavy (worried) | grin (dark grin + block teeth) | none
    teeth: 0, blush: 0.35, sweat: 0, sweatDrops: 1, anger: 0,
    eyeShape: null,                     // null = layout default; 'dot' | 'oval' (solid vertical ovals)
    eyeShine: null,                     // null = layout default; 0 hides the white shine in the eyes
    lidBar: 0, lidBarL: 0, lidBarR: 0,  // thick flat bar over the top of the eye (smug / unimpressed), 0..1
    turn: 0,                            // -1..1 fake head turn (features slide, far eye foreshortens)
  };

  const EXPRESSIONS = {
    neutral: {},
    happy: { mouthSmile: 0.8, mouthOpen: 0.25, browRaise: 0.3, browCurve: 0.4 },
    laugh: { blink: 1, eyeSmile: 1, mouthSmile: 0.9, mouthOpen: 0.8, teeth: 0.6, browRaise: 0.4 },
    shock: { eyeWide: 1, mouthShape: 'o', mouthOpen: 0.5, browRaise: 1, sweat: 1 },
    scared: { eyeWide: 1, mouthShape: 'grit', browRaise: 0.8, browAngle: -0.8, sweat: 1 },
    smug: { lidTopL: 0.45, browRaiseR: 0.9, browAngleL: 0.4, mouthSmile: 0.7, mouthX: 0.5, lookX: 0.5 },
    angry: { browAngle: 1.1, browRaise: -0.4, lidTop: 0.2, mouthSmile: -0.6, mouthOpen: 0.3, teeth: 1, anger: 1 },
    sad: { browAngle: -1, browRaise: 0.3, mouthSmile: -0.6, lookY: 0.6, lidTop: 0.2 },
    sleepy: { lidTop: 0.6, browRaise: -0.2, mouthSmile: 0 },
    // Ricks Clips-style set (study §1): swap these in one frame on the word that motivates them
    smugBar: { lidBar: 0.55, browRaise: -0.1, mouthShape: 'grin', mouthSmile: 0.6, mouthWidth: 1.15 },
    worried: { mouthShape: 'wavy', browAngle: -0.8, browRaise: 0.5, sweat: 1, sweatDrops: 1 },
    nervous: { eyeWide: 1, mouthShape: 'wavy', browAngle: -0.6, browRaise: 0.7, sweat: 1, sweatDrops: 1 },
    crazy: { eyeWide: 1, mouthShape: 'grin', mouthSmile: 1, mouthWidth: 1.35, browRaise: 0.8 },
    panic: { eyeWide: 1, mouthShape: 'wavy', browAngle: -0.9, browRaise: 1, sweat: 1, sweatDrops: 5 },
    grin: { mouthShape: 'grin', mouthSmile: 0.8, mouthWidth: 1.2, browRaise: 0.2 },
  };

  function drawFace(fs, blob, L, ink, idp) {
    const R = blob.rx, RY = blob.ry, cx = blob.cx, cy = blob.cy;
    const turn = clamp(fs.turn, -1, 1);
    // Profile: past ~65% turn the far eye disappears and features crowd the front edge.
    const profile = EASE.inOut(clamp((Math.abs(turn) - 0.65) / 0.35, 0, 1));
    const shift = turn * R * (0.3 + 0.25 * profile);
    let s = '', defs = '';
    const eyes = [];
    for (const side of [-1, 1]) {
      const nm = side < 0 ? 'L' : 'R';
      const far = side * turn > 0;
      if (far && profile > 0.5) continue;
      const spread = far ? 1 - 0.3 * Math.abs(turn) : lerp(1 - 0.08 * Math.abs(turn), 0.12, profile);
      eyes.push({
        side, nm, far,
        x: cx + shift + side * R * L.eyeGap * spread, y: cy + RY * L.eyeY,
        sx: far ? 1 - 0.35 * Math.abs(turn) : 1,
      });
    }
    // blush under everything else
    if (fs.blush > 0) for (const e of eyes)
      s += `<ellipse cx="${n2(e.x + e.side * R * 0.06)}" cy="${n2(e.y + RY * 0.27)}" rx="${n2(R * 0.17 * e.sx)}" ry="${n2(R * 0.08)}" fill="${L.blushColor}" opacity="${n2(fs.blush)}"/>`;

    const r = R * L.eyeR;
    for (const e of eyes) {
      const blink = clamp(Math.max(fs.blink, fs['blink' + e.nm]), 0, 1);
      const lid = clamp(Math.max(fs.lidTop, fs['lidTop' + e.nm]), 0, 1);
      const lx = clamp(fs.lookX, -1, 1), ly = clamp(fs.lookY, -1, 1);
      const bar = clamp(Math.max(fs.lidBar || 0, fs['lidBar' + e.nm] || 0), 0, 1);
      const oval = (fs.eyeShape || L.eyeShape) === 'oval';
      const shine = (fs.eyeShine == null ? (L.eyeShine == null ? 1 : L.eyeShine) : fs.eyeShine) > 0.5;
      let g = '';
      if (blink >= 0.85) {
        g += fs.eyeSmile > 0.5
          ? `<path d="M${n2(-r * 1.5)},${n2(r * 0.5)} Q0,${n2(-r * 1.7)} ${n2(r * 1.5)},${n2(r * 0.5)}" stroke="${ink}" stroke-width="${n2(r * 0.7)}" fill="none" stroke-linecap="round"/>`
          : `<path d="M${n2(-r * 1.4)},0 Q0,${n2(r * 0.6)} ${n2(r * 1.4)},0" stroke="${ink}" stroke-width="${n2(r * 0.7)}" fill="none" stroke-linecap="round"/>`;
      } else {
        let E;
        if (fs.eyeWide >= 0.5) {
          E = r * lerp(2.0, 2.6, (fs.eyeWide - 0.5) * 2);
          const off = E - r * 1.3;
          g += `<circle r="${n2(E)}" fill="#fff" stroke="${ink}" stroke-width="${n2(r * 0.55)}"/>` +
            `<circle cx="${n2(lx * off)}" cy="${n2(ly * off)}" r="${n2(r * (shine ? 0.95 : 0.75))}" fill="${ink}"/>` +
            (shine ? `<circle cx="${n2(lx * off - r * 0.3)}" cy="${n2(ly * off - r * 0.35)}" r="${n2(r * 0.3)}" fill="#fff"/>` : '');
        } else if (oval) {
          // solid vertical oval, no shine (the Ricks Clips eye)
          E = r * 1.45;
          const ox = lx * r * 0.7, oy = ly * r * 0.6;
          g += `<ellipse cx="${n2(ox)}" cy="${n2(oy)}" rx="${n2(r * 0.95)}" ry="${n2(r * 1.4)}" fill="${ink}"/>` +
            (shine ? `<circle cx="${n2(ox - r * 0.3)}" cy="${n2(oy - r * 0.6)}" r="${n2(r * 0.28)}" fill="#fff"/>` : '');
        } else {
          E = r * 1.25;
          const ox = lx * r * 0.9, oy = ly * r * 0.9;
          g += `<circle cx="${n2(ox)}" cy="${n2(oy)}" r="${n2(r)}" fill="${ink}"/>` +
            (shine ? `<circle cx="${n2(ox - r * 0.32)}" cy="${n2(oy - r * 0.36)}" r="${n2(r * 0.32)}" fill="#fff"/>` : '');
        }
        if (bar > 0) {
          // thick flat bar laid over the top of the eye; the eye shows only below it
          const barY = -E + bar * E * 1.1, id = `${idp}-bar${e.nm}`, bt = r * 1.05;
          defs += `<clipPath id="${id}"><rect x="${n2(-E * 3)}" y="${n2(barY)}" width="${n2(E * 6)}" height="${n2(E * 6)}"/></clipPath>`;
          g = `<g clip-path="url(#${id})">${g}</g>` +
            `<path d="M${n2(-E * 1.45)},${n2(barY + e.side * E * 0.05)} L${n2(E * 1.45)},${n2(barY - e.side * E * 0.05)}" stroke="${ink}" stroke-width="${n2(bt)}" stroke-linecap="round"/>`;
        }
        if (lid > 0) {
          const lidY = -E + lid * E * 1.5, id = `${idp}-lid${e.nm}`;
          defs += `<clipPath id="${id}"><rect x="${n2(-E * 2)}" y="${n2(lidY)}" width="${n2(E * 4)}" height="${n2(E * 4)}"/></clipPath>`;
          g = `<g clip-path="url(#${id})">${g}</g>` +
            `<path d="M${n2(-E * 1.25)},${n2(lidY)} L${n2(E * 1.25)},${n2(lidY - e.side * E * 0.08)}" stroke="${ink}" stroke-width="${n2(r * 0.6)}" stroke-linecap="round"/>`;
        }
        g = `<g transform="scale(1 ${n2(1 - blink)})">${g}</g>`;
      }
      s += `<g transform="translate(${n2(e.x)} ${n2(e.y)}) scale(${n2(e.sx)} 1)">${g}</g>`;
    }

    // brows
    for (const e of eyes) {
      const raise = fs.browRaise + fs['browRaise' + e.nm], ang = fs.browAngle + fs['browAngle' + e.nm];
      const bw = R * L.browW * (e.far ? 1 - 0.3 * Math.abs(turn) : 1);
      const by = e.y - RY * L.browGap - raise * RY * 0.09;
      const tilt = ang * bw * 0.45;
      const inner = [e.x - e.side * bw, by + tilt], outer = [e.x + e.side * bw, by - tilt * 0.6];
      const ctrl = [e.x, (inner[1] + outer[1]) / 2 - fs.browCurve * bw * 0.6];
      s += `<path d="M${pt(outer)} Q${pt(ctrl)} ${pt(inner)}" stroke="${ink}" stroke-width="${n2(R * L.browThick)}" fill="none" stroke-linecap="round"/>`;
    }

    // mouth (a layout can hide it, e.g. under a mask)
    if (L.hideMouth) fs = Object.assign({}, fs, { mouthShape: 'none' });
    const mx = cx + shift * 1.1 + fs.mouthX * R * 0.18, my = cy + RY * L.mouthY;
    const w = R * L.mouthW * fs.mouthWidth * (1 - 0.35 * profile), h = w * 0.55 / (1 - 0.35 * profile), sm = fs.mouthSmile, op = fs.mouthOpen;
    const lw = n2(Math.max(3, w * 0.17));
    if (fs.mouthShape === 'none') {
      // nothing
    } else if (fs.mouthShape === 'o') {
      const ry = h * (0.9 + op * 1.6), rx = w * 0.55;
      s += `<ellipse cx="${n2(mx)}" cy="${n2(my + ry * 0.3)}" rx="${n2(rx)}" ry="${n2(ry)}" fill="${L.mouthColor}" stroke="${ink}" stroke-width="${lw}"/>` +
        `<path d="M${n2(mx - rx * 0.6)},${n2(my + ry * 1.0)} Q${n2(mx)},${n2(my + ry * 0.45)} ${n2(mx + rx * 0.6)},${n2(my + ry * 1.0)}" fill="${L.tongueColor}"/>`;
    } else if (fs.mouthShape === 'grit') {
      const gw = w * 1.1, gh = h * 1.3;
      s += `<rect x="${n2(mx - gw)}" y="${n2(my - gh / 2)}" width="${n2(gw * 2)}" height="${n2(gh)}" rx="${n2(gh * 0.3)}" fill="#fff" stroke="${ink}" stroke-width="${lw}"/>` +
        `<path d="M${n2(mx - gw)},${n2(my)} H${n2(mx + gw)}` +
        [-0.5, 0, 0.5].map(k => ` M${n2(mx + gw * k)},${n2(my - gh / 2)} V${n2(my + gh / 2)}`).join('') +
        `" stroke="${ink}" stroke-width="${n2(lw * 0.6)}"/>`;
    } else if (fs.mouthShape === 'wavy') {
      // worried squiggle
      const ww = w * 1.5, n = 3, amp = h * 0.38;
      let d = `M${n2(mx - ww)},${n2(my)}`;
      for (let i = 0; i < n * 2; i++) {
        const x0 = mx - ww + (i + 0.5) * ww / n, x1 = mx - ww + (i + 1) * ww / n;
        d += ` Q${n2(x0)},${n2(my + (i % 2 ? amp : -amp))} ${n2(x1)},${n2(my)}`;
      }
      s += `<path d="${d}" stroke="${ink}" stroke-width="${n2(lw * 1.15)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else if (fs.mouthShape === 'grin') {
      // wide dark crescent grin with a row of white block teeth along the top
      const gw = w * 1.9, lift = sm * gw * 0.12, top = my - h * 0.3, bot = top + gw * (0.42 + 0.22 * sm + 0.35 * op);
      const cl = [mx - gw, top - lift], cr = [mx + gw, top - lift];
      const d = `M${pt(cl)} Q${n2(mx)},${n2(top + lift * 0.5)} ${pt(cr)} C${n2(mx + gw * 0.75)},${n2(bot)} ${n2(mx - gw * 0.75)},${n2(bot)} ${pt(cl)}Z`;
      const id = `${idp}-grin`, th = (bot - top) * 0.36, nt = 5;
      defs += `<clipPath id="${id}"><path d="${d}"/></clipPath>`;
      let teeth = `<path d="M${n2(mx - gw)},${n2(top - h * 2)} V${n2(top + th - lift * 0.3)} Q${n2(mx)},${n2(top + th + lift * 0.4)} ${n2(mx + gw)},${n2(top + th - lift * 0.3)} V${n2(top - h * 2)}Z" fill="#fff"/>`;
      for (let i = 1; i < nt; i++) teeth += `<path d="M${n2(mx - gw + i * gw * 2 / nt)},${n2(top - h * 2)} V${n2(top + th + lift)}" stroke="${ink}" stroke-width="${n2(lw * 0.5)}"/>`;
      s += `<path d="${d}" fill="${ink}"/><g clip-path="url(#${id})">${teeth}</g>` +
        `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${lw}" stroke-linejoin="round"/>`;
    } else if (op < 0.06) {
      s += `<path d="M${n2(mx - w)},${n2(my - sm * h)} Q${n2(mx)},${n2(my + sm * h * 1.3)} ${n2(mx + w)},${n2(my - sm * h)}" stroke="${ink}" stroke-width="${lw}" fill="none" stroke-linecap="round"/>`;
    } else {
      const cl = [mx - w, my - sm * h], cr = [mx + w, my - sm * h];
      const up = [mx, my - sm * h * 0.15 - op * h * 0.4], lo = [mx, my + sm * h * 1.2 + op * h * 2.6];
      const d = `M${pt(cl)} Q${pt(up)} ${pt(cr)} Q${pt(lo)} ${pt(cl)}Z`, id = `${idp}-mouth`;
      defs += `<clipPath id="${id}"><path d="${d}"/></clipPath>`;
      let inside = `<ellipse cx="${n2(mx)}" cy="${n2((up[1] + lo[1]) / 2 + op * h * 0.9)}" rx="${n2(w * 0.6)}" ry="${n2(op * h * 0.9 + 2)}" fill="${L.tongueColor}"/>`;
      if (fs.teeth > 0) inside += `<rect x="${n2(mx - w)}" y="${n2(Math.min(up[1], cl[1]) - h)}" width="${n2(w * 2)}" height="${n2(h * (1 + fs.teeth * 0.5) + Math.abs(cl[1] - up[1]))}" fill="#fff"/>`;
      s += `<path d="${d}" fill="${L.mouthColor}"/><g clip-path="url(#${id})">${inside}</g>` +
        `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${lw}" stroke-linejoin="round"/>`;
    }

    if (fs.sweat > 0) {
      // drop 1 at the temple, then around the head (panic = 4-6 drops)
      const SPOTS = [[0.78, -0.42, 1], [-0.8, -0.3, 0.85], [0.9, 0.05, 0.75], [-0.62, -0.68, 0.7], [0.55, -0.78, 0.65], [-0.92, 0.12, 0.7]];
      const nd = clamp(Math.round(fs.sweatDrops || 1), 1, SPOTS.length);
      for (let i = 0; i < nd; i++) {
        const [ax, ay, sc] = SPOTS[i], x = cx + R * ax, y = cy + RY * ay, k = R * 0.085 * sc;
        s += `<path d="M${n2(x)},${n2(y - k * 1.6)} Q${n2(x - k)},${n2(y)} ${n2(x)},${n2(y + k * 0.8)} Q${n2(x + k)},${n2(y)} ${n2(x)},${n2(y - k * 1.6)}Z" fill="#7fc4ff" stroke="${ink}" stroke-width="${n2(k * 0.35)}" opacity="${n2(fs.sweat)}"/>` +
          `<ellipse cx="${n2(x - k * 0.3)}" cy="${n2(y - k * 0.1)}" rx="${n2(k * 0.18)}" ry="${n2(k * 0.4)}" fill="#fff" opacity="${n2(0.8 * fs.sweat)}"/>`;
      }
    }
    if (fs.anger > 0) {
      const x = cx - R * 0.55, y = cy - RY * 0.55, k = R * 0.09;
      s += `<g opacity="${n2(fs.anger)}" stroke="#d8333a" stroke-width="${n2(k * 0.35)}" fill="none" stroke-linecap="round">` +
        [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([a, b]) =>
          `<path d="M${n2(x + a * k * 0.3)},${n2(y + b * k * 1.1)} Q${n2(x + a * k * 0.35)},${n2(y + b * k * 0.35)} ${n2(x + a * k * 1.1)},${n2(y + b * k * 0.3)}"/>`).join('') + '</g>';
    }
    return { svg: s, defs };
  }

  const FACE_LAYOUT = {
    eyeY: -0.02, eyeGap: 0.36, eyeR: 0.08, browGap: 0.3, browW: 0.15, browThick: 0.075,
    mouthY: 0.42, mouthW: 0.13, blushColor: '#f19a8a', mouthColor: '#5a1f22', tongueColor: '#e0646a',
  };

  // Scene light on one body part (from Light via ctx.lit.body): its own outline gets a multiplied gradient
  // (light color on the lit side -> shade on the far side, dimmed at night), a screen glow on the lit edge and a
  // rim just inside the outline. (dx, dy) is the light direction in the part's local space, c/r its center/radius.
  function partLight(ctx, id, d, c, r, dx, dy, line) {
    const Lt = ctx.lit, B = Lt.body;
    if (!B) return { svg: '', defs: '' };
    const a = [c[0] + dx * r, c[1] + dy * r], b = [c[0] - dx * r, c[1] - dy * r];
    const lin = (gid, p1, p2, stops) => `<linearGradient id="${id}-${gid}" gradientUnits="userSpaceOnUse" x1="${n2(p1[0])}" y1="${n2(p1[1])}" x2="${n2(p2[0])}" y2="${n2(p2[1])}">${stops}</linearGradient>`;
    const defs = lin('b', a, b, `<stop offset="0" stop-color="${B.lit}"/><stop offset=".5" stop-color="${B.mid}"/><stop offset="1" stop-color="${B.far}"/>`) +
      lin('g', a, b, `<stop offset="0" stop-color="${Lt.color}" stop-opacity="${n2(B.glow)}"/><stop offset=".4" stop-color="${Lt.color}" stop-opacity="0"/>`) +
      lin('r', a, c, `<stop offset="0" stop-color="${Lt.rim}" stop-opacity="${n2(Lt.rimOp * 0.85)}"/><stop offset=".7" stop-color="${Lt.rim}" stop-opacity="0"/>`) +
      `<clipPath id="${id}-c"><path d="${d}"/></clipPath>`;
    const svg = `<path d="${d}" fill="url(#${id}-b)" style="mix-blend-mode:multiply"/><path d="${d}" fill="url(#${id}-g)" style="mix-blend-mode:screen"/>` +
      `<path d="${d}" fill="none" stroke="url(#${id}-r)" stroke-width="${n2(line + 2 * Lt.rimWidth * 0.75)}" clip-path="url(#${id}-c)" style="mix-blend-mode:screen"/>`;
    return { svg, defs };
  }
  // light direction from character space into a part's local space (inverse of its matrix)
  function localDir(m, vx, vy) {
    const det = m[0] * m[3] - m[1] * m[2] || 1;
    let dx = (m[3] * vx - m[2] * vy) / det, dy = (-m[1] * vx + m[0] * vy) / det;
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  }

  // ---------- part renderers ----------
  const RENDER = {
    // Rigid art attached to a bone. `frame` rotates the drawing space; 90 makes
    // an upward-pointing bone draw with normal screen axes.
    shape(p, ctx, ch) {
      const m = M.mul(ch.bones[p.bone].world, M.rot(p.frame || 0));
      let art = p.draw(ctx), sdefs = '';
      // parts that declare their outline (lightShape: { d, c, r }) catch the scene light like tubes do
      if (ctx.lit && ctx.lit.body && p.lightShape && !ctx.mask) {
        const ls = typeof p.lightShape === 'function' ? p.lightShape(ctx) : p.lightShape;
        const [dx, dy] = localDir(m, ctx.lit.dx, ctx.lit.dy);
        const pl = partLight(ctx, `${ch.id}${ctx.uid || ''}-${p.name}-l`, ls.d, ls.c, ls.r, dx, dy, ls.line || 4);
        art += pl.svg; sdefs = pl.defs;
      }
      const inner = `<g transform="${M.str(m)}">${art}</g>`;
      if (sdefs) return { svg: p.clip ? `<g clip-path="url(#${ch.id}${ctx.uid || ''}-${p.clip})">${inner}</g>` : inner, defs: sdefs };
      return { svg: p.clip ? `<g clip-path="url(#${ch.id}${ctx.uid || ''}-${p.clip})">${inner}</g>` : inner };
    },

    // Width-varying tube through a bone chain (bone origins + tip of the last).
    tube(p, ctx, ch) {
      const pts = p.bones.map(n => { const b = ch.bones[n]; return [b.world[4], b.world[5]]; });
      const last = ch.bones[p.bones[p.bones.length - 1]];
      pts.push(M.apply(last.world, last.length, 0));
      const ext = (a, b, d) => { const l = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1; return [a[0] + (a[0] - b[0]) / l * d, a[1] + (a[1] - b[1]) / l * d]; };
      const es = typeof p.extendStart === 'function' ? p.extendStart(ctx) : p.extendStart;
      if (es) pts.unshift(ext(pts[0], pts[1], es));
      if (p.extendEnd) pts.push(ext(pts[pts.length - 1], pts[pts.length - 2], p.extendEnd));
      const geo = tubeGeo(pts, p.widths, p.segments || 10, p.smooth !== false);
      const d = geo.outline(p.capStart || 'round', p.capEnd || 'round');
      let defs = '';
      const cid = `${ch.id}${ctx.uid || ''}-${p.clipId || p.name}`;
      if (p.clipId) defs += `<clipPath id="${cid}"><path d="${d}"/></clipPath>`;
      let svg = `<path d="${d}" fill="${p.fill}"/>`;
      if (p.detail) svg += `<g clip-path="url(#${cid})">${p.detail(geo, ctx)}</g>`;
      if (ctx.lit && ctx.lit.body && !ctx.mask) {
        // scene light on this tube, across its own shape (each sleeve/leg shades like a rounded form)
        const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
        const c = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
        const r = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2 + Math.max(...p.widths) / 2;
        const pl = partLight(ctx, `${cid}-l`, d, c, r, ctx.lit.dx, ctx.lit.dy, p.line || 6);
        svg += pl.svg; defs += pl.defs;
      }
      svg += `<path d="${d}" fill="none" stroke="${ctx.ink}" stroke-width="${p.line || 6}" stroke-linejoin="round"/>`;
      if (p.over) svg += p.over(geo, ctx);
      return { svg, defs };
    },

    // Blob head + shading + hair hooks + full face rig.
    head(p, ctx, ch) {
      const m = M.mul(ch.bones[p.bone].world, M.rot(p.frame == null ? 90 : p.frame));
      const H = p.head;
      const blob = p._blob || (p._blob = Blob(Object.assign({ cx: 0, cy: -H.ry * 0.85 }, H)));
      const idp = `${ch.id}-${p.name}${ctx.uid || ''}`, fs = ctx.face, lx = ctx.light;
      const L = Object.assign({}, FACE_LAYOUT, p.face);
      let defs = `<clipPath id="${idp}-clip"><path d="${blob.path}"/></clipPath>` +
        `<filter id="${idp}-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${n2(H.rx * 0.09)}"/></filter>`;
      if (ctx.mask === 'body') {   // body mask: the face is lit by the head itself, hair/hats/beards by the body light
        const wht = x => x ? `<g class="rig-wht">${x}</g>` : '';
        return { svg: `<g transform="${M.str(m)}">${wht(p.back ? p.back(ctx, blob, fs) : '')}<path d="${blob.path}" fill="#000" stroke="#000" stroke-width="${H.line || 8}"/>${wht(p.hair ? p.hair(ctx, blob, fs) : '')}${wht(p.front ? p.front(ctx, blob, fs) : '')}</g>`, defs };
      }
      if (ctx.mask === 'hands') return { svg: `<g transform="${M.str(m)}" class="rig-blk"><path d="${blob.path}" fill="#000" stroke="#000" stroke-width="${H.line || 8}"/>${p.hair ? p.hair(ctx, blob, fs) : ''}${p.front ? p.front(ctx, blob, fs) : ''}</g>`, defs };
      if (ctx.mask === 'skin') {   // skin mask: blob white; hair, face features and outline black
        const blk = x => x ? `<g class="rig-blk">${x}</g>` : '';
        const ms = blk(p.back ? p.back(ctx, blob, fs) : '') + `<path d="${blob.path}" fill="#fff"/>` +
          `<path d="${blob.path}" fill="none" stroke="#000" stroke-width="${H.line || 8}"/>` +
          blk(p.hair ? p.hair(ctx, blob, fs) : '') + blk(drawFace(fs, blob, L, '#000', idp + 'm').svg) + blk(p.front ? p.front(ctx, blob, fs) : '');
        return { svg: `<g transform="${M.str(m)}">${ms}</g>`, defs };
      }
      let s = p.back ? p.back(ctx, blob, fs) : '';
      s += `<path d="${blob.path}" fill="${H.skin}"/>`;
      if (ctx.lit) {
        // Scene light falling on the face (from Light): the side toward the light reflects the light's
        // color and glows at the edge, a soft shine sits near the lit edge, a rim runs along it, and the far
        // side falls into shadow. Directional: the face is not tinted evenly.
        const Lt = ctx.lit, det = m[0] * m[3] - m[1] * m[2] || 1;
        let dx = (m[3] * Lt.dx - m[2] * Lt.dy) / det, dy = (-m[1] * Lt.dx + m[0] * Lt.dy) / det;
        const ln = Math.hypot(dx, dy) || 1; dx /= ln; dy /= ln;
        const rr = Math.max(H.rx, H.ry), ex = blob.cx + dx * rr, ey = blob.cy + dy * rr, fx = blob.cx - dx * rr, fy = blob.cy - dy * rr;
        const grad = (id, x1, y1, x2, y2, col, op, end) => `<linearGradient id="${idp}-${id}" gradientUnits="userSpaceOnUse" x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}">` +
          `<stop offset="0" stop-color="${col}" stop-opacity="${n2(op)}"/><stop offset="${end}" stop-color="${col}" stop-opacity="0"/></linearGradient>`;
        const sx = blob.cx + dx * rr * 0.5, sy = blob.cy + dy * rr * 0.5 - rr * 0.18;
        // lk: the light's color reflected off the lit side (multiply = colored light on a pale surface),
        // lg: a brighter glow hugging the lit edge (screen)
        defs += grad('lk', ex, ey, fx, fy, Lt.color, Lt.key, 0.85) + grad('lg', ex, ey, fx, fy, Lt.color, Lt.key, 0.45) + grad('ls', fx, fy, ex, ey, Lt.shade, Lt.shadeOp, 0.6) +
          grad('lr', ex, ey, blob.cx, blob.cy, Lt.rim, Lt.rimOp, 0.6) +
          `<radialGradient id="${idp}-lh"><stop offset="0" stop-color="${Lt.color}" stop-opacity="${n2(Lt.spec)}"/><stop offset="1" stop-color="${Lt.color}" stop-opacity="0"/></radialGradient>`;
        if (Lt.ambTint > 0) s += `<path d="${blob.path}" fill="${Lt.amb}" opacity="${n2(Lt.ambTint)}" style="mix-blend-mode:multiply"/>`;
        s += `<path d="${blob.path}" fill="url(#${idp}-ls)" style="mix-blend-mode:multiply"/>` +
          `<path d="${blob.path}" fill="url(#${idp}-lk)" style="mix-blend-mode:multiply"/>` +
          `<path d="${blob.path}" fill="url(#${idp}-lg)" style="mix-blend-mode:screen"/>` +
          `<ellipse cx="${n2(sx)}" cy="${n2(sy)}" rx="${n2(rr * 0.42)}" ry="${n2(rr * 0.3)}" fill="url(#${idp}-lh)" clip-path="url(#${idp}-clip)" style="mix-blend-mode:screen"/>` +
          `<path d="${blob.path}" fill="none" stroke="url(#${idp}-lr)" stroke-width="${n2((H.line || 8) + 2 * Lt.rimWidth)}" clip-path="url(#${idp}-clip)" style="mix-blend-mode:screen"/>`;
      } else {
        s += `<g clip-path="url(#${idp}-clip)">` +
          `<ellipse cx="${n2(blob.cx - lx * H.rx * 0.95)}" cy="${n2(blob.cy + H.ry * 0.15)}" rx="${n2(H.rx * 0.7)}" ry="${n2(H.ry * 1.25)}" fill="${H.shade}" opacity=".6" filter="url(#${idp}-soft)"/>` +
          `<ellipse cx="${n2(blob.cx + lx * H.rx * 1.02)}" cy="${n2(blob.cy)}" rx="${n2(H.rx * 0.22)}" ry="${n2(H.ry * 0.8)}" fill="${H.rim}" opacity=".35" filter="url(#${idp}-soft)"/></g>`;
      }
      s += `<path d="${blob.path}" fill="none" stroke="${ctx.ink}" stroke-width="${H.line || 8}" stroke-linejoin="round"/>`;
      if (p.hair) s += p.hair(ctx, blob, fs);
      const face = drawFace(fs, blob, L, ctx.ink, idp);
      s += face.svg; defs += face.defs;
      if (p.front) s += p.front(ctx, blob, fs);
      return { svg: `<g transform="${M.str(m)}">${s}</g>`, defs };
    },
  };

  // ---------- character ----------
  class Character {
    constructor(spec, opts = {}) {
      this.spec = spec;
      this.id = opts.id || spec.name || 'ch';
      this.ink = spec.ink || '#2b1d16';
      this.bones = {}; this.order = [];
      for (const b of spec.bones) {
        const bone = { name: b.name, parent: b.parent || null, x: b.x || 0, y: b.y || 0, rot: b.rot || 0, length: b.length || 0, pose: null, world: M.id() };
        if (bone.parent && !this.bones[bone.parent]) throw new Error(`bone ${b.name}: parent ${bone.parent} must be defined first`);
        this.bones[b.name] = bone; this.order.push(bone);
      }
      this.ik = spec.ik || {};
      this.parts = spec.parts.map((p, i) => Object.assign({ name: p.name || `part${i}` }, p));
      this.reset(); this.update();
      for (const b of this.order) b.restAngle = M.angle(b.world);
      this.pose({});
    }

    reset() { for (const b of this.order) b.pose = { rot: 0, x: 0, y: 0, sx: 1, sy: 1 }; }

    update() {
      for (const b of this.order) {
        const p = b.pose;
        const local = M.mul(M.mul(M.tr(b.x + p.x, b.y + p.y), M.rot(b.rot + p.rot)), M.sc(p.sx, p.sy));
        b.world = b.parent ? M.mul(this.bones[b.parent].world, local) : local;
      }
    }

    // Apply a full state: FK bone values first, then IK chains on top.
    pose(state) {
      this.state = state || {};
      this.reset();
      const bs = this.state.bones || {};
      for (const n in bs) if (this.bones[n]) Object.assign(this.bones[n].pose, bs[n]);
      this.update();
      const iks = this.state.ik || {};
      for (const n in iks) if (this.ik[n]) this.solveIK(this.ik[n], iks[n]);
      this.faceState = Object.assign({}, FACE_DEFAULTS, this.spec.face || {}, this.state.face || {});
      return this;
    }

    solveIK(chain, t) {
      const w = t.weight == null ? 1 : t.weight;
      if (w <= 0) return;
      const A = this.bones[chain.upper], B = this.bones[chain.lower];
      let target = [t.x, t.y];
      if ((t.space || 'root') === 'root') target = M.apply(this.bones[this.order[0].name].world, t.x, t.y);
      // Rigid chain: the limb stays perfectly straight and just swings from the joint toward the target.
      if (t.rigid != null ? t.rigid : chain.rigid) {
        const base = Math.atan2(target[1] - A.world[5], target[0] - A.world[4]) / DEG;
        A.pose.rot += w * angDiff(base, M.angle(A.world));
        this.update();
        B.pose.rot += w * angDiff(M.angle(A.world), M.angle(B.world));
        this.update();
        const endRot = t.endRot != null ? t.endRot : (chain.lockEnd && chain.end ? this.bones[chain.end].restAngle : null);
        if (chain.end && endRot != null) { const E = this.bones[chain.end]; E.pose.rot += w * angDiff(endRot, M.angle(E.world)); this.update(); }
        return;
      }
      const p0 = [A.world[4], A.world[5]], p1 = [B.world[4], B.world[5]], tip = M.apply(B.world, B.length, 0);
      const l1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), l2 = Math.hypot(tip[0] - p1[0], tip[1] - p1[1]);
      const dx = target[0] - p0[0], dy = target[1] - p0[1];
      const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
      const base = Math.atan2(dy, dx) / DEG;
      const a1 = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)) / DEG;
      const bend = t.bend == null ? (chain.bend == null ? 1 : chain.bend) : t.bend;
      A.pose.rot += w * angDiff(base - bend * a1, M.angle(A.world));
      this.update();
      const e = [B.world[4], B.world[5]];
      B.pose.rot += w * angDiff(Math.atan2(target[1] - e[1], target[0] - e[0]) / DEG, M.angle(B.world));
      this.update();
      // End bone (hand/foot): explicit world angle, or keep its rest angle when the chain locks it (feet stay flat).
      const endRot = t.endRot != null ? t.endRot : (chain.lockEnd && chain.end ? this.bones[chain.end].restAngle : null);
      if (chain.end && endRot != null) {
        const E = this.bones[chain.end];
        E.pose.rot += w * angDiff(endRot + (t.endRotOffset || 0), M.angle(E.world));
        this.update();
      }
    }

    // World position of a point in a bone's space (useful for props, effects, cameras).
    worldPoint(bone, x = 0, y = 0) { return M.apply(this.bones[bone].world, x, y); }

    render(opts = {}) {
      const ctx = {
        ch: this, ink: this.ink, face: this.faceState, state: this.state,
        props: this.state.props || {}, view: this.spec.view || 'front', t: opts.t || 0,
        light: (opts.flip ? -1 : 1) * (opts.light == null ? (this.spec.light == null ? -1 : this.spec.light) : opts.light),
      };
      const zo = this.state.z || {};
      const list = this.parts.map((p, i) => ({ p, i, z: zo[p.name] == null ? (p.z || 0) : zo[p.name] }))
        .sort((a, b) => a.z - b.z || a.i - b.i);
      let defs = '', body = '';
      // mask: 'skin' draws skin white and everything else black, in the same draw order, so hats, hair and
      // sleeves in front of skin hide it; 'hands' is the same without heads (heads light themselves);
      // 'body' is everything except the face (clothes, hands, hair, hats, props);
      // 'silhouette' draws everything black (cast shadows). Used by Light.
      // Colors are forced with a CSS rule (cheaper than a filter per part).
      const mask = opts.mask;
      if (mask) {
        ctx.mask = mask;
        defs += '<style>.rig-blk [fill]:not([fill="none"]){fill:#000!important}.rig-blk [stroke]:not([stroke="none"]){stroke:#000!important}' +
          '.rig-wht [fill]:not([fill="none"]){fill:#fff!important}.rig-wht [stroke]:not([stroke="none"]){stroke:#fff!important}</style>';
      }
      if (opts.lit) ctx.lit = Object.assign({}, opts.lit, { dx: opts.lit.dx * (opts.flip ? -1 : 1) });
      if (opts.uid) ctx.uid = opts.uid;   // unique ids when the same actor is drawn more than once per frame
      for (const { p } of list) {
        if (p.visible && !p.visible(ctx)) continue;
        const r = RENDER[p.type](p, ctx, this);
        body += mask === 'silhouette' ? r.svg : mask && p.type !== 'head' ? `<g class="rig-${p.skin || mask === 'body' ? 'wht' : 'blk'}">${r.svg}</g>` : r.svg;
        defs += r.defs || '';
      }
      if (mask === 'silhouette') body = `<g class="rig-blk">${body}</g>`;
      const tr = `translate(${n2(opts.x || 0)} ${n2(opts.y || 0)}) scale(${n2((opts.flip ? -1 : 1) * (opts.scale || 1))} ${n2(opts.scale || 1)})`;
      return `<g transform="${tr}"><defs>${defs}</defs>${body}</g>`;
    }
  }

  // ---------- skeleton templates ----------
  // A front-facing biped. Names use SCREEN sides: ...L = screen left, ...R = screen right.
  function biped(o = {}) {
    const P = Object.assign({
      thigh: 110, shin: 105, ankle: 14, hipW: 30, spine: 105, chest: 120, neck: 18, head: 200,
      shoulderW: 54, shoulderY: 0.84, upperArm: 88, lowerArm: 82, hand: 24, foot: 38, armSpread: 14,
    }, o);
    return {
      bones: [
        { name: 'root' },
        { name: 'hips', parent: 'root', y: -(P.thigh + P.shin + P.ankle), rot: -90, length: P.spine },
        { name: 'chest', parent: 'hips', x: P.spine, length: P.chest },
        { name: 'neck', parent: 'chest', x: P.chest, length: P.neck },
        { name: 'head', parent: 'neck', x: P.neck, length: P.head },
        { name: 'upperArmL', parent: 'chest', x: P.chest * P.shoulderY, y: -P.shoulderW, rot: 180 + P.armSpread, length: P.upperArm },
        { name: 'lowerArmL', parent: 'upperArmL', x: P.upperArm, rot: -8, length: P.lowerArm },
        { name: 'handL', parent: 'lowerArmL', x: P.lowerArm, length: P.hand },
        { name: 'upperArmR', parent: 'chest', x: P.chest * P.shoulderY, y: P.shoulderW, rot: 180 - P.armSpread, length: P.upperArm },
        { name: 'lowerArmR', parent: 'upperArmR', x: P.upperArm, rot: 8, length: P.lowerArm },
        { name: 'handR', parent: 'lowerArmR', x: P.lowerArm, length: P.hand },
        { name: 'thighL', parent: 'hips', y: -P.hipW, rot: 180, length: P.thigh },
        { name: 'shinL', parent: 'thighL', x: P.thigh, length: P.shin },
        { name: 'footL', parent: 'shinL', x: P.shin, rot: 90, length: P.foot },
        { name: 'thighR', parent: 'hips', y: P.hipW, rot: 180, length: P.thigh },
        { name: 'shinR', parent: 'thighR', x: P.thigh, length: P.shin },
        { name: 'footR', parent: 'shinR', x: P.shin, rot: -90, length: P.foot },
      ],
      ik: {
        armL: { upper: 'upperArmL', lower: 'lowerArmL', end: 'handL', bend: 1 },
        armR: { upper: 'upperArmR', lower: 'lowerArmR', end: 'handR', bend: -1 },
        legL: { upper: 'thighL', lower: 'shinL', end: 'footL', bend: 1, lockEnd: true },
        legR: { upper: 'thighR', lower: 'shinR', end: 'footR', bend: -1, lockEnd: true },
      },
      dims: P,
    };
  }

  // Side view (facing screen right). Limbs overlap with a little depth offset;
  // ...L is the FAR side, ...R the NEAR side. Feet point forward.
  function bipedSide(o = {}) {
    const P = Object.assign({
      thigh: 110, shin: 105, ankle: 14, hipDepth: 8, spine: 105, chest: 120, neck: 18, head: 200,
      shoulderDepth: 10, shoulderY: 0.84, upperArm: 88, lowerArm: 82, hand: 24, foot: 38,
    }, o);
    return {
      bones: [
        { name: 'root' },
        { name: 'hips', parent: 'root', y: -(P.thigh + P.shin + P.ankle), rot: -90, length: P.spine },
        { name: 'chest', parent: 'hips', x: P.spine, length: P.chest },
        { name: 'neck', parent: 'chest', x: P.chest, length: P.neck },
        { name: 'head', parent: 'neck', x: P.neck, length: P.head },
        { name: 'upperArmL', parent: 'chest', x: P.chest * P.shoulderY, y: -P.shoulderDepth, rot: 180, length: P.upperArm },
        { name: 'lowerArmL', parent: 'upperArmL', x: P.upperArm, rot: -10, length: P.lowerArm },
        { name: 'handL', parent: 'lowerArmL', x: P.lowerArm, length: P.hand },
        { name: 'upperArmR', parent: 'chest', x: P.chest * P.shoulderY, y: P.shoulderDepth, rot: 180, length: P.upperArm },
        { name: 'lowerArmR', parent: 'upperArmR', x: P.upperArm, rot: -10, length: P.lowerArm },
        { name: 'handR', parent: 'lowerArmR', x: P.lowerArm, length: P.hand },
        { name: 'thighL', parent: 'hips', y: -P.hipDepth, rot: 180, length: P.thigh },
        { name: 'shinL', parent: 'thighL', x: P.thigh, length: P.shin },
        { name: 'footL', parent: 'shinL', x: P.shin, rot: -90, length: P.foot },
        { name: 'thighR', parent: 'hips', y: P.hipDepth, rot: 180, length: P.thigh },
        { name: 'shinR', parent: 'thighR', x: P.thigh, length: P.shin },
        { name: 'footR', parent: 'shinR', x: P.shin, rot: -90, length: P.foot },
      ],
      ik: {
        armL: { upper: 'upperArmL', lower: 'lowerArmL', end: 'handL', bend: 1 },
        armR: { upper: 'upperArmR', lower: 'lowerArmR', end: 'handR', bend: 1 },
        // knees bend forward (toward +x)
        legL: { upper: 'thighL', lower: 'shinL', end: 'footL', bend: -1, lockEnd: true },
        legR: { upper: 'thighR', lower: 'shinR', end: 'footR', bend: -1, lockEnd: true },
      },
      dims: P,
    };
  }

  // ---------- walk cycle (side view, facing +x) ----------
  // Classic four-pose walk: contact -> down -> passing -> up, one step every
  // half cycle. Default cycle = 1.0 s = 30 frames at 30 fps (15 frames a step).
  // Feet stay planted from heel strike to toe-off (linear slide in root space),
  // heels roll, hips dip on "down" and rise on "up", arms swing opposite the
  // legs and lag a couple of frames behind.
  function walk(t, o = {}) {
    // leg = thigh + shin (straight-leg length); bob adds extra cartoon bounce on top (0 = none)
    const P = Object.assign({ cycle: 1.0, stride: 200, stance: 0.6, bob: 0, lift: 22, armSwing: 32, lag: 0.07, lean: 5, ankle: 14, foot: 38, leg: 215, x0: 0, phase: 0, mood: 1 }, o);
    const speed = P.stride / P.cycle;                 // px per second, root space
    const p = ((t / P.cycle + P.phase) % 1 + 1) % 1;
    const a = speed * P.stance * P.cycle / 2;         // planted foot slides from +a to -a
    const legState = pp => {
      if (pp < P.stance) {                              // stance: heel strike -> flat -> toe off
        const u = pp / P.stance;
        let ang = 0, y = -P.ankle;
        if (u < 0.12) ang = -18 * (1 - u / 0.12);        // toe up at contact
        if (u > 0.72) { ang = 32 * (u - 0.72) / 0.28; y -= P.foot * Math.sin(ang * DEG) * 0.9; } // heel peels off
        return { x: a - 2 * a * u, y, endRot: ang };
      }
      const u = (pp - P.stance) / (1 - P.stance);       // swing: passing pose at u = .5
      const e = EASE.inOut(u);
      return { x: -a + 2 * a * e, y: -P.ankle - P.lift * P.mood * Math.sin(Math.PI * u) - (u < 0.3 ? P.foot * 0.3 * (1 - u / 0.3) : 0), endRot: lerp(32, -18, u) };
    };
    const legR = legState(p), legL = legState((p + 0.5) % 1);
    const q = (p * 2) % 1;                              // step phase
    // Stance legs stay straight: the hips sit exactly as high as a straight leg reaches the planted foot.
    const drop = f => P.leg - Math.sqrt(Math.max(0, P.leg * P.leg - f * f));
    const stanceDrop = Math.max(p < P.stance ? drop(legR.x) : 0, (p + 0.5) % 1 < P.stance ? drop(legL.x) : 0);
    const hipsY = stanceDrop + P.bob * P.mood * Math.cos(2 * Math.PI * (q - 0.18)); // + = lower
    const sw = P.armSwing * P.mood, pa = 2 * Math.PI * (p - P.lag);
    return {
      bones: {
        root: { x: P.x0 + speed * t },
        hips: { y: hipsY, rot: P.lean },
        chest: { rot: -1.5 * Math.sin(2 * pa) },
        head: { rot: -P.lean * 0.6 + 1.2 * Math.cos(2 * Math.PI * (q - 0.25)) },
        upperArmR: { rot: sw * Math.cos(pa) },          // near arm back while near leg is forward
        upperArmL: { rot: -sw * Math.cos(pa) },
        lowerArmR: { rot: -10 - 10 * (1 - Math.cos(pa)) / 2 },
        lowerArmL: { rot: -10 - 10 * (1 + Math.cos(pa)) / 2 },
      },
      ik: {
        legL: { x: legL.x, y: legL.y, endRot: legL.endRot, weight: 1 },
        legR: { x: legR.x, y: legR.y, endRot: legR.endRot, weight: 1 },
      },
      speed,
    };
  }

  // An actor owns one Character per view and picks one from state.view.
  // state.facing = -1 mirrors the side view to face left.
  class Actor {
    constructor(specFn, opts = {}) {
      this.id = opts.id || 'actor';
      this.views = {};
      for (const v of opts.views || ['front', 'side']) this.views[v] = new Character(specFn({ view: v }), { id: `${this.id}-${v}` });
      this.current = this.views.front || Object.values(this.views)[0];
    }
    pose(state) {
      this.state = state;
      this.current = this.views[state.view || 'front'] || this.current;
      this.current.pose(state);
      return this;
    }
    render(opts = {}) { return this.current.render(Object.assign({}, opts, { flip: (this.state && this.state.facing) < 0 })); }
  }

  // ---------- state helpers ----------
  function flatten(o, pre = '', out = {}) {
    for (const k in o) {
      const v = o[k], p = pre ? `${pre}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p, out); else out[p] = v;
    }
    return out;
  }
  function unflatten(flat) {
    const o = {};
    for (const p in flat) {
      const ks = p.split('.'); let c = o;
      for (let i = 0; i < ks.length - 1; i++) c = c[ks[i]] || (c[ks[i]] = {});
      c[ks[ks.length - 1]] = flat[p];
    }
    return o;
  }
  function merge(...states) {
    const flat = {};
    for (const s of states) if (s) Object.assign(flat, flatten(s));
    return unflatten(flat);
  }

  // Mix two states: numbers lerp, values present in only one state are kept as-is.
  function blend(a, b, k) {
    const A = flatten(a || {}), B = flatten(b || {}), out = {};
    for (const p in A) out[p] = A[p];
    for (const p in B) {
      const va = A[p], vb = B[p];
      out[p] = typeof va === 'number' && typeof vb === 'number' ? lerp(va, vb, k) : (va === undefined || k >= 0.5 ? vb : va);
    }
    return unflatten(out);
  }

  // Keyframes: [{ t, pose, ease }]. Each key's ease shapes the segment that ARRIVES at it.
  // Numbers interpolate; strings/booleans switch when the next key is reached.
  class Timeline {
    constructor(keys) {
      this.tracks = {};
      this.duration = 0;
      for (const k of keys) {
        this.duration = Math.max(this.duration, k.t);
        const flat = flatten(k.pose || {});
        for (const p in flat) (this.tracks[p] || (this.tracks[p] = [])).push({ t: k.t, v: flat[p], ease: k.ease || 'inOut' });
      }
      for (const p in this.tracks) this.tracks[p].sort((a, b) => a.t - b.t);
    }
    at(t) {
      const flat = {};
      for (const p in this.tracks) {
        const tr = this.tracks[p];
        let v;
        if (t <= tr[0].t) v = tr[0].v;
        else if (t >= tr[tr.length - 1].t) v = tr[tr.length - 1].v;
        else {
          let i = 0;
          while (tr[i + 1].t < t) i++;
          const a = tr[i], b = tr[i + 1], x = (t - a.t) / (b.t - a.t), e = EASE[b.ease] || EASE.inOut;
          v = typeof a.v === 'number' && typeof b.v === 'number' ? lerp(a.v, b.v, e(x)) : (x < 1 ? a.v : b.v);
        }
        flat[p] = v;
      }
      return unflatten(flat);
    }
  }

  // Life on top of any pose: breathing, automatic blinks, a little head drift.
  function alive(state, t, o = {}) {
    const s = merge(state);
    s.bones = s.bones || {}; s.face = s.face || {};
    const chest = s.bones.chest = s.bones.chest || {};
    const head = s.bones.head = s.bones.head || {};
    const br = Math.sin(t * Math.PI * 2 / (o.breath || 3.2));
    chest.sx = (chest.sx == null ? 1 : chest.sx) * (1 + 0.012 * br);
    head.rot = (head.rot || 0) + Math.sin(t * 1.1 + 1) * (o.sway == null ? 1.2 : o.sway);
    const rand = rng(o.seed || 3);
    let tb = 0.6 + rand() * 1.5;
    let blink = 0;
    while (tb < t + 1) {
      const x = (t - tb) / 0.16;
      if (x >= 0 && x <= 1) blink = x < 0.35 ? x / 0.35 : x < 0.55 ? 1 : 1 - (x - 0.55) / 0.45;
      tb += 2 + rand() * 2.8;
    }
    s.face.blink = Math.max(s.face.blink || 0, blink);
    return s;
  }

  const Rig2D = {
    M, EASE, Blob, tubeGeo, closedPath, openPath, catmull, rng, lerp, clamp,
    Character, Actor, Timeline, biped, bipedSide, walk, blend, merge, flatten, unflatten, alive,
    FACE_DEFAULTS, FACE_LAYOUT, EXPRESSIONS, drawFace,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Rig2D;
  else root.Rig2D = Rig2D;
})(typeof window !== 'undefined' ? window : globalThis);
