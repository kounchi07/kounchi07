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

## Step 1c — Light as reflected light, not a color change (2026-10-27)

**Feedback:** "the lighting is not color, it is like actual light reflecting on characters... light coming on
somebody." The previous version tinted the whole skin evenly, which reads as a color filter.

**Change:** light is now directional and drawn by the head itself, so it follows the head's shape:
- **Key:** the side facing the source reflects the light's color (a pale face under firelight turns
  orange there), fading across the face, plus a brighter glow hugging the lit edge.
- **Shine:** a soft bright spot near the lit edge. **Rim:** a bright band just inside the outline.
- **Far side:** falls softly into the scene's shadow color.
- **Ambient:** only a faint cast of the surrounding light where it makes sense (moonlight at night),
  0 in daylight.
- Hands get the same key and shadow through a hands-only mask.
- Presets were retuned around light strength (`key`, `spec`, `rimOp`, `shadeOp`, `ambTint`).

**Bugs found:**
- Screening light onto an almost-white face can't brighten it, so the glow was invisible. The lit side
  has to reflect the light's color (multiply) with a screen glow only at the edge.
- When the same actor is drawn more than once per frame, its gradient IDs collided, so every copy used
  the first copy's light. Each lit render now gets unique IDs (`uid`).

**Check it:** `tools/light_face.html` (face close-ups per preset); `tools/face_sheet.html?lit=night`.

## Step 3 — Face kit (2026-10-27)

From the Ricks Clips face study (`docs/RICKS_STUDY.md` §1). New face controls (old faces unchanged):

| Control | What it does |
|---|---|
| `eyeShape: 'oval'` (or layout `eyeShape`) | Solid vertical oval eyes |
| `eyeShine: 0` (or layout) | No white shine in the eyes (also gives ring eyes a smaller pupil) |
| `lidBar`, `lidBarL`, `lidBarR` (0..1) | Thick flat bar over the top of the eye: the smug, unimpressed look |
| `mouthShape: 'wavy'` | Worried squiggle |
| `mouthShape: 'grin'` | Wide dark crescent with a row of white block teeth (`mouthSmile`, `mouthOpen` shape it) |
| `sweatDrops: 1..6` | Several sweat drops around the head (with highlights) |

New expressions: `smugBar`, `grin`, `worried`, `nervous`, `panic`, `crazy`. As in Rick's videos, swap them in
one frame on the word that motivates them (Timeline `ease: 'step'`).

**Tuning:** the first grin and wavy mouth were about a sixth of the face wide; Rick's span about half.
They were widened, and the grin became a deep crescent instead of a V.

**Check it:** `tools/face_sheet.html` renders every expression on a Rick-style test face (oval eyes, no shine).

## Step 4 — Body (2026-10-27)

### 4a. Light on the body
Clothes, hands and props now catch the scene light, the same way faces do:
- Every sleeve, leg and torso (tube) and every shape that declares a `lightShape` outline (kit hands, ball
  hands) lights itself from its own outline: a multiplied gradient (the light's color on the lit side, the
  shade on the far side), a screen glow on the lit edge, and a rim just inside the outline. Each limb shades
  like a rounded form, as in Rick's frames.
- At night (and by candle/forge) clothes dim toward the ambient color (`bodyDim` per preset), so a bright
  yellow vest no longer glows in a dark alley.
- `affect: 'skin'` keeps the old face-only behaviour.

**Performance:** the first version lit the body through a mask of the whole character, which pushed Empty
City from ~280 ms to ~850 ms per frame. Per-part lighting looks the same and costs ~410 ms.

**Also fixed:** tube and shape clip IDs now include the render's `uid`, so an actor drawn twice in one frame
(the retreat shot) can't borrow the other copy's clip shapes.

