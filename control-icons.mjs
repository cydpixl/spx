// Font-independent controls shared across current and legacy Spex surfaces.
const paths = {
 left:'M15 18l-6-6 6-6',right:'M9 6l6 6-6 6',up:'M6 15l6-6 6 6',down:'M6 9l6 6 6-6',
 close:'M6 6l12 12M18 6L6 18',external:'M14 3h7v7M21 3L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5',
 refresh:'M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 3M18 18a8 8 0 0 1-13-3',
 play:'M8 5l11 7-11 7Z',pause:'M8 5v14M16 5v14',copy:'M9 9h12v12H9ZM15 9V3H3v12h6',
 send:'M22 2L9 15M22 2l-8 20-5-7-7-5Z',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87',
 log:'M8 3h12v18H4V3h4ZM8 3v4h8V3M8 11h8M8 15h6',check:'M5 12l4 4L19 6',
 fullscreen:'M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5',star:'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z'
};
export const controlIcon = name => `<svg class="spex-control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${paths[name] || paths.right}"/>${name==='users'?'<circle cx="9" cy="7" r="4"/>':''}</svg>`;
const glyphs = {'←':'left','‹':'left','→':'right','›':'right','↑':'up','↓':'down','↗':'external','↻':'refresh','×':'close','▶':'play','Ⅱ':'pause','▾':'down','▼':'down','⛶':'fullscreen','☆':'star'};
const pattern = /[←‹→›↑↓↗↻×▶Ⅱ▾▼⛶☆]/g;
export function polishControlIcons(root = document.body) {
 const controls = [...(root.matches?.('button,a,summary,[aria-hidden="true"]')?[root]:[]), ...(root.querySelectorAll?.('button,a,summary,[aria-hidden="true"]') || [])];
 for (const control of controls) {
  if (control.closest('svg,code,pre,[contenteditable="true"],[data-party-chat-log]')) continue;
  const walker = document.createTreeWalker(control, NodeFilter.SHOW_TEXT), nodes=[];
  while(walker.nextNode()) if(!walker.currentNode.parentElement.closest('svg,option,code,pre') && /[←‹→›↑↓↗↻×▶Ⅱ▾▼⛶☆]/.test(walker.currentNode.data)) nodes.push(walker.currentNode);
  for(const node of nodes) {
   const text=node.data;
   if(text.includes('×') && text.trim()!=='×') continue;
   if(!control.getAttribute('aria-label') && !control.textContent.replace(pattern,'').trim()) {
    const name=glyphs[text.trim()];control.setAttribute('aria-label',({left:'Previous',right:'Next',up:'Move up',down:'Move down',close:'Close',play:'Play',pause:'Pause',refresh:'Reload',fullscreen:'Fullscreen',star:'Favorite'})[name]||'Open');
   }
   const fragment=document.createDocumentFragment();let from=0;
   for(const match of text.matchAll(pattern)) {fragment.append(text.slice(from,match.index));const template=document.createElement('template');template.innerHTML=controlIcon(glyphs[match[0]]);fragment.append(template.content);from=match.index+1;}
   fragment.append(text.slice(from));node.replaceWith(fragment);
  }
  if(control.matches('button,a') && control.querySelector('svg') && !control.textContent.trim()) control.classList.add('spex-icon-control');
 }
}
