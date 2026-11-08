import * as THREE from './vendor/three/three.module.js';
import { sceneAlbums } from './music/scene-catalogue.js';
import { createPlayer } from './music/player.js';
import { createHardware } from './hardware.js';
import { createDiscCollection } from './discs.js';
import { quadTransform,displaySurface,updateCameraView } from './projection.js';
import { createCDShelf } from './cd-shelf.js';
import { createCaseHover } from './case-hover.js';
import { centerOrbitTarget,fitDeskOrbit,fitDisplayDistance } from './camera-fit.js';
import { raisedShelfPose } from './case-journey.js';
import { createTableCaseHover } from './table-case-hover.js';
import { isNearScreen,screenBubblePosition } from './screen-proximity.js';
import { CASE_WIDTH,CASE_DEPTH,CASE_PICK_HEIGHT,DISC_APPROACH_DISTANCE,DISC_INSERT_DISTANCE } from './physical-scale.js';
import { createScreenAperture,setScreenApertureActive,screenOccluder } from './screen-aperture.js';
import { createGraphicsSettings,createGraphicsPreferenceStore } from './graphics-settings.js';
import { webglPixelRatio,virtualDesktopWidth,nativeDisplayBounds,desktopLayoutZoom } from './display-quality.js';
import { prepareViewportFlight,sampleViewportFlight,advanceFlightClock } from './camera-flight.js';

const $ = selector => document.querySelector(selector);
const shell = $('#scene-shell');
const canvas = $('#scene-canvas');
const sceneInput = $('#scene-input');
const surface = $('#screen-surface');
const playerRoot = $('#player-root');
const desktop = $('#screen-desktop');
const musicFrame = $('#screen-music-window');
const waitScreen = $('#screen-wait');
const status = $('#scene-status');
const screenZoom = $('#screen-zoom');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const albums = sceneAlbums.map(album => ({...album,cover:new URL(album.cover,new URL('./music/',import.meta.url)).href}));
const scene = new THREE.Scene();
scene.background = new THREE.Color('#fafaf8');
const camera = new THREE.PerspectiveCamera(36,1,.08,100);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const target = new THREE.Vector3(.25,1,.25);
const homeTarget = target.clone();
const orbit = {azimuth:.15,elevation:.48,radius:10.8};
const homeOrbit = {...orbit};
let homeFramingRadius=homeOrbit.radius;
const tweens = new Set();
let renderer, keyLight, hardware, shelf, caseHover, framingBounds, compositionBounds, screenAperture, records=[];
let orbitCentered=true;
let frame=0, ready=false, failed=false, busy=false, inserted=null, mode='desk';
let gesture=null, cameraMotion=null, noticeTimer, token=0;
let hovering=null;
let screenQuad=null,screenAnchor=null,screenFacing=false;
let screenPointer=null,zoomHovered=false;
let deskScroll=null;
let sceneResting=false,qualityStatus='',zoomFloor=homeFramingRadius*.62,zoomCeiling=homeFramingRadius*1.4;
const appliedViewport={width:0,height:0};
const shelfHitBoxes=[];
const casePickGeometry=new THREE.BoxGeometry(CASE_WIDTH,CASE_PICK_HEIGHT,CASE_DEPTH);
const tableHitBox=new THREE.Mesh(casePickGeometry);
const buttonMap = new Map();
const mobileDialog=$('#mobile-player');
const mobileMount=$('#mobile-player-mount');
const tableHover=createTableCaseHover({invalidate,reducedMotion,onChange:record=>{shell.dataset.tablePreviewAlbum=record?.album.id||'';}});
let graphicsStorage=null;
try{graphicsStorage=globalThis.localStorage;}catch{/* Graphics remain usable for this visit. */}
const graphicsPreferences=createGraphicsPreferenceStore({storage:graphicsStorage,eventTarget:window});
const graphics=createGraphicsSettings({mount:$('#graphics-settings'),triggerMount:$('#collection-graphics-trigger'),store:graphicsPreferences,onChange:applyGraphics,
  onOpenMusic:()=>{if(mode==='player')player.showWindow();else focusPlayer();},
  onResetView:()=>{if(mobileDialog.open)mobileDialog.close();applyHome();}});
document.body.classList.toggle('graphics-no-glass',!graphics.settings.glass);
$('#disc-count').textContent=String(albums.length).padStart(2,'0');
const collectionPanel=$('.collection-panel'),collectionToggle=$('#collection-collapse'),collectionList=$('#album-list');
const spareColumns=6-albums.length%6;
collectionList.style.setProperty('--notice-columns',String(spareColumns>=3?spareColumns:6));
function setCollectionExpanded(expanded){
  collectionList.hidden=!expanded;
  collectionPanel.classList.toggle('is-collapsed',!expanded);
  collectionToggle.setAttribute('aria-expanded',String(expanded));
  const label=expanded?'Collapse collection':'Expand collection';
  collectionToggle.setAttribute('aria-label',label);collectionToggle.title=label;
}
collectionToggle.addEventListener('click',()=>setCollectionExpanded(collectionList.hidden));
$('.skip-link').addEventListener('click',()=>setCollectionExpanded(true));

function resumeScene(){sceneResting=false;shell.dataset.sceneResting='false';}
function applyGraphics(){
  document.body.classList.toggle('graphics-no-glass',!graphics.settings.glass);
  if(!renderer)return;
  resumeScene();
  renderer.setPixelRatio(webglPixelRatio(graphics.settings.webglScale,devicePixelRatio));
  renderer.setSize(shell.clientWidth,shell.clientHeight,false);
  renderer.shadowMap.enabled=graphics.settings.shadows!=='off';
  if(keyLight){
    keyLight.castShadow=renderer.shadowMap.enabled;
    const size=Number(graphics.settings.shadows)||1024;
    if(keyLight.shadow.mapSize.x!==size){keyLight.shadow.map?.dispose();keyLight.shadow.map=null;keyLight.shadow.mapSize.set(size,size);}
    keyLight.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;
  }
  invalidate();
}
function updateQualityStatus(content){
  const value={webglWidth:canvas.width,webglHeight:canvas.height,desktopWidth:Math.round(content.cssWidth),desktopHeight:Math.round(content.cssHeight),sceneResting};
  const signature=JSON.stringify(value);
  if(signature!==qualityStatus){graphics.updateStatus(value);qualityStatus=signature;}
}

