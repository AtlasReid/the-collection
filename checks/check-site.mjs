import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { collectionAlbums as albums } from '../music/catalogue.js';
import { soundcloudDiagnosticAlbum } from '../music/soundcloud-diagnostic.js';
import { createImportLibrary } from '../music/import-library.js';
import { createInterfaceState } from '../music/interface-state.js';
import { ACKNOWLEDGEMENTS_TEXT } from '../music/desktop-panels.js';

const hostedAlbums=[...albums.filter(album=>album.soundcloudPlaylist),soundcloudDiagnosticAlbum];
const bandcampAlbums=albums.filter(album=>album.bandcampURL);

// Exercise the packaged checkout, including its real local server, under a
// repository prefix. No parent prototype, browser session or Internet is used.
const root=fileURLToPath(new URL('../',import.meta.url));
const prefix='/the-collection/';
const origin='https://collection.invalid';
const siteURL=new URL(prefix,origin);
const resources=new Set();
const retiredCompatibilityFiles=['music/index.html','music/music.js','music/music.css','music/assets/blade-front.png','music/assets/superdrive-front.png'];
const texts=new Map();
const tests=[];
const test=(name,run)=>tests.push({name,run});
const file=relative=>path.join(root,...relative.split('/'));
const source=async relative=>{
  if(!texts.has(relative))texts.set(relative,await readFile(file(relative),'utf8'));
  return texts.get(relative);
};

// Only the document outline is needed for the overlay contract. Track real
// nesting so a matching class later in the HTML cannot hide accidental
// placement inside the transformed 3D viewport.
function documentElements(html) {
  const elements=[],stack=[],voidTags=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
  for(const match of html.matchAll(/<!--[\s\S]*?-->|<\/?([a-z][\w:-]*)\b[^>]*>/gi)) {
    if(!match[1])continue;
    const token=match[0],tag=match[1].toLowerCase();
    if(token.startsWith('</')) {
      assert.equal(stack.pop()?.tag,tag,`Unexpected closing ${tag} in the entry document`);
      continue;
    }
    const attributes={};
    const attributeText=token.slice(token.indexOf(match[1])+match[1].length,-1);
    for(const attribute of attributeText.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))attributes[attribute[1].toLowerCase()]=attribute[2]??attribute[3]??attribute[4]??'';
    const element={tag,attributes,parent:stack.at(-1)??null};
    elements.push(element);
    if(!voidTags.has(tag)&&!token.endsWith('/>'))stack.push(element);
  }
  assert.equal(stack.length,0,'The entry document has an unclosed element');
  return elements;
}

async function exactFile(relative) {
  assert.ok(relative&&!relative.includes('\\'),`Not a portable file path: ${relative}`);
  const resolved=path.resolve(root,relative);
  const relation=path.relative(root,resolved);
  assert.ok(relation&&!relation.startsWith('..')&&!path.isAbsolute(relation),`Path escapes checkout: ${relative}`);
  // Windows normally hides casing mistakes that would break GitHub Pages.
  let directory=root;
  for(const segment of relative.split('/')) {
    assert.ok(!['.','..',''].includes(segment),`Invalid segment in ${relative}`);
    const names=await readdir(directory);
    assert.ok(names.includes(segment),`Missing or incorrectly cased asset: ${relative}`);
    directory=path.join(directory,segment);
  }
  assert.ok((await stat(resolved)).isFile(),`Expected a file: ${relative}`);
}

