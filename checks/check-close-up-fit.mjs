import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {fitDisplayDistance} from '../camera-fit.js';

const tests=[];
const test=(name,run)=>tests.push({name,run});
const displays=[{width:3.86,height:3.86*1664/2560},{width:4.05,height:2.82}];
const poses=[
  {position:[0,0,0],rotation:[0,0,0]},
  {position:[-2.3,1.3,-1.4],rotation:[-.18,.23,0]},
  {position:[4,-2,3],rotation:[.52,-.61,.37]},
];

function projectedFrame({width,height,fov,viewport,pose,padding}) {
  const screen=new THREE.Group();screen.position.set(...pose.position);screen.rotation.set(...pose.rotation);screen.updateMatrixWorld(true);
  const centre=screen.getWorldPosition(new THREE.Vector3());
  const normal=new THREE.Vector3(0,0,1).transformDirection(screen.matrixWorld);
  const up=new THREE.Vector3(0,1,0).transformDirection(screen.matrixWorld);
  const camera=new THREE.PerspectiveCamera(fov,viewport.width/viewport.height,.001,1000);
  const distance=fitDisplayDistance({width,height,fov,aspect:camera.aspect,...(padding===undefined?{}:{padding})});
  camera.position.copy(centre).addScaledVector(normal,distance);camera.up.copy(up);camera.lookAt(centre);camera.updateMatrixWorld(true);
  const corners=[[-1,1],[1,1],[1,-1],[-1,-1]].map(([x,y])=>screen.localToWorld(new THREE.Vector3(x*width/2,y*height/2,0)).project(camera));
  const left=Math.min(...corners.map(point=>point.x)),right=Math.max(...corners.map(point=>point.x));
  const bottom=Math.min(...corners.map(point=>point.y)),top=Math.max(...corners.map(point=>point.y));
  return {corners,width:(right-left)/2,height:(top-bottom)/2,centre:centre.clone().project(camera),distance};
}

for(const [label,viewport]of [
  ['wide',{width:1440,height:900}],
  ['tall',{width:900,height:1440}],
  ['ultrawide',{width:3440,height:900}],
  ['narrow',{width:390,height:844}],
])test(`${label} close-up keeps every frame corner visible while filling the limiting viewport dimension`,()=>{
  for(const display of displays)for(const pose of poses)for(const fov of [14,36,72]){
    const result=projectedFrame({...display,fov,viewport,pose});
    for(const corner of result.corners){
      assert.ok(Number.isFinite(corner.x)&&Number.isFinite(corner.y)&&Number.isFinite(corner.z));
      assert.ok(Math.abs(corner.x)<=1+1e-9&&Math.abs(corner.y)<=1+1e-9,'a display corner was cropped');
      assert.ok(corner.z>-1&&corner.z<1,'the fitted frame must remain between camera clipping planes');
    }
    const limitingOccupancy=Math.max(result.width,result.height);
    assert.ok(limitingOccupancy>=.95&&limitingOccupancy<1,'the close-up should fill at least 95% with a small protective rim');
    assert.ok(Math.abs(result.centre.x)<1e-9&&Math.abs(result.centre.y)<1e-9,'the selected display centre must stay at the viewport centre');
  }
});

test('explicit extra padding adds visible clearance while preserving the frame centre',()=>{
  const options={...displays[1],fov:36,viewport:{width:1366,height:768},pose:poses[2]};
  const exact=projectedFrame({...options,padding:1});
  const spacious=projectedFrame({...options,padding:1.2});
  assert.ok(Math.max(exact.width,exact.height)>1-1e-9,'without padding the limiting edge meets the viewport');
  assert.ok(spacious.distance>exact.distance&&spacious.width<exact.width&&spacious.height<exact.height);
  assert.ok(Math.max(spacious.width,spacious.height)<.9,'extra padding should create meaningful breathing room');
  assert.ok(Math.abs(spacious.centre.x)<1e-9&&Math.abs(spacious.centre.y)<1e-9);
});

test('invalid or unrepresentable display fits fail before creating a broken camera position',()=>{
  const valid={width:4,height:2.6,fov:36,aspect:16/9};
  for(const field of ['width','height','aspect'])for(const value of [0,-1,NaN,Infinity,undefined,null,'4'])assert.throws(()=>fitDisplayDistance({...valid,[field]:value}),TypeError,`${field}: ${String(value)}`);
  for(const fov of [0,-1,180,181,NaN,Infinity,null,'36'])assert.throws(()=>fitDisplayDistance({...valid,fov}),TypeError);
  for(const padding of [0,.99,-1,NaN,Infinity,null,'1.035'])assert.throws(()=>fitDisplayDistance({...valid,padding}),TypeError);
  assert.throws(()=>fitDisplayDistance(),TypeError);assert.throws(()=>fitDisplayDistance(null),TypeError);
  assert.throws(()=>fitDisplayDistance({...valid,width:Number.MAX_VALUE,padding:Number.MAX_VALUE}),TypeError);
});

for(const {name,run}of tests){run();console.log(`PASS ${name}`);}
console.log(`PASS all ${tests.length} close-up camera fit checks`);
