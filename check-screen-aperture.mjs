import assert from 'node:assert/strict';
import * as THREE from './vendor/three/three.module.js';
import { createScreenAperture,setScreenApertureActive,screenOccluder } from './screen-aperture.js';
import { displaySurface,quadTransform } from './projection.js';
import { createLaptop } from './macbook-air.js';

const tests=[];
const test=(name,run)=>tests.push({name,run});
const close=(actual,expected,tolerance=2e-6)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);

function fixture({width=3.86,height=3.86*1664/2560,top=.17,bottom=.05}={}) {
  const scene=new THREE.Scene();
  const laptop=new THREE.Group();laptop.position.set(-2.3,.134,-1.41);
  laptop.rotation.set(-.18,.23,.07);scene.add(laptop);
  const screen=new THREE.Group();screen.position.set(0,1.29,.023);laptop.add(screen);
  const hardware={screen,screenWidth:width,screenHeight:height,screenTopInset:top,screenBottomInset:bottom};
  const aperture=createScreenAperture(hardware);setScreenApertureActive(aperture,true);
  scene.updateMatrixWorld(true);
  return {scene,screen,aperture,hardware};
}

function flatFixture() {
  const scene=new THREE.Scene(),screen=new THREE.Group();scene.add(screen);
  const aperture=createScreenAperture({screen,screenWidth:4,screenHeight:3});
  setScreenApertureActive(aperture,true);scene.updateMatrixWorld(true);
  return {scene,screen,aperture};
}

function actualPanelFixture() {
  // The model only needs a keyboard canvas context. No GPU, image loading or
  // browser layout is involved in these physical-boundary and ray checks.
  const previous=globalThis.document,context=new Proxy({}, {get:()=>()=>{}});
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
  let hardware;
  try{hardware=createLaptop();}
  finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
  const aperture=createScreenAperture(hardware);setScreenApertureActive(aperture,true);hardware.laptop.updateMatrixWorld(true);
  return {...hardware,aperture};
}

function panelRay(screen,x,y) {
  const origin=screen.localToWorld(new THREE.Vector3(x,y,5));
  const normal=new THREE.Vector3(0,0,1).transformDirection(screen.matrixWorld);
  return new THREE.Raycaster(origin,normal.negate());
}

function plane(scene,z,{x=0,width=2,height=2}={}) {
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial());
  mesh.position.set(x,0,z);scene.add(mesh);scene.updateMatrixWorld(true);return mesh;
}

function rayAt(x=0,y=0,{back=false}={}) {
  return new THREE.Raycaster(new THREE.Vector3(x,y,back?-5:5),new THREE.Vector3(0,0,back?1:-1));
}

function cssPoint(matrix,x,y) {
  const w=matrix[3]*x+matrix[7]*y+matrix[15];
  return {x:(matrix[0]*x+matrix[4]*y+matrix[12])/w,y:(matrix[1]*x+matrix[5]*y+matrix[13])/w};
}

test('transformed aperture vertices and interior agree with the live DOM projection',()=>{
  for(const size of [{width:3.86,height:3.86*1664/2560,top:.17,bottom:.05},{width:6,height:2.1,top:.3,bottom:.1}]) {
    const {screen,aperture,hardware}=fixture(size);
    const content=displaySurface(hardware.screenWidth,hardware.screenHeight);
    for(const [viewportWidth,viewportHeight] of [[1600,740],[382,560]]) {
      const centre=aperture.getWorldPosition(new THREE.Vector3());
      const normal=new THREE.Vector3(0,0,1).transformDirection(aperture.matrixWorld);
      const camera=new THREE.PerspectiveCamera(36,viewportWidth/viewportHeight,.08,100);
      camera.position.copy(centre).addScaledVector(normal,5).add(new THREE.Vector3(.75,.5,0));
      camera.lookAt(centre);camera.updateMatrixWorld(true);
      const pixels=world=>{
        const p=world.clone().project(camera);
        return {x:(p.x+1)*viewportWidth/2,y:(1-p.y)*viewportHeight/2};
      };
      const corners=[[-1,1],[1,1],[1,-1],[-1,-1]].map(([x,y])=>pixels(screen.localToWorld(new THREE.Vector3(x*content.width/2,y*content.height/2+content.centreY,aperture.position.z))));
      const matrix=quadTransform(corners,content.cssWidth,content.cssHeight);assert.ok(matrix);
      const position=aperture.geometry.getAttribute('position');
      for(let i=0;i<position.count;i++) {
        const local=new THREE.Vector3().fromBufferAttribute(position,i);
        const css=cssPoint(matrix,(local.x/content.width+.5)*content.cssWidth,(.5-local.y/content.height)*content.cssHeight);
        const actual=pixels(local.applyMatrix4(aperture.matrixWorld));
        close(actual.x,css.x);close(actual.y,css.y);
      }
      for(const u of [0,.17,.5,.93,1])for(const v of [0,.23,.5,.81,1]) {
        const actual=pixels(aperture.localToWorld(new THREE.Vector3((u-.5)*content.width,(.5-v)*content.height,0)));
        const css=cssPoint(matrix,u*content.cssWidth,v*content.cssHeight);
        close(actual.x,css.x);close(actual.y,css.y);
      }
    }
  }
});

