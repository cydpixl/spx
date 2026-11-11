const KEY = 'spex.welcome.v1';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titleKey = title => title.type + ':' + title.id;
const image = (title, backdrop = false) => {
 const src = title.poster || title.backdrop;
 return typeof src === 'string' && (/^\/[\w.-]+$/.test(src) || src.startsWith('https://image.tmdb.org/')) ? '<img src="' + esc(src.startsWith('/')?'https://image.tmdb.org/t/p/'+(backdrop?'w185':'w342')+src:backdrop?src.replace(/\/t\/p\/w\d+\//,'/t/p/w185/'):src) + '" alt="" draggable="false">' : '';
};
const features = [
 ['showSports', 'Sports', 'Live broadcasts, scores, and game stats'],
 ['showReading', 'Reading', 'Manga and books'],
 ['showMultiview', 'Multiview', 'Watch multiple feeds together']
];

export function startWelcome({ read, write, settings, themes, metadata, catalog, remember, previewTheme, finish, community, force=false }) {
 if ((!force&&read(KEY,false)) || document.querySelector('.welcome-dialog')) return;
 const dialog = document.createElement('dialog');
 dialog.className = 'welcome-dialog';
 dialog.setAttribute('aria-labelledby', 'welcome-heading');
 dialog.innerHTML = '<div class="welcome-wall" aria-hidden="true"></div><main class="welcome-panel"><header><img src="favicon.png" alt=""><span>SPEX</span><span data-welcome-step></span></header><div class="welcome-body"></div></main>';
 document.body.append(dialog);
 const panel = dialog.querySelector('.welcome-panel');
 const body = dialog.querySelector('.welcome-body');
 const choices = new Map();
 let step = 0, theme = settings.theme, pendingTheme = theme, leaving=false, accountStarted=false;
 let picks = {}, trending = [], results = [], sequence = 0, searchTimer;
 let status = 'Loading trending titles…';
 for (const [key] of features) picks[key] = settings[key];

 async function finishWelcome(skip=false) {
  if(leaving)return;
  leaving=true;write(KEY,true);
  window.removeEventListener('outlaw-auth',authChanged);
  clearTimeout(searchTimer);
  if(skip){previewTheme(settings.theme);}else{
   dialog.classList.add('welcome-leaving');
   dialog.querySelector('.welcome-panel').inert=true;
   const splash=document.createElement('div');splash.className='welcome-finish';splash.innerHTML='<img src="favicon.png" alt="Spex">';dialog.append(splash);
   if(settings.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches)await new Promise(resolve=>setTimeout(resolve,420));
   finish({theme,...picks},[...choices.values()].map(remember));
   if(settings.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches){splash.classList.add('welcome-finish-away');await new Promise(resolve=>setTimeout(resolve,310));}
  }
  dialog.close();dialog.remove();window.dispatchEvent(new Event('spex-welcome-complete'));
 }

 function authChanged() {
  if(step===3&&community.getUser()){if(accountStarted)void finishWelcome();else draw(false);}
 }

 function draw(animate = true) {
  dialog.querySelector('[data-welcome-step]').textContent = (step + 1) + ' / 4';
  const title = ['Welcome to Spex', 'Pick five favorites', 'Make Spex yours', 'You’re ready to watch'][step];
  const copy = ['Choose a theme to get started.', 'Choose five movies and shows you like. Spex uses them to recommend titles in For You.', 'Choose what appears in your grid menu. You can change this in Settings.', 'Create an account to sync your library, or get started as a guest.'][step];
  const content = [
   () => '<div class="welcome-themes" role="group" aria-label="Theme">' + themes.map(name => '<button type="button" data-theme-name="' + esc(name) + '" aria-pressed="' + (name === theme) + '">' + esc(name) + '</button>').join('') + '</div>',
   () => '<label class="welcome-search">Search movies and shows<input type="search" placeholder="Search titles…" autocomplete="off"></label><div class="welcome-picked"></div><div class="welcome-results"></div>',
   () => '<div class="welcome-features">' + features.map(([key,name,detail]) => '<label><span><strong>' + name + '</strong><small>' + detail + '</small></span><input type="checkbox" role="switch" data-welcome-feature="' + key + '"' + (picks[key]?' checked':'') + '></label>').join('') + '</div>',
   () => community.getUser() ? '<p class="welcome-account">Signed in as <strong>' + esc(community.getUser().name) + '</strong></p>' : '<div class="welcome-account"><button type="button" class="play-action" data-welcome-account="register">Create an account</button><button type="button" class="subtle-pill" data-welcome-account="login">Sign in</button></div>'
  ][step]();
  body.innerHTML = '<h1 id="welcome-heading" tabindex="-1">' + title + '</h1><p>' + copy + '</p>' + content +
   '<footer>' + (step ? '<button type="button" data-welcome-back>Back</button>' : '<span></span>') +
   '<button type="button" class="play-action" data-welcome-next>' + (step < 3 ? 'Next' : community.getUser() ? 'Start watching' : 'Continue as guest') + '</button></footer>';
  if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches && settings.motion) body.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'ease-out'});
  body.querySelector('[data-welcome-back]')?.addEventListener('click', () => { step--; draw(); });
  body.querySelector('[data-welcome-next]').onclick = () => {
   if (step === 3) { finishWelcome(); return; }
   step++; draw();
  };
  body.querySelectorAll('[data-theme-name]').forEach(button => {
   button.onclick = () => {
    theme = button.dataset.themeName;
    if (theme !== pendingTheme) { previewTheme(theme); pendingTheme = theme; }
    body.querySelectorAll('[data-theme-name]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
   };
  });
  body.querySelectorAll('[data-welcome-feature]').forEach(input => {
   input.onchange = () => { picks[input.dataset.welcomeFeature] = input.checked; };
  });
  body.querySelectorAll('[data-welcome-account]').forEach(button => {
   button.onclick = () => {accountStarted=true;community.signIn(button.dataset.welcomeAccount);};
  });
  if (step === 1) {
   const search = body.querySelector('input');
   results = trending;
   search.oninput = () => {
    const query = search.value.trim();
    const request = ++sequence;
    clearTimeout(searchTimer);
    if (!query) { results = trending; renderResults(); return; }
    results = trending.filter(title => title.title.toLowerCase().includes(query.toLowerCase()));
    renderResults('Searching…');
    searchTimer = setTimeout(async () => {
     try {
      const data = await metadata('/api/movie-discover', {tab:'search', q:query});
      if (request !== sequence || !search.isConnected) return;
      results = (data.items || []).filter(title => ['movie','tv','series'].includes(title.type));
      renderResults('No matching titles.');
     } catch {
      if (request === sequence && search.isConnected) renderResults('Search is unavailable. Try typing again.');
     }
    },250);
   };
   renderResults();
  }
  panel.scrollTop = 0;
  body.querySelector('h1').focus({preventScroll:true});
 }

 function renderResults(message = status) {
  const host = body.querySelector('.welcome-results');
  if (!host) return;
  const picked = body.querySelector('.welcome-picked');
  picked.innerHTML = '<strong>' + choices.size + ' of 5 selected</strong>' + [...choices].map(([key,title]) =>
   '<button type="button" data-remove="' + esc(key) + '" aria-label="Remove ' + esc(title.title) + '">' + esc(title.title) + ' <span aria-hidden="true">×</span></button>').join('');
  const next=body.querySelector('[data-welcome-next]');
  const partial = status !== 'Loading trending titles…' && trending.length < 5;
  next.disabled = choices.size !== 5 && !partial;
  next.textContent = partial && choices.size !== 5 ? 'Continue' : 'Next';
  const visible = [...new Map(results.map(title => [titleKey(title),title])).values()].slice(0,20);
  host.innerHTML = visible.length ? visible.map((title,i) => '<button type="button" data-pick="' + i + '" aria-label="' + esc(title.title) + '" aria-pressed="' + choices.has(titleKey(title)) + '">' + (image(title)||'<span class="welcome-title-name">'+esc(title.title)+'</span>') +
   '<span class="welcome-check" aria-hidden="true">✓</span></button>').join('') :
   '<p role="status">' + esc(message) + '</p>' + (!trending.length && status !== 'Loading trending titles…' ? '<button type="button" class="subtle-pill" data-welcome-retry>Retry trending titles</button>' : '');
  host.querySelector('[data-welcome-retry]')?.addEventListener('click', loadTrending);
  picked.querySelectorAll('[data-remove]').forEach(button => {
   button.onclick = () => { choices.delete(button.dataset.remove); renderResults(message); picked.querySelector('button')?.focus(); };
  });
  host.querySelectorAll('[data-pick]').forEach(button => {
   button.onclick = () => {
    const title = visible[Number(button.dataset.pick)];
    const key = titleKey(title);
    if (choices.has(key)) choices.delete(key);
    else if (choices.size < 5) choices.set(key,title);
    renderResults(message);
    host.querySelector('[data-pick="' + button.dataset.pick + '"]')?.focus({preventScroll:true});
   };
  });
 }

 async function loadTrending() {
  const feeds = await Promise.allSettled(['trending-movies','trending-tv'].flatMap(tab=>[1,2,3,4].map(page=>metadata('/api/movie-discover',{tab,page}))));
  if (!dialog.isConnected) return;
  const pages=feeds.map(feed=>feed.status==='fulfilled'?feed.value.items||[]:[]);
  const movies=pages.slice(0,4).flat(),shows=pages.slice(4).flat();
  const interleaved = Array.from({length:Math.max(movies.length,shows.length)}, (_,i) => [movies[i],shows[i]]).flat().filter(Boolean);
  trending = [...new Map(interleaved.map(title=>[titleKey(title),title])).values()];
  if (!trending.length) trending = catalog.filter(title => title.title);
  status = trending.length ? 'No matching titles.' : 'Trending titles are temporarily unavailable.';
  const art=trending.filter(title=>image(title));
  const wall=dialog.querySelector('.welcome-wall'),rowCount=7;
  if(art.length>=rowCount)wall.innerHTML=Array.from({length:rowCount},(_,i)=>{
   const row=art.filter((_,index)=>index%rowCount===i);const tiles=row.map(title=>image(title,true)).join('');
   return '<div class="welcome-wall-row"><div class="welcome-wall-track">'+tiles.repeat(4)+'</div></div>';
  }).join('');
  if (step === 1 && !body.querySelector('input').value) { results = trending; renderResults(); }
 }

 dialog.addEventListener('cancel',event=>{event.preventDefault();void finishWelcome(true);});
 window.addEventListener('outlaw-auth', authChanged);
 dialog.showModal();
 draw(false);
 void loadTrending();
}
