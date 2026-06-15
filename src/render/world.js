// 2D canvas renderer. Front-on office with two doorways + two windows, four distinct
// animatronics, light-reveal window checks, camera feeds, power-out dread face, and
// per-creature jumpscares. All procedural art (no external images). Reads from game state.
import { drawHar, drawGi, drawCluck, drawArg } from './creatures.js'; // polished art via Google Antigravity CLI
import { drawOfficeBackdrop, drawDoorway, drawWindow, drawRoom, drawJumpscareBg } from './scene.js'; // scene art via Google Antigravity CLI
import { drawCove } from './cove.js';        // Arg's staged Pirate Cove (CAM7)
import { CONFIG } from '../config.js';        // for Arg cove-stage thresholds

export function createWorld(mountEl) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;background:#000;';
  mountEl.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0;
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  window.addEventListener('resize', resize); resize();

  let panTarget = 0.5, panX = 0.5;
  canvas.addEventListener('pointermove', (e) => { panTarget = Math.max(0, Math.min(1, e.clientX / window.innerWidth)); });

  let staticTimer = 0, shakeAmt = 0, dim = 1, jumpT = 0, jumpResolve = null, jumpName = 'har';
  let lurkFace = null;           // creature name shown flickering during the power-out dread beat
  let fanAngle = 0;
  const doorAnim = { L: 0, R: 0 };

  const noise = document.createElement('canvas'); noise.width = 160; noise.height = 90;
  const nctx = noise.getContext('2d');
  function regenNoise() { const img = nctx.createImageData(noise.width, noise.height); for (let i = 0; i < img.data.length; i += 4) { const v = (Math.random() * 255) | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } nctx.putImageData(img, 0, 0); }

  // ===================== animatronic art (via Google Antigravity CLI) =====================
  // Polished per-creature drawing lives in creatures.js; wrap them to bind the shared ctx
  // so existing call sites keep using DRAW[name](x, y, scale, glow).
  const DRAW = {
    har: (x, y, s, g) => drawHar(ctx, x, y, s, g),
    gi: (x, y, s, g) => drawGi(ctx, x, y, s, g),
    cluck: (x, y, s, g) => drawCluck(ctx, x, y, s, g),
    arg: (x, y, s, g) => drawArg(ctx, x, y, s, g),
  };

  // ===================== office =====================
  function drawOffice(state) {
    const sceneW = W * 1.7;
    const scroll = panX * (sceneW - W);
    ctx.save(); ctx.translate(-scroll, 0);
    drawOfficeBackdrop(ctx, W, H, sceneW, fanAngle);   // detailed office art (via agy)
    drawSide(0, 'L', state);                            // left window + doorway (edge band agy left clear)
    drawSide(sceneW - 430, 'R', state);
    ctx.restore();
  }

  function drawSide(baseX, side, state) {
    const doorX = side === 'L' ? baseX : baseX + 230;   // doorway nearer the screen edge
    const winX = side === 'L' ? baseX + 240 : baseX;    // window beside it
    const top = H * 0.14, hgt = H * 0.66, wW = 190, wH = hgt * 0.7;

    // window (light-check blind spot) — agy art; creature revealed over the glass when lit
    const lit = state.lights[side];
    drawWindow(ctx, winX, top, wW, wH, lit);
    const lurk = lit_creature(state, side);
    if (lit && lurk) { ctx.save(); ctx.beginPath(); ctx.rect(winX + 12, top + 12, wW - 24, wH - 24); ctx.clip(); DRAW[lurk](winX + wW / 2, top + wH * 0.62, 0.8, 1.3); ctx.restore(); }

    // doorway + sliding blast-door — agy art; closedAmt drives the slide (eased from state)
    const closedAmt = (doorAnim[side] += ((state.doors[side] ? 1 : 0) - doorAnim[side]) * 0.4);
    drawDoorway(ctx, doorX, top, 200, hgt, closedAmt);
    // the light ALSO reveals a creature standing in the doorway (in the part still open
    // below the descending door) — so a light-check covers both the window and the door.
    if (lit && lurk && closedAmt < 0.85) {
      ctx.save(); ctx.beginPath(); ctx.rect(doorX + 20, top + hgt * closedAmt, 160, hgt * (1 - closedAmt)); ctx.clip();
      DRAW[lurk](doorX + 100, top + hgt * 0.62, 0.9, 1.35); ctx.restore();
    }
  }
  // which creature (if any) is lurking right outside `side`'s door
  function lit_creature(state, side) {
    if (!state.animatronics) return null;
    for (const [name, a] of Object.entries(state.animatronics)) if (a.atDoor === side) return name;
    return null;
  }

  // ===================== cameras =====================
  const ROOMS = {
    CAM1A: { name: 'CAM 1A — SHOW STAGE', bg: '#0d1a14', accent: '#2a5a3a' },
    CAM1B: { name: 'CAM 1B — DINING', bg: '#0d141a', accent: '#2a3a5a' },
    CAM2:  { name: 'CAM 2 — LEFT HALL', bg: '#12161a', accent: '#3a4a5a' },
    CAM4:  { name: 'CAM 4 — RIGHT HALL', bg: '#161216', accent: '#5a3a4a' },
    CAM3:  { name: 'CAM 3 — CLOSET', bg: '#12121a', accent: '#3a3a5a' },
    CAM7:  { name: 'CAM 7 — PIRATE COVE', bg: '#1a140d', accent: '#6a3a10' },
  };
  function argStage(a) {
    if (!a) return 1;
    if (a.committed) return 4;                              // left the cove (empty + sign)
    if (a.emergence >= CONFIG.ai.argStage3At) return 3;    // out as a dark figure
    if (a.emergence >= CONFIG.ai.argStage2At) return 2;    // curtains parted slightly
    return 1;                                              // curtains closed
  }
  function drawCamera(state) {
    const id = state.activeCam; const room = ROOMS[id] || ROOMS.CAM1A;
    // CAM7 is Arg's staged cove (drawn by emergence stage); other cams use the agy room art
    if (id === 'CAM7') drawCove(ctx, W, H, argStage(state.animatronics.arg), performance.now() / 1000);
    else drawRoom(ctx, W, H, id, performance.now() / 1000);
    // any creature physically in this room (Arg on CAM7 is drawn by the cove, so skip him there)
    for (const [name, a] of Object.entries(state.animatronics || {})) {
      if (a.room === id && !a.atDoor && !(id === 'CAM7' && name === 'arg')) DRAW[name](W / 2 + hashShift(name), H * 0.5, Math.min(W, H) / 340, 1.2);
    }
    // flashlight is camera-only: brightens the current feed
    if (state.flashlight && state.flashlight.on) {
      const g = ctx.createRadialGradient(W / 2, H * 0.45, 60, W / 2, H * 0.45, H * 0.85);
      g.addColorStop(0, 'rgba(255,250,230,0.30)'); g.addColorStop(1, 'rgba(255,250,230,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    drawScanlines();
    ctx.fillStyle = '#7aa7d8'; ctx.font = '16px monospace'; ctx.fillText(room.name, 30, H - 40);
  }
  function hashShift(name) { let h = 0; for (const ch of name) h += ch.charCodeAt(0); return ((h % 5) - 2) * 90; }
  function drawScanlines() { ctx.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2); }
  function drawStatic(alpha) { regenNoise(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false; ctx.drawImage(noise, 0, 0, W, H); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 1; }

  // ===================== frame =====================
  function render(state, dt) {
    if (!state) return;
    panX += (panTarget - panX) * Math.min(1, dt * 5);
    fanAngle += dt * 2.2;

    let ox = 0, oy = 0;
    if (shakeAmt > 0.002) { ox = (Math.random() - 0.5) * shakeAmt * 60; oy = (Math.random() - 0.5) * shakeAmt * 60; shakeAmt *= 0.86; }
    ctx.save(); ctx.translate(ox, oy);

    const monitorUp = !jumpResolve && !lurkFace && !!state.monitorUp;
    if (monitorUp) drawCamera(state); else drawOffice(state);

    if (!monitorUp && !lurkFace && !jumpResolve) {
      // office darkness scales with power; flashlight is a CAMERA tool now (handled in drawCamera)
      const darkness = (1 - dim) * 0.8 + 0.1;
      ctx.fillStyle = `rgba(2,3,6,${darkness})`; ctx.fillRect(-ox, -oy, W, H);
    }

    if (staticTimer > 0) { staticTimer -= dt; drawStatic(Math.min(0.8, staticTimer * 2.2)); }

    // power-out dread: the headliner's face stutters out of the black before the strike
    if (lurkFace) {
      ctx.fillStyle = '#000'; ctx.fillRect(-ox, -oy, W, H);
      if (Math.random() > 0.35) { const s = Math.min(W, H) / 260; DRAW[lurkFace](W / 2 + (Math.random() - 0.5) * 16, H * 0.5, s, 1.5); }
    }

    if (jumpResolve) {
      jumpT += dt; drawJumpscareBg(ctx, W, H, jumpT);   // violent strobe backdrop (via agy)
      const s = Math.min(W, H) / 200 * (1 + jumpT * 0.5);
      DRAW[jumpName](W / 2 + (Math.random() - 0.5) * 34, H * 0.54 + (Math.random() - 0.5) * 34, s, 1.7);
      if (Math.sin(jumpT * 40) > 0) { ctx.fillStyle = 'rgba(120,0,0,0.28)'; ctx.fillRect(-ox, -oy, W, H); }
      if (jumpT > 1.1) { const r = jumpResolve; jumpResolve = null; jumpT = 0; r(); }
    }

    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = vg; ctx.fillRect(-ox, -oy, W, H);
    ctx.restore();
  }

  return {
    render,
    setOfficeView() {}, setCamView() {}, setAnimatronicRoom() {}, // view + positions derive from state
    setDoor() {}, setLight() {}, setFlashlight() {},
    staticBurst() { staticTimer = 0.4; },
    shake(intensity) { shakeAmt = Math.max(shakeAmt, intensity); },
    showLurkFace(name) { lurkFace = name; },         // power-out dread beat
    clearLurkFace() { lurkFace = null; },
    playJumpscare(name) { return new Promise((resolve) => { jumpName = name || 'har'; jumpT = 0; jumpResolve = resolve; shakeAmt = 1.3; }); },
    dimForPower(level) { dim = level; },
  };
}
