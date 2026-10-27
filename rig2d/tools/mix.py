"""
Mix a story's soundtrack from a cue sheet.

  python3 tools/mix.py cues.js out.wav

cues.js holds `window.CUES = { "duration": 28, "cues": [ {"file": "audio/l1.wav", "t": 0.3, "gain": 1.0}, ... ] }`
(the same file the animation page loads, so picture and sound share one timeline).
Paths are relative to the cues file. Optional per cue: "fadeOut" seconds, "loop" seconds of length to fill,
"bus": "voice" | "bed" | "sfx" (default: files under audio/ are voice, looped cues bed, one-shots sfx).

Short-form mix (Ricks Clips study §6), tunable with an optional top-level "mix": {...}:
  bedDb  (12)   the music bed sits this many dB under the voice level (measured in pauses)
  duckDb (6)    and dips this much more while someone is speaking (sidechain ducking)
  sfxDb  (0)    trim for the sfx bus
  comp   (3.0)  master compression ratio (steady loudness, LRA ~2-3 LU like the reference)
Loudness normalisation to -14 LUFS happens when the video is encoded (render.js --audio / ffmpeg loudnorm).
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


def envelope(x, attack, release, win=0.01):
    """Peak-ish envelope with separate attack/release (seconds), at 100 Hz then upsampled."""
    hop = int(win * SR)
    n = len(x) // hop + 1
    frames = np.pad(np.abs(x), (0, n * hop - len(x)))[:n * hop].reshape(n, hop).max(axis=1)
    a, r = np.exp(-win / max(attack, 1e-4)), np.exp(-win / max(release, 1e-4))
    env = np.zeros(n)
    e = 0.0
    for i, v in enumerate(frames):
        e = a * e + (1 - a) * v if v > e else r * e + (1 - r) * v
        env[i] = e
    return np.interp(np.arange(len(x)) / hop, np.arange(n), env)


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)


def main():
    src, out = sys.argv[1], sys.argv[2]
    data = json.loads(re.sub(r'^\s*window\.CUES\s*=\s*', '', open(src).read()).rstrip().rstrip(';'))
    base = os.path.dirname(os.path.abspath(src))
    opt = dict({'bedDb': 12, 'duckDb': 6, 'sfxDb': 0, 'comp': 3.0}, **data.get('mix', {}))
    L = int((data['duration'] + 2) * SR)
    bus = {'voice': np.zeros(L, np.float32), 'bed': np.zeros(L, np.float32), 'sfx': np.zeros(L, np.float32)}
    for c in data['cues']:
        x = load(os.path.join(base, c['file'])) * c.get('gain', 1.0)
        if c.get('loop'):
            reps = int(np.ceil(c['loop'] * SR / len(x)))
            x = np.tile(x, reps)[:int(c['loop'] * SR)]
        if c.get('fadeOut'):
            n = min(len(x), int(c['fadeOut'] * SR))
            x[-n:] *= np.linspace(1, 0, n)
        # default buses: audio/ = voice, looped beds/ambiences = bed (leveled + ducked), one-shots = sfx
        b = c.get('bus') or ('voice' if c['file'].startswith('audio/') else 'bed' if c.get('loop') else 'sfx')
        s = int(c['t'] * SR)
        e = min(L, s + len(x))
        bus[b][s:e] += x[:e - s]

    voice, bed, sfx = bus['voice'], bus['bed'], bus['sfx']
    talking = envelope(voice, 0.02, 0.25)
    speech = talking > 0.05 * (np.abs(voice).max() + 1e-9)
    if bed.any() and voice.any():
        # level the bed against the voice, then duck it under speech (smoothed, no pumping)
        v_db = rms_db(voice[speech]) if speech.any() else rms_db(voice)
        b_db = rms_db(bed[np.abs(bed) > 1e-4])
        bed *= 10 ** ((v_db - opt['bedDb'] - b_db) / 20)
        duck = envelope(speech.astype(np.float32), 0.05, 0.35)
        bed *= 10 ** (-opt['duckDb'] * np.clip(duck, 0, 1) / 20)
    sfx *= 10 ** (opt['sfxDb'] / 20)
    mix = voice + bed + sfx

    # master compression: steady loudness like the reference shorts (LRA ~2-3 LU)
    env = envelope(mix, 0.005, 0.12)
    thr = 0.4 * (np.abs(mix).max() + 1e-9)
    over = np.maximum(env / thr, 1)
    mix = mix * over ** (1 / opt['comp'] - 1)
    mix = mix[:int(data['duration'] * SR)]
    mix = np.tanh(mix / (np.abs(mix).max() + 1e-9) * 1.4) / np.tanh(1.4)   # soft limiter
    mix = mix / max(1e-6, np.abs(mix).max()) * 0.93
    sf.write(out, mix, SR)
    nb = sum(1 for c in data['cues'] if c.get('bus') == 'bed' or (c.get('loop') and not c.get('bus')))
    print(f'mixed {len(data["cues"])} cues ({nb} bed) -> {out} ({len(mix) / SR:.1f}s)')


if __name__ == '__main__':
    main()
