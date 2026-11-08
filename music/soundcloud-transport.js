// SoundCloud remains the playback provider. This adapter uses its documented
// widget messages; it never retrieves, caches or downloads an audio file.
const apiLoads=new WeakMap();
const usedIframes=new WeakSet();
const API_URL='https://w.soundcloud.com/player/api.js';
function isPlaylistSource(source) {
  const url=new URL(source),parts=url.pathname.split('/').filter(Boolean);
  return url.hostname==='api.soundcloud.com'?parts[0]==='playlists':parts.length===3&&parts[1]==='sets';
}

export function validateSoundCloudSource(value) {
  if(typeof value!=='string'||value.length>4096)return null;
  try {
    const source=new URL(value);
    if(source.protocol!=='https:'||source.username||source.password||source.port)return null;
    if(!['soundcloud.com','www.soundcloud.com','api.soundcloud.com'].includes(source.hostname))return null;
    const parts=source.pathname.split('/').filter(Boolean);
    if(source.hostname==='api.soundcloud.com'){
      if(parts.length!==2||!['tracks','playlists'].includes(parts[0])||!/^\d+$/.test(parts[1]))return null;
    }else if(!(parts.length===2||parts.length===3&&parts[1]==='sets')||parts.some(part=>!/^[-\w.%]+$/.test(part)||/%(?:2f|5c)/i.test(part)))return null;
    if(source.hostname==='www.soundcloud.com')source.hostname='soundcloud.com';
    source.hash='';source.pathname=`/${parts.join('/')}`;
    const token=source.searchParams.get('secret_token');source.search='';
    if(token&&/^[\w-]+$/.test(token))source.searchParams.set('secret_token',token);
    return source.href;
  }catch{return null;}
}

export function widgetURL(value,{index=0}={}) {
  const source=validateSoundCloudSource(value);
  if(!source||!Number.isInteger(index)||index<0||index>0&&!isPlaylistSource(source))return null;
  const url=new URL('https://w.soundcloud.com/player/');
  const parameters={url:source,auto_play:'false',show_user:'true',show_artwork:'true',single_active:'true'};
  if(isPlaylistSource(source))parameters.start_track=String(index);
  for(const [key,entry]of Object.entries(parameters))url.searchParams.set(key,entry);
  return url.href;
}

export function loadSoundCloudAPI(document=globalThis.document) {
  const view=document?.defaultView||globalThis;
  if(typeof view.SC?.Widget==='function')return Promise.resolve(view.SC);
  if(!document?.head)return Promise.reject(new Error('SoundCloud is unavailable in this browser.'));
  if(apiLoads.has(document))return apiLoads.get(document);
  const request=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=API_URL;script.async=true;
    let timer;
    const finish=error=>{
      clearTimeout(timer);script.onload=null;script.onerror=null;
      if(error){script.remove();apiLoads.delete(document);reject(error);}else resolve(view.SC);
    };
    script.onload=()=>finish(typeof view.SC?.Widget==='function'?null:new Error('The SoundCloud player could not start.'));
    script.onerror=()=>finish(new Error('SoundCloud could not load. Check your connection or browser content settings.'));
    timer=setTimeout(()=>finish(new Error('SoundCloud took too long to load. You can try again.')),15000);
    document.head.append(script);
  });
  apiLoads.set(document,request);return request;
}

