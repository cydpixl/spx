import test from 'node:test';
import assert from 'node:assert/strict';
import {providers} from '../provider-player.mjs';
import {movieRisk,riskMarkup} from '../source-insights.mjs';
import {rankSources} from '../source-ranking.mjs';

test('all five Wing servers keep the top quality badge in both ad modes', () => {
 const wing = providers.filter(source => source.wing);
 assert.deepEqual(wing.map(source=>source.id), ['wing-secret','wing-nebula','wing-lisbon','wing-solara','wing-athens']);
 for (const restricted of [true,false]) {
  const ranked=rankSources(providers,{restricted});
  assert.equal(ranked[0].name,'Spex Main');
  assert.equal(ranked[1].name,'Spex Alternative');
  assert.ok(ranked.slice(2,6).every(source=>source.wing));
  for (const source of wing) {
   const badge = riskMarkup(movieRisk(source,restricted));
   assert.match(badge, /source-signal--premium/);
   assert.equal([...badge.matchAll(/class="is-on"/g)].length, 5);
  }
 }
});
