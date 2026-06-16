// 2D canvas renderer. Front-on office with two doorways + two windows, four distinct
// animatronics, light-reveal window checks, camera feeds, power-out dread face, and
// per-creature jumpscares. All procedural art (no external images). Reads from game state.
import { drawHar, drawGi, drawCluck, drawArg } from './creatures.js'; // polished art via Google Antigravity CLI
import { drawOfficeBackdrop, drawDoorway, drawWindow, drawRoom, drawJumpscareBg } from './scene.js'; // scene art via Google Antigravity CLI
import { drawCove } from './cove.js';        // Arg's staged Pirate Cove (CAM7)
import { CONFIG } from '../config.js';        // for Arg cove-stage thresholds
import { NODES } from '../mpsim.js';          // teleport-node labels for the animatronic POV

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
  let powerEyes = false;         // Har's eyes pulsing on the left door during the power-out dread beat
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

  // ---- light-check silhouettes ----
  // When you flick a light, a lurking animatronic shows as a translucent DARK silhouette with
  // glowing eyes — not the full-colour model. Drawn offscreen, tinted toward shadow, composited
  // back with a little transparency, then the eyes are re-lit on top so they always glow.
  const RAW = { har: drawHar, gi: drawGi, cluck: drawCluck, arg: drawArg };
  const EYES = { har: [[-20, -55], [20, -55]], gi: [[-15, -62], [15, -62]], cluck: [[-16, -60], [16, -60]], arg: [[16, -65]] };
  const EYECOL = { har: [255, 180, 40], gi: [120, 255, 120], cluck: [255, 230, 120], arg: [255, 40, 40] };
  const sil = document.createElement('canvas'); const sctx = sil.getContext('2d');
  function drawSilhouette(name, cx, cy, scale) {
    const ow = Math.ceil(240 * scale), oh = Math.ceil(340 * scale);
    if (sil.width < ow) sil.width = ow;
    if (sil.height < oh) sil.height = oh;
    sctx.clearRect(0, 0, sil.width, sil.height);
    RAW[name](sctx, ow / 2, oh / 2, scale, 1.4);             // full model offscreen
    sctx.save(); sctx.globalCompositeOperation = 'source-atop';
    sctx.fillStyle = 'rgba(6,8,16,0.72)';                    // crush it to a cold-dark silhouette
    sctx.fillRect(0, 0, sil.width, sil.height); sctx.restore();
    ctx.save(); ctx.globalAlpha = 0.82;                      // a little transparency
    ctx.drawImage(sil, 0, 0, ow, oh, cx - ow / 2, cy - oh / 2, ow, oh);
    ctx.restore();
    // re-light the eyes on top so they read as glowing through the shadow
    const col = EYECOL[name] || [255, 180, 40];
    for (const [ex, ey] of (EYES[name] || [])) {
      const gx = cx + ex * scale, gy = cy + ey * scale, r = 15 * scale;
      const grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
      grd.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},0.95)`);
      grd.addColorStop(0.4, `rgba(${col[0]},${col[1]},${col[2]},0.45)`);
      grd.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(gx, gy, 2.2 * scale, 0, Math.PI * 2); ctx.fill();
    }
  }

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

    // window: a light-check reveals a creature still APPROACHING down this side's hall (near you,
    // but not yet at the office) — shown only here, as a shadowy silhouette.
    const lit = state.lights[side];
    drawWindow(ctx, winX, top, wW, wH, lit);
    const winLurk = lit ? windowCreature(state, side) : null;
    if (winLurk) {
      ctx.save(); ctx.beginPath(); ctx.rect(winX + 12, top + 12, wW - 24, wH - 24); ctx.clip();
      drawSilhouette(winLurk, winX + wW / 2, top + wH * 0.6, 0.62); ctx.restore();
    }

    // doorway + sliding blast-door — the light spills down the corridor through the open door.
    const closedAmt = (doorAnim[side] += ((state.doors[side] ? 1 : 0) - doorAnim[side]) * 0.4);
    drawDoorway(ctx, doorX, top, 200, hgt, closedAmt, lit);
    // door: reveals a creature that has REACHED the office (at this door) — shown only here, in
    // the part still open below the descending blast door, again as a silhouette.
    const doorLurk = lit ? doorCreature(state, side) : null;
    if (doorLurk && closedAmt < 0.85) {
      ctx.save(); ctx.beginPath(); ctx.rect(doorX + 20, top + hgt * closedAmt, 160, hgt * (1 - closedAmt)); ctx.clip();
      drawSilhouette(doorLurk, doorX + 100, top + hgt * 0.58, 0.78); ctx.restore();
    }
  }
  // a creature that has reached the office, lurking right outside `side`'s door
  function doorCreature(state, side) {
    for (const [name, a] of Object.entries(state.animatronics || {})) if (a.atDoor === side) return name;
    return null;
  }
  // a creature approaching down `side`'s hall (the adjacent cam) — seen through the window before
  // it reaches the door. CAM2 feeds the left door, CAM4 the right (and Arg's sprint runs CAM4).
  function windowCreature(state, side) {
    const hallCam = side === 'L' ? 'CAM2' : 'CAM4';
    for (const [name, a] of Object.entries(state.animatronics || {})) if (!a.atDoor && a.room === hallCam) return name;
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

    const monitorUp = !jumpResolve && !powerEyes && !!state.monitorUp;
    if (monitorUp) drawCamera(state); else drawOffice(state);

    if (!monitorUp && !powerEyes && !jumpResolve) {
      // office darkness scales with power; flashlight is a CAMERA tool now (handled in drawCamera)
      const darkness = (1 - dim) * 0.8 + 0.1;
      ctx.fillStyle = `rgba(2,3,6,${darkness})`; ctx.fillRect(-ox, -oy, W, H);
    }

    if (staticTimer > 0) { staticTimer -= dt; drawStatic(Math.min(0.8, staticTimer * 2.2)); }

    // power-out dread: Har waits at the LEFT door, his eyes glowing → unglowing → glowing in the
    // dark (riding a slow sine with a fine shimmer) while the music-box march plays, then silence.
    if (powerEyes) {
      ctx.fillStyle = '#000'; ctx.fillRect(-ox, -oy, W, H);
      const tt = performance.now() / 1000;
      const pulse = Math.pow(0.5 + 0.5 * Math.sin(tt * 3.0), 1.4); // glow / unglow / glow
      const flick = 0.75 + 0.25 * Math.sin(tt * 13);               // fine flicker
      const a = (0.10 + pulse * 0.9) * flick;
      const lx = W * 0.17, eyY = H * 0.46, sep = W * 0.022, r = Math.min(W, H) * 0.055;
      // a looming shadow filling the left doorway
      const sg = ctx.createRadialGradient(lx, H * 0.55, 10, lx, H * 0.55, H * 0.42);
      sg.addColorStop(0, 'rgba(12,9,7,0.9)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W * 0.46, H);
      for (const dx of [-sep, sep]) {
        const ex = lx + dx;
        const grd = ctx.createRadialGradient(ex, eyY, 0, ex, eyY, r);
        grd.addColorStop(0, `rgba(255,210,110,${a})`);
        grd.addColorStop(0.35, `rgba(255,150,25,${a * 0.55})`);
        grd.addColorStop(1, 'rgba(255,80,0,0)');
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(ex, eyY, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,245,210,${a})`; ctx.beginPath(); ctx.arc(ex, eyY, r * 0.13, 0, Math.PI * 2); ctx.fill();
      }
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

  // ===================== animatronic POV (multiplayer) =====================
  // What a human-controlled animatronic sees: the camera feed of the node they're standing at, or
  // the office-door approach when they've teleported to a door (with the kill countdown).
  function renderAnimView(snap, myName, dt) {
    fanAngle += dt * 2.2;
    const a = (snap.anims && snap.anims[myName]) || { node: 'CAM1A' };
    const node = a.node;
    const side = node === 'DOOR_L' ? 'L' : node === 'DOOR_R' ? 'R' : null;
    ctx.save();
    if (side) {
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, W, H);
      const closed = !!(snap.doors && snap.doors[side]);
      const dw = W * 0.34, dh = H * 0.62, dx = W / 2 - dw / 2, dy = H * 0.16;
      ctx.fillStyle = '#141414'; ctx.fillRect(dx - 30, dy - 30, dw + 60, dh + 30);
      if (closed) {
        ctx.fillStyle = '#2c2c2c'; ctx.fillRect(dx, dy, dw, dh);
        for (let i = 0; i < dh; i += 26) { ctx.fillStyle = '#1e1e1e'; ctx.fillRect(dx, dy + i, dw, 6); }
        ctx.fillStyle = '#bbaa00'; ctx.fillRect(dx, dy + dh - 16, dw, 16);
      } else {
        const g = ctx.createLinearGradient(dx, dy, dx, dy + dh); g.addColorStop(0, '#1a160f'); g.addColorStop(1, '#080808');
        ctx.fillStyle = g; ctx.fillRect(dx, dy, dw, dh);
        const rg = ctx.createRadialGradient(W / 2, dy + dh * 0.62, 10, W / 2, dy + dh * 0.62, dw * 0.9);
        rg.addColorStop(0, 'rgba(255,200,120,0.20)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg; ctx.fillRect(dx, dy, dw, dh);
      }
      if (a.killTimer > 0) {
        ctx.fillStyle = 'rgba(180,0,0,' + (0.12 + 0.14 * Math.abs(Math.sin(performance.now() / 90))) + ')'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ff5a5a'; ctx.font = 'bold 64px Georgia, serif'; ctx.textAlign = 'center';
        ctx.fillText(String(Math.ceil(a.killTimer)), W / 2, H * 0.52); ctx.textAlign = 'left';
      } else if (closed) {
        ctx.fillStyle = '#8a8a90'; ctx.font = '18px monospace'; ctx.textAlign = 'center';
        ctx.fillText('DOOR SEALED', W / 2, dy + dh + 42); ctx.textAlign = 'left';
      }
    } else {
      drawRoom(ctx, W, H, node, performance.now() / 1000);
      for (const nm in (snap.anims || {})) {
        const an = snap.anims[nm];
        if (nm !== myName && an.node === node && an.node.indexOf('DOOR') !== 0 && DRAW[nm]) DRAW[nm](W / 2 + hashShift(nm), H * 0.5, Math.min(W, H) / 340, 1.2);
      }
    }
    drawScanlines();
    const label = (NODES.find(n => n.id === node) || {}).label || node;
    ctx.fillStyle = '#d88'; ctx.font = '16px monospace'; ctx.fillText('YOU  ·  ' + label, 30, H - 40);
    ctx.restore();
  }

  return {
    render, renderAnimView,
    setOfficeView() {}, setCamView() {}, setAnimatronicRoom() {}, // view + positions derive from state
    setDoor() {}, setLight() {}, setFlashlight() {},
    staticBurst() { staticTimer = 0.4; },
    shake(intensity) { shakeAmt = Math.max(shakeAmt, intensity); },
    showPowerOutEyes() { powerEyes = true; },        // power-out dread beat (Har's eyes, left door)
    clearPowerOutEyes() { powerEyes = false; },
    playJumpscare(name) { return new Promise((resolve) => { jumpName = name || 'har'; jumpT = 0; jumpResolve = resolve; shakeAmt = 1.3; }); },
    dimForPower(level) { dim = level; },
  };
}
