// The mock library remembers identifiers and completed progress, never audio.
// One origin-local key is shared by the CSS and 3D listening studies.
export const MUSIC_LIBRARY_KEY = 'atlasreid-music-import-library-v1';

const VERSION = 1;
const MAX_ALBUMS = 1000;
const MAX_TRACKS = 1000;
const MAX_BYTES = 2_000_000;
const validId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validTime = value => Number.isSafeInteger(value) && value >= 0 && value <= 8_640_000_000_000_000;

export function createImportLibrary(options = {}) {
  const settings = options || {};
  const catalogue = new Map();
  const candidates = new Map();
  let storage = null;
  let persistent = false;
  let futureVersion = false;
  let doNotAsk = false;
  let lastIssuedTime = 0;

  function registerAlbum(album) {
    if (!isRecord(album) || !validId(album.id) || !Array.isArray(album.tracks)) return false;
    const tracks = [];
    const seen = new Set();
    for (const track of album.tracks.slice(0, MAX_TRACKS)) {
      if (!validId(track?.id) || seen.has(track.id)) continue;
      seen.add(track.id);
      tracks.push(track.id);
    }
    if (!tracks.length || (!catalogue.has(album.id) && catalogue.size >= MAX_ALBUMS)) return false;
    catalogue.set(album.id, tracks);
    return true;
  }

  function readRecord(value) {
    if (!isRecord(value) || !validId(value.albumId) || !Array.isArray(value.trackIds)) return;
    if (!candidates.has(value.albumId) && candidates.size >= MAX_ALBUMS) return;
    const previous = candidates.get(value.albumId);
    const ids = new Set(previous?.trackIds || []);
    for (const id of value.trackIds.slice(0, MAX_TRACKS)) {
      if (validId(id) && ids.size < MAX_TRACKS) ids.add(id);
    }
    if (!ids.size) return;
    const importedAt = validTime(value.importedAt) ? value.importedAt : 0;
    candidates.set(value.albumId, {
      trackIds: ids,
      importedAt: Math.max(previous?.importedAt || 0, importedAt),
    });
  }

  // Access the browser property here rather than at module import: private
  // browsing, storage policy and test environments can throw even on access.
  try {
    storage = Object.prototype.hasOwnProperty.call(settings, 'storage') ? settings.storage : globalThis.localStorage;
    if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') {
      const text = storage.getItem(MUSIC_LIBRARY_KEY);
      persistent = true;
      if (text !== null && text !== undefined) {
        if (typeof text !== 'string' || text.length > MAX_BYTES) throw new Error('Invalid mock library size');
        const saved = JSON.parse(text);
        if (!isRecord(saved) || saved.version !== VERSION) {
          futureVersion = isRecord(saved) && Number.isInteger(saved.version) && saved.version > VERSION;
          persistent = false;
        } else {
          doNotAsk = saved.doNotAsk === true;
          if (Array.isArray(saved.albums)) for (const record of saved.albums.slice(0, MAX_ALBUMS)) readRecord(record);
        }
      }
    }
  } catch {
    persistent = false;
  }

  for (const album of Array.isArray(settings.catalog) ? settings.catalog : []) registerAlbum(album);

  function tracksFor(albumId) {
    const saved = candidates.get(albumId);
    return new Set((catalogue.get(albumId) || []).filter(id => saved?.trackIds.has(id)));
  }

  function records() {
    const result = [];
    for (const albumId of catalogue.keys()) {
      const trackIds = [...tracksFor(albumId)];
      if (trackIds.length) result.push({albumId, trackIds, importedAt: candidates.get(albumId).importedAt});
    }
    return result.sort((a, b) => b.importedAt - a.importedAt || a.albumId.localeCompare(b.albumId));
  }

  function persist() {
    if (!storage || futureVersion) { persistent = false; return; }
    try {
      // Keep syntactically valid private candidates for late registerAlbum()
      // calls. Only registered catalogue IDs can ever be read by the UI.
      const albums = [...candidates].map(([albumId, saved]) => ({
        albumId,
        trackIds: [...saved.trackIds],
        importedAt: saved.importedAt,
      }));
      const text = JSON.stringify({version: VERSION, doNotAsk, albums});
      if (text.length > MAX_BYTES) throw new Error('Mock library exceeds storage size limit');
      storage.setItem(MUSIC_LIBRARY_KEY, text);
      persistent = true;
    } catch {
      persistent = false;
    }
  }

  function remember(albumId, trackIds) {
    const known = catalogue.get(albumId);
    if (!known || !trackIds || typeof trackIds === 'string') return false;
    const valid = new Set(known);
    const current = candidates.get(albumId);
    const merged = new Set(current?.trackIds || []);
    let changed = false;
    try {
      let count = 0;
      for (const id of trackIds) {
        if (++count > MAX_TRACKS) break;
        if (valid.has(id) && !merged.has(id)) { merged.add(id); changed = true; }
      }
    } catch { return false; }
    if (!changed) {
      if (current && !persistent) persist();
      return false;
    }
    lastIssuedTime = Math.max(Date.now(), lastIssuedTime + 1);
    candidates.set(albumId, {trackIds: merged, importedAt: lastIssuedTime});
    persist();
    return true;
  }

  return {
    registerAlbum,
    tracksFor,
    records,
    remember,
    setDoNotAsk(value) {
      doNotAsk = value === true;
      persist();
    },
    get doNotAsk() { return doNotAsk; },
    // This reports the most recent read/write outcome. A subsequent successful
    // write can recover after malformed data or a temporary storage failure.
    get persistent() { return persistent; },
  };
}