function notice(message) {
  clearTimeout(noticeTimer);
  $('#notice').textContent=message;
  $('#notice').hidden=false;
  noticeTimer=setTimeout(()=>{$('#notice').hidden=true;},3600);
}
const clock=$('#screen-clock');
const clockFormat=new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
function updateClock(){const now=new Date();clock.dateTime=now.toISOString();clock.textContent=clockFormat.format(now);}
updateClock();const clockTimer=setInterval(updateClock,60000);
const player=createPlayer(playerRoot,{albums,onEject:eject,onNotice:notice,onLibraryChange:libraryChanged,windowHost:desktop,musicWindow:musicFrame,menuBar:desktop.querySelector('.screen-menu-bar'),graphicsPreferences,graphicsContext:'scene',windowInsets:{top:22,bottom:48,left:0,right:0}});
const desktopDisc=$('#desktop-disc');
desktopDisc.addEventListener('click',()=>{player.showDisc();});
function updateDesktopDisc(){
  desktopDisc.hidden=!inserted;
  if(!inserted)return;
  $('#desktop-disc-cover').src=inserted.album.cover;
  $('#desktop-disc-title').textContent=inserted.album.title;
  desktopDisc.setAttribute('aria-label',`Open inserted CD ${inserted.album.title}`);
}
function libraryChanged({albumCount}){
  shell.dataset.libraryCount=String(albumCount);
  if(!busy&&ready){
    if(!inserted){waitScreen.hidden=true;invalidate();}
  }
}
for(const album of albums) {
  const button=document.createElement('button');
  button.type='button';button.className='album-option';
  button.setAttribute('aria-pressed','false');
  button.setAttribute('aria-label',`Load ${album.title} by ${album.artist}, ${album.appleMusicURL?'Apple Music links and matched SoundCloud tracks, virtual CD':album.bandcampAlbumId?'Bandcamp album, virtual CD':album.soundcloudPlaylist?'SoundCloud album, virtual CD':'demo CD'}`);
  const image=document.createElement('img');image.src=album.cover;image.alt='';
  const label=document.createElement('span');
  const title=document.createElement('strong');title.textContent=album.title;
  const artist=document.createElement('small');artist.textContent=album.artist;
  label.append(title,artist);button.append(image,label);
  button.addEventListener('click',()=>{const record=records.find(r=>r.album.id===album.id);if(record)loadDisc(record);});
  button.addEventListener('mouseenter',()=>previewRecord(albums.indexOf(album)));
  button.addEventListener('mouseleave',()=>previewRecord(null));
  button.addEventListener('focus',()=>previewRecord(albums.indexOf(album)));
  button.addEventListener('blur',()=>previewRecord(null));
  button.disabled=true;
  collectionList.insertBefore(button,$('#collection-notice'));buttonMap.set(album.id,button);
}

function invalidate() {if(!frame&&!failed&&!document.hidden&&!(sceneResting&&!tweens.size&&!cameraMotion&&!busy))frame=requestAnimationFrame(render);}
function smooth(t){return t*t*t*(t*(6*t-15)+10);}
function tween(duration,update) {
  resumeScene();
  return new Promise(resolve=>{
    if(reducedMotion.matches||duration===0){update(1);invalidate();resolve();return;}
    tweens.add({began:performance.now(),duration,update,resolve});invalidate();
  });
}
function finishTweens() {
  for(const t of [...tweens]){t.update(1);t.resolve();tweens.delete(t);}
  if(cameraMotion){camera.position.copy(cameraMotion.to);target.copy(cameraMotion.targetTo);camera.up.copy(cameraMotion.upTo);cameraMotion=null;clearViewportFlight();shell.dataset.cameraFlight='settled';shell.dataset.cameraFlightProgress='1';}
  caseHover?.finish();
  tableHover.finish();
  updateScreenZoom();
  invalidate();
}
function fitHomeOrbit(aspect){
  homeOrbit.elevation=aspect<1?.67:.48;
  if(framingBounds&&compositionBounds){
    const fitted=fitDeskOrbit(framingBounds,compositionBounds,homeTarget,homeOrbit,camera.fov,aspect);
    homeOrbit.radius=fitted.radius;homeFramingRadius=fitted.framingRadius;
    return fitted.target;
  }
  return homeTarget.clone();
}
function setOrbitCamera(){
  if(orbitCentered&&compositionBounds)target.copy(centerOrbitTarget(compositionBounds,homeTarget,orbit));
  camera.position.set(target.x+Math.sin(orbit.azimuth)*Math.cos(orbit.elevation)*orbit.radius,target.y+Math.sin(orbit.elevation)*orbit.radius,target.z+Math.cos(orbit.azimuth)*Math.cos(orbit.elevation)*orbit.radius);camera.lookAt(target);}
