/*
 * Three Kingdoms cast (Empty City legend), all built with the Kit.
 */
(function (root) {
  'use strict';
  const Kit = root.Kit || require('../src/kit.js');
  const INK = '#2b1d16';

  // ---------- held props (drawn in hand-bone space, x along the forearm) ----------
  const fan = ctx => {
    // white crane-feather fan on a short handle
    let s = `<g transform="translate(16 0) rotate(-90)"><rect x="-6" y="-8" width="12" height="70" rx="4" fill="#5a3a22" stroke="${INK}" stroke-width="3.5"/><circle cy="66" r="7" fill="#c8963f" stroke="${INK}" stroke-width="2.5"/>`;
    for (let i = -4; i <= 4; i++) {
      const a = i * 13 * Math.PI / 180, L = 150 - Math.abs(i) * 8, x = Math.sin(a) * L, y = -Math.cos(a) * L;
      s += `<path d="M0,-6 Q${(x * 0.5 - Math.cos(a) * 18).toFixed(1)},${(y * 0.5 - Math.sin(a) * 18).toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)} Q${(x * 0.5 + Math.cos(a) * 18).toFixed(1)},${(y * 0.5 + Math.sin(a) * 18).toFixed(1)} 0,-6Z" fill="#f6f1e6" stroke="${INK}" stroke-width="3"/>` +
        `<path d="M0,-6 L${(x * 0.95).toFixed(1)},${(y * 0.95).toFixed(1)}" stroke="#b9ab90" stroke-width="2"/>`;
    }
    return s + `<path d="M-30,-10 Q0,-30 30,-10" stroke="#5a3a22" stroke-width="8" fill="none"/></g>`;
  };
  const broom = () => `<g transform="translate(14 0) rotate(-90)"><rect x="-6" y="-170" width="12" height="320" rx="5" fill="#a87a3e" stroke="${INK}" stroke-width="3.5"/>` +
    `<path d="M-10,140 L10,140 L46,250 L-46,250Z" fill="#d8b45e" stroke="${INK}" stroke-width="4"/>` +
    Array.from({ length: 9 }, (_, i) => `<path d="M${-6 + i * 1.5},150 L${-40 + i * 10},248" stroke="#a8843a" stroke-width="2"/>`).join('') +
    `<rect x="-14" y="132" width="28" height="14" rx="3" fill="#8a2f2a" stroke="${INK}" stroke-width="3"/></g>`;
  const spear = () => `<g transform="translate(14 0) rotate(-90)"><rect x="-5" y="-360" width="10" height="560" rx="4" fill="#6a4426" stroke="${INK}" stroke-width="3.5"/>` +
    `<path d="M0,-440 L16,-370 L0,-356 L-16,-370Z" fill="#c9ccd2" stroke="${INK}" stroke-width="4"/><path d="M0,-432 L0,-362" stroke="#fff" stroke-width="2"/>` +
    `<path d="M-8,-356 q-14,30 -6,60 M8,-356 q14,30 6,60 M0,-356 q0,30 0,64" stroke="#c0282a" stroke-width="7" fill="none" stroke-linecap="round"/></g>`;

  const zhuge = Kit.character({
    name: 'zhuge',
    body: { spine: 108, chest: 124, upperArm: 90, lowerArm: 84 },
    skin: '#f3e2c6',
    head: { rx: 148, ry: 140, wobble: 0.1, seed: 52, jaw: 0.6, crown: 0.35 },
    hair: { style: 'short', color: '#26222c' },
    hat: { style: 'lunjin', color: '#232838' },
    outfit: { type: 'robe', color: '#ece6d6', pattern: 'diamond', trim: '#2a3346', inner: '#fdfaf2', dots: '#c9a25a', sash: '#2a3346', pendant: '#3fae7c', rim: '#ffd59a', length: 160 },
    pants: '#d8d0bc',
    face: { beard: 'goatee', mustache: true, mustacheScale: 0.8 },
    faceDefaults: { blush: 0.2 },
    props: [{ name: 'fan', bone: 'handR', z: 21, visible: c => c.props.fan, draw: fan }],
  });

  const boy = (name, seed, color) => Kit.character({
    name,
    body: { thigh: 72, shin: 68, spine: 70, chest: 78, neck: 12, upperArm: 58, lowerArm: 54, shoulderW: 40, hipW: 22 },
    skin: '#f7e6d2',
    head: { rx: 128, ry: 120, wobble: 0.1, seed, jaw: 0.3, crown: 0.3 },
    hair: { style: 'kidbuns', color: '#2a2024', band: '#c0282a' },
    outfit: { type: 'tunic', color, pattern: 'dots', trim: Kit.dk(color, 0.5), inner: '#f6efdc', dots: '#f2cf7a', sash: '#c38a2c', pendant: null },
    pants: '#3a3046',
    faceDefaults: { blush: 0.55 },
    props: [{ name: 'broom', bone: 'handR', z: 21, visible: c => c.props.broom, draw: broom }],
  });

  const simaYi = Kit.character({
    name: 'simayi',
    body: { chest: 130, spine: 112, shoulderW: 64, upperArm: 94 },
    skin: '#e8cfaa',
    head: { rx: 150, ry: 138, wobble: 0.12, seed: 71, jaw: 0.95, crown: 0.1 },
    hair: { style: 'short', color: '#3a3036' },
    hat: { style: 'helmet', trim: '#c8963f', plume: '#2a3a8a' },
    outfit: { type: 'armor', color: '#2a3a6a', metal: '#7d8794', trim: '#1a2238', mirror: '#c8963f', sash: '#c8963f', pendant: null },
    pants: '#1c2238',
    face: { mustache: true, beard: 'long', beardColor: '#3a3036' },
    faceDefaults: { blush: 0.1 },
  });

  const soldier = (name, seed, color) => Kit.character({
    name,
    body: { chest: 118, spine: 104, shoulderW: 58 },
    skin: '#ecd3b0',
    head: { rx: 138, ry: 128, wobble: 0.12, seed, jaw: 0.7 },
    hair: { style: 'short', color: '#2a2228' },
    hat: { style: 'helmet', trim: '#8a6a3a', plume: '#c0282a' },
    outfit: { type: 'armor', color, metal: '#6f7782', trim: '#1a1a22', mirror: '#9a8a6a', sash: '#5a2a1a', pendant: null },
    pants: '#2a2428',
    faceDefaults: { blush: 0.1 },
    props: [{ name: 'spear', bone: 'handR', z: 21, sideZ: 21, visible: c => c.props.spear !== false, draw: spear }],
  });

  const sweeper = (name, seed, color) => Kit.character({
    name,
    skin: '#ecd0a8',
    head: { rx: 140, ry: 132, wobble: 0.12, seed, jaw: 0.7 },
    hair: { style: 'topknot', color: '#2a2228', pin: false, band: '#7a5a3a' },
    hat: { style: 'band', color: '#c8b48a' },
    outfit: { type: 'tunic', color, pattern: 'none', trim: Kit.dk(color, 0.4), inner: '#e8dcc0', dots: '#c8b48a', sash: '#6a4a2a', pendant: null },
    pants: '#4a3e34',
    face: { mustache: seed % 2 === 0 },
    props: [{ name: 'broom', bone: 'handR', z: 21, visible: c => c.props.broom !== false, draw: broom }],
  });

  const TK = {
    zhuge, simaYi,
    boyA: boy('boyA', 61, '#3f7a9a'), boyB: boy('boyB', 64, '#5a8a4a'),
    soldierA: soldier('soldierA', 81, '#2a3a6a'), soldierB: soldier('soldierB', 84, '#3a2a5a'),
    sweeperA: sweeper('sweeperA', 91, '#7a6a52'), sweeperB: sweeper('sweeperB', 94, '#6a5a4a'),
    props: { fan, broom, spear },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = TK;
  else root.TK = TK;
})(typeof window !== 'undefined' ? window : globalThis);
