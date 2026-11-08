import { windowControlIcon } from './window-control-icons.js';

function soundCloudLink(value) {
  try{
    const url=new URL(value);
    return url.protocol==='https:'&&!url.username&&!url.password&&['soundcloud.com','www.soundcloud.com'].includes(url.hostname)?url.href:null;
  }catch{return null;}
}

/** One persistent, visible official widget window. Media is loaded by the transport. */
export function createSoundCloudWindow({host,windows,onClose=()=>{},onHelp=()=>{},onMusic=()=>{},onFocus=()=>{}}) {
  const doc=host.ownerDocument;
  const make=(tag,className,text)=>{const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const element=make('section','it-floating-window it-soundcloud-window');element.hidden=true;element.setAttribute('role','region');element.setAttribute('aria-label','SoundCloud player');
  const header=make('header','it-floating-titlebar');
  const closeButton=make('button','it-floating-close');closeButton.innerHTML=windowControlIcon('close');closeButton.type='button';closeButton.setAttribute('aria-label','Close SoundCloud player');closeButton.title='Close SoundCloud player';
  const title=make('span','it-window-title','SoundCloud');
  const behind=make('button','it-soundcloud-behind','Behind Music');behind.type='button';behind.title='Put SoundCloud behind the Music window';
  header.append(closeButton,title,behind);
  const intro=make('div','it-soundcloud-intro');
  const guidance=make('div');
  guidance.append(make('p','','Music’s controls also work with this player.'),make('p','','A “Hear more” screen may cover SoundCloud’s controls. Close × to reveal them, or use Music.'));
  intro.append(guidance);
  const learn=make('button','it-soundcloud-learn','Learn more');learn.type='button';intro.append(learn);
  function createFrame(){
    const frame=make('iframe','it-soundcloud-frame');frame.src='about:blank';frame.title='SoundCloud player';frame.allow='autoplay; encrypted-media https://w.soundcloud.com';frame.referrerPolicy='strict-origin-when-cross-origin';frame.height='166';frame.setAttribute('scrolling','no');return frame;
  }
  let iframe=createFrame();
  const media=make('div','it-soundcloud-media'),loading=make('div','it-soundcloud-loading','Loading SoundCloud…');loading.hidden=true;loading.setAttribute('aria-live','polite');media.append(iframe,loading);
  const credits=make('div','it-soundcloud-credits');
  const artistLink=make('a','it-soundcloud-uploader'),sourceLink=make('a','it-soundcloud-source','Open on SoundCloud ↗');
  for(const link of [artistLink,sourceLink]){link.target='_blank';link.rel='noopener noreferrer';}
  credits.append(artistLink,sourceLink);
  const status=make('p','it-soundcloud-status','Ready for SoundCloud playback.');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const content=make('div','it-soundcloud-content');content.append(intro,media,credits,status);
  element.append(header,content);host.append(element);
  // Position in desktop layout units; the manager handles zoom and perspective.
  element.style.left=`${Math.max(12,(host.clientWidth-Math.min(500,host.clientWidth-24))/2)}px`;
  element.style.top=`${Math.max(12,Math.min(70,host.clientHeight-270))}px`;
  const managed=windows.register(element,{handle:header,label:'SoundCloud player'});
  let destroyed=false;
  function close(){if(!destroyed)managed.setVisible(false);}
  const requestClose=()=>{close();onClose();};
  const back=()=>{onMusic();managed.sendBack();};
  const help=()=>onHelp();
  const focus=()=>{if(!destroyed&&!element.hidden)onFocus();};
  function update({album,track}={}){
    if(destroyed)return;
    title.textContent=track?.title?`${track.title} · SoundCloud`:'SoundCloud';
    iframe.title=track?.title?`${track.title} on SoundCloud`:'SoundCloud player';
    const source=soundCloudLink(track?.soundcloudURL)||soundCloudLink(album?.soundcloudPlaylist);
    let uploader=soundCloudLink(track?.soundcloudUploader)||soundCloudLink(album?.soundcloudUploader);
    if(!uploader&&source){const url=new URL(source),name=url.pathname.split('/').filter(Boolean)[0];if(name)uploader=`${url.origin}/${name}`;}
    const uploaderName=track?.soundcloudUploaderName||album?.soundcloudUploaderName||album?.artist;
    artistLink.textContent=uploaderName?`Uploaded by ${uploaderName}`:'Uploader on SoundCloud';
    artistLink.hidden=!uploader;if(uploader)artistLink.href=uploader;else artistLink.removeAttribute('href');
    sourceLink.hidden=!source;if(source)sourceLink.href=source;else sourceLink.removeAttribute('href');
  }
  function setLoading(value){
    if(destroyed)return;
    const pending=Boolean(value);media.classList.toggle('is-loading',pending);loading.hidden=!pending;
    iframe.inert=pending;iframe.setAttribute('aria-busy',String(pending));
    if(pending)iframe.setAttribute('aria-hidden','true');else iframe.removeAttribute('aria-hidden');
    // Only one live region speaks during connection; the footer resumes when ready.
    status.setAttribute('aria-live',pending?'off':'polite');
  }
  // Call only after destroying the transport for a full media reset. Ordinary
  // raising, closing/reopening and track changes keep the current browsing context.
  function resetFrame(){
    if(destroyed)return null;
    const previous=iframe;iframe=createFrame();previous.replaceWith(iframe);setLoading(false);
    status.textContent='Ready for SoundCloud playback.';return iframe;
  }
  closeButton.addEventListener('click',requestClose);behind.addEventListener('click',back);learn.addEventListener('click',help);
  element.addEventListener('pointerdown',focus,true);element.addEventListener('focusin',focus);
  return {
    get iframe(){return iframe;},element,update,setLoading,resetFrame,
    open(context={}){
      if(destroyed)return;
      update(context);managed.setVisible(true);managed.raise();
    },
    setStatus(message){status.textContent=String(message||'');},
    close,
    raise(){if(!destroyed)managed.setVisible(true);},
    sendBack(){if(!destroyed)managed.sendBack();},
    get isOpen(){return !destroyed&&!element.hidden;},
    destroy(){
      if(destroyed)return;destroyed=true;
      closeButton.removeEventListener('click',requestClose);behind.removeEventListener('click',back);learn.removeEventListener('click',help);
      element.removeEventListener('pointerdown',focus,true);element.removeEventListener('focusin',focus);managed.destroy();element.remove();
    },
  };
}
