import {controlIcon} from './control-icons.mjs';
import {SyncRoom} from './watch-party-sync.mjs?v=20261029-ui75';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const supported=['native','cinesrc','moviesapi','aniembed'];
const same=(a,b)=>a?.source===b?.source&&a?.media===b?.media&&a?.audio===b?.audio;
export function installWatchParty(ctx){
 let session=null,state=null,native=false,ui=null,notice='',busy=false,lastStatus={},lastSeek=0,lastPlay=0;
 const player=ctx.streamPlayer;
 const badge=document.createElement('button');badge.className='party-badge';badge.hidden=true;badge.type='button';badge.setAttribute('aria-label','Open watch party');
 document.body.append(badge);
 const launch=document.createElement('button');launch.type='button';launch.className='party-launch';launch.hidden=true;launch.setAttribute('aria-label','Watch together');launch.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5"/></svg><span>Watch together</span>';document.body.append(launch);launch.onclick=()=>badge.click();
 const getState=()=>state&&{...state,position:native?ctx.video.currentTime:state.position+(state.playing?Math.max(0,Math.min(4,(Date.now()-state.at)/1000))*(state.rate||1):0),rate:native?ctx.video.playbackRate:state.rate||1};
 const status=message=>{notice=message;if(!sync.role&&message&&!ui?.isConnected)ctx.notify(message);paint();};
 function paint(){
  const s=lastStatus,members=[...(s.members||[])].sort((a,b)=>Number(b.role==='host')-Number(a.role==='host'));
  const label=notice||s.error||(s.role?(!s.connected?'Connecting to party…':s.role==='guest'&&!s.hostOnline?'Host disconnected · Playback paused':!s.ready?'Waiting for video playback data…':s.role==='host'?'Hosting · '+members.length+' viewer'+(members.length===1?'':'s'):Number.isFinite(s.drift)?'Following host · '+Math.abs(s.drift).toFixed(2)+'s apart':'Following host · Waiting for timeline'):'Start a party or paste an invite link.');
  badge.hidden=!s.role;if(badge.dataset.count!==String(members.length)){badge.dataset.count=members.length;badge.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 4h16v12H8l-4 4Z"/></svg><span>'+members.length+'</span>';}badge.title='Watch party · '+members.length+' viewers';
  const active=player.dialog||ctx.player.open&&ctx.player;if(active&&badge.parentElement!==active)active.append(badge);else if(!active&&badge.parentElement!==document.body)document.body.append(badge);
  launch.hidden=!active||!!s.role;if(active&&launch.parentElement!==active)active.append(launch);else if(!active&&launch.parentElement!==document.body)document.body.append(launch);
  if(active&&new URLSearchParams(location.search).get('together')==='1'){const url=new URL(location.href);url.searchParams.delete('together');history.replaceState(history.state,'',url);queueMicrotask(()=>launch.click());}
  if(!ui?.isConnected||!ui.querySelector('[data-party-status]'))return;
  ui.dataset.connection=s.connected?'connected':s.role?'reconnecting':'idle';ui.querySelector('[data-party-status]').textContent=label;
  ui.querySelector('[data-party-room]').textContent=s.room||'';
  const memberList=ui.querySelector('[data-party-members]'),memberKey=JSON.stringify(members.map(({id,name,role,ready})=>({id,name,role,ready})));if(memberList.dataset.members!==memberKey){memberList.dataset.members=memberKey;memberList.innerHTML=members.map(m=>'<li><span class="member-name"><span class="member-avatar" aria-hidden="true">'+esc((m.name||'V').slice(0,1).toUpperCase())+'</span><span>'+esc(m.name)+(m.role==='host'?' · Host':'')+'</span></span><small class="'+(m.ready?'member-ready':'')+'">'+(m.ready?'Ready':'Loading video')+'</small></li>').join('');}
  ui.classList.toggle('is-joined',!!s.role);const chat=ui.querySelector('[data-party-chat]');chat.hidden=!s.role;
  const log=ui.querySelector('[data-party-chat-log]'),messages=s.chat||[],chatKey=messages.map(m=>m.id).join(',');
  if(log.dataset.messages!==chatKey){const atBottom=log.scrollHeight-log.scrollTop-log.clientHeight<48;log.dataset.messages=chatKey;log.innerHTML=messages.map(m=>'<li><strong>'+esc(m.name)+'</strong><time>'+new Date(m.at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})+'</time><p>'+esc(m.text)+'</p></li>').join('')||'<li class="party-chat-empty">Say hello to your room.</li>';if(atBottom)log.scrollTop=log.scrollHeight;}
  ui.querySelector('[data-party-chat-status]').textContent=s.chatError||(!s.connected&&s.role?'Reconnecting…':'');
  ui.querySelector('[data-party-chat-send]').disabled=!s.connected||Date.now()-(sync.lastChatSent||0)<1000;
  for(const key of ['copy','leave'])ui.querySelector('[data-party-'+key+']').hidden=!s.role;for(const key of ['resync','enable'])ui.querySelector('[data-party-'+key+']').hidden=s.role!=='guest';const share=ui.querySelector('[data-party-share]');share.hidden=!s.role;if(s.role)ui.querySelector('[data-party-invite]').value=invite();
  for(const key of ['name','code'])ui.querySelector('[data-party-'+key+']').closest('label').hidden=!!s.role;
  for(const key of ['start','join'])ui.querySelector('[data-party-'+key+']').hidden=!!s.role;
  ui.querySelector('[data-party-start]').disabled=busy||!session||!supported.includes(session.source)||!!s.role;ui.querySelector('[data-party-compatibility]').hidden=!!s.role;ui.querySelector('[data-party-compatibility]').textContent=!session?'Open a video to start a party.':supported.includes(session.source)?'The host controls the video. Guests can chat and adjust their own volume.':'This source does not expose synchronized playback. Choose Original, CineSrc, MoviesAPI, or AniEmbed to host.';
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
  container.innerHTML='<div class="party-intro"><small>WATCH TOGETHER</small><p>The host controls playback. Everyone watches on their own device.</p></div><label>Your name<input data-party-name maxlength="40" autocomplete="nickname" value="'+esc(ctx.read('outlaw.party-name','Viewer'))+'"></label><button class="stream-menu-row party-primary" data-party-start>Start a watch party</button><label>Invite link or room code<input data-party-code autocomplete="off" spellcheck="false" placeholder="Paste an invite link or code"></label><button class="stream-menu-row" data-party-join>Join party</button><p data-party-status role="status" aria-live="polite"></p><div class="party-share" data-party-share hidden><span>Invite your friends</span><div><input data-party-invite readonly aria-label="Watch party invite link"><button class="spex-icon-control" data-party-copy hidden aria-label="Copy invite link">'+controlIcon('copy')+'</button></div><code data-party-room class="party-room-code"></code></div><ul data-party-members class="party-members"></ul><div class="party-controls"><button class="stream-menu-row" data-party-enable hidden>Enable playback on this device</button><button class="stream-menu-row" data-party-resync hidden>Resync with host</button><button class="stream-menu-row" data-party-leave hidden>Leave party</button></div><section class="party-chat" data-party-chat hidden aria-label="Room chat"><h3>Room chat</h3><ol data-party-chat-log role="log" aria-live="polite" aria-relevant="additions" tabindex="0"></ol><form data-party-chat-form><input data-party-chat-input aria-label="Message the room" placeholder="Message the room…" maxlength="500" autocomplete="off" required><button data-party-chat-send aria-label="Send message">'+controlIcon('send')+'</button></form><p data-party-chat-status role="status"></p></section><p data-party-compatibility class="stream-menu-description"></p><p class="stream-menu-description">Up to 12 viewers · Room and chat expire after 12 hours.</p>';
  if(heading)container.prepend(heading);container.addEventListener('keydown',e=>{if(e.target.closest('input,textarea'))e.stopPropagation()});container.querySelector('[data-party-invite]').onclick=e=>e.target.select();container.querySelector('[data-party-code]').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();container.querySelector('[data-party-join]').click()}};
  container.querySelector('[data-party-name]').oninput=e=>ctx.write('outlaw.party-name',e.target.value.trim().slice(0,40)||'Viewer');
  container.querySelector('[data-party-start]').onclick=()=>start('host');
  container.querySelector('[data-party-join]').onclick=()=>{let code=container.querySelector('[data-party-code]').value.trim();try{code=new URL(code).searchParams.get('party')||code;}catch{}start('guest',code.toLowerCase());};
  container.querySelector('[data-party-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(invite());status('Invite link copied.');const button=container.querySelector('[data-party-copy]');button.innerHTML=controlIcon('check');setTimeout(()=>{if(button.isConnected)button.innerHTML=controlIcon('copy')},1500);}catch{const field=container.querySelector('[data-party-invite]');field.focus();field.select();status('Select and copy the invite link above.');}};
  container.querySelector('[data-party-leave]').onclick=()=>{sync.leave();sync.expected=null;notice='You left the party.';paint();};
  container.querySelector('[data-party-resync]').onclick=()=>{notice='';lastSeek=0;sync.resync();};
  container.querySelector('[data-party-enable]').onclick=()=>{notice='';lastPlay=0;if(native)ctx.video.play().catch(()=>status('Press Play in the video to enable playback.'));else player.command('play');sync.resync();};
  const form=container.querySelector('[data-party-chat-form]');form.onkeydown=e=>e.stopPropagation();form.onsubmit=e=>{e.preventDefault();e.stopPropagation();const input=form.querySelector('input'),text=input.value.trim();if(!text)return;if(sync.sendChat(text)){notice='';input.value='';form.querySelector('button').disabled=true;setTimeout(()=>{if(form.isConnected)form.querySelector('button').disabled=!sync.connected},1000);}else container.querySelector('[data-party-chat-status]').textContent=sync.connected?'Please wait a moment before sending again.':'Please wait for the room to reconnect.';};
  paint();
 }
 badge.onclick=()=>{const active=player.dialog||ctx.player.open&&ctx.player||document.body;let panel=active.querySelector('.party-floating');if(panel){panel.remove();return;}panel=document.createElement('section');panel.className='party-floating native-menu';panel.innerHTML='<header><strong>Watch party</strong><button class="spex-icon-control" aria-label="Close watch party">'+controlIcon('close')+'</button></header>';active.append(panel);const close=()=>{panel.remove();(sync.role?badge:launch).focus()};panel.querySelector('button').onclick=close;panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}});open(panel);panel.querySelector('input:not([hidden])')?.focus();};
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
