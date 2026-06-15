import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSave, recordNightComplete, defaultSave } from '../src/save.js';

function memStore() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

test('fresh storage returns default save (night 1 unlocked)', () => {
  const s = loadSave(memStore());
  assert.deepEqual(s, defaultSave());
  assert.equal(s.highestUnlocked, 1);
});

test('completing a night unlocks the next and is persisted', () => {
  const store = memStore();
  recordNightComplete(store, 1);
  const s = loadSave(store);
  assert.equal(s.highestUnlocked, 2);
  assert.equal(s.lastPlayed, 1);
});

test('completing a lower night does not lower the unlock ceiling', () => {
  const store = memStore();
  recordNightComplete(store, 3);
  recordNightComplete(store, 1);
  assert.equal(loadSave(store).highestUnlocked, 4);
});
