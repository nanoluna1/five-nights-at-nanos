// 2D canvas renderer. Front-on office with two doorways + two windows, four distinct
// animatronics, light-reveal window checks, camera feeds, power-out dread face, and
// per-creature jumpscares. All procedural art (no external images). Reads from game state.
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

  // ===================== animatronic art =====================
  function drawHar(x, y, s, glow) { // dusk-brown owl, amber eyes, maroon bowtie, ear tufts
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#6b4f2a'; ctx.beginPath(); ctx.ellipse(0, 60, 60, 80, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#8a6b3c'; ctx.beginPath(); ctx.ellipse(0, 72, 34, 52, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6b4f2a'; ctx.beginPath(); ctx.arc(0, -28, 56, 0, 7); ctx.fill();
    ctx.fillStyle = '#4a3720'; ctx.beginPath(); ctx.moveTo(-52, -56); ctx.lineTo(-30, -106); ctx.lineTo(-14, -62); ctx.fill();
    ctx.beginPath(); ctx.moveTo(52, -56); ctx.lineTo(30, -106); ctx.lineTo(14, -62); ctx.fill();
    eyes('#ff9810', glow, 22, -30, 22, 16);
    ctx.fillStyle = '#d8943a'; ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(12, -10); ctx.lineTo(0, 16); ctx.fill();
    ctx.fillStyle = '#7a2030'; ctx.beginPath(); ctx.moveTo(-4, 122); ctx.lineTo(-34, 106); ctx.lineTo(-34, 138); ctx.fill(); ctx.beginPath(); ctx.moveTo(4, 122); ctx.lineTo(34, 106); ctx.lineTo(34, 138); ctx.fill(); ctx.fillStyle = '#5a1424'; ctx.fillRect(-7, 114, 14, 16);
    ctx.restore();
  }
  function drawGi(x, y, s, glow) { // lanky teal-steel cat, tall ears, slit green eyes, keytar
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#2f6a72'; ctx.beginPath(); ctx.ellipse(0, 64, 46, 92, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#356470'; ctx.beginPath(); ctx.ellipse(0, -26, 46, 42, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2f6a72'; ctx.beginPath(); ctx.moveTo(-40, -54); ctx.lineTo(-54, -118); ctx.lineTo(-14, -62); ctx.fill(); ctx.beginPath(); ctx.moveTo(40, -54); ctx.lineTo(54, -118); ctx.lineTo(14, -62); ctx.fill();
    // slit green eyes
    for (const sx of [-1, 1]) { ctx.fillStyle = '#0d1a18'; ctx.beginPath(); ctx.ellipse(sx * 18, -30, 13, 18, 0, 0, 7); ctx.fill();
      ctx.save(); ctx.globalAlpha = glow; ctx.fillStyle = '#7CFF8A'; ctx.beginPath(); ctx.ellipse(sx * 18, -30, 5, 14, 0, 0, 7); ctx.fill(); ctx.restore(); }
    ctx.strokeStyle = '#9fe1d2'; ctx.lineWidth = 2; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 30, -22); ctx.lineTo(sx * 60, -26); ctx.stroke(); }
    // keytar slung across
    ctx.fillStyle = '#1d3b42'; ctx.fillRect(-58, 70, 116, 26); ctx.fillStyle = '#cfd8d6'; for (let i = 0; i < 7; i++) ctx.fillRect(-54 + i * 16, 74, 10, 18);
    ctx.restore();
  }
  function drawCluck(x, y, s, glow) { // gold rooster, red comb, grease apron
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#c9a84a'; ctx.beginPath(); ctx.ellipse(0, 64, 54, 80, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8e2d2'; ctx.beginPath(); ctx.moveTo(-44, 40); ctx.lineTo(44, 40); ctx.lineTo(34, 150); ctx.lineTo(-34, 150); ctx.fill(); // apron
    ctx.fillStyle = '#7a6a40'; ctx.beginPath(); ctx.arc(-10, 96, 7, 0, 7); ctx.arc(18, 120, 9, 0, 7); ctx.fill(); // grease stains
    ctx.fillStyle = '#c9a84a'; ctx.beginPath(); ctx.arc(0, -28, 48, 0, 7); ctx.fill();
    ctx.fillStyle = '#c0392b'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-16 + i * 16, -74, 12, 0, 7); ctx.fill(); } // comb
    ctx.fillStyle = '#b0392b'; ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(6, -2); ctx.lineTo(0, 16); ctx.fill(); // wattle
    eyes('#ef9f27', glow, 16, -34, 14, 9);
    ctx.fillStyle = '#d8943a'; ctx.beginPath(); ctx.moveTo(-10, -22); ctx.lineTo(10, -22); ctx.lineTo(0, -6); ctx.fill();
    ctx.restore();
  }
  function drawArg(x, y, s, glow) { // swamp-green pirate croc, eyepatch, hook
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#3d6b2a'; ctx.beginPath(); ctx.ellipse(0, 70, 52, 80, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#3d6b2a'; ctx.beginPath(); ctx.ellipse(0, -24, 56, 40, 0, 0, 7); ctx.fill(); // head
    ctx.fillStyle = '#2f5320'; ctx.fillRect(-58, -6, 116, 26); // snout
    ctx.fillStyle = '#e8f0d8'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(-54 + i * 18, 20); ctx.lineTo(-46 + i * 18, 4); ctx.lineTo(-38 + i * 18, 20); ctx.fill(); } // teeth
    // eyepatch (right) + glowing eye (left)
    ctx.fillStyle = '#111'; ctx.fillRect(8, -44, 30, 24); ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(8, -40); ctx.lineTo(-40, -48); ctx.stroke();
    ctx.save(); ctx.globalAlpha = glow; ctx.fillStyle = '#97c459'; ctx.beginPath(); ctx.arc(-22, -34, 9, 0, 7); ctx.fill(); ctx.restore();
    // hook
    ctx.strokeStyle = '#b0b0b8'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(54, 80, 20, Math.PI * 0.2, Math.PI * 1.6); ctx.stroke();
    ctx.restore();
  }
  function eyes(color, glow, dx, dy, socket, r) {
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#14100a'; ctx.beginPath(); ctx.arc(sx * dx, dy, socket, 0, 7); ctx.fill();
      const g = ctx.createRadialGradient(sx * dx, dy, 1, sx * dx, dy, r); g.addColorStop(0, '#fff2c0'); g.addColorStop(0.5, color); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.globalAlpha = glow; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx * dx, dy, r, 0, 7); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#1a1308'; ctx.beginPath(); ctx.arc(sx * dx, dy, 4, 0, 7); ctx.fill();
    }
  }
  const DRAW = { har: drawHar, gi: drawGi, cluck: drawCluck, arg: drawArg };
  const CREATURE_NAME = { har: 'HAR', gi: 'GI', cluck: 'CLUCK', arg: 'ARG' };

  // ===================== office =====================
  function drawOffice(state) {
    const sceneW = W * 1.7;
    const scroll = panX * (sceneW - W);
    ctx.save(); ctx.translate(-scroll, 0);

    const wall = ctx.createLinearGradient(0, 0, 0, H); wall.addColorStop(0, '#5f6064'); wall.addColorStop(1, '#3c3d41');
    ctx.fillStyle = wall; ctx.fillRect(0, 0, sceneW, H);
    ctx.fillStyle = '#2a2a2e'; ctx.fillRect(0, H * 0.8, sceneW, 14);           // baseboard
    ctx.fillStyle = '#303034'; ctx.fillRect(0, H * 0.82, sceneW, H * 0.18);    // floor

    // "Have fun" poster with the four characters
    const px = sceneW * 0.4, py = H * 0.06, pw = 300, ph = 270;
    ctx.fillStyle = '#d9d6cc'; ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = '#3a3a3a'; ctx.font = "bold 54px Georgia"; ctx.fillText('Have', px + 24, py + 70); ctx.fillText('fun', px + 36, py + 134);
    const fc = ['#6b4f2a', '#2f6a72', '#c9a84a', '#3d6b2a'];
    fc.forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px + 60 + i * 60, py + 210, 24, 0, 7); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px + 60 + i * 60, py + 216, 11, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); });

    // ceiling fan (rotating)
    const fx = sceneW / 2, fy = H * 0.1;
    ctx.strokeStyle = '#23242a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(fx, 0); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(fanAngle); ctx.fillStyle = '#34353b'; for (let i = 0; i < 3; i++) { ctx.rotate((Math.PI * 2) / 3); ctx.beginPath(); ctx.ellipse(80, 0, 80, 14, 0, 0, 7); ctx.fill(); } ctx.fillStyle = '#4a4b52'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.fill(); ctx.restore();

    // desk + monitor (glowing) + blue kettle
    const dx = sceneW / 2;
    ctx.fillStyle = '#3a2418'; ctx.beginPath(); ctx.moveTo(dx - 380, H); ctx.lineTo(dx - 310, H * 0.62); ctx.lineTo(dx + 310, H * 0.62); ctx.lineTo(dx + 380, H); ctx.fill();
    ctx.fillStyle = '#2c2c30'; ctx.fillRect(dx + 40, H * 0.4, 240, 200);
    const glow = state.monitorUp ? '#1a5a44' : '#0c2a20'; ctx.fillStyle = glow; ctx.fillRect(dx + 60, H * 0.43, 200, 150);
    if (state.monitorUp) { ctx.save(); ctx.shadowColor = '#2aa07a'; ctx.shadowBlur = 40; ctx.fillStyle = 'rgba(40,160,120,0.25)'; ctx.fillRect(dx + 60, H * 0.43, 200, 150); ctx.restore(); }
    ctx.fillStyle = '#10489a'; ctx.beginPath(); ctx.ellipse(dx - 150, H * 0.58, 64, 52, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#3aa0ff'; ctx.lineWidth = 13; ctx.beginPath(); ctx.arc(dx - 150, H * 0.5, 42, Math.PI, 2 * Math.PI); ctx.stroke();

    // sides: window + doorway, mirrored
    drawSide(0, 'L', state);
    drawSide(sceneW - 430, 'R', state);

    ctx.restore();
  }

  function drawSide(baseX, side, state) {
    const doorX = side === 'L' ? baseX : baseX + 230;   // doorway nearer the screen edge
    const winX = side === 'L' ? baseX + 240 : baseX;     // window beside it
    const top = H * 0.14, hgt = H * 0.66;

    // --- window (the light-check blind spot) ---
    const lit = state.lights[side];
    ctx.fillStyle = '#1c1d22'; ctx.fillRect(winX, top, 190, hgt * 0.7);            // frame
    ctx.fillStyle = lit ? '#6b6754' : '#0a0b10'; ctx.fillRect(winX + 12, top + 12, 166, hgt * 0.7 - 24); // glass/hall
    // reveal a lurking creature in the window when the light is on
    const lurk = lit_creature(state, side);
    if (lit && lurk) { ctx.save(); ctx.beginPath(); ctx.rect(winX + 12, top + 12, 166, hgt * 0.7 - 24); ctx.clip(); DRAW[lurk](winX + 95, top + hgt * 0.55, 0.85, 1.3); ctx.restore(); }
    ctx.strokeStyle = '#34333c'; ctx.lineWidth = 5; ctx.strokeRect(winX + 12, top + 12, 166, hgt * 0.7 - 24);
    ctx.beginPath(); ctx.moveTo(winX + 95, top + 12); ctx.lineTo(winX + 95, top + hgt * 0.7 - 12); ctx.moveTo(winX + 12, top + hgt * 0.35); ctx.lineTo(winX + 178, top + hgt * 0.35); ctx.stroke();

    // --- doorway + sliding door ---
    ctx.fillStyle = '#2a2520'; ctx.fillRect(doorX, top - 16, 200, hgt + 16);
    ctx.fillStyle = '#0c0d11'; ctx.fillRect(doorX + 20, top, 160, hgt);
    const a = (doorAnim[side] += ((state.doors[side] ? 1 : 0) - doorAnim[side]) * 0.4);
    if (a > 0.01) { ctx.fillStyle = '#3a3f47'; ctx.fillRect(doorX + 20, top, 160, hgt * a); ctx.strokeStyle = '#23262b'; ctx.lineWidth = 4; for (let yy = top + 22; yy < top + hgt * a; yy += 24) { ctx.beginPath(); ctx.moveTo(doorX + 20, yy); ctx.lineTo(doorX + 180, yy); ctx.stroke(); } }
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
  function drawCamera(state) {
    const id = state.activeCam; const room = ROOMS[id] || ROOMS.CAM1A;
    ctx.fillStyle = room.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = room.accent; ctx.globalAlpha = 0.5; ctx.fillRect(0, H * 0.7, W, H * 0.3); ctx.globalAlpha = 1;
    if (id === 'CAM1A') { ctx.fillStyle = '#5a1020'; ctx.fillRect(W * 0.15, H * 0.08, W * 0.7, H * 0.62); }
    if (id === 'CAM7') { ctx.fillStyle = '#6a2a10'; ctx.fillRect(W * 0.22, H * 0.08, W * 0.56, H * 0.72); ctx.fillStyle = '#1a140d'; ctx.fillRect(W * 0.48, H * 0.08, W * 0.04, H * 0.72); }
    if (id === 'CAM1B') for (let i = 0; i < 3; i++) { ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.ellipse(W * (0.3 + i * 0.2), H * 0.62, 70, 26, 0, 0, 7); ctx.fill(); }
    if (id === 'CAM2' || id === 'CAM4') { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(W * 0.3, H * 0.2); ctx.lineTo(W * 0.7, H * 0.2); ctx.lineTo(W * 0.62, H * 0.8); ctx.lineTo(W * 0.38, H * 0.8); ctx.fill(); } // hall vanishing point
    if (id === 'CAM3') { ctx.fillStyle = '#2a2a30'; ctx.fillRect(W * 0.35, H * 0.28, W * 0.3, H * 0.46); }
    // any creature physically in this room (not currently at a door)
    for (const [name, a] of Object.entries(state.animatronics || {})) {
      if (a.room === id && !a.atDoor) DRAW[name](W / 2 + hashShift(name), H * 0.44, Math.min(W, H) / 360, 1.2);
    }
    ctx.fillStyle = 'rgba(40,90,60,0.10)'; ctx.fillRect(0, 0, W, H);
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
      const flOn = state.flashlight && state.flashlight.on;
      let darkness = (1 - dim) * 0.8 + 0.1; if (flOn) darkness = Math.max(0, darkness - 0.45);
      ctx.fillStyle = `rgba(2,3,6,${darkness})`; ctx.fillRect(-ox, -oy, W, H);
      if (flOn) { const cx = W * (0.5 + (panX - 0.5) * 0.6); const g = ctx.createRadialGradient(cx, H * 0.5, 40, cx, H * 0.5, H * 0.75); g.addColorStop(0, 'rgba(255,250,230,0.22)'); g.addColorStop(1, 'rgba(255,250,230,0)'); ctx.fillStyle = g; ctx.fillRect(-ox, -oy, W, H); }
    }

    if (staticTimer > 0) { staticTimer -= dt; drawStatic(Math.min(0.8, staticTimer * 2.2)); }

    // power-out dread: the headliner's face stutters out of the black before the strike
    if (lurkFace) {
      ctx.fillStyle = '#000'; ctx.fillRect(-ox, -oy, W, H);
      if (Math.random() > 0.35) { const s = Math.min(W, H) / 260; DRAW[lurkFace](W / 2 + (Math.random() - 0.5) * 16, H * 0.5, s, 1.5); }
    }

    if (jumpResolve) {
      jumpT += dt; ctx.fillStyle = '#000'; ctx.fillRect(-ox, -oy, W, H);
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