test('a group-only fallback aperture is front-facing, depth-writing and only two triangles',()=>{
  const {aperture}=flatFixture(),material=aperture.material;
  assert.equal(aperture.geometry.index.count/3,2);
  assert.equal(material.opacity,0);assert.equal(material.blending,THREE.NoBlending);
  assert.equal(material.transparent,false);assert.equal(material.depthWrite,true);assert.equal(material.depthTest,true);
  assert.equal(material.colorWrite,true);assert.equal(material.toneMapped,false);
  assert.equal(aperture.castShadow,false);assert.equal(aperture.receiveShadow,false);
  assert.equal(rayAt().intersectObject(aperture).length>0,true);
  assert.equal(rayAt(0,0,{back:true}).intersectObject(aperture).length,0);
});

test('the aperture reaches all display bounds without legacy top or bottom insets',()=>{
  const {aperture,hardware}=fixture({top:.4,bottom:.2});
  aperture.geometry.computeBoundingBox();const box=aperture.geometry.boundingBox;
  close(box.min.x,-hardware.screenWidth/2);close(box.max.x,hardware.screenWidth/2);
  close(box.min.y,-hardware.screenHeight/2);close(box.max.y,hardware.screenHeight/2);
  assert.equal(aperture.position.y,0);
  for(const [x,y]of [[-hardware.screenWidth/2+1e-4,0],[hardware.screenWidth/2-1e-4,0],[0,hardware.screenHeight/2-1e-4],[0,-hardware.screenHeight/2+1e-4]])
    assert.ok(panelRay(hardware.screen,x,y).intersectObject(aperture).length,'each physical display edge must expose the live desktop');
});

test('the real Air aperture clones its full panel and preserves rounded upper and square lower corners',()=>{
  const {screen,screenWidth:width,screenHeight:height,screenCornerRadius:radius,aperture}=actualPanelFixture();
  assert.notEqual(aperture.geometry,screen.geometry,'the aperture owns its geometry');
  assert.notEqual(aperture.geometry.attributes.position.array,screen.geometry.attributes.position.array);
  assert.deepEqual(aperture.geometry.attributes.position.array,screen.geometry.attributes.position.array);
  aperture.geometry.computeBoundingBox();const box=aperture.geometry.boundingBox;
  close(box.min.x,-width/2);close(box.max.x,width/2);close(box.min.y,-height/2);close(box.max.y,height/2);
  for(const sign of [-1,1]) {
    const roundedOutside=panelRay(screen,sign*(width/2-.001),height/2-.001);
    assert.equal(roundedOutside.intersectObject(screen,false).length,0);
    assert.equal(roundedOutside.intersectObject(aperture,false).length,0,'rounded corners must not clear black bezel pixels');
    assert.ok(panelRay(screen,sign*(width/2-radius),height/2-.001).intersectObject(aperture,false).length,'the display must extend to its real top edge');
    assert.ok(panelRay(screen,sign*(width/2-.001),-height/2+.001).intersectObject(aperture,false).length,'lower corners remain square');
  }
});

