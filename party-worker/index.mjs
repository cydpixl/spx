import {domainHealth} from './domain-health.mjs';
import {chatMessage} from './chat.mjs';
import {DurableObject} from 'cloudflare:workers';

const TTL = 12 * 60 * 60 * 1000;
const hex = bytes => [...crypto.getRandomValues(new Uint8Array(bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
export const validSession = s => !!s && ['native', 'cinesrc', 'moviesapi', 'aniembed'].includes(s.source) && typeof s.media === 'string' && /^\/watch\/(?:buddy|clown-panic|the-traitors|tmdb-(?:movie|tv)-\d+)(?:\/\d{1,3}\/\d{1,3})?$/.test(s.media) && (s.audio === undefined || ['sub', 'dub'].includes(s.audio));
const same = (a,b) => a?.source === b?.source && a?.media === b?.media && a?.audio === b?.audio;
const allowed = origin => /^https:\/\/(?:[a-z0-9-]+\.)?(?:spx7|bogart|spx-1fa|spex-dzd)\.pages\.dev$/.test(origin) || ['https://spx7.web.app','https://spx7.firebaseapp.com','https://spex-pixl.web.app','https://spex-pixl.firebaseapp.com','https://cydpixl.github.io'].includes(origin) || /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url), origin = request.headers.get('Origin') || '';
    const headers = {'Access-Control-Allow-Origin': allowed(origin) ? origin : 'null', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin', 'Cache-Control': 'no-store'};
    const reply = (error, status) => Response.json({error}, {status, headers});
    if (url.pathname === '/health') return Response.json({ok:true, version:2, chat:true}, {headers});
    if (!allowed(origin)) return reply('Origin not allowed.',403);
    if(url.pathname==='/domains/health'&&request.method==='GET')return domainHealth(request,headers,ctx);
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
    if (url.pathname === '/rooms' && request.method === 'POST') {
      if (Number(request.headers.get('Content-Length')) > 2048) return reply('Request too large.',413);
      let body; try { const raw=await request.text(); if(raw.length>2048)return reply('Request too large.',413); body=JSON.parse(raw); } catch { return reply('Invalid request.',400); }
      if (!validSession(body.session)) return reply('Choose a compatible video first.',400);
      const room=hex(12), token=hex(32);
      await env.ROOMS.getByName(room).create(body.session,token);
      return Response.json({room,token},{status:201,headers});
    }
    const match=/^\/rooms\/([a-f0-9]{24})$/.exec(url.pathname);
    if (match && request.method === 'GET' && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') return env.ROOMS.getByName(match[1]).fetch(request);
    return reply('Not found.',404);
  }
};

export class WatchRoom extends DurableObject {
  async create(session, token) {
    await this.ctx.storage.put('room',{session,token,revision:1,state:null,expires:Date.now()+TTL});
    await this.ctx.storage.setAlarm(Date.now()+TTL);
  }
  sockets() { return this.ctx.getWebSockets().filter(ws => ws.readyState === 1); }
  send(ws, data) { try { ws.send(JSON.stringify(data)); } catch { /* close callback handles departing viewers */ } }
  broadcast(data) { for(const ws of this.sockets()) if(ws.deserializeAttachment()?.joined)this.send(ws,data); }
  presence() {
    const members=this.sockets().map(ws=>ws.deserializeAttachment()).filter(m=>m?.joined).map(({id,name,role,ready,drift})=>({id,name,role,ready,drift}));
    this.broadcast({type:'presence',members,hostOnline:members.some(m=>m.role==='host')});
  }
  async fetch() {
    const room=await this.ctx.storage.get('room');
    if(!room||room.expires<Date.now())return new Response('This party has expired. Start a new party.',{status:404});
    if(this.sockets().length>=12)return new Response('This party is full (12 viewers).',{status:429});
    const [client,server]=Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({joined:false,connected:Date.now(),window:Date.now(),count:0});
    return new Response(null,{status:101,webSocket:client});
  }
  async webSocketMessage(ws,raw) {
    if(typeof raw!=='string'||raw.length>4096){ws.close(1009,'Message too large');return;}
    let d;try{d=JSON.parse(raw);}catch{return;}
    if(!d||typeof d!=='object')return;
    const m=ws.deserializeAttachment();
    if(Date.now()-m.window>1000){m.window=Date.now();m.count=0;}
    if(++m.count>30){ws.close(1008,'Too many updates');return;}
    ws.serializeAttachment(m);
    const room=await this.ctx.storage.get('room');
    if(!room||room.expires<Date.now()){ws.close(4004,'Party expired');return;}
    if(d.type==='hello'&&!m.joined) {
      if(!/^[a-f0-9-]{36}$/.test(d.id||'')){ws.close(1008,'Invalid viewer');return;}
      const role=d.token===room.token?'host':'guest';
      if(d.token&&role!=='host'){ws.close(1008,'Invalid host token');return;}
      for(const other of this.sockets()) {
        const prior=other.deserializeAttachment();
        if(other!==ws&&(prior?.id===d.id||role==='host'&&prior?.role==='host'))other.close(4001,'Reconnected elsewhere');
      }
      Object.assign(m,{joined:true,id:d.id,name:String(d.name||'Viewer').slice(0,40),role,ready:false});
      ws.serializeAttachment(m);
      this.send(ws,{type:'welcome',role,session:room.session,revision:room.revision,state:room.state,chat:await this.ctx.storage.get('chat')||[],now:Date.now()});
      this.presence();return;
    }
    if(!m.joined){ws.close(1008,'Join the room first');return;}
    if(d.type==='ping'){this.send(ws,{type:'pong',sent:d.sent,now:Date.now()});return;}
    if(d.type==='ready') {m.ready=d.ready===true;ws.serializeAttachment(m);this.presence();if(m.ready&&room.state)this.send(ws,{...room.state,type:'state'});return;}
    if(d.type==='ack'){m.drift=Number.isFinite(d.drift)?Math.max(-86400,Math.min(86400,d.drift)):null;ws.serializeAttachment(m);return;}
    if(d.type==='resync'){if(room.state)this.send(ws,{...room.state,type:'state',force:true});return;}
    if(d.type==='leave'){ws.close(1000,'Left party');return;}
    if(d.type==='chat'){
      const message=chatMessage(d,m);if(!message)return;
      if(Date.now()-(m.lastChat||0)<1000){this.send(ws,{type:'chat-error',message:'Please wait a moment before sending again.'});return;}
      m.lastChat=Date.now();ws.serializeAttachment(m);
      let duplicate=false;
      await this.ctx.storage.transaction(async txn=>{const history=await txn.get('chat')||[];duplicate=history.some(x=>x.author===m.id&&x.nonce===d.nonce);if(!duplicate)await txn.put('chat',[...history,message].slice(-100));});
      if(!duplicate)this.broadcast({type:'chat',message});return;
    }
    if(m.role!=='host')return;
    if(d.type==='session'&&validSession(d.session)) {
      room.session=d.session;room.revision++;room.state=null;
      await this.ctx.storage.put('room',room);
      for(const socket of this.sockets()){const member=socket.deserializeAttachment();member.ready=false;socket.serializeAttachment(member);}
      this.broadcast({type:'session',session:room.session,revision:room.revision});this.presence();return;
    }
    if(d.type==='state'&&d.revision===room.revision&&same(d.session,room.session)&&Number.isFinite(d.position)&&d.position>=0&&d.position<86400&&Number.isFinite(d.duration)&&d.duration>0&&d.duration<86400&&typeof d.playing==='boolean') {
      room.state={type:'state',position:Math.min(d.position,d.duration),duration:d.duration,playing:d.playing,rate:Number.isFinite(d.rate)?Math.min(2,Math.max(.25,d.rate)):1,sent:Date.now(),revision:room.revision,force:d.force===true};
      await this.ctx.storage.put('room',room);
      this.broadcast(room.state);
    }
  }
  webSocketClose(ws) {try{ws.close(1000,'Connection closed')}catch{}this.presence();}
  webSocketError(ws) {try{ws.close(1011,'Connection lost')}catch{}this.presence();}
  async alarm(){for(const ws of this.sockets())ws.close(4004,'Party expired');await this.ctx.storage.deleteAll();}
}
