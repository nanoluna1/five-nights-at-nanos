# Five Nights at Nano's — Multiplayer design

Asymmetric online multiplayer: one **Guard** (the normal FNAF defender) vs human-controlled
**animatronics** (Har, Gi, Cluck, Arg) who teleport the camera map toward the office.

## Decisions (locked 2026-06-16)
- **Transport:** P2P via **PeerJS**, **host-authoritative**. The host's browser runs the
  authoritative sim; clients send inputs and render from state snapshots. The room **code is the
  host's PeerJS id** (friendly form like `nanoglaze-8912`). PeerJS is **lazy-loaded from a CDN only
  when entering Multiplayer**, so single-player stays dependency-free/offline.
- **Roles (5):** Guard, Har, Gi, Cluck, Arg. **Exactly one Guard is forced.** Empty animatronic
  slots are **left out** (fewer players → easier night; their AI does NOT fill in).
- **Spin wheel:** per-player turn, the wheel of *remaining* roles spins, lands, assigns + removes
  that role; repeat until everyone has a role; then the night starts.
- **Animatronic play:** camera/map view; look around + switch cams; mini-map at bottom with white
  **teleport dots** (tap to teleport, short cooldown). At the office door, press **KILL** → a
  **5-second timer** → guard can slam that door to repel; if still open at 0 → jumpscare,
  animatronics win. Guard wins by surviving to 6 AM.
- **Art:** authored directly in the existing hand-rolled DOM/canvas style (NOT agy — its visual
  output for this game has been unreliable).

## Architecture
- `src/net.js` — transport behind a tiny interface so the lobby logic is transport-agnostic.
  - `createPeerHost(code, hooks)` / `createPeerClient(code, name, hooks)` — real PeerJS (lazy CDN).
  - `createLoopbackHost/Client` — in-memory transport for tests + local screenshot demos.
  - Interface: host `{ broadcast(msg), close() }` + hooks `{onJoin(peer), onMessage(peer,msg),
    onLeave(peer)}`; client `{ send(msg), close() }` + hooks `{onMessage(msg), onClose()}`.
- `src/lobby.js` — PURE logic (unit-tested): `makeRoomCode(rand)`, roster add/remove (cap 5),
  host/client bookkeeping, and later role assignment incl. the forced-Guard rule.
- `src/ui/mpmenu.js` — DOM screens (multiplayer tab, host lobby, join), styled like overlay.js.
- `overlay.js` — adds the "Multiplayer" menu row + `onMultiplayer` hook.
- `main.js` — wires net ↔ lobby ↔ mpmenu; later bridges to the sim.

## Slices
1. **Lobby & connection (this slice):** Multiplayer tab (title → "(Multiplayer)" subtitle, name
   field, Host/Join); Host lobby (code top-center, live player list left, Start bottom-right, host
   only); Join (code entry → connect). Real PeerJS connect + live roster. Loopback transport for
   tests/screenshots. Start emits an event (handled in Slice 2). Min 2 players to Start.
2. **Spin wheel:** synced role assignment + wheel animation; forced-Guard rule; then start night.
3. **In-game multiplayer:** guard plays the normal night; animatronic teleport/kill view;
   host-authoritative state sync (~15 Hz); win/lose for both sides.

## Testing
- `tests/lobby.test.js` — code format, roster cap, add/remove, forced-Guard assignment.
- UI verified via puppeteer screenshots; populated lobby demonstrated through the loopback transport
  (no internet needed). Live cross-device PeerJS handshake is verified on real devices.
