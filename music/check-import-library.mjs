import assert from 'node:assert/strict';
import { createImportLibrary, MUSIC_LIBRARY_KEY } from './import-library.js';

const catalog = [
  {id:'one',tracks:[{id:'one-1'},{id:'one-2'},{id:'one-3'}]},
  {id:'two',tracks:[{id:'two-1'},{id:'two-2'}]},
];
function memory(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
}
let passed = 0;
function check(name, callback) { callback(); passed++; console.log(`PASS ${name}`); }

check('completed tracks merge without duplication and reload in catalogue order', () => {
  const storage = memory({unrelated:'preserve me'});
  const first = createImportLibrary({catalog,storage});
  assert.equal(first.remember('one',['one-2','one-1','one-2']),true);
  assert.equal(first.remember('one',['one-2']),false);
  const restored = createImportLibrary({catalog,storage});
  assert.deepEqual([...restored.tracksFor('one')],['one-1','one-2']);
  assert.equal(restored.remember('one',new Set(['one-3'])),true);
  assert.deepEqual(restored.records()[0].trackIds,['one-1','one-2','one-3']);
  assert.equal(storage.values.get('unrelated'),'preserve me');
});

check('partial completion stays partial after a new store and album imports remain separate', () => {
  const storage = memory();
  const first = createImportLibrary({catalog,storage});
  first.remember('one',['one-1']);
  first.remember('two',['two-2']);
  const restored = createImportLibrary({catalog,storage});
  assert.deepEqual([...restored.tracksFor('one')],['one-1']);
  assert.deepEqual([...restored.tracksFor('two')],['two-2']);
  assert.deepEqual(restored.records().map(record=>record.albumId),['two','one']);
});

check('only registered albums and their valid track IDs can enter the visible library', () => {
  const storage = memory();
  const library = createImportLibrary({catalog,storage});
  assert.equal(library.remember('missing',['one-1']),false);
  assert.equal(library.remember('one',['two-1','<script>','missing']),false);
  assert.equal(library.remember('one',['one-2','two-2']),true);
  assert.deepEqual(library.records().map(record=>record.trackIds),[['one-2']]);
  assert.deepEqual([...library.tracksFor('missing')],[]);
});

check('returned arrays, sets and records cannot mutate the stored state', () => {
  const library = createImportLibrary({catalog,storage:null});
  library.remember('one',['one-1']);
  const snapshot = library.records();
  snapshot[0].trackIds.push('one-2'); snapshot[0].albumId='two'; snapshot.push({albumId:'two'});
  const tracks = library.tracksFor('one'); tracks.clear(); tracks.add('one-3');
  assert.deepEqual(library.records().map(record=>[record.albumId,record.trackIds]),[['one',['one-1']]]);
});

check('late catalogue registration restores saved records without exposing unknown entries', () => {
  const storage = memory();
  const first = createImportLibrary({catalog,storage});
  first.remember('one',['one-2']); first.remember('two',['two-1']);
  const restored = createImportLibrary({storage});
  assert.deepEqual(restored.records(),[]);
  restored.registerAlbum(catalog[0]);
  assert.deepEqual(restored.records().map(record=>record.albumId),['one']);
  restored.remember('one',['one-3']);
  const complete = createImportLibrary({catalog,storage});
  assert.deepEqual([...complete.tracksFor('two')],['two-1']);
  assert.deepEqual([...complete.tracksFor('one')],['one-2','one-3']);
});

check('malformed JSON recovers on a successful write while future schemas are preserved', () => {
  const storage = memory({[MUSIC_LIBRARY_KEY]:'{not json'});
  const library = createImportLibrary({catalog,storage});
  assert.equal(library.persistent,false); assert.deepEqual(library.records(),[]);
  library.remember('one',['one-1']);
  assert.equal(library.persistent,true);
  assert.equal(JSON.parse(storage.values.get(MUSIC_LIBRARY_KEY)).version,1);
  const future = JSON.stringify({version:2,doNotAsk:true,albums:[]});
  const nextStorage = memory({[MUSIC_LIBRARY_KEY]:future});
  const next = createImportLibrary({catalog,storage:nextStorage});
  next.remember('one',['one-2']);
  assert.deepEqual([...next.tracksFor('one')],['one-2']);
  assert.equal(next.persistent,false); assert.equal(nextStorage.values.get(MUSIC_LIBRARY_KEY),future);
});

