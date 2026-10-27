# Rig2D

A 2D skeleton rig engine for detailed cartoon characters, rendered as SVG and
exported to MP4 at 30 fps. It works like a 2D Blender / Grease Pencil rig: every body
part hangs off a bone, so moving a bone moves everything attached to it.

## What it does

- **Skeleton:** a bone hierarchy with rotation, offset and squash & stretch on every bone.
- **IK (inverse kinematics):** place a hand or foot at a point and the elbow/knee solves itself.
  Feet can lock flat to the floor. IK and manual (FK) posing blend with `weight`.
- **Blob heads:** organic, never-perfect head shapes (seeded, so the same character always
  has the same head). Hair and shading hug the exact outline.
- **Bendy tubes:** sleeves, legs and torsos follow the bones, and details drawn on them
  (collars, sashes, patterns, folds) bend with the body.
- **Face rig:** look direction, blinks, eye size (dot → ring eyes), upper lids, each brow's
  raise/angle, mouth open/smile/width/shape (`o`, `grit`), teeth, blush, sweat, anger mark,
  and a fake head turn. Ricks Clips-style options: oval eyes without shine (`eyeShape: 'oval'`, `eyeShine: 0`),
  the smug lid bar (`lidBar`), a wavy worried mouth and a dark block-tooth grin (`mouthShape: 'wavy' | 'grin'`),
  several sweat drops (`sweatDrops`). Presets: `neutral happy laugh shock scared smug angry sad sleepy` and
  `smugBar grin worried nervous panic crazy` (see `tools/face_sheet.html`).
- **Timeline:** keyframes with easing (`inOut out in back elastic linear step`). Anything in a
  pose can be animated. Use `step` for snappy expression swaps.
- **Alive layer:** automatic breathing, random blinks and slight head sway.
- **Side view + walk cycle:** `bipedSide` skeleton (near/far limbs layered and shaded) and
  `Rig2D.walk(t)`, a classic contact → down → passing → up walk: 30-frame cycle at 30 fps,
  feet planted from heel strike to toe-off, heel roll, hip bob, arms swinging opposite the legs
  with a 2-frame lag. `Rig2D.Actor` switches between front and side views, and `facing: -1`
  mirrors the side view to walk left. The face rig drops into profile as `turn` approaches ±1.
- **Props library** (`src/props.js`): detailed books, vases, candle, lantern, table, chest,
  tea set, scrolls, plants and wood grain, all in the same ink style and lighting.

## Making any character (Kit)

`src/kit.js` builds a full character (front + side view, all parts) from a description. Two body styles:
the detailed outfits (robe, tunic, armor) and `style: 'simple'`, the Ricks Clips look (pill torso, stick limbs,
ball hands, L feet, with `outfit.tie`, `pocket`, `pen`, `badge` marks; see `tools/body_sheet.html`):

```js
const Thief = Kit.character({
  name: 'thief',
  body:   { thigh: 118, shin: 112, chest: 112 },               // proportions (biped dims)
  skin:   '#efd7b8',
  head:   { rx: 140, ry: 132, wobble: 0.13, seed: 21 },          // blob head; change seed for a new shape
  hair:   { style: 'hood', color: '#26232e' },                   // bun | short | bald | hood | long | kidbuns | topknot
  outfit: { type: 'tunic', color: '#34313f', pattern: 'none', sash: '#8a2f2a' },  // robe | tunic | armor; diamond | dots | none
  pants:  '#24212c', shoes: { color: '#121016' },
  hat:    { style: 'none' },                                      // lunjin | helmet | band
  face:   { mustache: true, mustacheColor: '#8a5a2a', mustacheScale: 1, beard: 'goatee' },   // beard: goatee | long
  props:  [{ name: 'sack', bone: 'handR', visible: c => c.props.sack, draw: ctx => '<svg...>' }],
});
const actor = new Rig2D.Actor(Thief, { id: 'thief' });
```

`characters/cast.js` has a thief, a monk and a girl, all built this way. The scholar is the
kit defaults plus a brush prop.

## Camera

`src/camera.js`: keyframed moves (`Camera.track`), parallax by layer depth (`Camera.transform(c, depth, origin)`),
handheld drift, decaying impact shake, and whip-pan transitions. Scenes are split into layers
(sky 0.15 → far 0.4 → set 0.8 → action 1.0 → foreground 1.35), so pans and push-ins have real depth;
far layers can be blurred for depth of field.

## Look (polish pass)

`src/look.js` is the finishing pass every story should use:
- `Look.defs()` adds the `look` filter: lifted (never crushed) blacks, a gentle S-curve, a saturation
  adjustment and bloom on bright areas. Wrap the picture (not the captions) in `<g filter="url(#look)">`.
