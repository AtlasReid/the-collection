import * as THREE from './vendor/three/three.module.js';
import { mm,PHYSICAL_DIMENSIONS } from './physical-scale.js';

// Photo-led procedural study of the 13-inch M4 Air in Midnight.
// Published footprint/panel ratios; enclosure details are visual estimates.
// Reference links and modelling limits are recorded in docs/ASSETS.md.
const WIDTH = mm(PHYSICAL_DIMENSIONS.macbookAir.width);
const DEPTH = mm(PHYSICAL_DIMENSIONS.macbookAir.depth);
const PANEL_WIDTH = 3.86;
const PANEL_HEIGHT = PANEL_WIDTH * 1664 / 2560;
const SCREEN_CORNER_RADIUS = .045;
const LID_WIDTH = 4.035;
const LID_HEIGHT = DEPTH-.036;
const CHIN = .205;
const KEYBOARD_WIDTH = WIDTH*.916;
const KEYBOARD_DEPTH = DEPTH*.529;
const KEYBOARD_Z = -DEPTH/2+DEPTH*(.059+.588)/2;

function roundShape(width,height,radius,offsetY=0) {
  const x=-width/2,y=-height/2+offsetY,r=Math.min(radius,width/2,height/2);
  const s=new THREE.Shape();
  s.moveTo(x+r,y);s.lineTo(x+width-r,y);s.quadraticCurveTo(x+width,y,x+width,y+r);
  s.lineTo(x+width,y+height-r);s.quadraticCurveTo(x+width,y+height,x+width-r,y+height);
  s.lineTo(x+r,y+height);s.quadraticCurveTo(x,y+height,x,y+height-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  return s;
}
function roundedSlab(width,height,thickness,radius=.05,bevel=.004,{curveSegments=4,cutout}={}) {
  const shape=roundShape(width-2*bevel,height-2*bevel,radius);
  if(cutout)shape.holes.push(roundShape(cutout.width,cutout.depth,.045,-cutout.z));
  const g=new THREE.ExtrudeGeometry(shape,{
    depth:thickness-2*bevel,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,
    bevelSegments:1,curveSegments,steps:1,
  });
  g.translate(0,0,-thickness/2+bevel);
  return g;
}
function add(parent,geometry,material,name,position,rotation) {
  const m=new THREE.Mesh(geometry,material);m.name=name;
  if(position)m.position.set(...position);
  if(rotation)m.rotation.set(...rotation);
  m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function flat(parent,width,depth,thickness,material,name,position,radius=.04) {
  return add(parent,roundedSlab(width,depth,thickness,radius,.002),material,name,position,[-Math.PI/2,0,0]);
}
function texture(canvas,name) {
  const t=new THREE.CanvasTexture(canvas);t.name=name;t.colorSpace=THREE.SRGBColorSpace;return t;
}
function displayGeometry(width,height){
  const x=width/2,y=height/2,r=SCREEN_CORNER_RADIUS,s=new THREE.Shape();
  // Match the HTML desktop's circular upper radii. Quadratic corner curves
  // bow outside that circle and leave a light wedge around the live aperture.
  s.moveTo(-x,-y);s.lineTo(x,-y);s.lineTo(x,y-r);s.absarc(x-r,y-r,r,0,Math.PI/2);
  s.lineTo(-x+r,y);s.absarc(-x+r,y-r,r,Math.PI/2,Math.PI);s.closePath();
  const g=new THREE.ShapeGeometry(s,12),positions=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<positions.count;i++)uv.setXY(i,positions.getX(i)/width+.5,positions.getY(i)/height+.5);
  return g;
}

function keyboard(parent,materials) {
  const group=new THREE.Group();group.name='Backlit MacBook keyboard';group.position.set(0,.090,KEYBOARD_Z);parent.add(group);
  // A true opening in the deck, with its floor below the flush key tops.
  flat(group,KEYBOARD_WIDTH,KEYBOARD_DEPTH,.006,materials.recess,'Keyboard inset',[0,0,0],.045);
  const step=.246,keyDepth=.219;
  const rows=[
    {items:[['esc',1.5],['F1',1],['F2',1],['F3',1],['F4',1],['F5',1],['F6',1],['F7',1],['F8',1],['F9',1],['F10',1],['F11',1],['F12',1],['Touch ID',1]]},
    {items:[['`',1],['1',1],['2',1],['3',1],['4',1],['5',1],['6',1],['7',1],['8',1],['9',1],['0',1],['−',1],['=',1],['delete',1.5]]},
    {items:[['tab',1.5],['Q',1],['W',1],['E',1],['R',1],['T',1],['Y',1],['U',1],['I',1],['O',1],['P',1],['[',1],[']',1],['\\',1]]},
    {items:[['caps lock',1.75],['A',1],['S',1],['D',1],['F',1],['G',1],['H',1],['J',1],['K',1],['L',1],[';',1],["'",1],['return',1.75]]},
    {items:[['shift',2.25],['Z',1],['X',1],['C',1],['V',1],['B',1],['N',1],['M',1],[',',1],['.',1],['/',1],['shift',2.25]]},
    {items:[['fn',1],['control',1],['option',1],['command',1.25],['space',5],['command',1.25],['option',1],['←',1],['arrows',1],['→',1]]},
  ];
  const keys=[];const spanWidth=WIDTH*.901;
  rows.forEach((row,rowIndex)=>{
    const unit=spanWidth/14.5;let x=-spanWidth/2;const z=(rowIndex-2.5)*step;
    row.items.forEach(([label,w])=>{
      const width=w*unit-.026,centre=x+w*unit/2;
      if(label==='arrows'){
        keys.push({label:'↑',x:centre,z:z-.0615,width,depth:.096,row:rowIndex});
        keys.push({label:'↓',x:centre,z:z+.0615,width,depth:.096,row:rowIndex});
      }else{
        const arrow=label==='←'||label==='→';
        keys.push({label,x:centre,z:z+(arrow?.0615:0),width,depth:arrow?.096:keyDepth,row:rowIndex});
      }
      x+=w*unit;
    });
  });
  const caps=new THREE.InstancedMesh(roundedSlab(1,1,.07,.085,.012,{curveSegments:2}),materials.key,keys.length);
  caps.name='Black keyboard keycaps';caps.castShadow=true;caps.receiveShadow=true;
  const transform=new THREE.Object3D();
  keys.forEach((key,index)=>{transform.position.set(key.x,.008,key.z);transform.rotation.x=-Math.PI/2;transform.scale.set(key.width,key.depth,.016/.07);transform.updateMatrix();caps.setMatrixAt(index,transform.matrix);});
  group.add(caps);
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=320;
  const c=canvas.getContext('2d');c.fillStyle='#d2d5d9';c.textAlign='center';c.textBaseline='middle';
  const glyphs=['☀','☀','▣','⌕','♩','☾','⏮','⏯','⏭','◁','◀','◀'];
  keys.forEach(key=>{
    const x=(key.x/KEYBOARD_WIDTH+.5)*768,y=(key.z/KEYBOARD_DEPTH+.5)*320;
    if(key.label==='space'||key.label==='Touch ID')return;
    if(key.row===0&&key.label!=='esc'){
      c.font='11px Arial,sans-serif';c.fillText(glyphs[Number(key.label.slice(1))-1],x,y-5);
      c.font='6px Arial,sans-serif';c.fillText(key.label,x,y+9);
    }else if(key.label==='command'||key.label==='option'||key.label==='control'){
      c.font='11px Arial,sans-serif';c.fillText({command:'⌘',option:'⌥',control:'⌃'}[key.label],x+7,y-6);
      c.font='6px Arial,sans-serif';c.fillText(key.label,x,y+9);
    }else{
      c.font=`${key.label.length>2?7:12}px Arial,sans-serif`;c.fillText(key.label,x,y);
    }
  });
  const legends=add(group,new THREE.PlaneGeometry(KEYBOARD_WIDTH,KEYBOARD_DEPTH),new THREE.MeshBasicMaterial({
    map:texture(canvas,'White keyboard legends'),transparent:true,depthWrite:false,toneMapped:false,
  }),'Keyboard legends',[0,.0175,0],[-Math.PI/2,0,0]);
  legends.castShadow=false;legends.receiveShadow=false;
  const touch=keys.find(key=>key.label==='Touch ID');
  add(group,new THREE.RingGeometry(.068,.073,20),materials.edge,'Touch ID rim',[touch.x,.0165,touch.z],[-Math.PI/2,0,0]);
  add(group,new THREE.CircleGeometry(.067,20),materials.touch,'Touch ID inset',[touch.x,.017,touch.z],[-Math.PI/2,0,0]);
  group.userData.rows=6;group.userData.keyCount=keys.length;group.userData.keys=keys;
}

function ports(parent,materials) {
  const leftX=-WIDTH/2-.006;
  for(const [z,width,height,name]of [[-1.15,.22,.028,'MagSafe recess'],[-.91,.12,.034,'Rear USB-C recess'],[-.62,.12,.034,'Front USB-C recess']]){
    add(parent,new THREE.ShapeGeometry(roundShape(width+.014,height+.009,.014),3),materials.edge,`${name} rim`,[leftX,.065,z],[0,-Math.PI/2,0]);
    add(parent,new THREE.ShapeGeometry(roundShape(width,height,.012),3),materials.recess,name,[leftX-.001,.065,z],[0,-Math.PI/2,0]);
  }
  add(parent,new THREE.CircleGeometry(.023,16),materials.recess,'Right headphone jack',[WIDTH/2+.006,.062,-1.13],[0,Math.PI/2,0]);
}

function appleEmblem() {
  // A small, flat silhouette; no logo texture or model download is required.
  const fruit=new THREE.Shape();fruit.moveTo(0,.25);
  fruit.bezierCurveTo(-.15,.37,-.42,.39,-.5,.1);fruit.bezierCurveTo(-.59,-.19,-.35,-.51,-.19,-.5);
  fruit.bezierCurveTo(-.07,-.49,-.06,-.44,.02,-.44);fruit.bezierCurveTo(.12,-.44,.17,-.51,.27,-.48);
  fruit.bezierCurveTo(.38,-.43,.47,-.28,.5,-.18);fruit.bezierCurveTo(.25,-.14,.22,.13,.45,.22);
  fruit.bezierCurveTo(.32,.42,.12,.35,0,.25);
  const leaf=new THREE.Shape();leaf.moveTo(.015,.36);leaf.bezierCurveTo(.01,.55,.17,.68,.32,.68);leaf.bezierCurveTo(.32,.51,.17,.37,.015,.36);
  return new THREE.ShapeGeometry([fruit,leaf],8);
}

export function createLaptop() {
  const materials={
    navy:new THREE.MeshStandardMaterial({color:'#181e27',metalness:.65,roughness:.47}),
    edge:new THREE.MeshStandardMaterial({color:'#292f39',metalness:.65,roughness:.46}),
    recess:new THREE.MeshStandardMaterial({color:'#06080c',metalness:.04,roughness:.75}),
    key:new THREE.MeshStandardMaterial({color:'#0c0e12',metalness:.02,roughness:.58}),
    touch:new THREE.MeshStandardMaterial({color:'#11151b',metalness:.15,roughness:.43}),
    pad:new THREE.MeshStandardMaterial({color:'#181e27',metalness:.58,roughness:.54}),
  };
  const laptop=new THREE.Group();laptop.name='13-inch M4 MacBook Air — Midnight study';
  laptop.userData.model='MacBook Air 13-inch M4';laptop.userData.finish='Midnight';
  laptop.userData.visualEstimates={bodyWidth:WIDTH,bodyDepth:DEPTH,lidWidth:LID_WIDTH,lidHeight:LID_HEIGHT,panelAspect:2560/1664};
  add(laptop,roundedSlab(WIDTH,DEPTH,.096,.11,.008,{cutout:{width:KEYBOARD_WIDTH-.015,depth:KEYBOARD_DEPTH-.015,z:KEYBOARD_Z}}),materials.navy,
    'Midnight aluminium body',[0,.060,0],[-Math.PI/2,0,0]);
  flat(laptop,WIDTH-.04,DEPTH-.04,.009,materials.edge,'Thin lower perimeter seam',[0,.012,0],.10);
  const feet=new THREE.InstancedMesh(new THREE.CylinderGeometry(.093,.087,.015,12),materials.recess,4);
  feet.name='Small underside feet';const transform=new THREE.Object3D();let index=0;
  for(const x of [-1.66,1.66])for(const z of [-1.14,1.14]){transform.position.set(x,.0075,z);transform.updateMatrix();feet.setMatrixAt(index++,transform.matrix);}
  laptop.add(feet);
  keyboard(laptop,materials);
  const padWidth=WIDTH*.423,padDepth=DEPTH*.375,padZ=-DEPTH/2+DEPTH*(.598+.973)/2;
  add(laptop,new THREE.ShapeGeometry(roundShape(padWidth,padDepth,.066),5),materials.recess,'Trackpad precision outline',[0,.1083,padZ],[-Math.PI/2,0,0]);
  add(laptop,new THREE.ShapeGeometry(roundShape(padWidth-.012,padDepth-.012,.061),5),materials.pad,'Force Touch trackpad',[0,.1086,padZ],[-Math.PI/2,0,0]);
  add(laptop,new THREE.ShapeGeometry(roundShape(.63,.013,.006),4),materials.recess,'Front opening recess',[0,.104,DEPTH/2+.0005]);
  flat(laptop,WIDTH*.78,.070,.014,materials.recess,'Recessed hinge channel',[0,.112,-DEPTH/2+.033],.009);
  ports(laptop,materials);
  const lid=new THREE.Group();lid.name='Thin MacBook display lid';lid.position.set(0,.134,-DEPTH/2+.020);lid.rotation.x=-.18;laptop.add(lid);
  add(lid,roundedSlab(LID_WIDTH,LID_HEIGHT,.042,.060,.005),materials.navy,'Display enclosure',[0,LID_HEIGHT/2,0]);
  const glass=add(lid,new THREE.ShapeGeometry(roundShape(3.985,LID_HEIGHT-.034,.048),5),materials.recess,'Continuous black display glass',[0,LID_HEIGHT/2,.0215]);
  glass.castShadow=false;
  const screenWidth=PANEL_WIDTH,screenHeight=PANEL_HEIGHT;
  const screenCentre=CHIN+screenHeight/2;
  // Software supplies the full desktop through the live HTML aperture. The
  // hardware panel stays plain black, with no duplicated wallpaper or UI.
  const screen=add(lid,displayGeometry(screenWidth,screenHeight),new THREE.MeshBasicMaterial({color:0x000000,toneMapped:false}),
    'Notched Liquid Retina display',[0,screenCentre,.023]);
  screen.castShadow=false;screen.receiveShadow=false;screen.userData.screenWidth=screenWidth;screen.userData.screenHeight=screenHeight;
  // The aperture is only .0003 units behind this printed-on-glass detail.
  // At oblique/distant views its depth can quantise into the same bucket and
  // clear alternating notch pixels. Bias these two details toward the camera
  // without changing the physical contour or the shared recess material.
  const notchMaterial=materials.recess.clone();
  notchMaterial.polygonOffset=true;notchMaterial.polygonOffsetFactor=-1;notchMaterial.polygonOffsetUnits=-1;
  const notch=add(lid,new THREE.ShapeGeometry(roundShape(.47,.095,.018),5),notchMaterial,'Display notch',[0,CHIN+screenHeight-.043,.0235]);
  notch.castShadow=false;notch.receiveShadow=false;
  const lens=add(lid,new THREE.CircleGeometry(.016,24),new THREE.MeshBasicMaterial({color:'#17212a',polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),'Notch camera',[0,CHIN+screenHeight-.036,.024]);
  lens.castShadow=false; lens.receiveShadow=false;
  const emblem=add(lid,appleEmblem(),new THREE.MeshStandardMaterial({color:'#090c11',metalness:.75,roughness:.25}),
    'Subtle rear Apple silhouette',[0,LID_HEIGHT*.51,-.0215],[0,Math.PI,0]);
  emblem.scale.setScalar(.34);emblem.castShadow=false;
  const usbPointLocal=new THREE.Vector3(-WIDTH/2-.007,.065,-.62);
  const usbDirection=new THREE.Vector3(-1,0,0);
  const sidePadding=(LID_WIDTH-screenWidth)/2;
  const screenFramePadding={left:sidePadding,right:sidePadding,top:LID_HEIGHT-CHIN-screenHeight,bottom:CHIN};
  return {laptop,screen,screenWidth,screenHeight,screenTopInset:0,screenBottomInset:0,screenCornerRadius:SCREEN_CORNER_RADIUS,screenFrameWidth:LID_WIDTH,screenFrameHeight:LID_HEIGHT,screenFramePadding,usbPointLocal,usbPoint:usbPointLocal.clone(),usbDirection,attachmentSpace:'local'};
}
