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

## Next steps

- **Step 2 — Face kit:** smug lid bar, wavy "worried" mouth, white block teeth, multiple sweat drops,
  one-frame expression swaps (study §1).
- **Step 3 — Body style option:** an optional "simple" body style (pill torso, stick limbs with straight
  segments, ball hands, L feet) next to our detailed outfits (study §2).
- **Step 4 — Edit and sound:** dissolve + push-in transitions, an accent about every 1.5 s, always-on bed
  12–15 dB under the voice (study §4, §6).
