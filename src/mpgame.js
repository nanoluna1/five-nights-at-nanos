// Multiplayer match orchestration. Host-authoritative: the host steps the mpsim and broadcasts
// snapshots; everyone renders from the latest snapshot (the host from its own). The guard reuses
// the single-player world render + overlay HUD; animatronics use the POV render + anim HUD.
import { makeAccumulator } from './clock.js';
import { CONFIG } from './config.js';
import { createMatch, stepMatch, snapshot, matchGuard, matchTeleport, matchKill } from './mpsim.js';
import { clockText, powerPct } from './hudfmt.js';

const doorOf = (node) => (node === 'DOOR_L' ? 'L' : node === 'DOOR_R' ? 'R' : null);
const SNAP_INTERVAL = 0.08; // ~12 snapshots/sec

export function createMpGame({ world, overlay, animHud, net, isHost, myId, assignments, night, onEnd }) {
  const myRole = (assignments.find(a => a.id === myId) || {}).role || 'guard';
  const isGuard = myRole === 'guard';
  let match = isHost ? createMatch(night, assignments) : null;
  let lastSnap = isHost ? snapshot(match) : null;
  const acc = makeAccumulator(CONFIG.ai.tickHz);
  let snapTimer = 0, ended = false, finished = false;

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

  function frame(dt) {
    if (isHost && match) {
      const n = acc.feed(dt);
      for (let i = 0; i < n && match.phase === 'playing'; i++) stepMatch(match, acc.step);
      lastSnap = snapshot(match);
      snapTimer += dt;
      if (snapTimer >= SNAP_INTERVAL || match.phase !== 'playing') { snapTimer = 0; net.broadcast({ type: 'snap', snap: lastSnap }); }
      if (match.phase !== 'playing' && !ended) { ended = true; net.broadcast({ type: 'matchOver', snap: lastSnap }); finish(lastSnap); }
    }
    render(dt);
  }

  function render(dt) {
    if (!lastSnap) return;
    world.dimForPower(Math.max(0, (lastSnap.power || 0) / 100));
    if (isGuard) { world.render(guardStateFrom(lastSnap), dt); overlay.updateHUD(guardHud(lastSnap)); }
    else { world.renderAnimView(lastSnap, myRole, dt); animHud.update(lastSnap, myRole); }
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
    return { powerPct: powerPct(sl), usageLoad: snap.usageLoad, clockText: clockText(sl), night, flashlightPct: Math.round(snap.flashPct), camLabel: snap.monitorUp ? snap.activeCam : '—', monitorUp: snap.monitorUp, activeCam: snap.activeCam, doors: snap.doors, lights: snap.lights };
  }

  function finish(snap) { if (finished) return; finished = true; setTimeout(() => { animHud.hide(); onEnd && onEnd(snap, myRole); }, 250); }

  return {
    isGuard, myRole,
    start() { if (isGuard) overlay.showPlaying(); else animHud.show(myRole); },
    frame, onMessage,
    guardInput: (kind, payload) => sendInput({ t: 'guard', kind, payload }),
    teleport: (node) => sendInput({ t: 'tp', node }),
    kill: () => sendInput({ t: 'kill' }),
    desiredMonitor: () => !!(lastSnap && lastSnap.monitorUp),
    isActive: () => !finished,
  };
}
