export const CONFIG = {
  clock: {
    nightSeconds: 360,        // 6 real minutes/night = 60s per in-game hour; genre-standard pacing
  },
  power: {
    drainBasePerSec: 0.05,    // idle drain: doing nothing barely loses (you can coast on near-zero usage)
    drainPerUnitPerSec: 0.18, // each active door/light/cam. Tuned DOWN (was 0.25 base / 0.30 unit) so a
                              // single active bar comfortably lasts the full night; stacking 3-4 still burns out.
  },
  flashlight: {
    drainPerSec: 4.0,         // separate budget from main power; punishes holding the beam on
  },
  ai: {
    tickHz: 10,               // logic ticks/sec; AI move-rolls happen on this cadence
    moveRollEverySec: 5,      // a creature attempts to advance every 5s (rolls vs difficulty)
    difficulty: {             // per-night, 0-20 (chance gate on each move roll = d/20)
      1: { har: 0,  gi: 2,  cluck: 2,  arg: 2 },   // Cluck now actually participates (was 0 = never moved)
      2: { har: 2,  gi: 4,  cluck: 5,  arg: 4 },
      3: { har: 4,  gi: 6,  cluck: 9,  arg: 6 },   // Cluck mid-week spike
      4: { har: 8,  gi: 9,  cluck: 11, arg: 9 },
      5: { har: 14, gi: 12, cluck: 14, arg: 12 },  // relentless
    },
    harLowPowerBoost: 6,      // added to Har's effective difficulty while power < lowPowerThreshold
    harLowPowerThreshold: 30, // % power below which Har gets more aggressive (punishes low power)

    // Per-creature topology. `path` is the sequence of camera rooms a creature walks;
    // after its last room it is "at the door" on `side`, where the player must shut that
    // door (or it enters → scare). `doorGraceSec` is how long it lingers at the door before
    // striking — the player gets an arrival tell (per-creature SFX in main.js) + the door/window
    // light reveal as the cue, then this window to react. Gi is the fast aggressor (shortest
    // window of the walkers); Arg's cove sprint still gives the least time overall.
    // Left side = Har + Gi; right side = Cluck + Arg. CAM2 = left hall, CAM4 = right hall.
    // Tuned UP (was har 3 / gi 2 / cluck 3 / arg 1.5) — at-door felt like an instakill.
    creatures: {
      har:   { side: 'L', start: 'CAM1A', path: ['CAM1A', 'CAM1B', 'CAM2'], doorGraceSec: 5.0, lowPowerBoost: true },
      gi:    { side: 'L', start: 'CAM1A', path: ['CAM1A', 'CAM2'],          doorGraceSec: 4.0 },
      cluck: { side: 'R', start: 'CAM1B', path: ['CAM1B', 'CAM1A', 'CAM4'], doorGraceSec: 5.0 },
      arg:   { side: 'R', start: 'CAM7', cove: true,                        doorGraceSec: 3.0 },
    },
    // Arg's cove "emergence" meter (0-100): fills while CAM7 is NOT being watched, drains
    // while you watch it. At 100 he sprints the right hall. Fill scales with difficulty so
    // later nights punish camera neglect harder. This is why watching the cove matters.
    // Tuned DOWN (was 4.0 fill / 14 recover) — he was emerging far too often.
    argEmergenceFillBasePerSec: 2.2,
    // Watching the cove now only EASES him back gently (was 18 = a near-instant reset to stage 0,
    // which the player hated). He never snaps backward; you just deter further emergence and the
    // cam always shows his real current stage.
    argEmergenceRecoverPerSec: 3.0,
    argWarnAt: 68,            // emergence % at which his running-footsteps tell plays ("he's coming")
    // Cove emergence visual stages (by emergence %): 1 closed, 2 parted, 3 out-as-figure.
    // At 100 he COMMITS (stage 4: empty cove + "out of order" sign) and, after a delay, sprints.
    argStage2At: 30,
    argStage3At: 60,
    argSprintDelaySec: 12,    // after he leaves the cove (stage 4), seconds before he hits the door
  },
  // Window check: when a creature is at a side's door, flicking that side's light reveals it
  // peeking in that side's window. revealAtDoorOnly keeps it a real "blind-spot" check.
  windows: { revealAtDoorOnly: true },
  // Hover-to-open cameras. Mouse in the bottom `raiseZone` fraction raises the monitor;
  // it lowers once the mouse moves above `lowerZone`. The gap between them is hysteresis so
  // the monitor never flickers at the boundary.
  cameras: {
    raiseZone: 0.86,  // raise when mouse Y / height > this (bottom ~14% of screen)
    lowerZone: 0.70,  // lower when mouse Y / height < this; gap to raiseZone = no-flicker band
  },
  // Power-out sequence beats (ms): everything dies → a tinny music-box march plays in the dark
  // (Har's eyes glowing/pulsing on the LEFT door) → the march fades → dead silence → the strike.
  // The jumpscare fires the instant the silence ends, in lockstep with its sound.
  powerout: {
    dieMs: 600,        // doors/lights cut, screen falls dark
    songMs: 4500,      // music-box march in the dark (Toreador-style), fading out at the end
    quietMs: 4000,     // dead silence after the march before Har strikes (eyes still pulsing)
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
