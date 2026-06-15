// 2D canvas renderer (replaces the 3D version per the design pivot to a flat,
// front-on office). Same facade contract the rest of the game drives — only the
// drawing is 2D now. All art is procedural (no external images).
export function createWorld(mountEl) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;background:#000;';
  mountEl.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0;
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  window.addEventListener('resize', resize); resize();

  // office is wider than the screen; pan reveals the side doors
  let panTarget = 0.5, panX = 0.5;
  canvas.addEventListener('pointermove', (e) => { panTarget = Math.max(0, Math.min(1, e.clientX / window.innerWidth)); });

  // animation/effect state
  let harRoom = 'CAM1A';
  let staticTimer = 0, shakeAmt = 0, dim = 1, jumpT = 0, jumpResolve = null;

  // small reusable noise tile for TV static
  const noise = document.createElement('canvas'); noise.width = 160; noise.height = 90;
  const nctx = noise.getContext('2d');
  function regenNoise() {
    const img = nctx.createImageData(noise.width, noise.height);
    for (let i = 0; i < img.data.length; i += 4) { const v = (Math.random() * 255) | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    nctx.putImageData(img, 0, 0);
  }

  // ---------- the Har owl, drawn flat ----------
  function drawOwl(x, y, s, glow) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // body
    ctx.fillStyle = '#6b4f2a'; ctx.beginPath(); ctx.ellipse(0, 60, 60, 78, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#8a6b3c'; ctx.beginPath(); ctx.ellipse(0, 70, 36, 52, 0, 0, 7); ctx.fill();
    // head
    ctx.fillStyle = '#6b4f2a'; ctx.beginPath(); ctx.arc(0, -28, 56, 0, 7); ctx.fill();
    // ear tufts
    ctx.fillStyle = '#4a3720';
    ctx.beginPath(); ctx.moveTo(-52, -56); ctx.lineTo(-30, -104); ctx.lineTo(-16, -62); ctx.fill();
    ctx.beginPath(); ctx.moveTo(52, -56); ctx.lineTo(30, -104); ctx.lineTo(16, -62); ctx.fill();
    // eyes (amber glow)
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#14100a'; ctx.beginPath(); ctx.arc(sx * 22, -30, 22, 0, 7); ctx.fill();
      const g = ctx.createRadialGradient(sx * 22, -30, 1, sx * 22, -30, 16);
      g.addColorStop(0, '#ffe08a'); g.addColorStop(0.5, '#ff9810'); g.addColorStop(1, 'rgba(255,120,0,0)');
      ctx.fillStyle = g; ctx.globalAlpha = glow; ctx.beginPath(); ctx.arc(sx * 22, -30, 16, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#1a1308'; ctx.beginPath(); ctx.arc(sx * 22, -30, 5, 0, 7); ctx.fill();
    }
    // beak
    ctx.fillStyle = '#d8943a'; ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(12, -10); ctx.lineTo(0, 14); ctx.fill();
    // maroon bowtie
    ctx.fillStyle = '#7a2030';
    ctx.beginPath(); ctx.moveTo(-4, 120); ctx.lineTo(-34, 104); ctx.lineTo(-34, 136); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4, 120); ctx.lineTo(34, 104); ctx.lineTo(34, 136); ctx.fill();
    ctx.fillStyle = '#5a1424'; ctx.fillRect(-7, 112, 14, 16);
    ctx.restore();
  }

  // ---------- the office (panoramic, front-on) ----------
  function drawOffice(state) {
    const sceneW = W * 1.6;
    const scroll = panX * (sceneW - W);
    ctx.save(); ctx.translate(-scroll, 0);

    // wall
    const wall = ctx.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, '#6f6f73'); wall.addColorStop(1, '#4c4c50');
    ctx.fillStyle = wall; ctx.fillRect(0, 0, sceneW, H);
    // floor
    ctx.fillStyle = '#37373b'; ctx.fillRect(0, H * 0.82, sceneW, H * 0.18);

    // "Have Fun" poster with the four characters
    const px = sceneW * 0.12, py = H * 0.08, pw = 320, ph = 300;
    ctx.fillStyle = '#d9d6cc'; ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = '#3a3a3a'; ctx.font = 'bold 60px Georgia'; ctx.fillText('Have', px + 28, py + 78); ctx.fillText('fun', px + 40, py + 150);
    const faces = ['#6b4f2a', '#7a3aa0', '#e0b020', '#3a8a6a'];
    faces.forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px + 70 + i * 64, py + 230, 26, 0, 7); ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px + 70 + i * 64, py + 236, 12, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); });
    ctx.fillStyle = '#111'; ctx.fillRect(px + 56, py + 188, 28, 14); // Har's top hat hint

    // desk + monitor + blue kettle (foreground center)
    const dx = sceneW / 2;
    ctx.fillStyle = '#3a2418'; ctx.beginPath(); ctx.moveTo(dx - 360, H); ctx.lineTo(dx - 300, H * 0.62); ctx.lineTo(dx + 300, H * 0.62); ctx.lineTo(dx + 360, H); ctx.fill();
    // monitor
    ctx.fillStyle = '#2c2c30'; ctx.fillRect(dx + 30, H * 0.4, 240, 200);
    ctx.fillStyle = state.monitorUp ? '#1a4a3a' : '#0a0c0e'; ctx.fillRect(dx + 50, H * 0.43, 200, 150);
    // blue kettle
    ctx.fillStyle = '#10489a'; ctx.beginPath(); ctx.ellipse(dx - 120, H * 0.58, 70, 56, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3aa0ff'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(dx - 120, H * 0.5, 46, Math.PI, 2 * Math.PI); ctx.stroke();

    // ---- doors (left & right edges) ----
    drawDoor(0, 'L', state, scroll, sceneW);
    drawDoor(sceneW - 220, 'R', state, scroll, sceneW);

    ctx.restore();
  }

  function drawDoor(x, side, state, scroll, sceneW) {
    const closed = state.doors[side];
    const lit = state.lights[side];
    const w = 220, top = H * 0.12, hgt = H * 0.74;
    // frame
    ctx.fillStyle = '#2a2520'; ctx.fillRect(x, top - 18, w, hgt + 18);
    // hallway opening (dark, or lit when light on)
    ctx.fillStyle = lit ? '#5a5642' : '#0c0d11'; ctx.fillRect(x + 20, top, w - 40, hgt);
    // a creature lurking when the light reveals it (Har uses the LEFT door)
    const har = state.animatronics && state.animatronics.har;
    const atThisDoor = side === 'L' && har && (har.room === 'CAM3' || har.room === 'OFFICE');
    if (lit && atThisDoor) drawOwl(x + w / 2, top + hgt * 0.34, 0.95, 1.3);
    // door light button + door button
    ctx.fillStyle = lit ? '#e8b23a' : '#2b2b33'; ctx.fillRect(x + w + 8, top + 120, 30, 34);
    ctx.fillStyle = closed ? '#e24b4a' : '#2b2b33'; ctx.fillRect(x + w + 8, top + 80, 30, 34);
    ctx.fillStyle = '#cfcabb'; ctx.font = '16px Georgia'; ctx.fillText('L', x + w + 16, top + 143); ctx.fillText('D', x + w + 16, top + 103);
    // sliding metal door (animated)
    const a = doorAnimGet(side, closed);
    if (a > 0.01) {
      ctx.fillStyle = '#3a3f47'; ctx.fillRect(x + 20, top, w - 40, hgt * a);
      ctx.strokeStyle = '#23262b'; ctx.lineWidth = 4;
      for (let yy = top + 24; yy < top + hgt * a; yy += 26) { ctx.beginPath(); ctx.moveTo(x + 20, yy); ctx.lineTo(x + w - 20, yy); ctx.stroke(); }
    }
  }
  const doorAnim = { L: 0, R: 0 };
  function doorAnimGet(side, closed) {
    const tgt = closed ? 1 : 0; doorAnim[side] += (tgt - doorAnim[side]) * 0.4; return doorAnim[side];
  }

  // ---------- camera rooms (flat) ----------
  const ROOMS = {
    CAM1A: { name: 'CAM 1A — SHOW STAGE', bg: '#0d1a14', accent: '#2a5a3a' },
    CAM1B: { name: 'CAM 1B — DINING', bg: '#0d141a', accent: '#2a3a5a' },
    CAM3:  { name: 'CAM 3 — CLOSET', bg: '#12121a', accent: '#3a3a5a' },
    CAM7:  { name: 'CAM 7 — COVE', bg: '#1a140d', accent: '#6a3a10' },
  };
  function drawCamera(state) {
    const id = state.activeCam; const room = ROOMS[id] || ROOMS.CAM1A;
    ctx.fillStyle = room.bg; ctx.fillRect(0, 0, W, H);
    // floor + back wall hint
    ctx.fillStyle = room.accent; ctx.globalAlpha = 0.5; ctx.fillRect(0, H * 0.7, W, H * 0.3); ctx.globalAlpha = 1;
    // a defining prop per room
    if (id === 'CAM1A') { ctx.fillStyle = '#5a1020'; ctx.fillRect(W * 0.2, H * 0.1, W * 0.6, H * 0.6); } // stage curtain
    if (id === 'CAM7') { ctx.fillStyle = '#6a2a10'; ctx.fillRect(W * 0.25, H * 0.1, W * 0.5, H * 0.7); }   // cove curtain
    if (id === 'CAM1B') { for (let i = 0; i < 3; i++) { ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.ellipse(W * (0.3 + i * 0.2), H * 0.6, 70, 28, 0, 0, 7); ctx.fill(); } }
    if (id === 'CAM3') { ctx.fillStyle = '#2a2a30'; ctx.fillRect(W * 0.35, H * 0.3, W * 0.3, H * 0.45); }
    // Har if he's in this room
    if (harRoom === id) drawOwl(W / 2, H * 0.42, Math.min(W, H) / 360, 1.2);
    // greenish night-vision tint + scanlines
    ctx.fillStyle = 'rgba(40,90,60,0.10)'; ctx.fillRect(0, 0, W, H);
    drawScanlines();
  }

  function drawScanlines() {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);
  }

  function drawStatic(alpha) {
    regenNoise(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(noise, 0, 0, W, H); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 1;
  }

  // ---------- public facade ----------
  function render(state, dt) {
    if (!state) return;
    panX += (panTarget - panX) * Math.min(1, dt * 5);

    let ox = 0, oy = 0;
    if (shakeAmt > 0.002) { ox = (Math.random() - 0.5) * shakeAmt * 60; oy = (Math.random() - 0.5) * shakeAmt * 60; shakeAmt *= 0.86; }
    ctx.save(); ctx.translate(ox, oy);

    const monitorUp = !jumpResolve && !!state.monitorUp;
    if (monitorUp) drawCamera(state);
    else drawOffice(state);

    // power dimming (office only; cameras have their own light)
    if (!monitorUp) {
      const flOn = state.flashlight && state.flashlight.on;
      let darkness = (1 - dim) * 0.8 + 0.12;
      if (flOn) darkness = Math.max(0, darkness - 0.45);
      ctx.fillStyle = `rgba(2,3,6,${darkness})`; ctx.fillRect(-ox, -oy, W, H);
      if (flOn) { // flashlight wash toward where you're looking
        const cx = W * (0.5 + (panX - 0.5) * 0.6), g = ctx.createRadialGradient(cx, H * 0.5, 40, cx, H * 0.5, H * 0.7);
        g.addColorStop(0, 'rgba(255,250,230,0.22)'); g.addColorStop(1, 'rgba(255,250,230,0)');
        ctx.fillStyle = g; ctx.fillRect(-ox, -oy, W, H);
      }
    }

    // static burst
    if (staticTimer > 0) { staticTimer -= dt; drawStatic(Math.min(0.8, staticTimer * 2.2)); }

    // jumpscare overlay
    if (jumpResolve) {
      jumpT += dt;
      ctx.fillStyle = '#000'; ctx.fillRect(-ox, -oy, W, H);
      const s = Math.min(W, H) / 220 * (1 + jumpT * 0.5);
      drawOwl(W / 2 + (Math.random() - 0.5) * 30, H * 0.52 + (Math.random() - 0.5) * 30, s, 1.6);
      if (Math.sin(jumpT * 40) > 0) { ctx.fillStyle = 'rgba(120,0,0,0.25)'; ctx.fillRect(-ox, -oy, W, H); }
      if (jumpT > 1.1) { const r = jumpResolve; jumpResolve = null; jumpT = 0; r(); }
    }

    // vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(-ox, -oy, W, H);

    ctx.restore();
  }

  return {
    render,
    setOfficeView() { /* view derives from state.monitorUp in render */ },
    setCamView(camId) { /* derives from state.activeCam */ },
    setAnimatronicRoom(name, roomId) { if (name === 'har') harRoom = roomId; },
    setDoor() { /* animated from state in render */ },
    setLight() { /* read from state in render */ },
    setFlashlight() { /* read from state in render */ },
    staticBurst() { staticTimer = 0.4; },
    shake(intensity) { shakeAmt = Math.max(shakeAmt, intensity); },
    playJumpscare() { return new Promise((resolve) => { jumpT = 0; jumpResolve = resolve; shakeAmt = 1.2; }); },
    dimForPower(level) { dim = level; },
  };
}
