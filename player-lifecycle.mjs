// Fullscreen/native-video transitions can dismiss a browser dialog without a
// deliberate Spex close. Keep its iframe/video alive in that case.
export function bindPlayerLifecycle(dialog,{document:doc=dialog.ownerDocument,window:win=doc.defaultView,now=()=>performance.now(),defer=callback=>requestAnimationFrame(callback)}={}){
 const originalClose=dialog.close,originalShow=dialog.showModal;
 let active=dialog.open,explicit=false,disposed=false,transitionUntil=0;
 const fullscreen=()=>!!(doc.fullscreenElement||doc.webkitFullscreenElement||dialog.querySelector('video')?.webkitDisplayingFullscreen);
 const transitioning=()=>{transitionUntil=now()+1500};
 function close(...args){active=false;if(dialog.open)explicit=true;try{return originalClose.apply(dialog,args)}catch(error){explicit=false;active=dialog.open;throw error}}
 function show(...args){const result=originalShow.apply(dialog,args);active=true;return result}
 dialog.close=close;
 dialog.showModal=show;
 const cancel=event=>event.preventDefault();
 const closed=event=>{
  if(explicit){explicit=false;if(dialog.open)event.stopImmediatePropagation();return}
  if(disposed||!active||!dialog.isConnected)return;
  event.stopImmediatePropagation();
  defer(()=>{if(!disposed&&active&&dialog.isConnected&&!dialog.open)try{dialog.showModal()}catch{/* Native fullscreen may still own the top layer. */}});
 };
 const restore=()=>{transitioning();if(!disposed&&active&&dialog.isConnected&&!dialog.open&&!explicit)try{dialog.showModal()}catch{}};
 const key=event=>{
  if(disposed||!dialog.open||event.defaultPrevented||event.key!=='Escape')return;
  if(dialog.querySelector('.stream-popover,.native-menu:not([hidden])'))return;
  event.preventDefault();
  if(fullscreen()||now()<transitionUntil)return;
  dialog.close();
 };
 const transitions=['fullscreenchange','webkitfullscreenchange','webkitbeginfullscreen','webkitendfullscreen'];
 for(const type of transitions)doc.addEventListener(type,restore,true);
 const visible=()=>{if(doc.visibilityState!=='hidden')restore()};
 win.addEventListener('orientationchange',restore);
 win.addEventListener('resize',restore);
 win.addEventListener('focus',restore);
 doc.addEventListener('visibilitychange',visible);
 doc.addEventListener('keydown',key);
 dialog.addEventListener('cancel',cancel);
 dialog.addEventListener('close',closed);
 return {transition:transitioning,destroy(){disposed=true;if(dialog.close===close)dialog.close=originalClose;if(dialog.showModal===show)dialog.showModal=originalShow;dialog.removeEventListener('cancel',cancel);dialog.removeEventListener('close',closed);doc.removeEventListener('keydown',key);doc.removeEventListener('visibilitychange',visible);for(const type of transitions)doc.removeEventListener(type,restore,true);win.removeEventListener('orientationchange',restore);win.removeEventListener('resize',restore);win.removeEventListener('focus',restore)}};
}

export async function togglePlayerFullscreen({document:doc=document,target=doc.documentElement,video,onError=()=>{}}={}){
 try{
  if(doc.fullscreenElement||doc.webkitFullscreenElement){const exit=doc.exitFullscreen||doc.webkitExitFullscreen;if(exit)await exit.call(doc);return}
  const request=target.requestFullscreen||target.webkitRequestFullscreen;
  if(request)await request.call(target);
  else if(video?.webkitEnterFullscreen)video.webkitEnterFullscreen();
  else onError('Use the fullscreen control inside the video player.');
 }catch{onError('Fullscreen could not start. Try the control inside the video player.')}
}