// Preserve the displayed pan when a gesture interrupts a return flight; Reset
// view restores centred orbiting instead of snapping on the first pointer move.
function retainDisplayedOrbit(){resumeScene();if(cameraMotion)orbitCentered=false;if(cameraMotion?.layout)clearViewportFlight();const offset=camera.position.clone().sub(target);orbit.radius=offset.length();orbit.azimuth=Math.atan2(offset.x,offset.z);orbit.elevation=Math.asin(offset.y/orbit.radius);zoomFloor=Math.min(homeFramingRadius*.62,orbit.radius);zoomCeiling=Math.max(homeFramingRadius*1.4,orbit.radius);cameraMotion=null;camera.up.set(0,1,0);shell.dataset.cameraFlight='settled';}
function clearViewportFlight(){
  shell.style.transform='';shell.style.transformOrigin='';shell.style.willChange='';
  if(appliedViewport.width&&appliedViewport.height){camera.aspect=appliedViewport.width/appliedViewport.height;camera.updateProjectionMatrix();}
}
function applyViewportFlight(layout,progress){
  const view=sampleViewportFlight(layout,progress);
  shell.style.transformOrigin='0 0';shell.style.transform=view.transform;shell.style.willChange=progress<1?'transform':'';
  camera.aspect=view.aspect;camera.updateProjectionMatrix();
  if(progress===1)clearViewportFlight();
}
function prepareShellFlight(from){
  clearViewportFlight();
  const to=shell.getBoundingClientRect();
  const layout=prepareViewportFlight(from,to);
  if(!reducedMotion.matches)applyViewportFlight(layout,0);
  return layout;
}
function sizeRenderer(){
  const width=shell.clientWidth,height=shell.clientHeight;
  renderer.setSize(width,height,false);appliedViewport.width=width;appliedViewport.height=height;
  camera.aspect=width/height;camera.updateProjectionMatrix();
}
function moveCamera(position,lookAt,duration=1200,{up=camera.up,layout=null,delay=0}={}){
  zoomHovered=false;
  resumeScene();const actualDuration=reducedMotion.matches?0:duration;
  if(!actualDuration){camera.position.copy(position);target.copy(lookAt);camera.up.copy(up);cameraMotion=null;clearViewportFlight();shell.dataset.cameraFlight='settled';shell.dataset.cameraFlightProgress='1';}
  else {cameraMotion={from:camera.position.clone(),to:position.clone(),targetFrom:target.clone(),targetTo:lookAt.clone(),upFrom:camera.up.clone(),upTo:up.clone(),layout,clock:null,duration:actualDuration,delay};shell.dataset.cameraFlight=delay?'preparing':'flying';shell.dataset.cameraFlightProgress='0';}
  updateScreenZoom();
  invalidate();
}
function setFocusedLayout(active){
  if(active===document.body.classList.contains('is-player-focused'))return null;
  const from=shell.getBoundingClientRect();clearViewportFlight();
  if(active)deskScroll={x:scrollX,y:scrollY};
  document.documentElement.classList.toggle('is-player-focused',active);
  document.body.classList.toggle('is-player-focused',active);
  if(active)scrollTo(0,0);
  else if(deskScroll){scrollTo(deskScroll.x,deskScroll.y);deskScroll=null;}
  if(renderer)sizeRenderer();
  return prepareShellFlight(from);
}
function applyHome(immediate=false,{layoutFrom=null}={}){
  const layout=setFocusedLayout(false)||(layoutFrom?prepareShellFlight(layoutFrom):null);
  mode='desk';shell.dataset.mode=mode;
  const aspect=shell.clientWidth/shell.clientHeight;
  const destinationTarget=fitHomeOrbit(aspect);
  orbitCentered=true;Object.assign(orbit,homeOrbit);
  zoomFloor=homeFramingRadius*.62;zoomCeiling=homeFramingRadius*1.4;
  const previous=camera.position.clone();
  const oldTarget=target.clone();target.copy(destinationTarget);setOrbitCamera();const position=camera.position.clone();
  camera.position.copy(previous);target.copy(oldTarget);
  moveCamera(position,destinationTarget,immediate?0:875,{up:new THREE.Vector3(0,1,0),layout});
  updateScreenZoom();
}
function focusPlayer({restoreMusic=true,animate=true,layoutFrom=null}={}){
  if(!ready||busy)return;
  caseHover?.settle();
  tableHover.close();
  if(restoreMusic&&!inserted&&!player.hasLibrary)player.showLibrary();
  if(restoreMusic)player.showWindow();surface.hidden=false;waitScreen.hidden=true;
  if(innerWidth<=700){
    cameraMotion=null;clearViewportFlight();shell.dataset.cameraFlight='settled';shell.dataset.cameraFlightProgress='1';
    if(!mobileDialog.open){mobileMount.append(desktop);mobileDialog.showModal();}
    updateScreenZoom();invalidate();
    return;
  }
  mode='player';shell.dataset.mode=mode;
  const layout=setFocusedLayout(true)||(layoutFrom?prepareShellFlight(layoutFrom):null);
  scene.updateMatrixWorld(true);
  const centre=hardware.screen.getWorldPosition(new THREE.Vector3());
  const normal=new THREE.Vector3(0,0,1).transformDirection(hardware.screen.matrixWorld);
  const up=new THREE.Vector3(0,1,0).transformDirection(hardware.screen.matrixWorld);
  const edge=hardware.screenFramePadding||{};
  const frameWidth=hardware.screenWidth+2*Math.max(edge.left||0,edge.right||0);
  const frameHeight=hardware.screenHeight+2*Math.max(edge.top||0,edge.bottom||0);
  const distance=fitDisplayDistance({width:frameWidth,height:frameHeight,fov:camera.fov,aspect:shell.clientWidth/shell.clientHeight});
  moveCamera(centre.clone().addScaledVector(normal,distance),centre,animate?1015:0,{up,layout,delay:animate?80:0});
  updateScreenZoom();
}
screenZoom.addEventListener('click',()=>mode==='player'?applyHome():focusPlayer());
screenZoom.addEventListener('pointerenter',()=>{zoomHovered=true;updateScreenZoom();});
screenZoom.addEventListener('pointerleave',()=>{zoomHovered=false;updateScreenZoom();});
screenZoom.addEventListener('focus',updateScreenZoom);
screenZoom.addEventListener('blur',updateScreenZoom);

