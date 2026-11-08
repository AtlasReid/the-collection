import assert from 'node:assert/strict';
import * as THREE from './vendor/three/three.module.js';

// Geometry-only checks: no browser, GPU, downloads or real canvas rendering.
// The texture stub permits keyboard construction; browser QA checks appearance.
const gradient={addColorStop(){}};
const context=new Proxy({}, {get:(object,key)=>{
  if(key==='createLinearGradient'||key==='createRadialGradient')return()=>gradient;
  if(key==='measureText')return text=>({width:String(text).length*10});
  return()=>{};
}});
const createdElements=[];
globalThis.document={createElement:tag=>{
  const element={width:0,height:0,getContext:()=>context};
  createdElements.push({tag,element});return element;
}};

const {createLaptop}=await import('./macbook-air.js');
const model=createLaptop();
model.laptop.updateMatrixWorld(true);

function stats(group){
  const result={meshes:0,instancedCopies:0,triangles:0,textures:0,texturePixels:0};
  const textures=new Set();
  group.traverse(object=>{
    if(!object.isMesh)return;
    result.meshes++;
    const copies=object.isInstancedMesh?object.count:1;
    if(object.isInstancedMesh)result.instancedCopies+=copies;
    result.triangles+=(object.geometry.index?.count||object.geometry.attributes.position.count)/3*copies;
    for(const material of Array.isArray(object.material)?object.material:[object.material]){
      for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
    }
  });
  result.textures=textures.size;
  result.texturePixels=[...textures].reduce((total,texture)=>total+(texture.image?.width||0)*(texture.image?.height||0),0);
  return result;
}
function localBounds(object,relativeTo){
  object.geometry.computeBoundingBox();
  const transform=new THREE.Matrix4().copy(relativeTo.matrixWorld).invert().multiply(object.matrixWorld);
  return object.geometry.boundingBox.clone().applyMatrix4(transform);
}
function near(actual,expected,tolerance=1e-6){assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);}
let passed=0;
function check(name,callback){callback();passed++;console.log(`PASS ${name}`);}

const resource=stats(model.laptop);
check('lightweight geometry and texture budget',()=>{
  assert.ok(resource.triangles<10000,`${resource.triangles} triangles exceed this study's 10000 target`);
  assert.ok(resource.meshes<=30,`${resource.meshes} mesh objects exceed the bounded model target`);
  assert.equal(resource.textures,1,'only the keyboard legends require a bitmap texture');
  assert.ok(resource.texturePixels<=245760,'keyboard bitmap storage must stay within 768×320 texels');
});

check('the hardware panel is black and untextured with no desktop image loading',()=>{
  const material=model.screen.material;
  assert.ok(material.isMeshBasicMaterial,'the black panel should not depend on scene lighting');
  assert.equal(material.color.getHex(),0x000000);
  assert.equal(material.map,null,'wallpaper and UI belong exclusively to the HTML desktop');
  assert.equal(material.toneMapped,false);
  const legends=model.laptop.getObjectByName('Keyboard legends');
  assert.ok(legends?.material.map?.isCanvasTexture);
  assert.equal(createdElements.length,1,'constructing the hardware must create only its keyboard canvas');
  assert.equal(createdElements[0].tag,'canvas','the hardware must not request a wallpaper image');
  assert.equal(legends.material.map.image,createdElements[0].element);
});

const body=model.laptop.getObjectByName('Midnight aluminium body');
assert.ok(body?.isMesh);
const bodyBounds=localBounds(body,model.laptop);
const bodySize=bodyBounds.getSize(new THREE.Vector3());
check('body proportions and Midnight colour cue',()=>{
  // Published enclosure ratios are distinct from the photo estimates below.
  near(bodySize.x/bodySize.z,30.41/21.5,1e-5);
  assert.ok(bodySize.y<bodySize.x*.03,'the body must read as a thin Air');
  assert.ok(body.material.color.b>body.material.color.r,'the shell has a dark-blue hue');
  assert.equal(model.laptop.userData.finish,'Midnight');
});

