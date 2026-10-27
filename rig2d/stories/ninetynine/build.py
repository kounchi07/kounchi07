"""
"Why prices end in .99" — timeline + sound cues -> cues.js (read by the page and the mixer).
  python3 stories/ninetynine/build.py
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'tools'))
from accents import plan  # noqa: E402

T = json.load(open(os.path.join(HERE, 'audio', 'timing.json')))
ORDER = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10', 'n11', 'n12']
GAP = {'n5': 0.35, 'n9': 0.5, 'n12': 0.35}      # pauses before these lines (default 0.3 s)

LINES, t = {}, 0.05                             # voice on frame 1 (playbook)
for k in ORDER:
    t += GAP.get(k, 0.3) if LINES else 0
    LINES[k] = round(t, 3)
    t += T[k]['duration']
end = lambda k: round(LINES[k] + T[k]['duration'], 3)


def word_t(line, word, nth=1):
    for w in T[line]['words']:
        if w['word'].lower().strip('.,!?"') == word:
            nth -= 1
            if nth == 0:
                return round(LINES[line] + w['start'], 3)
    raise KeyError(f'{line}: {word}')


EV = {
    'store': 0.0, 'cent': word_t('n1', 'cent'), 'counter': LINES['n2'] - 0.12, 'pocket': LINES['n3'] - 0.1,
    'receipt': LINES['n4'] - 0.08, 'record': word_t('n4', 'no', 2) - 0.05, 'nobody': word_t('n4', 'nobody') - 0.05,
    'shelf': LINES['n5'] - 0.12, 'flip': word_t('n5', 'ninety-nine') if any(w['word'].lower().startswith('ninety') for w in T['n5']['words']) else word_t('n5', 'cents') - 0.4,
    'penny': LINES['n6'] - 0.1, 'register': LINES['n7'] - 0.1, 'bell': word_t('n7', 'bell'), 'records': word_t('n7', 'records'),
    'counted': LINES['n8'] - 0.1, 'stopped': word_t('n8', 'stealing') - 0.1,
    'today': LINES['n9'] - 0.25, 'cameras': word_t('n9', 'cameras'), 'never': word_t('n9', 'never'),
    'brain': LINES['n10'] - 0.1, 'first': word_t('n10', 'first'),
    'scale': LINES['n11'] - 0.1, 'three': word_t('n11', 'three'),
    'checkout': LINES['n12'] - 0.1, 'you': word_t('n12', 'you'),
}
DURATION = round(end('n12') + 1.9, 2)           # the last beat: the receipt keeps coming

cues = [{'file': f'audio/{k}.wav', 't': v, 'gain': 1.0} for k, v in LINES.items()]
cues += [
    {'file': 'sfx/bed_shop.wav', 't': 0.0, 'gain': 1.0, 'loop': EV['you'] + 0.6, 'fadeOut': 0.8, 'bus': 'bed'},
    {'file': 'sfx/ping.wav', 't': EV['cent'], 'gain': 0.5},
    {'file': 'sfx/swish.wav', 't': EV['pocket'] + 0.5, 'gain': 0.45},
    {'file': 'sfx/tick.wav', 't': EV['receipt'] + 0.05, 'gain': 0.5},
    {'file': 'sfx/tick.wav', 't': EV['record'] + 0.05, 'gain': 0.5},
    {'file': 'sfx/tick.wav', 't': EV['nobody'] + 0.05, 'gain': 0.5},
    {'file': 'sfx/pop_soft.wav', 't': EV['flip'], 'gain': 0.6},
    {'file': 'sfx/ping.wav', 't': EV['penny'] + 0.3, 'gain': 0.35},
    {'file': 'sfx/ding.wav', 't': EV['bell'], 'gain': 0.8},
    {'file': 'sfx/riser.wav', 't': EV['today'] - 0.6, 'gain': 0.5},
    {'file': 'sfx/whoosh.wav', 't': EV['first'] - 0.05, 'gain': 0.4},
    {'file': 'sfx/thud.wav', 't': EV['three'], 'gain': 0.6},
    {'file': 'sfx/ding.wav', 't': EV['you'] + 0.1, 'gain': 0.8},
]

CUT_KEYS = ['counter', 'pocket', 'receipt', 'record', 'nobody', 'shelf', 'penny', 'register', 'counted', 'stopped', 'today', 'brain', 'scale', 'checkout']
HARD = {'record', 'nobody'}                     # the three punches are hard cuts on the words
CUTS = [{'t': EV[k], 'kind': 'cut' if k in HARD else 'dissolve', 'dur': 0.17} for k in CUT_KEYS]

WORDS = [(round(LINES[k] + w['start'], 3), w['word']) for k in LINES for w in T[k]['words']]
HOT = re.compile(r'cent|dollar|penny|pocket|ninety|bell|stopped|first|three|catches', re.I)
cues += plan(cues, cuts=[c['t'] for c in CUTS], words=WORDS, hot=HOT, duration=DURATION,
             sounds={'cut': 'sfx/swish.wav', 'hot': 'sfx/pop_soft.wav', 'fill': 'sfx/tick.wav'})

REAL = {'sfx/swish.wav': 'whoosh', 'sfx/whoosh.wav': 'whoosh'}   # only CC0-verified sounds (assets/PROVENANCE.md)
for c in cues:
    real = REAL.get(c['file'])
    if real and os.path.exists(os.path.join(HERE, 'sfx', 'real', f'{real}.wav')):
        c['file'] = f'sfx/real/{real}.wav'

data = {'duration': DURATION, 'lines': LINES, 'events': EV, 'cuts': CUTS, 'cues': cues, 'timing': T,
        'mix': {'bedDb': 11, 'duckDb': 6}}
open(os.path.join(HERE, 'cues.js'), 'w').write('window.CUES = ' + json.dumps(data) + ';\n')
print(DURATION, json.dumps(EV))
