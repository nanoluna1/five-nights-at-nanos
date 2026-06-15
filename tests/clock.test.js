import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeAccumulator, advanceClock, clockHour } from '../src/clock.js';

test('accumulator yields whole ticks and keeps remainder', () => {
  const acc = makeAccumulator(10); // 10 Hz -> 0.1s per tick
  assert.equal(acc.feed(0.25), 2); // 0.25s -> 2 ticks
  assert.equal(acc.feed(0.05), 0); // 0.05 + 0.05 leftover = 0.1 -> next call
  assert.equal(acc.feed(0.05), 1);
});

test('clock reaches 6 AM after nightSeconds of game time', () => {
  let s = { clockMinutes: 0 };
  advanceClock(s, 360); // nightSeconds worth of seconds
  assert.equal(clockHour(s), 6); // 6 AM
});

test('clockHour maps 0 -> 12 AM hour bucket', () => {
  assert.equal(clockHour({ clockMinutes: 0 }), 0);   // 12 AM
  assert.equal(clockHour({ clockMinutes: 60 }), 1);  // 1 AM
});
