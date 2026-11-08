import assert from 'node:assert/strict';
import {createMusicWindow} from '../music/music-window.js';
import {createWindowManager} from '../music/window-manager.js';

class Element {
  constructor(doc,rect={left:0,top:0,width:0,height:0}){
    this.ownerDocument=doc;this.flow={...rect};this.children=[];this.hidden=false;this.attributes=new Map();this.listeners=new Map();this.captures=new Set();
    this.clientWidth=rect.width;this.clientHeight=rect.height;
    this.style=Object.fromEntries(['position','left','top','right','bottom','width','height','minWidth','minHeight','maxWidth','maxHeight','margin','flex','boxSizing','zIndex'].map(key=>[key,'']));
    const classes=new Set();this.classList={add:(...names)=>names.forEach(name=>classes.add(name)),remove:(...names)=>names.forEach(name=>classes.delete(name)),contains:name=>classes.has(name),toggle:(name,value)=>value?classes.add(name):classes.delete(name)};
    const attribute=key=>'data-'+key.replace(/[A-Z]/g,char=>'-'+char.toLowerCase());
    this.dataset=new Proxy({}, {get:(_,key)=>this.attributes.get(attribute(key)),set:(_,key,value)=>{this.attributes.set(attribute(key),String(value));return true;}});
  }
  unavailable(){for(let node=this;node;node=node.parentElement)if(node.hidden||node===this.ownerDocument.host&&(!node.clientWidth||!node.clientHeight))return true;return false;}
  get offsetWidth(){return this.unavailable()?0:parseFloat(this.style.width)||this.flow.width;}
  get offsetHeight(){return this.unavailable()?0:parseFloat(this.style.height)||this.flow.height;}
  get offsetLeft(){return this.style.position==='absolute'||this.classList.contains('it-draggable-window')?parseFloat(this.style.left)||0:this.flow.left;}
  get offsetTop(){return this.style.position==='absolute'||this.classList.contains('it-draggable-window')?parseFloat(this.style.top)||0:this.flow.top;}
  getBoundingClientRect(){return this.className==='it-window-probe'?{x:parseFloat(this.style.left)||0,y:parseFloat(this.style.top)||0}:{x:this.offsetLeft,y:this.offsetTop};}
  append(child){child.parentElement=this;this.children.push(child);}
  remove(){this.parentElement?.children.splice(this.parentElement.children.indexOf(this),1);}
  setAttribute(key,value){this.attributes.set(key,String(value));}
  getAttribute(key){return this.attributes.get(key)??null;}
  removeAttribute(key){this.attributes.delete(key);}
  addEventListener(name,listener){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(listener);}
  removeEventListener(name,listener){this.listeners.get(name)?.delete(listener);}
  dispatch(name,event={}){event.type=name;for(const listener of this.listeners.get(name)||[])listener(event);}
  contains(node){for(let current=node;current;current=current.parentElement)if(current===this)return true;return false;}
  closest(){return null;}
  focus(){this.ownerDocument.activeElement=this;}
  setPointerCapture(id){this.captures.add(id);}
  hasPointerCapture(id){return this.captures.has(id);}
  releasePointerCapture(id){this.captures.delete(id);}
}
function fixture({width=800,height=490,hidden=false,rect={left:48,top:40,width:700,height:350}}={}){
  const observers=[],changes=[],viewEvents=new EventTarget();
  const view={setTimeout,clearTimeout,addEventListener:(...args)=>viewEvents.addEventListener(...args),removeEventListener:(...args)=>viewEvents.removeEventListener(...args),
    ResizeObserver:class{constructor(callback){this.callback=callback;this.disconnected=false;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}};
  const doc={defaultView:view,createElement(){return new Element(doc);}};
  const host=new Element(doc,{left:0,top:0,width,height});doc.host=host;host.hidden=hidden;
  const element=new Element(doc,rect),handle=new Element(doc),media=new Element(doc);media.tagName='IFRAME';
  host.append(element);element.append(handle);element.append(media);element.style.margin='36px auto 80px';element.style.flex='1';
  const original={...element.style},windows=createWindowManager(host);
  const control=createMusicWindow({host,element,handle,windows,insets:{top:22,bottom:48},onChange:state=>changes.push(state)});
  const geometry=()=>({left:element.offsetLeft,top:element.offsetTop,width:element.offsetWidth,height:element.offsetHeight});
  return {host,element,handle,media,control,changes,observers,original,geometry,
    resize(nextWidth,nextHeight){host.clientWidth=nextWidth;host.clientHeight=nextHeight;for(const observer of observers)if(!observer.disconnected)observer.callback();},
    destroy(){control.destroy();windows.destroy();}};
}
const tests=[];const test=(name,run)=>tests.push({name,run});

test('converting a flow window preserves its visible rectangle and content',()=>{
  const f=fixture();assert.deepEqual(f.geometry(),{left:48,top:40,width:700,height:350});
  assert.equal(f.control.state,'normal');assert.equal(f.element.style.position,'absolute');assert.equal(f.element.children[1],f.media);
  assert.equal(f.element.classList.contains('it-music-window'),true);f.destroy();
});
test('maximize fills inset desktop bounds, blocks movement and restores the latest dragged rectangle',()=>{
  const f=fixture(),event={button:0,target:f.handle,clientX:100,clientY:100,pointerId:2,preventDefault(){}};
  f.handle.dispatch('pointerdown',event);f.handle.dispatch('pointermove',{pointerId:2,clientX:120,clientY:115});f.handle.dispatch('pointerup');
  const normal=f.geometry();assert.deepEqual(normal,{left:68,top:55,width:700,height:350});
  f.control.toggleMaximize();assert.equal(f.control.state,'maximized');assert.equal(f.control.maximized,true);
  assert.deepEqual(f.geometry(),{left:0,top:22,width:800,height:420});
  f.handle.dispatch('pointerdown',{...event,pointerId:3});assert.equal(f.handle.hasPointerCapture(3),false);
  f.handle.dispatch('pointermove',{pointerId:3,clientX:700,clientY:400});
  f.handle.dispatch('keydown',{target:f.handle,key:'ArrowRight',preventDefault(){},stopPropagation(){}});
  assert.deepEqual(f.geometry(),{left:0,top:22,width:800,height:420});
  f.control.toggleMaximize();assert.deepEqual(f.geometry(),normal);assert.equal(f.control.maximized,false);f.destroy();
});
test('minimize and close retain contents and reopen the previous maximized mode',()=>{
  const f=fixture();f.control.toggleMaximize();f.control.minimize();assert.equal(f.control.state,'minimized');assert.equal(f.element.hidden,true);
  assert.equal(f.control.maximized,true);assert.equal(f.element.children[1],f.media);
  f.control.raise();assert.equal(f.control.state,'maximized');assert.equal(f.element.hidden,false);
  f.control.close();assert.equal(f.control.state,'closed');assert.equal(f.element.hidden,true);
  f.control.raise();assert.equal(f.control.state,'maximized');assert.deepEqual(f.geometry(),{left:0,top:22,width:800,height:420});
  assert.deepEqual(f.changes,['maximized','minimized','maximized','closed','maximized']);f.destroy();
});
test('centring restores a reachable normal window and preserves its contents across maximize and reopen',()=>{
  const f=fixture();f.control.toggleMaximize();f.control.centre();
  assert.equal(f.control.state,'normal');assert.equal(f.control.maximized,false);
  assert.deepEqual(f.geometry(),{left:50,top:57,width:700,height:350});
  assert.equal(f.element.children[1],f.media);
  f.control.toggleMaximize();f.control.toggleMaximize();assert.deepEqual(f.geometry(),{left:50,top:57,width:700,height:350});
  f.control.minimize();f.control.raise();assert.deepEqual(f.geometry(),{left:50,top:57,width:700,height:350});f.destroy();
});
test('normal pointer and keyboard movement preserve access to the desktop clock and dock',()=>{
  const f=fixture(),event={button:0,target:f.handle,clientX:100,clientY:100,pointerId:4,preventDefault(){}};
  f.handle.dispatch('pointerdown',event);f.handle.dispatch('pointermove',{pointerId:4,clientX:-900,clientY:-900});f.handle.dispatch('pointerup');
  assert.deepEqual(f.geometry(),{left:0,top:22,width:700,height:350});
  f.handle.dispatch('pointerdown',{...event,pointerId:5});f.handle.dispatch('pointermove',{pointerId:5,clientX:1900,clientY:1900});f.handle.dispatch('pointerup');
  assert.deepEqual(f.geometry(),{left:100,top:92,width:700,height:350});
  f.handle.dispatch('keydown',{target:f.handle,key:'ArrowDown',preventDefault(){},stopPropagation(){}});
  assert.equal(f.element.offsetTop,92);f.destroy();
});
test('resizing a maximized host preserves the saved normal size and clamps restore to the smaller desktop',()=>{
  const f=fixture();f.control.toggleMaximize();f.resize(500,350);
  assert.deepEqual(f.geometry(),{left:0,top:22,width:500,height:280});
  f.control.toggleMaximize();assert.deepEqual(f.geometry(),{left:0,top:22,width:500,height:280});
  f.resize(800,490);assert.deepEqual(f.geometry(),{left:0,top:22,width:700,height:350});f.destroy();
});
test('a hidden or zero-size host defers flow measurement and recovers when it becomes visible',()=>{
  const f=fixture({width:0,height:0,hidden:true});assert.notEqual(f.element.style.width,'0px');
  f.host.hidden=false;f.resize(800,490);assert.deepEqual(f.geometry(),{left:48,top:40,width:700,height:350});
  f.control.minimize();f.resize(390,300);f.control.raise();assert.deepEqual(f.geometry(),{left:0,top:22,width:390,height:230});f.destroy();
});
test('destroying a maximized controller releases capture, observers, styles and attributes without removing media',()=>{
  const f=fixture();f.control.toggleMaximize();f.control.destroy();
  assert.deepEqual(f.element.style,f.original);assert.equal(f.element.hidden,false);assert.equal(f.element.getAttribute('data-window-state'),null);
  assert.equal(f.element.classList.contains('it-music-window'),false);assert.equal(f.element.classList.contains('it-window-drag-handle'),false);
  assert.ok([...f.handle.listeners.values()].every(listeners=>listeners.size===0));assert.ok(f.observers.every(observer=>observer.disconnected));
  assert.equal(f.element.children[1],f.media);f.control.raise();assert.equal(f.element.hidden,false);f.destroy();
});
for(const {name,run}of tests){run();console.log(`PASS ${name}`);}
console.log(`PASS all ${tests.length} Music window checks`);