function localResource(reference,relative) {
  if(reference.startsWith('#'))return null;
  if(/^https?:\/\//i.test(reference))return null;
  assert.ok(!/^(?:\/|\\|[a-z][a-z\d+.-]*:)/i.test(reference),`Non-portable URL ${reference} in ${relative}`);
  const resolved=new URL(reference,new URL(relative,siteURL));
  assert.equal(resolved.origin,origin,`Asset changes origin: ${reference}`);
  assert.ok(resolved.pathname.startsWith(prefix),`URL escapes repository prefix: ${reference} in ${relative}`);
  let target=decodeURIComponent(resolved.pathname.slice(prefix.length));
  if(!target||target.endsWith('/'))target+='index.html';
  return target;
}

async function include(reference,relative) {
  const target=localResource(reference,relative);
  if(!target)return;
  await exactFile(target);
  if(resources.has(target))return;
  resources.add(target);
  const extension=path.extname(target);
  if(!['.html','.css','.js'].includes(extension))return;
  const text=await source(target);
  if(extension==='.html') {
    for(const match of text.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
      const reference=match[1];
      if(reference.startsWith('#')) {
        const id=reference.slice(1);
        assert.ok(new RegExp(`\\bid=["']${id}["']`).test(text),`Broken in-page link ${reference} in ${target}`);
      } else await include(reference,target);
    }
  }
  if(extension==='.css') {
    for(const match of text.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)) {
      if(!match[1].startsWith('data:'))await include(match[1],target);
    }
  }
  if(extension==='.js') {
    const patterns=[
      /\b(?:import|export)\s+[^'";]*?\bfrom\s*['"]([^'"]+)['"]/g,
      /\bimport\s+['"]([^'"]+)['"]/g,
      /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    ];
    for(const pattern of patterns)for(const match of text.matchAll(pattern)) {
      assert.ok(!/^https?:/i.test(match[1]),`Runtime module unexpectedly needs a CDN: ${target}`);
      await include(match[1],target);
    }
  }
}

