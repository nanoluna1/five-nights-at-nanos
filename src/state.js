import { CONFIG } from './config.js';

export function createGameState(night) {
  const diff = CONFIG.ai.difficulty[night];
  return {
    phase: 'nightStart',
    night,
    clockMinutes: 0,          // 0 = 12 AM; 360 logical units span the night (1/sec)
    power: 100,
    usageLoad: 0,
    flashlight: { on: false, charge: 100 },
    doors: { L: false, R: false },
    lights: { L: false, R: false },
    monitorUp: false,
    activeCam: 'CAM1A',
    pendingScare: null,        // name of animatronic that has triggered a scare, or null
    animatronics: {
      har: { room: 'CAM1A', pathIndex: 0, difficulty: diff.har, moveTimer: 0, atDoor: null },
    },
  };
}
