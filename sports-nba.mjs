const numeric=(entry,key)=>{
 const stat=entry.stats?.find(s=>s.name===key);
 const value=stat?.value??stat?.displayValue;
 return value==null||value===''?NaN:Number(value);
};
export const standingsValue=(entry,name)=>entry.stats?.find(s=>s.name===name)?.displayValue??'—';
export function orderedStandings(entries=[]) {
 const seed=entry=>{const n=numeric(entry,'playoffSeed');return n>0?n:Infinity;};
 return [...entries].sort((a,b)=>(seed(a)-seed(b))||
  ((numeric(b,'winPercent')||0)-(numeric(a,'winPercent')||0))||
  ((numeric(b,'wins')||0)-(numeric(a,'wins')||0))||
  ((numeric(a,'losses')||0)-(numeric(b,'losses')||0)));
}
export function lastGame(overview) {
 const log=overview?.gameLog,group=log?.statistics?.find(g=>g.events?.length);
 const records=(group?.events||[]).map(row=>({...row,event:log.events?.[row.eventId]})).filter(row=>row.event);
 records.sort((a,b)=>Date.parse(b.event.gameDate||b.event.date)-Date.parse(a.event.gameDate||a.event.date));
 const row=records[0];if(!row)return null;
 const get=name=>row.stats?.[group.names?.indexOf(name)];
 const opponent=row.event.opponent;
 return {opponent:opponent?.abbreviation||opponent?.displayName||'',opponentName:opponent?.displayName||'',opponentLogo:opponent?.logo||opponent?.logos?.[0]?.href||'',date:row.event.gameDate||row.event.date,pts:get('points'),reb:get('totalRebounds'),ast:get('assists')};
}
export function recentTeamGames(events,id) {
 return (events||[]).filter(e=>e.competitions?.[0]?.status?.type?.completed||e.competitions?.[0]?.status?.type?.state==='post'||e.status?.type?.completed)
  .sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,8).map(e=>{
   const sides=e.competitions[0].competitors,own=sides.find(side=>String(side.id)===String(id)),opponent=sides.find(side=>side!==own);
   if(!own||!opponent)return null;
   const score=side=>side.score?.displayValue??side.score?.value??side.score??'—';
   return {id:e.id,date:e.date,opponent:opponent.team?.displayName,logo:opponent.team?.logos?.[0]?.href,result:own.winner?'W':opponent.winner?'L':'—',score:score(own)+'–'+score(opponent)};
  }).filter(Boolean);
}
