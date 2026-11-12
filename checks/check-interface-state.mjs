import assert from 'node:assert/strict';
import {createInterfaceState,MUSIC_INTERFACE_KEY} from '../music/interface-state.js';

const catalog=[{id:'album-a',tracks:[{id:'a-1'},{id:'a-2'}]},{id:'album-b',tracks:[{id:'b-1'}]}];
const entries=new Map();
const storage={getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value)};
const state=createInterfaceState({catalog,storage});
state.setSettings({encoder:'MP3 Encoder',quality:'High Quality',errorCorrection:true});
state.saveMetadata('album-a',{title:'My edit',artist:'A & B',year:'2021',discNumber:2,totalDiscs:3,compilation:true});
state.toggleFavourite('a-2');
const reloaded=createInterfaceState({catalog,storage});
assert.deepEqual(reloaded.settings,{encoder:'MP3 Encoder',quality:'High Quality',errorCorrection:true,skipArtworkPrompt:false});
assert.equal(reloaded.metadataFor('album-a').title,'My edit');
assert.equal(reloaded.metadataFor('album-a').discNumber,2);
assert.equal(reloaded.isFavourite('a-2'),true);
console.log('PASS local settings, metadata and favourites survive a reload together');

const settings=reloaded.settings;settings.encoder='invalid';
const fields=reloaded.metadataFor('album-a');fields.title='mutated';
const favourites=reloaded.favouriteIds;favourites.clear();
assert.equal(reloaded.settings.encoder,'MP3 Encoder');assert.equal(reloaded.metadataFor('album-a').title,'My edit');assert.equal(reloaded.isFavourite('a-2'),true);
assert.equal(reloaded.toggleFavourite('a-2'),false);assert.equal(reloaded.isFavourite('a-2'),false);
console.log('PASS returned values cannot mutate the store and favourites can be removed');

reloaded.setSettings({encoder:'invalid',quality:'unavailable',errorCorrection:'true',skipArtworkPrompt:true});
reloaded.saveMetadata('album-a',{title:'x'.repeat(251),year:'20260',discNumber:0,totalDiscs:100,composer:'',genre:'Jazz',compilation:'yes',unknown:'ignored'});
assert.equal(reloaded.settings.encoder,'MP3 Encoder');assert.equal(reloaded.settings.errorCorrection,true);assert.equal(reloaded.settings.skipArtworkPrompt,true);
assert.deepEqual(reloaded.metadataFor('album-a'),{title:'My edit',artist:'A & B',year:'2021',discNumber:2,totalDiscs:3,compilation:true,composer:'',genre:'Jazz'});
assert.equal(reloaded.saveMetadata('unknown',{title:'No'}),false);assert.equal(reloaded.toggleFavourite('unknown'),false);
console.log('PASS invalid form fields and unknown catalogue identifiers cannot enter saved state');

entries.set(MUSIC_INTERFACE_KEY,JSON.stringify({version:1,settings:{encoder:'WAV Encoder'},metadata:[{albumId:'unknown',title:'Hidden'},{albumId:'album-b',title:'B'}],favourites:['unknown','b-1','b-1']}));
const filtered=createInterfaceState({catalog,storage});
assert.deepEqual(filtered.metadataFor('unknown'),{});assert.equal(filtered.metadataFor('album-b').title,'B');assert.deepEqual([...filtered.favouriteIds],['b-1']);
assert.equal(filtered.settings.encoder,'WAV Encoder');assert.equal(filtered.settings.quality,'Automatic');
console.log('PASS restored data is restricted to the current catalogue and fills missing defaults');

entries.set(MUSIC_INTERFACE_KEY,'{broken');
const corrupt=createInterfaceState({catalog,storage});
assert.equal(corrupt.persistent,false);assert.equal(corrupt.settings.encoder,'Apple Lossless Encoder');
corrupt.toggleFavourite('a-1');
assert.equal(corrupt.persistent,true);assert.equal(createInterfaceState({catalog,storage}).isFavourite('a-1'),true);
console.log('PASS corrupt storage fails safely and a later successful write recovers');

