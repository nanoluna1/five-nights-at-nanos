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
import { createMpMenu } from './ui/mpmenu.js';
import { makeRoomCode, createLobby, ROLES, pickSpinRole } from './lobby.js';
import { createPeerHost, createPeerClient } from './net.js';

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
let argWarned = false;        // so Arg's footsteps warning fires once per emergence
let argPrevCommitted = false; // edge-detect Arg leaving the cove (start of his sprint)

const TELL = { har: () => audio.harTell(), gi: () => audio.giTell(), cluck: () => audio.cluckTell(), arg: () => audio.argTell() };

// Browsers keep the AudioContext suspended until a user gesture; resume on the first
// click anywhere so menu hover ticks and other cues can sound.
window.addEventListener('pointerdown', () => audio.resume(), { once: true });

const overlay = createOverlay(app, {
  onNewGame: () => startNight(1),
  onContinue: () => startNight(loadSave(store).lastPlayed),
  onNightSelect: (n) => startNight(n),
  onMultiplayer: () => { audio.resume(); mp.showHome(); },
});

// ===================== multiplayer (Slice 1: lobby & connection) =====================
// Host-authoritative P2P via PeerJS (lazy-loaded). The host owns the roster; clients render the
// roster snapshots it broadcasts. Slice 2 will add the spin wheel; Slice 3 the synced night.
let mpNet = null;     // active transport (host or client endpoint)
let mpLobby = null;   // host-only roster
let myName = 'Nano';

const mp = createMpMenu(app, {
  onHover: () => audio.menuHover(),
  onBack: () => { teardownMp(); mp.hide(); overlay.showMenu(loadSave(store)); },
  onHost: (name) => hostGame(name),
  onJoin: (name) => { myName = (name || '').trim() || 'Nano'; mp.showJoinEntry(); },
  onSubmitCode: (code) => joinGame(code),
  onStart: () => startMpGame(),
  onSpinPressed: () => onSpinPressed(),
});

let spinState = null; // host-only: { order, remaining, guardAssigned, assigned, turnIdx, rng }
function myMpId() { return mpNet && mpNet.isHost ? 'HOST' : (mpNet ? mpNet.id : null); }
function teardownMp() { if (mpNet) { try { mpNet.close(); } catch (e) {} } mpNet = null; mpLobby = null; spinState = null; }

function hostGame(name) {
  myName = (name || '').trim() || 'Nano';
  const code = makeRoomCode();
  mpLobby = createLobby();
  mpLobby.add('HOST', myName, true);
  mp.showHostLobby(code);
  mp.setRoster(mpLobby.players(), { isHost: true });
  mp.setStatus('Opening room…');
  createPeerHost(code, {
    onReady: () => mp.setStatus('Room open — share the code and wait for players'),
    onError: (e) => mp.setStatus('Could not open room (' + e + '). Are you offline?'),
    onMessage: (id, msg) => {
      if (!msg) return;
      if (msg.type === 'hello') {
        mpLobby.add(id, msg.name);
        if (mpNet) mpNet.broadcast({ type: 'roster', players: mpLobby.players() });
        mp.setRoster(mpLobby.players(), { isHost: true });
      } else if (msg.type === 'spinPressed') {
        mpDoSpin(id); // the host validates it's actually this client's turn
      }
    },
    onLeave: (id) => {
      mpLobby.remove(id);
      if (mpNet) mpNet.broadcast({ type: 'roster', players: mpLobby.players() });
      mp.setRoster(mpLobby.players(), { isHost: true });
    },
  }).then((host) => { mpNet = host; }).catch(() => mp.setStatus('Could not open room. Are you offline?'));
}

function joinGame(code) {
  if (!code) { mp.setJoinStatus('Enter a room code'); return; }
  mp.setJoinStatus('Connecting…');
  createPeerClient(code, {
    onMessage: (msg) => {
      if (!msg) return;
      if (msg.type === 'roster') {
        mp.showHostLobby(code);
        mp.setRoster(msg.players, { isHost: false });
        mp.setStatus('In the lobby — waiting for the host to start');
      } else if (msg.type === 'turn') mpHandleTurn(msg);
      else if (msg.type === 'spinResult') mpHandleSpinResult(msg);
      else if (msg.type === 'rolesDone') mpHandleRolesDone(msg);
    },
    onClose: () => mp.setStatus('Host disconnected'),
    onError: (e) => mp.setJoinStatus('Could not connect (' + e + ')'),
  }).then((client) => {
    if (!client) { mp.setJoinStatus('Could not connect — check the code (or you may be offline)'); return; }
    mpNet = client;
    mp.setJoinStatus('Connected — joining lobby…');
    client.send({ type: 'hello', name: myName });
  });
}

