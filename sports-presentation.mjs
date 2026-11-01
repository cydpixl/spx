const aliases={BINTV:'Alpha',Streamed:'Bravo',PPV:'Charlie',Matchora:'Delta',StreamFree:'Echo'};
export const sourceName=source=>aliases[source.provider]||'Foxtrot';
const KEY='spex.sports.source-feedback.v1',TTL=7*86400000;
function read(){try{const data=JSON.parse(localStorage.getItem(KEY)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{}}catch{return {}}}
export function sportsRating(source,now=Date.now()){
 const entry=read()[source.url];
 const recent=entry&&Number.isFinite(entry.at)&&now-entry.at<TTL;
 // Ratings are advisory, never inferred from an iframe load event.
 const value=recent?(entry.result==='playing'?4:1):source.provider==='Matchora'?1.5:2.5;
 return {value,reason:recent?(entry.result==='playing'?'You reported working playback':'You reported a playback problem'):(source.provider==='Matchora'?'An advertising redirect was observed in an earlier sample; this stream is untested':'This stream is untested'),reported:!!recent};
}
export function reportPlayback(source,result){if(!source.url||!['playing','error'].includes(result))return;const now=Date.now(),data=read();data[source.url]={result,at:now};try{localStorage.setItem(KEY,JSON.stringify(Object.fromEntries(Object.entries(data).filter(([,e])=>e&&now-e.at<TTL).slice(-150))))}catch{}}
export function ratingMarkup(source){const {value,reason,reported}=sportsRating(source);return `<span class="sports-rating" aria-label="${value} out of 5 stars. ${reason}" title="${reason}"><span class="sports-stars" aria-hidden="true"><span>★★★★★</span><span style="width:${value/5*100}%">★★★★★</span></span><small>${value.toFixed(1)}<span class="sports-rating-context"> / 5 · ${reported?'Your report':'Untested'}</span></small></span>`}
