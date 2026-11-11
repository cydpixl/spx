import assert from 'node:assert/strict';
import test from 'node:test';
import {orderedStandings,lastGame,recentTeamGames} from '../sports-nba.mjs';
import {flattenStandings} from '../sports-model.mjs';
import {christmasDays,isChristmasSeason} from '../christmas.mjs';
test('orders an inverted conference by its official seed',()=>{
 const team=(seed,percentage)=>({stats:[{name:'playoffSeed',value:seed},{name:'winPercent',value:percentage}]});
 const first=team(1,.8),second=team(2,.7),last=team(15,.09);
 assert.deepEqual(orderedStandings([last,second,first]),[first,second,last]);
});
test('reads last player stats by named columns',()=>{
 const overview={gameLog:{statistics:[{names:['assists','points','totalRebounds'],events:[{eventId:'1',stats:[3,40,11]}]}],events:{1:{gameDate:'2026-11-09',opponent:{abbreviation:'LAL'}}}}};
 assert.deepEqual(lastGame(overview),{opponent:'LAL',date:'2026-11-09',pts:40,reb:11,ast:3});
});
test('team recent games exclude upcoming fixtures',()=>{
 const make=(id,date,completed)=>({id,date,competitions:[{status:{type:{completed}},competitors:[{id:'24',winner:true,score:{displayValue:'112'}},{id:'20',team:{displayName:'Opponent'},score:{displayValue:'100'}}]}]});
 const games=recentTeamGames([make('final','2026-11-09',true),make('upcoming','2026-11-11',false)],'24');
 assert.equal(games.length,1);assert.equal(games[0].score,'112–100');
});
test('Christmas countdown uses calendar dates and decorations expire January 7',()=>{
 assert.equal(christmasDays(new Date(2026,10,11,23)),44);
 assert.equal(christmasDays(new Date(2026,11,25)),0);
 assert.equal(isChristmasSeason(new Date(2027,0,6)),true);
 assert.equal(isChristmasSeason(new Date(2027,0,7)),false);
});

test('conference names survive the provider’s overall standings label',()=>{assert.equal(flattenStandings({children:[{name:'Eastern Conference',standings:{name:'overall',entries:[]}}]})[0].name,'Eastern Conference');});