function updateScreenZoom(){
  const returning=mode==='player';
  // The stage scales during its flight. Hide its UI until it has native size.
  const transitioning=Boolean(cameraMotion||shell.style.transform&&shell.style.transform!=='none');
  const available=ready&&!failed&&!mobileDialog.open&&!transitioning&&(returning||!busy&&!gesture&&screenFacing&&screenAnchor);
  screenZoom.hidden=!available;
  graphics.setSceneActions({canOpenMusic:ready&&!failed&&!busy&&!transitioning,canResetView:ready&&!failed&&!transitioning});
  const action=returning?'return':'zoom';
  if(screenZoom.dataset.action!==action){
    screenZoom.dataset.action=action;screenZoom.setAttribute('aria-label',returning?'Back to desk':'Open Music');screenZoom.title=returning?'Return to the 3D desk (Escape)':'Zoom into the laptop screen';
    const icon=returning?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m10 6-6 6 6 6M4 12h16"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.2"/><path d="m15.1 15.1 4.5 4.5"/></svg>';
    screenZoom.innerHTML=`${icon}<span>${returning?'Back to desk':'Open Music'}</span>`;
  }
  const width=returning?160:144,height=44,padding=12;
  const left=returning?18:screenAnchor?screenAnchor.x+4:padding;
  const top=returning?18:screenAnchor?screenAnchor.y-height/2:padding;
  screenZoom.style.left=`${Math.max(padding,Math.min(left,shell.clientWidth-width-padding))}px`;
  screenZoom.style.top=`${Math.max(padding,Math.min(top,shell.clientHeight-height-padding))}px`;
  const rect=shell.getBoundingClientRect();
  const near=screenPointer&&isNearScreen({x:screenPointer.x-rect.left,y:screenPointer.y-rect.top},screenQuad,60);
  const visible=Boolean(available&&(returning||near||zoomHovered||screenZoom.matches(':focus-visible')));
  screenZoom.classList.toggle('is-visible',visible);shell.dataset.screenZoomVisible=String(visible);
}

function syncScreen(){
  if(!hardware||!ready)return;
  // One live desktop covers the actual panel, at its native aspect ratio.
  const w=hardware.screenWidth/2,h=hardware.screenHeight/2;
  const centre=hardware.screen.getWorldPosition(new THREE.Vector3());
  const normal=new THREE.Vector3(0,0,1).transformDirection(hardware.screen.matrixWorld);
  const facing=normal.dot(camera.position.clone().sub(centre))>0;
  screenFacing=facing;
  const active=facing&&!surface.hidden&&!mobileDialog.open;
  surface.style.visibility=active?'visible':'hidden';
  surface.style.pointerEvents=active&&!busy?'auto':'none';
  setScreenApertureActive(screenAperture,active);
  shell.dataset.screenDepth=active?'open':'closed';
  const points=[[-w,h],[w,h],[w,-h],[-w,-h]].map(([x,y])=>{
    const p=hardware.screen.localToWorld(new THREE.Vector3(x,y,screenAperture.position.z)).project(camera);
    return {x:(p.x+1)*.5*shell.clientWidth,y:(1-p.y)*.5*shell.clientHeight};
  });
  const native=active?nativeDisplayBounds(points,{focused:mode==='player',moving:Boolean(cameraMotion)}):null;
  const content=displaySurface(hardware.screenWidth,hardware.screenHeight,{cssWidth:virtualDesktopWidth(graphics.settings.desktopResolution,native?.width)});
  surface.style.width=`${content.cssWidth}px`;surface.style.height=`${content.cssHeight}px`;
  const corner=(hardware.screenCornerRadius||0)/content.width*content.cssWidth;
  surface.style.borderRadius=`${corner}px ${corner}px 0 0`;
  // Keep readable controls independent of the source backing dimensions.
  const uiZoom=desktopLayoutZoom(content.cssWidth,graphics.settings.interfaceSize);
  desktop.style.zoom=mobileDialog.open?'1':String(uiZoom);
  desktop.style.width=mobileDialog.open?'100%':`${content.cssWidth/uiZoom}px`;
  desktop.style.height=mobileDialog.open?'100%':`${content.cssHeight/uiZoom}px`;
  if(native){
    // CSS zoom performs native browser layout/rasterisation. There is no
    // enlarged transform bitmap and the same iframe/window DOM stays alive.
    const scale=native.width/content.cssWidth;
    surface.style.zoom=String(scale);surface.style.left=`${native.left/scale}px`;surface.style.top=`${native.top/scale}px`;
    surface.style.transform='none';surface.style.willChange='auto';
  }else{
    surface.style.zoom='1';surface.style.left='0px';surface.style.top='0px';
    const matrix=quadTransform(points,content.cssWidth,content.cssHeight);
    if(matrix)surface.style.transform=`matrix3d(${matrix.join(',')})`;
    surface.style.willChange=cameraMotion||gesture?.dragged?'transform':'auto';
  }
  surface.dataset.presentation=native?'native':'projected';
  surface.dataset.desktopWidth=String(Math.round(content.cssWidth));surface.dataset.desktopHeight=String(Math.round(content.cssHeight));
  const fullPoints=[[-hardware.screenWidth/2,hardware.screenHeight/2],[hardware.screenWidth/2,hardware.screenHeight/2],[hardware.screenWidth/2,-hardware.screenHeight/2],[-hardware.screenWidth/2,-hardware.screenHeight/2]].map(([x,y])=>{
    const p=hardware.screen.localToWorld(new THREE.Vector3(x,y,screenAperture.position.z)).project(camera);
    return {x:(p.x+1)*.5*shell.clientWidth,y:(1-p.y)*.5*shell.clientHeight,z:p.z};
  });
  screenQuad=facing&&fullPoints.every(p=>Number.isFinite(p.z)&&p.z>-1&&p.z<1)?fullPoints:null;
  screenAnchor=screenBubblePosition(screenQuad,{width:shell.clientWidth,height:shell.clientHeight,radius:16});
  updateScreenZoom();
  return content;
}
function render(now){
  frame=0;if(failed||!renderer)return;
  if(cameraMotion){
    const m=cameraMotion,clock=advanceFlightClock(m.clock,now,{duration:m.duration,delay:m.delay});m.clock=clock.state;
    const t=clock.progress,e=smooth(t);
    camera.position.lerpVectors(m.from,m.to,e);target.lerpVectors(m.targetFrom,m.targetTo,e);
    camera.up.lerpVectors(m.upFrom,m.upTo,e).normalize();
    if(m.layout)applyViewportFlight(m.layout,e);
    shell.dataset.cameraFlight=t===1?'settled':t>0?'flying':'preparing';shell.dataset.cameraFlightProgress=t.toFixed(3);
    if(t===1)cameraMotion=null;
  }
  for(const t of [...tweens]){
    const progress=Math.min(1,(now-t.began)/t.duration);t.update(smooth(progress));
    if(progress===1){tweens.delete(t);t.resolve();}
  }
  const hoverMoving=caseHover?.step(now)||false;
  const tableMoving=tableHover.step(now);
  updateCameraView(camera,target);scene.updateMatrixWorld(true);
  // Set the DOM projection and depth opening before this same frame is drawn.
  const content=syncScreen();renderer.render(scene,camera);
  shell.dataset.tableAlbum=records.find(record=>record.location==='table')?.album.id||'';
  shell.dataset.shelfCount=String(records.filter(record=>record.location==='shelf').length);
  shell.dataset.previewHeight=caseHover?.current?caseHover.current.group.position.y.toFixed(3):'';
  shell.dataset.tablePreviewAngle=inserted?.location==='table'?THREE.MathUtils.radToDeg(inserted.openAngle).toFixed(1):'';
  const moving=Boolean(tweens.size||cameraMotion||hoverMoving||tableMoving);
  shell.dataset.renderState=moving?'moving':'idle';
  sceneResting=Boolean(graphics.settings.pauseFocused3D&&mode==='player'&&!moving&&!busy&&!mobileDialog.open);
  shell.dataset.sceneResting=String(sceneResting);
  shell.dataset.renderFrames=String(renderer.info.render.frame);
  if(content)updateQualityStatus(content);
  if(moving)invalidate();
}

