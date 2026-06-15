# Five Nights at Nano's — Slice 1: Har Vertical Slice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a runnable, end-to-end horror loop — main menu → office → working camera monitor (verified enter/exit) → power drain → ambient audio bed → Har hunting you with his audio tell and a jumpscare → game over / 6 AM win — as the foundation the other three animatronics bolt onto.

**Architecture:** Pure game logic (state, fixed-timestep tick, power, camera toggle, AI, save) lives in framework-free ES modules tested under Node's built-in test runner. A thin render facade (`render/world.js`) and DOM overlay (`ui/overlay.js`) — both visually authored via the Google Antigravity CLI — expose a small method contract the logic drives; they never feed state back. A single `main.js` runs the fixed-timestep loop, reads state, and calls render/audio.

**Tech Stack:** HTML + ES modules, Three.js (via CDN importmap, no bundler), Web Audio API (all sound synthesized), `node --test` for logic tests. Served locally with `python -m http.server`.

**Spec:** `docs/superpowers/specs/2026-06-15-five-nights-at-nanos-design.md`

**Conventions for every task below:**
- Logic modules import **nothing** from Three.js, so they run under `node --test`.
- Test files live at `tests/<name>.test.js` and import from `../src/<name>.js`.
- Commits are per-task (after its final step). Branch first: `git init` if needed, then work on `slice1`.
- agy command form (per global instructions): `agy --model "Gemini 3.1 Pro (High)" -p "<prompt>"`. Integrated agy output is marked `// via Google Antigravity CLI`.

---

## File structure (locked before tasks)

```
index.html                 # importmap + mounts main.js
package.json               # { "type": "module" } — lets node + browser treat .js as ESM
src/
  config.js                # all tunable constants (CONFIG)
  util/rng.js              # seedable RNG (deterministic AI tests)
  state.js                 # createGameState() + pure helpers
  clock.js                 # fixed-timestep accumulator + 12AM->6AM game clock
  power.js                 # usageLoad accounting + power drain + shutdown flag
  monitor.js               # setMonitor()/switchCam() — the verified camera-toggle logic
  ai.js                    # shared roll engine + Har archetype
  save.js                  # localStorage save/continue (injectable storage)
  audio.js                 # Web Audio manager + Slice-1 cues (I own)
  render/world.js          # 3D scene facade (agy-authored internals)
  ui/overlay.js            # DOM menu + HUD overlay (agy-authored markup/CSS)
  hudfmt.js                # pure formatters for HUD (clock string, power %)
  main.js                  # wires loop + input + state -> render/audio
tests/
  rng.test.js  state.test.js  clock.test.js  power.test.js
  monitor.test.js  ai.test.js  save.test.js  hudfmt.test.js
```

**Interface contract — `render/world.js`** (agy fills internals; logic depends only on these):
`createWorld(THREE, mountEl)` → `world` with:
`world.render(state, dt)`, `world.setOfficeView()`, `world.setCamView(camId)`,
`world.setAnimatronicRoom(name, roomId)`, `world.setDoor(side, closed)`,
`world.setLight(side, on)`, `world.setFlashlight(on)`, `world.staticBurst()`,
`world.shake(intensity)`, `world.playJumpscare(name)` → Promise, `world.dimForPower(level)`.

**Interface contract — `ui/overlay.js`:**
`createOverlay(rootEl, handlers)` → `overlay` with:
`overlay.showMenu(saveInfo)`, `overlay.showNightCard(night)`, `overlay.showPlaying()`,
`overlay.showGameOver()`, `overlay.showWin()`,
`overlay.updateHUD({powerPct, usageLoad, clockText, night, flashlightPct, camLabel})`.
`handlers` = `{ onNewGame, onContinue, onNightSelect(night) }`.

---

## Task 1: Project skeleton that loads Three.js and renders

**Files:**
- Create: `package.json`, `index.html`, `src/main.js`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "five-nights-at-nanos",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Create `index.html` with importmap**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Five Nights at Nano's</title>
  <style>
    html, body { margin: 0; height: 100%; background: #000; overflow: hidden; }
    #app { position: fixed; inset: 0; }
  </style>
  <script type="importmap">
  { "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js" } }
  </script>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./src/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create minimal `src/main.js` that proves Three.js loads**

```js
import * as THREE from 'three';

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a); // near-black; confirms render pipeline is live
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 5;
renderer.render(scene, camera);
```

- [ ] **Step 4: Run it and verify**

Run: `python -m http.server 8000` (fallback `npx serve`), open `http://localhost:8000`.
Expected: a dark near-black canvas fills the window, **no console errors** (Three.js resolved from the importmap).

- [ ] **Step 5: Commit**

```bash
git add package.json index.html src/main.js
git commit -m "chore: project skeleton loads three.js via importmap"
```

---

## Task 2: Tunable config

**Files:**
- Create: `src/config.js`

- [ ] **Step 1: Create `src/config.js`** (values are the faithful-hard starting point from the spec; `// why` comments required)

