import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../src/state.js';
import { makeRng } from '../src/util/rng.js';
import { stepAI } from '../src/ai.js';

// Neutralize every creature except the one under test: zero their difficulty (walkers won't
// advance) and watch the cove (keeps Arg's meter drained), unless the test overrides it.
function isolate(s, keep) {
  for (const name of Object.keys(s.animatronics)) if (name !== keep) s.animatronics[name].difficulty = 0;
  s.monitorUp = true; s.activeCam = 'CAM7'; // park on cove so Arg stays down by default
}

test('har with difficulty 0 never advances', () => {
  const s = createGameState(1); // night 1 har difficulty = 0
  isolate(s, 'har');
  const rng = makeRng(123);
  for (let i = 0; i < 300; i++) stepAI(s, 1, rng);
  assert.equal(s.animatronics.har.pathIndex, 0);
  assert.equal(s.pendingScare, null);
});

test('gi reaches the LEFT door and scares when the left door is open', () => {
  const s = createGameState(1);
  isolate(s, 'gi');
  s.animatronics.gi.difficulty = 20; // always advances
  s.doors.L = false; s.doors.R = true;
  const rng = makeRng(7);
  for (let i = 0; i < 200 && !s.pendingScare; i++) stepAI(s, 1, rng);
  assert.equal(s.pendingScare, 'gi');
});

test('shutting the LEFT door repels gi (no scare)', () => {
  const s = createGameState(1);
  isolate(s, 'gi');
  s.animatronics.gi.difficulty = 20;
  s.doors.L = true; // shut the whole time
  const rng = makeRng(7);
  for (let i = 0; i < 200; i++) stepAI(s, 1, rng);
  assert.equal(s.pendingScare, null);
  assert.equal(s.animatronics.gi.atDoor, null); // repelled, not lurking
});

test('cluck reaches the RIGHT door and scares when the right door is open', () => {
  const s = createGameState(3); // cluck spikes mid-night
  isolate(s, 'cluck');
  s.animatronics.cluck.difficulty = 20;
  s.doors.L = true; s.doors.R = false;
  const rng = makeRng(11);
  for (let i = 0; i < 200 && !s.pendingScare; i++) stepAI(s, 1, rng);
  assert.equal(s.pendingScare, 'cluck');
});

test('arg fills emergence while the cove is unwatched and sprints to the right door', () => {
  const s = createGameState(2);
  isolate(s, 'arg');
  s.monitorUp = false;            // NOT watching the cove -> meter fills
  s.doors.L = true; s.doors.R = false; // right open so the sprint lands a scare
  const rng = makeRng(5);
  let sawDoor = false;
  for (let i = 0; i < 120 && !s.pendingScare; i++) { stepAI(s, 1, rng); if (s.animatronics.arg.atDoor === 'R') sawDoor = true; }
  assert.ok(sawDoor, 'arg should sprint to the right door');
  assert.equal(s.pendingScare, 'arg');
});

test('watching the cove keeps arg from emerging', () => {
  const s = createGameState(5);
  isolate(s, 'arg');
  s.monitorUp = true; s.activeCam = 'CAM7'; // actively watching
  const rng = makeRng(9);
  for (let i = 0; i < 120; i++) stepAI(s, 1, rng);
  assert.equal(s.animatronics.arg.atDoor, null);
  assert.ok(s.animatronics.arg.emergence < 100);
  assert.equal(s.pendingScare, null);
});

test('shutting the door sends a walker back to the START of its path (no door camping)', () => {
  const s = createGameState(1);
  isolate(s, 'gi');
  const gi = s.animatronics.gi; gi.atDoor = 'L'; gi.room = 'DOOR_L'; gi.doorTimer = 0;
  s.doors.L = true; // shut in time
  stepAI(s, 0.1, makeRng(1));
  assert.equal(gi.atDoor, null);
  assert.equal(gi.pathIndex, 0);      // all the way back to the start, not lingering by the door
  assert.equal(gi.room, 'CAM1A');     // gi.start
});

test('watching the cove HOLDS Arg at his current stage (never recedes)', () => {
  const s = createGameState(3);
  isolate(s, 'arg');
  const arg = s.animatronics.arg; arg.emergence = 60; // mid-emergence (stage 3)
  s.monitorUp = true; s.activeCam = 'CAM7';            // watch him
  for (let i = 0; i < 30; i++) stepAI(s, 0.1, makeRng(1)); // 3s of watching
  assert.equal(arg.emergence, 60, 'frozen at his stage while watched — does not go backward');
});

test('once Arg leaves the cove he is seen sprinting down the right hall (CAM4)', () => {
  const s = createGameState(5);
  isolate(s, 'arg');
  s.monitorUp = false; // cove unwatched -> he fills and commits
  const arg = s.animatronics.arg;
  let sawHall = false;
  for (let i = 0; i < 300 && !arg.atDoor; i++) { stepAI(s, 0.5, makeRng(1)); if (arg.committed && arg.room === 'CAM4') sawHall = true; }
  assert.ok(sawHall, 'while committed he should appear in CAM4 before reaching the door');
});

test('low power boosts har enough to advance at base difficulty 0', () => {
  const s = createGameState(1);
  isolate(s, 'har');
  s.power = 10; // below harLowPowerThreshold (30)
  const rng = makeRng(3);
  let moved = false;
  for (let i = 0; i < 300; i++) { stepAI(s, 1, rng); if (s.animatronics.har.pathIndex > 0) { moved = true; break; } }
  assert.ok(moved, 'low power should let Har advance even at base difficulty 0');
});
