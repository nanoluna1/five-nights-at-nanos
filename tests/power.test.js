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

test('one active bar of usage lasts the full night with margin to spare', () => {
  const s = createGameState(1);
  s.monitorUp = true; recomputeUsage(s);   // usageLoad 1
  for (let i = 0; i < 360; i++) drainPower(s, 1); // a full 6-minute night
  assert.ok(s.power > 0, 'a single bar should survive to 6 AM');
});

test('four simultaneous draws cannot last the night', () => {
  const s = createGameState(1);
  s.doors.L = s.doors.R = true; s.lights.L = s.lights.R = true; recomputeUsage(s); // load 4
  let died = false;
  for (let i = 0; i < 360 && !died; i++) died = drainPower(s, 1);
  assert.ok(died, 'stacking four bars should burn out before the night ends');
});

test('power floors at 0 and flags shutdown', () => {
  const s = createGameState(1);
  s.power = 0.01;              // below one second of idle drain, so it bottoms out this tick
  const shutdown = drainPower(s, 1);
  assert.equal(s.power, 0);
  assert.equal(shutdown, true);
});