### 4b. Simple Rick-style body (Kit `style: 'simple'`)
From the body study (`docs/RICKS_STUDY.md` §2):
- **Torso:** a pill in one flat clothing color, wider than the detailed torso (`outfit.width`, default 235).
- **Limbs:** stick arms and legs made of straight segments (`limbs` color, default dark brown) with a thin
  highlight line. Knees and elbows bend as angles.
- **Hands and feet:** ball hands and short L-shaped feet.
- **Clothing marks:** `outfit.tie` (striped, from under the chin to mid-belly), `outfit.pocket` + `outfit.pen`,
  `outfit.badge`.
- Front and side views, works with the walk cycle, IK, face kit, hair, hats and props.

```js
const Guy = Kit.character({ style: 'simple', outfit: { color: '#e8a83a', tie: '#8a3a22', pocket: true, pen: '#3a7ad8' },
  face: { layout: { eyeShape: 'oval', eyeShine: 0 } } });
```

**Check it:** `tools/body_sheet.html` (standing, pointing, walking, side view, night window, forge).

**Not yet lit:** hair, hats and shoes don't take the body light yet (they draw arbitrary shapes; they need a
`lightShape` outline). Dark hair barely changes under multiplied light, so this is minor.

## Step 5 — Edit and sound (2026-10-27)

From the study (`docs/RICKS_STUDY.md` §4, §6): Rick's shorts dissolve between shots while the camera pushes in,
keep a music bed under the voice at all times, land a sound accent about every 1.5 s, and are mixed loud and
steady.

### Transitions (generic, in `tools/render.js`)
- A page that defines `window.CUTS = [{ t, dur, zoom }]` and supports `render(t, { side: 'before'|'after', cut })`
  gets **dissolves**: inside a cut's window (default 0.17 s = 5 frames) the renderer draws the outgoing and the
  incoming shot at the same moment and blends them. The outgoing shot fades while pushing in (`zoom`, 8%) and
  the incoming one settles from a slight zoom. Works in both fast and exact modes.
- Empty City: dissolves on 9 shot changes, whip pans kept on 5, and a **hard cut on the punchline** (the
  collapse). Shot selection now reads which side of a cut to draw (`SEL`), so any story can opt in the same way.

### Music bed and accents
- `tools/sfx.py out bed` synthesizes (no downloads): `bed_ancient` (pentatonic plucked ostinato + low pad +
  light woodblock pulse, 40 s, loops without a seam), and accents `tick`, `ping`, `pop_soft`, `riser`.
- `tools/accents.py` plans accents for any story: a whoosh on every cut without a sound, a soft pop on key words
  (at least 0.8 s apart), and a tick on a word start whenever the gap between sounds runs past 2 s. `quiet`
  ranges keep deliberate silences silent. Empty City: 24 accents, about one sound per second.
