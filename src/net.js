// Multiplayer transport. The lobby/game logic talks to a small message-passing interface so the
// underlying transport can be swapped. Two implementations:
//   - PeerJS (real P2P, host-authoritative). Lazy-loaded from a CDN so single-player stays
//     dependency-free and offline. The room code IS the host's PeerJS id.
//   - Loopback (in-memory, same page) for unit tests and local screenshot demos.
//
// Host interface:   { isHost:true, broadcast(msg), sendTo(id,msg), close() }
//   hooks: { onReady(code?), onJoin(peerId), onMessage(peerId,msg), onLeave(peerId), onError(e) }
// Client interface: { id, send(msg), close() }
//   hooks: { onReady(), onMessage(msg), onClose(), onError(e) }

// ---------------- loopback (tests / local) ----------------
const loopRegistry = new Map();

export function createLoopbackHost(code, hooks = {}) {
  const clients = new Map();
  let n = 0;
  const host = {
    isHost: true,
    broadcast(msg) { for (const c of clients.values()) c.onMessage && c.onMessage(msg); },
    sendTo(id, msg) { const c = clients.get(id); if (c && c.onMessage) c.onMessage(msg); },
    close() { loopRegistry.delete(code); for (const c of clients.values()) c.onClose && c.onClose(); clients.clear(); },
    _connect(clientHooks) {
      const id = 'peer-' + (++n);
      clients.set(id, clientHooks);
      hooks.onJoin && hooks.onJoin(id);
      return {
        id,
        send: (msg) => hooks.onMessage && hooks.onMessage(id, msg),
        close: () => { if (clients.delete(id)) hooks.onLeave && hooks.onLeave(id); },
      };
    },
  };
  loopRegistry.set(code, host);
  if (hooks.onReady) hooks.onReady(code);
  return host;
}

export function createLoopbackClient(code, hooks = {}) {
  const host = loopRegistry.get(code);
  if (!host) { hooks.onError && hooks.onError('no-host'); return null; }
  const ep = host._connect(hooks);
  if (hooks.onReady) hooks.onReady();
  return { id: ep.id, send: ep.send, close: ep.close };
}

// ---------------- PeerJS (real P2P) ----------------
const PEERJS_CDN = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
// STUN only (no TURN). This handles ordinary home/Wi-Fi NATs; friends on strict/symmetric NATs
// (often mobile data) can't form a direct link and will time out with a clear message — adding a
// working TURN relay later (e.g. a free Metered account) would cover those too.
const ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};
const CONNECT_TIMEOUT_MS = 18000; // give up (with a message) instead of hanging forever
let peerLibPromise = null;
function loadPeerJS() {
  if (typeof window !== 'undefined' && window.Peer) return Promise.resolve(window.Peer);
  if (peerLibPromise) return peerLibPromise;
  peerLibPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PEERJS_CDN;
    s.onload = () => resolve(window.Peer);
    s.onerror = () => { peerLibPromise = null; reject(new Error('peerjs-load-failed')); };
    document.head.appendChild(s);
  });
  return peerLibPromise;
}

export async function createPeerHost(code, hooks = {}) {
  const Peer = await loadPeerJS();
  const peer = new Peer(code, { config: ICE }); // the room code is our peer id
  const conns = new Map();
  let opened = false, closed = false;
  // The public PeerJS broker drops idle peers after a few minutes — which would make the room code
  // go dead so NEW friends can't join (already-connected players keep working). Reconnecting on
  // disconnect + a periodic safety check keeps the host REGISTERED so the code stays valid all
  // session; the ping also keeps the open data channels from idling out while waiting in the lobby.
  const reconnect = () => { if (closed) return; try { if (peer.disconnected && !peer.destroyed) peer.reconnect(); } catch (e) {} };
  const keepAlive = setInterval(() => {
    reconnect();
    for (const c of conns.values()) { try { c.send({ type: '__ping' }); } catch (e) {} }
  }, 15000);
  peer.on('open', () => { opened = true; hooks.onReady && hooks.onReady(code); });
  peer.on('disconnected', reconnect);
  peer.on('error', (e) => {
    const t = e && e.type ? e.type : String(e);
    if (opened && (t === 'network' || t === 'disconnected')) reconnect(); // lost the broker — re-register
    else hooks.onError && hooks.onError(t);                                // a real failure (e.g. can't open)
  });
  peer.on('connection', (conn) => {
    conn.on('open', () => { conns.set(conn.peer, conn); hooks.onJoin && hooks.onJoin(conn.peer); });
    conn.on('data', (msg) => { if (msg && msg.type === '__ping') return; hooks.onMessage && hooks.onMessage(conn.peer, msg); });
    conn.on('close', () => { if (conns.delete(conn.peer)) hooks.onLeave && hooks.onLeave(conn.peer); });
  });
  return {
    isHost: true,
    broadcast(msg) { for (const c of conns.values()) c.send(msg); },
    sendTo(id, msg) { const c = conns.get(id); if (c) c.send(msg); },
    close() { closed = true; clearInterval(keepAlive); for (const c of conns.values()) c.close(); peer.destroy(); },
  };
}

