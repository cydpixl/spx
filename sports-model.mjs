export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const https=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}};
export function sportsTeamLogo({logo,name,abbreviation}){
 const label=name||abbreviation||'Unknown opponent';
 const fallback=abbreviation||name?.trim().split(/\s+/).at(-1).slice(0,3).toUpperCase()||'—';
 const image=https(logo);
 return `<span class="sp-team-logo" title="${esc(label)}">${image?`<img src="${esc(image)}" alt="${esc(label)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false">`:''}<span role="img" aria-label="${esc(label)}"${image?' hidden':''}>${esc(fallback)}</span></span>`;
}
export function normalizeAthlete(a,{leaguePath='basketball/nba',team={}}={}){const current=a.teams?.find(t=>String(t.id)===String(a.teamId))||a.team||a.teams?.[0]||team;return {id:leaguePath+':'+a.id,athleteId:String(a.id),name:a.displayName||a.fullName||'',photo:https(a.headshot?.href),position:a.position?.abbreviation||'',jersey:a.jersey||'',teamId:String(current.id||a.teamId||team.teamId||''),teamName:current.displayName||team.name||current.name||a.teamName||'Team unavailable',teamBadge:https(current.logos?.[0]?.href||a.teamLogos?.[0]?.href||team.badge),leaguePath,category:leaguePath.startsWith('basketball/')?'basketball':team.category};}
export function teamLine(p){return `<span class="sp-player-team">${p.teamBadge?`<img src="${esc(p.teamBadge)}" alt="" loading="lazy" onerror="this.hidden=true">`:''}<span>${esc(p.teamName||'Team unavailable')}</span></span>`}
export const readLocal=(k,fallback)=>{try{const v=JSON.parse(localStorage.getItem(k));return Array.isArray(fallback)?(Array.isArray(v)?v:fallback):fallback&&typeof fallback==='object'?(v&&typeof v==='object'&&!Array.isArray(v)?v:fallback):v??fallback}catch{return fallback}};
export const writeLocal=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
export function flattenStandings(data){return data.standings?[{...data.standings,name:data.name||data.standings.displayName||'Standings'}]:(data.children||[]).flatMap(flattenStandings)}
export function trackerValue(row,label){const i=row.labels?.indexOf(label);const raw=i>=0?row.stats?.[i]:null,n=raw!==null&&raw!==undefined&&String(raw).trim()!==''?Number(raw):NaN;return Number.isFinite(n)?n:null}
