/*
 * Cast for "Why prices end in .99" (stories/ninetynine): simple Rick-style bodies (Kit style 'simple').
 *   ST.owner    1880s store owner: bowler hat, mustache, white shirt + apron
 *   ST.clerk    the sneaky clerk: green visor, maroon vest, bow tie
 *   ST.lady     1880s customer: bun, purple dress, cameo badge
 *   ST.shopper  modern shopper ("you"): cap, teal hoodie
 */
(function (root) {
  'use strict';
  const K = root.Kit;
  const FACE = { layout: { eyeShape: 'oval', eyeShine: 0, eyeR: 0.074, mouthW: 0.17, mouthY: 0.38 } };
  const SKIN = '#f6efea';
  const simple = (cfg) => K.character(Object.assign({ style: 'simple', skin: SKIN, faceDefaults: { blush: 0 } }, cfg, { face: Object.assign({}, FACE, cfg.face || {}) }));

  const ST = {
    owner: simple({
      name: 'owner', head: { rx: 152, ry: 140, wobble: 0.06, seed: 31 },
      hair: { style: 'short', color: '#3a2a20' }, hat: { style: 'bowler', color: '#2a2422', trim: '#5a3a2a' },
      outfit: { color: '#f2ece2', apron: '#e2d6c2', bowtie: '#2a3a5a' },
      face: { mustache: true, mustacheColor: '#3a2a20', mustacheScale: 1.3 },
    }),
    clerk: simple({
      name: 'clerk', head: { rx: 148, ry: 138, wobble: 0.07, seed: 32 },
      hair: { style: 'short', color: '#2a1d18' }, hat: { style: 'visor', color: '#3aa86a', trim: '#2a2a2a' },
      outfit: { color: '#8a2e2e', bowtie: '#1f1a1a', pocket: true },
    }),
    lady: simple({
      name: 'lady', head: { rx: 145, ry: 138, wobble: 0.06, seed: 33 },
      hair: { style: 'bun', color: '#7a3a1e', pin: false }, outfit: { color: '#6a3ab0', badge: '#f0d8a8' },
    }),
    shopper: simple({
      name: 'shopper', head: { rx: 150, ry: 140, wobble: 0.06, seed: 34 },
      hair: { style: 'short', color: '#2a1d18' }, hat: { style: 'cap', color: '#d8503a' },
      outfit: { color: '#2a9a96' },
    }),
  };
  root.ST = ST;
})(typeof window !== 'undefined' ? window : globalThis);
