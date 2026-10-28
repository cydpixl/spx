export const starterLists=[
 {id:'twists',name:'One more twist',note:'Mysteries that keep you guessing',type:'movie',ids:[27205,11324,807,77,146233,1124]},
 {id:'scifi',name:'Beyond this world',note:'A night of science fiction',type:'movie',ids:[157336,329865,603,335984,286217,438631]},
 {id:'family',name:'Family movie night',note:'Animated favorites for everyone',type:'movie',ids:[862,12,129,14160,10193,508943]},
 {id:'series',name:'The next episode',note:'Shows worth settling into',type:'tv',ids:[1396,70523,100088,95396,66732,2316]}
];
export function mountStarterLists(host,{metadata,remember,save}){
 const section=document.createElement('section');section.className='starter-lists';section.innerHTML='<div class="row-heading"><h2>Ready-made lists</h2></div><div class="starter-list-grid">'+starterLists.map(list=>'<article><div class="starter-art" data-starter-art="'+list.id+'"></div><h3>'+list.name+'</h3><p>'+list.note+'</p><button class="subtle-pill" data-starter-save="'+list.id+'">Save '+list.ids.length+' titles</button></article>').join('')+'</div>';host.prepend(section);
 section.querySelectorAll('[data-starter-save]').forEach(b=>b.onclick=()=>save(starterLists.find(l=>l.id===b.dataset.starterSave)));
 void Promise.allSettled(starterLists.flatMap(list=>list.ids.slice(0,3).map(async id=>{try{const item=remember(await metadata('/api/title-details',{type:list.type,id}));if(!section.isConnected||!item.poster)return;const image=document.createElement('img');image.src=item.poster;image.alt=item.title;image.loading='lazy';section.querySelector('[data-starter-art="'+list.id+'"]').append(image)}catch{}})));
}
