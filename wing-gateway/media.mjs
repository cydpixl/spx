const mediaHosts=new Set(['lightspeed.st','nebula.bright67.online']);
const siteHosts=new Set(['spx7.pages.dev','spx6.pages.dev','bogart.pages.dev','spex7-tv.pages.dev','spex-airplay-test.pages.dev','cydpixl.github.io']);
export function allowedSite(value){try{const u=new URL(value);return u.protocol==='https:'&&(siteHosts.has(u.hostname)||/^[a-z0-9-]+\.spx7\.pages\.dev$/.test(u.hostname))||u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)}catch{return false}}
export function allowedMedia(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&mediaHosts.has(u.hostname)&&/^\/hls\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_./-]+$/.test(u.pathname)&&!u.pathname.includes('..')?u:null}catch{return null}}
export function mediaURL(value,gateway){if(!allowedMedia(value))throw Error('Unsupported Wing media host or path.');const url=new URL('/media',gateway);url.searchParams.set('url',value);return url.href;}
export function rewriteManifest(body,upstream,gateway){
 if(!body.trimStart().startsWith('#EXTM3U'))throw Error('Invalid HLS playlist.');
 const link=value=>mediaURL(new URL(value,upstream).href,gateway);
 return body.split(/\r?\n/).map(line=>line.startsWith('#')?line.replace(/URI="([^"]+)"/g,(_m,uri)=>'URI="'+link(uri)+'"'):line.trim()?link(line.trim()):line).join('\n');
}
async function playlistText(response){const reader=response.body.getReader(),chunks=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024*1024){await reader.cancel();throw Error('HLS playlist is too large.')}chunks.push(value)}}finally{reader.releaseLock()}const all=new Uint8Array(size);let at=0;for(const chunk of chunks){all.set(chunk,at);at+=chunk.length}return new TextDecoder().decode(all);}
export function createMediaHandler(fetcher=fetch){
 return async request=>{
  const url=new URL(request.url),origin=request.headers.get('Origin'),referer=request.headers.get('Referer');
  const cors={'Access-Control-Allow-Origin':origin&&allowedSite(origin)?origin:'https://spx7.pages.dev','Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Allow-Headers':'Range','Access-Control-Expose-Headers':'Content-Length, Content-Range, Accept-Ranges','Vary':'Origin','X-Content-Type-Options':'nosniff'};
  const error=(message,status)=>new Response(message,{status,headers:{...cors,'Cache-Control':'no-store','Content-Type':'text/plain;charset=UTF-8'}});
  if(origin?!allowedSite(origin):!referer||!allowedSite(referer))return error('Origin not allowed.',403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(!['GET','HEAD'].includes(request.method))return error('Method not allowed.',405);
  if(url.pathname!=='/media')return error('Not found.',404);
  const upstream=allowedMedia(url.searchParams.get('url'));
  if(!upstream)return error('Unsupported Wing media host or path.',400);
  const range=request.headers.get('Range');if(range&&!/^bytes=(?:\d+-\d*|-\d+)$/.test(range))return error('Invalid range.',400);
  const headers=new Headers({'Origin':'https://cinejoy.pk','Referer':'https://cinejoy.pk/','Accept':'*/*','User-Agent':request.headers.get('User-Agent')||'Mozilla/5.0'});if(range)headers.set('Range',range);
  try{
   // Redirects are rejected so a provider cannot turn this into an arbitrary proxy.
   const response=await fetcher(upstream.href,{method:request.method,headers,redirect:'manual',signal:AbortSignal.any([request.signal,AbortSignal.timeout(20000)])});
   if(response.status>=300&&response.status<400){await response.body?.cancel();return error('Upstream redirect is not supported.',502)}
   if(!response.ok){await response.body?.cancel();return error('Wing media unavailable.',response.status===404?404:502)}
   const out=new Headers(cors);
   for(const key of ['Content-Type','Content-Length','Content-Range','Accept-Ranges']){const value=response.headers.get(key);if(value)out.set(key,value)}
   if(response.headers.get('Content-Encoding'))out.delete('Content-Length');
   out.set('Cache-Control','private, max-age=60');
   if(request.method==='HEAD')return new Response(null,{status:response.status,headers:out});
   const manifest=upstream.pathname.endsWith('.m3u8')||/\/(?:playlist|index|master)\.(?:jpe?g|png)$/i.test(upstream.pathname)||/mpegurl/i.test(response.headers.get('Content-Type')||'');
   if(manifest){const body=rewriteManifest(await playlistText(response),upstream.href,url.origin);out.set('Content-Type','application/vnd.apple.mpegurl');out.delete('Content-Length');out.set('Cache-Control','private, max-age=20');return new Response(body,{status:200,headers:out})}
   // Binary video, audio, keys and subtitles are streamed without buffering.
   return new Response(response.body,{status:response.status,headers:out});
  }catch{return error('Wing media gateway could not reach this stream.',502)}
 };
}
export default {fetch(request){return createMediaHandler()(request)}};
