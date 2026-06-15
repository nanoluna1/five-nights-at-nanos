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
    difficulty: {             // per-night, 0-20 (chance gate on each move roll = d/20)
      1: { har: 0,  gi: 2,  cluck: 0, arg: 2 },
      2: { har: 2,  gi: 4,  cluck: 3, arg: 4 },
      3: { har: 4,  gi: 6,  cluck: 8, arg: 6 },   // Cluck mid-night spike
      4: { har: 8,  gi: 9,  cluck: 9, arg: 9 },
      5: { har: 14, gi: 12, cluck: 12, arg: 12 }, // relentless
    },
    harLowPowerBoost: 6,      // added to Har's effective difficulty while power < lowPowerThreshold
    harLowPowerThreshold: 30, // % power below which Har gets more aggressive (punishes low power)

    // Per-creature topology. `path` is the sequence of camera rooms a creature walks;
    // after its last room it is "at the door" on `side`, where the player must shut that
    // door (or it enters → scare). `doorGraceSec` is how long it lingers at the door before
    // striking — Gi is the fast aggressor, Arg's cove sprint gives the least time.
    // Left side = Har + Gi; right side = Cluck + Arg. CAM2 = left hall, CAM4 = right hall.
    creatures: {
      har:   { side: 'L', start: 'CAM1A', path: ['CAM1A', 'CAM1B', 'CAM2'], doorGraceSec: 3.0, lowPowerBoost: true },
      gi:    { side: 'L', start: 'CAM1A', path: ['CAM1A', 'CAM2'],          doorGraceSec: 2.0 },
      cluck: { side: 'R', start: 'CAM1B', path: ['CAM1B', 'CAM1A', 'CAM4'], doorGraceSec: 3.0 },
      arg:   { side: 'R', start: 'CAM7', cove: true,                        doorGraceSec: 1.5 },
    },
    // Arg's cove "emergence" meter (0-100): fills while CAM7 is NOT being watched, drains
    // while you watch it. At 100 he sprints the right hall. Fill scales with difficulty so
    // later nights punish camera neglect harder. This is why watching the cove matters.
    argEmergenceFillBasePerSec: 4.0,
    argEmergenceRecoverPerSec: 14.0,
  },
  // Window check: when a creature is at a side's door, flicking that side's light reveals it
  // peeking in that side's window. revealAtDoorOnly keeps it a real "blind-spot" check.
  windows: { revealAtDoorOnly: true },
  // Hover-to-open cameras. Mouse in the bottom `raiseZone` fraction raises the monitor;
  // it lowers once the mouse moves above `lowerZone`. The gap between them is hysteresis so
  // the monitor never flickers at the boundary.
  cameras: {
    raiseZone: 0.86,  // raise when mouse Y / height > this (bottom ~14% of screen)
    lowerZone: 0.62,  // lower when mouse Y / height < this (top ~62%); gap = no-flicker band
  },
  // Power-out sequence beats (ms): everything dies → silence → music box → face flickers in
  // the dark → final scare. Longer than a blink so the dread can build.
  powerout: {
    dieMs: 700,        // doors/lights cut, screen falls dark
    silenceMs: 1800,   // held silence before the music box
    musicBoxMs: 6500,  // slow original music-box cue
    faceFlickerMs: 2600, // Har's face stutters into view in the dark
  },
  audio: {
    lowPowerWarnAt: 25,       // % power that triggers the warning sting + UI flicker
  },
  rooms: {
    harPath: ['CAM1A', 'CAM1B', 'CAM2'], // retained for any legacy reference; see ai.creatures
  },
  // Phone Guy: a departing guard's recorded handover, played at the start of each night.
  // Original writing (not derived from any existing game). Voice clips can be added later;
  // for now each entry is the lines shown in the dialog box. msPerLine is the auto-advance.
  phone: {
    msPerLine: 5200,
    1: [
      "Uh— hey! Welcome to the night shift at Nano's. Just leaving you a few pointers.",
      "The pizzeria's mascots… they get a little restless after midnight. Don't worry about it.",
      "You've got a door and a light on each side. Flick a light to peek the window; slam the door if something's there.",
      "It all runs on one breaker, so don't leave everything on — watch that power meter.",
      "And keep an eye on the cameras. Especially the cove. You'll be fine. Probably.",
    ],
    2: [
      "Hey, you made it back. Good.",
      "So— the teal one, Gi. She's quick, comes up the left. Don't let her linger at the door.",
      "If you hear clicking on your left, that's your cue. Light, then door.",
      "Power's tighter tonight. Be stingy with it.",
    ],
    3: [
      "Okay, third night. This is the one that gets people.",
      "Cluck works the right side and he gets BOLD around now. That clucking on the right? Move.",
      "And the croc — Arg — he hides in the cove. If you stop watching that camera, he runs. Right at you.",
      "Watch the cove. I mean it.",
    ],
    4: [
      "You're still here. Honestly didn't— anyway.",
      "They're all moving fast now. Har too. He punishes you when the lights get low.",
      "Don't tunnel on the cameras and don't tunnel on the doors. Balance it.",
      "Almost done. Just… keep it together.",
    ],
    5: [
      "Last one. If you clear tonight, you clear the week.",
      "I won't sugarcoat it — they will not let up. Trust the tells, ration the power—",
      "—wait. Is something in the—",
      "…",
    ],
  },
};
