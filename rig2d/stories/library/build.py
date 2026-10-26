"""
Story timeline for "The Library Nobody Could Rob".
Single source of truth: line start times + sound cues -> cues.js (read by the page AND the mixer).

  python3 stories/library/build.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
timing = json.load(open(os.path.join(HERE, 'audio', 'timing.json')))

LINES = {'l1': 0.35, 'l2': 5.55, 'l3': 7.3, 'l4': 9.75, 'l5': 12.9, 'l6': 16.2, 'l7': 20.5, 'l8': 23.1, 'l9': 24.9}
DURATION = 28.6


def word_t(line, word):
    for w in timing[line]['words']:
        if w['word'].lower().strip('.,!?"') == word:
            return round(LINES[line] + w['start'], 3)
    raise KeyError(word)


EVENTS = {
    'ropes': word_t('l3', 'ropes'), 'tunnels': word_t('l3', 'tunnels'), 'fake': word_t('l3', 'fake'),
    'vase': word_t('l4', 'vase'), 'screaming': word_t('l5', 'screaming'),
    'reveal': 19.8, 'scream': LINES['l7'], 'run': 21.2, 'empty': 22.9, 'final': 24.6, 'cat': 27.0,
}

cues = [{'file': f'audio/{k}.wav', 't': v, 'gain': 1.0} for k, v in LINES.items()]
cues[6]['gain'] = 0.85  # scream
cues += [
    {'file': 'sfx/whoosh.wav', 't': 0.0, 'gain': 0.5},
    {'file': 'sfx/drone.wav', 't': 0.0, 'gain': 0.22, 'loop': 5.4, 'fadeOut': 1.0},
    {'file': 'sfx/sneaky.wav', 't': 5.3, 'gain': 0.42, 'loop': EVENTS['vase'] - 5.3 + 0.2, 'fadeOut': 0.5},
    {'file': 'sfx/pop.wav', 't': EVENTS['ropes'], 'gain': 0.7},
    {'file': 'sfx/pop.wav', 't': EVENTS['tunnels'], 'gain': 0.7},
    {'file': 'sfx/boing.wav', 't': EVENTS['tunnels'] + 0.05, 'gain': 0.35},
    {'file': 'sfx/pop.wav', 't': EVENTS['fake'], 'gain': 0.7},
    {'file': 'sfx/boom.wav', 't': EVENTS['vase'], 'gain': 0.75},
    {'file': 'sfx/scratch.wav', 't': EVENTS['screaming'], 'gain': 0.35},
    {'file': 'sfx/drone.wav', 't': 16.0, 'gain': 0.4, 'loop': 3.8, 'fadeOut': 0.2},
    {'file': 'sfx/boom.wav', 't': EVENTS['reveal'], 'gain': 1.0},
    {'file': 'sfx/sting.wav', 't': EVENTS['reveal'] + 0.05, 'gain': 0.45},
    {'file': 'sfx/zip.wav', 't': EVENTS['run'], 'gain': 0.8},
    {'file': 'sfx/crickets.wav', 't': EVENTS['empty'], 'gain': 0.35, 'loop': 1.8, 'fadeOut': 0.4},
    {'file': 'sfx/ding.wav', 't': LINES['l9'] + timing['l9']['duration'] + 0.05, 'gain': 0.45},
    {'file': 'sfx/boom.wav', 't': EVENTS['cat'] + 0.15, 'gain': 0.7},
]

data = {'duration': DURATION, 'lines': LINES, 'events': EVENTS, 'cues': cues, 'timing': timing}
open(os.path.join(HERE, 'cues.js'), 'w').write('window.CUES = ' + json.dumps(data) + ';\n')
print(json.dumps(EVENTS))
