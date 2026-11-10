import {createWingClient,wingServers} from './wing-client.mjs?v=20261110-wing90';
import {WING_GATEWAY} from './wing-config.mjs?v=20261110-wing90';
const query=new URLSearchParams(location.hash.slice(1)),video=document.querySelector('video'),message=document.querySelector('.message'),text=message.querySelector('p'),start=message.querySelector('[data-start]'),retry=message.querySelector('[data-retry]');
const session=query.get('session'),server=query.get('server'),client=createWingClient();
const gateway=WING_GATEWAY;
const mediaURL=value=>{const url=new URL(value);return ['lightspeed.st','nebula.bright67.online'].includes(url.hostname)?gateway+'/media?url='+encodeURIComponent(url.href):url.href;};
const item={id:query.get('id'),type:query.get('type'),season:query.get('season'),episode:query.get('episode'),title:query.get('title'),year:query.get('year'),imdbId:query.get('imdb')};
let hls=null,controller=null,generation=0,stream=null,resume=Math.max(0,Number(query.get('t'))||0),recoveries=0;
video.volume=Math.max(0,Math.min(1,Number(query.get('volume')??1)||0));
const notify=(event,extra={})=>parent.postMessage({source:'spex-wing',session,event,currentTime:video.currentTime,duration:Number.isFinite(video.duration)?video.duration:0,paused:video.paused,volume:video.volume,muted:video.muted,playbackRate:video.playbackRate,...extra},location.origin);
function stats(){let bufferAhead=0;for(let i=0;i<video.buffered.length;i++)if(video.buffered.start(i)<=video.currentTime&&video.buffered.end(i)>=video.currentTime)bufferAhead=video.buffered.end(i)-video.currentTime;const frames=video.getVideoPlaybackQuality?.();return {playlist:stream?.url,streamType:stream?.type,server,width:video.videoWidth,height:video.videoHeight,bandwidth:hls?.bandwidthEstimate||0,bufferAhead,droppedFrames:frames?.droppedVideoFrames||0,totalFrames:frames?.totalVideoFrames||0,levels:(hls?.levels||[]).map((l,i)=>({id:i,height:l.height,bitrate:l.bitrate})),level:hls?.currentLevel??-1,audioTracks:(hls?.audioTracks||[]).map((a,i)=>({id:i,name:a.name,language:a.lang})),audioTrack:hls?.audioTrack??-1,captions:stream?.captions||[]};}
function show(value,{play=false,again=false}={}){message.hidden=!value;text.textContent=value;start.hidden=!play;retry.hidden=!again;}
function fail(value){show(value,{again:true});notify('error',{message:value});}
async function play(){try{await video.play();show('')}catch(e){if(e.name==='NotAllowedError'){show('Ready to play',{play:true});notify('ready',{info:stats()})}else if(e.name!=='AbortError')fail('Playback could not start. Retry or choose another server.');}}
function clear(){controller?.abort();hls?.destroy();hls=null;video.pause();video.removeAttribute('src');video.load();video.querySelectorAll('track').forEach(t=>t.remove());}
async function load(){
 const ticket=++generation;clear();stream=null;recoveries=0;controller=new AbortController();show('Finding video on '+(wingServers.find(s=>s.server===server)?.name||'Wing')+'…');
 try{
  if(!gateway)throw Error('Wing playback is awaiting a compatible media gateway. Choose another source.');
  const result=await client.resolve(item,server,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(30000)])});
  if(ticket!==generation)return;stream=result;
  for(const c of result.captions){const track=document.createElement('track');track.kind='subtitles';track.label=c.label;track.srclang=c.language;track.src=mediaURL(c.url);video.append(track);}
  notify('ready',{info:stats()});show('Loading video…');
  const safari=/Safari\//.test(navigator.userAgent)&&!/(Chrome|Chromium|CriOS|Edg|Android)\//.test(navigator.userAgent);
  if(result.type==='mp4'||safari&&video.canPlayType('application/vnd.apple.mpegurl'))video.src=mediaURL(result.url);
  else if(globalThis.Hls?.isSupported()){
   hls=new Hls({maxBufferLength:40,maxMaxBufferLength:90,backBufferLength:30,enableWorker:true,capLevelToPlayerSize:true});
   hls.on(Hls.Events.MANIFEST_PARSED,()=>{if(ticket===generation)notify('tracks',{info:stats()})});
   hls.on(Hls.Events.ERROR,(_event,data)=>{if(ticket!==generation||!data.fatal)return;if(data.type===Hls.ErrorTypes.MEDIA_ERROR&&recoveries++<1)hls.recoverMediaError();else fail('Video stream is unavailable. Retry or choose another server.');});
   hls.loadSource(mediaURL(result.url));hls.attachMedia(video);
  }else if(video.canPlayType('application/vnd.apple.mpegurl'))video.src=mediaURL(result.url);
  else throw Error('This browser cannot play HLS video. Try Safari or a current Chrome browser.');
 }catch(e){if(ticket===generation&&e.name!=='AbortError')fail(e.name==='TimeoutError'?'Wing took too long to respond. Retry or choose another server.':e.message||'Wing is unavailable.');}
}
video.addEventListener('loadedmetadata',()=>{if(resume>0&&Number.isFinite(video.duration)){video.currentTime=Math.min(resume,Math.max(0,video.duration-1));resume=0}notify('loadedmetadata',{info:stats()});play();});
video.addEventListener('playing',()=>show(''));
video.addEventListener('error',()=>{if(stream&&!hls)fail('Video stream could not be loaded. Retry or choose another server.');});
for(const name of ['timeupdate','play','playing','pause','waiting','stalled','seeking','seeked','ended','ratechange','volumechange','canplay'])video.addEventListener(name,()=>notify(name));
const timer=setInterval(()=>{if(stream)notify('stats',{info:stats()})},1000);
window.addEventListener('message',event=>{
 const d=event.data;if(event.source!==parent||event.origin!==location.origin||d?.source!=='spex-wing-command'||d.session!==session)return;
 const value=Number(d.value);
 if(d.command==='play')play();else if(d.command==='pause')video.pause();
 else if(d.command==='seek'&&Number.isFinite(value)&&Number.isFinite(video.duration))video.currentTime=Math.max(0,Math.min(video.duration,value));
 else if(d.command==='volume'&&Number.isFinite(value)){video.volume=Math.max(0,Math.min(1,value));video.muted=video.volume===0;}
 else if(d.command==='speed'&&value>=.25&&value<=4)video.playbackRate=value;
 else if(d.command==='status')notify('stats',{info:stats()});
 else if(d.command==='controls')video.controls=!!d.value;
 else if(d.command==='quality'&&hls&&Number.isInteger(value)&&value>=-1&&value<hls.levels.length)hls.currentLevel=value;
 else if(d.command==='audio'&&hls&&Number.isInteger(value)&&value>=0&&value<hls.audioTracks.length)hls.audioTrack=value;
 else if(d.command==='subtitle')Array.from(video.textTracks).forEach((t,i)=>t.mode=i===value?'showing':'disabled');
 else if(d.command==='pip'){const action=document.pictureInPictureElement?document.exitPictureInPicture():video.requestPictureInPicture?.();action?.catch(()=>notify('notice',{message:'Picture in Picture is unavailable in this browser.'}));}
});
document.addEventListener('contextmenu',e=>{if(e.shiftKey)return;e.preventDefault();notify('contextmenu',{x:e.clientX,y:e.clientY})});
document.addEventListener('keydown',e=>{if(e.key===' '&&!e.target.closest('button,input,select')){e.preventDefault();video.paused?play():video.pause();}else if((e.shiftKey&&e.key==='F10')||e.key==='ContextMenu'){e.preventDefault();notify('contextmenu',{x:innerWidth/2,y:innerHeight/2})}});
start.onclick=play;retry.onclick=()=>{resume=video.currentTime||resume;load()};
window.addEventListener('pagehide',()=>{generation++;clearInterval(timer);clear()},{once:true});
load();
