# Build log

A step-by-step record of how the Rig2D system is built, so each part is documented
and can later be packaged as a product.

## Step 1 — Scene lighting (2026-10-27)

**Why:** the Ricks Clips study (`docs/RICKS_STUDY.md` §3) showed that the biggest difference between their
frames and ours was not character detail but light. Their characters always take the light of the set:
the white face is lavender at night (`#cba9aa`), warm cream by a forge (`#fde9b0`), near-white in daylight,
outlines are tinted, a rim of light runs along the side facing the source, and shadows agree with it.
Ours were drawn in one fixed palette, so they looked pasted on top of the background.

**What was built:** `src/light.js`
- `Light.render(actor, { x, y, scale, light })`, a drop-in replacement for `actor.render(...)`.
- Works from the rendered silhouette (SVG filters and masks), so it applies to **any** character,
  outfit or prop without changing character files.
- Five layers: tint (with lifted, colored blacks), directional shading, rim light, projected
  set patterns (e.g. window blinds), and a cast shadow.
- Seven presets (day, golden, overcast, interior, night, candle, forge), all overridable.
- Point sources: `source: {x, y}` gives each character its own light direction from a candle, window or sun.
- `back: true` for backlit sets (sunset behind the characters): stronger rim, shadow toward the camera.
- The rig's built-in head shading now follows the scene light direction.

**Also changed:**
- `tools/render.js` accepts `page.html?query`, so a page can be rendered with options
  (Empty City supports `?nolight` for before/after comparisons).
- `stories/emptycity/index.html`: every set uses its own sun as the light source (`LIGHTS.ex/wt/st`).

**Tuning notes:**
- The first pass had cast shadows pointing toward the light (sign error). Fixed.
- The day preset first dulled white robes to gray. Tint and shade were lowered so daylight stays clean.
- The backlit rim was ~13 px on big close-ups and read as a second outline. It is now capped by scale
  (≤ 6–7 px) and dimmer (opacity ~0.6), close to Rick's subtle rim.

**How to check it:** `node tools/render.js tools/light_test.html out/lt --stills 0` renders every preset
next to the unlit character.

### Step 1b — Light only the skin (2026-10-27)

**Feedback:** the light should only affect the skin, not the clothes and body (the body style comes later).

**Change:** `Light` now lights only skin by default (`affect: 'skin'`; `affect: 'all'` keeps the old behaviour).
- The rig can render a **skin mask** (`render({ mask: 'skin' })`): skin parts white, everything else black,
  in the same draw order, so hats, hair and sleeves in front of the face hide it. Heads are skin; parts are
  marked with `skin: true` (kit hands are). Colors are forced with a CSS rule rather than a filter per part.
- Tint and shading are one gradient layer multiplied over the skin through that mask.
- The rim is now drawn by the head itself: a gradient stroke just inside the outline, strongest toward the
  light (no pixel filter).
- The cast shadow uses a silhouette render (`mask: 'silhouette'`) with a small blur.

**Gotcha found:** blend modes inside a masked *group* blend against an empty backdrop (the skin turned
flat). The mask must sit on each blended layer.

## Step 2 — Fast rendering (2026-10-27)

**Feedback:** rendering was too slow (a 45 s video took ~17 min).

**Measured** (per frame, Empty City): screenshot 2.1 s, page JS only 0.04 s. Of the drawing, the full-frame
grade + bloom was ~0.55 s, lit characters ~0.6 s (each light layer re-drew the character), backgrounds
only ~0.1 s, and PNG encoding ~0.4 s.

**Changes:**
1. **Light rebuilt for speed** (Step 1b): lit characters went from ~600 ms to ~150 ms.
2. **Fast mode** in `tools/render.js` (automatic with `--mp4` when the page defines `window.POST`): the
   page is loaded with `?post` and skips its grade, bloom, vignette, grain, captions and fades. Frames are
   captured as JPEG through CDP, and `tools/post.js` applies those effects in ffmpeg: tone curve +
   saturation, bloom at quarter resolution, vignette, grain, captions burned from an ASS file (same Inter
   Black style and pop), and fades. `--exact` keeps the old in-browser path.
3. **One command** renders, posts and muxes audio: `--audio mix.wav` (loudnorm −14 LUFS).
4. Workers default to the CPU count. `--range a,b` renders part of a video, `--flags` passes Chromium flags.
   Frames on disk are reused, so changing only captions or grade re-encodes in about a minute.

**Result (4-core cloud machine):**

| | Before | After |
|---|---|---|
| Per frame (one worker) | ~2.1 s | ~0.28 s |
| Capture, full 45 s video | ~16 min (1.4 fps) | ~3.3 min (6.7 fps) |
| Post + encode | ~1 min | ~1.2 min |
| Total | ~17 min | ~4.5 min |
| Re-encode only (caption/grade change) | full re-render | ~1.3 min |

Quality check: fast frames match the exact in-browser stills (colors, bloom, captions) side by side.

**Ceiling:** the machine is CPU-bound at 4 cores; more workers or Chromium flags gave no gain (tested
4/6/8 workers, single raster thread, GPU off). Speed scales with cores, so a bigger machine is faster.
The next software win would be caching static background layers as bitmaps (~1/3 of drawing time).

## Next steps

- **Step 2 — Face kit:** smug lid bar, wavy "worried" mouth, white block teeth, multiple sweat drops,
  one-frame expression swaps (study §1).
- **Step 3 — Body style option:** an optional "simple" body style (pill torso, stick limbs with straight
  segments, ball hands, L feet) next to our detailed outfits (study §2).
- **Step 4 — Edit and sound:** dissolve + push-in transitions, an accent about every 1.5 s, always-on bed
  12–15 dB under the voice (study §4, §6).