// A standalone ICE probe so we can SEE, on a given network, which candidate types are reachable —
// host (LAN), srflx (STUN), relay (TURN). No relay => TURN isn't usable here, which explains a hang.
function probeIce(log) {
  try {
    const pc = new RTCPeerConnection(ICE);
    pc.createDataChannel('probe');
    const seen = {};
    pc.onicecandidate = (e) => { if (e.candidate) { const m = e.candidate.candidate.match(/typ (\w+)/); if (m && !seen[m[1]]) { seen[m[1]] = true; log('· ICE candidate: ' + m[1] + (m[1] === 'relay' ? '  ✓ TURN works' : '')); } } };
    pc.createOffer().then((o) => pc.setLocalDescription(o)).catch(() => {});
    setTimeout(() => { log('· ICE result: [' + (Object.keys(seen).join(', ') || 'none') + ']' + (seen.relay ? '' : '  — NO RELAY (TURN unavailable on this network)')); try { pc.close(); } catch (e) {} }, 8000);
  } catch (e) { log('· ICE probe failed: ' + e.message); }
}

export async function createPeerClient(code, hooks = {}) {
  const log = (s) => hooks.onLog && hooks.onLog(s);
  log('loading peerjs…');
  const Peer = await loadPeerJS();
  log('checking this network (ICE)…'); probeIce(log);
  const peer = new Peer(undefined, { config: ICE });
  return new Promise((resolve) => {
    let settled = false;
    const done = (val) => { if (settled) return; settled = true; clearTimeout(to); resolve(val); };
    const to = setTimeout(() => { log('TIMED OUT after ' + (CONNECT_TIMEOUT_MS / 1000) + 's — no connection'); try { if (!peer.destroyed) peer.destroy(); } catch (e) {} done(null); }, CONNECT_TIMEOUT_MS);
    peer.on('open', () => {
      log('peer open (' + peer.id + ') — connecting to host ' + code + '…');
      const conn = peer.connect(code, { reliable: true });
      setTimeout(() => { const rpc = conn.peerConnection; if (rpc) rpc.oniceconnectionstatechange = () => log('webrtc state: ' + rpc.iceConnectionState); }, 600);
      conn.on('open', () => { log('CONNECTED ✓'); hooks.onReady && hooks.onReady(); done({ id: peer.id, send: (m) => conn.send(m), close: () => { try { conn.close(); peer.destroy(); } catch (e) {} } }); });
      conn.on('data', (msg) => { if (msg && msg.type === '__ping') return; hooks.onMessage && hooks.onMessage(msg); });
      conn.on('close', () => { log('data channel closed'); hooks.onClose && hooks.onClose(); });
    });
    peer.on('disconnected', () => { log('lost broker — reconnecting…'); try { if (!peer.destroyed) peer.reconnect(); } catch (e) {} });
    peer.on('error', (e) => {
      const t = e && e.type ? e.type : String(e);
      log('peer error: ' + t);
      if (settled && (t === 'network' || t === 'disconnected')) { try { if (!peer.destroyed) peer.reconnect(); } catch (e2) {} return; }
      hooks.onError && hooks.onError(t);
      done(null);
    });
  });
}
