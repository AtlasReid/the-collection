import assert from 'node:assert/strict';
import * as THREE from './vendor/three/three.module.js';
import { createCDShelf } from './cd-shelf.js';
import { createCaseHover } from './case-hover.js';
import { createHardware } from './hardware.js';
import { createDiscCollection } from './discs.js';
import { fitOrbitRadius,centerOrbitTarget,fitCenteredOrbit,fitDeskOrbit } from './camera-fit.js';
import { raisedShelfPose } from './case-journey.js';
import { CASE_WIDTH,CASE_DEPTH,CASE_PICK_HEIGHT,DISC_APPROACH_DISTANCE,DISC_INSERT_DISTANCE } from './physical-scale.js';
import { sceneAlbums } from './music/scene-catalogue.js';

// Conservative physical case envelopes, independent of cover-image loading.
// They retain the real case dimensions while requiring no browser/canvas.
const caseGeometry = new THREE.BoxGeometry(CASE_WIDTH,CASE_PICK_HEIGHT,CASE_DEPTH);
function fixture(count = sceneAlbums.length) {
  const records = Array.from({ length: count }, () => {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(caseGeometry));
    return { group, location: 'shelf' };
  });
  const shelf = createCDShelf(records);
  for (const record of records) applyPose(record, shelf.poseFor(record));
  return { records, shelf };
}
function applyPose(record, pose) {
  record.group.position.copy(pose.position);
  record.group.quaternion.copy(pose.quaternion);
  record.group.updateMatrixWorld(true);
}
function nearPose(group, pose) {
  assert.ok(group.position.distanceTo(pose.position) < 1e-10);
  assert.ok(1 - Math.abs(group.quaternion.dot(pose.quaternion)) < 1e-10);
}

