// Real-life props for the 3D sets (CLAUDE.md "Props must follow real life").
// Each prop is built from the anatomy of the real object (listed above each function), in our own design,
// drawn on a canvas at print resolution and given relief (bump from the same artwork) so it reads as 3D.
//   import { RealProps } from './realprops.js';  const P = RealProps(THREE, { RoundedBoxGeometry, rnd });
export function RealProps(THREE, { RoundedBoxGeometry, rnd = Math.random }) {
  const rr = (a, b) => a + (b - a) * rnd(), pick = a => a[Math.floor(rnd() * a.length)];
  const SERIF = 'FreeSerif', BOOK = 'Bitstream Charter', TYPE = 'Courier 10 Pitch', HAND = 'italic 400 {s}px FreeSerif';
  const font = (w, s, f = SERIF) => `${w} ${s}px "${f}"`;

  // ---------- canvas helpers ----------
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function texture(c, opt = {}) {
    const t = new THREE.CanvasTexture(c); t.colorSpace = opt.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  // material with the artwork as color and its luminance as relief (ink sits slightly into the paper / stamped metal)
  function printMat(c, o = {}) {
    const bump = canvas(c.width, c.height), b = bump.getContext('2d');
    b.filter = o.invert ? 'grayscale(1) invert(1) blur(0.6px)' : 'grayscale(1) blur(0.6px)'; b.drawImage(c, 0, 0);
    return new THREE.MeshStandardMaterial(Object.assign({ map: texture(c), bumpMap: texture(bump, { linear: true }), bumpScale: o.bump ?? 1.5, roughness: 0.75 }, o.mat || {}));
  }
  // paper: base tone, fibres, speckles, edge darkening
  function paper(g, w, h, base = '#efe3c4', age = 0.5) {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < w * h / 900; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '120,90,40' : '255,250,235'},${rr(0.03, 0.09)})`; g.fillRect(rr(0, w), rr(0, h), rr(1, 3), rr(1, 3)); }
    g.strokeStyle = 'rgba(110,80,40,0.08)'; g.lineWidth = 1;
    for (let i = 0; i < w * h / 6000; i++) { const x = rr(0, w), y = rr(0, h), a = rr(0, 6.3), l = rr(4, 14); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    const e = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.55);
    e.addColorStop(0, 'rgba(0,0,0,0)'); e.addColorStop(1, `rgba(110,70,20,${0.35 * age})`); g.fillStyle = e; g.fillRect(0, 0, w, h);
  }
  function text(g, s, x, y, f, col = '#2a1a10', align = 'center', maxW = 1e9) {
    g.font = f; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic';
    let sz = parseFloat(f.match(/(\d+(\.\d+)?)px/)[1]);
    while (g.measureText(s).width > maxW && sz > 6) { sz -= 1; g.font = f.replace(/\d+(\.\d+)?px/, sz + 'px'); }
    g.fillText(s, x, y);
  }
  const hand = s => HAND.replace('{s}', s);
  // handwriting: italic serif with a slight baseline wobble per letter
  function scrawl(g, s, x, y, size, col = '#1a1a3a', ang = -0.04) {
    g.save(); g.translate(x, y); g.rotate(ang); g.font = hand(size); g.fillStyle = col; g.textAlign = 'left';
    let cx = 0; for (const ch of s) { g.fillText(ch, cx, Math.sin(cx * 0.09) * size * 0.04); cx += g.measureText(ch).width * rr(0.96, 1.04); }
    g.restore();
  }
  function signature(g, x, y, w, col = '#1a1a3a') {
    g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y);
    for (let i = 1; i <= 30; i++) { const k = i / 30; g.lineTo(x + k * w, y + Math.sin(k * 19 + rnd()) * 9 * (1 - k * 0.6) - k * 4); }
    g.stroke(); g.beginPath(); g.moveTo(x + w * 0.1, y + 10); g.quadraticCurveTo(x + w * 0.5, y + 16, x + w * 1.02, y + 4); g.stroke();
  }
  // lathe work (engraved rosette lines), as on notes, cheques and stock certificates
  function guilloche(g, cx, cy, R, amp, waves, lines, col, lw = 0.8) {
    g.strokeStyle = col; g.lineWidth = lw;
    for (let k = 0; k < lines; k++) { g.beginPath(); for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.01) { const r = R + amp * Math.sin(waves * a + k * Math.PI * 2 / lines); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.stroke(); }
  }
  function latheBand(g, x, y, w, h, col, n = 6) {   // wavy engraved band for borders
    g.strokeStyle = col; g.lineWidth = 0.9;
    for (let k = 0; k < n; k++) { g.beginPath(); for (let i = 0; i <= w; i += 2) g.lineTo(x + i, y + h / 2 + Math.sin(i * 0.12 + k * 1.05) * h * 0.42); g.stroke(); }
  }
  function serial(n) { return pick('ABCDEFGHJK') + String(Math.floor(rr(1e7, 1e8))).slice(0, 8) + (n || ''); }
  function sawSeal(g, cx, cy, r, col, teeth = 40) {
    g.fillStyle = col; g.beginPath();
    for (let i = 0; i <= teeth * 2; i++) { const a = i / (teeth * 2) * Math.PI * 2, rad = i % 2 ? r : r * 0.88; g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); }
    g.fill(); g.strokeStyle = '#fff4e0'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r * 0.72, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, cy, r * 0.6, 0, 7); g.stroke();
  }
  function star(g, cx, cy, r, col) { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r; g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } g.fill(); }
  function ribbon(g, cx, cy, w, h, col, s, f, ink = '#fff4dc') {
    g.fillStyle = col; const tail = h * 0.9;
    for (const d of [-1, 1]) { g.beginPath(); g.moveTo(cx + d * (w / 2 - 4), cy - h / 2 + 6); g.lineTo(cx + d * (w / 2 + tail), cy - h / 2 + 6); g.lineTo(cx + d * (w / 2 + tail * 0.6), cy + 6); g.lineTo(cx + d * (w / 2 + tail), cy + h / 2 + 6); g.lineTo(cx + d * (w / 2 - 4), cy + h / 2 + 6); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.35)'; for (const d of [-1, 1]) { g.beginPath(); g.moveTo(cx + d * (w / 2 - 4), cy + h / 2); g.lineTo(cx + d * (w / 2 - 4), cy + h / 2 + 6); g.lineTo(cx + d * (w / 2 + 6), cy + h / 2 + 6); g.fill(); }
    g.fillStyle = col; g.fillRect(cx - w / 2, cy - h / 2, w, h);
    g.strokeStyle = 'rgba(255,240,200,.6)'; g.lineWidth = 2; g.strokeRect(cx - w / 2 + 5, cy - h / 2 + 5, w - 10, h - 10);
    text(g, s, cx, cy + h * 0.22, f, ink, 'center', w - 20);
  }
  function medal(g, cx, cy, r, year, col = '#c89a3a') {
    g.fillStyle = col; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    g.strokeStyle = '#6a4a14'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r * 0.82, 0, 7); g.stroke();
    for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; g.fillStyle = '#7a5a1a'; g.fillRect(cx + Math.cos(a) * r * 0.91 - 1, cy + Math.sin(a) * r * 0.91 - 1, 2, 2); }
    text(g, 'AWARD', cx, cy - r * 0.15, font('bold', r * 0.36, BOOK), '#4a3010'); text(g, String(year), cx, cy + r * 0.38, font('bold', r * 0.42, BOOK), '#4a3010');
  }
  function doubleRule(g, x, y, w, h, col, gap = 6, lw = 2) { g.strokeStyle = col; g.lineWidth = lw; g.strokeRect(x, y, w, h); g.lineWidth = lw * 0.5; g.strokeRect(x + gap, y + gap, w - gap * 2, h - gap * 2); }
  function cornerOrn(g, x, y, s, col, rot) { g.save(); g.translate(x, y); g.rotate(rot); g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(0, s); g.quadraticCurveTo(0, 0, s, 0); g.stroke(); g.beginPath(); g.arc(s * 0.35, s * 0.35, s * 0.14, 0, 7); g.fillStyle = col; g.fill(); g.restore(); }

  // ---------- small illustrations used on labels (each says what the product is) ----------
  const ICONS = {
    cup(g, x, y, s, c) { g.fillStyle = c; g.beginPath(); g.moveTo(x - s * .5, y - s * .1); g.lineTo(x + s * .4, y - s * .1); g.lineTo(x + s * .3, y + s * .45); g.lineTo(x - s * .4, y + s * .45); g.fill(); g.lineWidth = s * .08; g.strokeStyle = c; g.beginPath(); g.arc(x + s * .45, y + s * .15, s * .15, -1.4, 1.4); g.stroke(); g.fillRect(x - s * .65, y + s * .48, s * 1.2, s * .07); for (const d of [-.2, 0, .2]) { g.beginPath(); g.moveTo(x + d * s, y - s * .2); g.bezierCurveTo(x + d * s - s * .15, y - s * .4, x + d * s + s * .15, y - s * .5, x + d * s, y - s * .7); g.lineWidth = s * .05; g.stroke(); } },
    leaf(g, x, y, s, c) { g.fillStyle = c; for (const a of [-.5, .5, 0]) { g.save(); g.translate(x, y + s * .3); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * .35, -s * .5, 0, -s * .95); g.quadraticCurveTo(-s * .35, -s * .5, 0, 0); g.fill(); g.restore(); } },
    wheat(g, x, y, s, c) { g.strokeStyle = c; g.fillStyle = c; g.lineWidth = s * .04; for (const a of [-.3, 0, .3]) { g.save(); g.translate(x, y + s * .5); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -s * .9); g.stroke(); for (let i = 0; i < 5; i++) for (const d of [-1, 1]) { g.beginPath(); g.ellipse(d * s * .07, -s * (.45 + i * .1), s * .05, s * .09, d * .5, 0, 7); g.fill(); } g.restore(); } },
    flame(g, x, y, s, c) { g.fillStyle = '#e8a030'; g.beginPath(); g.moveTo(x, y - s * .6); g.bezierCurveTo(x + s * .35, y - s * .2, x + s * .25, y + s * .2, x, y + s * .25); g.bezierCurveTo(x - s * .25, y + s * .2, x - s * .35, y - s * .2, x, y - s * .6); g.fill(); g.fillStyle = c; g.fillRect(x - s * .04, y + s * .2, s * .08, s * .45); },
    peach(g, x, y, s, c) { const gr = g.createRadialGradient(x - s * .15, y - s * .1, s * .05, x, y, s * .45); gr.addColorStop(0, '#ffd890'); gr.addColorStop(1, '#e06a3a'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, s * .42, 0, 7); g.fill(); g.fillStyle = '#4a7a2a'; g.beginPath(); g.ellipse(x + s * .15, y - s * .45, s * .18, s * .08, -.5, 0, 7); g.fill(); },
    bubbles(g, x, y, s, c) { g.fillStyle = c; g.fillRect(x - s * .45, y, s * .9, s * .35); g.strokeStyle = c; g.lineWidth = s * .04; for (const [dx, dy, r] of [[-.2, -.25, .14], [.1, -.4, .1], [.3, -.2, .08], [-.05, -.6, .07]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, 7); g.stroke(); } },
    sticks(g, x, y, s, c) { g.fillStyle = c; for (const d of [-.2, 0, .2]) { g.save(); g.translate(x + d * s, y); g.rotate(.15); g.fillRect(-s * .07, -s * .5, s * .14, s); g.restore(); } },
    shaker(g, x, y, s, c) { g.fillStyle = c; g.fillRect(x - s * .22, y - s * .25, s * .44, s * .7); g.beginPath(); g.ellipse(x, y - s * .3, s * .22, s * .12, 0, 3.14, 6.28); g.fill(); g.fillStyle = '#fff'; for (const d of [-.1, 0, .1]) g.fillRect(x + d * s - 2, y - s * .38, 4, 4); },
    pig(g, x, y, s, c) {   // side view: body, head with snout and ear, curly tail, four legs
      g.fillStyle = c; g.beginPath(); g.ellipse(x - s * .05, y, s * .42, s * .26, 0, 0, 7); g.fill();
      g.beginPath(); g.arc(x + s * .36, y - s * .06, s * .17, 0, 7); g.fill();
      g.beginPath(); g.ellipse(x + s * .54, y - s * .02, s * .07, s * .09, 0, 0, 7); g.fill();
      g.fillStyle = '#f0e6cc'; g.beginPath(); g.ellipse(x + s * .56, y - s * .02, s * .03, s * .05, 0, 0, 7); g.fill(); g.fillStyle = c;
      g.beginPath(); g.moveTo(x + s * .3, y - s * .2); g.lineTo(x + s * .4, y - s * .36); g.lineTo(x + s * .44, y - s * .18); g.fill();
      for (const d of [-.32, -.16, .14, .28]) g.fillRect(x + d * s, y + s * .18, s * .07, s * .2);
      g.strokeStyle = c; g.lineWidth = s * .04; g.beginPath(); g.arc(x - s * .5, y - s * .1, s * .06, 0.5, 5.5); g.stroke();
    },
    bottle(g, x, y, s, c) { g.fillStyle = c; g.fillRect(x - s * .18, y - s * .1, s * .36, s * .6); g.fillRect(x - s * .07, y - s * .45, s * .14, s * .36); },
  };

  // ---------- 1. product labels (1880s grocery packaging) ----------
  // Anatomy of a period label: decorative border with corner ornaments, brand (often on a ribbon or arched),
  // the product name, a picture of the product, net weight, a quality claim, the maker and city, sometimes
  // exhibition medals, a lot number; tins carry it as a wraparound band, boxes on the front with directions
  // on the sides, match boxes with a striker strip.
  const BRANDS = ['Golden Gate', 'Eagle Mills', 'Bay City', 'Hale & Sons', 'Sierra', 'Pacific', 'Oak Leaf', 'Liberty Bell', 'Pioneer', 'Crown Point', 'Redwood', 'Mission'];
  const CITIES = ['SAN FRANCISCO', 'SACRAMENTO', 'STOCKTON', 'OAKLAND', 'SAN JOSE', 'PORTLAND'];
  const PRODUCTS = {
    tin: [
      { name: 'ROASTED COFFEE', sub: 'Choice Java & Mocha', wt: 'NET WT. 1 LB.', icon: 'cup', pal: ['#7a1e1e', '#e8c878', '#2a1a10'] },
      { name: 'PURE LEAF LARD', sub: 'Kettle Rendered', wt: 'NET 3 LBS.', icon: 'pig', pal: ['#2a4a7a', '#f0e6cc', '#1a1a2a'] },
      { name: 'GROUND CINNAMON', sub: 'Pure Spices', wt: '2 OZ.', icon: 'sticks', pal: ['#8a4a1a', '#f2dca0', '#3a1a08'] },
      { name: 'CAL. PEACHES', sub: 'In Heavy Syrup', wt: '2½ LB. CAN', icon: 'peach', pal: ['#2a5a3a', '#f4e4b4', '#1a2a1a'] },
      { name: 'BAKING POWDER', sub: 'Absolutely Pure', wt: 'NET 1 LB.', icon: 'wheat', pal: ['#c8302a', '#f4ecd4', '#2a1a10'] },
      { name: 'BLACK PEPPER', sub: 'Strictly Pure', wt: '4 OZ.', icon: 'shaker', pal: ['#1a1a1a', '#e8c060', '#1a1a1a'] },
    ],
    box: [
      { name: 'OOLONG TEA', sub: 'Finest Formosa', wt: 'NET ½ LB.', icon: 'leaf', pal: ['#2a5a4a', '#f0e2b8', '#1a2a20'] },
      { name: 'ROLLED OATS', sub: 'Steam Cooked', wt: 'FULL 2 LBS.', icon: 'wheat', pal: ['#c87a1a', '#f6ecd0', '#3a2008'] },
      { name: 'SODA CRACKERS', sub: 'Fresh Baked Daily', wt: 'NET 1 LB.', icon: 'wheat', pal: ['#2a3a6a', '#f4ead2', '#1a1a2a'] },
      { name: 'LAUNDRY SOAP', sub: 'Best Family', wt: 'WT. 12 OZ.', icon: 'bubbles', pal: ['#4a6aa0', '#f6f0e0', '#1a2440'] },
      { name: 'BICARB. OF SODA', sub: 'For Baking & Medicine', wt: 'FULL 1 LB.', icon: 'shaker', pal: ['#a8282a', '#f4e8cc', '#2a1010'] },
      { name: 'PARLOR MATCHES', sub: 'Strike Only on Box', wt: '100 COUNT', icon: 'flame', pal: ['#1a3a6a', '#f0d890', '#101a30'], striker: true },
    ],
    bottle: [
      { name: 'VEGETABLE TONIC', sub: 'Dose: one tablespoon thrice daily', wt: '8 FL. OZ.', icon: 'leaf', pal: ['#f2e8cc', '#7a1e1e', '#2a1a10'], doctor: true },
      { name: 'CIDER VINEGAR', sub: 'Pure Apple', wt: '1 PINT', icon: 'peach', pal: ['#f2e8cc', '#2a5a3a', '#1a1a1a'] },
      { name: 'VANILLA EXTRACT', sub: 'Double Strength', wt: '2 FL. OZ.', icon: 'bottle', pal: ['#f2e8cc', '#3a2a6a', '#1a1a2a'] },
      { name: 'SARSAPARILLA', sub: 'Purifies the Blood', wt: '12 FL. OZ.', icon: 'leaf', pal: ['#f2e8cc', '#8a4a1a', '#2a1a10'], doctor: true },
    ],
  };
  // front panel of a label, drawn into a w x h area of g at (0,0)
  function labelArt(g, w, h, P, brand) {
    const [main, paperCol, ink] = P.pal, cream = P.pal[1];
    g.fillStyle = main; g.fillRect(0, 0, w, h);
    // inner panel with double rule border + corner ornaments
    const m = w * 0.06; g.fillStyle = paperCol; g.fillRect(m, m, w - 2 * m, h - 2 * m);
    paper(g, w, h, 'rgba(0,0,0,0)', 0.3);
    doubleRule(g, m + 4, m + 4, w - 2 * m - 8, h - 2 * m - 8, main, 6, 3);
    for (const [x, y, r] of [[m + 12, m + 12, 0], [w - m - 12, m + 12, Math.PI / 2], [w - m - 12, h - m - 12, Math.PI], [m + 12, h - m - 12, -Math.PI / 2]]) cornerOrn(g, x, y, w * 0.06, main, r);
    // brand (doctor's remedies carry a name), product, picture, sub line, weight, maker
    const brandLine = P.doctor ? `Dr. ${pick(['Merriweather', 'Halloway', 'Pendleton', 'Ashby'])}'s` : brand.toUpperCase();
    ribbon(g, w / 2, h * 0.2, w * 0.62, h * 0.1, main, brandLine, font('bold', h * 0.06, BOOK), cream);
    text(g, P.name, w / 2, h * 0.43, font('bold', h * 0.1, BOOK), ink, 'center', w * 0.78);
    ICONS[P.icon](g, w / 2, h * 0.6, h * 0.2, ink);
    text(g, P.sub, w / 2, h * 0.79, font('italic', h * 0.045), ink, 'center', w * 0.74);
    g.fillStyle = main; g.fillRect(w * 0.22, h * 0.82, w * 0.56, h * 0.06); text(g, P.wt, w / 2, h * 0.865, font('bold', h * 0.04, BOOK), cream, 'center', w * 0.5);
    text(g, `${brand} Co. · ${pick(CITIES)}`, w / 2, h * 0.92, font('', h * 0.028), ink, 'center', w * 0.7);
    if (!P.doctor && rnd() < 0.6) { medal(g, w * 0.2, h * 0.6, h * 0.07, pick([1876, 1878, 1880])); medal(g, w * 0.8, h * 0.6, h * 0.07, pick([1879, 1881])); }
    text(g, `Lot ${Math.floor(rr(100, 999))}`, w - m - 14, h - m - 16, font('', h * 0.022, TYPE), ink, 'right');
  }
  // side panel: directions / guarantee in small print, or a match striker
  function sideArt(g, w, h, P, brand) {
    const [main, paperCol, ink] = P.pal;
    if (P.striker) { g.fillStyle = '#6a4a2a'; g.fillRect(0, 0, w, h); for (let i = 0; i < w * h / 12; i++) { g.fillStyle = `rgba(${rnd() < .5 ? '30,20,10' : '160,120,80'},.6)`; g.fillRect(rr(0, w), rr(0, h), 2, 2); } return; }
    g.fillStyle = main; g.fillRect(0, 0, w, h); g.fillStyle = paperCol; g.fillRect(w * .08, h * .06, w * .84, h * .88);
    text(g, P.doctor ? 'DIRECTIONS' : 'GUARANTEE', w / 2, h * .16, font('bold', w * .09, BOOK), ink, 'center', w * .8);
    g.fillStyle = 'rgba(40,25,10,.55)'; for (let y = h * .22; y < h * .86; y += h * .045) g.fillRect(w * .14, y, w * rr(.55, .72), h * .012);
  }
  const labelPool = { tin: [], box: [], bottle: [] };
  // a label material for a tin (wraparound), box ([front, side]) or bottle (front sticker); up to 24 designs per kind
  function label(kind = 'tin') {
    const pool = labelPool[kind]; if (pool.length >= 24) return pick(pool);
    const P = pick(PRODUCTS[kind]), brand = pick(BRANDS);
    let out;
    if (kind === 'tin') {   // wraparound: label panel twice around, rolled seam bands top and bottom
      const c = canvas(1024, 384), g = c.getContext('2d'); const pw = 512;
      for (let i = 0; i < 2; i++) { g.save(); g.translate(i * pw, 0); labelArt(g, pw, 384, P, brand); g.restore(); }
      out = printMat(c, { bump: 1 });
    } else if (kind === 'box') {
      const c = canvas(512, 512), g = c.getContext('2d'); labelArt(g, 512, 512, P, brand);
      const s = canvas(256, 512), gs = s.getContext('2d'); sideArt(gs, 256, 512, P, brand);
      out = [printMat(c, { bump: 1 }), printMat(s, { bump: P.striker ? 4 : 1, mat: P.striker ? { roughness: 1 } : {} })];
    } else {
      const c = canvas(512, 384), g = c.getContext('2d'); labelArt(g, 512, 384, P, brand); out = printMat(c, { bump: 0.8 });
    }
    pool.push(out); return out;
  }

  // ---------- 2. merchandise price tag (1880s) ----------
  // Anatomy: manila card stock with clipped corners; a punched hole reinforced by a brass eyelet with twine;
  // printed store header and a ruled form (No., Article, Price); the article and price written in ink by the
  // clerk; a perforated tear-off stub repeating the number; wear, a corner crease.
  function priceTag(price = '$1.00', article = 'Coffee, 1 lb.') {
    const W = 640, H = 1000, c = canvas(W, H), g = c.getContext('2d'), no = String(Math.floor(rr(1000, 9999)));
    paper(g, W, H, '#e6cf98', 0.8);
    doubleRule(g, 30, 140, W - 60, 620, '#8a2a1a', 8, 3);
    text(g, 'HALE & SONS', W / 2, 205, font('bold', 52, BOOK), '#8a2a1a'); text(g, 'GENERAL MERCHANDISE · WOODSIDE, CAL.', W / 2, 245, font('', 22), '#3a2a1a');
    g.fillStyle = '#8a2a1a'; g.fillRect(60, 268, W - 120, 3);
    const field = (lab, y) => { text(g, lab, 66, y, font('bold', 26, BOOK), '#3a2a1a', 'left'); g.strokeStyle = '#3a2a1a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(66 + g.measureText(lab).width + 10, y + 4); g.lineTo(W - 66, y + 4); g.stroke(); };
    field('No.', 320); scrawl(g, no, 140, 318, 40);
    field('Article', 395); scrawl(g, article, 190, 392, 38);
    text(g, 'PRICE', W / 2, 470, font('bold', 30, BOOK), '#8a2a1a');
    scrawl(g, price, W / 2 - 170, 610, 140, '#1a1a3a', -0.03);
    g.strokeStyle = '#1a1a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(120, 640); g.quadraticCurveTo(W / 2, 655, W - 130, 632); g.stroke();   // underline flourish
    text(g, 'Terms Strictly Cash · No Goods Charged', W / 2, 735, font('italic', 22), '#3a2a1a');
    // perforation + stub
    g.fillStyle = 'rgba(60,40,20,.75)'; for (let x = 20; x < W - 10; x += 16) { g.beginPath(); g.arc(x, 790, 3.5, 0, 7); g.fill(); }
    text(g, 'STUB · No.', 66, 860, font('bold', 26, BOOK), '#3a2a1a', 'left'); scrawl(g, no, 230, 860, 38);
    text(g, 'Keep for Exchange', W / 2, 930, font('italic', 22), '#3a2a1a');
    // eyelet hole is cut in geometry; draw the brass ring + twine shadow
    g.fillStyle = '#b8862a'; g.beginPath(); g.arc(W / 2, 75, 34, 0, 7); g.fill(); g.fillStyle = '#f0d080'; g.beginPath(); g.arc(W / 2 - 6, 69, 30, 0, 7); g.fill();
    g.fillStyle = '#1a1006'; g.beginPath(); g.arc(W / 2, 75, 18, 0, 7); g.fill();
    g.strokeStyle = 'rgba(80,50,20,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(W - 40, 0); g.lineTo(W - 120, 90); g.stroke();      // corner crease
    // shape: clipped top corners
    const shape = new THREE.Shape(), w = 0.064, h = 0.1, k = 0.018;
    shape.moveTo(-w / 2, -h / 2); shape.lineTo(w / 2, -h / 2); shape.lineTo(w / 2, h / 2 - k); shape.lineTo(w / 2 - k, h / 2); shape.lineTo(-w / 2 + k, h / 2); shape.lineTo(-w / 2, h / 2 - k); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.0012, bevelEnabled: false });
    // UVs: map x,y to 0..1 on the front
    const uv = geo.attributes.uv, pos = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
    const mat = printMat(c, { bump: 2 }), edge = new THREE.MeshStandardMaterial({ color: '#d8bc84', roughness: 0.9 });
    const tag = new THREE.Mesh(geo, [mat, edge]); tag.castShadow = true; tag.receiveShadow = true;
    // twine loop through the eyelet
    const twine = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0012, 6, 24, Math.PI * 1.6), new THREE.MeshStandardMaterial({ color: '#c8b088', roughness: 1 }));
    twine.position.set(0, h / 2 - 0.0075, 0.001); twine.rotation.set(0.3, 0, 1.9); twine.castShadow = true;
    const grp = new THREE.Group(); grp.add(tag, twine); return grp;
  }

  // ---------- 3. one-dollar note (cartoon, invented design; not a facsimile of any real note) ----------
  // Anatomy: engraved lathe-work border, denomination counters in all four corners, a central vignette in an
  // oval, the denomination in words, a sawtooth seal, two serial numbers, series year, two signature lines,
  // a bearer clause in fine print, plate letter; green back. Folds and soft wear.
  function dollarNote() {
    const W = 1200, H = 512, c = canvas(W, H), g = c.getContext('2d'), green = '#1e4a32', s = serial('★');
    paper(g, W, H, '#ece8d0', 0.4);
    g.fillStyle = 'rgba(120,170,120,.18)'; g.fillRect(0, 0, W, H);
    // border: double rule + lathe band
    doubleRule(g, 14, 14, W - 28, H - 28, green, 10, 4); latheBand(g, 34, 34, W - 68, 26, green, 7); latheBand(g, 34, H - 60, W - 68, 26, green, 7);
    // corner counters
    for (const [x, y] of [[90, 120], [W - 90, 120], [90, H - 92], [W - 90, H - 92]]) { guilloche(g, x, y, 48, 8, 12, 6, green, 0.9); g.fillStyle = '#ece8d0'; g.beginPath(); g.arc(x, y, 36, 0, 7); g.fill(); text(g, '1', x, y + 24, font('bold', 66, BOOK), green); }
    // vignette: rosette with a sun-rise over hills (our own picture), in an oval
    g.save(); g.beginPath(); g.ellipse(W / 2, H / 2 + 6, 140, 120, 0, 0, 7); g.clip();
    g.fillStyle = '#dfe6cc'; g.fillRect(0, 0, W, H); g.strokeStyle = green; g.lineWidth = 1;
    for (let i = 0; i < 48; i++) { const a = Math.PI + i / 47 * Math.PI; g.beginPath(); g.moveTo(W / 2, H / 2 + 40); g.lineTo(W / 2 + Math.cos(a) * 200, H / 2 + 40 + Math.sin(a) * 200); g.stroke(); }
    g.fillStyle = green; g.beginPath(); g.arc(W / 2, H / 2 + 40, 44, Math.PI, 0); g.fill();
    g.beginPath(); g.moveTo(W / 2 - 160, H / 2 + 130); g.quadraticCurveTo(W / 2 - 60, H / 2 + 30, W / 2 + 20, H / 2 + 80); g.quadraticCurveTo(W / 2 + 90, H / 2 + 40, W / 2 + 160, H / 2 + 90); g.lineTo(W / 2 + 160, H / 2 + 140); g.lineTo(W / 2 - 160, H / 2 + 140); g.fill();
    g.restore(); g.strokeStyle = green; g.lineWidth = 4; g.beginPath(); g.ellipse(W / 2, H / 2 + 6, 140, 120, 0, 0, 7); g.stroke(); guilloche(g, W / 2, H / 2 + 6, 152, 6, 30, 3, green, 0.7);
    // words + clause + series + plate
    text(g, 'THE MERCHANTS’ NOTE', W / 2, 108, font('bold', 40, BOOK), green); text(g, 'ONE DOLLAR', W / 2, H - 82, font('bold', 50, BOOK), green);
    text(g, 'Will pay to the bearer on demand', W * 0.27, H / 2 - 30, font('italic', 22), green, 'center', 300); text(g, 'ONE DOLLAR', W * 0.27, H / 2 + 6, font('bold', 34, BOOK), green);
    text(g, 'SERIES 1880', W * 0.73, H / 2 - 30, font('bold', 26, BOOK), green); text(g, 'Plate B', W * 0.73, H / 2 + 4, font('italic', 22), green);
    // seal + serials (red)
    sawSeal(g, W * 0.73, H / 2 + 84, 52, '#b8302a'); star(g, W * 0.73, H / 2 + 84, 22, '#fff4e0');
    text(g, s, W * 0.2, 165, font('bold', 30, TYPE), '#b8302a'); text(g, s, W * 0.75, H - 112, font('bold', 30, TYPE), '#b8302a');
    // signatures
    for (const [x, t] of [[W * 0.2, 'Cashier'], [W * 0.62, 'President']]) { signature(g, x, H - 150, 150, '#1a2a1a'); g.fillStyle = green; g.fillRect(x - 10, H - 132, 180, 2); text(g, t, x + 80, H - 110, font('italic', 20), green); }
    // folds + wear
    g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(W / 2 - 2, 0, 3, H); g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(W / 2 + 1, 0, 3, H); g.fillRect(0, H / 2, W, 2);
    const back = canvas(600, 256), gb = back.getContext('2d'); gb.fillStyle = '#2a6a46'; gb.fillRect(0, 0, 600, 256); latheBand(gb, 10, 10, 580, 20, '#c8e0c8', 6); latheBand(gb, 10, 226, 580, 20, '#c8e0c8', 6); guilloche(gb, 300, 128, 70, 10, 16, 8, '#c8e0c8', 1); text(gb, 'ONE', 300, 142, font('bold', 44, BOOK), '#e6f0e0');
    const w = 0.156, h = 0.066, geo = new THREE.PlaneGeometry(w, h, 12, 4);
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.abs(x) < 0.004 ? -0.0015 : -Math.abs(x) * 0.02 + 0.0016); }   // soft centre fold
    geo.computeVertexNormals();
    const front = new THREE.Mesh(geo, printMat(c, { bump: 1.2, mat: { side: THREE.FrontSide } })), rear = new THREE.Mesh(geo, printMat(back, { bump: 1, mat: { side: THREE.BackSide } }));
    const grp = new THREE.Group(); grp.add(front, rear); front.castShadow = true; return grp;
  }

  // ---------- 4. one-cent coin (cartoon, invented design) ----------
  // Anatomy: raised rim with beads (denticles); obverse a profile with a legend around it and the date below;
  // reverse a laurel wreath around ONE CENT; reeded or plain edge; struck relief (bump), worn copper colour.
  function coinFace(drawCentre) {
    const S = 512, c = canvas(S, S), g = c.getContext('2d');
    const gr = g.createRadialGradient(S * .4, S * .38, 20, S / 2, S / 2, S / 2); gr.addColorStop(0, '#e89a5a'); gr.addColorStop(1, '#a8582a'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    g.fillStyle = '#f0b07a'; g.beginPath(); g.arc(S / 2, S / 2, S * 0.49, 0, 7); g.arc(S / 2, S / 2, S * 0.44, 0, 7, true); g.fill();     // raised rim
    for (let i = 0; i < 90; i++) { const a = i / 90 * 6.283; g.fillStyle = '#e8a06a'; g.beginPath(); g.arc(S / 2 + Math.cos(a) * S * .415, S / 2 + Math.sin(a) * S * .415, 4, 0, 7); g.fill(); }
    drawCentre(g, S);
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${rnd() < .5 ? '60,25,10' : '255,210,170'},.12)`; g.fillRect(rr(0, S), rr(0, S), 2, 2); }   // wear
    return c;
  }
  function arcText(g, s, cx, cy, r, start, f, col, inside = false) {
    g.font = f; g.fillStyle = col; g.textAlign = 'center'; const total = g.measureText(s).width / r; let a = start - total / 2;
    for (const ch of s) { const cw = g.measureText(ch).width / r; g.save(); g.translate(cx + Math.cos(a + cw / 2) * r, cy + Math.sin(a + cw / 2) * r); g.rotate(a + cw / 2 + (inside ? -Math.PI / 2 : Math.PI / 2)); g.fillText(ch, 0, 0); g.restore(); a += cw; }
  }
  function cent() {
    const obv = coinFace((g, S) => {
      // profile: a head with a feather band (our own simple bust), raised relief colour
      g.fillStyle = '#f0a870'; g.beginPath(); g.moveTo(S * .36, S * .7); g.quadraticCurveTo(S * .3, S * .4, S * .48, S * .3); g.quadraticCurveTo(S * .62, S * .28, S * .64, S * .42); g.lineTo(S * .68, S * .5); g.lineTo(S * .64, S * .52); g.quadraticCurveTo(S * .64, S * .6, S * .58, S * .62); g.lineTo(S * .6, S * .7); g.closePath(); g.fill();
      g.strokeStyle = '#a8582a'; g.lineWidth = 4; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(S * (.38 + i * .035), S * .33); g.lineTo(S * (.34 + i * .03), S * .2); g.stroke(); }
      arcText(g, 'UNITED STATES OF AMERICA', S / 2, S / 2, S * .36, -Math.PI / 2, font('bold', 30, BOOK), '#f6c090');
      text(g, '1880', S / 2, S * .83, font('bold', 40, BOOK), '#f6c090');
    });
    const rev = coinFace((g, S) => {
      g.strokeStyle = '#f0a870'; g.lineWidth = 5; for (const d of [-1, 1]) { g.beginPath(); g.arc(S / 2, S / 2, S * .33, Math.PI / 2 + d * 0.3, Math.PI / 2 + d * 2.6, d < 0); g.stroke(); for (let i = 0; i < 9; i++) { const a = Math.PI / 2 + d * (0.45 + i * 0.25); g.fillStyle = '#f0a870'; g.beginPath(); g.ellipse(S / 2 + Math.cos(a) * S * .33, S / 2 + Math.sin(a) * S * .33, 14, 6, a + d * 0.9, 0, 7); g.fill(); } }
      text(g, 'ONE', S / 2, S * .47, font('bold', 64, BOOK), '#f6c090'); text(g, 'CENT', S / 2, S * .6, font('bold', 64, BOOK), '#f6c090');
    });
    const edge = new THREE.MeshStandardMaterial({ color: '#b8683a', metalness: 0.85, roughness: 0.35 });
    const mk = c => printMat(c, { bump: 3, mat: { metalness: 0.85, roughness: 0.32 } });
    const geo = new THREE.CylinderGeometry(0.0095, 0.0095, 0.0015, 48);
    // cylinder caps: fix UVs so each face shows its full artwork
    const uv = geo.attributes.uv, pos = geo.attributes.position, nrm = geo.attributes.normal;
    for (let i = 0; i < uv.count; i++) if (Math.abs(nrm.getY(i)) > 0.9) uv.setXY(i, pos.getX(i) / 0.019 + 0.5, (nrm.getY(i) > 0 ? -1 : 1) * pos.getZ(i) / 0.019 + 0.5);
    const coin = new THREE.Mesh(geo, [edge, mk(obv), mk(rev)]); coin.castShadow = true; return coin;
  }

  // ---------- 5. the store's day book (ledger), open on the counter ----------
  // Anatomy: cloth-covered boards with leather corners and spine; a thick page block (visible page edges);
  // printed ruling (red double margin, blue lines, money columns Dr./Cr. with $ and cts); a printed header
  // with the month; handwritten dated entries (customer, goods, amount); running total; gutter shadow and
  // page curl; a silk ribbon marker.
  function ledgerPage(left, entries) {
    const W = 760, H = 1000, c = canvas(W, H), g = c.getContext('2d');
    paper(g, W, H, '#f2ead4', 0.35);
    g.strokeStyle = 'rgba(70,110,170,.55)'; g.lineWidth = 1.4; for (let y = 140; y < H - 40; y += 34) { g.beginPath(); g.moveTo(30, y); g.lineTo(W - 30, y); g.stroke(); }
    g.strokeStyle = 'rgba(190,40,40,.75)'; g.lineWidth = 2; for (const x of [110, 116, W - 230, W - 224, W - 130, W - 124]) { g.beginPath(); g.moveTo(x, 90); g.lineTo(x, H - 30); g.stroke(); }
    text(g, left ? 'DAY BOOK' : 'MARCH, 1881', left ? 60 : W - 60, 70, font('bold', 36, BOOK), '#2a2a4a', left ? 'left' : 'right');
    for (const [x, s] of [[70, 'Date'], [140, 'Particulars'], [W - 178, 'Dr.'], [W - 80, 'Cr.']]) text(g, s, x, 122, font('bold', 20, BOOK), '#5a2a2a', x > 150 ? 'center' : 'left');
    let y = 166, total = 0;
    for (const [d, who, amt] of entries) { scrawl(g, d, 50, y, 26); scrawl(g, who, 128, y, 26); scrawl(g, amt.toFixed(2), W - 214, y, 26); total += amt; y += 34; }
    scrawl(g, 'Total', 128, y + 34, 26, '#5a1a1a'); scrawl(g, total.toFixed(2), W - 214, y + 34, 26, '#5a1a1a');
    g.strokeStyle = '#1a1a3a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(W - 220, y + 10); g.lineTo(W - 136, y + 10); g.stroke();
    text(g, String(left ? 46 : 47), W / 2, H - 14, font('', 20), '#4a4a5a');
    // gutter shadow
    const gx = left ? W : 0, gr = g.createLinearGradient(gx, 0, left ? W - 90 : 90, 0); gr.addColorStop(0, 'rgba(60,40,20,.45)'); gr.addColorStop(1, 'rgba(60,40,20,0)'); g.fillStyle = gr; g.fillRect(left ? W - 90 : 0, 0, 90, H);
    return c;
  }
  function ledger() {
    const goods = ['Coffee 1 lb', 'Sugar 2 lb', 'Lamp oil', 'Thread & needles', 'Flour 5 lb', 'Tea ½ lb', 'Soap 2 bars', 'Matches', 'Molasses 1 qt', 'Nails 1 lb', 'Calico 3 yds', 'Salt 1 lb'];
    const people = ['Mrs. Hale', 'J. Burke', 'Wm. Dunn', 'Mrs. Ortiz', 'T. Lacey', 'S. Pryor', 'Mrs. Kemp'];
    const rows = n => Array.from({ length: n }, (_, i) => [`Mar ${3 + Math.floor(i / 3)}`, `${pick(people)} — ${pick(goods)}`, 1]);
    const grp = new THREE.Group(), W = 0.26, D = 0.34, T = 0.012;
    const cloth = new THREE.MeshStandardMaterial({ color: '#5a2a24', roughness: 0.95 }), leather = new THREE.MeshStandardMaterial({ color: '#2a1a12', roughness: 0.55 });
    const cover = new THREE.Mesh(new RoundedBoxGeometry(W * 2 + 0.02, 0.008, D + 0.016, 2, 0.003), cloth); cover.position.y = 0.004; cover.castShadow = cover.receiveShadow = true; grp.add(cover);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.0085, 0.05), leather); k.position.set(x * (W + 0.01 - 0.025), 0.0045, z * (D / 2 + 0.008 - 0.025)); k.rotation.y = Math.PI / 4; grp.add(k); }
    const edges = new THREE.MeshStandardMaterial({ map: (() => { const c = canvas(64, 256), g = c.getContext('2d'); g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, 64, 256); g.fillStyle = 'rgba(120,90,50,.35)'; for (let y = 0; y < 256; y += 3) g.fillRect(0, y, 64, 1); return texture(c); })(), roughness: 0.9 });
    for (const s of [-1, 1]) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(W - 0.01, T, D - 0.01), edges); block.position.set(s * (W / 2 + 0.002), 0.008 + T / 2, 0); block.castShadow = true; grp.add(block);
      const geo = new THREE.PlaneGeometry(W - 0.01, D - 0.01, 16, 1), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const u = (p.getX(i) / (W - 0.01) + 0.5), k = s < 0 ? u : 1 - u; p.setZ(i, Math.pow(k, 3) * 0.018 - k * 0.002); }   // pages curl up into the gutter
      geo.computeVertexNormals(); geo.rotateX(-Math.PI / 2);
      const page = new THREE.Mesh(geo, printMat(ledgerPage(s < 0, rows(s < 0 ? 20 : 14)), { bump: 0.8 })); page.position.set(s * (W / 2 + 0.002), 0.008 + T + 0.0004, 0); page.receiveShadow = true; grp.add(page);
    }
    const rib = new THREE.Mesh(new THREE.PlaneGeometry(0.008, 0.12), new THREE.MeshStandardMaterial({ color: '#a8202a', roughness: 0.5, side: THREE.DoubleSide })); rib.rotation.x = -Math.PI / 2; rib.position.set(0.004, 0.022, D / 2 + 0.03); grp.add(rib);
    return grp;
  }

  // ---------- 6. painted hanging sign ----------
  // Anatomy: a board with a routed (bevelled) border moulding; lettering painted in gold leaf with a dark drop
  // shade and a light edge (so it reads carved/raised); a painted ground with brush texture and chips showing
  // wood; screws in the corners; screw eyes on top with chains.
  function signBoard(lines, opt = {}) {
    const W = 1024, H = 456, c = canvas(W, H), g = c.getContext('2d'), ground = opt.ground || '#24463a';
    g.fillStyle = ground; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(${rnd() < .5 ? '0,0,0' : '255,255,255'},.05)`; g.lineWidth = rr(1, 3); g.beginPath(); const y = rr(0, H); g.moveTo(0, y); g.lineTo(W, y + rr(-6, 6)); g.stroke(); }      // brush strokes
    g.strokeStyle = '#d8b060'; g.lineWidth = 6; g.strokeRect(36, 36, W - 72, H - 72); g.lineWidth = 2; g.strokeRect(50, 50, W - 100, H - 100);
    for (const [x, y] of [[24, 24], [W - 24, 24], [24, H - 24], [W - 24, H - 24]]) { g.fillStyle = '#8a8a8a'; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); g.strokeStyle = '#3a3a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x + 6, y); g.stroke(); }
    lines.forEach(([s, size, y]) => {
      const f = font('bold', size, BOOK);
      text(g, s, W / 2 + 4, y + 5, f, 'rgba(0,0,0,.55)', 'center', W - 150);      // drop shade
      const fit = g.font;
      const gold = g.createLinearGradient(0, y - size, 0, y); gold.addColorStop(0, '#fff0b0'); gold.addColorStop(0.45, '#e0b050'); gold.addColorStop(1, '#9a6a20');
      g.font = fit; g.textAlign = 'center'; g.fillStyle = gold; g.fillText(s, W / 2, y); g.strokeStyle = '#6a4210'; g.lineWidth = 1.5; g.strokeText(s, W / 2, y);
    });
    for (let i = 0; i < 18; i++) { g.fillStyle = '#8a5a30'; g.beginPath(); const x = rnd() < .5 ? rr(0, 60) : rr(W - 60, W), y = rr(0, H); g.ellipse(x, y, rr(3, 12), rr(2, 7), rr(0, 3), 0, 7); g.fill(); }   // chips at the edges
    return printMat(c, { bump: 3, invert: false, mat: { roughness: 0.55 } });
  }

  return { label, priceTag, dollarNote, cent, ledger, signBoard, paper, canvas, printMat };
}