function resize(){
  if(!renderer)return;
  const width=shell.clientWidth,height=shell.clientHeight;
  // A fullscreen promotion already applied these dimensions synchronously.
  // Its observer notification must not replace the fly-in with a zero-time fit.
  if(width===appliedViewport.width&&height===appliedViewport.height)return;
  const pending=cameraMotion,displayed=shell.getBoundingClientRect();
  clearViewportFlight();
  resumeScene();
  sizeRenderer();
  // Keep the whole arrangement visible with a tall, narrow viewport.
  fitHomeOrbit(camera.aspect);
  if(mobileDialog.open&&innerWidth>700)mobileDialog.close();
  if(mode==='player'&&!busy)focusPlayer({restoreMusic:false,animate:Boolean(pending),layoutFrom:pending?displayed:null});
  else if(ready&&!busy)applyHome(!pending,{layoutFrom:pending?displayed:null});
  // A media operation owns its geometry, not the viewer's chosen camera.
  else if(pending){moveCamera(pending.to,pending.targetTo,900,{up:pending.upTo,layout:prepareShellFlight(displayed)});}
  else if(!ready){Object.assign(orbit,homeOrbit);target.copy(homeTarget);setOrbitCamera();}
  gesture=null;hoverCase(null);invalidate();
}

function setBusy(value){
  busy=value;
  if(value){tableHover.release();hovering=null;}
  for(const b of buttonMap.values())b.disabled=value||!ready;
  shell.dataset.busy=String(value);updateScreenZoom();
}
function markAlbum(id){for(const [albumId,b]of buttonMap){b.setAttribute('aria-pressed',String(albumId===id));}shell.dataset.album=id||'';}
const CASE_OPEN_ANGLE=THREE.MathUtils.degToRad(120);
function discPhase(record,phase){shell.dataset.cdPhase=phase;shell.dataset.caseAlbum=record.album.id;}
async function openCase(record,angle){
  const from=record.openAngle;
  await tween(800,t=>{
    record.setOpen(THREE.MathUtils.lerp(from,angle,t));
    shell.dataset.caseAngle=THREE.MathUtils.radToDeg(record.openAngle).toFixed(1);
  });
}

function previewRecord(index){
  if(!ready||busy||mode==='player')return;
  const record=index===null?null:records[index];
  caseHover.set(record?.location==='shelf'?record:null);
}
async function moveCase(record,pose,phase,arc=.55){
  caseHover.forget(record);
  record.location='travelling';
  discPhase(record,phase);
  const from={position:record.group.position.clone(),quaternion:record.group.quaternion.clone()};
  const takingOut=phase==='case-to-table';
  const raised=raisedShelfPose(takingOut?from:pose);
  const stages=takingOut
    ? [{pose:raised,duration:500,arc:0,label:'clearing-shelf'},{pose,duration:1100,arc,label:'to-table'}]
    : [{pose:raised,duration:1100,arc,label:'above-shelf'},{pose,duration:500,arc:0,label:'shelving'}];
  for(const stage of stages){
    shell.dataset.caseStage=stage.label;
    const fromPosition=record.group.position.clone();
    const fromRotation=record.group.quaternion.clone();
    await tween(stage.duration,t=>{
      record.group.position.lerpVectors(fromPosition,stage.pose.position,t);
      record.group.position.y+=Math.sin(Math.PI*t)*stage.arc;
      record.group.quaternion.slerpQuaternions(fromRotation,stage.pose.quaternion,t);
    });
  }
  shell.dataset.caseStage='';
  record.group.position.copy(pose.position);
  record.group.quaternion.copy(pose.quaternion);
  record.group.updateMatrixWorld(true);
}
async function bringCaseToTable(record){
  status.textContent=`Bringing ${record.album.title} to the table…`;
  caseHover.settle(record);
  await moveCase(record,shelf.tablePose,'case-to-table',.75);
  record.location='table';
}
async function putCaseOnShelf(record){
  status.textContent=`Returning ${record.album.title} to the shelf…`;
  await moveCase(record,shelf.poseFor(record,false),'case-to-shelf',.75);
  record.location='shelf';
}

