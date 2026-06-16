import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRoomCode, createLobby, MAX_PLAYERS, ROLES, pickSpinRole } from '../src/lobby.js';
import { createLoopbackHost, createLoopbackClient } from '../src/net.js';
import { makeRng } from '../src/util/rng.js';

// Simulate the host's per-player spin loop for N players and return the assigned roles.
function assignAll(n, rng) {
  const remaining = ROLES.slice();
  let guardAssigned = false;
  const out = [];
  for (let i = 0; i < n; i++) {
    const role = pickSpinRole(remaining, guardAssigned, n - i, rng);
    remaining.splice(remaining.indexOf(role), 1);
    if (role === 'guard') guardAssigned = true;
    out.push(role);
  }
  return out;
}

test('room code is friendly: lowercase word + dash + 4 digits', () => {
  const code = makeRoomCode(() => 0.42);
  assert.match(code, /^[a-z]+-\d{4}$/);
});

test('lobby adds players up to the cap and rejects extras and duplicates', () => {
  const lobby = createLobby();
  assert.equal(lobby.add('HOST', 'Nano', true), true);
  assert.equal(lobby.add('HOST', 'again'), false);          // duplicate id
  for (let i = 1; i < MAX_PLAYERS; i++) assert.equal(lobby.add('p' + i, 'P' + i), true);
  assert.equal(lobby.isFull(), true);
  assert.equal(lobby.add('overflow', 'No'), false);          // past the cap
  assert.equal(lobby.count(), MAX_PLAYERS);
  assert.equal(lobby.players()[0].host, true);
});

test('lobby remove drops a player', () => {
  const lobby = createLobby();
  lobby.add('a', 'A'); lobby.add('b', 'B');
  assert.equal(lobby.remove('a'), true);
  assert.equal(lobby.remove('a'), false);
  assert.deepEqual(lobby.players().map(p => p.id), ['b']);
});

test('names are trimmed, capped, and defaulted', () => {
  const lobby = createLobby();
  lobby.add('x', '   ');                    // blank -> default
  lobby.add('y', 'a-really-long-name-here');// capped to 16
  const [a, b] = lobby.players();
  assert.equal(a.name, 'Player');
  assert.equal(b.name.length, 16);
});

test('loopback transport delivers join, client->host, and host broadcast', () => {
  const log = [];
  const host = createLoopbackHost('nanoglaze-0001', {
    onJoin: (id) => log.push('join:' + id),
    onMessage: (id, msg) => log.push('host<-' + id + ':' + msg.type),
  });
  const client = createLoopbackClient('nanoglaze-0001', {
    onMessage: (msg) => log.push('client<-' + msg.type),
  });
  assert.ok(client);
  client.send({ type: 'hello', name: 'Nano' });
  host.broadcast({ type: 'roster' });
  assert.deepEqual(log, ['join:peer-1', 'host<-peer-1:hello', 'client<-roster']);
});

test('role assignment always yields exactly one guard and distinct roles, for 2..5 players', () => {
  for (let n = 2; n <= 5; n++) {
    for (let seed = 1; seed <= 60; seed++) {
      const roles = assignAll(n, makeRng(seed * 31 + n));
      assert.equal(roles.length, n);
      assert.equal(roles.filter(r => r === 'guard').length, 1, `n=${n} seed=${seed} needs exactly one guard`);
      assert.equal(new Set(roles).size, n, 'roles must be distinct');
      for (const r of roles) assert.ok(ROLES.includes(r));
    }
  }
});

test('pickSpinRole forces guard on the last player when none assigned yet', () => {
  // 2 players left logically; pretend we are the LAST (playersLeft=1) with guard still open
  assert.equal(pickSpinRole(['guard', 'gi', 'arg'], false, 1, () => 0.99), 'guard');
});

test('pickSpinRole never returns guard once it is assigned', () => {
  for (let i = 0; i < 20; i++) {
    const r = pickSpinRole(['har', 'gi', 'cluck', 'arg'], true, 3, makeRng(i + 1));
    assert.notEqual(r, 'guard');
  }
});

test('loopback client to a missing room reports an error and returns null', () => {
  let err = null;
  const client = createLoopbackClient('does-not-exist', { onError: (e) => { err = e; } });
  assert.equal(client, null);
  assert.equal(err, 'no-host');
});