// ---- Slice 2: the role spin wheel (host-authoritative) ----
// The host owns spinState, decides each landed role (forced-Guard rule), and broadcasts turns +
// results; every client animates the same wheel to the same role so it stays in sync.
function startMpGame() {
  if (!mpNet || !mpNet.isHost || !mpLobby || mpLobby.count() < 2) return;
  const players = mpLobby.players();
  spinState = {
    order: players.map(p => ({ id: p.id, name: p.name })),
    remaining: ROLES.slice(),
    guardAssigned: false,
    assigned: [],
    turnIdx: 0,
    rng: makeRng((Date.now() ^ 0x5bd1e995) >>> 0),
  };
  mpNextTurn();
}

function mpNextTurn() {
  if (!spinState) return;
  if (spinState.turnIdx >= spinState.order.length) { mpFinishRoles(); return; }
  const active = spinState.order[spinState.turnIdx];
  const msg = { type: 'turn', activeId: active.id, activeName: active.name, roles: spinState.remaining.slice(), assigned: spinState.assigned.slice() };
  mpNet.broadcast(msg);
  mpHandleTurn(msg);
}

function mpDoSpin(byId) {
  if (!spinState) return;
  const active = spinState.order[spinState.turnIdx];
  if (!active || active.id !== byId) return; // only the player whose turn it is can spin
  const playersLeft = spinState.order.length - spinState.turnIdx;
  const role = pickSpinRole(spinState.remaining, spinState.guardAssigned, playersLeft, spinState.rng);
  const durationMs = 3400;
  const res = { type: 'spinResult', activeId: active.id, activeName: active.name, role, durationMs };
  mpNet.broadcast(res);
  mpHandleSpinResult(res);
  // commit to authoritative state, then advance after the animation settles
  spinState.remaining.splice(spinState.remaining.indexOf(role), 1);
  if (role === 'guard') spinState.guardAssigned = true;
  spinState.assigned.push({ id: active.id, name: active.name, role });
  spinState.turnIdx++;
  setTimeout(mpNextTurn, durationMs + 1500);
}

function mpFinishRoles() {
  const msg = { type: 'rolesDone', assignments: spinState ? spinState.assigned.slice() : [] };
  mpNet.broadcast(msg);
  mpHandleRolesDone(msg);
  spinState = null;
}

function onSpinPressed() {
  if (!mpNet) return;
  if (mpNet.isHost) mpDoSpin('HOST');
  else mpNet.send({ type: 'spinPressed' });
}

// shared rendering reactions (host + clients run the same UI)
function mpHandleTurn(msg) {
  mp.showSpin();
  mp.setWheelRoles(msg.roles);
  mp.setAssigned(msg.assigned || []);
  mp.setTurn(msg.activeName, msg.activeId === myMpId());
}
function mpHandleSpinResult(msg) {
  mp.setTurn(msg.activeName, false);        // lock the button while it spins
  mp.spinResult(msg.role, msg.durationMs, () => {});
}
function mpHandleRolesDone(msg) {
  const mine = (msg.assignments || []).find(a => a.id === myMpId());
  mp.showRoleReveal(mine ? mine.role : null, msg.assignments);
}

function gotoMenu() {
  state = createGameState(1);
  state.phase = 'menu';
  overlay.showMenu(loadSave(store));
}

function startNight(night) {
  audio.resume();
  state = createGameState(night);
  // Seed with real entropy so each playthrough of a night differs — a fixed per-night seed meant
  // the SAME (sometimes unlucky) AI sequence every single time, which could doom a given night.
  rng = makeRng((Date.now() ^ (night * 0x9e3779b1)) >>> 0);
  prevRoom = {}; prevAtDoor = {};
  for (const [name, a] of Object.entries(state.animatronics)) { prevRoom[name] = a.room; prevAtDoor[name] = a.atDoor; }
  warnedLowPower = false;
  scareRunning = false;
  argWarned = false;
  argPrevCommitted = false;
  audio.startAmbient();
  overlay.showNightCard(night);
  state.phase = 'nightStart';
  setTimeout(() => {
    if (!state || state.night !== night) return;
    state.phase = 'playing'; overlay.showPlaying();
    // Phone Guy: ring, then the night's recorded handover appears (non-blocking).
    const lines = CONFIG.phone[night];
    if (lines) { audio.phoneRing(); setTimeout(() => { if (state && state.phase === 'playing') overlay.showPhone(lines, CONFIG.phone.msPerLine); }, 2200); }
  }, 3000);
}

