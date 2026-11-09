import { windowControlIcon } from './window-control-icons.js';

// These are the replica's own notices. They do not grant a licence to Apple's
// software, the supplied photograph, album artwork or this application.
export const ACKNOWLEDGEMENTS_TEXT = `THE COLLECTION
Acknowledgements and legal notices

A small desktop inside The Collection

An unofficial little desktop comedy by Atlas Reid, made in a browser with affection for familiar music software. This independent parody is not Apple software or a virtual machine and is not affiliated with or endorsed by Apple Inc.

APPLICATION AND ORIGINAL MATERIAL
The application and procedural hardware are part of The Collection. Archived prototype assets include the six invented demo albums; they are no longer in the visible collection. No open-source licence has been selected for the application or its original artwork.

INTERFACE REFERENCES
Apple Music and macOS inspired the familiar menus; the machinery underneath is homemade. Apple, Mac, macOS and Apple Music are trademarks of Apple Inc. This desktop has no Apple account connection, access to a real Music library, physical CD importing or subscription checkout. Its system commands stay inside this little stage set.

PHOTOGRAPHS AND ARTWORK
The Scottish Highlands wallpaper was photographed by Atlas Reid from a train on the way to Glasgow and supplied for this demo. Copyright Atlas Reid; all rights retained.

The SoundCloud catalogue includes Portraits by Simon Thoumire and Dave Milligan, Frieren: Beyond Journey's End (Original Soundtrack) by Evan Call, Without Fear (The Complete Edition), Sonder (2023) and I've told the trees everything by Dermot Kennedy, and Clair Obscur: Expedition 33 (Original Soundtrack) by Lorien Testard. Their public metadata snapshots and provider artwork supply the virtual albums. That artwork is third-party, all-rights-reserved material, not original demo art. Virtual disc labels are illustrative, not scans of physical CDs. No audio or streaming URLs are copied into this project. Source and provenance details are recorded in docs/ASSETS.md.

SOUNDCLOUD
Real example playback uses SoundCloud's official widget and Widget API after the first-play explanation. Its branding, uploader credits and source links remain visible. Availability depends on the provider and browser. A visible widget or this acknowledgement is not separate permission from SoundCloud. The prototype's import flow saves track entries, not audio files. Flickermood by Forss is the documented widget connection example and uses the project's original disc icon.

BANDCAMP
Momento by Dave Milligan (https://davemilligan.bandcamp.com/album/momento) and Still As Your Sleeping by Karine Polwart & Dave Milligan (https://karinepolwart.bandcamp.com/album/still-as-your-sleeping) use the artists' official covers and public track-metadata snapshots. The album pages mark the material all rights reserved; this credit does not grant a separate music or artwork licence. Streaming uses the visible official Bandcamp player after the first-play explanation, retaining artist and source links. Music cannot observe the player's current playback state. Import saves catalogue entries only. No Bandcamp audio or stream URLs are downloaded, copied or proxied by this project.

THE COMPLETE SCOTTISH BAGPIPE COLLECTION
The 35-track catalogue and cover come from the public Apple Music album (https://music.apple.com/gb/album/the-complete-scottish-bagpipe-collection/322470599). Five same-performer title/duration matches play through SoundCloud from a different compilation: The Best of Military Bands: The King's Own Scottish Borderers Military Band (https://soundcloud.com/thekingsownscottishborderersmilitaryband/sets/the-best-of-military-bands-the). This is partial SoundCloud coverage; identical mastering is unconfirmed. Other tracks link to Apple Music. Music and artwork remain with their respective rights holders.

THREE.JS
The 3D desk uses the locally bundled Three.js r185 modules. The following licence applies to those modules, not to the whole of The Collection or its artwork.

The MIT License

Copyright © 2010-2026 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

LOCAL DATA
Completed virtual imports, favourites and supported Music preferences are saved in this browser and origin. The desktop preview keeps its own records. Music Settings remembers its pretend switches for this visit; Import Settings separately saves the choices used by the virtual CD flow. There is no cloud library sync or Apple account connection.

8 November 2026
The Collection · version 1.0.0`;

