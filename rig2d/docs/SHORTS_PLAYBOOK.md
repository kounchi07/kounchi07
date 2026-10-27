# Short-form story playbook

Learned from a frame-by-frame (30 fps) study of a top-performing Ricks Clips story short
(~65 s, ~27M views) and compared with our own "Empty City" short. Use it for every script.

## The numbers to hit

| | Reference short | Our Empty City (v3) | Target |
|---|---|---|---|
| Length | 65 s | 45 s | 45–65 s |
| Words | 235 | 105 | 160–240 |
| Speaking pace (whole video) | ~217 wpm | ~140 wpm | 190–220 wpm |
| Silence between lines | ~0.2–0.3 s (3 more shorts: 0.3–0.45 s between sentences) | ~0.6 s avg, 8.8 s total | 0.3–0.45 s between sentences, ≤ 0.25 s inside |
| Average sentence | ~11 words, many 2–6 word punches | ~7.5 words | mix long setup lines with very short punches |
| New picture | every sentence (~2.5–3 s) | every 2–4 s | every 2–3 s, never a static frame |

## First 2 seconds (the hook)

- **Voice starts on frame 1.** No silence, no logo, no title card.
- **Open mid-action with a warning, a threat or an impossible claim** that implies a story: a character
  says something with stakes ("if X happens, run"). Not a statistic, not "did you know".
- **The mystery object is on screen in frame 1**, next to a character. The viewer sees the thing the
  story is about before they understand it.
- **First visual change by 0.5 s** (an expression swap), **first camera move by ~0.7 s** (a fast push
  into the mystery object). Something changes every ~15 frames.
- **Captions from frame 1**, 1–2 words at a time, center-low.

## Story shape (open loop, closed at the end)

1. **Hook:** warning or claim, plus the mystery object.
2. **Ridicule or doubt:** someone laughs at it. This creates an underdog to root for.
3. **Describe the object, not how it works.** Keep the "how?" question open.
4. **Stakes and antagonist:** someone powerful who won't listen.
5. **False alarm:** it triggers, nothing happens, and the ridicule escalates (laugh → laugh harder → thrown out).
6. **Low point:** the hero is exiled or alone.
7. **Rule-of-three escalation in short sentences:** "Then one... Then another. Then all of them at once."
8. **Warning ignored, with a funny voiced line** from a side character (mocking).
9. **Payoff:** the disaster happens; the hero was right.
10. **Close the loop:** only now explain how it works, in one tight mechanical description.
11. **Final line = the big meaning** (what it really was), then end immediately. No outro, no CTA.

The question planted in the first second ("what does this do?") is only answered in the last
~15 seconds. That open loop is what holds viewers to the end.

## Script style

- Concrete images in every sentence (bronze ball, dragon's mouth, frog). No abstractions.
- Mostly simple past narration with rhythm: a long line, then a 2–6 word punch.
- Use the rule of three for escalation and for jokes.
- Voice 1–2 short character lines for humor; let the narrator carry everything else.
- The title names the object and the stakes, never the answer ("The Ancient Jar That Warned an Empire").
- Names are optional; the story works without knowing who the inventor was.

## Visual and edit rules

- One new image per sentence; the camera is always moving (slow push, pan or drift).
- Fast push-ins (whip zooms) on reveal words; soft 4–5 frame dissolves between locations.
- Characters change expression on the beat of the line (swaps, not slow blends).
- Music bed stays low under the narration; sound hits only on beats.

## Applying it in Rig2D

- Kokoro narration at `speed` ≈ 1.15–1.2, and line starts packed with ≤ 0.3 s gaps (`build.py`).
- Put the first line at t = 0 and the hook visual (character + object + push-in) in the first 0.7 s.
- Write `lines.json` in the 11-step shape above before building any shots.
