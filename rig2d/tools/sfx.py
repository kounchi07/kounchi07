"""
Synthesized sound effects for Rig2D stories (no downloads, all generated).

  python3 tools/sfx.py out_dir

Makes 44.1 kHz mono WAVs: boom, whoosh, zip, pop, ding, boing, scratch, sting,
sneaky (pizzicato loop), crickets, drone, thud.
"""
import os
import sys

import numpy as np
import soundfile as sf

SR = 44100
rng = np.random.default_rng(7)


def t_(d):
    return np.arange(int(d * SR)) / SR


def env(d, a=0.005, r=None, curve=4.0):
    t = t_(d)
    e = np.minimum(1, t / max(a, 1e-4))
    if r is None:
        r = d
    return e * np.exp(-curve * t / r)


def lowpass(x, cutoff):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x))


def bandpass(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= ((f > lo) & (f < hi)).astype(float)
    return np.fft.irfft(X, len(x))


def reverb(x, size=1.2, mix=0.25):
    ir = rng.standard_normal(int(size * SR)) * np.exp(-6 * t_(size) / size)
    ir = lowpass(ir, 5000)
    wet = np.convolve(x, ir)[:len(x) + int(size * SR)]
    wet /= np.abs(wet).max() + 1e-9
    out = np.zeros(len(wet))
    out[:len(x)] += x
    return out * (1 - mix) + wet * mix * np.abs(x).max()


def norm(x, peak=0.9):
    return (x / (np.abs(x).max() + 1e-9) * peak).astype(np.float32)


def boom():  # "vine boom": dropping sub hit with a punchy click and a long tail
    d = 1.6
    t = t_(d)
    f = 70 * np.exp(-t * 1.6) + 38
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * env(d, 0.004, 0.9, 3)
    body = np.tanh(body * 3.5)
    click = rng.standard_normal(len(t)) * env(d, 0.001, 0.03, 8)
    x = body + 0.3 * lowpass(click, 2500) + 0.25 * np.sin(ph * 2) * env(d, 0.004, 0.4, 4)
    return norm(reverb(x, 1.4, 0.3))


def whoosh(d=0.55, lo=300, hi=4000):
    t = t_(d)
    n = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    seg = 1024
    for i in range(0, len(t), seg):
        k = i / len(t)
        c = lo + (hi - lo) * np.sin(np.pi * k) ** 2
        out[i:i + seg] = bandpass(n[i:i + seg] if len(n[i:i + seg]) == seg else np.pad(n[i:], (0, seg - len(n[i:]))), c * 0.6, c * 1.6)[:len(out[i:i + seg])]
    shape = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    return norm(lowpass(out, 6000) * shape)


def zip_():  # fast cartoon exit
    d = 0.45
    t = t_(d)
    f = 400 + 2600 * (t / d) ** 1.5
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(d, 0.003, 0.45, 2)
    return norm(0.6 * x + 0.5 * whoosh(d, 800, 6000))


def pop():
    d = 0.12
    t = t_(d)
    f = 900 * np.exp(-t * 30) + 300
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env(d, 0.001, 0.08, 5))


def ding():
    d = 1.6
    t = t_(d)
    x = sum(a * np.sin(2 * np.pi * 1320 * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 3), (2.76, 0.4, 5), (5.4, 0.2, 8), (0.5, 0.25, 2.5)])
    return norm(x * np.minimum(1, t / 0.002))


def boing():
    d = 0.7
    t = t_(d)
    f = 220 + 160 * np.sin(2 * np.pi * 14 * t) * np.exp(-t * 4) + 120 * (t / d)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env(d, 0.003, 0.7, 3))


def scratch():
    d = 0.5
    t = t_(d)
    n = rng.standard_normal(len(t))
    speed = np.abs(np.sin(2 * np.pi * 5 * t))
    x = bandpass(n, 400, 3500) * (0.3 + speed) + np.sin(2 * np.pi * np.cumsum(200 + 900 * speed) / SR) * 0.5
    return norm(x * env(d, 0.002, 0.5, 1.5))