- `tools/mix.py` mixes in three buses: **voice** (`audio/`), **bed** (looped cues: music, wind, drums, drones)
  and **sfx** (one-shots). The bed is leveled against the voice (`bedDb`) and **ducked** under speech
  (`duckDb`, smoothed so it doesn't pump), and the master is compressed for steady loudness. Encoding
  normalizes to −14 LUFS.

**Measured** (median 20 ms frame levels, the same method as the Rick analysis):

| | Before | After | Ricks Clips |
|---|---|---|---|
| Voice vs background | 4.8 dB | 9.7 dB | 11.7–13.5 dB |
| Sound accents | ~1 every 1.6 s | ~1 every 1.1 s | ~1 every 1.5 s |

The remaining gap to Rick is the story's deliberate one-shots in the pauses (gate impacts, drums), not the bed.

**Gotcha:** the old ambience loops (wind, drums, drone) were on the effects bus at full level, so the
background sat only ~2 dB under the voice. Treating every looped cue as bed (leveled + ducked) fixed it.

## Step 6 — Light on hair, hats and shoes (2026-10-27)

- Head parts can declare `hairLight(ctx, blob, fs)`, which returns the outline of the hair and hat *in front of*
  the head. The head lights it like any other part (lit-side color, far-side shade, glow, rim). The kit provides
  it for hair caps (bun, long, short, kidbuns, topknot) and the lunjin and helmet hats.
- Kit shoes declare a `lightShape` (the left shoe's outline is mirrored to match its drawing).
- Hair behind the head (buns, long hair at the back) is not lit, to keep light off the face area.

## Step 7 — New story: "Why prices end in .99" (2026-10-27)

Built on the whole system: simple Rick-style bodies, the face kit, scene light, dissolves, a music bed with
ducking, accents and the fast render.
- Script: 12 lines, 139 words, 204 wpm, 44.4 s, following the playbook (hook on frame 1, open loop, "You see,"
  pivot, last line calls back to the hook). The disputed cashier-theft origin is told as "the story goes"; the
  left-digit effect is well documented.
- Cast (`characters/store.js`): owner (bowler, mustache, apron), clerk (green visor, vest), 1880s customer,
  modern shopper (cap, hoodie). New kit pieces: hats `bowler`, `visor`, `cap`; outfit marks `apron`, `bowtie`.
- Sets and props (`scenes/store.js`): 1880s general store, modern aisle, checkout, giant price tag, balance scale,
  brass register, bill, penny, tags, cash box, receipt spike, ledger, cart.
- Sound: new bouncy major-key bed `bed_shop`; voice sits ~14 dB above the background.

## Step 8 — Detail pass (2026-10-27)

**Feedback:** "the reason other channels look better is the details added to everything... every object has to
be detailed." Correct: the first version of the store sets used flat fills (blank colored blocks for goods, a plain
gold register, flat counter panels, flat clothes).

**Built:** `src/detail.js`, a toolkit every prop and set uses: contact shadows (`ao`), form shading (`shade`),
edge highlights, wear and scuffs, screws and nails, glass reflections, product labels with brand words,
stitching, plank walls with grain, knots and nails, dust, and engraving for metalwork.

**Applied:**
- Shelf goods: candy jars with candy and sticks, ridged lids and labels; tins with rims and branded labels;
  burlap sacks with weave, tie and stencil; bottles with liquid, cork and label; cracker boxes; stacked tins.
  Every item has a contact shadow, shading and highlights.
- Shelves: trim, brackets with screws, shadow on the wall.
- Register: engraved brass with side scrolls, keys on stems with denominations, "AMOUNT PURCHASED" plate,
  crest, glass window, crank with wooden handle, drawer with keyhole and coin trays, highlights and wear.
- Store: plank wall, ceiling beam with hanging baskets and pans, window with curtains, sill plant and
  dusty light, clock, "NO CREDIT" sign, calendar, detailed oil lamps, nailed floorboards, patterned rug,
  beveled counter with brass edging, kick plate and scuffs, counter clutter (candy jars, newspapers, scale,
  receipt pad), barrels in the foreground.
- Aisle and checkout: labels and highlights on products, glossy floor reflections, hanging aisle sign, vents,
  end-cap displays, cart with groceries, store branding, clock, thank-you sign, gum rack, belt groceries and
  divider, scanner window, bagging area, floor mat.
- Clothes on simple bodies: fold lines, side seams with stitching, hem band; shirt collars, button plackets,
  a lace collar, pleats and a waist belt, a hood with drawstrings and a front pocket.

**Rule from now on:** no flat object ships. Every prop gets a contact shadow, shading on one side, a highlight,
and at least one texture or small secondary element (label, screws, stitching, wear).

## Step 9: hybrid test, 3D cartoon set + our 2D character (`3d/woodside.html`)

**Ask:** "the background should be in 3D and very detailed... take a real picture and recreate that exact thing,
but in cartoon style... the character should be our normal character... a lot of light... push it very far."

**Built:**
- A real reference: the Woodside Store interior (HABS photo, Library of Congress, public domain, reference only,
  see `assets/PROVENANCE.md`). The set copies its layout: long vertical-board counter, cast-iron coffee grinders,
  glass case, floor-to-ceiling shelving full of goods, pigeonholes, six-pane window, REWARD notices, churn,
  lantern, ceiling beams, bushel baskets of eggs and potatoes.
- Cartoon look in 3D: saturated palette, procedural board/label textures, ink outlines (inverted hull: a
  back-face copy of each mesh pushed out along its normals).
- Light pushed far: sun through the window with soft shadows, sky (hemisphere) light, warm fill and floor
  bounce, flickering lantern, an additive light shaft, floating dust, ACES tone mapping, bloom, warm grade
  and vignette.
- Our 2D clerk inside the 3D room: every frame Rig2D draws him (with the Light module) to an SVG, which
  becomes a canvas texture on a card standing behind the counter. The card faces the camera, is fogged like
  the set, and casts a real shadow (alpha-tested depth material).
- 10 s shot: slow push from a wide view of the store into the clerk; smug, then worried with a ledger tap,
  then a crazy grin. Render: `node tools/render.js 3d/woodside.html out/wsf --serve --mp4 out/woodside_test.mp4`
  (run from `rig2d/`, about 7 s per frame per worker on CPU).

**Feedback on v1:** "premium enough... looks clean, the kind of clean I want", but the light was too much, it felt
slow, and there was a lot of repetition.

**v2:**
- Light toned down: sun 5.5 → 3.0, fill and lantern roughly halved, bloom 0.4 → 0.16 (threshold 0.96), exposure 0.9,
  fainter light shaft and dust, matte ledger paper (it was blowing out).
- No repetition: 30 product words × 18 brands × 5 label layouts (panel, oval, band, diagonal sash, big initial),
  three ink colors, age spots; 11 kinds of goods (bottles in 4 shapes, tins of random size, boxes, box stacks,
  candy jars, crocks in 5 glazes and sizes, burlap sacks, plate stacks, cloth bolts in stripes or checks,
  pitchers); never the same kind twice in a row; two rows deep so the shelves read full.
- Fast pace: six shots in 10 s (fly-in, grinder insert, shelf whip, clerk, snap-zoom on the grin, punchline
  cut to the REWARD poster), each a short eased move with a small camera kick after the cut.
- Sound: whoosh on every cut, a ratchet under the grinder, ledger taps, a pop on the grin, a sting on the poster.

## Step 10: beat test (`3d/beat10.html`, `stories/beat10/`)

**Ask:** recreate 10 s of a Ricks video from the uploaded reference. We do not copy another channel's script,
characters or shots, so we measured the beats of their opening (RICKS_STUDY §9) and hit the same beats with our own
story (the ".99" opening), our owner and clerk, and our 3D store.

**Built:**
- New narration (Kokoro, 4 lines, 10.45 s, voice from frame 1) with word timings driving everything.
- Beats: insert on a "$1.00" price tag → continuous pull-back to the owner; face swaps on "losing", "money", "fix",
  "one cent" (a penny pops up); 4–5 frame dissolve with push-in to a hanging "EVERYTHING $1" sign whose price plate
  stamps in on "one dollar"; continuous crane down to the clerk; a dollar bill flies off the counter into his pocket
  on "slipped… pocket"; hard cut to the owner's shocked face on "But how?".
- One-word captions burned in by the post pass; bed 13 dB under the voice; an accent on every beat.
- Tooling: `post.js` accepts `grade: false` (3D pages grade themselves); `render.js` now waits for `window.READY`
  on module pages before reading DURATION/POST (async pages were read too early).

## Style rules (from the user)

- Fast paced, never slow: a new shot every 1–2 s, quick moves, sound on every cut.
- Clean and premium, light that looks real but never overdone.
- No visible repetition in a set: vary kind, size, label and color of everything.
- This look is the baseline, not the ceiling: keep raising detail in later videos.

## Next steps

- Package the system for sale.
