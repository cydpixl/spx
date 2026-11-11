const usernamePattern = /^[a-z0-9_]{3,24}$/;
const maximum = {avatar: 512 * 1024, banner: 50 * 1024 * 1024};
const origins = new Set(['https://spx7.pages.dev','https://cydpixl.github.io','https://bogart.pages.dev','https://spx7.web.app','https://spx7.firebaseapp.com']);
const originAllowed = origin => origins.has(origin) || /^https:\/\/[a-z0-9-]+\.spx7\.pages\.dev$/.test(origin);

export function imageType(bytes) {
 const ascii = (start,length) => String.fromCharCode(...bytes.subarray(start,start+length));
 if (ascii(0,6)==='GIF87a' || ascii(0,6)==='GIF89a') return 'image/gif';
 if ([137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n)) return 'image/png';
 if (bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return 'image/jpeg';
 if (ascii(0,4)==='RIFF' && ascii(8,4)==='WEBP') return 'image/webp';
 return '';
}

async function imageSignature(request) {
 const reader = request.clone().body.getReader();
 const bytes = new Uint8Array(12);
 let offset = 0;
 try {
  while (offset < bytes.length) {
   const {done,value} = await reader.read();
   if (done) break;
   const chunk=value.subarray(0,bytes.length-offset);
   bytes.set(chunk,offset);
   offset+=chunk.length;
  }
 } finally {
  void reader.cancel().catch(()=>{});
 }
 return imageType(bytes.subarray(0,offset));
}

async function sessionUser(request, database) {
 const token = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
 if (!token) return null;
 const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)));
 const hash = Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
 return database.prepare('SELECT a.id,a.username FROM sessions s JOIN accounts a ON a.id=s.user_id WHERE s.hash=? AND s.expires>?').bind(hash,Date.now()).first();
}

export default {
 async fetch(request,env) {
  const url = new URL(request.url), origin=request.headers.get('Origin') || '';
  const headers = new Headers({'Vary':'Origin','X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; sandbox"});
  if (originAllowed(origin)) headers.set('Access-Control-Allow-Origin',origin);
  const json = (value,status=200) => Response.json(value,{status,headers});
  if (request.method==='OPTIONS') {
   if (!originAllowed(origin)) return json({error:'Origin not allowed.'},403);
   headers.set('Access-Control-Allow-Methods','GET, HEAD, PUT, DELETE, OPTIONS');
   headers.set('Access-Control-Allow-Headers','Authorization, Content-Type');
   return new Response(null,{status:204,headers});
  }
  try {
   if (url.pathname==='/health') return json({ok:true,maximumBannerBytes:maximum.banner});
   const parts=url.pathname.split('/').filter(Boolean);
   const kind=parts[2];
   if (parts[0]!=='media' || parts.length!==3 || !usernamePattern.test(parts[1]) || !Object.hasOwn(maximum,kind)) return json({error:'Image not found.'},404);
   if (['GET','HEAD'].includes(request.method)) {
    const account=await env.COMMUNITY.prepare('SELECT id FROM accounts WHERE username=?').bind(parts[1]).first();
    if (!account) return json({error:'Image not found.'},404);
    const key='profile/'+account.id+'/'+kind;
    const object=await env.MEDIA[request.method==='HEAD'?'head':'get'](key);
    if (!object) return json({error:'Image not found.'},404);
    object.writeHttpMetadata(headers);
    headers.set('Content-Length',String(object.size));
    headers.set('ETag',object.httpEtag);
    headers.set('Cache-Control','public, max-age=60, must-revalidate');
    if (request.headers.get('If-None-Match')===object.httpEtag) return new Response(null,{status:304,headers});
    return new Response(request.method==='HEAD'?null:object.body,{headers});
   }
   if (!['PUT','DELETE'].includes(request.method)) return json({error:'Method not allowed.'},405);
   if (!originAllowed(origin)) return json({error:'Origin not allowed.'},403);
   const account=await sessionUser(request,env.COMMUNITY);
   if (!account || account.username!==parts[1]) return json({error:'Sign in to edit your own profile.'},401);
   const key='profile/'+account.id+'/'+kind;
   if (request.method==='DELETE') {
    await env.MEDIA.delete(key);
    return json({ok:true});
   }
   const length=Number(request.headers.get('Content-Length'));
   if (!request.body || !Number.isSafeInteger(length) || length<12 || length>maximum[kind]) return json({error:kind==='banner'?'Choose an image up to 50 MB.':'Choose a smaller profile picture.'},413);
   const type=await imageSignature(request);
   if (!type || (kind==='avatar'&&type==='image/gif')) return json({error:'Choose a supported image.'},415);
   await env.MEDIA.put(key,request.body,{httpMetadata:{contentType:type,contentDisposition:'inline'}});
   return json({ok:true});
  } catch(error) {
   console.error(JSON.stringify({route:url.pathname.split('/')[1],error:error.name}));
   return json({error:'Profile storage is temporarily unavailable. Try again.'},503);
  }
 }
};