def tone(freq, d, kind='saw'):
    t = t_(d)
    ph = (freq * t) % 1
    if kind == 'saw':
        return 2 * ph - 1
    return np.sin(2 * np.pi * freq * t)


def sting():  # "dun dun DUNNN"
    notes = [(98, 0.32), (92.5, 0.32), (82.4, 1.6)]
    out = []
    for f, d in notes:
        x = sum(tone(f * m, d) * a for m, a in [(1, 1), (1.5, 0.5), (2, 0.4), (1.005, 0.6)])
        x = lowpass(x, 1400) * env(d, 0.01, d * 1.5, 2)
        out.append(x)
        out.append(np.zeros(int(0.04 * SR)))
    return norm(reverb(np.concatenate(out), 1.2, 0.3))


def pluck(freq, d=0.35):
    n = int(SR / freq)
    buf = rng.uniform(-1, 1, n)
    out = np.zeros(int(d * SR))
    for i in range(len(out)):
        out[i] = buf[i % n]
        buf[i % n] = 0.996 * 0.5 * (buf[i % n] + buf[(i + 1) % n])
    return out


def sneaky(bars=4):  # tiptoe pizzicato line, 120 bpm eighths
    E2, G2, A2, B2, C3, D3, E3 = 82.4, 98, 110, 123.5, 130.8, 146.8, 164.8
    pattern = [E2, 0, G2, 0, A2, 0, B2, A2, E2, 0, G2, 0, C3, 0, B2, 0,
               E2, 0, G2, 0, A2, 0, B2, A2, D3, 0, C3, 0, B2, 0, E3, 0]
    step = 0.25
    out = np.zeros(int(len(pattern) * step * SR * bars / 2 + SR))
    for b in range(bars // 2):
        for i, f in enumerate(pattern):
            if not f:
                continue
            s = int((b * len(pattern) + i) * step * SR)
            p = pluck(f * 2, 0.3)
            out[s:s + len(p)] += p
    return norm(reverb(out, 0.8, 0.2), 0.8)


def crickets(d=4.0):
    t = t_(d)
    x = np.zeros(len(t))
    for start in np.arange(0, d, 0.9):
        for k in range(3):
            s = int((start + k * 0.07 + rng.uniform(0, 0.05)) * SR)
            c = np.sin(2 * np.pi * 4200 * t_(0.04)) * np.sin(np.pi * np.linspace(0, 1, int(0.04 * SR)))
            x[s:s + len(c)] += c[:len(x[s:s + len(c)])]
    return norm(x, 0.5)


def drone(d=4.0):
    t = t_(d)
    x = sum(tone(f, d, 'sin') * a for f, a in [(55, 1), (82.5, 0.5), (110.7, 0.3)])
    x *= 1 + 0.2 * np.sin(2 * np.pi * 0.5 * t)
    return norm(x * np.minimum(1, t / 1.0) * np.minimum(1, (d - t) / 0.3), 0.6)


def thud():
    d = 0.3
    t = t_(d)
    return norm(np.sin(2 * np.pi * np.cumsum(120 * np.exp(-t * 10) + 40) / SR) * env(d, 0.002, 0.2, 5) + 0.3 * lowpass(rng.standard_normal(len(t)), 800) * env(d, 0.001, 0.05, 6))


def main():
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for name, fn in [('boom', boom), ('whoosh', whoosh), ('zip', zip_), ('pop', pop), ('ding', ding), ('boing', boing),
                     ('scratch', scratch), ('sting', sting), ('sneaky', sneaky), ('crickets', crickets), ('drone', drone), ('thud', thud)]:
        x = fn()
        sf.write(os.path.join(out, f'{name}.wav'), x, SR)
        print(f'{name}: {len(x) / SR:.2f}s')


if __name__ == '__main__':
    main()
