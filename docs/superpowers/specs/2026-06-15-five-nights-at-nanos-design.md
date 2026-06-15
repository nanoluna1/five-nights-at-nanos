# Five Nights at Nano's — Design Spec

**Date:** 2026-06-15
**Status:** Approved (design); pending spec review before implementation planning.

An original single-location night-survival horror game. The player sits in one office,
manages limited power, watches security cameras, and survives 12 AM → 6 AM while four
original animatronics hunt them. Built from scratch with HTML/JavaScript + Three.js +
Web Audio. All assets original or procedurally generated — nothing scraped or copyrighted.

This is original IP. Title, character names, designs, art, menu, and sound are original.
The four animatronics are defined by the locked concept reference
(`five_nights_at_nanos_animatronic_concepts.svg`) and the UI by
(`five_nights_at_nanos_ui_layout_reference.svg`). Match those — do not drift toward any
existing character.

---

## 1. Locked decisions

| Decision | Choice |
|---|---|
| Delivery | One `index.html` using ES modules + an importmap for Three.js; run via a local one-liner (`python -m http.server`, fallback `npx serve`). No bundler, no build step. |
| Visual delegation | Heavy visual surface delegated to the Google Antigravity CLI (`agy`, Gemini 3.1 Pro High). I integrate, mark `// via Google Antigravity CLI`, and verify it runs. Fallback: author directly if agy output is unusable. |
| Difficulty target | Faithful-hard. Night 1 gentle, Nights 4–5 genuinely punishing. Defaults aim for real tension. |
| Build sequencing | Vertical slice first (Har end-to-end), then the other three, then polish, then the custom-night stretch. |
| Camera-feed rendering | Approach A: one world scene, many fixed cameras (see §4). |

### Ownership split
- **I own (logic):** game-state model, fixed-timestep tick, all AI, power/time/flashlight
  simulation, camera-toggle logic (enter/exit verified), the audio manager and every
  sound-event wiring, input, localStorage save/continue, config.
- **Delegated to agy (visuals):** the four animatronic models/materials/animation, the 3D
  environment look and lighting, camera-static and flashlight shaders, the original
  main-menu visual design, HUD layout per the reference, and screen transitions / juice.
  All integrated agy output is marked `// via Google Antigravity CLI`.

---

## 2. The four animatronics (match concept reference)

| Name | Design | Role | Tell (directional) | Curve |
|---|---|---|---|---|
| **Har** | Dusk-brown owl, amber glowing eyes, maroon bowtie, ear tufts | Center stage, leaves last, punishes low power | Low hum + heavy footstep (center) | Slow early → relentless late |
| **Gi** | Lanky teal-steel cat, tall pointed ears, slit green eyes, holds a keytar | Storms the **left** door | Fast clicking footsteps (panned left) | Early aggressor |
| **Cluck** | Gold-feathered rooster, red comb, grease-stained apron | Works the **right** door, mirror to Gi | Distant clucking moan (panned right) | Mid-night spike |
| **Arg** | Swamp-green pirate croc, eyepatch, hook, tattered cove curtain | Hides in the cove; sprints the hall if its cam is neglected | Escalating running footsteps (from cove) | Punishes camera neglect |

Models built original from these silhouettes/palettes, readable on a grainy camera feed.

---

## 3. Architecture: state model & fixed-timestep tick

A plain `GameState` object with **no Three.js references** — rendering reads it, never the
reverse. Logic advances on a **fixed-timestep accumulator** (logic at ~10 Hz) so AI and
power timing are frame-rate-independent; rendering runs at display FPS and only reads
state.

`GameState` fields:
- `phase` — `menu | nightStart | playing | powerout | gameover | win`
- `night` — 1..5 (+ custom)
- `clockMinutes` — game time, 12 AM → 6 AM
- `power` — 0..100 (%)
- `usageLoad` — integer count of active drains (drives the 4-bar usage indicator)
- `animatronics` — per creature `{ room, difficulty, moveTimer, state }`
  - Arg additionally has an `emergence` meter (see §6)
- `doors` — `{ L: bool, R: bool }`
- `lights` — `{ L: bool, R: bool }`
- `flashlight` — `{ on: bool, charge: 0..100 }`
- `monitorUp` — bool
- `activeCam` — camera id when monitor is up

