# TOPPLE — a push-your-luck physics roguelite (Three.js, browser-first)

## 1. What the research says makes a game hard to put down

| Brain / psychology mechanism | What it means | How TOPPLE uses it |
|---|---|---|
| **Reward prediction error** (Schultz): dopamine fires on rewards that are *better than expected*, not on predictable ones | Uncertain rewards motivate more than fixed ones | Hidden loot inside every block; rare "jackpot" blocks |
| **Variable-ratio reinforcement** | Rewards at unpredictable intervals produce the most persistent behaviour (the slot-machine schedule) | Loot is random, but the *decision* to keep going is the player's |
| **Near-miss effect**: near-misses activate the ventral striatum and raise the urge to try again | "Almost" feels like progress | Real physics wobble — near-misses are **genuine, caused by skill**, never faked |
| **Self-Determination Theory**: competence + autonomy predict enjoyment *and* return play; relatedness predicts community play | Players stay when they feel skilled, in control, and connected | Skill-based block pulling, meaningful build choices, daily shared seed |
| **Flow / short sessions** | Balatro (30-60 min runs) and Vampire Survivors (instant success, deep builds) show "one more go" comes from short runs + build discovery | 3-6 minute runs, new relic every few floors |
| **Push-your-luck** (Dragon Tower's core) | "Cash out now or climb?" is a compelling decision | Bank your loot or keep pulling from an increasingly unstable tower |

**The line we will not cross:** no real money, no loot boxes, no fake near-misses,
no hidden spend, no dark-pattern streak punishment. Regulators ban these in gambling
and app stores punish them; the durable version is *compelling because it is fair*.

## 2. Market fit (2026)

- Puzzle is the largest casual genre (~$4.9B IAP in H1 2026, >44% of casual);
  hybrid-casual IAP grew ~23% while mid-core fell. → simple controls, deep meta.
- Browser gaming is having a renaissance: Poki reaches ~100M monthly players,
  revenue growing ~50%/yr; web games earn mainly from ads with platform rev-share.
  → a Three.js game can launch on Poki/CrazyGames with zero install friction.
- Breakout indies (Balatro, Vampire Survivors) won with *one familiar mechanic
  twisted + roguelite build discovery*. Nobody has combined
  **Jenga physics × push-your-luck × roguelite relics** yet.

## 3. The game

**Pitch:** A glowing 3D tower of blocks floats in the void. Each block hides loot.
Pull blocks out (skill, physics) to collect it. The more you take, the more the tower
sways. Bank your haul at any time — or keep pulling for the jackpot. If it topples,
you lose everything unbanked.

### Core loop (~5 seconds)
1. Rotate camera, pick a block, drag it out (physics: friction, mass, wobble).
2. Block cracks open → loot revealed (coins, multipliers, rare gems).
3. Decide: **BANK** (lock in, tower resets taller & richer) or **PULL** again.

### Run loop (3-6 minutes)
- Each "floor cleared" offers a choice of 1 of 3 **relics** (Balatro-joker style), e.g.
  - *Glass Heart* — glass blocks pay x3 but crack if touched twice
  - *Magnet Spine* — tower steadies for 3s after a bank
  - *Greedy Gravity* — no wobble meter shown, all loot x2
  - *Echo* — the last block you pulled reappears on top
- Score target rises each floor; miss it and the run ends.

### Meta loop (days / weeks)
- Unlock new relics, tower materials (ice, rubber, stone) and physics rules.
- **Daily Tower:** same seed for everyone, one attempt, shareable emoji result
  (Wordle-style) → relatedness + free viral distribution.
- Cosmetic skins for blocks/towers (only monetization besides ads).

### Why it is new
- The tension of Dragon Tower, but **outcomes come from your hands** (competence),
  not a hidden RNG — a fair near-miss.
- Every relic changes the *physics*, not just numbers → emergent, streamable moments
  (towers collapsing in slow motion are great clips).

## 4. Tech plan (Three.js)

| Piece | Choice |
|---|---|
| Rendering | Three.js, instanced meshes, bloom post-processing, glass/emissive materials |
| Physics | Rapier (WASM) or cannon-es, deterministic seeded RNG for daily tower |
| Input | Raycast pick + drag constraint; mobile touch first |
| Juice | Screen shake, slow-mo on collapse, particle loot burst, layered audio |
| Size | < 5 MB initial load for Poki/CrazyGames requirements |
| Backend (later) | Daily seed + leaderboard (serverless) |

### Milestones
1. **Prototype (1-2 weeks):** one tower, pull + wobble + bank, loot reveal. Playtest "one more go".
2. **Vertical slice (3-4 weeks):** 15 relics, run structure, juice, mobile controls.
3. **Launch on Poki/CrazyGames**, measure D1/D7 retention and session length.
4. Daily Tower + leaderboards; Steam/mobile wrapper if retention is strong.

### Success metrics
D1 retention > 35%, average session > 8 min, > 3 runs per session.