// AABB overlap would incorrectly reject the intentionally overlapping covers.
// Test their actual oriented boxes with the fifteen separating-axis families.
function orientedBox(mesh) {
  mesh.updateWorldMatrix(true, false);
  mesh.geometry.computeBoundingBox();
  const bounds = mesh.geometry.boundingBox;
  const columns = [0, 1, 2].map(index => new THREE.Vector3().setFromMatrixColumn(mesh.matrixWorld, index));
  return {
    centre: bounds.getCenter(new THREE.Vector3()).applyMatrix4(mesh.matrixWorld),
    axes: columns.map(axis => axis.clone().normalize()),
    half: bounds.getSize(new THREE.Vector3()).toArray().map((size, index) => size * columns[index].length() / 2),
  };
}
function intersects(a, b) {
  const delta = b.centre.clone().sub(a.centre);
  const axes = [...a.axes, ...b.axes, ...a.axes.flatMap(x => b.axes.map(y => new THREE.Vector3().crossVectors(x, y)))];
  for (const axis of axes) {
    if (axis.lengthSq() < 1e-12) continue;
    axis.normalize();
    const radius = box => box.half.reduce((sum, half, index) => sum + half * Math.abs(axis.dot(box.axes[index])), 0);
    if (Math.abs(delta.dot(axis)) > radius(a) + radius(b) - 1e-6) return false;
  }
  return true;
}
function corners(bounds) {
  const result = [];
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) result.push(new THREE.Vector3(x, y, z));
  return result;
}
// Hardware generates keyboard legends on a canvas. Stub that drawing surface
// only; use its real current meshes and attachment/cable transforms for fits.
function geometryDocument() {
  const gradient={addColorStop(){}};
  const context=new Proxy({},{get:(_object,key)=>{
    if(key==='createLinearGradient'||key==='createRadialGradient')return()=>gradient;
    if(key==='measureText')return text=>({width:String(text).length*10});
    return()=>{};
  }});
  return{createElement:()=>({width:0,height:0,getContext:()=>context})};
}
function geometryHardware() {
  const previousDocument=globalThis.document;
  globalThis.document=geometryDocument();
  try{return createHardware();}finally{
    if(previousDocument===undefined)delete globalThis.document;
    else globalThis.document=previousDocument;
  }
}
let fitHardware;
function framingFixture() {
  fitHardware??=geometryHardware();
  const {records,shelf}=fixture();
  return framingFor(fitHardware,records,shelf);
}
function framingFor(hardware,records,shelf) {
  const compositionBounds=new THREE.Box3();
  for(const object of [hardware.laptop,hardware.drive,shelf.group,...records.map(record=>record.group)])compositionBounds.union(new THREE.Box3().setFromObject(object));
  const bounds=new THREE.Box3().setFromObject(hardware.group).union(new THREE.Box3().setFromObject(shelf.group));
  const journeyCorners=[];
  for(const record of records) {
    const home=shelf.poseFor(record),hover=shelf.poseFor(record,true);
    for(const pose of [home,hover,raisedShelfPose(home),raisedShelfPose(hover),shelf.tablePose]) {
      applyPose(record,pose);
      const caseBounds=new THREE.Box3().setFromObject(record.group);
      bounds.union(caseBounds);journeyCorners.push(...corners(caseBounds));
    }
    applyPose(record,home);
  }
  bounds.union(new THREE.Box3(new THREE.Vector3(-2.1,0,1.8),new THREE.Vector3(.6,1.8,3.4))).expandByScalar(.4);
  return{bounds,compositionBounds,journeyCorners};
}
function meshVertices(root) {
  root.updateWorldMatrix(true,true);
  const points=[];
  root.traverse(object=>{
    if(!object.isMesh)return;
    const positions=object.geometry.attributes.position;
    for(let index=0;index<positions.count;index++)points.push(new THREE.Vector3().fromBufferAttribute(positions,index).applyMatrix4(object.matrixWorld));
  });
  return points;
}
async function runtimeFramingFixture() {
  fitHardware??=geometryHardware();
  const previousDocument=globalThis.document,previousLoad=THREE.TextureLoader.prototype.loadAsync;
  let records;
  globalThis.document=geometryDocument();
  THREE.TextureLoader.prototype.loadAsync=async()=>new THREE.Texture({width:600,height:600});
  try{records=await createDiscCollection(sceneAlbums);}finally{
    THREE.TextureLoader.prototype.loadAsync=previousLoad;
    if(previousDocument===undefined)delete globalThis.document;
    else globalThis.document=previousDocument;
  }
  const hardware=fitHardware,shelf=createCDShelf(records);
  for(const record of records)applyPose(record,shelf.poseFor(record));
  const framing=framingFor(hardware,records,shelf);
  const storedPoints=[hardware.group,shelf.group,...records.map(record=>record.group)].flatMap(meshVertices);
  const motionPoints=[];
  const capture=object=>motionPoints.push(...corners(new THREE.Box3().setFromObject(object)));
  const sampleCase=(record,from,to,arc)=>{
    for(let index=0;index<=24;index++) {
      const t=index/24;
      applyPose(record,{position:from.position.clone().lerp(to.position,t).add(new THREE.Vector3(0,Math.sin(Math.PI*t)*arc,0)),quaternion:from.quaternion.clone().slerp(to.quaternion,t)});
      capture(record.group);
    }
  };
  const slot=hardware.slot.getWorldPosition(new THREE.Vector3());
  const approach=slot.clone().add(new THREE.Vector3(0,0,DISC_APPROACH_DISTANCE));
  const inside=slot.clone().add(new THREE.Vector3(0,0,-DISC_INSERT_DISTANCE));
  for(const record of records) {
    // Taking a case out from either its stored or hovered pose. Returning
    // follows these same two segments in reverse, with the same arc.
    for(const hover of [false,true]) {
      const home=shelf.poseFor(record,hover),raised=raisedShelfPose(home);
      sampleCase(record,home,raised,0);sampleCase(record,raised,shelf.tablePose,.75);
    }
    applyPose(record,shelf.tablePose);
    for(let index=0;index<=24;index++) {
      record.setOpen(2*Math.PI/3*index/24);record.group.updateMatrixWorld(true);capture(record.group);
    }
    const seat=record.getDiscSeat(new THREE.Vector3()),above=seat.clone().add(new THREE.Vector3(0,.65,0));
    const tableYaw=record.group.rotation.y;
    for(const [from,to,arc] of [[seat,above,0],[above,approach,1.25],[approach,above,1.3],[approach,inside,0]])for(let index=0;index<=24;index++) {
      const t=index/24;
      record.disc.position.copy(from).lerp(to,t);record.disc.position.y+=Math.sin(Math.PI*t)*arc;
      record.disc.rotation.set(0,tableYaw+(Math.PI*1.6-tableYaw)*t,0);
      record.disc.updateMatrixWorld(true);capture(record.disc);
    }
    record.setOpen(0);applyPose(record,shelf.poseFor(record));
  }
  return{...framing,storedPoints,motionPoints};
}
function orbitDirection({azimuth,elevation}) {
  return new THREE.Vector3(Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation));
}
function orbitCamera(target,orbit,aspect) {
  const camera=new THREE.PerspectiveCamera(36,aspect,.08,100);
  camera.position.copy(orbitDirection(orbit)).multiplyScalar(orbit.radius).add(target);
  camera.lookAt(target);camera.updateMatrixWorld(true);
  return camera;
}
function assertCentered(camera,bounds) {
  const projected=corners(bounds).map(point=>point.project(camera));
  assert.ok(projected.every(point=>[point.x,point.y,point.z].every(Number.isFinite)),'A projected composition corner is not finite.');
  const left=Math.min(...projected.map(point=>point.x)),right=Math.max(...projected.map(point=>point.x));
  assert.ok(Math.abs(left+right)<1e-7,`Unequal projected margins: ${left}, ${right}`);
}
const tests = [];
function test(name, run) { tests.push({ name, run }); }
const runtimeFraming=await runtimeFramingFixture();

