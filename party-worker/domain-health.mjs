export const siteURLs=['https://spx7.pages.dev/','https://spx7.web.app/','https://spx7.firebaseapp.com/','https://cydpixl.github.io/spx/','https://bogart.pages.dev/','https://spex-pixl.web.app/','https://spex-pixl.firebaseapp.com/','https://spx-1fa.pages.dev/','https://spex-dzd.pages.dev/','https://cydpixl.github.io/bogart/'];
export async function checkSite(url,fetcher=fetch){
 const started=Date.now();
 try{const response=await fetcher(url,{method:'GET',signal:AbortSignal.timeout(7000),redirect:'follow',headers:{'User-Agent':'Spex uptime check'}});await response.body?.cancel();return {url,status:response.ok?'up':'down',httpStatus:response.status,latency:Date.now()-started,checkedAt:new Date().toISOString()}}catch{return {url,status:'down',httpStatus:null,latency:Date.now()-started,checkedAt:new Date().toISOString()}}
}
export async function domainHealth(request,headers,ctx){
 const key=new Request(new URL('/_cached-domain-health',request.url));let cached=await caches.default.match(key);
 if(cached)return new Response(cached.body,{headers:{...headers,'Content-Type':'application/json'}});
 const items=await Promise.all(siteURLs.map(url=>checkSite(url)));
 const response=Response.json({items,checkedAt:new Date().toISOString()},{headers:{'Cache-Control':'public, max-age=60'}});
 ctx.waitUntil(caches.default.put(key,response.clone()));
 return new Response(response.body,{headers:{...headers,'Content-Type':'application/json'}});
}
