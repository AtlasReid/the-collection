import * as THREE from './vendor/three/three.module.js';

// Original reference-led visual model. These proportions are estimates from
// the supplied multi-angle photographs, not measured manufacturer CAD.
const BODY_WIDTH = 4.6;
const BODY_DEPTH = 3.07;
const LID_WIDTH = 4.56;
const LID_HEIGHT = 2.82;
const PANEL_WIDTH = 4.28;
const PANEL_HEIGHT = PANEL_WIDTH * 9 / 16;
const DISPLAY_LEAN = -.205;

function roundedShape(width, height, radius) {
  const x = -width / 2, y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

function roundedBox(width, height, depth, radius = .035, bevel = .008) {
  const geometry = new THREE.ExtrudeGeometry(roundedShape(width - bevel * 2, height - bevel * 2, radius), {
    depth: depth - bevel * 2, bevelEnabled: bevel > 0,
    bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2,
    steps: 1, curveSegments: 5,
  });
  geometry.translate(0, 0, -depth / 2 + bevel);
  return geometry;
}

function mesh(geometry, material, name) {
  const object = new THREE.Mesh(geometry, material);
  object.name = name;
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

function flatBox(width, depth, thickness, material, name, x, y, z, radius = .03, bevel = .006) {
  const object = mesh(roundedBox(width, depth, thickness, radius, bevel), material, name);
  object.rotation.x = -Math.PI / 2;
  object.position.set(x, y, z);
  return object;
}

function textLabel(text, width, height, color = '#4e5556', size = 52) {
  const canvas = document.createElement('canvas');
  canvas.width = 768; canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = color;
  context.font = `${size}px Arial, sans-serif`;
  context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillText(text, 384, 67);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, toneMapped: false,
  }));
}

function desktopTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 576;
  const context = canvas.getContext('2d');
  const background = context.createLinearGradient(0, 0, 1024, 576);
  background.addColorStop(0, '#08110f');
  background.addColorStop(.56, '#101d18');
  background.addColorStop(1, '#080c0d');
  context.fillStyle = background; context.fillRect(0, 0, 1024, 576);
  const glow = context.createRadialGradient(820, 145, 20, 820, 145, 600);
  glow.addColorStop(0, '#28472b50'); glow.addColorStop(1, '#28472b00');
  context.fillStyle = glow; context.fillRect(0, 0, 1024, 576);
  for (const [offset, color, alpha, width] of [[0,'#71ba4b',.48,1.7],[15,'#4b8141',.32,1],[-17,'#a6ce7a',.2,.7]]) {
    context.beginPath(); context.moveTo(-70, 410 + offset);
    context.bezierCurveTo(185, 520 + offset, 368, 120 + offset, 645, 178 + offset);
    context.bezierCurveTo(820, 215 + offset, 875, 88 + offset, 1100, 75 + offset);
    context.globalAlpha = alpha; context.strokeStyle = color; context.lineWidth = width; context.stroke();
  }
  context.globalAlpha = 1;
  const iconFill = context.createLinearGradient(40, 28, 82, 72);
  iconFill.addColorStop(0, '#89c5e7'); iconFill.addColorStop(1, '#2c71a5');
  context.beginPath(); context.arc(62, 50, 23, 0, Math.PI * 2);
  context.fillStyle = iconFill; context.fill();
  context.strokeStyle = '#c5e0ee'; context.lineWidth = 1; context.stroke();
  context.fillStyle = '#fff'; context.font = '34px Georgia, serif';
  context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText('♫', 62, 51);
  context.font = '14px Arial, sans-serif'; context.fillStyle = '#c4d2cc'; context.fillText('iTunes', 62, 91);
  context.fillStyle = '#b0beb6'; context.font = '25px Arial, sans-serif'; context.fillText('Your next listen', 512, 267);
  context.fillStyle = '#e0e9e1'; context.font = '34px Arial, sans-serif'; context.fillText('starts with a disc.', 512, 310);
  context.font = '12px Arial, sans-serif'; context.fillStyle = '#687d6c'; context.fillText('A COLLECTION ON COMPACT DISC', 512, 355);
  context.fillStyle = '#0c1412e8'; context.fillRect(0, 541, 1024, 35);
  context.fillStyle = '#2b3930'; context.fillRect(0, 541, 1024, 1);
  context.fillStyle = '#9bb2a0';
  for (const [x,y] of [[18,553],[26,553],[18,561],[26,561]]) context.fillRect(x,y,6,6);
  context.font = '12px Arial, sans-serif'; context.textAlign = 'left'; context.fillStyle = '#8b9f91'; context.fillText('Razer Blade 15',49,560);
  context.textAlign = 'right'; context.fillStyle = '#647a6b'; context.fillText('THE LISTENING DESK',1004,560);
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'Code-generated 16:9 listening desktop';
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const BACKLIGHT_STOPS = [
  [0,'#e4ce64'], [.20,'#d8795c'], [.42,'#b478a5'],
  [.64,'#7b9ed2'], [.82,'#77b3b7'], [1,'#87bf6b'],
].map(([at,color]) => ({at,color:new THREE.Color(color)}));
function keyColor(t) {
  for (let i=1;i<BACKLIGHT_STOPS.length;i++) {
    const a=BACKLIGHT_STOPS[i-1], b=BACKLIGHT_STOPS[i];
    if(t<=b.at) return a.color.clone().lerp(b.color,(t-a.at)/(b.at-a.at));
  }
  return BACKLIGHT_STOPS.at(-1).color.clone();
}

