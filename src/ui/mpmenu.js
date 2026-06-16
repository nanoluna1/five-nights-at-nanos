// Multiplayer menu screens (pure DOM), authored to match the single-player menu in overlay.js:
//  - home:  title + "(Multiplayer)" subtitle, a name field, Host / Join
//  - lobby: room code (top-centre), live player list (left), Start (bottom-right, host only)
//  - join:  room-code entry
// The caller wires the hooks to net.js / lobby.js.
import { createSpinWheel } from './spinwheel.js';

const ROLECOL = { guard: '#6fae7e', har: '#8d6e63', gi: '#3a5f5f', cluck: '#d4af37', arg: '#3a602c' };
const ROLEUP = (r) => ({ guard: 'Guard', har: 'Har', gi: 'Gi', cluck: 'Cluck', arg: 'Arg' }[r] || String(r || '').toUpperCase());

export function createMpMenu(rootEl, hooks = {}) {
  const h = hooks;
  const el = (tag, css, txt) => { const n = document.createElement(tag); if (css) n.style.cssText = css; if (txt != null) n.textContent = txt; return n; };
  const grain = "background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>\");opacity:0.06;";

  const root = el('div', 'position:fixed;inset:0;z-index:20;background:#050507;display:none;pointer-events:auto;font-family:Georgia,\'Times New Roman\',serif;color:#d8d4c8;user-select:none;');
  root.appendChild(el('div', 'position:absolute;inset:0;pointer-events:none;' + grain));
  rootEl.appendChild(root);

  function titleBlock(parent) {
    parent.appendChild(el('div', "font-size:54px;font-weight:bold;letter-spacing:2px;color:#e6e2d6;text-shadow:0 0 18px rgba(0,0,0,0.9);", 'Five Nights'));
    parent.appendChild(el('div', "font-size:38px;font-weight:bold;margin-left:50px;color:#e6e2d6;text-shadow:0 0 18px rgba(0,0,0,0.9);", "at Nano's"));
    parent.appendChild(el('div', "font-size:22px;letter-spacing:5px;color:#e8b23a;margin-top:10px;", '( Multiplayer )'));
  }
  const btnCss = 'padding:10px 22px;border:1px solid #34333c;background:#15151a;color:#cfcabb;font-size:20px;letter-spacing:1px;cursor:pointer;border-radius:6px;transition:background .1s,border-color .1s,color .1s;';
  function hoverable(node, accent) {
    node.onmouseenter = () => { node.style.borderColor = '#e8b23a'; node.style.color = '#e8b23a'; if (h.onHover) h.onHover(); };
    node.onmouseleave = () => { node.style.borderColor = '#34333c'; node.style.color = accent ? '#e8b23a' : '#cfcabb'; };
    return node;
  }
  const inputCss = 'width:280px;padding:9px 12px;background:#0e0e12;border:1px solid #34333c;color:#e6e2d6;font-family:inherit;font-size:18px;outline:none;';

  // ===== HOME =====
  const home = el('div', 'position:absolute;inset:0;display:none;flex-direction:column;justify-content:center;padding-left:9%;');
  titleBlock(home);
  const nameWrap = el('div', 'margin-top:38px;');
  nameWrap.appendChild(el('div', 'font-size:13px;letter-spacing:2px;color:#8a8a90;margin-bottom:6px;', 'YOUR NAME'));
  const nameInput = el('input', inputCss); nameInput.maxLength = 16; nameInput.placeholder = 'Nano';
  nameWrap.appendChild(nameInput); home.appendChild(nameWrap);
  const homeBtns = el('div', 'margin-top:26px;display:flex;gap:16px;');
  const hostBtn = hoverable(el('div', btnCss, '» Host'), true);
  const joinBtn = hoverable(el('div', btnCss, 'Join'));
  hostBtn.onclick = () => h.onHost && h.onHost(nameInput.value);
  joinBtn.onclick = () => h.onJoin && h.onJoin(nameInput.value);
  homeBtns.appendChild(hostBtn); homeBtns.appendChild(joinBtn); home.appendChild(homeBtns);
  const backHome = hoverable(el('div', 'margin-top:34px;font-size:15px;color:#6a6a72;cursor:pointer;width:fit-content;', '‹ Back to menu'));
  backHome.onclick = () => h.onBack && h.onBack(); home.appendChild(backHome);
  root.appendChild(home);

  // ===== HOST LOBBY =====
  const lobby = el('div', 'position:absolute;inset:0;display:none;');
  lobby.appendChild(el('div', 'position:absolute;top:24px;left:30px;font-size:16px;letter-spacing:2px;color:#5a5a62;', "Nano's  ·  Multiplayer"));
  const codeWrap = el('div', 'position:absolute;top:44px;left:50%;transform:translateX(-50%);text-align:center;');
  codeWrap.appendChild(el('div', 'font-size:12px;letter-spacing:3px;color:#8a8a90;', 'ROOM CODE — SHARE IT'));
  const codeText = el('div', 'font-size:42px;font-weight:bold;letter-spacing:3px;color:#e8b23a;margin-top:6px;cursor:pointer;', '—');
  codeText.title = 'click to copy';
  codeText.onclick = () => { try { navigator.clipboard && navigator.clipboard.writeText(codeText.textContent); } catch (e) {} };
  codeWrap.appendChild(codeText); lobby.appendChild(codeWrap);
  const listWrap = el('div', 'position:absolute;left:8%;top:52%;transform:translateY(-50%);width:300px;');
  listWrap.appendChild(el('div', 'font-size:13px;letter-spacing:2px;color:#8a8a90;margin-bottom:10px;', 'PLAYERS'));
  const listEl = el('div', ''); listWrap.appendChild(listEl); lobby.appendChild(listWrap);
  const statusEl = el('div', 'position:absolute;bottom:32px;left:8%;font-size:14px;color:#6fae7e;', '');
  lobby.appendChild(statusEl);
  const startBtn = hoverable(el('div', 'position:absolute;bottom:28px;right:34px;' + btnCss, '» Start'), true);
  startBtn.onclick = () => { if (!startBtn._disabled && h.onStart) h.onStart(); };
  lobby.appendChild(startBtn);
  const leaveLobby = hoverable(el('div', 'position:absolute;bottom:32px;right:170px;font-size:15px;color:#6a6a72;cursor:pointer;', '‹ Leave'));
  leaveLobby.onclick = () => h.onBack && h.onBack(); lobby.appendChild(leaveLobby);
  root.appendChild(lobby);

  // ===== JOIN =====
  const join = el('div', 'position:absolute;inset:0;display:none;flex-direction:column;justify-content:center;padding-left:9%;');
  titleBlock(join);
  const joinWrap = el('div', 'margin-top:38px;');
  joinWrap.appendChild(el('div', 'font-size:13px;letter-spacing:2px;color:#8a8a90;margin-bottom:6px;', 'ROOM CODE'));
  const codeInput = el('input', inputCss + 'letter-spacing:2px;'); codeInput.placeholder = 'nanoglaze-8912';
  codeInput.onkeydown = (e) => { if (e.key === 'Enter') h.onSubmitCode && h.onSubmitCode(codeInput.value.trim()); };
  joinWrap.appendChild(codeInput); join.appendChild(joinWrap);
  const joinStatus = el('div', 'margin-top:14px;font-size:14px;color:#6fae7e;height:18px;', '');
  join.appendChild(joinStatus);
  const connectBtn = hoverable(el('div', 'margin-top:18px;width:fit-content;' + btnCss, '» Connect'), true);
  connectBtn.onclick = () => h.onSubmitCode && h.onSubmitCode(codeInput.value.trim());
  join.appendChild(connectBtn);
  const backJoin = hoverable(el('div', 'margin-top:34px;font-size:15px;color:#6a6a72;cursor:pointer;width:fit-content;', '‹ Back'));
  backJoin.onclick = () => h.onBack && h.onBack(); join.appendChild(backJoin);
  root.appendChild(join);

  // ===== SPIN (role wheel) =====
  const spin = el('div', 'position:absolute;inset:0;display:none;');
  const spinHdr = el('div', 'position:absolute;top:38px;left:50%;transform:translateX(-50%);text-align:center;');
  const turnName = el('div', 'font-size:34px;font-weight:bold;color:#e8b23a;', '—');
  spinHdr.appendChild(turnName);
  spinHdr.appendChild(el('div', 'font-size:13px;letter-spacing:3px;color:#8a8a90;margin-top:2px;', 'SPIN FOR YOUR ROLE'));
  spin.appendChild(spinHdr);
  const wheelWrap = el('div', 'position:absolute;left:50%;top:55%;transform:translate(-50%,-50%);width:440px;height:440px;');
  const wheelCanvas = el('canvas'); wheelCanvas.width = 440; wheelCanvas.height = 440; wheelCanvas.style.cssText = 'display:block;';
  wheelWrap.appendChild(wheelCanvas);
  const spinBtn = el('div', 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:92px;height:92px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:bold;letter-spacing:1px;border:2px solid #34333c;background:#15151a;color:#cfcabb;cursor:pointer;user-select:none;', 'SPIN');
  spinBtn.onclick = () => { if (!spinBtn._disabled && h.onSpinPressed) h.onSpinPressed(); };
  wheelWrap.appendChild(spinBtn);
  spin.appendChild(wheelWrap);
  const assignedWrap = el('div', 'position:absolute;right:6%;top:55%;transform:translateY(-50%);width:230px;');
  assignedWrap.appendChild(el('div', 'font-size:13px;letter-spacing:2px;color:#8a8a90;margin-bottom:8px;', 'ASSIGNED'));
  const assignedList = el('div', ''); assignedWrap.appendChild(assignedList);
  spin.appendChild(assignedWrap);
  root.appendChild(spin);
  const wheel = createSpinWheel(wheelCanvas);

  // ===== ROLE REVEAL =====
  const reveal = el('div', 'position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;');
  reveal.appendChild(el('div', 'font-size:16px;letter-spacing:4px;color:#8a8a90;', 'YOU ARE'));
  const revealRole = el('div', 'font-size:72px;font-weight:bold;letter-spacing:3px;color:#e8b23a;margin:10px 0;', '—');
  reveal.appendChild(revealRole);
  const revealSub = el('div', 'font-size:18px;color:#cfcabb;text-align:center;max-width:560px;', '');
  reveal.appendChild(revealSub);
  const revealList = el('div', 'margin-top:26px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center;max-width:680px;');
  reveal.appendChild(revealList);
  const revealNote = el('div', 'position:absolute;bottom:40px;left:50%;transform:translateX(-50%);font-size:14px;color:#6fae7e;', '');
  reveal.appendChild(revealNote);
  root.appendChild(reveal);

  // ===== MATCH OVER =====
  const over = el('div', 'position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;');
  const overTitle = el('div', 'font-size:60px;font-weight:bold;letter-spacing:2px;text-align:center;', '');
  const overSub = el('div', 'font-size:24px;margin-top:12px;color:#cfcabb;', '');
  over.appendChild(overTitle); over.appendChild(overSub);
  over.appendChild(el('div', 'position:absolute;bottom:40px;left:50%;transform:translateX(-50%);font-size:14px;color:#6a6a72;', 'returning to the menu…'));
  root.appendChild(over);

  function showScreen(which) {
    root.style.display = 'block';
    home.style.display = which === 'home' ? 'flex' : 'none';
    lobby.style.display = which === 'lobby' ? 'block' : 'none';
    join.style.display = which === 'join' ? 'flex' : 'none';
    spin.style.display = which === 'spin' ? 'block' : 'none';
    reveal.style.display = which === 'reveal' ? 'flex' : 'none';
    over.style.display = which === 'over' ? 'flex' : 'none';
  }
  function renderAssigned(list) {
    assignedList.innerHTML = '';
    (list || []).forEach((a) => {
      const row = el('div', 'display:flex;align-items:center;gap:8px;padding:6px 9px;margin-bottom:6px;border:1px solid #2a2a30;background:rgba(20,20,26,0.6);font-size:15px;color:#e6e2d6;');
      row.appendChild(el('div', `width:9px;height:9px;border-radius:50%;background:${ROLECOL[a.role] || '#888'};`));
      row.appendChild(el('div', '', `${a.name} — ${ROLEUP(a.role)}`));
      assignedList.appendChild(row);
    });
  }
  function renderRoster(players, opts) {
    const o = opts || {}; listEl.innerHTML = '';
    const ps = players || [];
    ps.forEach((p) => {
      const row = el('div', 'display:flex;align-items:center;gap:10px;padding:8px 10px;margin-bottom:6px;border:1px solid #2a2a30;background:rgba(20,20,26,0.6);');
      row.appendChild(el('div', `width:10px;height:10px;border-radius:50%;background:${p.host ? '#e8b23a' : '#6fae7e'};`));
      row.appendChild(el('div', 'font-size:18px;color:#e6e2d6;', p.name + (p.host ? '  (host)' : '')));
      listEl.appendChild(row);
    });
    for (let i = ps.length; i < 5; i++) listEl.appendChild(el('div', 'padding:8px 10px;margin-bottom:6px;border:1px dashed #24242a;color:#44444a;font-size:15px;', 'empty slot'));
    if (o.isHost) {
      const can = ps.length >= 2;
      startBtn.style.display = 'block'; startBtn._disabled = !can;
      startBtn.style.opacity = can ? '1' : '0.4'; startBtn.style.cursor = can ? 'pointer' : 'default';
    } else { startBtn.style.display = 'none'; }
  }

  return {
    showHome() { showScreen('home'); nameInput.focus(); },
    showJoinEntry() { showScreen('join'); joinStatus.textContent = ''; codeInput.focus(); },
    showHostLobby(code) { showScreen('lobby'); codeText.textContent = code; },
    setRoster(players, opts) { renderRoster(players, opts); },
    // ---- spin wheel ----
    showSpin() { showScreen('spin'); },
    setWheelRoles(roles) { wheel.setRoles(roles); },
    setTurn(name, isMine) {
      turnName.textContent = (name || '—') + "'s Turn";
      spinBtn._disabled = !isMine;
      spinBtn.style.opacity = isMine ? '1' : '0.35';
      spinBtn.style.cursor = isMine ? 'pointer' : 'default';
      spinBtn.style.borderColor = isMine ? '#e8b23a' : '#34333c';
      spinBtn.textContent = isMine ? 'SPIN' : '…';
    },
    spinResult(role, ms, cb) { spinBtn._disabled = true; spinBtn.style.opacity = '0.35'; spinBtn.textContent = '…'; wheel.spinTo(role, ms, cb); },
    setAssigned(list) { renderAssigned(list); },
    showRoleReveal(myRole, assignments) {
      showScreen('reveal');
      revealRole.textContent = myRole ? ROLEUP(myRole) : 'SPECTATOR';
      revealRole.style.color = ROLECOL[myRole] || '#e8b23a';
      revealSub.textContent = myRole === 'guard'
        ? 'Watch the doors, the cameras, and the power. Survive until 6 AM.'
        : (myRole ? 'Teleport the cameras toward the office and break in before 6 AM.' : 'No role this round — sit back and watch.');
      revealList.innerHTML = '';
      (assignments || []).forEach((a) => revealList.appendChild(el('div', `padding:6px 12px;border:1px solid ${ROLECOL[a.role] || '#2a2a30'};border-radius:6px;font-size:14px;color:#e6e2d6;`, `${a.name}: ${ROLEUP(a.role)}`)));
      revealNote.textContent = 'The night begins…  (live match coming in the next update)';
    },
    setStatus(text) { statusEl.textContent = text || ''; },
    setJoinStatus(text) { joinStatus.textContent = text || ''; },
    nameValue() { return nameInput.value; },
    showMatchOver(winner, myRole, killerName) {
      showScreen('over');
      const guardWon = winner === 'guard';
      overTitle.textContent = guardWon ? '6 AM — THE GUARD SURVIVES' : 'THE ANIMATRONICS WIN';
      overTitle.style.color = guardWon ? '#bfe0cf' : '#e24b4a';
      const iWon = (myRole === 'guard') === guardWon;
      overSub.textContent = (iWon ? 'You win!' : 'You lose.') + (killerName && !guardWon ? '   (' + killerName + ' got in)' : '');
    },
    hide() { root.style.display = 'none'; },
  };
}
