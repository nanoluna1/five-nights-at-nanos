// Multiplayer match orchestration. Host-authoritative: the host steps the mpsim and broadcasts
// snapshots; everyone renders from the latest snapshot (the host from its own). The guard reuses
// the single-player world render + overlay HUD; animatronics use the POV render + anim HUD.
//
// Two important details:
//  - The host's authoritative stepping runs on a Web Worker timer (not requestAnimationFrame), so
//    the match keeps running and broadcasting even if the host backgrounds their browser tab.
//  - Audio is driven by diffing snapshots, so every client hears doors/lights/monitor, the "at your
//    door" cues, the kill sting, and the win/lose sound — locally, no extra messages.
import { makeAccumulator } from './clock.js';
import { CONFIG } from './config.js';
import { createMatch, stepMatch, snapshot, matchGuard, matchTeleport, matchKill } from './mpsim.js';
import { clockText, powerPct } from './hudfmt.js';

const doorOf = (node) => (node === 'DOOR_L' ? 'L' : node === 'DOOR_R' ? 'R' : null);
const SNAP_INTERVAL = 0.08; // ~12 snapshots/sec
// A worker that just fires a tick message on an interval — its timers are NOT throttled when the
// host's tab is in the background, unlike main-thread rAF/setInterval.
const TICK_WORKER_SRC = "let h=null;onmessage=function(e){if(e.data&&e.data.hz){clearInterval(h);h=setInterval(function(){postMessage(1);},1000/e.data.hz);}else if(e.data==='stop'){clearInterval(h);}};";