- `Look.soften(svg)` gives background art thinner, tinted outlines so bold-ink characters pop.
- `Look.glow`, `Look.rays`, `Look.haze`, `Look.pool`, `Look.contact`: light sources, sun rays, atmosphere,
  light on the ground, soft contact shadows.
- Light vignette (`look-vign`) and film grain (`look-grain`); no dark letterbox bars.

Target numbers (measured from a polished reference short): mean luma ≈ 0.45–0.5, 5th-percentile luma
≈ 0.15–0.18 (soft shadows), saturation ≈ 0.40–0.45, under ~8% of pixels near black.

## Scene lighting (Light)

`src/light.js` makes any character match the light of the set it stands in (the Ricks Clips look:
the same white face turns lavender at night and warm cream by a fire). Swap `actor.render(o)` for:

```js
const LIT = Light.preset('golden', { source: { x: 1650, y: 1050 }, back: true });  // the set's sun
svg += Light.render(actor, { x, y, scale, t, light: LIT });
```

Light is directional, like real light falling on someone: the side of the face toward the source reflects
the light's color and glows at the edge, a soft shine and a rim sit on the lit side, and the far side falls into
shadow. It needs nothing from the character file:

| Layer | What it does |
|---|---|
| Key | Lit side reflects the light's color (+ edge glow), fading across the face; clothes and hands too, per part |
| Shine, rim | Soft bright spot and bright edge on the lit side |
| Shadow | Far side falls into the scene's shadow color |
| Ambient | Faint cast of surrounding light (moonlight at night; 0 in daylight); clothes dim at night (`bodyDim`) |
| Pattern | Optional set light on the skin (`pattern: { svg: Light.blinds(...), blend: 'screen' }`) |
| Cast shadow | On the ground, away from the light (toward the camera when `back: true`) |

Every part lights itself from its own outline: heads, sleeves, legs, torsos, and shapes that declare a
`lightShape` (hands, props). `affect: 'skin'` lights only the face.

Presets: `day`, `golden`, `overcast`, `interior`, `night`, `candle`, `forge`. Override any field
(`color`, `key`, `spec`, `rim`, `rimOp`, `rimWidth`, `shade`, `shadeOp`, `amb`, `ambTint`, `dir`, `source`,
`back`, `shadow`, `shadowLen`, `affect`, `bodyDim`). `dir` is where the light comes from in screen degrees
(0 = right, 180 = left, -90 = above); `source` is a point in the scene (candle, window, sun) and each
character works out its own direction from it. Test sheets: `tools/light_test.html`, `tools/light_face.html`.

## Voice, sound effects, mixing

| Tool | What it does |
|---|---|
| `tools/tts.py lines.json out/` | Kokoro-82M voiceover: one WAV per line + `timing.json` (word times for captions, 30 fps mouth envelope for lip sync) |
| `tools/sfx.py out/ cinematic` | Instruments and textures for drama: taiko drums, guqin melody (plucked-string synthesis), wind, gate creak, impact, string drone |
| `tools/sfx.py out/` | Synthesized SFX: boom, whoosh, zip, pop, ding, boing, scratch, sting, sneaky pizzicato, crickets, drone, thud |
| `tools/mix.py cues.js out.wav` | Mixes voice + SFX from the same cue sheet the animation reads |

Kokoro setup (offline-friendly): `pip install kokoro-onnx soundfile`, weights from the npm package
`kokoro-q8-shards` (joined into `model_quantized.onnx`, sha256 `fbae9257…a1478`), voices from the npm
package `kokoro-js`. Voices used: `am_michael` (narrator), `am_puck`, `bm_george`.

## Story workflow

See `stories/library/`:
1. `lines.json`: the script (who says what, which voice)
2. `python3 tools/tts.py stories/library/lines.json stories/library/audio`
3. `build.py`: line start times + sound cues → `cues.js` (one timeline for picture and sound)
4. `index.html`: the shots (camera, characters, poses, props, captions)
5. Render + mix + mux:
   ```bash
   node tools/render.js stories/library/index.html out/frames --mp4 out/video.mp4
   python3 tools/mix.py stories/library/cues.js out/audio.wav
   ffmpeg -i out/video.mp4 -i out/audio.wav -c:v copy -c:a aac -b:a 192k -af loudnorm=I=-14:TP=-1 -shortest out/final.mp4
   ```

## Files