check('lid proportions and bezel distribution read as the Air',()=>{
  const lid=model.laptop.getObjectByName('Thin MacBook display lid');
  const housing=model.laptop.getObjectByName('Display enclosure');
  assert.ok(lid?.isGroup&&housing?.isMesh);
  const lidBounds=localBounds(housing,lid);
  const lidSize=lidBounds.getSize(new THREE.Vector3());
  near(lidSize.y,bodySize.z-.035,.02);
  assert.ok(lidSize.x/bodySize.x>.98&&lidSize.x/bodySize.x<1.01,'lid and base have almost equal widths');
  near(lid.position.z,bodyBounds.min.z+.025,.02);
  const panelBounds=localBounds(model.screen,lid);
  // These broad tolerances are appearance targets read from Apple imagery,
  // not published manufacturing dimensions or a precision-CAD requirement.
  near(panelBounds.min.y-lidBounds.min.y,.205,.02);
  near(lidBounds.max.y-panelBounds.max.y,.114,.02);
  // Camera framing consumes these actual enclosure margins around the panel,
  // rather than inventing padding from the HTML desktop's aspect ratio.
  near(model.screenFrameWidth,lidSize.x,1e-5);
  near(model.screenFrameHeight,lidSize.y,1e-5);
  near(model.screenFramePadding.left,panelBounds.min.x-lidBounds.min.x,1e-5);
  near(model.screenFramePadding.right,lidBounds.max.x-panelBounds.max.x,1e-5);
  near(model.screenFramePadding.top,lidBounds.max.y-panelBounds.max.y,1e-5);
  near(model.screenFramePadding.bottom,panelBounds.min.y-lidBounds.min.y,1e-5);
});

check('closed shell envelope remains slim and follows the base depth',()=>{
  const closed=model.laptop.clone(true);
  const lid=closed.getObjectByName('Thin MacBook display lid');
  assert.ok(lid?.isGroup);
  lid.rotation.x=Math.PI/2;
  closed.updateMatrixWorld(true);
  const closedBounds=new THREE.Box3().setFromObject(closed);
  const targetHeight=bodySize.x*1.13/30.41;
  near(closedBounds.max.y-closedBounds.min.y,targetHeight,.018);
  const closedHousing=closed.getObjectByName('Display enclosure');
  const closedLidBounds=localBounds(closedHousing,closed);
  assert.ok(closedLidBounds.min.z>=bodyBounds.min.z-.025,'closed lid must not extend behind the base');
  assert.ok(closedLidBounds.max.z<=bodyBounds.max.z+.025,'closed lid must not overhang the front');
});

check('closed display details clear the deck, keyboard and trackpad',()=>{
  const closed=model.laptop.clone(true);
  closed.getObjectByName('Thin MacBook display lid').rotation.x=Math.PI/2;
  closed.updateMatrixWorld(true);
  const obstacleNames=['Midnight aluminium body','Backlit MacBook keyboard','Force Touch trackpad'];
  const obstacles=obstacleNames.map(name=>({name,bounds:new THREE.Box3().setFromObject(closed.getObjectByName(name))}));
  const overlapsXZ=(a,b)=>a.max.x>b.min.x&&a.min.x<b.max.x&&a.max.z>b.min.z&&a.min.z<b.max.z;
  for(const name of ['Display enclosure','Continuous black display glass','Notched Liquid Retina display','Display notch','Notch camera']){
    const object=closed.getObjectByName(name);
    assert.ok(object?.isMesh,`missing closed display detail: ${name}`);
    const bounds=new THREE.Box3().setFromObject(object);
    for(const obstacle of obstacles){
      if(!overlapsXZ(bounds,obstacle.bounds))continue;
      assert.ok(bounds.min.y>obstacle.bounds.max.y+.0005,`${name} intersects or touches ${obstacle.name} when closed`);
    }
  }
});

