import { CONFIG } from './config.js';

// usageLoad = number of simultaneously active power draws; drives both the drain
// rate and the 4-bar HUD indicator. Flashlight has its own budget but also adds load.
export function recomputeUsage(state) {
  let load = 0;
  if (state.doors.L) load++;
  if (state.doors.R) load++;
  if (state.lights.L) load++;
  if (state.lights.R) load++;
  if (state.monitorUp) load++;
  if (state.flashlight.on) load++;
  state.usageLoad = load;
}

// Returns true if this drain triggered a shutdown (power hit 0). `rates` optionally overrides the
// per-second base/per-unit drain (multiplayer passes its own, more forgiving values).
export function drainPower(state, seconds, rates) {
  const base = rates ? rates.base : CONFIG.power.drainBasePerSec;
  const perUnit = rates ? rates.perUnit : CONFIG.power.drainPerUnitPerSec;
  const rate = base + state.usageLoad * perUnit;
  state.power = Math.max(0, state.power - rate * seconds);
  if (state.flashlight.on) {
    state.flashlight.charge = Math.max(0, state.flashlight.charge - CONFIG.flashlight.drainPerSec * seconds);
    if (state.flashlight.charge === 0) state.flashlight.on = false; // beam dies on empty
  }
  return state.power === 0;
}
