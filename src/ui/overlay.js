// Hand-authored DOM overlay: menu, night card, HUD, and the camera-selection map.
// Pure DOM, no imports. The caller assigns overlay.onToggleMonitor and overlay.onSelectCam.
export function createOverlay(rootEl, handlers) {
  const h = handlers || {};
  const el = (tag, css, txt) => { const n = document.createElement(tag); if (css) n.style.cssText = css; if (txt != null) n.textContent = txt; return n; };

  // ---- root layer ----
  // pointer-events:none so the 3D canvas underneath still receives mousemove (look-around);
  // interactive children (menu, camera button, camera map) re-enable pointer-events.
  const root = el('div', 'position:fixed;inset:0;z-index:10;pointer-events:none;font-family:Georgia,\'Times New Roman\',serif;color:#d8d4c8;user-select:none;');
  rootEl.appendChild(root);

  // grain backdrop used by menu/cards
  const grainCss = "background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>\");opacity:0.06;";

  // =================== MENU ===================
  const menu = el('div', 'position:absolute;inset:0;background:#050507;display:flex;flex-direction:column;justify-content:center;padding-left:9%;pointer-events:auto;');
  const menuGrain = el('div', 'position:absolute;inset:0;pointer-events:none;' + grainCss); menu.appendChild(menuGrain);
  const title1 = el('div', "font-size:64px;font-weight:bold;letter-spacing:2px;color:#e6e2d6;text-shadow:0 0 18px rgba(0,0,0,0.9);position:relative;", 'Five Nights');
  const title2 = el('div', "font-size:46px;font-weight:bold;margin-left:60px;color:#e6e2d6;text-shadow:0 0 18px rgba(0,0,0,0.9);position:relative;", "At AI Slop");
  menu.appendChild(title1); menu.appendChild(title2);
  const menuRows = el('div', 'position:relative;margin-top:46px;');
  menu.appendChild(menuRows);
  function menuRow(label, onClick, accent) {
    const r = el('div', `font-size:24px;margin:10px 0;cursor:pointer;color:${accent ? '#e8b23a' : '#8a8a90'};transition:color .12s,transform .12s;`, label);
    r.onmouseenter = () => { r.style.color = '#e8b23a'; r.style.transform = 'translateX(8px)'; if (typeof api.onMenuHover === 'function') api.onMenuHover(); };
    r.onmouseleave = () => { r.style.color = accent ? '#e8b23a' : '#8a8a90'; r.style.transform = 'none'; };
    r.onclick = onClick;
    menuRows.appendChild(r); return r;
  }
  const rowNew = menuRow('» New game', () => h.onNewGame && h.onNewGame(), true);
  const rowCont = menuRow('Continue', () => h.onContinue && h.onContinue());
  const rowNight = menuRow('Night select', () => { nightWrap.style.display = nightWrap.style.display === 'none' ? 'flex' : 'none'; });
  const rowMp = menuRow('Multiplayer', () => h.onMultiplayer && h.onMultiplayer());
  const nightWrap = el('div', 'position:relative;margin-top:6px;display:none;gap:10px;');
  menuRows.appendChild(nightWrap);
  const tagline = el('div', 'position:absolute;bottom:18px;left:9%;color:#46464c;font-size:12px;', "v1.0  •  flickering static title  •  ambient hum");
  menu.appendChild(tagline);
  root.appendChild(menu);

  // =================== NIGHT CARD ===================
  const card = el('div', 'position:absolute;inset:0;background:#000;display:none;align-items:center;justify-content:center;opacity:0;transition:opacity .8s;');
  const cardText = el('div', 'font-size:40px;letter-spacing:3px;color:#cfcabb;'); card.appendChild(cardText);
  root.appendChild(card);

  // =================== GAME OVER / WIN ===================
  const over = el('div', 'position:absolute;inset:0;background:#000;display:none;align-items:center;justify-content:center;');
  root.appendChild(over);
  const win = el('div', 'position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,#13212b,#050507);display:none;align-items:center;justify-content:center;flex-direction:column;');
  const winText = el('div', 'font-size:72px;color:#bfe0cf;text-shadow:0 0 30px #2c6a4a;', '6 AM'); win.appendChild(winText);
  win.appendChild(el('div', 'margin-top:14px;color:#7dd6a8;font-size:18px;letter-spacing:2px;', 'You survived the night'));
  root.appendChild(win);

  // =================== HUD ===================
  const hud = el('div', 'position:absolute;inset:0;display:none;pointer-events:none;');
  root.appendChild(hud);

  // power + usage (top-left)
  const powerWrap = el('div', 'position:absolute;top:16px;left:18px;');
  const powerTxt = el('div', 'font-size:20px;color:#e8e4d8;', 'Power 100%'); powerWrap.appendChild(powerTxt);
  const bars = el('div', 'display:flex;gap:5px;margin-top:6px;'); powerWrap.appendChild(bars);
  const segs = [];
  for (let i = 0; i < 4; i++) { const s = el('div', 'width:34px;height:13px;background:#2c2c33;border:1px solid #3a3942;'); bars.appendChild(s); segs.push(s); }
  hud.appendChild(powerWrap);

  // clock + night (top-right)
  const clockWrap = el('div', 'position:absolute;top:14px;right:24px;text-align:right;');
  const clockTxt = el('div', 'font-size:40px;font-weight:bold;color:#e8e4d8;', '12 AM'); clockWrap.appendChild(clockTxt);
  const nightTxt = el('div', 'font-size:16px;letter-spacing:3px;color:#8a8a90;', 'NIGHT 1'); clockWrap.appendChild(nightTxt);
  hud.appendChild(clockWrap);

  // flashlight (bottom-left)
  const flWrap = el('div', 'position:absolute;bottom:18px;left:18px;');
  flWrap.appendChild(el('div', 'font-size:12px;letter-spacing:2px;color:#8a8a90;', 'FLASHLIGHT'));
  const flTrack = el('div', 'width:180px;height:9px;background:#1d1c22;border:1px solid #34333c;margin-top:4px;');
  const flFill = el('div', 'height:100%;width:100%;background:#e8b23a;'); flTrack.appendChild(flFill); flWrap.appendChild(flTrack);
  hud.appendChild(flWrap);

  // cam label (bottom-right)
  const camLabel = el('div', 'position:absolute;bottom:20px;right:24px;font-size:13px;letter-spacing:2px;color:#6fae7e;', 'CAM —  •  SIGNAL…');
  hud.appendChild(camLabel);

  // controls hint (top-center, fades but stays subtle)
  const hint = el('div', 'position:absolute;top:14px;left:50%;transform:translateX(-50%);font-size:11px;letter-spacing:1px;color:#55555c;font-family:monospace;',
    'A/D door  ·  Q/E light  ·  F flashlight  ·  C cameras  ·  move mouse to look');
  hud.appendChild(hint);

  // jam banner (multiplayer): a control that's been spammed too hard locks up for a bit
  const jamBanner = el('div', 'position:absolute;top:42px;left:50%;transform:translateX(-50%);font-size:14px;letter-spacing:1px;color:#e8b23a;background:rgba(40,22,0,0.9);border:1px solid #e8b23a;padding:6px 14px;border-radius:6px;display:none;');
  hud.appendChild(jamBanner);

  // pull-up / lower button (bottom-center)
  const camBtn = el('div', 'position:absolute;bottom:14px;left:50%;transform:translateX(-50%);pointer-events:auto;cursor:pointer;' +
    'padding:9px 26px;background:#17161b;border:1px solid #34333c;color:#cfcabb;font-size:15px;letter-spacing:1px;', '▲  PULL UP CAMERAS / LOWER');
  camBtn.onclick = () => { if (typeof api.onToggleMonitor === 'function') api.onToggleMonitor(); };
  hud.appendChild(camBtn);

  // ---- on-screen door + light buttons (primary control; keybinds still work) ----
  function sideCluster(side, leftSide) {
    const wrap = el('div', `position:absolute;${leftSide ? 'left' : 'right'}:16px;top:42%;transform:translateY(-50%);display:flex;flex-direction:column;gap:12px;pointer-events:auto;`);
    const mk = (label) => el('div', 'width:92px;height:58px;border:2px solid #34333c;background:#15151a;color:#cfcabb;display:flex;align-items:center;justify-content:center;font-size:14px;letter-spacing:1px;cursor:pointer;border-radius:8px;transition:background .08s,border-color .08s;', label);
    const door = mk('DOOR'), light = mk('LIGHT');
    door.onclick = () => { if (typeof api.onDoor === 'function') api.onDoor(side); };
    light.onclick = () => { if (typeof api.onLight === 'function') api.onLight(side); };
    wrap.appendChild(door); wrap.appendChild(light); hud.appendChild(wrap);
    return { door, light };
  }
  const ctlL = sideCluster('L', true);
  const ctlR = sideCluster('R', false);

  // =================== CAMERA MAP ===================
  // Slice 1 models CAM1A/1B/3/7; the others are shown but inactive (no signal) until later slices.
  const ACTIVE = new Set(['CAM1A', 'CAM1B', 'CAM2', 'CAM4', 'CAM3', 'CAM7']);
  const mapWrap = el('div', 'position:absolute;bottom:70px;right:24px;width:320px;height:248px;display:none;pointer-events:auto;' +
    'background:rgba(8,9,12,0.85);border:1px solid #2a2a30;padding:10px;');
  mapWrap.appendChild(el('div', 'font-size:11px;letter-spacing:2px;color:#5a5a62;margin-bottom:6px;', 'CAMERA MAP'));
  const grid = el('div', 'position:relative;width:100%;height:206px;'); mapWrap.appendChild(grid);
  const camBtns = {};
  // Spatial floor-plan matching five_nights_at_nanos_ui_layout_reference.svg (panel C): stage +
  // dining across the top; the two halls then the cove (far right) on the middle row; the closet
  // lower-left; the office at the bottom centre. Two faint links tie the office into the map.
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none');
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
  for (const [x1, y1, x2, y2] of [[34, 76, 49, 85], [78, 76, 59, 85]]) {
    const ln = document.createElementNS(NS, 'line');
    ln.setAttribute('x1', x1); ln.setAttribute('y1', y1); ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
    ln.setAttribute('stroke', '#34333c'); ln.setAttribute('stroke-width', '1');
    svg.appendChild(ln);
  }
  grid.appendChild(svg);
  // [id, label, left%, top%, width%, height%] — coordinates lifted from the reference layout
  const layout = [
    ['CAM1A', 'CAM 1A stage',  24, 3,  24, 19],
    ['CAM1B', 'CAM 1B dining', 55, 3,  24, 19],
    ['CAM2',  'CAM 2 hall L',  24, 29, 24, 22],
    ['CAM4',  'CAM 4 hall R',  55, 29, 24, 22],
    ['CAM7',  'CAM 7 cove',    82, 29, 16, 22],
    ['CAM3',  'CAM 3 closet',  15, 56, 21, 19],
  ];
  for (const [id, label, x, y, w, ht] of layout) {
    const active = ACTIVE.has(id);
    const b = el('div', `position:absolute;left:${x}%;top:${y}%;width:${w}%;height:${ht}%;` +
      `border:1px solid ${active ? '#3a6d7a' : '#2a2a30'};display:flex;align-items:center;justify-content:center;` +
      `font-size:8px;line-height:1.1;text-align:center;color:${active ? '#7aa7d8' : '#44444a'};cursor:${active ? 'pointer' : 'default'};` +
      'box-sizing:border-box;padding:1px;', active ? label : 'no signal');
    if (active) b.onclick = () => { if (typeof api.onSelectCam === 'function') api.onSelectCam(id); };
    grid.appendChild(b); camBtns[id] = { node: b, active };
  }
  // office marker (lowers the monitor)
  const officeMark = el('div', 'position:absolute;left:44%;top:84%;width:16%;height:14%;border:1px solid #3b6d11;color:#97c459;' +
    'display:flex;align-items:center;justify-content:center;font-size:9px;cursor:pointer;', 'office');
  officeMark.onclick = () => { if (typeof api.onToggleMonitor === 'function') api.onToggleMonitor(); };
  grid.appendChild(officeMark);
  hud.appendChild(mapWrap);

  // ---- Phone Guy dialog box (non-blocking; plays over the office at night start) ----
  const phoneBox = el('div', 'position:absolute;left:24px;bottom:92px;width:430px;display:none;pointer-events:auto;cursor:pointer;' +
    'background:rgba(10,11,14,0.92);border:1px solid #2a2a30;border-left:4px solid #6fae7e;padding:12px 14px;font-family:monospace;');
  const phoneHdr = el('div', 'font-size:11px;letter-spacing:1px;color:#6fae7e;margin-bottom:8px;display:flex;justify-content:space-between;');
  const phoneFrom = el('span', '', '☏ ANSWERING MACHINE'); const phoneSkip = el('span', 'color:#8a8a90;', 'click / SPACE ▸');
  phoneHdr.appendChild(phoneFrom); phoneHdr.appendChild(phoneSkip); phoneBox.appendChild(phoneHdr);
  const phoneText = el('div', 'font-size:14px;line-height:1.45;color:#cfcabb;min-height:46px;'); phoneBox.appendChild(phoneText);
  root.appendChild(phoneBox);
  let phoneLines = [], phoneIdx = 0, phoneTimer = null, phoneMs = 5000;
  function phoneRender() { phoneText.textContent = phoneLines[phoneIdx]; phoneFrom.textContent = `☏ NIGHT MESSAGE  (${phoneIdx + 1}/${phoneLines.length})`; if (typeof api.onPhoneLine === 'function') api.onPhoneLine(); }
  function phoneTimerReset() { clearTimeout(phoneTimer); phoneTimer = setTimeout(phoneAdvance, phoneMs); }
  function phoneAdvance() { phoneIdx++; if (phoneIdx >= phoneLines.length) { api.hidePhone(); return; } phoneRender(); phoneTimerReset(); }
  phoneBox.onclick = phoneAdvance;
  window.addEventListener('keydown', (e) => { if (phoneBox.style.display === 'block' && (e.key === ' ' || e.key === 'Spacebar')) { e.preventDefault(); phoneAdvance(); } });

  // helpers
  function hideAll() { menu.style.display = 'none'; card.style.display = 'none'; over.style.display = 'none'; win.style.display = 'none'; hud.style.display = 'none'; api.hidePhone && api.hidePhone(); }

  const api = {
    onToggleMonitor: null,
    onSelectCam: null,
    onDoor: null,
    onLight: null,
    onPhoneLine: null,
    onMenuHover: null,
    showPhone(lines, ms) { phoneLines = lines || []; phoneMs = ms || 5000; phoneIdx = 0; if (!phoneLines.length) return; phoneBox.style.display = 'block'; phoneRender(); phoneTimerReset(); },
    hidePhone() { clearTimeout(phoneTimer); phoneBox.style.display = 'none'; },
    showMenu(saveInfo) {
      hideAll(); menu.style.display = 'flex';
      const max = (saveInfo && saveInfo.highestUnlocked) || 1;
      nightWrap.innerHTML = ''; nightWrap.style.display = 'none';
      for (let n = 1; n <= max; n++) {
        const nb = el('div', 'padding:6px 12px;border:1px solid #3a3942;color:#cfcabb;cursor:pointer;font-size:16px;', String(n));
        nb.onmouseenter = () => { nb.style.borderColor = '#e8b23a'; if (typeof api.onMenuHover === 'function') api.onMenuHover(); };
        nb.onmouseleave = () => nb.style.borderColor = '#3a3942';
        nb.onclick = () => h.onNightSelect && h.onNightSelect(n);
        nightWrap.appendChild(nb);
      }
    },
    showNightCard(night) {
      hideAll(); card.style.display = 'flex'; cardText.textContent = 'Night ' + night;
      requestAnimationFrame(() => { card.style.opacity = '1'; });
      setTimeout(() => { card.style.opacity = '0'; }, 2200);
    },
    hideAllScreens() { hideAll(); },   // used by multiplayer so the canvas (anim POV) shows through
    showPlaying() { hideAll(); hud.style.display = 'block'; },
    showGameOver() { hideAll(); over.style.display = 'flex'; },
    showWin() { hideAll(); win.style.display = 'flex'; },
    updateHUD(d) {
      powerTxt.textContent = 'Power ' + d.powerPct + '%';
      const lowColor = d.powerPct < 25 ? '#e24b4a' : (d.powerPct < 50 ? '#e8b23a' : '#7dd6a8');
      for (let i = 0; i < 4; i++) segs[i].style.background = i < Math.min(4, d.usageLoad) ? lowColor : '#2c2c33';
      clockTxt.textContent = d.clockText;
      nightTxt.textContent = 'NIGHT ' + d.night;
      flFill.style.width = Math.max(0, Math.min(100, d.flashlightPct)) + '%';
      const camName = (!d.monitorUp || !d.camLabel || d.camLabel === '—') ? '—' : d.camLabel.replace('CAM', '');
      camLabel.textContent = 'CAM ' + camName + '  •  SIGNAL…';
      hud.style.opacity = d.powerPct < 25 ? (0.78 + Math.random() * 0.22).toFixed(2) : '1';
      // door/light button active states (and the multiplayer jam overlay)
      const dl = d.doors || {}, lt = d.lights || {}, jam = d.jam || {}, cd = d.cd || {};
      const setCtl = (btn, jammed, cooling, active, activeBg, activeBorder, label) => {
        if (jammed) { btn.style.background = '#2a1c06'; btn.style.borderColor = '#e8b23a'; btn.style.color = '#e8b23a'; btn.textContent = 'JAMMED ' + Math.ceil(jammed) + 's'; }
        else { // a cooling-down control keeps its open/closed look but dims and shows a countdown
          btn.style.background = active ? activeBg : '#15151a'; btn.style.borderColor = active ? activeBorder : '#34333c';
          btn.style.color = cooling ? '#8a8a90' : '#cfcabb'; btn.textContent = cooling ? (label + '  ' + Math.ceil(cooling) + 's') : label;
        }
      };
      setCtl(ctlL.door, jam.doorL, cd.doorL, dl.L, '#5a1e1e', '#e24b4a', 'DOOR');
      setCtl(ctlR.door, jam.doorR, cd.doorR, dl.R, '#5a1e1e', '#e24b4a', 'DOOR');
      setCtl(ctlL.light, jam.lightL, cd.lightL, lt.L, '#5a4a1a', '#e8b23a', 'LIGHT');
      setCtl(ctlR.light, jam.lightR, cd.lightR, lt.R, '#5a4a1a', '#e8b23a', 'LIGHT');
      const NAMES = { doorL: 'Door L', doorR: 'Door R', lightL: 'Light L', lightR: 'Light R', cam: 'Cameras' };
      const jamParts = [];
      for (const k of ['doorL', 'doorR', 'lightL', 'lightR', 'cam']) if (jam[k]) jamParts.push(NAMES[k] + ' ' + Math.ceil(jam[k]) + 's');
      if (jamParts.length) { jamBanner.style.display = 'block'; jamBanner.textContent = '⚠ JAMMED — ' + jamParts.join('  ·  ') + '   (ease up!)'; }
      else jamBanner.style.display = 'none';
      mapWrap.style.display = d.monitorUp ? 'block' : 'none';
      hint.style.display = d.monitorUp ? 'none' : 'block';
      if (d.monitorUp) for (const id in camBtns) { const c = camBtns[id]; if (c.active) c.node.style.background = (id === d.activeCam) ? 'rgba(58,109,122,0.45)' : 'transparent'; }
    },
  };
  return api;
}