export function createSoundCloudTransport({iframe,onState=()=>{},onError=()=>{},loadAPI=()=>loadSoundCloudAPI(iframe.ownerDocument),timeoutMs=15000,pollIntervalMs=1000,playbackTimeoutMs=8000}={}) {
  if(!iframe)throw new TypeError('A SoundCloud iframe is required.');
  // SoundCloud caches Widget instances by contentWindow. The owner must give
  // each new transport a fresh iframe; reopening or backgrounding a window can
  // keep its existing transport and frame. This avoids a second navigation just
  // to reset a previously cached READY flag.
  if(usedIframes.has(iframe))throw new TypeError('Create a fresh SoundCloud iframe after destroying its transport.');
  usedIframes.add(iframe);
  let widget=null,api=null,apiRequest=null,destroyed=false,ready=false,currentSource=null;
  let latest=null,loading=null,revision=0,snapshot=0,poll=null,loadTimer=null,playTimer=null,desiredVolume=65;
  const state={ready:false,playing:false,index:0,position:0,duration:0,volume:65};
  const bindings=[],pendingReads=new Map();
  const publish=patch=>{if(!destroyed){Object.assign(state,patch);onState({...patch});}};
  const stopPoll=()=>{if(poll!==null)clearInterval(poll);poll=null;};
  const clearLoadTimer=()=>{if(loadTimer!==null)clearTimeout(loadTimer);loadTimer=null;};
  const clearPlayTimer=()=>{if(playTimer!==null)clearTimeout(playTimer);playTimer=null;};
  const watchPlayback=()=>{
    clearPlayTimer();publish({playbackBlocked:false});
    if(!ready||destroyed||!latest?.play)return;
    const requestedRevision=revision;
    playTimer=setTimeout(()=>{
      playTimer=null;
      if(!destroyed&&ready&&revision===requestedRevision&&latest?.play&&!state.playing)publish({playbackBlocked:true});
    },playbackTimeoutMs);playTimer.unref?.();
  };
  const settle=(request,value)=>{if(request?.resolve){request.resolve(value);request.resolve=null;}};
  const fail=error=>{
    if(destroyed)return;
    clearLoadTimer();clearPlayTimer();stopPoll();ready=false;loading=null;snapshot++;pendingReads.clear();
    publish({ready:false,playing:false,playbackBlocked:false});settle(latest,false);
    onError(error instanceof Error?error:new Error('SoundCloud could not play this track. It may be unavailable or restricted.'));
  };
  const command=(method,...args)=>{
    if(!widget||destroyed)return;
    try{widget[method](...args);}catch(error){fail(error);}
  };
  function read(method,current,receive) {
    const request={current,receive};
    const pending=pendingReads.get(method);
    if(pending){pending.next=request;return;}
    const active={next:null};pendingReads.set(method,active);
    command(method,value=>{
      if(pendingReads.get(method)!==active)return;
      if(current())receive(value);
      // The official API delivers every queued callback for a getter with its
      // next response. Wait until that dispatch has cleared its callback list
      // before issuing the latest read, so an earlier play/pause response cannot
      // masquerade as the acknowledgement of a newer command.
      queueMicrotask(()=>{
        if(pendingReads.get(method)!==active)return;
        pendingReads.delete(method);
        const next=active.next;
        if(next?.current())read(method,next.current,next.receive);
      });
    });
  }
  function providerError(value) {
    const detail=value&&typeof value==='object'&&value.error&&typeof value.error==='object'?value.error:value;
    const rawMessage=typeof detail==='string'?detail:typeof detail?.message==='string'?detail.message:typeof detail?.error==='string'?detail.error:'';
    const message=rawMessage.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,240);
    const rawCode=typeof detail==='number'?detail:detail?.code;
    const code=Number.isSafeInteger(rawCode)?rawCode:null;
    const error=new Error(message?`SoundCloud: ${message}${code!==null?` (code ${code})`:''}`:'SoundCloud could not play this track. Try its play button or open the track on SoundCloud.');
    if(code!==null)error.code=code;
    if(message)error.providerMessage=message;
    return error;
  }
  function refresh({sounds=false}={}) {
    if(!widget||!ready||destroyed)return;
    const ticket=++snapshot,requestRevision=revision;
    const current=()=>!destroyed&&ready&&ticket===snapshot&&requestRevision===revision;
    const get=(method,field,convert)=>read(method,current,value=>{const result=convert(value);if(result!==undefined){if(field==='volume')desiredVolume=result;if(field==='playing'&&result){clearPlayTimer();publish({playing:true,playbackBlocked:false});}else publish({[field]:result});}});
    get('getCurrentSoundIndex','index',value=>Number.isInteger(value)&&value>=0?value:undefined);
    get('getDuration','duration',value=>Number.isFinite(value)&&value>=0?value/1000:undefined);
    get('getPosition','position',value=>Number.isFinite(value)&&value>=0?value/1000:undefined);
    get('getVolume','volume',value=>Number.isFinite(value)?Math.max(0,Math.min(100,value)):undefined);
    get('isPaused','playing',value=>typeof value==='boolean'?!value:undefined);
    read('getCurrentSound',current,value=>{
      if(!value||typeof value!=='object')return;
      const id=Number(value.id),source=validateSoundCloudSource(value.permalink_url);
      const identity={};
      if(Number.isSafeInteger(id)&&id>0)identity.soundId=id;
      if(source)identity.soundURL=source;
      if(typeof value.streamable==='boolean')identity.streamable=value.streamable;
      if(typeof value.policy==='string'&&value.policy.length<=100)identity.policy=value.policy;
      if(Object.keys(identity).length)publish(identity);
    });
    if(sounds)read('getSounds',()=>!destroyed&&ready&&requestRevision===revision,value=>{if(Array.isArray(value))publish({sounds:value.slice(0,500)});});
  }
  function apply(request) {
    if(destroyed||!ready||request!==latest)return;
    command('setVolume',desiredVolume);
    // skip() is documented only for multi-sound widgets. A track source is
    // already the requested sound and must not receive playlist commands.
    if(isPlaylistSource(request.source))command('skip',request.index);
    command(request.play?'play':'pause');
    if(request.play)watchPlayback();else clearPlayTimer();
    refresh({sounds:true});settle(request,true);
  }
  function finishLoad(request) {
    if(destroyed||!request||loading!==request)return;
    clearLoadTimer();loading=null;currentSource=request.source;ready=true;
    if(latest?.source!==request.source){beginLoad(latest);return;}
    publish({ready:true,playing:false,position:0});apply(latest);
    stopPoll();poll=setInterval(()=>refresh(),pollIntervalMs);poll.unref?.();
  }
  function beginLoad(request,{initial=false}={}) {
    if(!request||destroyed)return;
    ready=false;loading=request;snapshot++;pendingReads.clear();stopPoll();clearLoadTimer();clearPlayTimer();
    publish({ready:false,playing:false,playbackBlocked:false});
    loadTimer=setTimeout(()=>fail(new Error('SoundCloud did not respond. You can try again or open the playlist on SoundCloud.')),timeoutMs);loadTimer.unref?.();
    if(initial){
      iframe.src=widgetURL(request.source,{index:request.index});
      widget=api.Widget(iframe);
      const bind=(name,handler)=>{const event=api.Widget.Events[name];widget.bind(event,handler);bindings.push(event);};
      bind('READY',()=>finishLoad(loading));
      bind('PLAY',()=>{if(ready){clearPlayTimer();publish({playing:true,finished:false,playbackBlocked:false});refresh();}});
      bind('PAUSE',()=>{if(ready){publish({playing:false});refresh();}});
      const progress=event=>{if(ready&&Number.isFinite(event?.currentPosition))publish({position:Math.max(0,event.currentPosition/1000)});};
      bind('PLAY_PROGRESS',progress);bind('SEEK',event=>{progress(event);refresh();});
      bind('FINISH',()=>{if(ready){publish({playing:false,finished:true});refresh();}});
      bind('ERROR',error=>{
        if(loading&&latest?.source!==loading.source){clearLoadTimer();loading=null;beginLoad(latest);}
        else fail(providerError(error));
      });
    }else command('load',request.source,{auto_play:false,...(isPlaylistSource(request.source)?{start_track:request.index}:{}),callback:()=>finishLoad(request)});
  }
  async function prepare() {
    if(apiRequest)return apiRequest;
    apiRequest=Promise.resolve().then(loadAPI).then(result=>{
      if(destroyed)return;
      if(typeof result?.Widget!=='function')throw new Error('The SoundCloud player could not start.');
      api=result;beginLoad(latest,{initial:true});
    }).catch(error=>{apiRequest=null;fail(error);});
    return apiRequest;
  }
  return {
    load(value,{index=0,play=true}={}) {
      if(destroyed)return Promise.resolve(false);
      const source=validateSoundCloudSource(value);
      if(!source||!Number.isInteger(index)||index<0||index>0&&!isPlaylistSource(source))return Promise.reject(new TypeError('Use a valid HTTPS SoundCloud track or playlist link and track index.'));
      settle(latest,false);revision++;snapshot++;clearPlayTimer();publish({playbackBlocked:false});
      const result=new Promise(resolve=>{latest={source,index,play:Boolean(play),resolve};});
      if(widget){if(ready&&currentSource===source)apply(latest);else if(!loading)beginLoad(latest);}
      else prepare();
      return result;
    },
    play(){snapshot++;if(latest)latest.play=true;if(ready)command('play');watchPlayback();refresh();},
    pause(){snapshot++;if(latest)latest.play=false;clearPlayTimer();publish({playbackBlocked:false});command('pause');refresh();},
    seek(seconds){if(ready&&Number.isFinite(seconds)){command('seekTo',Math.max(0,seconds)*1000);refresh();}},
    setVolume(volume){if(!Number.isFinite(volume))return;desiredVolume=Math.max(0,Math.min(100,volume));if(ready){command('setVolume',desiredVolume);refresh();}},
    skip(index,{play=true}={}) {
      if(!Number.isInteger(index)||index<0||destroyed)return;
      if(latest&&!isPlaylistSource(latest.source)){if(index===0){latest.play=Boolean(play);if(ready){command(play?'play':'pause');if(play)watchPlayback();else clearPlayTimer();refresh();}}return;}
      revision++;snapshot++;if(latest){latest.index=index;latest.play=Boolean(play);}
      if(ready){command('skip',index);command(play?'play':'pause');if(play)watchPlayback();else clearPlayTimer();refresh();}
    },
    refresh,
    destroy(){
      if(destroyed)return;
      command('pause');destroyed=true;revision++;snapshot++;pendingReads.clear();clearLoadTimer();clearPlayTimer();stopPoll();settle(latest,false);
      for(const event of bindings)widget?.unbind(event);
      iframe.src='about:blank';widget=null;latest=null;loading=null;
    },
  };
}
