const observed=new Set(["aniembed", "aniweeb", "nikastream", "xpass", "cinesrc", "screenscape", "cinextream", "vidcore", "superembed", "vidbolt", "vidsrc", "vidzen", "braflix-dev", "yapgrid"]);
export function playbackLabel(provider){return observed.has(provider.id)?'★ Previously played':'○ Playback unverified'}
// Short, dated browser samples; a rating is an observation, not a guarantee for other titles.
const sourceTests={
 yapgrid:['good','Played in restricted mode; no ad or redirect appeared during the short check.','The Avengers'],
 cinesrc:['good','Played in restricted mode; no ad or redirect appeared during the short check.','The Avengers'],
 'braflix-dev':['danger','An advertising link was present and playback did not start after two attempts in restricted mode.','The Avengers'],
 screenscape:['danger','The player stayed blank or loading sources in restricted mode; an ads timer was present.','The Avengers'],
 cinextream:['danger','Playback did not start in restricted mode during the check.','The Avengers'],
 vidcore:['caution','Played in restricted mode, with an advertisement visible in the video.','The Avengers'],
 moviesapi:['danger','Playback did not start after a play attempt in restricted mode.','The Avengers'],
 xpass:['danger','An advertising link was present and playback did not start during the unrestricted check.','The Avengers'],
 vidrift:['danger','The unrestricted player redirected to a casino signup page during the check.','The Avengers'],
 vidnest:['caution','The video played in unrestricted mode, but another video appeared over the player.','The Avengers'],
 vixsrc:['caution','The video played in unrestricted mode; this provider is marked ad-supported.','The Avengers'],
 vidlove:['danger','The player refused to connect during the unrestricted check.','The Avengers'],
 cinezo:['danger','The player refused to connect during the unrestricted check.','The Avengers'],
 aniembed:['danger','Playback did not start after two play attempts in unrestricted mode.','Attack on Titan S1 E1'],
 aniweeb:['danger','The player remained blank during the unrestricted check.','Attack on Titan S1 E1'],
 nikastream:['caution','The episode played in unrestricted mode; this provider is marked ad-supported.','Attack on Titan S1 E1']
};
export function movieRisk(provider,restricted){const sample=sourceTests[provider.id];const fresh=Date.now()<Date.parse('2026-11-03T00:00:00-05:00');if(sample&&fresh){const [level,detail,title]=sample;return {level,label:level==='good'?'Played in test':level==='caution'?'Caution in test':'Problem in test',detail:detail+' Tested '+title+' on October 27. Results may change and vary by title. '+(restricted?'Restricted mode is on.':'This player is unrestricted.')};}if(provider.ads||provider.advertising)return {level:'caution',label:'Ads reported',detail:'This provider is marked ad-supported. Ads or redirects may occur.'};return {level:'unknown',label:'Test out of date',detail:'A current playback and ad check is not available for this source.'};}
export function sportsRisk(source){if(source.provider==='Matchora')return {level:'danger',label:'Provider ad observed',detail:'A deceptive ad overlay and a redirect were observed on one Matchora stream on October 27. Other streams may behave differently. Do not install anything the player advertises.'};return {level:'unknown',label:'Ad behavior unverified',detail:'Ads, redirects and pop-ups may occur. This specific stream has not been verified.'};}
export function riskMarkup(r){const count={danger:1,caution:2,good:4,unknown:0}[r.level]??0;const text=r.label+': '+r.detail;return '<span class="source-signal source-signal--'+r.level+'" role="img" aria-label="'+text.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'" title="'+text.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'">'+[1,2,3,4].map(n=>'<i class="'+(n<=count?'is-on':'')+'"></i>').join('')+'</span>'}
