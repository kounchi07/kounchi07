/*
 * The Scholar: the default Kit character (bun + hairpin, teal patterned robe, gold sash).
 */
(function (root) {
  'use strict';
  const Kit = root.Kit || require('../src/kit.js');
  const INK = '#2b1d16';
  const brush = () => `<g transform="translate(14 0)"><rect x="-6" y="-118" width="12" height="150" rx="4" fill="#c9a25a" stroke="${INK}" stroke-width="3.5"/>` +
    `<path d="M-6,-90 h12 M-6,-60 h12" stroke="#7a5a2a" stroke-width="3"/><path d="M-7,32 Q-9,52 0,74 Q9,52 7,32 Z" fill="#1a1414" stroke="${INK}" stroke-width="3"/></g>`;
  const spec = Kit.character({
    name: 'scholar',
    props: [{ name: 'brush', bone: 'handR', z: 19, visible: c => c.props.brush, draw: brush }],
  });
  const Scholar = { spec, colors: spec.colors };
  if (typeof module !== 'undefined' && module.exports) module.exports = Scholar;
  else root.Scholar = Scholar;
})(typeof window !== 'undefined' ? window : globalThis);
