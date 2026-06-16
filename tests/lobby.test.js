import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRoomCode, createLobby, MAX_PLAYERS } from '../src/lobby.js';
import { createLoopbackHost, createLoopbackClient } from '../src/net.js';

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

test('loopback client to a missing room reports an error and returns null', () => {
  let err = null;
  const client = createLoopbackClient('does-not-exist', { onError: (e) => { err = e; } });
  assert.equal(client, null);
  assert.equal(err, 'no-host');
});
