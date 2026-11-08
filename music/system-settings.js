import { createGraphicsControls } from '../graphics-settings.js';
import { windowControlIcon } from './window-control-icons.js';

let nextSystemId=0;

// This virtual control panel edits The Collection's actual graphics model.
export function createSystemSettings({host,windows,store,context='desktop'}={}) {
  const document=host.ownerDocument;
  const make=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const layer=make('section','vm-panel vm-system-window');layer.hidden=true;layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','false');
  const titleId=`vm-system-title-${++nextSystemId}`,contentId=`vm-system-content-${nextSystemId}`;layer.setAttribute('aria-labelledby',titleId);
  const header=make('header','vm-panel-titlebar'),closeButton=make('button','vm-panel-close');closeButton.type='button';closeButton.setAttribute('aria-label','Close System Settings');closeButton.innerHTML=windowControlIcon('close');
  const title=make('h2','vm-panel-title','System Settings');title.id=titleId;header.append(closeButton,title);
  const body=make('div','vm-system-body'),sidebar=make('nav','vm-system-sidebar');sidebar.setAttribute('aria-label','System Settings categories');sidebar.setAttribute('role','tablist');sidebar.setAttribute('aria-orientation','vertical');
  const intro=make('div','vm-system-identity');intro.append(make('strong','','This Little Mac'),make('small','','Small computer. Real settings.'));sidebar.append(intro);
  const content=make('section','vm-system-content');content.id=contentId;content.setAttribute('role','tabpanel');content.tabIndex=0;
  const heading=make('h3'),description=make('p','vm-system-description'),fields=make('div','graphics-fields'),note=make('p','vm-system-note');content.append(heading,description,fields,note);
  const footer=make('footer','vm-system-footer'),reset=make('button','vm-button','Restore defaults'),done=make('button','vm-button vm-primary','Done');reset.type=done.type='button';
  footer.append(make('small','','Only this little universe. Your real Mac can relax.'),reset,done);body.append(sidebar,content);layer.append(header,body,footer);host.append(layer);
  const icons={appearance:'<circle cx="10" cy="10" r="7"/><path d="M10 3a7 7 0 0 1 0 14Z" fill="currentColor" stroke="none"/>',displays:'<rect x="2" y="3" width="16" height="11" rx="2"/><path d="M7 18h6m-3-4v4"/>',desk:'<path d="m10 2 8 4.5v9L10 20l-8-4.5v-9Z M2 6.5l8 4.5 8-4.5M10 11v9"/>'};
  const categories=[
    {id:'appearance',label:'Appearance',keys:['glass'],description:'A little glass, a little atmosphere. No actual interior designer required.'},
    {id:'displays',label:'Displays',keys:['desktopResolution','interfaceSize'],description:'Give the virtual desktop a little more room, or make things easier to read.'},
    {id:'desk',label:'3D Desk',keys:['webglScale','shadows','pauseFocused3D'],description:'Choose how hard the desk works to look this casual.'},
  ];
  let selected='displays',placed=false,destroyed=false,restoreFocus=null;
  const controls=createGraphicsControls({mount:fields,store});
  function refresh(){
    const category=categories.find(item=>item.id===selected);heading.textContent=category.label;description.textContent=category.description;controls.show(category.keys);
    for(const item of categories){const active=item.id===selected;item.button.setAttribute('aria-selected',String(active));item.button.tabIndex=active?0:-1;}
    content.setAttribute('aria-labelledby',category.button.id);
    note.textContent=!store.persistent?'Settings work for this visit. This browser couldn’t save them.':context==='scene'?'Changes apply straight away and stay saved in this browser.':'Appearance and interface size apply here. The 3D desk picks up the other choices when you return.';
  }
  for(const category of categories){
    const button=make('button','vm-system-category');button.type='button';button.id=`vm-system-${category.id}-${nextSystemId}`;button.setAttribute('role','tab');button.setAttribute('aria-controls',contentId);
    const icon=make('span',`vm-system-icon vm-system-icon-${category.id}`);icon.innerHTML=`<svg viewBox="0 0 20 22" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${icons[category.id]}</svg>`;
    button.append(icon,make('span','',category.label));button.addEventListener('click',()=>{selected=category.id;refresh();});category.button=button;sidebar.append(button);
  }
  const bounds=()=>{const top=Math.max(28,host.querySelector('.screen-menu-bar,.mac-menu-bar')?.offsetHeight||0)+8;return {left:8,top,width:Math.max(0,host.clientWidth-16),height:Math.max(0,host.clientHeight-top-60)};};
  const managed=windows.register(layer,{handle:header,label:'System Settings',getBounds:bounds});
  function close(){if(layer.hidden)return;managed.setVisible(false);if(restoreFocus?.isConnected&&!restoreFocus.closest('[hidden],[inert]'))restoreFocus.focus({preventScroll:true});}
  closeButton.addEventListener('click',close);done.addEventListener('click',close);reset.addEventListener('click',()=>store.reset());
  layer.addEventListener('click',event=>event.stopPropagation());
  layer.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();close();}});
  sidebar.addEventListener('keydown',event=>{
    if(!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;event.preventDefault();
    const current=categories.findIndex(item=>item.id===selected),index=event.key==='Home'?0:event.key==='End'?categories.length-1:(current+(event.key==='ArrowDown'?1:-1)+categories.length)%categories.length;
    selected=categories[index].id;refresh();categories[index].button.focus({preventScroll:true});
  });
  const unsubscribe=store.subscribe(refresh);refresh();
  return {
    open(){if(destroyed)return;restoreFocus=document.activeElement;managed.setVisible(true);if(!placed){const area=bounds();layer.style.left=`${area.left+Math.max(0,(area.width-layer.offsetWidth)/2)}px`;layer.style.top=`${area.top+Math.max(0,Math.min(44,(area.height-layer.offsetHeight)/2))}px`;placed=true;}managed.clamp();managed.raise();closeButton.focus({preventScroll:true});},
    close,get isOpen(){return !layer.hidden;},
    destroy(){if(destroyed)return;destroyed=true;unsubscribe();controls.destroy();managed.destroy();layer.remove();},
  };
}
