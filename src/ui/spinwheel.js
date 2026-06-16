// Canvas spin wheel for multiplayer role assignment. Authored directly (no agy). The host decides
// the landed role; every client animates its wheel to that same role so the spin stays in sync.
import { cheats } from '../cheats.js';

export function createSpinWheel(canvas) {
  const ctx = canvas.getContext('2d');
  const cluckImgReady = () => cheats.cluckGif && cheats.cluckImg && cheats.cluckImg.complete && cheats.cluckImg.naturalWidth;
  const COLORS = { guard: '#6fae7e', har: '#8d6e63', gi: '#3a5f5f', cluck: '#d4af37', arg: '#3a602c' };
  const LABEL = { guard: 'GUARD', har: 'HAR', gi: 'GI', cluck: 'CLUCK', arg: 'ARG' };
  const TAU = Math.PI * 2;
  let roles = [], rot = 0, raf = null;

  function draw() {
    const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 16;
    ctx.clearRect(0, 0, W, H);
    const n = Math.max(1, roles.length), slice = TAU / n;
    for (let i = 0; i < roles.length; i++) {
      const a0 = -Math.PI / 2 + i * slice + rot, a1 = a0 + slice;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath();
      ctx.fillStyle = COLORS[roles[i]] || '#444'; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 3; ctx.stroke();
      const am = a0 + slice / 2, lx = cx + Math.cos(am) * R * 0.62, ly = cy + Math.sin(am) * R * 0.62;
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(am + Math.PI / 2);
      if (roles[i] === 'cluck' && cluckImgReady()) {
        const ih = 52, iw = ih * (cheats.cluckImg.naturalWidth / cheats.cluckImg.naturalHeight);
        ctx.drawImage(cheats.cluckImg, -iw / 2, -ih / 2, iw, ih);
      } else {
        ctx.fillStyle = '#0b0b0d'; ctx.font = 'bold 20px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(LABEL[roles[i]] || roles[i], 0, 0);
      }
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 6; ctx.stroke();
    // pointer at the top
    ctx.fillStyle = '#e8b23a';
    ctx.beginPath(); ctx.moveTo(cx, cy - R + 4); ctx.lineTo(cx - 16, cy - R - 20); ctx.lineTo(cx + 16, cy - R - 20); ctx.closePath(); ctx.fill();
    // center hub (the SPIN button is a DOM element layered over this)
    ctx.beginPath(); ctx.arc(cx, cy, 46, 0, TAU); ctx.fillStyle = '#15151a'; ctx.fill();
    ctx.strokeStyle = '#34333c'; ctx.lineWidth = 3; ctx.stroke();
  }

  function spinTo(role, durationMs, cb) {
    const ti = roles.indexOf(role);
    if (ti < 0) { draw(); cb && cb(); return; }
    const n = roles.length, slice = TAU / n;
    const targetMod = (((-(ti * slice + slice / 2)) % TAU) + TAU) % TAU; // rot that puts sector ti on top
    const fromMod = ((rot % TAU) + TAU) % TAU;
    const advance = ((targetMod - fromMod) % TAU + TAU) % TAU;
    const from = rot, final = from + TAU * 6 + advance, t0 = performance.now();
    if (raf) cancelAnimationFrame(raf);
    function step(now) {
      const t = Math.min(1, (now - t0) / durationMs), e = 1 - Math.pow(1 - t, 3); // easeOutCubic
      rot = from + (final - from) * e; draw();
      if (t < 1) raf = requestAnimationFrame(step); else { raf = null; rot = final % TAU; draw(); cb && cb(); }
    }
    raf = requestAnimationFrame(step);
  }

  return {
    setRoles(r) { roles = (r || []).slice(); draw(); },
    spinTo, draw,
  };
}