for (const count of [6, sceneAlbums.length]) test(`${count} stored cases are physically separated and clear the rack`, () => {
  const { records, shelf } = fixture(count);
  for (let i = 0; i < records.length; i++) {
    const box = orientedBox(records[i].group.children[0]);
    for (let j = i + 1; j < records.length; j++) assert.ok(!intersects(box, orientedBox(records[j].group.children[0])), `Cases ${i} and ${j} intersect.`);
    for (const support of shelf.group.children) assert.ok(!intersects(box, orientedBox(support)), `Case ${i} intersects ${support.name}.`);
  }
});

test('hover paths clear neighbours and physical shelf supports', () => {
  const { records, shelf } = fixture();
  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    const home = shelf.poseFor(record), hover = shelf.poseFor(record, true);
    for (let sample = 0; sample <= 20; sample++) {
      const t = sample / 20;
      applyPose(record, {
        position: home.position.clone().lerp(hover.position, t),
        quaternion: home.quaternion.clone().slerp(hover.quaternion, t),
      });
      const box = orientedBox(record.group.children[0]);
      for (const other of records) if (other !== record) assert.ok(!intersects(box, orientedBox(other.group.children[0])), `Hovering case ${index} intersects another case at ${t}.`);
      for (const support of shelf.group.children) assert.ok(!intersects(box, orientedBox(support)), `Hovering case ${index} intersects ${support.name} at ${t}.`);
    }
    applyPose(record, home);
  }
});

for (const [name,aspect] of [['desktop',2],['phone',.68],['square',1],['wide',3]]) {
  test(`${name} centered home fits actual hardware, cable and case journey bounds`, () => {
    const {bounds,compositionBounds,journeyCorners}=framingFixture();
    const orbit={azimuth:.15,elevation:aspect<1?.67:.48};
    const {target,radius}=fitCenteredOrbit(bounds,compositionBounds,new THREE.Vector3(.25,1,.25),orbit,36,aspect);
    const camera=orbitCamera(target,{...orbit,radius},aspect);
    assertCentered(camera,compositionBounds);
    const visible = point => {
      const projected = point.clone().project(camera);
      assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && projected.z > -1 && projected.z < 1, `Clipped corner ${point.toArray()} -> ${projected.toArray()}`);
    };
    corners(bounds).forEach(visible);
    journeyCorners.forEach(visible);
  });
}

test('horizontal composition centering remains balanced across orbit and deliberate zoom',()=>{
  const {bounds,compositionBounds}=framingFixture(),baseTarget=new THREE.Vector3(.25,1,.25);
  for(const aspect of [.68,2]) {
    const home={azimuth:.15,elevation:aspect<1?.67:.48};
    const fit=fitCenteredOrbit(bounds,compositionBounds,baseTarget,home,36,aspect);
    for(const azimuth of [-.9,.15,.9])for(const elevation of [.22,.48,1.15])for(const zoom of [.62,1,1.4]) {
      const orbit={azimuth,elevation,radius:fit.radius*zoom};
      const target=centerOrbitTarget(compositionBounds,baseTarget,orbit),camera=orbitCamera(target,orbit,aspect);
      assertCentered(camera,compositionBounds);
      assert.equal(target.y,baseTarget.y);
      assert.ok(Math.abs(target.clone().sub(baseTarget).dot(orbitDirection(orbit)))<1e-10,'Centering changed camera depth.');
      assert.ok(Math.abs(camera.position.distanceTo(target)-orbit.radius)<1e-10,'Centering changed orbit distance.');
    }
  }
});