**Module layout** (separate ES modules under one project, no build step):
`config.js` · `state.js` · `clock.js` · `ai.js` · `audio.js` · `render/scene.js` ·
`render/postfx.js` · `render/cameras.js` · `input.js` · `save.js` · `ui/hud.js` ·
`ui/menu.js` · `main.js`. `index.html` hosts the importmap and mounts `main.js`.

---

## 4. Rendering (delegated to agy, I wire it)

**Approach A — one world, many fixed cameras.** A single Three.js scene contains the
office plus all rooms laid out in 3D space. Each camera is a `PerspectiveCamera` parked in
its room. The office view renders the office camera (pannable look). Raising the monitor
renders the **selected** room's camera; the static/scanline post-pass composites over that
render. Animatronics are real meshes that move room-to-room along a node graph, so flipping
to a cam shows them genuinely present. "Creature changed rooms" is a single node change —
the source of truth for the static burst.

Cameras and rooms per the UI reference:
`CAM 1A stage · 1B dining · 2 hall L · 4 hall R · 3 closet · 5 backstage · 6 kitchen · 7 cove`,
plus the office marker. Includes a limited / blind-spot camera as is standard for the genre.

Atmosphere & juice (agy):
- Dark office with motivated light pools, a flickering bulb, subtle fog / volumetric light,
  fan casting moving shadows.
- Animatronic materials: grime, wear, dull metallic sheen — not flat plastic.
- Camera feed: scanlines, grain, chromatic edge; a distortion burst triggered by the
  **state event** "creature changed rooms," not a timer.
- Flashlight: a real spotlight cone with falloff + dust motes that reveals threats.
- Jumpscare: screen shake + hard cut. Monitor raise/lower transform. Button-press feedback.
- Power-warning escalation tied to power thresholds: lights dim, UI flickers as power drops.

---

## 5. Audio manager (I own — all Web Audio synthesis, no files)

A small manager exposing:
- `playOneShot(name, opts)` — named one-shots.
- `startLoop(name, {gain})` / `stopLoop` / `crossfadeLoop(a, b, ms)` — looping beds with
  crossfade.
- Per-channel gain buses: `ambient`, `tells`, `sfx`, `stinger`, `music`, under a master
  gain with `mute()`.

Everything synthesized:
- **Ambient bed:** continuous low room tone, ceiling-fan whir, faint electrical buzz,
  occasional distant metallic clanks. Looping but non-repetitive via randomized clank
  timing and slow LFO drift.
- **Directional tells** via `StereoPannerNode`: Gi fast clicks panned left, Cluck moan
  panned right, Har low hum center, Arg running footsteps ramping in level/rate. Pan and
  volume hint which side a threat is on.
- **Interaction SFX:** door slam (heavy, with a tail), door open, light click + electrical
  buzz, monitor raise/lower whirr, camera switch blip, static crackle on feed change.
- **Tension & state cues:** rising drone as a creature nears the office; soft warning sting
  when power is low; a distinct power-out **sequence** (everything dies → silence → slow
  music-box cue → final scare) implemented as a state-driven chain, not a timer; jumpscare
  sting (loud, dissonant) on game over; calm 6 AM chime + cheering/bell win cue.

Mix discipline: ambience sits under cues; the jumpscare is the loudest thing. **Every cue
is bound to a game event**, wired in one central place so triggers are auditable and a cue
fires on a state change wherever a state event is more correct than a timer.

---

## 6. AI (I own) — per-creature, difficulty-gated

Shared engine: on each AI tick, a creature rolls against its per-night `difficulty`
(0–20-style scale). Success = advance one node toward the office along that creature's path.
Distinct archetypes:

- **Har** — starts center stage, slow→relentless curve, leaves last; aggression and/or
  power drain increases when `power` is low (punishes low power).
- **Gi** — left-door rusher, early aggressor, fast move rolls. Reaches the left door → must
  be door-shut within a short window or it enters → scare.
- **Cluck** — right-door mirror to Gi, with a mid-night difficulty spike.
- **Arg** — cove sprinter. A hidden `emergence` meter ticks **up while CAM 7 (cove) is NOT
  being watched**, and slows/resets while watched. At threshold it sprints the hall — must
  be doored fast or scare. Punishes camera neglect.

All difficulty values, drain rates, and audio-trigger thresholds live in `config.js`,
per-night, with comments explaining the *why* of each non-obvious number.

---

## 7. Mechanics wiring

