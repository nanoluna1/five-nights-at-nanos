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
