const media = 'https://spex-profile-media.cydpixl7.workers.dev';
const types = new Set(['image/jpeg','image/png','image/webp','image/gif']);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (n,min,max) => Math.min(max,Math.max(min,n));

export function profileImage(value) {
 if (typeof value !== 'string' || value.length > 140000) return '';
 if (/^data:image\/(?:gif|jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)) return value;
 try {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password && url.href.length <= 2048 ? url.href : '';
 } catch { return ''; }
}

export function normalizeProfile(value = {}) {
 const coordinate=(n,min,max,fallback)=>Number.isFinite(Number(n))?clamp(Number(n),min,max):fallback;
 return {avatar:profileImage(value?.avatar),banner:profileImage(value?.banner),x:coordinate(value?.x,0,100,50),y:coordinate(value?.y,0,100,50),zoom:coordinate(value?.zoom,1,3,1)};
}

export function profileMedia(username,kind) {
 return media + '/media/' + encodeURIComponent(username) + '/' + kind;
}

export function avatarMarkup(user) {
 const initial=esc(user.name?.trim().slice(0,1).toUpperCase()||'?');
 if (!/^[a-z0-9_]{3,24}$/.test(user.username||'')) return '<span>'+initial+'</span>';
 return '<span>'+initial+'</span><img alt="" loading="lazy" decoding="async" src="'+esc(profileMedia(user.username,'avatar')+(sessionStorage.getItem('spex.avatar.version:'+user.username)?'?v='+encodeURIComponent(sessionStorage.getItem('spex.avatar.version:'+user.username)):''))+'" onerror="this.remove()">';
}

function cropAvatar(file) {
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file), dialog=document.createElement('dialog');
  dialog.className='avatar-crop-dialog';
  dialog.setAttribute('aria-labelledby','avatar-crop-title');
  dialog.innerHTML='<h2 id="avatar-crop-title">Adjust profile picture</h2><p>Drag to reposition. Scroll or use the zoom buttons.</p><div class="avatar-crop-window" tabindex="0" aria-label="Photo crop. Use arrow keys to pan or plus and minus to zoom."><img alt="" draggable="false"></div><div class="avatar-crop-zoom"><button type="button" data-zoom="-1" aria-label="Zoom out">−</button><output>100%</output><button type="button" data-zoom="1" aria-label="Zoom in">+</button></div><footer><button type="button" data-crop-cancel>Cancel</button><button type="button" class="play-action" data-crop-apply>Apply</button></footer>';
  document.body.append(dialog);
  const frame=dialog.querySelector('.avatar-crop-window'),img=frame.querySelector('img'),output=dialog.querySelector('output');
  const apply=dialog.querySelector('[data-crop-apply]');
  let zoom=1,x=0,y=0,width=0,height=0,size=256,drag;
  apply.disabled=true;
  function redraw() {
   x=clamp(x,-Math.max(0,(width*zoom-size)/2),Math.max(0,(width*zoom-size)/2));
   y=clamp(y,-Math.max(0,(height*zoom-size)/2),Math.max(0,(height*zoom-size)/2));
   Object.assign(img.style,{width:width+'px',height:height+'px',transform:'translate(-50%,-50%) translate('+x+'px,'+y+'px) scale('+zoom+')'});
   output.value=Math.round(zoom*100)+'%';
  }
  function changeZoom(delta) { zoom=clamp(zoom+delta,1,4);redraw(); }
  dialog.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>changeZoom(Number(b.dataset.zoom)*.15));
  frame.addEventListener('wheel',event=>{event.preventDefault();changeZoom(event.deltaY<0?.1:-.1)},{passive:false});
  frame.onpointerdown=event=>{frame.setPointerCapture(event.pointerId);drag={id:event.pointerId,x:event.clientX-x,y:event.clientY-y};};
  frame.onpointermove=event=>{if(drag?.id===event.pointerId){x=event.clientX-drag.x;y=event.clientY-drag.y;redraw();}};
  frame.onlostpointercapture=()=>{drag=null;};
  frame.onkeydown=event=>{
   const moves={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,-8],ArrowDown:[0,8]};
   if(moves[event.key]){event.preventDefault();const [dx,dy]=moves[event.key];x+=dx;y+=dy;redraw();}
   if(['+','=','-'].includes(event.key)){event.preventDefault();changeZoom(event.key==='-'?-.15:.15);}
  };
  const close=()=>dialog.close();
  dialog.addEventListener('close',()=>{URL.revokeObjectURL(url);dialog.remove();resolve(null);},{once:true});
  dialog.querySelector('[data-crop-cancel]').onclick=close;
  img.onerror=()=>{reject(Error('Could not open this image.'));close();};
  img.onload=()=>{
   size=frame.clientWidth;
   const scale=size/Math.min(img.naturalWidth,img.naturalHeight);
   width=img.naturalWidth*scale;height=img.naturalHeight*scale;
   redraw();apply.disabled=false;
  };
  apply.onclick=()=>{
   apply.disabled=true;
   const canvas=document.createElement('canvas');canvas.width=320;canvas.height=320;
   const scale=320/size;
   canvas.getContext('2d').drawImage(img,(size/2+x-width*zoom/2)*scale,(size/2+y-height*zoom/2)*scale,width*zoom*scale,height*zoom*scale);
   canvas.toBlob(blob=>{if(!blob){reject(Error('Could not crop this image.'));close();return;}resolve(blob);close();},'image/webp',.91);
  };
  dialog.showModal();img.src=url;
 });
}

