import { createPlayer } from '../../music/player.js';
import { collectionAlbums } from '../../music/catalogue.js';
import { soundcloudDiagnosticAlbum } from '../../music/soundcloud-diagnostic.js';
import { previewStorage,freshPreview,selectedPreviewAlbum } from './preview-library.js';
import { createGraphicsPreferenceStore } from '../../graphics-settings.js';

const root=document.querySelector('#player-root');
const controls=document.querySelector('#disc-controls');
const selector=document.querySelector('#preview-album');
const discState=document.querySelector('#disc-state');
const ejectButton=document.querySelector('#preview-eject');
const albums=[...collectionAlbums,soundcloudDiagnosticAlbum].map(album=>({...album,cover:new URL(album.cover,new URL('../../music/',import.meta.url)).href}));
let storage=null;
try{storage=globalThis.localStorage;}catch{/* The shared player supports visit-only memory. */}
const graphicsPreferences=createGraphicsPreferenceStore({storage,eventTarget:window});
function applyDesktopGraphics(settings){
  document.body.classList.toggle('graphics-no-glass',!settings.glass);
  document.body.classList.toggle('vm-compact-interface',settings.interfaceSize==='compact');
  root.dataset.interfaceSize=settings.interfaceSize;
}
const unsubscribeGraphics=graphicsPreferences.subscribe(applyDesktopGraphics);applyDesktopGraphics(graphicsPreferences.settings);
let inserted=null,player;

for(const album of albums){
  const option=document.createElement('option');option.value=album.id;option.textContent=`${album.title} — ${album.artist}`;selector.append(option);
}

function updateDisc(){
  root.dataset.previewDisc=inserted?.id||'';
  ejectButton.disabled=!inserted;
  discState.textContent=inserted?`Inserted: ${inserted.title}`:'No CD inserted. Imported albums stay in the library.';
}
function buildPlayer(){
  player=createPlayer(root,{albums,storage:storage?previewStorage(storage):null,onEject:eject,windowHost:document.body,musicWindow:document.querySelector('.music-viewport'),menuBar:document.querySelector('.mac-menu-bar'),graphicsPreferences,windowInsets:{top:28,right:0,bottom:64,left:0}});
}
function insert(album){
  if(!album)return;
  if(player.state.importing){player.requestEject();controls.open=false;return;}
  inserted=album;selector.value=album.id;
  controls.open=false;player.loadAlbum(album);updateDisc();
}
function eject(){
  player.clear();inserted=null;updateDisc();
}
document.querySelector('#disc-form').addEventListener('submit',event=>{
  event.preventDefault();insert(albums.find(album=>album.id===selector.value));
});
ejectButton.addEventListener('click',()=>{player.requestEject();controls.open=false;});
document.querySelector('#preview-fresh').addEventListener('click',()=>{
  player.destroy();
  try{freshPreview(storage);}catch{storage=null;}
  buildPlayer();insert(albums.find(album=>album.id===selector.value));
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&controls.open){event.preventDefault();controls.open=false;controls.querySelector('summary').focus();}
});
document.addEventListener('pointerdown',event=>{
  if(controls.open&&!controls.contains(event.target))controls.open=false;
});

const clock=document.querySelector('#menu-clock');
const clockFormat=new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
function updateClock(){clock.dateTime=new Date().toISOString();clock.textContent=clockFormat.format(new Date());}
updateClock();const clockTimer=setInterval(updateClock,60000);
buildPlayer();
const initial=selectedPreviewAlbum(albums,new URLSearchParams(location.search).has('album')?location.search:'?album=clair-obscur-expedition-33');
if(initial)insert(initial);else updateDisc();
window.addEventListener('pagehide',()=>{player.destroy();unsubscribeGraphics();graphicsPreferences.destroy();clearInterval(clockTimer);});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
