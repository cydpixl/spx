import {safeMediaURL} from './wing-client.mjs?v=20261110-wing90';
export function installVideoContext(player,dialog){
 let menu=null,about=null,previousFocus=null;
 const stage=dialog.querySelector('.stream-stage');
 function close(){menu?.remove();about?.remove();menu=about=null;dialog.classList.remove('video-context-open');}
 function dismiss(){close();previousFocus?.focus?.();}
 async function copy(){const url=safeMediaURL(player.videoInfo?.playlist);if(!url)return;try{await navigator.clipboard.writeText(url);player.status('Playlist link copied');close()}catch{details('Copy the playlist link below.');}}
 function details(note=''){
  close();dialog.classList.add('video-context-open');about=document.createElement('section');about.className='stream-video-about';about.setAttribute('role','dialog');about.setAttribute('aria-label','About this video');
  const header=document.createElement('header'),heading=document.createElement('strong'),exit=document.createElement('button');heading.textContent='About this video';exit.textContent='×';exit.setAttribute('aria-label','Close video details');exit.onclick=dismiss;header.append(heading,exit);about.append(header);
  const info=player.videoInfo||{},rows=[['Resolution',info.width?`${info.width} × ${info.height}`:'Not reported'],['Bandwidth',info.bandwidth?`${(info.bandwidth/1e6).toFixed(1)} Mbps`:'Not reported'],['Stream type',info.streamType?.toUpperCase()||'Embedded player'],['Server',info.server||player.provider.name],['Buffer ahead',Number.isFinite(info.bufferAhead)?info.bufferAhead.toFixed(1)+'s':'Not reported'],['Dropped frames',Number.isFinite(info.totalFrames)?`${info.droppedFrames} / ${info.totalFrames}`:'Not reported']];
  const list=document.createElement('dl');for(const [label,value]of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;list.append(dt,dd)}about.append(list);
  if(note){const p=document.createElement('p');p.textContent=note;about.append(p)}
  const url=safeMediaURL(info.playlist);if(url){const field=document.createElement('input');field.type='text';field.readOnly=true;field.value=url;field.setAttribute('aria-label','Playlist link');field.onclick=()=>field.select();about.append(field)}
  const button=document.createElement('button');button.className='stream-menu-row';button.textContent='Copy playlist link';button.disabled=!url;button.onclick=copy;about.append(button);dialog.append(about);exit.focus();
 }
 function open(x,y){
  previousFocus=document.activeElement;close();dialog.classList.add('video-context-open');menu=document.createElement('div');menu.className='stream-video-context';menu.setAttribute('role','menu');
  for(const [label,action,disabled]of [['Copy playlist link',copy,!safeMediaURL(player.videoInfo?.playlist)],['About this video',()=>details(),false]]){const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');b.textContent=label;b.disabled=disabled;b.onclick=action;menu.append(b)}
  dialog.append(menu);const bounds=dialog.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(x-bounds.left,bounds.width-240))+'px';menu.style.top=Math.max(8,Math.min(y-bounds.top,bounds.height-110))+'px';menu.querySelector('button:not(:disabled)').focus();
 }
 player.openVideoContext=(x,y)=>{const bounds=player.frame.getBoundingClientRect();open(bounds.left+x,bounds.top+y)};
 const context=e=>{if(e.shiftKey)return;e.preventDefault();open(e.clientX,e.clientY)};
 const outside=e=>{if(!menu?.contains(e.target)&&!about?.contains(e.target))close()};
 const keys=e=>{
  if((e.shiftKey&&e.key==='F10')||e.key==='ContextMenu'){e.preventDefault();const r=stage.getBoundingClientRect();open(r.left+r.width/2,r.top+r.height/2);return}
  if(!menu&&!about)return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();dismiss();return}
  if((e.key==='ArrowDown'||e.key==='ArrowUp')&&menu){e.preventDefault();const buttons=[...menu.querySelectorAll('button:not(:disabled)')],i=buttons.indexOf(document.activeElement);buttons[(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus()}
  if(e.key==='Tab'&&about){const buttons=[...about.querySelectorAll('button:not(:disabled),input')],i=buttons.indexOf(document.activeElement);if(e.shiftKey&&i===0||!e.shiftKey&&i===buttons.length-1){e.preventDefault();buttons[e.shiftKey?buttons.length-1:0]?.focus()}}
 };
 stage.addEventListener('contextmenu',context);dialog.addEventListener('pointerdown',outside);dialog.addEventListener('keydown',keys,true);
 dialog.addEventListener('close',()=>{close();player.openVideoContext=null;stage.removeEventListener('contextmenu',context);dialog.removeEventListener('pointerdown',outside);dialog.removeEventListener('keydown',keys,true)},{once:true});
 return close;
}
