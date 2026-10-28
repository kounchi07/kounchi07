/*
 * Cast for "The Great Emu War" test (3d/emu10.html): simple Rick-style bodies (Kit style 'simple').
 *   EM.gunner   machine gunner: slouch hat, khaki tunic with belt and pockets, mustache
 *   EM.major    the officer in charge: slouch hat, khaki tunic, Sam Browne style belt colour, neat mustache
 */
(function (root) {
  'use strict';
  const K = root.Kit;
  const FACE = { layout: { eyeShape: 'oval', eyeShine: 0, eyeR: 0.074, mouthW: 0.17, mouthY: 0.38 } };
  const SKIN = '#f6efea';
  const simple = (cfg) => K.character(Object.assign({ style: 'simple', skin: SKIN, faceDefaults: { blush: 0 } }, cfg, { face: Object.assign({}, FACE, cfg.face || {}) }));
  const KHAKI = '#b89a5e', FELT = '#9a8050', BAND = '#6a5636';
  const EM = {
    gunner: simple({
      name: 'gunner', head: { rx: 150, ry: 140, wobble: 0.06, seed: 41 },
      hair: { style: 'short', color: '#5a3a1e' }, hat: { style: 'slouch', color: FELT, trim: BAND },
      outfit: { color: KHAKI, pocket: true, collar: 'shirt', buttons: 4, buttonColor: '#c8a050', waist: '#6a4a24' },
      face: { mustache: true, mustacheColor: '#5a3a1e', mustacheScale: 1.1 },
    }),
    major: simple({
      name: 'major', head: { rx: 146, ry: 140, wobble: 0.05, seed: 42 },
      hair: { style: 'short', color: '#3a2a1e' }, hat: { style: 'slouch', color: '#8a7448', trim: '#5a4a2e' },
      outfit: { color: '#a88a50', pocket: true, collar: 'shirt', buttons: 4, buttonColor: '#d8b25a', waist: '#4a2e18', badge: '#c8302a' },
      face: { mustache: true, mustacheColor: '#3a2a1e', mustacheScale: 0.9 },
    }),
  };
  // the gunner after an emu has taken his hat (same man, bare head)
  EM.gunnerBare = simple({
    name: 'gunnerBare', head: { rx: 150, ry: 140, wobble: 0.06, seed: 41 },
    hair: { style: 'short', color: '#5a3a1e' },
    outfit: { color: KHAKI, pocket: true, collar: 'shirt', buttons: 4, buttonColor: '#c8a050', waist: '#6a4a24' },
    face: { mustache: true, mustacheColor: '#5a3a1e', mustacheScale: 1.1 },
  });
  root.EM = EM;
})(typeof window !== 'undefined' ? window : globalThis);
