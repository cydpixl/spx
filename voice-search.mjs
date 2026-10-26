const mic='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg>';
export function installVoiceSearch(input) {
 const field=input.closest('.search-field'),button=document.createElement('button'),status=document.createElement('span');
 button.type='button';button.className='search-microphone';button.innerHTML=mic;button.setAttribute('aria-label','Search by voice');button.setAttribute('aria-pressed','false');button.title='Search by voice';
 status.className='sr-only';status.setAttribute('role','status');status.setAttribute('aria-live','polite');field.append(button,status);
 let recognition=null,disposed=false,active=false,session=0,safetyTimer,silenceTimer,spoken=false;
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 const reset=()=>{active=false;clearTimeout(safetyTimer);clearTimeout(silenceTimer);button.classList.remove('is-listening','is-speaking');button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Search by voice');button.title='Search by voice'};
 const stop=()=>{clearTimeout(silenceTimer);try{recognition?.stop()}catch{}reset()};
 const message=text=>{status.textContent=text;let hint=field.parentElement.querySelector('.voice-search-message');if(!hint){hint=document.createElement('p');hint.className='voice-search-message';hint.setAttribute('role','status');field.after(hint)}hint.textContent=text};
 if(!Recognition){button.disabled=true;button.setAttribute('aria-disabled','true');button.title='Voice search is unavailable in this browser';status.textContent='Voice search is unavailable in this browser. Type your search instead.'}
 button.onclick=()=>{if(active){stop();return}if(!Recognition){message('Voice search is unavailable in this browser. You can still type your search.');return}field.parentElement.querySelector('.voice-search-message')?.remove();spoken=false;const token=++session;
  try{recognition=new Recognition();recognition.lang=navigator.language||'en-US';recognition.continuous=false;recognition.interimResults=true;recognition.maxAlternatives=1;
   recognition.onstart=()=>{if(disposed||token!==session)return;active=true;button.classList.add('is-listening');button.setAttribute('aria-pressed','true');button.setAttribute('aria-label','Stop voice search');button.title='Listening… Click to stop';status.textContent='Listening. Say a title, actor, or director.'};
   recognition.onspeechstart=()=>{if(!disposed&&token===session){spoken=true;button.classList.add('is-speaking');status.textContent='Listening…'}};
   recognition.onspeechend=()=>{if(disposed||token!==session)return;button.classList.remove('is-speaking');stop()};
   recognition.onresult=e=>{if(disposed||token!==session||!input.isConnected)return;const transcript=Array.from(e.results).map(r=>r[0]?.transcript||'').join(' ').trim();if(transcript){input.value=transcript;input.dispatchEvent(new Event('input',{bubbles:true}));spoken=true;status.textContent=transcript;clearTimeout(silenceTimer);silenceTimer=setTimeout(stop,1800)}if(Array.from(e.results).every(r=>r.isFinal)){input.dispatchEvent(new Event('change',{bubbles:true}));stop()}};
   recognition.onnomatch=()=>message('No speech was recognized. Try again.');
   recognition.onerror=e=>{if(disposed||token!==session)return;reset();const messages={'not-allowed':'Microphone access was denied. Allow it in your browser’s site settings to use voice search.','service-not-allowed':'Voice search is unavailable in this browser. You can still type your search.','audio-capture':'No microphone is available. Connect one and try again.','no-speech':'No speech was detected. Try again.',network:'Voice search could not connect. Check your connection and try again.'};if(e.error!=='aborted')message(messages[e.error]||'Voice search could not start. Try again.')};
   recognition.onend=()=>{if(disposed||token!==session)return;reset();if(spoken&&input.value.trim())input.dispatchEvent(new Event('change',{bubbles:true}));else status.textContent='Voice search stopped.'};
   active=true;recognition.start();safetyTimer=setTimeout(stop,20000);
  }catch{reset();message('Voice search could not start. Try again.')}
 };
 const typing=e=>{if(e.isTrusted&&active){++session;try{recognition?.abort()}catch{}reset()}};
 const visibility=()=>{if(document.hidden){++session;try{recognition?.abort()}catch{}reset()}};
 input.addEventListener('input',typing);document.addEventListener('visibilitychange',visibility);
 return ()=>{disposed=true;++session;try{recognition?.abort()}catch{}reset();input.removeEventListener('input',typing);document.removeEventListener('visibilitychange',visibility);button.remove();status.remove()};
}
