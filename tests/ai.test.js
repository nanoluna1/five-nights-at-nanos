import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../src/state.js';
import { makeRng } from '../src/util/rng.js';
import { stepAI } from '../src/ai.js';

test('har with difficulty 0 never advances', () => {
  const s = createGameState(1); // night 1 har difficulty = 0
  const rng = makeRng(123);
  for (let i = 0; i < 200; i++) stepAI(s, 1, rng); // 200 seconds
  assert.equal(s.animatronics.har.pathIndex, 0);
  assert.equal(s.pendingScare, null);
});

test('har with high difficulty advances toward the office over time', () => {
  const s = createGameState(1);
  s.animatronics.har.difficulty = 20; // forced max
  const rng = makeRng(7);
  let moved = false;
  for (let i = 0; i < 60; i++) {
    stepAI(s, 1, rng);
    if (s.animatronics.har.pathIndex > 0) { moved = true; break; }
  }
  assert.ok(moved, 'har should have advanced at least one node');
});

test('har reaching OFFICE while the near door is open triggers a scare', () => {
  const s = createGameState(1);
  const har = s.animatronics.har;
  har.pathIndex = 2;                 // last node before OFFICE (CAM3)
  har.difficulty = 20;
  s.doors.L = false;                  // door open -> vulnerable
  const rng = makeRng(99);
  for (let i = 0; i < 100 && !s.pendingScare; i++) stepAI(s, 1, rng);
  assert.equal(s.pendingScare, 'har');
});

test('har is blocked at the office when the near door is shut', () => {
  const s = createGameState(1);
  const har = s.animatronics.har;
  har.pathIndex = 3;                  // already at OFFICE node
  har.room = 'OFFICE';
  har.difficulty = 20;
  s.doors.L = true;                   // shut -> blocked, retreats, no scare
  const rng = makeRng(5);
  stepAI(s, 5, rng);                   // advance one full roll interval (moveRollEverySec)
  assert.equal(s.pendingScare, null);
  assert.ok(har.pathIndex < 3, 'har should be repelled by the shut door');
});

test('low power boosts har effective difficulty', () => {
  const s = createGameState(1);
  s.power = 10;                       // below harLowPowerThreshold (30)
  s.animatronics.har.difficulty = 0;  // base 0; boost should make movement possible
  const rng = makeRng(3);
  let moved = false;
  for (let i = 0; i < 200; i++) { stepAI(s, 1, rng); if (s.animatronics.har.pathIndex > 0) { moved = true; break; } }
  assert.ok(moved, 'low power should make Har able to advance even at base difficulty 0');
});
