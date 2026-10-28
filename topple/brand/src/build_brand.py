import base64
import os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + '/'

# The mark: a three-bar stack. The middle bar is being pulled out (solid orange), lime streaks fill the gap
# it leaves, and the top bar tips into that gap. Drawn on a 128 grid; visual centre is about (64, 70).
def mark(stroke='#ff6b1a', body='#1b1e24', lime='#b4ff39'):
    # top bar pivots on its bottom-right corner, which still rests on the pulled bar, and dips into the gap
    return (f'<g stroke-linejoin="round">'
            f'<rect x="14" y="88" width="76" height="20" rx="5" fill="{body}" stroke="{stroke}" stroke-width="5"/>'
            f'<rect x="44" y="62" width="76" height="20" rx="5" fill="{stroke}"/>'
            f'<rect x="54" y="66" width="56" height="4" rx="2" fill="#fff" opacity=".35"/>'
            f'<g transform="rotate(-7 90 56)"><rect x="14" y="36" width="76" height="20" rx="5" fill="{body}" stroke="{stroke}" stroke-width="5"/></g>'
            f'<path d="M6 74h28M14 81h18" stroke="{lime}" stroke-width="4.5" stroke-linecap="round"/>'
            f'</g>')

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
_tt = TTFont(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'RussoOne-latin.woff2')); _gs = _tt.getGlyphSet(); _cmap = _tt.getBestCmap(); _upm = _tt['head'].unitsPerEm
def text_path(text, x, y, size, spacing, fill):
    """Outline text in Russo One so the logo renders identically everywhere."""
    k = size / _upm; d = []
    for ch in text:
        gname = _cmap.get(ord(ch))
        if gname is None: x += size * 0.3 + spacing; continue
        pen = SVGPathPen(_gs)
        _gs[gname].draw(TransformPen(pen, (k, 0, 0, -k, x, y)))
        d.append(pen.getCommands())
        x += _gs[gname].width * k + spacing
    return f'<path d="{" ".join(d)}" fill="{fill}"/>', x

open(OUT + 'mark.svg', 'w').write(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 22 120 92" width="480" height="368">'
    '<defs><filter id="g" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" result="b"/>'
    '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
    f'<g filter="url(#g)">{mark()}</g></svg>\n')

icon_defs = ('<defs>'
    '<radialGradient id="bg" cx="50%" cy="38%" r="78%"><stop offset="0" stop-color="#262a33"/><stop offset="1" stop-color="#0a0b0e"/></radialGradient>'
    '<radialGradient id="hz" cx="50%" cy="104%" r="62%"><stop offset="0" stop-color="#ff6b1a" stop-opacity=".5"/><stop offset="1" stop-color="#ff6b1a" stop-opacity="0"/></radialGradient>'
    '<pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M64 0H0V64" fill="none" stroke="#ff6b1a" stroke-opacity=".09" stroke-width="2"/></pattern>'
    '<filter id="glow" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="16" result="b"/>'
    '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    '<clipPath id="rnd"><rect width="1024" height="1024" rx="228"/></clipPath></defs>')
icon_body = ('<rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#grid)"/>'
    '<rect width="1024" height="1024" fill="url(#hz)"/>'
    f'<g filter="url(#glow)"><g transform="translate(512 520) scale(6.6) translate(-63 -72)">{mark()}</g></g>')
# full-bleed square: what the app stores want (they apply their own corner mask)
open(OUT + 'app-icon.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">{icon_defs}{icon_body}</svg>\n')
# rounded preview / web icon
open(OUT + 'app-icon-rounded.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">{icon_defs}<g clip-path="url(#rnd)">{icon_body}</g></svg>\n')

def lockup(bg):
    back = f'<rect width="900" height="260" fill="{bg}"/>' if bg else ''
    word, _ = text_path('TOPPLE', 300, 150, 118, 6, '#f3f4f6')
    tag, _ = text_path('PULL · STACK · DON\u2019T DROP IT', 304, 200, 23.5, 5.2, '#b4ff39')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 260" width="1800" height="520">'
        '<defs><filter id="g" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="b"/>'
        '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' + back +
        f'<g filter="url(#g)"><g transform="translate(40 26) scale(1.9) translate(-4 -32)">{mark()}</g></g>' + word + tag + '</svg>\n')
open(OUT + 'logo-lockup.svg', 'w').write(lockup(None))
open(OUT + 'logo-lockup-dark.svg', 'w').write(lockup('#0c0d10'))
print('written')
