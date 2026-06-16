// Animatronic player's HUD (multiplayer): role + clock up top, a teleport mini-map (white dots) at
// the bottom, and a KILL button that appears at a door. Pure DOM; the caller wires the hooks.
import { NODES, ADJ } from '../mpsim.js';

const ROLEUP = (r) => ({ har: 'Har', gi: 'Gi', cluck: 'Cluck', arg: 'Arg' }[r] || String(r || ''));

export function createAnimHud(rootEl, hooks = {}) {
  const h = hooks;
  const el = (tag, css, txt) => { const n = document.createElement(tag); if (css) n.style.cssText = css; if (txt != null) n.textContent = txt; return n; };

  const root = el('div', "position:fixed;inset:0;z-index:15;display:none;pointer-events:none;font-family:Georgia,'Times New Roman',serif;color:#d8d4c8;user-select:none;");
  rootEl.appendChild(root);

  const top = el('div', 'position:absolute;top:14px;left:0;right:0;text-align:center;');
  const roleLbl = el('div', 'font-size:20px;color:#e8b23a;letter-spacing:2px;', '');
  const statusLbl = el('div', 'font-size:13px;color:#8a8a90;margin-top:2px;', '');
  top.appendChild(roleLbl); top.appendChild(statusLbl); root.appendChild(top);

  const clockLbl = el('div', 'position:absolute;top:14px;right:24px;font-size:26px;font-weight:bold;color:#e8e4d8;', '12 AM');
  root.appendChild(clockLbl);

  const mapWrap = el('div', 'position:absolute;bottom:14px;left:50%;transform:translateX(-50%);width:380px;height:158px;pointer-events:auto;background:rgba(8,9,12,0.85);border:1px solid #2a2a30;padding:8px;');
  mapWrap.appendChild(el('div', 'font-size:10px;letter-spacing:2px;color:#5a5a62;margin-bottom:4px;', 'TELEPORT  ·  tap a node'));
  const grid = el('div', 'position:relative;width:100%;height:126px;'); mapWrap.appendChild(grid);
  root.appendChild(mapWrap);

  // KILL sits clearly above the mini-map (appended last so it's on top)
  const killBtn = el('div', 'position:absolute;bottom:190px;left:50%;transform:translateX(-50%);pointer-events:auto;display:none;cursor:pointer;padding:16px 50px;background:#5a1414;border:2px solid #e24b4a;border-radius:10px;color:#ffdede;font-size:26px;font-weight:bold;letter-spacing:3px;box-shadow:0 0 24px rgba(226,75,74,0.5);', 'KILL');
  killBtn.onclick = () => { if (!killBtn._disabled && h.onKill) h.onKill(); };
  root.appendChild(killBtn);

  const dots = {};
  for (const nd of NODES) {
    const isDoor = nd.id.indexOf('DOOR') === 0;
    const dot = el('div', `position:absolute;left:${nd.x}%;top:${nd.y}%;transform:translate(-50%,-50%);width:${isDoor ? 16 : 14}px;height:${isDoor ? 16 : 14}px;border-radius:50%;background:#e6e2d6;border:2px solid ${isDoor ? '#e24b4a' : '#6fae7e'};cursor:pointer;`);
    dot.title = nd.label;
    dot.onclick = () => { if (!dot._locked && h.onTeleport) h.onTeleport(nd.id); };
    grid.appendChild(dot); dots[nd.id] = dot;
    grid.appendChild(el('div', `position:absolute;left:${nd.x}%;top:${nd.y}%;transform:translate(-50%,9px);font-size:8px;color:#6a6a72;white-space:nowrap;`, nd.label));
  }

  function clockText(mins) { const h24 = Math.floor((mins || 0) / 60); return (h24 === 0 ? 12 : h24) + ' AM'; }

  return {
    show(role) { root.style.display = 'block'; roleLbl.textContent = 'YOU ARE ' + ROLEUP(role).toUpperCase(); },
    hide() { root.style.display = 'none'; },
    update(snap, myName) {
      const a = snap.anims && snap.anims[myName];
      clockLbl.textContent = clockText(snap.clockMinutes);
      const cd = a ? a.cooldown : 0;
      const reachable = a ? (ADJ[a.node] || []) : []; // only neighbours of the current node
      for (const id in dots) {
        const d = dots[id], cur = a && a.node === id;
        const canGo = !!(a && reachable.includes(id) && cd <= 0.05 && snap.phase === 'playing');
        d.style.boxShadow = cur ? '0 0 10px #e8b23a' : 'none';
        d.style.background = cur ? '#e8b23a' : (canGo ? '#e6e2d6' : '#3a3a40');
        d._locked = !canGo;
        d.style.opacity = (cur || canGo) ? '1' : '0.4';
      }
      if (snap.phase !== 'playing') statusLbl.textContent = '—';
      else if (cd > 0.05) statusLbl.textContent = 'Teleport cooldown… ' + cd.toFixed(1) + 's';
      else if (a && a.atDoor) statusLbl.textContent = 'At the door — press KILL';
      else statusLbl.textContent = 'Tap a lit (adjacent) node to move';
      const atDoor = a && a.atDoor && snap.phase === 'playing';
      if (atDoor) {
        killBtn.style.display = 'block';
        const running = a.killTimer > 0;
        killBtn._disabled = running;
        killBtn.textContent = running ? Math.ceil(a.killTimer) + '…' : 'KILL';
        killBtn.style.opacity = running ? '0.6' : '1';
      } else killBtn.style.display = 'none';
    },
  };
}
