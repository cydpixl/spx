import test from 'node:test';
import assert from 'node:assert/strict';
import {bindAirPlay} from '../airplay.mjs';
import {controlLayout} from '../player-layout.mjs';
function node(){const el=new EventTarget(),attrs=new Map();return Object.assign(el,{hidden:false,title:'',setAttribute:(k,v)=>attrs.set(k,String(v)),getAttribute:k=>attrs.get(k),removeAttribute:k=>attrs.delete(k),classList:{toggle(){}},click(){el.dispatchEvent(new Event('click'))}})}
test('opens the real WebKit picker from the click; availability never fakes a connection',()=>{
 const video=node(),button=node();let calls=0;
 video.webkitShowPlaybackTargetPicker=()=>calls++;video.disableRemotePlayback=true;
 const destroy=bindAirPlay(video,button);
 assert.equal(button.hidden,false);assert.equal(video.disableRemotePlayback,false);assert.equal(video.getAttribute('x-webkit-airplay'),'allow');
 button.click();assert.equal(calls,1);assert.equal(button.getAttribute('aria-pressed'),'false');
 const available=new Event('webkitplaybacktargetavailabilitychanged');available.availability='available';video.dispatchEvent(available);
 assert.equal(button.getAttribute('aria-pressed'),'false');
 video.webkitCurrentPlaybackTargetIsWireless=true;video.dispatchEvent(new Event('webkitcurrentplaybacktargetiswirelesschanged'));assert.equal(button.getAttribute('aria-pressed'),'true');
 video.webkitCurrentPlaybackTargetIsWireless=false;video.dispatchEvent(new Event('webkitcurrentplaybacktargetiswirelesschanged'));assert.equal(button.getAttribute('aria-pressed'),'false');
 destroy();button.click();assert.equal(calls,1);
});
test('unsupported browsers hide the picker button; a denied picker reports an error',()=>{
 const unsupported=node(),hidden=node();bindAirPlay(unsupported,hidden);assert.equal(hidden.hidden,true);
 const video=node(),button=node(),errors=[];video.webkitShowPlaybackTargetPicker=()=>{throw Error('Denied')};bindAirPlay(video,button,{onError:x=>errors.push(x)});button.click();assert.equal(errors.length,1);assert.equal(button.getAttribute('aria-pressed'),'false');
});
test('new AirPlay action migrates into existing layouts but respects explicit removal',()=>{
 const old={controlLayout:{top:[],left:['play'],right:['pip','settings'],available:['next']}};
 assert.ok(controlLayout(old).right.includes('airplay'));
 const hidden={...old,hiddenControls:['airplay']};assert.ok(controlLayout(hidden).available.includes('airplay'));assert.ok(!controlLayout(hidden).right.includes('airplay'));
 const video=node(),button=node();video.webkitShowPlaybackTargetPicker=()=>{};bindAirPlay(video,button,{visible:false});assert.equal(button.hidden,true);
});