export function createMpGame({ world, overlay, animHud, audio, net, isHost, myId, assignments, night, onEnd }) {
  const myRole = (assignments.find(a => a.id === myId) || {}).role || 'guard';
  const isGuard = myRole === 'guard';
  let match = isHost ? createMatch(night, assignments) : null;
  let lastSnap = isHost ? snapshot(match) : null;
  const acc = makeAccumulator(CONFIG.ai.tickHz);
  let snapTimer = 0, ended = false, finished = false, ending = false;
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const TELL = audio ? { har: () => audio.harTell(), gi: () => audio.giTell(), cluck: () => audio.cluckTell(), arg: () => audio.argTell() } : {};
  let worker = null, workerUrl = null, lastTick = 0;
  let prevA = null; // last snapshot we played audio against

  function applyInput(fromId, msg) {
    if (!isHost || !match || match.phase !== 'playing') return;
    if (msg.t === 'guard' && fromId === match.guardId) matchGuard(match, msg.kind, msg.payload);
    else if (msg.t === 'tp') matchTeleport(match, fromId, msg.node);
    else if (msg.t === 'kill') matchKill(match, fromId);
  }
  function sendInput(msg) { if (isHost) applyInput(myId, msg); else net.send({ type: 'input', ...msg }); }

  function onMessage(fromId, msg) {
    if (!msg) return;
    if (isHost && msg.type === 'input') applyInput(fromId, msg);
    else if (!isHost && msg.type === 'snap') lastSnap = msg.snap;
    else if (!isHost && msg.type === 'matchOver') { lastSnap = msg.snap; finish(msg.snap); }
  }

  // Host stepping — driven by the worker tick so it survives a backgrounded tab.
  function hostStep() {
    if (!match) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    let dt = lastTick ? (now - lastTick) / 1000 : acc.step;
    lastTick = now; dt = Math.min(0.25, dt);
    const n = acc.feed(dt);
    for (let i = 0; i < n && match.phase === 'playing'; i++) stepMatch(match, acc.step);
    lastSnap = snapshot(match);
    snapTimer += dt;
    if (snapTimer >= SNAP_INTERVAL || match.phase !== 'playing') { snapTimer = 0; net.broadcast({ type: 'snap', snap: lastSnap }); }
    if (match.phase !== 'playing' && !ended) { ended = true; net.broadcast({ type: 'matchOver', snap: lastSnap }); finish(lastSnap); }
  }

  function frame(dt) { render(dt); } // stepping is worker-driven on the host; clients just render

  function render(dt) {
    if (!lastSnap) return;
    if (!ending) stepAudio(lastSnap);
    world.dimForPower(Math.max(0, (lastSnap.power || 0) / 100));
    // While the end cinematic plays we keep rendering the guard's office so the jumpscare/power-out
    // animation runs, but freeze the HUD/anim-HUD (it's hidden anyway).
    if (isGuard) { world.render(guardStateFrom(lastSnap), dt); if (!ending) overlay.updateHUD(guardHud(lastSnap)); }
    else { world.renderAnimView(lastSnap, myRole, dt); if (!ending) animHud.update(lastSnap, myRole); }
  }

  // Play sounds for whatever changed since we last looked.
  function stepAudio(snap) {
    if (!audio) return;
    const p = prevA;
    if (p) {
      for (const s of ['L', 'R']) {
        if (snap.doors[s] !== p.doors[s]) audio.oneShot(snap.doors[s] ? 'doorSlam' : 'doorOpen');
        if (snap.lights[s] !== p.lights[s]) audio.oneShot('lightClick');
      }
      if (snap.monitorUp !== p.monitorUp) audio.oneShot('monitorWhir');
      if (snap.monitorUp && snap.activeCam !== p.activeCam) { audio.oneShot('camBlip'); world.staticBurst && world.staticBurst(); }
      for (const nm in snap.anims) {
        const a = snap.anims[nm], pa = p.anims[nm] || {};
        if (a.atDoor && !pa.atDoor && TELL[nm]) TELL[nm]();              // arrived at a door
        if (a.killTimer > 0 && !(pa.killTimer > 0)) audio.oneShot('lowPowerWarn'); // kill started
        if (nm === myRole && a.node !== pa.node) audio.oneShot('monitorWhir');     // my own teleport
      }
      if (snap.power <= CONFIG.audio.lowPowerWarnAt && p.power > CONFIG.audio.lowPowerWarnAt) audio.oneShot('lowPowerWarn');
      for (const key in (snap.jam || {})) if (!(p.jam && p.jam[key])) audio.oneShot('lowPowerWarn'); // a control just jammed
    }
    const anims = {};
    for (const nm in snap.anims) anims[nm] = { node: snap.anims[nm].node, atDoor: snap.anims[nm].atDoor, killTimer: snap.anims[nm].killTimer };
    prevA = { doors: { ...snap.doors }, lights: { ...snap.lights }, monitorUp: snap.monitorUp, activeCam: snap.activeCam, power: snap.power, anims, jam: { ...(snap.jam || {}) } };
  }

  function guardStateFrom(snap) {
    const animatronics = {};
    for (const nm in snap.anims) {
      const an = snap.anims[nm], sd = doorOf(an.node);
      animatronics[nm] = { room: sd ? 'DOOR_' + sd : an.node, atDoor: an.atDoor, emergence: 0, committed: false, transit: 0, pathIndex: 0, moveTimer: 0, doorTimer: 0, difficulty: 0 };
    }
    return { monitorUp: snap.monitorUp, activeCam: snap.activeCam, doors: snap.doors, lights: snap.lights, flashlight: { on: snap.flashOn, charge: snap.flashPct }, power: snap.power, animatronics };
  }
  function guardHud(snap) {
    const sl = { clockMinutes: snap.clockMinutes, power: snap.power };
    return { powerPct: powerPct(sl), usageLoad: snap.usageLoad, clockText: clockText(sl), night, flashlightPct: Math.round(snap.flashPct), camLabel: snap.monitorUp ? snap.activeCam : '—', monitorUp: snap.monitorUp, activeCam: snap.activeCam, doors: snap.doors, lights: snap.lights, jam: snap.jam || {}, cd: snap.cd || {} };
  }

  function stopWorker() { if (worker) { try { worker.postMessage('stop'); worker.terminate(); } catch (e) {} worker = null; } if (workerUrl) { try { URL.revokeObjectURL(workerUrl); } catch (e) {} workerUrl = null; } }

  // End-of-match cinematic. If I'm the guard and I lost, play the real scare on the canvas (the
  // creature's jumpscare, or — on a power-out — Har's eyes + music-box dread + Har's jumpscare,
  // mirrored from single-player). Everyone else just gets the win/lose sound. `ending` keeps the
  // render loop alive (isActive stays true) so the animation runs; `finished` flips only when done.
  function finish(snap) {
    if (ending) return; ending = true;
    stopWorker();
    runEndCinematic(snap);
  }
  async function runEndCinematic(snap) {
    const guardLost = !!(snap && snap.winner === 'animatronics');
    if (isGuard && guardLost) {
      overlay.hideAllScreens(); // drop the HUD so the canvas scare is clean
      if (snap.byPowerOut) {
        if (world.showPowerOutEyes) world.showPowerOutEyes();              // Har looms at the left door
        if (audio && audio.powerOutSequence) await audio.powerOutSequence(CONFIG.powerout); // march in the dark
        await wait(CONFIG.powerout.quietMs);                               // dead silence
        if (world.clearPowerOutEyes) world.clearPowerOutEyes();
      }
      if (audio) audio.oneShot('jumpscare');
      if (world.playJumpscare) await world.playJumpscare(snap.killerRole || 'har');
    } else {
      if (audio) audio.oneShot(snap && snap.winner === 'guard' ? 'winChime' : 'jumpscare');
      await wait(250);
    }
    finished = true; // now the render loop can stop; hand off to the match-over screen
    animHud.hide();
    onEnd && onEnd(snap, myRole);
  }

  return {
    isGuard, myRole,
    start() {
      if (audio) { audio.resume(); audio.startAmbient(); }
      if (isGuard) overlay.showPlaying(); else animHud.show(myRole);
      if (isHost) {
        try {
          workerUrl = URL.createObjectURL(new Blob([TICK_WORKER_SRC], { type: 'application/javascript' }));
          worker = new Worker(workerUrl);
          worker.onmessage = hostStep;
          worker.postMessage({ hz: CONFIG.ai.tickHz * 2 });
        } catch (e) { worker = null; } // if workers are unavailable, frame()/rAF fallback below covers it
      }
    },
    frame(dt) { if (isHost && !worker && match) hostStep(); frame(dt); }, // rAF fallback if no worker
    onMessage,
    guardInput: (kind, payload) => sendInput({ t: 'guard', kind, payload }),
    teleport: (node) => sendInput({ t: 'tp', node }),
    kill: () => sendInput({ t: 'kill' }),
    desiredMonitor: () => !!(lastSnap && lastSnap.monitorUp),
    isActive: () => !finished,
  };
}
