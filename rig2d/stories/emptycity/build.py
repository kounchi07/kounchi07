"""
"The Empty City" — timeline + sound cues -> cues.js (read by the page and the mixer).
  python3 stories/emptycity/build.py
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools'))
from accents import plan  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'audio', 'timing.json')))

LINES = {'n1': 0.5, 'n2': 5.0, 'n3': 7.1, 'n4': 11.0, 'n5': 13.05, 'n6': 15.7, 'n7': 17.45, 'n8': 20.1,
         'n9': 23.2, 'n10': 27.4, 'n11': 31.3, 'n12': 35.6, 'z1': 39.7, 'b1': 41.2}
end = lambda k: round(LINES[k] + T[k]['duration'], 3)


def word_t(line, word):
    for w in T[line]['words']:
        if w['word'].lower().strip('.,!?"') == word:
            return round(LINES[line] + w['start'], 3)
    raise KeyError(word)


EV = {
    'street': 4.85, 'zhuge': 6.95, 'run': LINES['n4'], 'fight': word_t('n4', 'fight') - 0.25, 'crazy': LINES['n5'],
    'gate': 15.35, 'gateOpen': 15.75, 'sweep': 17.3, 'wall': 19.95, 'sima': 22.95, 'froze': word_t('n9', 'froze'),
    'trap': 27.25, 'retreat': 31.15, 'legend': 35.45, 'stop': end('n12') + 0.2, 'gone': LINES['z1'] - 0.15,
    'boy': LINES['b1'] - 0.15, 'plant': end('b1') + 0.45,
}
DURATION = round(EV['plant'] + 2.4, 2)

cues = [{'file': f'audio/{k}.wav', 't': v, 'gain': 1.0} for k, v in LINES.items()]
cues += [
    {'file': 'sfx/wind.wav', 't': 0.0, 'gain': 0.35, 'loop': DURATION, 'fadeOut': 1.5},
    {'file': 'sfx/drums.wav', 't': 0.0, 'gain': 0.42, 'loop': EV['street'] + 0.2, 'fadeOut': 0.4},
    {'file': 'sfx/swish.wav', 't': EV['street'] - 0.12, 'gain': 0.5},
    {'file': 'sfx/drone.wav', 't': EV['zhuge'], 'gain': 0.3, 'loop': EV['gate'] - EV['zhuge'], 'fadeOut': 0.6},
    {'file': 'sfx/taiko.wav', 't': EV['run'], 'gain': 0.6},
    {'file': 'sfx/taiko.wav', 't': EV['fight'], 'gain': 0.6},
    {'file': 'sfx/impact.wav', 't': word_t('n5', 'craziest'), 'gain': 0.55},
    {'file': 'sfx/creak.wav', 't': EV['gateOpen'], 'gain': 0.8},
    {'file': 'sfx/impact.wav', 't': EV['gateOpen'] + 1.15, 'gain': 0.6},
    {'file': 'sfx/swish.wav', 't': EV['sweep'], 'gain': 0.35},
    {'file': 'sfx/swish.wav', 't': EV['sweep'] + 0.7, 'gain': 0.35},
    {'file': 'sfx/swish.wav', 't': EV['sweep'] + 1.4, 'gain': 0.35},
    {'file': 'sfx/guqin.wav', 't': EV['wall'] + 0.4, 'gain': 0.36, 'loop': EV['stop'] - EV['wall'] - 0.4, 'fadeOut': 0.15},
    {'file': 'sfx/drums.wav', 't': EV['sima'], 'gain': 0.32, 'loop': EV['trap'] - EV['sima'], 'fadeOut': 0.5},
    {'file': 'sfx/impact.wav', 't': EV['froze'], 'gain': 0.8},
    {'file': 'sfx/drone.wav', 't': EV['trap'], 'gain': 0.45, 'loop': EV['retreat'] - EV['trap'] + 0.3, 'fadeOut': 0.5},
    {'file': 'sfx/drums.wav', 't': EV['retreat'], 'gain': 0.38, 'loop': EV['legend'] - EV['retreat'], 'fadeOut': 0.8},
    {'file': 'sfx/pluck_hi.wav', 't': EV['stop'] - 0.1, 'gain': 0.5},
    {'file': 'sfx/guqin_crash.wav', 't': EV['plant'], 'gain': 1.0},
    {'file': 'sfx/impact.wav', 't': EV['plant'], 'gain': 0.5},
]
# music bed (always on under the narration; steps aside while Zhuge plays the guqin on screen and for the
# silent beat at the end). Leveled against the voice and ducked under speech by tools/mix.py.
cues += [
    {'file': 'sfx/bed_ancient.wav', 't': 0.0, 'gain': 1.0, 'loop': EV['wall'] + 0.3, 'fadeOut': 0.6, 'bus': 'bed'},
    {'file': 'sfx/bed_ancient.wav', 't': EV['sima'], 'gain': 1.0, 'loop': EV['legend'] - EV['sima'] + 0.2, 'fadeOut': 0.5, 'bus': 'bed'},
]

# shot changes: dissolves (+ push-in) everywhere except the whip pans; the page reads CUTS for the picture
CUT_TIMES = [EV[k] for k in ['street', 'zhuge', 'run', 'fight', 'crazy', 'gate', 'sweep', 'wall', 'sima', 'trap', 'retreat', 'legend', 'stop', 'boy', 'plant']]
WHIP = {EV['street'], EV['gate'], EV['sweep'], EV['sima'], EV['retreat']}
# the collapse (plant) is the punchline: a hard cut on the hit, no dissolve
CUTS = [{'t': t, 'kind': 'whip' if t in WHIP else 'cut' if t == EV['plant'] else 'dissolve', 'dur': 0.17} for t in CUT_TIMES]

# accents: whoosh on cuts, soft pop on key words, ticks to keep a sound every ~1.5-2 s
WORDS = [(round(LINES[k] + w['start'], 3), w['word']) for k in LINES for w in T[k]['words']]
HOT = re.compile(r'hundred|fifty|thousand|nobody|craziest|gates|music|froze|trap|bluff|gone', re.I)
cues += plan(cues, cuts=[c['t'] for c in CUTS if c['t'] < EV['plant']], words=WORDS, hot=HOT, duration=DURATION,
             sounds={'cut': 'sfx/swish.wav', 'hot': 'sfx/pop_soft.wav', 'fill': 'sfx/tick.wav'},
             quiet=[(EV['stop'], EV['plant'] - 0.05)])

# Prefer real recordings (tools/fetch_sfx.py -> sfx/real/) over synthesized ones when present.
REAL = {'sfx/swish.wav': 'whoosh'}  # only CC0-verified sounds (see assets/PROVENANCE.md)
for c in cues:
    real = REAL.get(c['file'])
    if real and os.path.exists(os.path.join(HERE, 'sfx', 'real', f'{real}.wav')):
        c['file'] = f'sfx/real/{real}.wav'

data = {'duration': DURATION, 'lines': LINES, 'events': EV, 'cuts': CUTS, 'cues': cues, 'timing': T,
        'mix': {'bedDb': 15, 'duckDb': 6}}
open(os.path.join(HERE, 'cues.js'), 'w').write('window.CUES = ' + json.dumps(data) + ';\n')
print(DURATION, json.dumps(EV))
