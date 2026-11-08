import assert from 'node:assert/strict';
import {isNearScreen,screenBubblePosition} from './screen-proximity.js';

const rectangle=[{x:100,y:100},{x:300,y:100},{x:300,y:240},{x:100,y:240}];
const diamond=[{x:200,y:100},{x:300,y:200},{x:200,y:300},{x:100,y:200}];
const trapezoid=[{x:200,y:140},{x:680,y:110},{x:770,y:580},{x:100,y:550}];
let count=0;
function check(name,run){run();count++;console.log(`PASS ${name}`);}
function near(actual,expected,tolerance=1e-8){assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);}

check('screen interior and physical perimeter include corners without padding',()=>{
  for(const point of [{x:200,y:170},...rectangle,{x:100,y:175},{x:250,y:240}])assert.equal(isNearScreen(point,rectangle,0),true);
  assert.equal(isNearScreen({x:99.9,y:175},rectangle,0),false);
});

check('proximity measures edge and rounded corner distance',()=>{
  assert.equal(isNearScreen({x:320,y:170},rectangle,20),true);
  assert.equal(isNearScreen({x:320,y:170},rectangle,19.99),false);
  assert.equal(isNearScreen({x:315,y:255},rectangle,21.22),true);
  assert.equal(isNearScreen({x:315,y:255},rectangle,21),false);
  assert.equal(isNearScreen({x:320,y:260},rectangle,20),false,'expanded rectangle corner must not count as near');
});

check('slanted and perspective screens avoid empty AABB corners',()=>{
  assert.equal(isNearScreen({x:200,y:200},diamond,0),true);
  assert.equal(isNearScreen({x:105,y:105},diamond),false);
  assert.equal(isNearScreen({x:175,y:100},diamond,18),true);
  assert.equal(isNearScreen({x:400,y:350},trapezoid,0),true);
  assert.equal(isNearScreen({x:100,y:110},trapezoid),false);
});

check('proximity behaves identically with either winding',()=>{
  for(const quad of [rectangle,diamond,trapezoid])for(const point of [{x:200,y:200},{x:320,y:170},{x:105,y:105},{x:900,y:900}]){
    assert.equal(isNearScreen(point,quad),isNearScreen(point,[...quad].reverse()));
  }
});

check('degenerate, concave, crossing and non-finite quads are rejected',()=>{
  const invalid=[null,[],rectangle.slice(1),Array(4).fill({x:1,y:1}),
    [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0}],
    [{x:0,y:0},{x:100,y:0},{x:20,y:20},{x:0,y:100}],
    [{x:0,y:0},{x:100,y:100},{x:100,y:0},{x:0,y:100}],
    [{x:NaN,y:0},...rectangle.slice(1)],[{x:0,y:Infinity},...rectangle.slice(1)]];
  for(const quad of invalid){assert.equal(isNearScreen({x:20,y:20},quad),false);assert.equal(screenBubblePosition(quad,{width:500,height:400}),null);}
  for(const point of [null,{x:NaN,y:0},{x:0,y:Infinity}])assert.equal(isNearScreen(point,rectangle),false);
  for(const margin of [-1,NaN,Infinity])assert.equal(isNearScreen({x:200,y:170},rectangle,margin),false);
});

check('bubble follows top-right screen axes rather than viewport axes',()=>{
  const straight=screenBubblePosition(rectangle,{width:800,height:600});
  near(straight.x,326);near(straight.y,120);
  const rotated=screenBubblePosition(diamond,{width:800,height:600});
  near(rotated.x,300+6/Math.sqrt(2));near(rotated.y,200+46/Math.sqrt(2));
});

check('bubble clamps its full circle inside desktop and phone viewports',()=>{
  const rightEdge=[{x:250,y:10},{x:375,y:20},{x:375,y:180},{x:250,y:190}];
  for(const viewport of [{width:382,height:618},{width:500,height:200}]){
    const point=screenBubblePosition(rightEdge,viewport);
    assert.ok(point.x>=24&&point.x<=viewport.width-24);
    assert.ok(point.y>=24&&point.y<=viewport.height-24);
  }
  near(screenBubblePosition(rightEdge,{width:382,height:618}).x,358);
  const offscreen=[{x:-200,y:-100},{x:-100,y:-100},{x:-100,y:-20},{x:-200,y:-20}];
  assert.deepEqual(screenBubblePosition(offscreen,{width:500,height:300}),{x:24,y:24});
  near(screenBubblePosition(rectangle,{width:40,height:40}).x,20);
});

check('invalid viewport or bubble sizes cannot create unusable controls',()=>{
  for(const viewport of [undefined,null,{}, {width:NaN,height:400},{width:500,height:Infinity},
    {width:30,height:400},{width:500,height:20},{width:500,height:400,radius:0},
    {width:500,height:400,gap:-1},{width:500,height:400,edgePadding:NaN}])assert.equal(screenBubblePosition(rectangle,viewport),null);
});

check('helpers leave source geometry and viewport options untouched',()=>{
  const quad=Object.freeze(rectangle.map(point=>Object.freeze({...point})));
  const viewport=Object.freeze({width:800,height:600,radius:18,gap:8,edgePadding:6});
  assert.equal(isNearScreen(Object.freeze({x:200,y:170}),quad),true);
  assert.deepEqual(screenBubblePosition(quad,viewport),{x:326,y:120});
  assert.deepEqual(quad,rectangle);
});

console.log(`PASS all ${count} screen proximity checks`);
