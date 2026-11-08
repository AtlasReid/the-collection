// Local choices for the simulated Music interface. No account or media data.
export const MUSIC_INTERFACE_KEY = 'atlasreid-music-interface-v1';

const VERSION = 1;
const MAX_BYTES = 200_000;
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

  try {
    storage = Object.prototype.hasOwnProperty.call(options || {}, 'storage') ? options.storage : globalThis.localStorage;
    if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') {
      const text = storage.getItem(MUSIC_INTERFACE_KEY);
      persistent = true;
      if (text !== null && text !== undefined) {
        if (typeof text !== 'string' || text.length > MAX_BYTES) throw new Error('Invalid interface state size');
        const saved = JSON.parse(text);
        if (!isRecord(saved) || saved.version !== VERSION) {
          futureVersion = isRecord(saved) && Number.isInteger(saved.version) && saved.version > VERSION;
          persistent = false;
        } else {
          settings = {...settings, ...cleanSettings(saved.settings)};
          if (Array.isArray(saved.metadata)) {
            for (const entry of saved.metadata) {
              if (albumIds.has(entry?.albumId)) metadata.set(entry.albumId, cleanMetadata(entry));
            }
          }
          if (Array.isArray(saved.favourites)) for (const id of saved.favourites) if (trackIds.has(id)) favourites.add(id);
        }
      }
    }
  } catch {
    persistent = false;
  }

  function persist() {
    if (!storage || futureVersion) {persistent = false; return;}
    try {
      const text = JSON.stringify({version:VERSION,settings,metadata:[...metadata].map(([albumId,fields])=>({albumId,...fields})),favourites:[...favourites]});
      if (text.length > MAX_BYTES) throw new Error('Interface state exceeds storage size limit');
      storage.setItem(MUSIC_INTERFACE_KEY, text);
      persistent = true;
    } catch {
      persistent = false;
    }
  }

  return {
    get settings() {return {...settings};},
    setSettings(patch) {
      settings = {...settings,...cleanSettings(patch)};
      persist();
      return {...settings};
    },
    metadataFor(albumId) {return {...metadata.get(albumId)};},
    saveMetadata(albumId,patch) {
      if (!albumIds.has(albumId) || !isRecord(patch)) return false;
      metadata.set(albumId,{...metadata.get(albumId),...cleanMetadata(patch)});
      persist();
      return true;
    },
    get favouriteIds() {return new Set(favourites);},
    isFavourite(trackId) {return favourites.has(trackId);},
    toggleFavourite(trackId) {
      if (!trackIds.has(trackId)) return false;
      if (favourites.has(trackId)) favourites.delete(trackId); else favourites.add(trackId);
      persist();
      return favourites.has(trackId);
    },
    get persistent() {return persistent;},
  };
}
