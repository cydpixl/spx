import { SPORTS_DATA } from './sports-data.mjs?v=20261029-sports78';
import { matchOfficialGame } from './sports-event-state.mjs?v=20261111-ui92';

const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key = game => game.leaguePath + ':' + game.id;
const image = (url, cls='') => typeof url === 'string' && /^https:\/\//i.test(url) ? '<img class="' + cls + '" src="' + esc(url) + '" loading="lazy" alt="">' : '';
const teamImage = team => image(team?.badge || team?.logo || team?.logos?.[0]?.href,'watch-team-logo');
const table = (heading, headers, rows) => '<div class="watch-stats-table" role="region" tabindex="0" aria-label="' + esc(heading) + '"><table><caption class="sr-only">' + esc(heading) +
 '</caption><thead><tr>' + headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
const teamLabel = team => '<span class="watch-team-label">' + teamImage(team) + esc(team?.shortDisplayName || team?.displayName || team?.name || 'Team') + '</span>';
const noData = message => '<p class="watch-stats-message" role="status">' + message + '</p>';

function renderBox(summary, teams) {
 const players = summary.boxscore?.players || [];
 const competitors = summary.header?.competitions?.[0]?.competitors || [];
 const max = Math.max(0,...competitors.map(team => team.linescores?.length || 0));
 if (!max) return noData(players.length?'Period scoring is unavailable. Open Player stats for the published box score.':'The box score will appear as the game updates.');
 const columns = Array.from({length:max},(_,i)=>competitors.find(team=>team.linescores?.[i]?.label)?.linescores[i].label || String(i+1));
 return table('Scoring by period',['Team',...columns,'Total'],competitors.map((team,i)=>'<tr><th scope="row">' + teamLabel(team.team || teams[i]) + '</th>' +
  columns.map((_,period)=>'<td>' + esc(team.linescores?.[period]?.displayValue ?? team.linescores?.[period]?.value ?? '—') + '</td>').join('') +
  '<td><strong>' + esc(team.score ?? teams[i]?.score ?? '—') + '</strong></td></tr>'));
}

function renderPlayers(summary) {
 return (summary.boxscore?.players || []).map(team => {
  const groups = (team.statistics || []).filter(group=>group.athletes?.length && group.labels?.length);
  return groups.length ? '<section class="watch-stat-group"><h4>' + teamLabel(team.team) + '</h4>' +
   groups.map(group=> table(team.team?.displayName + ' ' + (group.name || 'player stats'), ['Player',...group.labels], group.athletes.map(entry => {
    const player = entry.athlete;
    const headshot = image(player?.headshot?.href || player?.headshot,'watch-player-photo');
    return '<tr><th scope="row"><span class="watch-team-label">' + headshot + esc(player?.shortName || player?.displayName || 'Player') + '</span></th>' +
     group.labels.map((_,i)=>'<td>' + esc(entry.stats?.[i] ?? '—') + '</td>').join('') + '</tr>';
   }))).join('') + '</section>' : '';
 }).join('') || noData('Player stats will appear when published.');
}

function renderTeams(summary) {
 const teams = (summary.boxscore?.teams || []).filter(team=>team.statistics?.length);
 const labels = new Map();
 for (const team of teams) for (const stat of team.statistics) if (stat.name || stat.label) labels.set(stat.name || stat.label,stat.label || stat.name);
 if (!labels.size) return noData('Team stats will appear when published.');
 return table('Team statistics',['Stat', ...teams.map(team=>team.team?.abbreviation || team.team?.shortDisplayName || 'Team')],
  [...labels].map(([name,label])=>'<tr><th scope="row">' + esc(label) + '</th>' + teams.map(team => {
   const stat=team.statistics.find(stat=>(stat.name || stat.label)===name);
   return '<td>' + esc(stat?.displayValue ?? stat?.value ?? '—') + '</td>';
  }).join('') + '</tr>'));
}