const future=JSON.stringify({version:2,unrecognised:'leave untouched'});entries.set(MUSIC_INTERFACE_KEY,future);
const newer=createInterfaceState({catalog,storage});newer.setSettings({encoder:'AAC Encoder'});newer.saveMetadata('album-a',{title:'Visit edit'});newer.toggleFavourite('a-1');
assert.equal(entries.get(MUSIC_INTERFACE_KEY),future);assert.equal(newer.persistent,false);assert.equal(newer.metadataFor('album-a').title,'Visit edit');assert.equal(newer.isFavourite('a-1'),true);
console.log('PASS a future schema remains untouched while session choices still work');

const denied=createInterfaceState({catalog,storage:{getItem(){throw Error('denied');},setItem(){throw Error('denied');}}});
denied.setSettings({quality:'Custom'});denied.saveMetadata('album-a',{artist:'Visit only'});denied.toggleFavourite('a-2');
assert.equal(denied.persistent,false);assert.equal(denied.settings.quality,'Custom');assert.equal(denied.metadataFor('album-a').artist,'Visit only');assert.equal(denied.isFavourite('a-2'),true);
const absent=createInterfaceState({catalog,storage:null});absent.toggleFavourite('a-1');assert.equal(absent.persistent,false);assert.equal(absent.isFavourite('a-1'),true);
console.log('PASS blocked or absent browser storage keeps all interface choices usable in memory');

entries.set(MUSIC_INTERFACE_KEY,' '.repeat(200_001));
const oversized=createInterfaceState({catalog,storage});assert.equal(oversized.persistent,false);assert.deepEqual(oversized.metadataFor('album-a'),{});assert.equal(oversized.favouriteIds.size,0);
console.log('PASS oversized saved data is rejected before parsing');

entries.delete(MUSIC_INTERFACE_KEY);
const tabA=createInterfaceState({catalog,storage}),tabB=createInterfaceState({catalog,storage});
tabA.setSettings({encoder:'MP3 Encoder'});
tabB.setSettings({quality:'Custom'});
tabA.saveMetadata('album-a',{title:'Edited in A'});
tabB.saveMetadata('album-a',{artist:'Edited in B'});
tabA.toggleFavourite('a-1');tabB.toggleFavourite('b-1');
const merged=createInterfaceState({catalog,storage});
assert.equal(merged.settings.encoder,'MP3 Encoder');assert.equal(merged.settings.quality,'Custom');
assert.deepEqual(merged.metadataFor('album-a'),{title:'Edited in A',artist:'Edited in B'});
assert.deepEqual([...merged.favouriteIds].sort(),['a-1','b-1']);
tabB.toggleFavourite('a-1');tabA.setSettings({errorCorrection:true});
assert.equal(createInterfaceState({catalog,storage}).isFavourite('a-1'),false);
console.log('PASS interleaved tabs merge separate settings, metadata fields and favourite removals');

const delayed=entries.get(MUSIC_INTERFACE_KEY);
tabB.toggleFavourite('a-2');tabB.saveMetadata('album-b',{composer:'Newest edit'});
assert.equal(tabA.refreshFromStorage({newValue:delayed}),true);
assert.equal(tabA.isFavourite('a-2'),true);assert.equal(tabA.metadataFor('album-b').composer,'Newest edit');
assert.equal(tabA.refreshFromStorage(),false);
entries.delete(MUSIC_INTERFACE_KEY);tabA.refreshFromStorage();
assert.deepEqual([...tabA.favouriteIds],[]);assert.deepEqual(tabA.metadataFor('album-a'),{});
assert.equal(tabA.settings.encoder,'Apple Lossless Encoder');
console.log('PASS refresh uses current storage, ignores delayed snapshots and reflects a removed record');

