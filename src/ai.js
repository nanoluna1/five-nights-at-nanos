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
    if (c.cove) { a.emergence = 0; a.room = c.start; a.pathIndex = 0; }
    else { a.pathIndex = c.path.length - 1; a.room = c.path[a.pathIndex]; }
    return;
  }
  if (a.doorTimer >= c.doorGraceSec) state.pendingScare = name; // lingered with door open
}

// Arg: fills a cove "emergence" meter while CAM7 is NOT being watched, drains it while you
// watch. At 100 he sprints his side's hall to the door. Punishes camera neglect.
function stepArg(state, a, c, seconds) {
  const watched = state.monitorUp && state.activeCam === c.start; // c.start === 'CAM7'
  if (watched) {
    a.emergence = Math.max(0, a.emergence - CONFIG.ai.argEmergenceRecoverPerSec * seconds);
  } else {
    const fill = CONFIG.ai.argEmergenceFillBasePerSec * (0.5 + a.difficulty / 20);
    a.emergence = Math.min(100, a.emergence + fill * seconds);
  }
  if (a.emergence >= 100) { a.atDoor = c.side; a.room = 'DOOR_' + c.side; a.doorTimer = 0; }
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