test('the main entry uses The Collection and omits the removed presentation',async()=>{
  const text=await source('index.html');
  assert.match(text,/<title>The Collection<\/title>/);
  assert.match(text,/<h1>The Collection<\/h1>/);
  assert.doesNotMatch(text,/Good music\.|Physical copies\.|THE LISTENING DESK|id=["'](?:show-references|reference-dialog)["']|class=["'](?:eyebrow|prototype-note)["']/);
  assert.doesNotMatch(await source('scene.js'),/\$\(['"]#(?:show-references|reference-dialog|close-references)['"]\)/);
});

test('the floating collection keeps its accessible controls outside the animated scene',async()=>{
  const elements=documentElements(await source('index.html'));
  const hasClass=(element,name)=>(element.attributes.class??'').split(/\s+/).includes(name);
  const unique=predicate=>{
    const matches=elements.filter(predicate);
    assert.equal(matches.length,1,'An essential collection element is missing or duplicated');
    return matches[0];
  };
  const panel=unique(element=>hasClass(element,'collection-panel'));
  const shell=unique(element=>element.attributes.id==='scene-shell');
  const label=unique(element=>hasClass(element,'collection-bar'));
  const navigation=unique(element=>element.attributes.id==='album-list');
  const status=unique(element=>element.attributes.id==='scene-status');
  const collapse=unique(element=>element.attributes.id==='collection-collapse');
  const graphicsMount=unique(element=>element.attributes.id==='collection-graphics-trigger');
  const within=(element,ancestor)=>{
    for(let parent=element.parent;parent;parent=parent.parent)if(parent===ancestor)return true;
    return false;
  };
  assert.ok(panel.parent===shell.parent,'The floating collection must be a sibling of the camera viewport');
  assert.ok(within(label,panel)&&within(navigation,panel)&&within(status,panel),'Collection heading, album controls and live status must travel together');
  assert.equal(navigation.tag,'nav');
  assert.ok(navigation.attributes['aria-label'],'The collection must retain its named navigation landmark');
  assert.equal(status.attributes['aria-live'],'polite');
  assert.ok(within(collapse,label)&&within(graphicsMount,label),'Collapse and Graphics must remain in the visible panel header');
  assert.equal(collapse.tag,'button');
  assert.equal(collapse.attributes['aria-controls'],navigation.attributes.id);
  assert.equal(collapse.attributes['aria-expanded'],'true');
  assert.ok(collapse.attributes['aria-label'],'The icon-only collapse control must have an accessible name');
  assert.ok(!within(collapse,navigation)&&!within(graphicsMount,navigation),'Collapsing album choices must leave both controls reachable');
  const skip=unique(element=>hasClass(element,'skip-link'));
  assert.equal(skip.attributes.href,'#album-list','The keyboard skip link must still reach the album controls');

  const css=(await source('scene.css')).replace(/\/\*[\s\S]*?\*\//g,'');
  const rules=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match=>({selectors:match[1].split(',').map(selector=>selector.trim()),declarations:match[2]}));
  assert.ok(rules.some(rule=>rule.selectors.includes('.collection-panel')&&/\bposition\s*:\s*(?:absolute|fixed)\b/.test(rule.declarations)),'The collection panel must overlay rather than shorten the 3D viewport');
  assert.ok(rules.some(rule=>rule.selectors.includes('.collection-panel')&&/\bbackdrop-filter\s*:[^;}]*\bblur\(/.test(rule.declarations)),'The floating collection must retain its glass material');
  assert.ok(rules.some(rule=>rule.selectors.some(selector=>/^(?:body)?\.is-player-focused\s+\.collection-panel$/.test(selector))&&/\bdisplay\s*:\s*none\b/.test(rule.declarations)),'Focus mode must hide the entire panel, including its glass outline');
});

test('HTML links, styles and the complete static module graph stay inside the checkout',async()=>{
  await include('./index.html','index.html');
  assert.ok(resources.has('dev/music/index.html'),'The WebGL-independent desktop fallback is absent');
  assert.ok(resources.has('dev/music/preview.js'),'The desktop fallback cannot start');
  for(const relative of retiredCompatibilityFiles)assert.equal(resources.has(relative),false,`Retired compatibility resource remains reachable: ${relative}`);
  assert.ok(resources.has('screen-aperture.js'),'Live screen depth helper is absent');
  assert.ok(resources.has('vendor/three/three.module.js'));
  assert.ok(resources.has('vendor/three/three.core.js'),'Vendored Three.js core dependency is absent');
  assert.ok(resources.has('music/catalogue.js'),'The shared real collection is absent');
  assert.equal(resources.has('music/collection.js'),false,'Archived demo fixtures must not enter the production graph');
});

test('the requested nine full catalogues replace demos without sharing track identifiers',()=>{
  assert.equal(albums.length,9);
  assert.deepEqual(albums.map(album=>album.tracks.length),[7,11,10,70,21,12,35,154,4],'Keep the requested source editions complete and in collection order');
  assert.deepEqual(albums.slice(0,3).map(album=>album.id),['momento','portraits','still-as-your-sleeping']);
  assert.match(albums[3].title,/Frieren|フリーレン/);
  assert.deepEqual(albums.slice(4).map(album=>album.id),['without-fear-the-complete-edition','sonder-2023','the-complete-scottish-bagpipe-collection','clair-obscur-expedition-33','ive-told-the-trees-everything']);
  assert.equal(albums.filter(album=>album.soundcloudPlaylist).length,6);
  assert.equal(bandcampAlbums.length,2);
  assert.ok(albums.every(album=>[album.soundcloudPlaylist,album.bandcampURL,album.appleMusicURL].filter(Boolean).length===1));
  assert.equal(new Set(albums.map(album=>album.id)).size,albums.length);
  const tracks=albums.flatMap(album=>album.tracks);
  assert.equal(new Set(tracks.map(track=>track.id)).size,tracks.length,'Favourite/import identifiers must not collide between albums');
});

test('dynamic cover URLs resolve at the same repository prefix in the scene and desktop',async()=>{
  assert.ok(albums.length>0,'No catalogue records');
  for(const relative of ['scene.js','discs.js']) {
    const text=await source(relative);
    const match=text.match(/new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/);
    assert.ok(match,`Missing explicit cover base in ${relative}`);
    const musicURL=new URL(match[1],new URL(relative,siteURL));
    assert.equal(musicURL.href,new URL('music/',siteURL).href,`Incorrect dynamic cover base in ${relative}`);
    for(const album of albums) {
      const url=new URL(album.cover,musicURL);
      assert.ok(url.pathname.startsWith(prefix),`Cover escapes repository: ${album.id}`);
      await include(url.pathname.slice(prefix.length),'index.html');
    }
  }
  const previewMusicURL=new URL('../../music/',new URL('dev/music/preview.js',siteURL));
  for(const album of albums)await include(new URL(album.cover,previewMusicURL).pathname.slice(prefix.length),'index.html');
  const covers=[...resources].filter(relative=>relative.startsWith('music/assets/covers/'));
  assert.equal(new Set(albums.map(album=>album.cover)).size,albums.length,'Each real album needs its own cover asset');
  assert.equal(covers.length,albums.length,'Only the production collection covers belong to the runtime graph');
  const fingerprints=new Set();
  for(const cover of covers){
    const bytes=await readFile(file(cover));
    assert.deepEqual([...bytes.subarray(0,2)],[255,216],`Official cover must be a JPEG: ${cover}`);
    assert.ok(bytes.length>1000,`Cover must contain image data: ${cover}`);
    fingerprints.add(createHash('sha256').update(bytes).digest('hex'));
  }
  assert.equal(fingerprints.size,albums.length,'Separate files must not accidentally reuse the same album image');
});

test('the development desktop reuses Music without a scene or a separate player implementation',async()=>{
  await include('./dev/music/index.html','index.html');
  const entry=await source('dev/music/index.html');
  assert.doesNotMatch(entry,/<canvas\b|scene\.js/);
  assert.match(entry,/href="\.\.\/\.\.\/music\/player\.css"/);
  const preview=await source('dev/music/preview.js');
  assert.match(preview,/from '\.\.\/\.\.\/music\/player\.js'/);
  const musicURL=new URL('../../music/',new URL('dev/music/preview.js',siteURL));
  for(const album of [...albums,soundcloudDiagnosticAlbum])await include(new URL(album.cover,musicURL).pathname.slice(prefix.length),'index.html');
  assert.ok(resources.has('music/soundcloud-album.js'));
  assert.ok(resources.has('music/soundcloud-transport.js'));
  assert.ok(resources.has('music/soundcloud-window.js'));
  assert.ok(resources.has('music/bandcamp-album.js'));
  assert.equal(resources.has('music/collection.js'),false,'The desktop preview must not reintroduce archived demo fixtures');
  assert.ok(resources.has('music/soundcloud-diagnostic.js'),'The Forss connection test remains available in the preview');
  assert.ok(resources.has('dev/music/preview-library.js'));
});

test('the downloadable replica acknowledgements include the complete bundled licence',async()=>{
  await include('./music/acknowledgements.rtf','index.html');
  const licence=(await source('vendor/three/LICENSE')).trim();
  assert.ok(ACKNOWLEDGEMENTS_TEXT.includes(licence),'Bundled licence must appear intact in the document');
  const rtf=await source('music/acknowledgements.rtf');
  assert.ok(rtf.startsWith('{\\rtf1'),'Acknowledgements download must be an RTF document');
  const decoded=rtf.replace(/\\u(-?\d+)\?/g,(_,value)=>String.fromCharCode(Number(value)&65535)).replace(/\\par\n/g,'\n').replace(/\\([{}\\])/g,'$1');
  assert.ok(decoded.includes(licence),'Downloaded document must retain the full licence text');
});

test('the collection links complete credits without granting rights to third-party material',async()=>{
  const elements=documentElements(await source('index.html'));
  const notice=elements.find(element=>element.attributes.id==='collection-notice');
  assert.ok(notice,'The collection corner must retain its copyright notice');
  assert.equal(notice.parent.attributes.id,'album-list','The notice belongs with the collapsible collection controls');
  const link=elements.find(element=>element.tag==='a'&&element.parent===notice);
  assert.equal(link?.attributes.href,'./credits.html');
  assert.equal(link.attributes.target,'_blank','Reading credits must preserve the live collection tab');
  assert.ok(link.attributes.rel.split(/\s+/).includes('noopener'));
  const credits=await source('credits.html'),licence=(await source('vendor/three/LICENSE')).trim();
  const decode=text=>text.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
  assert.ok(decode(credits).includes(licence),'The credits must include the unchanged, complete bundled MIT licence');
  for(const album of albums)assert.ok(credits.includes(album.soundcloudPlaylist||album.bandcampURL||album.appleMusicURL),`Missing source credit for ${album.title}`);
  assert.ok(credits.includes('./music/acknowledgements.rtf'));
  assert.ok(credits.includes('./docs/ASSETS.md'));
  assert.ok(/no open.source licen[cs]e (?:has been )?selected/i.test(credits),'The dependency licence must not silently license the application');
});

test('the real album snapshots have complete, unique tracks and public source links',()=>{
  for(const album of hostedAlbums){
  assert.ok(album.title.trim()&&album.artist.trim());
  const playlist=new URL(album.soundcloudPlaylist);
  assert.equal(playlist.protocol,'https:');assert.equal(playlist.hostname,'soundcloud.com');
  assert.ok(!playlist.username&&!playlist.password&&!playlist.port&&!playlist.search&&!playlist.hash);
  if(album!==soundcloudDiagnosticAlbum){
    assert.ok(Number.isSafeInteger(album.soundcloudPlaylistId)&&album.soundcloudPlaylistId>0);
    assert.match(playlist.pathname,/^\/[^/]+\/sets\/[^/]+$/);
  }
  assert.equal(album.tracks.length,album.sourceTrackCount);
  assert.ok(album.metadataComplete);
  assert.equal(new Set(album.tracks.map(track=>track.id)).size,album.tracks.length);
  assert.equal(new Set(album.tracks.map(track=>track.soundcloudId)).size,album.tracks.length);
  album.tracks.forEach((track,index)=>{
    assert.equal(track.soundcloudIndex,index);
    assert.ok(Number.isSafeInteger(track.soundcloudId)&&track.soundcloudId>0);
    assert.ok(track.title.trim()&&Number.isFinite(track.duration)&&track.duration>0);
    const url=new URL(track.soundcloudURL);
    assert.equal(url.protocol,'https:');assert.equal(url.hostname,'soundcloud.com');
    assert.ok(!url.username&&!url.password&&!url.port&&!url.search&&!url.hash);
    assert.match(url.pathname,/^\/[^/]+\/[^/]+$/);
    for(const value of Object.values(track))if(typeof value==='string'&&/^https?:/.test(value))assert.equal(value,track.soundcloudURL,'Track metadata must not retain provider audio URLs');
  });
  }
});

test('the bagpipe catalogue keeps all 35 Apple entries and only explicit SoundCloud matches',()=>{
  const album=albums.find(album=>album.id==='the-complete-scottish-bagpipe-collection');
  assert.equal(album.tracks.length,35);assert.equal(album.sourceTrackCount,35);assert.equal(album.metadataComplete,true);
  assert.equal(new URL(album.appleMusicURL).hostname,'music.apple.com');
  assert.equal(album.soundcloudPlaylist,undefined,'An unrelated compilation must never become a fallback for every song');
  const matches=album.tracks.filter(track=>track.soundcloudId);
  assert.equal(matches.length,5);
  for(const track of album.tracks){
    const source=new URL(track.appleMusicURL);
    assert.equal(source.hostname,'music.apple.com');assert.equal(Number(source.searchParams.get('i')),track.appleMusicTrackId);
    assert.ok(track.artist&&track.duration>0);
  }
  for(const track of matches){
    assert.equal(new URL(track.soundcloudURL).hostname,'soundcloud.com');
    assert.equal(track.soundcloudMatchArtist,track.artist);
    assert.ok(Math.abs(track.soundcloudDuration-track.duration)<.5,'Do not replace a song with a substantially different performance');
    assert.ok(track.soundcloudSourceAlbum&&track.soundcloudSourceAlbum!==album.title,'The alternate compilation must retain its actual source credit');
  }
});

test('all Bandcamp snapshots have complete public metadata and ship their official covers',async()=>{
  for(const album of bandcampAlbums){
  const albumURL=new URL(album.bandcampURL);
  assert.ok(album.metadataComplete&&album.title.trim()&&album.artist.trim());
  assert.equal(album.tracks.length,album.sourceTrackCount);
  assert.ok(album.tracks.length>0&&Number.isSafeInteger(album.bandcampAlbumId)&&album.bandcampAlbumId>0);
  assert.equal(albumURL.protocol,'https:');assert.match(albumURL.hostname,/^[a-z0-9-]+\.bandcamp\.com$/);
  assert.ok(albumURL.pathname.startsWith('/album/')&&!albumURL.username&&!albumURL.password&&!albumURL.search&&!albumURL.hash);
  assert.match(album.releaseDate,/^\d{4}-\d{2}-\d{2}$/);assert.equal(Number(album.releaseDate.slice(0,4)),album.year);
  assert.equal(new Set(album.tracks.map(track=>track.id)).size,album.tracks.length);
  assert.equal(new Set(album.tracks.map(track=>track.bandcampTrackId)).size,album.tracks.length);
  assert.equal(new Set(album.tracks.map(track=>track.bandcampURL)).size,album.tracks.length);
  for(const track of album.tracks){
    assert.ok(track.title.trim()&&Number.isInteger(track.duration)&&track.duration>0);
    assert.ok(Number.isSafeInteger(track.bandcampTrackId)&&track.bandcampTrackId>0);
    const url=new URL(track.bandcampURL);assert.equal(url.origin,albumURL.origin);
    assert.ok(url.pathname.startsWith('/track/')&&!url.username&&!url.password&&!url.search&&!url.hash);
    // Store canonical source pages, never provider audio/download credentials.
    for(const value of Object.values(track))if(typeof value==='string'&&/^https?:/.test(value))assert.equal(value,track.bandcampURL);
  }
  const cover=localResource(album.cover,'music/bandcamp-album.js');
  await include(album.cover,'music/bandcamp-album.js');
  assert.ok(resources.has(cover));
  const bytes=await readFile(file(cover));assert.deepEqual([...bytes.subarray(0,2)],[255,216],'Bandcamp artwork must be a JPEG');
  assert.ok(bytes.length>1000,'Bandcamp cover must contain image data');
  }
});

test('replacing demo cases preserves existing real imports, preferences and the stored archive',()=>{
  const libraryKey='atlasreid-music-import-library-v1',interfaceKey='atlasreid-music-interface-v1';
  const legacy=[
    {albumId:'clair-obscur-expedition-33',trackIds:['clair-obscur-sc-2075323780','clair-obscur-sc-2075383444'],importedAt:100},
    {albumId:'ive-told-the-trees-everything',trackIds:['dermot-trees-sc-1660853949'],importedAt:200},
    {albumId:'momento',trackIds:['momento-bc-908352832'],importedAt:300},
    {albumId:'colour-study',trackIds:['colour-study-1'],importedAt:400},
  ];
  const entries=new Map([
    [libraryKey,JSON.stringify({version:1,doNotAsk:true,albums:legacy})],
    [interfaceKey,JSON.stringify({version:1,settings:{encoder:'WAV Encoder',quality:'High Quality',errorCorrection:true},metadata:[{albumId:'clair-obscur-expedition-33',composer:'Existing local note'}],favourites:['clair-obscur-sc-2075323780','dermot-trees-sc-1660853949']})],
    ['atlasreid-music-ui-preview-v1','separate preview library'],
    ['atlasreid-collection-graphics-v1','separate graphics choices'],
    ['another-project','keep'],
  ]),before=new Map(entries),writes=[];
  const storage={getItem:key=>entries.get(key)??null,setItem:(key,value)=>{writes.push(key);entries.set(key,value);}};
  const library=createImportLibrary({catalog:albums,storage}),preferences=createInterfaceState({catalog:albums,storage});
  assert.deepEqual(entries,before,'Reading the new catalogue must not rewrite an existing browser library');
  assert.equal(library.doNotAsk,true);
  for(const record of legacy.slice(0,3))assert.deepEqual([...library.tracksFor(record.albumId)],record.trackIds,record.albumId);
  assert.equal(library.records().some(record=>record.albumId==='colour-study'),false,'Archived demos stay out of visible Music');
  assert.equal(preferences.settings.encoder,'WAV Encoder');
  assert.equal(preferences.metadataFor('clair-obscur-expedition-33').composer,'Existing local note');
  assert.equal(preferences.isFavourite('clair-obscur-sc-2075323780'),true);
  const added=albums.find(album=>album.id==='portraits');
  assert.equal(library.remember(added.id,[added.tracks[0].id]),true);
  preferences.setSettings({encoder:'MP3 Encoder'});
  const stored=JSON.parse(entries.get(libraryKey));
  for(const record of legacy)assert.deepEqual(stored.albums.find(item=>item.albumId===record.albumId),record,'Adding a real album must retain previous ledger entries, including hidden demos');
  const reloaded=createInterfaceState({catalog:albums,storage});
  assert.equal(reloaded.isFavourite('dermot-trees-sc-1660853949'),true);
  assert.equal(reloaded.metadataFor('clair-obscur-expedition-33').composer,'Existing local note');
  assert.ok(writes.every(key=>[libraryKey,interfaceKey].includes(key)));
  for(const [key,value]of before)if(![libraryKey,interfaceKey].includes(key))assert.equal(entries.get(key),value,`Unrelated record changed: ${key}`);
});

test('retired compatibility files are absent while the vendored licence remains packaged',async()=>{
  for(const relative of retiredCompatibilityFiles)await assert.rejects(stat(file(relative)),{code:'ENOENT'},`Retired compatibility file remains packaged: ${relative}`);
  await exactFile('vendor/three/LICENSE');
  assert.match(await source('vendor/three/LICENSE'),/The MIT License/);
  await exactFile('.nojekyll');
});

let server,port,serverOutput='';
async function startServer() {
  const probe=net.createServer();
  probe.listen(0,'127.0.0.1');
  await once(probe,'listening');
  port=probe.address().port;
  await new Promise((resolve,reject)=>probe.close(error=>error?reject(error):resolve()));
  server=spawn(process.execPath,['server.mjs'],{
    cwd:root,env:{...process.env,PORT:String(port),BASE_PATH:prefix},stdio:['ignore','pipe','pipe'],
  });
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error(`Preview server did not start: ${serverOutput}`)),5000);
    const finish=error=>{clearTimeout(timer);error?reject(error):resolve();};
    server.stdout.on('data',chunk=>{serverOutput+=chunk;if(serverOutput.includes(`http://127.0.0.1:${port}${prefix}`))finish();});
    server.stderr.on('data',chunk=>{serverOutput+=chunk;});
    server.once('error',finish);
    server.once('exit',code=>finish(new Error(`Preview server exited ${code}: ${serverOutput}`)));
  });
}

function request(rawPath,{method='GET'}={}) {
  return new Promise((resolve,reject)=>{
    const req=http.request({host:'127.0.0.1',port,path:rawPath,method},response=>{
      const chunks=[];
      response.on('data',chunk=>chunks.push(chunk));
      response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks)}));
      response.on('error',reject);
    });
    req.on('error',reject);
    req.setTimeout(3000,()=>req.destroy(new Error(`Request timed out: ${rawPath}`)));
    req.end();
  });
}