entries.set(MUSIC_INTERFACE_KEY,JSON.stringify({version:1,settings:{encoder:'WAV Encoder'},metadata:[{albumId:'archived-album',title:'Hidden title'},{albumId:'album-b',artist:'B'}],favourites:['archived-track','b-1']}));
tabA.setSettings({quality:'High Quality'});tabA.saveMetadata('album-a',{title:'Current title'});tabA.toggleFavourite('a-1');
const retained=JSON.parse(entries.get(MUSIC_INTERFACE_KEY));
assert.deepEqual(retained.metadata.find(row=>row.albumId==='archived-album'),{albumId:'archived-album',title:'Hidden title'});
assert.ok(retained.favourites.includes('archived-track'));
assert.deepEqual(tabA.metadataFor('archived-album'),{});assert.equal(tabA.isFavourite('archived-track'),false);
assert.equal(tabA.favouriteIds.has('archived-track'),false);
console.log('PASS hidden catalogue metadata and favourites survive edits without appearing in the current UI');

const lateFuture=JSON.stringify({version:4,unknown:{preserve:'exact bytes'}});
entries.set(MUSIC_INTERFACE_KEY,lateFuture);
tabA.setSettings({encoder:'AAC Encoder'});tabA.saveMetadata('album-b',{title:'Visit title'});tabA.toggleFavourite('a-2');
assert.equal(entries.get(MUSIC_INTERFACE_KEY),lateFuture);assert.equal(tabA.persistent,false);
assert.equal(tabA.settings.encoder,'AAC Encoder');assert.equal(tabA.metadataFor('album-b').title,'Visit title');
console.log('PASS future schemas introduced after construction block every interface write');

entries.delete(MUSIC_INTERFACE_KEY);let writable=false;
const unreliable={getItem:storage.getItem,setItem(key,value){if(!writable)throw Error('quota');storage.setItem(key,value);}};
const pending=createInterfaceState({catalog,storage:unreliable});
pending.setSettings({encoder:'AIFF Encoder'});pending.saveMetadata('album-a',{title:'Pending title'});pending.toggleFavourite('a-1');
const peer=createInterfaceState({catalog,storage});
peer.setSettings({quality:'Custom'});peer.saveMetadata('album-a',{artist:'Peer artist'});peer.toggleFavourite('b-1');
pending.refreshFromStorage();
assert.equal(pending.settings.encoder,'AIFF Encoder');assert.equal(pending.settings.quality,'Custom');
assert.deepEqual(pending.metadataFor('album-a'),{title:'Pending title',artist:'Peer artist'});
assert.deepEqual([...pending.favouriteIds].sort(),['a-1','b-1']);assert.equal(pending.persistent,false);
writable=true;pending.setSettings({errorCorrection:true});
const recovered=createInterfaceState({catalog,storage});
assert.equal(recovered.settings.encoder,'AIFF Encoder');assert.equal(recovered.settings.quality,'Custom');
assert.deepEqual(recovered.metadataFor('album-a'),{title:'Pending title',artist:'Peer artist'});
assert.deepEqual([...recovered.favouriteIds].sort(),['a-1','b-1']);assert.equal(pending.persistent,true);
console.log('PASS failed local choices survive refresh and merge with current saved data on recovery');
let readable=true;
entries.delete(MUSIC_INTERFACE_KEY);
const protectedState=createInterfaceState({catalog,storage:{getItem(key){if(!readable)throw Error('read denied');return storage.getItem(key);},setItem:storage.setItem}});
entries.set(MUSIC_INTERFACE_KEY,lateFuture);readable=false;
protectedState.toggleFavourite('a-1');assert.equal(entries.get(MUSIC_INTERFACE_KEY),lateFuture);
readable=true;const tooLarge=' '.repeat(200_001);entries.set(MUSIC_INTERFACE_KEY,tooLarge);
protectedState.setSettings({quality:'Custom'});assert.equal(entries.get(MUSIC_INTERFACE_KEY),tooLarge);
assert.equal(protectedState.persistent,false);
console.log('PASS unreadable or oversized records are not overwritten by stale interface choices');
console.log('PASS all 14 interface-state checks');
