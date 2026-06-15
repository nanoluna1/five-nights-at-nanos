import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../src/state.js';

test('new state for night 1 has full power and is at 12 AM', () => {
  const s = createGameState(1);
  assert.equal(s.phase, 'nightStart');
  assert.equal(s.night, 1);
  assert.equal(s.power, 100);
  assert.equal(s.usageLoad, 0);
  assert.equal(s.clockMinutes, 0); // 0 = 12 AM
  assert.deepEqual(s.doors, { L: false, R: false });
  assert.deepEqual(s.lights, { L: false, R: false });
  assert.equal(s.flashlight.on, false);
  assert.equal(s.flashlight.charge, 100);
  assert.equal(s.monitorUp, false);
  assert.equal(s.activeCam, 'CAM1A');
});

test('har starts on stage at full path index 0', () => {
  const s = createGameState(1);
  assert.equal(s.animatronics.har.room, 'CAM1A');
  assert.equal(s.animatronics.har.pathIndex, 0);
  assert.equal(s.animatronics.har.difficulty, 0); // night 1 har difficulty
});
