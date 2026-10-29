import {uiIcon} from './reference-ui.mjs?v=20261029-cinejoy76';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function createCatalogPages(ctx){
 let cleanup=()=>{};
 const leave=()=>cleanup();
 async function render({providerId,type='movie',kind='trending'}){
  leave();const {app,metadata,remember,posterCard,normalizeLinks}=ctx;let disposed=false,ticket=0,page=0,total=1,busy=false,seen=new Set(),autoLoads=0;
  app.innerHTML='<section class="catalog-index-page"><header class="catalog-index-heading"><h1>Loading…</h1></header><div class="provider-type-tabs" '+(providerId?'':'hidden')+' role="group" aria-label="Provider title type"><span aria-hidden="true"></span><button data-provider-type="movie" aria-pressed="'+(type==='movie')+'">Movies</button><button data-provider-type="tv" aria-pressed="'+(type==='tv')+'">Series</button></div><div class="poster-grid catalog-index-grid"></div><p class="catalog-status" role="status"></p><button class="subtle-pill show-more">Show more</button><div class="catalog-index-sentinel" aria-hidden="true"></div></section>';
  const root=app.querySelector('.catalog-index-page'),heading=root.querySelector('header'),grid=root.querySelector('.poster-grid'),status=root.querySelector('[role=status]'),more=root.querySelector('.show-more'),tabs=root.querySelector('.provider-type-tabs');tabs.dataset.type=type;
  const valid=()=>!disposed&&root.isConnected;
  async function load(reset=false){if(!valid()||busy&&!reset||!reset&&page>=total)return;const request=++ticket;if(reset){page=0;total=1;seen=new Set();grid.replaceChildren();autoLoads=0}busy=true;more.disabled=true;more.textContent='Loading…';status.textContent=page?'':'Loading titles…';
   try{const params=providerId?{tab:type==='tv'?'tv':'movies',provider:providerId,page:page+1}:{tab:type==='tv'?'trending-tv':'trending-movies',page:page+1};const data=await metadata('/api/movie-discover',params);if(!valid()||request!==ticket)return;const items=(data.items||[]).map(remember).filter(t=>!seen.has(t.id));items.forEach(t=>seen.add(t.id));grid.insertAdjacentHTML('beforeend',items.map(posterCard).join(''));page++;total=Number(data.totalPages)||page;more.hidden=page>=total;more.textContent='Show more';status.textContent=seen.size?'':'No titles available.';normalizeLinks();
   }catch(e){if(valid()&&request===ticket){status.textContent=e.message;more.hidden=false;more.textContent='Try again'}}finally{if(valid()&&request===ticket){busy=false;more.disabled=false}}
  }
  more.onclick=()=>void load();
  tabs.querySelectorAll('button').forEach(button=>button.onclick=()=>{if(type===button.dataset.providerType)return;type=button.dataset.providerType;tabs.dataset.type=type;tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));const url=new URL(location.href);url.searchParams.set('type',type);history.replaceState({},'',url);void load(true)});
  const observer=new IntersectionObserver(entries=>{if(entries[0].isIntersecting&&page&&page<total&&!busy&&autoLoads<2){autoLoads++;void load()}},{rootMargin:'200px'});observer.observe(root.querySelector('.catalog-index-sentinel'));
  cleanup=()=>{disposed=true;++ticket;observer.disconnect()};
  if(providerId){try{const data=await metadata('/api/movie-providers');if(!valid())return;const provider=data.items?.find(p=>p.id===providerId);if(!provider)throw Error('Provider not found.');heading.innerHTML='<h1>'+(provider.logo?'<img src="'+esc(provider.logo)+'" alt="">':'')+esc(provider.name)+'</h1>';document.title=provider.name+' · Spex'}catch(e){if(valid()){heading.innerHTML='<h1>Provider unavailable</h1>';status.textContent=e.message;more.hidden=true}return}}
  else{const label=type==='tv'?'Trending Series':'Trending Movies';heading.innerHTML='<h1>'+uiIcon(type==='tv'?'series':'movies')+label+'</h1>';document.title=label+' · Spex'}
  await load(true);
 }
 return {leave,provider:(id,type)=>render({providerId:id,type}),category:type=>render({type})};
}
