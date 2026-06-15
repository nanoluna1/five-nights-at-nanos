// via Google Antigravity CLI
export function drawHar(ctx, x, y, scale, glow) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Endoskeleton Legs
    ctx.fillStyle = "#222";
    ctx.fillRect(-35, 70, 10, 40);
    ctx.fillRect(25, 70, 10, 40);
    ctx.fillStyle = "#111";
    ctx.fillRect(-40, 85, 20, 6);
    ctx.fillRect(20, 85, 20, 6);

    // Feet (Paws)
    ctx.fillStyle = "#3e2723";
    ctx.beginPath(); ctx.arc(-30, 110, 15, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(30, 110, 15, Math.PI, 0); ctx.fill();

    // Wings
    const wingGradL = ctx.createLinearGradient(-30, -20, -70, 50);
    wingGradL.addColorStop(0, "#4e342e"); wingGradL.addColorStop(1, "#1a0f0c");
    ctx.fillStyle = wingGradL;
    ctx.beginPath(); ctx.ellipse(-55, 20, 20, 60, 0.2, 0, Math.PI*2); ctx.fill();

    const wingGradR = ctx.createLinearGradient(30, -20, 70, 50);
    wingGradR.addColorStop(0, "#4e342e"); wingGradR.addColorStop(1, "#1a0f0c");
    ctx.fillStyle = wingGradR;
    ctx.beginPath(); ctx.ellipse(55, 20, 20, 60, -0.2, 0, Math.PI*2); ctx.fill();

    // Body
    const bodyGrad = ctx.createRadialGradient(0, 0, 10, 0, 20, 60);
    bodyGrad.addColorStop(0, "#5c4033");
    bodyGrad.addColorStop(1, "#2e1a14");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.ellipse(0, 20, 50, 65, 0, 0, Math.PI * 2); ctx.fill();

    // Belly plate
    ctx.fillStyle = "#795548";
    ctx.beginPath(); ctx.ellipse(0, 30, 35, 45, 0, 0, Math.PI * 2); ctx.fill();
    
    // Segment lines on belly
    ctx.strokeStyle = "#4e342e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-25, 10); ctx.lineTo(25, 10);
    ctx.moveTo(-30, 30); ctx.lineTo(30, 30);
    ctx.moveTo(-25, 50); ctx.lineTo(25, 50);
    ctx.stroke();

    // Head
    const headGrad = ctx.createRadialGradient(0, -60, 10, 0, -50, 50);
    headGrad.addColorStop(0, "#5c4033");
    headGrad.addColorStop(1, "#2e1a14");
    ctx.fillStyle = headGrad;
    ctx.beginPath(); ctx.ellipse(0, -50, 50, 45, 0, 0, Math.PI * 2); ctx.fill();

    // Ear tufts
    ctx.fillStyle = "#3e2723";
    ctx.beginPath();
    ctx.moveTo(-30, -85); ctx.lineTo(-60, -110); ctx.lineTo(-15, -90); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(30, -85); ctx.lineTo(60, -110); ctx.lineTo(15, -90); ctx.fill();

    // Face plate
    ctx.fillStyle = "#8d6e63";
    ctx.beginPath();
    ctx.ellipse(-20, -50, 22, 30, -0.1, 0, Math.PI * 2);
    ctx.ellipse(20, -50, 22, 30, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Eye sockets
    ctx.fillStyle = "#050505";
    ctx.beginPath();
    ctx.arc(-20, -55, 16, 0, Math.PI * 2);
    ctx.arc(20, -55, 16, 0, Math.PI * 2);
    ctx.fill();

    // Amber glowing eyes
    if (glow > 0) {
        ctx.globalCompositeOperation = "lighter";
        const g = Math.min(glow, 2);
        
        const drawGlow = (ex, ey) => {
            const grad = ctx.createRadialGradient(ex, ey, 0, ex, ey, 25 * g);
            grad.addColorStop(0, `rgba(255, 255, 255, ${g})`);
            grad.addColorStop(0.2, `rgba(255, 191, 0, ${g*0.8})`);
            grad.addColorStop(0.5, `rgba(200, 100, 0, ${g*0.3})`);
            grad.addColorStop(1, "rgba(255, 50, 0, 0)");
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(ex, ey, 25 * g, 0, Math.PI * 2); ctx.fill();
        };
        drawGlow(-20, -55);
        drawGlow(20, -55);
        ctx.globalCompositeOperation = "source-over";
    }

    // Hooked Beak
    ctx.fillStyle = "#ffb300";
    ctx.beginPath();
    ctx.moveTo(-12, -35); ctx.lineTo(12, -35); ctx.lineTo(0, -5); ctx.fill();
    ctx.fillStyle = "#cc8e00";
    ctx.beginPath();
    ctx.moveTo(0, -35); ctx.lineTo(12, -35); ctx.lineTo(0, -5); ctx.fill();

    // Maroon Bowtie
    ctx.fillStyle = "#800000";
    ctx.beginPath();
    ctx.moveTo(0, -5); ctx.lineTo(-20, -15); ctx.lineTo(-20, 5);
    ctx.lineTo(0, -5); ctx.lineTo(20, -15); ctx.lineTo(20, 5); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -5, 6, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
}

export function drawGi(ctx, x, y, scale, glow) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Endoskeleton Legs
    ctx.fillStyle = "#111";
    ctx.fillRect(-20, 60, 8, 50);
    ctx.fillRect(12, 60, 8, 50);
    ctx.fillStyle = "#222";
    ctx.fillRect(-24, 85, 16, 6);
    ctx.fillRect(8, 85, 16, 6);
    
    // Feet
    ctx.fillStyle = "#1a2c2c";
    ctx.beginPath(); ctx.ellipse(-16, 110, 12, 8, 0, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(16, 110, 12, 8, 0, Math.PI, 0); ctx.fill();

    // Thin robotic arms (placed behind body)
    ctx.fillStyle = "#223f3f";
    ctx.fillRect(-45, -10, 12, 55);
    ctx.fillRect(33, -10, 12, 55);

    // Lanky Body
    const bodyGrad = ctx.createLinearGradient(-30, 0, 30, 0);
    bodyGrad.addColorStop(0, "#1a2c2c");
    bodyGrad.addColorStop(0.5, "#3a5f5f");
    bodyGrad.addColorStop(1, "#1a2c2c");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.ellipse(0, 20, 28, 60, 0, 0, Math.PI * 2); ctx.fill();

    // Steel chest plate
    ctx.fillStyle = "#608080";
    ctx.beginPath(); ctx.ellipse(0, 5, 15, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#406060";
    ctx.beginPath(); ctx.ellipse(0, 40, 18, 25, 0, 0, Math.PI * 2); ctx.fill();

    // Head
    const headGrad = ctx.createRadialGradient(0, -60, 5, 0, -60, 40);
    headGrad.addColorStop(0, "#4a7575");
    headGrad.addColorStop(1, "#223f3f");
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.moveTo(-35, -50); ctx.lineTo(-20, -35); ctx.lineTo(20, -35); ctx.lineTo(35, -50);
    ctx.lineTo(25, -80); ctx.lineTo(-25, -80); ctx.fill();

    // Tall pointed ears
    ctx.fillStyle = "#223f3f";
    ctx.beginPath(); ctx.moveTo(-25, -80); ctx.lineTo(-35, -120); ctx.lineTo(-5, -80); ctx.fill();
    ctx.beginPath(); ctx.moveTo(25, -80); ctx.lineTo(35, -120); ctx.lineTo(5, -80); ctx.fill();
    
    // Ear inners
    ctx.fillStyle = "#111";
    ctx.beginPath(); ctx.moveTo(-22, -82); ctx.lineTo(-30, -110); ctx.lineTo(-10, -82); ctx.fill();
    ctx.beginPath(); ctx.moveTo(22, -82); ctx.lineTo(30, -110); ctx.lineTo(10, -82); ctx.fill();

    // Muzzle
    ctx.fillStyle = "#8aabab";
    ctx.beginPath(); ctx.ellipse(0, -45, 18, 12, 0, 0, Math.PI * 2); ctx.fill();
    
    // Nose
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.moveTo(-5, -50); ctx.lineTo(5, -50); ctx.lineTo(0, -42); ctx.fill();

    // Whiskers
    ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-15, -45); ctx.lineTo(-35, -48);
    ctx.moveTo(-15, -42); ctx.lineTo(-35, -38);
    ctx.moveTo(15, -45); ctx.lineTo(35, -48);
    ctx.moveTo(15, -42); ctx.lineTo(35, -38);
    ctx.stroke();

    // Eye sockets (narrow vertical)
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.ellipse(-15, -62, 7, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(15, -62, 7, 12, 0, 0, Math.PI * 2); ctx.fill();

    // Glowing Eyes (Green slits)
    if (glow > 0) {
        ctx.globalCompositeOperation = "lighter";
        const g = Math.min(glow, 2);
        const drawGlow = (ex, ey) => {
            const grad = ctx.createRadialGradient(ex, ey, 0, ex, ey, 20 * g);
            grad.addColorStop(0, `rgba(200, 255, 200, ${g})`);
            grad.addColorStop(0.2, `rgba(0, 255, 0, ${g*0.8})`);
            grad.addColorStop(0.5, `rgba(0, 150, 50, ${g*0.3})`);
            grad.addColorStop(1, "rgba(0, 50, 0, 0)");
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(ex, ey, 20 * g, 0, Math.PI * 2); ctx.fill();
        };
        drawGlow(-15, -62);
        drawGlow(15, -62);
        ctx.globalCompositeOperation = "source-over";
        
        // Slit pupils
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.ellipse(-15, -62, 1.5, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(15, -62, 1.5, 7, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Keytar
    ctx.save();
    ctx.translate(0, 25);
    ctx.rotate(-Math.PI / 6);
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(-50, -12, 100, 24); // main body
    ctx.fillStyle = "#111";
    ctx.fillRect(-65, -16, 25, 32); // neck/control area
    
    // Keys
    ctx.fillStyle = "#eee";
    for(let i=0; i<12; i++) {
        ctx.fillRect(-25 + i*6, -10, 4, 16);
    }
    // Black keys
    ctx.fillStyle = "#111";
    for(let i=0; i<11; i++) {
        if (i%4 !== 2) ctx.fillRect(-23 + i*6, -10, 3, 10);
    }
    
    // Keytar buttons
    ctx.fillStyle = "#ff0055";
    ctx.beginPath(); ctx.arc(-52, -5, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#00ffcc";
    ctx.beginPath(); ctx.arc(-52, 6, 4, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    
    // Hands holding keytar
    ctx.fillStyle = "#223f3f";
    ctx.beginPath(); ctx.arc(-30, 30, 10, 0, Math.PI*2); ctx.fill(); // right hand
    ctx.beginPath(); ctx.arc(25, 10, 10, 0, Math.PI*2); ctx.fill(); // left hand

    ctx.restore();
}

export function drawCluck(ctx, x, y, scale, glow) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Legs
    ctx.fillStyle = "#a67c00";
    ctx.fillRect(-25, 70, 8, 40);
    ctx.fillRect(17, 70, 8, 40);
    
    // Feet
    ctx.fillStyle = "#d2691e";
    ctx.beginPath(); ctx.moveTo(-21, 105); ctx.lineTo(-40, 115); ctx.lineTo(-5, 115); ctx.fill();
    ctx.beginPath(); ctx.moveTo(21, 105); ctx.lineTo(5, 115); ctx.lineTo(40, 115); ctx.fill();

    // Wings (back)
    const wingGrad = ctx.createLinearGradient(0, 0, 0, 60);
    wingGrad.addColorStop(0, "#d4af37");
    wingGrad.addColorStop(1, "#8a6600");
    ctx.fillStyle = wingGrad;
    ctx.beginPath(); ctx.ellipse(-55, 25, 22, 45, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(55, 25, 22, 45, -0.3, 0, Math.PI * 2); ctx.fill();

    // Plump Body
    const bodyGrad = ctx.createRadialGradient(0, 10, 10, 0, 20, 60);
    bodyGrad.addColorStop(0, "#f3ce5e");
    bodyGrad.addColorStop(1, "#b8860b");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.ellipse(0, 25, 55, 60, 0, 0, Math.PI * 2); ctx.fill();

    // Grease-stained off-white apron
    ctx.fillStyle = "#e8e8e0";
    ctx.beginPath();
    ctx.moveTo(-35, -10);
    ctx.lineTo(35, -10);
    ctx.lineTo(45, 75);
    ctx.lineTo(-45, 75);
    ctx.fill();
    
    // Apron neck strap
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-25, -10); ctx.lineTo(-15, -30);
    ctx.moveTo(25, -10); ctx.lineTo(15, -30);
    ctx.stroke();

    // Grease stains
    ctx.fillStyle = "rgba(60, 40, 20, 0.4)";
    ctx.beginPath(); ctx.ellipse(-15, 15, 12, 18, 0.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(22, 45, 18, 12, -0.2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "rgba(30, 30, 30, 0.3)";
    ctx.beginPath(); ctx.ellipse(5, 65, 14, 10, 0, 0, Math.PI*2); ctx.fill();

    // Head
    const headGrad = ctx.createRadialGradient(0, -50, 5, 0, -50, 40);
    headGrad.addColorStop(0, "#f3ce5e");
    headGrad.addColorStop(1, "#b8860b");
    ctx.fillStyle = headGrad;
    ctx.beginPath(); ctx.ellipse(0, -50, 38, 40, 0, 0, Math.PI * 2); ctx.fill();

    // Red comb
    ctx.fillStyle = "#cc0000";
    ctx.beginPath();
    ctx.moveTo(-15, -85);
    ctx.bezierCurveTo(-25, -110, -5, -125, 0, -100);
    ctx.bezierCurveTo(5, -125, 25, -110, 15, -85);
    ctx.fill();

    // Wattle
    ctx.beginPath();
    ctx.ellipse(-8, -25, 6, 12, 0.2, 0, Math.PI * 2);
    ctx.ellipse(8, -25, 6, 12, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Eye sockets
    ctx.fillStyle = "#111";
    ctx.beginPath(); ctx.arc(-16, -60, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(16, -60, 12, 0, Math.PI * 2); ctx.fill();

    // Glowing Eyes (Pale Yellow)
    if (glow > 0) {
        ctx.globalCompositeOperation = "lighter";
        const g = Math.min(glow, 2);
        const drawGlow = (ex, ey) => {
            const grad = ctx.createRadialGradient(ex, ey, 0, ex, ey, 20 * g);
            grad.addColorStop(0, `rgba(255, 255, 255, ${g})`);
            grad.addColorStop(0.2, `rgba(255, 255, 150, ${g*0.8})`);
            grad.addColorStop(0.5, `rgba(200, 150, 0, ${g*0.3})`);
            grad.addColorStop(1, "rgba(100, 50, 0, 0)");
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(ex, ey, 20 * g, 0, Math.PI * 2); ctx.fill();
        };
        drawGlow(-16, -60);
        drawGlow(16, -60);
        ctx.globalCompositeOperation = "source-over";
    }

    // Orange beak
    ctx.fillStyle = "#ff8c00";
    ctx.beginPath();
    ctx.moveTo(-12, -42); ctx.lineTo(12, -42); ctx.lineTo(0, -15); ctx.fill();
    ctx.fillStyle = "#cc7000";
    ctx.beginPath();
    ctx.moveTo(0, -42); ctx.lineTo(12, -42); ctx.lineTo(0, -15); ctx.fill();

    ctx.restore();
}

export function drawArg(ctx, x, y, scale, glow) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Endoskeleton Legs
    ctx.fillStyle = "#111";
    ctx.fillRect(-25, 75, 12, 35);
    ctx.fillRect(13, 75, 12, 35);
    
    // Feet
    ctx.fillStyle = "#1b3313";
    ctx.beginPath(); ctx.ellipse(-19, 110, 18, 10, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(19, 110, 18, 10, 0, 0, Math.PI*2); ctx.fill();

    // Tail (visible behind)
    ctx.fillStyle = "#1b3313";
    ctx.beginPath();
    ctx.moveTo(30, 50); ctx.lineTo(80, 100); ctx.lineTo(40, 80); ctx.fill();

    // Arms
    ctx.fillStyle = "#2e4c23";
    ctx.beginPath(); ctx.ellipse(-45, 10, 15, 45, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(45, 10, 15, 45, -0.3, 0, Math.PI * 2); ctx.fill();
    
    // Scaly Body
    const bodyGrad = ctx.createLinearGradient(-40, 0, 40, 0);
    bodyGrad.addColorStop(0, "#1b3313");
    bodyGrad.addColorStop(0.5, "#3a602c");
    bodyGrad.addColorStop(1, "#1b3313");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.ellipse(0, 20, 45, 65, 0, 0, Math.PI * 2); ctx.fill();

    // Belly scales
    ctx.fillStyle = "#a8b87a";
    ctx.beginPath(); ctx.ellipse(0, 25, 25, 55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#7a8a5a";
    ctx.lineWidth = 2;
    for(let i=0; i<5; i++) {
        ctx.beginPath();
        ctx.moveTo(-20 + i*2, -15 + i*16);
        ctx.lineTo(20 - i*2, -15 + i*16);
        ctx.stroke();
    }

    // Curved metal hook for hand (right hand, x=55, y=50)
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(55, 45, 12, 0, Math.PI*2); ctx.fill(); // cuff
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(55, 65, 15, Math.PI, 0);
    ctx.lineTo(70, 55);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.moveTo(65, 55); ctx.lineTo(75, 55); ctx.lineTo(70, 45); ctx.fill(); // sharp tip

    // Left hand claws
    ctx.fillStyle = "#a8b87a";
    ctx.beginPath(); ctx.moveTo(-55, 45); ctx.lineTo(-65, 60); ctx.lineTo(-60, 50); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-50, 50); ctx.lineTo(-55, 65); ctx.lineTo(-45, 55); ctx.fill();

    // Head base
    const headGrad = ctx.createRadialGradient(0, -60, 5, 0, -60, 40);
    headGrad.addColorStop(0, "#3a602c");
    headGrad.addColorStop(1, "#1b3313");
    ctx.fillStyle = headGrad;
    ctx.beginPath(); ctx.ellipse(0, -60, 40, 35, 0, 0, Math.PI * 2); ctx.fill();

    // Long toothy snout
    ctx.fillStyle = "#2e4c23";
    ctx.beginPath(); ctx.ellipse(0, -30, 28, 40, 0, 0, Math.PI * 2); ctx.fill();
    
    // Nostrils
    ctx.fillStyle = "#050505";
    ctx.beginPath(); ctx.ellipse(-10, -5, 4, 6, 0.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10, -5, 4, 6, -0.2, 0, Math.PI*2); ctx.fill();

    // Teeth
    ctx.fillStyle = "#fff";
    const drawTooth = (tx, ty, tilt) => {
        ctx.save(); ctx.translate(tx, ty); ctx.rotate(tilt);
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(0, -10); ctx.fill();
        ctx.restore();
    };
    drawTooth(-20, -30, -0.2);
    drawTooth(-10, -25, -0.1);
    drawTooth(10, -25, 0.1);
    drawTooth(20, -30, 0.2);

    // Eye sockets
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(16, -65, 12, 0, Math.PI * 2); ctx.fill();

    // Right eye (glows red/orange)
    if (glow > 0) {
        ctx.globalCompositeOperation = "lighter";
        const g = Math.min(glow, 2);
        const grad = ctx.createRadialGradient(16, -65, 0, 16, -65, 22 * g);
        grad.addColorStop(0, `rgba(255, 200, 200, ${g})`);
        grad.addColorStop(0.2, `rgba(255, 0, 0, ${g*0.8})`);
        grad.addColorStop(0.5, `rgba(150, 0, 0, ${g*0.3})`);
        grad.addColorStop(1, "rgba(50, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(16, -65, 22 * g, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(16, -65, 2, 0, Math.PI*2); ctx.fill();
    }

    // Black eyepatch over left eye (x = -16, y = -65)
    // Strap
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-40, -55);
    ctx.lineTo(40, -75);
    ctx.stroke();
    
    // Patch
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath(); ctx.arc(-16, -65, 14, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
}
