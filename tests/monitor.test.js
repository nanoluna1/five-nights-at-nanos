import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../src/state.js';
import { setMonitor, switchCam } from '../src/monitor.js';

test('raising the monitor sets monitorUp and keeps a valid activeCam', () => {
  const s = createGameState(1);
  setMonitor(s, true);
  assert.equal(s.monitorUp, true);
  assert.equal(s.activeCam, 'CAM1A');
});

test('lowering the monitor always exits cleanly', () => {
  const s = createGameState(1);
  setMonitor(s, true);
  setMonitor(s, false);
  assert.equal(s.monitorUp, false);
});

test('raising when already up is a no-op (cannot double-open)', () => {
  const s = createGameState(1);
  setMonitor(s, true);
  const before = s.activeCam;
  setMonitor(s, true);
  assert.equal(s.monitorUp, true);
  assert.equal(s.activeCam, before); // unchanged, no re-init
});

test('lowering when already down is a no-op (cannot get stuck)', () => {
  const s = createGameState(1);
  setMonitor(s, false);
  assert.equal(s.monitorUp, false);
});

test('switchCam only works while monitor is up and returns whether it changed', () => {
  const s = createGameState(1);
  assert.equal(switchCam(s, 'CAM1B'), false); // monitor down -> rejected
  assert.equal(s.activeCam, 'CAM1A');
  setMonitor(s, true);
  assert.equal(switchCam(s, 'CAM1B'), true);  // changed
  assert.equal(s.activeCam, 'CAM1B');
  assert.equal(switchCam(s, 'CAM1B'), false);  // same cam -> no change
});

test('cannot raise the monitor during a pending scare', () => {
  const s = createGameState(1);
  s.pendingScare = 'har';
  setMonitor(s, true);
  assert.equal(s.monitorUp, false);
});
