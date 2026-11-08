import assert from 'node:assert/strict';
import {createSoundCloudTransport,validateSoundCloudSource,widgetURL} from '../music/soundcloud-transport.js';

const source='https://soundcloud.com/lorientestard/sets/clair-obscur-expedition-33-6';
const nextSource='https://soundcloud.com/example/sets/another-album';
const lastSource='https://soundcloud.com/example/sets/final-album';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const tests=[];
const test=(name,run)=>tests.push({name,run});

function fixture({deferReads=false,loadAPI,timeoutMs=10000,playStarts=true,playbackTimeoutMs=10000}={}) {
  const calls=[],patches=[],errors=[],reads=[],handlers=new Map(),loadCallbacks=[],navigations=[];
  const data={index:0,duration:240000,position:0,volume:65,paused:true,sound:{id:10,permalink_url:'https://soundcloud.com/example/first-song',streamable:true,policy:'ALLOW'},sounds:[{id:10},{id:11},{id:12}]};
  const get=(field,callback)=>{const value=data[field];if(deferReads)reads.push(()=>callback(value));else callback(value);};
  const widget={
    bind(event,listener){handlers.set(event,listener);},unbind(event){handlers.delete(event);},
    load(url,options){calls.push(['load',url,options]);loadCallbacks.push(options.callback);},
    play(){calls.push(['play']);if(playStarts)data.paused=false;},pause(){calls.push(['pause']);data.paused=true;},
    skip(index){calls.push(['skip',index]);data.index=index;data.position=0;},
    seekTo(position){calls.push(['seekTo',position]);data.position=position;},
    setVolume(volume){calls.push(['setVolume',volume]);data.volume=volume;},
    getCurrentSoundIndex:callback=>get('index',callback),getDuration:callback=>get('duration',callback),
    getPosition:callback=>get('position',callback),getVolume:callback=>get('volume',callback),
    isPaused:callback=>get('paused',callback),getSounds:callback=>get('sounds',callback),getCurrentSound:callback=>get('sound',callback),
  };
  const Widget=frame=>{calls.push(['Widget',frame.src]);return widget;};
  Widget.Events=Object.fromEntries(['READY','PLAY','PAUSE','PLAY_PROGRESS','SEEK','FINISH','ERROR'].map(event=>[event,event]));
  let apiCalls=0;
  let frameSource='';
  const iframe={ownerDocument:{}};
  Object.defineProperty(iframe,'src',{get:()=>frameSource,set:value=>{frameSource=value;navigations.push(value);}});
  const transport=createSoundCloudTransport({iframe,onState:patch=>patches.push(patch),onError:error=>errors.push(error),
    loadAPI:()=>{apiCalls++;return loadAPI?loadAPI({Widget}):{Widget};},timeoutMs,pollIntervalMs:60000,playbackTimeoutMs});
  return {transport,iframe,calls,patches,errors,data,reads,loadCallbacks,handlers,navigations,apiCalls:()=>apiCalls,
    emit(event,value){handlers.get(event)?.(value);},state(){return Object.assign({},...patches);}};
}

test('only HTTPS SoundCloud track and playlist sources can produce a widget URL',()=>{
  assert.equal(validateSoundCloudSource(`${source}?si=tracking#t=3`),source);
  assert.equal(validateSoundCloudSource('https://www.soundcloud.com/artist/song'),'https://soundcloud.com/artist/song');
  assert.equal(validateSoundCloudSource('https://api.soundcloud.com/playlists/123'),'https://api.soundcloud.com/playlists/123');
  for(const bad of ['http://soundcloud.com/a/b','javascript:alert(1)','https://soundcloud.com.evil.test/a/b','https://evil.test/a/b','https://a@ soundcloud.com/a/b','https://user:password@soundcloud.com/a/b','https://soundcloud.com:8443/a/b','https://api.soundcloud.com/users/123','https://soundcloud.com/a','https://soundcloud.com/a%2fb/song','https://w.soundcloud.com/player/?url=https://evil.test/a/b'])assert.equal(validateSoundCloudSource(bad),null,bad);
  const url=new URL(widgetURL(source,{index:2}));
  assert.equal(url.origin,'https://w.soundcloud.com');assert.equal(url.pathname,'/player/');
  assert.equal(url.searchParams.get('url'),source);assert.equal(url.searchParams.get('start_track'),'2');
  assert.equal(url.searchParams.get('auto_play'),'false');assert.equal(url.searchParams.get('show_user'),'true');
  assert.equal(widgetURL(source,{index:-1}),null);
  assert.equal(widgetURL('https://soundcloud.com/artist/song',{index:2}),null);
});

