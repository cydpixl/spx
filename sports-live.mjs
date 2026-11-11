import {sportsDay,profileAllows} from './sports-preferences.mjs?v=20261111-ui94';
import {matchOfficialGame} from './sports-event-state.mjs?v=20261111-ui94';
import {SPORTS_DATA,scheduleLeagues} from './sports-data.mjs?v=20261111-ui96';
import {sportsProfile} from './sports-setup.mjs?v=20261111-ui94';
import {esc,sportsTeamLogo} from './sports-model.mjs?v=20261111-ui98';
export function normalizeScores(data,league){return (data.events||[]).map(e=>({id:e.id,title:e.name,leaguePath:league[0],date:e.date,league:league[2],category:league[1],state:e.status?.type?.state,detail:e.status?.type?.shortDetail||e.status?.type?.detail||'',teams:(e.competitions?.[0]?.competitors||[]).map(c=>({id:c.team?.id,name:c.team?.displayName||'',abbreviation:c.team?.abbreviation||'',badge:c.team?.logo||c.team?.logos?.[0]?.href||'',score:String(c.score??'—')})),url:e.links?.find(l=>l.href?.startsWith('https://www.espn.com/'))?.href||''}))}
export function mountLiveScores(host,{getEvents=()=>[],onPersonalize=()=>{},onScores=()=>{},onGame=()=>{},onWatch=()=>{}}={}){
 let stopped=false,busy=false,timer,toastTimer,rows=[],filters={},following=true,initialized=false,last=new Map(),fetched=0,errors=0,activeDay='';const controller=new AbortController();
 host.innerHTML='<header class="sp-score-heading"><div><span class="sports-kicker">SPEX SPORTS</span><h2>Game schedule</h2></div><div><button type="button" data-score-scope aria-pressed="true">Favorites first</button><button type="button" data-personalize>Personalize</button></div></header><p class="sp-score-state" role="status">Loading today’s scores…</p><div class="sp-score-list"></div><div class="sp-score-toast" role="status" hidden></div>';
 const status=host.querySelector('.sp-score-state'),list=host.querySelector('.sp-score-list');
 function draw(){if(stopped)return;const p=sportsProfile(),names=new Set([...(p?.teams||[]).map(t=>t.name),...(p?.players||[]).map(t=>t.teamName)]);
 let visible=rows.filter(e=>(!filters.category||e.category===filters.category)&&profileAllows(p,e)&&(!filters.league||e.league===filters.league)&&(!filters.team||e.teams.some(t=>t.name===filters.team))&&(!filters.query||(e.title+' '+e.league).toLowerCase().includes(filters.query.toLowerCase())));
 visible.sort((a,b)=>Number(b.state==='in')-Number(a.state==='in')||(following?Number(b.teams.some(t=>names.has(t.name)))-Number(a.teams.some(t=>names.has(t.name))):0)||new Date(a.date)-new Date(b.date));
 host.querySelector('[data-score-scope]').textContent=following?'Favorites first':'Game time';
 status.textContent=(visible.length?visible.length+' games today':'No games match today’s filters.')+(fetched?' · Updated '+new Date(fetched).toLocaleTimeString([],{hour:'numeric',minute:'2-digit',second:'2-digit'}):'')+(errors?' · '+errors+' leagues unavailable':'')+(p?.updates===false?' · Live updates paused':' · Refreshes every 30s');
 list.innerHTML=visible.map(game=>{
  const scheduled=game.state==='pre';
  const playable=game.state==='in'&&getEvents().some(stream=>stream.sources.length&&matchOfficialGame(stream,rows)?.id===game.id);
  const href=new URL('sports',document.baseURI).pathname+'?'+new URLSearchParams({game:game.id,league:game.leaguePath});
  const time=scheduled?new Date(game.date).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):game.detail;
  const matchup=game.teams.map(team=>team.name+(scheduled?'':' '+team.score)).join(' vs ');
  const label=[playable?'Watch live':'',matchup,game.league,time].filter(Boolean).join(' · ');
  const teams=game.teams.map(team=>`<div class="sp-score-team">${sportsTeamLogo({logo:team.badge,name:team.name,abbreviation:team.abbreviation})}${scheduled?'':`<b>${esc(team.score)}</b>`}</div>`).join('');
  return `<a class="sp-score-match ${game.state==='in'?'is-live':''}" data-score-game="${esc(game.id)}" aria-label="${esc(label)}" title="${esc(matchup)}" href="${esc(href)}"><header><span>${esc(game.league)}</span><span>${esc(time)}</span></header><div class="sp-score-teams">${teams}</div>${playable?'<footer>Watch live</footer>':''}</a>`;
 }).join('');
 list.querySelectorAll('[data-score-game]').forEach(a=>a.onclick=e=>{if(e.button||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();const game=rows.find(r=>r.id===a.dataset.scoreGame),stream=game?.state==='in'&&getEvents().find(x=>x.sources.length&&matchOfficialGame(x,rows)?.id===game.id);if(stream)onWatch(stream);else onGame(game)});
 }
 async function poll(){if(stopped||busy||document.hidden)return;busy=true;const profile=sportsProfile();const day=sportsDay();if(day!==activeDay){activeDay=day;rows=[];draw()}
 const leagues=scheduleLeagues.filter(([leaguePath,category])=>profileAllows(profile,{leaguePath,category}));if(!leagues.length){busy=false;onScores([]);draw();return;}let cursor=0,items=[],failed=0,successful=new Set();await Promise.all(Array.from({length:4},async()=>{while(cursor<leagues.length&&!stopped){const league=leagues[cursor++];try{const r=await fetch(SPORTS_DATA+'/live?league='+encodeURIComponent(league[0])+'&date='+day,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])});if(!r.ok)throw Error();items.push(...normalizeScores(await r.json(),league));successful.add(league[2])}catch{failed++}}}));if(stopped)return;
 errors=failed;if(failed===leagues.length){status.textContent='Live scores are temporarily unavailable. Retrying automatically.';busy=false;return}
 // Preserve prior rows only for leagues whose current request failed.
 rows=[...items,...rows.filter(e=>!successful.has(e.league)&&!leagues.some(l=>l[2]===e.league&&failed===0))];fetched=Date.now();
 const followed=new Set([...(profile?.teams||[]).map(t=>t.name),...(profile?.players||[]).map(p=>p.teamName)]);
 if(initialized&&profile?.updates){for(const e of items){const score=e.teams.map(t=>t.score).join('–'),old=last.get(e.id);if(old&&old!==score&&e.teams.some(t=>followed.has(t.name))){const text=e.teams.map(t=>t.name+' '+t.score).join(' · ');const toast=host.querySelector('.sp-score-toast');toast.hidden=false;toast.textContent=text;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true},8000);if(profile.notifications&&'Notification'in window&&Notification.permission==='granted'){try{new Notification('Spex · Score update',{body:text,tag:'spex-score-'+e.id,silent:true})}catch{}}break}}}
 last=new Map(items.map(e=>[e.id,e.teams.map(t=>t.score).join('–')]));initialized=true;busy=false;onScores(rows);draw();
 }
 const profileChange=()=>{draw();void poll()};window.addEventListener('spex-sports-profile',profileChange);const wake=()=>{if(!document.hidden&&sportsProfile()?.updates!==false)void poll()};host.querySelector('[data-score-scope]').onclick=e=>{following=!following;e.currentTarget.setAttribute('aria-pressed',String(following));draw()};host.querySelector('[data-personalize]').onclick=onPersonalize;
 void poll();timer=setInterval(()=>{if(sportsProfile()?.updates!==false)void poll()},30000);document.addEventListener('visibilitychange',wake);
 return {update(next){filters=next;draw()},refresh(){draw();void poll()},destroy(){stopped=true;controller.abort();clearInterval(timer);clearTimeout(toastTimer);document.removeEventListener('visibilitychange',wake);window.removeEventListener('spex-sports-profile',profileChange)}};
}
