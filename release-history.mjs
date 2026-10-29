const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function renderReleaseHistory({app,normalizeLinks},current=()=>app.isConnected){
 document.title='Devlog · Spex';
 app.innerHTML='<section class="release-page"><header class="release-heading"><span class="release-eyebrow">SPEX CHANGELOG</span><h1>Devlog & release updates</h1><p>Features, improvements, and fixes, release by release.</p></header><div class="release-body" role="status">Loading release history…</div></section>';
 const root=app.querySelector('.release-page');
 try {
  const response=await fetch(new URL('releases.json',document.baseURI),{cache:'no-store'});if(!response.ok)throw Error('Release history is temporarily unavailable.');
  const {releases}=await response.json();if(!root.isConnected||!current())return;
  if(!Array.isArray(releases)||!releases.length)throw Error('No release notes are available yet.');
  const body=root.querySelector('.release-body');body.removeAttribute('role');
  body.innerHTML=`<div class="release-toolbar"><label><span class="sr-only">Search release notes</span><input type="search" data-release-search placeholder="Search changes and fixes…" aria-label="Search release notes"></label><span data-release-count role="status"></span></div><div class="release-timeline"></div>`;
  const list=body.querySelector('.release-timeline');
  function draw(){const q=body.querySelector('input').value.trim().toLowerCase(),filtered=releases.filter(r=>JSON.stringify(r).toLowerCase().includes(q));body.querySelector('[data-release-count]').textContent=filtered.length+' release'+(filtered.length===1?'':'s');
   list.innerHTML=filtered.map(r=>`<article class="release-entry" id="release-${esc(r.version)}"><div class="release-date"><time datetime="${esc(r.date)}">${new Date(r.date+'T12:00:00').toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})}</time>${r===releases[0]?'<span class="release-current">Latest</span>':''}</div><div class="release-detail"><a class="release-version" href="${new URL('updates',document.baseURI).pathname}#release-${esc(r.version)}">${esc(r.version)}</a><h2>${esc(r.title)}</h2>${r.summary?'<p>'+esc(r.summary)+'</p>':''}${r.sections.map(s=>`<section><h3>${esc(s.title)}</h3><ul>${s.changes.map(c=>'<li>'+esc(c)+'</li>').join('')}</ul></section>`).join('')}${r.commit?'<a class="release-commit" target="_blank" rel="noopener noreferrer" href="https://github.com/cydpixl/spx/commit/'+esc(r.commit)+'">View source changes</a>':''}</div></article>`).join('')||'<p class="release-empty">No changes match this search. Try another term.</p>';
  }
  body.querySelector('input').oninput=draw;draw();normalizeLinks();if(location.hash)requestAnimationFrame(()=>document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({block:'start'}));
 }catch(error){if(root.isConnected){root.querySelector('.release-body').innerHTML='<p>'+esc(error.message)+'</p><button class="subtle-pill" data-release-retry>Retry</button>';root.querySelector('[data-release-retry]').onclick=()=>renderReleaseHistory({app,normalizeLinks},current)}}
}
