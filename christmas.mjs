const noticeKey='spex.christmas-notice.2026';
const day=86400000;
export const isChristmasSeason=(now=new Date())=>now>=new Date(2026,10,11)&&now<new Date(2027,0,7);
export function christmasDays(now=new Date()){
 const dec25=Date.UTC(2026,11,25);
 const today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
 return Math.max(0,Math.round((dec25-today)/day));
}
const films=[['movie',771],['movie',10719],['movie',508965],['movie',5825],['movie',9479],['movie',5255],['movie',8871],['movie',508],['movie',9647],['movie',11395],['movie',772]];
const shows=['Dash & Lily','The Santa Clauses','Home for Christmas'];
let collection;
function getCollection(metadata){
 if(!collection)collection=Promise.allSettled([
  ...films.map(([type,id])=>metadata('/api/title-details',{type,id})),
  ...shows.map(q=>metadata('/api/movie-discover',{tab:'search',q}).then(data=>data.items?.find(item=>item.type==='tv'&&item.title.toLowerCase()===q.toLowerCase())))
 ]).then(results=>{const titles=results.filter(r=>r.status==='fulfilled'&&r.value?.title).map(r=>r.value);if(!titles.length){collection=null;throw Error('Christmas titles are temporarily unavailable.')}return titles;});
 return collection;
}
export function initChristmas({read,write,enableTheme}){
 if(!isChristmasSeason())return;
 document.documentElement.classList.add('spex-christmas-season');
 const brand=document.querySelector('.site-header .brand-mark img');
 if(brand)brand.src='christmas-logo.png';
 const lights=document.createElement('img');lights.className='christmas-lights';lights.src='christmas-lights.png';lights.alt='';lights.setAttribute('aria-hidden','true');document.body.prepend(lights);
 if(read(noticeKey,false))return;
 const banner=document.createElement('aside');banner.className='christmas-notice';banner.setAttribute('aria-label','Christmas theme announcement');
 banner.innerHTML='<button type="button" class="christmas-notice-close" aria-label="Dismiss Christmas announcement">×</button><img src="christmas-logo.png" alt=""><div><strong>Christmas has arrived at Spex</strong><p>Try the Christmas theme for snowfall and festive colors.</p><button type="button" class="christmas-enable">Try Christmas theme</button></div>';
 const dismiss=()=>{write(noticeKey,true);banner.remove();document.removeEventListener('pointerdown',outside,true);};
 const outside=event=>{if(!document.querySelector('dialog[open]')&&!banner.contains(event.target))dismiss();};
 banner.querySelector('.christmas-notice-close').onclick=dismiss;
 banner.querySelector('.christmas-enable').onclick=()=>{enableTheme();dismiss();};
 document.body.append(banner);document.addEventListener('pointerdown',outside,true);
}
export function mountChristmasHome({app,metadata,remember,row,normalizeLinks}){
 if(!isChristmasSeason())return;
 const block=document.createElement('section');block.className='christmas-home';block.setAttribute('aria-labelledby','christmas-title');
 block.innerHTML='<div class="christmas-feature"><div class="christmas-countdown"><h1 id="christmas-title">Christmas on Spex</h1><p data-countdown></p><a class="christmas-browse" href="#christmas-collection">Browse the collection</a></div><img class="christmas-feature-logo" src="christmas-logo.png" alt=""></div><div id="christmas-collection" class="christmas-collection"><p role="status">Loading Christmas collection…</p></div>';
 app.prepend(block);
 const counter=block.querySelector('[data-countdown]'),host=block.querySelector('#christmas-collection');
 const paint=()=>{const n=christmasDays();counter.innerHTML=n?'<strong>'+n+'</strong> '+(n===1?'day':'days')+' until Christmas':'Merry Christmas';};
 paint();
 const timer=setInterval(()=>{if(!block.isConnected){clearInterval(timer);return;}paint();},60000);
 block.querySelector('.christmas-browse').onclick=e=>{e.preventDefault();host.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
 async function load(){try{const items=await getCollection(metadata);if(!host.isConnected)return;host.innerHTML=row('Christmas movies & shows',items.map(remember));normalizeLinks();}catch{if(!host.isConnected)return;host.innerHTML='<p role="status">Christmas titles are temporarily unavailable.</p><button class="subtle-pill" type="button">Retry</button>';host.querySelector('button').onclick=()=>void load();}}
 void load();
}
