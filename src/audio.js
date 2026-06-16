// Audio manager: named one-shots, looping beds with crossfade, per-channel gain buses
// under a master gain, master mute. All sound is synthesized — no files. Every cue is
// triggered by a game event from main.js, never by an internal timer (except the
// power-out chain, which is an explicit scheduled sequence).
export function createAudio() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);

  // Buses: ambience sits low; stinger (jumpscare) is the loudest thing.
  const buses = {};
  for (const [name, vol] of Object.entries({ ambient: 0.35, tells: 0.5, sfx: 0.7, stinger: 1.0, music: 0.5 })) {
    const g = ctx.createGain(); g.gain.value = vol; g.connect(master); buses[name] = g;
  }

  const loops = new Map();

  function noiseBuffer(seconds) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // --- looping ambient bed: low room tone + fan whir + electrical buzz ---
  function startAmbient() {
    if (loops.has('ambient')) return;
    const g = ctx.createGain(); g.gain.value = 0; g.connect(buses.ambient);
    const tone = ctx.createOscillator(); tone.type = 'sine'; tone.frequency.value = 55;
    const buzz = ctx.createOscillator(); buzz.type = 'sawtooth'; buzz.frequency.value = 60;
    const buzzG = ctx.createGain(); buzzG.gain.value = 0.04; buzz.connect(buzzG).connect(g);
    const fan = ctx.createBufferSource(); fan.buffer = noiseBuffer(2); fan.loop = true;
    const fanFilt = ctx.createBiquadFilter(); fanFilt.type = 'lowpass'; fanFilt.frequency.value = 400;
    const fanG = ctx.createGain(); fanG.gain.value = 0.08; fan.connect(fanFilt).connect(fanG).connect(g);
    tone.connect(g);
    tone.start(); buzz.start(); fan.start();
    g.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.5); // fade in
    loops.set('ambient', { g, nodes: [tone, buzz, fan] });
  }

  // --- Har tell: low hum + heavy step (center pan). Called when Har is near. ---
  function harTell() {
    const t = ctx.currentTime;
    const hum = ctx.createOscillator(); hum.type = 'sine'; hum.frequency.value = 48;
    const hg = ctx.createGain(); hg.gain.setValueAtTime(0.0001, t);
    hg.gain.exponentialRampToValueAtTime(0.5, t + 0.3);
    hg.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    hum.connect(hg).connect(buses.tells); hum.start(t); hum.stop(t + 1.5);
    // heavy step thump
    const step = ctx.createOscillator(); step.type = 'sine'; step.frequency.setValueAtTime(90, t);
    step.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    const sg = ctx.createGain(); sg.gain.setValueAtTime(0.6, t); sg.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    step.connect(sg).connect(buses.tells); step.start(t); step.stop(t + 0.3);
  }

  // --- Gi: fast clicking footsteps, panned LEFT (his approach side) ---
  function giTell() {
    const t = ctx.currentTime; const p = ctx.createStereoPanner(); p.pan.value = -0.85; p.connect(buses.tells);
    for (let i = 0; i < 6; i++) {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 880 + Math.random() * 220;
      const g = ctx.createGain(); const st = t + i * 0.085;
      g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.16, st + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.05);
      o.connect(g).connect(p); o.start(st); o.stop(st + 0.06);
    }
  }
  // --- Cluck: distant clucking moan, panned RIGHT ---
  function cluckTell() {
    const t = ctx.currentTime; const p = ctx.createStereoPanner(); p.pan.value = 0.85; p.connect(buses.tells);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(440, t); o.frequency.linearRampToValueAtTime(300, t + 0.5);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(g).connect(p); o.start(t); o.stop(t + 0.75);
  }
  // --- Arg: escalating running footsteps (react now) ---
  function argTell() {
    const t = ctx.currentTime;
    for (let i = 0; i < 8; i++) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer(0.1);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
      const g = ctx.createGain(); const st = t + i * Math.max(0.06, 0.16 - i * 0.012);
      g.gain.setValueAtTime(0.35 + i * 0.05, st); g.gain.exponentialRampToValueAtTime(0.001, st + 0.1);
      src.connect(f).connect(g).connect(buses.tells); src.start(st);
    }
  }

  // --- Phone Guy: a classic two-tone answering-machine ring, then a soft per-line blip ---
  function phoneRing() {
    const t = ctx.currentTime;
    for (let r = 0; r < 2; r++) {
      const st = t + r * 1.0;
      for (const f of [440, 480]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.16, st + 0.04); g.gain.setValueAtTime(0.16, st + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.55); o.connect(g).connect(buses.sfx); o.start(st); o.stop(st + 0.6); }
    }
  }
  function phoneBlip() { const t = ctx.currentTime; const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 520; const g = ctx.createGain(); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); o.connect(g).connect(buses.sfx); o.start(t); o.stop(t + 0.06); }
  // soft UI hover tick for menu rows
  function menuHover() { const t = ctx.currentTime; const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 660; const g = ctx.createGain(); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07); o.connect(g).connect(buses.sfx); o.start(t); o.stop(t + 0.08); }

  function oneShot(name) {
    const t = ctx.currentTime;
    if (name === 'doorSlam') {
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer(0.5);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      src.connect(f).connect(g).connect(buses.sfx); src.start(t);
    } else if (name === 'doorOpen') {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(300, t + 0.3);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g).connect(buses.sfx); o.start(t); o.stop(t + 0.4);
    } else if (name === 'lightClick') {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 800;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      o.connect(g).connect(buses.sfx); o.start(t); o.stop(t + 0.07);
    } else if (name === 'monitorWhir') {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(200, t);
      o.frequency.linearRampToValueAtTime(420, t + 0.25);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g).connect(buses.sfx); o.start(t); o.stop(t + 0.32);
    } else if (name === 'camBlip') {
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer(0.12);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      src.connect(g).connect(buses.sfx); src.start(t);
    } else if (name === 'lowPowerWarn') {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 330;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(buses.sfx); o.start(t); o.stop(t + 0.65);
    } else if (name === 'jumpscare') {
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer(0.9);
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 70;
      const g = ctx.createGain(); g.gain.setValueAtTime(1.0, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.9);
      src.connect(g); o.connect(g); g.connect(buses.stinger); src.start(t); o.start(t); o.stop(t + 0.9);
    } else if (name === 'winChime') {
      [523, 659, 784].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = ctx.createGain(); const st = t + i * 0.18;
        g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.4, st + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 0.8);
        o.connect(g).connect(buses.music); o.start(st); o.stop(st + 0.85);
      });
    }
  }

  // Power-out music: everything dies, then a tinny music-box march plays in the dark (the
  // original-game power-out cue — Toreador-style) and fades out at the end. Resolves when the
  // march finishes, so main.js can hold the dead-silent dread beat and then fire the strike.
  function powerOutSequence(timing) {
    const T = timing || {};
    const dieMs = T.dieMs ?? 600, songMs = T.songMs ?? 4500;
    const a = loops.get('ambient');
    if (a) a.g.gain.linearRampToValueAtTime(0, ctx.currentTime + dieMs / 1000); // everything dies
    return new Promise(resolve => {
      setTimeout(() => {
        const t = ctx.currentTime;
        // march phrase, grouped in the "dum dum da dum dum" cadence; the tail fades out
        const melody = [392, 523, 659, 523, 392,  523, 659, 784, 659,  587, 698, 587,
                        523, 659, 523, 440, 392,  349, 392, 440, 523, 392];
        const n = melody.length;
        const step = (songMs / 1000) / n;
        melody.forEach((f, i) => {
          const st = t + i * step;
          const fade = i < n * 0.6 ? 1 : Math.max(0.04, 1 - (i - n * 0.6) / (n * 0.4)); // fade last 40%
          const accent = (i % 5 === 0) ? 1.2 : 1;                                        // lean on group starts
          const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, st);
          g.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.32 * fade * accent), st + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, st + step * 0.92);
          o.connect(g).connect(buses.music); o.start(st); o.stop(st + step);
        });
        setTimeout(resolve, songMs);
      }, dieMs); // the march starts as soon as the lights die
    });
  }

  function setMuted(m) { master.gain.value = m ? 0 : 0.9; }
  function resume() { if (ctx.state === 'suspended') ctx.resume(); } // unlock after a user gesture

  return { ctx, resume, startAmbient, harTell, giTell, cluckTell, argTell, phoneRing, phoneBlip, menuHover, oneShot, powerOutSequence, setMuted };
}