test('the actual notch and camera remain in front of the aperture and block HTML input',()=>{
  const {laptop,screen,screenHeight:height,aperture}=actualPanelFixture();
  const notch=laptop.getObjectByName('Display notch'),camera=laptop.getObjectByName('Notch camera');
  const notchDepth=notch.position.z-screen.position.z,cameraDepth=camera.position.z-screen.position.z;
  assert.ok(aperture.position.z>0&&aperture.position.z<notchDepth);
  assert.ok(aperture.position.z<cameraDepth);
  assert.equal(screenOccluder(panelRay(screen,.1,height/2-.043),aperture,[laptop])?.object,notch);
  assert.equal(screenOccluder(panelRay(screen,0,height/2-.036),aperture,[laptop])?.object,camera);
  assert.equal(screenOccluder(panelRay(screen,.3,height/2-.043),aperture,[laptop]),null,'nearby top-menu input stays usable');
});

test('an active desktop removes the competing black panel draw while its aperture and physical notch remain renderable',()=>{
  const {laptop,screen,aperture}=actualPanelFixture();
  const notch=laptop.getObjectByName('Display notch'),camera=laptop.getObjectByName('Notch camera');
  const geometry=screen.geometry,position=aperture.position.clone(),material=screen.material;
  assert.equal(screen.visible,true,'the screen hierarchy must remain traversable');
  assert.equal(material.visible,false,'the fallback must not submit competing triangles');
  assert.equal(aperture.visible,true);assert.equal(aperture.material.visible,true);
  assert.equal(notch.visible,true);assert.equal(notch.material.visible,true);
  assert.equal(camera.visible,true);assert.equal(camera.material.visible,true);
  setScreenApertureActive(aperture,true);
  assert.equal(screen.material,material,'repeated active frames do not allocate new materials');
  assert.equal(screen.geometry,geometry);assert.ok(aperture.position.equals(position));
  setScreenApertureActive(aperture,false);
  assert.equal(screen.material.visible,true,'inactive/mobile mode restores the black hardware fallback');
  assert.equal(aperture.visible,false);assert.equal(screen.visible,true);
  setScreenApertureActive(aperture,true);assert.equal(screen.material.visible,false);
  assert.equal(notch.material.visible,true);assert.equal(aperture.material.depthTest,true);assert.equal(aperture.material.depthWrite,true);
});

test('deactivating an aperture preserves an originally invisible panel material',()=>{
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(4,3),new THREE.MeshBasicMaterial());screen.material.visible=false;
  const aperture=createScreenAperture({screen,screenWidth:4,screenHeight:3});
  setScreenApertureActive(aperture,true);assert.equal(screen.material.visible,false);assert.equal(aperture.visible,true);
  setScreenApertureActive(aperture,false);assert.equal(screen.material.visible,false);assert.equal(aperture.visible,false);
  setScreenApertureActive(aperture,false);assert.equal(screen.material.visible,false);
});

test('material arrays suppress only the panel and keep shared notch/bezel materials unchanged',()=>{
  const root=new THREE.Group(),shared=new THREE.MeshBasicMaterial(),privateMaterial=new THREE.MeshBasicMaterial();privateMaterial.visible=false;
  const original=[shared,privateMaterial],screen=new THREE.Mesh(new THREE.PlaneGeometry(4,3),original);
  const bezel=new THREE.Mesh(new THREE.PlaneGeometry(4.2,3.2),shared);root.add(screen,bezel);
  const aperture=createScreenAperture({screen,screenWidth:4,screenHeight:3});
  setScreenApertureActive(aperture,true);
  const isolated=screen.material[0];assert.notEqual(isolated,shared);assert.equal(isolated.visible,false);
  assert.equal(screen.material[1],privateMaterial);assert.equal(privateMaterial.visible,false);
  assert.equal(bezel.material,shared);assert.equal(shared.visible,true,'shared physical parts must remain visible');
  let disposed=0;isolated.addEventListener('dispose',()=>disposed++);
  setScreenApertureActive(aperture,true);assert.equal(screen.material[0],isolated);
  setScreenApertureActive(aperture,false);
  assert.equal(screen.material,original);assert.equal(shared.visible,true);assert.equal(privateMaterial.visible,false);assert.equal(disposed,1);
});