// ---- shared toggles (used by both keybinds and on-screen buttons) ----
function toggleDoor(side) { state.doors[side] = !state.doors[side]; audio.oneShot(state.doors[side] ? 'doorSlam' : 'doorOpen'); }
function toggleLight(side) { state.lights[side] = !state.lights[side]; audio.oneShot('lightClick'); }

// ---- camera raise/lower (hover-driven, with an arm latch) ----
// camArmed prevents the bug where lowering while the mouse is still in the bottom hover zone
// instantly snaps the monitor back up. Lowering disarms; moving the mouse up re-arms.
let camArmed = true;
function raiseCams() { if (state.monitorUp || !camArmed) return; if (setMonitor(state, true)) { audio.oneShot('monitorWhir'); world.setCamView(state.activeCam); } }
function lowerCams() { if (!state.monitorUp) return; if (setMonitor(state, false)) { audio.oneShot('monitorWhir'); world.setOfficeView(); state.flashlight.on = false; } } // flashlight is a camera tool; off when we drop

overlay.onToggleMonitor = () => {
  if (!state || state.phase !== 'playing') return;
  if (state.monitorUp) { lowerCams(); camArmed = false; } else { camArmed = true; raiseCams(); }
};
overlay.onSelectCam = (camId) => { if (!state || state.phase !== 'playing' || !state.monitorUp) return; if (switchCam(state, camId)) { audio.oneShot('camBlip'); world.setCamView(state.activeCam); world.staticBurst(); } };
overlay.onDoor = (side) => { if (state && state.phase === 'playing') toggleDoor(side); };
overlay.onLight = (side) => { if (state && state.phase === 'playing') toggleLight(side); };
overlay.onPhoneLine = () => audio.phoneBlip(); // soft blip as each line appears
overlay.onMenuHover = () => audio.menuHover();  // hover tick on menu rows

// Hover-to-open cameras: dipping the mouse into the bottom `raiseZone` raises the monitor;
// moving back above `lowerZone` lowers it. The gap between the two is hysteresis so it can't
// flicker at the boundary. setMonitor is idempotent, so the whir only fires on a real change.
window.addEventListener('mousemove', (e) => {
  if (!state || state.phase !== 'playing') return;
  const fy = e.clientY / window.innerHeight;
  if (fy < CONFIG.cameras.lowerZone) { camArmed = true; if (state.monitorUp) lowerCams(); } // moving up lowers + re-arms
  else if (fy > CONFIG.cameras.raiseZone) raiseCams();                                       // dipping to the bottom raises
});

// Keyboard still works: A/D doors, Q/E lights, F flashlight, C cameras toggle, 1/2/3/4/7 cams.
window.addEventListener('keydown', (e) => {
  if (!state || state.phase !== 'playing') return;
  const k = e.key.toLowerCase();
  if (k === 'a') toggleDoor('L');
  else if (k === 'd') toggleDoor('R');
  else if (k === 'q') toggleLight('L');
  else if (k === 'e') toggleLight('R');
  else if (k === 'f') { if (state.monitorUp) state.flashlight.on = !state.flashlight.on && state.flashlight.charge > 0; } // flashlight only on cameras
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

  // Arg's escalating running footsteps as his cove meter spikes — your cue he's about to sprint
  const arg = state.animatronics.arg;
  if (arg.emergence >= CONFIG.ai.argWarnAt && !argWarned) { audio.argTell(); argWarned = true; }
  else if (arg.emergence < 40) argWarned = false;
  if (arg.committed && !argPrevCommitted) audio.argTell(); // he's left the cove — sprinting now
  argPrevCommitted = arg.committed;

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

// Power-out: lights die -> a tinny music-box march plays in the dark with Har's eyes pulsing on
// the LEFT door -> the march fades -> dead silence -> the strike fires the instant the silence
// ends, in lockstep with its sound. Timing is CONFIG.powerout so the dread can be tuned.
async function runPowerOut() {
  scareRunning = true;
  state.phase = 'powerout';
  state.doors.L = state.doors.R = false; state.lights.L = state.lights.R = false;
  state.flashlight.on = false; setMonitor(state, false);
  world.dimForPower(0);
  world.showPowerOutEyes();                              // Har looms at the left door, eyes glowing
  await audio.powerOutSequence(CONFIG.powerout);         // lights die -> music-box march -> fade out
  await new Promise(r => setTimeout(r, CONFIG.powerout.quietMs)); // dead silence (eyes still pulsing)
  world.clearPowerOutEyes();
  audio.oneShot('jumpscare');                            // sound + visual together, no delay
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
