const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
export function reconcileEventStatus(event,scores=[],now=Date.now()){
 if(event.channel)return event;
 const title=norm(event.title),match=scores.find(game=>game.category===event.category&&game.teams?.length===2&&(!event.date||Math.abs(new Date(game.date).getTime()-event.date)<18*3600000)&&game.teams.every(t=>{const full=norm(t.name),short=norm(t.name.split(' ').slice(-1)[0]);return title.includes(full)||short.length>=5&&title.includes(short)}));
 if(match)return {...event,live:match.state==='in',liveVerified:match.state==='in',status:match.state,scoreDetail:match.detail,scores:match.teams};
 if(event.date&&now-event.date>12*3600000)return {...event,live:false,liveVerified:false,status:'post'};
 return {...event,liveVerified:!!event.schedule&&event.status==='in'};
}
