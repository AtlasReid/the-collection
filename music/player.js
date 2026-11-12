import { createImportLibrary } from './import-library.js';
import { createInterfaceState } from './interface-state.js';
import { createDialogs } from './dialogs.js';
import { createHelpViewer } from './help-viewer.js';
import { createWindowManager } from './window-manager.js';
import { createSoundCloudTransport,validateSoundCloudSource } from './soundcloud-transport.js';
import { createSoundCloudWindow } from './soundcloud-window.js';
import { createBandcampWindow,bandcampEmbedURL } from './bandcamp-window.js';
import { createMusicWindow } from './music-window.js';
import { windowControlIcon } from './window-control-icons.js';
import { createDesktopMenu } from './desktop-menu.js';
import { createDesktopPanels } from './desktop-panels.js';
import { createSystemSettings } from './system-settings.js';
import { renderArtistBrowser } from './artist-browser.js';

// Operable software study: imports remember catalogue IDs, not audio files.
const ICONS = {
  external:'<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  play:'<path d="m7 3 12 9-12 9Z"/>',
  pause:'<path d="M6 3h4v18H6zm8 0h4v18h-4z"/>',
  previous:'<path d="M4 4h3v16H4zm15 0v16L8 12Z"/>',
  next:'<path d="M17 4h3v16h-3zM5 4l11 8-11 8Z"/>',
  shuffle:'<path d="m17 3 4 4-4 4V8h-2c-3 0-4 10-8 10H3v-2h4c3 0 4-10 8-10h2zm0 10 4 4-4 4v-3h-2c-2 0-3-2-4-4l1-2c1 2 2 4 3 4h2zM3 6h4c2 0 3 2 4 4l-1 2C9 10 8 8 7 8H3z"/>',
  repeat:'<path d="m17 2 5 5-5 5V8H6v5H4V8a2 2 0 0 1 2-2h11zM7 22l-5-5 5-5v4h11v-5h2v5a2 2 0 0 1-2 2H7z"/>',
  eject:'<path d="m12 4 9 11H3zM3 18h18v3H3z"/>',
  volume:'<path d="M3 9h4l5-5v16l-5-5H3zm12-3a8 8 0 0 1 0 12v-3a5 5 0 0 0 0-6z"/>',
  muted:'<path d="M3 9h4l5-5v16l-5-5H3z"/><path d="m16 9 6 6m0-6-6 6" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  home:'<path d="m3 11 9-8 9 8v10h-7v-7h-4v7H3Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
  grid:'<path d="M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  radio:'<circle cx="12" cy="12" r="2"/><path d="M8 8a6 6 0 0 0 0 8m8-8a6 6 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  artist:'<path d="m9 10 5 5 6-6a3.5 3.5 0 0 0-5-5Zm1 3-7 8m4-4 3 3m3-6v8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  star:'<path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3-4.6-4.5 6.4-.9Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  store:'<path d="M4 8h16v13H4Zm4 0V6a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
  lyrics:'<path d="M4 3h16v14h-8l-5 4v-4H4Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M7 7h4v4H9l-2 2V7Zm6 0h4v4h-2l-2 2V7Z"/>',
  queue:'<path d="M8 5h13M8 12h13M8 19h13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="3" cy="5" r="1.5"/><circle cx="3" cy="12" r="1.5"/><circle cx="3" cy="19" r="1.5"/>',
  music:'<path d="M9 3h12v13a4 4 0 1 1-2-3.5V7h-8v11a4 4 0 1 1-2-3.5z"/>',
  disc:'<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  albums:'<path d="M5 3h14v2H5zM3 7h18v14H3zm2 2v10h14V9z"/>',
  recent:'<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 6h2v6l4 2-1 2-5-3z"/>',
  video:'<rect x="3" y="5" width="13" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m16 10 5-3v10l-5-3Z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  search:'<circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m15 15 6 6" stroke="currentColor" stroke-width="1.6"/>',
  settings:'<path d="m10 3.5-.6 2.1-1.6.9-2.1-.5-2 3.4 1.5 1.6v1.9l-1.5 1.5 2 3.5 2.1-.5 1.6.9.6 2.2h4l.6-2.2 1.6-.9 2.1.5 2-3.5-1.5-1.5v-1.9l1.5-1.6-2-3.4-2.1.5-1.6-.9-.6-2.1Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/>',
  help:'<path d="M9 7.7a3 3 0 0 1 5.9.8c0 2.2-3 2.5-3 4.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.4" r="1" fill="currentColor"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]||''}</svg>`;
const formatTime = value => `${Math.floor(Math.max(0,value)/60)}:${String(Math.floor(Math.max(0,value)%60)).padStart(2,'0')}`;

export function validatedSoundCloudURL(value) {
  if(typeof value!=='string'||!value)return null;
  try {
    const embed=new URL(value),source=new URL(embed.searchParams.get('url'));
    if(embed.protocol!=='https:'||embed.hostname!=='w.soundcloud.com'||embed.port||embed.username||embed.password||embed.pathname!=='/player/'||source.protocol!=='https:'||!['soundcloud.com','api.soundcloud.com'].includes(source.hostname)||source.username||source.password||source.port)return null;
    embed.searchParams.set('auto_play','false');return embed.href;
  }catch{return null;}
}

export function validatedAppleMusicURL(value) {
  if(typeof value!=='string'||!value||value.length>2048)return null;
  try {
    const url=new URL(value);
    if(url.protocol!=='https:'||url.hostname!=='music.apple.com'||url.port||url.username||url.password||!/^\/[a-z]{2}\/(?:album|song)\/[^/]+\/[1-9]\d*\/?$/.test(url.pathname))return null;
    const track=url.searchParams.get('i');
    if(track!==null&&!/^[1-9]\d*$/.test(track))return null;
    url.search='';url.hash='';if(track)url.searchParams.set('i',track);
    return url.href;
  }catch{return null;}
}

// Apple catalogue entries may have only a subset of verified SoundCloud
// recordings. Never substitute an album playlist for an unmatched song or
// silently start the demo clock. Existing fixture albums keep their demo path.
export function playbackSource(item) {
  if(!item?.album||!item?.track)return {kind:'none',url:null};
  const {album,track}=item;
  const appleMusicURL=validatedAppleMusicURL(track.appleMusicURL)||validatedAppleMusicURL(album.appleMusicURL);
  const appleCatalogue=Boolean(album.appleMusicURL||track.appleMusicURL);
  const bandcamp=bandcampEmbedURL(album,track);
  if(bandcamp)return {kind:'bandcamp',url:bandcamp,appleMusicURL};
  let soundcloud=Number.isSafeInteger(track.soundcloudId)&&track.soundcloudId>0?`https://api.soundcloud.com/tracks/${track.soundcloudId}`:validateSoundCloudSource(track.soundcloudURL);
  if(!soundcloud&&!appleCatalogue)soundcloud=validateSoundCloudSource(album.soundcloudPlaylist);
  if(!soundcloud){const embed=validatedSoundCloudURL(track.soundcloudEmbed);if(embed)soundcloud=validateSoundCloudSource(new URL(embed).searchParams.get('url'));}
  if(soundcloud&&appleCatalogue&&/^\/(?:playlists\/|[^/]+\/sets\/)/.test(new URL(soundcloud).pathname))soundcloud=null;
  if(soundcloud)return {kind:'soundcloud',url:soundcloud,appleMusicURL};
  if(appleCatalogue) {
    const query=[track.artist||album.artist,track.title||album.title].filter(value=>typeof value==='string'&&value.trim()).map(value=>value.trim()).join(' ').slice(0,500);
    const search=new URL('https://soundcloud.com/search');if(query)search.searchParams.set('q',query);
    return {kind:'external',url:appleMusicURL,appleMusicURL,soundcloudSearchURL:query?search.href:null};
  }
  return {kind:'demo',url:null};
}

export function createPlayer(root,{albums=[],onEject=()=>{},onNotice=()=>{},onLibraryChange=()=>{},storage,windowHost=root,musicWindow=null,menuBar=null,graphicsPreferences=null,graphicsContext='desktop',windowInsets={top:0,right:0,bottom:54,left:0}}={}) {
  const catalogue=new Map(albums.map(album=>[album.id,album]));
  const library=createImportLibrary({catalog:albums,...(storage===undefined?{}:{storage})});
  const preferences=createInterfaceState({catalog:albums,...(storage===undefined?{}:{storage})});
  root.classList.add('itunes');
  root.setAttribute('aria-label','Music');
  root.innerHTML=`
    <div class="it-workspace">
      <header class="it-toolbar">
        <div class="it-window-controls" role="group" aria-label="Music window controls"><button type="button" data-action="window-close" class="it-window-close" aria-label="Close Music" title="Close Music">${windowControlIcon('close')}</button><button type="button" data-action="window-minimize" class="it-window-minimize" aria-label="Minimize Music" title="Minimize Music">${windowControlIcon('minimize')}</button><button type="button" data-action="window-maximize" class="it-window-maximize" aria-label="Maximize Music" title="Maximize Music">${windowControlIcon('maximize')}</button></div>
        <div class="it-transport"><button type="button" data-action="shuffle" class="it-icon-button" aria-label="Shuffle" aria-pressed="false">${icon('shuffle')}</button><button type="button" data-action="previous" class="it-icon-button" aria-label="Previous track">${icon('previous')}</button><button type="button" data-action="play" class="it-play" aria-label="Play demo">${icon('play')}</button><button type="button" data-action="next" class="it-icon-button" aria-label="Next track">${icon('next')}</button><button type="button" data-action="repeat" class="it-icon-button" aria-label="Repeat album" aria-pressed="false">${icon('repeat')}</button></div>
        <div class="it-now-playing"><div class="it-now-title">Music</div><div class="it-now-artist">Your compact disc library</div><div class="it-seek-line"><span data-time="elapsed">0:00</span><input data-input="seek" type="range" min="0" max="100" value="0" aria-label="Demo track position"><span data-time="duration">0:00</span></div></div>
        <div class="it-volume"><button type="button" data-action="mute" class="it-icon-button" aria-label="Mute demo" aria-pressed="false">${icon('volume')}</button><input data-input="volume" type="range" min="0" max="100" value="65" aria-label="Demo volume"></div>
      </header>
      <div class="it-body">
        <aside class="it-sidebar" aria-label="Music sources">
          <label class="it-search-label"><span aria-hidden="true">⌕</span><input type="search" data-input="search" placeholder="Search" aria-label="Search music"></label>
          <p>Library</p>
          <button type="button" class="it-source" data-action="recent">${icon('recent')}<span>Recently Added</span></button>
          <button type="button" class="it-source" data-action="library">${icon('albums')}<span>Albums</span></button>
          <button type="button" class="it-source" data-action="songs">${icon('music')}<span>Songs</span></button>
          <p>Devices</p>
          <button type="button" class="it-source" data-action="disc">${icon('disc')}<span class="it-device-name">Audio CD</span></button>
          <div class="it-side-status"><span>Demo library</span><progress max="100" value="0" aria-label="Demo CD import progress" hidden></progress></div>
        </aside>
        <section class="it-main" aria-label="Music library">
          <div class="it-library-view"><header class="it-library-heading"><h2>Albums</h2><small></small></header><div class="it-library-grid"></div><div class="it-library-empty"><strong>Your library starts with a CD.</strong><p>Choose a disc from the shelf, then import its songs.</p></div></div>
          <div class="it-disc-view" hidden>
            <div class="it-album-heading"><img class="it-album-cover" alt=""><div class="it-album-text"><h2>Audio CD</h2><p class="it-album-artist"></p><p class="it-album-meta"></p></div><div class="it-album-actions"><button type="button" data-action="library" class="it-silver-button it-back-button" hidden>Albums</button><button type="button" data-action="info" class="it-silver-button">CD Info</button><button type="button" data-action="import" class="it-silver-button">Import CD</button><button type="button" data-action="eject" class="it-silver-button it-eject" aria-label="Eject CD">${icon('eject')}</button></div></div>
            <div class="it-track-head"><span>#</span><span class="it-import-column"></span><span class="it-import-column">✓</span><span>Title</span><span>Time</span><span>Artist</span><span>Album</span><span>Genre</span></div>
            <div class="it-track-list" aria-label="Tracks"></div><div class="it-empty" hidden>No matching songs</div>
            <div class="it-import-status" hidden><span></span><progress max="100" value="0" aria-label="Import progress"></progress></div>
          </div>
          <div class="it-hosted-player" hidden><div><span>SoundCloud · use the controls below</span><button type="button" data-action="close-embed" aria-label="Close SoundCloud player">×</button></div><div class="it-embed-mount"></div></div>
        </section>
      </div>
      <footer class="it-statusbar"><span class="it-status" role="status">Demo library · saved on this device</span><span class="it-count">0 albums</span></footer>
    </div>
    <div class="it-modal-layer" hidden>
      <div class="it-import-dialog" role="alertdialog" aria-modal="true" aria-label="Import audio CD">
        <div class="it-dialog-icon">${icon('music')}</div><h3></h3><p>Add the selected songs to your music library.</p>
        <label><input type="checkbox" data-input="do-not-ask"> Do not ask me again</label>
        <div class="it-dialog-actions"><button type="button" data-action="decline">No</button><button type="button" data-action="confirm">Yes</button></div>
      </div>
      <div class="it-info-dialog" role="dialog" aria-modal="true" aria-label="CD information" hidden><h3>CD Info</h3><div class="it-info-content"></div><div class="it-dialog-actions"><button type="button" data-action="close-dialog">Done</button></div></div>
    </div>`;

  const find=selector=>root.querySelector(selector),button=action=>find(`[data-action="${action}"]`);
  const search=find('[data-input="search"]'),seek=find('[data-input="seek"]'),list=find('.it-track-list');
  find('.it-modal-layer').remove();
  const workspace=find('.it-workspace');
  const titlebar=document.createElement('header');titlebar.className='it-music-titlebar';titlebar.append(find('.it-window-controls'));workspace.append(titlebar);
  if(windowHost===root)root.classList.add('it-desktop-inline');
  find('.it-hosted-player').remove();
  const windows=createWindowManager(windowHost);
  let syncMusicWindow=()=>{};
  const musicControl=createMusicWindow({host:windowHost,element:musicWindow||workspace,handle:titlebar,windows,insets:windowInsets,onChange:()=>syncMusicWindow()});
  const help=createHelpViewer(root,{host:windowHost,windows});
  const dialogs=createDialogs(root,{onHelp:()=>help.open('import')});
  const make=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const info=album=>album?{...album,...preferences.metadataFor(album.id)}:null;
  const source=(action,label,graphic)=>{const control=make('button','it-source');control.type='button';control.dataset.action=action;control.innerHTML=icon(graphic);control.append(make('span','',label));return control;};
  const sidebar=find('.it-sidebar'),nav=make('div','it-sources');
  nav.append(...sidebar.children);sidebar.append(nav);sidebar.append(find('.it-side-status'));
  const online=make('div','it-online-sources');online.append(source('search','Search','search'),source('home','Home','home'),source('new','New','grid'),source('radio','Radio','radio'),source('videos','Videos','video'));
  find('.it-search-label').after(online);
  button('recent').after(source('artists','Artists','artist'));
  button('songs').after(source('favourites','Favourite Songs','star'));
  button('disc').before(make('p','','Store'),source('store','iTunes Store','store'));
  button('disc').before([...nav.querySelectorAll('p')].find(node=>node.textContent==='Devices'));
  const tools=make('div','it-window-tools');
  for(const [action,label]of [['settings','Import settings'],['help','Music Help']]){const control=make('button','it-window-tool');control.innerHTML=icon(action);control.type='button';control.dataset.action=action;control.setAttribute('aria-label',label);control.title=label;tools.append(control);}titlebar.append(tools);
  const actions=find('.it-album-actions');
  const appleMusicLink=make('a','it-silver-button it-apple-music-link','Apple Music');appleMusicLink.target='_blank';appleMusicLink.rel='noopener noreferrer';appleMusicLink.hidden=true;actions.prepend(appleMusicLink);
  const playbackNote=make('p','it-album-playback-note');playbackNote.hidden=true;find('.it-album-text').append(playbackNote);
  for(const [action,label,text]of [['disc-options','CD track names','⚙'],['album-options','Album options','•••']]){const control=make('button','it-silver-button',text);control.type='button';control.dataset.action=action;control.setAttribute('aria-label',label);actions.insertBefore(control,button('eject'));}
  const offline=make('div','it-offline-view');offline.hidden=true;offline.innerHTML='<span aria-hidden="true">⌁</span><h2></h2><p></p><button type="button" data-action="retry" class="it-silver-button">Try Again</button><button type="button" data-action="help" class="it-text-button">Open Help</button>';find('.it-main').append(offline);
  const browse=make('div','it-browse-view');browse.hidden=true;find('.it-main').append(browse);
  const artistView=make('div','it-artist-view');artistView.hidden=true;find('.it-main').append(artistView);
  const panel=make('aside','it-inspector');panel.hidden=true;panel.innerHTML=`<header><strong></strong><button type="button" data-action="close-inspector" aria-label="Close side panel">${windowControlIcon('close')}</button></header><div class="it-inspector-content"></div>`;find('.it-body').append(panel);
  const playerTools=make('div','it-player-tools');
  for(const [action,label]of [['lyrics','Lyrics'],['queue','Playing next']]){const control=make('button','it-icon-button');control.innerHTML=icon(action);control.type='button';control.dataset.action=action;control.setAttribute('aria-label',label);control.setAttribute('aria-pressed','false');playerTools.append(control);}find('.it-toolbar').append(playerTools);
  let inserted=null,displayAlbum=null,view='library',queue=[],selectedIndex=0;
  let playing=false,elapsed=0,playbackTimer=null,lastTick=0,shuffle=false,repeat=false,repeatOne=false;
  let importJob=null,importTimer=null,checkedTracks=new Set(),embedTrackId=null,destroyed=false;
  let storageWarningShown=false,menu=null,menuTrigger=null,inspector=null,activityBody=null,selectedArtist='';
  let lastVolume=65;
  let soundcloudTransport=null,soundcloudAlbum=null,soundcloudTrack=null,soundcloudSource=null,hostedBusy=false,hostedReady=false,hostedBlocked=false,hostedDuration=0,playRequest=0,unknownHostedTrack=false;
  let bandcampAlbum=null,bandcampTrack=null;
  const explainedAlbums=new Set();
  const desktopPanels=createDesktopPanels({host:windowHost,windows,onCommand:desktopCommand});
  const systemSettings=graphicsPreferences?createSystemSettings({host:windowHost,windows,store:graphicsPreferences,context:graphicsContext}):null;
  const desktopMenu=menuBar?createDesktopMenu({bar:menuBar,host:windowHost,onCommand:desktopCommand,
    getState:()=>({playing,externalPlayback:externalControls(activeItem()),hasTrack:Boolean(activeItem())&&!hostedBusy,hasDisc:Boolean(inserted),importing:Boolean(importJob),shuffle,repeat:repeatOne?'one':repeat?'all':'off',windowState:musicControl.state,view,modalOpen:dialogs.isOpen})}):null;
  const soundcloudWindow=createSoundCloudWindow({host:windowHost,windows,onClose:()=>pausePlayback(),onHelp:()=>help.open('soundcloud'),onMusic:()=>musicControl.raise(),onFocus:()=>soundcloudTransport?.refresh()});
  const bandcampWindow=createBandcampWindow({host:windowHost,windows,onClose:()=>{notice('Bandcamp player closed · playback stopped');updateTransport();},onHelp:()=>help.open('bandcamp'),onMusic:()=>musicControl.raise()});
  const switcher=make('nav','it-window-switcher');switcher.setAttribute('aria-label','Desktop dock');
  const switchButtons={};
  for(const [name,label]of [['music','Music'],['soundcloud','SoundCloud'],['bandcamp','Bandcamp'],['help','Help']]){const control=make('button','',label);control.type='button';control.setAttribute('aria-label',`Show ${label} window`);switchButtons[name]=control;switcher.append(control);}
  switchButtons.soundcloud.hidden=true;switchButtons.bandcamp.hidden=true;
  switchButtons.music.classList.add('it-dock-app');
  switchButtons.music.innerHTML=`<span class="it-dock-icon" aria-hidden="true">${icon('music')}</span><span>Music</span><span class="it-dock-indicator" aria-hidden="true"></span>`;
  syncMusicWindow=()=>{
    const state=musicControl.state,maximized=musicControl.maximized;
    root.dataset.windowState=state;switchButtons.music.dataset.windowState=state;
    switchButtons.music.setAttribute('aria-expanded',String(state!=='minimized'&&state!=='closed'));
    switchButtons.music.title=state==='minimized'?'Restore Music':state==='closed'?'Open Music':'Show Music';
    const zoom=button('window-maximize'),graphic=maximized?'restore':'maximize';
    zoom.setAttribute('aria-label',maximized?'Restore Music size':'Maximize Music');zoom.title=maximized?'Restore Music size':'Maximize Music';
    zoom.setAttribute('aria-pressed',String(maximized));
    if(zoom.dataset.icon!==graphic){zoom.innerHTML=windowControlIcon(graphic);zoom.dataset.icon=graphic;}
  };
  syncMusicWindow();
  switchButtons.music.addEventListener('click',()=>musicControl.raise());
  switchButtons.soundcloud.addEventListener('click',()=>{if(soundcloudAlbum){soundcloudWindow.open({album:soundcloudAlbum,track:activeItem()?.track});soundcloudTransport?.refresh();}});
  switchButtons.bandcamp.addEventListener('click',()=>{if(bandcampAlbum)bandcampWindow.open({album:info(bandcampAlbum),track:bandcampTrack});});
  switchButtons.help.addEventListener('click',()=>help.open(bandcampSource(activeItem())?'bandcamp':soundcloudAlbum?'soundcloud':'welcome'));
  windowHost.append(switcher);
  function hostedSource(item){
    const source=playbackSource(item);return source.kind==='soundcloud'?source.url:null;
  }
  function bandcampSource(item){return item?bandcampEmbedURL(item.album,item.track):null;}
  function linkOnly(item){return playbackSource(item).kind==='external';}
  function externalControls(item){return Boolean(bandcampSource(item))||linkOnly(item);}
  function closeBandcamp(){bandcampWindow.close();bandcampAlbum=null;bandcampTrack=null;switchButtons.bandcamp.hidden=true;}
  function trackDuration(){return hostedSource(activeItem())&&hostedDuration?hostedDuration:activeItem()?.track.duration||0;}
  function updateVolume(){const external=externalControls(activeItem());button('mute').disabled=external;find('[data-input="volume"]').disabled=external;const muted=Number(find('[data-input="volume"]').value)===0,provider=hostedSource(activeItem())?'SoundCloud':'demo',graphic=muted?'muted':'volume',control=button('mute');if(control.dataset.icon!==graphic){control.innerHTML=icon(graphic);control.dataset.icon=graphic;}control.setAttribute('aria-pressed',String(muted));control.setAttribute('aria-label',external?'Volume controlled on the external site':`${muted?'Unmute':'Mute'} ${provider}`);find('[data-input="volume"]').setAttribute('aria-label',external?'Volume controlled on the external site':`${provider==='demo'?'Demo':'SoundCloud'} volume`);}

  function notice(message){find('.it-status').textContent=message;onNotice(message);}
  function stopPlaybackTimer(){if(playbackTimer!==null)clearInterval(playbackTimer);playbackTimer=null;}
  function closeEmbed(){playRequest++;const hadTransport=Boolean(soundcloudTransport);soundcloudTransport?.destroy();soundcloudTransport=null;if(hadTransport&&!destroyed)soundcloudWindow.resetFrame();soundcloudWindow.close();soundcloudAlbum=null;soundcloudTrack=null;soundcloudSource=null;hostedBusy=false;hostedReady=false;hostedDuration=0;embedTrackId=null;switchButtons.soundcloud.hidden=true;}
  function activeItem(){return queue[selectedIndex];}
  function savedAlbums(){return library.records().map(record=>({record,album:catalogue.get(record.albumId)})).filter(item=>item.album);}
  function libraryChanged(){onLibraryChange({albumCount:savedAlbums().length,persistent:library.persistent});}
  function visibleRows(){
    if(view==='disc')return (inserted?.tracks||[]).map(track=>({album:inserted,track}));
    if(view==='album')return (displayAlbum?.tracks||[]).filter(track=>library.tracksFor(displayAlbum.id).has(track.id)).map(track=>({album:displayAlbum,track}));
    if(view==='songs'||view==='favourites')return savedAlbums().flatMap(({album,record})=>album.tracks.filter(track=>record.trackIds.includes(track.id)&&(view!=='favourites'||preferences.isFavourite(track.id))).map(track=>({album,track})));
    return [];
  }
  function importableTracks(){return inserted?.tracks.filter(track=>checkedTracks.has(track.id)&&!library.tracksFor(inserted.id).has(track.id))||[];}
  function updateTransport(){
    const item=activeItem(),track=item?.track,hosted=Boolean(hostedSource(item)),unmatched=linkOnly(item),external=externalControls(item),duration=trackDuration();
    // Progress events arrive while a pointer click is in flight. Keep the SVG
    // node stable until the icon actually changes, so mouseup still targets it.
    const playIcon=external?'external':playing?'pause':'play',playButton=button('play');
    if(playButton.dataset.icon!==playIcon){playButton.innerHTML=icon(playIcon);playButton.dataset.icon=playIcon;}
    button('play').setAttribute('aria-label',unmatched?'Open in Apple Music':external?'Open Bandcamp player':hosted?(playing?'Pause SoundCloud':'Play on SoundCloud'):playing?'Pause demo':'Play demo');
    find('.it-now-title').textContent=track?.title||'Music';
    find('.it-now-artist').textContent=item?unmatched?`${item.track.artist||info(item.album).artist} · Not yet matched on SoundCloud`:external?`${info(item.album).artist} · Controls in Bandcamp`:`${info(item.album).artist} — ${info(item.album).title}`:'Your compact disc library';
    find('[data-time="elapsed"]').textContent=external?'—':formatTime(elapsed);find('[data-time="duration"]').textContent=formatTime(duration);
    seek.max=String(duration||1);seek.value=String(Math.min(elapsed,duration));seek.disabled=!track||external||hosted&&(!hostedReady||hostedBusy);
    seek.setAttribute('aria-label',unmatched?'No playback connected for this track':external?'Position controlled in Bandcamp':hosted?'SoundCloud track position':'Demo track position');
    for(const action of ['play','previous','next'])button(action).disabled=!track;
    button('play').disabled=!track||hostedBusy;
    for(const action of ['previous','next','shuffle','repeat'])button(action).disabled=external||(!track&&['previous','next'].includes(action));
    root.dataset.playing=String(playing);root.dataset.audioSource=unmatched?'external':external?'bandcamp':hosted?'soundcloud':'demo';updateVolume();
    button('eject').disabled=!inserted;
    button('import').disabled=!inserted||(!importJob&&!checkedTracks.size);
    button('import').textContent=importJob?'Stop Importing':'Import CD';
    for(const row of list.children){
      const current=item&&row.dataset.albumId===item.album.id&&row.dataset.trackId===track.id;
      row.classList.toggle('is-selected',Boolean(current));
      row.querySelector('.it-song-button').setAttribute('aria-current',current?'true':'false');
      row.querySelector('.it-track-number').textContent=current&&playing?'▸':row.dataset.number;
    }
  }
  function renderLibrary(){
    const grid=find('.it-library-grid');grid.replaceChildren();
    const query=search.value.trim().toLocaleLowerCase();
    let entries=savedAlbums().map(item=>({...item,album:info(item.album)}));if(view!=='recent')entries.sort((a,b)=>a.album.title.localeCompare(b.album.title));
    if(view==='artists'){
      const filtered=entries.filter(({album})=>!query||`${album.title} ${album.artist}`.toLocaleLowerCase().includes(query));
      renderArtistBrowser({container:artistView,entries:filtered,selectedArtist,onSelect:name=>{selectedArtist=name;renderLibrary();},onAlbum:album=>{displayAlbum=album;view='album';search.value='';render();}});
      const artistCount=new Set(filtered.map(({album})=>album.artist)).size;
      find('.it-count').textContent=`${artistCount} ${artistCount===1?'artist':'artists'} · ${filtered.length} ${filtered.length===1?'album':'albums'}`;return;
    }
    let matches=0;
    for(const {album,record} of entries){
      if(query&&!`${album.title} ${album.artist}`.toLocaleLowerCase().includes(query))continue;
      matches++;
      const card=document.createElement('button');card.type='button';card.className='it-album-card';card.dataset.action='library-album';card.dataset.albumId=album.id;
      card.setAttribute('aria-label',`Open ${album.title}, ${record.trackIds.length} imported ${record.trackIds.length===1?'song':'songs'}`);
      const image=document.createElement('img');image.src=album.cover;image.alt='';image.draggable=false;
      const title=document.createElement('strong');title.textContent=album.title;
      const artist=document.createElement('span');artist.textContent=album.artist;
      const count=document.createElement('small');count.textContent=record.trackIds.length===album.tracks.length?`${record.trackIds.length} songs`:`${record.trackIds.length} of ${album.tracks.length} songs imported`;
      card.append(image,title,artist,count);grid.append(card);
    }
    find('.it-library-heading h2').textContent=view==='recent'?'Recently Added':view==='artists'?'Artists':'Albums';
    find('.it-library-heading small').textContent=`${entries.length} ${entries.length===1?'album':'albums'}`;
    const empty=find('.it-library-empty');empty.hidden=matches>0;
    empty.querySelector('strong').textContent=entries.length?'No matching albums.':'Your library starts with a CD.';
    empty.querySelector('p').textContent=entries.length?'Try another search.':'Choose a disc from the shelf, then import its songs.';
  }
  function browseAlbum(album){
    if(library.tracksFor(album.id).size){displayAlbum=album;view='album';search.value='';render();return;}
    dialogs.open({title:album.title,description:`${album.artist} · ${album.tracks.length} songs. Load this album's CD to import its entries into your library.`,buttons:[{label:'OK',value:'ok',primary:true}],help:true});
  }
  function renderBrowse(){
    browse.replaceChildren();
    const labels={home:'Home',new:'New',radio:'Radio',videos:'Videos',search:'Search'};
    const heading=make('header','it-browse-heading');heading.append(make('h2','',labels[view]),make('span','','The Collection'));browse.append(heading);
    const hero=make('section',`it-browse-hero it-browse-${view}`);
    const titles={home:'A little room for your music.',new:'Something to discover.',radio:'A station of your own.',videos:'Music in motion.',search:'Find your next favourite.'};
    const descriptions={home:'Your albums, one compact disc at a time.',new:'Explore the example albums on this virtual desk.',radio:'Explore radio and listening in the Music guide.',videos:'A quiet preview of the video corner of Music.',search:'Search the albums and tracks in this collection.'};
    hero.append(make('small','','MUSIC'),make('h3','',titles[view]),make('p','',descriptions[view]));
    const learn=make('button','it-browse-learn','Explore Music');learn.type='button';learn.addEventListener('click',()=>help.open('get-music'));hero.append(learn);browse.append(hero);
    if(view==='videos'){
      const blank=make('div','it-browse-note');blank.append(make('strong','','No videos in this collection'),make('p','','Your imported songs and favourites are still in Library.'));
      const guide=make('button','it-text-button','About Apple Music videos');guide.type='button';guide.addEventListener('click',()=>desktopPanels.open('subscription'));blank.append(guide);browse.append(blank);return;
    }
    if(view==='radio'){
      const stations=make('div','it-browse-stations');
      for(const [name,page]of [['Apple Music Radio','subscription'],['Your music, everywhere','library'],['Playing your collection','playback']]){
        const station=make('button','it-station-card',name);station.type='button';station.append(make('small','','Open the guide →'));station.addEventListener('click',()=>help.open(page));stations.append(station);
      }
      browse.append(stations,make('p','it-browse-caption','Radio is a service preview. No live station is playing.'));return;
    }
    const query=search.value.trim().toLocaleLowerCase();
    const entries=(view==='home'&&savedAlbums().length?savedAlbums().map(({album})=>album):albums).filter(album=>!query||`${album.title} ${album.artist} ${album.genre} ${album.tracks.map(track=>track.title).join(' ')}`.toLocaleLowerCase().includes(query));
    browse.append(make('h3','it-browse-section-title',view==='search'?'Albums and songs':view==='home'&&savedAlbums().length?'From your library':'Explore the collection'));
    const grid=make('div','it-browse-grid');
    for(const album of entries){
      const card=make('button','it-browse-album');card.type='button';card.setAttribute('aria-label',`Browse ${album.title}`);
      const image=make('img');image.src=album.cover;image.alt='';image.draggable=false;
      card.append(image,make('strong','',album.title),make('span','',album.artist));card.addEventListener('click',()=>browseAlbum(album));grid.append(card);
    }
    if(!entries.length)grid.append(make('p','','No matching albums or songs. Try another search.'));
    browse.append(grid,make('p','it-browse-caption','Familiar scenery, homemade furniture. Apple Music has its own front door; this one leads to Help.'));
  }
  function renderTracks(){
    list.replaceChildren();const rows=visibleRows(),query=search.value.trim().toLocaleLowerCase(),deviceView=view==='disc';let matches=0;
    for(const column of find('.it-track-head').querySelectorAll('.it-import-column'))column.hidden=!deviceView;
    rows.forEach(({album:original,track},index)=>{
      const album=info(original);
      if(query&&!`${track.title} ${track.artist||album.artist} ${album.title} ${album.genre}`.toLocaleLowerCase().includes(query))return;
      matches++;const imported=library.tracksFor(album.id).has(track.id);
      const importing=deviceView&&importJob?.album.id===album.id&&importJob.tracks[importJob.index]?.id===track.id;
      const row=document.createElement('div');row.className='it-track-row';row.classList.toggle('is-imported',deviceView&&imported);row.classList.toggle('is-importing',Boolean(importing));
      Object.assign(row.dataset,{albumId:album.id,trackId:track.id,number:String(index+1)});
      const number=document.createElement('span');number.className='it-track-number';
      row.append(number);
      if(deviceView){
        const mark=document.createElement('span');mark.className='it-track-import-state';mark.setAttribute('role','img');mark.setAttribute('aria-label',importing?'Importing':imported?'Imported':'Not imported');mark.title=importing?'Importing':imported?'Imported':'';
        const check=document.createElement('input');check.type='checkbox';check.className='it-track-check';check.dataset.trackId=track.id;check.checked=checkedTracks.has(track.id);check.disabled=Boolean(importJob);check.setAttribute('aria-label',`Include ${track.title} in ${original.appleMusicURL?'catalogue':'demo'} import`);
        row.append(mark,check);
      }
      const source=playbackSource({album:original,track});row.dataset.playbackSource=source.kind;
      const song=document.createElement('button');song.type='button';song.className='it-song-button';song.dataset.action='track';song.dataset.index=String(index);song.textContent=track.title;song.setAttribute('aria-label',source.kind==='external'?`Open ${track.title} in Apple Music`:source.kind==='bandcamp'?`Open ${track.title} in Bandcamp`:`Play ${track.title}${source.kind==='soundcloud'?' on SoundCloud':' demo'}`);
      const title=make('div','it-track-title'),more=make('button','it-row-more',preferences.isFavourite(track.id)?'★':'•••');more.type='button';more.dataset.action='track-options';more.dataset.index=String(index);more.setAttribute('aria-label',`Options for ${track.title}`);title.append(song,more);row.dataset.index=String(index);row.append(title);
      if(original.appleMusicURL||track.appleMusicURL)title.insertBefore(make('span','it-track-playback-source',source.kind==='soundcloud'?'SoundCloud':'Apple Music'),more);
      const appleURL=validatedAppleMusicURL(track.appleMusicURL)||validatedAppleMusicURL(original.appleMusicURL);
      if(appleURL){const link=make('a','it-track-apple-link');link.href=appleURL;link.target='_blank';link.rel='noopener noreferrer';link.innerHTML=icon('external');link.title='Open in Apple Music';link.setAttribute('aria-label',`Open ${track.title} in Apple Music (new tab)`);title.insertBefore(link,more);}
      for(const [className,text]of [['duration',formatTime(track.duration)],['artist',track.artist||album.artist],['album',album.title],['genre',album.genre]]){
        const cell=document.createElement('span');cell.className=`it-track-${className}`;cell.textContent=text;row.append(cell);
      }
      list.append(row);
    });
    find('.it-empty').hidden=matches>0;find('.it-empty').textContent=view==='favourites'&&!query?'Favourite a song from its ••• menu.':'No matching songs';
    list.setAttribute('aria-label',view==='disc'?'CD tracks':'Imported tracks');
    find('.it-count').textContent=`${rows.length} ${rows.length===1?'song':'songs'} · ${formatTime(rows.reduce((sum,item)=>sum+item.track.duration,0))}`;
    updateTransport();
  }
  function updateImportStatus(){
    const side=find('.it-side-status span'),progress=find('.it-side-status progress'),panel=find('.it-import-status');
    progress.hidden=!importJob;panel.hidden=!importJob||view!=='disc';
    if(activityBody?.isConnected){const track=importJob?.tracks[importJob.index];activityBody.querySelector('strong').textContent=track?`Importing “${track.title}”`:'No activity';activityBody.querySelector('p').textContent=track?`Demo time remaining: ${formatTime((importJob.tracks.length-importJob.index-importJob.progress)*.84)}`:'All imports have finished.';activityBody.querySelector('progress').hidden=!track;if(track)activityBody.querySelector('progress').value=(importJob.index+importJob.progress)/importJob.tracks.length*100;}
    if(!importJob){side.textContent=library.persistent?'Demo library · saved':'Demo library · this visit';return;}
    const track=importJob.tracks[importJob.index];
    const value=(importJob.index+importJob.progress)/importJob.tracks.length*100;
    side.textContent=`Importing “${track.title}”`;progress.value=value;
    panel.querySelector('span').textContent=`Importing “${track.title}”`;
    panel.querySelector('progress').value=value;
  }
  function render(){
    const entries=savedAlbums(),gridView=['library','recent'].includes(view),artistsView=view==='artists',offlineView=view==='store',browseView=['home','new','radio','videos','search'].includes(view);
    root.dataset.source=view;root.dataset.importedAlbums=String(entries.length);root.dataset.importedTracks=String(entries.reduce((sum,{record})=>sum+record.trackIds.length,0));root.dataset.discAlbum=inserted?.id||'';
    find('.it-search-label').hidden=view!=='search';
    for(const action of ['recent','library','songs','disc','artists','favourites','home','new','radio','videos','search','store']){
      const active=action===view||(view==='album'&&action==='library');
      button(action).classList.toggle('is-current',active);button(action).setAttribute('aria-pressed',String(active));
    }
    button('disc').disabled=!inserted;find('.it-device-name').textContent=info(inserted)?.title||'Audio CD';
    find('.it-library-view').hidden=!gridView;find('.it-disc-view').hidden=gridView||artistsView||offlineView||browseView;offline.hidden=!offlineView;browse.hidden=!browseView;artistView.hidden=!artistsView;
    if(browseView)renderBrowse();
    if(offlineView){offline.querySelector('h2').textContent=view==='store'?'The iTunes Store is unavailable':'You’re not connected to the internet';offline.querySelector('p').textContent=view==='store'?'There was a temporary problem completing your request. The network is down or unavailable.':'This desktop keeps its music local. Online content is currently unavailable.';}
    const current=info(view==='disc'?inserted:displayAlbum);
    find('.it-album-heading h2').textContent=view==='songs'?'Songs':view==='favourites'?'Favourite Songs':current?.title||'Audio CD';
    const cover=find('.it-album-cover');cover.hidden=!current;if(current){cover.src=current.cover;cover.alt=`${current.title}${current.soundcloudPlaylist||current.bandcampAlbumId||current.appleMusicURL?'':' mock'} album cover`;}
    find('.it-album-artist').textContent=current?.artist||'';
    const appleURL=validatedAppleMusicURL(current?.appleMusicURL);appleMusicLink.hidden=!appleURL;
    if(appleURL){appleMusicLink.href=appleURL;appleMusicLink.setAttribute('aria-label',`Open ${current.title} in Apple Music (new tab)`);}else appleMusicLink.removeAttribute('href');
    playbackNote.textContent=typeof current?.playbackNote==='string'?current.playbackNote:'';playbackNote.hidden=!playbackNote.textContent;
    const count=current?library.tracksFor(current.id).size:0;
    const metaTracks=view==='album'?visibleRows().map(item=>item.track):current?.tracks||[];
    find('.it-album-meta').textContent=current?`${metaTracks.length} ${metaTracks.length===1?'SONG':'SONGS'} · ${formatTime(metaTracks.reduce((sum,track)=>sum+track.duration,0))}${count?` · ${count===current.tracks.length?'IMPORTED':`${count} OF ${current.tracks.length} IMPORTED`}`:''}`:'Imported songs from your collection';
    button('import').hidden=view!=='disc';button('eject').hidden=view!=='disc';button('info').hidden=!current;
    button('disc-options').hidden=view!=='disc';button('album-options').hidden=!current;button('info').textContent=view==='disc'?'CD Info':'Get Info';
    find('.it-back-button').hidden=view!=='album';
    if(artistsView)renderLibrary();else if(gridView){renderLibrary();find('.it-count').textContent=`${entries.length} ${entries.length===1?'album':'albums'}`;}else if(browseView)find('.it-count').textContent='The Collection · Music preview';else if(!offlineView)renderTracks();else find('.it-count').textContent='Offline desktop';
    updateImportStatus();updateTransport();renderInspector();
  }
  function pausePlayback(){playing=false;stopPlaybackTimer();soundcloudTransport?.pause();updateTransport();}
  function closeWindow(){
    playRequest++;pausePlayback();closeEmbed();closeBandcamp();closeDialog(false);elapsed=0;updateTransport();musicControl.close();switchButtons.music.focus({preventScroll:true});
  }
  function soundcloudState(patch){
    if(destroyed||!soundcloudAlbum||activeItem()?.album.id!==soundcloudAlbum.id)return;
    if(typeof patch.streamable==='boolean')root.dataset.soundcloudStreamable=String(patch.streamable);
    if(typeof patch.policy==='string')root.dataset.soundcloudPolicy=patch.policy;
    if(Number.isFinite(patch.soundId)&&soundcloudTrack?.soundcloudId&&patch.soundId!==soundcloudTrack.soundcloudId){
      if(!unknownHostedTrack){unknownHostedTrack=true;soundcloudTransport?.pause();}
      soundcloudSource=null;embedTrackId=null;playing=false;soundcloudWindow.setStatus('SoundCloud selected a different track. Choose a listed track in Music to continue.');updateTransport();return;
    }
    if(patch.soundId===soundcloudTrack?.soundcloudId)unknownHostedTrack=false;
    if(Number.isInteger(patch.index)){
      const playlistMode=soundcloudSource===validateSoundCloudSource(soundcloudAlbum.soundcloudPlaylist);
      const track=playlistMode?soundcloudAlbum.tracks.find(entry=>entry.soundcloudIndex===patch.index):soundcloudTrack;
      if(!track){
        if(!unknownHostedTrack){unknownHostedTrack=true;soundcloudTransport?.pause();}
        soundcloudSource=null;embedTrackId=null;playing=false;soundcloudWindow.setStatus('SoundCloud selected a track outside this album. Choose a listed track in Music to continue.');updateTransport();return;
      }
      if(playlistMode)unknownHostedTrack=false;
      if(track){
        let index=queue.findIndex(item=>item.album.id===soundcloudAlbum.id&&item.track.id===track.id);
        if(index<0){queue=soundcloudAlbum.tracks.map(track=>({album:soundcloudAlbum,track}));index=queue.findIndex(item=>item.track.id===track.id);}
        if(activeItem()?.track.id!==track.id){elapsed=0;hostedDuration=0;}
        selectedIndex=index;embedTrackId=track.id;soundcloudTrack=track;
        soundcloudWindow.update?.({album:info(soundcloudAlbum),track});
      }
    }
    if(unknownHostedTrack)return;
    if(typeof patch.playing==='boolean')playing=patch.playing;
    if(typeof patch.playbackBlocked==='boolean')hostedBlocked=patch.playbackBlocked;
    if(Number.isFinite(patch.position))elapsed=patch.position;
    if(Number.isFinite(patch.duration))hostedDuration=patch.duration;
    if(Number.isFinite(patch.volume)){find('[data-input="volume"]').value=String(patch.volume);if(patch.volume)lastVolume=patch.volume;}
    if(typeof patch.ready==='boolean'){hostedReady=patch.ready;soundcloudWindow.setLoading(!patch.ready);if(patch.ready)hostedBusy=false;}
    soundcloudWindow.setStatus(playing?'Playing through SoundCloud':hostedBusy?'Connecting to SoundCloud…':hostedBlocked?'SoundCloud has not started playback. Close its optional sign-in or sign-up prompt if you prefer to listen as a guest, then try Play again. Track or browser restrictions may still apply.':'Paused · use Music or SoundCloud to play');
    switchButtons.soundcloud.textContent=playing?'SoundCloud · Playing':'SoundCloud';
    // The widget can finish immediately when it cannot start a track. Only a
    // real end-of-track position should advance Music's queue.
    if(patch.finished){
      if(elapsed>=Math.max(1,trackDuration()-2))advance(1,true);
      else {playing=false;hostedBlocked=true;soundcloudWindow.setStatus('SoundCloud has not started this track. Close its optional sign-in or sign-up prompt, then try Play again. You can also open the track on SoundCloud.');}
    }
    updateTransport();renderInspector();
  }
  async function startHostedTrack(item,play=true){
    const source=hostedSource(item);if(!source||destroyed)return;
    const ticket=++playRequest;
    if(!explainedAlbums.has(item.album.id)){
      musicControl.raise();
      const body=make('div','it-soundcloud-notice');
      body.append(make('p','',item.album.appleMusicURL?'This matched recording plays through SoundCloud. Only the tracks labelled SoundCloud are connected; the other catalogue tracks link to Apple Music. Continuing connects your browser to SoundCloud, and either window can control its player.':'This album plays through an embedded player from SoundCloud. When you continue, your browser connects to SoundCloud. You can use the controls in either window.'));
      body.append(make('p','','The first time, SoundCloud may open a sign-in or sign-up prompt. If you prefer not to sign in, close that prompt and return here. Press Play again if needed. Some tracks may still require an account or subscription.'));
      body.append(make('p','','SoundCloud may show a “Hear more on SoundCloud” screen over its own controls. You can close that screen with × to reveal them. Music’s controls remain available in this window.'));
      body.append(make('p','','This is experimental. We may change or discontinue it if a later review finds that this use does not comply with SoundCloud’s terms.'));
      const learn=make('a','it-help-inline-link','Learn more');learn.href='#soundcloud-playback';learn.addEventListener('click',event=>{event.preventDefault();help.open('soundcloud');});body.append(learn);
      const answer=await dialogs.open({title:item.album.appleMusicURL?'Play this recording through SoundCloud?':'Play this album through SoundCloud?',body,buttons:[{label:'Cancel',value:'cancel'},{label:'Continue',value:'continue',primary:true}]});
      if(destroyed||ticket!==playRequest||activeItem()!==item||answer.value!=='continue')return;
      help.close(false);explainedAlbums.add(item.album.id);
    }
    if(destroyed||ticket!==playRequest)return;
    closeBandcamp();stopPlaybackTimer();soundcloudAlbum=item.album;soundcloudTrack=item.track;unknownHostedTrack=false;hostedBlocked=false;
    soundcloudWindow.open({album:info(item.album),track:item.track});switchButtons.soundcloud.hidden=false;
    if(!soundcloudTransport){
      soundcloudTransport=createSoundCloudTransport({iframe:soundcloudWindow.iframe,onState:soundcloudState,onError:error=>{hostedBusy=false;hostedReady=false;playing=false;soundcloudSource=null;soundcloudWindow.setLoading(false);soundcloudWindow.setStatus(error.message);notice(error.message);updateTransport();}});
      soundcloudTransport.setVolume(Number(find('[data-input="volume"]').value));
    }
    if(soundcloudSource===source&&embedTrackId===item.track.id){if(play){if(elapsed===0)soundcloudTransport.seek(0);soundcloudTransport.play();}else soundcloudTransport.pause();return;}
    hostedBusy=true;playing=false;elapsed=0;hostedDuration=0;embedTrackId=item.track.id;soundcloudSource=source;
    soundcloudWindow.setLoading(true);soundcloudWindow.setStatus('Connecting to SoundCloud…');notice('SoundCloud playback · both windows control the same player');updateTransport();
    try{await soundcloudTransport.load(source,{index:source===validateSoundCloudSource(item.album.soundcloudPlaylist)?item.track.soundcloudIndex??0:0,play});}
    catch(error){if(!destroyed&&ticket===playRequest){hostedBusy=false;soundcloudSource=null;soundcloudWindow.setLoading(false);soundcloudWindow.setStatus(error.message);notice(error.message);updateTransport();}}
  }
  async function startBandcamp(item){
    if(!bandcampSource(item)||destroyed)return;
    const ticket=++playRequest;
    if(!explainedAlbums.has(item.album.id)){
      musicControl.raise();
      const body=make('div','it-soundcloud-notice');
      body.append(make('p','',`${info(item.album).title} opens in Bandcamp’s official player. Continuing connects your browser to Bandcamp. Use that window for play, pause, seeking and the album tracklist. Use your device volume to adjust loudness.`));
      body.append(make('p','','Music cannot read or control Bandcamp’s playback position. Its track selection opens the chosen song, without starting it automatically. Closing the Bandcamp window or choosing Stop ends playback.'));
      body.append(make('p','','Import saves track entries in this browser; it does not download audio. Availability and any listening limits are set by Bandcamp.'));
      const learn=make('a','it-help-inline-link','Learn more');learn.href='#bandcamp-playback';learn.addEventListener('click',event=>{event.preventDefault();help.open('bandcamp');});body.append(learn);
      const answer=await dialogs.open({title:'Open this album in Bandcamp?',body,buttons:[{label:'Cancel',value:'cancel'},{label:'Continue',value:'continue',primary:true}]});
      if(destroyed||ticket!==playRequest||activeItem()!==item||answer.value!=='continue')return;
      help.close(false);explainedAlbums.add(item.album.id);
    }
    if(destroyed||ticket!==playRequest)return;
    pausePlayback();closeEmbed();bandcampAlbum=item.album;bandcampTrack=item.track;elapsed=0;
    if(!bandcampWindow.open({album:info(item.album),track:item.track})){closeBandcamp();notice('This Bandcamp source is unavailable.');return;}
    switchButtons.bandcamp.hidden=false;notice('Bandcamp · use the controls in its player');updateTransport();renderInspector();
  }
  function showExternalListening(item) {
    const source=playbackSource(item);if(source.kind!=='external'||destroyed)return;
    pausePlayback();closeEmbed();closeBandcamp();elapsed=0;hostedDuration=0;updateTransport();
    const body=make('div','it-external-listening');
    body.append(make('p','',`“${item.track.title}” is in this catalogue, but no verified SoundCloud recording is connected to this track yet.`),make('p','','Apple Music opens the supplied source in a new tab. A SoundCloud search can help find a recording; its results are not verified matches.'));
    const links=make('div','it-external-listening-links');
    for(const [href,label]of [[source.appleMusicURL,'Open in Apple Music'],[source.soundcloudSearchURL,'Search SoundCloud']])if(href){const link=make('a','it-silver-button',label);link.href=href;link.target='_blank';link.rel='noopener noreferrer';links.append(link);}
    body.append(links,make('p','it-external-listening-note','Nothing is playing in Music. Import CD saves catalogue entries only; it does not download audio.'));
    notice('Not yet matched on SoundCloud');
    dialogs.open({title:'Not yet matched on SoundCloud',body,buttons:[{label:'Done',value:'done',primary:true}]});
  }
  function startPlayback(){
    const item=activeItem();if(!item)return;if(linkOnly(item)){showExternalListening(item);return;}if(bandcampSource(item)){startBandcamp(item);return;}closeBandcamp();if(hostedSource(item)){startHostedTrack(item);return;}
    closeEmbed();if(elapsed>=item.track.duration)elapsed=0;playing=true;lastTick=performance.now();stopPlaybackTimer();
    playbackTimer=setInterval(()=>{const now=performance.now();elapsed+=(now-lastTick)/1000;lastTick=now;if(elapsed>=activeItem().track.duration)advance(1,true);updateTransport();},250);
    notice('Demo playback · audio not connected');updateTransport();
  }
  function selectTrack(index,autoplay=true){
    const rows=visibleRows();if(index<0||index>=rows.length)return;
    playRequest++;pausePlayback();if(bandcampTrack?.id!==rows[index].track.id)closeBandcamp();queue=rows;selectedIndex=index;elapsed=0;hostedDuration=0;if(!hostedSource(activeItem()))closeEmbed();if(autoplay)startPlayback();else updateTransport();renderInspector();
  }
  function advance(direction,fromEnd=false){
    if(!queue.length||externalControls(activeItem()))return;if(direction<0&&elapsed>3&&!fromEnd){elapsed=0;if(hostedSource(activeItem()))soundcloudTransport?.seek(0);updateTransport();return;}
    const resume=playing||fromEnd;let next=selectedIndex+direction;
    if(fromEnd&&repeatOne)next=selectedIndex;
    else if(shuffle&&direction>0&&queue.length>1)next=(selectedIndex+1+Math.floor(Math.random()*(queue.length-1)))%queue.length;
    if(next>=queue.length&&fromEnd&&!repeat){elapsed=activeItem().track.duration;pausePlayback();return;}
    playRequest++;pausePlayback();selectedIndex=(next+queue.length)%queue.length;elapsed=0;hostedDuration=0;
    if(!hostedSource(activeItem()))closeEmbed();
    if(resume)startPlayback();else if(soundcloudTransport&&explainedAlbums.has(activeItem().album.id))startHostedTrack(activeItem(),false);else updateTransport();renderInspector();
  }
  function closeDialog(restore=true){
    help.close(false);dialogs.close();closeMenu(restore);
  }
  async function promptImport(){
    const album=inserted;if(!album||!importableTracks().length)return;
    const answer=await dialogs.open({title:`Would you like to import the CD “${info(album).title}” into your music library?`,description:album.appleMusicURL?'This saves the selected catalogue entries in this browser, not audio files. Verified tracks use SoundCloud; other tracks offer the Apple Music source link.':album.bandcampAlbumId?'This saves the selected track entries in this browser. Bandcamp audio is streamed in its own player; no audio files are imported.':album.soundcloudPlaylist?'This saves the selected track entries in this browser. SoundCloud audio is streamed when you play; no audio files are imported.':'',checkbox:{label:'Don’t ask again',checked:library.doNotAsk},buttons:[{label:'No',value:'no'},{label:'Yes',value:'yes',primary:true}]});
    if(destroyed||inserted!==album||!['no','yes'].includes(answer.value))return;library.setDoNotAsk(answer.checked);if(answer.value==='yes')importCD();
  }
  function field(form,label,name,value,{type='text',min,max,maxLength}={}){
    const line=make('label','it-form-row'),input=make('input');input.type=type;input.name=name;input.value=String(value??'');if(min!==undefined)input.min=String(min);if(max!==undefined)input.max=String(max);if(maxLength)input.maxLength=maxLength;line.append(make('span','',label),input);form.append(line);return input;
  }
  async function showInfo(original=view==='disc'?inserted:displayAlbum,track=null){
    if(!original)return;const album=info(original),body=make('form','it-info-form'),header=make('div','it-info-summary'),cover=make('img');cover.src=album.cover;cover.alt='';header.append(cover,make('div','',track?track.title:album.artist));body.append(header);
    const tabs=make('div','it-info-tabs'),pages=make('div'),fields={},sourceView=view,sourceInserted=inserted,sourceAlbum=displayAlbum;
    const currentContext=()=>!destroyed&&view===sourceView&&inserted===sourceInserted&&displayAlbum===sourceAlbum&&!dialogs.isOpen;
    for(const [index,name]of ['Details','Artwork','Options','Sorting'].entries()){
      const tab=make('button','',name);tab.type='button';tab.setAttribute('aria-pressed',String(index===0));const page=make('div','it-info-page');page.hidden=index!==0;
      tab.addEventListener('click',()=>{for(const child of pages.children)child.hidden=child!==page;for(const child of tabs.children)child.setAttribute('aria-pressed',String(child===tab));});tabs.append(tab);pages.append(page);
      if(name==='Details'){
        if(track)page.append(make('p','',`${track.title} · ${formatTime(track.duration)}`));
        fields.artist=field(page,'artist','artist',album.artist,{maxLength:250});fields.title=field(page,'album','title',album.title,{maxLength:250});fields.composer=field(page,'composer','composer',album.composer||'',{maxLength:250});fields.genre=field(page,'genre','genre',album.genre,{maxLength:250});fields.year=field(page,'year','year',album.year,{maxLength:4});fields.year.inputMode='numeric';fields.year.pattern='[0-9]{0,4}';
        fields.discNumber=field(page,'disc number','discNumber',album.discNumber||1,{type:'number',min:1,max:99});fields.totalDiscs=field(page,'of','totalDiscs',album.totalDiscs||1,{type:'number',min:1,max:99});
        const label=make('label','it-form-check');fields.compilation=make('input');fields.compilation.type='checkbox';fields.compilation.checked=album.compilation||false;label.append(fields.compilation,make('span','','Album is a compilation of songs by various artists'));page.append(label);
      }else if(name==='Artwork'){
        const image=make('img','it-artwork-preview');image.src=album.cover;image.alt=`${album.title} artwork`;const get=make('button','it-silver-button','Get Album Artwork');get.type='button';get.addEventListener('click',()=>dialogs.close('artwork'));page.append(image,get);
      }else if(name==='Options')page.append(make('p','','Album details and favourites are stored in this browser. This demo does not write tags or change audio files.'));
      else page.append(make('p','','Albums sort by album title. Artists sort alphabetically using the details entered here.'));
    }
    body.append(tabs,pages);let invalidField=null;
    while(!destroyed){
      // Reattach this same form after a child alert, retaining its draft and tab.
      const pending=dialogs.open({title:sourceView==='disc'?'CD Info':'Get Info',body,wide:true,icon:false,help:true,buttons:[{label:'Cancel',value:'cancel'},{label:'OK',value:'ok',primary:true}]});
      if(invalidField){const target=invalidField;invalidField=null;queueMicrotask(()=>{if(body.isConnected)target.focus({preventScroll:true});});}
      const answer=await pending;
      if(answer.value==='artwork'){
        await getArtwork();if(!currentContext())return;continue;
      }
      if(answer.value!=='ok'||destroyed)return;
      const patch=Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,key==='compilation'?input.checked:['discNumber','totalDiscs'].includes(key)?Number(input.value):input.value]));
      const invalidKey=!/^[0-9]{0,4}$/.test(patch.year)?'year':['discNumber','totalDiscs'].find(key=>!Number.isInteger(patch[key])||patch[key]<1||patch[key]>99);
      if(invalidKey){
        await dialogs.open({title:'Check the CD information.',description:'Use a year of up to four digits and disc numbers from 1 to 99.'});
        if(!currentContext())return;tabs.firstElementChild.click();invalidField=fields[invalidKey];continue;
      }
      preferences.saveMetadata(album.id,patch);render();notice(preferences.persistent?'CD information saved on this device':'CD information saved for this visit');return;
    }
  }
  async function showSettings(){
    const body=make('form','it-settings-form'),settings=preferences.settings;
    const select=(label,name,values,value)=>{const row=make('label','it-form-row'),control=make('select');control.name=name;for(const text of values){const option=make('option','',text);option.value=text;control.append(option);}control.value=value;row.append(make('span','',label),control);body.append(row);return control;};
    const encoder=select('Import Using:','encoder',['AAC Encoder','AIFF Encoder','Apple Lossless Encoder','MP3 Encoder','WAV Encoder'],settings.encoder),quality=select('Setting:','quality',['Automatic','High Quality','Custom'],settings.quality);
    const detail=make('div','it-setting-details');detail.append(make('strong','','Details'),make('p','','These settings are remembered for the simulated import. No audio is encoded.'));body.append(detail);
    const label=make('label','it-form-check'),correction=make('input');correction.type='checkbox';correction.checked=settings.errorCorrection;label.append(correction,make('span','','Use error correction when reading Audio CDs'));body.append(label,make('p','it-form-note','Use this option if you experience problems with audio quality from Audio CDs. This may reduce the speed of importing.'));
    const answer=await dialogs.open({title:'Import Settings',body,wide:true,icon:false,help:true,buttons:[{label:'Cancel',value:'cancel'},{label:'OK',value:'ok',primary:true}]});
    if(answer.value==='ok'&&!destroyed){preferences.setSettings({encoder:encoder.value,quality:quality.value,errorCorrection:correction.checked});notice('Import settings saved · simulated import only');}
  }
  function networkError(){closeMenu(false);return dialogs.open({title:'There was a temporary problem completing your request. The network is down or unavailable.',description:'Try again later.'});}
  async function getArtwork(){
    if(!preferences.settings.skipArtworkPrompt){const answer=await dialogs.open({title:'Are you sure you want to get album artwork?',description:'Look for artwork for this album online.',checkbox:{label:'Don’t ask again',checked:false},buttons:[{label:'Get Album Artwork',value:'get',primary:true},{label:'Cancel',value:'cancel'}]});if(answer.value!=='get'||destroyed)return;preferences.setSettings({skipArtworkPrompt:answer.checked});}
    if(!destroyed)await networkError();
  }
  function closeMenu(restore=true){if(!menu)return;menu.remove();menu=null;if(restore&&menuTrigger?.isConnected)menuTrigger.focus();menuTrigger=null;}
  function openMenu(anchor,items){
    closeMenu(false);menuTrigger=anchor;menu=make('div','it-popover');menu.setAttribute('role','menu');
    for(const item of items){if(!item){menu.append(make('hr'));continue;}const control=make('button','',item.label);control.type='button';control.setAttribute('role','menuitem');control.disabled=Boolean(item.disabled);control.addEventListener('click',event=>{event.stopPropagation();closeMenu();item.run();});menu.append(control);}
    root.append(menu);
    // Measure in the Music window's own layout space. Viewport rectangles lose
    // the laptop's perspective, and a single scale cannot undo that transform.
    let left=0,top=anchor.offsetHeight;
    for(let node=anchor;node&&node!==root;node=node.offsetParent){
      left+=node.offsetLeft;top+=node.offsetTop;
      if(node.offsetParent&&node.offsetParent!==root){left+=node.offsetParent.clientLeft;top+=node.offsetParent.clientTop;}
    }
    for(let node=anchor.parentElement;node&&node!==root;node=node.parentElement){left-=node.scrollLeft;top-=node.scrollTop;}
    menu.style.left=`${Math.max(8,Math.min(left,root.clientWidth-menu.offsetWidth-8))}px`;menu.style.top=`${Math.max(8,Math.min(top+4,root.clientHeight-menu.offsetHeight-8))}px`;menu.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
  }
  function navigate(next){closeMenu(false);view=next;displayAlbum=null;search.value='';selectedArtist='';render();}
  function desktopCommand(command){
    if(destroyed||dialogs.isOpen)return;
    closeMenu(false);
    if(command?.startsWith('explain:'))return desktopPanels.open('explain',command.slice(8));
    if(command?.startsWith('view-')){
      musicControl.raise();const next=command.slice(5);navigate(next==='albums'?'library':next);return;
    }
    switch(command){
      case 'about-mac':case 'about-music':case 'settings':case 'acknowledgements':case 'subscription':case 'support':return desktopPanels.open(command);
      case 'system-settings':return systemSettings?systemSettings.open():desktopPanels.open('explain','System Settings');
      case 'help':help.open('welcome');break;
      case 'help-soundcloud':help.open('soundcloud');break;
      case 'help-bandcamp':help.open('bandcamp');break;
      case 'shortcuts':help.open('shortcuts');break;
      case 'import-settings':musicControl.raise();return showSettings();
      case 'import':musicControl.raise();help.open('import');break;
      case 'activity':musicControl.raise();showActivity();break;
      case 'info':{musicControl.raise();const context=view==='disc'?inserted:view==='album'?displayAlbum:activeItem()?.album||displayAlbum||inserted;if(context)showInfo(context,activeItem()?.album.id===context.id?activeItem().track:null);break;}
      case 'search':musicControl.raise();navigate('search');search.focus({preventScroll:true});break;
      case 'hide':case 'minimize':musicControl.minimize();break;
      case 'hide-others':desktopPanels.closeAll();help.close(false);soundcloudWindow.sendBack();bandcampWindow.sendBack();musicControl.raise();break;
      case 'show-all':musicControl.raise();break;
      case 'quit':case 'close':closeWindow();break;
      case 'maximize':musicControl.toggleMaximize();break;
      case 'centre':musicControl.centre();break;
      case 'play-pause':if(activeItem()&&!hostedBusy)playing?pausePlayback():startPlayback();break;
      case 'stop':playRequest++;pausePlayback();closeBandcamp();elapsed=0;soundcloudTransport?.seek(0);updateTransport();break;
      case 'next':if(activeItem())advance(1);break;
      case 'previous':if(activeItem())advance(-1);break;
      case 'shuffle-on':case 'shuffle-off':if(externalControls(activeItem()))break;shuffle=command==='shuffle-on';button('shuffle').setAttribute('aria-pressed',String(shuffle));break;
      case 'repeat-off':case 'repeat-all':case 'repeat-one':if(externalControls(activeItem()))break;repeat=command!=='repeat-off';repeatOne=command==='repeat-one';button('repeat').setAttribute('aria-pressed',String(repeat));button('repeat').setAttribute('aria-label',repeatOne?'Repeat one song':'Repeat album');break;
      case 'volume-up':case 'volume-down':{if(externalControls(activeItem()))break;const volume=find('[data-input="volume"]');volume.value=String(Math.min(100,Math.max(0,Number(volume.value)+(command==='volume-up'?5:-5))));if(Number(volume.value))lastVolume=Number(volume.value);updateVolume();soundcloudTransport?.setVolume(Number(volume.value));break;}
      case 'current-song':musicControl.raise();if(activeItem()){displayAlbum=activeItem().album;view=inserted?.id===displayAlbum.id?'disc':'album';search.value='';render();}break;
      case 'queue':case 'lyrics':musicControl.raise();inspector=inspector===command?null:command;renderInspector();break;
      case 'eject':requestEject();break;
    }
  }
  function addNext(items){if(!items.length)return;if(!queue.length){queue=[...items];selectedIndex=0;}else queue.splice(selectedIndex+1,0,...items);renderInspector();updateTransport();notice(`Added ${items.length} ${items.length===1?'song':'songs'} to Playing Next`);}
  function albumMenu(anchor){
    const album=view==='disc'?inserted:displayAlbum;if(!album)return;const rows=visibleRows(),external=Boolean(album.bandcampAlbumId);
    openMenu(anchor,[{label:external?'Open Bandcamp player':'Play',run:()=>selectTrack(0)},{label:'Shuffle',disabled:external,run:()=>{shuffle=true;button('shuffle').setAttribute('aria-pressed','true');selectTrack(Math.floor(Math.random()*rows.length));}},{label:'Play Next',disabled:external||Boolean(bandcampSource(activeItem())),run:()=>addNext(rows)},null,{label:'Select All for Import',disabled:view!=='disc'||Boolean(importJob),run:()=>{checkedTracks=new Set(album.tracks.map(track=>track.id));render();}},{label:'Untick Selection',disabled:view!=='disc'||Boolean(importJob),run:()=>{checkedTracks.clear();render();}},null,{label:'Get Info',run:()=>showInfo(album)},{label:'Get Album Artwork',run:getArtwork},{label:'Show in iTunes Store',run:()=>{navigate('store');networkError();}}]);
  }
  function trackMenu(anchor,index){
    const item=visibleRows()[index];if(!item)return;
    openMenu(anchor,[{label:linkOnly(item)?'Open in Apple Music':bandcampSource(item)?'Open in Bandcamp':'Play',run:()=>selectTrack(index)},{label:'Play Next',disabled:externalControls(item)||externalControls(activeItem()),run:()=>addNext([item])},null,{label:'Get Info',run:()=>showInfo(item.album,item.track)},{label:preferences.isFavourite(item.track.id)?'Remove Favourite':'Favourite',run:()=>{preferences.toggleFavourite(item.track.id);render();}},{label:checkedTracks.has(item.track.id)?'Untick Selection':'Tick Selection',disabled:view!=='disc'||Boolean(importJob),run:()=>{checkedTracks.has(item.track.id)?checkedTracks.delete(item.track.id):checkedTracks.add(item.track.id);render();}},null,{label:'Show Album in Library',disabled:!library.tracksFor(item.album.id).size,run:()=>{displayAlbum=item.album;view='album';search.value='';render();}},{label:'Show in iTunes Store',run:()=>{navigate('store');networkError();}}]);
  }
  function renderInspector(){
    panel.hidden=!inspector;button('lyrics').setAttribute('aria-pressed',String(inspector==='lyrics'));button('queue').setAttribute('aria-pressed',String(inspector==='queue'));if(!inspector)return;
    panel.querySelector('header strong').textContent=inspector==='lyrics'?'Lyrics':'Playing Next';const content=find('.it-inspector-content');content.replaceChildren();
    if(inspector==='lyrics'){content.append(make('p','it-inspector-empty',linkOnly(activeItem())?'Open the Apple Music source to see any lyrics available there.':activeItem()?'Lyrics are unavailable for this demo track.':'Play a song to see lyrics here.'));return;}
    if(linkOnly(activeItem())){content.append(make('p','it-inspector-empty','No playback is connected for this track. Choose a SoundCloud match from the album, or open its Apple Music source.'));return;}
    if(bandcampSource(activeItem())){content.append(make('p','it-inspector-empty','Bandcamp manages its own tracklist. Use the Bandcamp player to choose what plays next.'));return;}
    const next=queue.slice(selectedIndex+1),clear=make('button','it-text-button','Clear');clear.type='button';clear.addEventListener('click',()=>{queue=activeItem()?[activeItem()]:[];selectedIndex=0;renderInspector();notice('Playing Next cleared');});content.append(clear);
    if(!next.length)content.append(make('p','it-inspector-empty','No upcoming songs.'));
    next.forEach((item,index)=>{const control=make('button','it-queue-item');control.type='button';control.append(make('strong','',item.track.title),make('small','',info(item.album).artist));control.addEventListener('click',()=>{pausePlayback();closeEmbed();selectedIndex+=index+1;elapsed=0;startPlayback();renderInspector();});content.append(control);});
  }
  async function showActivity(){
    const body=make('div','it-activity');body.append(make('strong'),make('p'),make('progress'));body.querySelector('progress').max=100;activityBody=body;
    const promise=dialogs.open({title:'Activity',body,wide:true,icon:false,buttons:importJob?[{label:'Stop Importing',value:'stop'},{label:'Done',value:'done',primary:true}]:[{label:'Done',value:'done',primary:true}]});updateImportStatus();const answer=await promise;if(activityBody===body)activityBody=null;if(answer.value==='stop')cancelImport();
  }
  function requestEject(){if(importJob){dialogs.open({title:'You can’t eject a CD while songs on it are being imported.'});return false;}if(!inserted)return false;onEject();return true;}
  function cancelImport(announce=true){
    if(importTimer!==null)clearInterval(importTimer);importTimer=null;const wasImporting=Boolean(importJob);importJob=null;
    if(wasImporting){render();if(announce)notice('Import stopped · completed songs kept in your library');}
  }
  async function importCD(){
    if(importJob){cancelImport();return;}
    const album=inserted,tracks=inserted?.tracks.filter(track=>checkedTracks.has(track.id))||[];if(!album||!tracks.length)return;const imported=library.tracksFor(album.id);
    if(tracks.some(track=>imported.has(track.id))){
      const answer=await dialogs.open({title:'One or more of the songs you have selected to import have already been imported. Do you want to replace existing songs and import them again?',buttons:[{label:'Don’t Replace',value:'skip',primary:true},{label:'Replace Existing',value:'replace'},{label:'Cancel',value:'cancel'}]});
      if(destroyed||inserted!==album||!['skip','replace'].includes(answer.value))return;
      const chosen=answer.value==='replace'?tracks:tracks.filter(track=>!imported.has(track.id));if(!chosen.length){notice('Existing songs kept · no new songs selected');return;}beginImport(chosen);return;
    }
    beginImport(tracks);
  }
  function beginImport(tracks){
    if(!inserted||!tracks.length||importJob||destroyed)return;
    importJob={album:inserted,tracks,index:0,progress:0};notice(inserted.appleMusicURL?'Importing catalogue entries · no audio is downloaded':inserted.bandcampAlbumId?'Importing track entries · no Bandcamp audio is downloaded':inserted.soundcloudPlaylist?'Importing track entries · no SoundCloud audio is downloaded':'Importing CD · demo library');
    importTimer=setInterval(()=>{
      const job=importJob;if(!job)return;job.progress=Math.min(1,job.progress+.16);
      if(job.progress>=1){
        library.remember(job.album.id,[job.tracks[job.index].id]);libraryChanged();job.index++;job.progress=0;
        if(!library.persistent&&!storageWarningShown){storageWarningShown=true;notice('Browser storage is unavailable · library remembered for this visit only');}
        if(job.index===job.tracks.length){
          const count=job.tracks.length;clearInterval(importTimer);importTimer=null;importJob=null;render();
          notice(`Imported ${count} ${count===1?'song':'songs'} · ${library.persistent?'saved on this device':'remembered for this visit'}`);return;
        }
        render();
      }else updateImportStatus();
    },120);
    render();
  }
  function showLibrary(){closeDialog(false);view='library';displayAlbum=null;search.value='';render();}
  function clear(){
    pausePlayback();cancelImport(false);closeEmbed();closeBandcamp();closeDialog(false);inserted=null;displayAlbum=null;view='library';queue=[];selectedIndex=0;elapsed=0;checkedTracks.clear();search.value='';render();
  }
  function loadAlbum(album){
    if(destroyed)return;musicControl.raise();clear();catalogue.set(album.id,album);library.registerAlbum(album);inserted=album;displayAlbum=album;view='disc';checkedTracks=new Set(album.tracks.map(track=>track.id));
    queue=album.tracks.map(track=>({album,track}));selectedIndex=0;render();
    find('.it-status').textContent=library.tracksFor(album.id).size===album.tracks.length?'This CD is already in your library':'Audio CD · ready to play or import';
    if(!library.doNotAsk)promptImport();
  }
  function click(event){
    const control=event.target.closest('button[data-action]');if(!control||!root.contains(control)||control.disabled)return;
    switch(control.dataset.action){
      case 'window-close':closeWindow();break;
      case 'window-minimize':closeMenu(false);musicControl.minimize();switchButtons.music.focus({preventScroll:true});break;
      case 'window-maximize':closeMenu(false);musicControl.toggleMaximize();break;
      case 'previous':advance(-1);break;
      case 'next':advance(1);break;
      case 'play':playing?pausePlayback():startPlayback();break;
      case 'track':selectTrack(Number(control.dataset.index));break;
      case 'import':importCD();break;
      case 'eject':requestEject();break;
      case 'shuffle':shuffle=!shuffle;control.setAttribute('aria-pressed',String(shuffle));notice(shuffle?'Shuffle on':'Shuffle off');break;
      case 'repeat':repeat=!repeat;repeatOne=false;control.setAttribute('aria-pressed',String(repeat));control.setAttribute('aria-label','Repeat album');notice(repeat?'Repeat album on':'Repeat album off');break;
      case 'mute':{const volume=find('[data-input="volume"]');if(Number(volume.value)){lastVolume=Number(volume.value);volume.value='0';}else volume.value=String(lastVolume||65);updateVolume();if(hostedSource(activeItem())){soundcloudTransport?.setVolume(Number(volume.value));notice(`SoundCloud volume ${volume.value}%`);}else notice(Number(volume.value)?`Demo volume ${volume.value}% · audio not connected`:'Demo muted · audio not connected');break;}
      case 'close-embed':closeEmbed();notice('SoundCloud player closed');break;
      case 'library':showLibrary();break;
      case 'recent':case 'songs':case 'artists':case 'favourites':case 'home':case 'new':case 'radio':case 'videos':navigate(control.dataset.action);break;
      case 'search':navigate('search');search.focus({preventScroll:true});break;
      case 'store':navigate('store');networkError();break;
      case 'retry':networkError();break;
      case 'disc':if(inserted){view='disc';displayAlbum=inserted;search.value='';render();}break;
      case 'library-album':displayAlbum=catalogue.get(control.dataset.albumId);if(displayAlbum){view='album';search.value='';render();}break;
      case 'info':showInfo();break;
      case 'settings':showSettings();break;
      case 'help':closeMenu(false);help.open(bandcampSource(activeItem())?'bandcamp':hostedSource(activeItem())?'soundcloud':'welcome');break;
      case 'activity':showActivity();break;
      case 'album-options':albumMenu(control);break;
      case 'track-options':trackMenu(control,Number(control.dataset.index));break;
      case 'disc-options':openMenu(control,[{label:'Get Track Names',run:networkError},{label:'Submit CD Track Names…',run:networkError}]);break;
      case 'lyrics':case 'queue':inspector=inspector===control.dataset.action?null:control.dataset.action;renderInspector();break;
      case 'close-inspector':inspector=null;renderInspector();break;
    }
  }
  function input(event){
    if(event.target===search)render();
    if(event.target===seek&&!externalControls(activeItem())){elapsed=Number(seek.value);lastTick=performance.now();if(hostedSource(activeItem()))soundcloudTransport?.seek(elapsed);updateTransport();}
    if(event.target.matches('[data-input="volume"]')&&!externalControls(activeItem())){if(Number(event.target.value))lastVolume=Number(event.target.value);updateVolume();if(hostedSource(activeItem())){soundcloudTransport?.setVolume(Number(event.target.value));notice(`SoundCloud volume ${event.target.value}%`);}else notice(`Demo volume ${event.target.value}% · audio not connected`);}
    if(event.target.matches('input[data-track-id]')){event.target.checked?checkedTracks.add(event.target.dataset.trackId):checkedTracks.delete(event.target.dataset.trackId);updateTransport();}
  }
  function keydown(event){
    if(!menu||help.isOpen||dialogs.isOpen)return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeMenu();}
    else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){const items=[...menu.querySelectorAll('button:not(:disabled)')];if(!items.length)return;event.preventDefault();const index=items.indexOf(document.activeElement);items[event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length].focus();}
    else if(event.key==='Tab')closeMenu(false);
  }
  function outside(event){if(menu&&!menu.contains(event.target)&&event.target!==menuTrigger&&!menuTrigger?.contains(event.target))closeMenu(false);}
  function contextmenu(event){const row=event.target.closest('.it-track-row');if(!row)return;event.preventDefault();trackMenu(row.querySelector('.it-row-more'),Number(row.dataset.index));}
  function refreshFromStorage(){
    if(destroyed)return false;
    const libraryUpdated=library.refreshFromStorage(),interfaceUpdated=preferences.refreshFromStorage();
    if(!libraryUpdated&&!interfaceUpdated)return false;
    // Refresh saved data without rebuilding the desktop, transport or provider
    // frame. Queue, selected song, import progress and checked rows stay local.
    const active=document.activeElement,row=active?.closest?.('.it-track-row');
    const focus=row&&root.contains(row)?{albumId:row.dataset.albumId,trackId:row.dataset.trackId,
      selector:active.matches('.it-track-check')?'.it-track-check':active.matches('.it-song-button')?'.it-song-button':active.matches('.it-row-more')?'.it-row-more':null}:null;
    const scrolling=[...root.querySelectorAll('.it-main,.it-track-list,.it-library-view,.it-library-grid,.it-browse-view,.it-artist-view')].map(node=>[node,node.scrollLeft,node.scrollTop]);
    render();
    for(const [node,left,top]of scrolling){node.scrollLeft=left;node.scrollTop=top;}
    if(focus?.selector&&!active.isConnected){
      const replacement=[...list.children].find(item=>item.dataset.albumId===focus.albumId&&item.dataset.trackId===focus.trackId);
      replacement?.querySelector(focus.selector)?.focus({preventScroll:true});
    }
    if(libraryUpdated)libraryChanged();
    return true;
  }
  // Always read through the supplied adapter: the standalone preview maps the
  // same store API into its own keys. Ignore delayed event.newValue snapshots.
  const storageChanged=()=>refreshFromStorage();
  const pageShown=event=>{if(event.persisted)refreshFromStorage();};
  const storageEvents=document.defaultView||globalThis;
  storageEvents.addEventListener?.('storage',storageChanged);
  storageEvents.addEventListener?.('pageshow',pageShown);
  const activityControl=make('button','it-text-button','Activity');activityControl.type='button';activityControl.dataset.action='activity';activityControl.setAttribute('aria-label','Show import activity');find('.it-side-status').append(activityControl);
  root.addEventListener('click',click);root.addEventListener('input',input);root.addEventListener('keydown',keydown);root.addEventListener('contextmenu',contextmenu);document.addEventListener('pointerdown',outside);render();
  return {
    loadAlbum,clear,showLibrary,requestEject,refreshFromStorage,command:desktopCommand,showWindow:()=>musicControl.raise(),showDisc:()=>{if(inserted){view='disc';displayAlbum=inserted;search.value='';render();musicControl.raise();}},closeWindow,minimizeWindow:()=>musicControl.minimize(),
    get hasLibrary(){return savedAlbums().length>0;},
    get state(){return {albumId:displayAlbum?.id||null,discAlbumId:inserted?.id||null,view,trackId:activeItem()?.track.id||null,playing,importing:Boolean(importJob),elapsed,checkedCount:checkedTracks.size,shuffle,repeat,embedTrackId,windowState:musicControl.state,importedAlbums:library.records(),persistent:library.persistent};},
    destroy(){destroyed=true;storageEvents.removeEventListener?.('storage',storageChanged);storageEvents.removeEventListener?.('pageshow',pageShown);desktopMenu?.destroy();systemSettings?.destroy();desktopPanels.destroy();closeDialog(false);help.destroy();dialogs.destroy();stopPlaybackTimer();cancelImport(false);closeEmbed();closeBandcamp();bandcampWindow.destroy();soundcloudWindow.destroy();switcher.remove();musicControl.destroy();windows.destroy();root.removeEventListener('click',click);root.removeEventListener('input',input);root.removeEventListener('keydown',keydown);root.removeEventListener('contextmenu',contextmenu);document.removeEventListener('pointerdown',outside);},
  };
}
