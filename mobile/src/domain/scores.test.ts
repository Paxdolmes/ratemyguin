/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { awardFor, consistencyScore, excellenceIndex, validateRating, valueScore, type PintRating } from './scores.ts';

const now = new Date('2027-03-01T20:00:00Z');
let n = 0;
function pint(p: Partial<PintRating> = {}): PintRating {
  n += 1;
  return {
    id: `r${n}`,
    pubId: 'p1',
    userId: `u${n}`,
    overall: 9,
    taste: 9,
    temperature: 9,
    head: 9,
    texture: 9,
    pour: 9,
    atmosphere: 9,
    pricePence: 620,
    ratedAt: '2027-02-20T19:00:00Z',
    verification: 'gps',
    weight: 1,
    ...p,
  };
}

test('validates scores out of 10 in half points', () => {
  assert.equal(validateRating(pint()), null);
  assert.match(validateRating(pint({ pour: 11 }))!, /pour/);
  assert.match(validateRating(pint({ taste: 7.3 }))!, /half points/);
  assert.match(validateRating(pint({ pricePence: 5 }))!, /price/);
});

test('no Index until there are enough ratings', () => {
  assert.equal(excellenceIndex([pint(), pint()], { now }).index, null);
  assert.notEqual(excellenceIndex([pint(), pint(), pint()], { now }).index, null);
});

test('perfect pints from many raters approach 100 but are held back by the prior at first', () => {
  const perfect = (k: number) => Array.from({ length: k }, () => pint({ overall: 10, taste: 10, temperature: 10, head: 10, texture: 10, pour: 10, atmosphere: 10, pricePence: 465 }));
  const few = excellenceIndex(perfect(3), { now, localMedianPence: 620 }).index!;
  const many = excellenceIndex(perfect(60), { now, localMedianPence: 620 }).index!;
  assert.ok(few < many, `${few} < ${many}`);
  assert.ok(many >= 96, `${many}`);
});

test('pour carries 40% of the Index', () => {
  const good = Array.from({ length: 20 }, () => pint({ pour: 10, head: 10, texture: 10 }));
  const badPour = Array.from({ length: 20 }, () => pint({ pour: 4, head: 4, texture: 4 }));
  const a = excellenceIndex(good, { now }).index!;
  const b = excellenceIndex(badPour, { now }).index!;
  // pour craft drops 6 points → 0.4 × 6 × 10 = 24 before shrinkage
  assert.ok(a - b >= 18 && a - b <= 24, `${a} - ${b}`);
});

test('consistency punishes a pub that swings', () => {
  assert.equal(consistencyScore([pint({ overall: 8 }), pint({ overall: 8 })]), 10);
  const swing = consistencyScore([pint({ overall: 4 }), pint({ overall: 10 })])!;
  assert.equal(swing, 0);
});

test('value is about price against the local median', () => {
  assert.equal(valueScore(620, 620), 7);
  assert.equal(valueScore(465, 620), 10);
  assert.equal(valueScore(930, 620), 0);
});

test('weightless and stale ratings do not count', () => {
  const base = Array.from({ length: 5 }, () => pint());
  const withFakes = [...base, ...Array.from({ length: 30 }, () => pint({ overall: 1, pour: 1, taste: 1, temperature: 1, head: 1, texture: 1, weight: 0 }))];
  const withStale = [...base, ...Array.from({ length: 30 }, () => pint({ overall: 1, pour: 1, taste: 1, temperature: 1, head: 1, texture: 1, ratedAt: '2025-01-01T00:00:00Z' }))];
  const clean = excellenceIndex(base, { now }).index;
  assert.equal(excellenceIndex(withFakes, { now }).index, clean);
  assert.equal(excellenceIndex(withStale, { now }).index, clean);
});

test('awards need a score and at least 10 ratings', () => {
  assert.equal(awardFor(95), 'exceptional');
  assert.equal(awardFor(94), 'gold');
  assert.equal(awardFor(80), 'recommended');
  assert.equal(awardFor(79), null);
  const nine = Array.from({ length: 9 }, () => pint({ overall: 10, taste: 10, temperature: 10, head: 10, texture: 10, pour: 10, atmosphere: 10 }));
  assert.equal(excellenceIndex(nine, { now }).award, null);
});

test('missing atmosphere and price fall back instead of scoring zero', () => {
  const r = Array.from({ length: 20 }, () => pint({ atmosphere: null, pricePence: null }));
  const res = excellenceIndex(r, { now });
  assert.equal(res.components.atmosphereService, null);
  assert.ok(res.index! >= 85, `${res.index}`);
});
