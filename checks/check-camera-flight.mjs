import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {prepareViewportFlight,sampleViewportFlight,advanceFlightClock} from '../camera-flight.js';

const tests=[];
const test=(name,run)=>tests.push({name,run});
const near=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<1e-8,`${label}: ${actual} differs from ${expected}`);

function coefficients(transform) {
  if(transform==='none')return {x:0,y:0,sx:1,sy:1};
  const match=/^translate\(([-+\d.e]+)px, ([-+\d.e]+)px\) scale\(([-+\d.e]+), ([-+\d.e]+)\)$/i.exec(transform);
  assert.ok(match,`Invalid CSS transform: ${transform}`);
  const [x,y,sx,sy]=match.slice(1).map(Number);
  assert.ok([x,y,sx,sy].every(Number.isFinite));return {x,y,sx,sy};
}

function renderedPoint(point,camera,destination,transform) {
  const p=point.clone().project(camera),css=coefficients(transform);
  return {
    x:destination.left+css.x+(p.x+1)*.5*destination.width*css.sx,
    y:destination.top+css.y+(1-p.y)*.5*destination.height*css.sy,
  };
}

const pairs=[
  [{left:0,top:184,width:1552,height:729},{left:0,top:0,width:1552,height:751}],
  [{left:154,top:-65,width:1180,height:660},{left:20,top:12,width:1920,height:1080}],
  [{left:16,top:210,width:868,height:560},{left:0,top:0,width:900,height:1400}],
];

test('fullscreen promotion preserves every sampled world point at its old screen position before the camera starts',()=>{
  for(const [from,to]of pairs)for(const fov of [25,36,62]) {
    const oldCamera=new THREE.PerspectiveCamera(fov,from.width/from.height,.08,100);
    oldCamera.position.set(7,5,11);oldCamera.up.set(.1,1,.04);oldCamera.lookAt(-1,1,-1);oldCamera.updateMatrixWorld(true);
    const sample=sampleViewportFlight(prepareViewportFlight(from,to),0);
    const promoted=oldCamera.clone();promoted.aspect=sample.aspect;promoted.updateProjectionMatrix();promoted.updateMatrixWorld(true);
    for(const x of [-3,0,4])for(const y of [0,1,3])for(const z of [-2,0,1]) {
      const point=new THREE.Vector3(x,y,z),p=point.clone().project(oldCamera);
      const expected={x:from.left+(p.x+1)*.5*from.width,y:from.top+(1-p.y)*.5*from.height};
      const actual=renderedPoint(point,promoted,to,sample.transform);
      near(actual.x,expected.x,'Initial world x');near(actual.y,expected.y,'Initial world y');
    }
  }
});

test('intermediate shell expansion never stretches a real projected square',()=>{
  for(const [from,to]of pairs) {
    const flight=prepareViewportFlight(from,to),camera=new THREE.PerspectiveCamera(36,1,.08,100);
    const centre=new THREE.Vector3(-1,1,.5);camera.position.set(3,5,12);camera.lookAt(centre);camera.updateMatrixWorld(true);
    const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
    let previous=sampleViewportFlight(flight,0).rect;
    for(let index=0;index<=40;index++) {
      const sample=sampleViewportFlight(flight,index/40);camera.aspect=sample.aspect;camera.updateProjectionMatrix();
      const origin=renderedPoint(centre,camera,to,sample.transform);
      const horizontal=renderedPoint(centre.clone().add(right),camera,to,sample.transform);
      const vertical=renderedPoint(centre.clone().add(up),camera,to,sample.transform);
      near(Math.hypot(horizontal.x-origin.x,horizontal.y-origin.y),Math.hypot(vertical.x-origin.x,vertical.y-origin.y),'Projected square sides');
      assert.ok(sample.rect.width>=previous.width-1e-8&&sample.rect.height>=previous.height-1e-8);
      assert.ok([sample.aspect,...Object.values(sample.rect)].every(Number.isFinite));previous=sample.rect;
    }
  }
});

