// The WebKit picker must be opened synchronously from the user's click.
export function bindAirPlay(video,button,{visible=true,onError=()=>{}}={}) {
 const supported=typeof video.webkitShowPlaybackTargetPicker==='function';
 let availability='unknown';
 video.setAttribute('x-webkit-airplay','allow');
 video.removeAttribute('disableremoteplayback');
 video.removeAttribute('x-webkit-wirelessvideoplaybackdisabled');
 if('disableRemotePlayback' in video)video.disableRemotePlayback=false;
 const paint=()=>{
  const connected=!!video.webkitCurrentPlaybackTargetIsWireless;
  button.hidden=!supported||!visible;
  button.setAttribute('aria-pressed',String(connected));
  button.classList.toggle('is-airplay-connected',connected);
  button.title=connected?'AirPlay connected':availability==='not-available'?'AirPlay · No receiver detected':'AirPlay';
 };
 const available=event=>{availability=event.availability;paint()};
 const click=()=>{if(!supported)return;try{video.webkitShowPlaybackTargetPicker()}catch{onError('AirPlay is unavailable. Open Spex in Safari and check that your TV’s AirPlay receiver is on.')}};
 video.addEventListener('webkitplaybacktargetavailabilitychanged',available);
 video.addEventListener('webkitcurrentplaybacktargetiswirelesschanged',paint);
 button.addEventListener('click',click);
 paint();
 return ()=>{
  video.removeEventListener('webkitplaybacktargetavailabilitychanged',available);
  video.removeEventListener('webkitcurrentplaybacktargetiswirelesschanged',paint);
  button.removeEventListener('click',click);
 };
}

export const airPlayHelp='In Safari, start the video and tap AirPlay in its controls. Choose your TV on the same Wi-Fi with its AirPlay receiver enabled. If this server has no AirPlay option, try Screen Mirroring in Control Center.';
