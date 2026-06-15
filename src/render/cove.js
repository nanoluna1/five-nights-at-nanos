// via Google Antigravity CLI
export function drawCove(ctx, W, H, stage, t) {
  // Clear background (dark wall behind cove)
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);

  const centerX = W / 2;
  
  // Floor/Stage platform
  ctx.fillStyle = '#111116';
  ctx.fillRect(0, H * 0.75, W, H * 0.25);
  ctx.beginPath();
  ctx.moveTo(0, H * 0.75);
  ctx.lineTo(W, H * 0.75);
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 5;
  ctx.stroke();

  // "PIRATE COVE" Placard on the left side
  ctx.save();
  ctx.translate(W * 0.15, H * 0.85);
  ctx.rotate(-0.05);
  ctx.fillStyle = '#3a2a18';
  ctx.fillRect(-60, -25, 120, 50);
  ctx.strokeStyle = '#2a1a08';
  ctx.lineWidth = 3;
  ctx.strokeRect(-60, -25, 120, 50);
  ctx.fillStyle = '#d0b080';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText("PIRATE", 0, -8);
  ctx.fillText("COVE", 0, 10);
  ctx.restore();

  // Cove interior (dark)
  const coveWidth = W * 0.7;
  const coveLeft = (W - coveWidth) / 2;
  const coveRight = coveLeft + coveWidth;
  const coveTop = H * 0.1;
  const coveBottom = H * 0.75;
  
  ctx.fillStyle = '#050505';
  ctx.fillRect(coveLeft, coveTop, coveWidth, coveBottom - coveTop);

  // Breathing/Idle animation
  const breathe = Math.sin(t * 2) * 2;
  
  const drawArg = (opacity, mode) => {
    // mode: 1 = two faint eyes, 2 = parted (green snout, eyepatch, one glowing eye), 3 = silhouette stepping out
    ctx.save();
    ctx.globalAlpha = opacity;
    
    let isSteppingOut = (mode === 3);
    let crocCenterX = centerX + (isSteppingOut ? W * 0.1 : 0);
    let crocCenterY = H * 0.55 + breathe + (isSteppingOut ? H * 0.05 : 0);
    let scale = isSteppingOut ? 1.4 : 1.1;

    ctx.translate(crocCenterX, crocCenterY);
    ctx.scale(scale, scale);

    if (mode === 1) {
      // Just two faint eyes
      ctx.fillStyle = '#ffaa00';
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(-15, -10, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(15, -10, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Body
      ctx.fillStyle = mode === 2 ? '#1a2b1a' : '#050505'; // Swamp green or mostly black
      ctx.beginPath();
      ctx.ellipse(0, 100, 45, 80, 0, 0, Math.PI * 2); 
      ctx.fill();

      // Head
      ctx.beginPath();
      ctx.ellipse(0, 0, 35, 30, 0, 0, Math.PI * 2);
      ctx.fill();

      // Snout
      ctx.beginPath();
      ctx.moveTo(-15, 10);
      ctx.lineTo(-20, 60);
      ctx.quadraticCurveTo(0, 80, 20, 60);
      ctx.lineTo(15, 10);
      ctx.fill();

      if (mode === 2) {
        // Teeth outline faint
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-18, 55);
        ctx.quadraticCurveTo(0, 65, 18, 55);
        ctx.stroke();

        // Eyepatch (right eye from viewer)
        ctx.fillStyle = '#020202';
        ctx.beginPath();
        ctx.arc(15, -5, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#020202';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(35, -10);
        ctx.lineTo(-35, 5);
        ctx.stroke();

        // Glowing Eye (left eye from viewer)
        ctx.fillStyle = '#ffaa00';
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(-15, -5, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (mode === 3) {
        // Bright Glowing Eyes (both) for silhouette mode
        ctx.fillStyle = '#ffaa00';
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(-15, -5, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(15, -5, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Hook Hand
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-40, 80);
        ctx.lineTo(-70, 90);
        ctx.stroke();

        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(-75, 105, 15, Math.PI * 1.2, Math.PI * 2.8);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  let leftCurtainWidth, rightCurtainWidth;
  
  if (stage === 1) {
    leftCurtainWidth = coveWidth * 0.49;
    rightCurtainWidth = coveWidth * 0.49;
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(centerX - 10, coveTop, 20, coveBottom - coveTop);
    ctx.clip();
    drawArg(0.6, 1);
    ctx.restore();
  } else if (stage === 2) {
    leftCurtainWidth = coveWidth * 0.35;
    rightCurtainWidth = coveWidth * 0.35;
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(coveLeft + leftCurtainWidth, coveTop, coveWidth - leftCurtainWidth - rightCurtainWidth, coveBottom - coveTop);
    ctx.clip();
    drawArg(1.0, 2);
    ctx.restore();
  } else if (stage === 3) {
    leftCurtainWidth = coveWidth * 0.15;
    rightCurtainWidth = coveWidth * 0.15;
  } else {
    leftCurtainWidth = coveWidth * 0.05;
    rightCurtainWidth = coveWidth * 0.05;

    ctx.save();
    ctx.translate(centerX, coveTop + 50);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-30, -50);
    ctx.lineTo(-20, 0);
    ctx.moveTo(30, -50);
    ctx.lineTo(20, 0);
    ctx.stroke();

    ctx.rotate(0.05 + Math.sin(t)*0.02);
    ctx.fillStyle = '#bfa888';
    ctx.fillRect(-50, -20, 100, 40);
    ctx.strokeStyle = '#8a7858';
    ctx.lineWidth = 2;
    ctx.strokeRect(-50, -20, 100, 40);
    
    ctx.fillStyle = '#333';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("Sorry!", 0, -8);
    ctx.fillText("Out of Order", 0, 8);
    ctx.restore();
  }

  const drawCurtain = (x, y, w, h, isLeft) => {
    ctx.save();
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    if (isLeft) {
      grad.addColorStop(0, '#2a0a4a');
      grad.addColorStop(1, '#4a1a7a');
    } else {
      grad.addColorStop(0, '#4a1a7a');
      grad.addColorStop(1, '#2a0a4a');
    }
    ctx.fillStyle = grad;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    
    let segments = 30;
    let segH = h / segments;
    for (let i = 0; i <= segments; i++) {
      let cy = y + i * segH;
      // create frayed/tattered look
      let offset = Math.sin(i * 0.7) * 6 + Math.cos(i * 1.3) * 4;
      let cx;
      if (isLeft) {
        cx = x + w + offset * (i/segments);
        if (i === 0) cx = x + w;
      } else {
        cx = x - offset * (i/segments);
        if (i === 0) cx = x;
      }
      ctx.lineTo(cx, cy);
    }
    
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();

    // Star pattern
    ctx.fillStyle = 'rgba(218, 165, 32, 0.7)';
    let maxW = coveWidth * 0.49;
    let starCount = Math.floor(maxW * h / 1500);
    for(let k = 0; k < starCount; k++) {
       let relX = (Math.sin(k*13.1) * 0.5 + 0.5);
       let relY = (Math.cos(k*17.3) * 0.5 + 0.5);
       // only draw if within current width
       let sx = x + relX * w;
       let sy = y + relY * h;
       
       ctx.save();
       ctx.translate(sx, sy);
       ctx.beginPath();
       for(let j=0; j<5; j++){
           ctx.lineTo(Math.cos((18 + j*72)/180*Math.PI)*4, -Math.sin((18 + j*72)/180*Math.PI)*4);
           ctx.lineTo(Math.cos((54 + j*72)/180*Math.PI)*1.5, -Math.sin((54 + j*72)/180*Math.PI)*1.5);
       }
       ctx.closePath();
       ctx.fill();
       ctx.restore();
    }
    
    ctx.restore();
  };

  drawCurtain(coveLeft, coveTop, leftCurtainWidth, coveBottom - coveTop, true);
  drawCurtain(coveRight - rightCurtainWidth, coveTop, rightCurtainWidth, coveBottom - coveTop, false);

  if (stage === 3) {
      drawArg(1.0, 3);
  }

  // Camera UI overlay (grain, scanlines, REC)
  ctx.save();
  ctx.fillStyle = 'white';
  for (let i = 0; i < (W * H * 0.015); i++) {
    let nx = Math.random() * W;
    let ny = Math.random() * H;
    let alpha = Math.random() * 0.08;
    ctx.globalAlpha = alpha;
    ctx.fillRect(nx, ny, 2, 2);
  }
  ctx.restore();

  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  for (let y = 0; y < H; y += 4) {
    ctx.fillRect(0, y, W, 1);
  }

  // Vignette
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.9);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // "CAM-05" text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.globalAlpha = 0.8;
  ctx.fillText("CAM-05", 30, 30);

  // REC blinking
  if (t % 2 < 1) {
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(W - 40, 40, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px monospace';
    ctx.fillText("REC", W - 80, 32);
  }
}
