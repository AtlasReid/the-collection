import * as THREE from './vendor/three/three.module.js';

// Fit a front-facing rectangular display or bezel envelope. Three.js camera
// FOV is vertical and measured in degrees; the aspect supplies horizontal FOV.
export function fitDisplayDistance({width,height,fov,aspect,padding=1.035}={}) {
  if(![width,height,aspect].every(value=>Number.isFinite(value)&&value>0)||!Number.isFinite(fov)||fov<=0||fov>=180||!Number.isFinite(padding)||padding<1)throw new TypeError('Display size and aspect must be positive, FOV must be between 0 and 180 degrees, and padding must be at least 1.');
  const tanV=Math.tan(THREE.MathUtils.degToRad(fov/2));
  const distance=Math.max(height/2/tanV,width/2/tanV/aspect)*padding;
  if(!Number.isFinite(distance)||distance<=0)throw new TypeError('The display fit cannot be represented by a finite positive distance.');
  return distance;
}

// Fit every world-space corner, accounting for its depth as well as the
// horizontal/vertical extent. This keeps a wide arrangement in a phone view.
export function fitOrbitRadius(bounds,target,{azimuth,elevation},fov,aspect,padding=1.10) {
  const direction=new THREE.Vector3(Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation));
  const right=new THREE.Vector3(Math.cos(azimuth),0,-Math.sin(azimuth));
  const up=new THREE.Vector3().crossVectors(direction,right);
  const tanV=Math.tan(THREE.MathUtils.degToRad(fov/2));
  const tanH=tanV*Math.max(.1,aspect);
  let radius=1;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]) {
    const point=new THREE.Vector3(x,y,z).sub(target);
    const depth=point.dot(direction);
    radius=Math.max(radius,depth+padding*Math.abs(point.dot(right))/tanH,depth+padding*Math.abs(point.dot(up))/tanV);
  }
  return radius+.25;
}

function validateOrbitGeometry(bounds,target,{azimuth,elevation}={}) {
  const finitePoint=point=>point&&[point.x,point.y,point.z].every(Number.isFinite);
  if(!finitePoint(bounds?.min)||!finitePoint(bounds?.max)||['x','y','z'].some(axis=>bounds.min[axis]>bounds.max[axis])||!finitePoint(target)||![azimuth,elevation].every(Number.isFinite)||Math.abs(elevation)>=Math.PI/2)throw new TypeError('Orbit bounds and target must be finite, with a finite azimuth and elevation between the poles.');
}

// Balance the visible composition in perspective, without changing orbit
// direction, distance or height. The stable base target avoids accumulating
// previous pans as the user rotates and zooms. Cable/journey fit envelopes can
// remain separate from the visible composition supplied here.
export function centerOrbitTarget(compositionBounds,baseTarget,orbit) {
  validateOrbitGeometry(compositionBounds,baseTarget,orbit);
  const {azimuth,elevation,radius}=orbit;
  if(!Number.isFinite(radius)||radius<=0)throw new TypeError('Orbit radius must be finite and positive.');
  const direction=new THREE.Vector3(Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation));
  const right=new THREE.Vector3(Math.cos(azimuth),0,-Math.sin(azimuth));
  const points=[];
  let low=Infinity,high=-Infinity;
  for(const x of [compositionBounds.min.x,compositionBounds.max.x])for(const y of [compositionBounds.min.y,compositionBounds.max.y])for(const z of [compositionBounds.min.z,compositionBounds.max.z]) {
    const point=new THREE.Vector3(x,y,z).sub(baseTarget);
    const horizontal=point.dot(right),depth=radius-point.dot(direction);
    if(!Number.isFinite(horizontal)||!Number.isFinite(depth))throw new TypeError('The orbit projection cannot be represented by finite coordinates.');
    if(depth<=0)throw new RangeError('The composition must be entirely in front of the orbit camera.');
    points.push({horizontal,depth});
    low=Math.min(low,horizontal);high=Math.max(high,horizontal);
  }
  // Each projected x=(horizontal-pan)/depth decreases with pan. Their
  // minimum plus maximum crosses zero exactly when the margins are equal.
  for(let iteration=0;iteration<32;iteration++) {
    const pan=low/2+high/2;
    let left=Infinity,rightmost=-Infinity;
    for(const point of points) {
      const projected=(point.horizontal-pan)/point.depth;
      if(!Number.isFinite(projected))throw new TypeError('The orbit projection cannot be represented by finite coordinates.');
      left=Math.min(left,projected);rightmost=Math.max(rightmost,projected);
    }
    if(left/2+rightmost/2>0)low=pan;else high=pan;
  }
  const target=baseTarget.clone().addScaledVector(right,low/2+high/2);
  if(![target.x,target.y,target.z].every(Number.isFinite))throw new TypeError('The centered orbit target cannot be represented by finite coordinates.');
  return target;
}

// Fitting and horizontal centering depend on one another through depth. A few
// alternating passes converge for the desk; the final center uses the actual
// returned radius, so reset and resize have the same balanced endpoint.
export function fitCenteredOrbit(bounds,compositionBounds,baseTarget,orbit,fov,aspect,padding=1.10) {
  validateOrbitGeometry(bounds,baseTarget,orbit);
  validateOrbitGeometry(compositionBounds,baseTarget,orbit);
  if(!Number.isFinite(fov)||fov<=0||fov>=180||!Number.isFinite(aspect)||aspect<=0||!Number.isFinite(padding)||padding<1)throw new TypeError('Orbit FOV must be between 0 and 180 degrees, aspect must be positive, and padding must be at least 1.');
  let radius=fitOrbitRadius(bounds,baseTarget,orbit,fov,aspect,padding);
  for(let iteration=0;iteration<4;iteration++) {
    const target=centerOrbitTarget(compositionBounds,baseTarget,{...orbit,radius});
    radius=fitOrbitRadius(bounds,target,orbit,fov,aspect,padding);
  }
  return {target:centerOrbitTarget(compositionBounds,baseTarget,{...orbit,radius}),radius};
}

// Start a little closer than the conservative cable/journey envelope, while
// retaining a padded fit of the visible desk. Keep the original framing
// radius available so a new default does not change manual zoom limits.
export function fitDeskOrbit(bounds,compositionBounds,baseTarget,orbit,fov,aspect) {
  const framing=fitCenteredOrbit(bounds,compositionBounds,baseTarget,orbit,fov,aspect);
  const visible=fitCenteredOrbit(compositionBounds,compositionBounds,baseTarget,orbit,fov,aspect,1.035);
  const radius=Math.max(framing.radius*.82,visible.radius);
  return {target:centerOrbitTarget(compositionBounds,baseTarget,{...orbit,radius}),radius,framingRadius:framing.radius};
}