| Path | What |
|---|---|
| `src/rig.js` | The engine (no dependencies) |
| `characters/scholar.js` | Example character built on the `biped` skeleton |
| `scenes/study.js` | Night study room background + lighting overlays |
| `src/props.js` | Detailed reusable props |
| `src/kit.js` | Character kit: any character from a description |
| `characters/cast.js` | Thief, monk, girl (kit characters) |
| `stories/library/` | Brainrot short: script, voice, cues, shots |
| `src/camera.js` | Camera moves, parallax, shake, whip pans |
| `src/look.js` | Polish pass: grade, bloom, soft lines, glows, rays, haze, grain |
| `src/light.js` | Scene lighting on characters: tint, shading, rim, projected patterns, cast shadows |
| `tools/light_test.html` | Every light preset on the same character, unlit vs lit |
| `tools/light_face.html` | Face close-ups per light preset |
| `tools/face_sheet.html` | Every expression on a Rick-style face (`?lit=night` adds light) |
| `tools/body_sheet.html` | The simple body style in poses, walk, side view, night and forge light |
| `scenes/city.js` | Xicheng: city wall + gate tower, street, wall top (layered) |
| `characters/threekingdoms.js` | Zhuge Liang, Sima Yi, page boys, soldiers, sweepers |
| `stories/emptycity/` | "The Empty City" legend short (45 s) |
| `demo.html` | Animated demo (timeline of poses) |
| `walk_demo.html` | Story demo: walk in, turn to camera, talk, walk off |
| `tools/poses.html` | Pose test sheet |
| `tools/render.js` | Renders any page to frames + MP4 (fast mode, workers, audio mux) |
| `tools/post.js` | ffmpeg post pass: grade, bloom, vignette, grain, ASS captions, fades |

## Render

Fast mode (default for `--mp4` when the page defines `window.POST`, see `tools/post.js`): the page skips
its full-frame grade, bloom, vignette, grain, captions and fades, and ffmpeg applies them in one pass.
About 6x faster than drawing them in the browser. `--audio` muxes the mix, `--range a,b` renders a slice,
`--exact` uses the old in-browser path, and frames on disk are reused (re-encodes take about a minute).

```bash
node tools/render.js stories/emptycity/index.html out/ec --mp4 out/ec.mp4 --audio out/mix.wav   # ~4.5 min on 4 cores
node tools/render.js demo.html out/frames --mp4 out/demo.mp4     # full video, 30 fps
node tools/render.js demo.html out/stills --stills 0.5,2,4        # quick check frames
node tools/render.js "stories/emptycity/index.html?nolight" out/off --stills 8   # page options via ?query
```

Needs Node, Playwright (Chromium) and ffmpeg.

## Posing

A pose is plain data:

```js
hero.pose({
  bones: { hips: { y: 40 }, chest: { rot: -6 }, head: { sx: 1.1, sy: 0.92 } },
  ik: {
    legL: { x: -32, y: -14 }, legR: { x: 32, y: -14 },   // feet planted (root space)
    armR: { x: 250, y: -540, weight: 1 },                 // hand goes here
  },
  face: Object.assign({}, Rig2D.EXPRESSIONS.shock, { lookX: -1, turn: -0.4 }),
  props: { brush: true },
  z: { sleeveR: 21 },          // draw-order override
});
svg.innerHTML = hero.render({ x: 540, y: 1790, scale: 1.3 });
```

Conventions:
- Angles are degrees, clockwise (screen y points down).
- Bone `sx` stretches **along** the bone, `sy` **across** it.
  For the upright head, `sx > 1` is taller and `sy > 1` is wider.
- Bone names use **screen** sides: `armL` is on the left of the screen.
- IK targets are relative to the `root` bone (between the feet) unless `space: 'world'`.

## Walking

```js
const hero = new Rig2D.Actor(Scholar.spec, { id: 'hero' });
const w = Rig2D.walk(t, { stride: 200, cycle: 1.0 });   // + bob, lift, armSwing, lean, mood
hero.pose(Object.assign(Rig2D.alive(w, t), { view: 'side', facing: 1 }));
// w.speed = stride / cycle (root units per second); move the character by speed * scale
```

Use `Rig2D.blend(stand, walkPose, k)` to ease into and out of a walk.

## Timeline

```js
const tl = new Rig2D.Timeline([
  { t: 0,   pose: idle },
  { t: 1.5, pose: { ik: { armR: { x: 250, y: -540, weight: 1 } } }, ease: 'out' },
  { t: 3.3, pose: { face: Rig2D.EXPRESSIONS.shock }, ease: 'step' },
]);
hero.pose(Rig2D.alive(tl.at(t), t));
```

Each value interpolates between the nearest keys that set it. To keep a value still
between two moves, add a key that holds it.

## Making a new character

1. Start from a skeleton: `Rig2D.biped({ thigh, shin, spine, chest, upperArm, ... })`.
   Change proportions for tall, short, chubby or kid characters.
2. Add parts:
   - `tube`: a bendy limb or body through a bone chain (`widths`, `extendStart`, `detail`, `over`)
   - `shape`: rigid art on one bone (hands, shoes, props, hats)
   - `head`: a blob head with `{ rx, ry, wobble, seed, jaw, crown }`, plus `back`/`hair`/`front`
     hooks and an optional `face` layout override (eye spacing, mouth position, ...)
3. Use the same ink color and line weights as the background so characters and scenes
   look like one drawing.
