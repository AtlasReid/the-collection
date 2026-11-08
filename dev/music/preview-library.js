import { MUSIC_LIBRARY_KEY } from '../../music/import-library.js';
import { MUSIC_INTERFACE_KEY } from '../../music/interface-state.js';

export const PREVIEW_LIBRARY_KEY='atlasreid-music-ui-preview-v1';
export const PREVIEW_INTERFACE_KEY='atlasreid-music-ui-preview-interface-v1';
const previewKeys=new Map([[MUSIC_LIBRARY_KEY,PREVIEW_LIBRARY_KEY],[MUSIC_INTERFACE_KEY,PREVIEW_INTERFACE_KEY]]);

// Reuse the normal stores unchanged, mapping only their known keys into separate
// development namespaces. Never read, reset or overwrite the collection stores.
export function previewStorage(storage) {
  return {
    getItem(key){return previewKeys.has(key)?storage.getItem(previewKeys.get(key)):null;},
    setItem(key,value){if(previewKeys.has(key))storage.setItem(previewKeys.get(key),value);},
  };
}

export function freshPreview(storage) {
  storage?.removeItem(PREVIEW_LIBRARY_KEY);
  storage?.removeItem(PREVIEW_INTERFACE_KEY);
}

export function selectedPreviewAlbum(albums,search='') {
  const requested=new URLSearchParams(search).get('album');
  if(requested==='none')return null;
  return albums.find(album=>album.id===requested)||albums[0]||null;
}
