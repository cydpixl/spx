import {movieRisk,sportsRisk} from './source-insights.mjs?v=20261029-access77';

const KEY='spex.source-performance.v1',TTL=7*86400000;
function read(){try{const data=JSON.parse(localStorage.getItem(KEY)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{}}catch{return {}}}
const keyFor=(source,{sports=false,restricted=true}={})=>`${sports?'sports':'catalog'}:${source.id||source.provider}:${restricted?'restricted':'standard'}`;
// Only player events count. An iframe load is never evidence of decoded playback.
export function recordSourceResult(source,result,options={}){
 if(!['playing','error'].includes(result))return;
 const data=read(),key=keyFor(source,options),old=data[key],now=Date.now();
 if(old&&now-old.at<30000&&old.result===result)return;
 const entry=old&&now-old.at<TTL?old:{success:0,failure:0};
 data[key]={success:Math.min(20,(Number(entry.success)||0)+(result==='playing'?1:0)),failure:Math.min(20,(Number(entry.failure)||0)+(result==='error'?1:0)),at:now,result};
 const recent=Object.fromEntries(Object.entries(data).filter(([,value])=>value&&now-value.at<TTL).slice(-100));
 try{localStorage.setItem(KEY,JSON.stringify(recent))}catch{}
}
export function sourceScore(source,{sports=false,restricted=true,now=Date.now(),history=read()}={}){
 const risk=sports?sportsRisk(source):movieRisk(source,restricted);
 // The dated catalog samples were collected in a particular playback mode.
 const sampleMatches=source.id==='vidcore'||source.id==='yapgrid'||source.id==='cinesrc'||source.id==='moviesapi'||source.id==='braflix-dev'||source.id==='screenscape'||source.id==='cinextream'?restricted:!restricted;
 const level=sports||sampleMatches?risk.level:'unknown';
 let score=({good:90,unknown:50,caution:35,danger:5})[level]??50;
 const reasons=[level==='good'?'Playback observed in this mode':level==='danger'?'A playback or advertising problem was observed':level==='caution'?'Playback observed with advertising concerns':'No current playback sample for this mode'];
 if(sports){if(source.sandbox){score+=12;reasons.push('Restricted player')}if(source.hd)score+=3;}
 else {if(source.controls){score+=4;reasons.push('Integrated playback controls')}if(source.ads||source.advertising)score-=8;}
 const entry=history[keyFor(source,{sports,restricted})];
 if(entry&&Number.isFinite(entry.at)&&now-entry.at<TTL){const weight=Math.max(0,1-(now-entry.at)/TTL);score+=Math.max(-35,Math.min(20,(Number(entry.success)||0)*4-(Number(entry.failure)||0)*12))*weight;reasons.push('Recent playback events on this browser');}
 return {score,reason:reasons.join(' · ')};
}
export function rankSources(sources,options={}){
 const history=read();return sources.map((source,index)=>({source,index,...sourceScore(source,{...options,history})})).sort((a,b)=>b.score-a.score||a.index-b.index).map(entry=>entry.source);
}
