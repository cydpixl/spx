import {uiIcon} from './reference-ui.mjs?v=20261029-sports78';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Uses the same filter and popover classes as the Movies and Shows catalogs.
export function createFilterMenu({button,label,options,value,onChange,container=document.body,showSelected=false}) {
 let menu=null,typeTimer,typed='';
 button.classList.add('discovery-filter');
 button.setAttribute('aria-label',label);button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
 const close=(focus=false)=>{if(!menu)return;menu.remove();menu=null;clearTimeout(typeTimer);typed='';button.setAttribute('aria-expanded','false');if(focus)button.focus()};
 const refresh=()=>{const selected=options().find(([id])=>String(id)===String(value()));button.innerHTML='<span class="filter-label">'+esc(value()||showSelected?selected?.[1]||label:label)+'</span>'+uiIcon('down');button.classList.toggle('has-selection',!!value())};
 function position(){if(!menu)return;const r=button.getBoundingClientRect(),ceiling=innerHeight-(innerWidth<1024?100:12);if(r.bottom<0||r.top>ceiling){close();return;}const below=ceiling-r.bottom-8,above=r.top-20;const up=below<Math.min(220,menu.scrollHeight)&&above>below;menu.style.maxHeight=Math.max(72,Math.min(320,up?above:below))+'px';const height=menu.offsetHeight;menu.style.left=Math.max(12,Math.min(r.left,innerWidth-menu.offsetWidth-12))+'px';menu.style.top=Math.max(12,up?r.top-height-8:r.bottom+8)+'px';}
 function open(){if(menu){close(true);return}menu=document.createElement('div');menu.className='discovery-options sports-filter-options';menu.setAttribute('role','listbox');menu.setAttribute('aria-label',label);menu.innerHTML=options().map(([id,name])=>'<button type="button" role="option" data-value="'+esc(id)+'" aria-selected="'+(String(id)===String(value()))+'"><span>'+esc(name)+'</span>'+uiIcon('check')+'</button>').join('');container.append(menu);if(container instanceof HTMLDialogElement&&typeof menu.showPopover==='function'){menu.setAttribute('popover','manual');menu.showPopover()}position();if(!menu)return;button.setAttribute('aria-expanded','true');menu.querySelector('[aria-selected=true]')?.focus({preventScroll:true});menu.onclick=e=>{const option=e.target.closest('[data-value]');if(!option)return;const value=option.dataset.value;close(true);onChange(value);if(button.isConnected)refresh()};menu.onkeydown=e=>{const buttons=[...menu.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus()}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true)}else if(e.key==='Tab')close();else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey){clearTimeout(typeTimer);typed+=e.key.toLowerCase();buttons.find(b=>b.textContent.trim().toLowerCase().startsWith(typed))?.focus();typeTimer=setTimeout(()=>typed='',600)}}}
 const outside=e=>{if(menu&&!menu.contains(e.target)&&!button.contains(e.target))close()};
 const scrolled=e=>{if(menu&&!menu.contains(e.target))position()};
 button.onclick=open;button.onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();open()}};
 document.addEventListener('pointerdown',outside);window.addEventListener('scroll',scrolled,true);window.addEventListener('resize',close);
 refresh();return {refresh,close,destroy(){close();button.onclick=null;button.onkeydown=null;document.removeEventListener('pointerdown',outside);window.removeEventListener('scroll',scrolled,true);window.removeEventListener('resize',close)}};
}

export function styleSelect(select){
 if(!select||select.dataset.spexSelect)return;
 select.dataset.spexSelect='true';select.style.display='none';
 const label=select.getAttribute('aria-label')||select.labels?.[0]?.textContent.trim()||'Choose option';
 const button=document.createElement('button');button.type='button';select.after(button);
 const picker=createFilterMenu({button,label,options:()=>Array.from(select.options,o=>[o.value,o.label]),value:()=>select.value,onChange:value=>{select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));},container:select.closest('dialog')||document.body,showSelected:true});
 select.addEventListener('change',picker.refresh);
 const observer=new MutationObserver(()=>{if(!select.isConnected){observer.disconnect();picker.destroy();}else picker.refresh()});
 observer.observe(select,{childList:true,subtree:true});
 const removal=new MutationObserver(()=>{if(!select.isConnected){removal.disconnect();observer.disconnect();picker.destroy();}});
 removal.observe(document.body,{childList:true,subtree:true});
}
