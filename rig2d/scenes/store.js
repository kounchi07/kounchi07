/*
 * Sets and props for "Why prices end in .99" (stories/ninetynine). 1080x1920, same ink style as the kit.
 *   Store.oldStore()    1880s general store: plank wall, shelves of goods, window, oil lamps, counter + register
 *   Store.aisle()       modern supermarket aisle in perspective (shelves, price labels, ceiling lights, camera)
 *   Store.checkout()    modern checkout: belt, card machine, screen, receipt printer, framed portrait on the wall
 *   Store.bigTag()      a giant price tag over a blurred aisle (the "left to right" explanation)
 *   Store.scale()       a brass balance scale on a counter
 * Each returns { layers: [{ id, depth, svg }], origin, update(t, opts), light } like scenes/city.js;
 * `light` is the set's light for Light.render (source = the lamp/window/ceiling in that set).
 * Props: Store.register, Store.bill, Store.penny, Store.tag, Store.cashbox, Store.spike, Store.ledger.
 */
(function (root) {
  'use strict';
  const R2 = root.Rig2D, P = root.Props;
  const INK = '#2b1d16';
  const n2 = v => +(+v).toFixed(2);
  const mix = (a, b, k) => P.mix(a, b, k), dk = P.dk, lt = P.lt;
  const rngOf = s => { const R = R2.rng(s); return [R, (a, b) => a + (b - a) * R()]; };
  const grad = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;
  const SERIF = `font-family="DejaVu Serif, serif" font-weight="700"`, SANS = `font-family="Inter, DejaVu Sans, sans-serif" font-weight="900"`;

  // ---------- props ----------
  // Brass cash register, origin = bottom center. open 0..1 slides the drawer out, flag 0..1 pops the sale flag,
  // ding 0..1 shakes the bell and draws ring lines. text = what the flag window shows.
  function register({ x, y, s = 1, open = 0, flag = 0, ding = 0, text = '99¢', id = 'reg' }) {
    const D = root.Detail, brass = '#c8963f', brassD = dk(brass, 0.4), brassL = lt(brass, 0.5), wood = '#5a3418';
    let g = `<defs>${grad(id + '-b', [[0, brassL], [0.3, brass], [0.75, dk(brass, 0.15)], [1, brassD]], 1, 0)}${grad(id + '-t', [[0, brassL], [1, brassD]])}${grad(id + '-w', [[0, '#7a4a24'], [1, '#3a2010']])}</defs>`;
    g += D.ao(0, 4, 400, 44, 0.55);
    // wooden plinth with the cash drawer (slides toward the camera = down)
    const dy = open * 46;
    g += `<rect x="-182" y="-78" width="364" height="78" rx="6" fill="url(#${id}-w)" stroke="${INK}" stroke-width="6"/>` + D.planks(-180, -76, 360, 74, { vertical: false, width: 37, seed: 4, dark: '#2a1408', light: '#a86a3a' });
    for (const k of [-1, 1]) g += `<rect x="${k * 182 - (k > 0 ? 18 : 0)}" y="-8" width="18" height="12" rx="3" fill="${brassD}" stroke="${INK}" stroke-width="3"/>`;
    if (open > 0.05) {
      g += `<rect x="-160" y="${n2(-72 + dy - 34 * open)}" width="320" height="${n2(34 * open + 2)}" fill="#2a1408" stroke="${INK}" stroke-width="4"/>`;
      for (let i = 0; i < 5; i++) {
        g += `<rect x="${-152 + i * 61}" y="${n2(-70 + dy - 32 * open)}" width="57" height="${n2(30 * open)}" fill="#4a2a14" stroke="${INK}" stroke-width="2"/>`;
        for (let j = 0; j < 3; j++) g += `<ellipse cx="${-124 + i * 61 + (j - 1) * 8}" cy="${n2(-72 + dy - 14 * open - j * 3)}" rx="19" ry="${n2(6 * open + 1)}" fill="${['#c8743a', '#d8d8e0', '#c8743a', '#e0c070', '#d8d8e0'][i]}" stroke="${INK}" stroke-width="2"/>`;
      }
    }
    g += `<rect x="-166" y="${n2(-66 + dy)}" width="332" height="58" rx="5" fill="url(#${id}-w)" stroke="${INK}" stroke-width="5"/>` +
      `<rect x="-60" y="${n2(-46 + dy)}" width="120" height="16" rx="7" fill="${brass}" stroke="${INK}" stroke-width="3"/><path d="M-50,${n2(-42 + dy)} H50" stroke="${brassL}" stroke-width="3"/>` +
      `<circle cx="120" cy="${n2(-38 + dy)}" r="8" fill="${brassD}" stroke="${INK}" stroke-width="3"/><path d="M120,${n2(-38 + dy)} v8" stroke="${INK}" stroke-width="3"/>` + D.wear(-160, -62 + dy, 320, 50, 9, { n: 8 });
    // ornate brass body
    g += `<path d="M-172,-78 L-154,-262 L154,-262 L172,-78Z" fill="url(#${id}-b)" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`;
    g += `<path d="M-160,-92 L-146,-248 L146,-248 L160,-92Z" fill="none" stroke="${brassD}" stroke-width="4"/>`;
    for (const k of [-1, 1]) {
      g += `<path d="M${k * 150},-100 q${k * -34},-40 0,-78 q${k * 34},-38 0,-70" stroke="${brassD}" stroke-width="5" fill="none"/><circle cx="${k * 132}" cy="-176" r="10" fill="none" stroke="${brassD}" stroke-width="4"/><circle cx="${k * 132}" cy="-176" r="4" fill="${brassD}"/>`;
      g += `<path d="M${k * 140},-238 q${k * -18},20 ${k * -6},40" stroke="${brassL}" stroke-width="3" fill="none" opacity=".8"/>`;
    }
    // sign plate + keys on stems in 3 rows (each key: stem, cap, number)
    g += `<rect x="-112" y="-102" width="224" height="22" rx="4" fill="#f2ead8" stroke="${INK}" stroke-width="3"/><text x="0" y="-86" text-anchor="middle" font-size="13" ${SERIF} fill="${INK}" letter-spacing="2">AMOUNT PURCHASED</text>`;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
      const kx = -100 + c * 40, ky = -124 - r * 38, val = ['5¢', '10', '25', '50', '$1', '$5'][c];
      g += `<path d="M${kx},${ky + 4} v14" stroke="${brassD}" stroke-width="5"/><circle cx="${kx}" cy="${ky}" r="15" fill="#f2ead8" stroke="${INK}" stroke-width="3"/>` +
        `<circle cx="${kx}" cy="${ky}" r="11" fill="none" stroke="#c8b898" stroke-width="2"/><text x="${kx}" y="${ky + 4}" text-anchor="middle" font-size="11" ${SANS} fill="${INK}">${r === 0 ? val : (r === 1 ? c + 1 : c * 10)}</text>` +
        `<path d="M${kx - 7},${ky - 8} q5,-4 11,-2" stroke="#fff" stroke-width="2.4" fill="none" opacity=".8"/>`;
    }
    // top box: glass window with number tabs, crest on top
    g += `<rect x="-128" y="-350" width="256" height="92" rx="10" fill="url(#${id}-t)" stroke="${INK}" stroke-width="7"/>` + D.engrave(-120, -350, 240, 22, 5, { n: 4, color: brassD }) +
      `<rect x="-96" y="-332" width="192" height="58" rx="6" fill="#241a12" stroke="${INK}" stroke-width="4"/>` +
      `<text x="0" y="-292" text-anchor="middle" font-size="34" ${SANS} fill="#f2d890">${flag > 0.5 ? text : '0.00'}</text>` + D.glass(-96, -332, 192, 58, { op: 0.35 }) +
      `<path d="M-60,-350 Q0,-400 60,-350Z" fill="url(#${id}-t)" stroke="${INK}" stroke-width="6"/><circle cx="0" cy="-366" r="10" fill="${brassL}" stroke="${INK}" stroke-width="4"/>`;
    // crank with wooden handle
    g += `<path d="M172,-170 h40 v-58" stroke="${INK}" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M172,-170 h40 v-58" stroke="${brass}" stroke-width="7" fill="none" stroke-linecap="round"/>` +
      `<rect x="200" y="-262" width="24" height="40" rx="10" fill="#6a3a1c" stroke="${INK}" stroke-width="4"/><circle cx="182" cy="-170" r="12" fill="${brass}" stroke="${INK}" stroke-width="4"/>`;
    // pop-up flag
    if (flag > 0) {
      const fy = -350 - 74 * Math.min(1, flag);
      g += `<path d="M0,${n2(fy + 58)} V-350" stroke="${brassD}" stroke-width="6"/><rect x="-60" y="${n2(fy)}" width="120" height="60" rx="6" fill="#f6efe2" stroke="${INK}" stroke-width="5"/>` +
        `<rect x="-52" y="${n2(fy + 7)}" width="104" height="46" rx="4" fill="none" stroke="#b8322a" stroke-width="2"/><text x="0" y="${n2(fy + 42)}" text-anchor="middle" font-size="30" ${SANS} fill="#b8322a">SALE</text>`;
    }
    // bell on a little post
    const sh = Math.sin(ding * 40) * 6 * ding;
    g += `<path d="M-160,-262 v-14" stroke="${INK}" stroke-width="6"/><g transform="translate(${n2(-160 + sh)} -276)"><path d="M-24,0 Q-24,-36 0,-36 Q24,-36 24,0Z" fill="${brassL}" stroke="${INK}" stroke-width="5"/><path d="M-26,0 H26" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><circle cx="0" cy="-40" r="6" fill="${brass}" stroke="${INK}" stroke-width="3"/><path d="M-12,-26 q4,-6 10,-6" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/></g>`;
    if (ding > 0.05) for (let i = 0; i < 3; i++) {
      const a = -2.4 + i * 0.5, r0 = 42 + 10 * (1 - ding), r1 = r0 + 32;
      g += `<path d="M${n2(-160 + Math.cos(a) * r0)},${n2(-294 + Math.sin(a) * r0)} L${n2(-160 + Math.cos(a) * r1)},${n2(-294 + Math.sin(a) * r1)}" stroke="${INK}" stroke-width="7" stroke-linecap="round" opacity="${n2(ding)}"/>`;
    }
    // light: highlight streaks, wear
    g += `<path d="M-128,-246 L-146,-104" stroke="#fff6d8" stroke-width="12" stroke-linecap="round" opacity=".45"/><path d="M-108,-246 L-118,-200" stroke="#fff6d8" stroke-width="5" stroke-linecap="round" opacity=".4"/>` +
      D.wear(-150, -250, 300, 160, 21, { n: 10, op: 0.8 });
    return `<g transform="translate(${n2(x)} ${n2(y)}) scale(${s})">${g}</g>`;
  }

  function bill({ x, y, s = 1, rot = 0 }) {
    return `<g transform="translate(${n2(x)} ${n2(y)}) rotate(${rot}) scale(${s})"><rect x="-110" y="-48" width="220" height="96" rx="6" fill="#9cc79a" stroke="${INK}" stroke-width="5"/>` +
      `<rect x="-100" y="-38" width="200" height="76" rx="4" fill="none" stroke="#4a7a4a" stroke-width="3"/><ellipse cx="0" cy="0" rx="30" ry="34" fill="#c8e0c0" stroke="#3a6a3a" stroke-width="3"/>` +
      `<circle cx="0" cy="-6" r="12" fill="#5a8a5a"/><path d="M-16,22 Q0,6 16,22" fill="#5a8a5a"/>` +
      `<text x="-78" y="-12" font-size="26" ${SERIF} fill="#2a5a2a">1</text><text x="70" y="30" font-size="26" ${SERIF} fill="#2a5a2a">1</text><text x="62" y="-14" font-size="13" ${SERIF} fill="#2a5a2a">ONE</text></g>`;
  }

  function penny({ x, y, r = 34, rot = 0, squash = 1 }) {
    return `<g transform="translate(${n2(x)} ${n2(y)}) rotate(${rot}) scale(${squash} 1)"><circle r="${r}" fill="#c8743a" stroke="${INK}" stroke-width="${n2(r * 0.14)}"/>` +
      `<circle r="${n2(r * 0.78)}" fill="none" stroke="#9a4a1a" stroke-width="${n2(r * 0.06)}"/><path d="M${n2(-r * 0.3)},${n2(r * 0.45)} q${n2(-r * 0.1)},${n2(-r * 0.5)} ${n2(r * 0.15)},${n2(-r * 0.8)} q${n2(r * 0.35)},0 ${n2(r * 0.35)},${n2(r * 0.4)} q0,${n2(r * 0.25)} ${n2(-r * 0.15)},${n2(r * 0.4)}Z" fill="#9a4a1a"/>` +
      `<path d="M${n2(-r * 0.55)},${n2(-r * 0.45)} q${n2(r * 0.3)},${n2(-r * 0.25)} ${n2(r * 0.6)},${n2(-r * 0.22)}" stroke="#f0b080" stroke-width="${n2(r * 0.1)}" fill="none" stroke-linecap="round"/></g>`;
  }

  // Paper price tag on a string. text e.g. '$1.00' or '99¢'; hl 0..1 glows it.
  function tag({ x, y, text, s = 1, rot = 0, color = '#f6efdc', ink = '#b8322a', hl = 0, string = true }) {
    let g = string ? `<path d="M-92,-6 Q-130,-80 -100,-160" stroke="#8a6a4a" stroke-width="4" fill="none"/>` : '';
    if (hl > 0) g += `<ellipse cx="0" cy="0" rx="150" ry="90" fill="#fff2b0" opacity="${n2(0.55 * hl)}"/>`;
    g += `<path d="M-70,-52 L110,-52 Q122,-52 122,-40 L122,40 Q122,52 110,52 L-70,52 L-112,0Z" fill="${color}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>` +
      `<circle cx="-84" cy="0" r="9" fill="#c8b89a" stroke="${INK}" stroke-width="4"/>` +
      `<text x="22" y="18" text-anchor="middle" font-size="${text.length > 4 ? 46 : 54}" ${SERIF} fill="${ink}">${text}</text>`;
    return `<g transform="translate(${n2(x)} ${n2(y)}) rotate(${rot}) scale(${s})">${g}</g>`;
  }

  function cashbox({ x, y, s = 1, coins = 2 }) {
    let g = `<path d="M-120,-70 L120,-70 L130,0 L-130,0Z" fill="#6a3a1c" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>` +
      `<path d="M-120,-70 L-100,-170 L140,-170 L120,-70Z" fill="#8a4e26" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>` +
      `<rect x="-104" y="-66" width="208" height="16" fill="#2a1408"/>`;
    for (let i = 0; i < coins; i++) g += `<ellipse cx="${-50 + i * 60}" cy="-58" rx="18" ry="6" fill="#d8d8e0" stroke="${INK}" stroke-width="2"/>`;
    g += P.woodGrain({ x: -120, y: -66, w: 240, h: 60, seed: 3, knots: 0, color: '#2a1408', op: 0.3 });
    return `<g transform="translate(${n2(x)} ${n2(y)}) scale(${s})">${g}</g>`;
  }

  function spike({ x, y, s = 1, slips = 0 }) {
    let g = `<ellipse cx="0" cy="0" rx="50" ry="14" fill="#3a3a3a" stroke="${INK}" stroke-width="5"/><path d="M0,-4 L0,-180" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M0,-4 L0,-176" stroke="#9a9aa0" stroke-width="4"/>`;
    for (let i = 0; i < slips; i++) g += `<rect x="-46" y="${-40 - i * 14}" width="92" height="10" fill="#f6efe2" stroke="${INK}" stroke-width="3" transform="rotate(${(i % 2 ? 4 : -5)} 0 ${-35 - i * 14})"/>`;
    return `<g transform="translate(${n2(x)} ${n2(y)}) scale(${s})">${g}</g>`;
  }

  // Open ledger; rows 0..1 = how much of the page is filled with entries (ticks)
  function ledger({ x, y, s = 1, rows = 0, t = 0 }) {
    let g = `<path d="M-230,0 L-220,-300 Q-110,-320 0,-292 Q110,-320 220,-300 L230,0 Q110,-24 0,6 Q-110,-24 -230,0Z" fill="#6a2a22" stroke="${INK}" stroke-width="6"/>` +
      `<path d="M-212,-14 L-204,-286 Q-100,-304 0,-280 L0,-8 Q-100,-34 -212,-14Z M212,-14 L204,-286 Q100,-304 0,-280 L0,-8 Q100,-34 212,-14Z" fill="#f6efdc" stroke="${INK}" stroke-width="4"/>`;
    for (let i = 0; i < 9; i++) {
      const yy = -252 + i * 27;
      g += `<path d="M-190,${yy} L-16,${yy + 4} M16,${yy + 4} L190,${yy}" stroke="#9ab0d0" stroke-width="2"/>`;
      if (i < Math.round(rows * 9)) g += `<path d="M-170,${yy - 4} l10,10 l18,-20" stroke="#2a6a3a" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M-130,${yy} h${70 + (i * 37) % 60}" stroke="#3a3a6a" stroke-width="4" stroke-linecap="round"/><text x="150" y="${yy}" font-size="18" ${SERIF} fill="#3a3a6a" text-anchor="end">.99</text>`;
    }
    g += `<path d="M0,-280 L0,-8" stroke="${INK}" stroke-width="4"/>`;
    return `<g transform="translate(${n2(x)} ${n2(y)}) scale(${s})">${g}</g>`;
  }

  // ---------- shelf goods (every item: contact shadow, form shading, highlight, readable label) ----------
  const CANDY = ['#e84a5a', '#f2b23a', '#5ab4e8', '#7ad06a', '#e87ad0', '#f6efe2'];
  const OLD_WORDS = ['FLOUR', 'SUGAR', 'COFFEE', 'TEA', 'OATS', 'SOAP', 'SALT', 'RICE', 'BEANS', 'COCOA', 'LARD', 'MOLASSES'];
  function goodsRow(x0, x1, y, h, seed, modern = false) {
    const D = root.Detail, [R, rr] = rngOf(seed);
    let s = '', x = x0, k = 0;
    while (x < x1 - 40) {
      const kind = modern ? Math.floor(R() * 3) : Math.floor(R() * 6), w = rr(52, 80), hh = h * rr(0.62, 0.95), col = CANDY[Math.floor(R() * CANDY.length)];
      const word = OLD_WORDS[Math.floor(R() * OLD_WORDS.length)], sd = seed * 100 + k++;
      s += D.ao(x + w / 2, y - 2, w * 1.25, 14, 0.5);
      if (!modern && kind === 0) {           // glass candy jar: candy inside, ridged metal lid, paper label, reflections
        s += `<path d="M${n2(x)},${n2(y)} V${n2(y - hh + 16)} Q${n2(x)},${n2(y - hh + 4)} ${n2(x + 12)},${n2(y - hh + 2)} H${n2(x + w - 12)} Q${n2(x + w)},${n2(y - hh + 4)} ${n2(x + w)},${n2(y - hh + 16)} V${n2(y)}Z" fill="#dff0f2" fill-opacity=".5" stroke="${INK}" stroke-width="4"/>`;
        for (let i = 0; i < 16; i++) s += `<circle cx="${n2(x + 9 + R() * (w - 18))}" cy="${n2(y - 7 - R() * hh * 0.58)}" r="${n2(rr(4.5, 7.5))}" fill="${CANDY[Math.floor(R() * 5)]}" stroke="${INK}" stroke-width="1"/>`;
        if (R() < 0.5) for (let i = 0; i < 3; i++) { const sx = x + 12 + i * (w - 24) / 2; s += `<path d="M${n2(sx)},${n2(y - 6)} L${n2(sx + rr(-8, 8))},${n2(y - hh * 0.8)}" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M${n2(sx)},${n2(y - 6)} L${n2(sx + rr(-8, 8))},${n2(y - hh * 0.8)}" stroke="#e84a5a" stroke-width="7" stroke-dasharray="6 6" stroke-linecap="round"/>`; }
        s += `<rect x="${n2(x + 5)}" y="${n2(y - hh - 12)}" width="${n2(w - 10)}" height="16" rx="4" fill="#b8a27a" stroke="${INK}" stroke-width="3"/>` +
          Array.from({ length: Math.floor((w - 14) / 6) }, (_, i) => `<path d="M${n2(x + 9 + i * 6)},${n2(y - hh - 9)} v10" stroke="#7a6440" stroke-width="1.6"/>`).join('') +
          D.label(x + w * 0.16, y - hh * 0.62, w * 0.68, hh * 0.24, { seed: sd, words: ['CANDY', 'DROPS', 'MINTS', 'TAFFY'], bg: '#f6efe2', ink: '#8a2e2a', emblem: false }) +
          D.glass(x, y - hh, w, hh, { op: 0.6 });
      } else if (!modern && kind === 1) {    // tin can: rims, label, shading, shine
        s += `<rect x="${n2(x)}" y="${n2(y - hh)}" width="${n2(w)}" height="${n2(hh)}" fill="${col}" stroke="${INK}" stroke-width="4"/>` +
          D.label(x + 2, y - hh * 0.76, w - 4, hh * 0.46, { seed: sd, words: [word], bg: '#f6efe2', ink: dk(col, 0.45) }) +
          `<path d="M${n2(x)},${n2(y - hh + 7)} H${n2(x + w)} M${n2(x)},${n2(y - 7)} H${n2(x + w)}" stroke="${dk(col, 0.4)}" stroke-width="3"/>` +
          D.shade(x, y - hh, w, hh, { side: 1, op: 0.3, band: 0.28, ew: 5, eop: 0.55 });
      } else if (!modern && kind === 2) {    // burlap sack: weave, tied top, stencil
        const top = y - hh;
        s += `<path d="M${n2(x)},${n2(y)} Q${n2(x - 6)},${n2(y - hh * 0.55)} ${n2(x + 8)},${n2(top + 18)} L${n2(x + w * 0.3)},${n2(top + 8)} L${n2(x + w * 0.5)},${n2(top)} L${n2(x + w * 0.7)},${n2(top + 8)} L${n2(x + w - 8)},${n2(top + 18)} Q${n2(x + w + 6)},${n2(y - hh * 0.55)} ${n2(x + w)},${n2(y)}Z" fill="#d8c49a" stroke="${INK}" stroke-width="4"/>`;
        for (let i = 1; i < 6; i++) s += `<path d="M${n2(x + 4)},${n2(top + 20 + i * (hh - 24) / 6)} H${n2(x + w - 4)}" stroke="#a88a5a" stroke-width="1.5" opacity=".6"/>`;
        for (let i = 1; i < 5; i++) s += `<path d="M${n2(x + i * w / 5)},${n2(top + 20)} V${n2(y - 4)}" stroke="#a88a5a" stroke-width="1.5" opacity=".5"/>`;
        s += `<path d="M${n2(x + w * 0.28)},${n2(top + 16)} q${n2(w * 0.22)},8 ${n2(w * 0.44)},0" stroke="#7a5a2a" stroke-width="4" fill="none"/>` +
          `<text x="${n2(x + w / 2)}" y="${n2(y - hh * 0.38)}" text-anchor="middle" font-size="${n2(Math.min(15, w / 5))}" font-family="DejaVu Sans" font-weight="700" fill="#5a3a1a" opacity=".85">${word}</text>` +
          D.shade(x, top + 16, w, hh - 16, { side: 1, op: 0.25, edge: false });
      } else if (!modern && kind === 3) {    // bottle with liquid, cork, label
        const lc = ['#4a7a3a', '#7a3a2a', '#3a5a8a', '#8a6a2a'][Math.floor(R() * 4)];
        const d = `M${n2(x + w * 0.2)},${n2(y)} L${n2(x + w * 0.2)},${n2(y - hh * 0.6)} Q${n2(x + w * 0.2)},${n2(y - hh * 0.75)} ${n2(x + w * 0.4)},${n2(y - hh * 0.8)} L${n2(x + w * 0.4)},${n2(y - hh)} L${n2(x + w * 0.6)},${n2(y - hh)} L${n2(x + w * 0.6)},${n2(y - hh * 0.8)} Q${n2(x + w * 0.8)},${n2(y - hh * 0.75)} ${n2(x + w * 0.8)},${n2(y - hh * 0.6)} L${n2(x + w * 0.8)},${n2(y)}Z`;
        s += `<path d="${d}" fill="${lc}" stroke="${INK}" stroke-width="4"/><rect x="${n2(x + w * 0.38)}" y="${n2(y - hh - 10)}" width="${n2(w * 0.24)}" height="14" rx="3" fill="#b88a5a" stroke="${INK}" stroke-width="3"/>` +
          D.label(x + w * 0.22, y - hh * 0.5, w * 0.56, hh * 0.26, { seed: sd, words: ['TONIC', 'OIL', 'VINEGAR', 'SODA'], bg: '#f2e6c8', ink: dk(lc, 0.3), emblem: false }) +
          D.glass(x + w * 0.2, y - hh * 0.62, w * 0.6, hh * 0.6, { op: 0.5 });
      } else if (!modern && kind === 4) {    // cracker box with printed front
        s += `<rect x="${n2(x)}" y="${n2(y - hh * 0.8)}" width="${n2(w)}" height="${n2(hh * 0.8)}" fill="${col}" stroke="${INK}" stroke-width="4"/>` +
          D.label(x + w * 0.1, y - hh * 0.66, w * 0.8, hh * 0.42, { seed: sd, words: ['CRACKERS', 'BISCUIT', 'MATCHES', 'TOBACCO'], bg: '#fff8e8', ink: dk(col, 0.5) }) +
          `<path d="M${n2(x)},${n2(y - hh * 0.8 + 10)} H${n2(x + w)}" stroke="${dk(col, 0.35)}" stroke-width="3"/>` + D.shade(x, y - hh * 0.8, w, hh * 0.8, { side: 1, op: 0.28 });
      } else if (!modern) {                  // stacked round tins
        const th = hh * 0.3;
        for (let j = 0; j < 3; j++) {
          const ty = y - th * (j + 1), tw = w * (1 - j * 0.08), tx = x + (w - tw) / 2, c2 = CANDY[(Math.floor(R() * 5))];
          s += `<rect x="${n2(tx)}" y="${n2(ty)}" width="${n2(tw)}" height="${n2(th)}" rx="4" fill="${c2}" stroke="${INK}" stroke-width="3"/><path d="M${n2(tx)},${n2(ty + 6)} H${n2(tx + tw)}" stroke="${dk(c2, 0.35)}" stroke-width="2.5"/>` +
            `<text x="${n2(tx + tw / 2)}" y="${n2(ty + th * 0.75)}" text-anchor="middle" font-size="${n2(th * 0.42)}" font-family="DejaVu Serif" font-weight="700" fill="#fff8e8">${['TEA', 'MINT', 'WAX', 'PINS'][j % 4]}</text>` + D.shade(tx, ty, tw, th, { side: 1, op: 0.25, edge: false });
        }
      } else {                              // modern goods: printed boxes, bottles, bags with labels
        if (kind === 0) s += `<rect x="${n2(x)}" y="${n2(y - hh)}" width="${n2(w)}" height="${n2(hh)}" rx="4" fill="${col}" stroke="${INK}" stroke-width="3"/>` + D.label(x + 6, y - hh * 0.72, w - 12, hh * 0.38, { seed: sd, words: ['CRUNCH', 'OATY', 'YUM', 'SNAX', 'MEGA'], bg: '#fff', ink: dk(col, 0.4) }) + D.shade(x, y - hh, w, hh, { side: 1, op: 0.25 });
        else if (kind === 1) s += `<path d="M${n2(x + 6)},${n2(y)} L${n2(x + 6)},${n2(y - hh * 0.7)} Q${n2(x + w / 2)},${n2(y - hh * 0.85)} ${n2(x + w * 0.4)},${n2(y - hh)} L${n2(x + w * 0.6)},${n2(y - hh)} Q${n2(x + w / 2)},${n2(y - hh * 0.85)} ${n2(x + w - 6)},${n2(y - hh * 0.7)} L${n2(x + w - 6)},${n2(y)}Z" fill="${col}" stroke="${INK}" stroke-width="3"/>` + D.label(x + 10, y - hh * 0.55, w - 20, hh * 0.26, { seed: sd, words: ['FIZZ', 'COLA', 'ZEST'], bg: '#fff', ink: dk(col, 0.4), emblem: false }) + D.glass(x + 6, y - hh * 0.7, w - 12, hh * 0.65, { op: 0.45 });
        else s += `<path d="M${n2(x)},${n2(y)} L${n2(x + 4)},${n2(y - hh)} L${n2(x + w - 4)},${n2(y - hh)} L${n2(x + w)},${n2(y)}Z" fill="${col}" stroke="${INK}" stroke-width="3"/><path d="M${n2(x + 4)},${n2(y - hh + 10)} L${n2(x + w - 4)},${n2(y - hh + 10)}" stroke="${INK}" stroke-width="3"/>` + D.label(x + 8, y - hh * 0.62, w - 16, hh * 0.32, { seed: sd, words: ['CHIPS', 'POPS', 'BITES'], bg: '#fff', ink: dk(col, 0.4) });
      }
      x += w + rr(5, 14);
    }
    return s;
  }

  // A shelf board: trim, brackets with screws, shadow cast on the wall below
  function shelf(x0, x1, y) {
    const D = root.Detail, id = `shf${Math.round(y)}`;
    let s = `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140a06" stop-opacity=".45"/><stop offset="1" stop-color="#140a06" stop-opacity="0"/></linearGradient>` +
      `<rect x="${x0}" y="${y + 38}" width="${x1 - x0}" height="60" fill="url(#${id})"/>`;
    for (let bx = x0 + 120; bx < x1; bx += 360) s += `<path d="M${bx},${y + 36} L${bx},${y + 86} L${bx + 14},${y + 86} L${bx + 14},${y + 52} L${bx + 50},${y + 36}Z" fill="#3a2a1a" stroke="${INK}" stroke-width="4"/>` + D.screws([[bx + 7, y + 74]], 4);
    s += `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="24" fill="#a86a3a" stroke="${INK}" stroke-width="6"/><rect x="${x0}" y="${y + 24}" width="${x1 - x0}" height="14" fill="#5a3418" stroke="${INK}" stroke-width="4"/>` +
      D.edge(x0 + 6, y + 6, x1 - 6, y + 6, { op: 0.45, w: 4 }) + D.wear(x0, y + 2, x1 - x0, 34, Math.round(y), { n: 12 });
    return s;
  }

  // ---------- 1880s general store ----------
  function clock(x, y, r) {
    const D = root.Detail;
    let s = D.ao(x + 8, y + r * 0.9, r * 1.6, r * 0.3, 0.3) + `<circle cx="${x}" cy="${y}" r="${r + 14}" fill="#5a3418" stroke="${INK}" stroke-width="6"/><circle cx="${x}" cy="${y}" r="${r}" fill="#f6efdc" stroke="${INK}" stroke-width="5"/>`;
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; s += `<path d="M${n2(x + Math.cos(a) * r * 0.82)},${n2(y + Math.sin(a) * r * 0.82)} L${n2(x + Math.cos(a) * r * 0.94)},${n2(y + Math.sin(a) * r * 0.94)}" stroke="${INK}" stroke-width="${i % 3 ? 2 : 4}"/>`; }
    return s + `<path d="M${x},${y} L${n2(x + r * 0.45)},${n2(y - r * 0.3)} M${x},${y} L${n2(x - r * 0.1)},${n2(y - r * 0.7)}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="5" fill="${INK}"/>` + D.glass(x - r, y - r, r * 2, r * 2, { op: 0.4 });
  }
  function frameSign(x, y, w, h, lines, bg = '#f2e6c8') {
    const D = root.Detail;
    return D.ao(x + w / 2 + 6, y + h + 6, w, 16, 0.35) + `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#6a3a1c" stroke="${INK}" stroke-width="6"/><rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" fill="${bg}" stroke="${INK}" stroke-width="3"/>` +
      lines.map(([txt, fs, col], i) => `<text x="${x + w / 2}" y="${y + 18 + (i + 1) * (h - 30) / (lines.length + 0.4)}" text-anchor="middle" font-size="${fs}" ${SERIF} fill="${col || '#5a2a1a'}">${txt}</text>`).join('') +
      D.wear(x + 10, y + 10, w - 20, h - 20, x, { n: 6 }) + D.screws([[x + 8, y + 8], [x + w - 8, y + 8]], 4);
  }
  function barrel(x, y, w, h, seed = 1) {
    const D = root.Detail;
    let s = D.ao(x, y, w * 1.3, w * 0.25, 0.5) + `<path d="M${n2(x - w / 2)},${n2(y)} Q${n2(x - w * 0.6)},${n2(y - h / 2)} ${n2(x - w / 2)},${n2(y - h)} L${n2(x + w / 2)},${n2(y - h)} Q${n2(x + w * 0.6)},${n2(y - h / 2)} ${n2(x + w / 2)},${n2(y)}Z" fill="#8a5a2c" stroke="${INK}" stroke-width="6"/>`;
    for (let i = 1; i < 6; i++) s += `<path d="M${n2(x - w / 2 + i * w / 6)},${n2(y - h + 4)} Q${n2(x - w / 2 + i * w / 6 + (i - 3) * 4)},${n2(y - h / 2)} ${n2(x - w / 2 + i * w / 6)},${n2(y - 4)}" stroke="#4a2a14" stroke-width="3" fill="none"/>`;
    for (const k of [0.15, 0.5, 0.85]) s += `<path d="M${n2(x - w * 0.56)},${n2(y - h * k)} Q${n2(x)},${n2(y - h * k + 10)} ${n2(x + w * 0.56)},${n2(y - h * k)}" stroke="${INK}" stroke-width="16" fill="none"/><path d="M${n2(x - w * 0.56)},${n2(y - h * k)} Q${n2(x)},${n2(y - h * k + 10)} ${n2(x + w * 0.56)},${n2(y - h * k)}" stroke="#6a6a70" stroke-width="9" fill="none"/>`;
    s += `<ellipse cx="${x}" cy="${n2(y - h)}" rx="${n2(w / 2)}" ry="${n2(w * 0.14)}" fill="#a87a48" stroke="${INK}" stroke-width="5"/>` + D.shade(x - w / 2, y - h, w, h, { side: 1, op: 0.35, band: 0.3, edge: false }) + D.wear(x - w / 2, y - h, w, h, seed, { n: 10 });
    return s;
  }
  function oldStore(seed = 3) {
    const D = root.Detail, [R, rr] = rngOf(seed);
    let wall = `<defs>${grad('os-wall', [[0, '#7a4a28'], [1, '#5a341c']])}${grad('os-floor', [[0, '#8a5a32'], [1, '#4a2e18']])}${grad('os-win', [[0, '#bfe4ff'], [0.6, '#e8f4ff'], [1, '#fff2d0']])}${grad('os-counter', [[0, '#8a4e26'], [1, '#4a2810']])}${grad('os-ceil', [[0, '#3a2414'], [1, '#5a3a20']])}</defs>`;
    wall += `<rect x="-700" y="-700" width="2500" height="2000" fill="url(#os-wall)"/>` + D.planks(-700, -400, 2500, 1700, { width: 64, seed: 9, dark: '#3a1e0c', light: '#b07a48', nails: [-300, 1250] });
    // ceiling beam + hanging goods (baskets, pans, a lantern)
    wall += `<rect x="-700" y="-700" width="2500" height="300" fill="url(#os-ceil)"/><rect x="-700" y="-420" width="2500" height="44" fill="#4a2a14" stroke="${INK}" stroke-width="6"/>` + D.edge(-700, -412, 1800, -412, { op: 0.3 });
    for (const [hx, kind] of [[-200, 'basket'], [40, 'pan'], [1180, 'basket'], [1380, 'pan'], [1560, 'basket']]) {
      wall += `<path d="M${hx},-376 V${kind === 'pan' ? -250 : -270}" stroke="${INK}" stroke-width="4"/>`;
      wall += kind === 'pan' ? `<circle cx="${hx}" cy="-200" r="54" fill="#5a5a62" stroke="${INK}" stroke-width="6"/><circle cx="${hx}" cy="-200" r="38" fill="#3a3a40"/><path d="M${hx},-254 v-16" stroke="${INK}" stroke-width="10"/><path d="M${hx - 30},-226 q18,-14 40,-10" stroke="#fff" stroke-width="5" fill="none" opacity=".5"/>`
        : `<path d="M${hx - 70},-270 L${hx - 54},-180 L${hx + 54},-180 L${hx + 70},-270Z" fill="#c8a060" stroke="${INK}" stroke-width="5"/>` + Array.from({ length: 6 }, (_, i) => `<path d="M${hx - 66 + i * 4},${-260 + i * 14} H${hx + 66 - i * 4}" stroke="#8a6a3a" stroke-width="3"/>`).join('') + `<path d="M${hx - 60},-270 Q${hx},-330 ${hx + 60},-270" stroke="${INK}" stroke-width="6" fill="none"/>`;
    }
    // window (left): panes, curtains, sill with a plant, dusty light
    wall += `<rect x="-350" y="60" width="380" height="600" fill="#5a3418" stroke="${INK}" stroke-width="8"/><rect x="-330" y="80" width="340" height="560" fill="url(#os-win)" stroke="${INK}" stroke-width="6"/>` +
      `<path d="M-330,520 Q-240,470 -150,500 Q-60,530 10,490 V640 H-330Z" fill="#9ac0a0" opacity=".6"/><path d="M-160,80 V640 M-330,360 H10" stroke="#6a4024" stroke-width="16"/>` +
      `<path d="M-300,120 l90,160 M-120,110 l90,170" stroke="#fff" stroke-width="10" opacity=".6"/>` +
      `<path d="M-370,50 Q-330,300 -360,680 L-300,680 Q-270,360 -290,50Z M50,50 Q10,300 40,680 L-20,680 Q-50,360 -30,50Z" fill="#a83a32" stroke="${INK}" stroke-width="5"/>` +
      `<path d="M-350,80 Q-330,300 -345,660 M30,80 Q10,300 20,660" stroke="#d86a52" stroke-width="5" fill="none" opacity=".6"/><rect x="-390" y="30" width="460" height="22" rx="8" fill="#3a2414" stroke="${INK}" stroke-width="5"/>` +
      `<rect x="-370" y="650" width="420" height="30" fill="#8a5a32" stroke="${INK}" stroke-width="6"/>` + D.ao(-100, 652, 120, 12, 0.5) +
      `<path d="M-130,650 L-124,600 L-76,600 L-70,650Z" fill="#b8643a" stroke="${INK}" stroke-width="4"/>` + [[-110, 560, -30], [-100, 540, 0], [-90, 560, 30]].map(([px, py, a]) => `<ellipse cx="${px}" cy="${py}" rx="12" ry="34" fill="#5a9a4a" stroke="${INK}" stroke-width="3" transform="rotate(${a} ${px} ${py + 30})"/>`).join('');
    // wall dressing between window and shelves: clock, calendar, "no credit" sign
    wall += clock(-160, -60, 70) + frameSign(-330, 780, 330, 190, [['NO CREDIT', 40, '#8a2a22'], ['GIVEN', 30], ['— the Management —', 18]]) +
      frameSign(-300, 1010, 250, 170, [['1879', 44, '#2a3a5a'], ['JUNE', 22]], '#f6efdc');
    // sign
    wall += D.ao(540, -16, 820, 26, 0.4) + `<rect x="150" y="-160" width="780" height="130" rx="12" fill="#3a2a1a" stroke="${INK}" stroke-width="8"/><rect x="164" y="-146" width="752" height="102" rx="8" fill="none" stroke="#d8b25a" stroke-width="4"/>` +
      `<text x="540" y="-74" text-anchor="middle" font-size="58" ${SERIF} fill="#e8c46a" letter-spacing="4">GENERAL STORE</text><text x="540" y="-48" text-anchor="middle" font-size="16" ${SERIF} fill="#d8b25a" letter-spacing="6">DRY GOODS · GROCERIES · NOTIONS</text>` + D.screws([[172, -150], [908, -150], [172, -40], [908, -40]], 5);
    // shelves full of goods + $1.00 tags
    for (const [i, y] of [[0, 300], [1, 560], [2, 820], [3, 1080]]) {
      wall += goodsRow(80, 1540, y, 190, seed * 10 + i) + shelf(60, 1560, y);
      for (let x = 160; x < 1540; x += 360) wall += tag({ x, y: y + 66, text: '$1.00', s: 0.42, string: false, rot: (x % 7) - 3 });
    }
    // oil lamps: chimney glass, brass font, shade, chain
    for (const lx of [320, 860]) {
      wall += `<path d="M${lx},-376 V100" stroke="${INK}" stroke-width="4" stroke-dasharray="10 4"/><path d="M${lx - 70},150 Q${lx},70 ${lx + 70},150 Z" fill="#2a4a3a" stroke="${INK}" stroke-width="5"/><path d="M${lx - 54},140 Q${lx},96 ${lx + 54},140" stroke="#5a8a6a" stroke-width="4" fill="none"/>` +
        `<path d="M${lx - 18},150 Q${lx - 26},180 ${lx - 14},206 L${lx + 14},206 Q${lx + 26},180 ${lx + 18},150Z" fill="#fff4c8" fill-opacity=".85" stroke="${INK}" stroke-width="4"/><path d="M${lx},196 q-6,-14 0,-26 q6,12 0,26" fill="#ffb040"/>` +
        `<ellipse cx="${lx}" cy="${226}" rx="40" ry="22" fill="#c8963f" stroke="${INK}" stroke-width="5"/><path d="M${lx - 26},220 q20,-10 44,-4" stroke="#fff4c8" stroke-width="4" fill="none" opacity=".8"/>`;
    }
    wall += root.Look ? root.Look.glow(320, 190, 300, '#ffd080', 0.6) + root.Look.glow(860, 190, 300, '#ffd080', 0.6) + root.Look.rays(-160, 300, 1800, 7, 50, 30, '#fff2c8', 0.12) : '';
    wall += D.dust(-300, 200, 900, 900, 33, 40);
    // floor: boards with nails, worn rug in front of the counter
    wall += `<rect x="-700" y="1300" width="2500" height="900" fill="url(#os-floor)" stroke="${INK}" stroke-width="6"/>`;
    for (let i = -12; i < 26; i++) wall += `<path d="M${540 + i * 90},1300 L${540 + i * 170},2200" stroke="#3a2010" stroke-width="4"/><circle cx="${540 + i * 90 + 18}" cy="1340" r="3" fill="#2a2a2a"/><circle cx="${540 + i * 115 + 22}" cy="1600" r="3.5" fill="#2a2a2a"/>`;
    for (const yy of [1420, 1640, 1960]) wall += `<path d="M-700,${yy} H1800" stroke="#3a2010" stroke-width="3" opacity=".6"/>`;
    wall += D.wear(-400, 1300, 1900, 800, 44, { n: 60, len: 40 });
    wall += `<path d="M-200,1700 L1280,1700 L1420,2100 L-340,2100Z" fill="#8a2a2a" stroke="${INK}" stroke-width="6"/><path d="M-170,1720 L1250,1720 L1384,2080 L-306,2080Z" fill="none" stroke="#d8b25a" stroke-width="6"/>` +
      Array.from({ length: 9 }, (_, i) => `<path d="M${-120 + i * 170},1760 l40,40 l-40,40 l-40,-40Z" fill="none" stroke="#e8c46a" stroke-width="4" opacity=".7"/>`).join('') + D.wear(-200, 1700, 1480, 400, 45, { n: 30 });
    // counter: overhanging top with bevel, brass edge, raised panels, kick plate, wear, clutter at the ends
    let counter = D.ao(540, 1662, 1900, 40, 0.5) +
      `<rect x="-380" y="1240" width="1840" height="420" fill="url(#os-counter)" stroke="${INK}" stroke-width="7"/>` + P.woodGrain({ x: -380, y: 1240, w: 1840, h: 420, seed: 4, knots: 2, color: '#2a1408', op: 0.25 });
    for (let x = -340; x < 1440; x += 300) {
      counter += `<rect x="${x}" y="1286" width="250" height="300" rx="6" fill="#6a3a1a" stroke="#2a1408" stroke-width="6"/><rect x="${x + 16}" y="1302" width="218" height="268" rx="4" fill="#7a4420" stroke="#2a1408" stroke-width="3"/>` +
        `<path d="M${x + 18},${1304} H${x + 232}" stroke="#c88a50" stroke-width="3" opacity=".6"/><path d="M${x + 18},${1568} H${x + 232}" stroke="#1a0c06" stroke-width="4" opacity=".5"/>` + D.wear(x, 1286, 250, 300, x + 7, { n: 9 });
    }
    counter += `<rect x="-380" y="1600" width="1840" height="60" fill="#3a1e0c" stroke="${INK}" stroke-width="6"/><rect x="-380" y="1600" width="1840" height="12" fill="#c8963f" stroke="${INK}" stroke-width="3"/>` +
      `<rect x="-400" y="1196" width="1880" height="46" rx="6" fill="#a86a3a" stroke="${INK}" stroke-width="7"/>` + D.edge(-394, 1204, 1474, 1204, { op: 0.6, w: 5 }) +
      `<rect x="-400" y="1236" width="1880" height="10" fill="#c8963f" stroke="${INK}" stroke-width="3"/>` + `<rect x="-380" y="1246" width="1840" height="26" fill="#1a0c06" opacity=".35"/>` + D.wear(-390, 1198, 1860, 40, 46, { n: 24 });
    // clutter: candy jars + newspaper stack (right), small brass scale + receipt pad + pencil (left)
    for (const [cx, c] of [[1010, '#e84a5a'], [1110, '#f2b23a']]) {
      counter += D.ao(cx, 1200, 120, 14, 0.5) + `<path d="M${cx - 44},1198 V1080 Q${cx - 44},1060 ${cx - 30},1056 H${cx + 30} Q${cx + 44},1060 ${cx + 44},1080 V1198Z" fill="#dff0f2" fill-opacity=".5" stroke="${INK}" stroke-width="4"/>` +
        Array.from({ length: 14 }, (_, i) => `<circle cx="${cx - 34 + (i * 37) % 68}" cy="${1190 - (i * 23) % 80}" r="7" fill="${i % 3 ? c : '#fff'}" stroke="${INK}" stroke-width="1"/>`).join('') +
        `<ellipse cx="${cx}" cy="1052" rx="32" ry="10" fill="#b8a27a" stroke="${INK}" stroke-width="3"/><circle cx="${cx}" cy="1040" r="10" fill="#b8a27a" stroke="${INK}" stroke-width="3"/>` + root.Detail.glass(cx - 44, 1060, 88, 138, { op: 0.55 });
    }
    counter += D.ao(1300, 1200, 220, 16, 0.5) + [0, 1, 2, 3].map(i => `<rect x="${1200 - i * 3}" y="${1186 - i * 12}" width="200" height="14" rx="3" fill="${i % 2 ? '#e8e0cc' : '#f2ecd8'}" stroke="${INK}" stroke-width="3" transform="rotate(${i % 2 ? 1.5 : -1} 1300 ${1190 - i * 12})"/>`).join('') +
      `<text x="1300" y="1158" text-anchor="middle" font-size="16" ${SERIF} fill="${INK}">DAILY NEWS</text>`;
    counter += D.ao(-60, 1200, 260, 16, 0.5) + `<path d="M-150,1198 L-130,1170 L10,1170 L30,1198Z" fill="#c8963f" stroke="${INK}" stroke-width="5"/><path d="M-60,1170 V1090" stroke="${INK}" stroke-width="10"/><path d="M-150,1080 H30" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>` +
      `<path d="M-170,1080 Q-140,1120 -110,1080Z M10,1080 Q40,1120 70,1080Z" fill="#c8963f" stroke="${INK}" stroke-width="4"/>` +
      D.ao(160, 1200, 150, 12, 0.45) + `<rect x="100" y="1176" width="120" height="22" rx="3" fill="#f6efe2" stroke="${INK}" stroke-width="3"/><path d="M110,1186 h90" stroke="#9ab0d0" stroke-width="2"/><path d="M90,1196 L210,1168" stroke="#e8b83a" stroke-width="8" stroke-linecap="round"/><path d="M90,1196 l8,-2" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>`;
    counter += `<g id="os-counter-top"></g>`;
    // foreground: barrels + crate (near layer, blurred by depth via camera)
    const nearStatic = barrel(-140, 2060, 220, 300, 5) + barrel(1260, 2080, 240, 320, 6);
    const near = `<g>${nearStatic}</g><g id="os-near"></g>`;
    return {
      origin: [540, 1100],
      light: { preset: 'interior', source: { x: 320, y: 190 }, color: '#ffd8a0', key: 0.45 },
      layers: [
        { id: 'wall', depth: 0.92, svg: wall },
        { id: 'staff', depth: 1, svg: '' },
        { id: 'counter', depth: 1, svg: counter },
        { id: 'actors', depth: 1, svg: '' },
        { id: 'near', depth: 1.25, svg: near },
      ],
      update(t, o = {}) {
        const top = document.getElementById('os-counter-top');
        if (top) top.innerHTML = o.counterTop || '';
        const nr = document.getElementById('os-near');
        if (nr) nr.innerHTML = o.near || '';
      },
    };
  }

  // ---------- modern aisle (one-point perspective, vanishing point VP) ----------
  function aisle(seed = 5) {
    const [R, rr] = rngOf(seed);
    const VP = [540, 800];
    const lerp = (a, b, k) => a + (b - a) * k;
    // point on a side wall: side -1/+1, depth k 0 (near) .. 1 (far), height h 0 (floor) .. 1 (top shelf)
    const P3 = (side, k, h) => { const xn = side < 0 ? -260 : 1340, x = lerp(xn, VP[0] + side * 150, k); const yb = lerp(1760, VP[1] + 150, k), yt = lerp(-120, VP[1] - 190, k); return [x, lerp(yb, yt, h)]; };
    let s = `<defs>${grad('ai-ceil', [[0, '#eef4f6'], [1, '#c8d4d8']])}${grad('ai-floor', [[0, '#e8ecee'], [1, '#b8c4c8']])}${grad('ai-back', [[0, '#f6f2e8'], [1, '#dcd4c0']])}</defs>`;
    s += `<rect x="-600" y="-600" width="2300" height="1500" fill="url(#ai-ceil)"/><rect x="-600" y="${VP[1]}" width="2300" height="1600" fill="url(#ai-floor)"/>`;
    // ceiling light strips converging
    for (let i = 0; i < 7; i++) { const k0 = i / 7, k1 = k0 + 0.06; const a = [lerp(540, 540, k0), lerp(-200, VP[1] - 220, k0)], b = [540, lerp(-200, VP[1] - 220, k1)]; const w0 = lerp(300, 20, k0), w1 = lerp(300, 20, k1); s += `<path d="M${n2(a[0] - w0)},${n2(a[1])} L${n2(a[0] + w0)},${n2(a[1])} L${n2(b[0] + w1)},${n2(b[1])} L${n2(b[0] - w1)},${n2(b[1])}Z" fill="#ffffff" stroke="#9aa8ac" stroke-width="3"/>`; }
    // back wall + sign
    s += `<rect x="${VP[0] - 160}" y="${VP[1] - 200}" width="320" height="350" fill="url(#ai-back)" stroke="${INK}" stroke-width="4"/><rect x="${VP[0] - 110}" y="${VP[1] - 170}" width="220" height="60" rx="6" fill="#e84a3a" stroke="${INK}" stroke-width="3"/><text x="${VP[0]}" y="${VP[1] - 127}" text-anchor="middle" font-size="36" ${SANS} fill="#fff">SALE</text>`;
    // floor tile lines + light reflections
    for (let i = -8; i <= 8; i++) s += `<path d="M${VP[0] + i * 20},${VP[1] + 150} L${VP[0] + i * 240},2200" stroke="#a8b4b8" stroke-width="3"/>`;
    for (let k = 0.05; k < 1; k += 0.12) { const y = lerp(1760, VP[1] + 150, k * k); s += `<path d="M-600,${n2(y)} H1700" stroke="#a8b4b8" stroke-width="2"/>`; }
    s += `<path d="M440,1900 L500,${VP[1] + 160} L580,${VP[1] + 160} L640,1900Z" fill="#fff" opacity=".35"/>`;
    // shelves on both sides: 5 levels, products in perspective, price label strip on each shelf edge
    for (const side of [-1, 1]) {
      const back = [P3(side, 0, 0), P3(side, 1, 0), P3(side, 1, 1), P3(side, 0, 1)];
      s += `<path d="M${back.map(p => p.map(n2).join(',')).join(' L')}Z" fill="#5a6a74" stroke="${INK}" stroke-width="5"/>`;
      for (let lv = 0; lv < 5; lv++) {
        const h0 = 0.04 + lv * 0.19;
        for (let c = 0; c < 22; c++) {
          const k0 = c / 22, k1 = (c + 0.85) / 22, col = CANDY[Math.floor(R() * 5)];
          const p00 = P3(side, k0, h0), p10 = P3(side, k1, h0), p11 = P3(side, k1, h0 + 0.15 * rr(0.6, 0.95)), p01 = P3(side, k0, h0 + 0.15 * rr(0.6, 0.95));
          s += `<path d="M${p00.map(n2)} L${p10.map(n2)} L${p11.map(n2)} L${p01.map(n2)}Z" fill="${col}" stroke="${INK}" stroke-width="${n2(lerp(3, 1, k0))}"/>`;
          const q = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
          const l0 = q(p00, p01, 0.38), l1 = q(p10, p11, 0.38), l2 = q(p10, p11, 0.66), l3 = q(p00, p01, 0.66);
          s += `<path d="M${l0.map(n2)} L${l1.map(n2)} L${l2.map(n2)} L${l3.map(n2)}Z" fill="#fff" opacity=".82"/>` +
            `<path d="M${q(p01, p11, 0.08).map(n2)} L${q(p01, p11, 0.85).map(n2)}" stroke="#fff" stroke-width="${n2(lerp(3, 0.6, k0))}" opacity=".55"/>` +
            `<path d="M${q(l0, l3, 0.5).map(n2)} L${q(l1, l2, 0.5).map(n2)}" stroke="${dk(col, 0.4)}" stroke-width="${n2(lerp(4, 0.8, k0))}" opacity=".8"/>`;
        }
        const e0 = P3(side, 0, h0), e1 = P3(side, 1, h0), e0b = P3(side, 0, h0 - 0.035), e1b = P3(side, 1, h0 - 0.035);
        s += `<path d="M${e0.map(n2)} L${e1.map(n2)} L${e1b.map(n2)} L${e0b.map(n2)}Z" fill="#dfe4e6" stroke="${INK}" stroke-width="3"/>`;
        for (let c = 0; c < 6; c++) { const k = 0.02 + c * 0.13, p = P3(side, k, h0 - 0.017), sc = lerp(0.36, 0.06, k); s += `<g transform="translate(${n2(p[0])} ${n2(p[1])}) scale(${n2(sc)})"><rect x="-80" y="-32" width="160" height="64" rx="6" fill="#ffe14a" stroke="${INK}" stroke-width="5"/><text x="0" y="20" text-anchor="middle" font-size="52" ${SANS} fill="#c8282a">${['2.99', '4.99', '0.99', '9.99', '1.99', '3.99'][(c + lv + (side > 0 ? 2 : 0)) % 6]}</text></g>`; }
      }
    }
    // glossy floor: soft colored reflections of the shelves + light streaks
    for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
      const k = i / 9, a = P3(side, k, 0), b = P3(side, k + 0.1, 0);
      s += `<path d="M${n2(a[0])},${n2(a[1])} L${n2(b[0])},${n2(b[1])} L${n2(b[0] - side * 30 * (1 - k))},${n2(b[1] + 120 * (1 - k))} L${n2(a[0] - side * 40 * (1 - k))},${n2(a[1] + 160 * (1 - k))}Z" fill="${CANDY[(i + (side > 0 ? 2 : 0)) % 5]}" opacity=".12"/>`;
    }
    s += `<path d="M520,${VP[1] + 160} L560,${VP[1] + 160} L700,1950 L380,1950Z" fill="#fff" opacity=".22"/>`;
    // ceiling vents and the hanging aisle sign
    for (const [vx, vy, vw] of [[260, -60, 120], [820, -40, 120], [400, 380, 70], [690, 390, 70]]) s += `<rect x="${vx}" y="${vy}" width="${vw}" height="${n2(vw * 0.4)}" fill="#dde4e6" stroke="#8a9a9e" stroke-width="3"/>` + Array.from({ length: 4 }, (_, i) => `<path d="M${vx + 6},${n2(vy + 6 + i * vw * 0.08)} H${vx + vw - 6}" stroke="#9aa8ac" stroke-width="2"/>`).join('');
    s += `<path d="M420,140 V230 M660,140 V230" stroke="#6a7a80" stroke-width="5"/><rect x="340" y="230" width="400" height="120" rx="12" fill="#2a6ab8" stroke="${INK}" stroke-width="6"/><rect x="352" y="242" width="376" height="96" rx="8" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/>` +
      `<text x="540" y="292" text-anchor="middle" font-size="44" ${SANS} fill="#fff">AISLE 5</text><text x="540" y="326" text-anchor="middle" font-size="22" ${SANS} fill="#cfe4ff" letter-spacing="3">SNACKS · DRINKS</text>`;
    // end-cap display stands at the near ends with sale banners
    for (const side of [-1, 1]) {
      const bx = side < 0 ? -120 : 1060;
      s += root.Detail.ao(bx + 60, 1880, 300, 40, 0.4) + `<rect x="${bx - 60}" y="1380" width="240" height="500" fill="#e8ecee" stroke="${INK}" stroke-width="6"/>` +
        [0, 1, 2].map(r => goodsRow(bx - 52, bx + 176, 1520 + r * 130, 110, 70 + r + (side > 0 ? 9 : 0), true) + `<rect x="${bx - 60}" y="${1520 + r * 130}" width="240" height="14" fill="#c8d0d4" stroke="${INK}" stroke-width="3"/>`).join('') +
        `<rect x="${bx - 70}" y="1390" width="260" height="90" rx="8" fill="#e8302a" stroke="${INK}" stroke-width="5"/><text x="${bx + 60}" y="1450" text-anchor="middle" font-size="46" ${SANS} fill="#fff">.99!</text>`;
    }
    // security camera dome near the ceiling (left)
    s += `<path d="M120,-120 V40" stroke="${INK}" stroke-width="8"/><path d="M60,40 Q120,140 180,40Z" fill="#2a2a32" stroke="${INK}" stroke-width="6"/><circle cx="120" cy="72" r="16" fill="#e84a3a"/>`;
    return {
      origin: [540, 1000],
      light: { preset: 'day', dir: -90, color: '#f4fbff', key: 0.2, rim: '#ffffff' },
      layers: [{ id: 'aisle', depth: 0.95, svg: s }, { id: 'actors', depth: 1, svg: '' }, { id: 'near', depth: 1.3, svg: cart(1080, 2160, 1.25) + '<g id="ai-near"></g>' }],
      update(t, o = {}) { const n = document.getElementById('ai-near'); if (n) n.innerHTML = o.near || ''; },
    };
  }

  // shopping cart (wire basket, handle, wheels) with a few groceries, origin = front-bottom
  function cart(x, y, s = 1) {
    const D = root.Detail;
    let g = D.ao(0, 0, 520, 50, 0.45) + `<path d="M-230,-80 L230,-80 L260,-400 L-260,-400Z" fill="#c8d0d4" fill-opacity=".25" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>`;
    for (let i = 1; i < 10; i++) g += `<path d="M${-230 + i * 46},-80 L${-260 + i * 52},-400" stroke="#7a8a90" stroke-width="5"/>`;
    for (let j = 1; j < 5; j++) g += `<path d="M${-230 - j * 6},${-80 - j * 64} H${230 + j * 6}" stroke="#7a8a90" stroke-width="5"/>`;
    g += goodsRow(-220, 230, -330, 140, 91, true);
    g += `<path d="M-230,-80 L-210,-20 M230,-80 L210,-20 M-210,-20 H210" stroke="${INK}" stroke-width="10" fill="none"/><path d="M-280,-420 H280" stroke="${INK}" stroke-width="18" stroke-linecap="round"/><path d="M-280,-420 H280" stroke="#e8302a" stroke-width="10" stroke-linecap="round"/>`;
    for (const wx of [-190, 190]) g += `<circle cx="${wx}" cy="-12" r="24" fill="#2a2a2e" stroke="${INK}" stroke-width="5"/><circle cx="${wx}" cy="-12" r="8" fill="#9aa8ac"/>`;
    return `<g transform="translate(${n2(x)} ${n2(y)}) scale(${s})">${g}</g>`;
  }

  // ---------- modern checkout ----------
  function checkout() {
    let s = `<defs>${grad('co-wall', [[0, '#e8eef0'], [1, '#c8d2d6']])}${grad('co-desk', [[0, '#4a5258'], [1, '#2a3036']])}</defs>`;
    s += `<rect x="-600" y="-600" width="2300" height="2600" fill="url(#co-wall)"/>`;
    for (let x = -600; x < 1700; x += 180) s += `<path d="M${x},-600 V1300" stroke="#d2dade" stroke-width="3"/>`;
    // framed portrait (the 1880s owner looks down on the modern checkout) + caption plate
    s += `<rect x="640" y="140" width="320" height="400" fill="#8a5a28" stroke="${INK}" stroke-width="8"/><rect x="664" y="164" width="272" height="352" fill="#e8dcc0" stroke="${INK}" stroke-width="5"/>` +
      `<g id="co-portrait"></g><rect x="720" y="560" width="160" height="40" rx="4" fill="#c8963f" stroke="${INK}" stroke-width="4"/><text x="800" y="588" text-anchor="middle" font-size="20" ${SERIF} fill="${INK}">EST. 1879</text>`;
    // store branding, clock, thank-you sign, wall trim
    s += `<rect x="-600" y="-40" width="2300" height="120" fill="#e8302a"/><rect x="-600" y="80" width="2300" height="10" fill="#b8201a"/><text x="200" y="40" text-anchor="middle" font-size="64" ${SANS} fill="#fff" letter-spacing="3">QUICKMART</text>` +
      clock(300, 330, 64) + `<rect x="80" y="520" width="440" height="110" rx="10" fill="#2a6ab8" stroke="${INK}" stroke-width="5"/><text x="300" y="592" text-anchor="middle" font-size="52" ${SANS} fill="#fff">THANK YOU!</text>` +
      `<rect x="-600" y="1120" width="2300" height="20" fill="#b8c4c8"/>`;
    s += `<rect x="-600" y="1300" width="2300" height="800" fill="#d8dee0" stroke="${INK}" stroke-width="6"/>` +
      Array.from({ length: 14 }, (_, i) => `<path d="M${-600 + i * 180},1300 L${-700 + i * 200},2100" stroke="#b8c2c6" stroke-width="3"/>`).join('') + `<path d="M-600,1600 H1700" stroke="#b8c2c6" stroke-width="3"/>` +
      `<rect x="-100" y="1840" width="700" height="140" rx="16" fill="#3a4046" stroke="${INK}" stroke-width="5"/><text x="250" y="1930" text-anchor="middle" font-size="40" ${SANS} fill="#8a9298" letter-spacing="4">WELCOME</text>`;
    let desk = `<rect x="-400" y="1180" width="1900" height="620" fill="url(#co-desk)" stroke="${INK}" stroke-width="7"/><rect x="-400" y="1180" width="1900" height="70" fill="#1e2226" stroke="${INK}" stroke-width="6"/>`;
    for (let x = -380; x < 1500; x += 60) desk += `<path d="M${x},1186 v58" stroke="#3a4046" stroke-width="4"/>`;
    // card machine + screen
    // groceries on the belt + divider, scanner window, candy/gum rack at the front, bagging shelf
    desk += root.Detail.edge(-396, 1188, 1496, 1188, { op: 0.35 }) + goodsRow(-300, 120, 1180, 150, 81, true) +
      `<rect x="150" y="1150" width="200" height="26" rx="6" fill="#e8302a" stroke="${INK}" stroke-width="4"/><text x="250" y="1170" text-anchor="middle" font-size="16" ${SANS} fill="#fff">NEXT CUSTOMER</text>` +
      `<rect x="560" y="1184" width="160" height="54" rx="6" fill="#1a2a30" stroke="${INK}" stroke-width="4"/><path d="M576,1211 H704" stroke="#ff4a3a" stroke-width="4" opacity=".9"/>` + root.Detail.glass(560, 1184, 160, 54, { op: 0.4 }) +
      `<rect x="-380" y="1380" width="520" height="380" rx="8" fill="#e8ecee" stroke="${INK}" stroke-width="6"/>` +
      [0, 1, 2].map(r => goodsRow(-370, 130, 1500 + r * 120, 100, 85 + r, true) + `<rect x="-380" y="${1500 + r * 120}" width="520" height="12" fill="#b8c2c6" stroke="${INK}" stroke-width="3"/>`).join('') +
      `<rect x="-390" y="1386" width="540" height="70" rx="8" fill="#f2b23a" stroke="${INK}" stroke-width="5"/><text x="-120" y="1434" text-anchor="middle" font-size="40" ${SANS} fill="${INK}">GUM · 0.99</text>` +
      `<rect x="1000" y="1100" width="460" height="24" fill="#c8d0d4" stroke="${INK}" stroke-width="4"/><path d="M1060,1100 V880 M1400,1100 V880" stroke="#8a9a9e" stroke-width="8"/><path d="M1040,880 H1420" stroke="#8a9a9e" stroke-width="8"/>` +
      `<path d="M1090,880 L1080,1096 L1200,1096 L1190,880" fill="#f6f2ea" fill-opacity=".8" stroke="${INK}" stroke-width="4"/>`;
    desk += `<rect x="760" y="900" width="150" height="270" rx="16" fill="#2a2e34" stroke="${INK}" stroke-width="6"/><rect x="778" y="920" width="114" height="90" rx="6" fill="#5ad0a0"/><text x="835" y="975" text-anchor="middle" font-size="22" ${SANS} fill="#0a3a2a">TAP</text>` +
      [0, 1, 2].map(r => [0, 1, 2].map(c => `<rect x="${786 + c * 34}" y="${1030 + r * 34}" width="26" height="26" rx="5" fill="#4a5058"/>`).join('')).join('') +
      `<rect x="280" y="760" width="300" height="220" rx="12" fill="#1e2226" stroke="${INK}" stroke-width="6"/><rect x="296" y="776" width="268" height="188" rx="6" fill="#0e1a22"/><g id="co-screen"></g><path d="M430,980 v200" stroke="${INK}" stroke-width="18"/>` +
      `<g id="co-receipt"></g>`;
    return {
      origin: [540, 1100],
      light: { preset: 'day', dir: -80, color: '#f2f8ff', key: 0.18 },
      layers: [{ id: 'wall', depth: 0.9, svg: s }, { id: 'staff', depth: 1, svg: '' }, { id: 'desk', depth: 1, svg: desk }, { id: 'actors', depth: 1, svg: '' }, { id: 'near', depth: 1.3, svg: '<g id="co-near"></g>' }],
      update(t, o = {}) {
        const set = (id, v) => { const e = document.getElementById(id); if (e) e.innerHTML = v || ''; };
        set('co-screen', o.screen); set('co-receipt', o.receipt); set('co-portrait', o.portrait); set('co-near', o.near);
      },
    };
  }

  // ---------- giant price tag over a blurred aisle ----------
  function bigTag() {
    let bg = `<defs>${grad('bt-bg', [[0, '#f0e8d8'], [1, '#d8cfc0']])}<filter id="bt-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="22"/></filter></defs>` +
      `<rect x="-600" y="-600" width="2300" height="3200" fill="url(#bt-bg)"/><g filter="url(#bt-blur)">`;
    const [R, rr] = rngOf(17);
    for (let i = 0; i < 40; i++) bg += `<rect x="${n2(rr(-300, 1400))}" y="${n2(rr(-200, 2200))}" width="${n2(rr(80, 200))}" height="${n2(rr(120, 260))}" rx="12" fill="${CANDY[Math.floor(R() * 5)]}" opacity=".55"/>`;
    bg += `</g>`;
    for (let i = 0; i < 14; i++) bg += `<circle cx="${n2(rr(-100, 1200))}" cy="${n2(rr(0, 1900))}" r="${n2(rr(20, 60))}" fill="#fff" opacity="${n2(rr(0.15, 0.35))}"/>`;
    return {
      origin: [540, 960],
      light: { preset: 'day', dir: -60 },
      layers: [{ id: 'bg', depth: 0.6, svg: bg }, { id: 'tag', depth: 1, svg: '<g id="bt-tag"></g>' }, { id: 'actors', depth: 1, svg: '' }],
      update(t, o = {}) { const e = document.getElementById('bt-tag'); if (e) e.innerHTML = o.tag || ''; },
    };
  }

  // Price tag with separately scaled parts: big = scale of the leading digit, small = scale of the cents
  function splitTag({ x, y, s = 1, dollars = '2', cents = '.99', big = 1, small = 1, glow = 0, scan = -1 }) {
    let g = `<path d="M-300,-150 Q-360,-400 -260,-560" stroke="#8a6a4a" stroke-width="8" fill="none"/>`;
    g += `<path d="M-200,-170 L360,-170 Q400,-170 400,-130 L400,130 Q400,170 360,170 L-200,170 L-330,0Z" fill="#ffe14a" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/><circle cx="-250" cy="0" r="24" fill="#d8b830" stroke="${INK}" stroke-width="8"/>`;
    if (glow > 0) g += `<circle cx="-40" cy="0" r="${n2(150 + 30 * glow)}" fill="#fff6c0" opacity="${n2(0.6 * glow)}"/>`;
    g += `<text x="-215" y="58" font-size="130" ${SANS} fill="#c8282a">$</text>` +
      `<g transform="translate(-30 0) scale(${n2(big)}) translate(30 0)"><text x="-110" y="${n2(74)}" font-size="${n2(220)}" ${SANS} fill="#c8282a">${dollars}</text></g>` +
      `<g transform="translate(180 -40) scale(${n2(small)}) translate(-180 40)"><text x="70" y="40" font-size="120" ${SANS} fill="#c8282a">${cents}</text></g>`;
    if (scan >= 0) { const sx = -300 + scan * 680; g += `<rect x="${n2(sx - 14)}" y="-190" width="28" height="380" rx="14" fill="#5ab4ff" opacity=".55"/>`; }
    return `<g transform="translate(${n2(x)} ${n2(y)}) scale(${s})">${g}</g>`;
  }

  // ---------- balance scale on a counter ----------
  function scale() {
    let s = `<defs>${grad('sc-bg', [[0, '#3a4a6a'], [1, '#1e2638']])}</defs><rect x="-600" y="-600" width="2300" height="3200" fill="url(#sc-bg)"/>`;
    for (let i = 0; i < 9; i++) s += `<circle cx="${100 + i * 120}" cy="${300 + (i % 3) * 140}" r="${40 + (i % 4) * 14}" fill="#ffffff" opacity=".06"/>`;
    s += (root.Look ? root.Look.glow(540, 600, 700, '#ffe0a0', 0.4) : '');
    const counter = `<rect x="-400" y="1500" width="1880" height="40" fill="#a86a3a" stroke="${INK}" stroke-width="7"/><rect x="-380" y="1540" width="1840" height="700" fill="#6a3a1c" stroke="${INK}" stroke-width="7"/>`;
    return {
      origin: [540, 1100],
      light: { preset: 'interior', dir: -90 },
      layers: [{ id: 'bg', depth: 0.7, svg: s }, { id: 'counter', depth: 1, svg: counter + '<g id="sc-scale"></g>' }, { id: 'actors', depth: 1, svg: '' }],
      update(t, o = {}) { const e = document.getElementById('sc-scale'); if (e) e.innerHTML = o.scale || ''; },
    };
  }

  // the scale itself: tilt -1..1 (positive = left pan goes down), left/right = svg on each pan
  function balance({ x, y, tilt = 0, left = '', right = '' }) {
    const a = tilt * 14, brass = '#c8963f', L = 300;
    const ex = k => k * L * Math.cos(a * Math.PI / 180), ey = k => -k * L * Math.sin(a * Math.PI / 180);
    let g = `<path d="M-120,0 L120,0 L80,-50 L-80,-50Z" fill="${brass}" stroke="${INK}" stroke-width="7"/><path d="M0,-50 V-520" stroke="${INK}" stroke-width="22"/><path d="M0,-50 V-520" stroke="${brass}" stroke-width="12"/>`;
    g += `<g transform="translate(0 -520)"><path d="M${n2(ex(-1))},${n2(ey(-1))} L${n2(ex(1))},${n2(ey(1))}" stroke="${INK}" stroke-width="22" stroke-linecap="round"/><path d="M${n2(ex(-1))},${n2(ey(-1))} L${n2(ex(1))},${n2(ey(1))}" stroke="${brass}" stroke-width="12" stroke-linecap="round"/><circle r="22" fill="${brass}" stroke="${INK}" stroke-width="6"/>`;
    for (const [k, content] of [[-1, left], [1, right]]) {
      const px = ex(k), py = ey(k);
      g += `<path d="M${n2(px)},${n2(py)} L${n2(px - 110)},${n2(py + 240)} M${n2(px)},${n2(py)} L${n2(px + 110)},${n2(py + 240)}" stroke="${INK}" stroke-width="5"/>` +
        `<path d="M${n2(px - 140)},${n2(py + 240)} Q${n2(px)},${n2(py + 320)} ${n2(px + 140)},${n2(py + 240)}Z" fill="${brass}" stroke="${INK}" stroke-width="7"/><g transform="translate(${n2(px)} ${n2(py + 236)})">${content}</g>`;
    }
    g += `</g>`;
    return `<g transform="translate(${n2(x)} ${n2(y)})">${g}</g>`;
  }

  root.Store = { oldStore, aisle, checkout, bigTag, scale, register, bill, penny, tag, cashbox, spike, ledger, splitTag, balance, goodsRow };
})(typeof window !== 'undefined' ? window : globalThis);
