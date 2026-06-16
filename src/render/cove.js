// Arg's staged Pirate Cove (CAM7). Framed as a stage inside the room (not full-bleed): a
// brown/maroon tattered star curtain that parts as his emergence meter climbs, with the REAL
// green Arg (creatures.drawArg) peeking and then stepping out. Camera grain/scanlines/label
// are added by render/world.js around this, so we don't repeat them here.
import { drawArg } from './creatures.js';

function star(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let j = 0; j < 5; j++) {
    const a1 = (-90 + j * 72) * Math.PI / 180;
    const a2 = (-90 + 36 + j * 72) * Math.PI / 180;
    ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
    ctx.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function glowEye(ctx, x, y, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, 11);
  g.addColorStop(0, `rgba(255,210,120,${a})`);
  g.addColorStop(0.4, `rgba(255,150,30,${a * 0.6})`);
  g.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(255,235,190,${a})`;
  ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
}

export function drawCove(ctx, W, H, stage, t) {
  // ---- room behind the cove ----
  const wall = ctx.createLinearGradient(0, 0, 0, H);
  wall.addColorStop(0, '#171014');
  wall.addColorStop(0.55, '#0d0a0c');
  wall.addColorStop(1, '#050405');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const floorY = H * 0.80;

  // floor + boards
  const floor = ctx.createLinearGradient(0, floorY, 0, H);
  floor.addColorStop(0, '#0a0807');
  floor.addColorStop(1, '#1a1411');
  ctx.fillStyle = floor;
  ctx.fillRect(0, floorY, W, H - floorY);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2;
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * W * 0.06, floorY);
    ctx.lineTo(cx + i * W * 0.22, H);
    ctx.stroke();
  }

  // ---- cove framing ----
  const coveW = W * 0.52;
  const coveLeft = cx - coveW / 2;
  const coveRight = cx + coveW / 2;
  const coveTop = H * 0.15;
  const coveH = floorY - coveTop;

  // dark interior
  ctx.fillStyle = '#070504';
  ctx.fillRect(coveLeft, coveTop, coveW, coveH);

  // wooden stage platform under the cove
  ctx.fillStyle = '#2a1a0f';
  ctx.fillRect(coveLeft - 20, floorY - 14, coveW + 40, 28);
  ctx.fillStyle = '#3c2817';
  ctx.fillRect(coveLeft - 20, floorY - 14, coveW + 40, 6);
  ctx.strokeStyle = '#150c06';
  ctx.lineWidth = 2;
  ctx.strokeRect(coveLeft - 20, floorY - 14, coveW + 40, 28);

  // top valance (pelmet)
  ctx.fillStyle = '#1e0a07';
  ctx.fillRect(coveLeft - 16, coveTop - 12, coveW + 32, 30);
  ctx.fillStyle = 'rgba(120,60,34,0.25)';
  for (let i = 0; i < 9; i++) ctx.fillRect(coveLeft - 16 + i * (coveW + 32) / 9, coveTop - 12, 3, 30);

  // how far the two halves have parted (0 closed .. coveW wide)
  let gap;
  if (stage === 1) gap = 0;
  else if (stage === 2) gap = coveW * 0.34;
  else if (stage === 3) gap = coveW * 0.78;
  else gap = coveW * 0.92;

  const breathe = Math.sin(t * 1.6) * 3;

  // ---- Arg inside the opening (drawn before curtains so the frayed edges frame him) ----
  if (stage === 2 || stage === 3) {
    ctx.save();
    const openLeft = cx - gap / 2;
    ctx.beginPath();
    ctx.rect(openLeft, coveTop, gap, coveH);
    ctx.clip();
    const stepping = stage === 3;
    const argScale = (coveH / 250) * (stepping ? 1.18 : 1.0);
    const feetY = floorY - 8;
    const argY = feetY - 110 * argScale + breathe + (stepping ? 4 : 16);
    drawArg(ctx, cx, argY, argScale, 1.25);
    ctx.restore();
  }

  // stage 4: empty cove + "Out of Order" sign (he's left)
  if (stage === 4) {
    ctx.save();
    ctx.strokeStyle = '#5a4a2a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, coveTop); ctx.lineTo(cx, coveTop + coveH * 0.12); ctx.stroke();
    ctx.translate(cx, coveTop + coveH * 0.30);
    ctx.rotate(-0.04 + Math.sin(t) * 0.02);
    ctx.fillStyle = '#b9a06e';
    ctx.fillRect(-80, -30, 160, 60);
    ctx.strokeStyle = '#6f5a32'; ctx.lineWidth = 3;
    ctx.strokeRect(-80, -30, 160, 60);
    ctx.fillStyle = '#2a1a0c';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('OUT OF', 0, -10);
    ctx.fillText('ORDER', 0, 12);
    ctx.restore();
  }

  // ---- curtain halves: maroon/brown drape, frayed inner edge, tattered hem, muted gold stars ----
  const drawCurtainHalf = (isLeft) => {
    const halfW = (coveW - gap) / 2;
    if (halfW <= 1) return;
    const outerX = isLeft ? coveLeft : coveRight;
    const innerX = isLeft ? coveLeft + halfW : coveRight - halfW;
    const left = Math.min(outerX, innerX);
    const bottom = coveTop + coveH;
    const sgn = isLeft ? -1 : 1;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(outerX, coveTop);
    ctx.lineTo(innerX, coveTop);
    const segs = 24;
    for (let i = 1; i <= segs; i++) {
      const cy = coveTop + coveH * (i / segs);
      const wave = Math.sin(i * 0.9 + (isLeft ? 0 : 1.3)) * 6 + Math.cos(i * 1.9) * 4;
      ctx.lineTo(innerX + sgn * wave * (i / segs) * 0.7, cy);
    }
    // tattered bottom hem (jagged)
    const hem = 8;
    for (let i = 0; i <= hem; i++) {
      const hx = innerX + (outerX - innerX) * (i / hem);
      const dip = (i % 2 === 0 ? 0 : -14) + Math.sin(i * 2.1) * 4;
      ctx.lineTo(hx, bottom + dip);
    }
    ctx.lineTo(outerX, coveTop);
    ctx.closePath();

    const grad = ctx.createLinearGradient(outerX, 0, innerX, 0);
    grad.addColorStop(0, '#37130f');
    grad.addColorStop(0.5, '#5e2118');
    grad.addColorStop(1, '#280c09');
    ctx.fillStyle = grad;
    ctx.fill();

    // fold ridges + stars, clipped to the drape
    ctx.save();
    ctx.clip();
    const folds = 5;
    for (let f = 0; f < folds; f++) {
      const fx = left + halfW * (f + 0.5) / folds;
      const fg = ctx.createLinearGradient(fx - halfW * 0.13, 0, fx + halfW * 0.13, 0);
      fg.addColorStop(0, 'rgba(0,0,0,0.35)');
      fg.addColorStop(0.5, 'rgba(120,58,34,0.30)');
      fg.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = fg;
      ctx.fillRect(left, coveTop - 4, halfW, coveH + 24);
    }
    ctx.fillStyle = 'rgba(196,156,76,0.34)';
    for (let k = 0; k < 14; k++) {
      const rx = Math.sin(k * 12.9 + (isLeft ? 0 : 5)) * 0.5 + 0.5;
      const ry = Math.cos(k * 7.7) * 0.5 + 0.5;
      star(ctx, left + rx * halfW, coveTop + ry * coveH, 3.2);
    }
    ctx.restore();
    ctx.restore();
  };
  drawCurtainHalf(true);
  drawCurtainHalf(false);

  // stage 1: dim eyes pressing at the closed seam — a hint he's behind the curtain
  if (stage === 1) {
    const a = 0.45 + Math.sin(t * 2) * 0.15;
    glowEye(ctx, cx - 10, coveTop + coveH * 0.42 + breathe, a);
    glowEye(ctx, cx + 10, coveTop + coveH * 0.42 + breathe, a);
  }

  // "PIRATE COVE" placard on the stage
  ctx.save();
  ctx.translate(coveLeft + 8, floorY - 40);
  ctx.rotate(-0.04);
  ctx.fillStyle = '#3a2a18';
  ctx.fillRect(-4, -20, 110, 40);
  ctx.strokeStyle = '#22160a'; ctx.lineWidth = 3;
  ctx.strokeRect(-4, -20, 110, 40);
  ctx.fillStyle = '#d8b886';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('PIRATE COVE', 51, 0);
  ctx.restore();

  // cove interior vignette so the curtain reads as recessed
  const vig = ctx.createRadialGradient(cx, coveTop + coveH * 0.45, coveH * 0.2, cx, coveTop + coveH * 0.45, coveH * 0.9);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(coveLeft - 24, coveTop - 16, coveW + 48, coveH + 40);
}
