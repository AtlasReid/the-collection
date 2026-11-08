import assert from 'node:assert/strict';
import {webglPixelRatio,virtualDesktopWidth,nativeDisplayBounds,desktopLayoutZoom} from '../display-quality.js';

const rectangle=[{x:15,y:20},{x:1615,y:20},{x:1615,y:1060},{x:15,y:1060}];
const tests=[
  ['native presentation preserves the actual projected rectangle without multiplying CSS layout by device DPR',()=>{
    const original=structuredClone(rectangle),bounds=nativeDisplayBounds(rectangle,{focused:true});
    assert.deepEqual(bounds,{left:15,top:20,width:1600,height:1040});
    assert.equal(virtualDesktopWidth('auto',bounds.width),1600);
    assert.equal(webglPixelRatio('auto',2),2);assert.deepEqual(rectangle,original);
  }],
  ['movement, desk views and perspective quads retain homography rather than snapping to an incorrect rectangle',()=>{
    assert.equal(nativeDisplayBounds(rectangle,{focused:true,moving:true}),null);
    assert.equal(nativeDisplayBounds(rectangle),null);
    const angled=structuredClone(rectangle);angled[1].y+=8;
    assert.equal(nativeDisplayBounds(angled,{focused:true}),null);
    assert.equal(nativeDisplayBounds([...rectangle].reverse(),{focused:true}),null);
    assert.equal(nativeDisplayBounds([{x:NaN,y:0},...rectangle.slice(1)],{focused:true}),null);
  }],
  ['automatic and explicit backing sizes remain bounded and independent of interface density',()=>{
    assert.equal(virtualDesktopWidth('1920',850),1920);assert.equal(virtualDesktopWidth('auto',850),850);
    assert.equal(virtualDesktopWidth('auto',Infinity),1280);assert.equal(virtualDesktopWidth('auto',12000),3840);
    assert.equal(virtualDesktopWidth('untrusted'),1280);
    assert.equal(webglPixelRatio('auto',4),2);assert.equal(webglPixelRatio('1.5',1),1.5);
    assert.equal(webglPixelRatio('auto',NaN),1);assert.equal(webglPixelRatio('-3',1),.75);
  }],
  ['changing backing size or entering native focus preserves window layout while compact density adds usable workspace',()=>{
    for(const source of [640,959.559,1280,1600,1920,2560]){
      assert.ok(Math.abs(source/desktopLayoutZoom(source)-1024)<1e-8);
      assert.ok(Math.abs(source/desktopLayoutZoom(source,'compact')-1280)<1e-8);
    }
    assert.ok(Number.isFinite(desktopLayoutZoom(NaN)));
  }],
];
for(const [name,run] of tests){run();console.log(`PASS ${name}`);}
console.log(`PASS all ${tests.length} display quality checks`);
