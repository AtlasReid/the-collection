import assert from 'node:assert/strict';
import { albums } from '../music/collection.js';
import { createImportLibrary,MUSIC_LIBRARY_KEY } from '../music/import-library.js';
import { createInterfaceState,MUSIC_INTERFACE_KEY } from '../music/interface-state.js';
import { previewStorage,freshPreview,selectedPreviewAlbum,PREVIEW_LIBRARY_KEY,PREVIEW_INTERFACE_KEY } from '../dev/music/preview-library.js';

const entries=new Map();
const storage={getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};
const main=createImportLibrary({catalog:albums,storage});
main.remember(albums[1].id,[albums[1].tracks[0].id]);main.setDoNotAsk(true);
entries.set('unrelated-project','keep');
const mainBefore=entries.get(MUSIC_LIBRARY_KEY);
const preview=createImportLibrary({catalog:albums,storage:previewStorage(storage)});
assert.deepEqual(preview.records(),[]);assert.equal(preview.doNotAsk,false);
assert.equal(entries.get(MUSIC_LIBRARY_KEY),mainBefore);
console.log('PASS the preview cannot inherit the main collection library or prompt preference');

preview.remember(albums[0].id,[albums[0].tracks[0].id]);preview.setDoNotAsk(true);
const reloaded=createImportLibrary({catalog:albums,storage:previewStorage(storage)});
assert.deepEqual([...reloaded.tracksFor(albums[0].id)],[albums[0].tracks[0].id]);
assert.equal(reloaded.doNotAsk,true);assert.equal(entries.get(MUSIC_LIBRARY_KEY),mainBefore);
assert.ok(entries.has(PREVIEW_LIBRARY_KEY));
console.log('PASS completed preview tracks and preferences persist in their own namespace');

const mainInterface=createInterfaceState({catalog:albums,storage});
mainInterface.setSettings({encoder:'MP3 Encoder'});mainInterface.toggleFavourite(albums[1].tracks[0].id);
const interfaceBefore=entries.get(MUSIC_INTERFACE_KEY);
const previewInterface=createInterfaceState({catalog:albums,storage:previewStorage(storage)});
assert.equal(previewInterface.settings.encoder,'Apple Lossless Encoder');assert.equal(previewInterface.favouriteIds.size,0);
previewInterface.setSettings({encoder:'WAV Encoder'});previewInterface.saveMetadata(albums[0].id,{title:'Preview edit'});previewInterface.toggleFavourite(albums[0].tracks[1].id);
const interfaceReloaded=createInterfaceState({catalog:albums,storage:previewStorage(storage)});
assert.equal(interfaceReloaded.settings.encoder,'WAV Encoder');assert.equal(interfaceReloaded.metadataFor(albums[0].id).title,'Preview edit');assert.equal(interfaceReloaded.isFavourite(albums[0].tracks[1].id),true);
assert.equal(entries.get(MUSIC_INTERFACE_KEY),interfaceBefore);assert.ok(entries.has(PREVIEW_INTERFACE_KEY));
previewStorage(storage).setItem('unrelated-project','changed');assert.equal(previewStorage(storage).getItem('unrelated-project'),null);
assert.equal(entries.get('unrelated-project'),'keep');
console.log('PASS preview interface settings, metadata and favourites stay isolated from main and unknown keys');

freshPreview(storage);
const fresh=createImportLibrary({catalog:albums,storage:previewStorage(storage)});
assert.deepEqual(fresh.records(),[]);assert.equal(fresh.doNotAsk,false);
assert.equal(entries.get(MUSIC_LIBRARY_KEY),mainBefore);assert.equal(entries.get('unrelated-project'),'keep');
assert.equal(entries.get(MUSIC_INTERFACE_KEY),interfaceBefore);assert.equal(entries.has(PREVIEW_INTERFACE_KEY),false);
assert.equal(createInterfaceState({catalog:albums,storage:previewStorage(storage)}).settings.encoder,'Apple Lossless Encoder');
console.log('PASS starting fresh restores new-CD state without changing other saved libraries');

const blocked=createImportLibrary({catalog:albums,storage:previewStorage({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}})});
blocked.remember(albums[0].id,[albums[0].tracks[1].id]);
assert.equal(blocked.persistent,false);assert.deepEqual([...blocked.tracksFor(albums[0].id)],[albums[0].tracks[1].id]);
console.log('PASS unavailable preview storage keeps usable visit-only import state');

assert.equal(selectedPreviewAlbum(albums,'?album=tidal-room'),albums[1]);
assert.equal(selectedPreviewAlbum(albums,'?album=none'),null);
assert.equal(selectedPreviewAlbum(albums,'?album=unknown'),albums[0]);
assert.equal(selectedPreviewAlbum(albums,'?album=%3Cscript%3E'),albums[0]);
assert.equal(selectedPreviewAlbum([],''),null);
console.log('PASS preview URLs select catalogue discs, an empty drive or a safe default');
console.log('PASS all 6 preview-library checks');