export function mountAccountProfile(host,{user,profile,save}) {
 const legacy=normalizeProfile(profile),initial={}, changes=new Map();
 const previews=new Map();
 const version=()=>Date.now();
 let checking=true;
 host.innerHTML='<h3>Profile appearance</h3><div class="account-profile-card"><div class="account-profile-banner"><img alt="" hidden></div><div class="account-profile-identity"><div class="account-profile-avatar"><span>'+esc(user.name.slice(0,1).toUpperCase())+'</span><img alt="" hidden></div><div><strong>'+esc(user.name)+'</strong><small>@'+esc(user.username)+'</small></div></div></div><form class="profile-edit-form"><div class="profile-media-fields">'+
  [['avatar','Profile picture'],['banner','Header image or GIF']].map(([kind,label])=>'<fieldset><legend>'+label+'</legend><label class="subtle-pill profile-file">Upload image<input type="file" data-file-polished data-profile-upload="'+kind+'" aria-label="Upload '+label.toLowerCase()+'" accept="image/jpeg,image/png,image/webp,image/gif"></label><button type="button" data-profile-remove="'+kind+'">Remove</button></fieldset>').join('')+
  '</div><button type="submit" class="play-action" disabled>Save appearance</button><p data-profile-status role="status"></p></form>';
 const status=host.querySelector('[data-profile-status]'),form=host.querySelector('form'),submit=form.querySelector('[type=submit]');
 function draw(kind) {
  const img=host.querySelector('.account-profile-'+kind+' img');
  const src=changes.has(kind)?previews.get(kind):initial[kind]||legacy[kind];
  if (src) {img.src=src;img.hidden=false;} else {img.removeAttribute('src');img.hidden=true;}
 }
 function revoke(kind) {const url=previews.get(kind);if(url)URL.revokeObjectURL(url);previews.delete(kind);}
 for (const kind of ['avatar','banner']) {
  const input=host.querySelector('[data-profile-upload="'+kind+'"]');
  input.onchange=async()=>{
   const file=input.files[0];input.value='';if(!file)return;
   if(!types.has(file.type)){status.textContent='Choose a JPG, PNG, WebP or GIF image.';return;}
   if(file.size>50*1024*1024){status.textContent='Choose an image up to 50 MB.';return;}
   try {
    const blob=kind==='avatar'?await cropAvatar(file):file;
    if(!blob || !host.isConnected)return;
    revoke(kind);changes.set(kind,blob);previews.set(kind,URL.createObjectURL(blob));status.textContent='';submit.disabled=false;draw(kind);
   } catch(error){status.textContent=error.message;}
  };
  host.querySelector('[data-profile-remove="'+kind+'"]').onclick=()=>{revoke(kind);changes.set(kind,null);submit.disabled=false;draw(kind);};
  draw(kind);
 }
 void Promise.all(['avatar','banner'].map(async kind=>{
  try{const src=profileMedia(user.username,kind);const response=await fetch(src,{method:'HEAD',signal:AbortSignal.timeout(7000)});if(response.ok)initial[kind]=src;}catch{}
  if(host.isConnected)draw(kind);
 })).then(()=>{checking=false;if(host.isConnected&&Object.keys(legacy).some(key=>['avatar','banner'].includes(key)&&legacy[key]&&!initial[key]))submit.disabled=false;});
 form.onsubmit=async event=>{
  event.preventDefault();if(checking)return;
  const controls=[...form.querySelectorAll('button,input')];
  controls.forEach(control=>control.disabled=true);
  status.textContent='Uploading…';
  try {
   for (const kind of ['avatar','banner']) if(!changes.has(kind)&&!initial[kind]&&legacy[kind]){
    try {
     const response=await fetch(legacy[kind],{signal:AbortSignal.timeout(6000)});
     if(!response.ok)throw Error();
     const blob=await response.blob();
     const cropped=kind==='avatar'?await cropAvatar(blob):blob;
     if(cropped)changes.set(kind,cropped);
    } catch { status.textContent='Upload a new file to replace your previous image.';return; }
   }
   for (const [kind,blob] of changes) {
    await save(kind,blob);
    initial[kind]=blob?profileMedia(user.username,kind)+'?v='+version():'';
    legacy[kind]='';revoke(kind);changes.delete(kind);draw(kind);
   }
   status.textContent='Appearance saved.';
  } catch(error){status.textContent=error.message;}
  finally {controls.forEach(control=>control.disabled=false);submit.disabled=!changes.size&&!['avatar','banner'].some(kind=>legacy[kind]&&!initial[kind]);}
 };
}
