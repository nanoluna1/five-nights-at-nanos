import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../src/state.js';
import { recomputeUsage, drainPower } from '../src/power.js';

test('usageLoad counts active doors, lights, monitor, flashlight', () => {
  const s = createGameState(1);
  s.doors.L = true; s.lights.R = true; s.monitorUp = true; s.flashlight.on = true;
  recomputeUsage(s);
  assert.equal(s.usageLoad, 4);
});

test('idle drain still reduces power', () => {
  const s = createGameState(1);
  recomputeUsage(s);            // usageLoad 0
  drainPower(s, 1);             // 1 second
  assert.ok(s.power < 100 && s.power > 99); // only base drain
});

test('power floors at 0 and flags shutdown', () => {
  const s = createGameState(1);
  s.power = 0.1;
  const shutdown = drainPower(s, 1);
  assert.equal(s.power, 0);
  assert.equal(shutdown, true);
});
