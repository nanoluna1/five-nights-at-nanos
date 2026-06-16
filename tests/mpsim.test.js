import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, matchGuard, matchTeleport, matchKill, stepMatch, snapshot, KILL_TIME, REPEL_CD, SPAM_LIMIT, JAM_TIME } from '../src/mpsim.js';

const A = [
  { id: 'g', name: 'Guard', role: 'guard' },
  { id: 'r', name: 'Argy', role: 'arg' },
];

// Walk an animatronic through a sequence of adjacent nodes, clearing the cooldown between hops.
function moveTo(m, id, ...nodes) {
  const name = Object.keys(m.anims).find(n => m.anims[n].id === id);
  for (const node of nodes) { m.anims[name].cooldown = 0; matchTeleport(m, id, node); }
}

test('createMatch sets the guard and only makes animatronics for filled roles', () => {
  const m = createMatch(1, A);
  assert.equal(m.guardId, 'g');
  assert.deepEqual(Object.keys(m.anims), ['arg']);
  assert.equal(m.anims.arg.id, 'r');
  assert.equal(m.phase, 'playing');
});

test('teleport is 1-dot-at-a-time (adjacent only) and gated by cooldown', () => {
  const m = createMatch(1, A);
  assert.equal(m.anims.arg.node, 'CAM1A');              // everyone starts on the stage
  assert.equal(matchTeleport(m, 'r', 'DOOR_R'), false); // not adjacent to the stage -> blocked
  assert.equal(matchTeleport(m, 'r', 'CAM1B'), true);   // stage -> dining (adjacent)
  assert.equal(m.anims.arg.node, 'CAM1B');
  assert.equal(matchTeleport(m, 'r', 'CAM4'), false);   // still on cooldown
});

test('reaching a door via adjacent hops and KILL wins if the door stays open', () => {
  const m = createMatch(1, A);
  assert.equal(matchKill(m, 'r'), false);               // not at a door yet
  moveTo(m, 'r', 'CAM1B', 'CAM4', 'DOOR_R');            // stage -> dining -> right hall -> right door
  assert.equal(m.anims.arg.atDoor, 'R');
  assert.equal(matchKill(m, 'r'), true);
  assert.equal(m.anims.arg.killTimer, KILL_TIME);
  for (let i = 0; i < 7 && m.phase === 'playing'; i++) stepMatch(m, 1); // door R left open
  assert.equal(m.winner, 'animatronics');
  assert.equal(m.killerName, 'Argy');
});

test('slamming the door during the kill window repels the animatronic back to the stage', () => {
  const m = createMatch(1, A);
  moveTo(m, 'r', 'CAM1B', 'CAM4', 'DOOR_R');
  matchKill(m, 'r');
  stepMatch(m, 2);                 // 2s into the 5s window
  matchGuard(m, 'door', 'R');      // slam the right door
  assert.equal(m.anims.arg.atDoor, null);
  assert.equal(m.anims.arg.killTimer, 0);
  assert.equal(m.anims.arg.node, 'CAM1A'); // sent all the way back to the stage
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

test('spamming a control jams it, blocks input, then recovers (counter resets)', () => {
  const m = createMatch(1, A);
  for (let i = 0; i < SPAM_LIMIT; i++) { matchGuard(m, 'door', 'L'); stepMatch(m, 0.1); } // rapid toggling
  assert.ok(snapshot(m).jam.doorL > 0, 'door L should jam after spamming');
  const held = m.state.doors.L;
  matchGuard(m, 'door', 'L');
  assert.equal(m.state.doors.L, held, 'a jammed control ignores input');
  for (let i = 0; i < JAM_TIME + 1; i++) stepMatch(m, 1);
  assert.equal(snapshot(m).jam.doorL, undefined, 'jam clears after JAM_TIME');
  matchGuard(m, 'door', 'L');
  assert.notEqual(m.state.doors.L, held, 'control works again once the jam clears');
});

test('paced toggling (1s apart) never jams', () => {
  const m = createMatch(1, A);
  for (let i = 0; i < 30; i++) { matchGuard(m, 'door', 'L'); stepMatch(m, 1); }
  assert.equal(snapshot(m).jam.doorL, undefined, 'calm, spaced use should not jam');
});

test('snapshot is serializable and carries the anim + guard state', () => {
  const m = createMatch(1, A);
  moveTo(m, 'r', 'CAM1B', 'CAM4', 'DOOR_R');
  const snap = snapshot(m);
  assert.equal(snap.anims.arg.node, 'DOOR_R');
  assert.equal(snap.anims.arg.atDoor, 'R');
  assert.equal(typeof snap.power, 'number');
  assert.doesNotThrow(() => JSON.stringify(snap));
});
