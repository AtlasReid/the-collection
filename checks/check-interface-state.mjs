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
console.log('PASS all 8 interface-state checks');
