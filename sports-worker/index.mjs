import {scheduleLeagues} from '../sports-data.mjs';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff'};
const response=(body,status=200,ttl=0)=>Response.json(body,{status,headers:{...cors,'Cache-Control':ttl?'public, max-age='+ttl:'no-store'}});
async function boundedText(res,max=24000000){if(Number(res.headers.get('content-length'))>max)throw Error('Payload too large');const reader=res.body.getReader();let size=0;const chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max)throw Error('Payload too large');chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}return new TextDecoder().decode(bytes)}
export function upstreamFor(url){
 if(url.pathname==='/schedule'){const league=url.searchParams.get('league'),month=url.searchParams.get('month'),match=scheduleLeagues.find(l=>l[0]===league);if(!match||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month||''))return null;return 'https://site.api.espn.com/apis/site/v2/sports/'+league+'/scoreboard?dates='+month.replace('-','')+'&limit=1000'+(match[3]?'&groups='+match[3]:'')}
 if(url.pathname==='/streamfree')return 'https://strmfree.st/streams';
 if(url.pathname==='/streamfree/sources'){const category=url.searchParams.get('category'),id=url.searchParams.get('id');if(!/^[a-z-]{2,40}$/.test(category||'')||!/^[a-zA-Z0-9_-]{1,180}$/.test(id||''))return null;return 'https://strmfree.st/player/'+category+'/'+id}
 return null;
}
// ESPN caps large month responses at 1,000 games. Read individual dates when the cap is reached.
export async function expandSchedule(upstream,data){
 if(!Array.isArray(data.events)||data.events.length<1000)return data;
 const url=new URL(upstream),month=url.searchParams.get('dates');if(!/^\d{6}$/.test(month||''))return data;
 const days=new Date(Number(month.slice(0,4)),Number(month.slice(4,6)),0).getDate(),events=[];let cursor=1;
 await Promise.all(Array.from({length:4},async()=>{while(cursor<=days){const day=cursor++,daily=new URL(upstream);daily.searchParams.set('dates',month+String(day).padStart(2,'0'));const res=await fetch(daily.href,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000),redirect:'manual'});if(!res.ok)throw Error('Daily schedule unavailable');const payload=JSON.parse(await boundedText(res));if(!Array.isArray(payload.events))throw Error('Invalid daily schedule');events.push(...payload.events)}}));
 return {...data,events:[...new Map(events.map(e=>[e.id,e])).values()]};
}
export default {async fetch(request,env,ctx){
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='GET')return response({error:'Method not allowed'},405);
 const url=new URL(request.url);if(url.pathname==='/health')return response({ok:true,version:'2026.10.29.78'});
 const upstream=upstreamFor(url);if(!upstream)return response({error:'Unknown feed or invalid parameters'},400);
 const cacheURL=new URL(request.url);cacheURL.search='?schema=2&upstream='+encodeURIComponent(upstream);const cacheKey=new Request(cacheURL),cache=caches.default,hit=await cache.match(cacheKey);if(hit)return hit;
 try{const res=await fetch(upstream,{headers:{Accept:url.pathname.endsWith('/sources')?'text/html':'application/json'},signal:AbortSignal.timeout(10000),redirect:'manual'});if(!res.ok)throw Error('Upstream HTTP '+res.status);const text=await boundedText(res);let data;
 if(url.pathname.endsWith('/sources')){const match=text.match(/let sources\s*=\s*(\[[^;]+\]);/);if(!match)throw Error('No sources listed');const sources=JSON.parse(match[1]);data={sources:sources.filter(v=>{try{const u=new URL(v);return u.protocol==='https:'&&u.hostname==='strmfree.st'&&u.pathname.startsWith('/embed/')&&!u.username&&!u.password}catch{return false}})}}else{data=JSON.parse(text);if(url.pathname==='/schedule'){data=await expandSchedule(upstream,data);if(!Array.isArray(data.events))throw Error('Invalid schedule');data={events:data.events.map(e=>({id:e.id,name:e.name,date:e.date,status:{type:{state:e.status?.type?.state}},links:(e.links||[]).filter(l=>l.href?.startsWith('https://www.espn.com/')).slice(0,1),competitions:[{competitors:(e.competitions?.[0]?.competitors||[]).map(t=>({team:{displayName:t.team?.displayName,name:t.team?.name,logo:t.team?.logo}}))}]}))}}}
 const result=response(data,200,url.pathname==='/schedule'?300:60);ctx.waitUntil(cache.put(cacheKey,result.clone()));return result;
 }catch(err){console.warn(JSON.stringify({route:url.pathname,message:String(err.message)}));return response({error:'Sports feed temporarily unavailable'},502)}
}};

