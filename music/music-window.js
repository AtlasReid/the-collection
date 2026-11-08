const geometryStyles=['position','left','top','right','bottom','width','height','minWidth','minHeight','maxWidth','maxHeight','margin','flex','boxSizing'];
const positive=value=>Number.isFinite(value)&&value>0;

/** Fill the usable desktop while retaining at least one pixel on tiny hosts. */
export function musicWindowBounds(host,insets={}) {
  const width=Math.max(0,Number(host.clientWidth)||0),height=Math.max(0,Number(host.clientHeight)||0);
  if(!width||!height)return null;
  const edge=key=>Math.max(0,Number(insets[key])||0);
  const left=Math.min(edge('left'),width-1),top=Math.min(edge('top'),height-1);
  const right=Math.min(edge('right'),width-left-1),bottom=Math.min(edge('bottom'),height-top-1);
  return {left,top,width:width-left-right,height:height-top-bottom};
}

function fitNormal(rect,bounds) {
  const width=Math.min(Math.max(1,rect.width),bounds.width),height=Math.min(Math.max(1,rect.height),bounds.height);
  return {
    left:Math.max(bounds.left,Math.min(rect.left,bounds.left+bounds.width-width)),
    top:Math.max(bounds.top,Math.min(rect.top,bounds.top+bounds.height-height)),width,height,
  };
}

/** Music's desktop lifecycle, independent of its library and audio implementation. */
export function createMusicWindow({host,element,handle,windows,insets={top:0,right:0,bottom:54,left:0},onChange=()=>{}}) {
  if(!host||!element||!handle||!windows)throw new TypeError('Music needs a desktop, window, titlebar and window manager.');
  const reserve={top:0,right:0,bottom:54,left:0,...insets};
  const original=Object.fromEntries(geometryStyles.map(key=>[key,element.style[key]]));
  const originalHidden=element.hidden;
  const originalState=element.getAttribute('data-window-state'),originalMaximized=element.getAttribute('data-window-maximized');
  const hadMusicClass=element.classList.contains('it-music-window');
  const hadMaximizedClass=element.classList.contains('it-music-window-maximized');
  const hadDraggableClass=element.classList.contains('it-draggable-window');
  const read=()=>({left:element.offsetLeft,top:element.offsetTop,width:element.offsetWidth,height:element.offsetHeight});
  let normal=read(),prepared=positive(normal.width)&&positive(normal.height)&&Boolean(musicWindowBounds(host,reserve));
  let mode='normal',state=originalHidden?'minimized':'normal',destroyed=false;
  // Capture the flow rectangle before registration adds absolute positioning.
  element.classList.add('it-music-window');
  const managed=windows.register(element,{handle,label:'Music',getBounds:()=>musicWindowBounds(host,reserve)});
  function announce(){
    element.dataset.windowState=state;element.dataset.windowMaximized=String(mode==='maximized');
    element.classList.toggle('it-music-window-maximized',mode==='maximized');onChange(state);
  }
  function write(rect){
    Object.assign(element.style,{position:'absolute',right:'auto',bottom:'auto',margin:'0px',flex:'none',boxSizing:'border-box',minWidth:'0px',minHeight:'0px',maxWidth:'none',maxHeight:'none',
      left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});
  }
  function prepare(){
    if(prepared)return true;
    const bounds=musicWindowBounds(host,reserve);if(!bounds)return false;
    // A hidden ancestor has no flow dimensions. Measure the original layout
    // once it becomes available instead of freezing a zero-size window.
    const hidden=element.hidden;
    const hadMaximized=element.classList.contains('it-music-window-maximized');
    const previousState=element.getAttribute('data-window-state');element.removeAttribute('data-window-state');
    Object.assign(element.style,original);element.classList.remove('it-draggable-window','it-music-window-maximized');element.hidden=false;
    normal=read();element.hidden=hidden;element.classList.add('it-draggable-window');
    element.classList.toggle('it-music-window-maximized',hadMaximized);
    if(previousState!==null)element.setAttribute('data-window-state',previousState);
    if(!positive(normal.width)||!positive(normal.height))normal={left:bounds.left,top:bounds.top,width:Math.min(800,bounds.width),height:Math.min(490,bounds.height)};
    prepared=true;return true;
  }
  function layout(){
    const bounds=musicWindowBounds(host,reserve);if(!bounds||!prepare())return;
    write(mode==='maximized'?bounds:fitNormal(normal,bounds));
  }
  function rememberNormal(){
    if(destroyed||state!=='normal'||!prepared||element.hidden)return;
    const current=read();if(positive(current.width)&&positive(current.height))normal=current;
  }
  function raise(){
    if(destroyed)return;
    state=mode;managed.setDraggable(mode==='normal');
    managed.setVisible(true);layout();managed.raise();announce();
  }
  function minimize(){
    if(destroyed||state==='minimized'||state==='closed')return;
    rememberNormal();state='minimized';managed.setVisible(false);announce();
  }
  function close(){
    if(destroyed||state==='closed')return;
    rememberNormal();state='closed';managed.setVisible(false);announce();
  }
  function toggleMaximize(){
    if(destroyed)return;
    if(state==='normal')rememberNormal();
    mode=mode==='maximized'?'normal':'maximized';state=mode;
    managed.setDraggable(mode==='normal');managed.setVisible(true);layout();managed.raise();announce();
  }
  function centre(){
    if(destroyed)return;
    raise();const bounds=musicWindowBounds(host,reserve);if(!bounds||!normal)return;
    mode='normal';state='normal';managed.setDraggable(true);
    normal=fitNormal({...normal,left:bounds.left+(bounds.width-normal.width)/2,top:bounds.top+(bounds.height-normal.height)/2},bounds);
    layout();managed.raise();announce();
  }
  function resize(){
    if(destroyed)return;
    if(state==='normal'&&prepared&&!element.hidden){normal.left=element.offsetLeft;normal.top=element.offsetTop;}
    layout();
  }
  const save=event=>{if(event.type!=='keydown'||['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))rememberNormal();};
  for(const name of ['pointerup','pointercancel','lostpointercapture','keydown'])handle.addEventListener(name,save);
  const view=host.ownerDocument?.defaultView,Observer=view?.ResizeObserver||globalThis.ResizeObserver;
  const observer=typeof Observer==='function'?new Observer(resize):null;observer?.observe(host);
  layout();
  // The owner can finish creating dock controls before the initial callback.
  queueMicrotask(()=>{if(!destroyed)announce();});
  return {
    raise,minimize,close,toggleMaximize,centre,
    get state(){return state;},
    get maximized(){return mode==='maximized';},
    destroy(){
      if(destroyed)return;destroyed=true;observer?.disconnect();
      for(const name of ['pointerup','pointercancel','lostpointercapture','keydown'])handle.removeEventListener(name,save);
      managed.destroy();Object.assign(element.style,original);element.hidden=originalHidden;
      if(!hadMusicClass)element.classList.remove('it-music-window');
      element.classList.toggle('it-music-window-maximized',hadMaximizedClass);
      if(hadDraggableClass)element.classList.add('it-draggable-window');
      for(const [key,value]of [['data-window-state',originalState],['data-window-maximized',originalMaximized]]){if(value===null)element.removeAttribute(key);else element.setAttribute(key,value);}
    },
  };
}