```js
export const CONFIG = {
  clock: {
    nightSeconds: 360,        // 6 real minutes/night = 60s per in-game hour; genre-standard pacing
  },
  power: {
    drainBasePerSec: 0.25,    // idle drain: doing nothing still slowly loses, forcing eventual action
    drainPerUnitPerSec: 0.30, // each active door/light/cam; ~4 simultaneous drains ≈ classic burn rate
  },
  flashlight: {
    drainPerSec: 4.0,         // separate budget from main power; punishes holding the beam on
  },
  ai: {
    tickHz: 10,               // logic ticks/sec; AI move-rolls happen on this cadence
    moveRollEverySec: 5,      // a creature attempts to advance every 5s (rolls vs difficulty)
    difficulty: {             // per-night, 0-20. Slice 1 only reads `har`.
      1: { har: 0,  gi: 2,  cluck: 0, arg: 2 },
      2: { har: 2,  gi: 4,  cluck: 3, arg: 4 },
      3: { har: 4,  gi: 6,  cluck: 8, arg: 6 },   // Cluck mid-night spike (Slice 2)
      4: { har: 8,  gi: 9,  cluck: 9, arg: 9 },
      5: { har: 14, gi: 12, cluck: 12, arg: 12 }, // relentless
    },
    harLowPowerBoost: 6,      // added to Har's effective difficulty while power < lowPowerThreshold
    harLowPowerThreshold: 30, // % power below which Har gets more aggressive (punishes low power)
  },
  audio: {
    lowPowerWarnAt: 25,       // % power that triggers the warning sting + UI flicker
  },
  rooms: {
    // Har's path from stage to the office; index = how close. Slice-1 single path.
    harPath: ['CAM1A', 'CAM1B', 'CAM3', 'OFFICE'],
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/config.js
git commit -m "feat: tunable config with faithful-hard defaults"
```

---

## Task 3: Seedable RNG (deterministic AI tests)

**Files:**
- Create: `src/util/rng.js`
- Test: `tests/rng.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/util/rng.js';

test('same seed produces same sequence', () => {
  const a = makeRng(42), b = makeRng(42);
  assert.equal(a(), b());
  assert.equal(a(), b());
});

test('values are in [0,1)', () => {
  const r = makeRng(1);
  for (let i = 0; i < 100; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/rng.test.js`
Expected: FAIL — cannot find module `../src/util/rng.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// mulberry32: tiny deterministic PRNG so AI rolls are reproducible in tests
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/rng.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/util/rng.js tests/rng.test.js
git commit -m "feat: seedable rng for deterministic ai"
```

---

## Task 4: Game state factory

**Files:**
- Create: `src/state.js`
- Test: `tests/state.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../src/state.js';

test('new state for night 1 has full power and is at 12 AM', () => {
  const s = createGameState(1);
  assert.equal(s.phase, 'nightStart');
  assert.equal(s.night, 1);
  assert.equal(s.power, 100);
  assert.equal(s.usageLoad, 0);
  assert.equal(s.clockMinutes, 0); // 0 = 12 AM
  assert.deepEqual(s.doors, { L: false, R: false });
  assert.deepEqual(s.lights, { L: false, R: false });
  assert.equal(s.flashlight.on, false);
  assert.equal(s.flashlight.charge, 100);
  assert.equal(s.monitorUp, false);
  assert.equal(s.activeCam, 'CAM1A');
});

test('har starts on stage at full path index 0', () => {
  const s = createGameState(1);
  assert.equal(s.animatronics.har.room, 'CAM1A');
  assert.equal(s.animatronics.har.pathIndex, 0);
  assert.equal(s.animatronics.har.difficulty, 0); // night 1 har difficulty
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/state.test.js`
Expected: FAIL — cannot find module `../src/state.js`.

- [ ] **Step 3: Write minimal implementation**

```js
import { CONFIG } from './config.js';

export function createGameState(night) {
  const diff = CONFIG.ai.difficulty[night];
  return {
    phase: 'nightStart',
    night,
    clockMinutes: 0,          // 0 = 12 AM; 360 logical units span the night (1/sec)
    power: 100,
    usageLoad: 0,
    flashlight: { on: false, charge: 100 },
    doors: { L: false, R: false },
    lights: { L: false, R: false },
    monitorUp: false,
    activeCam: 'CAM1A',
    pendingScare: null,        // name of animatronic that has triggered a scare, or null
    animatronics: {
      har: { room: 'CAM1A', pathIndex: 0, difficulty: diff.har, moveTimer: 0, atDoor: null },
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/state.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/state.js tests/state.test.js
git commit -m "feat: game state factory"
```

---

## Task 5: Fixed-timestep clock + game time

**Files:**
- Create: `src/clock.js`
- Test: `tests/clock.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeAccumulator, advanceClock, clockHour } from '../src/clock.js';

test('accumulator yields whole ticks and keeps remainder', () => {
  const acc = makeAccumulator(10); // 10 Hz -> 0.1s per tick
  assert.equal(acc.feed(0.25), 2); // 0.25s -> 2 ticks
  assert.equal(acc.feed(0.05), 0); // 0.05 + 0.05 leftover = 0.1 -> next call
  assert.equal(acc.feed(0.05), 1);
});

test('clock reaches 6 AM after nightSeconds of game time', () => {
  let s = { clockMinutes: 0 };
  advanceClock(s, 360); // nightSeconds worth of seconds
  assert.equal(clockHour(s), 6); // 6 AM
});

test('clockHour maps 0 -> 12 AM hour bucket', () => {
  assert.equal(clockHour({ clockMinutes: 0 }), 0);   // 12 AM
  assert.equal(clockHour({ clockMinutes: 60 }), 1);  // 1 AM
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/clock.test.js`
Expected: FAIL — cannot find module `../src/clock.js`.

- [ ] **Step 3: Write minimal implementation**