async function returnDisc(record){
  const disc=record.disc;
  status.textContent=`Opening ${record.album.title} to return the disc…`;
  discPhase(record,'opening-for-return');
  await openCase(record,CASE_OPEN_ANGLE);
  const slot=hardware.slot.getWorldPosition(new THREE.Vector3());
  const inside=slot.clone().add(new THREE.Vector3(0,0,-DISC_INSERT_DISTANCE));
  disc.visible=true;disc.position.copy(inside);disc.rotation.set(0,0,0);disc.scale.setScalar(1);
  const front=slot.clone().add(new THREE.Vector3(0,0,DISC_APPROACH_DISTANCE));
  discPhase(record,'ejecting');
  await tween(650,t=>{disc.position.lerpVectors(inside,front,t);});
  const seat=record.getDiscSeat(new THREE.Vector3());
  const aboveSeat=seat.clone().add(new THREE.Vector3(0,.65,0));
  discPhase(record,'returning');
  const tableYaw=record.group.rotation.y;
  await tween(1150,t=>{disc.position.lerpVectors(front,aboveSeat,t);disc.position.y+=Math.sin(Math.PI*t)*1.3;disc.rotation.y=THREE.MathUtils.lerp(0,tableYaw,t);});
  discPhase(record,'seating');
  await tween(500,t=>{disc.position.lerpVectors(aboveSeat,seat,t);});
  record.group.userData.loaded=false;
  discPhase(record,'closing-after-return');
  await openCase(record,0);
  // The printed lid already covers the seated disc before its hidden meshes
  // are removed from rendering. No visible disc disappears above the case.
  disc.visible=false;
}

async function loadDisc(record){
  if(busy||!ready)return;
  if(inserted===record){focusPlayer();return;}
  const operation=++token;setBusy(true);
  caseHover.settle(record);
  if(mode==='player')applyHome();
  surface.hidden=false;waitScreen.hidden=false;
  $('#screen-wait-text').textContent=inserted?'Changing audio CD…':'Reading audio CD…';
  player.clear();
  if(inserted){const old=inserted;inserted=null;updateDesktopDisc();await returnDisc(old);await putCaseOnShelf(old);if(operation!==token)return;}
  markAlbum(null);
  await bringCaseToTable(record);
  if(operation!==token)return;
  status.textContent=`Opening ${record.album.title}…`;
  const disc=record.disc;disc.visible=true;disc.scale.setScalar(1);
  const start=record.getDiscSeat(new THREE.Vector3());
  const tableYaw=record.group.rotation.y;
  disc.position.copy(start);disc.rotation.set(0,tableYaw,0);
  // Reveal the same disc from beneath its opaque, hinged cover. Keep it on
  // the tray until the lid is fully clear, then lift it vertically off the hub.
  discPhase(record,'opening');
  await openCase(record,CASE_OPEN_ANGLE);
  discPhase(record,'lifting');
  await tween(500,t=>{disc.position.y=start.y+t*.65;});
  status.textContent=`Loading ${record.album.title}…`;
  const from=disc.position.clone();
  const slot=hardware.slot.getWorldPosition(new THREE.Vector3());
  const approach=slot.clone().add(new THREE.Vector3(0,0,DISC_APPROACH_DISTANCE));
  discPhase(record,'travelling');
  await tween(1250,t=>{disc.position.lerpVectors(from,approach,t);disc.position.y+=Math.sin(Math.PI*t)*1.25;disc.rotation.y=tableYaw+(Math.PI*1.6-tableYaw)*t;});
  const inside=slot.clone().add(new THREE.Vector3(0,0,-DISC_INSERT_DISTANCE));
  discPhase(record,'inserting');
  await tween(650,t=>{disc.position.lerpVectors(approach,inside,t);});
  if(operation!==token)return;
  disc.visible=false;record.group.userData.loaded=true;inserted=record;
  discPhase(record,'closing-after-load');
  await openCase(record,0);
  if(operation!==token)return;
  player.loadAlbum(record.album);player.showWindow();waitScreen.hidden=true;
  updateDesktopDisc();markAlbum(record.album.id);status.textContent=`${record.album.title} · ${record.album.artist}`;
  discPhase(record,'loaded');
  setBusy(false);invalidate();
  if(innerWidth<=700)focusPlayer();
}
async function eject(){
  if(busy||!inserted)return;
  ++token;setBusy(true);
  if(mobileDialog.open)mobileDialog.close();
  const old=inserted;inserted=null;updateDesktopDisc();player.clear();waitScreen.hidden=false;
  $('#screen-wait-text').textContent='Ejecting audio CD…';
  if(mode==='player')applyHome();
  status.textContent=`Returning ${old.album.title} to its case…`;
  await returnDisc(old);
  await putCaseOnShelf(old);
  discPhase(old,'stored');
  surface.hidden=false;waitScreen.hidden=true;
  markAlbum(null);status.textContent='Choose a CD from the shelf';setBusy(false);invalidate();
}