function makeKeyboard(parent, materials) {
  const keyboard = new THREE.Group();
  keyboard.name = 'Six-row RGB keyboard';
  keyboard.position.set(0, .226, -.40);
  parent.add(keyboard);
  const well = flatBox(3.74,1.54,.012,materials.recess,'Keyboard recessed well',0,0,0,.035,.004);
  keyboard.add(well);
  // The supplied overhead reference has a complete function row. The legends
  // and stagger below are a visual approximation, not an exact keyboard SKU.
  const rows = [
    {z:-.665,height:.143,items:[['esc',1],['F1',1],['F2',1],['F3',1],['F4',1],['F5',1],['F6',1],['F7',1],['F8',1],['F9',1],['F10',1],['F11',1],['F12',1],['del',1],['⏻',1]]},
    {z:-.435,height:.198,items:[['`',1],['1',1],['2',1],['3',1],['4',1],['5',1],['6',1],['7',1],['8',1],['9',1],['0',1],['−',1],['=',1],['⌫',1.8]]},
    {z:-.19,height:.198,items:[['tab',1.5],['Q',1],['W',1],['E',1],['R',1],['T',1],['Y',1],['U',1],['I',1],['O',1],['P',1],['[',1],[']',1],['\\',1.3]]},
    {z:.055,height:.198,items:[['caps',1.75],['A',1],['S',1],['D',1],['F',1],['G',1],['H',1],['J',1],['K',1],['L',1],[';',1],["'",1],['enter',2.05]]},
    {z:.30,height:.198,items:[['shift',2.25],['Z',1],['X',1],['C',1],['V',1],['B',1],['N',1],['M',1],[',',1],['.',1],['/',1],['shift',2.55]]},
    {z:.545,height:.198,items:[['ctrl',1.1],['fn',1],['⊞',1],['alt',1],['space',5.25],['alt',1],['fn',1],['ctrl',1],['←',1],['↑\n↓',1],['→',1]]},
  ];
  const spanWidth=3.68, gap=.022, keys=[];
  rows.forEach((row,rowIndex)=>{
    const weight=row.items.reduce((sum,[,width])=>sum+width,0);
    const unit=spanWidth/weight;
    let x=-spanWidth/2;
    row.items.forEach(([key,width])=>{
      const span=width*unit;
      keys.push({key,x:x+span/2,z:row.z,width:span-gap,height:row.height,row:rowIndex});
      x+=span;
    });
  });
  const caps=new THREE.InstancedMesh(roundedBox(1,1,1,.075,.014),materials.key,keys.length);
  caps.name='Instanced six-row physical keycaps'; caps.castShadow=true; caps.receiveShadow=true;
  const underlight=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:'#fff',toneMapped:false}),keys.length);
  underlight.name='Muted per-column keyboard backlight';
  const transform=new THREE.Object3D();
  keys.forEach((key,index)=>{
    transform.position.set(key.x,.014,key.z); transform.rotation.set(-Math.PI/2,0,0);
    transform.scale.set(key.width,key.height,.027); transform.updateMatrix();caps.setMatrixAt(index,transform.matrix);
    // The well's top is y=.006: put the small exposed rim above it rather
    // than hiding the backlight underneath the well's opaque upper face.
    transform.position.y=.007;transform.rotation.set(0,0,0);transform.scale.set(key.width+.014,.004,key.height+.014);transform.updateMatrix();
    underlight.setMatrixAt(index,transform.matrix);
    underlight.setColorAt(index,keyColor((key.x+spanWidth/2)/spanWidth).multiplyScalar(.38));
  });
  keyboard.add(underlight,caps);

  const canvas=document.createElement('canvas'); canvas.width=1536;canvas.height=644;
  const context=canvas.getContext('2d');context.textAlign='center';context.textBaseline='middle';
  const artworkWidth=3.74,artworkDepth=1.54;
  keys.forEach(key=>{
    const px=(key.x/artworkWidth+.5)*canvas.width,py=(key.z/artworkDepth+.5)*canvas.height;
    context.fillStyle=`#${keyColor((key.x+spanWidth/2)/spanWidth).getHexString()}`;
    context.font=`500 ${key.row===0?22:key.key.length>1?23:27}px Arial,sans-serif`;
    if(key.key==='space')context.fillRect(px-20,py+15,40,1.5);
    else if(key.key==='↑\n↓'){
      context.font='500 21px Arial,sans-serif';context.fillText('↑',px,py-14);context.fillText('↓',px,py+15);
    }else context.fillText(key.key,px,py);
  });
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const legends=new THREE.Mesh(new THREE.PlaneGeometry(artworkWidth,artworkDepth),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false,opacity:1}));
  legends.name='Rainbow keyboard legend surface';legends.rotation.x=-Math.PI/2;legends.position.y=.0335;keyboard.add(legends);
  keyboard.userData.rows=6;keyboard.userData.keyCount=keys.length;
  return keyboard;
}

