// Pure lobby logic for multiplayer: friendly room-code generation + roster bookkeeping. No DOM and
// no network here — the host owns a Lobby and broadcasts roster snapshots; clients just render what
// they receive. Kept pure so it is unit-tested (tests/lobby.test.js).
export const MAX_PLAYERS = 5; // Guard + Har + Gi + Cluck + Arg
export const ROLES = ['guard', 'har', 'gi', 'cluck', 'arg'];

// Decide everyone's role UP FRONT so the Guard is uniformly random among ALL players — no "the last
// spinner becomes Guard" bias. The wheel just animates each player to their planned role. Exactly
// one Guard; the rest get distinct animatronics. `forceGuardId` (optional) pins a player to Guard
// (used by the host cheat). `ids` is the list of player ids; `rand` -> [0,1), injectable for tests.
export function planRoles(ids, rand = Math.random, forceGuardId = null) {
  const players = ids.slice();
  let guardId;
  if (forceGuardId && players.includes(forceGuardId)) guardId = forceGuardId;
  else guardId = players[Math.min(players.length - 1, Math.floor(rand() * players.length))];
  const anims = ROLES.slice(1); // ['har','gi','cluck','arg']
  for (let i = anims.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = anims[i]; anims[i] = anims[j]; anims[j] = t; }
  const map = {};
  let ai = 0;
  for (const id of players) map[id] = (id === guardId) ? 'guard' : anims[ai++];
  return map;
}

const CODE_A = ['nano', 'dusk', 'rust', 'gloom', 'hollow', 'murk', 'vex', 'grim', 'ash', 'fog'];
const CODE_B = ['glaze', 'spire', 'hush', 'crawl', 'snarl', 'rictus', 'vault', 'creak', 'shade', 'maw'];

// Friendly room code like "nanoglaze-8912". `rand` -> [0,1); injectable so tests are deterministic.
export function makeRoomCode(rand = Math.random) {
  const pick = (arr) => arr[Math.min(arr.length - 1, Math.floor(rand() * arr.length))];
  let digits = '';
  for (let i = 0; i < 4; i++) digits += Math.floor(rand() * 10);
  return `${pick(CODE_A)}${pick(CODE_B)}-${digits}`;
}

// A roster the host maintains. Players: { id, name, host }. Capacity is MAX_PLAYERS.
export function createLobby() {
  const players = [];
  return {
    players: () => players.map(p => ({ ...p })),
    count: () => players.length,
    isFull: () => players.length >= MAX_PLAYERS,
    has: (id) => players.some(p => p.id === id),
    add(id, name, host = false) {
      if (players.length >= MAX_PLAYERS || players.some(p => p.id === id)) return false;
      players.push({ id, name: String(name || 'Player').trim().slice(0, 16) || 'Player', host: !!host });
      return true;
    },
    remove(id) {
      const i = players.findIndex(p => p.id === id);
      if (i >= 0) players.splice(i, 1);
      return i >= 0;
    },
  };
}
