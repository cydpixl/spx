import test from 'node:test';
import assert from 'node:assert/strict';
import {PlaybackClock} from '../playback-clock.mjs';
import {ProviderPlayer,providers} from '../provider-player.mjs';
import {parseSubtitles,referenceOffset} from '../subtitle-browser.mjs';

function fixture(){let ms=0;const clock=new PlaybackClock({now:()=>ms});return {clock,advance:n=>ms+=n}}
test('clock continues between sparse position reports beyond 2.5 seconds',()=>{
 const {clock,advance}=fixture();assert.equal(clock.current(),null);
 clock.observe({position:60,playing:true});advance(4000);assert.equal(clock.current(),64);
 clock.observe({position:64,playing:true});advance(1000);assert.equal(clock.current(),65);
});
test('pause, resume, speed changes and buffering preserve the current time',()=>{
 const {clock,advance}=fixture();clock.observe({position:10,playing:true});advance(1000);
 clock.observe({playing:false});advance(2000);assert.equal(clock.current(),11);
 clock.observe({playing:true,rate:2});advance(1500);assert.equal(clock.current(),14);
 clock.observe({buffering:true});advance(1000);assert.equal(clock.current(),14);
 clock.observe({position:14,buffering:false});advance(1000);assert.equal(clock.current(),16);
});
test('identical authoritative positions refresh the anchor and prevent drift while stalled',()=>{
 const {clock,advance}=fixture();clock.observe({position:20,playing:true});advance(1000);
 clock.observe({position:20});assert.equal(clock.current(),20);
 advance(10001);assert.equal(clock.current(),null);
 clock.observe({position:25});assert.equal(clock.current(),25);
 clock.reset();assert.equal(clock.current(),null);
});
test('forward and backward seeks re-anchor immediately',()=>{
 const {clock,advance}=fixture();clock.observe({position:20,playing:true});advance(4000);
 clock.observe({position:100});assert.equal(clock.current(),100);
 clock.observe({position:5,playing:false});advance(1000);assert.equal(clock.current(),5);
});
function playerFixture(id){
 const f=fixture(),frame={contentWindow:{}};
 const player=Object.assign(Object.create(ProviderPlayer.prototype),{
  frame,provider:providers.find(p=>p.id===id),item:{type:'movie',id:1},state:{position:0,duration:100,playing:false},clock:f.clock,
  sourceResultRecorded:true,paint(){},status(){},persist(){},command(){}
 });
 return {...f,player,send:data=>player.receive({source:frame.contentWindow,origin:player.provider.origin,data})};
}
test('provider replies update the clock at receipt even when position repeats',()=>{
 const {player,send,advance}=playerFixture('cinesrc');
 send({type:'cinesrc:play',currentTime:20});advance(3000);assert.equal(player.clock.current(),23);
 send({type:'cinesrc:response',command:'getCurrentTime',result:20});assert.equal(player.clock.current(),20);
 send({type:'cinesrc:response',command:'getPlaybackRate',result:2});advance(1000);assert.equal(player.clock.current(),22);
 send({type:'cinesrc:pause'});advance(2000);assert.equal(player.clock.current(),22);
});
test('pending seeks reject stale reports for the subtitle clock too',()=>{
 const {player,send}=playerFixture('cinesrc');send({type:'cinesrc:play',currentTime:10});
 player.pendingSeek={target:100,at:Date.now()};send({type:'cinesrc:timeupdate',currentTime:11});assert.equal(player.clock.position,10);
 send({type:'cinesrc:seeked',currentTime:100});assert.equal(player.clock.position,100);
});
test('messages from other frames cannot change the playback clock',()=>{
 const {player}=playerFixture('cinesrc');player.receive({source:{},origin:player.provider.origin,data:{type:'cinesrc:play',currentTime:50}});
 assert.equal(player.clock.current(),null);
});
test('subtitle parsing preserves milliseconds and reference offset uses the same sign',()=>{
 const cues=parseSubtitles('1\n00:00:10,250 --> 00:00:12,500\nThis is the first dialogue.\n\n2\n00:00:14,000 --> 00:00:15,000\nThis is the second dialogue.\n\n3\n00:00:18,000 --> 00:00:19,000\nThis is the third dialogue.');
 assert.equal(cues[0].start,10.25);assert.equal(cues[0].end,12.5);
 assert.equal(referenceOffset(cues,cues.map(c=>({...c,start:c.start-2,end:c.end-2}))),-2);
});
