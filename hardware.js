import * as THREE from './vendor/three/three.module.js';
import { createLaptop } from './macbook-air.js';
import { createSuperDrive } from './superdrive.js';

function connectorHousing(length,height,width) {
  const radius=.018,bevel=.003,x=-length/2+bevel,z=-width/2+bevel;
  const l=length-2*bevel,w=width-2*bevel,shape=new THREE.Shape();
  shape.moveTo(x+radius,z);shape.lineTo(x+l-radius,z);shape.quadraticCurveTo(x+l,z,x+l,z+radius);
  shape.lineTo(x+l,z+w-radius);shape.quadraticCurveTo(x+l,z+w,x+l-radius,z+w);
  shape.lineTo(x+radius,z+w);shape.quadraticCurveTo(x,z+w,x,z+w-radius);
  shape.lineTo(x,z+radius);shape.quadraticCurveTo(x,z,x+radius,z);
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:height-2*bevel,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,curveSegments:3,steps:1});
  geometry.translate(0,0,-height/2+bevel);geometry.rotateX(-Math.PI/2);
  return geometry;
}

// Common physical envelopes with photo-guided simplified details. Small casing
// features and the proposed cable path remain estimates, not manufacturer CAD.
export function createHardware() {
  const group = new THREE.Group();
  group.name = 'Midnight MacBook Air and right SuperDrive arrangement';
  const { laptop, screen, screenWidth, screenHeight,screenTopInset,screenBottomInset,screenCornerRadius,screenFrameWidth,screenFrameHeight,screenFramePadding,usbPointLocal,usbDirection:usbDirectionLocal } = createLaptop();
  const { drive, slot, cableAnchor } = createSuperDrive();
  laptop.position.set(-2.30, 0, 0);
  // A small anticlockwise turn from above brings the screen toward the viewer.
  laptop.rotation.y = THREE.MathUtils.degToRad(12);
  laptop.updateMatrix();
  const driveOffset = new THREE.Vector3(1.35, 0, .25).sub(drive.position);
  drive.position.add(driveOffset);
  const driveExit = cableAnchor.clone().add(driveOffset);
  // The Air's left USB-C port connects through a small USB-C-to-USB-A adapter.
  const usbPoint=usbPointLocal.clone().applyMatrix4(laptop.matrix);
  const usbDirection=usbDirectionLocal.clone().transformDirection(laptop.matrix);
  const adapterSocket=usbPoint.clone().addScaledVector(usbDirection,.58);
  // Keep the female housing on the table. Its mating plug shares the same
  // axis, while the flexible adapter lead rises to the laptop's higher port.
  const adapterHeight=.10,adapterLength=.26,seam=.006,plugSeam=.004;
  adapterSocket.y=adapterHeight/2+.001;
  laptop.userData.arrangement = 'left';
  group.add(laptop, drive);

  const cable = new THREE.Group();
  cable.name = 'SuperDrive cable and left USB-C adapter';
  // This longer path is an arrangement study, not a claim about the supplied
  // drive's actual fixed-cable length. Keep it behind the lid and desk objects.
  cable.userData.usbPoint = usbPoint.toArray();
  cable.userData.adapterSocket=adapterSocket.toArray();
  cable.userData.driveExit = driveExit.toArray();
  cable.userData.connectionSide = 'left';
  const white = new THREE.MeshStandardMaterial({ color:'#e6e5dd', roughness:.66, metalness:0 });
  const metal = new THREE.MeshStandardMaterial({ color:'#b4b9bb', roughness:.34, metalness:.8 });
  const end = adapterSocket.clone().addScaledVector(usbDirection, .23+plugSeam);
  const curve = new THREE.CatmullRomCurve3([
    driveExit.clone(),
    driveExit.clone().add(new THREE.Vector3(0,-.018,-.21)),
    new THREE.Vector3(1.62,.05,-1.55),
    new THREE.Vector3(1.30,.035,-2.20),
    new THREE.Vector3(.20,.035,-2.44),
    new THREE.Vector3(-2.50,.035,-2.44),
    new THREE.Vector3(-4.60,.035,-2.45),
    new THREE.Vector3(-5.05,.045,-1.92),
    new THREE.Vector3(-5.05,.08,-1.12),
    end.clone().addScaledVector(usbDirection,.12),
    end,
  ]);
  const cord = new THREE.Mesh(new THREE.TubeGeometry(curve,88,.019,8,false),white);
  cord.name = 'Flexible fixed USB cord';
  cord.castShadow = true;
  cable.add(cord);
  const plug = new THREE.Mesh(connectorHousing(.23,.086,.13),white);
  plug.name = 'White USB-A plug body';
  plug.position.copy(adapterSocket).addScaledVector(usbDirection,.23/2+plugSeam);
  plug.castShadow = true;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(.08,.06,.115),metal);
  nose.name = 'SuperDrive USB-A plug shell at adapter';
  nose.position.copy(adapterSocket).addScaledVector(usbDirection,plugSeam+.003-.08/2);
  const adapterBody=new THREE.Mesh(connectorHousing(adapterLength,adapterHeight,.15),white);
  adapterBody.name='USB-C to USB-A adapter body';
  adapterBody.position.copy(adapterSocket).addScaledVector(usbDirection,-adapterLength/2);
  adapterBody.castShadow=true;
  const adapterOpening=new THREE.Mesh(new THREE.BoxGeometry(.002,.066,.122),new THREE.MeshStandardMaterial({color:'#27303b',roughness:.8}));
  adapterOpening.name='USB-A adapter socket';adapterOpening.position.copy(adapterSocket);
  const cTip=new THREE.Mesh(new THREE.BoxGeometry(.075,.032,.08),metal);
  cTip.name='USB-C connector at MacBook Air';cTip.position.copy(usbPoint).addScaledVector(usbDirection,-.024);
  const cHead=new THREE.Mesh(connectorHousing(.13,.053,.11),white);
  cHead.name='White USB-C connector';cHead.position.copy(usbPoint).addScaledVector(usbDirection,.13/2+seam);cHead.castShadow=true;
  const headTail=usbPoint.clone().addScaledVector(usbDirection,.13+seam);
  const adapterRear=adapterSocket.clone().addScaledVector(usbDirection,-adapterLength);
  const reliefLength=.045;
  const cRelief=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,reliefLength,12).rotateZ(Math.PI/2),white);
  cRelief.name='USB-C strain relief';cRelief.position.copy(headTail).addScaledVector(usbDirection,reliefLength/2);cRelief.castShadow=true;
  const adapterRelief=new THREE.Mesh(cRelief.geometry,white);
  adapterRelief.name='USB-A adapter strain relief';adapterRelief.position.copy(adapterRear).addScaledVector(usbDirection,-reliefLength/2);adapterRelief.castShadow=true;
  const leadStart=headTail.clone().addScaledVector(usbDirection,reliefLength);
  const leadEnd=adapterRear.clone().addScaledVector(usbDirection,-reliefLength);
  const adapterCurve=new THREE.CatmullRomCurve3([
    leadStart,
    leadStart.clone().lerp(leadEnd,.5).add(new THREE.Vector3(0,-.006,.012)),
    leadEnd,
  ]);
  const adapterLead=new THREE.Mesh(new THREE.TubeGeometry(adapterCurve,12,.012,6,false),white);
  adapterLead.name='Short USB-C adapter lead';adapterLead.castShadow=true;
  const boot = new THREE.Mesh(new THREE.CylinderGeometry(.026,.026,.105,12),white);
  boot.name = 'Drive cable strain relief';
  boot.rotation.x = Math.PI/2;
  boot.position.copy(driveExit).add(new THREE.Vector3(0,0,-.025));
  boot.castShadow = true;
  // These pieces attach to the turned Air; the drive and its strain relief
  // retain their own orientation. Tube paths already use the turned markers.
  for(const part of [plug,nose,adapterBody,adapterOpening,cTip,cHead,cRelief,adapterRelief])part.quaternion.copy(laptop.quaternion);
  cable.add(plug,nose,boot,adapterBody,adapterOpening,cTip,cHead,cRelief,adapterRelief,adapterLead);
  group.add(cable);
  return { group, laptop, drive, screen, slot, cable, screenWidth, screenHeight,screenTopInset,screenBottomInset,screenCornerRadius,screenFrameWidth,screenFrameHeight,screenFramePadding };
}