test('the API and iframe load only after a requested playback, then select the requested song',async()=>{
  const f=fixture();assert.equal(f.apiCalls(),0);assert.equal(f.iframe.src,'');
  f.transport.setVolume(37);
  const loaded=f.transport.load(source,{index:2});await tick();
  assert.equal(f.apiCalls(),1);assert.equal(new URL(f.iframe.src).searchParams.get('start_track'),'2');
  assert.equal(f.calls.some(call=>call[0]==='play'),false,'play must wait for widget readiness');
  f.emit('READY');assert.equal(await loaded,true);
  assert.deepEqual(f.calls.filter(call=>['skip','play','setVolume'].includes(call[0])),[['setVolume',37],['skip',2],['play']]);
  assert.equal(f.state().index,2);assert.equal(f.state().ready,true);assert.deepEqual(f.state().sounds,f.data.sounds);
  f.transport.destroy();
});

test('a newer request wins while the API is still loading',async()=>{
  let resolveAPI;const f=fixture({loadAPI:api=>new Promise(resolve=>{resolveAPI=()=>resolve(api);})});
  const first=f.transport.load(source,{index:1});await tick();
  const second=f.transport.load(nextSource,{index:2,play:false});assert.equal(await first,false);
  resolveAPI();await tick();f.emit('READY');assert.equal(await second,true);
  assert.equal(f.apiCalls(),1);assert.equal(new URL(f.iframe.src).searchParams.get('url'),nextSource);
  assert.equal(f.calls.some(call=>call[0]==='play'),false);
  assert.equal(f.state().playing,false);f.transport.destroy();
});

test('a fresh iframe navigates once and a destroyed cached iframe cannot start another transport',async()=>{
  const f=fixture();const loaded=f.transport.load(source,{index:0});await tick();
  assert.equal(f.navigations.length,1);assert.equal(f.calls.filter(call=>call[0]==='load').length,0);
  assert.equal(f.calls.some(call=>call[0]==='play'||call[0]==='skip'),false,'playback must wait for the fresh frame READY event');
  f.emit('READY');assert.equal(await loaded,true);f.transport.destroy();
  assert.throws(()=>createSoundCloudTransport({iframe:f.iframe}),/fresh SoundCloud iframe/);
  const next=fixture();const nextLoaded=next.transport.load(source);await tick();next.emit('READY');
  assert.equal(await nextLoaded,true);assert.equal(next.navigations.length,1);next.transport.destroy();
});

test('individual track sources use no playlist skip command and report actual sound identity',async()=>{
  const f=fixture();const trackSource='https://soundcloud.com/example/first-song';
  const loaded=f.transport.load(trackSource);await tick();f.emit('READY');assert.equal(await loaded,true);
  assert.equal(f.calls.some(call=>call[0]==='skip'),false);assert.equal(f.state().soundId,10);assert.equal(f.state().soundURL,trackSource);
  assert.equal(f.state().streamable,true);assert.equal(f.state().policy,'ALLOW');
  assert.equal(new URL(f.iframe.src).searchParams.has('start_track'),false);
  f.data.sound={id:99,permalink_url:'https://soundcloud.com/example/unrelated-song',streamable:false,policy:'BLOCK'};f.emit('PLAY');
  assert.equal(f.state().soundId,99);assert.equal(f.state().soundURL,'https://soundcloud.com/example/unrelated-song');
  assert.equal(f.state().streamable,false);assert.equal(f.state().policy,'BLOCK');
  await assert.rejects(f.transport.load(trackSource,{index:1}),TypeError);f.transport.destroy();
});

