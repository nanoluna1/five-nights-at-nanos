// Pure host-authoritative match simulation for multiplayer. No DOM, no network — the host steps
// this and broadcasts snapshot()s; clients render from those. Reuses the single-player power/clock
// modules so the economy and timing match the solo game. Unit-tested (tests/mpsim.test.js).
import { CONFIG } from './config.js';
import { recomputeUsage, drainPower } from './power.js';
import { advanceClock, clockHour } from './clock.js';

// Teleport nodes the animatronics hop between (positions are % of the mini-map). The two DOOR
// nodes are the office approach; reaching one lets that player start a KILL.
export const NODES = [
  { id: 'CAM1A', label: 'Stage', x: 24, y: 14 },
  { id: 'CAM1B', label: 'Dining', x: 55, y: 14 },
  { id: 'CAM7', label: 'Cove', x: 82, y: 40 },
  { id: 'CAM2', label: 'Left Hall', x: 24, y: 40 },
  { id: 'CAM4', label: 'Right Hall', x: 66, y: 40 },
  { id: 'CAM3', label: 'Closet', x: 15, y: 66 },
  { id: 'DOOR_L', label: 'Left Door', x: 40, y: 88 },
  { id: 'DOOR_R', label: 'Right Door', x: 62, y: 88 },
];
const ROOM_NODES = ['CAM1A', 'CAM1B', 'CAM7', 'CAM2', 'CAM4', 'CAM3'];
const START_NODE = { har: 'CAM1A', gi: 'CAM2', cluck: 'CAM1B', arg: 'CAM7' };

export const KILL_TIME = 5.0;     // seconds at the door before the strike lands (guard's window)
export const TELEPORT_CD = 4.0;   // cooldown between teleports
export const REPEL_CD = 6.0;      // longer cooldown after the guard slams the door on you

function doorOf(node) { return node === 'DOOR_L' ? 'L' : node === 'DOOR_R' ? 'R' : null; }

// assignments: [{ id, name, role }]. Exactly one 'guard'; the rest are animatronics.
export function createMatch(night, assignments) {
  const guard = (assignments || []).find(a => a.role === 'guard');
  const anims = {};
  for (const a of (assignments || [])) {
    if (a.role === 'guard') continue;
    anims[a.role] = { id: a.id, name: a.name, node: START_NODE[a.role] || 'CAM1A', cooldown: 0, atDoor: null, killTimer: 0 };
  }
  return {
    night,
    guardId: guard ? guard.id : null,
    guardName: guard ? guard.name : null,
    state: {
      power: 100, usageLoad: 0,
      doors: { L: false, R: false }, lights: { L: false, R: false },
      monitorUp: false, activeCam: 'CAM1A', flashlight: { on: false, charge: 100 },
      clockMinutes: 0,
    },
    anims,
    phase: 'playing',
    winner: null,
    killerName: null,
  };
}

function repelSide(m, side, rand) {
  for (const name of Object.keys(m.anims)) {
    const a = m.anims[name];
    if (a.atDoor === side) {
      a.atDoor = null; a.killTimer = 0;
      a.node = ROOM_NODES[Math.floor((rand ? rand() : Math.random()) * ROOM_NODES.length) % ROOM_NODES.length];
      a.cooldown = REPEL_CD;
    }
  }
}

// Guard input: toggle a door/light, raise/lower the monitor, switch cam, toggle the flashlight.
export function matchGuard(m, kind, payload, rand) {
  if (m.phase !== 'playing') return;
  const s = m.state;
  if (kind === 'door') { const side = payload; s.doors[side] = !s.doors[side]; if (s.doors[side]) repelSide(m, side, rand); }
  else if (kind === 'light') { const side = payload; s.lights[side] = !s.lights[side]; }
  else if (kind === 'monitor') { s.monitorUp = !!payload; if (!s.monitorUp) s.flashlight.on = false; }
  else if (kind === 'cam') { if (s.monitorUp) s.activeCam = payload; }
  else if (kind === 'flash') { if (s.monitorUp) s.flashlight.on = !s.flashlight.on && s.flashlight.charge > 0; }
}

// Animatronic teleports to a node (if off cooldown). Reaching a DOOR arms it for a kill; leaving
// a door cancels any kill in progress.
export function matchTeleport(m, animId, node, rand) {
  if (m.phase !== 'playing') return false;
  const name = Object.keys(m.anims).find(n => m.anims[n].id === animId);
  if (!name) return false;
  const a = m.anims[name];
  if (a.cooldown > 0) return false;
  if (!NODES.some(nd => nd.id === node)) return false;
  a.node = node; a.cooldown = TELEPORT_CD;
  const side = doorOf(node);
  if (side) a.atDoor = side; else { a.atDoor = null; a.killTimer = 0; }
  return true;
}

// Animatronic presses KILL at a door -> the strike timer starts (guard must shut that door).
export function matchKill(m, animId) {
  if (m.phase !== 'playing') return false;
  const name = Object.keys(m.anims).find(n => m.anims[n].id === animId);
  if (!name) return false;
  const a = m.anims[name];
  if (!a.atDoor || a.killTimer > 0) return false;
  a.killTimer = KILL_TIME;
  return true;
}

export function stepMatch(m, dt) {
  if (m.phase !== 'playing') return;
  const s = m.state;
  recomputeUsage(s);
  const shutdown = drainPower(s, dt, { base: CONFIG.power.mpBasePerSec, perUnit: CONFIG.power.mpPerUnitPerSec });
  advanceClock(s, dt);
  for (const name of Object.keys(m.anims)) {
    const a = m.anims[name];
    if (a.cooldown > 0) a.cooldown = Math.max(0, a.cooldown - dt);
    if (a.killTimer > 0) {
      // a closed door on that side would have repelled already; if still open at 0 -> they win
      a.killTimer -= dt;
      if (a.killTimer <= 0) {
        if (a.atDoor && !s.doors[a.atDoor]) { m.phase = 'over'; m.winner = 'animatronics'; m.killerName = a.name; return; }
        a.killTimer = 0; // door shut in time (belt-and-suspenders; repel usually handles it)
      }
    }
  }
  if (shutdown) { m.phase = 'over'; m.winner = 'animatronics'; m.killerName = 'the dark'; return; }
  if (clockHour(s) >= 6) { m.phase = 'over'; m.winner = 'guard'; }
}

// Serializable view for clients (and for rendering on the host).
export function snapshot(m) {
  const s = m.state;
  const anims = {};
  for (const name of Object.keys(m.anims)) {
    const a = m.anims[name];
    anims[name] = { node: a.node, atDoor: a.atDoor, killTimer: +a.killTimer.toFixed(2), cooldown: +a.cooldown.toFixed(2) };
  }
  return {
    clockMinutes: s.clockMinutes, power: s.power, usageLoad: s.usageLoad,
    doors: { ...s.doors }, lights: { ...s.lights }, monitorUp: s.monitorUp, activeCam: s.activeCam,
    flashOn: s.flashlight.on, flashPct: s.flashlight.charge,
    anims, phase: m.phase, winner: m.winner, killerName: m.killerName,
  };
}
