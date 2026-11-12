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
  let readable = false;
  const pendingAlbums = new Map();
  let pendingDoNotAsk;

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

  // Retain failed local writes separately, so refreshing another tab's saved
  // entries cannot either erase them or replay old, already-committed choices.
  function refreshFromStorage() {
    const before = JSON.stringify([records(),doNotAsk,persistent]);
    readable = false;
    try {
      if (!storage) throw new Error('Storage unavailable');
      const text = storage.getItem(MUSIC_LIBRARY_KEY);
      readable = true;
      let saved = null;
      if (text !== null && text !== undefined) {
        if (typeof text !== 'string' || text.length > MAX_BYTES) {
          readable = false;
          throw new Error('Invalid mock library size');
        }
        futureVersion = false;
        saved = JSON.parse(text);
        futureVersion = isRecord(saved) && Number.isInteger(saved.version) && saved.version > VERSION;
        if (!isRecord(saved) || saved.version !== VERSION) throw new Error('Unsupported mock library version');
      } else futureVersion = false;
      candidates.clear();
      doNotAsk = saved?.doNotAsk === true;
      if (Array.isArray(saved?.albums)) for (const record of saved.albums.slice(0, MAX_ALBUMS)) readRecord(record);
      persistent = true;
    } catch {
      persistent = false;
    }
    for (const [albumId,record] of pendingAlbums) readRecord({albumId,...record});
    if (pendingDoNotAsk !== undefined) doNotAsk = pendingDoNotAsk;
    if (pendingAlbums.size || pendingDoNotAsk !== undefined) persistent = false;
    return before !== JSON.stringify([records(),doNotAsk,persistent]);
  }

  // Access this property only during construction; browsers can deny even its
  // getter. Subsequent reads use the same explicitly supplied storage adapter.
  try {
    storage = Object.prototype.hasOwnProperty.call(settings, 'storage') ? settings.storage : globalThis.localStorage;
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') storage = null;
  } catch { storage = null; }
  refreshFromStorage();

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
    if (!storage || !readable || futureVersion) { persistent = false; return; }
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
      pendingAlbums.clear();
      pendingDoNotAsk = undefined;
    } catch {
      persistent = false;
    }
  }

  function remember(albumId, trackIds) {
    const known = catalogue.get(albumId);
    if (!known || !trackIds || typeof trackIds === 'string') return false;
    const valid = new Set(known);
    const requested = new Set();
    try {
      let count = 0;
      for (const id of trackIds) {
        if (++count > MAX_TRACKS) break;
        if (valid.has(id)) requested.add(id);
      }
    } catch { return false; }
    refreshFromStorage();
    const current = candidates.get(albumId);
    const merged = new Set(current?.trackIds || []);
    let changed = false;
    for (const id of requested) if (!merged.has(id)) { merged.add(id); changed = true; }
    if (!changed) {
      if (current && !persistent) persist();
      return false;
    }
    lastIssuedTime = Math.max(Date.now(), lastIssuedTime + 1);
    candidates.set(albumId, {trackIds: merged, importedAt: lastIssuedTime});
    pendingAlbums.set(albumId, {trackIds:[...merged],importedAt:lastIssuedTime});
    persist();
    return true;
  }

  return {
    registerAlbum,
    tracksFor,
    records,
    remember,
    refreshFromStorage,
    setDoNotAsk(value) {
      refreshFromStorage();
      doNotAsk = value === true;
      pendingDoNotAsk = doNotAsk;
      persist();
    },
    get doNotAsk() { return doNotAsk; },
    // This reports the most recent read/write outcome. A subsequent successful
    // write can recover after malformed data or a temporary storage failure.
    get persistent() { return persistent; },
  };
}