test('centered fits preserve inputs and translate with the physical arrangement',()=>{
  const {bounds,compositionBounds}=framingFixture(),baseTarget=new THREE.Vector3(.25,1,.25),orbit={azimuth:.15,elevation:.48,radius:20};
  const snapshot=JSON.stringify({bounds,compositionBounds,baseTarget,orbit});
  const original=fitCenteredOrbit(bounds,compositionBounds,baseTarget,orbit,36,2);
  const translation=new THREE.Vector3(13,2,-7);
  const translated=fitCenteredOrbit(bounds.clone().translate(translation),compositionBounds.clone().translate(translation),baseTarget.clone().add(translation),orbit,36,2);
  assert.ok(original.target.clone().add(translation).distanceTo(translated.target)<1e-9);
  assert.ok(Math.abs(original.radius-translated.radius)<1e-9);
  assert.ok(centerOrbitTarget(compositionBounds,baseTarget,orbit).clone().add(translation).distanceTo(centerOrbitTarget(compositionBounds.clone().translate(translation),baseTarget.clone().add(translation),orbit))<1e-9);
  assert.equal(JSON.stringify({bounds,compositionBounds,baseTarget,orbit}),snapshot);
  const legacyRadius=fitOrbitRadius(bounds,baseTarget,orbit,36,2);
  corners(bounds).forEach(point=>{
    const projected=point.project(orbitCamera(baseTarget,{...orbit,radius:legacyRadius},2));
    assert.ok(Math.abs(projected.x)<1&&Math.abs(projected.y)<1,'The original orbit fit no longer contains its envelope.');
  });
});

test('centering rejects invalid geometry and composition crossing the camera plane',()=>{
  const bounds=new THREE.Box3(new THREE.Vector3(-1,-1,-1),new THREE.Vector3(1,1,1)),base=new THREE.Vector3(),orbit={azimuth:0,elevation:.48,radius:5};
  for(const invalidBounds of [new THREE.Box3(),new THREE.Box3(new THREE.Vector3(NaN,0,0),new THREE.Vector3(1,1,1))])assert.throws(()=>centerOrbitTarget(invalidBounds,base,orbit),TypeError);
  for(const invalidOrbit of [{...orbit,radius:0},{...orbit,azimuth:NaN},{...orbit,elevation:Math.PI/2}])assert.throws(()=>centerOrbitTarget(bounds,base,invalidOrbit),TypeError);
  assert.throws(()=>centerOrbitTarget(bounds,base,{...orbit,radius:.5}),RangeError);
  assert.throws(()=>centerOrbitTarget(bounds,new THREE.Vector3(Infinity,0,0),orbit),TypeError);
  for(const [fov,aspect,padding] of [[0,2,1.1],[36,0,1.1],[36,2,.9]])assert.throws(()=>fitCenteredOrbit(bounds,bounds,base,orbit,fov,aspect,padding),TypeError);
});

for(const aspect of [1280/488,.68,1,3,4,8])test(`closer default at aspect ${aspect.toFixed(2)} retains the real desk, cable and sampled CD journeys`,()=>{
  const {bounds,compositionBounds,storedPoints,motionPoints}=runtimeFraming;
  const base=new THREE.Vector3(.25,1,.25),orbit={azimuth:.15,elevation:aspect<1?.67:.48};
  const {target,radius,framingRadius}=fitDeskOrbit(bounds,compositionBounds,base,orbit,36,aspect);
  assert.ok(radius<framingRadius*.9,'The closer default does not visibly enlarge the composition.');
  const camera=orbitCamera(target,{...orbit,radius},aspect);
  assertCentered(camera,compositionBounds);
  for(const [name,points] of [['visible desk and cable',storedPoints],['CD case/disc journey',motionPoints]])for(const point of points) {
    const projected=point.clone().project(camera);
    assert.ok([projected.x,projected.y,projected.z].every(Number.isFinite)&&Math.abs(projected.x)<1&&Math.abs(projected.y)<1&&Math.abs(projected.z)<1,`${name} clipped at ${point.toArray()} -> ${projected.toArray()}`);
  }
  const conservative=fitCenteredOrbit(bounds,compositionBounds,base,orbit,36,aspect);
  assert.equal(framingRadius,conservative.radius,'The default changed the original manual zoom reference.');
});

test('closer default clamps to the visible fit when no larger journey envelope is available',()=>{
  const {compositionBounds}=runtimeFraming,base=new THREE.Vector3(.25,1,.25),orbit={azimuth:.15,elevation:.48};
  for(const aspect of [.68,1280/488,8]) {
    const {target,radius}=fitDeskOrbit(compositionBounds,compositionBounds,base,orbit,36,aspect);
    const camera=orbitCamera(target,{...orbit,radius},aspect);
    assertCentered(camera,compositionBounds);
    for(const point of corners(compositionBounds)) {
      const projected=point.project(camera);
      assert.ok(Math.abs(projected.x)<.98&&Math.abs(projected.y)<.98&&Math.abs(projected.z)<1,'The closer default cropped its visible composition.');
    }
  }
});

