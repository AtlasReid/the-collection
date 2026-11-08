// A local menu bar for the virtual desktop. Commands never reach macOS.
const separator=null;
const item=(label,command,options={})=>({label,command,...options});
const explain=(label,options={})=>item(label,`explain:${label}` ,options);
const submenu=(label,children)=>({label,children});
const track=state=>!state.hasTrack;
const disc=state=>!state.hasDisc;
const externalPlayback=state=>Boolean(state.externalPlayback);
const noRemoteTrackControl=state=>!state.hasTrack||externalPlayback(state);
const noPlaybackSource=state=>!state.hasTrack&&!externalPlayback(state);
const appleIcon='<svg viewBox="0 0 22 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M14.4 4.6c.9-1 1.3-2.2 1.2-3.5-1.3.1-2.7.9-3.5 1.8-.8.8-1.4 2.1-1.2 3.3 1.4.1 2.6-.7 3.5-1.6ZM18.3 12.8c0-2 1.1-3.1 2.1-3.8-1.1-1.6-2.8-2.1-3.7-2.2-1.6-.2-3 .9-3.8.9-.9 0-2.1-.9-3.5-.8-1.8 0-3.6 1.1-4.5 2.8-1.9 3.3-.5 8.1 1.3 10.8.9 1.3 1.9 2.7 3.3 2.6 1.3 0 1.8-.8 3.4-.8 1.5 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.2-2.6 1-1.5 1.4-2.9 1.5-3-2.2-.9-2.7-3.3-2.7-4.7Z"/></svg>';

