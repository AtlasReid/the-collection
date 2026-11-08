import assert from 'node:assert/strict';
import {bandcampSourceURL,bandcampEmbedURL,createBandcampWindow} from '../music/bandcamp-window.js';

const album={title:'A test album',artist:'Test artist',bandcampAlbumId:'123456',bandcampURL:'https://test-artist.bandcamp.com/album/test-album'};
const track={title:'A test track',bandcampTrackId:'234567',bandcampURL:'https://test-artist.bandcamp.com/track/test-track'};
const tests=[];const test=(name,run)=>tests.push({name,run});

class Element {
  constructor(document,tag){this.ownerDocument=document;this.tagName=tag.toUpperCase();this.children=[];this.style={};this.attributes=new Map();this.listeners=new Map();this.hidden=false;this.navigations=[];}
  append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}
  remove(){if(this.parentElement)this.parentElement.children.splice(this.parentElement.children.indexOf(this),1);this.parentElement=null;}
  setAttribute(name,value){this.attributes.set(name,String(value));}
  getAttribute(name){return this.attributes.get(name)??null;}
  removeAttribute(name){this.attributes.delete(name);}
  addEventListener(name,handler){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(handler);}
  removeEventListener(name,handler){this.listeners.get(name)?.delete(handler);}
  dispatch(name,event={}){for(const handler of this.listeners.get(name)||[])handler(event);}
  set src(value){this.attributes.set('src',String(value));this.navigations.push(String(value));}
  get src(){return this.attributes.get('src');}
}
function fixture(){
  const document={createElement:tag=>new Element(document,tag)},host=new Element(document,'div');host.clientWidth=800;host.clientHeight=600;host.querySelector=()=>({offsetHeight:28});
  const calls={close:0,help:0,music:0,raise:0,back:0,destroy:0};let registered;
  const windows={register(element,options){registered={element,options};return{setVisible:visible=>{element.hidden=!visible;},raise:()=>calls.raise++,sendBack:()=>calls.back++,destroy:()=>calls.destroy++};}};
  const control=createBandcampWindow({host,windows,onClose:()=>calls.close++,onHelp:()=>calls.help++,onMusic:()=>calls.music++});
  const all=node=>[node,...node.children.flatMap(all)],find=predicate=>all(host).find(predicate);
  return {control,host,calls,registered,find};
}

test('only canonical HTTPS artist album and track pages become source links',()=>{
  assert.equal(bandcampSourceURL(album.bandcampURL),album.bandcampURL);
  assert.equal(bandcampSourceURL(track.bandcampURL),track.bandcampURL);
  for(const value of ['http://test-artist.bandcamp.com/album/test','https://bandcamp.com/album/test','https://www.bandcamp.com/album/test','https://nested.artist.bandcamp.com/album/test','https://test-artist.bandcamp.com.evil.invalid/album/test','https://test-artist.bandcamp.com:443/album/test','https://name@really.bandcamp.com/album/test','https://@really.bandcamp.com/album/test','https://test-artist.bandcamp.com/album/test?next=https://evil.invalid','https://test-artist.bandcamp.com/album/test#x','https://test-artist.bandcamp.com/x/../album/test','https://test-artist.bandcamp.com/album/%2e%2e/track/test','https://test-artist.bandcamp.com/album/test/extra','https://test-artist.bandcamp.com/music','javascript:alert(1)',null,12])assert.equal(bandcampSourceURL(value),null,String(value));
});

