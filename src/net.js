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
  const peer = new Peer(code); // the room code is our peer id
  const conns = new Map();
  peer.on('open', () => hooks.onReady && hooks.onReady(code));
  peer.on('error', (e) => hooks.onError && hooks.onError(e && e.type ? e.type : String(e)));
  peer.on('connection', (conn) => {
    conn.on('open', () => { conns.set(conn.peer, conn); hooks.onJoin && hooks.onJoin(conn.peer); });
    conn.on('data', (msg) => hooks.onMessage && hooks.onMessage(conn.peer, msg));
    conn.on('close', () => { if (conns.delete(conn.peer)) hooks.onLeave && hooks.onLeave(conn.peer); });
  });
  return {
    isHost: true,
    broadcast(msg) { for (const c of conns.values()) c.send(msg); },
    sendTo(id, msg) { const c = conns.get(id); if (c) c.send(msg); },
    close() { for (const c of conns.values()) c.close(); peer.destroy(); },
  };
}

export async function createPeerClient(code, hooks = {}) {
  const Peer = await loadPeerJS();
  const peer = new Peer();
  return new Promise((resolve) => {
    let settled = false;
    peer.on('open', () => {
      const conn = peer.connect(code, { reliable: true });
      conn.on('open', () => {
        settled = true;
        hooks.onReady && hooks.onReady();
        resolve({ id: peer.id, send: (m) => conn.send(m), close: () => { conn.close(); peer.destroy(); } });
      });
      conn.on('data', (msg) => hooks.onMessage && hooks.onMessage(msg));
      conn.on('close', () => hooks.onClose && hooks.onClose());
    });
    peer.on('error', (e) => { hooks.onError && hooks.onError(e && e.type ? e.type : String(e)); if (!settled) resolve(null); });
  });
}
