export const CONFIG = {
  clock: {
    nightSeconds: 360,        // 6 real minutes/night = 60s per in-game hour; genre-standard pacing
  },
  power: {
    drainBasePerSec: 0.25,    // idle drain: doing nothing still slowly loses, forcing eventual action
    drainPerUnitPerSec: 0.30, // each active door/light/cam; ~4 simultaneous drains ≈ classic burn rate
  },
  flashlight: {
    drainPerSec: 4.0,         // separate budget from main power; punishes holding the beam on
  },
  ai: {
    tickHz: 10,               // logic ticks/sec; AI move-rolls happen on this cadence
    moveRollEverySec: 5,      // a creature attempts to advance every 5s (rolls vs difficulty)
    difficulty: {             // per-night, 0-20. Slice 1 only reads `har`.
      1: { har: 0,  gi: 2,  cluck: 0, arg: 2 },
      2: { har: 2,  gi: 4,  cluck: 3, arg: 4 },
      3: { har: 4,  gi: 6,  cluck: 8, arg: 6 },   // Cluck mid-night spike (Slice 2)
      4: { har: 8,  gi: 9,  cluck: 9, arg: 9 },
      5: { har: 14, gi: 12, cluck: 12, arg: 12 }, // relentless
    },
    harLowPowerBoost: 6,      // added to Har's effective difficulty while power < lowPowerThreshold
    harLowPowerThreshold: 30, // % power below which Har gets more aggressive (punishes low power)
  },
  audio: {
    lowPowerWarnAt: 25,       // % power that triggers the warning sting + UI flicker
  },
  rooms: {
    // Har's path from stage to the office; index = how close. Slice-1 single path.
    harPath: ['CAM1A', 'CAM1B', 'CAM3', 'OFFICE'],
  },
};