const settingsDefaults = {
  sync:false, downloads:false, checkDownloads:true, downloadAtmos:false,
  store:true, stars:false, songBoxes:false, listSize:'Medium', notifications:false, history:true,
  enhancer:false, enhancerLevel:'50', soundCheck:false, lossless:false,
  streaming:'High Quality (AAC 256 kb/s)', downloadQuality:'High Quality (AAC 256 kb/s)',
  atmos:'Automatic', passthrough:'Off', videoStreaming:'Best Available (Up to 4K)', videoDownload:'Up to HD',
  transitions:false, transitionStyle:'AutoMix', organised:true, copyFiles:true,
  playlistLibrary:true, favouriteLibrary:true, artwork:true, miniOnTop:false, videoOnTop:false,
};

let nextPanelId=0;

export function createDesktopPanels({host,windows,onCommand=()=>{}}={}) {
  if(!host?.ownerDocument||!windows?.register)throw new TypeError('Desktop panels need a host and its window manager.');
  const document=host.ownerDocument,records=new Map();
  let destroyed=false,sessionSettings={...settingsDefaults},draft={...sessionSettings},selectedTab='General';
  const element=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  // All listeners belong to the panel subtree. Replaced Settings tab contents
  // can be collected instead of retaining a growing list of old controls.
  const listen=(node,name,handler)=>node.addEventListener(name,handler);
  const command=name=>{if(!destroyed)onCommand(name);};
  const bounds=()=>{
    const bar=host.querySelector('.screen-menu-bar,.mac-menu-bar');
    const top=Math.max(28,bar?.offsetHeight||0)+8;
    return {left:8,top,width:Math.max(0,host.clientWidth-16),height:Math.max(0,host.clientHeight-top-64)};
  };

  function makeWindow(name,title,{wide=false,tall=false}={}) {
    const layer=element('section',`vm-panel${wide?' vm-panel-wide':''}${tall?' vm-panel-tall':''}`);
    layer.hidden=true;layer.dataset.vmPanel=name;layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','false');
    const titleId=`vm-panel-title-${++nextPanelId}`;layer.setAttribute('aria-labelledby',titleId);
    const header=element('header','vm-panel-titlebar');
    const close=element('button','vm-panel-close');close.type='button';close.setAttribute('aria-label',`Close ${title}`);close.innerHTML=windowControlIcon('close');
    const heading=element('h2','vm-panel-title',title);heading.id=titleId;
    header.append(close,heading);const content=element('div','vm-panel-content');content.tabIndex=-1;
    layer.append(header,content);host.append(layer);
    const control=windows.register(layer,{handle:header,label:title,getBounds:bounds});
    const record={name,layer,header,heading,content,close,control,placed:false,restoreFocus:null};records.set(name,record);
    listen(close,'click',()=>closePanel(record));
    listen(layer,'keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();closePanel(record);}});
    // These windows are siblings of Music. Do not bubble their commands into
    // player delegates or the scene's keyboard camera route.
    listen(layer,'click',event=>event.stopPropagation());
    return record;
  }

  function closePanel(record,{restore=true}={}) {
    if(!record||record.layer.hidden)return;
    record.control.setVisible(false);
    if(restore&&record.restoreFocus?.isConnected&&!record.restoreFocus.closest('[hidden],[inert]'))record.restoreFocus.focus({preventScroll:true});
  }
  function show(record){
    record.restoreFocus=document.activeElement;
    record.control.setVisible(true);
    if(!record.placed){
      const area=bounds();record.layer.style.left=`${area.left+Math.max(0,(area.width-record.layer.offsetWidth)/2)}px`;
      record.layer.style.top=`${area.top+Math.max(0,Math.min(52,(area.height-record.layer.offsetHeight)/2))}px`;record.placed=true;
    }
    record.control.clamp();record.control.raise();record.close.focus({preventScroll:true});
  }
  function action(label,run,className='vm-button'){
    const button=element('button',className,label);button.type='button';listen(button,'click',run);return button;
  }
  function note(text){return element('p','vm-note',text);}
  function infoBody(record,title,description){
    record.content.replaceChildren(element('h3','vm-info-title',title),element('p','',description));
  }

  function aboutMusic(){
    let record=records.get('about-music');if(record)return record;
    record=makeWindow('about-music','About Music');record.layer.classList.add('vm-about');
    const icon=element('div','vm-app-icon','♫');icon.setAttribute('aria-hidden','true');
    record.content.append(icon,element('h3','','Music'),element('p','vm-version','The Collection · Version 1.0.0'),
      element('p','vm-about-copy','Familiar notes. Entirely homemade.'),
      note('An unofficial little desktop comedy by Atlas Reid. Not affiliated with Apple. A tiny tribute; please don’t send the lawyers.'),
      action('Acknowledgements…',()=>open('acknowledgements')));
    return record;
  }
  function aboutMac(){
    let record=records.get('about-mac');if(record)return record;
    record=makeWindow('about-mac','About This Virtual Mac');record.layer.classList.add('vm-about');
    const illustration=element('div','vm-mac-illustration');illustration.setAttribute('aria-hidden','true');illustration.innerHTML='<svg viewBox="0 0 160 110" fill="none"><rect x="26" y="7" width="108" height="73" rx="5" fill="#242b39"/><rect x="31" y="12" width="98" height="62" rx="2" fill="#849080"/><path d="m8 85 17-5h110l17 5v5c0 3-7 4-12 4H20c-5 0-12-1-12-4Z" fill="#535d6e"/><path d="M66 83h28l-3 4H69Z" fill="#272d3a"/></svg>';
    const facts=element('dl','vm-facts');
    for(const [label,value]of [['Desktop','The Collection'],['Version','1.0.0'],['Runs in','Your web browser'],['Library','Stored on this browser and origin']])facts.append(element('dt','',label),element('dd','',value));
    record.content.append(illustration,element('h3','','This Virtual Mac'),element('p','vm-version','A small desktop inside The Collection'),facts,
      note('No operating system was booted in the making of this desktop.'),action('More Info…',()=>open('explain','This Virtual Mac')));
    return record;
  }

  function checkbox(key,label,description=''){
    const wrap=element('label','vm-setting-check'),input=element('input');input.type='checkbox';input.checked=Boolean(draft[key]);input.name=`vm-${key}`;
    const copy=element('span','vm-setting-copy');copy.append(element('span','',label));if(description)copy.append(element('small','',description));
    wrap.append(input,copy);listen(input,'change',()=>{draft[key]=input.checked;});return wrap;
  }
  function select(key,label,options){
    const wrap=element('label','vm-setting-select'),input=element('select');input.name=`vm-${key}`;
    for(const value of options){const option=element('option','',value);option.value=value;input.append(option);}input.value=draft[key];
    wrap.append(element('span','',label),input);listen(input,'change',()=>{draft[key]=input.value;});return wrap;
  }
  function group(label,...rows){const section=element('section','vm-settings-group');section.append(element('h3','',label),...rows);return section;}
  function displayNotice(label){open('explain',label);}
  function renderSettings(record){
    const body=record.settingsBody;body.replaceChildren();
    for(const tab of record.tabs){const active=tab.textContent===selectedTab;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}
    body.setAttribute('aria-labelledby',record.tabs.find(tab=>tab.textContent===selectedTab).id);
    if(selectedTab==='General')body.append(
      group('Library',checkbox('sync','Sync Library','A decorative cloud. Your collection stays in this browser.'),checkbox('downloads','Automatic Downloads'),checkbox('checkDownloads','Always check for available downloads'),checkbox('downloadAtmos','Download Dolby Atmos')),
      group('Show',checkbox('store','iTunes Store'),checkbox('stars','Star ratings'),checkbox('songBoxes','Songs list tickboxes'),select('listSize','List Size:',['Small','Medium','Large'])),
      group('Notifications',checkbox('notifications','When song changes'),checkbox('history','Use Listening History','A little preference for this visit.')),
      action('See how your data is managed…',()=>displayNotice('Privacy and local data'),'vm-text-button'));
    if(selectedTab==='Playback'){
      const enhancement=element('div','vm-setting-slider'),slider=element('input');slider.type='range';slider.min='0';slider.max='100';slider.value=draft.enhancerLevel;slider.setAttribute('aria-label','Sound enhancer level');
      enhancement.append(element('small','','Low'),slider,element('small','','High'));listen(slider,'input',()=>{draft.enhancerLevel=slider.value;});
      body.append(group('Audio',checkbox('enhancer','Sound Enhancer'),enhancement,checkbox('soundCheck','Sound Check')),
        group('Audio Quality',checkbox('lossless','Enable Lossless Audio'),select('streaming','Streaming:',['High Quality (AAC 256 kb/s)','Lossless','Hi-Res Lossless']),select('downloadQuality','Download:',['High Quality (AAC 256 kb/s)','Lossless','Hi-Res Lossless']),select('atmos','Dolby Atmos:',['Automatic','Always On','Off']),select('passthrough','HDMI Passthrough:',['Off','Prefer HDMI Passthrough'])),
        group('Video Quality',select('videoStreaming','Streaming:',['Best Available (Up to 4K)','Good','Better']),select('videoDownload','Download:',['Up to HD','Up to SD'])),
        group('Song Transitions',checkbox('transitions','Song Transitions'),select('transitionStyle','Transition Style:',['AutoMix','Crossfade'])),
        note('These dials are stage props. SoundCloud handles the actual stream.'));
    }
    if(selectedTab==='Files'){
      const location=element('div','vm-media-location');location.append(element('span','','Browser-local demo library'),action('Change…',()=>displayNotice('Media folder location')),action('Reset',()=>displayNotice('Media folder location')));
      body.append(group('Media Location',location,checkbox('organised','Keep Media folder organised','A filing cabinet for song entries, not audio files.'),checkbox('copyFiles','Copy files to Media folder when adding to library')),
        group('CD importing',action('Import Settings…',()=>{closePanel(record,{restore:false});command('import-settings');}),note('Dress the virtual import in AAC, MP3 or another format. The saved choice is real; the encoding is pretend.')));
    }
    if(selectedTab==='Advanced')body.append(
      group('Library',checkbox('playlistLibrary','Add songs to Library when adding to playlists'),checkbox('favouriteLibrary','Add songs to Library when favouriting'),checkbox('artwork','Automatically update artwork for imported songs')),
      group('Remotes',note('No Remotes paired with this little Music app.'),action('Forget All Remotes',()=>displayNotice('Remotes'))),
      group('Windows',checkbox('miniOnTop','Keep Mini Player on top of all other windows'),checkbox('videoOnTop','Keep video playback on top of all other windows')),
      group('Reset',action('Reset Warnings',()=>displayNotice('Reset Warnings')),action('Reset Cache',()=>displayNotice('Reset Cache'))));
    body.scrollTop=0;
  }
  function settings(){
    let record=records.get('settings');if(record)return record;
    record=makeWindow('settings','Music Settings',{wide:true,tall:true});record.layer.classList.add('vm-settings');
    const tabs=element('div','vm-settings-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Music Settings');
    record.tabs=['General','Playback','Files','Advanced'].map(label=>{
      const tab=action(label,()=>{selectedTab=label;renderSettings(record);},'vm-settings-tab');tab.id=`vm-settings-${label.toLowerCase()}-${nextPanelId}`;tab.setAttribute('role','tab');tabs.append(tab);return tab;
    });
    const body=element('div','vm-settings-body');body.setAttribute('role','tabpanel');body.tabIndex=0;record.settingsBody=body;
    const footer=element('footer','vm-panel-footer');
    footer.append(note('Little preferences · this visit only'),action('Cancel',()=>closePanel(record)),action('OK',()=>{sessionSettings={...draft};closePanel(record);},'vm-button vm-primary'));
    record.content.append(tabs,body,footer);
    listen(tabs,'keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();const current=record.tabs.indexOf(document.activeElement),count=record.tabs.length;
      const index=event.key==='Home'?0:event.key==='End'?count-1:(current+(event.key==='ArrowRight'?1:-1)+count)%count;
      selectedTab=record.tabs[index].textContent;renderSettings(record);record.tabs[index].focus({preventScroll:true});
    });
    renderSettings(record);return record;
  }
  function acknowledgements(){
    let record=records.get('acknowledgements');if(record)return record;
    record=makeWindow('acknowledgements','Acknowledgements.rtf',{wide:true,tall:true});record.layer.classList.add('vm-textedit');
    const toolbar=element('div','vm-text-toolbar');toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','TextEdit viewing controls');
    const font=element('select');font.setAttribute('aria-label','Typeface');for(const name of ['Helvetica','Georgia','Menlo'])font.append(element('option','',name));
    const style=element('select');style.setAttribute('aria-label','Style');for(const name of ['Regular','Bold','Italic'])style.append(element('option','',name));
    const size=element('select');size.setAttribute('aria-label','Font size');for(const value of ['10','12','14','16'])size.append(element('option','',value));size.value='12';
    const paper=element('article','vm-text-paper');paper.setAttribute('aria-label','The Collection acknowledgements');paper.tabIndex=0;
    const paragraphs=ACKNOWLEDGEMENTS_TEXT.split('\n\n');
    for(const [index,text]of paragraphs.entries()){
      const heading=text===text.toUpperCase()&&!text.includes('\n')&&text.length<70;
      const part=element(index===0?'h3':heading?'h4':'p','',text);paper.append(part);
    }
    toolbar.append(font,style,size);
    const bold=action('B',()=>{const enabled=bold.getAttribute('aria-pressed')!=='true';bold.setAttribute('aria-pressed',String(enabled));paper.style.fontWeight=enabled?'700':'';},'vm-format-button vm-format-bold');bold.setAttribute('aria-label','Bold document view');bold.setAttribute('aria-pressed','false');
    const italic=action('I',()=>{const enabled=italic.getAttribute('aria-pressed')!=='true';italic.setAttribute('aria-pressed',String(enabled));paper.style.fontStyle=enabled?'italic':'';},'vm-format-button vm-format-italic');italic.setAttribute('aria-label','Italic document view');italic.setAttribute('aria-pressed','false');
    const underline=action('U',()=>{const enabled=underline.getAttribute('aria-pressed')!=='true';underline.setAttribute('aria-pressed',String(enabled));paper.style.textDecoration=enabled?'underline':'';},'vm-format-button vm-format-underline');underline.setAttribute('aria-label','Underline document view');underline.setAttribute('aria-pressed','false');
    toolbar.append(bold,italic,underline);
    for(const [label,value]of [['Align left','left'],['Align centre','center'],['Align right','right']]){
      const button=action(value==='left'?'≡':value==='center'?'☰':'≡',()=>{paper.style.textAlign=value;},'vm-format-button');button.setAttribute('aria-label',label);toolbar.append(button);
    }
    listen(font,'change',()=>{paper.style.fontFamily=font.value==='Menlo'?'Menlo,monospace':font.value==='Georgia'?'Georgia,serif':'Helvetica,Arial,sans-serif';});
    listen(size,'change',()=>{paper.style.fontSize=`${size.value}px`;});
    listen(style,'change',()=>{paper.style.fontWeight=style.value==='Bold'?'700':'';paper.style.fontStyle=style.value==='Italic'?'italic':'';});
    const ruler=element('div','vm-text-ruler','0       1       2       3       4       5       6       7       8');ruler.setAttribute('aria-hidden','true');
    const scroll=element('div','vm-text-scroll');scroll.append(paper);
    const footer=element('footer','vm-text-footer');const download=element('a','','Download .rtf');download.href=new URL('./acknowledgements.rtf',import.meta.url).href;download.download='Acknowledgements.rtf';
    footer.append(note('The Collection’s notices · read-only document'),download);record.content.append(toolbar,ruler,scroll,footer);return record;
  }

  function subscription(){
    let record=records.get('subscription');if(record)return record;
    record=makeWindow('subscription','Subscribe to Apple Music',{wide:true});
    record.content.innerHTML='<div class="vm-info-symbol" aria-hidden="true">♫</div><h3 class="vm-info-title">A very small music department.</h3><p>Apple Music is Apple’s subscription music service. Its memberships and accounts live with Apple. This little desktop is just visiting the idea.</p><h4>In the real Music app</h4><ol><li>Open Home or New to discover music, or Search for an artist, album or song.</li><li>Choose a membership offered by Apple and sign in through the real service.</li><li>Add favourites to your library and listen on supported devices.</li></ol><h4>Inside The Collection</h4><p>Browse your virtual CD library, import track entries and try the supplied SoundCloud and Bandcamp albums after their first-play notices.</p><p class="vm-note">No checkout hiding behind this panel. For a real subscription, visit Apple’s own app or website.</p>';
    record.content.append(action('Music Help',()=>command('help')),action('About Music',()=>open('about-music')));return record;
  }
  function shortcuts(){
    let record=records.get('shortcuts');if(record)return record;
    record=makeWindow('shortcuts','Keyboard Shortcuts',{wide:true});
    infoBody(record,'A few ways around this little desktop','The menu bar, windows and Music controls work with the keyboard. Browser and operating-system shortcuts stay with your real computer.');
    const table=element('table','vm-shortcuts');
    for(const [keys,description]of [['Tab / Shift–Tab','Move between controls'],['Enter / Space','Activate the focused control'],['↑ / ↓','Move through an open menu'],['← / →','Change menus or open and close submenus'],['Escape','Close the current menu or window'],['Arrow keys on a title bar','Move its window'],['Shift + arrows on a title bar','Move its window one pixel at a time']]){
      const row=element('tr');row.append(element('th','',keys),element('td','',description));table.append(row);
    }
    record.content.append(table);return record;
  }
  function support(){
    let record=records.get('support');if(record)return record;
    record=makeWindow('support','Music Support');infoBody(record,'A little help for a little desktop','You have reached the very small support department. The local guide can explain the CD shelf, playback and saved collection; Apple handles the real Music app.');
    record.content.append(action('Open Music Help',()=>command('help')),action('Playback and SoundCloud',()=>command('help-soundcloud')),action('Acknowledgements…',()=>open('acknowledgements')),
      note('For real Apple Music support, use Apple’s own Help or support service.'));return record;
  }
  function explain(detail){
    let record=records.get('explain');if(!record)record=makeWindow('explain','The Collection');
    const title=String(detail||'This little desktop');record.heading.textContent=title;
    record.close.setAttribute('aria-label',`Close ${title}`);
    const messages={
      'This Virtual Mac':'One browser, a handful of windows and a slightly excessive commitment to the bit. Music, Help and TextEdit are homemade parts of The Collection. No second computer is running, and these windows cannot browse your Mac’s files.',
      'Privacy and local data':'Your collection keeps completed track entries and supported preferences in this browser and website address. The desktop preview has its own records. No Apple account is connected. SoundCloud receives a connection when you continue from its first-play notice.',
      'Media folder location':'In Music, this setting chooses where media files live. Here, the filing cabinet is browser storage: imports save song entries rather than moving, encoding or downloading audio. A small folder with nothing heavy to carry.',
      'Remotes':'The real Music app can work with paired remotes. This little one has none, so there is nobody to forget. The dock and keyboard are still taking requests.',
      'Reset Warnings':'In Music, this restores prompts you previously dismissed. Our warning department has no reset switch yet. Your collection, favourites and first-play notice keep their current settings.',
      'Reset Cache':'The real Music app can clear cached information. This desk has no Apple Music cache to sweep, so your collection stays exactly where you left it.',
      'Playlist':'In Music, a playlist gives songs an order and a name. Our little collection has Favourite Songs and Playing Next for now. Open a song’s menu to give it a place in the queue.',
      'New Playlist':'A named playlist would live here in the real app. This collection is still a shelf-and-queue establishment: use Favourite Songs for keepers and Playing Next for the next few songs.',
      'Playlist from Selection':'Music can turn selected songs into a playlist. Here, a song or album menu can add entries to Playing Next; named playlists are still waiting for their own little filing cabinet.',
      'Smart Playlist':'A real Smart Playlist gathers music using rules. Ours has taken the afternoon off. Recently Added and Favourite Songs already collect the entries they know about.',
      'Playlist Folder':'Music uses folders to organise playlists. This desktop has a shorter list to tidy: Albums, Songs, Favourite Songs and Playing Next. No folders were harmed or created.',
      'Genius Playlist':'Genius normally builds a playlist around a song using Apple’s service. This homemade desk has no Genius connection. Pick your own next track from a song menu; excellent taste is still welcome.',
      'Open Stream URL…':'Music can open a supported internet audio stream from a URL. This desktop accepts the supplied SoundCloud examples through their first-play notice. There is no mystery URL box waiting to fetch something.',
      'Update Cloud Library':'Music normally checks an account’s cloud library here. Our cloud is painted on: completed imports stay in this browser. Albums and Recently Added show what this collection has saved.',
      'Update Genius':'The real Music app can refresh the information used by Genius. This desk has no Genius account or matching service. Its very modest intelligence consists of your own song choices.',
      'Organise Library…':'Music can consolidate and reorganise media files. This collection only stores track entries, so there are no audio files to move. Albums and Artists already give those entries a tidy place to sit.',
      'Export Library…':'Music can write a library catalogue to a file. This little version has no library-export command yet. Saved imports remain in this browser; downloading the project does not include them.',
      'Import Playlist…':'Music can read a compatible playlist file. Here, the way in is a virtual CD: pick one from the shelf or CD preview, then choose Import CD. It adds the supplied song entries without reading your files.',
      'Export Playlist…':'The real Music app can export playlist information. This collection has a local Playing Next queue rather than named playlist files. Nothing has been written to your computer.',
      'Show Duplicate Items':'Music can gather tracks that look like duplicates. Our CD import checks completed track IDs and asks about existing entries when you import them again. The second copy does not need its own seat.',
      'Get Album Artwork':'Music can look up artwork for an album. This collection uses the supplied covers; it does not search Apple’s artwork service. Try an album’s Get Info window for the details kept here.',
      'Get Track Names':'Music can look up the names on a real audio CD. Our virtual discs arrive with their catalogue already attached. Their song titles are available as soon as you load them.',
      'Convert to Apple Lossless…':'Music can encode supported audio in Apple Lossless. Our encoder is a costume department: Import Settings remembers the format you choose, while the virtual CD imports entries rather than converting audio.',
      'Page Setup…':'The real app prepares a page for printing here. This desktop has no printer connection. The acknowledgements document is available as an RTF download if you would like a small souvenir.',
      'Print…':'Music can print track lists and artwork. Our printing press is mostly atmosphere. For a take-home document, open About Music → Acknowledgements and choose Download .rtf.',
      'Emoji & Symbols':'macOS opens its character viewer here. Our tiny desktop leaves that tool to your real computer. Your keyboard’s usual emoji shortcut still belongs to the operating system.',
      'Copy Link':'The real Music app can copy a service link for a song. This panel leaves your clipboard alone. The SoundCloud window keeps its own source and uploader links visible when a real example is loaded.',
      'Share Song…':'Music can offer ways to share an eligible song’s link. This little desktop has no social account or share sheet. SoundCloud’s own source links remain available in its player.',
      'Play Next':'In Music, this places the chosen song immediately after the current one. Here, open a song’s or album’s own menu and choose Play Next to arrange the local queue.',
      'Add to Queue':'Music normally adds the selection to its upcoming songs. This desk’s Playing Next panel shows the local queue; a song or album menu supplies the working queue controls.',
      'Create Station':'Apple Music can use a song as the start of a station. This desk has no recommendation engine in the cupboard. Choose a supplied album or make your own next-song choices instead.',
      'Only Downloaded Music':'Music can filter its library to files available on the device. This collection has no downloaded audio to filter: imports save song entries, and real examples stream from SoundCloud.',
      'Show View Options':'The real Music app offers extra columns and display choices here. This smaller view keeps its essential columns in place. Albums, Artists, Songs and Recently Added offer the working ways to browse.',
      'Show Status Bar':'Music can display counts and durations at the bottom of its window. This desktop already keeps a small footer for the current view. No extra strip of highly important tiny numbers is required.',
      'Genius Shuffle':'Genius normally makes a mix with help from Apple’s service. Our Shuffle control rearranges the current local queue. Same spirit, much smaller hat.',
      'Sign In…':'In the real Music app, this connects an Apple Account. This little parody has no login form and needs no password. Your virtual library is already available in this browser.',
      'Account Settings…':'Music opens account details, purchases and membership options here. Our account department has no personal records to show. For a real account, use Apple’s own app or website.',
      'Notifications…':'Music lets you choose which service updates you hear about. This little desktop has no notification subscription. Its useful news is already on the desk: import activity and the current song.',
      'Apps With Access…':'The real Music app can show apps connected to its service. No Apple Account is connected here, so there is no access list. SoundCloud playback is explained separately before its widget loads.',
      'Authorise This Computer…':'Apple uses authorisation for certain purchased media. This browser desk cannot authorise your real computer. The virtual CD collection works without signing in.',
      'De-authorise This Computer…':'Music can remove a real computer’s authorisation. This desk holds no such authorisation, so there is nothing to revoke. Your real Music app keeps its own business.',
      'Redeem…':'Music can redeem an eligible code or gift card. Our cashier is a painted window: no code is requested, no credit is spent. Use Apple’s own app for real redemptions.',
      'Wish List':'The real store can keep a list of things you are considering. This little shop has no till or saved store wish list. Favourite Songs is the working place for tracks you already imported.',
      'Purchased':'Music can show purchases associated with an Apple Account. This desk has no purchase history. Albums shows the virtual CD entries you have imported here.',
      'Check for Available Downloads…':'Music can check an account for media ready to download. Here, imported entries are already in your local library, while SoundCloud streams its own audio. No download queue is hiding backstage.',
      'Equaliser':'Music’s equaliser changes bands of audio frequencies. This panel is the cardboard version: SoundCloud owns the real audio stream. Music’s volume and mute controls still work on that player.',
      'Mini Player':'The real Music app has a compact player window. This desk is already rather mini; minimise Music to keep playback going and reopen it from the dock.',
      'Switch to Mini Player':'Music normally swaps its main window for a compact player. This little desktop keeps one Music window and one live player. Minimise it for more wallpaper, or use the dock to bring it back.',
      'Visualiser':'Music can turn sound into moving pictures. Our visualiser budget went on the CD shelf. The 3D desk is available from the collection page, with no extra light show running behind it.',
    };
    let description=messages[title];
    if(!description&&/sign in|account|redeem|authoris|purchased|downloads|wish list|notification|apps with access/i.test(title))description='This part of Music normally talks to your Apple account. Our account department is a very convincing menu: it takes no passwords, payments or authorisations. Use Apple’s own app for those; your local collection is ready here.';
    if(!description&&/sleep|restart|shut down|lock|force quit/i.test(title))description='In macOS, this command changes the computer’s session or power state. Here it is a tiny bit of desktop theatre. Your real computer keeps going; close this panel for an encore.';
    if(!description&&/playlist|library|artwork|track names|convert|import|finder|print|stream|genius|writing|autofill|dictation|emoji/i.test(title))description='The full Music app has a bigger crew for this job. On our little stage, the CD shelf, Import CD, Favourite Songs and Playing Next do the practical work. This panel is the scenic route back to those controls.';
    if(!description)description='You found another door. This one is painted on the set, but Music Help has working routes to the collection, import settings and playback controls. Your saved songs are still waiting where you left them.';
    infoBody(record,title,description);record.content.append(action('Music Help',()=>command('help')),action('About This Virtual Mac',()=>open('about-mac')));return record;
  }
  const creators={'about-music':aboutMusic,'about-mac':aboutMac,settings,acknowledgements,subscription,shortcuts,support};
  function open(name,detail){
    if(destroyed)return;
    if(name==='settings'){draft={...sessionSettings};}
    const record=name==='explain'?explain(detail):creators[name]?.();
    if(!record)return;
    if(name==='settings')renderSettings(record);
    show(record);return record.layer;
  }
  return {
    open,
    closeAll(){for(const record of records.values())closePanel(record,{restore:false});},
    get isOpen(){return [...records.values()].some(record=>!record.layer.hidden);},
    destroy(){if(destroyed)return;destroyed=true;for(const record of records.values()){record.control.destroy();record.layer.remove();}records.clear();},
  };
}
