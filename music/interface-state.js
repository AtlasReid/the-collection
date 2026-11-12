// Local choices for the simulated Music interface. No account or media data.
export const MUSIC_INTERFACE_KEY = 'atlasreid-music-interface-v1';

const VERSION = 1;
const MAX_BYTES = 200_000;
const MAX_METADATA = 1000;
const MAX_FAVOURITES = 10000;
const ENCODERS = new Set(['AAC Encoder','AIFF Encoder','Apple Lossless Encoder','MP3 Encoder','WAV Encoder']);
const QUALITIES = new Set(['Automatic','High Quality','Custom']);
const DEFAULT_SETTINGS = Object.freeze({encoder:'Apple Lossless Encoder',quality:'Automatic',errorCorrection:false,skipArtworkPrompt:false});
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 160;

function cleanSettings(value) {
  const result = {};
  if (!isRecord(value)) return result;
  if (ENCODERS.has(value.encoder)) result.encoder = value.encoder;
  if (QUALITIES.has(value.quality)) result.quality = value.quality;
  for (const key of ['errorCorrection','skipArtworkPrompt']) if (typeof value[key] === 'boolean') result[key] = value[key];
  return result;
}

function cleanMetadata(value) {
  const result = {};
  if (!isRecord(value)) return result;
  for (const key of ['title','artist','composer','genre']) {
    if (typeof value[key] === 'string' && value[key].length <= 250) result[key] = value[key];
  }
  if (typeof value.year === 'string' && /^\d{0,4}$/.test(value.year)) result.year = value.year;
  for (const key of ['discNumber','totalDiscs']) {
    if (Number.isInteger(value[key]) && value[key] >= 1 && value[key] <= 99) result[key] = value[key];
  }
  if (typeof value.compilation === 'boolean') result.compilation = value.compilation;
  return result;
}

export function createInterfaceState(options = {}) {
  const {catalog = []} = options || {};
  const albumIds = new Set();
  const trackIds = new Set();
  for (const album of Array.isArray(catalog) ? catalog : []) {
    if (!validId(album?.id)) continue;
    albumIds.add(album.id);
    for (const track of Array.isArray(album.tracks) ? album.tracks : []) if (validId(track?.id)) trackIds.add(track.id);
  }
  let settings = {...DEFAULT_SETTINGS};
  const metadata = new Map();
  const favourites = new Set();
  let storage = null;
  let persistent = false;
  let futureVersion = false;
  let readable = false;
  const pendingSettings = {};
  const pendingMetadata = new Map();
  const pendingFavourites = new Map();

  function snapshot() {
    return JSON.stringify([settings,[...metadata].filter(([id])=>albumIds.has(id)),[...favourites].filter(id=>trackIds.has(id)),persistent]);
  }
  function refreshFromStorage() {
    const before = snapshot();
    readable = false;
    try {
      if (!storage) throw new Error('Storage unavailable');
      const text = storage.getItem(MUSIC_INTERFACE_KEY);
      readable = true;
      let saved = null;
      if (text !== null && text !== undefined) {
        if (typeof text !== 'string' || text.length > MAX_BYTES) {
          readable = false;
          throw new Error('Invalid interface state size');
        }
        futureVersion = false;
        saved = JSON.parse(text);
        futureVersion = isRecord(saved) && Number.isInteger(saved.version) && saved.version > VERSION;
        if (!isRecord(saved) || saved.version !== VERSION) throw new Error('Unsupported interface state version');
      } else futureVersion = false;
      settings = {...DEFAULT_SETTINGS,...cleanSettings(saved?.settings)};
      metadata.clear();
      favourites.clear();
      // Unknown, well-formed IDs stay private until their catalogue returns.
      // Editing one current album must not erase another build's saved data.
      if (Array.isArray(saved?.metadata)) {
        for (const entry of saved.metadata.slice(0,MAX_METADATA)) {
          if (validId(entry?.albumId)) metadata.set(entry.albumId,cleanMetadata(entry));
        }
      }
      if (Array.isArray(saved?.favourites)) for (const id of saved.favourites.slice(0,MAX_FAVOURITES)) if (validId(id)) favourites.add(id);
      persistent = true;
    } catch {
      persistent = false;
    }
    settings = {...settings,...pendingSettings};
    for (const [id,patch] of pendingMetadata) metadata.set(id,{...metadata.get(id),...patch});
    for (const [id,favourite] of pendingFavourites) {
      if (favourite) favourites.add(id); else favourites.delete(id);
    }
    if (Object.keys(pendingSettings).length || pendingMetadata.size || pendingFavourites.size) persistent = false;
    return before !== snapshot();
  }

  try {
    storage = Object.prototype.hasOwnProperty.call(options || {}, 'storage') ? options.storage : globalThis.localStorage;
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') storage = null;
  } catch { storage = null; }
  refreshFromStorage();

  function persist() {
    if (!storage || !readable || futureVersion) {persistent = false; return;}
    try {
      const text = JSON.stringify({version:VERSION,settings,metadata:[...metadata].map(([albumId,fields])=>({albumId,...fields})),favourites:[...favourites]});
      if (text.length > MAX_BYTES) throw new Error('Interface state exceeds storage size limit');
      storage.setItem(MUSIC_INTERFACE_KEY, text);
      persistent = true;
      for (const key of Object.keys(pendingSettings)) delete pendingSettings[key];
      pendingMetadata.clear();
      pendingFavourites.clear();
    } catch {
      persistent = false;
    }
  }

  return {
    get settings() {return {...settings};},
    refreshFromStorage,
    setSettings(patch) {
      refreshFromStorage();
      const clean = cleanSettings(patch);
      Object.assign(pendingSettings,clean);
      settings = {...settings,...clean};
      persist();
      return {...settings};
    },
    metadataFor(albumId) {return albumIds.has(albumId)?{...metadata.get(albumId)}:{};},
    saveMetadata(albumId,patch) {
      if (!albumIds.has(albumId) || !isRecord(patch)) return false;
      refreshFromStorage();
      const clean = cleanMetadata(patch);
      pendingMetadata.set(albumId,{...pendingMetadata.get(albumId),...clean});
      metadata.set(albumId,{...metadata.get(albumId),...clean});
      persist();
      return true;
    },
    get favouriteIds() {return new Set([...favourites].filter(id=>trackIds.has(id)));},
    isFavourite(trackId) {return trackIds.has(trackId)&&favourites.has(trackId);},
    toggleFavourite(trackId) {
      if (!trackIds.has(trackId)) return false;
      refreshFromStorage();
      if (favourites.has(trackId)) favourites.delete(trackId); else favourites.add(trackId);
      pendingFavourites.set(trackId,favourites.has(trackId));
      persist();
      return favourites.has(trackId);
    },
    get persistent() {return persistent;},
  };
}
