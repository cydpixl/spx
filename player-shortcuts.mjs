// Shared by the native video and embedded player so focus and key mapping agree.
export function playerShortcut(event){
 if(event.defaultPrevented||event.isComposing||event.ctrlKey||event.metaKey||event.altKey)return null;
 const path=event.composedPath?.()||[event.target];
 if(path.some(node=>node?.matches?.('input:not([data-timeline]):not(#seek),select,textarea,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="slider"],[role="listbox"],[role="menu"],[role="menuitem"]')))return null;
 const key=String(event.key||'').toLowerCase();
 if(['arrowleft','i','j'].includes(key))return 'back';
 if(['arrowright','k','l'].includes(key))return 'forward';
 if(key===' '||event.code==='Space')return path.some(node=>node?.matches?.('button,a[href],[role="button"]'))?null:'toggle';
 if(key==='f')return 'fullscreen';
 if(key==='m')return 'mute';
 return null;
}