check('untrusted saved fields are bounded, filtered and cannot pollute prototypes', () => {
  const text = '{"version":1,"doNotAsk":"yes","albums":[{"albumId":"one","trackIds":["one-1","two-1",null,"one-1"],"importedAt":23,"html":"<script>"},{"albumId":"one","trackIds":["one-2"],"importedAt":24},{"albumId":"missing","trackIds":["missing-1"],"importedAt":99},{"albumId":"__proto__","trackIds":["polluted"],"importedAt":99}],"__proto__":{"polluted":true}}';
  const storage = memory({[MUSIC_LIBRARY_KEY]:text});
  const library = createImportLibrary({catalog,storage});
  assert.equal(library.doNotAsk,false);
  assert.deepEqual(library.records(),[{albumId:'one',trackIds:['one-1','one-2'],importedAt:24}]);
  assert.equal({}.polluted,undefined);
  library.remember('two',['two-2']);
  const saved = JSON.parse(storage.values.get(MUSIC_LIBRARY_KEY));
  assert.deepEqual(Object.keys(saved).sort(),['albums','doNotAsk','version']);
  for (const record of saved.albums) assert.deepEqual(Object.keys(record).sort(),['albumId','importedAt','trackIds']);
});

check('unavailable or throwing storage keeps progress in memory and reports the limitation', () => {
  const denied = createImportLibrary({catalog,storage:{getItem(){throw new Error('denied');},setItem(){throw new Error('denied');}}});
  assert.equal(denied.persistent,false);
  denied.remember('one',['one-1']);
  assert.deepEqual([...denied.tracksFor('one')],['one-1']);
  assert.equal(denied.persistent,false);
  const quota = createImportLibrary({catalog,storage:{getItem(){return null;},setItem(){throw new Error('quota');}}});
  quota.remember('two',['two-1']);
  assert.deepEqual([...quota.tracksFor('two')],['two-1']); assert.equal(quota.persistent,false);
  const empty = createImportLibrary({catalog,storage:null});
  empty.remember('one',['one-2']); assert.equal(empty.persistent,false);
});

check('a throwing browser localStorage getter does not break construction', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  try {
    Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('blocked property');}});
    const library = createImportLibrary({catalog});
    library.remember('one',['one-1']);
    assert.equal(library.persistent,false); assert.deepEqual([...library.tracksFor('one')],['one-1']);
  } finally {
    if (previous) Object.defineProperty(globalThis,'localStorage',previous); else delete globalThis.localStorage;
  }
});

check('do not ask preference persists independently of album completion', () => {
  const storage = memory();
  const first = createImportLibrary({catalog,storage});
  first.setDoNotAsk(true);
  const second = createImportLibrary({catalog,storage});
  assert.equal(second.doNotAsk,true); assert.deepEqual(second.records(),[]);
  second.setDoNotAsk(false);
  assert.equal(createImportLibrary({catalog,storage}).doNotAsk,false);
});

check('interleaved tabs merge completed tracks and preserve the newest unrelated preference', () => {
  const storage = memory();
  const first = createImportLibrary({catalog,storage});
  const second = createImportLibrary({catalog,storage});
  first.remember('one',['one-1']);
  second.setDoNotAsk(true);
  second.remember('two',['two-1']);
  first.remember('one',['one-2']);
  const restored = createImportLibrary({catalog,storage});
  assert.deepEqual([...restored.tracksFor('one')],['one-1','one-2']);
  assert.deepEqual([...restored.tracksFor('two')],['two-1']);
  assert.equal(restored.doNotAsk,true);
  second.setDoNotAsk(false);
  first.remember('two',['two-2']);
  assert.equal(createImportLibrary({catalog,storage}).doNotAsk,false);
});

