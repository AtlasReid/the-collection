import assert from 'node:assert/strict';
import {DEFAULT_GRAPHICS_SETTINGS,normalizeGraphicsSettings,createGraphicsPreferenceStore,createGraphicsSettings} from '../graphics-settings.js';

const key='atlasreid-collection-graphics-v1';
const tests=[];const test=(name,run)=>tests.push({name,run});
function storageFixture(initial={}) {
  const data=new Map(Object.entries(initial)),writes=[];
  return {data,writes,getItem:name=>data.get(name)??null,setItem(name,value){writes.push(name);data.set(name,value);}};
}

test('invalid and untrusted preferences cannot coerce booleans, select unsupported quality or add state',()=>{
  const result=normalizeGraphicsSettings(JSON.parse('{"webglScale":"8","shadows":2048,"desktopResolution":"Infinity","interfaceSize":"huge","glass":"false","pauseFocused3D":0,"__proto__":{"polluted":true},"other":"ignored"}'));
  assert.deepEqual(result,DEFAULT_GRAPHICS_SETTINGS);assert.equal(Object.hasOwn(result,'other'),false);assert.equal({}.polluted,undefined);
  for(const bad of [null,undefined,42,'2',[],true])assert.deepEqual(normalizeGraphicsSettings(bad),DEFAULT_GRAPHICS_SETTINGS);
  result.glass=false;assert.equal(DEFAULT_GRAPHICS_SETTINGS.glass,true);
});

test('valid explicit controls survive while inherited settings are ignored',()=>{
  const inherited=Object.create({webglScale:'2',glass:false});inherited.desktopResolution='1920';inherited.pauseFocused3D=false;
  const settings=normalizeGraphicsSettings(inherited);assert.equal(settings.webglScale,'auto');assert.equal(settings.glass,true);
  assert.equal(settings.desktopResolution,'1920');assert.equal(settings.pauseFocused3D,false);
  assert.deepEqual(normalizeGraphicsSettings({webglScale:'0.75',shadows:'off',desktopResolution:'1600',interfaceSize:'compact',glass:false,pauseFocused3D:false}),
    {webglScale:'0.75',shadows:'off',desktopResolution:'1600',interfaceSize:'compact',glass:false,pauseFocused3D:false});
});

test('preferences persist only their own record and returned state cannot change a later session',()=>{
  const storage=storageFixture({'atlasreid-music-import-library-v1':'saved library','another-app':'keep'}),first=createGraphicsPreferenceStore({storage});
  assert.equal(storage.writes.length,0);first.set({...first.settings,webglScale:'2',glass:false});
  assert.deepEqual(storage.writes,[key]);assert.equal(storage.data.get('atlasreid-music-import-library-v1'),'saved library');assert.equal(storage.data.get('another-app'),'keep');
  const copy=first.settings;copy.webglScale='0.75';
  const second=createGraphicsPreferenceStore({storage});assert.equal(second.settings.webglScale,'2');assert.equal(second.settings.glass,false);
  second.reset();assert.deepEqual(second.settings,DEFAULT_GRAPHICS_SETTINGS);assert.equal(storage.data.size,3);
});

test('corrupt, oversized and future records are not erased on read and recover after a deliberate change',()=>{
  for(const raw of ['{broken','x'.repeat(4097),JSON.stringify({version:9,settings:{webglScale:'2'}})]) {
    const storage=storageFixture({[key]:raw}),store=createGraphicsPreferenceStore({storage});
    assert.deepEqual(store.settings,DEFAULT_GRAPHICS_SETTINGS);assert.equal(storage.data.get(key),raw);assert.equal(storage.writes.length,0);
    store.set({...store.settings,shadows:'off'});assert.equal(JSON.parse(storage.data.get(key)).settings.shadows,'off');assert.equal(store.persistent,true);
  }
});

test('blocked storage keeps controls usable in memory and never clears unrelated state',()=>{
  const storage={getItem(){throw new Error('Blocked');},setItem(){throw new Error('Blocked');}},store=createGraphicsPreferenceStore({storage});
  assert.equal(store.persistent,false);store.set({...store.settings,interfaceSize:'compact'});assert.equal(store.settings.interfaceSize,'compact');assert.equal(store.persistent,false);
  store.reset();assert.deepEqual(store.settings,DEFAULT_GRAPHICS_SETTINGS);
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  try{
    Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('Getter blocked');}});
    const blocked=createGraphicsPreferenceStore();blocked.set({...blocked.settings,glass:false});assert.equal(blocked.settings.glass,false);assert.equal(blocked.persistent,false);
  }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});

