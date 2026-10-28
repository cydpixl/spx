export function chatText(value){return typeof value==='string'?value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim().slice(0,500):''}
export function chatMessage(data,member,now=Date.now()){
 const text=chatText(data.text);if(!text||!member?.joined||typeof data.nonce!=='string'||!/^[a-f0-9-]{36}$/.test(data.nonce))return null;
 return {id:crypto.randomUUID(),nonce:data.nonce,author:member.id,name:chatText(member.name).slice(0,40)||'Viewer',text,at:now};
}
