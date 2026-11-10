// Wing's public browser protocol. The service supplies its current request encoder.
// No movie URLs, credentials, or client-side encryption keys are stored here.
export const WING_ORIGIN='https://api.wing.st';
export const wingServers=[
 {id:'wing-secret',name:'Secret · Wing',server:'secret'},
 {id:'wing-nebula',name:'Nebula · Wing',server:'Nebula'},
 {id:'wing-lisbon',name:'Lisbon · Wing',server:'Lisbon'},
 {id:'wing-solara',name:'Solara · Wing',server:'Solara'},
 {id:'wing-athens',name:'Athens · Wing',server:'Athens'}
];
const encoder=new TextEncoder(),decoder=new TextDecoder();
const MAX_RESPONSE=4*1024*1024;
export function safeMediaURL(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}
}
export function wingRequest(item,server){
 if(!wingServers.some(s=>s.server===server))throw Error('Unknown Wing server.');
 const tmdb=Number(item.tmdbId||item.id);
 if(!Number.isSafeInteger(tmdb)||tmdb<1)throw Error('A valid TMDB ID is required.');
 const series=['tv','series'].includes(item.type||item.kind),payload={tmdb:String(tmdb)};
 if(series){
  const season=Number(item.season??1),episode=Number(item.episode??1);
  if(!Number.isSafeInteger(season)||season<0||!Number.isSafeInteger(episode)||episode<1)throw Error('A valid season and episode are required.');
  Object.assign(payload,{season:String(season),episode:String(episode)});
 }
 const imdb=item.imdbId||item.imdb_id;
 if(/^tt\d+$/.test(imdb||''))payload.imdb=imdb;
 const year=String(item.year||item.release_date||item.first_air_date||'').slice(0,4);
 if(/^\d{4}$/.test(year))payload.year=year;
 if(item.title)payload.title=String(item.title).slice(0,300);
 return {path:`/${server}/${series?'series':'movie'}`,payload};
}
async function boundedBytes(response,max=MAX_RESPONSE){
 if(Number(response.headers.get('content-length'))>max)throw Error('Wing response is too large.');
 const reader=response.body.getReader(),chunks=[];let total=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>max){await reader.cancel();throw Error('Wing response is too large.')}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(total);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length}return bytes;
}
export function createWingClient({fetcher=globalThis.fetch,cryptoAPI=globalThis.crypto}={}){
 let compiled=null;
 async function request(path,payload,{signal,refresh=false}={}){
  if(!cryptoAPI?.subtle)throw Error('Wing playback requires HTTPS or localhost.');
  if(refresh)compiled=null;
  if(!compiled){const r=await fetcher(WING_ORIGIN+'/crush.wasm',{signal,cache:'no-cache'});if(!r.ok)throw Error('Wing request encoder is unavailable ('+r.status+').');compiled=await WebAssembly.compile(await boundedBytes(r,8*1024*1024));}
  signal?.throwIfAborted();
  // A separate WASM memory per request prevents concurrent movie/episode races.
  const {exports:wasm}=await WebAssembly.instantiate(compiled,{});
  if(!(wasm.memory instanceof WebAssembly.Memory)||!['alloc','dealloc','seal_request'].every(k=>typeof wasm[k]==='function'))throw Error('Wing changed its request protocol.');
  const input=encoder.encode(JSON.stringify({path,payload})),entropy=cryptoAPI.getRandomValues(new Uint8Array(44)),capacity=input.length+512;
  const ptr=wasm.alloc(input.length),random=wasm.alloc(entropy.length),out=wasm.alloc(capacity);
  let sealed;
  try{
   if(!ptr||!random||!out)throw Error('Wing request could not be prepared.');
   new Uint8Array(wasm.memory.buffer).set(input,ptr);new Uint8Array(wasm.memory.buffer).set(entropy,random);
   const length=wasm.seal_request(ptr,input.length,random,entropy.length,out,capacity);
   if(length<=98||length>capacity)throw Error('Wing request encoding failed.');
   sealed=new Uint8Array(wasm.memory.buffer).slice(out,out+length);
  }finally{if(ptr)wasm.dealloc(ptr,input.length);if(random)wasm.dealloc(random,entropy.length);if(out)wasm.dealloc(out,capacity)}
  const response=await fetcher(WING_ORIGIN+'/g',{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:sealed.slice(98),signal});
  if(!response.ok){if(response.status===404&&!refresh)return request(path,payload,{signal,refresh:true});throw Error('Wing is unavailable ('+response.status+'). Try another server.');}
  const bytes=await boundedBytes(response);
  if(bytes.length<28)throw Error('Wing returned an incomplete response.');
  const label=encoder.encode('lumen-gate-v2'),aad=new Uint8Array(label.length+3+65);
  aad.set(label);aad.set([0,2,sealed[32]],label.length);aad.set(sealed.slice(33,98),label.length+3);
  const key=await cryptoAPI.subtle.importKey('raw',sealed.slice(0,32),'AES-GCM',false,['decrypt']);
  let envelope;
  try{envelope=JSON.parse(decoder.decode(await cryptoAPI.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12),additionalData:aad,tagLength:128},key,bytes.slice(12))))}catch{throw Error('Wing response could not be verified. Reload or try another server.')}
  if(!envelope||typeof envelope.status!=='number'||!('data'in envelope))throw Error('Wing returned an invalid response.');
  if(envelope.status<200||envelope.status>=300)throw Error(envelope.status===404?'This title is unavailable on this Wing server.':'Wing could not resolve this title ('+envelope.status+').');
  return envelope.data;
 }
 async function resolve(item,server,{signal}={}){
  const query=wingRequest(item,server);let data=await request(query.path,query.payload,{signal});
  const visited=new Set();
  for(let depth=0;depth<3;depth++){
   const streams=Array.isArray(data?.stream)?data.stream:[];
   for(const stream of streams){
    const url=safeMediaURL(stream.playlist);
    const qualities=Object.entries(stream.qualities||data.qualities||{}).flatMap(([label,value])=>{const src=safeMediaURL(typeof value==='string'?value:value?.url);return src?[{label,url:src}]:[]});
    if(url||qualities.length)return {url:url||qualities[0].url,type:stream.type==='mp4'||stream.type==='file'?'mp4':'hls',qualities,captions:(stream.captions||[]).flatMap(c=>{const src=safeMediaURL(c.url);return src?[{url:src,language:String(c.language||c.id||'und'),label:String(c.label||c.language||c.id||'Subtitle')}]:[]}),server};
   }
   const embed=streams.find(s=>typeof s.playlist==='string'&&s.playlist&&!safeMediaURL(s.playlist)&&!visited.has(s.playlist))?.playlist;
   if(!embed)throw Error('No playable stream was found. Choose another server.');
   visited.add(embed);data=await request(query.path,{...query.payload,embed},{signal});
  }
  throw Error('This Wing server could not resolve the video. Choose another server.');
 }
 return {request,resolve};
}