test('the real preview server redirects root and the bare repository prefix',async()=>{
  await startServer();
  for(const rawPath of ['/',prefix.slice(0,-1)]) {
    const result=await request(rawPath);
    assert.equal(result.status,302);
    assert.equal(result.headers.location,prefix);
  }
});

test('nested root and desktop routes return the actual entry pages',async()=>{
  for(const [url,relative]of [[prefix,'index.html'],[`${prefix}dev/music/`,'dev/music/index.html']]) {
    const result=await request(url);
    assert.equal(result.status,200,url);
    assert.match(result.headers['content-type'],/^text\/html/);
    assert.equal(result.body.toString(),await source(relative));
  }
});

test('every reachable runtime resource is served intact with a browser-usable MIME type',async()=>{
  const expected={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.rtf':'application/rtf'};
  for(const relative of [...resources,'vendor/three/LICENSE']) {
    const result=await request(`${prefix}${relative}`);
    assert.equal(result.status,200,relative);
    assert.deepEqual(result.body,await readFile(file(relative)),`Served bytes differ: ${relative}`);
    const mime=expected[path.extname(relative)];
    if(mime)assert.ok(result.headers['content-type'].startsWith(mime),`Wrong MIME for ${relative}`);
  }
});

test('HEAD preserves resource headers and unsupported write methods are rejected',async()=>{
  const relative='dev/music/assets/wallpaper.jpg';
  const head=await request(`${prefix}${relative}`,{method:'HEAD'});
  assert.equal(head.status,200);
  assert.equal(head.body.length,0);
  assert.equal(Number(head.headers['content-length']),(await stat(file(relative))).size);
  assert.equal(head.headers['content-type'],'image/jpeg');
  const post=await request(prefix,{method:'POST'});
  assert.equal(post.status,405);
  assert.equal(post.headers.allow,'GET, HEAD');
});

test('retired files, missing resources and routes outside the configured prefix cannot alias the app',async()=>{
  for(const rawPath of ['/index.html','/other-site/',`${prefix}missing-file.js`,`${prefix}music/`,...retiredCompatibilityFiles.map(relative=>`${prefix}${relative}`)]) {
    assert.equal((await request(rawPath)).status,404,rawPath);
  }
});

test('raw encoded traversal and dot-file requests cannot expose checkout files',async()=>{
  // http.request preserves these bytes; fetch/URL may normalise them first.
  for(const rawPath of [
    `${prefix}.git/config`,`${prefix}.env`,`${prefix}%2e%2e%2fAGENTS.md`,
    `${prefix}%2e%2e%5cAGENTS.md`,`${prefix}%2e%2e/.git/config`,
  ]) {
    const result=await request(rawPath);
    assert.ok([403,404].includes(result.status),`${rawPath} returned ${result.status}`);
    assert.notEqual(result.body.toString(),await source('index.html'));
  }
});

let failures=0;
try {
  for(const {name,run}of tests) {
    try {await run();console.log(`PASS ${name}`);}
    catch(error){failures++;console.error(`FAIL ${name}: ${error.message}`);}
  }
}finally{
  if(server&&server.exitCode===null) {
    const exited=once(server,'exit');
    server.kill();
    await exited;
  }
}
if(failures)process.exitCode=1;
else console.log(`PASS all ${tests.length} standalone site checks (${resources.size} reachable runtime files)`);
