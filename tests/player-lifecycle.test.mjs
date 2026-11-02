import test from 'node:test';
import assert from 'node:assert/strict';
import {bindPlayerLifecycle,togglePlayerFullscreen} from '../player-lifecycle.mjs';
function fixture(){
 let ms=0;const doc=new EventTarget(),win=new EventTarget(),queue=[];
 const dialog=Object.assign(new EventTarget(),{open:true,isConnected:true,ownerDocument:doc,querySelector(){return null},close(){this.open=false;this.dispatchEvent(new Event('close'))},showModal(){this.open=true}});
 let cleanup=0;const lifecycle=bindPlayerLifecycle(dialog,{document:doc,window:win,now:()=>ms,defer:fn=>queue.push(fn)});
 dialog.addEventListener('close',()=>cleanup++);
 return {dialog,doc,win,lifecycle,get cleanup(){return cleanup},advance:n=>ms+=n,flush:()=>queue.splice(0).forEach(fn=>fn())};
}
test('browser cancel stays blocked even after the old 500ms fullscreen guard expires',()=>{
 const f=fixture();f.doc.dispatchEvent(new Event('fullscreenchange'));f.advance(2000);
 const cancel=new Event('cancel',{cancelable:true});f.dialog.dispatchEvent(cancel);
 assert.equal(cancel.defaultPrevented,true);assert.equal(f.dialog.open,true);assert.equal(f.cleanup,0);
});
test('an unsolicited close restores the same dialog without running player teardown',()=>{
 const f=fixture();const same=f.dialog;f.dialog.open=false;f.dialog.dispatchEvent(new Event('close'));f.flush();
 assert.equal(f.dialog,same);assert.equal(f.dialog.open,true);assert.equal(f.cleanup,0);
 f.dialog.close();assert.equal(f.dialog.open,false);assert.equal(f.cleanup,1);
});
test('rotation and fullscreen exits do not turn the first Escape into navigation',()=>{
 const f=fixture();f.win.dispatchEvent(new Event('orientationchange'));
 const escape=()=>{const event=new Event('keydown',{cancelable:true});event.key='Escape';f.doc.dispatchEvent(event);return event};
 escape();assert.equal(f.dialog.open,true);f.advance(1600);f.doc.fullscreenElement={};escape();assert.equal(f.dialog.open,true);
 f.doc.fullscreenElement=null;f.doc.dispatchEvent(new Event('fullscreenchange'));escape();assert.equal(f.dialog.open,true);
 f.advance(1600);escape();assert.equal(f.dialog.open,false);assert.equal(f.cleanup,1);
});
test('closing deliberately during rotation still closes; a removed player is never resurrected',()=>{
 const f=fixture();f.win.dispatchEvent(new Event('resize'));f.dialog.close();f.flush();assert.equal(f.dialog.open,false);assert.equal(f.cleanup,1);
 const g=fixture();g.dialog.open=false;g.dialog.dispatchEvent(new Event('close'));g.lifecycle.destroy();g.dialog.isConnected=false;g.flush();assert.equal(g.dialog.open,false);
});
test('prefixed Safari fullscreen is used without routing or replacing video',async()=>{
 let calls=0,exit=0;const doc={documentElement:{webkitRequestFullscreen(){calls++}},webkitExitFullscreen(){exit++}};
 await togglePlayerFullscreen({document:doc});assert.equal(calls,1);doc.webkitFullscreenElement=doc.documentElement;
 await togglePlayerFullscreen({document:doc});assert.equal(exit,1);
});
test('fullscreen never opens an inactive or deliberately closed native player',()=>{
 const f=fixture();f.dialog.close();f.doc.dispatchEvent(new Event('fullscreenchange'));f.flush();assert.equal(f.dialog.open,false);
 const doc=new EventTarget(),win=new EventTarget();const unopened=Object.assign(new EventTarget(),{open:false,isConnected:true,ownerDocument:doc,querySelector(){return null},close(){},showModal(){this.open=true}});
 bindPlayerLifecycle(unopened,{document:doc,window:win,defer:fn=>fn()});doc.dispatchEvent(new Event('fullscreenchange'));assert.equal(unopened.open,false);
 unopened.showModal();unopened.open=false;const e=new Event('close');unopened.dispatchEvent(e);doc.dispatchEvent(new Event('fullscreenchange'));assert.equal(unopened.open,true);
});
