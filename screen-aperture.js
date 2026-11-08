import * as THREE from './vendor/three/three.module.js';
import { displaySurface } from './projection.js';

const panelStates=new WeakMap();
const materialList=material=>(Array.isArray(material)?material:[material]).filter(Boolean);

// Hide only the fallback draw. Hiding the screen Mesh itself also hides its
// child aperture, and moving the aperture farther forward would erase the notch.
export function setScreenApertureActive(aperture,active) {
  if(!aperture)return;
  const enabled=Boolean(active),state=panelStates.get(aperture);aperture.visible=enabled;
  if(!state||enabled===state.active)return;
  const panel=state.panel;
  if(enabled&&panel) {
    state.original=panel.material;
    const materials=new Set(materialList(panel.material)),shared=new Set();
    let root=panel;while(root.parent)root=root.parent;
    root.traverse(object=>{
      if(object===panel||!object.isMesh)return;
      for(const material of materialList(object.material))if(materials.has(material))shared.add(material);
    });
    // Most panels own their material. If a model shares it with its notch or
    // bezel, isolate the panel so those physical parts remain visible.
    const replacements=new Map([...shared].map(material=>[material,material.clone()]));
    const replacement=material=>replacements.get(material)||material;
    panel.material=Array.isArray(panel.material)?panel.material.map(replacement):replacement(panel.material);
    state.clones=[...replacements.values()];
    state.materials=[...new Set(materialList(panel.material))].map(material=>({material,visible:material.visible}));
    for(const {material}of state.materials)material.visible=false;
  } else if(panel) {
    for(const {material,visible}of state.materials)material.visible=visible;
    panel.material=state.original;
    for(const material of state.clones)material.dispose();
    state.materials=[];state.clones=[];
  }
  state.active=enabled;
}

// The live DOM sits behind the canvas. This opening writes zero alpha AND
// screen depth, so nearer scene geometry covers the DOM normally.
// NoBlending is essential: normal opaque materials force alpha back to one.
export function createScreenAperture(hardware) {
  const content=displaySurface(hardware.screenWidth,hardware.screenHeight);
  const panel=hardware.screenMesh||hardware.screen;
  // Reuse the real panel's rounded upper corners without sharing ownership of
  // its geometry. Group-only fixtures retain the economical rectangular plane.
  const geometry=panel.isMesh?panel.geometry.clone():new THREE.PlaneGeometry(content.width,content.height);
  const aperture=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({
    color:0,opacity:0,blending:THREE.NoBlending,transparent:false,
    depthTest:true,depthWrite:true,toneMapped:false,
  }));
  aperture.name='Live HTML screen depth aperture';
  // The panel is at zero here; its physical notch starts at +.0005. Clear the
  // panel while keeping that notch/camera in front of both DOM and input.
  aperture.position.set(0,content.centreY,.0002);
  aperture.castShadow=false;aperture.receiveShadow=false;aperture.visible=false;
  aperture.userData.screenAperture=true;
  hardware.screen.add(aperture);
  panelStates.set(aperture,{panel:panel.isMesh?panel:null,active:false,original:null,materials:[],clones:[]});
  return aperture;
}

function worldVisible(object) {
  for(let parent=object;parent;parent=parent.parent)if(!parent.visible)return false;
  return true;
}

// Native HTML input must also respect a physical object in front of the screen.
// Invisible discs are deliberately excluded: Three's raycaster ignores .visible.
export function screenOccluder(raycaster,aperture,objects) {
  if(!aperture?.visible||!worldVisible(aperture))return null;
  const screenHit=raycaster.intersectObject(aperture,false)[0];
  if(!screenHit)return null;
  return raycaster.intersectObjects(objects,true).find(hit=>
    hit.object!==aperture&&worldVisible(hit.object)&&hit.distance<screenHit.distance-1e-5
  )||null;
}