check('keyboard and trackpad follow the photo-estimated deck proportions',()=>{
  const well=model.laptop.getObjectByName('Keyboard inset');
  const pad=model.laptop.getObjectByName('Force Touch trackpad');
  assert.ok(well?.isMesh&&pad?.isMesh);
  const keyboardBounds=localBounds(well,model.laptop),padBounds=localBounds(pad,model.laptop);
  const keyboardSize=keyboardBounds.getSize(new THREE.Vector3()),padSize=padBounds.getSize(new THREE.Vector3());
  // Ratios are measured from the overhead gallery reference with generous
  // visual tolerances. They guard against a small or misplaced control deck.
  const depthFraction=z=>(z-bodyBounds.min.z)/bodySize.z;
  near(keyboardSize.x/bodySize.x,.916,.015);
  near(keyboardSize.z/bodySize.z,.529,.015);
  near(depthFraction(keyboardBounds.min.z),.059,.015);
  near(depthFraction(keyboardBounds.max.z),.588,.015);
  near(padSize.x/bodySize.x,.423,.015);
  near(padSize.z/bodySize.z,.375,.015);
  near(depthFraction(padBounds.min.z),.598,.015);
  near(depthFraction(padBounds.max.z),.973,.015);
  assert.ok(padBounds.min.z>keyboardBounds.max.z+.005,'trackpad and keyboard must remain separate');
});

check('four physical half-height arrow keys form an inverted T',()=>{
  const keyboard=model.laptop.getObjectByName('Backlit MacBook keyboard');
  const caps=model.laptop.getObjectByName('Black keyboard keycaps');
  const keys=keyboard?.userData.keys;
  assert.ok(Array.isArray(keys),'key metadata must describe the physical keys');
  assert.equal(keys.length,78,'the visual US layout contains 78 physical keycaps');
  assert.equal(caps?.count,keys.length);
  const arrows=['←','↓','↑','→'].map(label=>{
    const matches=keys.filter(key=>key.label===label);
    assert.equal(matches.length,1,`one physical ${label} key is required`);
    return matches[0];
  });
  const [left,down,up,right]=arrows;
  const normal=keys.filter(key=>['Q','W','E'].includes(key.label));
  assert.equal(normal.length,3);
  const normalDepth=normal.reduce((sum,key)=>sum+key.depth,0)/normal.length;
  for(const key of arrows){
    assert.ok(key.depth/normalDepth>=.38&&key.depth/normalDepth<=.62,'arrows should be physically half depth');
  }
  near(left.z,down.z,.005);near(right.z,down.z,.005);near(up.x,down.x,.005);
  assert.ok(left.x<down.x&&down.x<right.x);
  assert.ok(up.z+up.depth/2<down.z-down.depth/2,'up and down must be separate stacked keys');
  for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++){
    const a=keys[i],b=keys[j];
    const overlapsX=Math.abs(a.x-b.x)<(a.width+b.width)/2-1e-5;
    const overlapsZ=Math.abs(a.z-b.z)<(a.depth+b.depth)/2-1e-5;
    assert.ok(!(overlapsX&&overlapsZ),`physical keys ${a.label} and ${b.label} overlap`);
  }
});

check('recessed hinge channel stays tucked against the rear edge',()=>{
  const hinge=model.laptop.getObjectByName('Recessed hinge channel');
  assert.ok(hinge?.isMesh);
  assert.notEqual(hinge.geometry.type,'CylinderGeometry','the large exposed tube should not return');
  const bounds=localBounds(hinge,model.laptop),size=bounds.getSize(new THREE.Vector3());
  near(size.x/bodySize.x,.78,.035);
  assert.ok(bounds.max.z<bodyBounds.min.z+bodySize.z*.07,'hinge should stay at the rear of the deck');
});

check('13-inch M4 display aspect and finite grounded transforms',()=>{
  near(model.screenWidth/model.screenHeight,2560/1664);
  const bounds=new THREE.Box3().setFromObject(model.laptop);
  assert.ok(bounds.min.y>=-1e-6,'no hardware penetrates the ground');
  model.laptop.traverse(object=>assert.ok(object.matrixWorld.elements.every(Number.isFinite)));
});