```js
import { CONFIG } from './config.js';

// Fixed-timestep accumulator: converts variable frame dt into a whole number of
// logic ticks, carrying the remainder so logic timing is frame-rate-independent.
export function makeAccumulator(hz) {
  const step = 1 / hz;
  let carry = 0;
  return {
    step,
    feed(dt) {
      carry += dt;
      let ticks = 0;
      while (carry >= step) { carry -= step; ticks++; }
      return ticks;
    },
  };
}

// 1 game-second advances the clock by (360 in-game minutes / nightSeconds) so the
// whole 12->6 AM span (6 hours = 360 min) elapses in CONFIG.clock.nightSeconds.
export function advanceClock(state, seconds) {
  const minutesPerSecond = 360 / CONFIG.clock.nightSeconds;
  state.clockMinutes = Math.min(360, state.clockMinutes + seconds * minutesPerSecond);
}

export function clockHour(state) {
  return Math.floor(state.clockMinutes / 60); // 0 = 12 AM ... 6 = 6 AM
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/clock.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/clock.js tests/clock.test.js
git commit -m "feat: fixed-timestep accumulator and game clock"
```

---

## Task 6: Power drain + usage load + shutdown

**Files:**
- Create: `src/power.js`
- Test: `tests/power.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../src/state.js';
import { recomputeUsage, drainPower } from '../src/power.js';

test('usageLoad counts active doors, lights, monitor, flashlight', () => {
  const s = createGameState(1);
  s.doors.L = true; s.lights.R = true; s.monitorUp = true; s.flashlight.on = true;
  recomputeUsage(s);
  assert.equal(s.usageLoad, 4);
});

test('idle drain still reduces power', () => {
  const s = createGameState(1);
  recomputeUsage(s);            // usageLoad 0
  drainPower(s, 1);             // 1 second
  assert.ok(s.power < 100 && s.power > 99); // only base drain
});

test('power floors at 0 and flags shutdown', () => {
  const s = createGameState(1);
  s.power = 0.1;
  const shutdown = drainPower(s, 1);
  assert.equal(s.power, 0);
  assert.equal(shutdown, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/power.test.js`
Expected: FAIL — cannot find module `../src/power.js`.

- [ ] **Step 3: Write minimal implementation**

```js
import { CONFIG } from './config.js';

// usageLoad = number of simultaneously active power draws; drives both the drain
// rate and the 4-bar HUD indicator. Flashlight has its own budget but also adds load.
export function recomputeUsage(state) {
  let load = 0;
  if (state.doors.L) load++;
  if (state.doors.R) load++;
  if (state.lights.L) load++;
  if (state.lights.R) load++;
  if (state.monitorUp) load++;
  if (state.flashlight.on) load++;
  state.usageLoad = load;
}

// Returns true if this drain triggered a shutdown (power hit 0).
export function drainPower(state, seconds) {
  const rate = CONFIG.power.drainBasePerSec + state.usageLoad * CONFIG.power.drainPerUnitPerSec;
  state.power = Math.max(0, state.power - rate * seconds);
  if (state.flashlight.on) {
    state.flashlight.charge = Math.max(0, state.flashlight.charge - CONFIG.flashlight.drainPerSec * seconds);
    if (state.flashlight.charge === 0) state.flashlight.on = false; // beam dies on empty
  }
  return state.power === 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/power.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/power.js tests/power.test.js
git commit -m "feat: power drain, usage load, and shutdown detection"
```

---

## Task 7: Camera-toggle logic (the flagged critical piece)

**Files:**
- Create: `src/monitor.js`
- Test: `tests/monitor.test.js`

- [ ] **Step 1: Write the failing test** (covers the symmetric enter/exit guards that must never silently regress)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../src/state.js';
import { setMonitor, switchCam } from '../src/monitor.js';

test('raising the monitor sets monitorUp and keeps a valid activeCam', () => {
  const s = createGameState(1);
  setMonitor(s, true);
  assert.equal(s.monitorUp, true);
  assert.equal(s.activeCam, 'CAM1A');
});

test('lowering the monitor always exits cleanly', () => {
  const s = createGameState(1);
  setMonitor(s, true);
  setMonitor(s, false);
  assert.equal(s.monitorUp, false);
});

test('raising when already up is a no-op (cannot double-open)', () => {
  const s = createGameState(1);
  setMonitor(s, true);
  const before = s.activeCam;
  setMonitor(s, true);
  assert.equal(s.monitorUp, true);
  assert.equal(s.activeCam, before); // unchanged, no re-init
});

test('lowering when already down is a no-op (cannot get stuck)', () => {
  const s = createGameState(1);
  setMonitor(s, false);
  assert.equal(s.monitorUp, false);
});

test('switchCam only works while monitor is up and returns whether it changed', () => {
  const s = createGameState(1);
  assert.equal(switchCam(s, 'CAM1B'), false); // monitor down -> rejected
  assert.equal(s.activeCam, 'CAM1A');
  setMonitor(s, true);
  assert.equal(switchCam(s, 'CAM1B'), true);  // changed
  assert.equal(s.activeCam, 'CAM1B');
  assert.equal(switchCam(s, 'CAM1B'), false);  // same cam -> no change
});

