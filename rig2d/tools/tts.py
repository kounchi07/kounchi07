"""
Kokoro voiceover for Rig2D stories.

  python3 tools/tts.py lines.json out_dir

lines.json: [{"id": "l1", "text": "Hello there.", "voice": "am_michael", "speed": 1.0}, ...]
  Optional "say": phonetic spelling used for the audio only (same word count as "text"),
  e.g. {"text": "Zhuge Liang", "say": "Joo-guh Lyahng"}; captions keep "text".

Writes per line: <id>.wav (24 kHz mono) and timing.json with
  duration, word timings (start/end seconds, for captions) and a 30 fps
  mouth envelope (0..1, for lip sync).

Needs: pip install kokoro-onnx soundfile
Model:  KOKORO_MODEL  (default /home/user/tts/model_quantized.onnx, onnx-community Kokoro-82M q8)
Voices: KOKORO_VOICES (default /home/user/tts/node_modules/kokoro-js/voices, raw float32 [510, 256])
"""
import json
import os
import re
import sys

import numpy as np
import onnxruntime as ort
import soundfile as sf
from kokoro_onnx.tokenizer import Tokenizer

SR = 24000
FPS = 30
MODEL = os.environ.get('KOKORO_MODEL', '/home/user/tts/model_quantized.onnx')
VOICES = os.environ.get('KOKORO_VOICES', '/home/user/tts/node_modules/kokoro-js/voices')


def voice_style(name, n_tokens):
    v = np.fromfile(os.path.join(VOICES, f'{name}.bin'), dtype=np.float32).reshape(-1, 256)
    return v[min(max(n_tokens, 0), len(v) - 1)][None, :]


def synth(sess, tok, text, voice, speed, lang):
    phon = tok.phonemize(text, lang)
    ids = tok.tokenize(phon)[:510]
    style = voice_style(voice, len(ids))
    wav = sess.run(None, {
        'input_ids': np.array([[0, *ids, 0]], dtype=np.int64),
        'style': style.astype(np.float32),
        'speed': np.array([speed], dtype=np.float32),
    })[0].reshape(-1)
    return wav


def trim(wav, thresh=0.01):
    idx = np.where(np.abs(wav) > thresh)[0]
    if len(idx) == 0:
        return wav, 0
    a, b = max(0, idx[0] - int(0.03 * SR)), min(len(wav), idx[-1] + int(0.08 * SR))
    return wav[a:b], a


def word_times(tok, text, lang, dur, say=None):
    # Spread the spoken time over words by phoneme count, with extra weight for pauses.
    words = re.findall(r"\S+", text)
    spoken = re.findall(r"\S+", say) if say else words
    if len(spoken) != len(words):
        spoken = words
    weights = []
    for w in spoken:
        n = len(tok.phonemize(re.sub(r"[^\w'’-]", '', w) or w, lang).replace(' ', '')) or 1
        pause = 4 if re.search(r'[.!?…]$', w) else 2 if re.search(r'[,;:—-]$', w) else 0
        weights.append((n, pause))
    total = sum(n + p for n, p in weights) or 1
    t, out = 0.0, []
    for w, (n, p) in zip(words, weights):
        start = t
        t += dur * n / total
        out.append({'word': w, 'start': round(start, 3), 'end': round(t, 3)})
        t += dur * p / total
    return out


def speech_segments(wav, thresh_db=-35, min_gap=0.15):
    """(start, end) spans of speech separated by pauses of at least min_gap seconds."""
    hop = int(0.01 * SR)
    rms = np.array([np.sqrt(np.mean(wav[i:i + hop] ** 2) + 1e-12) for i in range(0, len(wav), hop)])
    loud = 20 * np.log10(rms + 1e-12) > thresh_db
    segs, start, quiet = [], None, 0
    for i, v in enumerate(loud):
        if v:
            if start is None:
                start = i
            quiet = 0
        elif start is not None:
            quiet += 1
            if quiet * 0.01 >= min_gap:
                segs.append((start * 0.01, (i - quiet + 1) * 0.01)); start, quiet = None, 0
    if start is not None:
        segs.append((start * 0.01, len(loud) * 0.01))
    return segs


def align(tok, text, lang, wav, say=None):
    """Word timings: phrases split at punctuation are matched to the real pauses when the counts agree."""
    dur = len(wav) / SR
    split = lambda t: [p for p in re.split(r'(?<=[.!?,;…])\s+', t.strip()) if p]
    phrases, sphr = split(text), split(say or text)
    segs = speech_segments(wav)
    if len(segs) != len(phrases) or len(sphr) != len(phrases):
        return word_times(tok, text, lang, dur, say)
    out = []
    for ph, sp, (a, b) in zip(phrases, sphr, segs):
        for w in word_times(tok, ph, lang, b - a, sp):
            out.append({'word': w['word'], 'start': round(a + w['start'], 3), 'end': round(a + w['end'], 3)})
    return out


def envelope(wav):
    hop = SR // FPS
    frames = int(np.ceil(len(wav) / hop))
    env = np.array([np.sqrt(np.mean(wav[i * hop:(i + 1) * hop] ** 2) + 1e-12) for i in range(frames)])
    if env.max() > 0:
        env = env / np.percentile(env, 95)
    return [round(float(min(1.0, e)), 3) for e in env]


def main():
    lines = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    os.makedirs(out, exist_ok=True)
    sess = ort.InferenceSession(MODEL, providers=['CPUExecutionProvider'])
    tok = Tokenizer()
    timing = {}
    for ln in lines:
        lang = ln.get('lang', 'en-us')
        wav, _ = trim(synth(sess, tok, ln.get('say', ln['text']), ln.get('voice', 'am_michael'), ln.get('speed', 1.0), lang))
        wav = (wav / max(1e-6, np.abs(wav).max()) * 0.9).astype(np.float32)
        sf.write(os.path.join(out, f"{ln['id']}.wav"), wav, SR)
        dur = len(wav) / SR
        timing[ln['id']] = {'text': ln['text'], 'duration': round(dur, 3),
                            'words': align(tok, ln['text'], lang, wav, ln.get('say')), 'mouth': envelope(wav)}
        print(f"{ln['id']}: {dur:.2f}s  {ln['text']}")
    json.dump(timing, open(os.path.join(out, 'timing.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
