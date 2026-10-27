"""
Accent planner for short-form edits (Ricks Clips study §6: a sound accent lands about every 1.5 s).

  from accents import plan
  cues += plan(cues, cuts=[...], words=[(t, 'word'), ...], hot=re.compile('...'), duration=45,
               sounds={'cut': 'sfx/real/whoosh.wav', 'hot': 'sfx/pop_soft.wav', 'fill': 'sfx/tick.wav'})

Rules, in order:
  1. every cut gets a whoosh unless a sound already hits within 0.25 s of it
  2. key words (regex `hot`) get a soft pop at the word start, unless something already hits there
  3. any gap longer than `max_gap` (2.0 s) between accents gets a soft tick on the word start nearest its
     middle, so the rhythm follows the voice
Nothing is added inside `quiet` ranges (deliberate silences, e.g. a comedic pause).
Returns new cue dicts tagged "accent": true so they are easy to spot and tune.
"""


def plan(cues, cuts, words, duration, sounds, hot=None, max_gap=2.0, near=0.25, quiet=(), gains=None):
    g = dict({'cut': 0.35, 'hot': 0.3, 'fill': 0.22}, **(gains or {}))
    in_quiet = lambda t: any(a <= t <= b for a, b in quiet)
    # existing one-shot hits (not voice, not loops/beds)
    hits = sorted(c['t'] for c in cues if not c['file'].startswith('audio/') and not c.get('loop') and c.get('bus') != 'bed')
    out = []

    def free(t, gap=near):
        return not in_quiet(t) and all(abs(t - h) > gap for h in hits + [c['t'] for c in out])

    def add(t, kind):
        out.append({'file': sounds[kind], 't': round(max(0.0, t), 3), 'gain': g[kind], 'accent': True})

    for t in cuts:
        if free(t - 0.08):
            add(t - 0.08, 'cut')        # the whoosh peaks just as the new shot lands
    if hot is not None:
        for t, w in words:
            if hot.search(w) and free(t, max(near, 0.8)):   # pops stay at least 0.8 s apart
                add(t, 'hot')
    # fill long gaps on the voice rhythm
    while True:
        marks = sorted([0.0] + hits + [c['t'] for c in out] + [duration])
        gaps = [(b - a, a, b) for a, b in zip(marks, marks[1:]) if b - a > max_gap]
        added = False
        for _, a, b in sorted(gaps, reverse=True):
            mid = (a + b) / 2
            cand = [t for t, _ in words if a + 0.5 < t < b - 0.5 and free(t)]
            if cand:
                add(min(cand, key=lambda t: abs(t - mid)), 'fill')
                added = True
                break
        if not added:
            break
    return out
