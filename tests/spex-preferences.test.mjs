import test from 'node:test';
import assert from 'node:assert/strict';
import {sportsDay,profileAllows} from '../sports-preferences.mjs';
import {nbaAverages,awardEstimates} from '../sports-awards.mjs';
import {providers,sourceAllowed} from '../provider-player.mjs';
import {movieRisk} from '../source-insights.mjs';
import {imageType} from '../profile-worker/index.mjs';

test('sports day changes at 1 a.m. in the visitor’s local timezone',()=>{
 assert.equal(sportsDay(new Date(2026,10,11,0,59)), '20261110');
 assert.equal(sportsDay(new Date(2026,10,11,1,0)), '20261111');
 assert.equal(sportsDay(new Date(2027,0,1,0,30)), '20261231');
});
test('NBA-only personalization excludes other basketball leagues and unknown sports',()=>{
 const profile={sports:['basketball'],leagues:['basketball/nba'],completed:true};
 assert.equal(profileAllows(profile,{category:'basketball',leaguePath:'basketball/nba'}),true);
 for(const event of [{category:'cricket'},{category:'basketball',league:'WNBA'},{category:'basketball',title:'College game'}])assert.equal(profileAllows(profile,event),false);
});
test('NBA awards use data, and unknown season averages stay unknown',()=>{
 assert.deepEqual(nbaAverages({categories:[{name:'general',totals:['12','8.2']}]},[{name:'general',names:['gamesPlayed','avgRebounds']}]),{gp:12,rpg:8.2,ppg:null,apg:null,spg:null,bpg:null});
 const players=awardEstimates([{id:'defense',stats:{gp:12,ppg:20,rpg:12,apg:2,spg:2,bpg:5}},{id:'scoring',stats:{gp:12,ppg:32,rpg:6,apg:6,spg:1,bpg:.3}}]);
 assert.ok(players[0].awards.dpoy>players[1].awards.dpoy);
 assert.ok(players[1].awards.mvp>players[0].awards.mvp);
});
test('the standard mode exposes exactly the six named purple sources',()=>{
 const standard=providers.filter(source=>sourceAllowed(source,false));
 assert.equal(standard.length,6);
 assert.ok(standard.every(source=>movieRisk(source,true).level==='premium'));
 assert.ok(providers.filter(source=>sourceAllowed(source,true)).length>6);
});
test('profile media checks raster signatures',()=>{
 assert.equal(imageType(Buffer.from('GIF89a')),'image/gif');
 assert.equal(imageType(Buffer.from('RIFF0000WEBP')),'image/webp');
 assert.equal(imageType(Buffer.from('<svg onload=')),'');
});