function speaker(parent,x,material) {
  const rows=46,columns=5;
  const holes=new THREE.InstancedMesh(new THREE.CircleGeometry(.0068,5),material,rows*columns);
  holes.name='Fine speaker perforations';
  const transform=new THREE.Object3D();transform.rotation.x=-Math.PI/2;
  for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){
    transform.position.set(x+(c-2)*.029,.2235,-1.105+r*.0315);transform.updateMatrix();holes.setMatrixAt(r*columns+c,transform.matrix);
  }
  parent.add(holes);
}

function addPorts(laptop,materials) {
  // Simplified side silhouettes from the supplied angle references. No claim
  // is made about an exact 2023 model's port count or internal capabilities.
  for(const side of [-1,1]) {
    const positions=side<0?[-1.10,-.76,-.42,-.03,.28]:[-1.04,-.55,-.12,.28];
    positions.forEach((z,index)=>{
      const usb=side<0?(index===1||index===2):index===1;
      const width=usb?.19:index===0?.21:index===positions.length-1?.09:.15;
      const height=usb?.057:index===positions.length-1?.042:.045;
      const port=mesh(new THREE.BoxGeometry(.010,height,width),materials.recess,usb?'USB-A opening':'Simplified side opening');
      port.position.set(side*2.302,.142,z);laptop.add(port);
      if(usb){const insert=mesh(new THREE.BoxGeometry(.013,.012,.141),materials.usbGreen,'Green USB insert');insert.position.set(side*2.308,.137,z);laptop.add(insert);}
    });
  }
}