test('album embeds use bounded provider IDs and reject mismatched track metadata',()=>{
  const url=bandcampEmbedURL(album);assert.ok(url);
  assert.equal(new URL(url).origin,'https://bandcamp.com');assert.match(url,/^https:\/\/bandcamp\.com\/EmbeddedPlayer\/album=123456\//);assert.doesNotMatch(url,/autoplay|auto_play|test-artist/);
  const selected=bandcampEmbedURL(album,track);assert.match(selected,/\/artwork=small\/track=234567\/transparent=true\/$/);assert.doesNotMatch(selected,/tracklist=false|autoplay|auto_play/);assert.notEqual(selected,url);
  assert.ok(bandcampEmbedURL({...album,bandcampAlbumId:4294967295}));
  for(const id of [0,-1,1.5,Infinity,NaN,4294967296,'000123','12/track=4','1e4',' 123','123 ',{},null])assert.equal(bandcampEmbedURL({...album,bandcampAlbumId:id}),null,String(id));
  assert.equal(bandcampEmbedURL({...album,bandcampURL:track.bandcampURL}),null);
  assert.equal(bandcampEmbedURL(album,{...track,bandcampTrackId:'0'}),null);
  assert.equal(bandcampEmbedURL(album,{...track,bandcampURL:'https://another-artist.bandcamp.com/track/test'}),null);
  assert.equal(bandcampEmbedURL(album,{bandcampURL:track.bandcampURL}),null);
});

test('no external frame is loaded until open and stacking never reloads the live widget',()=>{
  const f=fixture(),frame=f.control.iframe;assert.equal(frame.src,'about:blank');assert.equal(f.control.isOpen,false);assert.equal(f.control.raise(),false);
  assert.equal(f.control.open({album}),true);assert.equal(f.control.isOpen,true);const count=frame.navigations.length;
  f.control.raise();f.control.sendBack();f.control.open({album});assert.equal(f.control.iframe,frame);assert.equal(frame.navigations.length,count);
  assert.equal(f.control.open({album:{...album,bandcampURL:'https://evil.invalid/album/test'}}),false);assert.equal(frame.navigations.length,count);
  assert.equal(f.registered.options.getBounds().top,34);f.control.destroy();
});

test('closing unloads audio without recreating the iframe or invoking a user callback',()=>{
  const f=fixture(),frame=f.control.iframe;f.control.open({album});f.control.close();
  assert.equal(f.control.isOpen,false);assert.equal(frame.src,'about:blank');assert.equal(f.calls.close,0);assert.equal(f.control.iframe,frame);
  const count=frame.navigations.length;f.control.close();assert.equal(frame.navigations.length,count);
  f.control.raise();assert.equal(f.control.isOpen,true);assert.equal(frame.src,bandcampEmbedURL(album));assert.equal(f.control.iframe,frame);
  f.find(node=>node.getAttribute('aria-label')==='Close Bandcamp player').dispatch('click');assert.equal(frame.src,'about:blank');assert.equal(f.calls.close,1);f.control.destroy();
});

test('choosing another verified track navigates once and retains the same official frame',()=>{
  const f=fixture(),frame=f.control.iframe;f.control.open({album,track});const count=frame.navigations.length;
  assert.equal(frame.src,bandcampEmbedURL(album,track));assert.equal(f.find(node=>node.className==='it-bandcamp-source').href,track.bandcampURL);
  f.control.open({album,track});assert.equal(frame.navigations.length,count);
  const next={...track,bandcampTrackId:'234568',bandcampURL:'https://test-artist.bandcamp.com/track/another-track',title:'Another track'};
  f.control.open({album,track:next});assert.equal(frame.navigations.length,count+1);assert.equal(f.control.iframe,frame);assert.equal(frame.title,'Another track on Bandcamp');
  f.control.destroy();
});

test('help and Music actions preserve the widget while destroy removes owned lifecycle',()=>{
  const f=fixture(),frame=f.control.iframe;f.control.open({album});const count=frame.navigations.length;
  f.find(node=>node.className==='it-bandcamp-behind').dispatch('click');f.find(node=>node.className==='it-bandcamp-music').dispatch('click');f.find(node=>node.className==='it-bandcamp-learn').dispatch('click');
  assert.equal(f.calls.music,2);assert.equal(f.calls.help,1);assert.equal(f.calls.back,1);assert.equal(frame.navigations.length,count);
  const artist=f.find(node=>node.className==='it-bandcamp-artist'),source=f.find(node=>node.className==='it-bandcamp-source');assert.equal(artist.href,'https://test-artist.bandcamp.com');assert.equal(source.href,album.bandcampURL);
  const closeButton=f.find(node=>node.getAttribute('aria-label')==='Close Bandcamp player');f.control.destroy();f.control.destroy();closeButton.dispatch('click');
  assert.equal(frame.src,'about:blank');assert.equal(f.calls.close,0);assert.equal(f.calls.destroy,1);assert.equal(f.host.children.length,0);assert.equal(f.control.open({album}),false);assert.equal(f.control.isOpen,false);
});

let failures=0;
for(const {name,run}of tests){try{run();console.log(`PASS ${name}`);}catch(error){failures++;console.error(`FAIL ${name}: ${error.stack||error.message}`);}}
if(failures)process.exitCode=1;else console.log(`PASS all ${tests.length} Bandcamp window checks`);