function refreshCaseHover(){
  const enabled=ready&&!busy&&mode==='desk'&&!gesture?.dragged;
  caseHover?.set(enabled&&hovering?.location==='shelf'?hovering:null);
  tableHover.set(enabled&&inserted?.location==='table'&&hovering===inserted?inserted:null);
}
function hoverCase(record){
  hovering=record;sceneInput.style.cursor=canvas.style.cursor=record?'pointer':'grab';
  canvas.title=record===inserted&&record?.location==='table'?`Click to return ${record.album.title} to the shelf`:record?`${record.album.title} · ${record.album.artist}`:'Drag to look around';
  sceneInput.title=canvas.title;
  refreshCaseHover();
}

function pointRay(event){
  const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(pointer,camera);
}
function scenePointerTarget(event){
  if(event.target===sceneInput||event.target===canvas)return true;
  if(!surface.contains(event.target))return false;
  pointRay(event);
  return Boolean(screenOccluder(raycaster,screenAperture,[hardware.group,shelf.group,...records.flatMap(r=>[r.group,r.disc])]));
}
function hitAt(event){
  pointRay(event);
  // Stable home proxies keep a lifted cover's original place selectable.
  const proxies=shelfHitBoxes.filter(proxy=>proxy.userData.record.location==='shelf');
  if(inserted?.location==='table'){
    tableHitBox.position.copy(inserted.group.position);tableHitBox.quaternion.copy(inserted.group.quaternion);
    tableHitBox.userData.record=inserted;tableHitBox.updateMatrixWorld(true);proxies.push(tableHitBox);
  }
  const hits=raycaster.intersectObjects([hardware.group,shelf.group,...records.map(r=>r.group),...proxies],true);
  if(!hits.length)return null;
  if(hits[0].object.userData.record)return hits[0].object.userData.record;
  let object=hits[0].object;
  while(object){const record=records.find(r=>r.group===object);if(record)return record;object=object.parent;}
  return null;
}
// Canvas colour is above the DOM, but its box must not intercept native HTML
// controls. A transparent input surface handles empty scene space; capture-phase
// routing also catches physical objects covering an otherwise live HTML button.
shell.addEventListener('pointerdown',event=>{
  if(!ready||event.button!==0||mode==='player'||!scenePointerTarget(event))return;
  event.preventDefault();sceneInput.setPointerCapture(event.pointerId);canvas.focus({preventScroll:true});retainDisplayedOrbit();
  gesture={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,dragged:false,record:busy?null:hitAt(event)};
  updateScreenZoom();
},true);
shell.addEventListener('pointermove',event=>{
  screenPointer={x:event.clientX,y:event.clientY};updateScreenZoom();
  if(!gesture){
    if(!ready||busy||mode==='player')return;
    hoverCase(scenePointerTarget(event)?hitAt(event):null);
    return;
  }
  if(event.pointerId!==gesture.id)return;
  if(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>6)gesture.dragged=true;
  if(gesture.dragged){
    hoverCase(null);
    orbit.azimuth=THREE.MathUtils.clamp(orbit.azimuth-(event.clientX-gesture.lastX)*.005,-.9,.9);
    orbit.elevation=THREE.MathUtils.clamp(orbit.elevation+(event.clientY-gesture.lastY)*.004,.22,1.15);
    setOrbitCamera();invalidate();
  }
  gesture.lastX=event.clientX;gesture.lastY=event.clientY;
},true);
shell.addEventListener('pointerup',event=>{
  if(!gesture||event.pointerId!==gesture.id)return;
  const g=gesture;gesture=null;
  if(sceneInput.hasPointerCapture(event.pointerId))sceneInput.releasePointerCapture(event.pointerId);
  if(!busy&&!g.dragged&&g.record){
    if(g.record===inserted&&g.record.location==='table')eject();else loadDisc(g.record);
  }else if(!busy&&mode==='desk')hoverCase(hitAt(event));
  updateScreenZoom();
},true);
shell.addEventListener('pointercancel',()=>{gesture=null;hoverCase(null);updateScreenZoom();},true);
sceneInput.addEventListener('lostpointercapture',()=>{gesture=null;hoverCase(null);updateScreenZoom();});
shell.addEventListener('pointerleave',()=>{screenPointer=null;zoomHovered=false;updateScreenZoom();if(!gesture)hoverCase(null);});
shell.addEventListener('click',event=>{
  if(ready&&surface.contains(event.target)&&scenePointerTarget(event)){event.preventDefault();event.stopImmediatePropagation();}
},true);
shell.addEventListener('wheel',event=>{
  if(!ready||mode==='player'||!scenePointerTarget(event))return;
  event.preventDefault();hoverCase(null);retainDisplayedOrbit();
  orbit.radius=THREE.MathUtils.clamp(orbit.radius*Math.exp(event.deltaY*.001),zoomFloor,zoomCeiling);
  setOrbitCamera();invalidate();
},{passive:false,capture:true});
canvas.addEventListener('keydown',event=>{
  if(!ready)return;
  const step=.07;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','=','Home'].includes(event.key)){
    event.preventDefault();hoverCase(null);if(mode==='player')applyHome(true);retainDisplayedOrbit();
    if(event.key==='ArrowLeft')orbit.azimuth-=step;if(event.key==='ArrowRight')orbit.azimuth+=step;
    if(event.key==='ArrowUp')orbit.elevation+=step;if(event.key==='ArrowDown')orbit.elevation-=step;
    if(event.key==='+'||event.key==='=')orbit.radius*=.94;if(event.key==='-')orbit.radius*=1.06;
    if(event.key==='Home'){applyHome();return;}
    orbit.azimuth=THREE.MathUtils.clamp(orbit.azimuth,-.9,.9);orbit.elevation=THREE.MathUtils.clamp(orbit.elevation,.22,1.15);
    orbit.radius=THREE.MathUtils.clamp(orbit.radius,zoomFloor,zoomCeiling);setOrbitCamera();invalidate();
  }
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented&&mode==='player'){applyHome();canvas.focus({preventScroll:true});}});
$('#close-mobile-player').addEventListener('click',()=>{mobileDialog.close();applyHome();});
$('#mobile-graphics').addEventListener('click',()=>graphics.toggle({host:mobileDialog}));
mobileDialog.addEventListener('close',()=>{surface.append(desktop);invalidate();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;}else {resumeScene();invalidate();}});
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)finishTweens();});
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();failed=true;player.destroy();clearInterval(clockTimer);clearTimeout(noticeTimer);if(frame)cancelAnimationFrame(frame);frame=0;surface.hidden=true;$('#scene-failure').hidden=false;$('#scene-boot').hidden=true;setBusy(true);});
window.addEventListener('pagehide',()=>{graphics.destroy();player.destroy();graphicsPreferences.destroy();clearInterval(clockTimer);clearTimeout(noticeTimer);if(frame)cancelAnimationFrame(frame);});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});