test('the endpoint removes the temporary transform and out-of-range progress stays at exact endpoints',()=>{
  for(const [from,to]of pairs) {
    const flight=prepareViewportFlight(from,to);
    const before=sampleViewportFlight(flight,-3),start=sampleViewportFlight(flight,0);
    assert.deepEqual(before,start);assert.deepEqual(start.rect,from);
    for(const progress of [1,1.5,100]) {
      const final=sampleViewportFlight(flight,progress);
      assert.equal(final.transform,'none');assert.deepEqual(final.rect,to);assert.equal(final.aspect,to.width/to.height);
    }
  }
});

test('prepared and sampled rectangles are detached and sampling does not mutate flight state',()=>{
  const from={...pairs[0][0]},to={...pairs[0][1]},flight=prepareViewportFlight(from,to);
  const saved=structuredClone(flight);from.left=900;to.width=600;
  assert.deepEqual(flight,saved);
  const sample=sampleViewportFlight(flight,.35);sample.rect.width=1;
  assert.deepEqual(flight,saved);assert.notEqual(sampleViewportFlight(flight,.35).rect.width,1);
});

test('invalid or unrepresentable viewport inputs fail before creating CSS or a broken camera aspect',()=>{
  const valid=pairs[0][0];
  for(const bad of [null,undefined,[],{},'viewport'])assert.throws(()=>prepareViewportFlight(bad,valid),TypeError);
  for(const key of ['left','top','width','height'])for(const value of [NaN,Infinity,-Infinity,'100',null])assert.throws(()=>prepareViewportFlight({...valid,[key]:value},valid),TypeError);
  for(const key of ['width','height'])for(const value of [0,-1])assert.throws(()=>prepareViewportFlight({...valid,[key]:value},valid),TypeError);
  assert.throws(()=>prepareViewportFlight({...valid,width:Number.MAX_VALUE,height:Number.MIN_VALUE},valid),TypeError);
  assert.throws(()=>prepareViewportFlight({...valid,left:Number.MAX_VALUE},{...valid,left:-Number.MAX_VALUE}),TypeError);
  const flight=prepareViewportFlight(valid,pairs[0][1]);
  for(const value of [NaN,Infinity,-Infinity,null,'0.5'])assert.throws(()=>sampleViewportFlight(flight,value),TypeError);
});

test('late first paint and long frame gaps pause a flight instead of jumping through the path',()=>{
  const options={duration:1450},first=advanceFlightClock(null,25000,options);
  assert.equal(first.progress,0);assert.deepEqual(first.state,{lastTime:25000,elapsed:0});
  const saved=structuredClone(first.state),stalled=advanceFlightClock(first.state,65000,options);
  assert.deepEqual(first.state,saved,'clock advances must not mutate an in-progress snapshot');
  assert.notEqual(stalled.state,first.state);assert.equal(stalled.state.elapsed,50);assert.equal(stalled.progress,0,'startup delay should absorb the first slow frame');
  const interrupted=advanceFlightClock(stalled.state,100000,options);
  assert.equal(interrupted.state.elapsed,100);assert.ok(interrupted.progress>0&&interrupted.progress<.02,'a second stalled paint must still advance only a small visible step');
  const backwards=advanceFlightClock(interrupted.state,99990,options);assert.equal(backwards.state.elapsed,100);
});

test('regular delivered frames finish the flight and reduced-motion duration skips the preparation hold',()=>{
  let clock=null,previous=0,result;
  for(let index=0;index<=110;index++) {
    result=advanceFlightClock(clock,10000+index*16,{duration:1450});clock=result.state;
    assert.ok(result.progress>=previous&&result.progress<=1);previous=result.progress;
    assert.ok(Number.isFinite(clock.lastTime)&&Number.isFinite(clock.elapsed));
  }
  assert.equal(result.progress,1);
  assert.equal(advanceFlightClock(null,40000,{duration:0}).progress,1);
  for(const options of [{duration:-1},{duration:NaN},{duration:100,delay:-1},{duration:100,maxStep:0}])assert.throws(()=>advanceFlightClock(null,1000,options),TypeError);
  assert.throws(()=>advanceFlightClock({lastTime:1000,elapsed:NaN},1016,{duration:100}),TypeError);
});

for(const {name,run}of tests){run();console.log(`PASS ${name}`);}
console.log(`PASS all ${tests.length} camera viewport flight checks`);
