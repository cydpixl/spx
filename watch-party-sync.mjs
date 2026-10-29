// One authoritative timeline per room. Video stays in each viewer's player.
export class SyncRoom {
 constructor(options){Object.assign(this,options);this.role=null;this.ready=false;this.members=[];this.offset=0;this.samples=[];this.revision=0;this.timer=setInterval(()=>this.tick(),1000);this.online=()=>{if(this.role&&!this.connected)this.connect()?.catch(()=>{})};window.addEventListener('online',this.online);}
 get connected(){return this.socket?.readyState===1&&this.joined;}
 snapshot(extra={}){this.update({role:this.role,connected:this.connected,ready:this.ready,room:this.room,members:this.members,hostOnline:this.members.some(m=>m.role==='host'),chat:this.chat||[],...extra});}
 async start(role,room){
  this.leave();const generation=this.generation;this.clientId=crypto.randomUUID();this.role=role;
  try{
   if(role==='host'){
    const response=await fetch(this.endpoint+'/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session:this.getSession()}),signal:AbortSignal.timeout(12000)});
    const data=await response.json();if(this.generation!==generation)return;if(!response.ok)throw Error(data.error||'Could not create party.');this.room=data.room;this.token=data.token;
   }else{if(!/^[a-f0-9]{24}$/.test(room))throw Error('Enter a valid party code or invite link.');this.room=room;}
   this.snapshot({error:null,chatError:null,drift:null});await this.connect();if(this.generation===generation)this.remember();
  }catch(error){if(this.generation!==generation)return;this.leave();throw error;}
 }
 connect(){
  if(!this.role||this.connecting)return this.connecting;
  clearTimeout(this.retry);this.socket?.close();this.joined=false;
  const socket=this.socket=new WebSocket(this.endpoint.replace(/^http/,'ws')+'/rooms/'+this.room);
  this.connecting=new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>{reject(Error('Connection timed out. Please try again.'));socket.close();},15000);
   this.cancelConnect=()=>{clearTimeout(timeout);reject(Error('Connection cancelled.'))};
   socket.onopen=()=>{if(this.socket!==socket){socket.close();return}this.lastReceived=Date.now();this.send({type:'hello',id:this.clientId,name:this.getName?.()||'Viewer',token:this.token});};
   socket.onmessage=event=>{
    if(this.socket!==socket)return;this.lastReceived=Date.now();let d;try{d=JSON.parse(event.data);}catch{return;}
    if(d.type==='welcome'){clearTimeout(timeout);this.joined=true;this.attempt=0;this.connecting=null;this.cancelConnect=null;this.role=d.role;this.chat=Array.isArray(d.chat)?d.chat.slice(-100):[];this.receiveSession(d,true);this.snapshot({error:null});this.send({type:'ready',ready:this.ready});resolve();}
    else this.receive(d);
   };
   socket.onerror=()=>{};
   socket.onclose=event=>{
    clearTimeout(timeout);if(this.socket!==socket)return;this.connecting=null;this.cancelConnect=null;this.joined=false;this.members=[];this.target=null;this.onDisconnect?.();
    if([1008,4001,4004].includes(event.code)){this.leave();this.snapshot({error:event.reason||'Party ended.'});reject(Error(event.reason||'Party ended.'));return;}
    this.snapshot({error:'Connection lost. Reconnecting…'});reject(Error('Could not connect. The room may have expired or be full.'));
    if(this.role)this.retry=setTimeout(()=>this.connect()?.catch(()=>{}),Math.min(15000,800*2**Math.min(this.attempt=(this.attempt||0)+1,4)));
   };
  });return this.connecting;
 }
 send(data){if(this.socket?.readyState===1)this.socket.send(JSON.stringify(data));}
 receiveSession(d,welcome=false){
  const changed=this.revision!==d.revision;this.revision=d.revision;
  if(this.role==='guest'&&(changed||!this.ready)||this.role==='host'&&welcome){this.ready=false;this.target=null;this.restoring=this.role==='host';this.onSession(d.session);}
  if(this.role==='host'&&!welcome&&changed&&this.getState())this.markReady(true);
 }
 receive(d){
  if(d.type==='chat'&&d.message?.id&&typeof d.message.text==='string'){this.chat=[...(this.chat||[]).filter(m=>m.id!==d.message.id),d.message].slice(-100);this.snapshot({chatError:null});}
  if(d.type==='chat-error')this.snapshot({chatError:d.message});
  if(d.type==='session'){this.receiveSession(d);this.snapshot();}
  if(d.type==='presence'){this.members=d.members||[];if(this.role==='guest'&&!this.members.some(m=>m.role==='host'&&m.ready)){this.target=null;this.onDisconnect?.();}this.snapshot();}
  if(d.type==='pong'&&Number.isFinite(d.sent)&&Number.isFinite(d.now)){
   const rtt=Date.now()-d.sent;if(rtt>=0&&rtt<10000){this.samples.push({rtt,offset:d.now-d.sent-rtt/2});this.samples=this.samples.slice(-10);this.offset=this.samples.reduce((a,b)=>a.rtt<b.rtt?a:b).offset;}
  }
  if(d.type==='state'&&this.role==='guest'&&this.ready&&this.members.some(m=>m.role==='host'&&m.ready)&&d.revision===this.revision&&Number.isFinite(d.position)&&Number.isFinite(d.sent)){
   this.target=d;const target=this.targetState(),local=this.getState();
   const drift=local?local.position-target.position:null;this.snapshot({drift});this.applyState(target);this.send({type:'ack',drift});
  }
 }
 targetState(){const s=this.target;if(!s)return null;return {...s,position:Math.min(s.duration,s.position+(s.playing?Math.max(0,Math.min(10,(Date.now()+this.offset-s.sent)/1000))*s.rate:0))};}
 markReady(value=true){if(this.ready===value)return;this.ready=value;this.send({type:'ready',ready:value});this.snapshot();}
 sessionChanged(){this.ready=false;this.target=null;this.send({type:'ready',ready:false});this.send({type:'session',session:this.getSession()});this.snapshot();}
 broadcast(force=false){if(this.role!=='host'||!this.connected||!this.ready)return;const state=this.getState();if(!state||Date.now()-state.at>4000)return;const now=Date.now();if(!force&&now-(this.lastBroadcast||0)<900)return;this.lastBroadcast=now;this.send({type:'state',...state,session:this.getSession(),revision:this.revision,force});}
 tick(){if(!this.connected)return;if(Date.now()-this.lastReceived>20000){this.socket.close();return;}if(Date.now()-(this.lastPing||0)>5000){this.lastPing=Date.now();this.send({type:'ping',sent:Date.now()});}if(this.role==='host')this.broadcast();}
 sendChat(text){if(!this.connected)return false;if(Date.now()-(this.lastChatSent||0)<1000){this.snapshot({chatError:'Please wait a moment before sending again.'});return false;}this.lastChatSent=Date.now();this.send({type:'chat',text,nonce:crypto.randomUUID()});return true;}
 resync(){this.send({type:'resync'});}
 remember(){try{sessionStorage.setItem('spex.party.session',JSON.stringify({role:this.role,room:this.room,token:this.token,clientId:this.clientId}));}catch{}}
 async resume(){let saved;try{saved=JSON.parse(sessionStorage.getItem('spex.party.session'));}catch{}if(!saved||!['host','guest'].includes(saved.role)||!/^[a-f0-9]{24}$/.test(saved.room))return;Object.assign(this,saved);this.snapshot();try{await this.connect();}catch{this.snapshot({error:'Reconnecting to your party…'});}}
 leave(){this.generation=(this.generation||0)+1;this.cancelConnect?.();this.cancelConnect=null;this.attempt=0;this.lastChatSent=0;this.lastBroadcast=0;this.lastPing=0;try{sessionStorage.removeItem('spex.party.session');}catch{}clearTimeout(this.retry);const socket=this.socket;this.socket=null;this.role=null;this.room=null;this.token=null;this.expected=null;this.restoring=false;this.joined=false;this.connecting=null;this.ready=false;this.target=null;this.members=[];this.chat=[];this.revision=0;this.samples=[];this.offset=0;socket?.close(1000,'Left party');this.snapshot({drift:null,error:null,chatError:null});}
 destroy(){let saved;try{saved=sessionStorage.getItem('spex.party.session');}catch{}this.leave();if(saved)try{sessionStorage.setItem('spex.party.session',saved);}catch{}clearInterval(this.timer);window.removeEventListener('online',this.online);}
}
