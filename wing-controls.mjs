function row(panel,label,selected,action){const b=document.createElement('button');b.className='stream-menu-row';b.textContent=label;b.setAttribute('aria-pressed',String(selected));b.onclick=()=>{action();for(const sibling of panel.querySelectorAll('[aria-pressed]'))sibling.setAttribute('aria-pressed',String(sibling===b))};panel.append(b);return b;}
export function wingQualityMenu(player,panel,close){
 const levels=player.videoInfo?.levels||[];
 row(panel,'Auto',player.wingQuality===undefined||player.wingQuality===-1,()=>{player.wingQuality=-1;player.quality='Auto';player.command('quality',-1);close()});
 for(const level of levels)row(panel,(level.height?level.height+'p':'Quality '+(level.id+1))+(level.bitrate?' · '+(level.bitrate/1e6).toFixed(1)+' Mbps':''),player.wingQuality===level.id,()=>{player.wingQuality=level.id;player.quality=level.height?level.height+'p':'Manual';player.command('quality',level.id);close()});
 if(!levels.length){const p=document.createElement('p');p.className='stream-menu-description';p.textContent='This stream uses the quality available from the server. Safari manages HLS quality automatically.';panel.append(p)}
}
export function wingTrackMenu(player,panel){
 const info=player.videoInfo||{},heading=document.createElement('p');heading.className='stream-menu-label';heading.textContent='Video subtitles';panel.append(heading);
 const group=document.createElement('div');panel.append(group);
 row(group,'Off',player.wingSubtitle===undefined||player.wingSubtitle===-1,()=>{player.wingSubtitle=-1;player.command('subtitle',-1)});
 const language=code=>{try{return new Intl.DisplayNames(['en'],{type:'language'}).of(code)||code}catch{return code}};
 (info.captions||[]).forEach((c,i)=>row(group,language(c.language),player.wingSubtitle===i,()=>{player.wingSubtitle=i;player.command('subtitle',i)}));
 const audio=document.createElement('p');audio.className='stream-menu-label';audio.textContent='Audio';panel.append(audio);const tracks=document.createElement('div');panel.append(tracks);
 if(!info.audioTracks?.length){const p=document.createElement('p');p.className='stream-menu-description';p.textContent='Default audio track';tracks.append(p)}
 for(const track of info.audioTracks||[])row(tracks,track.name||language(track.language)||'Track '+(track.id+1),info.audioTrack===track.id,()=>player.command('audio',track.id));
}
