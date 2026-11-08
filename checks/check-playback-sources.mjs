import assert from 'node:assert/strict';
import {validatedAppleMusicURL,playbackSource} from '../music/player.js';
import {collectionAlbums} from '../music/catalogue.js';
import {scottishBagpipeAlbum} from '../music/scottish-bagpipe-album.js';
import {albums as archivedDemos} from '../music/collection.js';

const tests=[];const test=(name,run)=>tests.push({name,run});
const appleAlbum='https://music.apple.com/gb/album/the-complete-scottish-bagpipe-collection/322470599';
const appleTrack=`${appleAlbum}?i=322470612`;

test('Apple source links accept official release/track pages and reject unrelated navigation',()=>{
  assert.equal(validatedAppleMusicURL(appleAlbum),appleAlbum);assert.equal(validatedAppleMusicURL(appleTrack),appleTrack);
  assert.equal(validatedAppleMusicURL(`${appleTrack}&utm_source=example#track`),appleTrack);
  for(const value of [null,42,'javascript:alert(1)',appleAlbum.replace('https:','http:'),appleAlbum.replace('music.apple.com','music.apple.com.evil.example'),appleAlbum.replace('music.apple.com','music.apple.com@evil.example'),appleAlbum.replace('music.apple.com','user:password@music.apple.com'),appleAlbum.replace('music.apple.com','music.apple.com:444'),'https://music.apple.com/gb/search','https://music.apple.com/gb/album/name/not-an-id',`${appleAlbum}?i=javascript:alert(1)`])assert.equal(validatedAppleMusicURL(value),null,String(value));
});

test('the 35-track Apple catalogue uses only its five individual SoundCloud matches',()=>{
  assert.equal(scottishBagpipeAlbum.tracks.length,35);
  const sources=scottishBagpipeAlbum.tracks.map(track=>playbackSource({album:scottishBagpipeAlbum,track}));
  assert.equal(sources.filter(source=>source.kind==='soundcloud').length,5);
  assert.equal(sources.filter(source=>source.kind==='external').length,30);
  assert.equal(sources[0].kind,'external','The unmatched opening track must not become a silent demo');
  for(const [index,source]of sources.entries()){
    const track=scottishBagpipeAlbum.tracks[index];
    assert.equal(source.appleMusicURL,validatedAppleMusicURL(track.appleMusicURL));
    if(source.kind==='soundcloud')assert.equal(source.url,`https://api.soundcloud.com/tracks/${track.soundcloudId}`);
    else {const search=new URL(source.soundcloudSearchURL);assert.equal(search.origin,'https://soundcloud.com');assert.equal(search.pathname,'/search');assert.equal(search.searchParams.get('q'),`${track.artist} ${track.title}`);}
  }
});

test('an unmatched Apple song never inherits a playlist or falls through to a demo',()=>{
  const album={appleMusicURL:appleAlbum,artist:'Various Artists',soundcloudPlaylist:'https://soundcloud.com/uploader/sets/partial-match'};
  const track={id:'unmatched',title:'Missing recording',duration:100};
  const external=playbackSource({album,track});assert.equal(external.kind,'external');assert.equal(external.appleMusicURL,appleAlbum);
  assert.equal(playbackSource({album,track:{...track,soundcloudId:299957897}}).kind,'soundcloud');
  assert.equal(playbackSource({album,track:{...track,soundcloudURL:'https://soundcloud.com/performer/verified-recording'}}).kind,'soundcloud');
  assert.equal(playbackSource({album,track:{...track,soundcloudURL:album.soundcloudPlaylist}}).kind,'external','A partial playlist is not an individual recording match');
  assert.equal(playbackSource({album,track:{...track,soundcloudId:-1,soundcloudURL:'https://evil.example/not-a-source'}}).kind,'external');
  const malformed=playbackSource({album:{...album,appleMusicURL:'javascript:alert(1)'},track});assert.equal(malformed.kind,'external');assert.equal(malformed.appleMusicURL,null);
});

test('external searches use a fixed SoundCloud destination and preserve catalogue values',()=>{
  const item={album:{appleMusicURL:appleAlbum,artist:'Album performer'},track:{title:'A & B? #one',artist:'Actual performer & redirect=https://evil.example',appleMusicURL:appleTrack}};
  const before=JSON.stringify(item),source=playbackSource(item),search=new URL(source.soundcloudSearchURL);
  assert.equal(search.origin,'https://soundcloud.com');assert.equal(search.pathname,'/search');assert.deepEqual([...search.searchParams.keys()],['q']);
  assert.equal(search.searchParams.get('q'),`${item.track.artist} ${item.track.title}`);assert.equal(source.appleMusicURL,appleTrack);assert.equal(JSON.stringify(item),before);
});

test('existing complete SoundCloud and Bandcamp albums retain their provider routes',()=>{
  for(const album of collectionAlbums.filter(album=>!album.appleMusicURL))for(const track of album.tracks){
    const source=playbackSource({album,track});
    if(album.soundcloudPlaylist){assert.equal(source.kind,'soundcloud');assert.equal(source.url,`https://api.soundcloud.com/tracks/${track.soundcloudId}`);}
    else {assert.equal(source.kind,'bandcamp');assert.ok(source.url.startsWith('https://bandcamp.com/EmbeddedPlayer/'));}
  }
  const source=playbackSource({album:{soundcloudPlaylist:'https://soundcloud.com/performer/sets/complete-album'},track:{title:'Legacy playlist track'}});
  assert.equal(source.kind,'soundcloud');assert.equal(source.url,'https://soundcloud.com/performer/sets/complete-album');
});

test('archived invented albums retain demo playback without changing their records',()=>{
  const before=JSON.stringify(archivedDemos);
  for(const album of archivedDemos)for(const track of album.tracks)assert.equal(playbackSource({album,track}).kind,'demo');
  assert.equal(JSON.stringify(archivedDemos),before);assert.equal(playbackSource(null).kind,'none');
});

let failures=0;
for(const{name,run}of tests){try{run();console.log(`PASS ${name}`);}catch(error){failures++;console.error(`FAIL ${name}: ${error.stack}`);}}
if(failures)process.exitCode=1;else console.log(`PASS all ${tests.length} playback source checks`);
