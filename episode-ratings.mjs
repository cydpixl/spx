import {createFilterMenu} from './filter-menu.mjs?v=20261111-ui94';
const bands = [
 ['excellent', '9.0+'],
 ['great', '8.0–8.9'],
 ['good', '7.0–7.9'],
 ['mixed', '6.0–6.9'],
 ['low', 'Below 6.0'],
 ['unrated', 'Unrated']
];

export function episodeRating(episode) {
 const score = Number(episode.rating);
 return Number(episode.votes) > 0 && Number.isFinite(score) && score > 0 && score <= 10 ? score : null;
}

function scoreBadge(score) {
 const index = score === null ? 5 : score >= 9 ? 0 : score >= 8 ? 1 : score >= 7 ? 2 : score >= 6 ? 3 : 4;
 return '<span class="episode-rating-score" data-score-band="' + bands[index][0] + '">' + (score === null ? 'Unrated' : score.toFixed(1)) + '</span>';
}

function seasonStats(episodes) {
 const rated = episodes.filter(episode => episodeRating(episode) !== null);
 const top = rated.reduce((best, episode) => !best || episodeRating(episode) > episodeRating(best) ? episode : best, null);
 return { top, count: rated.length, average: rated.length ? rated.reduce((sum, episode) => sum + episodeRating(episode), 0) / rated.length : null };
}

export function showEpisodeRatings(item, { app, openDialog, closeDialog, normalizeLinks, seasonEpisodes, esc, spoilers, icon }) {
 const seasons = (item.seasons || []).map(season => season.seasonNumber).filter(season => season > 0);
 const current = Number(app.querySelector('#remoteSeason')?.value);
 let selection = seasons.includes(current) ? current : seasons[0];
 let request = 0;
 const cache = new Map();

 const dialog = openDialog('Episode ratings', '<p class="ratings-title">' + esc(item.title) + '</p><p class="ratings-source">TMDB audience scores out of 10</p>' +
  (seasons.length ? '<div class="ratings-toolbar"><button type="button" data-ratings-season></button><div class="ratings-step"><button type="button" data-ratings-prev aria-label="Previous season">' + icon('left') + '</button><button type="button" data-ratings-next aria-label="Next season">' + icon('right') + '</button></div></div>' +
  '<div class="rating-legend" aria-label="Rating scale">' + bands.map(([band, label]) => '<span><i data-score-band="' + band + '"></i>' + label + '</span>').join('') + '</div>' : '') +
  '<div class="ratings-results" aria-busy="false"></div>', 'ratings-dialog');
 const host = dialog.querySelector('.ratings-results');

 if (!seasons.length) {
  host.textContent = 'No seasons are available.';
  return;
 }

 const select = dialog.querySelector('[data-ratings-season]');
 const previous = dialog.querySelector('[data-ratings-prev]');
 const next = dialog.querySelector('[data-ratings-next]');
 const retry = '<button type="button" class="subtle-pill" data-ratings-retry>Try again</button>';

 function load(season) {
  if (!cache.has(season)) {
   const pending = seasonEpisodes(item, season).catch(error => {
    cache.delete(season);
    throw error;
   });
   cache.set(season, pending);
  }
  return cache.get(season);
 }

 async function compare() {
  const results = [];
  for (let offset = 0; offset < seasons.length && dialog.open; offset += 5) {
   const batch = seasons.slice(offset, offset + 5);
   results.push(...await Promise.all(batch.map(async season => {
    try { return { season, episodes: await load(season) }; }
    catch { return { season, episodes: null }; }
   })));
  }
  return results;
 }

 function drawSeason(season, episodes) {
  const { top, count, average } = seasonStats(episodes);
  const summary = '<div class="ratings-summary"><div><small>Season average</small>' + scoreBadge(average) +
   '</div><div><small>Highest rated</small><strong>' + (top ? 'E' + top.number + ' · ' + episodeRating(top).toFixed(1) : '—') +
   '</strong></div><div><small>Rated episodes</small><strong>' + count + ' of ' + episodes.length + '</strong></div></div>';
  if (!episodes.length) return summary + '<p role="status">No episodes are available for this season.</p>';

  return summary + '<ol class="ratings-episodes" aria-label="Season ' + season + ' episodes">' +
   episodes.map(episode => '<li><a data-ratings-watch href="/watch/' + encodeURIComponent(item.id) + '/' + season + '/' + episode.number +
    '"><span class="rating-episode-number">E' + episode.number + '</span><span class="rating-episode-name"><strong>' +
    (spoilers ? 'Episode ' + episode.number : esc(episode.title || 'Episode ' + episode.number)) +
    '</strong><small>' + (Number(episode.votes) || 0).toLocaleString() + ' votes</small></span>' +
    scoreBadge(episodeRating(episode)) + '</a></li>').join('') + '</ol>';
 }

 function drawComparison(results) {
  const failed = results.filter(result => !result.episodes).length;
  if (failed === results.length) return '<p role="status">Ratings are temporarily unavailable.</p>' + retry;
  return (failed ? '<p role="status">Some seasons could not load.</p>' + retry : '') +
   '<ul class="ratings-comparison" aria-label="Season averages">' + results.map(({ season, episodes }) => {
    const stats = episodes && seasonStats(episodes);
    return '<li><button type="button" data-ratings-open="' + season + '"><span><strong>Season ' + season + '</strong><small>' +
     (stats ? stats.count + ' of ' + episodes.length + ' episodes rated' : 'Temporarily unavailable') +
     '</small></span>' + (stats ? scoreBadge(stats.average) : '<span aria-hidden="true">—</span>') + '</button></li>';
   }).join('') + '</ul>';
 }

 async function draw() {
  const id = ++request;
  const season = selection;
  const index = seasons.indexOf(season);
  picker.refresh();
  previous.disabled = index <= 0;
  next.disabled = index < 0 || index >= seasons.length - 1;
  host.setAttribute('aria-busy', 'true');
  host.innerHTML = '<p role="status">Loading ratings…</p>';
  let content;
  try {
   content = season === 'all' ? drawComparison(await compare()) : drawSeason(season, await load(season));
  } catch {
   content = '<p role="status">This season’s ratings are temporarily unavailable.</p>' + retry;
  }
  if (!dialog.open || id !== request) return;
  host.innerHTML = content;
  host.setAttribute('aria-busy', 'false');
  normalizeLinks();
 }

 function choose(value) {
  selection = value;
  void draw();
 }
 const picker=createFilterMenu({button:select,label:'View episode ratings by season',options:()=>[['all','Compare seasons'],...seasons.map(n=>[String(n),'Season '+n])],value:()=>String(selection),onChange:value=>choose(value==='all'?'all':Number(value)),container:dialog});
 dialog.addEventListener('close',()=>picker.destroy(),{once:true});
 previous.onclick = () => choose(seasons[seasons.indexOf(selection) - 1]);
 next.onclick = () => choose(seasons[seasons.indexOf(selection) + 1]);
 host.onclick = event => {
  const button = event.target.closest('button');
  if (button?.matches('[data-ratings-retry]')) {
   select.focus();
   void draw();
  }
  if (button?.matches('[data-ratings-open]')) {
   select.focus();
   choose(Number(button.dataset.ratingsOpen));
  }
  if (event.target.closest('[data-ratings-watch]') && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) closeDialog();
 };
 void draw();
}