test('native widget events and getters drive track, time, pause and volume state',async()=>{
  const f=fixture();const loaded=f.transport.load(source,{play:false});await tick();f.emit('READY');await loaded;
  f.data.index=1;f.data.duration=75000;f.data.position=12000;f.data.paused=false;f.data.volume=17;f.emit('PLAY');
  assert.equal(f.state().index,1);assert.equal(f.state().duration,75);assert.equal(f.state().position,12);
  assert.equal(f.state().volume,17);assert.equal(f.state().playing,true);
  f.emit('PLAY_PROGRESS',{currentPosition:13500});assert.equal(f.state().position,13.5);
  f.transport.seek(20);assert.ok(f.calls.some(call=>call[0]==='seekTo'&&call[1]===20000));
  f.data.paused=true;f.emit('PAUSE');assert.equal(f.state().playing,false);
  f.emit('FINISH');assert.equal(f.state().finished,true);f.data.paused=false;f.emit('PLAY');assert.equal(f.state().finished,false);
  f.transport.setVolume(1000);await tick();assert.equal(f.state().volume,100);f.transport.setVolume(Number.NaN);assert.equal(f.state().volume,100);
  f.transport.destroy();
});

test('playlist loads serialize and a superseded load never starts its old song',async()=>{
  const f=fixture();const first=f.transport.load(source);await tick();f.emit('READY');await first;
  f.calls.length=0;f.loadCallbacks.length=0;
  const old=f.transport.load(nextSource,{index:1});const current=f.transport.load(lastSource,{index:2});
  assert.equal(await old,false);assert.equal(f.loadCallbacks.length,1);
  f.loadCallbacks[0]();assert.equal(f.loadCallbacks.length,2);
  assert.deepEqual(f.calls.filter(call=>call[0]==='skip'),[],'the superseded album must not select a song');
  f.loadCallbacks[1]();assert.equal(await current,true);
  assert.deepEqual(f.calls.filter(call=>call[0]==='skip'),[['skip',2]]);
  f.emit('READY');assert.equal(f.errors.length,0,'a duplicate READY after a load callback must be harmless');
  f.transport.destroy();
});

test('late getters from an earlier track and after destruction cannot overwrite state',async()=>{
  const f=fixture({deferReads:true});const loaded=f.transport.load(source,{play:false});await tick();f.emit('READY');await loaded;
  const staleReads=f.reads.splice(0);f.data.duration=90000;f.transport.skip(1,{play:false});
  assert.equal(f.reads.length,0,'new getters wait for the old method response rather than sharing it');
  staleReads.forEach(read=>read());await tick();const currentReads=f.reads.splice(0);currentReads.forEach(read=>read());
  assert.equal(f.state().index,1);assert.equal(f.state().duration,90);
  staleReads.forEach(read=>read());assert.equal(f.state().index,1);assert.equal(f.state().duration,90);
  f.transport.refresh();const postDestroy=f.reads.splice(0);f.transport.destroy();const count=f.patches.length;
  postDestroy.forEach(read=>read());assert.equal(f.patches.length,count);assert.equal(f.handlers.size,0);assert.equal(f.iframe.src,'about:blank');
});

test('errors stop ready state, report a useful reason and permit an explicit retry',async()=>{
  const f=fixture();const loaded=f.transport.load(source);await tick();f.emit('ERROR');assert.equal(await loaded,false);
  assert.equal(f.state().ready,false);assert.equal(f.state().playing,false);assert.match(f.errors[0].message,/could not play/);
  f.loadCallbacks.length=0;
  const retry=f.transport.load(source,{play:false});assert.equal(f.loadCallbacks.length,1);f.loadCallbacks[0]();
  assert.equal(await retry,true);assert.equal(f.state().ready,true);assert.equal(f.state().playing,false);f.transport.destroy();
});