test('cannot raise the monitor during a pending scare', () => {
  const s = createGameState(1);
  s.pendingScare = 'har';
  setMonitor(s, true);
  assert.equal(s.monitorUp, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/monitor.test.js`
Expected: FAIL — cannot find module `../src/monitor.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// CAMERA TOGGLE — single source of truth for monitorUp.
// setMonitor() is the ONLY function allowed to mutate state.monitorUp. Enter and exit
// are symmetric and idempotent: raising when up or lowering when down are no-ops, so the
// UI can never get stuck "up" or double-open. If the exit path ever regresses, these
// tests fail. Do not bypass this function from render/input code.
export function setMonitor(state, up) {
  if (up) {
    if (state.monitorUp) return false;       // already up — no re-init
    if (state.pendingScare) return false;     // a scare locks the monitor down
    state.monitorUp = true;
    return true;
  } else {
    if (!state.monitorUp) return false;       // already down
    state.monitorUp = false;
    return true;
  }
}

// Returns true only when the active camera actually changed (so callers can fire the
// static blip exactly once per real switch).
export function switchCam(state, camId) {
  if (!state.monitorUp) return false;
  if (state.activeCam === camId) return false;
  state.activeCam = camId;
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/monitor.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/monitor.js tests/monitor.test.js
git commit -m "feat: verified camera-toggle logic with symmetric enter/exit guards"
```

---

## Task 8: AI engine + Har archetype

**Files:**
- Create: `src/ai.js`
- Test: `tests/ai.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../src/state.js';
import { makeRng } from '../src/util/rng.js';
import { stepAI } from '../src/ai.js';

test('har with difficulty 0 never advances', () => {
  const s = createGameState(1); // night 1 har difficulty = 0
  const rng = makeRng(123);
  for (let i = 0; i < 200; i++) stepAI(s, 1, rng); // 200 seconds
  assert.equal(s.animatronics.har.pathIndex, 0);
  assert.equal(s.pendingScare, null);
});

test('har with high difficulty advances toward the office over time', () => {
  const s = createGameState(1);
  s.animatronics.har.difficulty = 20; // forced max
  const rng = makeRng(7);
  let moved = false;
  for (let i = 0; i < 60; i++) {
    stepAI(s, 1, rng);
    if (s.animatronics.har.pathIndex > 0) { moved = true; break; }
  }
  assert.ok(moved, 'har should have advanced at least one node');
});

test('har reaching OFFICE while the near door is open triggers a scare', () => {
  const s = createGameState(1);
  const har = s.animatronics.har;
  har.pathIndex = 2;                 // last node before OFFICE (CAM3)
  har.difficulty = 20;
  s.doors.L = false;                  // door open -> vulnerable
  const rng = makeRng(99);
  for (let i = 0; i < 100 && !s.pendingScare; i++) stepAI(s, 1, rng);
  assert.equal(s.pendingScare, 'har');
});

test('har is blocked at the office when the near door is shut', () => {
  const s = createGameState(1);
  const har = s.animatronics.har;
  har.pathIndex = 3;                  // already at OFFICE node
  har.room = 'OFFICE';
  har.difficulty = 20;
  s.doors.L = true;                   // shut -> blocked, retreats, no scare
  const rng = makeRng(5);
  stepAI(s, 5, rng);                   // advance one full roll interval (moveRollEverySec)
  assert.equal(s.pendingScare, null);
  assert.ok(har.pathIndex < 3, 'har should be repelled by the shut door');
});

test('low power boosts har effective difficulty', () => {
  const s = createGameState(1);
  s.power = 10;                       // below harLowPowerThreshold (30)
  s.animatronics.har.difficulty = 0;  // base 0; boost should make movement possible
  const rng = makeRng(3);
  let moved = false;
  for (let i = 0; i < 200; i++) { stepAI(s, 1, rng); if (s.animatronics.har.pathIndex > 0) { moved = true; break; } }
  assert.ok(moved, 'low power should make Har able to advance even at base difficulty 0');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/ai.test.js`
Expected: FAIL — cannot find module `../src/ai.js`.

- [ ] **Step 3: Write minimal implementation**

```js
import { CONFIG } from './config.js';

// Har uses the office LEFT door as his approach in Slice 1 (Gi/Cluck/Arg added later).
const HAR_DOOR = 'L';

function effectiveDifficulty(state, har) {
  let d = har.difficulty;
  // Punish low power: when the lights are running down, Har presses harder.
  if (state.power < CONFIG.ai.harLowPowerThreshold) d += CONFIG.ai.harLowPowerBoost;
  return d;
}

// Advance all AI by `seconds`. rng() -> [0,1). A creature attempts a move every
// moveRollEverySec; it succeeds when rng()*20 < effectiveDifficulty (0-20 scale).
export function stepAI(state, seconds, rng) {
  const har = state.animatronics.har;
  har.moveTimer += seconds;
  if (har.moveTimer < CONFIG.ai.moveRollEverySec) return;
  har.moveTimer = 0;

  const path = CONFIG.rooms.harPath;
  const d = effectiveDifficulty(state, har);
  if (rng() * 20 >= d) return; // failed the roll this interval

  const atOfficeNode = har.pathIndex >= path.length - 1;
  if (atOfficeNode) {
    // At the office: shut door repels him, open door = scare.
    if (state.doors[HAR_DOOR]) {
      har.pathIndex = Math.max(0, har.pathIndex - 1);
      har.room = path[har.pathIndex];
    } else {
      state.pendingScare = 'har';
    }
    return;
  }

  har.pathIndex++;
  har.room = path[har.pathIndex];
  if (har.room === 'OFFICE' && !state.doors[HAR_DOOR]) state.pendingScare = 'har';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/ai.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ai.js tests/ai.test.js
git commit -m "feat: ai engine and har archetype with low-power aggression"
```

---

## Task 9: Save / Continue (localStorage, injectable storage)

**Files:**
- Create: `src/save.js`
- Test: `tests/save.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSave, recordNightComplete, defaultSave } from '../src/save.js';

function memStore() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

test('fresh storage returns default save (night 1 unlocked)', () => {
  const s = loadSave(memStore());
  assert.deepEqual(s, defaultSave());
  assert.equal(s.highestUnlocked, 1);
});

test('completing a night unlocks the next and is persisted', () => {
  const store = memStore();
  recordNightComplete(store, 1);
  const s = loadSave(store);
  assert.equal(s.highestUnlocked, 2);
  assert.equal(s.lastPlayed, 1);
});

test('completing a lower night does not lower the unlock ceiling', () => {
  const store = memStore();
  recordNightComplete(store, 3);
  recordNightComplete(store, 1);
  assert.equal(loadSave(store).highestUnlocked, 4);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/save.test.js`
Expected: FAIL — cannot find module `../src/save.js`.

- [ ] **Step 3: Write minimal implementation**

```js
const KEY = 'fnan.save.v1';

export function defaultSave() {
  return { highestUnlocked: 1, lastPlayed: 1 };
}

export function loadSave(store) {
  try {
    const raw = store.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    return { ...defaultSave(), ...parsed };
  } catch {
    return defaultSave(); // corrupt save must never hard-crash the menu
  }
}

export function saveSave(store, data) {
  store.setItem(KEY, JSON.stringify(data));
}

export function recordNightComplete(store, night) {
  const s = loadSave(store);
  s.highestUnlocked = Math.max(s.highestUnlocked, night + 1);
  s.lastPlayed = night;
  saveSave(store, s);
  return s;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/save.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/save.js tests/save.test.js
git commit -m "feat: localStorage save and continue with injectable storage"
```

---

## Task 10: HUD formatters (pure)

**Files:**
- Create: `src/hudfmt.js`
- Test: `tests/hudfmt.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clockText, powerPct } from '../src/hudfmt.js';

test('clockText shows 12 AM at start and counts up', () => {
  assert.equal(clockText({ clockMinutes: 0 }), '12 AM');
  assert.equal(clockText({ clockMinutes: 60 }), '1 AM');
  assert.equal(clockText({ clockMinutes: 300 }), '5 AM');
  assert.equal(clockText({ clockMinutes: 360 }), '6 AM');
});

test('powerPct is a clamped rounded integer', () => {
  assert.equal(powerPct({ power: 87.6 }), 88);
  assert.equal(powerPct({ power: -0.1 }), 0);
  assert.equal(powerPct({ power: 100 }), 100);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/hudfmt.test.js`
Expected: FAIL — cannot find module `../src/hudfmt.js`.

- [ ] **Step 3: Write minimal implementation**

```js
export function clockText(state) {
  const hour = Math.floor(state.clockMinutes / 60); // 0..6
  const display = hour === 0 ? 12 : hour;            // 12 AM, then 1..6 AM
  return `${display} AM`;
}

export function powerPct(state) {
  return Math.max(0, Math.min(100, Math.round(state.power)));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/hudfmt.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hudfmt.js tests/hudfmt.test.js
git commit -m "feat: pure hud formatters for clock and power"
```

---

## Task 11: Audio manager + Slice-1 cues (Web Audio, I own)

**Files:**
- Create: `src/audio.js`

No Node unit test: Web Audio needs a real `AudioContext`; this is verified in-browser in
Task 15. The module is structured so cues are named and bound to events, not timers.

- [ ] **Step 1: Create `src/audio.js`**

```js
// Audio manager: named one-shots, looping beds with crossfade, per-channel gain buses
// under a master gain, master mute. All sound is synthesized — no files. Every cue is
// triggered by a game event from main.js, never by an internal timer (except the
// power-out chain, which is an explicit scheduled sequence).
export function createAudio() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);

  // Buses: ambience sits low; stinger (jumpscare) is the loudest thing.
  const buses = {};
  for (const [name, vol] of Object.entries({ ambient: 0.35, tells: 0.5, sfx: 0.7, stinger: 1.0, music: 0.5 })) {
    const g = ctx.createGain(); g.gain.value = vol; g.connect(master); buses[name] = g;
  }

  const loops = new Map();

  function noiseBuffer(seconds) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // --- looping ambient bed: low room tone + fan whir + electrical buzz ---
  function startAmbient() {
    if (loops.has('ambient')) return;
    const g = ctx.createGain(); g.gain.value = 0; g.connect(buses.ambient);
    const tone = ctx.createOscillator(); tone.type = 'sine'; tone.frequency.value = 55;
    const buzz = ctx.createOscillator(); buzz.type = 'sawtooth'; buzz.frequency.value = 60;
    const buzzG = ctx.createGain(); buzzG.gain.value = 0.04; buzz.connect(buzzG).connect(g);
    const fan = ctx.createBufferSource(); fan.buffer = noiseBuffer(2); fan.loop = true;
    const fanFilt = ctx.createBiquadFilter(); fanFilt.type = 'lowpass'; fanFilt.frequency.value = 400;
    const fanG = ctx.createGain(); fanG.gain.value = 0.08; fan.connect(fanFilt).connect(fanG).connect(g);
    tone.connect(g);
    tone.start(); buzz.start(); fan.start();
    g.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.5); // fade in
    loops.set('ambient', { g, nodes: [tone, buzz, fan] });
  }

  // --- Har tell: low hum + heavy step (center pan). Called when Har is near. ---
  function harTell() {
    const t = ctx.currentTime;
    const hum = ctx.createOscillator(); hum.type = 'sine'; hum.frequency.value = 48;
    const hg = ctx.createGain(); hg.gain.setValueAtTime(0.0001, t);
    hg.gain.exponentialRampToValueAtTime(0.5, t + 0.3);
    hg.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    hum.connect(hg).connect(buses.tells); hum.start(t); hum.stop(t + 1.5);
    // heavy step thump
    const step = ctx.createOscillator(); step.type = 'sine'; step.frequency.setValueAtTime(90, t);
    step.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    const sg = ctx.createGain(); sg.gain.setValueAtTime(0.6, t); sg.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    step.connect(sg).connect(buses.tells); step.start(t); step.stop(t + 0.3);
  }

  function oneShot(name) {
    const t = ctx.currentTime;
    if (name === 'doorSlam') {
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer(0.5);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      src.connect(f).connect(g).connect(buses.sfx); src.start(t);
    } else if (name === 'doorOpen') {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(300, t + 0.3);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g).connect(buses.sfx); o.start(t); o.stop(t + 0.4);
    } else if (name === 'lightClick') {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 800;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      o.connect(g).connect(buses.sfx); o.start(t); o.stop(t + 0.07);
    } else if (name === 'monitorWhir') {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(200, t);
      o.frequency.linearRampToValueAtTime(420, t + 0.25);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g).connect(buses.sfx); o.start(t); o.stop(t + 0.32);
    } else if (name === 'camBlip') {
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer(0.12);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      src.connect(g).connect(buses.sfx); src.start(t);
    } else if (name === 'lowPowerWarn') {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 330;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(buses.sfx); o.start(t); o.stop(t + 0.65);
    } else if (name === 'jumpscare') {
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer(0.9);
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 70;
      const g = ctx.createGain(); g.gain.setValueAtTime(1.0, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.9);
      src.connect(g); o.connect(g); g.connect(buses.stinger); src.start(t); o.start(t); o.stop(t + 0.9);
    } else if (name === 'winChime') {
      [523, 659, 784].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = ctx.createGain(); const st = t + i * 0.18;
        g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.4, st + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 0.8);
        o.connect(g).connect(buses.music); o.start(st); o.stop(st + 0.85);
      });
    }
  }

  // Power-out sequence: everything dies -> silence -> slow music-box cue -> caller fires scare.
  // Returns a promise that resolves after the music-box, so main.js can chain the final scare.
  function powerOutSequence() {
    const a = loops.get('ambient');
    if (a) a.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4); // everything dies
    return new Promise(resolve => {
      setTimeout(() => {
        const t = ctx.currentTime;
        const notes = [659, 784, 880, 659]; // sparse, slow, music-box-like
        notes.forEach((f, i) => {
          const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
          const g = ctx.createGain(); const st = t + i * 0.55;
          g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.3, st + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, st + 0.5);
          o.connect(g).connect(buses.music); o.start(st); o.stop(st + 0.55);
        });
        setTimeout(resolve, notes.length * 550 + 300);
      }, 1500); // beat of silence after the lights die
    });
  }

  function setMuted(m) { master.gain.value = m ? 0 : 0.9; }
  function resume() { if (ctx.state === 'suspended') ctx.resume(); } // unlock after a user gesture

  return { ctx, resume, startAmbient, harTell, oneShot, powerOutSequence, setMuted };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/audio.js
git commit -m "feat: web audio manager with ambient bed, har tell, and power-out chain"
```

---

## Task 12: 3D world facade (agy-authored internals)

**Files:**
- Create: `src/render/world.js`

This task's pixels come from the Google Antigravity CLI. The **interface contract is fixed**
(see File structure header); agy authors the internals against it. Logic never imports
Three.js except through this module.

- [ ] **Step 1: Generate the world module with agy**

Run (from the project root):

```bash
agy --model "Gemini 3.1 Pro (High)" -p "Write a single ES module src/render/world.js for a Three.js horror game (Three.js imported as: import * as THREE from 'three'). Export createWorld(THREE, mountEl) returning an object with EXACTLY these methods: render(state, dt), setOfficeView(), setCamView(camId), setAnimatronicRoom(name, roomId), setDoor(side, closed), setLight(side, on), setFlashlight(on), staticBurst(), shake(intensity), playJumpscare(name) returning a Promise, dimForPower(level 0..1). Build ONE scene containing: a dark security office with a desk, monitor, ceiling fan casting moving shadows, a LEFT and RIGHT doorway each with a closeable door panel and a light; plus separate rooms named CAM1A (a show stage), CAM1B (dining), CAM3 (a closet/hall), and CAM7 (a curtained cove), laid out in 3D space. Place a PerspectiveCamera in each room and one in the office (office camera supports a small pannable yaw via render(state) reading state.lookYaw if present). Model an original owl animatronic named 'har': dusk-brown plumage body, amber emissive eyes, maroon bowtie, ear tufts, grimy dull-metallic material — NOT flat plastic, readable on a grainy feed; expose it via setAnimatronicRoom('har', roomId) which moves the owl mesh to that room. render(state, dt): if state.monitorUp render the camera for state.activeCam, else render the office camera; apply a post-processing pass with scanlines, grain, and chromatic aberration ONLY when state.monitorUp; staticBurst() shows ~0.4s of heavy static over the feed; shake(intensity) jitters the active camera; playJumpscare('har') slams the owl's face to fill the screen with a hard cut and resolves its Promise after ~1s; dimForPower(level) lowers office light intensity as level drops. Use fog and a flashlight SpotLight cone with falloff toggled by setFlashlight. Atmospheric, motivated pools of light. Keep it self-contained, no external assets, no TODOs, return only the file contents."
```

- [ ] **Step 2: Save output and add the attribution marker**

Save the returned module to `src/render/world.js`. Add as the first line:

```js
// via Google Antigravity CLI
```

- [ ] **Step 3: Verify the contract is satisfied**

Confirm by reading the file that every method in the contract exists and that the module
imports Three.js only via the passed-in `THREE` argument (no hard `import` that would break
the importmap). If a method is missing or misnamed, re-run agy citing the exact missing
method, or hand-fix the signature. Do not proceed until all 11 methods are present.

- [ ] **Step 4: Commit**

```bash
git add src/render/world.js
git commit -m "feat: 3d world facade and har model (via agy)"
```

---

## Task 13: DOM menu + HUD overlay (agy-authored)

**Files:**
- Create: `src/ui/overlay.js`

- [ ] **Step 1: Generate the overlay module with agy**

```bash
agy --model "Gemini 3.1 Pro (High)" -p "Write a single ES module src/ui/overlay.js (no imports, pure DOM) exporting createOverlay(rootEl, handlers) where handlers = { onNewGame, onContinue, onNightSelect(night) }. It must build and return an object with methods: showMenu(saveInfo), showNightCard(night), showPlaying(), showGameOver(), showWin(), updateHUD({ powerPct, usageLoad, clockText, night, flashlightPct, camLabel }). Visual design: a dark, grainy, static-flecked main menu titled 'Five Nights at Nano's' stacked on two lines in a worn off-white serif, with selectable rows '>> New game', 'Continue', 'Night select' (Continue calls onContinue, Night select reveals night buttons 1..saveInfo.highestUnlocked calling onNightSelect). showNightCard(n) shows 'Night n' fading in then out over ~3s on black. showPlaying() hides menu/cards. HUD overlay (only visible during play): top-left 'Power XX%' plus a 4-segment usage bar that lights red/amber segments as usageLoad rises (color escalates as power drops, and the whole HUD flickers subtly when powerPct < 25); top-right large clock text and 'Night n'; a flashlight charge bar; a bottom-center button '▲ pull up cameras / lower' wired to a handler set on overlay.onToggleMonitor (a property the caller assigns); and a small 'CAM <label> • SIGNAL...' tag. showGameOver() shows a stark black screen briefly; showWin() shows a calm '6 AM' with a soft glow. Match a CRT-horror aesthetic with CSS only, no external fonts/images. Return only the file contents."
```

- [ ] **Step 2: Save output and add the attribution marker**

Save to `src/ui/overlay.js`; first line `// via Google Antigravity CLI`. Confirm all six
methods plus an assignable `onToggleMonitor` hook exist; re-run agy or hand-fix if not.

- [ ] **Step 3: Commit**

```bash
git add src/ui/overlay.js
git commit -m "feat: dom menu and hud overlay (via agy)"
```

---

## Task 14: Wire the game loop (main.js)

**Files:**
- Modify: `src/main.js` (replace the Task 1 stub entirely)

- [ ] **Step 1: Replace `src/main.js` with the full integration**

```js
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { createGameState } from './state.js';
import { makeAccumulator, advanceClock, clockHour } from './clock.js';
import { recomputeUsage, drainPower } from './power.js';
import { setMonitor, switchCam } from './monitor.js';
import { stepAI } from './ai.js';
import { makeRng } from './util/rng.js';
import { loadSave, recordNightComplete } from './save.js';
import { clockText, powerPct } from './hudfmt.js';
import { createAudio } from './audio.js';
import { createWorld } from './render/world.js';
import { createOverlay } from './ui/overlay.js';

const app = document.getElementById('app');
const audio = createAudio();
const world = createWorld(THREE, app);
const store = window.localStorage;

let state = null;
let rng = makeRng(1);
const acc = makeAccumulator(CONFIG.ai.tickHz);
const dtTick = 1 / CONFIG.ai.tickHz;
let prevRoom = null;          // for static-on-movement detection
let warnedLowPower = false;
let scareRunning = false;

const overlay = createOverlay(app, {
  onNewGame: () => startNight(1),
  onContinue: () => startNight(loadSave(store).lastPlayed),
  onNightSelect: (n) => startNight(n),
});

function gotoMenu() {
  state = createGameState(1);
  state.phase = 'menu';
  overlay.showMenu(loadSave(store));
}

function startNight(night) {
  audio.resume();                 // unlock audio on the user gesture
  state = createGameState(night);
  rng = makeRng(night * 1000 + 7); // seed varies per night for reproducible-but-distinct runs
  prevRoom = state.animatronics.har.room;
  warnedLowPower = false;
  scareRunning = false;
  audio.startAmbient();
  world.setAnimatronicRoom('har', state.animatronics.har.room);
  overlay.showNightCard(night);
  state.phase = 'nightStart';
  setTimeout(() => { if (state && state.night === night) { state.phase = 'playing'; overlay.showPlaying(); } }, 3000);
}

// Input: monitor toggle from the overlay button.
overlay.onToggleMonitor = () => {
  if (!state || state.phase !== 'playing') return;
  const target = !state.monitorUp;
  if (setMonitor(state, target)) {
    audio.oneShot('monitorWhir');
    if (target) { world.setCamView(state.activeCam); } else { world.setOfficeView(); }
  }
};

// Keyboard: A/D doors, left/right lights (Q/E), C cameras, F flashlight, 1/2/3/7 cams.
window.addEventListener('keydown', (e) => {
  if (!state || state.phase !== 'playing') return;
  const k = e.key.toLowerCase();
  if (k === 'a') { state.doors.L = !state.doors.L; audio.oneShot(state.doors.L ? 'doorSlam' : 'doorOpen'); world.setDoor('L', state.doors.L); }
  else if (k === 'd') { state.doors.R = !state.doors.R; audio.oneShot(state.doors.R ? 'doorSlam' : 'doorOpen'); world.setDoor('R', state.doors.R); }
  else if (k === 'q') { state.lights.L = !state.lights.L; audio.oneShot('lightClick'); world.setLight('L', state.lights.L); }
  else if (k === 'e') { state.lights.R = !state.lights.R; audio.oneShot('lightClick'); world.setLight('R', state.lights.R); }
  else if (k === 'f') { state.flashlight.on = !state.flashlight.on && state.flashlight.charge > 0; world.setFlashlight(state.flashlight.on); }
  else if (k === 'c') { overlay.onToggleMonitor(); }
  else if (['1','2','3','7'].includes(k) && state.monitorUp) {
    const map = { '1': 'CAM1A', '2': 'CAM1B', '3': 'CAM3', '7': 'CAM7' };
    if (switchCam(state, map[k])) { audio.oneShot('camBlip'); world.setCamView(state.activeCam); world.staticBurst(); }
  }
});

function tick() {
  // One fixed logic step.
  recomputeUsage(state);
  const shutdown = drainPower(state, dtTick);
  advanceClock(state, dtTick);
  stepAI(state, dtTick, rng);

  // Har audio tell when he is one node from the office (bound to state, not a timer).
  const har = state.animatronics.har;
  if (har.pathIndex === CONFIG.rooms.harPath.length - 2 && har.moveTimer < dtTick) audio.harTell();

  // Static-on-movement: feed distorts when Har changes rooms while you watch.
  if (har.room !== prevRoom) {
    if (state.monitorUp) world.staticBurst();
    prevRoom = har.room;
  }

  // Low-power warning sting + UI flicker, fired once when crossing the threshold.
  if (!warnedLowPower && state.power <= CONFIG.audio.lowPowerWarnAt) { audio.oneShot('lowPowerWarn'); warnedLowPower = true; }

  if (shutdown && !scareRunning) { runPowerOut(); return; }
  if (state.pendingScare && !scareRunning) { runScare(state.pendingScare); return; }
  if (clockHour(state) >= 6) { runWin(); return; }
}

async function runScare(name) {
  scareRunning = true;
  state.phase = 'gameover';
  audio.oneShot('jumpscare');
  world.shake(1);
  await world.playJumpscare(name);
  overlay.showGameOver();
  setTimeout(gotoMenu, 1800);
}

async function runPowerOut() {
  scareRunning = true;
  state.phase = 'powerout';
  state.doors.L = state.doors.R = false; state.lights.L = state.lights.R = false;
  state.flashlight.on = false; setMonitor(state, false);
  world.setOfficeView(); world.dimForPower(0);
  await audio.powerOutSequence();   // die -> silence -> music box
  audio.oneShot('jumpscare');
  await world.playJumpscare('har'); // Har punishes the dark
  overlay.showGameOver();
  setTimeout(gotoMenu, 1800);
}

function runWin() {
  scareRunning = true;
  state.phase = 'win';
  recordNightComplete(store, state.night);
  audio.oneShot('winChime');
  overlay.showWin();
  setTimeout(gotoMenu, 3500);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000); // clamp to avoid spiral-of-death after tab blur
  last = now;
  if (state && state.phase === 'playing') {
    const ticks = acc.feed(dt);
    for (let i = 0; i < ticks && state.phase === 'playing'; i++) tick();
  }
  if (state && (state.phase === 'playing' || state.phase === 'powerout')) {
    world.dimForPower(Math.max(0, state.power / 100));
    overlay.updateHUD({
      powerPct: powerPct(state),
      usageLoad: state.usageLoad,
      clockText: clockText(state),
      night: state.night,
      flashlightPct: Math.round(state.flashlight.charge),
      camLabel: state.monitorUp ? state.activeCam : '—',
    });
  }
  if (state) world.render(state, dt);
  requestAnimationFrame(frame);
}

gotoMenu();
requestAnimationFrame(frame);
```

- [ ] **Step 2: Run the full logic test suite to confirm no regressions**

Run: `node --test`
Expected: PASS — all suites from Tasks 3–10 green (rng, state, clock, power, monitor, ai, save, hudfmt).

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: wire fixed-timestep loop, input, har end-to-end, power-out and win"
```

---

## Task 15: Manual integration verification (the slice is only done when these pass)

**Files:** none (manual browser checks). Serve with `python -m http.server 8000`, open `http://localhost:8000`.

- [ ] **Step 1: Menu & continue**

Confirm: static-flecked "Five Nights at Nano's" menu renders; New game starts Night 1
(night card fades in/out); after surviving once, Continue and Night select work.

- [ ] **Step 2: Office & camera toggle (the flagged regression risk)**

Confirm: office renders with fan shadows and motivated light; pressing C / the button
raises the monitor (whir SFX) showing a real 3D room; switching cams 1/2/3/7 blips +
static bursts; lowering returns cleanly to the office **every time** — raise/lower 10×
rapidly and confirm it never gets stuck up or down.

- [ ] **Step 3: Power & doors**

Confirm: holding doors/lights/monitor drives the 4-bar usage indicator up and power down
faster; HUD flickers and a warning sting fires under 25%; letting power reach 0 triggers
the power-out sequence (everything dies → silence → music box → Har scare).

- [ ] **Step 4: Har & jumpscare**

Confirm (use Night 5 or temporarily set `har` difficulty high in `config.js`): Har advances
stage→office over time, his hum+step tell plays as he nears, the LEFT door blocks him when
shut, and an open door at the office triggers the hard-cut jumpscare with the loud stinger
and screen shake.

- [ ] **Step 5: Win**

Confirm: surviving to 6 AM plays the calm chime, shows the 6 AM win screen, unlocks the
next night (verify via Continue), and returns to menu.

- [ ] **Step 6: Audio mix**

Confirm: ambient bed loops under everything, tells are audible but not overpowering, and
the jumpscare is clearly the loudest moment.

- [ ] **Step 7: Final commit / branch wrap-up**

```bash
git add -A
git commit -m "test: manual integration verification checklist for slice 1"
```

---

## Out of scope for this plan (future slices)

- **Slice 2:** Gi (left), Cluck (right, mid-night spike), Arg (cove emergence meter) + their directional tells and scares; right-door AI; multi-creature audio panning.
- **Slice 3:** full post-FX polish, Nights 2–5 tuning pass, richer office pan/look controls, win-flow polish.
- **Slice 4 (stretch):** custom-night selector (per-creature difficulty sliders).
