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

// Camera selection from the on-screen camera map.
overlay.onSelectCam = (camId) => {
  if (!state || state.phase !== 'playing' || !state.monitorUp) return;
  if (switchCam(state, camId)) { audio.oneShot('camBlip'); world.setCamView(state.activeCam); world.staticBurst(); }
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

  // Static-on-movement: feed distorts when Har changes rooms while you watch,
  // and the owl mesh relocates so the cameras actually show him move.
  if (har.room !== prevRoom) {
    world.setAnimatronicRoom('har', har.room);
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
  world.setFlashlight(false);   // sync render facade so the beam dies with everything else
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
      monitorUp: state.monitorUp,
      activeCam: state.activeCam,
    });
  }
  if (state) world.render(state, dt);
  requestAnimationFrame(frame);
}

gotoMenu();
requestAnimationFrame(frame);
