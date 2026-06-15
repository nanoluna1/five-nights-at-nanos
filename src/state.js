import { CONFIG } from './config.js';

export function createGameState(night) {
  const diff = CONFIG.ai.difficulty[night];
  const animatronics = {};
  for (const [name, c] of Object.entries(CONFIG.ai.creatures)) {
    animatronics[name] = {
      room: c.start,        // current camera room id
      pathIndex: 0,         // index into c.path (0 = start)
      difficulty: diff[name],
      moveTimer: 0,         // accumulates toward moveRollEverySec
      atDoor: null,         // 'L' | 'R' when lurking right outside that door
      doorTimer: 0,         // seconds spent at the door (vs doorGraceSec)
      emergence: 0,         // Arg's cove meter (0-100); unused by others
    };
  }
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
    animatronics,
  };
}
