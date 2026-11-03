import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isAdult } from './age.ts';

test('18 today counts, a day short does not', () => {
  const now = new Date(2026, 10, 3);
  assert.equal(isAdult(2008, 11, 3, now), true);
  assert.equal(isAdult(2008, 11, 4, now), false);
  assert.equal(isAdult(1980, 1, 1, now), true);
});

test('impossible dates are refused', () => {
  assert.equal(isAdult(1990, 2, 31), false);
  assert.equal(isAdult(1990, 13, 1), false);
  assert.equal(isAdult(0, 1, 1), false);
});
