import * as THREE from './vendor/three/three.module.js';
import { mm,CASE_MODEL_SCALE } from './physical-scale.js';

// Arrangement study, independent of case artwork and the later art direction.
// The cases are parallel, overlapping in the camera view but separated along
// their face normals. Hover follows an oblique path that keeps this clearance.
export const CD_SHELF_LAYOUT = Object.freeze({
  position: Object.freeze([5.05, 0, -1]),
  yaw: -.25,
  width: 3.65,
  depth: 1.45,
  caseHeight: .741,
  caseTilt: 1.33,
  caseYaw: .38,
  spacingX: .40,
  spacingZ: .08,
  hoverOffset: Object.freeze([-.32, .36, .14]),
});

function slab(parent, size, position, material, name) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/**
 * Create the rack only. Case groups remain independent scene objects, so the
 * same closed case can travel from its stored pose to the table and back.
 * poseFor returns fresh world-space position/quaternion values on every call.
 */
export function createCDShelf(records) {
  const layout = CD_SHELF_LAYOUT;
  const group = new THREE.Group();
  group.name = 'Angled CD shelf';
  group.position.set(...layout.position);
  group.rotation.y = layout.yaw;
  group.scale.setScalar(CASE_MODEL_SCALE);
  group.userData.caseCount = records.length;

  const shelfMaterial = new THREE.MeshStandardMaterial({
    color: '#e3dfd4', roughness: .86, metalness: .015,
  });
  const edgeMaterial = new THREE.MeshStandardMaterial({
    color: '#d3cebf', roughness: .88, metalness: .01,
  });
  const insideMaterial = new THREE.MeshStandardMaterial({
    color: '#cec9b9', roughness: .96, metalness: 0,
  });
  const width = Math.max(layout.width, (records.length - 1) * layout.spacingX + 1.65);
  // Cases step along Z as well as X. Extend both retaining edges when adding
  // entries so the final leaning case cannot intersect the original front lip.
  const depth = layout.depth + Math.max(0, records.length - 6) * layout.spacingZ;
  const halfWidth = width / 2;
  // Anchor the hardware-facing edge: a wider rack grows away from the drive.
  group.position.x += ((width - layout.width) * Math.abs(Math.cos(layout.yaw))
    + (depth - layout.depth) * Math.abs(Math.sin(layout.yaw))) * CASE_MODEL_SCALE / 2;

  slab(group, [width, .11, depth], [0, .055, 0], shelfMaterial, 'Low shelf platform');
  slab(group, [width, .075, .045], [0, .1475, depth / 2 - .0225], edgeMaterial, 'Low front retaining lip');
  slab(group, [width, .35, .045], [0, .285, -depth / 2 + .0225], shelfMaterial, 'Shelf back rail');
  for (const side of [-1, 1]) {
    slab(group, [.045, .12, depth], [side * (halfWidth - .0225), .17, 0], shelfMaterial, 'Low shelf end support');
  }
  // A thin inset liner makes the shallow shelf readable against a plain table.
  slab(group, [width - .10, .008, depth - .10], [0, .114, 0], insideMaterial, 'Shelf inset liner');

  const localQuaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(layout.caseTilt, layout.caseYaw, 0, 'YXZ'),
  );
  const indexByRecord = new Map(records.map((record, index) => [record, index]));
  const tablePose = {
    position: new THREE.Vector3(-.35, mm(5), 2.65),
    quaternion: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -.08),
  };

  function poseFor(record, hovered = false) {
    const index = indexByRecord.get(record);
    if (index === undefined) throw new RangeError('The case is not in this shelf collection.');
    const centredIndex = index - (records.length - 1) / 2;
    const position = new THREE.Vector3(
      centredIndex * layout.spacingX,
      layout.caseHeight,
      centredIndex * layout.spacingZ,
    );
    if (hovered) position.add(new THREE.Vector3(...layout.hoverOffset));
    group.updateWorldMatrix(true, false);
    position.applyMatrix4(group.matrixWorld);
    const quaternion = group.getWorldQuaternion(new THREE.Quaternion()).multiply(localQuaternion);
    return { position, quaternion };
  }

  return {
    group,
    poseFor,
    tablePose,
    get shelfBounds() { return new THREE.Box3().setFromObject(group); },
  };
}