- **Power:** doors, lights, and flashlight each register a drain in `usageLoad`. `power`
  drains per logic tick at `base + usageLoad * perUnit`. The 4-bar usage indicator reflects
  `usageLoad`. **0 power → forced shutdown → power-out sequence → Har scare.**
- **Doors / lights:** left/right doors and lights are toggles; each costs power while
  active. Lights briefly reveal a creature at the adjacent door.
- **Flashlight:** its own `charge` drain, separate from main power; real light cone reveals
  threats in hall/office.
- **Camera monitor toggle (special care, per requirement):** a single `setMonitor(up)`
  function is the **only** path that mutates `monitorUp`. Explicit guards make enter and
  exit symmetric — cannot get stuck up, cannot double-open. Heavily commented so the exit
  path can't silently regress. While up: office pan disabled; cam switching enabled with the
  static-on-switch blip; doors/lights remain actionable per genre rules. Lowering returns
  cleanly to the office camera. Enter/exit is manually verified each build.
- **Static-on-movement:** the feed distorts when a creature changes rooms (state event).

---

## 8. Flow, nights, and save

Main menu (dark, static-flecked, stacked "Five Nights at Nano's" title; **New game /
Continue / Night select**) → night-start card → play 12 AM→6 AM → **win** chime or
**jumpscare → game over → menu**.

- **localStorage** stores highest night unlocked and last night played, for **Continue**.
- **Night select** unlocks completed nights.
- Nights 1–5 escalate via per-night config (faithful-hard curve).
- **Custom-night selector is a stretch goal** — scaffolded but gated behind Slice 4.

---

## 9. Tunable config (sketch — exact numbers tuned in implementation)

All gameplay constants are top-level in `config.js`, never buried magic numbers. Indicative
shape and rationale:

```js
export const CONFIG = {
  clock: { nightSeconds: 360 },   // 6 real minutes per night (60s/in-game hour) — genre-standard pacing
  power: {
    drainBasePerSec: 0.25,        // idle drain so doing nothing still loses slowly
    drainPerUnitPerSec: 0.30,     // each active door/light/cam adds this — 4 drains ≈ classic burn rate
  },
  flashlight: { drainPerSec: 4.0, rechargePerSec: 0 }, // separate budget; punishes holding it on
  ai: {
    tickHz: 10,                   // logic rate; AI rolls map to this cadence
    // per-night difficulty (0-20). Har slow->relentless; Gi early; Cluck mid spike; Arg neglect-driven.
    difficulty: {
      1: { har: 0,  gi: 2,  cluck: 0, arg: 2 },
      2: { har: 2,  gi: 4,  cluck: 3, arg: 4 },
      3: { har: 4,  gi: 6,  cluck: 8, arg: 6 },   // Cluck mid-night spike
      4: { har: 8,  gi: 9,  cluck: 9, arg: 9 },
      5: { har: 14, gi: 12, cluck: 12, arg: 12 }, // relentless
    },
    harLowPowerBoost: 6,          // added to Har's effective difficulty when power < threshold
    doorWindowSec: 1.5,           // grace to shut a door once a rusher arrives
    argEmergenceUnwatchedPerSec: 3.0, // cove meter fill while CAM 7 unwatched
  },
  audio: {
    droneAdjacencyOnly: true,     // rising drone only when a creature is at an office-adjacent node
    lowPowerWarnAt: 25,           // % power that triggers the warning sting + UI flicker
  },
};
```

---

## 10. Build phasing

- **Slice 1 (first reviewable drop):** menu + office + camera toggle (verified enter/exit) +
  power + ambient bed + **Har fully working** including tells & jumpscare.
- **Slice 2:** Gi, Cluck, Arg + their directional audio tells and scares.
- **Slice 3:** full post-FX polish, Nights 2–5 tuning, save/continue, win flow.
- **Slice 4 (stretch):** custom-night selector.

---

## 11. Output constraints

Paste-ready browser code (HTML/JS + Three.js + Web Audio), runnable via the local-server
one-liner with no further setup. No TODOs, no unfinished logic, no copyrighted or scraped
assets — original title, names, art, creature designs, and sound only. Comments explain the
*why* on non-obvious tuning (AI timing, power/flashlight drain, audio thresholds, static
triggers) and on the camera-toggle logic so the exit can't silently regress. Integrated agy
front-end output marked `// via Google Antigravity CLI`.