class Element {
  constructor(document,tag){this.ownerDocument=document;this.tagName=tag.toUpperCase();this.children=[];this.listeners=new Map();this.attributes=new Map();this.open=false;this.value='';this.hidden=false;this.classes=new Set();this.classList={add:value=>this.classes.add(value),remove:value=>this.classes.delete(value)};const styles=new Map();this.style={setProperty:(name,value)=>styles.set(name,value),getPropertyValue:name=>styles.get(name)??''};}
  append(...nodes){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
  remove(){if(this.parentElement)this.parentElement.children.splice(this.parentElement.children.indexOf(this),1);this.parentElement=null;}
  setAttribute(name,value){this.attributes.set(name,String(value));}
  getAttribute(name){return this.attributes.get(name)??null;}
  addEventListener(name,listener){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(listener);}
  removeEventListener(name,listener){this.listeners.get(name)?.delete(listener);}
  dispatch(name,event={}){for(const listener of this.listeners.get(name)||[])listener(event);}
  focus(){this.ownerDocument.activeElement=this;}
  contains(target){return target===this||this.children.some(child=>child.contains(target));}
  getBoundingClientRect(){return this.rect??{left:0,top:0,right:0,bottom:0,width:0,height:0};}
  show(){assert.equal(this.open,false);this.open=true;}
  close(){this.open=false;this.dispatch('close');}
}
function uiFixture({store:sharedStore,externalTrigger=false}={}) {
  const document=new Element(null,'document');document.activeElement=null;document.createElement=tag=>new Element(document,tag);
  const view=new Element(null,'window');view.innerWidth=1280;view.innerHeight=800;view.observers=[];
  view.ResizeObserver=class{constructor(callback){this.callback=callback;this.targets=new Set();this.disconnected=false;view.observers.push(this);}observe(target){this.targets.add(target);}disconnect(){this.disconnected=true;this.targets.clear();}};
  document.defaultView=view;
  const mount=new Element(document,'div');
  const sibling=new Element(document,'span');mount.append(sibling);
  const header=new Element(document,'header'),headerSibling=new Element(document,'button'),triggerMount=new Element(document,'div');header.append(headerSibling,triggerMount);
  const storage=storageFixture(),changes=[],actions=[],control=createGraphicsSettings({mount,...(externalTrigger?{triggerMount}:{}),storage,store:sharedStore,onChange:settings=>changes.push(settings),onOpenMusic:()=>actions.push('music'),onResetView:()=>actions.push('reset')});
  const descendants=node=>[node,...node.children.flatMap(descendants)];
  const find=predicate=>[...descendants(mount),...descendants(header)].find(predicate);
  return {document,view,mount,sibling,header,headerSibling,triggerMount,storage,changes,actions,control,find,field:name=>find(node=>node.name===name),owner:find(node=>node.className==='collection-graphics'),
    trigger:find(node=>node.getAttribute('aria-label')==='Graphics settings'),dialog:find(node=>node.tagName==='DIALOG')};
}

test('two settings views share changes without stale writes and disposing one leaves the other live',()=>{
  const storage=storageFixture({'atlasreid-music-import-library-v1':'keep this library'}),store=createGraphicsPreferenceStore({storage});
  const first=uiFixture({store}),second=uiFixture({store});
  assert.equal(storage.writes.length,0);
  first.field('shadows').value='off';first.field('shadows').dispatch('change');assert.equal(second.field('shadows').value,'off');
  second.field('glass').checked=false;second.field('glass').dispatch('change');assert.equal(first.field('glass').checked,false);assert.equal(store.settings.shadows,'off');
  assert.equal(first.changes.length,2);assert.equal(second.changes.length,2);assert.deepEqual(storage.writes,[key,key]);
  first.control.destroy();store.patch({interfaceSize:'compact'});assert.equal(first.changes.length,2);assert.equal(second.field('interfaceSize').value,'compact');
  second.control.destroy();store.patch({desktopResolution:'1600'});assert.equal(store.settings.desktopResolution,'1600');assert.equal(storage.data.get('atlasreid-music-import-library-v1'),'keep this library');store.destroy();
});

test('cross-tab graphics updates notify without rewriting storage and stop after disposal',()=>{
  const events=new EventTarget(),storage=storageFixture(),store=createGraphicsPreferenceStore({storage,eventTarget:events}),observed=[];
  store.subscribe(value=>{observed.push(value);value.shadows='off';});
  const send=(name,value)=>{const raw=JSON.stringify(value);storage.data.set(name,raw);events.dispatchEvent(Object.assign(new Event('storage'),{key:name,newValue:raw,storageArea:storage}));};
  send('another-key',{version:1,settings:{glass:false}});assert.equal(observed.length,0);
  send(key,{version:1,settings:{interfaceSize:'compact',glass:false}});assert.equal(store.settings.interfaceSize,'compact');assert.equal(store.settings.glass,false);assert.equal(store.settings.shadows,'1024');assert.equal(observed.length,1);assert.equal(storage.writes.length,0);
  store.patch({shadows:'2048'});assert.equal(store.settings.glass,false);assert.equal(storage.writes.length,1);
  store.destroy();send(key,{version:1,settings:{glass:true}});assert.equal(store.settings.glass,false);assert.equal(observed.length,2);
});

test('interleaved tabs merge independent edits and delayed events cannot roll a newer choice back',()=>{
  const storage=storageFixture(),eventsA=new EventTarget(),eventsB=new EventTarget();
  const first=createGraphicsPreferenceStore({storage,eventTarget:eventsA}),second=createGraphicsPreferenceStore({storage,eventTarget:eventsB});
  first.patch({shadows:'off'});const oldValue=storage.data.get(key);
  second.patch({glass:false});assert.equal(second.settings.shadows,'off');assert.equal(second.settings.glass,false);
  eventsB.dispatchEvent(Object.assign(new Event('storage'),{key,newValue:oldValue,storageArea:storage}));assert.equal(second.settings.glass,false);
  eventsA.dispatchEvent(Object.assign(new Event('storage'),{key,newValue:storage.data.get(key),storageArea:storage}));assert.equal(first.settings.glass,false);assert.equal(first.settings.shadows,'off');
  assert.equal(storage.writes.length,2);first.destroy();second.destroy();
});

test('initial UI does not notify or save; user changes and restore notify once with detached state',()=>{
  const f=uiFixture();assert.equal(f.changes.length,0);assert.equal(f.storage.writes.length,0);
  f.field('desktopResolution').value='1920';f.field('desktopResolution').dispatch('change');
  assert.equal(f.changes.length,1);assert.equal(f.changes[0].desktopResolution,'1920');assert.equal(JSON.parse(f.storage.data.get(key)).settings.desktopResolution,'1920');
  f.changes[0].desktopResolution='1280';assert.equal(f.control.settings.desktopResolution,'1920');
  f.field('glass').checked=false;f.field('glass').dispatch('change');assert.equal(f.control.settings.glass,false);assert.equal(f.changes.length,2);
  f.find(node=>node.className==='graphics-reset').dispatch('click');assert.equal(f.changes.length,3);assert.deepEqual(f.control.settings,DEFAULT_GRAPHICS_SETTINGS);
  f.control.destroy();
});

test('nonmodal drawer toggles and consumes Escape while outside clicks preserve scene focus',()=>{
  const f=uiFixture();f.trigger.dispatch('click');assert.equal(f.dialog.open,true);assert.equal(f.trigger.getAttribute('aria-expanded'),'true');
  let prevented=0,stopped=0;f.document.dispatch('keydown',{key:'Escape',preventDefault(){prevented++;},stopPropagation(){stopped++;}});
  assert.equal(prevented,1);assert.equal(stopped,1);assert.equal(f.dialog.open,false);assert.equal(f.document.activeElement,f.trigger);assert.equal(f.trigger.getAttribute('aria-expanded'),'false');
  f.trigger.dispatch('click');f.find(node=>node.getAttribute('aria-label')==='Close graphics settings').dispatch('click');assert.equal(f.dialog.open,false);assert.equal(f.changes.length,0);
  f.trigger.dispatch('click');f.trigger.dispatch('click');assert.equal(f.dialog.open,false);
  const scene=f.document.createElement('canvas');f.control.open();scene.focus();f.document.dispatch('pointerdown',{target:scene});assert.equal(f.dialog.open,false);assert.equal(f.document.activeElement,scene);
  f.document.dispatch('keydown',{key:'Escape',preventDefault(){prevented++;},stopPropagation(){stopped++;}});assert.equal(stopped,1,'closed drawer must leave Escape to the scene');
  f.control.destroy();
});

test('scene actions close first and a compact top-layer host restores the drawer without changing preferences',()=>{
  const f=uiFixture(),music=f.find(node=>node.className==='graphics-open-music'),reset=f.find(node=>node.className==='graphics-reset-view');
  f.control.open();music.dispatch('click');assert.deepEqual(f.actions,[]);assert.equal(f.dialog.open,true);
  f.control.setSceneActions({canOpenMusic:true,canResetView:true});music.dispatch('click');assert.deepEqual(f.actions,['music']);assert.equal(f.dialog.open,false);
  f.control.open();reset.dispatch('click');assert.deepEqual(f.actions,['music','reset']);assert.equal(f.dialog.open,false);assert.equal(f.storage.writes.length,0);
  const compact=f.document.createElement('dialog'),compactButton=f.document.createElement('button');compact.open=true;compact.append(compactButton);compactButton.focus();
  f.control.open({host:compact});assert.equal(f.dialog.open,true);assert.equal(compact.contains(f.dialog),true);f.control.close();assert.equal(f.document.activeElement,compactButton);assert.equal(f.mount.contains(f.dialog),true);
  f.control.open({host:compact});compact.close();assert.equal(f.dialog.open,false);assert.equal(f.mount.contains(f.dialog),true);
  f.control.destroy();
});

test('actual measurement display is guarded and cleanup leaves siblings and saved preferences intact',()=>{
  const f=uiFixture(),status=f.find(node=>node.className==='graphics-status');
  f.control.updateStatus({webglWidth:1920,webglHeight:1080,desktopWidth:1600,desktopHeight:1040,sceneResting:true});
  assert.match(status.textContent,/3D: 1920 × 1080 px/);assert.match(status.textContent,/Desktop: 1600 × 1040 px/);assert.match(status.textContent,/3D resting in close-up/);
  f.control.updateStatus({webglWidth:NaN,webglHeight:-2,sceneResting:false});assert.doesNotMatch(status.textContent,/NaN|-2/);
  f.field('interfaceSize').value='compact';f.field('interfaceSize').dispatch('change');
  const saved=f.storage.data.get(key),field=f.field('interfaceSize');f.trigger.dispatch('click');f.control.destroy();f.control.destroy();
  assert.deepEqual(f.mount.children,[f.sibling]);assert.equal(f.storage.data.get(key),saved);
  field.value='comfortable';field.dispatch('change');assert.equal(f.changes.length,1);
});

test('a header trigger is one accessible icon controlling the existing drawer',()=>{
  const f=uiFixture({externalTrigger:true});
  assert.equal(f.trigger.parentElement,f.triggerMount);assert.equal(f.owner.contains(f.trigger),false);assert.equal(f.mount.contains(f.dialog),true);
  assert.equal(f.trigger.type,'button');assert.equal(f.trigger.title,'Graphics settings');assert.equal(f.trigger.getAttribute('aria-label'),'Graphics settings');
  assert.equal(f.trigger.getAttribute('aria-controls'),f.dialog.id);assert.equal(f.trigger.getAttribute('aria-expanded'),'false');
  assert.match(f.trigger.innerHTML,/<svg\b/);assert.equal(f.trigger.children.length,0,'The external trigger should not retain a text label');
  f.trigger.dispatch('click');assert.equal(f.dialog.open,true);assert.equal(f.trigger.getAttribute('aria-expanded'),'true');
  f.field('glass').checked=false;f.field('glass').dispatch('change');assert.equal(f.control.settings.glass,false);assert.equal(f.storage.writes.length,1);
  f.find(node=>node.className==='graphics-done').dispatch('click');assert.equal(f.dialog.open,false);assert.equal(f.document.activeElement,f.trigger);assert.equal(f.trigger.getAttribute('aria-expanded'),'false');
  assert.equal(f.headerSibling.parentElement,f.header);f.control.destroy();
});

test('header icon children toggle once and Escape restores header focus without stealing outside focus',()=>{
  const f=uiFixture({externalTrigger:true}),icon=f.document.createElement('svg');f.trigger.append(icon);
  f.trigger.dispatch('click');f.document.dispatch('pointerdown',{target:icon});assert.equal(f.dialog.open,true,'An icon child must not dismiss its own drawer on pointerdown');
  f.trigger.dispatch('click');assert.equal(f.dialog.open,false,'The subsequent click must close rather than reopen the drawer');
  f.trigger.dispatch('click');let prevented=0,stopped=0;
  f.document.dispatch('keydown',{key:'Escape',preventDefault(){prevented++;},stopPropagation(){stopped++;}});
  assert.equal(prevented,1);assert.equal(stopped,1);assert.equal(f.dialog.open,false);assert.equal(f.document.activeElement,f.trigger);
  const scene=f.document.createElement('canvas');f.trigger.dispatch('click');scene.focus();f.document.dispatch('pointerdown',{target:scene});
  assert.equal(f.dialog.open,false);assert.equal(f.document.activeElement,scene);assert.equal(f.storage.writes.length,0);f.control.destroy();
});

test('the header drawer follows its icon and stays within wide, narrow and short viewports',()=>{
  const f=uiFixture({externalTrigger:true});
  const placement=()=>Object.fromEntries(['right','bottom','width','height'].map(key=>[key,parseFloat(f.owner.style.getPropertyValue(`--graphics-drawer-${key}`))]));
  const insideViewport=()=>{
    const p=placement();assert.ok(Object.values(p).every(Number.isFinite));
    assert.ok(p.right>=14&&f.view.innerWidth-p.right-p.width>=14);assert.ok(p.width<=365&&p.width<=f.view.innerWidth-28);
    assert.ok(p.bottom>=14&&p.height<=430&&f.view.innerHeight-p.bottom-p.height>=14);
    return p;
  };
  f.trigger.rect={top:650,right:1150};f.trigger.dispatch('click');let p=insideViewport();
  assert.ok(f.view.innerHeight-p.bottom<=f.trigger.rect.top-10,'The tall-view drawer must sit above the header icon');
  f.trigger.rect={top:600,right:1150};f.view.dispatch('scroll');assert.ok(placement().bottom>p.bottom,'Scrolling must update the icon anchor');
  f.trigger.rect={top:550,right:24};f.view.observers[0].callback();p=insideViewport();assert.ok(f.view.innerWidth-p.right-p.width>=14,'A left-edge icon must not push the drawer outside the viewport');
  assert.ok(f.view.observers[0].targets.has(f.triggerMount)&&f.view.observers[0].targets.has(f.header),'Header resizing must be observed');
  f.view.innerWidth=320;f.view.innerHeight=240;f.trigger.rect={top:190,right:300};f.view.dispatch('resize');p=insideViewport();
  assert.ok(p.height>f.trigger.rect.top-24,'A short screen must allow the drawer over the collection panel');
  f.view.innerHeight=800;f.trigger.rect={top:1200,right:300};f.view.dispatch('scroll');insideViewport();
  f.control.destroy();
});

test('compact hosting moves only the drawer and returns it while the header icon stays put',()=>{
  const f=uiFixture({externalTrigger:true}),compact=f.document.createElement('dialog'),button=f.document.createElement('button');
  compact.append(button);compact.open=true;button.focus();f.control.open({host:compact});
  assert.equal(compact.contains(f.dialog),true);assert.equal(f.owner.classes.has('is-hosted'),true);assert.equal(f.trigger.parentElement,f.triggerMount);
  f.control.close();assert.equal(f.mount.contains(f.dialog),true);assert.equal(f.owner.classes.has('is-hosted'),false);assert.equal(f.document.activeElement,button);assert.equal(f.trigger.parentElement,f.triggerMount);
  f.control.open({host:compact});compact.close();assert.equal(f.dialog.open,false);assert.equal(f.mount.contains(f.dialog),true);assert.equal(f.trigger.parentElement,f.triggerMount);
  assert.equal(f.storage.writes.length,0);f.control.destroy();
});

test('external trigger cleanup removes listeners and observers without deleting header siblings or preferences',()=>{
  const f=uiFixture({externalTrigger:true}),field=f.field('interfaceSize');
  field.value='compact';field.dispatch('change');const saved=f.storage.data.get(key);
  f.trigger.dispatch('click');f.control.destroy();f.control.destroy();
  assert.deepEqual(f.mount.children,[f.sibling]);assert.deepEqual(f.header.children,[f.headerSibling,f.triggerMount]);assert.equal(f.triggerMount.children.length,0);
  assert.equal(f.storage.data.get(key),saved);assert.equal(f.view.observers[0].disconnected,true);
  assert.equal(f.view.listeners.get('resize').size,0);assert.equal(f.view.listeners.get('scroll').size,0);
  assert.equal(f.document.listeners.get('keydown').size,0);assert.equal(f.document.listeners.get('pointerdown').size,0);assert.equal(f.trigger.listeners.get('click').size,0);
  field.value='comfortable';field.dispatch('change');assert.equal(f.changes.length,1);assert.equal(f.storage.writes.length,1);
});

let failures=0;
for(const {name,run}of tests){try{run();console.log(`PASS ${name}`);}catch(error){failures++;console.error(`FAIL ${name}: ${error.stack}`);}}
if(failures)process.exitCode=1;else console.log(`PASS all ${tests.length} graphics settings checks`);