function withClock(run) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'performance');
  let now = 0;
  Object.defineProperty(globalThis, 'performance', { value: { now: () => now }, configurable: true });
  try { run(value => { now = value; }); } finally { Object.defineProperty(globalThis, 'performance', previous); }
}

test('hover retarget starts at the displayed pose', () => withClock(setTime => {
  const { records, shelf } = fixture();
  const controller = createCaseHover(records, shelf);
  controller.set(records[0]); setTime(175); controller.step(175);
  const displayed = { position: records[0].group.position.clone(), quaternion: records[0].group.quaternion.clone() };
  controller.set(records[1]); nearPose(records[0].group, displayed);
  setTime(525); assert.equal(controller.step(525), false);
  nearPose(records[0].group, shelf.poseFor(records[0]));
  nearPose(records[1].group, shelf.poseFor(records[1], true));
}));

test('settle exception preserves pickup pose and later settlement works from null', () => withClock(setTime => {
  const { records, shelf } = fixture();
  const controller = createCaseHover(records, shelf);
  controller.set(records[2]); setTime(175); controller.step(175);
  const pickup = { position: records[2].group.position.clone(), quaternion: records[2].group.quaternion.clone() };
  controller.settle(records[2]); setTime(700); assert.equal(controller.step(700), false);
  nearPose(records[2].group, pickup); assert.equal(controller.current, null);
  controller.settle(); controller.finish(); nearPose(records[2].group, shelf.poseFor(records[2]));
}));

test('travelling cases belong to the scene rather than hover', () => withClock(setTime => {
  const { records, shelf } = fixture();
  const controller = createCaseHover(records, shelf);
  controller.set(records[3]); records[3].location = 'travelling';
  const flight = { position: new THREE.Vector3(-.3, 1.8, 2.5), quaternion: new THREE.Quaternion() };
  applyPose(records[3], flight); setTime(700); controller.step(700);
  nearPose(records[3].group, flight); assert.equal(controller.current, null);
  controller.finish(); nearPose(records[3].group, flight);
}));

test('reduced-motion hover reaches exact endpoints without animation', () => withClock(() => {
  const { records, shelf } = fixture();
  const controller = createCaseHover(records, shelf, { reducedMotion: { matches: true } });
  controller.set(records[4]); nearPose(records[4].group, shelf.poseFor(records[4], true));
  assert.equal(controller.step(0), false);
  controller.set(null); nearPose(records[4].group, shelf.poseFor(records[4]));
}));

test('staged shelf extraction and return clear all neighbours and rack supports', () => {
  const { records, shelf } = fixture();
  for (const hovered of [false, true]) for (let index = 0; index < records.length; index++) {
    const record = records[index];
    const stored = shelf.poseFor(record, hovered);
    const raised = raisedShelfPose(stored);
    const table = shelf.tablePose;
    const stages = [
      { from: stored, to: raised, arc: 0, name: 'extract' },
      { from: raised, to: table, arc: .75, name: 'to table' },
      { from: table, to: raised, arc: .75, name: 'above shelf' },
      { from: raised, to: stored, arc: 0, name: 'shelve' },
    ];
    for (const stage of stages) for (let sample = 0; sample <= 40; sample++) {
      const t = sample / 40;
      const position = stage.from.position.clone().lerp(stage.to.position, t);
      position.y += Math.sin(Math.PI * t) * stage.arc;
      applyPose(record, {
        position,
        quaternion: stage.from.quaternion.clone().slerp(stage.to.quaternion, t),
      });
      const box = orientedBox(record.group.children[0]);
      const where = `case ${index}, ${hovered ? 'hovered' : 'home'}, ${stage.name}, ${t}`;
      for (const other of records) if (other !== record) assert.ok(!intersects(box, orientedBox(other.group.children[0])), `Journey crosses a neighbouring case: ${where}.`);
      for (const support of shelf.group.children) assert.ok(!intersects(box, orientedBox(support)), `Journey crosses ${support.name}: ${where}.`);
    }
    applyPose(record, shelf.poseFor(record));
  }
});

let failures = 0;
for (const { name, run } of tests) {
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}
if (failures) process.exitCode = 1;
else console.log(`PASS all ${tests.length} arrangement checks`);