export function mountWatchStats(host, { event, getEvents, getScores, onSwitch }) {
 const controller = new AbortController();
 let selected = '', current, summary, tab = 'box', ticket = 0, pending = false, unavailable = false;
 let statsRequest;
 host.innerHTML = '<header class="watch-stats-heading"><h3>Game center</h3><span data-watch-refresh></span></header>' +
  '<div class="watch-score-strip" aria-label="Today’s games"></div><section class="watch-game-details"><header class="watch-game-header"></header>' +
  '<div class="watch-stats-tabs" role="group" aria-label="Game stats"><button type="button" data-watch-tab="box">Box score</button>' +
  '<button type="button" data-watch-tab="players">Player stats</button><button type="button" data-watch-tab="teams">Team stats</button></div>' +
  '<div class="watch-stats-body"></div></section>';
 const scores = host.querySelector('.watch-score-strip');
 const heading = host.querySelector('.watch-game-header');
 const content = host.querySelector('.watch-stats-body');
 const stamp = host.querySelector('[data-watch-refresh]');
 let rows = [], updated = 0, stripSignature = '';

 function eventFor(game) {
  const games = getScores();
  return getEvents().find(stream => stream.sources?.length && key(matchOfficialGame(stream,games) || {})===key(game));
 }

 function draw() {
  if (controller.signal.aborted) return;
  const strip = rows.map(game => {
   const id = key(game);
   return '<button type="button" data-watch-game="' + esc(id) + '" aria-pressed="' + (id===selected) + '" class="watch-score-card"><small>' +
    esc(game.league) + ' · ' + esc(game.detail || game.state || '') + '</small>' + game.teams.map(team => '<span>' + teamLabel(team) +
     '<b>' + esc(game.state==='pre'?'—':team.score) + '</b></span>').join('') + '</button>';
  }).join('') || noData('Today’s scores will appear here when available.');
  if (strip !== stripSignature) {
   const focus = scores.contains(document.activeElement) ? document.activeElement.dataset.watchGame : '';
   scores.innerHTML = strip;
   stripSignature = strip;
   if (focus) [...scores.querySelectorAll('button')].find(button=>button.dataset.watchGame===focus)?.focus({preventScroll:true});
  }
  stamp.textContent = updated ? 'Updated ' + new Date(updated).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}) : '';
  for (const button of host.querySelectorAll('[data-watch-tab]')) button.setAttribute('aria-pressed',String(button.dataset.watchTab===tab));
  const shown = current || {title:event.title,teams:event.teams || []};
  const active = matchOfficialGame(event,getScores());
  const other = current && (!active || key(active)!==key(current));
  const stream = other && eventFor(current);
  const scoreTeams = summary?.header?.competitions?.[0]?.competitors?.map(competitor => ({...competitor.team,score:competitor.score})) || shown.teams;
  const header = '<div><small>' + esc(other?'Browsing another game':'Current broadcast') + '</small><h4>' + esc(shown.title) + '</h4>' +
   '<div class="watch-game-teams">' + scoreTeams.map(team=>'<span>' + teamLabel(team) + (team.score!=null?' <strong>'+esc(team.score)+'</strong>':'') + '</span>').join('') + '</div></div>' +
   (stream?'<button class="play-action" type="button" data-watch-switch>Switch stream</button>':other?'<small>Stream unavailable</small>':'');
  if (heading.innerHTML !== header) heading.innerHTML = header;
  if (stream) heading.querySelector('button').onclick=()=>onSwitch(stream);
  const stats = summary ? ({box:()=>renderBox(summary,scoreTeams),players:()=>renderPlayers(summary),teams:()=>renderTeams(summary)})[tab]() :
   noData(pending?'Loading game stats…':unavailable?'Game stats are temporarily unavailable. Retrying shortly.':current?'Game stats are not published yet.':'Stats are unavailable for this broadcast. Select a game above to browse its stats.');
  if (content.dataset.markup !== stats) {
   const offsets = [...content.querySelectorAll('.watch-stats-table')].map(node=>node.scrollLeft);
   content.innerHTML = stats;
   content.dataset.markup = stats;
   content.querySelectorAll('.watch-stats-table').forEach((node,i)=>{node.scrollLeft=offsets[i]||0});
  }
 }

 async function fetchSummary() {
  if (!current || controller.signal.aborted || pending || document.hidden) return;
  const request = ++ticket;
  statsRequest?.abort();
  statsRequest = new AbortController();
  const game = current;
  pending = true;
  draw();
  try {
   const params = new URLSearchParams({league:game.leaguePath,id:game.id});
   const response = await fetch(SPORTS_DATA+'/summary?'+params,{signal:AbortSignal.any([controller.signal,statsRequest.signal,AbortSignal.timeout(10000)])});
   if (!response.ok) throw Error();
   const data = await response.json();
   if (ticket !== request) return;
   summary = data;
   unavailable = false;
   updated = Date.now();
  } catch {
   if (ticket === request) unavailable = true;
  } finally {
   if (ticket === request) { pending = false; draw(); }
  }
 }

 function select(game) {
  if (!game || key(game)===selected) return;
  selected=key(game);
  current=game;
  ticket++;
  statsRequest?.abort();
  summary=null;
  unavailable=false;
  pending=false;
  updated=0;
  draw();
  void fetchSummary();
 }

 function refresh() {
  const all = getScores().filter(game=>game.id && game.leaguePath && game.teams?.length===2);
  const active = matchOfficialGame(event,all);
  rows = [active,...all.filter(game=>game!==active).sort((a,b)=>Number(b.state==='in')-Number(a.state==='in') || Number(b.leaguePath===active?.leaguePath)-Number(a.leaguePath===active?.leaguePath))].filter(Boolean);
  if (current) current = rows.find(game=>key(game)===selected) || current;
  if (!selected && active) select(active);
  else draw();
 }
 scores.addEventListener('click',e=>{const id=e.target.closest('[data-watch-game]')?.dataset.watchGame;if(id)select(rows.find(game=>key(game)===id))});
 host.querySelector('.watch-stats-tabs').onclick=e=>{const next=e.target.closest('[data-watch-tab]')?.dataset.watchTab;if(next){tab=next;draw()}};
 const timer = setInterval(fetchSummary,20000);
 const wake = () => { if (!document.hidden) void fetchSummary(); };
 document.addEventListener('visibilitychange',wake);
 refresh();
 return { refresh, destroy(){controller.abort();statsRequest?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',wake)} };
}
