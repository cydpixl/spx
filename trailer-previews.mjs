const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// A single portal owns each preview, its timers and its native IMDb player.
export function installTrailerPreviews(ctx){
 let active=null,preview=null,openTimer,playTimer,sourceTimer,closeTimer,timeout,version=0,suppressFocusUntil=0;
 const pointer=()=>matchMedia('(min-width:701px) and (hover:hover) and (pointer:fine)').matches;
 const autoplay=()=>ctx.settings.trailers!==false&&ctx.settings.motion!==false&&document.documentElement.dataset.motion!=='off'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 const protectedTarget=node=>preview?.contains(node)||node?.closest?.('.title-list-popover');
 function close(restoreFocus=false){
  clearTimeout(openTimer);clearTimeout(playTimer);clearTimeout(sourceTimer);clearTimeout(closeTimer);clearTimeout(timeout);version++;
  const old=preview,card=active;active=null;preview=null;if(card){card.removeAttribute('aria-keyshortcuts');card.removeAttribute('aria-description')}
  if(old){const video=old.querySelector('video');if(video){video.pause();video.removeAttribute('src');video.load();video.remove()}old.classList.remove('is-open');old.classList.add('is-closing');setTimeout(()=>old.remove(),220)}
  if(restoreFocus===true&&card?.isConnected){suppressFocusUntil=performance.now()+250;card.focus({preventScroll:true})}
 }
 const scheduleClose=()=>{clearTimeout(closeTimer);closeTimer=setTimeout(()=>{if(!document.querySelector('.title-list-popover'))close()},260)};
 const identity=card=>card.dataset.titleId||card.dataset.continueId;
 function fit(){if(!preview)return;const r=preview.getBoundingClientRect();if(r.bottom>innerHeight-16)preview.style.top=Math.max(80,innerHeight-r.height-16)+'px'}
 function fill(item,ticket){
  if(ticket!==version||!preview)return;const score=Number(item.score||0),facts=[item.year,item.runtime,item.rating].filter(Boolean),root=preview.querySelector('.preview-summary');
  root.querySelector('.preview-facts').innerHTML=facts.map(value=>'<span>'+esc(value)+'</span>').join('')+(score>0?'<span class="preview-rating"><span>★</span> '+esc(score.toFixed(1))+'</span>':'');
  const genres=root.querySelector('.preview-genres');genres.textContent=String(item.genres||'').split(' · ').slice(0,3).join(' · ');genres.hidden=!genres.textContent;
  const overview=root.querySelector('.preview-overview');overview.textContent=item.overview||'';overview.hidden=!overview.textContent;
  if(item.logo){const logo=preview.querySelector('.preview-title-logo'),name=preview.querySelector('.preview-name');logo.src=item.logo;logo.hidden=false;name.classList.add('has-logo');logo.onerror=()=>{logo.hidden=true;name.classList.remove('has-logo')}}fit();
 }
 async function hydrate(card,ticket){
  const item=ctx.find(identity(card));if(!item?.tmdbId)return;
  try{const data=await ctx.metadata('/api/title-details',{type:item.type==='series'?'tv':'movie',id:item.tmdbId});if(ticket!==version||!card.isConnected)return;const known=ctx.remember(data);fill({...known,logo:data.logo||known.logo,genres:Array.isArray(data.genres)?data.genres.map(g=>g.name).join(' · '):known.genres,runtime:data.runtime?Math.floor(data.runtime/60)+'h '+data.runtime%60+'m':known.runtime,rating:data.certification||known.rating,score:Number(data.rating||known.score||0).toFixed(1),overview:data.description||known.overview},ticket)}catch{/* Keep the known, real catalog information. */}
 }
 async function play(card,ticket,source){
  if(!autoplay()||active!==card||ticket!==version||!preview)return;
  const data=await source;if(ticket!==version||active!==card||!card.isConnected||!autoplay()||!preview)return;const screen=preview.querySelector('.preview-screen');
  const status=document.createElement('span');status.className='preview-status';status.setAttribute('role','status');screen.append(status);let url;try{url=new URL(data?.video?.url)}catch{}
  if(!data?.available||!url||url.protocol!=='https:'||!['imdb.com','media-imdb.com','cloudfront.net'].some(h=>url.hostname===h||url.hostname.endsWith('.'+h))){screen.dataset.previewState='unavailable';status.textContent='IMDb trailer unavailable for this title.';return}
  const video=document.createElement('video');video.muted=true;video.defaultMuted=true;video.autoplay=true;video.loop=true;video.playsInline=true;video.controls=false;video.preload='auto';video.setAttribute('aria-label','IMDb trailer preview');video.src=url.href;
  const failed=()=>{if(ticket!==version)return;screen.classList.remove('is-playing');screen.dataset.previewState='unavailable';status.textContent='IMDb trailer could not be played.';video.pause();video.removeAttribute('src');video.load();video.remove()};
  video.addEventListener('error',failed,{once:true});video.addEventListener('playing',()=>{if(ticket!==version){video.pause();return}clearTimeout(timeout);screen.classList.add('is-playing');screen.dataset.previewState='playing';status.textContent='IMDb trailer playing muted.'},{once:true});screen.prepend(video);video.play().catch(failed);timeout=setTimeout(()=>{if(ticket===version&&!screen.classList.contains('is-playing'))failed()},12000);
 }
 function open(card){
  if(!card.isConnected||!pointer())return;close();const item=ctx.find(identity(card));if(!item)return;active=card;const art=card.querySelector('.poster-art,.spotlight-art')||card,r=art.getBoundingClientRect(),width=Math.min(360,innerWidth-32),height=width*9/16+180,left=Math.max(16,Math.min(innerWidth-width-16,r.left-(width-r.width)/2)),top=Math.max(80,Math.min(innerHeight-height-16,r.top+(r.height-height)/2));
  preview=document.createElement('div');preview.className='film-preview';preview.setAttribute('role','group');preview.setAttribute('aria-label',item.title+' preview');preview.style.cssText='left:'+left+'px;top:'+top+'px;width:'+width+'px';preview.style.setProperty('--card-offset-x',(r.left-left)+'px');preview.style.setProperty('--card-offset-y',(r.top-top)+'px');preview.style.setProperty('--card-scale',String(Math.min(1,r.width/width)));
  preview.innerHTML='<a class="preview-screen" href="'+esc(ctx.detailPath(item))+'" aria-label="'+esc(item.title)+' details"><img class="preview-poster" src="'+esc(item.backdrop||item.poster)+'" alt=""><div class="preview-shade"></div><img class="preview-title-logo" hidden alt=""><strong class="preview-name">'+esc(item.title)+'</strong></a><div class="preview-controls"><a class="preview-play" href="'+esc(ctx.watchPath(item))+'" aria-label="Play '+esc(item.title)+'">'+ctx.icon('play')+'</a>'+ctx.saveButton(item)+'<a class="preview-info" href="'+esc(ctx.detailPath(item))+'" aria-label="More info: '+esc(item.title)+'">'+ctx.icon('info')+'</a></div><div class="preview-summary"><div class="preview-facts"></div><p class="preview-genres" hidden></p><p class="preview-overview" hidden></p></div>';
  const ticket=version;document.body.append(preview);fill(item,ticket);const own=preview;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(own===preview)own.classList.add('is-open')}));
  card.setAttribute('aria-keyshortcuts','ArrowDown');card.setAttribute('aria-description','Press Arrow Down for preview controls.');preview.onpointerenter=()=>clearTimeout(closeTimer);preview.onpointerleave=e=>{if(!protectedTarget(e.relatedTarget))scheduleClose()};preview.onfocusin=()=>clearTimeout(closeTimer);preview.onfocusout=e=>{if(!protectedTarget(e.relatedTarget))scheduleClose()};
  preview.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close(true);return}if(e.key==='Tab'&&e.shiftKey&&e.target===preview.querySelector('.preview-play')){e.preventDefault();close(true)}};
  ctx.normalizeLinks();void hydrate(card,ticket);
  if(autoplay()&&item.tmdbId){let source;sourceTimer=setTimeout(()=>{if(ticket!==version||!autoplay())return;source=ctx.metadata('/api/title-preview',{type:item.type==='series'?'tv':'movie',id:item.tmdbId}).catch(()=>null)},1200);playTimer=setTimeout(()=>{if(!autoplay())return;source||=ctx.metadata('/api/title-preview',{type:item.type==='series'?'tv':'movie',id:item.tmdbId}).catch(()=>null);void play(card,ticket,source)},3700)}
 }
 ctx.app.addEventListener('pointerover',e=>{const card=e.target.closest('.poster-card,.spotlight-card');if(!card||card.contains(e.relatedTarget)||active===card||!pointer())return;clearTimeout(closeTimer);clearTimeout(openTimer);openTimer=setTimeout(()=>open(card),300)});
 ctx.app.addEventListener('pointerout',e=>{const card=e.target.closest('.poster-card,.spotlight-card');if(card&&!card.contains(e.relatedTarget)){clearTimeout(openTimer);if(!protectedTarget(e.relatedTarget))scheduleClose()}});
 ctx.app.addEventListener('focusin',e=>{const card=e.target.closest('.poster-card,.spotlight-card');if(!card||active===card||performance.now()<suppressFocusUntil||!pointer())return;clearTimeout(closeTimer);clearTimeout(openTimer);openTimer=setTimeout(()=>open(card),200)});
 ctx.app.addEventListener('focusout',e=>{const card=e.target.closest('.poster-card,.spotlight-card');if(card&&!card.contains(e.relatedTarget)&&!protectedTarget(e.relatedTarget)){clearTimeout(openTimer);scheduleClose()}});
 ctx.app.addEventListener('keydown',e=>{if(e.key==='ArrowDown'&&active?.contains(e.target)&&preview){e.preventDefault();preview.querySelector('.preview-play')?.focus({preventScroll:true})}});
 window.addEventListener('scroll',()=>{if(preview?.contains(document.activeElement)||performance.now()<suppressFocusUntil)return;const focused=ctx.app.querySelector('.poster-card:focus-visible,.spotlight-card:focus-visible');close();if(focused&&pointer())openTimer=setTimeout(()=>{if(document.activeElement===focused&&focused.isConnected)open(focused)},200)},{passive:true});window.addEventListener('resize',close,{passive:true});document.addEventListener('pointerdown',e=>{if(preview&&!protectedTarget(e.target)&&!active?.contains(e.target))close()});document.addEventListener('visibilitychange',()=>{if(document.hidden)close()});document.addEventListener('keydown',e=>{if(!e.defaultPrevented&&e.key==='Escape'&&preview)close(preview.contains(document.activeElement))});document.addEventListener('click',e=>{if(e.target.closest('a[href]'))close()});new MutationObserver(()=>{if(active&&!active.isConnected)close()}).observe(ctx.app,{childList:true,subtree:true});
 return {close};
}
