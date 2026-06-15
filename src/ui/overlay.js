// Authored by Claude (Google Antigravity CLI hung after 29 min with zero output; fallback per task spec).
// Pure-DOM menu + HUD overlay for "Five Nights at Nano's". No imports, no external fonts/images.
//
// createOverlay(rootEl, handlers) -> {
//   showMenu(saveInfo), showNightCard(night), showPlaying(),
//   showGameOver(), showWin(), updateHUD(hud),
//   onToggleMonitor (assignable property; the camera button invokes it)
// }
// handlers = { onNewGame, onContinue, onNightSelect(night) }

export function createOverlay(rootEl, handlers = {}) {
  const root = rootEl || document.body;

  // ---- one-time CSS injection (CRT-horror aesthetic, CSS only) ----
  const STYLE_ID = 'fnan-overlay-style';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .fnan-ov { position: fixed; inset: 0; z-index: 1000; pointer-events: none;
        font-family: "Times New Roman", Georgia, "DejaVu Serif", serif;
        color: #d8d2c2; -webkit-font-smoothing: none; }
      .fnan-ov * { box-sizing: border-box; }
      .fnan-layer { position: absolute; inset: 0; display: none; }
      .fnan-layer.on { display: block; }

      /* grainy / static-flecked backdrop */
      .fnan-grain { position: absolute; inset: 0; pointer-events: none; opacity: .10;
        background-image:
          radial-gradient(rgba(255,255,255,.7) 0.5px, transparent 0.6px),
          radial-gradient(rgba(255,255,255,.5) 0.5px, transparent 0.6px);
        background-size: 3px 3px, 5px 5px; background-position: 0 0, 1px 2px;
        animation: fnan-grain 0.5s steps(3) infinite; mix-blend-mode: screen; }
      @keyframes fnan-grain { 0%{transform:translate(0,0)} 33%{transform:translate(-1px,1px)}
        66%{transform:translate(1px,-1px)} 100%{transform:translate(0,0)} }
      .fnan-scan { position: absolute; inset: 0; pointer-events: none; opacity: .25;
        background: repeating-linear-gradient(to bottom,
          rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,.35) 3px, rgba(0,0,0,0) 4px); }
      .fnan-vig { position: absolute; inset: 0; pointer-events: none;
        background: radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,.85) 100%); }

      /* ---- MENU ---- */
      .fnan-menu { background: #06070a; }
      .fnan-menu-inner { position: absolute; inset: 0; display: flex; flex-direction: column;
        align-items: center; justify-content: center; pointer-events: auto; }
      .fnan-title { text-align: center; line-height: .95; margin-bottom: 8vh;
        text-shadow: 0 0 6px rgba(180,170,140,.25), 2px 0 rgba(120,0,0,.35), -2px 0 rgba(0,80,90,.3);
        animation: fnan-titleflick 4.5s infinite; }
      .fnan-title .t1 { display: block; font-size: clamp(34px, 8vw, 96px); letter-spacing: .06em;
        color: #e7e0cd; font-variant: small-caps; }
      .fnan-title .t2 { display: block; font-size: clamp(28px, 6.4vw, 76px); letter-spacing: .04em;
        color: #c9c2ac; font-style: italic; }
      @keyframes fnan-titleflick { 0%,97%,100%{opacity:1} 97.5%{opacity:.4} 98.5%{opacity:.9} 99%{opacity:.5} }

      .fnan-rows { display: flex; flex-direction: column; gap: 14px; align-items: center; }
      .fnan-row { pointer-events: auto; cursor: pointer; background: none; border: 0;
        color: #b9b3a1; font-family: inherit; font-size: clamp(18px, 2.6vw, 30px);
        letter-spacing: .12em; padding: 4px 10px; text-transform: lowercase;
        transition: color .12s, text-shadow .12s, transform .12s; }
      .fnan-row:hover, .fnan-row:focus { color: #f3ecd8; outline: none;
        text-shadow: 0 0 10px rgba(200,40,40,.6); transform: translateX(4px); }
      .fnan-row:hover::before, .fnan-row:focus::before { content: ">> "; color: #c83232; }
      .fnan-row.primary { color: #e7e0cd; }
      .fnan-nights { display: none; gap: 10px; margin-top: 14px; flex-wrap: wrap;
        justify-content: center; max-width: 70vw; }
      .fnan-nights.on { display: flex; }
      .fnan-nightbtn { pointer-events: auto; cursor: pointer; background: rgba(20,22,26,.6);
        border: 1px solid #3a3a32; color: #cfc9b6; font-family: inherit;
        font-size: clamp(16px, 2vw, 22px); padding: 8px 16px; letter-spacing: .08em; }
      .fnan-nightbtn:hover { border-color: #c83232; color: #fff; text-shadow: 0 0 8px rgba(200,40,40,.6); }
      .fnan-menu-hint { position:absolute; bottom: 4vh; width:100%; text-align:center;
        font-size: 13px; letter-spacing:.2em; color:#5e5a50; text-transform: uppercase; }

      /* ---- NIGHT CARD ---- */
      .fnan-card { background: #000; }
      .fnan-card-text { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
        font-size: clamp(40px, 9vw, 110px); letter-spacing:.18em; color:#cfc9b6; opacity:0;
        font-variant: small-caps; text-shadow: 0 0 18px rgba(150,140,110,.3); }
      .fnan-card-text.play { animation: fnan-card 3s ease-in-out forwards; }
      @keyframes fnan-card { 0%{opacity:0} 18%{opacity:1} 70%{opacity:1} 100%{opacity:0} }

      /* ---- GAME OVER ---- */
      .fnan-over { background:#000; }
      .fnan-over .fnan-card-text { color:#7a1414; opacity:0; }
      .fnan-over.on .fnan-card-text { animation: fnan-over 2.6s ease-in forwards; }
      @keyframes fnan-over { 0%{opacity:0} 25%{opacity:.9} 90%{opacity:.6} 100%{opacity:0} }

      /* ---- WIN ---- */
      .fnan-win { background: radial-gradient(circle at 50% 45%, #19202b 0%, #05070a 70%); }
      .fnan-win .fnan-card-text { color:#eef3ff; opacity:0;
        text-shadow: 0 0 30px rgba(160,200,255,.8), 0 0 60px rgba(120,170,255,.5); }
      .fnan-win.on .fnan-card-text { animation: fnan-win 2.4s ease-out forwards; }
      @keyframes fnan-win { 0%{opacity:0; letter-spacing:.05em} 40%{opacity:1} 100%{opacity:1; letter-spacing:.22em} }

      /* ---- HUD ---- */
      .fnan-hud { pointer-events: none; }
      .fnan-hud.flicker { animation: fnan-hudflick .18s steps(2) infinite; }
      @keyframes fnan-hudflick { 0%{opacity:1} 50%{opacity:.62} 100%{opacity:1} }
      .fnan-pwr { position:absolute; top:18px; left:22px; }
      .fnan-pwr-label { font-size: clamp(16px, 2.2vw, 26px); letter-spacing:.1em; color:#d8d2c2;
        text-shadow: 0 0 6px rgba(0,0,0,.9); }
      .fnan-usage { display:flex; gap:6px; margin-top:8px; }
      .fnan-seg { width: clamp(26px, 4vw, 46px); height: 12px; background:#14160f;
        border:1px solid #33352b; }
      .fnan-seg.lit-green { background:#3e8e3e; box-shadow:0 0 6px #3e8e3e; }
      .fnan-seg.lit-amber { background:#d59a17; box-shadow:0 0 6px #d59a17; }
      .fnan-seg.lit-red   { background:#c52a2a; box-shadow:0 0 8px #c52a2a; }

      .fnan-clock { position:absolute; top:14px; right:24px; text-align:right; }
      .fnan-clock-time { font-size: clamp(30px, 6vw, 64px); letter-spacing:.04em; color:#e7e0cd;
        text-shadow: 0 0 10px rgba(0,0,0,.9); }
      .fnan-clock-night { font-size: clamp(13px, 1.8vw, 20px); letter-spacing:.2em; color:#9c9684;
        text-transform: uppercase; }

      .fnan-flash { position:absolute; left:22px; bottom:84px; width: 180px; }
      .fnan-flash-label { font-size:12px; letter-spacing:.18em; color:#9c9684; text-transform:uppercase; }
      .fnan-flash-track { height:10px; margin-top:4px; background:#14160f; border:1px solid #33352b; }
      .fnan-flash-fill { height:100%; width:100%; background:linear-gradient(90deg,#9a7b1e,#f0d870);
        box-shadow:0 0 8px rgba(240,216,112,.6); transition: width .15s; }

      .fnan-cam { position:absolute; right:24px; bottom:90px; text-align:right;
        font-size:13px; letter-spacing:.16em; color:#8f8a78; text-transform:uppercase;
        text-shadow:0 0 6px rgba(0,0,0,.9); }
      .fnan-cam .blink { animation: fnan-blink 1s steps(2) infinite; }
      @keyframes fnan-blink { 0%,100%{opacity:.3} 50%{opacity:1} }

      .fnan-toggle { pointer-events:auto; position:absolute; left:50%; bottom:18px;
        transform:translateX(-50%); cursor:pointer; font-family:inherit;
        background: rgba(12,14,18,.7); border:1px solid #3a3a32; color:#cfc9b6;
        font-size: clamp(14px, 1.9vw, 20px); letter-spacing:.12em; padding:10px 22px;
        text-transform: uppercase; text-shadow:0 0 6px rgba(0,0,0,.9); }
      .fnan-toggle:hover { border-color:#c83232; color:#fff; text-shadow:0 0 8px rgba(200,40,40,.6); }
    `;
    document.head.appendChild(style);
  }

  // ---- helpers ----
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const fx = () => {
    const f = document.createElement('div');
    f.appendChild(el('div', 'fnan-grain'));
    f.appendChild(el('div', 'fnan-scan'));
    f.appendChild(el('div', 'fnan-vig'));
    return f.childNodes;
  };
  const addFx = (parent) => { fx().forEach ? null : null; ['fnan-grain','fnan-scan','fnan-vig'].forEach(c => parent.appendChild(el('div', c))); };

  // ---- root container ----
  const ov = el('div', 'fnan-ov');

  // ===== MENU LAYER =====
  const menu = el('div', 'fnan-layer fnan-menu');
  addFx(menu);
  const menuInner = el('div', 'fnan-menu-inner');

  const title = el('div', 'fnan-title');
  title.appendChild(el('span', 't1', 'Five Nights'));
  title.appendChild(el('span', 't2', "at Nano's"));
  menuInner.appendChild(title);

  const rows = el('div', 'fnan-rows');
  const rowNew = el('button', 'fnan-row primary', 'new game');
  const rowContinue = el('button', 'fnan-row', 'continue');
  const rowNightSelect = el('button', 'fnan-row', 'night select');
  const nights = el('div', 'fnan-nights');

  rowNew.addEventListener('click', () => { if (handlers.onNewGame) handlers.onNewGame(); });
  rowContinue.addEventListener('click', () => { if (handlers.onContinue) handlers.onContinue(); });
  rowNightSelect.addEventListener('click', () => { nights.classList.toggle('on'); });

  rows.appendChild(rowNew);
  rows.appendChild(rowContinue);
  rows.appendChild(rowNightSelect);
  rows.appendChild(nights);
  menuInner.appendChild(rows);
  menuInner.appendChild(el('div', 'fnan-menu-hint', 'press a row to begin'));
  menu.appendChild(menuInner);

  // ===== NIGHT CARD LAYER =====
  const card = el('div', 'fnan-layer fnan-card');
  const cardText = el('div', 'fnan-card-text');
  card.appendChild(cardText);

  // ===== GAME OVER LAYER =====
  const over = el('div', 'fnan-layer fnan-over');
  over.appendChild(el('div', 'fnan-card-text', '')); // text set on show

  // ===== WIN LAYER =====
  const win = el('div', 'fnan-layer fnan-win');
  win.appendChild(el('div', 'fnan-card-text', '6 AM'));

  // ===== HUD LAYER =====
  const hud = el('div', 'fnan-layer fnan-hud');

  // power (top-left)
  const pwr = el('div', 'fnan-pwr');
  const pwrLabel = el('div', 'fnan-pwr-label', 'Power 100%');
  const usage = el('div', 'fnan-usage');
  const segs = [];
  for (let i = 0; i < 4; i++) { const s = el('div', 'fnan-seg'); usage.appendChild(s); segs.push(s); }
  pwr.appendChild(pwrLabel);
  pwr.appendChild(usage);
  hud.appendChild(pwr);

  // clock + night (top-right)
  const clock = el('div', 'fnan-clock');
  const clockTime = el('div', 'fnan-clock-time', '12 AM');
  const clockNight = el('div', 'fnan-clock-night', 'Night 1');
  clock.appendChild(clockTime);
  clock.appendChild(clockNight);
  hud.appendChild(clock);

  // flashlight bar
  const flash = el('div', 'fnan-flash');
  flash.appendChild(el('div', 'fnan-flash-label', 'flashlight'));
  const flashTrack = el('div', 'fnan-flash-track');
  const flashFill = el('div', 'fnan-flash-fill');
  flashTrack.appendChild(flashFill);
  flash.appendChild(flashTrack);
  hud.appendChild(flash);

  // cam tag
  const cam = el('div', 'fnan-cam');
  const camMain = el('span', null, 'CAM 1A ');
  const camSig = el('span', 'blink', '• SIGNAL...');
  cam.appendChild(camMain);
  cam.appendChild(camSig);
  hud.appendChild(cam);

  // toggle button (bottom center)
  const toggle = el('button', 'fnan-toggle', '▲ pull up cameras / lower');
  toggle.addEventListener('click', () => {
    if (typeof overlay.onToggleMonitor === 'function') overlay.onToggleMonitor();
  });
  hud.appendChild(toggle);

  // assemble
  ov.appendChild(menu);
  ov.appendChild(card);
  ov.appendChild(over);
  ov.appendChild(win);
  ov.appendChild(hud);
  root.appendChild(ov);

  // ---- layer switching ----
  const layers = [menu, card, over, win, hud];
  function only(layer) {
    for (const l of layers) l.classList.toggle('on', l === layer);
  }

  let cardTimer = null;

  // ---- the returned overlay object ----
  const overlay = {
    onToggleMonitor: null, // assignable hook; the camera button calls this

    showMenu(saveInfo) {
      const info = saveInfo || { highestUnlocked: 1 };
      const highest = Math.max(1, info.highestUnlocked || 1);
      // rebuild night-select buttons 1..highest
      nights.innerHTML = '';
      nights.classList.remove('on');
      for (let n = 1; n <= highest; n++) {
        const b = el('button', 'fnan-nightbtn', 'Night ' + n);
        b.addEventListener('click', () => { if (handlers.onNightSelect) handlers.onNightSelect(n); });
        nights.appendChild(b);
      }
      if (cardTimer) { clearTimeout(cardTimer); cardTimer = null; }
      only(menu);
    },

    showNightCard(night) {
      cardText.textContent = 'Night ' + night;
      only(card);
      // restart the fade-in/out animation
      cardText.classList.remove('play');
      void cardText.offsetWidth; // reflow to restart animation
      cardText.classList.add('play');
      if (cardTimer) clearTimeout(cardTimer);
      cardTimer = setTimeout(() => { cardText.classList.remove('play'); }, 3100);
    },

    showPlaying() {
      if (cardTimer) { clearTimeout(cardTimer); cardTimer = null; }
      only(hud);
    },

    showGameOver() {
      const t = over.querySelector('.fnan-card-text');
      if (t) t.textContent = '';
      only(over);
    },

    showWin() {
      only(win);
    },

    updateHUD(data) {
      const d = data || {};
      const power = Math.max(0, Math.min(100, Math.round(d.powerPct != null ? d.powerPct : 0)));
      pwrLabel.textContent = 'Power ' + power + '%';

      // usageLoad in source can reach ~6 (doors/lights/cam/flashlight); map to 4 segments.
      const load = Math.max(0, Math.min(4, Math.round(d.usageLoad || 0)));
      const lowPower = power < 50;
      const critPower = power < 25;
      for (let i = 0; i < 4; i++) {
        const s = segs[i];
        s.classList.remove('lit-green', 'lit-amber', 'lit-red');
        if (i < load) {
          // color escalates with how many segments lit AND as power drops
          let cls = 'lit-green';
          if (critPower) cls = 'lit-red';
          else if (lowPower || i >= 2) cls = (i >= 3 ? 'lit-red' : 'lit-amber');
          else if (i >= 2) cls = 'lit-amber';
          s.classList.add(cls);
        }
      }

      // HUD flickers subtly when power critically low
      hud.classList.toggle('flicker', critPower);

      if (d.clockText != null) clockTime.textContent = d.clockText;
      if (d.night != null) clockNight.textContent = 'Night ' + d.night;

      const fl = Math.max(0, Math.min(100, d.flashlightPct != null ? d.flashlightPct : 100));
      flashFill.style.width = fl + '%';

      if (d.camLabel != null) camMain.textContent = 'CAM ' + d.camLabel + ' ';
    },
  };

  return overlay;
}
