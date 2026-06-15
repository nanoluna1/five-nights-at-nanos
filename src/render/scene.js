// via Google Antigravity CLI
export function drawOfficeBackdrop(ctx, W, H, sceneW, fanAngle) {
    const leftMargin = 430;
    const rightMargin = 430;
    const centerW = sceneW - leftMargin - rightMargin;
    
    if (centerW <= 0) return;

    ctx.save();
    
    // Create a clip region for the center area to ensure left and right are transparent
    ctx.beginPath();
    ctx.rect(leftMargin, 0, centerW, H);
    ctx.clip();

    // 1. Walls (Layered with Vignette)
    const wallGrad = ctx.createLinearGradient(0, 0, 0, H * 0.7);
    wallGrad.addColorStop(0, '#111');
    wallGrad.addColorStop(0.3, '#2a2a2a');
    wallGrad.addColorStop(1, '#050505');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(leftMargin, 0, centerW, H * 0.7);

    // Wall texture/grime
    for(let i=0; i<150; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.3})`;
        ctx.fillRect(leftMargin + Math.random()*centerW, Math.random() * H * 0.7, Math.random()*30+5, Math.random()*60+10);
    }
    
    // Vignette
    const vig = ctx.createRadialGradient(sceneW/2, H/2, H*0.2, sceneW/2, H/2, H);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = vig;
    ctx.fillRect(leftMargin, 0, centerW, H * 0.7);

    // 2. Baseboard
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(leftMargin, H * 0.7 - 20, centerW, 20);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(leftMargin, H * 0.7 - 20);
    ctx.lineTo(sceneW - rightMargin, H * 0.7 - 20);
    ctx.moveTo(leftMargin, H * 0.7);
    ctx.lineTo(sceneW - rightMargin, H * 0.7);
    ctx.stroke();

    // 3. Floor
    const floorGrad = ctx.createLinearGradient(0, H * 0.7, 0, H);
    floorGrad.addColorStop(0, '#0a0a0a');
    floorGrad.addColorStop(1, '#1e1e1e');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(leftMargin, H * 0.7, centerW, H * 0.3);
    
    // Floor tiles (perspective)
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let i = -8; i <= 8; i++) {
        const xTop = sceneW/2 + i * 60;
        const xBot = sceneW/2 + i * 200;
        ctx.moveTo(xTop, H * 0.7);
        ctx.lineTo(xBot, H);
    }
    for(let i = 1; i < 8; i++) {
        const y = H * 0.7 + Math.pow(i/7, 1.8) * (H * 0.3);
        ctx.moveTo(leftMargin, y);
        ctx.lineTo(sceneW - rightMargin, y);
    }
    ctx.stroke();
    
    // Floor reflection
    const reflection = ctx.createLinearGradient(0, H * 0.7, 0, H);
    reflection.addColorStop(0, 'rgba(255,255,255,0.02)');
    reflection.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = reflection;
    ctx.fillRect(leftMargin, H * 0.7, centerW, H * 0.3);

    // 4. Ceiling & Fan
    ctx.fillStyle = '#080808';
    ctx.fillRect(leftMargin, 0, centerW, H * 0.15);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(leftMargin, H * 0.15);
    ctx.lineTo(sceneW - rightMargin, H * 0.15);
    ctx.stroke();
    
    const cx = sceneW / 2;
    const cy = H * 0.05;
    
    // Fan Shadow
    ctx.save();
    ctx.translate(cx, cy + 15);
    ctx.rotate(fanAngle);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    for(let i=0; i<3; i++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.fillRect(-12, 0, 24, 120);
    }
    ctx.restore();

    // Fan Base & Blades
    ctx.fillStyle = '#151515';
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, Math.PI*2);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(fanAngle);
    for(let i=0; i<3; i++) {
        ctx.rotate((Math.PI * 2) / 3);
        // Blade connector
        ctx.fillStyle = '#222';
        ctx.fillRect(-4, 15, 8, 20);
        // Blade
        ctx.fillStyle = '#333';
        ctx.fillRect(-10, 35, 20, 90);
        ctx.fillStyle = '#222';
        ctx.fillRect(-8, 35, 16, 85);
    }
    ctx.restore();
    
    // Wall sconces
    function drawSconce(x, y) {
        // Base
        ctx.fillStyle = '#111';
        ctx.fillRect(x - 12, y, 24, 35);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(x - 12, y, 24, 35);
        
        // Light bulb/cover
        ctx.fillStyle = '#ffb366';
        ctx.beginPath();
        ctx.arc(x, y, 12, Math.PI, 0);
        ctx.fill();
        
        // Glow
        const glow = ctx.createRadialGradient(x, y, 5, x, y, 80);
        glow.addColorStop(0, 'rgba(255, 179, 102, 0.3)');
        glow.addColorStop(1, 'rgba(255, 179, 102, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(x - 80, y - 80, 160, 160);
    }
    drawSconce(cx - 180, H * 0.25);
    drawSconce(cx + 180, H * 0.25);

    // 5. 'Have fun' poster
    const px = cx - 280;
    const py = H * 0.3;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.06);
    
    // Poster paper
    ctx.fillStyle = '#ddd';
    ctx.fillRect(0, 0, 120, 160);
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(4, 4, 112, 152);
    
    // Dirt overlay
    ctx.fillStyle = 'rgba(50,40,30,0.2)';
    for(let i=0; i<15; i++) {
        ctx.fillRect(Math.random()*100, Math.random()*140, Math.random()*20+5, Math.random()*20+5);
    }
    
    // "Have fun" text
    ctx.fillStyle = '#a00';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('HAVE', 30, 28);
    ctx.fillText('FUN!', 35, 52);
    
    // Mascots
    // Brown owl (top left)
    ctx.fillStyle = '#8b5a2b';
    ctx.beginPath(); ctx.arc(30, 85, 16, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(25, 82, 4, 0, Math.PI*2); ctx.arc(35, 82, 4, 0, Math.PI*2); ctx.fill();
    // Teal cat (top right)
    ctx.fillStyle = '#008080';
    ctx.beginPath(); ctx.arc(90, 85, 16, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(80, 75); ctx.lineTo(85, 60); ctx.lineTo(95, 75); ctx.fill();
    ctx.beginPath(); ctx.moveTo(100, 75); ctx.lineTo(95, 60); ctx.lineTo(85, 75); ctx.fill();
    // Gold rooster (bottom left)
    ctx.fillStyle = '#daa520';
    ctx.beginPath(); ctx.arc(30, 130, 16, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#d22'; ctx.beginPath(); ctx.arc(30, 115, 6, 0, Math.PI*2); ctx.fill(); // comb
    // Green croc (bottom right)
    ctx.fillStyle = '#228b22';
    ctx.beginPath(); ctx.arc(90, 130, 16, 0, Math.PI*2); ctx.fill();
    ctx.fillRect(80, 130, 20, 10); // snout
    
    ctx.restore();

    // 6. Extra Decor
    // Wall clock
    ctx.beginPath();
    ctx.arc(cx + 280, H * 0.25, 30, 0, Math.PI*2);
    ctx.fillStyle = '#eee';
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 5;
    ctx.stroke();
    // Clock hands & ticks
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(cx + 280, H * 0.25, 3, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 280, H * 0.25); ctx.lineTo(cx + 280 + 12, H * 0.25 + 12);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 280, H * 0.25); ctx.lineTo(cx + 280, H * 0.25 - 18);
    ctx.stroke();
    for(let i=0; i<12; i++) {
        const a = (i/12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + 280 + Math.cos(a)*22, H * 0.25 + Math.sin(a)*22);
        ctx.lineTo(cx + 280 + Math.cos(a)*26, H * 0.25 + Math.sin(a)*26);
        ctx.stroke();
    }

    // Vent grate
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(cx - 350, H * 0.55, 90, 50);
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 4;
    ctx.strokeRect(cx - 350, H * 0.55, 90, 50);
    ctx.fillStyle = '#000';
    for(let i=1; i<6; i++) {
        ctx.fillRect(cx - 350 + 5, H * 0.55 + i*8, 80, 4);
    }

    // Hanging cables
    ctx.beginPath();
    ctx.moveTo(cx - 60, 0);
    ctx.quadraticCurveTo(cx + 20, H * 0.35, cx + 120, 0);
    ctx.strokeStyle = '#151515';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 100, 0);
    ctx.quadraticCurveTo(cx - 50, H * 0.25, cx + 60, 0);
    ctx.lineWidth = 2;
    ctx.stroke();

    // Second tattered poster
    ctx.save();
    ctx.translate(cx + 170, H * 0.45);
    ctx.rotate(0.08);
    ctx.fillStyle = '#977';
    ctx.beginPath();
    ctx.moveTo(0,0); ctx.lineTo(70,0); ctx.lineTo(65,25); ctx.lineTo(75,90);
    ctx.lineTo(45,80); ctx.lineTo(25,95); ctx.lineTo(0,85); ctx.fill();
    ctx.fillStyle = '#422';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('RULES', 12, 25);
    ctx.fillRect(10, 35, 50, 4);
    ctx.fillRect(10, 45, 45, 4);
    ctx.fillRect(10, 55, 55, 4);
    ctx.restore();

    // Confetti on floor
    for(let i=0; i<60; i++) {
        ctx.fillStyle = ['#900', '#080', '#009', '#aa0', '#808'][Math.floor(Math.random()*5)];
        const cxF = leftMargin + Math.random() * centerW;
        const cyF = H * 0.7 + Math.random() * H * 0.3;
        ctx.save();
        ctx.translate(cxF, cyF);
        ctx.rotate(Math.random() * Math.PI);
        ctx.fillRect(-3, -3, 6, 6);
        ctx.restore();
    }

    // 7. Foreground Desk
    const deskW = 750;
    const deskH = 220;
    const deskX = cx - deskW/2;
    const deskY = H - deskH;
    
    // Desk body
    const deskGrad = ctx.createLinearGradient(0, deskY, 0, H);
    deskGrad.addColorStop(0, '#3a3a3a');
    deskGrad.addColorStop(1, '#111');
    ctx.fillStyle = deskGrad;
    ctx.fillRect(deskX, deskY, deskW, deskH);
    
    // Desk top rim
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(deskX, deskY, deskW, 25); 
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(deskX, deskY, deskW, 25);
    
    // Desk shadow under rim
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(deskX, deskY + 25, deskW, 15);
    
    // Desk front panels
    ctx.strokeStyle = '#222';
    ctx.strokeRect(deskX + 20, deskY + 50, 200, deskH - 70);
    ctx.strokeRect(deskX + deskW - 220, deskY + 50, 200, deskH - 70);

    // Glowing CRT Monitor
    const crtW = 180;
    const crtH = 160;
    const crtX = cx - 220;
    const crtY = deskY - 110;
    
    // Helper for rounded rects
    const roundRect = (x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    };

    // Monitor casing
    ctx.fillStyle = '#222';
    roundRect(crtX, crtY, crtW, crtH, 15);
    ctx.fill();
    ctx.fillStyle = '#151515';
    roundRect(crtX+12, crtY+12, crtW-24, crtH-24, 8);
    ctx.fill();

    // Monitor screen (glowing greenish)
    ctx.fillStyle = '#0a2a0a';
    roundRect(crtX+18, crtY+18, crtW-36, crtH-36, 10);
    ctx.fill();
    
    // Grid lines (scanlines)
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.15)';
    ctx.lineWidth = 1;
    for(let i=0; i<crtH-36; i+=4) {
        ctx.beginPath(); 
        ctx.moveTo(crtX+18, crtY+18+i); 
        ctx.lineTo(crtX+crtW-18, crtY+18+i); 
        ctx.stroke();
    }
    // Vignette on screen
    const screenVig = ctx.createRadialGradient(crtX+crtW/2, crtY+crtH/2, 20, crtX+crtW/2, crtY+crtH/2, crtH);
    screenVig.addColorStop(0, 'rgba(0,0,0,0)');
    screenVig.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = screenVig;
    roundRect(crtX+18, crtY+18, crtW-36, crtH-36, 10);
    ctx.fill();

    // Glow effect
    const crtGlow = ctx.createRadialGradient(crtX+crtW/2, crtY+crtH/2, 10, crtX+crtW/2, crtY+crtH/2, 150);
    crtGlow.addColorStop(0, 'rgba(0, 255, 50, 0.25)');
    crtGlow.addColorStop(1, 'rgba(0, 255, 50, 0)');
    ctx.fillStyle = crtGlow;
    ctx.fillRect(crtX-100, crtY-100, crtW+200, crtH+200);

    // Retro Desk Phone
    const phoneX = cx + 120;
    const phoneY = deskY - 45;
    
    // Cradle
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(phoneX, phoneY + 45);
    ctx.lineTo(phoneX + 110, phoneY + 45);
    ctx.lineTo(phoneX + 90, phoneY);
    ctx.lineTo(phoneX + 20, phoneY);
    ctx.fill();
    ctx.strokeStyle = '#050505';
    ctx.stroke();
    // Buttons
    ctx.fillStyle = '#333';
    for(let row=0; row<3; row++) {
        for(let col=0; col<3; col++) {
            ctx.fillRect(phoneX + 40 + col*12, phoneY + 12 + row*10, 8, 6);
        }
    }
    
    // Blue Handset
    ctx.fillStyle = '#1a3a5a';
    roundRect(phoneX + 10, phoneY - 15, 90, 24, 12);
    ctx.fill();
    // Earpiece/Mouthpiece
    ctx.fillStyle = '#0f1f2f';
    ctx.beginPath(); ctx.arc(phoneX + 20, phoneY - 3, 16, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(phoneX + 90, phoneY - 3, 16, 0, Math.PI*2); ctx.fill();

    // Cord
    ctx.beginPath();
    ctx.moveTo(phoneX + 10, phoneY);
    for(let i=0; i<6; i++) {
        ctx.quadraticCurveTo(phoneX - 30, phoneY + 10 + i*6, phoneX, phoneY + 16 + i*6);
    }
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Desk papers / mess
    ctx.fillStyle = '#ccc';
    ctx.save();
    ctx.translate(cx + 10, deskY - 5);
    ctx.rotate(-0.15);
    ctx.fillRect(0, 0, 50, 35);
    ctx.fillStyle = '#999';
    ctx.fillRect(5, 5, 40, 2);
    ctx.fillRect(5, 12, 35, 2);
    ctx.fillRect(5, 19, 20, 2);
    // Coffee stain
    ctx.strokeStyle = 'rgba(100, 50, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(35, 25, 8, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
    
    // Crumpled paper
    ctx.fillStyle = '#ddd';
    ctx.beginPath(); ctx.arc(cx + 80, deskY + 10, 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#bbb';
    ctx.beginPath(); ctx.arc(cx + 82, deskY + 12, 6, 0, Math.PI*2); ctx.fill();

    ctx.restore();
}

export function drawDoorway(ctx, x, top, w, h, closedAmt) {
    ctx.save();
    // Doorway frame
    ctx.fillStyle = '#181818';
    ctx.fillRect(x - 25, top - 25, w + 50, h + 25); // Outer frame
    ctx.fillStyle = '#050505';
    ctx.fillRect(x, top, w, h); // Inner dark hallway

    // Inner shadow/depth
    const hallGrad = ctx.createLinearGradient(x, top, x, top + h);
    hallGrad.addColorStop(0, '#000');
    hallGrad.addColorStop(1, '#080808');
    ctx.fillStyle = hallGrad;
    ctx.fillRect(x, top, w, h);

    // Blast door
    const doorH = h * Math.max(0, Math.min(1, closedAmt));
    if (doorH > 0) {
        const doorY = top;
        ctx.fillStyle = '#2c2c2c';
        ctx.fillRect(x, doorY, w, doorH);

        // Ribs
        ctx.fillStyle = '#1e1e1e';
        for(let i = 0; i < doorH; i += 25) {
            ctx.fillRect(x, doorY + i, w, 5);
            ctx.fillStyle = '#3a3a3a';
            ctx.fillRect(x, doorY + i + 5, w, 2);
            ctx.fillStyle = '#1e1e1e';
        }

        // Rivets
        ctx.fillStyle = '#0a0a0a';
        for(let i = 12; i < doorH; i += 50) {
            ctx.beginPath(); ctx.arc(x + 15, doorY + i, 4, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + w - 15, doorY + i, 4, 0, Math.PI*2); ctx.fill();
        }

        // Warning stripe at bottom
        if (doorH > 15) {
            ctx.fillStyle = '#bbaa00';
            ctx.fillRect(x, doorY + doorH - 15, w, 15);
            ctx.fillStyle = '#111';
            for(let i = 0; i < w; i += 30) {
                ctx.beginPath();
                ctx.moveTo(x + i, doorY + doorH - 15);
                ctx.lineTo(x + i + 15, doorY + doorH - 15);
                ctx.lineTo(x + i + 5, doorY + doorH);
                ctx.lineTo(x + i - 10, doorY + doorH);
                ctx.fill();
            }
        }
    }
    
    // Grime on frame
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 25, top - 25, w + 50, 25); // Top grime
    ctx.fillRect(x - 25, top, 25, h); // Left grime
    ctx.fillRect(x + w, top, 25, h); // Right grime

    ctx.restore();
}

export function drawWindow(ctx, x, top, w, h, lit) {
    ctx.save();
    
    // Frame
    ctx.fillStyle = '#121212';
    ctx.fillRect(x - 15, top - 15, w + 30, h + 30);
    
    // Frame inner shadow
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, top, w, h);
    
    // Glass Background
    if (lit) {
        ctx.fillStyle = '#252a25'; // Dim lit hallway color
        ctx.fillRect(x, top, w, h);
        
        // Faint hallway depth
        const depth = ctx.createLinearGradient(x, top, x+w, top+h);
        depth.addColorStop(0, '#0a0a0a');
        depth.addColorStop(0.5, '#2a3a2a');
        depth.addColorStop(1, '#050505');
        ctx.fillStyle = depth;
        ctx.fillRect(x, top, w, h);

        // Light reflection
        ctx.fillStyle = 'rgba(120, 180, 120, 0.15)';
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x + w * 0.5, top);
        ctx.lineTo(x, top + h * 0.5);
        ctx.fill();
    } else {
        ctx.fillStyle = '#030303';
        ctx.fillRect(x, top, w, h);

        // Faint reflection
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x + w * 0.7, top);
        ctx.lineTo(x + w * 0.2, top + h);
        ctx.lineTo(x, top + h);
        ctx.fill();
    }

    // Cross mullions
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x + w/2 - 6, top, 12, h); // Vertical
    ctx.fillRect(x, top + h/2 - 6, w, 12); // Horizontal

    // Window dirt
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    for(let i=0; i<40; i++) {
        ctx.beginPath();
        ctx.arc(x + Math.random()*w, top + Math.random()*h, Math.random()*20, 0, Math.PI*2);
        ctx.fill();
    }

    ctx.restore();
}

export function drawRoom(ctx, W, H, roomId, t) {
    ctx.save();
    
    // Base static
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);
    
    // Subtle breathing motion
    const breathY = Math.sin(t * 1.5) * 4;
    ctx.translate(0, breathY);

    if (roomId === 'CAM1A') {
        // Show Stage
        // Curtains
        ctx.fillStyle = '#3a0000';
        ctx.fillRect(0, 0, W * 0.25, H);
        ctx.fillRect(W * 0.75, 0, W * 0.25, H);
        // Stage floor
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.moveTo(W * 0.25, H * 0.65);
        ctx.lineTo(W * 0.75, H * 0.65);
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.fill();
        // Spotlights
        const spot = ctx.createRadialGradient(W/2, H*0.35, 20, W/2, H*0.35, 250);
        spot.addColorStop(0, 'rgba(255,255,255,0.15)');
        spot.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = spot;
        ctx.fillRect(0,0,W,H);
        
        // Stage backdrop
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(W*0.25, 0, W*0.5, H*0.65);
        
        // Clouds on backdrop
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.arc(W*0.4, H*0.25, 35, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(W*0.6, H*0.15, 45, 0, Math.PI*2); ctx.fill();

    } else if (roomId === 'CAM1B') {
        // Dining Area
        // Floor tiles
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, H*0.4, W, H*0.6);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        for(let i=-6; i<=6; i++) {
            ctx.beginPath();
            ctx.moveTo(W/2 + i*W*0.12, H*0.4);
            ctx.lineTo(W/2 + i*W*0.35, H);
            ctx.stroke();
        }
        for(let i=0; i<6; i++) {
            ctx.beginPath();
            ctx.moveTo(0, H*0.4 + i*H*0.1);
            ctx.lineTo(W, H*0.4 + i*H*0.1);
            ctx.stroke();
        }
        
        // Tables
        const drawTable = (tx, ty, s) => {
            ctx.fillStyle = '#222';
            ctx.beginPath(); ctx.ellipse(tx, ty, 70*s, 25*s, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#0f0f0f';
            ctx.fillRect(tx-15*s, ty, 30*s, 80*s);
            // Party hat
            ctx.fillStyle = '#800';
            ctx.beginPath();
            ctx.moveTo(tx, ty-10*s); ctx.lineTo(tx-15*s, ty+8*s); ctx.lineTo(tx+15*s, ty+8*s); ctx.fill();
            // Confetti
            ctx.fillStyle = '#080';
            ctx.fillRect(tx-30*s, ty-5*s, 4, 4);
            ctx.fillStyle = '#008';
            ctx.fillRect(tx+20*s, ty+5*s, 4, 4);
        };
        drawTable(W*0.25, H*0.75, 1.1);
        drawTable(W*0.75, H*0.65, 0.9);
        drawTable(W*0.5, H*0.85, 1.3);

    } else if (roomId === 'CAM2') {
        // Left Hallway
        const vpX = W * 0.85;
        const vpY = H * 0.45;
        
        ctx.fillStyle = '#151515';
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(vpX, vpY); ctx.lineTo(0, H); ctx.fill(); // Left wall
        
        // Doors
        ctx.fillStyle = '#050505';
        ctx.beginPath(); ctx.moveTo(W*0.15, H*0.25); ctx.lineTo(W*0.4, H*0.35); ctx.lineTo(W*0.4, H*0.85); ctx.lineTo(W*0.15, H*0.95); ctx.fill();
        ctx.beginPath(); ctx.moveTo(W*0.5, H*0.38); ctx.lineTo(W*0.65, H*0.42); ctx.lineTo(W*0.65, H*0.7); ctx.lineTo(W*0.5, H*0.8); ctx.fill();

        // Floor
        ctx.fillStyle = '#1c1c1c';
        ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(vpX, vpY); ctx.lineTo(W, H); ctx.fill();
        
        // Ceiling light
        ctx.fillStyle = 'rgba(220,220,220,0.08)';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(vpX, vpY); ctx.lineTo(W, 0); ctx.fill();

    } else if (roomId === 'CAM4') {
        // Right Hallway
        const vpX = W * 0.15;
        const vpY = H * 0.45;
        
        ctx.fillStyle = '#151515';
        ctx.beginPath(); ctx.moveTo(W,0); ctx.lineTo(vpX, vpY); ctx.lineTo(W, H); ctx.fill(); // Right wall
        
        // Posters on wall
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath(); ctx.moveTo(W*0.85, H*0.25); ctx.lineTo(W*0.6, H*0.35); ctx.lineTo(W*0.6, H*0.65); ctx.lineTo(W*0.85, H*0.55); ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.moveTo(W*0.5, H*0.38); ctx.lineTo(W*0.4, H*0.41); ctx.lineTo(W*0.4, H*0.6); ctx.lineTo(W*0.5, H*0.55); ctx.fill();

        // Floor
        ctx.fillStyle = '#1c1c1c';
        ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(vpX, vpY); ctx.lineTo(W, H); ctx.fill();

        // Ceiling light
        ctx.fillStyle = 'rgba(220,220,255,0.06)';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(vpX, vpY); ctx.lineTo(W, 0); ctx.fill();

    } else if (roomId === 'CAM3') {
        // Supply Closet
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0,0,W,H);
        
        // Shelves
        ctx.fillStyle = '#1a1a1a';
        for(let i=1; i<5; i++) {
            ctx.fillRect(W*0.05, H*0.18*i, W*0.9, 25);
        }
        
        // Items
        ctx.fillStyle = '#333';
        ctx.fillRect(W*0.15, H*0.18-50, 60, 50); // Box
        ctx.fillStyle = '#2a1a1a';
        ctx.beginPath(); ctx.arc(W*0.45, H*0.36-25, 25, 0, Math.PI*2); ctx.fill(); // Head/ball
        ctx.fillStyle = '#444';
        ctx.fillRect(W*0.65, H*0.54-70, 35, 70); // Bottle/can
        ctx.fillRect(W*0.8, H*0.54-35, 45, 35); // Small box
        ctx.fillStyle = '#555';
        ctx.fillRect(W*0.25, H*0.72-40, 80, 40); // Large box
        ctx.fillStyle = '#111';
        // Strings hanging
        ctx.fillRect(W*0.3, 0, 2, H*0.4);
        ctx.fillRect(W*0.7, 0, 2, H*0.2);

    } else if (roomId === 'CAM7') {
        // Pirate Cove
        // Tattered star curtain
        ctx.fillStyle = '#2a002a'; // Deep purple hue
        ctx.fillRect(0, 0, W, H);
        
        // Stars
        ctx.fillStyle = '#c8c800';
        for(let i=0; i<25; i++) {
            const sx = (i * 67) % W;
            const sy = (i * 83) % (H*0.7);
            ctx.beginPath();
            ctx.arc(sx, sy, 4, 0, Math.PI*2);
            ctx.fill();
        }

        // Opening
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(W*0.25, H);
        ctx.lineTo(W*0.4, H*0.15);
        ctx.lineTo(W*0.6, H*0.15);
        ctx.lineTo(W*0.75, H);
        ctx.fill();
        
        // "Out of Order" sign
        ctx.fillStyle = '#4a1a1a';
        ctx.fillRect(W*0.35, H*0.65, W*0.3, 60);
        ctx.fillStyle = '#ccc';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('OUT OF', W*0.42, H*0.65 + 25);
        ctx.fillText('ORDER', W*0.42, H*0.65 + 50);
    } else {
        // Fallback for unknown rooms
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0,0,W,H);
        ctx.fillStyle = '#333';
        ctx.font = '24px monospace';
        ctx.fillText(roomId || 'UNKNOWN', W/2 - 50, H/2);
    }
    
    // Vignette / Camera edge shadow & static
    const camVig = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H);
    camVig.addColorStop(0, 'rgba(0,0,0,0)');
    camVig.addColorStop(1, 'rgba(0,0,0,0.95)');
    ctx.fillStyle = camVig;
    ctx.fillRect(0, 0, W, H);

    ctx.restore();
}

export function drawJumpscareBg(ctx, W, H, t) {
    ctx.save();
    // Violent near-black
    ctx.fillStyle = '#030000';
    ctx.fillRect(0, 0, W, H);
    
    // Red strobe
    if (Math.floor(t * 30) % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.35)';
        ctx.fillRect(0, 0, W, H);
    }
    
    // Distorted lines
    ctx.strokeStyle = 'rgba(200, 0, 0, 0.6)';
    ctx.lineWidth = 3;
    for(let i=0; i<15; i++) {
        ctx.beginPath();
        ctx.moveTo(0, Math.random() * H);
        ctx.lineTo(W, Math.random() * H);
        ctx.stroke();
    }
    ctx.restore();
}
