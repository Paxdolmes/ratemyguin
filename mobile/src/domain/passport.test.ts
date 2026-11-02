/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { badges, explorerPoints, rankLeaderboard, uniqueStamps, type Stamp } from './passport.ts';

const stamp = (pubId: string, day: number, extra: Partial<Stamp> = {}): Stamp => ({
  pubId,
  city: 'London',
  country: 'United Kingdom',
  at: `2027-03-${String(day).padStart(2, '0')}T20:00:00Z`,
  pubIndex: 85,
  verified: true,
  ...extra,
});

test('repeat visits collect one stamp, upgraded to verified', () => {
  const s = uniqueStamps([stamp('a', 1, { verified: false }), stamp('a', 2), stamp('b', 3)]);
  assert.equal(s.length, 2);
  assert.equal(s[0].verified, true);
});

test('10-pub badge earned on the tenth verified pub', () => {
  const stamps = Array.from({ length: 10 }, (_, i) => stamp(`p${i}`, i + 1));
  const ten = badges(stamps).find((b) => b.id === 'pubs-10')!;
  assert.equal(ten.earnedAt, stamps[9].at);
  assert.equal(badges(stamps.slice(0, 9)).find((b) => b.id === 'pubs-10')!.earnedAt, null);
});

test('city and country badges', () => {
  const b = badges([stamp('a', 1), stamp('d', 2, { city: 'Dublin', country: 'Ireland' })]);
  assert.ok(b.some((x) => x.id === 'city-Dublin'));
  assert.ok(b.some((x) => x.id === 'country-Ireland'));
});

test('explorer points reward new pubs over repeats', () => {
  const pts = explorerPoints([stamp('a', 1), stamp('a', 2), stamp('g', 3, { pubIndex: 92 }), stamp('x', 4, { verified: false })], new Set());
  assert.equal(pts, 10 + 2 + 15);
  assert.equal(explorerPoints([stamp('a', 1)], new Set(['a'])), 2);
});

test('leaderboard shares ranks on ties', () => {
  const r = rankLeaderboard([
    { userId: '1', name: 'Aoife', points: 40 },
    { userId: '2', name: 'Ben', points: 55 },
    { userId: '3', name: 'Cal', points: 40 },
  ]);
  assert.deepEqual(r.map((x) => [x.name, x.rank]), [['Ben', 1], ['Aoife', 2], ['Cal', 2]]);
});