check('left USB-C attachment sits at the side opening',()=>{
  assert.equal(model.attachmentSpace,'local');
  assert.ok(model.usbPointLocal.x<-2,'attachment is on the left side');
  assert.ok(model.usbDirection.x<-.99&&Math.abs(model.usbDirection.y)<1e-8&&Math.abs(model.usbDirection.z)<1e-8);
  const opening=model.laptop.getObjectByName('Front USB-C recess');
  assert.ok(opening?.isMesh);
  const portCentre=opening.getWorldPosition(new THREE.Vector3());
  const attachment=model.laptop.localToWorld(model.usbPointLocal.clone());
  assert.ok(portCentre.distanceTo(attachment)<1e-7,'cable marker must align with the USB-C port');
  assert.ok(model.laptop.getObjectByName('Rear USB-C recess'));
  assert.ok(model.laptop.getObjectByName('MagSafe recess'));
  assert.ok(model.laptop.getObjectByName('Right headphone jack'));
});

check('the full HTML target retains rounded panel corners and a physical foreground notch',()=>{
  assert.equal(model.screenTopInset,0);
  assert.equal(model.screenBottomInset,0);
  assert.ok(model.screenCornerRadius>0&&model.screenCornerRadius<model.screenHeight/20);
  // A normal ray should miss the extreme rounded top corners, but reach
  // the panel just below the rounded strip and at both square bottom corners.
  const direction=new THREE.Vector3(0,0,-1).transformDirection(model.screen.matrixWorld);
  const hits=(x,y)=>{
    const point=model.screen.localToWorld(new THREE.Vector3(x,y,.1));
    return new THREE.Raycaster(point,direction).intersectObject(model.screen,false).length;
  };
  const x=model.screenWidth/2-.001,y=model.screenHeight/2-.001;
  assert.equal(hits(x,y),0);assert.equal(hits(-x,y),0);
  assert.ok(hits(x,y-model.screenCornerRadius)&&hits(-x,y-model.screenCornerRadius));
  assert.ok(hits(x,-y)&&hits(-x,-y));
  const notch=model.laptop.getObjectByName('Display notch');
  assert.ok(notch?.isMesh);
  const notchBounds=localBounds(notch,model.screen);
  assert.ok(notchBounds.min.z>0,'the physical notch must remain in front of the HTML target');
  assert.ok(notchBounds.min.y<model.screenHeight/2&&notchBounds.max.y>model.screenHeight/2,'the notch must still cross the top display edge');
});

check('the display upper edges follow circular CSS radii through both complete corner arcs',()=>{
  const r=model.screenCornerRadius,x=model.screenWidth/2,y=model.screenHeight/2,positions=model.screen.geometry.attributes.position;
  const direction=new THREE.Vector3(0,0,-1).transformDirection(model.screen.matrixWorld);
  const hits=(px,py)=>new THREE.Raycaster(model.screen.localToWorld(new THREE.Vector3(px,py,.1)),direction).intersectObject(model.screen,false).length;
  for(const sign of [-1,1]){
    const cx=sign*(x-r),cy=y-r,angles=[];
    for(let index=0;index<positions.count;index++){
      const px=positions.getX(index),py=positions.getY(index);
      if(sign*(px-cx)<-1e-6||py<cy-1e-6)continue;
      near(Math.hypot(px-cx,py-cy),r,1e-6);
      angles.push(Math.atan2(py-cy,sign*(px-cx)));
    }
    assert.ok(angles.length>=12,'a complete, finely sampled quarter-circle must remain in the panel contour');
    near(Math.min(...angles),0,1e-4);near(Math.max(...angles),Math.PI/2,1e-4);
    // The CSS circular clip admits the inner point and excludes the outer
    // point at every sampled angle; a quadratic bulge fails this boundary.
    for(const degrees of [15,30,45,60,75]){
      const angle=THREE.MathUtils.degToRad(degrees);
      assert.ok(hits(cx+sign*Math.cos(angle)*r*.98,cy+Math.sin(angle)*r*.98));
      assert.equal(hits(cx+sign*Math.cos(angle)*r*1.02,cy+Math.sin(angle)*r*1.02),0);
    }
  }
  model.screen.geometry.computeBoundingBox();
  near(model.screen.geometry.boundingBox.min.x,-x);near(model.screen.geometry.boundingBox.max.x,x);
  near(model.screen.geometry.boundingBox.min.y,-y);near(model.screen.geometry.boundingBox.max.y,y);
});

