// Pirate Cove camera (CAM7) drawn by emergence STAGE. Placeholder hand art — to be
// replaced by a polished agy version (same signature: drawCove(ctx, W, H, stage, t)).
// stage 1 = curtains closed (eyes peek), 2 = parted slightly, 3 = Arg out as a dark figure
// with glowing eyes, 4 = curtains open + "Sorry! Out of Order" sign (he has left to sprint).
export function drawCove(ctx, W, H, stage, t) {
  ctx.fillStyle = '#160f0a'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0e0a07'; ctx.fillRect(W * 0.18, H * 0.1, W * 0.64, H * 0.62);   // back wall
  ctx.fillStyle = '#241a12'; ctx.fillRect(W * 0.1, H * 0.72, W * 0.8, H * 0.2);      // floor
  ctx.fillStyle = '#2e2016'; ctx.fillRect(W * 0.18, H * 0.68, W * 0.64, 12);         // platform lip

  const cx = W * 0.5, cy = H * 0.42;
  if (stage === 3) {
    // Arg leaving the cove: a black figure with glowing eyes
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(cx, cy + H * 0.14, W * 0.085, H * 0.22, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy - H * 0.02, W * 0.055, 0, 7); ctx.fill();
    const fl = 0.6 + 0.4 * Math.abs(Math.sin(t * 6));
    ctx.save(); ctx.globalAlpha = fl; ctx.fillStyle = '#ff3030';
    ctx.beginPath(); ctx.arc(cx - 18, cy - H * 0.02, 7, 0, 7); ctx.arc(cx + 18, cy - H * 0.02, 7, 0, 7); ctx.fill(); ctx.restore();
  } else if (stage === 1 || stage === 2) {
    // peeking glowing eyes behind the seam
    const fl = 0.45 + 0.55 * Math.abs(Math.sin(t * 5));
    ctx.save(); ctx.globalAlpha = fl; ctx.fillStyle = '#ffd23a';
    ctx.beginPath(); ctx.arc(cx - 14, cy, 6, 0, 7); ctx.arc(cx + 14, cy, 6, 0, 7); ctx.fill(); ctx.restore();
  }

  // curtains (two halves) retract outward as stage rises
  const openAmt = stage >= 4 ? 1 : stage === 3 ? 0.6 : stage === 2 ? 0.28 : 0;
  const span = W * 0.64, half = span / 2, coveL = W * 0.18, coveR = W * 0.82;
  curtain(ctx, coveL, H * 0.1, half * (1 - openAmt), H * 0.62, t);
  curtain(ctx, coveR - half * (1 - openAmt), H * 0.1, half * (1 - openAmt), H * 0.62, t);
  ctx.fillStyle = '#5a1530'; ctx.fillRect(W * 0.16, H * 0.08, W * 0.68, H * 0.06); // valance

  if (stage >= 4) {
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, H * 0.14); ctx.lineTo(cx, H * 0.4 - 44); ctx.stroke();
    ctx.save(); ctx.translate(cx, H * 0.4); ctx.rotate(Math.sin(t * 1.5) * 0.03);
    ctx.fillStyle = '#e8e2d0'; ctx.fillRect(-130, -44, 260, 88);
    ctx.strokeStyle = '#8a1a1a'; ctx.lineWidth = 4; ctx.strokeRect(-130, -44, 260, 88);
    ctx.fillStyle = '#8a1a1a'; ctx.textAlign = 'center';
    ctx.font = 'bold 28px Georgia'; ctx.fillText('Sorry!', 0, -8);
    ctx.font = 'bold 18px Georgia'; ctx.fillText('Out of Order', 0, 24);
    ctx.textAlign = 'left'; ctx.restore();
  }
}

function curtain(ctx, x, y, w, h, t) {
  if (w <= 1) return;
  ctx.fillStyle = '#6a1b34'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#4a0f22'; ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) { const fx = x + (i + 0.5) * (w / 6) + Math.sin(t * 1.2 + i) * 2; ctx.beginPath(); ctx.moveTo(fx, y); ctx.lineTo(fx, y + h); ctx.stroke(); }
  ctx.fillStyle = '#d8b23a';
  for (let i = 0; i < 10; i++) { const sx = x + w * ((i * 37) % 100) / 100; const sy = y + h * ((i * 53) % 100) / 100; star(ctx, sx, sy, 5); }
}
function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); const a2 = a + Math.PI / 5; ctx.lineTo(x + Math.cos(a2) * r * 0.45, y + Math.sin(a2) * r * 0.45); }
  ctx.closePath(); ctx.fill();
}