function menuDefinitions() {
  return [
    {label:'Apple',icon:appleIcon,items:[item('About This Virtual Mac','about-mac'),separator,item('System Settings…','system-settings'),submenu('Recent Items',[item('Music','show-all'),item('Acknowledgements.rtf','acknowledgements')]),separator,explain('Force Quit…'),separator,explain('Sleep'),explain('Restart…'),explain('Shut Down…'),separator,explain('Lock Screen')]},
    {label:'Music',items:[item('About Music','about-music'),separator,item('Settings…','settings',{shortcut:'⌘,'}),{...submenu('Services',[]),disabled:true},separator,item('Hide Music','hide',{shortcut:'⌘H'}),item('Hide Others','hide-others',{shortcut:'⌥⌘H'}),item('Show All','show-all'),separator,item('Quit Music','quit',{shortcut:'⌘Q'})]},
    {label:'File',items:[submenu('New',[explain('Playlist'),explain('Playlist from Selection',{disabled:track}),explain('Smart Playlist'),explain('Playlist Folder'),explain('Genius Playlist',{disabled:track})]),explain('Open Stream URL…'),separator,item('Close','close',{shortcut:'⌘W'}),submenu('Library',[explain('Update Cloud Library'),explain('Update Genius'),explain('Organise Library…'),explain('Export Library…'),explain('Import Playlist…'),explain('Export Playlist…'),explain('Show Duplicate Items'),explain('Get Album Artwork'),explain('Get Track Names',{disabled:disc})]),separator,item('Import…','import'),explain('Burn Playlist to Disc…',{disabled:true}),explain('Show in Finder',{disabled:true}),submenu('Convert',[explain('Convert ID3 Tags…',{disabled:true}),explain('Create Apple Lossless Version',{disabled:true}),explain('Convert to Apple Lossless…'),explain('Create iPod or iPhone Version',{disabled:true}),explain('Create iPad or Apple TV Version',{disabled:true})]),separator,explain('Page Setup…'),explain('Print…',{shortcut:'⌘P'})]},
    {label:'Edit',items:[explain('Undo',{disabled:true,shortcut:'⌘Z'}),explain('Redo',{disabled:true,shortcut:'⇧⌘Z'}),separator,explain('Cut',{disabled:true,shortcut:'⌘X'}),explain('Copy',{disabled:true,shortcut:'⌘C'}),explain('Paste',{disabled:true,shortcut:'⌘V'}),explain('Select All',{disabled:true,shortcut:'⌘A'}),separator,submenu('Writing Tools',['Show Writing Tools','Proofread','Rewrite','Make Friendly','Make Professional','Make Concise','Summarise','Create Key Points','Make List','Make Table','Compose…'].map(label=>explain(label,{disabled:true}))),submenu('AutoFill',['Contact…','Passwords…','Credit Card…'].map(label=>explain(label,{disabled:true}))),separator,explain('Start Dictation',{disabled:true}),explain('Emoji & Symbols')]},
    {label:'Song',items:[submenu('Add to Playlist',[explain('New Playlist',{disabled:track})]),submenu('Share',[explain('Copy Link',{disabled:track}),explain('Share Song…',{disabled:track})]),separator,explain('Play Next',{disabled:track}),explain('Add to Queue',{disabled:track}),explain('Create Station',{disabled:track}),separator,item('Get Info…','info',{disabled:state=>!state.hasTrack&&!state.hasDisc,shortcut:'⌘I'}),item('Show Artist in Library','view-artists'),item('Show Album in Library','view-albums'),item('Show in Apple Music','subscription'),item('Show in iTunes Store','view-store'),separator,explain('Remove from Playlist',{disabled:true}),explain('Delete from Library',{disabled:true}),explain('Download',{disabled:true})]},
    {label:'View',items:[item('All Music','view-albums'),explain('Only Downloaded Music'),submenu('Sort By',['Title','Genre','Year','Rating','Ascending','Descending'].map(label=>explain(label))),separator,explain('Show View Options'),item('Find','search',{shortcut:'⌘F'}),item('Show Playing Next','queue'),item('Show Lyrics','lyrics'),explain('Show Status Bar'),separator,item('Enter Full Screen','maximize')]},
    {label:'Controls',items:[item(state=>state.externalPlayback?'Open Bandcamp player':state.playing?'Pause':'Play','play-pause',{disabled:noPlaybackSource,shortcut:'Space'}),item('Stop','stop',{disabled:noPlaybackSource}),item('Next Track','next',{disabled:noRemoteTrackControl,shortcut:'⌘→'}),item('Previous Track','previous',{disabled:noRemoteTrackControl,shortcut:'⌘←'}),separator,explain('Genius Shuffle'),item('Go to Current Song','current-song',{disabled:track}),separator,item('Increase Volume','volume-up',{disabled:externalPlayback,shortcut:'⌘↑'}),item('Decrease Volume','volume-down',{disabled:externalPlayback,shortcut:'⌘↓'}),submenu('Shuffle',[item('On','shuffle-on',{disabled:externalPlayback,checked:state=>Boolean(state.shuffle)}),item('Off','shuffle-off',{disabled:externalPlayback,checked:state=>!state.shuffle}),separator,explain('Songs'),explain('Albums'),explain('Groupings')]),submenu('Repeat',[item('Off','repeat-off',{disabled:externalPlayback,checked:state=>!state.repeat||state.repeat==='off'}),item('All','repeat-all',{disabled:externalPlayback,checked:state=>state.repeat===true||state.repeat==='all'}),item('One','repeat-one',{disabled:externalPlayback,checked:state=>state.repeat==='one'})])]},
    {label:'Account',items:[explain('Sign In…'),explain('Account Settings…'),separator,explain('Notifications…'),explain('Apps With Access…'),submenu('Authorisations',[explain('Authorise This Computer…'),explain('De-authorise This Computer…')]),separator,explain('Redeem…'),explain('Wish List'),explain('Purchased'),explain('Check for Available Downloads…')]},
    {label:'Window',items:[item('Minimise','minimize',{shortcut:'⌘M'}),item('Zoom','maximize'),item('Fill','maximize'),item('Centre','centre'),submenu('Move & Resize',['Left','Right','Top','Bottom','Return to Previous Size'].map(label=>explain(label))),separator,item('Music','show-all'),explain('Equaliser'),explain('Mini Player'),item('Activity','activity'),explain('Visualiser'),explain('Switch to Mini Player'),separator,item('Bring All to Front','show-all')]},
    {label:'Help',items:[item('Music Help','help'),item('Bandcamp playback','help-bandcamp'),item('Keyboard Shortcuts','shortcuts'),item('Apple Service and Support','support')]},
  ];
}

