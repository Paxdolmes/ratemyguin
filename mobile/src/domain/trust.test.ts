/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkNewRating, distanceMetres, reviewerWeight, verifyVisit } from './trust.ts';

const pub = { lat: 51.4805, lng: -0.1956 }; // Fulham Broadway-ish
const seasoned = { ratingsCount: 80, accountAgeDays: 400, verifiedShare: 1, removedCount: 0, isPubStaff: false };

test('distance is roughly right', () => {
  const d = distanceMetres(pub, { lat: 51.4814, lng: -0.1956 });
  assert.ok(d > 95 && d < 105, `${d}`);
});

test('a phone inside the pub verifies; down the road does not', () => {
  assert.equal(verifyVisit(pub, { ...pub, accuracyM: 15, at: '' }).verified, true);
  assert.equal(verifyVisit(pub, { lat: 51.4825, lng: -0.1956, accuracyM: 10, at: '' }).verified, false);
  assert.equal(verifyVisit(pub, { ...pub, accuracyM: 500, at: '' }).verified, false);
  assert.equal(verifyVisit(pub, null).verified, false);
});

test('credibility: seasoned and verified counts most, staff and fakers count nothing', () => {
  const top = reviewerWeight(seasoned, 'gps_receipt');
  const fresh = reviewerWeight({ ratingsCount: 0, accountAgeDays: 0, verifiedShare: 0, removedCount: 0, isPubStaff: false }, 'none');
  assert.ok(top > 1.5 && top <= 2, `${top}`);
  assert.ok(fresh < 0.25, `${fresh}`);
  assert.equal(reviewerWeight({ ...seasoned, isPubStaff: true }, 'gps'), 0);
  assert.equal(reviewerWeight({ ...seasoned, removedCount: 3 }, 'gps'), 0);
  assert.ok(reviewerWeight({ ...seasoned, removedCount: 1 }, 'gps') < reviewerWeight(seasoned, 'gps'));
});

test('one rating per pub per visit', () => {
  const prev = [{ pubId: 'p1', at: '2027-03-01T19:00:00Z', location: pub }];
  assert.equal(checkNewRating({ pubId: 'p1', at: '2027-03-01T20:30:00Z', location: pub }, prev).ok, false);
  assert.equal(checkNewRating({ pubId: 'p1', at: '2027-03-01T22:30:00Z', location: pub }, prev).ok, true);
});

test('impossible travel is caught', () => {
  const prev = [{ pubId: 'p1', at: '2027-03-01T19:00:00Z', location: pub }];
  const dublin = { lat: 53.3438, lng: -6.2546 };
  assert.equal(checkNewRating({ pubId: 'p2', at: '2027-03-01T19:30:00Z', location: dublin }, prev).ok, false);
  assert.equal(checkNewRating({ pubId: 'p2', at: '2027-03-02T19:30:00Z', location: dublin }, prev).ok, true);
});

test('a dozen pints a day is the cap', () => {
  const prev = Array.from({ length: 12 }, (_, i) => ({ pubId: `p${i}`, at: `2027-03-01T${String(8 + i).padStart(2, '0')}:00:00Z`, location: null }));
  assert.equal(checkNewRating({ pubId: 'px', at: '2027-03-01T21:00:00Z', location: null }, prev).ok, false);
});
