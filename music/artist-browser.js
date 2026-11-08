// The Artists browser uses only the imported entries supplied by its owner.
// It does not read storage, fetch artist profiles or register global listeners.
export function renderArtistBrowser({container,entries=[],selectedArtist='',onSelect=()=>{},onAlbum=()=>{}}={}) {
  const restoreSelectionFocus=container.contains(container.ownerDocument.activeElement);
  const listScroll=container.querySelector('.it-artists-list')?.scrollTop||0;
  if(!container?.ownerDocument)throw new TypeError('Artists needs a DOM container.');
  const document=container.ownerDocument;
  const make=(tag,className,text)=>{
    const node=document.createElement(tag);if(className)node.className=className;
    if(text!==undefined)node.textContent=text;return node;
  };
  const plural=(count,singular)=>`${count} ${singular}${count===1?'':'s'}`;
  const imported=entries.filter(entry=>entry?.album&&Array.isArray(entry.record?.trackIds)&&entry.record.trackIds.length);
  const groups=new Map();
  for(const entry of imported){
    const name=String(entry.album.artist||'Unknown Artist');
    if(!groups.has(name))groups.set(name,[]);groups.get(name).push(entry);
  }
  const artists=[...groups.keys()].sort((a,b)=>a.localeCompare(b));
  const current=groups.has(selectedArtist)?selectedArtist:'';
  const visible=current?groups.get(current):imported;
  const songCount=visible.reduce((sum,{record})=>sum+record.trackIds.length,0);
  function avatar(name,all=false){
    const node=make('span','it-artists-avatar');node.setAttribute('aria-hidden','true');
    if(all){
      node.classList.add('it-artists-avatar-all');
      node.innerHTML='<svg viewBox="0 0 40 40" fill="none" focusable="false"><circle cx="20" cy="20" r="20" fill="currentColor" opacity=".1"/><rect x="16" y="9" width="8" height="16" rx="4" stroke="currentColor" stroke-width="1.8"/><path d="M12.5 19.5v2a7.5 7.5 0 0 0 15 0v-2M20 29v5M15 34h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
      return node;
    }
    const parts=name.trim().split(/\s+/).filter(Boolean);
    const initials=(parts.length>1?parts.slice(0,2).map(part=>Array.from(part)[0]).join(''):Array.from(parts[0]||'?').slice(0,2).join('')).toLocaleUpperCase();
    let colour=0;for(const character of name)colour=(colour+character.codePointAt(0)*17)%360;
    node.style.setProperty('--it-artists-avatar-colour',`hsl(${colour} 17% 55%)`);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 40 40');svg.setAttribute('focusable','false');
    const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.setAttribute('cx','20');circle.setAttribute('cy','20');circle.setAttribute('r','20');
    const text=document.createElementNS('http://www.w3.org/2000/svg','text');text.setAttribute('x','20');text.setAttribute('y','25');text.setAttribute('text-anchor','middle');text.textContent=initials;
    svg.append(circle,text);node.append(svg);return node;
  }

  const shell=make('div','it-artists-browser');
  const sidebar=make('nav','it-artists-list');sidebar.setAttribute('aria-label','Artists');
  const list=make('ul','it-artists-rows');
  function artistRow(name,albums,all=false){
    const row=make('li','it-artists-row');
    const button=make('button','it-artists-choice');button.type='button';
    const active=all?!current:current===name;button.classList.toggle('is-current',active);
    button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',`Show ${name}, ${plural(albums.length,'album')}`);
    const text=make('span','it-artists-label');text.append(make('strong','',name),make('small','',plural(albums.length,'album')));
    button.append(avatar(name,all),text);button.addEventListener('click',()=>onSelect(all?'':name));
    row.append(button);list.append(row);
  }
  artistRow('All Artists',imported,true);
  for(const name of artists)artistRow(name,groups.get(name));
  sidebar.append(list);

  const detail=make('section','it-artists-detail');detail.setAttribute('aria-label',current?`${current} albums`:'All artist albums');
  const heading=make('header','it-artists-heading');
  const headingText=make('div','it-artists-heading-copy');headingText.append(make('h2','',current||'All Artists'));
  const counts=(current?'':`${plural(artists.length,'artist')} · `)+`${plural(visible.length,'album')} · ${plural(songCount,'song')}`;
  headingText.append(make('p','',counts));heading.append(avatar(current||'All Artists',!current),headingText);detail.append(heading);
  if(!imported.length){
    const empty=make('div','it-artists-empty');empty.append(make('strong','','No artists yet.'),make('p','','Your CDs are waiting in the wings.'));detail.append(empty);
  }else{
    const grid=make('div','it-artists-albums');
    for(const {album,record} of visible){
      const card=make('button','it-artists-album');card.type='button';
      card.setAttribute('aria-label',`Open ${album.title}, ${plural(record.trackIds.length,'imported song')}`);
      const cover=make('img','it-artists-cover');cover.src=album.cover;cover.alt='';cover.draggable=false;
      const count=record.trackIds.length===album.tracks.length?plural(record.trackIds.length,'song'):`${record.trackIds.length} of ${album.tracks.length} songs imported`;
      card.append(cover,make('strong','it-artists-album-title',album.title),make('span','it-artists-album-artist',album.artist),make('small','it-artists-album-count',count));
      card.addEventListener('click',()=>onAlbum(album));grid.append(card);
    }
    detail.append(grid);
  }
  shell.append(sidebar,detail);container.replaceChildren(shell);
  sidebar.scrollTop=listScroll;
  if(restoreSelectionFocus)shell.querySelector('.it-artists-choice[aria-pressed="true"]')?.focus({preventScroll:true});
  return {element:shell,destroy(){shell.remove();}};
}