export function createDesktopMenu({bar,host,onCommand=()=>{},getState=()=>({})}={}) {
  if(!bar?.ownerDocument||!host)throw new TypeError('A desktop menu needs its bar and host.');
  const document=bar.ownerDocument,definitions=menuDefinitions(),listeners=[];
  const nav=document.createElement('nav');nav.className='vm-menubar';nav.setAttribute('role','menubar');nav.setAttribute('aria-label','Virtual desktop menus');
  const levels=[];let active=-1,destroyed=false;
  const value=(entry,state)=>typeof entry==='function'?entry(state):entry;
  const listen=(node,event,callback,options)=>{node.addEventListener(event,callback,options);listeners.push(()=>node.removeEventListener(event,callback,options));};
  const localPosition=node=>{
    let left=0,top=0,current=node;
    while(current&&current!==host){left+=current.offsetLeft||0;top+=current.offsetTop||0;current=current.offsetParent;}
    return {left:left-nav.scrollLeft,top};
  };
  const setTopFocus=index=>{topButtons.forEach((button,i)=>button.tabIndex=i===index?0:-1);};
  function clearAfter(level) {
    while(levels.length>level){const old=levels.pop();old.parent?.setAttribute('aria-expanded','false');old.panel.remove();}
  }
  function close({restoreFocus=false}={}) {
    const previous=active;clearAfter(0);active=-1;
    topButtons.forEach(button=>button.setAttribute('aria-expanded','false'));bar.classList.remove('vm-menu-open');
    if(restoreFocus&&previous>=0){setTopFocus(previous);topButtons[previous].focus({preventScroll:true});}
  }
  function focusRow(level,index) {
    const entry=levels[level];if(!entry?.rows.length)return;
    const bounded=(index+entry.rows.length)%entry.rows.length;entry.index=bounded;
    entry.rows.forEach((row,i)=>row.tabIndex=i===bounded?0:-1);entry.rows[bounded].focus({preventScroll:true});
  }
  function place(panel,left,top) {
    const width=host.clientWidth||document.documentElement.clientWidth,height=host.clientHeight||document.documentElement.clientHeight;
    const maxWidth=Math.max(120,width-12);panel.style.maxWidth=`${maxWidth}px`;
    panel.style.maxHeight=`${Math.max(64,height-40)}px`;
    panel.style.left=`${Math.max(6,Math.min(left,width-panel.offsetWidth-6))}px`;
    panel.style.top=`${Math.max(28,Math.min(top,height-panel.offsetHeight-8))}px`;
  }
  function openSubmenu(parent,entry,level,focus=false) {
    if(parent.disabled)return;
    if(levels[level+1]?.parent===parent){if(focus)focusRow(level+1,0);return;}
    clearAfter(level+1);parent.setAttribute('aria-expanded','true');
    const origin=levels[level].panel,left=parseFloat(origin.style.left)||0,top=(parseFloat(origin.style.top)||0)+parent.offsetTop-origin.scrollTop;
    const panel=buildPanel(entry.children,level+1,parent);
    const width=host.clientWidth||document.documentElement.clientWidth;
    const nextLeft=left+origin.offsetWidth+2;
    place(panel,nextLeft+panel.offsetWidth>width-6?left-panel.offsetWidth-2:nextLeft,top);
    if(focus)focusRow(level+1,0);
  }
  function run(entry) {
    if(getState().modalOpen)return close();
    close({restoreFocus:true});onCommand(entry.command);
  }
  function buildPanel(items,level,parent=null) {
    const state=getState(),panel=document.createElement('div');panel.className='vm-menu-panel';panel.setAttribute('role','menu');panel.setAttribute('aria-label',parent?.querySelector('.vm-menu-label')?.textContent||definitions[active].label);
    panel.dataset.menuLevel=String(level);const rows=[];
    for(const entry of items){
      if(!entry){const rule=document.createElement('div');rule.className='vm-menu-separator';rule.setAttribute('role','separator');panel.append(rule);continue;}
      const row=document.createElement('button');row.type='button';row.className='vm-menu-item';row.tabIndex=-1;
      row.setAttribute('role',entry.checked?'menuitemcheckbox':'menuitem');row.disabled=Boolean(value(entry.disabled,state));row.setAttribute('aria-disabled',String(row.disabled));
      if(entry.checked)row.setAttribute('aria-checked',String(Boolean(value(entry.checked,state))));
      const mark=document.createElement('span');mark.className='vm-menu-mark';mark.setAttribute('aria-hidden','true');mark.textContent=entry.checked&&value(entry.checked,state)?'✓':'';
      const label=document.createElement('span');label.className='vm-menu-label';label.textContent=value(entry.label,state);row.append(mark,label);
      if(entry.children){row.setAttribute('aria-haspopup','menu');row.setAttribute('aria-expanded','false');const arrow=document.createElement('span');arrow.className='vm-menu-arrow';arrow.textContent='›';arrow.setAttribute('aria-hidden','true');row.append(arrow);}
      else if(entry.shortcut){const key=document.createElement('span');key.className='vm-menu-shortcut';key.textContent=entry.shortcut;key.setAttribute('aria-hidden','true');row.append(key);}
      row.addEventListener('click',event=>{event.stopPropagation();if(row.disabled)return;if(entry.children)openSubmenu(row,entry,level,true);else run(entry);});
      row.addEventListener('pointerenter',()=>{if(row.disabled)return;rows.forEach(other=>other.classList.toggle('is-highlighted',other===row));if(entry.children)openSubmenu(row,entry,level);else clearAfter(level+1);});
      row.addEventListener('focus',()=>{rows.forEach(other=>other.classList.toggle('is-highlighted',other===row));const current=levels[level];if(current)current.index=rows.indexOf(row);});
      row.addEventListener('keydown',event=>{
        const current=levels[level];if(!current)return;
        if(['ArrowDown','ArrowUp','Home','End','ArrowRight','ArrowLeft','Escape'].includes(event.key)){event.preventDefault();event.stopPropagation();}
        if(event.key==='ArrowDown')focusRow(level,current.index+1);
        else if(event.key==='ArrowUp')focusRow(level,current.index-1);
        else if(event.key==='Home')focusRow(level,0);
        else if(event.key==='End')focusRow(level,current.rows.length-1);
        else if(event.key==='ArrowRight'){if(entry.children)openSubmenu(row,entry,level,true);else if(level===0)openTop((active+1)%topButtons.length,true);}
        else if(event.key==='ArrowLeft'){if(level){const previous=current.parent;clearAfter(level);previous.focus({preventScroll:true});}else openTop((active+topButtons.length-1)%topButtons.length,true);}
        else if(event.key==='Escape'){if(level){const previous=current.parent;clearAfter(level);previous.focus({preventScroll:true});}else close({restoreFocus:true});}
        else if(event.key==='Tab')close();
      });
      panel.append(row);if(!row.disabled)rows.push(row);
    }
    if(!items.length)panel.classList.add('vm-menu-empty');
    host.append(panel);levels.push({panel,rows,index:-1,parent});return panel;
  }
  function openTop(index,focus=false) {
    if(destroyed||getState().modalOpen)return;
    close();active=index;setTopFocus(index);bar.classList.add('vm-menu-open');
    const button=topButtons[index];button.setAttribute('aria-expanded','true');
    const point=localPosition(button),panel=buildPanel(definitions[index].items,0);
    place(panel,point.left,point.top+button.offsetHeight+2);if(focus)focusRow(0,0);
  }
  const topButtons=definitions.map((definition,index)=>{
    const button=document.createElement('button');button.type='button';button.className=`vm-menu-trigger${index===1?' vm-menu-app':''}`;button.tabIndex=index? -1:0;
    button.setAttribute('role','menuitem');button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-expanded','false');
    if(definition.icon){button.innerHTML=definition.icon;button.setAttribute('aria-label','Apple menu');}else button.textContent=definition.label;
    listen(button,'click',()=>{if(active===index)close();else openTop(index);});
    listen(button,'pointerenter',()=>{if(active>=0&&active!==index)openTop(index);});
    listen(button,'focus',()=>setTopFocus(index));
    listen(button,'keydown',event=>{
      if(['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End','Escape'].includes(event.key)){event.preventDefault();event.stopPropagation();}
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){openTop(index,true);if(event.key==='ArrowUp')focusRow(0,levels[0]?.rows.length-1||0);}
      else if(event.key==='ArrowRight'||event.key==='ArrowLeft'){const next=(index+(event.key==='ArrowRight'?1:-1)+topButtons.length)%topButtons.length;setTopFocus(next);topButtons[next].focus({preventScroll:true});topButtons[next].scrollIntoView({block:'nearest',inline:'nearest'});if(active>=0)openTop(next);}
      else if(event.key==='Home'||event.key==='End'){const next=event.key==='Home'?0:topButtons.length-1;setTopFocus(next);topButtons[next].focus({preventScroll:true});}
      else if(event.key==='Escape')close({restoreFocus:true});
      else if(event.key==='Tab')close();
    });nav.append(button);return button;
  });
  bar.prepend(nav);bar.classList.add('vm-menu-bar');
  const outside=event=>{if(active>=0&&!nav.contains(event.target)&&!levels.some(level=>level.panel.contains(event.target)))close();};
  const escape=event=>{if(active<0||nav.contains(event.target)||levels.some(level=>level.panel.contains(event.target)))return;if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close({restoreFocus:true});}};
  listen(document,'pointerdown',outside,true);listen(document,'keydown',escape,true);
  listen(nav,'scroll',()=>{if(active>=0)close();});
  return {close,refresh(){if(active>=0){if(getState().modalOpen)close();else openTop(active);}},destroy(){if(destroyed)return;close();destroyed=true;for(const dispose of listeners)dispose();nav.remove();bar.classList.remove('vm-menu-bar','vm-menu-open');}};
}
