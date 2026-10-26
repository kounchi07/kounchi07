/*
 * More characters, each one only a Kit description.
 */
(function (root) {
  'use strict';
  const Kit = root.Kit || require('../src/kit.js');
  const INK = '#2b1d16';

  const sack = () => `<g transform="translate(18 6)"><path d="M-8,0 C-60,10 -70,90 -30,120 C0,138 50,132 62,100 C76,62 40,8 8,0 Z" fill="#b8975f" stroke="${INK}" stroke-width="5"/>` +
    `<path d="M-6,4 q14,8 26,-2" stroke="${INK}" stroke-width="5" fill="none"/><path d="M-30,60 q20,10 40,-4 M-10,96 q16,6 30,-6" stroke="#8a6a3a" stroke-width="3" fill="none"/>` +
    `<path d="M10,40 l8,8 M18,40 l-8,8" stroke="${INK}" stroke-width="3"/></g>`;

  const Cast = {
    thief: Kit.character({
      name: 'thief',
      body: { thigh: 118, shin: 112, chest: 112, spine: 96 },
      skin: '#efd7b8',
      head: { rx: 140, ry: 132, wobble: 0.13, seed: 21, jaw: 0.4, crown: 0.1 },
      hair: { style: 'hood', color: '#26232e' },
      outfit: { type: 'tunic', color: '#34313f', pattern: 'none', trim: '#1a1820', inner: '#4a4656', dots: '#6a6578', sash: '#8a2f2a', pendant: null },
      pants: '#24212c', shoes: { color: '#121016', sole: '#3a3640' },
      props: [{ name: 'sack', bone: 'handR', z: 19, sideZ: 21, visible: c => c.props.sack, draw: sack }],
    }),
    monk: Kit.character({
      name: 'monk',
      body: { chest: 130, spine: 115, upperArm: 92, shoulderW: 62 },
      skin: '#f0d2a8',
      head: { rx: 160, ry: 140, wobble: 0.09, seed: 33, jaw: 0.9, crown: 0 },
      hair: { style: 'bald', color: '#3a2a20' },
      outfit: { color: '#c8662a', pattern: 'dots', trim: '#7a2e1a', inner: '#f2d38a', dots: '#f2d38a', sash: '#6a2a18', pendant: '#c8a24a' },
      face: { mustache: true },
    }),
    girl: Kit.character({
      name: 'girl',
      body: { thigh: 96, shin: 92, spine: 92, chest: 100, upperArm: 76, lowerArm: 70, shoulderW: 46 },
      skin: '#f6e4d2',
      head: { rx: 146, ry: 136, wobble: 0.08, seed: 44, jaw: 0.5, crown: 0.4 },
      hair: { style: 'long', color: '#3a2420' },
      outfit: { color: '#c75b7a', pattern: 'diamond', trim: '#5a1f36', inner: '#fbe8ee', dots: '#f6c26a', sash: '#f6c26a', pendant: '#7ac4e0', length: 120 },
      faceDefaults: { blush: 0.5 },
    }),
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Cast;
  else root.Cast = Cast;
})(typeof window !== 'undefined' ? window : globalThis);
