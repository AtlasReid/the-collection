// Screen coordinates are CSS pixels relative to the scene shell. Quads use
// physical screen corners in order: top-left, top-right, bottom-right, bottom-left.
// These helpers do no DOM work and never change their input points.
const EPSILON = 1e-8;
const finitePoint = point => point && Number.isFinite(point.x) && Number.isFinite(point.y);
const cross = (a, b, c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function inspectQuad(quad) {
  if (!Array.isArray(quad) || quad.length !== 4 || !quad.every(finitePoint)) return null;
  let winding = 0;
  for (let i=0; i<4; i++) {
    const a=quad[i], b=quad[(i+1)%4], c=quad[(i+2)%4];
    const length=Math.hypot(b.x-a.x,b.y-a.y);
    const turn=cross(a,b,c);
    if (!Number.isFinite(length) || length<=EPSILON || !Number.isFinite(turn) || Math.abs(turn)<=EPSILON) return null;
    const sign=Math.sign(turn);
    if (winding && winding!==sign) return null;
    winding=sign;
  }
  return {winding};
}

function distanceToSegment(point, a, b) {
  const dx=b.x-a.x, dy=b.y-a.y;
  const length=Math.hypot(dx,dy), ux=dx/length, uy=dy/length;
  const along=clamp((point.x-a.x)*ux+(point.y-a.y)*uy,0,length);
  return Math.hypot(point.x-(a.x+ux*along),point.y-(a.y+uy*along));
}

/**
 * True inside the projected convex screen or within `margin` of its perimeter.
 * Distance padding has rounded corners, so an enlarged AABB cannot reveal the
 * magnifier far from a slanted screen. Either polygon winding is supported.
 */
export function isNearScreen(point, quad, margin=34) {
  const shape=inspectQuad(quad);
  if (!shape || !finitePoint(point) || !Number.isFinite(margin) || margin<0) return false;
  let inside=true;
  for (let i=0; i<4; i++) {
    const value=cross(quad[i],quad[(i+1)%4],point);
    if (!Number.isFinite(value)) return false;
    if (value*shape.winding < -EPSILON) inside=false;
  }
  if (inside) return true;
  return quad.some((a,i)=>distanceToSegment(point,a,quad[(i+1)%4])<=margin);
}

/**
 * Centre of a round magnifier just outside the screen's top-right corner.
 * `gap` is the space between its left edge and the screen, along the top edge.
 * The centre moves down the right edge by radius+2, then clamps inside the
 * scene viewport by radius+edgePadding. Returns null for unusable geometry.
 * The UI should keep its own pointer-on-button latch: the bubble's outer edge
 * can extend farther than isNearScreen's default margin.
 */
export function screenBubblePosition(quad, viewport={}) {
  if (!inspectQuad(quad)) return null;
  const {width,height,radius=18,gap=8,edgePadding=6}=viewport||{};
  if (![width,height,radius,gap,edgePadding].every(Number.isFinite) || radius<=0 || gap<0 || edgePadding<0 || width<radius*2 || height<radius*2) return null;
  const [topLeft,topRight,bottomRight]=quad;
  const topLength=Math.hypot(topRight.x-topLeft.x,topRight.y-topLeft.y);
  const sideLength=Math.hypot(bottomRight.x-topRight.x,bottomRight.y-topRight.y);
  const right={x:(topRight.x-topLeft.x)/topLength,y:(topRight.y-topLeft.y)/topLength};
  const down={x:(bottomRight.x-topRight.x)/sideLength,y:(bottomRight.y-topRight.y)/sideLength};
  const x=topRight.x+right.x*(radius+gap)+down.x*(radius+2);
  const y=topRight.y+right.y*(radius+gap)+down.y*(radius+2);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const paddingX=Math.min(radius+edgePadding,width/2);
  const paddingY=Math.min(radius+edgePadding,height/2);
  return {x:clamp(x,paddingX,width-paddingX),y:clamp(y,paddingY,height-paddingY)};
}
