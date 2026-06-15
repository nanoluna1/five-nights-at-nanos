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
const world = createWorld(app);
const store = window.localStorage;

let state = null;
let rng = makeRng(1);
const acc = makeAccumulator(CONFIG.ai.tickHz);
const dtTick = 1 / CONFIG.ai.tickHz;
let prevRoom = {};            // per-creature last room, for static-on-movement
let prevAtDoor = {};          // per-creature last atDoor side, to fire the urgent tell once
let warnedLowPower = false;
let scareRunning = false;

const TELL = { har: () => audio.harTell(), gi: () => audio.giTell(), cluck: () => audio.cluckTell(), arg: () => audio.argTell() };

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
  audio.resume();
  state = createGameState(night);
  rng = makeRng(night * 1000 + 7);
  prevRoom = {}; prevAtDoor = {};
  for (const [name, a] of Object.entries(state.animatronics)) { prevRoom[name] = a.room; prevAtDoor[name] = a.atDoor; }
  warnedLowPower = false;
  scareRunning = false;
  audio.startAmbient();
  overlay.showNightCard(night);
  state.phase = 'nightStart';
  setTimeout(() => { if (state && state.night === night) { state.phase = 'playing'; overlay.showPlaying(); } }, 3000);
}

// ---- shared toggles (used by both keybinds and on-screen buttons) ----
function toggleDoor(side) { state.doors[side] = !state.doors[side]; audio.oneShot(state.doors[side] ? 'doorSlam' : 'doorOpen'); }
function toggleLight(side) { state.lights[side] = !state.lights[side]; audio.oneShot('lightClick'); }

// ---- camera raise/lower ----
function raiseCams() { if (state.monitorUp) return; if (setMonitor(state, true)) { audio.oneShot('monitorWhir'); world.setCamView(state.activeCam); } }
function lowerCams() { if (!state.monitorUp) return; if (setMonitor(state, false)) { audio.oneShot('monitorWhir'); world.setOfficeView(); } }

overlay.onToggleMonitor = () => { if (!state || state.phase !== 'playing') return; state.monitorUp ? lowerCams() : raiseCams(); };
overlay.onSelectCam = (camId) => { if (!state || state.phase !== 'playing' || !state.monitorUp) return; if (switchCam(state, camId)) { audio.oneShot('camBlip'); world.setCamView(state.activeCam); world.staticBurst(); } };
overlay.onDoor = (side) => { if (state && state.phase === 'playing') toggleDoor(side); };
overlay.onLight = (side) => { if (state && state.phase === 'playing') toggleLight(side); };

// Hover-to-open cameras: dipping the mouse into the bottom `raiseZone` raises the monitor;
// moving back above `lowerZone` lowers it. The gap between the two is hysteresis so it can't
// flicker at the boundary. setMonitor is idempotent, so the whir only fires on a real change.
window.addEventListener('mousemove', (e) => {
  if (!state || state.phase !== 'playing') return;
  const fy = e.clientY / window.innerHeight;
  if (!state.monitorUp && fy > CONFIG.cameras.raiseZone) raiseCams();
  else if (state.monitorUp && fy < CONFIG.cameras.lowerZone) lowerCams();
});

// Keyboard still works: A/D doors, Q/E lights, F flashlight, C cameras toggle, 1/2/3/4/7 cams.
window.addEventListener('keydown', (e) => {
  if (!state || state.phase !== 'playing') return;
  const k = e.key.toLowerCase();
  if (k === 'a') toggleDoor('L');
  else if (k === 'd') toggleDoor('R');
  else if (k === 'q') toggleLight('L');
  else if (k === 'e') toggleLight('R');
  else if (k === 'f') { state.flashlight.on = !state.flashlight.on && state.flashlight.charge > 0; }
  else if (k === 'c') overlay.onToggleMonitor();
  else if (['1', '2', '3', '4', '7'].includes(k) && state.monitorUp) {
    const map = { '1': 'CAM1A', '2': 'CAM2', '3': 'CAM3', '4': 'CAM4', '7': 'CAM7' };
    if (switchCam(state, map[k])) { audio.oneShot('camBlip'); world.setCamView(state.activeCam); world.staticBurst(); }
  }
});

function tick() {
  recomputeUsage(state);
  const shutdown = drainPower(state, dtTick);
  advanceClock(state, dtTick);
  stepAI(state, dtTick, rng);

  // per-creature movement audio + static-on-movement, and the urgent "at your door" tell
  for (const [name, a] of Object.entries(state.animatronics)) {
    if (a.room !== prevRoom[name]) {
      if (state.monitorUp) world.staticBurst();
      if (name === 'har') audio.harTell();   // hear the headliner's hum as he moves
      prevRoom[name] = a.room;
    }
    if (a.atDoor && !prevAtDoor[name]) TELL[name](); // fires once when it arrives at the door
    prevAtDoor[name] = a.atDoor;
  }

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

// Power-out: lights die -> dark -> held silence + music box -> Har's face stutters out of the
// black -> the strike. Timing is CONFIG.powerout so the dread can be tuned.
async function runPowerOut() {
  scareRunning = true;
  state.phase = 'powerout';
  state.doors.L = state.doors.R = false; state.lights.L = state.lights.R = false;
  state.flashlight.on = false; setMonitor(state, false);
  world.dimForPower(0);
  await audio.powerOutSequence(CONFIG.powerout);   // die -> silence -> music box
  world.showLurkFace('har');                       // face flickers in the dark
  await new Promise(r => setTimeout(r, CONFIG.powerout.faceFlickerMs));
  world.clearLurkFace();
  audio.oneShot('jumpscare');
  await world.playJumpscare('har');
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
  const dt = Math.min(0.25, (now - last) / 1000);
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
      monitorUp: state.monitorUp,
      activeCam: state.activeCam,
      doors: state.doors,
      lights: state.lights,
    });
  }
  if (state) world.render(state, dt);
  requestAnimationFrame(frame);
}

gotoMenu();
requestAnimationFrame(frame);
