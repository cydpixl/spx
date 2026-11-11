export function nbaAverages(entry,schema) {
 const values=new Map();
 for (const group of entry.categories||[]) {
  const names=schema.find(c=>c.name===group.name)?.names||[];
  names.forEach((key,index)=>{
   const value=group.values?.[index]??group.totals?.[index];
   if(value!==''&&value!=null&&Number.isFinite(Number(value)))values.set(key,Number(value));
  });
 }
 return Object.fromEntries(Object.entries({ppg:'avgPoints',rpg:'avgRebounds',apg:'avgAssists',spg:'avgSteals',bpg:'avgBlocks',gp:'gamesPlayed'}).map(([key,name])=>[key,values.get(name)??null]));
}

export function awardEstimates(players) {
 const eligible=players.filter(p=>p.stats?.gp>=5 && ['ppg','rpg','apg','spg','bpg'].every(stat=>Number.isFinite(p.stats[stat])));
 const compute=score=>{
  const rated=eligible.map(p=>[p.id,score(p)]);
  const top=Math.max(...rated.map(([,n])=>n));
  const weights=rated.map(([id,n])=>[id,Math.exp(n-top)]);
  const sum=weights.reduce((s,[,weight])=>s+weight,0);
  return new Map(weights.map(([id,weight])=>[id,Math.min(99,Math.round(100*weight/sum))]));
 };
 const mvp=compute(({stats:s})=>(s.ppg+1.45*s.apg+.66*s.rpg+1.1*s.spg+1.15*s.bpg)/5.5);
 // Small defending-winner prior based on the verified 2025–26 vote, shared by the full candidate pool.
 const dpoy=compute(({athleteId,stats:s})=>(2.5*s.bpg+1.65*s.spg+.19*s.rpg)/1.8+(athleteId==='5104157'?.65:0));
 return players.map(p=>({...p,awards:eligible.length>1?{mvp:mvp.get(p.id),dpoy:dpoy.get(p.id)}:null}));
}

export function nbaStatLine(player) {
 if(!player.stats)return '';
 const {ppg,rpg,spg}=player.stats;
 const format=(value,label)=>'<span><b>'+(value==null?'—':value.toFixed(1))+'</b> '+label+'</span>';
 return '<span class="nba-basic-stats">'+[format(ppg,'PPG'),format(rpg,'RPG'),format(spg,'SPG')].join('')+'</span>';
}

export function nbaAwardLine(player) {
 if(!Number.isInteger(player.awards?.mvp))return '';
 const display=value=>value===0?'&lt;1%':value+'%';
 return '<small class="nba-award-line" title="Spex estimates from regular-season stats across NBA scoring, blocks and steals leaders.">'+
 'MVP '+display(player.awards.mvp)+' · DPOY '+display(player.awards.dpoy)+'</small>';
}
