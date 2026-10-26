/*
 * Study room at night — reusable background + lighting for 1080x1920.
 * Study.build() returns { back, light, update(t) }:
 *   back  : everything behind characters
 *   light : overlays that sit ABOVE characters, so one light falls on everything
 *   update: animates candle, lantern, stars, dust, sleeping cat
 */
(function (root) {
  'use strict';
  const INK = '#2b1d16';

  function build(seed = 11) {
    const R = root.Rig2D.rng(seed), rr = (a, b) => a + (b - a) * R(), pick = a => a[Math.floor(R() * a.length)];
    const WIN = 'M110,800 L110,470 A180,180 0 0 1 470,470 L470,800 Z';

    let defs = `
<linearGradient id="st-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e4630"/><stop offset=".5" stop-color="#b48660"/><stop offset="1" stop-color="#946a4b"/></linearGradient>
<linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121a42"/><stop offset=".7" stop-color="#334a8a"/><stop offset="1" stop-color="#5a6aa8"/></linearGradient>
<radialGradient id="st-moonGlow"><stop offset="0" stop-color="#fff4d0" stop-opacity=".75"/><stop offset="1" stop-color="#fff4d0" stop-opacity="0"/></radialGradient>
<linearGradient id="st-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#83502f"/><stop offset="1" stop-color="#5a3420"/></linearGradient>
<linearGradient id="st-woodV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6a3f25"/><stop offset=".4" stop-color="#83502f"/><stop offset="1" stop-color="#4e2d1a"/></linearGradient>
<linearGradient id="st-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5e3820"/><stop offset="1" stop-color="#3a2112"/></linearGradient>
<linearGradient id="st-candle" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff3d8"/><stop offset=".6" stop-color="#efdcb4"/><stop offset="1" stop-color="#c9a77a"/></linearGradient>
<radialGradient id="st-lantern" cx=".45" cy=".45" r=".6"><stop offset="0" stop-color="#ffd27a"/><stop offset=".55" stop-color="#e2582f"/><stop offset="1" stop-color="#9c2a1c"/></radialGradient>
<radialGradient id="st-glowWarm"><stop offset="0" stop-color="#ffb15a" stop-opacity=".9"/><stop offset=".35" stop-color="#ff9a45" stop-opacity=".35"/><stop offset="1" stop-color="#ff8a3a" stop-opacity="0"/></radialGradient>
<radialGradient id="st-glowRed"><stop offset="0" stop-color="#ff8a5a" stop-opacity=".55"/><stop offset="1" stop-color="#ff6a3a" stop-opacity="0"/></radialGradient>
<linearGradient id="st-shadeR" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#1d1a3a" stop-opacity=".55"/></linearGradient>
<linearGradient id="st-shadeTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1230" stop-opacity=".55"/><stop offset=".3" stop-color="#1a1230" stop-opacity="0"/></linearGradient>
<linearGradient id="st-beam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a9c0ff" stop-opacity=".22"/><stop offset="1" stop-color="#a9c0ff" stop-opacity="0"/></linearGradient>
<filter id="st-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter>
<filter id="st-soft3"><feGaussianBlur stdDeviation="3"/></filter>
<clipPath id="st-winClip"><path d="${WIN}"/></clipPath>`;

    // wall
    let s = `<rect width="1080" height="1320" fill="url(#st-wall)"/>`;
    for (let i = 0; i < 140; i++) s += `<ellipse cx="${rr(0, 1080)}" cy="${rr(220, 1120)}" rx="${rr(10, 60)}" ry="${rr(6, 30)}" fill="#4a2c1a" opacity="${rr(.03, .09)}"/>`;
    for (let i = 0; i < 26; i++) { let x = rr(40, 1040), y = rr(240, 1100), d = `M${x},${y}`; for (let k = 0; k < 4; k++) { x += rr(-14, 14); y += rr(6, 18); d += ` L${x},${y}`; } s += `<path d="${d}" stroke="#4a2c1a" stroke-width="2" fill="none" opacity=".35"/>`; }
    s += `<rect x="-10" y="140" width="1100" height="80" fill="url(#st-wood)" stroke="${INK}" stroke-width="5"/>`;
    for (let i = 0; i < 7; i++) { const y = 152 + i * 10; let d = `M0,${y}`; for (let x = 60; x <= 1080; x += 60) d += ` Q${x - 30},${y + rr(-4, 4)} ${x},${y + rr(-2, 2)}`; s += `<path d="${d}" stroke="#4a2a17" stroke-width="2" fill="none" opacity=".5"/>`; }
    for (const x of [80, 330, 750, 1000]) s += `<circle cx="${x}" cy="180" r="9" fill="#3a2214" stroke="${INK}" stroke-width="3"/><circle cx="${x - 3}" cy="177" r="3" fill="#a87a50"/>`;
    s += `<rect x="-10" y="220" width="1100" height="14" fill="#2a1810" opacity=".35"/>`;
    for (const x of [0, 1030]) { s += `<rect x="${x}" y="220" width="50" height="1100" fill="url(#st-woodV)" stroke="${INK}" stroke-width="5"/>`; for (let i = 0; i < 4; i++) s += `<path d="M${x + 10 + i * 9},230 Q${x + 14 + i * 9},700 ${x + 8 + i * 9},1310" stroke="#3a2214" stroke-width="2" fill="none" opacity=".5"/>`; }
    s += `<rect x="-10" y="1110" width="1100" height="210" fill="#5a3622" stroke="${INK}" stroke-width="5"/><rect x="-10" y="1110" width="1100" height="14" fill="#7b4c2c" stroke="${INK}" stroke-width="3"/>`;
    for (let i = 0; i < 6; i++) { const x = 20 + i * 178; s += `<rect x="${x}" y="1145" width="150" height="150" rx="6" fill="#4d2e1c" stroke="${INK}" stroke-width="3"/><path d="M${x + 4},1291 L${x + 4},1149 L${x + 146},1149" stroke="#7d5133" stroke-width="3" fill="none"/><path d="M${x + 75},1185 m-22,0 a22,22 0 1 0 44,0 a14,14 0 1 0 -28,0" stroke="#8a5d38" stroke-width="3" fill="none" opacity=".7"/>`; }

    // window
    s += `<g clip-path="url(#st-winClip)"><rect x="100" y="280" width="380" height="530" fill="url(#st-sky)"/>`;
    const stars = [];
    for (let i = 0; i < 34; i++) { stars.push({ ph: rr(0, 6.28), f: rr(1.5, 4) }); s += `<circle class="st-star" cx="${rr(115, 465)}" cy="${rr(300, 640)}" r="${rr(1.2, 3.2)}" fill="#fff8e0"/>`; }
    s += `<circle cx="372" cy="420" r="150" fill="url(#st-moonGlow)"/><circle cx="372" cy="420" r="54" fill="#f6ecc8" stroke="${INK}" stroke-width="4"/>`;
    for (const [x, y, r] of [[352, 402, 10], [390, 438, 13], [384, 398, 6], [356, 446, 7], [398, 416, 5]]) s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#dccfa3"/><path d="M${x - r * .7},${y + r * .5} a${r},${r} 0 0 0 ${r * 1.4},0" stroke="#c7b98a" stroke-width="2" fill="none"/>`;
    s += `<path d="M130,520 q40,-14 90,-4 q30,-12 70,0" stroke="#c9d3ff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/><path d="M300,560 q30,-10 70,-2 q30,-8 70,2" stroke="#c9d3ff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".4"/>`;
    s += `<path d="M100,700 L160,610 L205,660 L260,580 L320,650 L370,600 L430,670 L480,630 L480,810 L100,810 Z" fill="#26346a" stroke="#1a2350" stroke-width="3"/><path d="M100,740 L150,690 L210,720 L280,670 L340,715 L400,685 L480,730 L480,810 L100,810 Z" fill="#1b2550"/>`;
    s += `<g fill="#141b3d"><rect x="230" y="660" width="40" height="80"/><path d="M215,665 L285,665 L262,645 L238,645 Z"/><path d="M220,700 L280,700 L262,684 L238,684 Z"/><rect x="247" y="625" width="6" height="22"/></g>`;
    for (const [x, y] of [[240, 712], [256, 712], [248, 728], [240, 676], [258, 676]]) s += `<rect x="${x}" y="${y}" width="5" height="7" fill="#ffd27a"/>`;
    s += `<path d="M100,770 Q200,750 300,772 T480,760 L480,810 L100,810 Z" fill="#121a3a"/></g>`;
    for (const x of [200, 290, 380]) s += `<rect x="${x - 6}" y="290" width="12" height="512" fill="#5a3622" stroke="${INK}" stroke-width="3"/>`;
    for (const y of [560, 680]) s += `<rect x="110" y="${y - 6}" width="360" height="12" fill="#5a3622" stroke="${INK}" stroke-width="3"/>`;
    s += `<path d="${WIN}" fill="none" stroke="${INK}" stroke-width="34"/><path d="${WIN}" fill="none" stroke="#6e4429" stroke-width="24"/><path d="${WIN}" fill="none" stroke="#9a6a42" stroke-width="3" transform="translate(-6,-4)" opacity=".7"/>`;
    s += `<rect x="84" y="800" width="412" height="34" rx="4" fill="url(#st-wood)" stroke="${INK}" stroke-width="5"/><rect x="88" y="804" width="404" height="6" fill="#a06a40" opacity=".7"/><g transform="translate(410,800)">`;
    for (let i = 0; i < 9; i++) { const a = -150 + i * 15 + rr(-6, 6), L = rr(60, 95), rad = a * Math.PI / 180, ex = Math.cos(rad) * L, ey = Math.sin(rad) * L; s += `<path d="M0,-40 Q${ex * .4 - 6},${ey * .6 - 50} ${ex},${ey - 40} Q${ex * .6 + 6},${ey * .4 - 34} 0,-40 Z" fill="${i % 2 ? '#4f7d3a' : '#5f9444'}" stroke="${INK}" stroke-width="3"/><path d="M0,-40 Q${ex * .5},${ey * .5 - 42} ${ex * .9},${ey * .9 - 40}" stroke="#2f5224" stroke-width="2" fill="none"/>`; }
    s += `<path d="M-36,-46 L36,-46 L28,0 L-28,0 Z" fill="#b65e38" stroke="${INK}" stroke-width="4"/><rect x="-40" y="-52" width="80" height="12" rx="3" fill="#c96d43" stroke="${INK}" stroke-width="3"/><path d="M-30,-24 L30,-24" stroke="#8a3f22" stroke-width="3"/></g>`;

    // shelf
    s += `<rect x="652" y="300" width="380" height="820" fill="#3e2416" stroke="${INK}" stroke-width="5"/>`;
    for (let i = 0; i < 10; i++) s += `<path d="M${660 + i * 38},305 L${662 + i * 38},1110" stroke="#2c180d" stroke-width="2" opacity=".6"/>`;
    const bookCols = ['#7a2e2a', '#2f4f6f', '#5c6b2f', '#8a5a2b', '#4a3260', '#a0442c', '#2d5d52', '#6b2f45', '#7c6a3a'];
    const books = y0 => { let o = '', x = 668; while (x < 1005) { const w = rr(22, 36), h = rr(105, 165), c = pick(bookCols); if (x + w > 1012) break; const lean = (R() < .12 && x > 900) ? rr(-10, -6) : 0; o += `<g transform="rotate(${lean} ${x + w} ${y0})"><rect x="${x}" y="${y0 - h}" width="${w}" height="${h}" rx="3" fill="${c}" stroke="${INK}" stroke-width="3"/><rect x="${x + w - 6}" y="${y0 - h + 2}" width="5" height="${h - 4}" fill="#000" opacity=".25"/><rect x="${x + 2}" y="${y0 - h + 2}" width="4" height="${h - 4}" fill="#fff" opacity=".15"/><path d="M${x},${y0 - h + 16} h${w} M${x},${y0 - h + 22} h${w} M${x},${y0 - 20} h${w}" stroke="#d8b25a" stroke-width="2.5"/><rect x="${x + w * .2}" y="${y0 - h * .6}" width="${w * .6}" height="${h * .18}" fill="#e9dcc0" stroke="${INK}" stroke-width="1.5" opacity=".85"/></g>`; x += w + rr(0, 3); } return o; };
    const board = y => `<rect x="652" y="${y}" width="380" height="24" fill="url(#st-wood)" stroke="${INK}" stroke-width="4"/><rect x="652" y="${y + 24}" width="380" height="10" fill="#000" opacity=".35"/>`;
    const jar = (cx, base, w, h, col, band) => `<path d="M${cx - w * .3},${base} C${cx - w * .62},${base - h * .3} ${cx - w * .6},${base - h * .8} ${cx - w * .25},${base - h * .85} L${cx - w * .2},${base - h} L${cx + w * .2},${base - h} L${cx + w * .25},${base - h * .85} C${cx + w * .6},${base - h * .8} ${cx + w * .62},${base - h * .3} ${cx + w * .3},${base} Z" fill="${col}" stroke="${INK}" stroke-width="3.5"/><path d="M${cx - w * .47},${base - h * .55} Q${cx},${base - h * .5} ${cx + w * .47},${base - h * .55}" stroke="${band}" stroke-width="5" fill="none"/><path d="M${cx - w * .44},${base - h * .42} Q${cx},${base - h * .37} ${cx + w * .44},${base - h * .42}" stroke="${band}" stroke-width="2" fill="none"/><path d="M${cx - w * .3},${base - h * .75} Q${cx - w * .42},${base - h * .5} ${cx - w * .3},${base - h * .2}" stroke="#fff" stroke-width="4" fill="none" opacity=".35" stroke-linecap="round"/><rect x="${cx - w * .26}" y="${base - h - 8}" width="${w * .52}" height="10" rx="3" fill="${col}" stroke="${INK}" stroke-width="3"/>`;
    s += books(470) + board(470) + jar(705, 690, 70, 110, '#3f6f8a', '#e8d7a0') + jar(785, 690, 58, 80, '#b9a27a', '#6e3a22');
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - r; c++) { const cx = 860 + c * 30 + r * 15, cy = 678 - r * 26; s += `<circle cx="${cx}" cy="${cy}" r="14" fill="#e6d3a8" stroke="${INK}" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="6" fill="none" stroke="#a7834f" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="2" fill="#7a5a30"/>`; }
    s += `<path d="M985,690 l0,-60 l18,-10 l0,60 Z" fill="#8a2f2a" stroke="${INK}" stroke-width="3"/>` + board(690) + books(910) + board(910);
    s += jar(720, 1110, 80, 130, '#2f5c4a', '#d7b25a') + jar(960, 1110, 70, 120, '#7b3a2c', '#e8c27a');
    s += `<rect x="790" y="1060" width="120" height="50" fill="#5a3a22" stroke="${INK}" stroke-width="3"/><rect x="790" y="1060" width="120" height="10" fill="#7b5233"/><circle cx="850" cy="1088" r="6" fill="#d6ad55" stroke="${INK}" stroke-width="2"/>` + board(1100);

    // lantern
    s += `<g id="st-lantern-g"><line x1="560" y1="220" x2="560" y2="252" stroke="${INK}" stroke-width="4"/><rect x="526" y="250" width="68" height="16" rx="3" fill="#3a2214" stroke="${INK}" stroke-width="3"/><ellipse cx="560" cy="330" rx="74" ry="72" fill="url(#st-lantern)" stroke="${INK}" stroke-width="5"/>`;
    for (const k of [-.75, -.4, 0, .4, .75]) s += `<path d="M${560 + k * 20},262 Q${560 + k * 96},330 ${560 + k * 20},398" stroke="#7a2416" stroke-width="2.5" fill="none" opacity=".75"/>`;
    s += `<path d="M545,300 l30,0 M545,315 l30,0 M560,300 l0,40 M548,330 q12,10 24,0" stroke="#5a1a10" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="526" y="394" width="68" height="16" rx="3" fill="#3a2214" stroke="${INK}" stroke-width="3"/><circle cx="560" cy="418" r="7" fill="#d6ad55" stroke="${INK}" stroke-width="2"/>`;
    for (let i = -3; i <= 3; i++) s += `<line x1="560" y1="424" x2="${560 + i * 3}" y2="${478 - Math.abs(i) * 3}" stroke="#b8322a" stroke-width="3"/>`;
    s += `</g>`;

    // floor + rug
    s += `<rect y="1310" width="1080" height="610" fill="url(#st-floor)"/>`;
    let py = 1330;
    for (let i = 0; i < 9; i++) { const gap = 24 + i * 9; s += `<line x1="0" y1="${py}" x2="1080" y2="${py}" stroke="#24130a" stroke-width="3"/>`; for (let x = rr(0, 200); x < 1080; x += rr(180, 320)) s += `<line x1="${x}" y1="${py}" x2="${x}" y2="${py + gap}" stroke="#24130a" stroke-width="3"/>`; s += `<path d="M0,${py + gap * .5} Q300,${py + gap * .4} 600,${py + gap * .55} T1080,${py + gap * .5}" stroke="#7a4a2a" stroke-width="2" fill="none" opacity=".35"/>`; py += gap; }
    s += `<path d="M200,1560 L880,1560 L1040,1900 L40,1900 Z" fill="#6e2a26" stroke="${INK}" stroke-width="4"/><path d="M226,1574 L854,1574 L1000,1884 L80,1884 Z" fill="none" stroke="#d8a85a" stroke-width="6"/><path d="M252,1590 L828,1590 L962,1868 L118,1868 Z" fill="#2a3e5a" stroke="${INK}" stroke-width="3"/>`;
    for (let i = 0; i < 13; i++) { const x = 276 + i * 44; s += `<path d="M${x},1582 l7,-5 l7,5 l-7,5 Z" fill="#e8c27a"/>`; }
    s += `<path d="M420,1700 l40,-28 l40,28 l-40,28 Z M580,1700 l40,-28 l40,28 l-40,28 Z" fill="none" stroke="#c9974e" stroke-width="4" opacity=".7"/><circle cx="540" cy="1760" r="46" fill="none" stroke="#c9974e" stroke-width="4" opacity=".6"/>`;

    // side table with candle and books (left)
    s += `<ellipse cx="170" cy="1745" rx="150" ry="18" fill="#000" opacity=".45" filter="url(#st-soft)"/>`;
    for (const x of [62, 262]) s += `<path d="M${x},1500 L${x + 26},1500 L${x + 24},1720 Q${x + 34},1734 ${x + 36},1744 L${x - 10},1744 Q${x - 6},1732 ${x + 2},1720 Z" fill="url(#st-woodV)" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
    s += `<path d="M40,1462 L310,1462 L330,1490 L20,1490 Z" fill="#8a552e" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><rect x="20" y="1490" width="310" height="34" fill="#5d341c" stroke="${INK}" stroke-width="5"/><path d="M70,1507 q20,-10 40,0 q20,10 40,0" stroke="#c7953f" stroke-width="3" fill="none"/>`;
    s += `<ellipse cx="180" cy="1460" rx="56" ry="13" fill="#c8963f" stroke="${INK}" stroke-width="4"/><path d="M150,1340 L150,1456 Q180,1466 210,1456 L210,1340 Z" fill="url(#st-candle)" stroke="${INK}" stroke-width="4"/><ellipse cx="180" cy="1340" rx="30" ry="8" fill="#fff6e0" stroke="${INK}" stroke-width="3"/><path d="M155,1342 q-2,22 4,30 q6,-6 4,-28 M196,1344 q2,32 8,40 q5,-10 1,-40" fill="#fff4dc" stroke="${INK}" stroke-width="2.5"/><line x1="180" y1="1336" x2="181" y2="1322" stroke="#1a1010" stroke-width="3"/><path id="st-flameO" fill="#ff9d3a"/><path id="st-flameI" fill="#fff2b0"/>`;
    s += `<g transform="rotate(-3 270 1440)"><rect x="232" y="1426" width="88" height="30" rx="4" fill="#7a2e2a" stroke="${INK}" stroke-width="4"/><rect x="238" y="1431" width="76" height="9" fill="#efe2c4"/></g><g transform="rotate(4 270 1410)"><rect x="240" y="1398" width="72" height="28" rx="4" fill="#2f4f6f" stroke="${INK}" stroke-width="4"/><path d="M248,1412 h56" stroke="#d8b25a" stroke-width="3"/></g>`;

    // sleeping cat (right, on the floor)
    s += `<ellipse cx="900" cy="1752" rx="120" ry="16" fill="#000" opacity=".4" filter="url(#st-soft3)"/><g id="st-cat"><g transform="translate(500 -114)">` +
      `<path d="M300,1866 C280,1800 340,1760 410,1764 C480,1768 520,1810 506,1866 Z" fill="#d98a3e" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>` +
      `<path d="M330,1790 q14,10 10,30 M370,1772 q12,14 6,36 M415,1770 q10,16 2,38 M458,1782 q6,16 -4,34" stroke="#a55820" stroke-opacity=".5" stroke-width="7" fill="none" stroke-linecap="round"/>` +
      `<path d="M500,1860 C540,1858 548,1826 520,1820 C506,1818 500,1832 512,1836" stroke="${INK}" stroke-width="20" fill="none" stroke-linecap="round"/><path d="M500,1860 C540,1858 548,1826 520,1820 C506,1818 500,1832 512,1836" stroke="#d98a3e" stroke-width="11" fill="none" stroke-linecap="round"/>` +
      `<path d="M292,1800 L300,1752 L326,1784 Z M362,1782 L384,1752 L384,1800 Z" fill="#d98a3e" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M302,1764 l10,14 M378,1764 l-8,14" stroke="#f0b0a0" stroke-width="5" stroke-linecap="round"/>` +
      `<ellipse cx="340" cy="1818" rx="56" ry="46" fill="#e0954a" stroke="${INK}" stroke-width="6"/><path d="M310,1816 q10,8 20,0 M352,1816 q10,8 20,0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>` +
      `<path d="M336,1830 l8,0 l-4,5 Z" fill="#c0506a" stroke="${INK}" stroke-width="2"/><ellipse cx="340" cy="1848" rx="26" ry="12" fill="#f6e2c6"/><path d="M300,1832 l-24,-4 M300,1838 l-24,4 M380,1832 l24,-4 M380,1838 l24,4" stroke="${INK}" stroke-width="2.5"/>` +
      `<path d="M320,1790 l4,10 M340,1786 l0,10 M360,1790 l-4,10" stroke="#a55820" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/><path d="M330,1866 q-6,-12 8,-12 q10,0 6,12" fill="#f6e2c6" stroke="${INK}" stroke-width="4"/></g></g>` +
      `<text id="st-zz" x="900" y="1610" font-family="Inter,sans-serif" font-weight="800" font-size="34" fill="#f4ead6" stroke="${INK}" stroke-width="6" paint-order="stroke">z</text>`;

    const back = `<defs>${defs}</defs>${s}`;

    const motes = Array.from({ length: 46 }, () => ({ x: rr(60, 700), y: rr(900, 1500), s: rr(6, 22), a: rr(10, 30), ph: rr(0, 6.28), r: rr(1.5, 3.6) }));
    const light = `<path d="M120,800 L470,800 L860,1920 L300,1920 Z" fill="url(#st-beam)" filter="url(#st-soft)" style="mix-blend-mode:screen"/>` +
      `<rect width="1080" height="1920" fill="url(#st-shadeR)" style="mix-blend-mode:multiply"/><rect width="1080" height="1920" fill="url(#st-shadeTop)" style="mix-blend-mode:multiply"/>` +
      `<circle id="st-glowC" cx="180" cy="1300" r="760" fill="url(#st-glowWarm)" style="mix-blend-mode:screen"/><circle id="st-glowL" cx="560" cy="330" r="330" fill="url(#st-glowRed)" style="mix-blend-mode:screen"/>` +
      `<g>${motes.map((m, i) => `<circle id="st-m${i}" r="${m.r}" fill="#ffd9a0"/>`).join('')}</g>`;

    function update(t) {
      const $ = id => document.getElementById(id);
      const sx = Math.sin(t * 9.3) * 4 + Math.sin(t * 14.1) * 2, h = 62 + Math.sin(t * 11) * 5 + Math.sin(t * 23) * 3;
      $('st-flameO').setAttribute('d', `M180,1334 C154,1326 156,1296 ${180 + sx},${1328 - h} C204,1296 206,1326 180,1334 Z`);
      $('st-flameI').setAttribute('d', `M180,1330 C168,1324 170,1306 ${180 + sx * .6},${1328 - h * .6} C190,1306 192,1324 180,1330 Z`);
      $('st-glowC').setAttribute('opacity', .62 + .07 * Math.sin(t * 11) + .05 * Math.sin(t * 17.3));
      $('st-glowC').setAttribute('cx', 180 + sx * .5);
      $('st-glowL').setAttribute('opacity', .8 + .08 * Math.sin(t * 3));
      $('st-lantern-g').setAttribute('transform', `rotate(${Math.sin(t * 1.3) * 2.2} 560 220)`);
      document.querySelectorAll('.st-star').forEach((e, i) => e.setAttribute('opacity', .45 + .55 * Math.abs(Math.sin(t * stars[i].f + stars[i].ph))));
      motes.forEach((m, i) => {
        const y = ((m.y - t * m.s - 900) % 600 + 600) % 600 + 900, x = m.x + Math.sin(t * .8 + m.ph) * m.a, el = $('st-m' + i);
        el.setAttribute('cx', x); el.setAttribute('cy', y);
        el.setAttribute('opacity', (.25 + .5 * Math.abs(Math.sin(t * 1.7 + m.ph))) * Math.max(0, 1 - Math.hypot(x - 180, y - 1300) / 700));
      });
      $('st-cat').setAttribute('transform', `translate(900,1752) scale(1,${1 + Math.sin(t * 2.2) * .025}) translate(-900,-1752)`);
      const zk = (t * .6) % 1;
      $('st-zz').setAttribute('transform', `translate(${zk * 30},${-zk * 60})`);
      $('st-zz').setAttribute('opacity', Math.sin(Math.PI * zk));
    }
    return { back, light, update };
  }

  root.Study = { build };
})(typeof window !== 'undefined' ? window : globalThis);
