const MAX_GIF = 96 * 1024;
const allowedData = /^data:image\/(?:gif|jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bound = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.max(min,Math.min(max,Number(value))) : fallback;

export function profileImage(value) {
 if (typeof value !== 'string' || value.length > 140000) return '';
 if (allowedData.test(value)) return value;
 try {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password && url.href.length <= 2048 ? url.href : '';
 } catch { return ''; }
}

export function normalizeProfile(value = {}) {
 return {
  avatar:profileImage(value?.avatar), banner:profileImage(value?.banner),
  x:bound(value?.x,0,100,50), y:bound(value?.y,0,100,50), zoom:bound(value?.zoom,1,3,1)
 };
}

function readGIF(file) {
 return new Promise((resolve,reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(Error('Could not read the GIF.'));
  reader.onload = () => resolve(reader.result);
  reader.readAsDataURL(file);
 });
}

async function imageFile(file, banner) {
 if (!['image/gif','image/jpeg','image/png','image/webp'].includes(file.type)) throw Error('Choose a JPG, PNG, WebP or GIF image.');
 if (file.size > 12 * 1024 * 1024) throw Error('This image is too large.');
 if (banner && file.type === 'image/gif') {
  if (file.size > MAX_GIF) throw Error('Use an HTTPS image link for GIFs larger than 96 KB.');
  return readGIF(file);
 }
 const image = await createImageBitmap(file);
 const size = banner ? 800 : 384;
 const scale = Math.min(1, size / Math.max(image.width,image.height));
 const canvas = document.createElement('canvas');
 canvas.width = Math.max(1, Math.round(image.width*scale));
 canvas.height = Math.max(1, Math.round(image.height*scale));
 canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
 image.close();
 const compressed = canvas.toDataURL('image/webp', .8);
 if (compressed.length > (banner?100000:52000)) throw Error('This image is too detailed to save. Try a smaller image or an HTTPS link.');
 return compressed;
}

export function mountAccountProfile(host, { user, profile, save }) {
 const initial = normalizeProfile(profile);
 const draft = {...initial};
 host.innerHTML = '<h3>Profile appearance</h3><div class="account-profile-card"><div class="account-profile-banner"><img alt="" hidden></div><div class="account-profile-identity"><div class="account-profile-avatar"><span>' + esc(user.name.slice(0,1).toUpperCase()) +
  '</span><img alt="" hidden></div><div><strong>' + esc(user.name) + '</strong><small>@' + esc(user.username) + '</small></div></div></div>' +
  '<form class="profile-edit-form"><div class="profile-media-fields">' +
  [['avatar','Profile picture'],['banner','Header image or GIF']].map(([key,label]) => '<fieldset><legend>' + label + '</legend><input type="file" data-file-polished data-profile-upload="' + key + '" aria-label="Upload ' + label.toLowerCase() + '" accept="image/jpeg,image/png,image/webp,image/gif"><label>HTTPS image link<input type="url" data-profile-link="' + key + '" placeholder="https://…" maxlength="2048"></label><button type="button" data-profile-remove="' + key + '">Remove</button></fieldset>').join('') +
  '</div><fieldset class="profile-crop" hidden><legend>Adjust profile picture</legend>' +
  [['zoom','Zoom',1,3,.01],['x','Horizontal position',0,100,1],['y','Vertical position',0,100,1]].map(([key,label,min,max,step]) => '<label>' + label + '<input type="range" data-crop="' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + draft[key] + '"></label>').join('') +
  '</fieldset><button type="submit" class="play-action">Save appearance</button><p data-profile-status role="status"></p></form>';
 const status = host.querySelector('[data-profile-status]');
 const form = host.querySelector('form');
 const submit = form.querySelector('[type=submit]');
 const busy = new Set();
 const uploads = {avatar:0,banner:0};
 const control = (type,key) => host.querySelector('[data-profile-' + type + '="' + key + '"]');

 function draw() {
  for (const key of ['avatar','banner']) {
   const img = host.querySelector('.account-profile-' + key + ' img');
   img.hidden = !draft[key];
   if (draft[key] && img.getAttribute('src') !== draft[key]) img.src = draft[key];
   if (!draft[key]) img.removeAttribute('src');
  }
  const avatar = host.querySelector('.account-profile-avatar img');
  avatar.style.objectPosition = draft.x+'% '+draft.y+'%';
  avatar.style.transformOrigin = avatar.style.objectPosition;
  avatar.style.transform = 'scale('+draft.zoom+')';
  host.querySelector('.profile-crop').hidden = !draft.avatar;
 }

 for (const key of ['avatar','banner']) {
  const file = control('upload',key);
  const link = control('link',key);
  const remove = control('remove',key);
  if (draft[key].startsWith('https:')) link.value = draft[key];
  const updateLink = () => {
   const value = link.value.trim();
   const url = value.startsWith('https:') && profileImage(value);
   if (value && !url) { link.setCustomValidity('Enter an HTTPS image link.'); return; }
   link.setCustomValidity('');
   if (value) draft[key] = url;
   else if (draft[key].startsWith('https:')) draft[key] = '';
   draw();
  };
  link.oninput = updateLink;
  file.onchange = async () => {
   const selected = file.files[0];
   if (!selected) return;
   const id = ++uploads[key];
   busy.add(key);
   submit.disabled = true;
   status.textContent = 'Preparing image…';
   try {
    const result = await imageFile(selected,key==='banner');
    if (id !== uploads[key]) return;
    draft[key] = result;
    link.value = '';
    link.setCustomValidity('');
    status.textContent = '';
    draw();
   } catch (error) {
    if (id === uploads[key]) status.textContent = error.message;
   } finally {
    if (id === uploads[key]) {
     busy.delete(key);
     file.value = '';
     submit.disabled = busy.size > 0;
    }
   }
  };
  remove.onclick = () => {
   ++uploads[key];
   busy.delete(key);
   submit.disabled = busy.size > 0;
   draft[key] = '';
   link.value = '';
   link.setCustomValidity('');
   status.textContent = '';
   draw();
  };
 }
 host.querySelectorAll('[data-crop]').forEach(input => {
  input.oninput = () => { draft[input.dataset.crop] = Number(input.value); draw(); };
 });
 form.onsubmit = async event => {
  event.preventDefault();
  submit.disabled = true;
  status.textContent = 'Saving appearance…';
  try { await save(normalizeProfile(draft)); status.textContent = 'Appearance saved.'; }
  catch (error) { status.textContent = error.message; }
  finally { submit.disabled = busy.size > 0; }
 };
 draw();
}
