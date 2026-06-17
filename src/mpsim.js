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
const START_NODE = 'CAM1A'; // everyone starts on the show stage

// Teleport adjacency — you can only hop to a NEIGHBOURING dot (1 dot at a time). Symmetric graph;
// the office doors hang off the halls, so you can't jump stage->door or door->door directly. The
// minimum route to a door is Stage -> Dining -> Hall -> Door (3 hops).
export const ADJ = {
  CAM1A:  ['CAM1B'],                          // Stage -> Dining
  CAM1B:  ['CAM1A', 'CAM2', 'CAM4', 'CAM7'],  // Dining (hub)
  CAM7:   ['CAM1B', 'CAM4'],                  // Cove
  CAM2:   ['CAM1B', 'CAM3', 'DOOR_L'],        // Left Hall
  CAM4:   ['CAM1B', 'CAM7', 'DOOR_R'],        // Right Hall
  CAM3:   ['CAM2'],                           // Closet
  DOOR_L: ['CAM2'],                           // Left Door (office)
  DOOR_R: ['CAM4'],                           // Right Door (office)
};

export const KILL_TIME = 5.0;     // seconds at the door before the strike lands (guard's window)
export const TELEPORT_CD = 6.0;   // cooldown between teleports (longer)
export const REPEL_CD = 9.0;      // a slammed door sends you back to the stage with a long cooldown

// Doors & lights have a per-control cooldown: after you toggle one, that same control ignores
// input for DOORLIGHT_CD seconds — so a guard can't machine-gun the doors/lights. Cameras are
// exempt (switch/raise freely). This is the active anti-spam limiter.
export const DOORLIGHT_CD = 1.5;
// Legacy backstop (kept on doors/lights, removed from cams): toggling a control SPAM_LIMIT times
// within SPAM_WINDOW seconds jams it for JAM_TIME seconds. With the cooldown above you can't fit
// SPAM_LIMIT toggles into the window anymore, so this rarely/never fires now — it's a safety net.
export const SPAM_LIMIT = 20;
export const SPAM_WINDOW = 15;
export const JAM_TIME = 15;

function doorOf(node) { return node === 'DOOR_L' ? 'L' : node === 'DOOR_R' ? 'R' : null; }

// assignments: [{ id, name, role }]. Exactly one 'guard'; the rest are animatronics.
export function createMatch(night, assignments) {
  const guard = (assignments || []).find(a => a.role === 'guard');
  const anims = {};
  for (const a of (assignments || [])) {
    if (a.role === 'guard') continue;
    anims[a.role] = { id: a.id, name: a.name, node: START_NODE, cooldown: 0, atDoor: null, killTimer: 0 };
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
    elapsed: 0,    // seconds since the match began (drives cooldowns + the spam window)
    spam: {},      // per-control: { count, windowStart }
    jamUntil: {},  // per-control: elapsed time the jam ends
    ctrlCd: {},    // per door/light control: elapsed time its cooldown ends
    phase: 'playing',
    winner: null,
    killerName: null,
  };
}

function repelSide(m, side) {
  for (const name of Object.keys(m.anims)) {
    const a = m.anims[name];
    if (a.atDoor === side) { a.atDoor = null; a.killTimer = 0; a.node = 'CAM1A'; a.cooldown = REPEL_CD; } // back to the stage
  }
}

// The control a guard input belongs to for spam/jam/cooldown tracking. Doors + lights are per-side.
// Cameras (raise/lower + switch) and the flashlight are exempt — they have no cooldown or jam.
function controlKey(kind, payload) {
  if (kind === 'door') return 'door' + payload;
  if (kind === 'light') return 'light' + payload;
  return null;
}

// Guard input: toggle a door/light, raise/lower the monitor, switch cam, toggle the flashlight.
// A control that's currently jammed (over-spammed) ignores input until the jam clears.
export function matchGuard(m, kind, payload) {
  if (m.phase !== 'playing') return;
  const s = m.state;
  const key = controlKey(kind, payload); // null for cameras/flashlight (exempt)
  if (key) {
    if ((m.jamUntil[key] || 0) > m.elapsed) return;  // jammed — input rejected (legacy backstop)
    if ((m.ctrlCd[key] || 0) > m.elapsed) return;    // still cooling down — rate-limited, ignore
    const sp = m.spam[key] || (m.spam[key] = { count: 0, windowStart: m.elapsed });
    if (m.elapsed - sp.windowStart > SPAM_WINDOW) { sp.windowStart = m.elapsed; sp.count = 0; }
    sp.count++;
    if (sp.count >= SPAM_LIMIT) { m.jamUntil[key] = m.elapsed + JAM_TIME; sp.count = 0; sp.windowStart = m.elapsed; return; } // jam now, block this action
    m.ctrlCd[key] = m.elapsed + DOORLIGHT_CD; // start this control's cooldown
  }
  if (kind === 'door') { const side = payload; s.doors[side] = !s.doors[side]; if (s.doors[side]) repelSide(m, side); }
  else if (kind === 'light') { const side = payload; s.lights[side] = !s.lights[side]; }
  else if (kind === 'monitor') { s.monitorUp = !!payload; if (!s.monitorUp) s.flashlight.on = false; }
  else if (kind === 'cam') { if (s.monitorUp) s.activeCam = payload; }
  else if (kind === 'flash') { if (s.monitorUp) s.flashlight.on = !s.flashlight.on && s.flashlight.charge > 0; }
}

// Animatronic teleports to a NEIGHBOURING node (if off cooldown). Reaching a DOOR arms it for a
// kill; leaving a door cancels any kill in progress.
export function matchTeleport(m, animId, node) {
  if (m.phase !== 'playing') return false;
  const name = Object.keys(m.anims).find(n => m.anims[n].id === animId);
  if (!name) return false;
  const a = m.anims[name];
  if (a.cooldown > 0) return false;
  if (!(ADJ[a.node] || []).includes(node)) return false; // 1 dot at a time — neighbours only
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
  m.elapsed += dt;
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
  const jam = {}, cd = {};
  for (const key of ['doorL', 'doorR', 'lightL', 'lightR', 'cam']) {
    const rem = (m.jamUntil[key] || 0) - m.elapsed;
    if (rem > 0) jam[key] = +rem.toFixed(1);
  }
  for (const key of ['doorL', 'doorR', 'lightL', 'lightR']) {
    const rem = (m.ctrlCd[key] || 0) - m.elapsed;
    if (rem > 0) cd[key] = +rem.toFixed(1);
  }
  return {
    clockMinutes: s.clockMinutes, power: s.power, usageLoad: s.usageLoad,
    doors: { ...s.doors }, lights: { ...s.lights }, monitorUp: s.monitorUp, activeCam: s.activeCam,
    flashOn: s.flashlight.on, flashPct: s.flashlight.charge,
    anims, jam, cd, phase: m.phase, winner: m.winner, killerName: m.killerName,
  };
}