test('explicit play and pause discard earlier pending getters and await a new provider acknowledgement',async()=>{
  const f=fixture({deferReads:true});const loaded=f.transport.load(source,{play:false});await tick();f.emit('READY');await loaded;
  f.reads.splice(0).forEach(read=>read());await tick();assert.equal(f.state().playing,false);
  f.data.paused=false;f.transport.refresh();const beforePause=f.reads.splice(0);f.transport.pause();
  assert.equal(f.reads.length,0);beforePause.forEach(read=>read());assert.equal(f.state().playing,false,'an older playing read must not undo Pause');
  await tick();f.reads.splice(0).forEach(read=>read());await tick();assert.equal(f.state().playing,false);
  f.transport.refresh();const beforePlay=f.reads.splice(0);f.transport.play();
  assert.equal(f.state().playing,false,'issuing Play is not proof that SoundCloud started');
  beforePlay.forEach(read=>read());await tick();f.reads.splice(0).forEach(read=>read());await tick();
  assert.equal(f.state().playing,true,'only the post-command provider read acknowledges playback');f.transport.destroy();
});

test('provider errors preserve only bounded plain messages and numeric codes',async()=>{
  const f=fixture();const loaded=f.transport.load(source);await tick();f.emit('ERROR',{error:{code:403,message:`Blocked\n${'x'.repeat(400)}`,private_details:{token:'must not escape'}}});
  assert.equal(await loaded,false);assert.equal(f.errors[0].code,403);assert.equal(f.errors[0].providerMessage.length,240);
  assert.doesNotMatch(f.errors[0].message,/\n|must not escape|private_details/);f.transport.destroy();
  const generic=fixture();const pending=generic.transport.load(source);await tick();generic.emit('ERROR',{code:'untrusted-string',message:{unsafe:'not plain'}});
  assert.equal(await pending,false);assert.equal(generic.errors[0].code,undefined);assert.match(generic.errors[0].message,/could not play/);generic.transport.destroy();
});

test('a requested play that never starts reports a blocked state without inventing playback or an error',async()=>{
  const f=fixture({playStarts:false,playbackTimeoutMs:5});const loaded=f.transport.load(source);await tick();f.emit('READY');await loaded;
  await new Promise(resolve=>setTimeout(resolve,12));
  assert.equal(f.state().playbackBlocked,true);assert.equal(f.state().playing,false);assert.equal(f.state().ready,true);
  assert.equal(f.errors.length,0);assert.notEqual(f.iframe.src,'about:blank');
  f.transport.play();assert.equal(f.state().playbackBlocked,false);f.transport.pause();
  await new Promise(resolve=>setTimeout(resolve,12));assert.equal(f.state().playbackBlocked,false);
  f.transport.play();f.data.paused=false;f.emit('PLAY');
  await new Promise(resolve=>setTimeout(resolve,12));assert.equal(f.state().playbackBlocked,false);assert.equal(f.state().playing,true);
  f.data.paused=true;f.transport.play();const count=f.patches.length;f.transport.destroy();
  await new Promise(resolve=>setTimeout(resolve,12));assert.equal(f.patches.length,count);assert.equal(f.errors.length,0);
});

test('blocked API loading, response timeouts and cancellation settle without invented playback',async()=>{
  const blocked=fixture({loadAPI:()=>Promise.reject(new Error('Blocked by this browser'))});
  assert.equal(await blocked.transport.load(source),false);assert.match(blocked.errors[0].message,/Blocked/);blocked.transport.destroy();
  const timed=fixture({timeoutMs:5});const waiting=timed.transport.load(source);await tick();
  await new Promise(resolve=>setTimeout(resolve,12));assert.equal(await waiting,false);assert.equal(timed.state().playing,false);timed.transport.destroy();
  const cancelled=fixture();const cancelledLoad=cancelled.transport.load(source);cancelled.transport.destroy();
  assert.equal(await cancelledLoad,false);await tick();assert.equal(cancelled.iframe.src,'about:blank');assert.equal(cancelled.calls.length,0);
  const invalid=fixture();await assert.rejects(invalid.transport.load('https://evil.test/a/b'),TypeError);
  assert.equal(invalid.apiCalls(),0);assert.equal(invalid.iframe.src,'');invalid.transport.destroy();
});

for(const {name,run}of tests){await run();console.log(`PASS ${name}`);}
console.log(`PASS all ${tests.length} SoundCloud transport checks`);
