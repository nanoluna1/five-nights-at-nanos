import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clockText, powerPct } from '../src/hudfmt.js';

test('clockText shows 12 AM at start and counts up', () => {
  assert.equal(clockText({ clockMinutes: 0 }), '12 AM');
  assert.equal(clockText({ clockMinutes: 60 }), '1 AM');
  assert.equal(clockText({ clockMinutes: 300 }), '5 AM');
  assert.equal(clockText({ clockMinutes: 360 }), '6 AM');
});

test('powerPct is a clamped rounded integer', () => {
  assert.equal(powerPct({ power: 87.6 }), 88);
  assert.equal(powerPct({ power: -0.1 }), 0);
  assert.equal(powerPct({ power: 100 }), 100);
});
