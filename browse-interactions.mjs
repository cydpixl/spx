import {uiIcon} from './reference-ui.mjs?v=20261027-polish1';
// Shared navigation geometry survives route changes, resizing and font loading.
export function installNavigation(){
 const nav=document.querySelector('.nav-pill');
 const marker=document.createElement('span');marker.className='nav-marker';marker.setAttribute('aria-hidden','true');nav.prepend(marker);
 let frame;
 const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
  const active=nav.querySelector('a.active,button.active');if(!active){marker.hidden=true;return}
  if(active.matches('a[data-nav]:not(.nav-icon)')){
   const key=active.dataset.nav==='my-list'?'bookmark':active.dataset.nav;
   if(active.querySelector('svg')?.dataset.referenceIcon!==key){const old=active.querySelector('svg');if(old)old.remove();const holder=document.createElement('span');holder.innerHTML=uiIcon(key);const svg=holder.firstElementChild;svg.dataset.referenceIcon=key;active.prepend(svg)}
  }
  if(nav.scrollWidth>nav.clientWidth)active.scrollIntoView({block:'nearest',inline:'nearest'});
  const box=active.getBoundingClientRect(),parent=nav.getBoundingClientRect();
  marker.style.width=box.width+'px';marker.style.height=box.height+'px';marker.style.transform=`translate(${box.left-parent.left-nav.clientLeft+nav.scrollLeft}px,${box.top-parent.top-nav.clientTop}px)`;marker.hidden=false;
  requestAnimationFrame(()=>{if(!nav.classList.contains('nav-measured'))nav.classList.add('nav-measured')});
 })};
 new MutationObserver(measure).observe(nav,{subtree:true,attributes:true,attributeFilter:['class','aria-current']});
 new ResizeObserver(measure).observe(nav);document.fonts?.ready.then(measure);nav.querySelector('[data-nav=search]').innerHTML=uiIcon('search');nav.querySelector('#settingsButton').innerHTML=uiIcon('settings');measure();
}

export function installTitleMenu(ctx){
 const {app,find,watchPath,detailPath,navigate,listMenu,toggleWatched,isWatched,notify,esc}=ctx;
 let menu=null,opener=null,holdTimer,holdPoint,suppressClickUntil=0;
 const cardFor=target=>target.closest?.('[data-title-id],[data-continue-id]');
 function close(restore=false){menu?.remove();menu=null;if(restore&&opener?.isConnected)opener.focus()}
 function open(card,x,y){
  const item=find(card.dataset.titleId||card.dataset.continueId);if(!item)return;
  close();opener=card.querySelector('a')||card;
  menu=document.createElement('div');menu.className='title-context-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label',item.title+' actions');
  const details=new URL(detailPath(item).replace(/^\//,''),document.baseURI).href;
  const play=card.matches('.continue-card')?card.querySelector('a').getAttribute('href'):watchPath(item);
  menu.innerHTML='<p>'+esc(item.title)+'</p><a role="menuitem" data-action="play" href="'+esc(play)+'">Play / Resume</a><a role="menuitem" data-action="details" href="'+esc(detailPath(item))+'">More info</a><a role="menuitem" href="'+esc(details)+'" target="_blank" rel="noopener">Open in new tab</a><hr><button role="menuitem" data-action="list">Add to list…</button><button role="menuitem" data-action="watched">'+(isWatched(item.id)?'Mark as unwatched':'Mark as watched')+'</button><button role="menuitem" data-action="copy">Copy link</button>';
  document.body.append(menu);
  const rect=menu.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(x,innerWidth-rect.width-8))+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-rect.height-8))+'px';
  menu.querySelector('[role=menuitem]').focus();
  menu.onclick=async event=>{const action=event.target.closest('[role=menuitem]');if(!action)return;const name=action.dataset.action;
   if(name)event.preventDefault();close();
   if(name==='play')navigate(play);
   if(name==='details')navigate(detailPath(item));
   if(name==='list')listMenu(item.id);
   if(name==='watched'){toggleWatched(item.id);notify(isWatched(item.id)?'Marked as watched':'Marked as unwatched')}
   if(name==='copy'){try{await navigator.clipboard.writeText(details);notify('Link copied')}catch{notify('Could not copy the link.')}}
  };
  menu.onkeydown=event=>{const entries=[...menu.querySelectorAll('[role=menuitem]')],index=entries.indexOf(document.activeElement);if(['ArrowUp','ArrowDown','Home','End'].includes(event.key)){event.preventDefault();entries[event.key==='Home'?0:event.key==='End'?entries.length-1:(index+(event.key==='ArrowDown'?1:-1)+entries.length)%entries.length].focus()}if(event.key==='Tab')close()};
 }
 app.addEventListener('contextmenu',event=>{const card=cardFor(event.target);if(!card||event.shiftKey)return;event.preventDefault();open(card,event.clientX,event.clientY)});
 app.addEventListener('keydown',event=>{if(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10'){const card=cardFor(event.target);if(card){event.preventDefault();const rect=card.getBoundingClientRect();open(card,rect.left+24,rect.top+24)}}});
 app.addEventListener('pointerdown',event=>{clearTimeout(holdTimer);if(event.pointerType!=='touch')return;const card=cardFor(event.target);if(!card)return;holdPoint={x:event.clientX,y:event.clientY};holdTimer=setTimeout(()=>{suppressClickUntil=performance.now()+1000;open(card,holdPoint.x,holdPoint.y)},550)},{passive:true});
 app.addEventListener('pointermove',event=>{if(holdPoint&&Math.hypot(event.clientX-holdPoint.x,event.clientY-holdPoint.y)>10)clearTimeout(holdTimer)},{passive:true});
 for(const name of ['pointerup','pointercancel'])app.addEventListener(name,()=>clearTimeout(holdTimer),{passive:true});
 app.addEventListener('click',event=>{if(performance.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();suppressClickUntil=0}},true);
 document.addEventListener('pointerdown',event=>{if(menu&&!menu.contains(event.target))close()});
 document.addEventListener('keydown',event=>{if(menu&&event.key==='Escape'){event.preventDefault();close(true)}});
 window.addEventListener('scroll',event=>{clearTimeout(holdTimer);if(menu&&(!(event.target instanceof Node)||!menu.contains(event.target)))close()},true);
 window.addEventListener('resize',()=>close());window.addEventListener('popstate',()=>close());
 new MutationObserver(()=>{if(opener&&!opener.isConnected)close()}).observe(app,{childList:true});
}
