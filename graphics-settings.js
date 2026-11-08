const STORAGE_KEY='atlasreid-collection-graphics-v1';
const choices={
  webglScale:['auto','0.75','1','1.5','2'],
  shadows:['off','1024','2048'],
  desktopResolution:['auto','1280','1600','1920'],
  interfaceSize:['comfortable','compact'],
};

export const DEFAULT_GRAPHICS_SETTINGS=Object.freeze({
  webglScale:'auto',shadows:'1024',desktopResolution:'auto',
  interfaceSize:'comfortable',glass:true,pauseFocused3D:true,
});

export function normalizeGraphicsSettings(value) {
  const result={...DEFAULT_GRAPHICS_SETTINGS};
  if(!value||typeof value!=='object'||Array.isArray(value))return result;
  for(const [key,values]of Object.entries(choices)) {
    if(Object.hasOwn(value,key)&&values.includes(value[key]))result[key]=value[key];
  }
  for(const key of ['glass','pauseFocused3D']) {
    if(Object.hasOwn(value,key)&&typeof value[key]==='boolean')result[key]=value[key];
  }
  return result;
}

// Only this dedicated preference record is read or written. Library data and
// unfinished media/import work are never part of graphics preferences.
export function createGraphicsPreferenceStore({storage,eventTarget}={}) {
  if(storage===undefined){try{storage=globalThis.localStorage;}catch{storage=null;}}
  let state=normalizeGraphicsSettings(),persistent=Boolean(storage),destroyed=false;
  const subscribers=new Set();
  const decode=raw=>{
    if(!raw||raw.length>4096)return normalizeGraphicsSettings();
    try{const saved=JSON.parse(raw);return saved?.version===1?normalizeGraphicsSettings(saved.settings):normalizeGraphicsSettings();}catch{return normalizeGraphicsSettings();}
  };
  try{
    const raw=storage?.getItem(STORAGE_KEY);
    if(raw&&raw.length<=4096){
      const saved=JSON.parse(raw);
      if(saved?.version===1)state=normalizeGraphicsSettings(saved.settings);
    }
  }catch{persistent=false;}
  const notify=()=>{for(const subscriber of subscribers)subscriber({...state});};
  function set(value) {
    if(destroyed)return {...state};
    state=normalizeGraphicsSettings(value);
    try{
      if(!storage)throw new Error('Storage unavailable');
      storage.setItem(STORAGE_KEY,JSON.stringify({version:1,settings:state}));
      persistent=true;
    }catch{persistent=false;}
    notify();return {...state};
  }
  const changed=event=>{
    if(destroyed||event.key!==STORAGE_KEY||event.storageArea&&event.storageArea!==storage)return;
    let raw=event.newValue;
    try{if(storage)raw=storage.getItem(STORAGE_KEY);}catch{persistent=false;}
    state=decode(raw);notify();
  };
  function patch(value){
    let current=state;
    try{if(storage&&persistent)current=decode(storage.getItem(STORAGE_KEY));}catch{persistent=false;}
    return set({...current,...value});
  }
  eventTarget?.addEventListener('storage',changed);
  return {get settings(){return {...state};},get persistent(){return persistent;},set,
    patch,reset:()=>set(DEFAULT_GRAPHICS_SETTINGS),
    subscribe(listener){if(destroyed)return ()=>{};subscribers.add(listener);return ()=>subscribers.delete(listener);},
    destroy(){if(destroyed)return;destroyed=true;eventTarget?.removeEventListener('storage',changed);subscribers.clear();}};
}

// The drawer and virtual System Settings edit one validated preference model.
export function createGraphicsControls({mount,store}={}) {
  const document=mount.ownerDocument,controls=new Map(),rows=new Map(),listeners=[];
  const element=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  function select(key,label,options,hint){
    const row=element('label','graphics-field'),control=element('select');control.name=key;control.setAttribute('aria-label',label);
    for(const [value,text]of options){const option=element('option','',text);option.value=value;control.append(option);}
    row.append(element('span','graphics-label',label),control);if(hint)row.append(element('small','graphics-hint',hint));
    const change=()=>store.patch({[key]:control.value});control.addEventListener('change',change);listeners.push(()=>control.removeEventListener('change',change));
    mount.append(row);controls.set(key,control);rows.set(key,row);
  }
  function checkbox(key,label,hint){
    const row=element('label','graphics-checkbox'),control=element('input'),copy=element('span');control.type='checkbox';control.name=key;
    copy.append(element('span','graphics-label',label));if(hint)copy.append(element('small','graphics-hint',hint));row.append(control,copy);
    const change=()=>store.patch({[key]:control.checked});control.addEventListener('change',change);listeners.push(()=>control.removeEventListener('change',change));
    mount.append(row);controls.set(key,control);rows.set(key,row);
  }
  select('webglScale','3D resolution',[['auto','Auto'],['0.75','0.75× · lighter'],['1','1×'],['1.5','1.5×'],['2','2× · sharper']],'More pixels, more work for the tiny desk.');
  select('shadows','Shadows',[['off','Off'],['1024','1024 · lighter'],['2048','2048 · detailed']]);
  select('desktopResolution','Virtual desktop resolution',[['auto','Auto · fit display'],['1280','1280 pixels wide'],['1600','1600 pixels wide'],['1920','1920 pixels wide']],'Backing resolution for the desktop on the 3D laptop. Settled close-up text stays native.');
  select('interfaceSize','Interface size',[['comfortable','Comfortable'],['compact','Compact · more space']]);
  checkbox('glass','Frosted glass','A little blur for the view. Turn it off for a lighter desktop.');
  checkbox('pauseFocused3D','Rest 3D in close-up','Let the settled desk take a breather. Music and the desktop stay live; movement wakes the scene.');
  const refresh=()=>{const settings=store.settings;for(const [key,control]of controls){if(control.type==='checkbox')control.checked=settings[key];else control.value=settings[key];}};
  const unsubscribe=store.subscribe(refresh);refresh();
  return {refresh,show(keys){for(const [key,row]of rows)row.hidden=!keys.includes(key);},destroy(){unsubscribe();for(const dispose of listeners)dispose();for(const row of rows.values())row.remove();}};
}

const resolutionIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="2" fill="currentColor" stroke="none"/></svg>';
const closeIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="m7 7 10 10M17 7 7 17"/></svg>';

export function createGraphicsSettings({mount,triggerMount=null,storage,store:providedStore,onChange=()=>{},onOpenMusic=()=>{},onResetView=()=>{}}={}) {
  if(!mount?.ownerDocument)throw new TypeError('Graphics settings need a DOM mount');
  const document=mount.ownerDocument;
  if(triggerMount&&(triggerMount.ownerDocument!==document||typeof triggerMount.append!=='function'))throw new TypeError('The Graphics trigger needs a mount in the same document');
  const store=providedStore||createGraphicsPreferenceStore({storage});
  const externalTrigger=Boolean(triggerMount),view=document.defaultView;
  const listeners=[];let destroyed=false,lastStatus='',opener=null,host=null;
  const element=(tag,className,text)=>{
    const node=document.createElement(tag);if(className)node.className=className;
    if(text!==undefined)node.textContent=text;return node;
  };
  const listen=(node,event,listener,options)=>{node.addEventListener(event,listener,options);listeners.push(()=>node.removeEventListener(event,listener,options));};
  const owner=element('div','collection-graphics');
  const trigger=element('button',externalTrigger?'graphics-trigger is-external':'graphics-trigger');trigger.type='button';
  trigger.innerHTML=resolutionIcon;
  if(externalTrigger){trigger.title='Graphics settings';owner.classList.add('has-external-trigger');}
  else trigger.append(element('span','','Graphics'));
  trigger.setAttribute('aria-label','Graphics settings');trigger.setAttribute('aria-haspopup','dialog');
  const dialog=element('dialog','graphics-dialog');
  dialog.id='collection-graphics-drawer';dialog.setAttribute('aria-labelledby','collection-graphics-title');
  dialog.setAttribute('aria-modal','false');trigger.setAttribute('aria-controls',dialog.id);
  const header=element('header','graphics-heading');
  const title=element('h2','','Graphics settings');title.id='collection-graphics-title';
  const closeButton=element('button','graphics-close');closeButton.type='button';closeButton.innerHTML=closeIcon;
  closeButton.setAttribute('aria-label','Close graphics settings');header.append(title,closeButton);
  const body=element('div','graphics-body');
  const sceneActions=element('div','graphics-scene-actions');
  const openMusic=element('button','graphics-open-music','Open Music'),resetView=element('button','graphics-reset-view','Reset view');
  openMusic.type=resetView.type='button';openMusic.disabled=resetView.disabled=true;sceneActions.append(openMusic,resetView);
  const desktopOnly=element('a','graphics-desktop-only','Desktop only');
  desktopOnly.href='./dev/music/index.html';desktopOnly.title='Open the virtual desktop development preview';sceneActions.append(desktopOnly);
  const introduction=element('p','graphics-introduction','Adjust the 3D desk and virtual desktop.');
  const fields=element('div','graphics-fields');
  const fieldControls=createGraphicsControls({mount:fields,store});
  const status=element('p','graphics-status','Display measurements will appear when the desk is ready.');
  const storageNote=element('p','graphics-storage');storageNote.hidden=true;
  const footer=element('footer','graphics-actions'),reset=element('button','graphics-reset','Restore defaults'),done=element('button','graphics-done','Done');
  reset.type=done.type='button';footer.append(reset,done);body.append(introduction,fields,status,storageNote,footer);dialog.append(header,sceneActions,body);
  if(externalTrigger){triggerMount.append(trigger);owner.append(dialog);}else owner.append(trigger,dialog);
  mount.append(owner);

  let lastPosition='';
  function positionDrawer() {
    if(destroyed||!externalTrigger||!dialog.open||host)return;
    const rect=trigger.getBoundingClientRect?.(),width=view?.innerWidth??document.documentElement?.clientWidth,height=view?.innerHeight??document.documentElement?.clientHeight;
    if(!rect||![rect.top,rect.right,width,height].every(Number.isFinite)||width<=28||height<=28)return;
    const drawerWidth=Math.min(365,width-28);
    const right=Math.min(Math.max(14,width-rect.right),width-14-drawerWidth);
    const availableAbove=rect.top-24;
    const fitsAbove=availableAbove>=Math.min(300,height-28);
    const bottom=fitsAbove?Math.max(14,height-rect.top+10):14;
    const maxHeight=Math.min(430,fitsAbove?Math.min(availableAbove,height-bottom-14):height-28);
    const signature=[right,bottom,drawerWidth,maxHeight].join(',');
    if(signature===lastPosition)return;
    lastPosition=signature;
    for(const [key,value] of Object.entries({right,bottom,width:drawerWidth,height:maxHeight}))owner.style?.setProperty?.(`--graphics-drawer-${key}`,`${value}px`);
  }
  if(externalTrigger) {
    if(view?.addEventListener){listen(view,'resize',positionDrawer);listen(view,'scroll',positionDrawer,true);}
    if(typeof view?.ResizeObserver==='function') {
      const observer=new view.ResizeObserver(positionDrawer);
      for(const target of new Set([triggerMount,triggerMount.parentElement,triggerMount.closest?.('.collection-panel')].filter(Boolean)))observer.observe(target);
      listeners.push(()=>observer.disconnect());
    }
  }

  function refresh() {
    storageNote.hidden=store.persistent;
    storageNote.textContent=store.persistent?'':'Settings apply for this visit. This browser could not save them.';
  }
  function apply(settings) {
    if(destroyed)return;
    store.set(settings);
  }
  function restoreHost() {
    if(host){host.removeEventListener('close',hostClosed);host=null;mount.append(owner);owner.classList.remove('is-hosted');}
  }
  function close({restoreFocus=true}={}) {
    if(!dialog.open)return;
    const focusTarget=opener||trigger;
    dialog.close();trigger.setAttribute('aria-expanded','false');restoreHost();
    if(restoreFocus&&(focusTarget.isConnected!==false))focusTarget.focus({preventScroll:true});
  }
  function hostClosed(){close({restoreFocus:false});}
  function open({host:requestedHost=null,opener:requestedOpener=null}={}) {
    if(destroyed||dialog.open)return;
    opener=requestedOpener||document.activeElement||trigger;
    if(requestedHost?.open){host=requestedHost;host.append(owner);owner.classList.add('is-hosted');host.addEventListener('close',hostClosed);}
    dialog.show();positionDrawer();trigger.setAttribute('aria-expanded','true');closeButton.focus({preventScroll:true});
  }
  function toggle(options){if(dialog.open)close();else open(options);}
  listen(trigger,'click',()=>toggle({opener:trigger}));
  listen(closeButton,'click',close);listen(done,'click',close);
  listen(reset,'click',()=>apply(DEFAULT_GRAPHICS_SETTINGS));
  listen(openMusic,'click',()=>{if(openMusic.disabled)return;close({restoreFocus:false});onOpenMusic();});
  listen(resetView,'click',()=>{if(resetView.disabled)return;close({restoreFocus:false});onResetView();});
  // A nonmodal drawer leaves the desktop interactive. Consume only its own
  // Escape, even if focus has moved back onto the scene or live desktop.
  const escape=event=>{if(dialog.open&&event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}};
  const outside=event=>{if(dialog.open&&!owner.contains(event.target)&&!trigger.contains(event.target)&&event.target!==opener&&!opener?.contains?.(event.target))close({restoreFocus:false});};
  document.addEventListener('keydown',escape,true);document.addEventListener('pointerdown',outside,true);
  listeners.push(()=>document.removeEventListener('keydown',escape,true),()=>document.removeEventListener('pointerdown',outside,true));
  const unsubscribe=store.subscribe(()=>{if(!destroyed){refresh();onChange(store.settings);}});
  refresh();trigger.setAttribute('aria-expanded','false');

  return {
    open,close,toggle,
    setSceneActions({canOpenMusic=false,canResetView=false}={}) {openMusic.disabled=!canOpenMusic;resetView.disabled=!canResetView;},
    get settings(){return store.settings;},
    updateStatus(data={}) {
      if(destroyed)return;
      const size=(width,height)=>Number.isFinite(width)&&width>0&&Number.isFinite(height)&&height>0?`${Math.round(width)} × ${Math.round(height)} px`:null;
      const parts=[],webgl=size(data.webglWidth,data.webglHeight),desktop=size(data.desktopWidth,data.desktopHeight);
      if(webgl)parts.push(`3D: ${webgl}`);if(desktop)parts.push(`Desktop: ${desktop}`);
      if(typeof data.sceneResting==='boolean')parts.push(data.sceneResting?'3D resting in close-up; desktop stays live.':'3D redraws when needed.');
      const text=parts.join(' · ');
      if(text&&text!==lastStatus){status.textContent=text;lastStatus=text;}
    },
    destroy() {
      if(destroyed)return;destroyed=true;
      if(dialog.open)dialog.close();restoreHost();unsubscribe();fieldControls.destroy();for(const dispose of listeners)dispose();if(!providedStore)store.destroy();owner.remove();if(externalTrigger)trigger.remove();
    },
  };
}
