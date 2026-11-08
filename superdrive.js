import * as THREE from './vendor/three/three.module.js';
import { mm,PHYSICAL_DIMENSIONS } from './physical-scale.js';

// Visual reconstruction from the supplied front, overhead and oblique photos.
// The envelope is calibrated to Apple's 139 × 139 × 17 mm dimensions.
// Slot and small casing details remain visual estimates, not manufacturer CAD.
function roundedRectangle(width, height, radius, centreY = 0) {
  const shape = new THREE.Shape();
  const x = -width / 2, y = centreY - height / 2;
  const r = Math.min(radius, width / 2, height / 2);
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

function roundedSlab(width, depth, thickness, radius, bevel) {
  const geometry = new THREE.ExtrudeGeometry(roundedRectangle(width - 2 * bevel, depth - 2 * bevel, radius - bevel), {
    depth: thickness - 2 * bevel,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    curveSegments: 7,
    steps: 1,
  });
  geometry.translate(0, 0, -thickness / 2 + bevel);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function addMesh(parent, geometry, material, name, position) {
  const object = new THREE.Mesh(geometry, material);
  object.name = name;
  object.position.set(...position);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function brushedRoughness() {
  const width = 256, height = 64;
  const bytes = new Uint8Array(width * height * 4);
  let seed = 3919;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let row = 0; row < height; row++) {
    const line = (random() - .5) * 11;
    for (let column = 0; column < width; column++) {
      const value = Math.round(224 + line + (random() - .5) * 5);
      const offset = (row * width + column) * 4;
      bytes[offset] = bytes[offset + 1] = bytes[offset + 2] = value;
      bytes[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(bytes, width, height, THREE.RGBAFormat);
  texture.name = 'Fine directional aluminium roughness';
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function createSuperDrive() {
  const drive = new THREE.Group();
  drive.name = 'USB SuperDrive photo-guided housing';
  drive.position.set(3.1, 0, .75);
  const housing=new THREE.Group();housing.name='SuperDrive calibrated housing';drive.add(housing);

  const aluminium = new THREE.MeshStandardMaterial({
    color: '#cbd0cf', metalness: .78, roughness: .4,
    roughnessMap: brushedRoughness(),
  });
  const baseMaterial = new THREE.MeshStandardMaterial({ color: '#151a1a', roughness: .83, metalness: .04 });
  const felt = new THREE.MeshStandardMaterial({ color: '#121818', roughness: .98, metalness: 0 });

  // The top stays nearly planar to the edge. The restrained plan corner and
  // 0.003 bevel replace the first study's thick rounded/chamfered silhouette.
  addMesh(housing, roundedSlab(1.9, 1.9, .018, .052, .003), aluminium,
    'Flat aluminium lid with fine edge break', [0, .188, 0]);
  addMesh(housing, roundedSlab(1.878, 1.878, .044, .045, .004), baseMaterial,
    'Continuous inset black lower shell', [0, .027, 0]);

  // A real opening crosses the entire front wall. The disc can pass through
  // it horizontally; there is no solid aluminium box underneath a painted slot.
  const frontBottom = .048, frontTop = .191;
  const frontCentre = (frontBottom + frontTop) / 2;
  const front = roundedRectangle(1.9, frontTop - frontBottom, .008);
  const aperture = roundedRectangle(1.76, .034, .017, .145 - frontCentre);
  front.holes.push(aperture);
  const frontGeometry = new THREE.ExtrudeGeometry(front, {
    depth: .029, bevelEnabled: false, curveSegments: 12, steps: 1,
  });
  addMesh(housing, frontGeometry, aluminium, 'Front aluminium wall with capsule aperture', [0, frontCentre, .921]);

  // The remaining walls sit inside the tiny lid overhang. A dark interior at
  // the far back gives the aperture depth without blocking the disc's path.
  const sideHeight = .136;
  addMesh(housing, new THREE.BoxGeometry(.026, sideHeight, 1.85), aluminium,
    'Left straight aluminium wall', [-.936, .119, -.012]);
  addMesh(housing, new THREE.BoxGeometry(.026, sideHeight, 1.85), aluminium,
    'Right straight aluminium wall', [.936, .119, -.012]);
  addMesh(housing, new THREE.BoxGeometry(1.85, sideHeight, .027), aluminium,
    'Rear aluminium wall', [0, .119, -.936]);
  addMesh(housing, new THREE.BoxGeometry(1.80, .009, 1.80), baseMaterial,
    'Dark internal floor', [0, .056, 0]);
  addMesh(housing, new THREE.BoxGeometry(1.765, .05, .012), felt,
    'Recessed dark interior behind slot', [0, .145, -.88]);
  addMesh(housing, new THREE.BoxGeometry(1.752, .002, .075), felt,
    'Upper slot felt lining', [0, .163, .891]);
  addMesh(housing, new THREE.BoxGeometry(1.752, .002, .075), felt,
    'Lower slot felt lining', [0, .127, .891]);

  const slot = new THREE.Object3D();
  slot.name = 'SuperDrive slot centre';
  slot.position.set(0, .145, .952);
  slot.userData.width = 1.76;
  slot.userData.height = .034;
  housing.add(slot);
  // Normalise the original photo study by its actual mesh envelope. Keeping
  // this transform inside the root preserves the desk placement contract.
  drive.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(housing),size=bounds.getSize(new THREE.Vector3());
  const physical=PHYSICAL_DIMENSIONS.superDrive;
  housing.scale.set(mm(physical.width)/size.x,mm(physical.height)/size.y,mm(physical.depth)/size.z);
  housing.position.y=-(bounds.min.y-drive.position.y)*housing.scale.y;
  slot.userData.width*=housing.scale.x;slot.userData.height*=housing.scale.y;
  drive.userData.physicalDimensionsMm={...physical};
  drive.updateMatrixWorld(true);
  const cableAnchor = new THREE.Vector3(0, .128, -.955).applyMatrix4(housing.matrixWorld);
  return { drive, slot, cableAnchor, housing };
}
