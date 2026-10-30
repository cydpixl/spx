export const SPORTS_DATA='https://spex-sports-data.cydpixl7.workers.dev';
// Public schedule data is independent of stream listings; games without a source remain visible.
export const scheduleLeagues=[
 ['basketball/nba','basketball','NBA'],['basketball/wnba','basketball','WNBA'],['basketball/mens-college-basketball','basketball','NCAA Basketball','50'],
 ['football/nfl','american-football','NFL'],['football/college-football','american-football','NCAA Football','80'],['baseball/mlb','baseball','MLB'],['hockey/nhl','hockey','NHL'],
 ['soccer/eng.1','football','Premier League'],['soccer/esp.1','football','LaLiga'],['soccer/ger.1','football','Bundesliga'],['soccer/ita.1','football','Serie A'],['soccer/fra.1','football','Ligue 1'],['soccer/usa.1','football','MLS'],['soccer/uefa.champions','football','Champions League']
];
export function normalizeSchedule(data,[path,category,league],month){
 if(!Array.isArray(data.events))throw Error('Invalid schedule');
 return data.events.map(e=>{const c=e.competitions?.[0],teams=(c?.competitors||[]).map(t=>({name:t.team?.displayName||t.team?.name||'',badge:t.team?.logo||''}));return {id:'schedule-'+month.replace('-','')+'-'+path.replaceAll('/','-')+'-'+e.id,title:teams.length===2?teams.map(t=>t.name).join(' vs '):e.name,category,league,date:Date.parse(e.date)||0,live:e.status?.type?.state==='in',status:e.status?.type?.state||'pre',teams,sources:[],scheduleURL:e.links?.find(l=>l.href?.startsWith('https://www.espn.com/'))?.href||'',schedule:true}}).filter(e=>e.id&&e.title&&e.date);
}
export async function loadTeamSchedules(month,json,onProgress=()=>{}){
 const items=[],results=[];let cursor=0;
 await Promise.all(Array.from({length:4},async()=>{while(cursor<scheduleLeagues.length){const league=scheduleLeagues[cursor++];try{const data=await json(SPORTS_DATA+'/schedule?league='+encodeURIComponent(league[0])+'&month='+month);const normalized=normalizeSchedule(data,league,month);items.push(...normalized);results.push({name:league[2],count:normalized.length})}catch{results.push({name:league[2],error:true})}onProgress([...items],[...results])}}));
 return {items,results};
}
export function ppvSources(m){return [m,...(Array.isArray(m.substreams)?m.substreams:[])].filter(s=>s.iframe).map(s=>({provider:'PPV',name:s.source_tag||s.tag||'Main broadcast',language:s.locale||'',url:s.iframe,sandbox:false}))}

export function normalizeStreamFree(data){
 if(!data.streams||typeof data.streams!=='object')throw Error('Invalid StreamFree feed');
 const categories={soccer:'football',nfl:'american-football',nba:'basketball',nhl:'hockey',mma:'fight',f1:'motor-sports'};
 return Object.entries(data.streams).flatMap(([category,items])=>(Array.isArray(items)?items:[]).filter(m=>/^[a-zA-Z0-9_-]{1,180}$/.test(m.stream_key||'')).map(m=>({id:'streamfree-'+m.id,title:m.name,category:categories[category]||category,league:m.league,date:Number(m.match_timestamp)*1000||0,live:!!m.match_timestamp&&Number(m.match_timestamp)*1000<=Date.now(),teams:[m.team1,m.team2].filter(Boolean).map(t=>({name:t.name,badge:t.logo||''})),sources:[{provider:'StreamFree',category,sourceId:m.stream_key}]})));
}
