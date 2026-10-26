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


if __name__ == '__main__' and len(sys.argv) == 2:
    main()


# ---------------------------------------------------------------------------
# Cinematic set (used by stories/emptycity): instruments and textures that
# synthesis does convincingly. `python3 tools/sfx.py out_dir cinematic`
# ---------------------------------------------------------------------------
def taiko(pitch=62, d=1.4, hard=1.0):
    t = t_(d)
    f = pitch * (1 + 0.6 * np.exp(-t * 18))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.2)
    skin = lowpass(rng.standard_normal(len(t)), 1800) * np.exp(-t * 40) * 0.6 * hard
    over = np.sin(2 * np.pi * np.cumsum(f * 2.3) / SR) * np.exp(-t * 9) * 0.25
    x = np.tanh((body + skin + over) * 2.2)
    return norm(reverb(x, 1.8, 0.35))


def drum_pattern(bars=4, bpm=92):
    beat = 60 / bpm
    hit = taiko(60, 1.6)
    small = taiko(95, 0.8, 0.6) * 0.55
    pattern = [(0, hit), (1, small), (1.5, small), (2, hit), (3, small), (3.5, hit * 0.8)]
    out = np.zeros(int((bars * 4 * beat + 2) * SR))
    for b in range(bars):
        for pos, snd in pattern:
            s = int((b * 4 + pos) * beat * SR)
            out[s:s + len(snd)] += snd[:len(out) - s]
    return norm(out, 0.85)


def wind(d=8.0):
    n = np.cumsum(rng.standard_normal(int(d * SR)))
    n -= lowpass(n, 2)
    x = bandpass(n, 150, 1400)
    lfo = 0.55 + 0.45 * np.sin(2 * np.pi * 0.17 * t_(d)) * np.sin(2 * np.pi * 0.07 * t_(d) + 1)
    return norm(x * lfo * np.minimum(1, t_(d) / 0.8) * np.minimum(1, (d - t_(d)) / 0.8), 0.6)


def creak(d=1.4):
    t = t_(d)
    f = 55 + 25 * np.sin(2 * np.pi * 1.3 * t) + 8 * rng.standard_normal(len(t)).cumsum() / np.sqrt(SR) * 40
    saw = (np.cumsum(f) / SR) % 1 * 2 - 1
    grit = (rng.random(len(t)) < 0.002 * (1 + np.sin(2 * np.pi * 7 * t))).astype(float)
    x = bandpass(saw + grit * 4, 120, 2200) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.7
    return norm(reverb(x, 1.2, 0.3), 0.8)


def guqin_note(freq, d=2.2, slide=0.0, vel=1.0):
    n = int(SR / freq)
    buf = rng.uniform(-1, 1, n) * vel
    buf = lowpass(np.concatenate([buf, buf]), freq * 6)[:n]
    out = np.zeros(int(d * SR))
    fl = float(n)
    for i in range(len(out)):
        idx = i % n
        out[i] = buf[idx]
        buf[idx] = 0.998 * 0.5 * (buf[idx] + buf[(idx + 1) % n])
    if slide:
        tt = t_(d)
        warp = np.cumsum(1 + slide * np.clip(tt - 0.25, 0, 0.5)) / SR * SR
        out = np.interp(np.arange(len(out)), np.clip(warp, 0, len(out) - 1), out)
    body = lowpass(out, 2600) + 0.3 * bandpass(out, 180, 420)
    return body * np.minimum(1, t_(d) / 0.002)


PENTA = [146.8, 164.8, 185.0, 220.0, 246.9, 293.7, 329.6, 370.0, 440.0]  # D major pentatonic


def guqin_melody(d=22.0, seed=4):
    r = np.random.default_rng(seed)
    out = np.zeros(int((d + 3) * SR))
    t, i = 0.0, 4
    phrase = [4, 5, 4, 3, 2, 3, 4, 6, 5, 4, 2, 1, 2, 4, 3, 2, 0, 2, 3, 4]
    k = 0
    while t < d:
        i = phrase[k % len(phrase)]
        note = guqin_note(PENTA[i], 2.4, slide=0.05 if r.random() < 0.3 else 0, vel=0.8 + 0.2 * r.random())
        s = int(t * SR)
        out[s:s + len(note)] += note[:len(out) - s]
        if r.random() < 0.25:  # harmonic an octave up, softly
            h = guqin_note(PENTA[i] * 2, 1.4) * 0.35
            out[s:s + len(h)] += h[:len(out) - s]
        t += [0.45, 0.45, 0.9, 0.3, 0.6][k % 5]
        k += 1
    return norm(reverb(out, 2.2, 0.35), 0.7)


def guqin_crash():
    out = np.zeros(int(3 * SR))
    for j, f in enumerate([146.8, 155.6, 185.0, 207.7, 246.9, 277.2, 311.1]):
        n = guqin_note(f, 2.5, vel=1.0)
        s = int(j * 0.012 * SR)
        out[s:s + len(n)] += n[:len(out) - s]
    out[:int(0.3 * SR)] += thud()[:int(0.3 * SR)] * 2.5 if len(thud()) >= int(0.3 * SR) else 0
    return norm(reverb(out, 1.6, 0.3))


def impact():
    d = 2.2
    t = t_(d)
    f = 48 * np.exp(-t * 2) + 32
    x = np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2) * 3)
    x += lowpass(rng.standard_normal(len(t)), 900) * np.exp(-t * 12) * 0.8
    return norm(reverb(x, 2.0, 0.4))


def swish(d=0.35):
    t = t_(d)
    x = bandpass(rng.standard_normal(len(t)), 600, 5000) * np.sin(np.pi * t / d) ** 2
    return norm(lowpass(x, 4000), 0.5)


def strings_drone(d=6.0, root=73.4):
    t = t_(d)
    x = np.zeros(len(t))
    for m, a in [(1, 1), (1.5, 0.6), (2, 0.5), (2.997, 0.25)]:
        for det in (-0.6, 0.0, 0.7):
            ph = 2 * np.pi * root * m * t + det * t
            x += a * ((ph / (2 * np.pi)) % 1 * 2 - 1)
    x = lowpass(x, 900) * (1 + 0.15 * np.sin(2 * np.pi * 5.5 * t))
    return norm(x * np.minimum(1, t / 1.5) * np.minimum(1, (d - t) / 0.6), 0.55)


def cinematic(out):
    os.makedirs(out, exist_ok=True)
    for name, fn in [('taiko', lambda: taiko(62)), ('drums', drum_pattern), ('wind', wind), ('creak', creak), ('guqin', guqin_melody),
                     ('guqin_crash', guqin_crash), ('impact', impact), ('swish', swish), ('drone', strings_drone),
                     ('pluck_hi', lambda: norm(reverb(guqin_note(440, 2.0), 1.5, 0.3), 0.7))]:
        x = fn()
        sf.write(os.path.join(out, f'{name}.wav'), x.astype(np.float32), SR)
        print(f'{name}: {len(x) / SR:.2f}s')


if __name__ == '__main__' and len(sys.argv) > 2 and sys.argv[2] == 'cinematic':
    cinematic(sys.argv[1])
