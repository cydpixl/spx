import test from 'node:test';
import assert from 'node:assert/strict';
import {wingRequest,safeMediaURL,createWingClient} from '../wing-client.mjs';
import {allowedMedia,allowedSite,rewriteManifest,createMediaHandler} from '../wing-worker/index.mjs';
import {ProviderPlayer,providers} from '../provider-player.mjs';
const playlist='https://lightspeed.st/hls/32e0cce2-76e0-4aae-b641-5efc26f14ee5/2/master.m3u8';
test('Wing resolves TMDB movies and TV specials without confusing episode identifiers',()=>{
 assert.deepEqual(wingRequest({id:1396,type:'tv',season:0,episode:2,imdb_id:'tt0903747'},'secret'),{path:'/secret/series',payload:{tmdb:'1396',season:'0',episode:'2',imdb:'tt0903747'}});
 assert.equal(wingRequest({id:1368337,type:'movie'},'Nebula').path,'/Nebula/movie');
 for(const item of [{id:-1},{id:1396,type:'tv',episode:-1},{id:1,type:'tv',season:1.5}])assert.throws(()=>wingRequest(item,'secret'));
 assert.throws(()=>wingRequest({id:1},'../other'));
});
test('untrusted stream URLs cannot inject scripts, credentials or arbitrary gateway destinations',()=>{
 for(const value of ['javascript:alert(1)','http://lightspeed.st/test','https://user:pass@lightspeed.st/test'])assert.equal(safeMediaURL(value),null);
 for(const value of ['https://127.0.0.1/test','https://lightspeed.st.evil.com/hls/id/test','https://lightspeed.st:8443/hls/id/test','https://lightspeed.st/private'])assert.equal(allowedMedia(value),null);
 assert.ok(allowedMedia(playlist));assert.equal(allowedSite('https://evil.com'),false);
});
test('HLS rewriting covers variant, audio, encryption keys and initialization segments',()=>{
 const input='#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,URI="audio-en/playlist.m3u8"\n#EXT-X-KEY:METHOD=AES-128,URI="key.bin"\n#EXT-X-MAP:URI="init.png"\n360p/playlist.m3u8\n';
 const result=rewriteManifest(input,playlist,'https://gateway.example');
 assert.equal((result.match(/https:\/\/gateway.example\/media\?url=/g)||[]).length,4);
 assert.match(result,/audio-en%2Fplaylist.m3u8/);
 assert.throws(()=>rewriteManifest('#EXTM3U\nhttps://evil.com/file',playlist,'https://gateway.example'));
});
test('gateway rejects cross-site use, mutations and upstream redirects; byte ranges stream intact',async()=>{
 let calls=0;const handler=createMediaHandler(async(_url,options)=>{calls++;assert.equal(options.headers.get('Referer'),'https://cinejoy.pk/');assert.equal(options.headers.get('Origin'),'https://cinejoy.pk');assert.equal(options.headers.get('Range'),'bytes=0-3');return new Response(new Uint8Array([1,2,3,4]),{status:206,headers:{'Content-Range':'bytes 0-3/50'}})});
 const url='https://gateway.example/media?url='+encodeURIComponent(playlist.replace('master.m3u8','360p/init.png'));
 assert.equal((await handler(new Request(url,{headers:{Origin:'https://evil.com'}}))).status,403);
 assert.equal((await handler(new Request(url,{method:'POST',headers:{Origin:'https://spx7.pages.dev'}}))).status,405);
 assert.equal(calls,0);
 const response=await handler(new Request(url,{headers:{Origin:'https://spx7.pages.dev',Range:'bytes=0-3'}}));assert.equal(response.status,206);assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[1,2,3,4]);
 const redirect=createMediaHandler(async()=>new Response(null,{status:302,headers:{Location:'https://evil.com/'}}));assert.equal((await redirect(new Request(url,{headers:{Origin:'https://spx7.pages.dev'}}))).status,502);
});
test('Wing encoder failures are surfaced without attempting an unverified stream',async()=>{
 let calls=0;const client=createWingClient({fetcher:async()=>{calls++;return new Response('unavailable',{status:503})}});
 await assert.rejects(client.resolve({id:1368337},'secret'),/encoder is unavailable/);assert.equal(calls,1);
});
test('Nebula playlists with image extensions rewrite their nested segment and init URLs',async()=>{
 const handler=createMediaHandler(async()=>new Response('#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\nplaylist_000.jpg\n',{headers:{'Content-Type':'image/jpeg'}}));
 const source='https://nebula.bright67.online/hls/e54477ca-315f-481b-adfd-81571ca97033/1080p/playlist.jpg';
 const response=await handler(new Request('https://gateway.example/media?url='+encodeURIComponent(source),{headers:{Origin:'https://spx7.pages.dev'}}));
 assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/vnd.apple.mpegurl');
 const body=await response.text();assert.match(body,/https:\/\/gateway.example\/media\?url=/);assert.match(body,/1080p%2Finit.mp4/);assert.match(body,/1080p%2Fplaylist_000.jpg/);
});
test('changing Wing sources forces a document navigation and rejects stale sessions',()=>{
 const node={style:{setProperty(){}},hidden:false};
 const player={provider:{id:'wing-secret',name:'Secret',server:'secret',wing:true,controls:true,origin:'https://example.com'},item:{id:1368337,type:'movie',title:'The Odyssey',season:1,episode:1},dialog:{querySelector:()=>node},frame:{},clock:{reset(){}},readProgress:()=>null,status(){},paint(){}};
 ProviderPlayer.prototype.load.call(player);const first=new URL(player.frame.src),firstSession=player.wingSession;
 player.provider={...player.provider,id:'wing-nebula',server:'Nebula'};
 ProviderPlayer.prototype.load.call(player);const next=new URL(player.frame.src);
 assert.notEqual(next.search,first.search);assert.notEqual(player.wingSession,firstSession);assert.equal(new URLSearchParams(next.hash.slice(1)).get('server'),'Nebula');
});
test('the verified Wing integration retains existing sources and CineSrc quality preferences',()=>{
 assert.equal(providers.find(p=>p.id==='wing-secret')?.server,'secret');
 assert.ok(providers.some(p=>p.id==='yapgrid'));
 const node={style:{setProperty(){}},hidden:false};
 const player={provider:providers.find(p=>p.id==='cinesrc'),quality:'720',item:{id:1,type:'movie',title:'Movie'},dialog:{querySelector:()=>node},frame:{},clock:{reset(){}},readProgress:()=>null,status(){},paint(){}};
 ProviderPlayer.prototype.load.call(player);assert.equal(player.quality,'720');assert.equal(new URL(player.frame.src).searchParams.get('quality'),'720');
});