check('the clearer webcam lens remains fully contained in the physical notch',()=>{
  const lens=model.laptop.getObjectByName('Notch camera'),notch=model.laptop.getObjectByName('Display notch');
  assert.ok(lens?.isMesh&&notch?.isMesh);
  const lensBounds=localBounds(lens,notch),notchBounds=localBounds(notch,notch),size=lensBounds.getSize(new THREE.Vector3());
  const notchHeight=notchBounds.max.y-notchBounds.min.y;
  assert.ok(size.y/notchHeight>.28&&size.y/notchHeight<.45,'the visible lens should occupy about one third of the notch height');
  near(size.x,size.y,1e-6);near((lensBounds.min.x+lensBounds.max.x)/2,(notchBounds.min.x+notchBounds.max.x)/2);
  assert.ok(lensBounds.min.z>notchBounds.max.z,'the lens must remain visible in front of the notch');
  const vertices=lens.geometry.attributes.position,direction=new THREE.Vector3(0,0,-1).transformDirection(lens.matrixWorld);
  assert.ok(vertices.count>20,'the enlarged lens edge must remain smooth');
  for(let index=0;index<vertices.count;index++){
    const origin=lens.localToWorld(new THREE.Vector3(vertices.getX(index),vertices.getY(index),.01));
    assert.ok(new THREE.Raycaster(origin,direction).intersectObject(notch,false).length,'every lens point must lie inside the notch silhouette');
  }
});

check('white keyboard legends remain above the keycaps',()=>{
  const caps=model.laptop.getObjectByName('Black keyboard keycaps');
  const legends=model.laptop.getObjectByName('Keyboard legends');
  assert.ok(caps?.isInstancedMesh&&legends?.isMesh);
  caps.geometry.computeBoundingBox();
  const instance=new THREE.Matrix4(),toLaptop=new THREE.Matrix4();
  let highest=-Infinity;
  for(let index=0;index<caps.count;index++){
    caps.getMatrixAt(index,instance);
    toLaptop.copy(model.laptop.matrixWorld).invert().multiply(caps.matrixWorld).multiply(instance);
    highest=Math.max(highest,caps.geometry.boundingBox.clone().applyMatrix4(toLaptop).max.y);
  }
  assert.ok(localBounds(legends,model.laptop).min.y>highest+.001,'legends should not disappear beneath physical keys');
});

check('the actual deck opening leaves every key legend exposed',()=>{
  const keyboard=model.laptop.getObjectByName('Backlit MacBook keyboard');
  const legends=model.laptop.getObjectByName('Keyboard legends');
  const up=new THREE.Vector3(0,1,0).transformDirection(keyboard.matrixWorld);
  const ray=new THREE.Raycaster();
  for(const key of keyboard.userData.keys){
    for(const [dx,dz] of [[0,0],[-.4,-.4],[.4,-.4],[-.4,.4],[.4,.4]]){
      const point=keyboard.localToWorld(new THREE.Vector3(key.x+dx*key.width,legends.position.y,key.z+dz*key.depth));
      ray.set(point.clone().addScaledVector(up,.5),up.clone().negate());
      const hits=ray.intersectObject(body,false);
      assert.ok(!hits.length||hits[0].point.clone().sub(point).dot(up)<.0001,`the deck obscures the ${key.label} legend`);
    }
  }
});

const {createLaptop:createRazer}=await import('./laptop.js');
const before=stats(createRazer().laptop);
assert.ok(resource.triangles<before.triangles*.45,'the replacement should materially reduce geometric work');
console.log(`METRICS ${JSON.stringify({macbook:resource,previousRazer:before,triangleReductionPercent:Number((100*(1-resource.triangles/before.triangles)).toFixed(1))})}`);
console.log(`PASS all ${passed} MacBook model checks`);
