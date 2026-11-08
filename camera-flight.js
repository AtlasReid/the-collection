const fields=['left','top','width','height'];

function viewportRect(value) {
  if(!value||typeof value!=='object'||Array.isArray(value)||fields.some(key=>!Number.isFinite(value[key]))||value.width<=0||value.height<=0)throw new TypeError('A viewport needs finite coordinates and positive dimensions.');
  const rect=Object.fromEntries(fields.map(key=>[key,value[key]]));
  const aspect=rect.width/rect.height;
  if(!Number.isFinite(aspect)||aspect<=0)throw new TypeError('The viewport aspect cannot be represented.');
  return rect;
}

// Retain the visible stage rectangle before promoting its backing to the full
// viewport. The parent can prepare that backing once, then animate only CSS.
export function prepareViewportFlight(fromRect,toRect) {
  const from=viewportRect(fromRect),to=viewportRect(toRect);
  if(![from.left-to.left,from.top-to.top,from.width/to.width,from.height/to.height].every(Number.isFinite)||from.width/to.width<=0||from.height/to.height<=0)throw new TypeError('The viewport transition cannot be represented.');
  return {from,to};
}

// Progress has already been eased by the camera owner. Keeping the camera's
// aspect equal to the visible rectangle cancels the shell's nonuniform scale.
export function sampleViewportFlight(flight,progress=0) {
  if(!flight?.from||!flight?.to||!Number.isFinite(progress))throw new TypeError('A prepared viewport flight and finite progress are required.');
  const t=Math.max(0,Math.min(1,progress)),{from,to}=flight;
  const rect=Object.fromEntries(fields.map(key=>[key,t===0?from[key]:t===1?to[key]:from[key]*(1-t)+to[key]*t]));
  const aspect=rect.width/rect.height;
  const transform=t===1?'none':`translate(${rect.left-to.left}px, ${rect.top-to.top}px) scale(${rect.width/to.width}, ${rect.height/to.height})`;
  return {transform,aspect,rect};
}

// Start time is the first delivered frame, not the button click. A delayed
// paint or long main-thread stall therefore pauses rather than skipping flight.
export function advanceFlightClock(state,now,{duration,delay=80,maxStep=50}={}) {
  if(!Number.isFinite(now)||!Number.isFinite(duration)||duration<0||!Number.isFinite(delay)||delay<0||!Number.isFinite(maxStep)||maxStep<=0)throw new TypeError('A flight clock needs finite time, nonnegative duration/delay and a positive maximum step.');
  if(state!==null&&state!==undefined&&(!Number.isFinite(state.lastTime)||!Number.isFinite(state.elapsed)||state.elapsed<0))throw new TypeError('The previous flight clock is invalid.');
  const step=state?Math.max(0,Math.min(maxStep,now-state.lastTime)):0;
  const elapsed=(state?.elapsed||0)+step;
  if(!Number.isFinite(elapsed))throw new TypeError('The flight clock cannot be represented.');
  const progress=duration===0?1:Math.max(0,Math.min(1,(elapsed-delay)/duration));
  return {state:{lastTime:now,elapsed},progress};
}
