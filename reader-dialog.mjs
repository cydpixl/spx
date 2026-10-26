// Reader overlays use explicit inert state. Removing a native modal during route
// changes can leave the embedded browser's document blocked after it disappears.
export function showReaderDialog(dialog){
 const previous=document.activeElement,blocked=new Map();let closed=false;
 for(const node of document.body.children){if(node===dialog||['SCRIPT','STYLE','LINK'].includes(node.tagName))continue;blocked.set(node,node.hasAttribute('inert'));node.setAttribute('inert','')}
 const nativeClose=dialog.close.bind(dialog);
 const release=()=>{if(closed)return;closed=true;for(const [node,wasInert]of blocked)if(!wasInert)node.removeAttribute('inert');blocked.clear();dialog.removeEventListener('keydown',keys);if(previous?.isConnected)previous.focus({preventScroll:true})};
 const keys=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dialog.close();return}if(event.key!=='Tab')return;const candidates=[...dialog.querySelectorAll('button,a[href],input,select,textarea,[tabindex]')].filter(node=>!node.disabled&&node.tabIndex>=0&&node.getClientRects().length);if(!candidates.length){event.preventDefault();dialog.focus();return}const first=candidates[0],last=candidates[candidates.length-1];if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus()}else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus()}};
 dialog.close=(...args)=>{release();if(dialog.open)nativeClose(...args)};
 dialog.addEventListener('keydown',keys);dialog.addEventListener('close',release,{once:true});dialog.setAttribute('aria-modal','true');dialog.tabIndex=-1;
 try{dialog.show();(dialog.querySelector('button')||dialog).focus({preventScroll:true})}catch(error){release();throw error}
}
