import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, matchGuard, matchTeleport, matchKill, stepMatch, snapshot, KILL_TIME, REPEL_CD } from '../src/mpsim.js';

const A = [
  { id: 'g', name: 'Guard', role: 'guard' },
  { id: 'r', name: 'Argy', role: 'arg' },
];

test('createMatch sets the guard and only makes animatronics for filled roles', () => {
  const m = createMatch(1, A);
  assert.equal(m.guardId, 'g');
  assert.deepEqual(Object.keys(m.anims), ['arg']);
  assert.equal(m.anims.arg.id, 'r');
  assert.equal(m.phase, 'playing');
});

test('teleport moves the animatronic and is gated by cooldown; a door arms the kill side', () => {
  const m = createMatch(1, A);
  assert.equal(matchTeleport(m, 'r', 'DOOR_R'), true);
  assert.equal(m.anims.arg.node, 'DOOR_R');
  assert.equal(m.anims.arg.atDoor, 'R');
  assert.equal(matchTeleport(m, 'r', 'CAM2'), false); // still on cooldown
});

test('kill only works at a door and triggers an animatronics win if the door stays open', () => {
  const m = createMatch(1, A);
  assert.equal(matchKill(m, 'r'), false);   // not at a door yet
  matchTeleport(m, 'r', 'DOOR_R');
  assert.equal(matchKill(m, 'r'), true);
  assert.equal(m.anims.arg.killTimer, KILL_TIME);
  for (let i = 0; i < 7 && m.phase === 'playing'; i++) stepMatch(m, 1); // door R left open
  assert.equal(m.phase, 'over');
  assert.equal(m.winner, 'animatronics');
  assert.equal(m.killerName, 'Argy');
});

test('shutting the door during the kill window repels the animatronic (no win)', () => {
  const m = createMatch(1, A);
  matchTeleport(m, 'r', 'DOOR_R');
  matchKill(m, 'r');
  stepMatch(m, 2);                 // 2s into the 5s window
  matchGuard(m, 'door', 'R');      // slam the right door
  assert.equal(m.anims.arg.atDoor, null);
  assert.equal(m.anims.arg.killTimer, 0);
  assert.equal(m.anims.arg.cooldown, REPEL_CD);
  for (let i = 0; i < 10 && m.phase === 'playing'; i++) stepMatch(m, 1);
  assert.notEqual(m.winner, 'animatronics');
});

test('reaching 6 AM is a guard win', () => {
  const m = createMatch(1, A);
  m.state.clockMinutes = 359;
  stepMatch(m, 2);
  assert.equal(m.phase, 'over');
  assert.equal(m.winner, 'guard');
});

test('power-out is an animatronics win', () => {
  const m = createMatch(1, A);
  m.state.power = 0.05;
  stepMatch(m, 1);
  assert.equal(m.winner, 'animatronics');
  assert.equal(m.killerName, 'the dark');
});

test('multiplayer power is forgiving — a moderate guard load lasts the night', () => {
  const m = createMatch(1, A);
  m.state.doors.R = true; m.state.monitorUp = true; // ~2 active draws the whole match
  for (let i = 0; i < 360 && m.phase === 'playing'; i++) stepMatch(m, 1);
  assert.equal(m.winner, 'guard', 'should reach 6 AM, not power-out');
  assert.ok(m.state.power > 0, 'power should survive a moderate load with the MP rates');
});

test('snapshot is serializable and carries the anim + guard state', () => {
  const m = createMatch(1, A);
  matchTeleport(m, 'r', 'DOOR_R');
  const snap = snapshot(m);
  assert.equal(snap.anims.arg.node, 'DOOR_R');
  assert.equal(snap.anims.arg.atDoor, 'R');
  assert.equal(typeof snap.power, 'number');
  assert.doesNotThrow(() => JSON.stringify(snap));
});
