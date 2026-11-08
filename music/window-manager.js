import { quadTransform } from '../projection.js';

// Undo a CSS perspective plane, rather than approximating it with one scale.
// The corners are measured DOM points in viewport coordinates.
export function windowPoint(corners,point,width,height) {
  const matrix=quadTransform(corners,width,height);
  if(!matrix)return null;
  const a=matrix[0]-point.x*matrix[3],b=matrix[4]-point.x*matrix[7];
  const c=point.x*matrix[15]-matrix[12],d=matrix[1]-point.y*matrix[3];
  const e=matrix[5]-point.y*matrix[7],f=point.y*matrix[15]-matrix[13];
  const determinant=a*e-b*d;
  if(!Number.isFinite(determinant)||Math.abs(determinant)<1e-10)return null;
  const x=(c*e-b*f)/determinant,y=(a*f-c*d)/determinant;
  return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;
}

export function clampWindow(position,size,bounds) {
  const left=bounds.left||0,top=bounds.top||0;
  return {
    x:Math.max(left,Math.min(position.x,left+Math.max(0,bounds.width-size.width))),
    y:Math.max(top,Math.min(position.y,top+Math.max(0,bounds.height-size.height))),
  };
}

/** In-page windows. Raising a window never recreates its iframe or contents. */
export function createWindowManager(host) {
  const doc=host.ownerDocument,view=doc.defaultView,records=[];
  const hadHostClass=host.classList.contains('it-window-host');
  host.classList.add('it-window-host');
  let destroyed=false,frameFocusTimer=null;
  // Zero-size probes expose the transformed corners without affecting layout.
  const probes=Array.from({length:4},()=>{
    const probe=doc.createElement('span');probe.className='it-window-probe';probe.setAttribute('aria-hidden','true');host.append(probe);return probe;
  });
  const bounds=()=>({width:host.clientWidth,height:host.clientHeight});
  function localPoint(event) {
    const {width,height}=bounds();
    if(width<=0||height<=0)return null;
    const positions=[[0,0],[width,0],[width,height],[0,height]];
    const corners=probes.map((probe,index)=>{
      probe.style.left=`${positions[index][0]}px`;probe.style.top=`${positions[index][1]}px`;
      const rect=probe.getBoundingClientRect();return {x:rect.x,y:rect.y};
    });
    return windowPoint(corners,{x:event.clientX,y:event.clientY},width,height);
  }
  function stack() {
    const front=records.findLast(record=>!record.element.hidden);
    records.forEach((record,index)=>{
      record.element.style.zIndex=String(10+index);
      record.element.classList.toggle('it-window-active',record===front);
      record.element.classList.toggle('it-window-inactive',record!==front);
    });
  }
  function move(record,position) {
    const usable=record.getBounds?record.getBounds():bounds();if(!usable)return;
    const size={width:record.element.offsetWidth,height:record.element.offsetHeight};
    const next=clampWindow(position,size,usable);
    record.element.style.left=`${next.x}px`;record.element.style.top=`${next.y}px`;
  }
  function clamp(record) {
    if(!record.draggable||record.element.hidden)return;
    move(record,{x:record.element.offsetLeft,y:record.element.offsetTop});
  }
  function register(element,{handle=null,label='Window',draggable=true,getBounds=null}={}) {
    if(destroyed)throw new Error('This window manager has been destroyed.');
    if(records.some(record=>record.element===element))throw new Error('Window is already registered.');
    const original={zIndex:element.style.zIndex,left:element.style.left,top:element.style.top};
    const dragCapable=Boolean(draggable&&handle);
    const record={element,handle,draggable:dragCapable,getBounds,drag:null};
    const originalTabIndex=handle?.getAttribute('tabindex');
    const originalLabel=handle?.getAttribute('aria-label');
    element.classList.add('it-managed-window');
    if(record.draggable){
      element.classList.add('it-draggable-window');handle.classList.add('it-window-drag-handle');
      handle.setAttribute('tabindex','0');
      handle.setAttribute('aria-label',`${label}. Drag to move, or use the arrow keys. Hold Shift for small steps.`);
      if(!element.style.left)element.style.left=`${Math.max(0,(host.clientWidth-element.offsetWidth)/2)}px`;
      if(!element.style.top)element.style.top=`${Math.max(0,(host.clientHeight-element.offsetHeight)/2)}px`;
    }
    function raise() {
      if(destroyed||!records.includes(record))return;
      records.splice(records.indexOf(record),1);records.push(record);stack();
    }
    function sendBack() {
      if(destroyed||!records.includes(record))return;
      records.splice(records.indexOf(record),1);records.unshift(record);stack();
    }
    function endDrag() {
      if(!record.drag)return;
      const id=record.drag.id;record.drag=null;element.classList.remove('it-window-dragging');
      if(handle.hasPointerCapture?.(id))handle.releasePointerCapture(id);
    }
    record.endDrag=endDrag;
    function startDrag(event) {
      if(!record.draggable||event.button!==0||event.target.closest('button,input,select,textarea,a,[contenteditable="true"]'))return;
      const point=localPoint(event);if(!point)return;
      event.preventDefault();raise();handle.focus({preventScroll:true});
      record.drag={id:event.pointerId,point,left:element.offsetLeft,top:element.offsetTop};
      handle.setPointerCapture(event.pointerId);element.classList.add('it-window-dragging');
    }
    function drag(event) {
      if(!record.drag||record.drag.id!==event.pointerId)return;
      const point=localPoint(event);if(!point)return;
      move(record,{x:record.drag.left+point.x-record.drag.point.x,y:record.drag.top+point.y-record.drag.point.y});
    }
    function keydown(event) {
      if(!record.draggable||event.target!==handle||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
      event.preventDefault();event.stopPropagation();raise();const step=event.shiftKey?1:10;
      move(record,{x:element.offsetLeft+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0),y:element.offsetTop+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0)});
    }
    element.addEventListener('pointerdown',raise,true);element.addEventListener('focusin',raise);
    if(record.draggable){
      handle.addEventListener('pointerdown',startDrag);handle.addEventListener('pointermove',drag);
      handle.addEventListener('pointerup',endDrag);handle.addEventListener('pointercancel',endDrag);handle.addEventListener('lostpointercapture',endDrag);
      handle.addEventListener('keydown',keydown);
    }
    records.push(record);stack();clamp(record);
    const api={
      raise,sendBack,
      setDraggable(enabled){
        if(!dragCapable)return;
        record.draggable=Boolean(enabled);if(!record.draggable)endDrag();
        handle.classList.toggle('it-window-drag-handle',record.draggable);
        handle.setAttribute('aria-label',record.draggable?`${label}. Drag to move, or use the arrow keys. Hold Shift for small steps.`:`${label}. Window movement is unavailable.`);
      },
      setVisible(visible){element.hidden=!visible;if(visible){clamp(record);raise();}else{endDrag();stack();}},
      clamp(){clamp(record);},
      destroy(){
        if(!records.includes(record))return;endDrag();records.splice(records.indexOf(record),1);
        element.removeEventListener('pointerdown',raise,true);element.removeEventListener('focusin',raise);
        if(dragCapable){
          handle.removeEventListener('pointerdown',startDrag);handle.removeEventListener('pointermove',drag);
          handle.removeEventListener('pointerup',endDrag);handle.removeEventListener('pointercancel',endDrag);handle.removeEventListener('lostpointercapture',endDrag);handle.removeEventListener('keydown',keydown);
          handle.classList.remove('it-window-drag-handle');
          if(originalTabIndex===null)handle.removeAttribute('tabindex');else handle.setAttribute('tabindex',originalTabIndex);
          if(originalLabel===null)handle.removeAttribute('aria-label');else handle.setAttribute('aria-label',originalLabel);
        }
        element.classList.remove('it-managed-window','it-draggable-window','it-window-active','it-window-inactive','it-window-dragging');
        Object.assign(element.style,original);stack();
      },
    };
    record.api=api;return api;
  }
  // Pointer/focus events inside an embedded cross-origin player do not bubble
  // into its titlebar. The parent window's blur still exposes the focused iframe.
  const iframeFocus=()=>{
    if(frameFocusTimer!==null)view.clearTimeout(frameFocusTimer);
    frameFocusTimer=view.setTimeout(()=>{
      frameFocusTimer=null;if(destroyed)return;
      const active=doc.activeElement;
      if(active?.tagName!=='IFRAME')return;
      records.findLast(record=>!record.element.hidden&&record.element.contains(active))?.api.raise();
    },0);
  };
  view?.addEventListener('blur',iframeFocus);
  const resize=()=>records.forEach(record=>{record.endDrag();clamp(record);});
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(resize);observer?.observe(host);
  return {
    register,
    destroy(){
      if(destroyed)return;
      for(const record of [...records])record.api.destroy();observer?.disconnect();probes.forEach(probe=>probe.remove());
      view?.removeEventListener('blur',iframeFocus);if(frameFocusTimer!==null)view.clearTimeout(frameFocusTimer);
      if(!hadHostClass)host.classList.remove('it-window-host');destroyed=true;
    },
  };
}
