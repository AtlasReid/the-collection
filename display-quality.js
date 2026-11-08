// CSS pixels describe layout; devicePixelRatio belongs only to WebGL's buffer.
export function webglPixelRatio(choice='auto',deviceRatio=1) {
  const native=Number.isFinite(deviceRatio)&&deviceRatio>0?deviceRatio:1;
  return choice==='auto'?Math.min(native,2):Math.max(.75,Math.min(2,Number(choice)||1));
}

export function virtualDesktopWidth(choice='auto',nativeWidth=null) {
  if(choice!=='auto'&&['1280','1600','1920'].includes(String(choice)))return Number(choice);
  return Number.isFinite(nativeWidth)&&nativeWidth>0?Math.max(320,Math.min(3840,nativeWidth)):1280;
}

// A stable logical workspace keeps window positions/sizes intact when the
// display backing or camera distance changes. Density is a separate choice.
export function desktopLayoutZoom(width,interfaceSize='comfortable') {
  const source=Number.isFinite(width)&&width>0?width:1280;
  return source/(interfaceSize==='compact'?1280:1024);
}

// A settled, face-on monitor can use ordinary CSS layout rather than a
// compositor bitmap enlarged by matrix3d. Refuse tilted or moving surfaces.
export function nativeDisplayBounds(points,{focused=false,moving=false}={}) {
  if(!focused||moving||!Array.isArray(points)||points.length!==4||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return null;
  const [tl,tr,br,bl]=points,tolerance=.35;
  if(Math.abs(tl.y-tr.y)>tolerance||Math.abs(bl.y-br.y)>tolerance||Math.abs(tl.x-bl.x)>tolerance||Math.abs(tr.x-br.x)>tolerance)return null;
  const width=(tr.x+br.x-tl.x-bl.x)/2,height=(bl.y+br.y-tl.y-tr.y)/2;
  if(width<=0||height<=0)return null;
  return {left:(tl.x+bl.x)/2,top:(tl.y+tr.y)/2,width,height};
}
