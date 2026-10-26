/*
 * Xicheng — the Empty City. Three parallax-layered locations for 1080x1920:
 *   City.exterior()  : dusk sky, mountains, city wall + gate tower, road, army field
 *   City.street()    : empty street inside the walls, shops, lanterns, paving
 *   City.walltop()   : top of the wall (side view): parapet, guqin table, incense, army far below
 * Each returns { layers: [{ id, depth, svg }], origin, update(t, opts) }.
 */
(function (root) {
  'use strict';
  const R2 = root.Rig2D, P = root.Props;
  const INK = '#2b1d16';
  const n2 = v => +(+v).toFixed(2);
  const mix = (a, b, k) => P.mix(a, b, k), dk = P.dk, lt = P.lt;
  const rngOf = s => { const R = R2.rng(s); return [R, (a, b) => a + (b - a) * R()]; };

  // ---------- shared pieces ----------
  function skyDefs(id, stops) {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  }
  function cloud(x, y, s, seed, light = '#ffe6cc', shade = '#e2a08c') {
    const [R, rr] = rngOf(seed);
    const blobs = Array.from({ length: 7 }, (_, i) => [x + (i - 3) * 46 * s + rr(-10, 10) * s, y - Math.sin(i / 6 * Math.PI) * 50 * s + rr(-8, 8) * s, (38 + Math.sin(i / 6 * Math.PI) * 34 + rr(-6, 6)) * s]);
    let st = '', fl = '', sh = '';
    for (const [cx, cy, r] of blobs) {
      st += `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r + 4)}" fill="${INK}"/>`;
      fl += `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r)}" fill="${light}"/>`;
      sh += `<ellipse cx="${n2(cx + 6 * s)}" cy="${n2(cy + r * 0.45)}" rx="${n2(r * 0.85)}" ry="${n2(r * 0.42)}" fill="${shade}"/>`;
    }
    const base = `<rect x="${n2(x - 170 * s)}" y="${n2(y - 4 * s)}" width="${n2(340 * s)}" height="${n2(36 * s)}" rx="${n2(18 * s)}"`;
    return `<g>${st}${base} fill="${INK}" transform="translate(0 4)"/>${fl}${sh}${base} fill="${shade}"/><path d="M${n2(x - 120 * s)},${n2(y - 40 * s)} q40,-26 90,-12" stroke="#fff6e8" stroke-width="${n2(6 * s)}" fill="none" stroke-linecap="round" opacity=".8"/></g>`;
  }
  function birds(x, y, n, seed) {
    const [R, rr] = rngOf(seed);
    let s = '';
    for (let i = 0; i < n; i++) { const bx = x + rr(-120, 120), by = y + rr(-50, 50), w = rr(10, 18); s += `<path d="M${n2(bx - w)},${n2(by)} q${n2(w / 2)},${n2(-w / 2)} ${n2(w)},0 q${n2(w / 2)},${n2(-w / 2)} ${n2(w)},0" stroke="${INK}" stroke-width="3" fill="none"/>`; }
    return s;
  }
  function mountains(y, w0, w1, h, seed, fill, line) {
    const [R, rr] = rngOf(seed);
    let d = `M${w0},${y + 400} L${w0},${y}`, x = w0;
    while (x < w1) { const pw = rr(120, 260), ph = rr(0.4, 1) * h; d += ` Q${n2(x + pw * 0.35)},${n2(y - ph * 0.9)} ${n2(x + pw / 2)},${n2(y - ph)} Q${n2(x + pw * 0.65)},${n2(y - ph * 0.9)} ${n2(x + pw)},${n2(y - rr(0, 0.2) * h)}`; x += pw; }
    return `<path d="${d} L${w1},${y + 400}Z" fill="${fill}" stroke="${line}" stroke-width="4" stroke-linejoin="round"/>`;
  }
  // Curved Chinese roof with upturned eaves, tiles, round tile ends and ridge ornaments.
  function roof(L, Rx, top, bot, tile = '#3d4b5c', seed = 1) {
    const w = Rx - L, cl = Math.min(60, w * 0.12);
    const d = `M${n2(L - cl)},${n2(bot - cl * 0.9)} Q${n2(L + cl * 0.3)},${n2(bot + 6)} ${n2(L + cl * 1.6)},${n2(bot)} L${n2(Rx - cl * 1.6)},${n2(bot)} Q${n2(Rx - cl * 0.3)},${n2(bot + 6)} ${n2(Rx + cl)},${n2(bot - cl * 0.9)} ` +
      `Q${n2(Rx - w * 0.12)},${n2(top + (bot - top) * 0.62)} ${n2(Rx - w * 0.2)},${n2(top)} L${n2(L + w * 0.2)},${n2(top)} Q${n2(L + w * 0.12)},${n2(top + (bot - top) * 0.62)} ${n2(L - cl)},${n2(bot - cl * 0.9)}Z`;
    const id = `roof${seed}${Math.round(L)}`;
    let s = `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${tile}"/><g clip-path="url(#${id})">`;
    for (let x = L - cl; x < Rx + cl; x += 16) {
      const k = (x - (L + Rx) / 2) / (w / 2), x2 = x + k * cl * 0.9;
      s += `<path d="M${n2(x - k * 4)},${n2(top)} Q${n2(x)},${n2((top + bot) / 2)} ${n2(x2)},${n2(bot)}" stroke="${dk(tile, 0.45)}" stroke-width="5" fill="none"/><path d="M${n2(x + 5 - k * 4)},${n2(top)} Q${n2(x + 5)},${n2((top + bot) / 2)} ${n2(x2 + 5)},${n2(bot)}" stroke="${lt(tile, 0.25)}" stroke-width="2" fill="none"/>`;
    }
    s += `<rect x="${n2(L)}" y="${n2(top)}" width="${n2(w)}" height="${n2((bot - top) * 0.35)}" fill="#000" opacity=".12"/></g>`;
    s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
    for (let x = L + cl * 1.6; x <= Rx - cl * 1.6; x += 18) s += `<circle cx="${n2(x)}" cy="${n2(bot + 4)}" r="7" fill="${lt(tile, 0.15)}" stroke="${INK}" stroke-width="2.5"/>`;
    s += `<rect x="${n2(L + w * 0.2 - 6)}" y="${n2(top - 16)}" width="${n2(w * 0.6 + 12)}" height="22" rx="5" fill="${dk(tile, 0.2)}" stroke="${INK}" stroke-width="4"/>`;
    for (const [x, sgn] of [[L + w * 0.2, -1], [Rx - w * 0.2, 1]]) s += `<path d="M${n2(x)},${n2(top - 14)} q${sgn * 6},-34 ${sgn * 30},-30 q${sgn * -4},10 ${sgn * -14},12 q${sgn * 12},6 ${sgn * 6},22Z" fill="${dk(tile, 0.1)}" stroke="${INK}" stroke-width="3.5"/>`;
    return s;
  }
  function bricks(x, y, w, h, seed, base = '#9c8a74') {
    const [R, rr] = rngOf(seed), id = `br${seed}`;
    let s = `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${base}"/><g clip-path="url(#${id})">`;
    const bh = 30, bw = 66;
    for (let r = 0, yy = y; yy < y + h; yy += bh, r++) {
      s += `<line x1="${x}" y1="${yy}" x2="${x + w}" y2="${yy}" stroke="${dk(base, 0.4)}" stroke-width="3"/>`;
      for (let xx = x + (r % 2) * bw / 2; xx < x + w; xx += bw) {
        s += `<line x1="${n2(xx)}" y1="${yy}" x2="${n2(xx)}" y2="${yy + bh}" stroke="${dk(base, 0.4)}" stroke-width="3"/>`;
        if (R() < 0.18) s += `<rect x="${n2(xx + 2)}" y="${yy + 2}" width="${bw - 4}" height="${bh - 4}" fill="${R() < 0.5 ? dk(base, 0.15) : lt(base, 0.12)}"/>`;
        if (R() < 0.05) s += `<path d="M${n2(xx + rr(10, 50))},${yy + 4} l${n2(rr(-8, 8))},${n2(rr(8, 14))} l${n2(rr(-8, 8))},${n2(rr(6, 12))}" stroke="${dk(base, 0.6)}" stroke-width="2" fill="none"/>`;
      }
    }
    for (let i = 0; i < w / 120; i++) s += `<ellipse cx="${n2(x + rr(0, w))}" cy="${n2(y + h - rr(0, 60))}" rx="${n2(rr(30, 80))}" ry="${n2(rr(10, 24))}" fill="#5a6a3a" opacity=".45"/>`;
    return s + '</g>';
  }
  function tufts(x0, x1, y0, y1, n, seed, col = '#5a6a32') {
    const [R, rr] = rngOf(seed);
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = rr(x0, x1), y = rr(y0, y1), k = 0.6 + (y - y0) / (y1 - y0 + 1) * 0.9;
      s += `<path d="M${n2(x - 12 * k)},${n2(y)} q${n2(4 * k)},${n2(-26 * k)} ${n2(-2 * k)},${n2(-38 * k)} M${n2(x)},${n2(y)} q${n2(2 * k)},${n2(-30 * k)} ${n2(6 * k)},${n2(-46 * k)} M${n2(x + 10 * k)},${n2(y)} q${n2(6 * k)},${n2(-20 * k)} ${n2(16 * k)},${n2(-30 * k)}" stroke="${col}" stroke-width="${n2(4 * k)}" fill="none" stroke-linecap="round"/>`;
    }
    return s;
  }
  function rock(x, y, s, seed) {
    const b = R2.Blob({ cx: x, cy: y, rx: 40 * s, ry: 26 * s, seed, wobble: 0.18 });
    return `<path d="${b.path}" fill="#8a7a66" stroke="${INK}" stroke-width="4"/><path d="M${n2(x - 26 * s)},${n2(y - 8 * s)} q${n2(18 * s)},${n2(-14 * s)} ${n2(36 * s)},${n2(-8 * s)}" stroke="#c8b8a0" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="${n2(x + 10 * s)}" cy="${n2(y + 12 * s)}" rx="${n2(30 * s)}" ry="${n2(8 * s)}" fill="#5a4a3a" opacity=".5"/>`;
  }
  function banner(x, y, h, t, seed, col = '#a82a2a', glyph = '魏') {
    const wave = k => Math.sin(t * 5 + seed + k * 3) * 10 * k;
    const w = h * 0.42, fh = h * 0.38;
    const d = `M${x},${y - h} L${n2(x + w)},${n2(y - h + wave(1))} L${n2(x + w)},${n2(y - h + fh + wave(1))} L${x},${n2(y - h + fh)}Z`;
    return `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - h - 10}" stroke="${INK}" stroke-width="7"/><line x1="${x}" y1="${y}" x2="${x}" y2="${y - h - 10}" stroke="#6a4426" stroke-width="3"/>` +
      `<path d="${d}" fill="${col}" stroke="${INK}" stroke-width="4"/><path d="M${x},${n2(y - h + fh - 8)} L${n2(x + w)},${n2(y - h + fh - 8 + wave(1))}" stroke="#e8c27a" stroke-width="3"/>` +
      `<circle cx="${n2(x + w / 2)}" cy="${n2(y - h + fh / 2 + wave(0.5))}" r="${n2(fh * 0.32)}" fill="#f6e6c0" stroke="${INK}" stroke-width="2"/>` +
      `<text x="${n2(x + w / 2)}" y="${n2(y - h + fh / 2 + wave(0.5) + fh * 0.12)}" font-family="IPAPGothic" font-weight="bold" font-size="${n2(fh * 0.38)}" text-anchor="middle" fill="${INK}">${glyph}</text>`;
  }

  // A marching mass of soldiers: cheap shapes, perspective rows, banners.
  function army({ x0, x1, y0, y1, rows = 7, t = 0, seed = 5, facing = -1, march = 0 }) {
    const [R, rr] = rngOf(seed);
    let s = '';
    for (let r = 0; r < rows; r++) {
      const k = r / (rows - 1), y = y0 + (y1 - y0) * k, sc = 0.35 + k * 0.75, gap = 46 * sc;
      for (let x = x0 + rr(0, gap); x < x1; x += gap * rr(0.9, 1.15)) {
        const bob = Math.abs(Math.sin(t * 6 + x * 0.05)) * 4 * sc * march, xx = x + rr(-6, 6);
        s += `<ellipse cx="${n2(xx)}" cy="${n2(y)}" rx="${n2(20 * sc)}" ry="${n2(5 * sc)}" fill="#000" opacity=".25"/>` +
          `<rect x="${n2(xx - 13 * sc)}" y="${n2(y - 70 * sc - bob)}" width="${n2(26 * sc)}" height="${n2(62 * sc)}" rx="${n2(8 * sc)}" fill="${R() < 0.5 ? '#2a3a6a' : '#22305a'}" stroke="${INK}" stroke-width="${n2(2.5 * sc + 1)}"/>` +
          `<circle cx="${n2(xx)}" cy="${n2(y - 84 * sc - bob)}" r="${n2(15 * sc)}" fill="#ecd3b0" stroke="${INK}" stroke-width="${n2(2.5 * sc + 1)}"/>` +
          `<path d="M${n2(xx - 16 * sc)},${n2(y - 86 * sc - bob)} a${n2(16 * sc)},${n2(16 * sc)} 0 0 1 ${n2(32 * sc)},0Z" fill="#6f7782" stroke="${INK}" stroke-width="${n2(2 * sc + 1)}"/>` +
          `<circle cx="${n2(xx)}" cy="${n2(y - 104 * sc - bob)}" r="${n2(4 * sc)}" fill="#c0282a"/>` +
          `<line x1="${n2(xx + facing * -16 * sc)}" y1="${n2(y - 20 * sc - bob)}" x2="${n2(xx + facing * -10 * sc)}" y2="${n2(y - 170 * sc - bob)}" stroke="${INK}" stroke-width="${n2(3 * sc + 1)}"/>` +
          `<path d="M${n2(xx + facing * -10 * sc)},${n2(y - 170 * sc - bob)} l${n2(4 * sc)},${n2(-14 * sc)} l${n2(-8 * sc)},0Z" fill="#c9ccd2" stroke="${INK}" stroke-width="1.5"/>`;
        if (R() < 0.07) s += banner(xx + 12 * sc, y - 60 * sc - bob, 230 * sc, t, Math.floor(rr(0, 99)), R() < 0.5 ? '#a82a2a' : '#2a3a7a');
      }
    }
    return s;
  }

  // ---------- 1. exterior ----------
  function exterior(seed = 3) {
    const [R, rr] = rngOf(seed);
    const defs = `<defs>${skyDefs('ex-sky', [[0, '#6a78b8'], [0.3, '#b58ab0'], [0.62, '#f2a070'], [1, '#ffdca0']])}
      <radialGradient id="ex-sun"><stop offset="0" stop-color="#fff6d0"/><stop offset=".25" stop-color="#ffe0a0" stop-opacity=".8"/><stop offset="1" stop-color="#ffb070" stop-opacity="0"/></radialGradient>
      ${skyDefs('ex-mist', [[0, '#ffc89a'], [1, '#ffc89a00']])}
      ${skyDefs('ex-field', [[0, '#b8925a'], [1, '#6a4a2a']])}
      ${skyDefs('ex-road', [[0, '#d8b080'], [1, '#b08050']])}
      <linearGradient id="ex-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0e08"/><stop offset="1" stop-color="#3a2414"/></linearGradient></defs>`;
    let sky = defs + `<rect x="-900" y="-600" width="4200" height="2200" fill="url(#ex-sky)"/><circle cx="1650" cy="1040" r="560" fill="url(#ex-sun)"/><circle cx="1650" cy="1050" r="110" fill="#fff2c8" stroke="#ffb070" stroke-width="6"/>`;
    sky += cloud(500, 420, 1.3, 1) + cloud(1500, 300, 1.0, 2) + cloud(2300, 520, 1.4, 3) + cloud(-100, 620, 1.1, 4) + cloud(1000, 640, 0.8, 5, '#ffd8b8', '#d88a7a');
    sky += `<g id="ex-birds">${birds(900, 520, 6, 7)}${birds(1900, 420, 4, 8)}</g>`;
    let far = mountains(1130, -700, 3100, 380, 11, '#b48aa0', '#8a6a88') + mountains(1220, -700, 3100, 260, 12, '#8a6a8c', '#6a4e72') + `<rect x="-900" y="1050" width="4200" height="260" fill="url(#ex-mist)" opacity=".7"/>`;
    // wall + gate tower
    let city = bricks(150, 960, 2100, 430, 21) + `<rect x="150" y="960" width="2100" height="430" fill="none" stroke="${INK}" stroke-width="6"/>`;
    city += `<rect x="130" y="940" width="2140" height="26" fill="#8a7a64" stroke="${INK}" stroke-width="5"/>`;
    for (let x = 150; x < 2240; x += 84) city += `<rect x="${x}" y="888" width="54" height="54" fill="#9c8a74" stroke="${INK}" stroke-width="5"/><rect x="${x + 4}" y="892" width="10" height="46" fill="#c8b8a0" opacity=".5"/>`;
    for (const x of [380, 700, 1720, 2040]) city += `<line x1="${x}" y1="890" x2="${x}" y2="690" stroke="${INK}" stroke-width="9"/><line x1="${x}" y1="890" x2="${x}" y2="690" stroke="#7a5430" stroke-width="4"/><circle cx="${x}" cy="684" r="8" fill="#c8963f" stroke="${INK}" stroke-width="3"/>`;
    // gate arch (doors drawn separately so they can open)
    city += `<path d="M1050,1390 L1050,1220 A150,150 0 0 1 1350,1220 L1350,1390Z" fill="url(#ex-dark)"/>`;
    city += `<g id="ex-inside" opacity="0"><path d="M1120,1390 L1190,1260 L1210,1260 L1280,1390Z" fill="#c8a070" opacity=".7"/><rect x="1150" y="1215" width="100" height="50" fill="#d89060" opacity=".5"/>` +
      `<g fill="${INK}"><rect x="1160" y="1300" width="12" height="34" rx="5"/><circle cx="1166" cy="1294" r="8"/><rect x="1228" y="1312" width="10" height="28" rx="4"/><circle cx="1233" cy="1306" r="7"/></g></g>`;
    city += `<g id="ex-doors"></g>`;
    for (let i = 0; i < 13; i++) { const a = Math.PI * (1 + i / 12), x = 1200 + Math.cos(a) * 170, y = 1220 + Math.sin(a) * 170; city += `<line x1="${n2(1200 + Math.cos(a) * 150)}" y1="${n2(1220 + Math.sin(a) * 150)}" x2="${n2(x)}" y2="${n2(y)}" stroke="${INK}" stroke-width="4"/>`; }
    city += `<path d="M1050,1390 L1050,1220 A150,150 0 0 1 1350,1220 L1350,1390" fill="none" stroke="${INK}" stroke-width="7"/><path d="M1030,1390 L1030,1220 A170,170 0 0 1 1370,1220 L1370,1390" fill="none" stroke="${INK}" stroke-width="5"/>`;
    city += `<rect x="1120" y="1000" width="160" height="60" rx="6" fill="#1d2a50" stroke="#c8963f" stroke-width="6"/><text x="1200" y="1046" font-family="IPAPGothic" font-weight="bold" font-size="44" text-anchor="middle" fill="#e8c27a">西城</text>`;
    // gate tower
    city += `<rect x="960" y="860" width="480" height="40" fill="#8a7a64" stroke="${INK}" stroke-width="5"/>`;
    for (const x of [1010, 1110, 1290, 1390]) city += `<rect x="${x - 12}" y="700" width="24" height="162" fill="#a8322a" stroke="${INK}" stroke-width="4"/><rect x="${x - 8}" y="704" width="6" height="154" fill="#d8644a" opacity=".6"/>`;
    city += `<rect x="990" y="822" width="420" height="10" fill="#7a2a22" stroke="${INK}" stroke-width="3"/>`;
    for (let x = 1000; x <= 1400; x += 25) city += `<line x1="${x}" y1="826" x2="${x}" y2="862" stroke="${INK}" stroke-width="3"/>`;
    city += `<rect x="1000" y="690" width="400" height="22" fill="#2a3a5a" stroke="${INK}" stroke-width="4"/>` + [0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="${1008 + i * 49}" y="694" width="40" height="14" fill="${i % 2 ? '#3f8a7a' : '#c8963f'}"/>`).join('');
    city += roof(930, 1470, 620, 708, '#3d4b5c', 1);
    city += `<rect x="1060" y="560" width="280" height="70" fill="#a8322a" stroke="${INK}" stroke-width="4"/>` + [1090, 1160, 1240, 1310].map(x => `<rect x="${x}" y="572" width="34" height="46" fill="#3a2414" stroke="#c8963f" stroke-width="2"/>`).join('');
    city += roof(1010, 1390, 470, 566, '#3d4b5c', 2);
    city += `<g id="ex-tower-actors"></g>`;
    // ground
    let ground = `<rect x="-900" y="1385" width="4200" height="900" fill="url(#ex-field)"/>`;
    ground += `<path d="M1050,1390 L1350,1390 L1900,2400 L500,2400Z" fill="url(#ex-road)" stroke="${INK}" stroke-width="4"/>`;
    for (const k of [-0.5, 0.5]) ground += `<path d="M${1200 + k * 160},1392 L${1200 + k * 760},2400" stroke="#8a6040" stroke-width="5" opacity=".6"/>`;
    for (let i = 0; i < 40; i++) { const y = rr(1400, 1900); ground += `<ellipse cx="${n2(1200 + rr(-1, 1) * (y - 1380) * 0.6)}" cy="${n2(y)}" rx="${n2(rr(3, 8))}" ry="${n2(rr(2, 4))}" fill="#7a5a3a" opacity=".6"/>`; }
    ground += tufts(-800, 1000, 1400, 1900, 60, 31) + tufts(1420, 3200, 1400, 1900, 60, 32);
    ground += rock(700, 1560, 1, 41) + rock(1760, 1650, 1.3, 42) + rock(300, 1800, 1.6, 43) + rock(2200, 1500, 0.8, 44);
    let near = `<path d="M-900,2160 Q-300,2000 200,2090 T1200,2140 T2200,2060 T3300,2120 L3300,2600 L-900,2600Z" fill="#3a2a1a" stroke="${INK}" stroke-width="5"/>` + tufts(-800, 3200, 2040, 2120, 70, 51, '#2a3a1a');
    near += `<path d="M2500,1960 q-60,-200 -20,-420 M2480,1700 q60,-60 120,-50 M2470,1640 q-70,-50 -110,-30" stroke="${INK}" stroke-width="18" fill="none" stroke-linecap="round"/><path d="M2500,1960 q-60,-200 -20,-420 M2480,1700 q60,-60 120,-50 M2470,1640 q-70,-50 -110,-30" stroke="#4a3424" stroke-width="10" fill="none" stroke-linecap="round"/>`;

    function doors(open) {
      // two leaves hinged at the arch sides; `open` 0..1 swings them inward (foreshortened)
      let s = '';
      for (const side of [-1, 1]) {
        const hinge = 1200 + side * 150, w = 150 * Math.cos(open * Math.PI * 0.45), x = side < 0 ? hinge : hinge - w;
        const shade = open * 0.5, col = mix('#6a2a1a', '#2a100a', shade);
        s += `<g><rect x="${n2(x)}" y="1080" width="${n2(Math.max(2, w))}" height="310" fill="${col}" stroke="${INK}" stroke-width="5"/>`;
        for (let k = 1; k < 5; k++) s += `<line x1="${n2(x + w * k / 5)}" y1="1084" x2="${n2(x + w * k / 5)}" y2="1386" stroke="${dk(col, 0.4)}" stroke-width="3"/>`;
        for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) s += `<circle cx="${n2(x + w * (c + 0.5) / 4)}" cy="${1110 + r * 40}" r="${n2(5 * Math.max(0.3, w / 150))}" fill="#d6ad55" stroke="${INK}" stroke-width="1.5"/>`;
        for (const y of [1130, 1330]) s += `<rect x="${n2(x)}" y="${y}" width="${n2(Math.max(2, w))}" height="12" fill="#3a3a3a" stroke="${INK}" stroke-width="2"/>`;
        const rx = side < 0 ? x + w - 22 * (w / 150) : x + 22 * (w / 150);
        s += `<circle cx="${n2(rx)}" cy="1240" r="${n2(16 * Math.max(0.3, w / 150))}" fill="none" stroke="#d6ad55" stroke-width="5"/><circle cx="${n2(rx)}" cy="1222" r="${n2(9 * Math.max(0.3, w / 150))}" fill="#d6ad55" stroke="${INK}" stroke-width="2"/></g>`;
      }
      // the top of the arch hides the door tops
      return s + `<path d="M1040,1078 L1040,1220 A160,160 0 0 1 1360,1220 L1360,1078Z" fill="#9c8a74" stroke="none"/>`;
    }
    return {
      origin: [1200, 1100],
      layers: [
        { id: 'sky', depth: 0.15, svg: sky }, { id: 'far', depth: 0.4, svg: far },
        { id: 'city', depth: 0.8, svg: city }, { id: 'ground', depth: 1, svg: ground },
        { id: 'army', depth: 1, svg: '' }, { id: 'actors', depth: 1, svg: '' }, { id: 'near', depth: 1.35, svg: near },
      ],
      update(t, o = {}) {
        const $ = id => document.getElementById(id);
        $('ex-doors').innerHTML = doors(o.gateOpen || 0);
        $('ex-inside').setAttribute('opacity', o.gateOpen || 0);
        $('ex-birds').setAttribute('transform', `translate(${(t * 22) % 400 - 100} ${Math.sin(t) * 6})`);
      },
      army,
    };
  }

  // ---------- 2. street ----------
  function street(seed = 4) {
    const [R, rr] = rngOf(seed), VP = [540, 930];
    const defs = `<defs>${skyDefs('st2-sky', [[0, '#7a80c0'], [0.45, '#d898a0'], [0.75, '#f2a874'], [1, '#ffd8a0']])}${skyDefs('st2-ground', [[0, '#b89a74'], [1, '#7a5e40']])}</defs>`;
    let sky = defs + `<rect x="-600" y="-400" width="2300" height="1500" fill="url(#st2-sky)"/>` + cloud(300, 300, 1.0, 9) + cloud(900, 420, 0.8, 10);
    // the gate at the end of the street, small and far
    let far = bricks(260, 760, 560, 200, 33) + `<rect x="260" y="760" width="560" height="200" fill="none" stroke="${INK}" stroke-width="4"/>` + roof(420, 660, 640, 700, '#3d4b5c', 7) +
      `<rect x="440" y="700" width="200" height="60" fill="#a8322a" stroke="${INK}" stroke-width="3"/><path d="M500,960 L500,880 A40,40 0 0 1 580,880 L580,960Z" fill="#e8b070" stroke="${INK}" stroke-width="4"/>`;
    // houses on both sides in one-point perspective
    let houses = '';
    const signs = ['茶', '酒', '米', '書'];
    for (const side of [-1, 1]) {
      for (let i = 3; i >= 0; i--) {
        const k0 = 0.28 + i * 0.2, k1 = k0 + 0.2;                       // depth bands (0 = vanishing point)
        const xa = VP[0] + side * (130 + 900 * k0 * k0), xb = VP[0] + side * (130 + 900 * k1 * k1);
        const ya0 = VP[1] - 260 * k0 - 60, yb0 = VP[1] - 260 * k1 - 120, ya1 = VP[1] + 520 * k0, yb1 = VP[1] + 520 * k1;
        const wall = i % 2 ? '#b07a4a' : '#c08a58';
        houses += `<path d="M${n2(xa)},${n2(ya0)} L${n2(xb)},${n2(yb0)} L${n2(xb)},${n2(yb1)} L${n2(xa)},${n2(ya1)}Z" fill="${wall}" stroke="${INK}" stroke-width="5"/>`;
        for (let g = 1; g < 8; g++) { const f = g / 8, y0 = ya0 + (yb0 - ya0) * 0 + (ya1 - ya0) * f, y1 = yb0 + (yb1 - yb0) * f; houses += `<line x1="${n2(xa)}" y1="${n2(y0)}" x2="${n2(xb)}" y2="${n2(y1)}" stroke="${dk(wall, 0.35)}" stroke-width="2.5" opacity=".6"/>`; }
        // pillars, window lattice, door opening
        for (const f of [0.08, 0.92]) { const x = xa + (xb - xa) * f; houses += `<line x1="${n2(x)}" y1="${n2(ya0 + (yb0 - ya0) * f)}" x2="${n2(x)}" y2="${n2(ya1 + (yb1 - ya1) * f)}" stroke="#7a2a22" stroke-width="${n2(10 + 14 * k0)}"/>`; }
        const wx0 = xa + (xb - xa) * 0.2, wx1 = xa + (xb - xa) * 0.55, wy = (ya0 + yb0) / 2 + 70 * k0;
        houses += `<path d="M${n2(wx0)},${n2(wy)} L${n2(wx1)},${n2(wy - 40 * k0 * side * 0)} L${n2(wx1)},${n2(wy + 110 * k1)} L${n2(wx0)},${n2(wy + 110 * k0)}Z" fill="#3a2414" stroke="${INK}" stroke-width="4"/>`;
        for (let g = 1; g < 4; g++) { const gx = wx0 + (wx1 - wx0) * g / 4; houses += `<line x1="${n2(gx)}" y1="${n2(wy)}" x2="${n2(gx)}" y2="${n2(wy + 110 * (k0 + (k1 - k0) * g / 4))}" stroke="#c8963f" stroke-width="3"/>`; }
        houses += `<line x1="${n2(wx0)}" y1="${n2(wy + 55 * k0)}" x2="${n2(wx1)}" y2="${n2(wy + 55 * k1)}" stroke="#c8963f" stroke-width="3"/>`;
        // shop sign
        const sx = xa + (xb - xa) * 0.75, sy = (ya0 + yb0) / 2 + 30, sh = 110 * k1;
        houses += `<rect x="${n2(sx - sh * 0.22)}" y="${n2(sy)}" width="${n2(sh * 0.44)}" height="${n2(sh)}" fill="#1d2a50" stroke="#c8963f" stroke-width="3"/><text x="${n2(sx)}" y="${n2(sy + sh * 0.68)}" font-family="IPAPGothic" font-weight="bold" font-size="${n2(sh * 0.42)}" text-anchor="middle" fill="#e8c27a">${signs[(i + (side > 0 ? 2 : 0)) % 4]}</text>`;
        // roof eave (sloped toward the street)
        const ex = xa - side * 30 * k0, eb = xb - side * 30 * k1;
        houses += `<path d="M${n2(xa)},${n2(ya0)} L${n2(xb)},${n2(yb0)} L${n2(eb)},${n2(yb0 - 70 * k1)} L${n2(ex)},${n2(ya0 - 70 * k0)}Z" fill="#3d4b5c" stroke="${INK}" stroke-width="5"/>`;
        for (let g = 0; g <= 6; g++) { const f = g / 6, x0 = xa + (xb - xa) * f, y0 = ya0 + (yb0 - ya0) * f, x1 = ex + (eb - ex) * f, y1 = ya0 - 70 * k0 + (yb0 - 70 * k1 - ya0 + 70 * k0) * f; houses += `<line x1="${n2(x0)}" y1="${n2(y0)}" x2="${n2(x1)}" y2="${n2(y1)}" stroke="#2a3440" stroke-width="3"/>`; }
        // hanging lantern
        const lx = xa + (xb - xa) * 0.5 - side * 40 * k1, ly = (ya0 + yb0) / 2 + 10;
        houses += `<g class="st2-lantern" data-x="${n2(lx)}" data-y="${n2(ly - 30 * k1)}"><line x1="${n2(lx)}" y1="${n2(ly - 30 * k1)}" x2="${n2(lx)}" y2="${n2(ly)}" stroke="${INK}" stroke-width="3"/><ellipse cx="${n2(lx)}" cy="${n2(ly + 34 * k1)}" rx="${n2(26 * k1)}" ry="${n2(34 * k1)}" fill="#d8402a" stroke="${INK}" stroke-width="3"/><ellipse cx="${n2(lx - 6 * k1)}" cy="${n2(ly + 26 * k1)}" rx="${n2(8 * k1)}" ry="${n2(14 * k1)}" fill="#ffd27a" opacity=".6"/><line x1="${n2(lx)}" y1="${n2(ly + 68 * k1)}" x2="${n2(lx)}" y2="${n2(ly + 92 * k1)}" stroke="#b8322a" stroke-width="4"/></g>`;
      }
    }
    // paving converging on the vanishing point
    let ground = `<rect x="-700" y="${VP[1] + 30}" width="2500" height="1500" fill="#6a5038"/><path d="M${VP[0] - 130},${VP[1] + 30} L${VP[0] + 130},${VP[1] + 30} L1700,2300 L-620,2300Z" fill="url(#st2-ground)" stroke="${INK}" stroke-width="4"/>`;
    for (let i = -6; i <= 6; i++) ground += `<line x1="${VP[0] + i * 20}" y1="${VP[1] + 30}" x2="${VP[0] + i * 190}" y2="2300" stroke="#6a5038" stroke-width="3" opacity=".7"/>`;
    for (let k = 0.05; k < 1.5; k *= 1.28) { const y = VP[1] + 30 + 1300 * k; ground += `<line x1="-700" y1="${n2(y)}" x2="1800" y2="${n2(y)}" stroke="#6a5038" stroke-width="${n2(2 + k * 3)}" opacity=".6"/>`; }
    for (let i = 0; i < 30; i++) { const y = rr(1100, 1900), x = VP[0] + rr(-1, 1) * (y - VP[1]) * 0.8; ground += `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="${n2(rr(10, 30) * (y - VP[1]) / 900)}" ry="${n2(rr(4, 10) * (y - VP[1]) / 900)}" fill="#9a7e5a" opacity=".6"/>`; }
    let near = `<rect x="-200" y="-200" width="150" height="2400" fill="#5a2a1a" stroke="${INK}" stroke-width="6"/><rect x="1130" y="-200" width="150" height="2400" fill="#5a2a1a" stroke="${INK}" stroke-width="6"/>`;
    near += `<g id="st2-leaves"></g>`;
    const leaves = Array.from({ length: 16 }, () => [rr(-200, 1300), rr(1100, 1900), rr(0, 6.28), rr(0.6, 1.4)]);
    return {
      origin: [540, 1100],
      layers: [{ id: 'sky', depth: 0.15, svg: sky }, { id: 'far', depth: 0.5, svg: far }, { id: 'houses', depth: 0.85, svg: houses }, { id: 'ground', depth: 1, svg: ground }, { id: 'actors', depth: 1, svg: '' }, { id: 'near', depth: 1.4, svg: near }],
      update(t) {
        document.querySelectorAll('.st2-lantern').forEach((e, i) => e.setAttribute('transform', `rotate(${n2(Math.sin(t * 1.6 + i) * 4)} ${e.dataset.x} ${e.dataset.y})`));
        let s = '';
        for (const [x0, y0, ph, sc] of leaves) {
          const x = ((x0 + t * 260 * sc) % 1600) - 250, y = y0 + Math.sin(t * 3 + ph) * 30;
          s += `<path d="M${n2(x)},${n2(y)} q${n2(10 * sc)},${n2(-12 * sc)} ${n2(24 * sc)},0 q${n2(-10 * sc)},${n2(10 * sc)} ${n2(-24 * sc)},0Z" fill="${sc > 1 ? '#c8862a' : '#a86a2a'}" stroke="${INK}" stroke-width="2" transform="rotate(${n2((t * 200 * sc + ph * 50) % 360)} ${n2(x + 12)} ${n2(y)})"/>`;
        }
        document.getElementById('st2-leaves').innerHTML = s;
      },
    };
  }

  // ---------- 3. wall top (side view) ----------
  function walltop(seed = 6) {
    const [R, rr] = rngOf(seed);
    const defs = `<defs>${skyDefs('wt-sky', [[0, '#6a78b8'], [0.35, '#b88aae'], [0.75, '#f2a070'], [1, '#ffdca0']])}
      <radialGradient id="wt-sun"><stop offset="0" stop-color="#fff6d0"/><stop offset=".3" stop-color="#ffe0a0" stop-opacity=".7"/><stop offset="1" stop-color="#ffb070" stop-opacity="0"/></radialGradient>
      ${skyDefs('wt-plain', [[0, '#c8a06a'], [1, '#8a6a42']])}${skyDefs('wt-floor', [[0, '#a89880'], [1, '#7a6a58']])}
      <radialGradient id="wt-smoke"><stop offset="0" stop-color="#f4eee6" stop-opacity=".8"/><stop offset="1" stop-color="#f4eee6" stop-opacity="0"/></radialGradient></defs>`;
    let sky = defs + `<rect x="-800" y="-600" width="2700" height="2000" fill="url(#wt-sky)"/><circle cx="880" cy="1000" r="420" fill="url(#wt-sun)"/><circle cx="880" cy="1010" r="80" fill="#fff2c8" stroke="#ffb070" stroke-width="5"/>` +
      cloud(200, 380, 1.1, 21) + cloud(900, 260, 0.9, 22) + birds(600, 560, 5, 23);
    let far = mountains(1120, -800, 1900, 260, 24, '#9a7a98', '#7a5e82') + `<rect x="-800" y="1100" width="2700" height="600" fill="url(#wt-plain)"/>` +
      `<g id="wt-army"></g>`;
    // stone floor of the wall walk + crenellated parapet beyond (right side looks over the plain)
    let wall = `<rect x="-800" y="1430" width="2700" height="700" fill="url(#wt-floor)" stroke="${INK}" stroke-width="5"/>`;
    for (let x = -800; x < 1900; x += 120) wall += `<line x1="${x}" y1="1430" x2="${x - 60}" y2="2100" stroke="#6a5a48" stroke-width="3"/>`;
    for (const y of [1520, 1650, 1820]) wall += `<line x1="-800" y1="${y}" x2="1900" y2="${y}" stroke="#6a5a48" stroke-width="3"/>`;
    wall += bricks(-800, 1300, 2700, 130, 61, '#a08e78') + `<rect x="-800" y="1300" width="2700" height="130" fill="none" stroke="${INK}" stroke-width="5"/>`;
    for (let x = -780; x < 1900; x += 150) wall += `<rect x="${x}" y="1220" width="90" height="84" fill="#a08e78" stroke="${INK}" stroke-width="5"/><rect x="${x + 6}" y="1226" width="14" height="72" fill="#d0c0a8" opacity=".5"/>`;
    // props on the wall: cushion, low table + guqin, incense burner
    wall += `<ellipse cx="380" cy="1640" rx="150" ry="34" fill="#8a2a2a" stroke="${INK}" stroke-width="5"/><ellipse cx="380" cy="1630" rx="120" ry="20" fill="#a83a32"/>`;
    wall += `<g id="wt-table"><rect x="560" y="1555" width="420" height="26" rx="6" fill="#5a2e1a" stroke="${INK}" stroke-width="5"/>` +
      `<path d="M585,1580 L600,1680 L620,1680 L612,1580Z M935,1580 L950,1680 L970,1680 L962,1580Z" fill="#4a2414" stroke="${INK}" stroke-width="4"/>` +
      P.woodGrain({ x: 562, y: 1557, w: 416, h: 22, seed: 5, knots: 1, color: '#2a1408', op: 0.35 }) + `</g>`;
    wall += `<g id="wt-guqin"></g>`;
    const ix = 1080, iy = 1660;
    wall += `<path d="M${ix - 50},${iy} L${ix - 60},${iy + 50} M${ix + 50},${iy} L${ix + 60},${iy + 50} M${ix},${iy + 10} L${ix},${iy + 54}" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>` +
      `<path d="M${ix - 70},${iy - 70} Q${ix - 80},${iy} ${ix},${iy + 8} Q${ix + 80},${iy} ${ix + 70},${iy - 70}Z" fill="#7a8455" stroke="${INK}" stroke-width="5"/><rect x="${ix - 78}" y="${iy - 82}" width="156" height="16" rx="5" fill="#8c9660" stroke="${INK}" stroke-width="4"/>` +
      `<path d="M${ix - 60},${iy - 40} Q${ix},${iy - 30} ${ix + 60},${iy - 40}" stroke="#d7b25a" stroke-width="4" fill="none"/>` + [-1, 1].map(k => `<path d="M${ix + k * 78},${iy - 70} q${k * 20},-4 ${k * 18},14" stroke="${INK}" stroke-width="8" fill="none"/>`).join('');
    wall += `<g id="wt-smoke"></g>`;
    // foreground: red pillar + overhanging eave (top-left) and a near merlon (bottom-right)
    let near = `<rect x="-120" y="-400" width="110" height="2600" fill="#a8322a" stroke="${INK}" stroke-width="7"/><rect x="-100" y="-400" width="22" height="2600" fill="#d8644a" opacity=".55"/>` +
      roof(-700, 700, -260, -40, '#3d4b5c', 9) + `<rect x="1010" y="1760" width="260" height="400" fill="#8a7a64" stroke="${INK}" stroke-width="7"/>` + bricks(1014, 1764, 252, 392, 77, '#8a7a64');
    return {
      origin: [540, 1100],
      layers: [{ id: 'sky', depth: 0.12, svg: sky }, { id: 'far', depth: 0.35, svg: far }, { id: 'wall', depth: 1, svg: wall }, { id: 'actors', depth: 1, svg: '' }, { id: 'near', depth: 1.4, svg: near }],
      update(t, o = {}) {
        let sm = '';
        for (let i = 0; i < 7; i++) { const k = ((t * 0.35 + i / 7) % 1), x = ix + Math.sin(k * 7 + i) * 30 * k, y = iy - 90 - k * 360; sm += `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(14 + k * 40)}" fill="url(#wt-smoke)" opacity="${n2(1 - k)}"/>`; }
        sm += `<path d="M${ix},${iy - 86} q${n2(Math.sin(t * 2) * 14)},-40 0,-80 q${n2(-Math.sin(t * 2) * 14)},-40 0,-80" stroke="#f4eee6" stroke-width="4" fill="none" opacity=".7"/>`;
        document.getElementById('wt-smoke').innerHTML = sm;
        document.getElementById('wt-guqin').innerHTML = guqin(560, 1556, 420, o.pluck || 0, t);
        document.getElementById('wt-army').innerHTML = army({ x0: -400, x1: 1700, y0: 1150, y1: 1230, rows: 4, t, seed: 9, march: o.march || 0, facing: -1 }).replace(/<g/, '<g');
      },
    };
  }

  // Guqin zither: lacquered body, 7 strings, 13 mother-of-pearl studs; `pluck` makes strings vibrate.
  function guqin(x, y, w, pluck, t) {
    const h = 34;
    let s = `<path d="M${x + 10},${y - 4} Q${x},${y - h} ${x + 40},${y - h - 6} L${x + w - 30},${y - h + 6} Q${x + w},${y - h + 4} ${x + w - 4},${y - 4}Z" fill="#2a1a14" stroke="${INK}" stroke-width="5"/>`;
    s += `<path d="M${x + 40},${y - h} L${x + w - 40},${y - h + 8}" stroke="#6a4a3a" stroke-width="4"/>`;
    for (let i = 0; i < 13; i++) s += `<circle cx="${n2(x + 70 + i * (w - 140) / 12)}" cy="${n2(y - h + 2 + i * 0.6)}" r="3.5" fill="#f2efe6"/>`;
    for (let k = 0; k < 7; k++) {
      const yy = y - h + 6 + k * 3.4, amp = pluck * Math.sin(t * 90 + k * 1.7) * 3;
      s += `<path d="M${x + 30},${n2(yy)} Q${n2(x + w / 2)},${n2(yy + amp)} ${x + w - 30},${n2(yy + 6)}" stroke="#f2e6c0" stroke-width="1.6" fill="none"/>`;
    }
    s += `<rect x="${x + w - 30}" y="${y - h - 4}" width="18" height="30" rx="4" fill="#c8963f" stroke="${INK}" stroke-width="3"/><path d="M${x + w - 12},${y - h + 20} q14,20 2,44" stroke="#b8322a" stroke-width="5" fill="none"/>`;
    return s;
  }

  root.City = { exterior, street, walltop, army, guqin, banner, roof, cloud };
})(typeof window !== 'undefined' ? window : globalThis);
