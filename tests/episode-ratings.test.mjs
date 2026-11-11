import test from 'node:test';
import assert from 'node:assert/strict';
import {episodeRating} from '../episode-ratings.mjs';

test('episode ratings require votes and a valid score on the ten-point scale', () => {
 for (const rating of [0, -1, NaN, Infinity, 10.1, undefined]) {
  assert.equal(episodeRating({rating,votes:12}), null);
 }
 assert.equal(episodeRating({rating:8,votes:0}), null);
 assert.equal(episodeRating({rating:'8.6',votes:53}), 8.6);
 assert.equal(episodeRating({rating:10,votes:1}), 10);
});
