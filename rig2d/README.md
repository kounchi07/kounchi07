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
  and a fake head turn. Presets: `neutral happy laugh shock scared smug angry sad sleepy`.
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

## Files

| Path | What |
|---|---|
| `src/rig.js` | The engine (no dependencies) |
| `characters/scholar.js` | Example character built on the `biped` skeleton |
| `scenes/study.js` | Night study room background + lighting overlays |
| `src/props.js` | Detailed reusable props |
| `demo.html` | Animated demo (timeline of poses) |
| `walk_demo.html` | Story demo: walk in, turn to camera, talk, walk off |
| `tools/poses.html` | Pose test sheet |
| `tools/render.js` | Renders any page to PNG frames + MP4 |

## Render

```bash
node tools/render.js demo.html out/frames --mp4 out/demo.mp4     # full video, 30 fps
node tools/render.js demo.html out/stills --stills 0.5,2,4        # quick check frames
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
