import { CONFIG } from './config.js';

// Fixed-timestep accumulator: converts variable frame dt into a whole number of
// logic ticks, carrying the remainder so logic timing is frame-rate-independent.
export function makeAccumulator(hz) {
  const step = 1 / hz;
  let carry = 0;
  return {
    step,
    feed(dt) {
      carry += dt;
      let ticks = 0;
      while (carry >= step) { carry -= step; ticks++; }
      return ticks;
    },
  };
}

// 1 game-second advances the clock by (360 in-game minutes / nightSeconds) so the
// whole 12->6 AM span (6 hours = 360 min) elapses in CONFIG.clock.nightSeconds.
export function advanceClock(state, seconds) {
  const minutesPerSecond = 360 / CONFIG.clock.nightSeconds;
  state.clockMinutes = Math.min(360, state.clockMinutes + seconds * minutesPerSecond);
}

export function clockHour(state) {
  return Math.floor(state.clockMinutes / 60); // 0 = 12 AM ... 6 = 6 AM
}
