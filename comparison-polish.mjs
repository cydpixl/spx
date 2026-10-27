import {playerIcon as icon} from './player-icons.mjs?v=20261027-polish1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function showCollection(item,{openDialog,remember,posterCard,normalizeLinks}){
 const collection=item.collection;if(!collection?.parts?.length)return;
 const dialog=openDialog(collection.name,'<div class="collection-summary"><span>'+collection.parts.length+' Movies</span><span>Sort by:</span><button data-sort-collection="date" aria-pressed="true">Release Date</button><button data-sort-collection="rating" aria-pressed="false">Rating</button></div>'+(collection.description?'<p class="collection-description">'+esc(collection.description)+'</p>':'')+'<div class="collection-dialog-rail"></div>','collection-dialog');
 const rail=dialog.querySelector('.collection-dialog-rail');
 const draw=sort=>{const parts=[...collection.parts].sort(sort==='rating'?(a,b)=>(Number(b.rating)||0)-(Number(a.rating)||0):(a,b)=>(a.releaseDate||'9999').localeCompare(b.releaseDate||'9999'));rail.innerHTML=parts.map(remember).map(posterCard).join('');rail.scrollLeft=0;dialog.querySelectorAll('[data-sort-collection]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sortCollection===sort)));normalizeLinks()};
 dialog.querySelectorAll('[data-sort-collection]').forEach(b=>b.onclick=()=>draw(b.dataset.sortCollection));draw('date');
}

export function showDownloads(item,{openDialog,notify}){
 const isTV=item.type==='series',selected=Number(document.querySelector('#remoteSeason')?.value),seasons=(item.seasons||[]).filter(s=>s.episodeCount>0),season=Number.isInteger(selected)&&selected>=0?selected:item.season??seasons[0]?.seasonNumber??1;
 const dialog=openDialog('Downloads for '+item.title,(isTV?'<div class="download-episode-choice"><label>Season<select data-download-season>'+seasons.map(s=>'<option value="'+s.seasonNumber+'" '+(s.seasonNumber===season?'selected':'')+'>'+esc(s.name||'Season '+s.seasonNumber)+'</option>').join('')+'</select></label><label>Episode<input data-download-episode type="number" min="1" max="'+(seasons.find(s=>s.seasonNumber===season)?.episodeCount||100)+'" value="1"></label></div>':'')+'<div class="download-results" aria-live="polite"></div>','downloads-dialog');
 let request=0,controller;
 const load=async()=>{controller?.abort();controller=new AbortController();const ticket=++request,host=dialog.querySelector('.download-results');host.innerHTML='<div class="download-empty is-loading">'+icon('download')+'<p>Finding available downloads…</p></div>';
  try{const url=new URL('/api/downloads','https://bogart-catalog.cydpixl7.workers.dev');url.searchParams.set('id',item.tmdbId);url.searchParams.set('type',isTV?'tv':'movie');if(isTV){url.searchParams.set('season',dialog.querySelector('[data-download-season]')?.value??season);url.searchParams.set('episode',Math.max(1,Number(dialog.querySelector('[data-download-episode]').value)||1))}const response=await fetch(url,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(30000)])});if(!response.ok)throw Error('unavailable');const data=await response.json();if(!dialog.isConnected||ticket!==request)return;
   const files=(data.items||[]).filter(f=>{try{return ['http:','https:'].includes(new URL(f.url).protocol)}catch{return false}});
   host.innerHTML=files.length?'<p class="download-count">'+files.length+' file'+(files.length===1?'':'s')+'</p>'+files.map(f=>{
    const quality=Number(f.quality),known=Number.isFinite(quality)&&quality>0,level=known?(quality>=2160?4:quality>=1080?3:quality>=720?2:1):0;
    const label=known?(quality>=2160?'4K':quality+'p'):'File',format=/^(mkv|mp4|webm|avi|mov|m4v|ts)$/i.test(f.type||'')?String(f.type).toUpperCase():'';
    const size=/^\d+(?:\.\d+)?\s*(?:[KMGT]i?B|B)$/i.test(f.size||'')?f.size:'';
    const visual='<svg class="download-quality" viewBox="0 0 32 28" aria-hidden="true" focusable="false">'+[7,12,18,25].map((h,i)=>'<rect x="'+(i*8)+'" y="'+(28-h)+'" width="5" height="'+h+'" rx="1.5" class="'+(i<level?'is-lit':'')+'"/>').join('')+'</svg>';
    return '<div class="download-row"><span class="download-file">'+visual+'<strong>'+esc([label,format,size].filter(Boolean).join(' · '))+'</strong></span><button data-copy-download="'+esc(f.url)+'">Copy link</button><a class="play-action" href="'+esc(f.url)+'" target="_blank" rel="noopener">Download</a></div>';
   }).join(''):empty(data.unavailable?'Downloads unavailable.':data.rejected?'File links unavailable.':'No downloads yet.');
   host.querySelectorAll('[data-copy-download]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copyDownload);notify('Link copied')}catch{notify('Could not copy the link.')}});
  }catch(e){if(dialog.isConnected&&ticket===request&&!controller.signal.aborted)host.innerHTML=empty('Downloads are temporarily unavailable.')}if(dialog.isConnected)host.querySelector('[data-retry-download]')?.addEventListener('click',load);
 };
 const empty=message=>'<div class="download-empty">'+icon('download')+'<p>'+message+'</p><button class="subtle-pill" data-retry-download>'+icon('reset')+'Try again</button></div>';
 dialog.querySelector('[data-download-season]')?.addEventListener('change',()=>{const input=dialog.querySelector('[data-download-episode]');input.max=seasons.find(s=>s.seasonNumber===Number(dialog.querySelector('[data-download-season]').value))?.episodeCount||100;input.value='1';void load()});dialog.querySelector('[data-download-episode]')?.addEventListener('change',()=>{const input=dialog.querySelector('[data-download-episode]');input.value=Math.max(1,Math.min(Number(input.max),Number(input.value)||1));void load()});dialog.addEventListener('close',()=>controller?.abort(),{once:true});void load();
}

export function attachFebboxHelp(host){
 const button=host.querySelector('.febbox-help');if(!button)return;button.setAttribute('aria-expanded','false');let panel;
 const close=()=>{panel?.remove();panel=null;button.setAttribute('aria-expanded','false')};
 button.onclick=()=>{if(panel){close();return}panel=document.createElement('div');panel.className='febbox-help-popover';panel.setAttribute('role','note');panel.innerHTML='<strong>How to Get Your Token</strong><ol><li>Sign in at <a href="https://www.febbox.com" target="_blank" rel="noopener">febbox.com</a>.</li><li>Open DevTools (F12 or right-click → Inspect).</li><li>Go to Application → Cookies.</li><li>Copy the value of the <code>ui</code> cookie.</li><li>Paste it below. Keep your Febbox session signed in.</li></ol>';button.parentElement.append(panel);button.setAttribute('aria-expanded','true')};
 const outside=e=>{if(!button.isConnected){document.removeEventListener('pointerdown',outside);return}if(!button.contains(e.target)&&!panel?.contains(e.target))close()};document.addEventListener('pointerdown',outside);button.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();button.focus()}});
}
