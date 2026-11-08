import assert from 'node:assert/strict';
import { quadTransform } from '../projection.js';
import { windowPoint,clampWindow,createWindowManager } from '../music/window-manager.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);
const project=(matrix,x,y)=>{const w=matrix[3]*x+matrix[7]*y+matrix[15];return {x:(matrix[0]*x+matrix[4]*y+matrix[12])/w,y:(matrix[1]*x+matrix[5]*y+matrix[13])/w};};
for(const {name,corners}of [
  {name:'scaled desktop',corners:[{x:84,y:96},{x:1204,y:96},{x:1204,y:782},{x:84,y:782}]},
  {name:'perspective laptop',corners:[{x:430,y:85},{x:960,y:145},{x:910,y:520},{x:410,y:430}]},
]){
  const matrix=quadTransform(corners,800,490);
  for(const x of [0,97,400,800])for(const y of [0,71,245,490]){
    const point=windowPoint(corners,project(matrix,x,y),800,490);assert.ok(point);near(point.x,x);near(point.y,y);
  }
  // A screen-space pointer journey must produce the original local drag delta.
  const start=windowPoint(corners,project(matrix,123,87),800,490),end=windowPoint(corners,project(matrix,273,237),800,490);
  near(end.x-start.x,150);near(end.y-start.y,150);
  console.log(`PASS ${name} maps drag coordinates without perspective or zoom drift`);
}
assert.equal(windowPoint(Array(4).fill({x:0,y:0}),{x:1,y:1},800,490),null);
console.log('PASS a degenerate desktop projection cannot move a window');
assert.deepEqual(clampWindow({x:-10,y:510},{width:320,height:190},{width:800,height:490}),{x:0,y:300});
assert.deepEqual(clampWindow({x:120,y:90},{width:1000,height:700},{width:390,height:540}),{x:0,y:0});
assert.deepEqual(clampWindow({x:26,y:32},{width:320,height:190},{width:800,height:490}),{x:26,y:32});
console.log('PASS windows stay reachable when moved or resized beyond the desktop');

// A small DOM fixture checks ownership/lifecycle without replacing media nodes.
class Element {
  constructor(doc){
    this.ownerDocument=doc;this.style={zIndex:'',left:'',top:''};this.children=[];this.hidden=false;this.attributes=new Map();this.listeners=new Map();this.captures=new Set();
    this.clientWidth=800;this.clientHeight=490;this.offsetWidth=300;this.offsetHeight=180;
    const classes=new Set();this.classList={add:(...names)=>names.forEach(name=>classes.add(name)),remove:(...names)=>names.forEach(name=>classes.delete(name)),contains:name=>classes.has(name),toggle:(name,value)=>value?classes.add(name):classes.delete(name)};
  }
  append(child){child.parentElement=this;this.children.push(child);}
  remove(){if(this.parentElement)this.parentElement.children.splice(this.parentElement.children.indexOf(this),1);}
  get offsetLeft(){return parseFloat(this.style.left)||0;}
  get offsetTop(){return parseFloat(this.style.top)||0;}
  getBoundingClientRect(){return {x:this.offsetLeft,y:this.offsetTop};}
  setAttribute(key,value){this.attributes.set(key,value);}
  getAttribute(key){return this.attributes.get(key)??null;}
  removeAttribute(key){this.attributes.delete(key);}
  addEventListener(name,listener){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(listener);}
  removeEventListener(name,listener){this.listeners.get(name)?.delete(listener);}
  dispatch(name,event={}){for(const listener of this.listeners.get(name)||[])listener(event);}
  contains(node){for(let current=node;current;current=current.parentElement)if(current===this)return true;return false;}
  closest(){return null;}
  focus(){this.ownerDocument.activeElement=this;}
  setPointerCapture(id){this.captures.add(id);}
  hasPointerCapture(id){return this.captures.has(id);}
  releasePointerCapture(id){this.captures.delete(id);}
}
const doc={createElement(){return new Element(doc);}};
const host=new Element(doc),music=new Element(doc),popup=new Element(doc),handle=new Element(doc),iframe=new Element(doc);
popup.append(handle);popup.append(iframe);host.append(music);host.append(popup);
music.style.left='12px';music.style.top='20px';music.style.zIndex='3';
const manager=createWindowManager(host),musicWindow=manager.register(music,{draggable:false}),soundWindow=manager.register(popup,{handle,label:'SoundCloud'});
musicWindow.raise();assert.ok(Number(music.style.zIndex)>Number(popup.style.zIndex));
soundWindow.raise();assert.ok(Number(popup.style.zIndex)>Number(music.style.zIndex));
soundWindow.sendBack();assert.ok(Number(music.style.zIndex)>Number(popup.style.zIndex));
assert.equal(popup.children[1],iframe);assert.equal(music.style.left,'12px');assert.equal(music.style.top,'20px');
soundWindow.setVisible(false);assert.equal(popup.hidden,true);soundWindow.setVisible(true);assert.equal(popup.hidden,false);
console.log('PASS raising, sending back and reopening preserve iframe identity and Music layout');
const startLeft=popup.offsetLeft,startTop=popup.offsetTop;
handle.dispatch('pointerdown',{button:0,target:handle,clientX:320,clientY:220,pointerId:7,preventDefault(){}});
assert.equal(handle.hasPointerCapture(7),true);
handle.dispatch('pointermove',{clientX:370,clientY:250,pointerId:7});
assert.equal(popup.offsetLeft,startLeft+50);assert.equal(popup.offsetTop,startTop+30);
handle.dispatch('pointercancel');assert.equal(handle.hasPointerCapture(7),false);
const beforeKey=popup.offsetLeft;handle.dispatch('keydown',{target:handle,key:'ArrowLeft',shiftKey:true,preventDefault(){},stopPropagation(){}});assert.equal(popup.offsetLeft,beforeKey-1);
console.log('PASS pointer cancellation releases drag ownership and keyboard movement remains available');
manager.destroy();assert.equal(host.children.length,2);assert.equal(music.style.zIndex,'3');assert.equal(handle.getAttribute('tabindex'),null);
assert.ok([...handle.listeners.values()].every(listeners=>listeners.size===0));assert.equal(popup.children[1],iframe);
console.log('PASS manager cleanup restores styles and removes owned listeners without removing content');
console.log('PASS all 7 window manager checks');