async function init(){
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'default'});
    renderer.setPixelRatio(webglPixelRatio(graphics.settings.webglScale,devicePixelRatio));renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    renderer.shadowMap.enabled=graphics.settings.shadows!=='off';renderer.shadowMap.type=THREE.PCFShadowMap;
    const hemi=new THREE.HemisphereLight('#ffffff','#afbaa0',2.4);scene.add(hemi);
    const key=new THREE.DirectionalLight('#fffdf5',4.2);key.position.set(5,9,5);key.castShadow=true;
    keyLight=key;key.castShadow=renderer.shadowMap.enabled;
    const shadowSize=Number(graphics.settings.shadows)||1024;
    key.shadow.mapSize.set(shadowSize,shadowSize);Object.assign(key.shadow.camera,{left:-8,right:8,top:7,bottom:-7,near:.5,far:30});key.shadow.bias=-.00025;key.shadow.normalBias=.015;scene.add(key);
    const fill=new THREE.DirectionalLight('#d9e9ff',1.1);fill.position.set(-5,5,-4);scene.add(fill);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:'#87907e',opacity:.2}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.position.y=-.012;scene.add(ground);
    const env=new THREE.Scene();env.background=new THREE.Color('#b9c0b8');
    for(const [position,size]of [[[-4,5,1],[6,3,5]],[[4,6,-4],[5,3,4]],[[0,7,5],[7,2,3]]]){
      const panel=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshBasicMaterial({color:'#ffffff'}));panel.position.set(...position);env.add(panel);
    }
    const pmrem=new THREE.PMREMGenerator(renderer);const environment=pmrem.fromScene(env,.04);scene.environment=environment.texture;scene.environmentIntensity=.55;pmrem.dispose();
    hardware=createHardware({invalidate});scene.add(hardware.group);
    screenAperture=createScreenAperture(hardware);
    records=await createDiscCollection(albums,invalidate);
    shelf=createCDShelf(records);scene.add(shelf.group);
    for(const record of records){
      const pose=shelf.poseFor(record,false);
      record.group.position.copy(pose.position);record.group.quaternion.copy(pose.quaternion);
      record.location='shelf';
      record.home.copy(pose.position);record.homeRotation.setFromQuaternion(pose.quaternion);
      const proxy=new THREE.Mesh(casePickGeometry);
      proxy.position.copy(pose.position);proxy.quaternion.copy(pose.quaternion);proxy.userData.record=record;proxy.updateMatrixWorld(true);
      shelfHitBoxes.push(proxy);
    }
    caseHover=createCaseHover(records,shelf,{invalidate,reducedMotion,onChange:record=>{shell.dataset.previewAlbum=record?.album.id||'';}});
    for(const record of records){scene.add(record.group);scene.add(record.disc);}
    scene.updateMatrixWorld(true);
    // Frame the visible objects symmetrically. The thin rear cable and the
    // larger motion envelope still constrain fit, but do not pull the subject
    // off centre. Keep this stored-case composition stable during CD motion.
    compositionBounds=new THREE.Box3().setFromObject(hardware.laptop)
      .union(new THREE.Box3().setFromObject(hardware.drive))
      .union(new THREE.Box3().setFromObject(shelf.group));
    for(const record of records)compositionBounds.union(new THREE.Box3().setFromObject(record.group));
    framingBounds=new THREE.Box3().setFromObject(hardware.group).union(new THREE.Box3().setFromObject(shelf.group));
    for(const record of records){
      // Include lifted cases themselves: the smaller Air must not make the
      // camera crop a shelf extraction that rises above the laptop's lid.
      const home=shelf.poseFor(record,false);
      for(const pose of [home,shelf.poseFor(record,true),raisedShelfPose(home),raisedShelfPose(shelf.poseFor(record,true)),shelf.tablePose]){
        record.group.position.copy(pose.position);record.group.quaternion.copy(pose.quaternion);record.group.updateMatrixWorld(true);
        framingBounds.union(new THREE.Box3().setFromObject(record.group));
      }
      record.group.position.copy(home.position);record.group.quaternion.copy(home.quaternion);record.group.updateMatrixWorld(true);
    }
    framingBounds.union(new THREE.Box3(new THREE.Vector3(-2.1,0,1.8),new THREE.Vector3(.6,1.8,3.4))).expandByScalar(.4);
    ready=true;shell.dataset.ready='true';$('#scene-boot').hidden=true;
    shell.dataset.libraryCount=String(player.state.importedAlbums.length);
    surface.hidden=false;waitScreen.hidden=true;
    setBusy(false);resize();invalidate();
    new ResizeObserver(resize).observe(shell);
  }catch(error){failed=true;$('#scene-boot').hidden=true;$('#scene-failure').hidden=false;surface.hidden=true;status.textContent='The 3D scene could not start. The CSS study is still available.';console.error('Music scene:',error);}
}
init();
