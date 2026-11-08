import { windowControlIcon } from './window-control-icons.js';

// Original local guide articles. Legacy unavailable pages remain for old flows.
let nextHelpId = 0;

const glyph = (name) => {
  const paths = {
    back:'<path d="m14 5-7 7 7 7"/>',
    forward:'<path d="m10 5 7 7-7 7"/>',
    home:'<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>',
    search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/>',
    sidebar:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M5.5 8h1M5.5 12h1"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ''}</svg>`;
};

const guide = {
  welcome: {
    title:'Music User Guide',
    keywords:'welcome tips introduction start',
    body:'<p class="it-help-eyebrow">FOR THIS LITTLE DESKTOP</p><p>Make yourself at home. There is a CD shelf, a Music window and a suspicious number of menus for something this small.</p><div class="it-help-cards"><button type="button" data-help-page="get-music"><strong>Find your music</strong><span>The big service, your little library and the CDs on the desk.</span></button><button type="button" data-help-page="import"><strong>Bring a CD inside</strong><span>Choose songs and add their entries to your collection.</span></button><button type="button" data-help-page="playback"><strong>Press play</strong><span>Playback, Playing Next and the provider windows.</span></button><button type="button" data-help-page="settings"><strong>Make it yours</strong><span>Explore Music settings and import choices.</span></button></div><p class="it-help-local-note">An unofficial desktop comedy by Atlas Reid. This guide lives here; your real Music app and Apple account have their own lives.</p>',
  },
  'whats-new': {
    title:'What’s new in this Music',
    keywords:'new release changes menus desktop',
    body:'<p>The desktop has grown proper menus, an About window, this guide and an acknowledgements document. An unreasonable amount of furniture for such a small room.</p><p>The same Music window still lives on the 3D laptop and the desktop-only preview. You can close, minimise, maximise and reopen it from the dock.</p><div class="it-help-links"><button type="button" data-help-page="shortcuts">Learn your way around</button><button type="button" data-help-page="library">Explore the library</button></div>',
  },
  'sign-in': {
    title:'Sign in to Music',
    keywords:'account apple id login sign in authorise',
    body:'<p>In the real Music app, account commands live in the Account menu. Signing in connects Music to the services available to that Apple Account.</p><p>This little Music keeps its collection in your browser. No Apple Account is connected, and there is no password box behind the curtain.</p><p>For a real Apple Music account or subscription, use Apple’s own app or website.</p><div class="it-help-links"><button type="button" data-help-page="subscription">About an Apple Music subscription</button><button type="button" data-help-page="privacy">About this desktop’s storage</button></div>',
  },
  'get-music': {
    title:'Get music from Apple Music',
    keywords:'get music subscribe streaming catalogue apple music',
    body:'<p>Apple Music is Apple’s subscription music service. In its real app, you can explore the catalogue, add music to your library and download eligible music for listening offline.</p><p>This homemade desktop has a shorter catalogue: the real albums on this desk, supplied through SoundCloud and Bandcamp. Start with the shelf, then see how far the menus go.</p><h3>Explore a little further</h3><div class="it-help-links"><button type="button" data-help-page="subscription">Subscribe to Apple Music</button><button type="button" data-help-page="downloads">Add and download music</button><button type="button" data-help-page="devices">Access music across devices</button><button type="button" data-help-page="import">Import your existing music</button></div>',
  },
  subscription: {
    title:'Subscribe to Apple Music',
    keywords:'join subscription subscribe trial apple music account',
    body:'<p>In the real Music app on Mac, choose <strong>Account → Join Apple Music</strong> to see the options offered to your account. Follow Apple’s instructions to review a plan and its terms.</p><p>A subscription can provide access to Apple Music’s catalogue, listening offline, lyrics and supported audio formats. Features, availability and eligibility depend on your device, region, account and the music you choose.</p><p>The tiny shop has no checkout. For real plans and current terms, this link opens Apple’s official information in your browser.</p><div class="it-help-links"><a href="https://www.apple.com/apple-music/" target="_blank" rel="noopener noreferrer">Visit Apple Music ↗</a><button type="button" data-help-page="get-music">Get music from Apple Music</button></div>',
  },
  downloads: {
    title:'Add and download music',
    keywords:'add download offline library cloud',
    body:'<p>In Apple Music, adding an album or song puts it in your library; downloading makes eligible music available on that device for offline listening. These are separate actions.</p><p>Here, <strong>Import CD</strong> files the song entries in your browser. The filing is real; the ripping is pretend. No audio is downloaded or encoded, and supplied SoundCloud songs still stream through SoundCloud.</p><div class="it-help-links"><button type="button" data-help-page="import">Import a CD into this collection</button><button type="button" data-help-page="soundcloud">How SoundCloud playback works</button></div>',
  },
  devices: {
    title:'Access music across devices',
    keywords:'sync cloud devices iphone ipad transfer',
    body:'<p>The real Music app offers account and library features for compatible devices. Their availability depends on the service and your account.</p><p>This little library lives in the current browser profile and website address. Another computer, browser or address gets its own collection. GitHub carries the desk and software; saved imports and favourites stay with their browser.</p><p>The desktop-only preview has its own little filing cabinet, separate from the main collection.</p><div class="it-help-links"><button type="button" data-help-page="privacy">Where your collection is saved</button></div>',
  },
  import: {
    title:'Import music from a CD',
    keywords:'cd import existing music disc ripping encoder audio',
    body:'<ol><li>On the 3D desk, choose a case from the shelf. In the desktop preview, use <strong>CD preview</strong> to insert an example album.</li><li>Open the inserted CD in Music. Tick the songs you want to include.</li><li>Choose <strong>Import CD</strong>, or accept the import prompt. Completed entries receive a green mark.</li><li>Find those songs in Albums, Songs or Recently Added.</li></ol><p><strong>Stop Importing</strong> keeps the entries already completed. Re-importing existing entries asks whether to replace or keep them. Eject waits until importing has stopped.</p><p class="it-help-local-note">A remarkably busy animation for a very small filing job: importing saves catalogue entries only. It does not read a physical drive, rip a disc or download SoundCloud audio.</p><div class="it-help-links"><button type="button" data-help-page="settings">Choose import settings</button><button type="button" data-help-page="library">Find imported songs</button></div>',
  },
  settings: {
    title:'Customise Music settings',
    keywords:'settings preferences import aac mp3 lossless encoder quality correction',
    body:'<p>Choose <strong>Music → Settings</strong> for the familiar four tabs. Their little switches keep a draft for this visit. For the virtual CD preferences, choose <strong>Files → Import Settings</strong> or Music’s small settings button.</p><h3>Import Settings</h3><p>Choose AAC, AIFF, Apple Lossless, MP3 or WAV, then choose the available quality setting. Error correction is an additional import choice. Select <strong>OK</strong> to remember those choices or <strong>Cancel</strong> to leave them as they were.</p><p class="it-help-local-note">Import Settings remembers the virtual CD choices in this browser. The encoder is still acting: no audio is converted, and your real Music preferences stay untouched.</p><h3>System Settings, tiny universe</h3><p>Choose <strong>Apple → System Settings</strong> for the working display controls. <strong>Appearance</strong> changes frosted glass; <strong>Displays</strong> changes interface size and the 3D laptop’s desktop resolution; <strong>3D Desk</strong> controls resolution, shadows and resting in close-up. These choices stay in sync with the 3D page’s <strong>Graphics</strong> drawer.</p><p>Glass and interface size apply immediately in this desktop. The 3D choices carry back to the desk, and open copies of The Collection pick them up too. Your actual Mac remains blissfully uninvolved.</p><div class="it-help-links"><button type="button" data-help-page="import">Import music from a CD</button><button type="button" data-help-page="privacy">Saved preferences</button></div>',
  },
  search: {
    title:'Search for music',
    keywords:'search find filter songs artists albums',
    body:'<p>Use the search field in Music’s sidebar to filter the view you are browsing. Search for a title, artist or album. Clear the field to see the whole view again.</p><p>This search knows the entries in the collection. Its tiny desk does not have a line to Apple Music or your real library.</p><p>This Help window has a search of its own. Ask for <strong>import</strong>, <strong>settings</strong> or <strong>SoundCloud</strong> and press Return; the small librarian will do what it can.</p><div class="it-help-links"><button type="button" data-help-page="library">Browse your library instead</button></div>',
  },
  library: {
    title:'Manage your library',
    keywords:'library recently added albums artists songs favourites organise info artwork',
    body:'<p><strong>Recently Added</strong> follows import order. <strong>Artists</strong> groups imported albums. <strong>Albums</strong> shows your collection, and <strong>Songs</strong> lists imported tracks.</p><p>Open a song’s menu to mark it as a favourite; it will appear in Favourite Songs. Album and track menus also lead to Get Info and Playing Next.</p><p>Get Info lets you correct supported album details in this collection. The labels change here; real filenames and audio tags are not involved.</p><div class="it-help-links"><button type="button" data-help-page="playlists">Organise songs in playlists</button><button type="button" data-help-page="privacy">Where these changes are stored</button></div>',
  },
  playback: {
    title:'Play music',
    keywords:'play pause next previous volume shuffle repeat lyrics queue',
    body:'<p>Choose a song and use Music’s play, pause, previous and next controls. Shuffle and repeat change the local queue. Playing Next shows upcoming songs; Lyrics opens the lyrics panel.</p><p>The supplied albums stream through SoundCloud or Bandcamp after you choose Continue in the first-play notice. SoundCloud connects to Music’s transport; Bandcamp keeps its playback controls inside its own visible player.</p><p>Minimising Music keeps playback alive. Closing Music stops playback. Reopen it from the dock without losing the saved library.</p><div class="it-help-links"><button type="button" data-help-page="soundcloud">SoundCloud playback and its controls</button><button type="button" data-help-page="bandcamp">Bandcamp playback and its controls</button><button type="button" data-help-page="shortcuts">Windows and keyboard navigation</button></div>',
  },
  playlists: {
    title:'Organise songs in playlists',
    keywords:'playlist organise songs playing next favourite',
    body:'<p>In the real Music app, playlists collect songs into an order you choose. Some Apple Music features also offer shared or collaborative playlists.</p><p>Our smaller establishment offers the imported library, Favourite Songs and Playing Next. Use a song or album menu to arrange the queue. Favourite Songs stays saved here; named playlists are still on the imaginary to-do list.</p><div class="it-help-links"><button type="button" data-help-page="sharing">Share and collaborate</button><button type="button" data-help-page="library">Browse the local library</button></div>',
  },
  sharing: {
    title:'Share and collaborate',
    keywords:'share collaborate friends playlist social',
    body:'<p>Apple Music includes sharing features for eligible music and accounts. A shared link points to the service; it does not give another person a copy of an audio file.</p><p>This desktop is a solo act: there is no social account, collaborative playlist or cloud library. The SoundCloud widget still keeps its own source and uploader links available.</p><div class="it-help-links"><button type="button" data-help-page="privacy">Privacy and local storage</button><button type="button" data-help-page="soundcloud">About the SoundCloud window</button></div>',
  },
  shortcuts: {
    title:'Windows and keyboard navigation',
    keywords:'shortcuts keyboard window drag move minimise maximize close help',
    body:'<p>Drag Music, Help or SoundCloud by its title bar. With a title bar focused, use the arrow keys to move the window; hold Shift for smaller steps.</p><p>Music’s red control closes it, yellow minimises it and green changes its size. The dock brings Music and Help back to the front.</p><p>Use Tab to move between controls and Return or Space to activate a focused control. Escape closes the current sheet, menu or Help window. In the 3D close-up, Escape returns to the desk when no foreground control consumes it.</p><div class="it-help-links"><button type="button" data-help-page="playback">Playback controls</button></div>',
  },
  bandcamp: {
    title:'Playing music through Bandcamp',
    keywords:'bandcamp momento still as your sleeping karine polwart dave milligan player streaming widget tracklist pause stop close consent privacy import',
    body:'<p><strong>Momento by Dave Milligan</strong> and <strong>Still As Your Sleeping by Karine Polwart &amp; Dave Milligan</strong> play through Bandcamp’s own embedded player. A small stage, with the artist’s music still coming from the artist’s service.</p><h3>Before the player opens</h3><p>The first play request for each album during a visit shows an explanation. Choose <strong>Continue</strong> to connect to Bandcamp and load its player. Choose <strong>Cancel</strong> to leave it unloaded.</p><h3>The controls belong to Bandcamp</h3><p>Use the visible Bandcamp player for play, pause and seeking, and its tracklist to choose songs. Opening a song from Music prepares that selection in the official player; you may still need to press Play there.</p><p>Music cannot observe Bandcamp’s current playback state, position or track changes. Its song label shows the selection requested here, rather than a live report from Bandcamp. The progress, volume, shuffle and repeat controls in Music do not control this provider.</p><h3>A window, not a second copy</h3><p><strong>Behind Music</strong>, changing foreground windows or minimising Music keeps the same Bandcamp frame alive. If it was playing, it can carry on in the background.</p><p>Music’s <strong>Stop</strong> command and closing the Bandcamp player unload it. That stops the player rather than sending a pause command. Reopening loads the player again; its previous playback position is not retained.</p><h3>Import the entries, not the audio</h3><p><strong>Import CD</strong> saves selected track entries in this browser’s collection. It does not download Bandcamp audio, make music available offline or add a purchase to a Bandcamp account. The artist’s artwork and track credits remain their own.</p><h3>Availability and privacy</h3><p>Once you continue, Bandcamp receives the connection and may use cookies or browser storage. Listening, availability and any purchase prompts remain under Bandcamp’s control. This desktop does not bypass them.</p><div class="it-help-links"><a href="https://davemilligan.bandcamp.com/album/momento" target="_blank" rel="noopener noreferrer">Momento by Dave Milligan on Bandcamp ↗</a><a href="https://karinepolwart.bandcamp.com/album/still-as-your-sleeping" target="_blank" rel="noopener noreferrer">Still As Your Sleeping on Bandcamp ↗</a><a href="https://get.bandcamp.help/en/articles/15263071-how-do-i-create-a-bandcamp-embedded-player" target="_blank" rel="noopener noreferrer">Bandcamp’s embedded player information ↗</a><a href="https://bandcamp.com/privacy" target="_blank" rel="noopener noreferrer">Bandcamp Privacy Policy ↗</a><button type="button" data-help-page="import">Importing a virtual CD</button></div>',
  },
  privacy: {
    title:'Privacy and local storage',
    keywords:'privacy storage browser local saved data favourite metadata preferences',
    body:'<p>Completed import entries, supported album edits, favourites and preferences are saved in this browser when storage is available. Unfinished import progress and audio are not saved.</p><p>The main collection and development preview have separate records. Starting a fresh preview clears only the preview’s library and interface choices.</p><p>Choosing Continue for SoundCloud or Bandcamp playback connects to that provider. Its player may use cookies or browser storage. Cancelling the notice leaves that player unloaded.</p><div class="it-help-links"><button type="button" data-help-page="soundcloud">SoundCloud availability and privacy</button><button type="button" data-help-page="bandcamp">Bandcamp availability and privacy</button><button type="button" data-help-page="devices">Using another device</button></div>',
  },
  resources: {
    title:'Resources',
    keywords:'resources official website guide credits acknowledgements',
    body:'<p>This guide belongs to the little desktop. For the full-size music service, Apple has the full-size information.</p><div class="it-help-links"><a href="https://www.apple.com/apple-music/" target="_blank" rel="noopener noreferrer">Apple Music ↗</a><a href="https://support.apple.com/guide/music/welcome/mac" target="_blank" rel="noopener noreferrer">Apple’s Music User Guide ↗</a><button type="button" data-help-page="copyright">Copyright and acknowledgements</button><button type="button" data-help-page="welcome">This desktop’s guide home</button></div>',
  },
  copyright: {
    title:'Copyright and acknowledgements',
    keywords:'copyright acknowledgements credits licence license apple atlas reid',
    body:'<p>The Collection is an affectionate, unofficial desktop parody by Atlas Reid. Apple, Apple Music, Mac and their associated marks belong to Apple Inc. This project is independent and is not affiliated with or endorsed by Apple.</p><p>Album artwork, artist names and supplied SoundCloud and Bandcamp metadata retain their owners’ rights. The procedural hardware and original illustrations are project material. Three.js is distributed with its own MIT licence.</p><p>Choose <strong>Music → About Music → Acknowledgements</strong> to open this project’s acknowledgements document in the virtual text editor.</p><div class="it-help-links"><button type="button" data-help-page="resources">Resources</button></div>',
  },
};

const escapeText=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const articleLink=(page,label)=>'<button type="button" data-help-page="'+page+'">'+label+'</button>';
const guideContents=[
  articleLink('welcome','Welcome'),
  articleLink('whats-new','What’s new'),
  articleLink('sign-in','Sign in to Music'),
  '<details open><summary>Get music from Apple Music</summary>'+articleLink('get-music','Overview')+articleLink('subscription','Subscribe to Apple Music')+articleLink('downloads','Add and download music')+articleLink('devices','Access music across devices')+'</details>',
  '<details><summary>Import your existing music</summary>'+articleLink('import','Import music from a CD')+articleLink('settings','Choose import settings')+'</details>',
  articleLink('search','Search for music'),
  articleLink('playback','Play music'),
  articleLink('playlists','Organise songs in playlists'),
  articleLink('sharing','Share and collaborate'),
  articleLink('library','Manage your library'),
  articleLink('settings','Customise settings'),
  '<details><summary>Resources</summary>'+articleLink('shortcuts','Windows and keyboard')+articleLink('soundcloud','SoundCloud playback')+articleLink('bandcamp','Bandcamp playback')+articleLink('privacy','Privacy and storage')+articleLink('resources','Official resources')+articleLink('copyright','Copyright')+'</details>',
].join('');

export function createHelpViewer(root,{host=root,windows=null,onShow=()=>{}}={}) {
  const titleId = `it-help-title-${++nextHelpId}`;
  const layer = document.createElement('div');
  layer.className = 'it-help-layer';
  layer.hidden = true;
  layer.innerHTML = `<section class="it-help-window" role="dialog" aria-labelledby="${titleId}">
    <header class="it-help-toolbar">
      <button class="it-help-close" type="button" data-help="close" aria-label="Close Help" title="Close Help">${windowControlIcon('close')}</button>
      <button class="it-help-tool" type="button" data-help="contents" aria-label="Show Help contents" title="Show Help contents">${glyph('sidebar')}</button>
      <div class="it-help-navigation">
        <button class="it-help-tool" type="button" data-help="back" aria-label="Back in Help" title="Back">${glyph('back')}</button>
        <button class="it-help-tool" type="button" data-help="forward" aria-label="Forward in Help" title="Forward">${glyph('forward')}</button>
      </div>
      <button class="it-help-tool" type="button" data-help="home" aria-label="Help home" title="Help home">${glyph('home')}</button>
      <span class="it-help-toolbar-title">Music User Guide</span>
      <form class="it-help-search" role="search">
        ${glyph('search')}<input type="search" aria-label="Search Music Help" placeholder="Search" autocomplete="off">
      </form>
    </header>
    <div class="it-help-body">
      <nav class="it-help-contents" aria-label="Help contents">
        <strong>Music User Guide</strong>
        ${guideContents}
      </nav>
      <article class="it-help-content" tabindex="0"></article>
    </div>
  </section>`;
  host.append(layer);
  layer.style.left=`${Math.max(12,(host.clientWidth-Math.min(650,host.clientWidth-32))/2)}px`;
  layer.style.top='70px';
  const windowControl=windows?.register(layer,{handle:layer.querySelector('.it-help-toolbar'),label:'Music Help'});

  const content = layer.querySelector('.it-help-content');
  const back = layer.querySelector('[data-help="back"]');
  const forward = layer.querySelector('[data-help="forward"]');
  const contents = layer.querySelector('.it-help-contents');
  const search = layer.querySelector('input');
  let history = ['welcome'];
  let cursor = 0;
  let restoreFocus = null;
  let inertBefore = new Map();
  let destroyed = false;

  function guideHTML(page) {
    const entry=Object.hasOwn(guide,page)?guide[page]:null;
    if(entry)return '<div class="it-help-heading"><span class="it-help-mark" aria-hidden="true">♫</span><h2 id="'+titleId+'">'+entry.title+'</h2></div>'+entry.body;
    if(!page.startsWith('search:'))return null;
    const query=page.slice(7),terms=query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
    search.value=query;
    const entries=[...Object.entries(guide),['soundcloud',{title:'Playing music through SoundCloud',keywords:'soundcloud audio playback streaming widget browser privacy import',body:''}]];
    const matches=entries.filter(([,article])=>terms.every(term=>(article.title+' '+article.keywords+' '+article.body.replace(/<[^>]*>/g,' ')).toLocaleLowerCase().includes(term)));
    return '<div class="it-help-heading"><span class="it-help-mark" aria-hidden="true">?</span><h2 id="'+titleId+'">Search results</h2></div><p>'+ (query?'Results for “'+escapeText(query)+'”.':'Browse the local guide.')+'</p>'+(matches.length?'<div class="it-help-search-results">'+matches.map(([id,article])=>articleLink(id,article.title)).join('')+'</div>':'<p>The small librarian drew a blank. Try “import”, “settings”, “SoundCloud” or “Bandcamp”.</p>');
  }

  function render() {
    const replacingFocusedContent = content.contains(document.activeElement);
    const page = history[cursor];
    back.disabled = cursor === 0;
    forward.disabled = cursor === history.length - 1;
    for(const control of contents.querySelectorAll('[data-help-page]')) {
      const active=control.dataset.helpPage===page;control.setAttribute('aria-current',active?'page':'false');
      if(active&&control.closest('details'))control.closest('details').open=true;
    }
    const localArticle=guideHTML(page);
    content.innerHTML = localArticle!==null ? localArticle : page === 'soundcloud' ? `
      <div class="it-help-heading"><span class="it-help-mark" aria-hidden="true">♫</span><h2 id="${titleId}">Playing music through SoundCloud</h2></div>
      <p>This is an experimental connection to SoundCloud’s official embedded player. The music streams from SoundCloud; this website does not host or download the audio.</p>
      <h3>The first-time sign-in prompt</h3>
      <p>SoundCloud may open a sign-in or sign-up prompt on your first attempt to play. If you do not want to sign in, close the optional prompt and return to this desktop. Press Play again if playback has not started.</p>
      <p>This does not unlock restricted tracks: some music still requires a SoundCloud account, a subscription or availability in your region.</p>
      <h3>Two sets of controls, one player</h3>
      <p>Play, pause, previous, next, volume and seeking in Music control the same SoundCloud player. Changes made in the widget are reflected in Music. SoundCloud may still require a click in its own player before sound can start.</p>
      <p>SoundCloud may show a “Hear more on SoundCloud” screen over its controls. Those controls are still behind that screen: close it with × to reveal them. You can also keep using Music’s controls. This website does not dismiss or alter SoundCloud’s screen.</p>
      <h3>Moving between windows</h3>
      <p>Drag a window by its title bar, or focus the title bar and use the arrow keys. Click Music, SoundCloud or Help in the window switcher to bring it forward. Sending SoundCloud behind Music keeps the same player running. Closing its window pauses playback; the switcher can reopen it.</p>
      <h3>What importing means here</h3>
      <p>Import saves the selected track entries and artwork reference in this browser’s local library. It does not rip a CD, encode music, download SoundCloud audio or make tracks available offline. Another device or browser has a separate library.</p>
      <h3>Availability and privacy</h3>
      <p>SoundCloud receives your connection when you choose Continue in the first-play notice. Its player may use cookies or browser storage. Playback can depend on your connection, browser, region, account and the uploader’s permissions. Tracks can change, become previews or disappear; an imported entry does not guarantee access.</p>
      <h3>Why this may change or stop working</h3>
      <p>We have not obtained separate approval from SoundCloud for this collection-style interface. Showing a notice or keeping a widget visible does not itself establish permission under its terms. We may change or discontinue this feature if a later review finds that it does not comply with SoundCloud’s terms, or if SoundCloud changes its service.</p>
      <p>The first-play notice appears once for each SoundCloud album during this visit, before its player is loaded. Cancelling leaves the album in your library without starting SoundCloud.</p>
      <h3>SoundCloud’s information</h3>
      <div class="it-help-links"><a href="https://soundcloud.com/terms-of-use" target="_blank" rel="noopener noreferrer">SoundCloud Terms of Use ↗</a><a href="https://soundcloud.com/pages/privacy" target="_blank" rel="noopener noreferrer">SoundCloud Privacy Policy ↗</a><a href="https://developers.soundcloud.com/docs/api/html5-widget" target="_blank" rel="noopener noreferrer">How the official Widget API works ↗</a></div>` : page === 'offline' ? `
      <div class="it-help-heading"><span class="it-help-mark" aria-hidden="true">?</span><h2 id="${titleId}">This corner of Help is offline</h2></div>
      <p>This is our local impression of an offline Help page. It has not checked your connection. For the real thing, these are the usual routes onto the internet.</p>
      <table class="it-help-methods"><thead><tr><th>Connection method</th><th>Description</th></tr></thead><tbody>
        <tr><td>Wi-Fi</td><td>Choose a wireless network on your computer.</td></tr>
        <tr><td>Personal Hotspot</td><td>Use a nearby phone or tablet to share an internet connection.</td></tr>
        <tr><td>Ethernet</td><td>Connect your computer to an Ethernet network using a cable and, if needed, an adapter.</td></tr>
      </tbody></table>
      <p class="it-help-local-note">The help has wandered off. Your local collection has sensibly stayed put.</p>
      <h3>See also</h3>
      <div class="it-help-links">
        <button type="button" data-help="soundcloud">Playing music through SoundCloud</button>
        <button type="button" data-help="unavailable">Import music from CDs</button>
        <button type="button" data-help="unavailable">Connect your Mac to the internet using Wi-Fi</button>
        <button type="button" data-help="unavailable">Use Wireless Diagnostics on your Mac</button>
      </div>` : `
      <div class="it-help-heading"><span class="it-help-mark" aria-hidden="true">?</span><h2 id="${titleId}">The selected content is currently unavailable</h2></div>
      <p>The trail ends at this little stand-in page. There is no remote article waiting to load here.</p>
      <p>In a full-size Help window, the usual suspects would be:</p>
      <ul><li>The server may be unreachable.</li><li>The network may be unavailable.</li><li>The content may not exist.</li></ul>
      <p>For another small detour, visit our <button class="it-help-inline-link" type="button" data-help-page="offline">offline Help page</button>, or use Home to return to the working guide.</p>
      <p class="it-help-local-note">Even the help needs help sometimes.</p>`;
    content.scrollTop = 0;
    // A followed article link is removed above. Keep keyboard focus inside the
    // viewer; toolbar/search controls that remain available keep their focus.
    if (!layer.hidden && (replacingFocusedContent || !layer.contains(document.activeElement) || document.activeElement?.disabled)) {
      content.focus({preventScroll:true});
    }
  }

  function navigate(page) {
    if (history[cursor] !== page) {
      history = history.slice(0, cursor + 1);
      history.push(page);
      cursor++;
    }
    render();
  }

  function open(page = 'welcome') {
    if (destroyed) return;
    if(typeof page!=='string')page='welcome';
    if (layer.hidden) {
      restoreFocus = host.contains(document.activeElement) ? document.activeElement : null;
      // Help is an independent desktop window; Music's own sheets retain their
      // modality, while the other windows remain available behind this one.
    }
    history = ['welcome',...(page==='welcome'?[]:[page])];
    cursor = history.length - 1;
    search.value = '';
    contents.hidden = host.clientWidth<560;
    layer.querySelector('[data-help="contents"]').setAttribute('aria-expanded', String(!contents.hidden));
    render();
    layer.hidden = false;
    windowControl?.setVisible(true);windowControl?.raise();onShow();
    layer.querySelector('[data-help="close"]').focus({preventScroll:true});
  }

  function close(restore = true) {
    if (layer.hidden) return;
    layer.hidden = true;
    windowControl?.setVisible(false);
    for (const [child, inert] of inertBefore) if (child.isConnected) child.inert = inert;
    inertBefore.clear();
    if (restore && restoreFocus?.isConnected && !restoreFocus.closest('[inert]')) restoreFocus.focus({preventScroll:true});
    restoreFocus = null;
  }

  function click(event) {
    const control = event.target.closest('button[data-help],button[data-help-page]');
    if (!control || control.disabled) return;
    // Parent Music dialogs must not consume Help's own controls or shortcuts.
    event.stopPropagation();
    if(control.dataset.helpPage){
      navigate(control.dataset.helpPage);
      if(layer.offsetWidth<460){contents.hidden=true;layer.querySelector('[data-help="contents"]').setAttribute('aria-expanded','false');content.focus({preventScroll:true});}
      return;
    }
    switch (control.dataset.help) {
      case 'close':close();break;
      case 'back':if (cursor > 0) {cursor--;render();}break;
      case 'forward':if (cursor < history.length - 1) {cursor++;render();}break;
      case 'home':navigate('welcome');break;
      case 'unavailable':navigate('unavailable');break;
      case 'soundcloud':navigate('soundcloud');break;
      case 'contents':contents.hidden = !contents.hidden;control.setAttribute('aria-expanded', String(!contents.hidden));break;
    }
  }

  function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    navigate('search:'+search.value.trim().slice(0,160));
  }

  function keydown(event) {
    if (layer.hidden) return;
    event.stopPropagation();
    if (event.key === 'Escape') {event.preventDefault();close();return;}
  }

  layer.addEventListener('click', click);
  layer.addEventListener('submit', submit);
  layer.addEventListener('keydown', keydown);
  return {
    open,
    close,
    raise(){if(!layer.hidden){windowControl?.raise();layer.querySelector('[data-help="close"]').focus({preventScroll:true});}},
    get element(){return layer;},
    get isOpen() {return !layer.hidden;},
    destroy() {
      close(false);
      destroyed = true;
      windowControl?.destroy();
      layer.removeEventListener('click', click);
      layer.removeEventListener('submit', submit);
      layer.removeEventListener('keydown', keydown);
      layer.remove();
    },
  };
}
