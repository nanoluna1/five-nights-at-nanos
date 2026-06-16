import { CONFIG } from './config.js';

// Effective difficulty on the 0-20 scale; Har presses harder when power runs low.
function effectiveDifficulty(state, name, c) {
  let d = state.animatronics[name].difficulty;
  if (c.lowPowerBoost && state.power < CONFIG.ai.harLowPowerThreshold) d += CONFIG.ai.harLowPowerBoost;
  return Math.min(20, d);
}

// A creature lurking at its door: shutting that door in time repels it; leaving the door
// open past doorGraceSec lets it in (scare). This is the core door-defense window.
function resolveAtDoor(state, name, c, seconds) {
  const a = state.animatronics[name];
  a.doorTimer += seconds;
  if (state.doors[c.side]) {                 // shut in time -> retreat
    a.atDoor = null; a.doorTimer = 0;
    if (c.cove) { a.emergence = 0; a.committed = false; a.transit = 0; a.room = c.start; a.pathIndex = 0; }
    // Walkers retreat ALL the way back to the start of their path (was: back to the last hall
    // room, where they'd re-appear at the door on the next roll and camp there draining power).
    // Now closing the door buys real breathing room — they have to walk the whole route again.
    else { a.pathIndex = 0; a.room = c.start; a.moveTimer = 0; }
    return;
  }
  if (a.doorTimer >= c.doorGraceSec) state.pendingScare = name; // lingered with door open
}

// Arg: fills a cove "emergence" meter while CAM7 is NOT watched (drains while watched). The
// meter drives 4 visual cove stages. At 100 he COMMITS — leaves the cove (stage 4: empty +
// "out of order" sign) and, after argSprintDelaySec, arrives at the door. Once committed,
// watching no longer pulls him back; only shutting the door when he arrives saves you.
function stepArg(state, a, c, seconds) {
  if (a.committed) {
    a.transit += seconds;
    if (a.transit >= CONFIG.ai.argSprintDelaySec) { a.atDoor = c.side; a.room = 'DOOR_' + c.side; a.doorTimer = 0; a.committed = false; }
    return;
  }
  const watched = state.monitorUp && state.activeCam === c.start; // c.start === 'CAM7'
  if (watched) {
    // Looking at the cove HOLDS him at his current stage (deters further emergence). He never
    // recedes while you watch — the cam just shows whatever stage he's already at. He only
    // advances while the cove is unwatched.
  } else {
    const fill = CONFIG.ai.argEmergenceFillBasePerSec * (0.5 + a.difficulty / 20);
    a.emergence = Math.min(100, a.emergence + fill * seconds);
  }
  // At 100 he leaves the cove (stage 4: empty + "out of order") and is seen SPRINTING down his
  // side's hall toward the office until he reaches the door.
  if (a.emergence >= 100) { a.committed = true; a.transit = 0; a.room = c.side === 'L' ? 'CAM2' : 'CAM4'; }
}

// Advance all AI by `seconds`. rng() -> [0,1). Walking creatures roll to advance one room
// every moveRollEverySec (success when rng()*20 < effectiveDifficulty); Arg uses the meter.
export function stepAI(state, seconds, rng) {
  for (const [name, c] of Object.entries(CONFIG.ai.creatures)) {
    const a = state.animatronics[name];

    if (a.atDoor) { resolveAtDoor(state, name, c, seconds); continue; }
    if (c.cove) { stepArg(state, a, c, seconds); continue; }

    a.moveTimer += seconds;
    if (a.moveTimer < CONFIG.ai.moveRollEverySec) continue;
    a.moveTimer = 0;
    if (rng() * 20 >= effectiveDifficulty(state, name, c)) continue; // failed roll this interval

    a.pathIndex++;
    if (a.pathIndex >= c.path.length) { a.atDoor = c.side; a.room = 'DOOR_' + c.side; a.doorTimer = 0; }
    else a.room = c.path[a.pathIndex];
  }
}
