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
  // ding 0..1 shakes the bell and draws ring lines. text = what the flag shows.
  function register({ x, y, s = 1, open = 0, flag = 0, ding = 0, text = '99¢', id = 'reg' }) {
    const brass = '#c8963f', brassD = dk(brass, 0.35), brassL = lt(brass, 0.45);
    let g = `<defs>${grad(id + '-b', [[0, brassL], [0.45, brass], [1, brassD]], 1, 0)}</defs>`;
    // drawer (slides toward the camera = down) with coin tray
    const dy = open * 46;
    g += `<rect x="-158" y="${n2(-70 + dy)}" width="316" height="62" rx="6" fill="#5a3418" stroke="${INK}" stroke-width="6"/>` +
      `<rect x="-120" y="${n2(-54 + dy)}" width="240" height="14" rx="5" fill="${brass}" stroke="${INK}" stroke-width="3"/>`;
    if (open > 0.05) {
      g += `<rect x="-150" y="${n2(-70 + dy - 30 * open)}" width="300" height="${n2(30 * open + 2)}" fill="#3a2010" stroke="${INK}" stroke-width="4"/>`;
      for (let i = 0; i < 5; i++) g += `<ellipse cx="${-118 + i * 59}" cy="${n2(-72 + dy - 14 * open)}" rx="20" ry="${n2(7 * open + 1)}" fill="${['#c8743a', '#d8d8e0', '#c8743a', '#e0c070', '#d8d8e0'][i]}" stroke="${INK}" stroke-width="2"/>`;
    }
    // ornate body
    g += `<path d="M-168,-70 L-150,-250 L150,-250 L168,-70Z" fill="url(#${id}-b)" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`;
    for (const k of [-1, 1]) g += `<path d="M${k * 140},-90 q${k * -30},-40 0,-80 q${k * 30},-40 0,-70" stroke="${brassD}" stroke-width="5" fill="none"/><circle cx="${k * 128}" cy="-160" r="9" fill="none" stroke="${brassD}" stroke-width="4"/>`;
    // keys: 3 rows on the slanted front
    for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
      const kx = -95 + c * 38, ky = -110 - r * 38;
      g += `<circle cx="${kx}" cy="${ky}" r="14" fill="#f2ead8" stroke="${INK}" stroke-width="3"/><text x="${kx}" y="${ky + 5}" text-anchor="middle" font-size="13" ${SANS} fill="${INK}">${(r * 6 + c) % 10}</text>`;
    }
    // top box with glass window, crank, bell
    g += `<rect x="-120" y="-330" width="240" height="84" rx="10" fill="url(#${id}-b)" stroke="${INK}" stroke-width="7"/>` +
      `<rect x="-90" y="-316" width="180" height="50" rx="6" fill="#2a2018" stroke="${INK}" stroke-width="4"/>` +
      `<text x="0" y="-282" text-anchor="middle" font-size="30" ${SANS} fill="#f2d890">${flag > 0.5 ? text : '0.00'}</text>` +
      `<path d="M168,-160 h34 v-46" stroke="${INK}" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="202" cy="-210" r="12" fill="${brass}" stroke="${INK}" stroke-width="4"/>`;
    // pop-up flag
    if (flag > 0) {
      const fy = -330 - 70 * Math.min(1, flag);
      g += `<rect x="-52" y="${n2(fy)}" width="104" height="58" rx="6" fill="#f6efe2" stroke="${INK}" stroke-width="5"/><text x="0" y="${n2(fy + 40)}" text-anchor="middle" font-size="30" ${SANS} fill="#b8322a">SALE</text>`;
    }
    // bell
    const sh = Math.sin(ding * 40) * 6 * ding;
    g += `<g transform="translate(${n2(-150 + sh)} -262)"><path d="M-22,0 Q-22,-34 0,-34 Q22,-34 22,0Z" fill="${brassL}" stroke="${INK}" stroke-width="5"/><circle cx="0" cy="-38" r="6" fill="${brass}" stroke="${INK}" stroke-width="3"/></g>`;
    if (ding > 0.05) for (let i = 0; i < 3; i++) {
      const a = -2.4 + i * 0.5, r0 = 40 + 10 * (1 - ding), r1 = r0 + 30;
      g += `<path d="M${n2(-150 + Math.cos(a) * r0)},${n2(-280 + Math.sin(a) * r0)} L${n2(-150 + Math.cos(a) * r1)},${n2(-280 + Math.sin(a) * r1)}" stroke="${INK}" stroke-width="7" stroke-linecap="round" opacity="${n2(ding)}"/>`;
    }
    // highlight streak
    g += `<path d="M-120,-235 L-136,-100" stroke="#fff6d8" stroke-width="10" stroke-linecap="round" opacity=".45"/>`;
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

  // ---------- shelf goods ----------
  const CANDY = ['#e84a5a', '#f2b23a', '#5ab4e8', '#7ad06a', '#e87ad0', '#f6efe2'];
  function goodsRow(x0, x1, y, h, seed, modern = false) {
    const [R, rr] = rngOf(seed);
    let s = '', x = x0;
    while (x < x1 - 40) {
      const kind = Math.floor(R() * (modern ? 3 : 4)), w = modern ? rr(54, 80) : rr(50, 78), hh = h * rr(0.6, 0.95), col = CANDY[Math.floor(R() * CANDY.length)];
      if (!modern && kind === 0) {           // glass candy jar
        s += `<rect x="${n2(x)}" y="${n2(y - hh)}" width="${n2(w)}" height="${n2(hh)}" rx="10" fill="#dff0f2" fill-opacity=".55" stroke="${INK}" stroke-width="4"/>`;
        for (let i = 0; i < 9; i++) s += `<circle cx="${n2(x + 10 + R() * (w - 20))}" cy="${n2(y - 8 - R() * hh * 0.55)}" r="${n2(rr(5, 8))}" fill="${CANDY[Math.floor(R() * 5)]}"/>`;
        s += `<rect x="${n2(x + 6)}" y="${n2(y - hh - 12)}" width="${n2(w - 12)}" height="14" rx="4" fill="#8a6a4a" stroke="${INK}" stroke-width="3"/><path d="M${n2(x + 8)},${n2(y - hh + 12)} v${n2(hh * 0.6)}" stroke="#fff" stroke-width="5" opacity=".6" stroke-linecap="round"/>`;
      } else if (!modern && kind === 1) {    // tin can with label
        s += `<rect x="${n2(x)}" y="${n2(y - hh)}" width="${n2(w)}" height="${n2(hh)}" fill="${col}" stroke="${INK}" stroke-width="4"/><rect x="${n2(x)}" y="${n2(y - hh * 0.7)}" width="${n2(w)}" height="${n2(hh * 0.38)}" fill="#f6efe2" stroke="${INK}" stroke-width="2"/>` +
          `<ellipse cx="${n2(x + w / 2)}" cy="${n2(y - hh * 0.51)}" rx="${n2(w * 0.25)}" ry="${n2(hh * 0.1)}" fill="${dk(col, 0.2)}"/><rect x="${n2(x + 4)}" y="${n2(y - hh + 4)}" width="8" height="${n2(hh - 8)}" fill="#fff" opacity=".35"/>`;
      } else if (!modern && kind === 2) {    // flour sack
        s += `<path d="M${n2(x)},${n2(y)} Q${n2(x - 4)},${n2(y - hh * 0.6)} ${n2(x + 8)},${n2(y - hh)} L${n2(x + w - 8)},${n2(y - hh)} Q${n2(x + w + 4)},${n2(y - hh * 0.6)} ${n2(x + w)},${n2(y)}Z" fill="#e2d2b0" stroke="${INK}" stroke-width="4"/><path d="M${n2(x + 6)},${n2(y - hh + 8)} q${n2(w / 2 - 6)},12 ${n2(w - 12)},0" stroke="#b8a070" stroke-width="3" fill="none"/>`;
      } else if (!modern) {                  // bottle
        s += `<path d="M${n2(x + w * 0.2)},${n2(y)} L${n2(x + w * 0.2)},${n2(y - hh * 0.6)} Q${n2(x + w * 0.2)},${n2(y - hh * 0.75)} ${n2(x + w * 0.4)},${n2(y - hh * 0.8)} L${n2(x + w * 0.4)},${n2(y - hh)} L${n2(x + w * 0.6)},${n2(y - hh)} L${n2(x + w * 0.6)},${n2(y - hh * 0.8)} Q${n2(x + w * 0.8)},${n2(y - hh * 0.75)} ${n2(x + w * 0.8)},${n2(y - hh * 0.6)} L${n2(x + w * 0.8)},${n2(y)}Z" fill="${['#4a7a3a', '#7a3a2a', '#3a5a8a'][Math.floor(R() * 3)]}" stroke="${INK}" stroke-width="4"/>` +
          `<rect x="${n2(x + w * 0.24)}" y="${n2(y - hh * 0.45)}" width="${n2(w * 0.52)}" height="${n2(hh * 0.22)}" fill="#f6efe2"/>`;
        x += 10;
      } else {                              // modern box / bottle / bag
        if (kind === 0) s += `<rect x="${n2(x)}" y="${n2(y - hh)}" width="${n2(w)}" height="${n2(hh)}" rx="4" fill="${col}" stroke="${INK}" stroke-width="3"/><circle cx="${n2(x + w / 2)}" cy="${n2(y - hh * 0.55)}" r="${n2(w * 0.22)}" fill="#fff" opacity=".85"/><rect x="${n2(x + 6)}" y="${n2(y - hh * 0.2)}" width="${n2(w - 12)}" height="8" fill="${dk(col, 0.3)}"/>`;
        else if (kind === 1) s += `<path d="M${n2(x + 6)},${n2(y)} L${n2(x + 6)},${n2(y - hh * 0.7)} Q${n2(x + w / 2)},${n2(y - hh * 0.85)} ${n2(x + w * 0.4)},${n2(y - hh)} L${n2(x + w * 0.6)},${n2(y - hh)} Q${n2(x + w / 2)},${n2(y - hh * 0.85)} ${n2(x + w - 6)},${n2(y - hh * 0.7)} L${n2(x + w - 6)},${n2(y)}Z" fill="${col}" stroke="${INK}" stroke-width="3"/><rect x="${n2(x + 10)}" y="${n2(y - hh * 0.5)}" width="${n2(w - 20)}" height="${n2(hh * 0.22)}" fill="#fff" opacity=".8"/>`;
        else s += `<path d="M${n2(x)},${n2(y)} L${n2(x + 4)},${n2(y - hh)} L${n2(x + w - 4)},${n2(y - hh)} L${n2(x + w)},${n2(y)}Z" fill="${col}" stroke="${INK}" stroke-width="3"/><path d="M${n2(x + 4)},${n2(y - hh + 10)} L${n2(x + w - 4)},${n2(y - hh + 10)}" stroke="${INK}" stroke-width="3"/><text x="${n2(x + w / 2)}" y="${n2(y - hh * 0.4)}" text-anchor="middle" font-size="16" ${SANS} fill="#fff">YUM</text>`;
      }
      x += w + rr(4, 12);
    }
    return s;
  }

  // ---------- 1880s general store ----------
  function oldStore(seed = 3) {
    const [R, rr] = rngOf(seed);
    let wall = `<defs>${grad('os-wall', [[0, '#7a4a28'], [1, '#5a341c']])}${grad('os-floor', [[0, '#8a5a32'], [1, '#5a3a20']])}${grad('os-win', [[0, '#bfe4ff'], [1, '#fff2d0']])}${grad('os-counter', [[0, '#8a4e26'], [1, '#5a3014']])}</defs>`;
    wall += `<rect x="-700" y="-700" width="2500" height="2000" fill="url(#os-wall)"/>`;
    for (let x = -700; x < 1800; x += 64) wall += `<path d="M${x},-700 V1300" stroke="#4a2a14" stroke-width="4"/><path d="M${x + 6},-700 V1300" stroke="#9a6a40" stroke-width="2" opacity=".5"/>`;
    wall += P.woodGrain({ x: -700, y: -700, w: 2500, h: 2000, seed: 9, knots: 3, color: '#3a1e0c', op: 0.18, vertical: true });
    // window (left) with daylight
    wall += `<rect x="-330" y="80" width="340" height="560" fill="url(#os-win)" stroke="${INK}" stroke-width="10"/><path d="M-160,80 V640 M-330,360 H10" stroke="#6a4024" stroke-width="16"/>` +
      `<path d="M-300,120 l90,160 M-120,110 l90,170" stroke="#fff" stroke-width="10" opacity=".6"/><rect x="-350" y="630" width="380" height="30" fill="#8a5a32" stroke="${INK}" stroke-width="6"/>`;
    // sign
    wall += `<rect x="150" y="-150" width="780" height="120" rx="12" fill="#3a2a1a" stroke="${INK}" stroke-width="8"/><rect x="164" y="-136" width="752" height="92" rx="8" fill="none" stroke="#d8b25a" stroke-width="4"/>` +
      `<text x="540" y="-70" text-anchor="middle" font-size="58" ${SERIF} fill="#e8c46a" letter-spacing="4">GENERAL STORE</text>`;
    // shelves full of goods
    for (const [i, y] of [[0, 300], [1, 560], [2, 820], [3, 1080]].map(([i, y]) => [i, y])) {
      wall += `<rect x="60" y="${y}" width="1500" height="26" fill="#9a6232" stroke="${INK}" stroke-width="6"/><rect x="60" y="${y + 26}" width="1500" height="12" fill="#4a2a14"/>` + goodsRow(80, 1540, y, 190, seed * 10 + i);
      for (let x = 160; x < 1540; x += 360) wall += tag({ x, y: y + 64, text: '$1.00', s: 0.42, string: false });
    }
    // oil lamps (light sources)
    for (const lx of [320, 860]) wall += `<path d="M${lx},-700 V160" stroke="${INK}" stroke-width="5"/><path d="M${lx - 36},210 Q${lx},120 ${lx + 36},210Z" fill="#c8963f" stroke="${INK}" stroke-width="5"/><rect x="${lx - 22}" y="160" width="44" height="40" rx="14" fill="#fff4c8" stroke="${INK}" stroke-width="4"/>`;
    wall += root.Look ? root.Look.glow(320, 190, 260, '#ffd080', 0.55) + root.Look.glow(860, 190, 260, '#ffd080', 0.55) + root.Look.rays(-160, 300, 1800, 7, 50, 30, '#fff2c8', 0.12) : '';
    // floor
    wall += `<rect x="-700" y="1300" width="2500" height="900" fill="url(#os-floor)" stroke="${INK}" stroke-width="6"/>`;
    for (let i = -12; i < 26; i++) wall += `<path d="M${540 + i * 90},1300 L${540 + i * 170},2200" stroke="#4a2a14" stroke-width="4"/>`;
    // counter (in front of the staff, behind customers)
    let counter = `<rect x="-400" y="1200" width="1880" height="40" fill="#a86a3a" stroke="${INK}" stroke-width="7"/><rect x="-400" y="1200" width="1880" height="10" fill="#d89a5a" opacity=".6"/>` +
      `<rect x="-380" y="1240" width="1840" height="420" fill="url(#os-counter)" stroke="${INK}" stroke-width="7"/>`;
    for (let x = -340; x < 1440; x += 300) counter += `<rect x="${x}" y="1280" width="250" height="330" rx="8" fill="none" stroke="#3a1c0a" stroke-width="6"/><rect x="${x + 8}" y="1288" width="234" height="314" rx="6" fill="none" stroke="#a86a3a" stroke-width="2" opacity=".6"/>`;
    counter += P.woodGrain({ x: -380, y: 1240, w: 1840, h: 420, seed: 4, knots: 2, color: '#2a1408', op: 0.25 });
    counter += `<g id="os-counter-top"></g>`;
    const near = `<g id="os-near"></g>`;
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
          if (c % 2 === 0) { const m = [(p00[0] + p11[0]) / 2, (p00[1] + p11[1]) / 2]; s += `<circle cx="${n2(m[0])}" cy="${n2(m[1])}" r="${n2(lerp(16, 2, k0))}" fill="#fff" opacity=".8"/>`; }
        }
        const e0 = P3(side, 0, h0), e1 = P3(side, 1, h0), e0b = P3(side, 0, h0 - 0.035), e1b = P3(side, 1, h0 - 0.035);
        s += `<path d="M${e0.map(n2)} L${e1.map(n2)} L${e1b.map(n2)} L${e0b.map(n2)}Z" fill="#dfe4e6" stroke="${INK}" stroke-width="3"/>`;
        for (let c = 0; c < 6; c++) { const k = 0.02 + c * 0.13, p = P3(side, k, h0 - 0.017), sc = lerp(0.36, 0.06, k); s += `<g transform="translate(${n2(p[0])} ${n2(p[1])}) scale(${n2(sc)})"><rect x="-80" y="-32" width="160" height="64" rx="6" fill="#ffe14a" stroke="${INK}" stroke-width="5"/><text x="0" y="20" text-anchor="middle" font-size="52" ${SANS} fill="#c8282a">${['2.99', '4.99', '0.99', '9.99', '1.99', '3.99'][(c + lv + (side > 0 ? 2 : 0)) % 6]}</text></g>`; }
      }
    }
    // security camera dome near the ceiling (left)
    s += `<path d="M120,-120 V40" stroke="${INK}" stroke-width="8"/><path d="M60,40 Q120,140 180,40Z" fill="#2a2a32" stroke="${INK}" stroke-width="6"/><circle cx="120" cy="72" r="16" fill="#e84a3a"/>`;
    return {
      origin: [540, 1000],
      light: { preset: 'day', dir: -90, color: '#f4fbff', key: 0.2, rim: '#ffffff' },
      layers: [{ id: 'aisle', depth: 0.95, svg: s }, { id: 'actors', depth: 1, svg: '' }, { id: 'near', depth: 1.3, svg: '<g id="ai-near"></g>' }],
      update(t, o = {}) { const n = document.getElementById('ai-near'); if (n) n.innerHTML = o.near || ''; },
    };
  }

  // ---------- modern checkout ----------
  function checkout() {
    let s = `<defs>${grad('co-wall', [[0, '#e8eef0'], [1, '#c8d2d6']])}${grad('co-desk', [[0, '#4a5258'], [1, '#2a3036']])}</defs>`;
    s += `<rect x="-600" y="-600" width="2300" height="2600" fill="url(#co-wall)"/>`;
    for (let x = -600; x < 1700; x += 180) s += `<path d="M${x},-600 V1300" stroke="#d2dade" stroke-width="3"/>`;
    // framed portrait (the 1880s owner looks down on the modern checkout) + caption plate
    s += `<rect x="640" y="140" width="320" height="400" fill="#8a5a28" stroke="${INK}" stroke-width="8"/><rect x="664" y="164" width="272" height="352" fill="#e8dcc0" stroke="${INK}" stroke-width="5"/>` +
      `<g id="co-portrait"></g><rect x="720" y="560" width="160" height="40" rx="4" fill="#c8963f" stroke="${INK}" stroke-width="4"/><text x="800" y="588" text-anchor="middle" font-size="20" ${SERIF} fill="${INK}">EST. 1879</text>`;
    s += `<rect x="-600" y="1300" width="2300" height="800" fill="#d8dee0" stroke="${INK}" stroke-width="6"/>`;
    let desk = `<rect x="-400" y="1180" width="1900" height="620" fill="url(#co-desk)" stroke="${INK}" stroke-width="7"/><rect x="-400" y="1180" width="1900" height="70" fill="#1e2226" stroke="${INK}" stroke-width="6"/>`;
    for (let x = -380; x < 1500; x += 60) desk += `<path d="M${x},1186 v58" stroke="#3a4046" stroke-width="4"/>`;
    // card machine + screen
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