check('refresh reads current storage instead of a delayed event and reflects explicit deletion', () => {
  const storage = memory();
  const first = createImportLibrary({catalog,storage});
  const second = createImportLibrary({catalog,storage});
  second.remember('one',['one-1']);
  const stale = storage.getItem(MUSIC_LIBRARY_KEY);
  second.remember('one',['one-2']);
  assert.equal(first.refreshFromStorage({newValue:stale}),true);
  assert.deepEqual([...first.tracksFor('one')],['one-1','one-2']);
  assert.equal(first.refreshFromStorage(),false);
  storage.values.delete(MUSIC_LIBRARY_KEY);
  assert.equal(first.refreshFromStorage(),true);
  assert.deepEqual(first.records(),[]);
  assert.equal(first.doNotAsk,false);
});

check('fresh merges retain hidden catalogue records and unknown tracks without displaying them', () => {
  const storage = memory();
  const library = createImportLibrary({catalog,storage});
  const archived = {albumId:'archived',trackIds:['archive-1'],importedAt:20};
  storage.values.set(MUSIC_LIBRARY_KEY,JSON.stringify({version:1,doNotAsk:true,albums:[archived,{albumId:'one',trackIds:['one-1','unknown-track'],importedAt:10}]}));
  library.remember('two',['two-1']);
  const saved = JSON.parse(storage.getItem(MUSIC_LIBRARY_KEY));
  assert.deepEqual(saved.albums.find(row=>row.albumId==='archived'),archived);
  assert.deepEqual(saved.albums.find(row=>row.albumId==='one').trackIds,['one-1','unknown-track']);
  assert.deepEqual([...library.tracksFor('one')],['one-1']);
  assert.equal(library.records().some(row=>row.albumId==='archived'),false);
});

check('a newer schema arriving after startup is never overwritten by imports or prompt choices', () => {
  const storage = memory();
  const library = createImportLibrary({catalog,storage});
  const future = JSON.stringify({version:3,privateData:{keep:true}});
  storage.values.set(MUSIC_LIBRARY_KEY,future);
  library.remember('one',['one-1']);library.setDoNotAsk(true);
  assert.equal(storage.getItem(MUSIC_LIBRARY_KEY),future);
  assert.deepEqual([...library.tracksFor('one')],['one-1']);
  assert.equal(library.doNotAsk,true);assert.equal(library.persistent,false);
});

check('failed local imports survive refresh and merge with another tab when writes recover', () => {
  const storage = memory();let writable = false;
  const unreliable = {...storage,setItem(key,value){if(!writable)throw Error('quota');storage.setItem(key,value);}};
  const library = createImportLibrary({catalog,storage:unreliable});
  library.remember('one',['one-1']);library.setDoNotAsk(true);
  const other = createImportLibrary({catalog,storage});other.remember('one',['one-2']);other.remember('two',['two-1']);
  library.refreshFromStorage();
  assert.deepEqual([...library.tracksFor('one')],['one-1','one-2']);
  assert.equal(library.doNotAsk,true);assert.equal(library.persistent,false);
  writable = true;library.remember('one',['one-3']);
  const restored = createImportLibrary({catalog,storage});
  assert.deepEqual([...restored.tracksFor('one')],['one-1','one-2','one-3']);
  assert.deepEqual([...restored.tracksFor('two')],['two-1']);assert.equal(restored.doNotAsk,true);
  assert.equal(library.persistent,true);
});

check('unreadable or oversized records cannot be overwritten by a stale tab', () => {
  const storage = memory();let readable = true;
  const restricted = {...storage,getItem(key){if(!readable)throw Error('read denied');return storage.getItem(key);}};
  const library = createImportLibrary({catalog,storage:restricted});
  const future = JSON.stringify({version:2,keep:'unread'});
  storage.values.set(MUSIC_LIBRARY_KEY,future);readable=false;
  library.remember('one',['one-1']);assert.equal(storage.getItem(MUSIC_LIBRARY_KEY),future);
  readable=true;const oversized=' '.repeat(2_000_001);storage.values.set(MUSIC_LIBRARY_KEY,oversized);
  library.setDoNotAsk(true);assert.equal(storage.getItem(MUSIC_LIBRARY_KEY),oversized);
  assert.equal(library.persistent,false);
});

console.log(`PASS all ${passed} import-library checks`);
