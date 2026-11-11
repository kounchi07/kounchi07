"""
Original 161 BPM track for the LOVE edit test (stories/love10): four 8-beat sections, minor key.
Kick on every beat, clap on 2 and 4, 8th hats, a sub bass following the chord roots, a soft detuned pad,
a noise riser into each section and an impact on its downbeat.   python3 stories/love10/music.py out/love_music.wav
"""
import sys
import wave
import numpy as np

SR, BEAT = 44100, 0.372
SECTIONS, BARS = 4, 2                                  # 4 sections x 2 bars x 4 beats = 32 beats
N = int(SR * (BEAT * 32 + 1.2))
out = np.zeros((N, 2), np.float32)
t_all = np.arange(N) / SR
rng = np.random.default_rng(7)


def add(sig, at, pan=0.0, gain=1.0):
    i = int(at * SR); n = min(len(sig), N - i)
    if n <= 0: return
    out[i:i + n, 0] += sig[:n] * gain * (1 - max(0, pan))
    out[i:i + n, 1] += sig[:n] * gain * (1 + min(0, pan))


def env(n, a, d):
    e = np.ones(n); na = int(a * SR); e[:na] = np.linspace(0, 1, na) if na else 1
    return e * np.exp(-np.arange(n) / SR / d)


def kick():
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t * 7.5) + 0.3 * np.tanh(np.sin(ph) * 4) * np.exp(-t * 30)).astype(np.float32)


def clap():
    n = int(0.25 * SR); t = np.arange(n) / SR; nz = rng.standard_normal(n)
    e = sum(np.exp(-np.maximum(0, t - d) * 60) * (t >= d) for d in (0, 0.011, 0.022)) + np.exp(-t * 14) * 0.6
    bp = np.convolve(nz, np.sin(2 * np.pi * 1500 * np.arange(64) / SR) * np.hanning(64), 'same')
    return (bp / np.abs(bp).max() * e * 0.8).astype(np.float32)


def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR); nz = rng.standard_normal(n); hp = np.diff(nz, prepend=0)
    return (hp / np.abs(hp).max() * np.exp(-np.arange(n) / SR / (0.06 if open_ else 0.012)) * 0.5).astype(np.float32)


def note(freq, dur, kind='bass'):
    n = int(dur * SR); t = np.arange(n) / SR
    if kind == 'bass':
        s = np.tanh(2.2 * np.sin(2 * np.pi * freq * t)) * env(n, 0.005, dur * 0.8)
    else:   # pad: 3 detuned saws, low-passed by averaging, slow attack
        s = sum(2 * ((t * freq * k) % 1) - 1 for k in (0.997, 1.0, 1.004)) / 3
        s = np.convolve(s, np.ones(24) / 24, 'same') * env(n, 0.25, dur * 1.2) * 0.5
    return s.astype(np.float32)


def riser(dur):
    n = int(dur * SR); t = np.arange(n) / SR; nz = rng.standard_normal(n)
    k = np.linspace(4, 64, n).astype(int); s = np.array([nz[max(0, i - kk):i + 1].mean() for i, kk in zip(range(n), k)])
    return (s / np.abs(s).max() * (t / dur) ** 2 * 0.5).astype(np.float32)


def impact():
    n = int(1.2 * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (38 + 60 * np.exp(-t * 9)) * t) * np.exp(-t * 3)
    crash = np.diff(rng.standard_normal(n), prepend=0) * np.exp(-t * 2.2) * 0.35
    return (boom + crash).astype(np.float32)


# A minor: Am - F - C - G (one chord per bar), roots for the bass
CHORDS = [(220.0, 261.63, 329.63), (174.61, 220.0, 261.63), (261.63, 329.63, 392.0), (196.0, 246.94, 293.66)]
K, C, Ho, Hc = kick(), clap(), hat(True), hat()
for b in range(32):
    at = b * BEAT; bar = b // 4; sec = b // 8; ch = CHORDS[bar % 4]
    add(K, at, gain=0.95)
    if b % 2 == 1: add(C, at, 0.1, 0.55)
    add(Hc, at + BEAT / 2, 0.3, 0.35); add(Hc if b % 4 != 3 else Ho, at, -0.3, 0.2)
    add(note(ch[0] / 4, BEAT * 0.9), at, gain=0.45)
    if b % 4 == 0:
        for k, f in enumerate(ch): add(note(f, BEAT * 4, 'pad'), at, (k - 1) * 0.5, 0.22)
    if b % 8 == 0: add(impact(), at, gain=0.55)
    if b % 8 == 6: add(riser(BEAT * 2), at, gain=0.45)
add(impact(), 32 * BEAT, gain=0.6)
# gentle bus compression + limiter
peak = np.abs(out).max(); out = np.tanh(out / peak * 1.6) / np.tanh(1.6) * 0.92
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype('<i2').tobytes())
print('wrote', sys.argv[1], round(N / SR, 2), 's')
