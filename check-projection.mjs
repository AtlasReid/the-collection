import assert from 'node:assert/strict';
import * as THREE from './vendor/three/three.module.js';
import { displaySurface,quadTransform,updateCameraView } from './projection.js';

// CSS matrix3d is column-major. These checks apply it as the browser does,
// then compare the resulting screen positions with independently known quads.
function project(matrix, x, y) {
  const denominator = matrix[3] * x + matrix[7] * y + matrix[15];
  return {
    x: (matrix[0] * x + matrix[4] * y + matrix[12]) / denominator,
    y: (matrix[1] * x + matrix[5] * y + matrix[13]) / denominator,
  };
}
function near(actual, expected) {
  assert.ok(Math.abs(actual.x - expected.x) < 1e-7, `x: ${actual.x} != ${expected.x}`);
  assert.ok(Math.abs(actual.y - expected.y) < 1e-7, `y: ${actual.y} != ${expected.y}`);
}

const corners = [[0,0], [800,0], [800,490], [0,490]];
const cases = [
  {name:'translated rectangle', points:[{x:50,y:70},{x:850,y:70},{x:850,y:560},{x:50,y:560}]},
  {name:'skewed affine plane', points:[{x:70,y:90},{x:750,y:210},{x:930,y:690},{x:250,y:570}]},
  {name:'perspective trapezoid', points:[{x:200,y:140},{x:680,y:110},{x:770,y:580},{x:100,y:550}]},
];
for (const test of cases) {
  const matrix = quadTransform(test.points);
  assert.ok(matrix?.every(Number.isFinite));
  for (const [index, corner] of corners.entries()) near(project(matrix, ...corner), test.points[index]);
  // A projective map preserves straight lines and incidence. The centre of
  // the source lies on both diagonals, so its image lies on both target ones.
  const centre = project(matrix, 400, 245);
  const cross = (a,b,p) => (b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
  assert.ok(Math.abs(cross(test.points[0],test.points[2],centre)) < 1e-6);
  assert.ok(Math.abs(cross(test.points[1],test.points[3],centre)) < 1e-6);
  console.log(`PASS ${test.name}`);
}
assert.equal(quadTransform([{x:1,y:1},{x:1,y:1},{x:1,y:1},{x:1,y:1}]), null);
console.log('PASS singular quad is rejected');

for(const {name,width,height,cssWidth}of [
  {name:'Air panel',width:3.86,height:3.86*1664/2560,cssWidth:800},
  {name:'wide panel',width:6,height:2.1,cssWidth:960},
  {name:'portrait panel',width:3,height:5,cssWidth:540},
]) {
  const surface=displaySurface(width,height,{cssWidth});
  assert.equal(surface.width,width);assert.equal(surface.height,height);assert.equal(surface.centreY,0);
  assert.equal(surface.cssWidth,cssWidth);
  assert.ok(Math.abs(surface.cssHeight/surface.cssWidth-height/width)<1e-12,'CSS and physical panels must have the same aspect');
  const physical=[{x:-width/2,y:height/2},{x:width/2,y:height/2},{x:width/2,y:-height/2},{x:-width/2,y:-height/2}];
  const matrix=quadTransform(physical,surface.cssWidth,surface.cssHeight);
  for(const [index,corner]of [[0,0],[surface.cssWidth,0],[surface.cssWidth,surface.cssHeight],[0,surface.cssHeight]].entries())near(project(matrix,...corner),physical[index]);
  near(project(matrix,surface.cssWidth/2,surface.cssHeight/2),{x:0,y:0});
  console.log(`PASS ${name} desktop reaches every physical edge without letterboxing`);
}
assert.equal(displaySurface(2560,1664).cssHeight,520);

// The camera is not a child of the scene. WebGL updates its matrices while
// rendering, but the HTML screen is projected earlier in the same frame.
// Exercise jumps large enough to expose the old one-frame orientation lag.
const screen=new THREE.Group();
screen.position.set(-2.3,1.3,-1.4);screen.rotation.x=-.18;
screen.updateMatrixWorld(true);
const worldCorners=[[-2,1.225],[2,1.225],[2,-1.225],[-2,-1.225]]
  .map(([x,y])=>screen.localToWorld(new THREE.Vector3(x,y,0)));
const focusTarget=screen.getWorldPosition(new THREE.Vector3());
const focusPosition=focusTarget.clone().addScaledVector(new THREE.Vector3(0,0,1).transformDirection(screen.matrixWorld),4);
const homePosition=new THREE.Vector3(2.2,7.8,13.5),homeTarget=new THREE.Vector3(.25,1,.25);
for(const {name,previousProgress}of [
  {name:'instant camera focus keeps HTML and WebGL corners aligned',previousProgress:0},
  {name:'a skipped camera animation frame keeps HTML and WebGL corners aligned',previousProgress:.4},
]) {
  const camera=new THREE.PerspectiveCamera(36,1254/589,.08,100);
  camera.position.lerpVectors(homePosition,focusPosition,previousProgress);
  camera.lookAt(homeTarget.clone().lerp(focusTarget,previousProgress));
  camera.updateMatrixWorld(true);
  const staleCamera=camera.clone();
  camera.position.copy(focusPosition);
  staleCamera.position.copy(focusPosition);staleCamera.lookAt(focusTarget);
  const pixels=(view=camera)=>worldCorners.map(point=>{
    const projected=point.clone().project(view);
    return {x:(projected.x+1)*1254/2,y:(1-projected.y)*589/2};
  });
  const stale=pixels(staleCamera);
  staleCamera.updateMatrixWorld();
  const refreshed=pixels(staleCamera);
  assert.ok(Math.max(...stale.map((point,index)=>Math.hypot(point.x-refreshed[index].x,point.y-refreshed[index].y)))>50,
    'the fixture must expose the previous stale-camera failure');
  updateCameraView(camera,focusTarget);
  const html=pixels();
  const matrix=quadTransform(html);
  assert.ok(matrix?.every(Number.isFinite));
  // This is the additional camera refresh performed by WebGLRenderer.render.
  camera.updateMatrixWorld();
  const rendered=pixels();
  for(const [index,corner]of corners.entries()) {
    near(html[index],rendered[index]);
    near(project(matrix,...corner),rendered[index]);
  }
  console.log(`PASS ${name}`);
}
