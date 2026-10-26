"""
Mix a story's soundtrack from a cue sheet.

  python3 tools/mix.py cues.js out.wav

cues.js holds `window.CUES = { "duration": 28, "cues": [ {"file": "audio/l1.wav", "t": 0.3, "gain": 1.0}, ... ] }`
(the same file the animation page loads, so picture and sound share one timeline).
Paths are relative to the cues file. Optional per cue: "fadeOut" seconds, "loop" seconds of length to fill.
"""
import json
import os
import re
import sys

import numpy as np
import soundfile as sf

SR = 44100


def load(path):
    x, sr = sf.read(path, dtype='float32', always_2d=True)
    x = x.mean(axis=1)
    if sr != SR:
        n = int(len(x) * SR / sr)
        x = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)
    return x


def main():
    src, out = sys.argv[1], sys.argv[2]
    data = json.loads(re.sub(r'^\s*window\.CUES\s*=\s*', '', open(src).read()).rstrip().rstrip(';'))
    base = os.path.dirname(os.path.abspath(src))
    mix = np.zeros(int((data['duration'] + 2) * SR), dtype=np.float32)
    for c in data['cues']:
        x = load(os.path.join(base, c['file'])) * c.get('gain', 1.0)
        if c.get('loop'):
            reps = int(np.ceil(c['loop'] * SR / len(x)))
            x = np.tile(x, reps)[:int(c['loop'] * SR)]
        if c.get('fadeOut'):
            n = min(len(x), int(c['fadeOut'] * SR))
            x[-n:] *= np.linspace(1, 0, n)
        s = int(c['t'] * SR)
        e = min(len(mix), s + len(x))
        mix[s:e] += x[:e - s]
    mix = mix[:int(data['duration'] * SR)]
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)          # soft limiter
    mix = mix / max(1e-6, np.abs(mix).max()) * 0.93
    sf.write(out, mix, SR)
    print(f'mixed {len(data["cues"])} cues -> {out} ({len(mix) / SR:.1f}s)')


if __name__ == '__main__':
    main()
