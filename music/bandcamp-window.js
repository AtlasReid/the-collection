import { windowControlIcon } from './window-control-icons.js';

const MAX_BANDCAMP_ID=4294967295;

function bandcampId(value) {
  if(typeof value==='number')return Number.isSafeInteger(value)&&value>0&&value<=MAX_BANDCAMP_ID?String(value):null;
  if(typeof value!=='string'||! /^[1-9]\d{0,9}$/.test(value))return null;
  return Number(value)<=MAX_BANDCAMP_ID?value:null;
}

/** Only canonical artist album/track pages may become source links. */
export function bandcampSourceURL(value) {
  if(typeof value!=='string'||value.length>2048||value!==value.trim())return null;
  try{
    const authority=value.match(/^https:\/\/([^/?#]+)/i)?.[1];
    if(!authority||! /^(?!www\.)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.bandcamp\.com$/i.test(authority))return null;
    const rawPath=value.slice(value.indexOf(authority)+authority.length);
    if(! /^\/(?:album|track)\/[a-z0-9][a-z0-9-]{0,199}\/?$/i.test(rawPath))return null;
    const url=new URL(value);
    if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash)return null;
    if(! /^\/(?:album|track)\/[a-z0-9][a-z0-9-]{0,199}\/?$/i.test(url.pathname))return null;
    return url.href;
  }catch{return null;}
}

/** Official album widget. No provider API, proxy or audio URL is involved. */
export function bandcampEmbedURL(album,track) {
  const source=bandcampSourceURL(album?.bandcampURL),id=bandcampId(album?.bandcampAlbumId);
  if(!source||!id||!new URL(source).pathname.startsWith('/album/'))return null;
  let selectedTrack='';
  if(track!==undefined&&track!==null){
    const trackSource=bandcampSourceURL(track.bandcampURL),trackId=bandcampId(track.bandcampTrackId);
    if(!trackSource||!trackId||new URL(trackSource).hostname!==new URL(source).hostname||!new URL(trackSource).pathname.startsWith('/track/'))return null;
    selectedTrack=`track=${trackId}/`;
  }
  // The official Share/Embed dialog generates album + track for a selected
  // song. Omitting tracklist=false retains the album's native track list.
  return `https://bandcamp.com/EmbeddedPlayer/album=${id}/size=large/bgcol=ffffff/linkcol=0687f5/artwork=small/${selectedTrack}transparent=true/`;
}

/** One visible official player. Closing unloads it because Bandcamp has no pause API. */
export function createBandcampWindow({host,windows,onClose=()=>{},onHelp=()=>{},onMusic=()=>{}}={}) {
  if(!host?.ownerDocument||!windows?.register)throw new TypeError('Bandcamp needs a desktop host and its window manager.');
  const document=host.ownerDocument;
  const make=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const element=make('section','it-floating-window it-bandcamp-window');element.hidden=true;element.setAttribute('role','region');element.setAttribute('aria-label','Bandcamp player');
  const header=make('header','it-floating-titlebar');
  const closeButton=make('button','it-floating-close');closeButton.type='button';closeButton.innerHTML=windowControlIcon('close');closeButton.setAttribute('aria-label','Close Bandcamp player');closeButton.title='Close Bandcamp player';
  const title=make('span','it-window-title','Bandcamp');
  const behind=make('button','it-bandcamp-behind','Behind Music');behind.type='button';behind.title='Put Bandcamp behind the Music window';
  header.append(closeButton,title,behind);
  const introduction=make('div','it-bandcamp-intro');
  const guidance=make('div');guidance.append(make('p','','Use Bandcamp’s player for play, pause and seeking.'),make('p','it-bandcamp-note','Music does not receive its playback position. Closing this window stops the player.'));
  const learn=make('button','it-bandcamp-learn','Learn more');learn.type='button';introduction.append(guidance,learn);
  const iframe=make('iframe','it-bandcamp-frame');iframe.src='about:blank';iframe.title='Official Bandcamp player';iframe.allow='autoplay';iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.height='400';iframe.setAttribute('scrolling','no');
  const media=make('div','it-bandcamp-media');media.append(iframe);
  const credits=make('div','it-bandcamp-credits');
  const artistLink=make('a','it-bandcamp-artist'),sourceLink=make('a','it-bandcamp-source','Open on Bandcamp ↗');
  for(const link of [artistLink,sourceLink]){link.target='_blank';link.rel='noopener noreferrer';link.hidden=true;}
  credits.append(artistLink,sourceLink);
  const footer=make('div','it-bandcamp-footer');
  const music=make('button','it-bandcamp-music','Back to Music');music.type='button';footer.append(make('span','it-bandcamp-brand','bandcamp'),music);
  const content=make('div','it-bandcamp-content');content.append(introduction,media,credits,footer);element.append(header,content);host.append(element);
  element.style.left=`${Math.max(12,(host.clientWidth-Math.min(430,host.clientWidth-24))/2)}px`;
  element.style.top=`${Math.max(28,Math.min(58,host.clientHeight-350))}px`;
  const bounds=()=>{
    const bar=host.querySelector?.('.screen-menu-bar,.mac-menu-bar'),top=Math.max(28,bar?.offsetHeight||0);
    return {left:8,top:top+6,width:Math.max(0,host.clientWidth-16),height:Math.max(0,host.clientHeight-top-62)};
  };
  const managed=windows.register(element,{handle:header,label:'Bandcamp player',getBounds:bounds});
  let destroyed=false,loadedURL=null,context=null;
  function close(){
    if(destroyed)return;
    managed.setVisible(false);
    if(loadedURL!==null){iframe.src='about:blank';loadedURL=null;}
  }
  function open(next={}){
    if(destroyed)return false;
    const url=bandcampEmbedURL(next.album,next.track);if(!url)return false;
    const source=bandcampSourceURL(next.track?.bandcampURL)||bandcampSourceURL(next.album.bandcampURL),artist=new URL(source).origin;
    context={album:{bandcampURL:next.album.bandcampURL,bandcampAlbumId:next.album.bandcampAlbumId,title:next.album.title,artist:next.album.artist},track:next.track?{bandcampURL:next.track.bandcampURL,bandcampTrackId:next.track.bandcampTrackId,title:next.track.title}:undefined};
    const name=next.track?.title||next.album.title;title.textContent=name?`${name} · Bandcamp`:'Bandcamp';
    iframe.title=name?`${name} on Bandcamp`:'Official Bandcamp player';
    artistLink.textContent=next.album.artist||'Artist on Bandcamp';artistLink.href=artist;artistLink.hidden=false;
    sourceLink.href=source;sourceLink.hidden=false;
    if(loadedURL!==url){iframe.src=url;loadedURL=url;}
    managed.setVisible(true);managed.raise();return true;
  }
  const userClose=()=>{if(destroyed)return;close();onClose();};
  const background=()=>{if(destroyed)return;onMusic();managed.sendBack();};
  const help=()=>{if(!destroyed)onHelp();};
  const showMusic=()=>{if(!destroyed)onMusic();};
  closeButton.addEventListener('click',userClose);behind.addEventListener('click',background);learn.addEventListener('click',help);music.addEventListener('click',showMusic);
  return {
    open,close,
    get element(){return element;},get iframe(){return iframe;},get isOpen(){return !destroyed&&!element.hidden;},
    raise(){if(destroyed||!context)return false;if(loadedURL===null)return open(context);managed.setVisible(true);managed.raise();return true;},
    sendBack(){if(!destroyed)managed.sendBack();},
    destroy(){
      if(destroyed)return;close();destroyed=true;context=null;
      closeButton.removeEventListener('click',userClose);behind.removeEventListener('click',background);learn.removeEventListener('click',help);music.removeEventListener('click',showMusic);
      managed.destroy();element.remove();
    },
  };
}