test('the nearest foreground object blocks input and objects behind the screen do not',()=>{
  const {scene,aperture}=flatFixture();
  const behind=plane(scene,-1),far=plane(scene,1),near=plane(scene,2);
  assert.equal(screenOccluder(rayAt(),aperture,[behind,aperture]),null);
  assert.equal(screenOccluder(rayAt(),aperture,[far,behind,aperture,near])?.object,near);
  assert.equal(screenOccluder(rayAt(),aperture,[behind,far])?.object,far);
  assert.equal(screenOccluder(rayAt(0,0,{back:true}),aperture,[behind,near]),null);
});

test('foreground depth remains correct after moving and rotating the complete screen assembly',()=>{
  const {scene,screen,aperture}=fixture();
  const blocker=new THREE.Mesh(new THREE.PlaneGeometry(.7,.7),new THREE.MeshBasicMaterial());
  blocker.position.set(0,aperture.position.y,.4);screen.add(blocker);
  const behind=new THREE.Mesh(new THREE.PlaneGeometry(.7,.7),new THREE.MeshBasicMaterial());
  behind.position.set(0,aperture.position.y,-.4);screen.add(behind);scene.updateMatrixWorld(true);
  const centre=aperture.getWorldPosition(new THREE.Vector3());
  const normal=new THREE.Vector3(0,0,1).transformDirection(aperture.matrixWorld);
  const ray=new THREE.Raycaster(centre.clone().addScaledVector(normal,5),normal.clone().negate());
  assert.equal(screenOccluder(ray,aperture,[behind,blocker,screen])?.object,blocker);
  assert.equal(screenOccluder(ray,aperture,[behind]),null);
});

test('hidden standalone discs and objects with hidden ancestors cannot intercept native HTML',()=>{
  const {scene,aperture}=flatFixture();
  const hidden=plane(scene,2);hidden.visible=false;
  const parent=new THREE.Group();scene.add(parent);
  const hiddenChild=plane(scene,1);parent.add(hiddenChild);parent.visible=false;scene.updateMatrixWorld(true);
  // These meshes really are raycast hits: visibility is the helper's job.
  assert.ok(rayAt().intersectObjects([hidden,parent],true).length>0);
  assert.equal(screenOccluder(rayAt(),aperture,[hidden,parent]),null);
  hidden.visible=true;
  assert.equal(screenOccluder(rayAt(),aperture,[hidden,parent])?.object,hidden);
  hidden.visible=false;parent.visible=true;
  assert.equal(screenOccluder(rayAt(),aperture,[hidden,parent])?.object,hiddenChild);
});

test('rays through a disc centre hole reach HTML while rays through its label hit the disc',()=>{
  const {scene,aperture}=flatFixture();
  const disc=new THREE.Mesh(new THREE.RingGeometry(.10,.8,64),new THREE.MeshBasicMaterial());
  disc.position.z=.8;scene.add(disc);scene.updateMatrixWorld(true);
  assert.equal(screenOccluder(rayAt(),aperture,[disc]),null);
  for(const x of [-.7,-.3,.3,.7])assert.equal(screenOccluder(rayAt(x),aperture,[disc])?.object,disc);
  assert.equal(screenOccluder(rayAt(.9),aperture,[disc]),null);
  // Outside the aperture is not an HTML hit even if an object exists there.
  const outside=plane(scene,1,{x:3});
  assert.equal(screenOccluder(rayAt(3),aperture,[outside]),null);
});

test('hidden screen and aperture states release the screen input blocker',()=>{
  const {scene,screen,aperture}=flatFixture();
  const blocker=plane(scene,1);
  aperture.visible=false;
  assert.equal(screenOccluder(rayAt(),aperture,[blocker]),null);
  aperture.visible=true;screen.visible=false;
  assert.equal(screenOccluder(rayAt(),aperture,[blocker]),null);
  screen.visible=true;
  assert.equal(screenOccluder(rayAt(),aperture,[blocker])?.object,blocker);
  assert.equal(screenOccluder(rayAt(),null,[blocker]),null);
});

let failures=0;
for(const {name,run} of tests) {
  try{run();console.log(`PASS ${name}`);}
  catch(error){failures++;console.error(`FAIL ${name}: ${error.stack}`);}
}
if(failures)process.exitCode=1;
else console.log(`PASS all ${tests.length} screen aperture checks`);
