import {uiIcon} from './reference-ui.mjs?v=20261029-access77';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Uses the same filter and popover classes as the Movies and Shows catalogs.
export function createFilterMenu({button,label,options,value,onChange,container=document.body}) {
 let menu=null,typeTimer,typed='';
 button.classList.add('discovery-filter');
 button.setAttribute('aria-label',label);button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
 const close=(focus=false)=>{if(!menu)return;menu.remove();menu=null;clearTimeout(typeTimer);typed='';button.setAttribute('aria-expanded','false');if(focus)button.focus()};
 const refresh=()=>{const selected=options().find(([id])=>String(id)===String(value()));button.innerHTML='<span class="filter-label">'+esc(value()?selected?.[1]||label:label)+'</span>'+uiIcon('down');button.classList.toggle('has-selection',!!value())};
 function open(){if(menu){close(true);return}menu=document.createElement('div');menu.className='discovery-options sports-filter-options';menu.setAttribute('role','listbox');menu.setAttribute('aria-label',label);menu.innerHTML=options().map(([id,name])=>'<button type="button" role="option" data-value="'+esc(id)+'" aria-selected="'+(String(id)===String(value()))+'"><span>'+esc(name)+'</span>'+uiIcon('check')+'</button>').join('');container.append(menu);const r=button.getBoundingClientRect(),height=Math.min(320,menu.scrollHeight);menu.style.left=Math.max(8,Math.min(r.left,innerWidth-252))+'px';menu.style.top=(r.bottom+height+16>innerHeight?Math.max(8,r.top-height-8):r.bottom+8)+'px';button.setAttribute('aria-expanded','true');menu.querySelector('[aria-selected=true]')?.focus({preventScroll:true});menu.onclick=e=>{const option=e.target.closest('[data-value]');if(!option)return;onChange(option.dataset.value);refresh();close(true)};menu.onkeydown=e=>{const buttons=[...menu.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus()}else if(e.key==='Escape'){e.preventDefault();close(true)}else if(e.key==='Tab')close();else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey){clearTimeout(typeTimer);typed+=e.key.toLowerCase();buttons.find(b=>b.textContent.trim().toLowerCase().startsWith(typed))?.focus();typeTimer=setTimeout(()=>typed='',600)}}}
 const outside=e=>{if(menu&&!menu.contains(e.target)&&!button.contains(e.target))close()};
 const scrolled=e=>{if(menu&&!menu.contains(e.target))close()};
 button.onclick=open;button.onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();open()}};
 document.addEventListener('pointerdown',outside);window.addEventListener('scroll',scrolled,true);window.addEventListener('resize',close);
 refresh();return {refresh,close,destroy(){close();button.onclick=null;button.onkeydown=null;document.removeEventListener('pointerdown',outside);window.removeEventListener('scroll',scrolled,true);window.removeEventListener('resize',close)}};
}