export function createLaptop() {
  const materials={
    black:new THREE.MeshStandardMaterial({color:'#111315',metalness:.62,roughness:.48}),
    lid:new THREE.MeshStandardMaterial({color:'#101214',metalness:.6,roughness:.5}),
    edge:new THREE.MeshStandardMaterial({color:'#2b3032',metalness:.72,roughness:.38}),
    recess:new THREE.MeshStandardMaterial({color:'#050709',metalness:.1,roughness:.78}),
    key:new THREE.MeshStandardMaterial({color:'#101215',metalness:.22,roughness:.57}),
    holes:new THREE.MeshBasicMaterial({color:'#060709'}),
    rubber:new THREE.MeshStandardMaterial({color:'#111416',roughness:.95}),
    usbGreen:new THREE.MeshStandardMaterial({color:'#457333',emissive:'#3d7d25',emissiveIntensity:.12,roughness:.65}),
  };
  const laptop=new THREE.Group();laptop.name='Razer Blade 15 reference refinement';laptop.position.x=-.45;
  laptop.userData.visualEstimates={bodyWidth:BODY_WIDTH,bodyDepth:BODY_DEPTH,lidWidth:LID_WIDTH,lidHeight:LID_HEIGHT,panelAspect:16/9};
  laptop.add(flatBox(BODY_WIDTH,BODY_DEPTH,.17,materials.black,'Slim machined laptop body',0,.135,0,.045,.008));
  laptop.add(flatBox(4.55,3.02,.028,materials.recess,'Lower case perimeter seam',0,.047,0,.041,.005));
  laptop.add(flatBox(4.47,2.93,.007,materials.black,'Continuous palm-rest deck',0,.221,0,.027,.002));
  makeKeyboard(laptop,materials);speaker(laptop,-2.035,materials.holes);speaker(laptop,2.035,materials.holes);
  const trackpadOutline=flatBox(1.724,1.044,.006,materials.edge,'Trackpad fine outline',0,.226,.949,.024,.0015);
  const trackpad=flatBox(1.70,1.02,.007,new THREE.MeshStandardMaterial({color:'#15191c',metalness:.43,roughness:.43}),'Larger glass trackpad',0,.230,.949,.022,.0015);
  laptop.add(trackpadOutline,trackpad);
  const notch=mesh(new THREE.BoxGeometry(.52,.019,.022),materials.recess,'Front centre opening recess');notch.position.set(0,.215,1.527);laptop.add(notch);
  for(const x of [-1.78,1.78])for(const z of [-1.13,1.13]){
    const foot=mesh(new THREE.CylinderGeometry(.085,.085,.030,12),materials.rubber,'Laptop rubber foot');foot.position.set(x,.016,z);laptop.add(foot);
  }
  addPorts(laptop,materials);
  const hinge=mesh(new THREE.CylinderGeometry(.052,.052,3.93,16),materials.recess,'Rear display hinge');hinge.rotation.z=Math.PI/2;hinge.position.set(0,.25,-1.40);laptop.add(hinge);
  const lid=new THREE.Group();lid.name='Full-width open display';lid.position.set(0,.255,-1.425);lid.rotation.x=DISPLAY_LEAN;laptop.add(lid);
  const housing=mesh(roundedBox(LID_WIDTH,LID_HEIGHT,.064,.027,.008),materials.lid,'Full-width slim display enclosure');housing.position.y=LID_HEIGHT/2;lid.add(housing);
  const screenWidth=PANEL_WIDTH,screenHeight=PANEL_HEIGHT;
  const screenCentre=.33+screenHeight/2;
  const glass=new THREE.Mesh(new THREE.PlaneGeometry(screenWidth+.075,screenHeight+.075),materials.recess);glass.name='Narrow display glass border';glass.position.set(0,screenCentre,.033);lid.add(glass);
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(screenWidth,screenHeight),new THREE.MeshBasicMaterial({map:desktopTexture(),toneMapped:false}));
  screen.name='Interactive 16:9 display plane';screen.position.set(0,screenCentre,.035);screen.userData.screenWidth=screenWidth;screen.userData.screenHeight=screenHeight;lid.add(screen);
  const cameraMaterial=new THREE.MeshStandardMaterial({color:'#09141d',metalness:.55,roughness:.15});
  const camera=mesh(new THREE.SphereGeometry(.014,10,6),cameraMaterial,'Top-bezel camera');camera.scale.z=.28;camera.position.set(0,2.778,.034);lid.add(camera);
  for(const x of [-.14,-.075,.075,.14]){const sensor=new THREE.Mesh(new THREE.CircleGeometry(Math.abs(x)<.1?.007:.0045,8),materials.holes);sensor.position.set(x,2.778,.034);lid.add(sensor);}
  const wordmark=textLabel('R A Z E R',.42,.066,'#414849',48);wordmark.position.set(0,.153,.034);lid.add(wordmark);
  // A typographic rear cue avoids inventing or tracing the supplied snake logo.
  const backMark=textLabel('R A Z E R',.72,.105,'#3b7d36',52);backMark.rotation.y=Math.PI;backMark.position.set(0,1.49,-.034);lid.add(backMark);
  const usbPoint=new THREE.Vector3(laptop.position.x+2.305,.142,-.55);
  const usbDirection=new THREE.Vector3(1,0,0);
  return {laptop,screen,screenWidth,screenHeight,usbPoint,usbDirection};
}
