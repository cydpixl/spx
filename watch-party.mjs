import {SyncRoom} from './watch-party-sync.mjs?v=20261027-party1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const supported=['native','cinesrc','moviesapi','aniembed'];
const same=(a,b)=>a?.source===b?.source&&a?.media===b?.media&&a?.audio===b?.audio;
export function installWatchParty(ctx){
 let session=null,state=null,native=false,ui=null,notice='',busy=false,lastStatus={},lastSeek=0,lastPlay=0;
 const player=ctx.streamPlayer;
 const badge=document.createElement('button');badge.className='party-badge';badge.hidden=true;badge.type='button';badge.setAttribute('aria-label','Open watch party');
 document.body.append(badge);
 const getState=()=>state&&{...state,position:native?ctx.video.currentTime:state.position+(state.playing?Math.max(0,Math.min(4,(Date.now()-state.at)/1000))*(state.rate||1):0),rate:native?ctx.video.playbackRate:state.rate||1};
 const status=message=>{notice=message;if(!sync.role&&message&&!ui?.isConnected)ctx.notify(message);paint();};
 function paint(){
  const s=lastStatus,members=s.members||[];
  const label=notice||s.error||(s.role?(!s.connected?'Connecting to party…':s.role==='guest'&&!s.hostOnline?'Host disconnected · Playback paused':!s.ready?'Waiting for video playback data…':s.role==='host'?'Hosting · '+members.length+' viewer'+(members.length===1?'':'s'):Number.isFinite(s.drift)?'Following host · '+Math.abs(s.drift).toFixed(2)+'s apart':'Following host · Waiting for timeline'):'Start a party or paste an invite link.');
  badge.hidden=!s.role;badge.textContent=s.role==='host'?'Watch party · '+members.length+' viewers':'Watch party · '+(!s.hostOnline?'Waiting for host':!s.ready?'Loading':'Following host');
  const active=player.dialog||ctx.player.open&&ctx.player;if(active&&badge.parentElement!==active)active.append(badge);else if(!active&&badge.parentElement!==document.body)document.body.append(badge);
  if(!ui?.isConnected||!ui.querySelector('[data-party-status]'))return;
  ui.querySelector('[data-party-status]').textContent=label;
  ui.querySelector('[data-party-room]').textContent=s.room||'';
  ui.querySelector('[data-party-members]').innerHTML=members.map(m=>'<li><span>'+esc(m.name)+(m.role==='host'?' · Host':'')+'</span><small>'+(m.ready?'Ready':'Loading video')+'</small></li>').join('');
  for(const key of ['copy','leave','resync','enable'])ui.querySelector('[data-party-'+key+']').hidden=!s.role;
  for(const key of ['name','code'])ui.querySelector('[data-party-'+key+']').closest('label').hidden=!!s.role;
  for(const key of ['start','join'])ui.querySelector('[data-party-'+key+']').hidden=!!s.role;
  ui.querySelector('[data-party-start]').disabled=busy||!session||!supported.includes(session.source)||!!s.role;
  ui.querySelector('[data-party-join]').disabled=busy||!!s.role;
 }
 const sync=new SyncRoom({endpoint:'https://spex-watch-party.cydpixl7.workers.dev',update:value=>{lastStatus={...lastStatus,...value};paint();},getName:()=>ctx.read('outlaw.party-name','Viewer'),getState,getSession:()=>session,
  onDisconnect:()=>{if(native&&ctx.player.open)ctx.video.pause();else if(player.dialog)player.command('pause');},
  onSession:s=>{
   if(!s||!supported.includes(s.source)||!/^\/watch\/(?:buddy|clown-panic|the-traitors|tmdb-(?:movie|tv)-\d+)(?:\/\d{1,3}\/\d{1,3})?$/.test(s.media))return;
   sync.expected=s;
   if(!same(session,s)||!ctx.player.open&&!player.dialog){
    state=null;session=s;
    try{if(s.source!=='native')localStorage.setItem('bogart.streaming.source',s.source);}catch{}
    if(ctx.logicalPath()===s.media){if(player.dialog){forceProvider();player.load();}else ctx.renderRoute();}
    else ctx.navigate(s.media);
   }else{sync.restoring=false;if(state)sync.markReady(true);}
  },
  applyState:s=>{
   if(!state||!s)return;const local=getState(),now=Date.now();
   const target=Math.min(Math.max(0,s.position),Math.max(0,state.duration-.1)),drift=local.position-target;
   if(native){
    if(ctx.video.readyState<2||ctx.video.seeking)return;
    if((Math.abs(drift)>.75||s.force)&&now-lastSeek>1200){lastSeek=now;ctx.video.currentTime=target;}
    if(Math.abs(ctx.video.playbackRate-s.rate)>.01)ctx.video.playbackRate=s.rate;
    if(s.playing&&ctx.video.paused&&now-lastPlay>2500){lastPlay=now;ctx.video.play().then(()=>{notice='';paint();}).catch(()=>status('Tap Enable playback on this device to follow the host.'));}
    else if(!s.playing&&!ctx.video.paused)ctx.video.pause();
   }else if(player.dialog){
    if((Math.abs(drift)>1.25||s.force)&&now-lastSeek>2000){lastSeek=now;player.command('seek',target);}
    if(s.playing!==local.playing&&now-lastPlay>2000){lastPlay=now;player.command(s.playing?'play':'pause');}
    if(Math.abs((state.rate||1)-s.rate)>.01){player.command('speed',s.rate);state.rate=s.rate;}
   }
  }
 });
 function mediaPath(){if(!native&&player.item){const i=player.item;return '/watch/'+(i.catalogId||'tmdb-'+i.type+'-'+i.id)+(i.type==='tv'?'/'+i.season+'/'+i.episode:'');}return ctx.logicalPath();}
 function forceProvider(){
  if(sync.role!=='guest'&&!sync.restoring||!sync.expected||!player.dialog)return;
  const source=player.available.find(p=>p.id===sync.expected.source);if(source){player.provider=source;player.nativeControls=!source.hideControls;player.animeAudio=sync.expected.audio||'sub';player.dialog.querySelector('[data-source]').value=source.id;}
 }
 function setSession(source,media,isNative){
  native=isNative;const next={source,media,...(source==='aniembed'?{audio:player.animeAudio||'sub'}:{})};const changed=!same(session,next);session=next;state=null;lastSeek=0;lastPlay=0;
  if(sync.restoring&&same(next,sync.expected))sync.restoring=false;
  if(sync.role==='host'&&changed)sync.sessionChanged();else sync.markReady(false);paint();
 }
 function observe(position,duration,playing,rate=1,event=''){
  if(!session||!Number.isFinite(duration)||duration<=0||native&&!ctx.player.open||!native&&!player.dialog)return;
  const before=state;state={position,duration,playing,rate,at:Date.now()};
  if(!sync.ready)sync.markReady(true);
  if(sync.role==='host')sync.broadcast(['pause','play','seeked','ratechange','ended'].includes(event)||before&&playing!==before.playing);
 }
 async function start(role,room){busy=true;notice='';paint();try{await sync.start(role,room);if(state)sync.markReady(true);}catch(e){status(e.message);}finally{busy=false;paint();}}
 function invite(){const url=new URL((session?.media||'/').replace(/^\//,''),document.baseURI);url.searchParams.set('party',sync.room);return url.href;}
 function open(container){
  ui=container;container.classList.add('party-panel');const heading=container.querySelector(':scope>header');
  container.innerHTML='<div class="party-intro"><small>WATCH TOGETHER</small><p>The host controls playback. Everyone watches on their own device.</p></div><label>Your name<input data-party-name maxlength="40" autocomplete="nickname" value="'+esc(ctx.read('outlaw.party-name','Viewer'))+'"></label><button class="stream-menu-row party-primary" data-party-start>Start a watch party</button><label>Invite link or room code<input data-party-code autocomplete="off" spellcheck="false" placeholder="Paste an invite link or code"></label><button class="stream-menu-row" data-party-join>Join party</button><p data-party-status role="status" aria-live="polite"></p><code data-party-room class="party-room-code"></code><ul data-party-members class="party-members"></ul><button class="stream-menu-row" data-party-copy hidden>Copy invite link</button><button class="stream-menu-row" data-party-enable hidden>Enable playback on this device</button><button class="stream-menu-row" data-party-resync hidden>Resync with host</button><button class="stream-menu-row" data-party-leave hidden>Leave party</button><p class="stream-menu-description">Sync supports Original videos, CineSrc, MoviesAPI and AniEmbed. Other sources do not expose the controls needed for sync. Rooms hold up to 12 viewers and expire after 12 hours.</p>';
  if(heading)container.prepend(heading);
  container.querySelector('[data-party-name]').oninput=e=>ctx.write('outlaw.party-name',e.target.value.trim().slice(0,40)||'Viewer');
  container.querySelector('[data-party-start]').onclick=()=>start('host');
  container.querySelector('[data-party-join]').onclick=()=>{let code=container.querySelector('[data-party-code]').value.trim();try{code=new URL(code).searchParams.get('party')||code;}catch{}start('guest',code.toLowerCase());};
  container.querySelector('[data-party-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(invite());status('Invite link copied.');}catch{status('Copy this room code: '+sync.room);}};
  container.querySelector('[data-party-leave]').onclick=()=>{sync.leave();sync.expected=null;notice='You left the party.';paint();};
  container.querySelector('[data-party-resync]').onclick=()=>{notice='';lastSeek=0;sync.resync();};
  container.querySelector('[data-party-enable]').onclick=()=>{notice='';lastPlay=0;if(native)ctx.video.play().catch(()=>status('Press Play in the video to enable playback.'));else player.command('play');sync.resync();};
  paint();
 }
 badge.onclick=()=>{const active=player.dialog||ctx.player.open&&ctx.player||document.body;let panel=active.querySelector('.party-floating');if(panel){panel.remove();return;}panel=document.createElement('section');panel.className='party-floating native-menu';panel.innerHTML='<header><strong>Watch party</strong><button aria-label="Close watch party">×</button></header>';active.append(panel);panel.querySelector('button').onclick=()=>panel.remove();open(panel);};
 const oldLoad=player.load.bind(player),oldState=player.onState,oldCommand=player.command.bind(player);
 player.command=function(command,value){if(command==='speed'&&state)state.rate=Number(value)||1;return oldCommand(command,value);};
 player.load=function(){forceProvider();oldLoad();if(this.item&&this.dialog){native=false;setSession(this.provider.id,mediaPath(),false);}};
 player.onState=s=>{oldState?.(s);if(!native&&supported.includes(player.provider.id)&&(s.positionObserved||['play','pause','seeked','ratechange','ended'].includes(s.type)))observe(s.positionObserved?s.position:getState()?.position||s.position,s.duration,s.playing,s.rate||state?.rate||1,s.type);};
 for(const type of ['timeupdate','loadedmetadata','play','pause','seeked','ratechange','ended'])ctx.video.addEventListener(type,()=>{if(native)observe(ctx.video.currentTime,ctx.video.duration,!ctx.video.paused,ctx.video.playbackRate,type);});
 const pulse=setInterval(()=>{if(native&&ctx.player.open)observe(ctx.video.currentTime,ctx.video.duration,!ctx.video.paused,ctx.video.playbackRate);if(sync.role==='guest'&&sync.ready&&native&&ctx.player.open&&sync.target)sync.applyState(sync.targetState());if(sync.role&&(!native&&!player.dialog||native&&!ctx.player.open))sync.markReady(false);paint();},1000);
 window.addEventListener('pagehide',()=>{clearInterval(pulse);sync.destroy();});
 const code=new URLSearchParams(location.search).get('party');if(code&&/^[a-f0-9]{24}$/.test(code)){const url=new URL(location.href);url.searchParams.delete('party');history.replaceState(history.state,'',url);setTimeout(()=>start('guest',code),1000);}else setTimeout(()=>sync.resume(),1000);
 return {open,nativeStart(){setSession('native',ctx.logicalPath(),true);},sync};
}
