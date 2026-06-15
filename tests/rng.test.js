import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/util/rng.js';

test('same seed produces same sequence', () => {
  const a = makeRng(42), b = makeRng(42);
  assert.equal(a(), b());
  assert.equal(a(), b());
});

test('values are in [0,1)', () => {
  const r = makeRng(1);
  for (let i = 0; i < 100; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
  }
});
