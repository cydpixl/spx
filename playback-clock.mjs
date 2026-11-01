// Anchor to provider messages, not to when the subtitle renderer happens to run.
export class PlaybackClock {
 constructor({now=()=>performance.now(),maxAge=10000}={}){this.now=now;this.maxAge=maxAge;this.reset()}
 reset(){this.position=0;this.at=this.now();this.playing=false;this.buffering=false;this.rate=1;this.observed=false;this.lastReport=this.at}
 current(){
  if(!this.observed||this.now()-this.lastReport>this.maxAge)return null;
  return this.position+(this.playing&&!this.buffering?Math.max(0,this.now()-this.at)/1000*this.rate:0);
 }
 observe({position,playing,rate,buffering}={}){
  const now=this.now(),estimated=this.current();
  if(Number.isFinite(position)&&position>=0){this.position=position;this.observed=true;this.lastReport=now}
  else if(estimated!==null)this.position=estimated;
  this.at=now;
  if(typeof playing==='boolean')this.playing=playing;
  if(typeof buffering==='boolean')this.buffering=buffering;
  if(Number.isFinite(rate)&&rate>=.25&&rate<=4)this.rate=rate;
 }
}
