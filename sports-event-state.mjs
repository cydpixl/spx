const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
export function matchOfficialGame(event,scores=[]){
 if(event.channel)return null;
 const title=norm(event.title);
 const matches=scores.filter(game=>game.category===event.category&&game.teams?.length===2&&(!event.date||Math.abs(new Date(game.date).getTime()-event.date)<18*3600000)&&game.teams.every(t=>{const name=String(t.name||''),full=norm(name),short=norm(name.split(' ').at(-1));return !!full&&(title.includes(full)||short.length>=4&&title.includes(short)||event.teams?.some(team=>{const label=norm(team.name);return label.length>=4&&(full.includes(label)||label.includes(full))}))}));
 matches.sort((a,b)=>Number(b.league===event.league)-Number(a.league===event.league)||(event.date?Math.abs(Date.parse(a.date)-event.date)-Math.abs(Date.parse(b.date)-event.date):0));
 if(!event.date&&matches.length>1){const sameLeague=matches.filter(game=>game.league===event.league);return sameLeague.length===1?sameLeague[0]:null;}
 return matches[0]||null;
}
export function reconcileEventStatus(event,scores=[],now=Date.now()){
 if(event.channel)return event;
 const match=matchOfficialGame(event,scores);
 if(match)return {...event,live:match.state==='in',liveVerified:match.state==='in',status:match.state,scoreDetail:match.detail,leaguePath:match.leaguePath||event.leaguePath,league:event.league||match.league,scores:match.teams};
 if(event.date&&now-event.date>12*3600000)return {...event,live:false,liveVerified:false,status:'post'};
 return {...event,liveVerified:!!event.schedule&&event.status==='in'};
}
