import {uiIcon} from './reference-ui.mjs?v=20261029-sports78';
const sections=[['schedule','Schedule','calendar'],['players','Players','user'],['standings','Standings','list'],['teams','Teams','tv'],['news','News','info'],['squads','Squads','grid'],['trackers','Trackers','check'],['saved','Saved plays','bookmark']];
export function mountSportsSidebar(root,{navigate,select,watch=false}) {
 const sidebar=document.createElement('nav');sidebar.className='sports-sidebar';sidebar.setAttribute('aria-label','Sports navigation');
 sidebar.innerHTML='<button type="button" data-sports-exit title="Back to Spex">'+uiIcon('left')+'<span>Back to Spex</span></button><button type="button" class="sports-sidebar-toggle" aria-expanded="false" aria-label="Expand Sports navigation">'+uiIcon('right')+'</button><div class="sports-sidebar-links">'+sections.map(([id,label,icon])=>'<button type="button" data-sport-section="'+id+'" title="'+label+'" aria-label="'+label+'">'+(uiIcon(icon)||uiIcon('list'))+'<span>'+label+'</span></button>').join('')+'</div>';
 root.prepend(sidebar);
 const toggle=sidebar.querySelector('.sports-sidebar-toggle');
 toggle.onclick=()=>{const open=sidebar.classList.toggle('is-expanded');toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',(open?'Collapse':'Expand')+' Sports navigation');};
 sidebar.querySelector('[data-sports-exit]').onclick=()=>navigate('/');
 function update(section){root.dataset.sportsSection=section;for(const button of sidebar.querySelectorAll('[data-sport-section]')){if(button.dataset.sportSection===section)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}}
 sidebar.onclick=event=>{
  const button=event.target.closest('[data-sport-section]');if(!button)return;
  const section=button.dataset.sportSection;
  if(watch){navigate('/sports'+(section==='schedule'?'':'?section='+section));return;}
  update(section);select(section);
  sidebar.classList.remove('is-expanded');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Expand Sports navigation');
  window.scrollTo({top:0,behavior:'instant'});
 };
 const requested=new URLSearchParams(location.search).get('section');
 const initial=sections.some(([id])=>id===requested)?requested:'schedule';
 update(initial);if(initial!=='schedule'&&!watch)select(initial);
 return {update};
}
