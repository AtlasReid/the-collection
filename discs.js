import * as THREE from './vendor/three/three.module.js';
import { mm,CASE_MODEL_SCALE,DISC_RADIUS,DISC_HOLE_RADIUS,DISC_THICKNESS } from './physical-scale.js';

// The rigid case uses a millimetre-calibrated uniform scale. Fine moulding
// details remain illustrative; separate disc geometry uses physical units.
const CASE_WIDTH = 1.42;
const CASE_DEPTH = 1.25;
const CASE_HEIGHT = .09;
const DISC_PRINT_MARGIN = mm(.35);
const MAX_CASE_OPENING = 2 * Math.PI / 3;
const HINGE_X = -.64;
const HINGE_Y = .03;
const DISC_SEAT = new THREE.Vector3(.062, .014, 0);
const poses = [
  [-4.10, -1.30, -.22],
  [-3.80,  1.45,  .14],
  [-2.20,  3.05, -.09],
  [ 3.60, -2.30,  .27],
  [ 4.95,  1.40, -.13],
  [ 1.60,  3.15,  .17],
];

function horizontal(mesh, height) {
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = height;
  return mesh;
}

function paperBacking() {
  const geometry = new THREE.BoxGeometry(1.20, .006, 1.20);
  const indices = geometry.getIndex();
  // The artwork is the paper's front face. Keeping an almost coincident cream
  // box face beneath it makes the two surfaces fight for depth as the camera
  // moves. Retain the reverse and edge faces, with no second front surface.
  geometry.setIndex(geometry.groups.filter(group => group.materialIndex !== 2)
    .flatMap(group => Array.from({ length: group.count }, (_, index) => indices.getX(group.start + index))));
  geometry.clearGroups();
  return geometry;
}

function printedRing(inner, outer) {
  const geometry = new THREE.RingGeometry(inner, outer, 80);
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let index = 0; index < position.count; index++) {
    // Fill the circular face with a centred square cover: its corners crop at
    // the circumference, without stretching the image or filling the hole.
    // Image top faces away from +Z after the horizontal rotation.
    uv.setXY(index, position.getX(index) / (2 * outer) + .5,
      position.getY(index) / (2 * outer) + .5);
  }
  return geometry;
}

/**
 * Return each catalogue case plus a separate hidden disc group. Add case.group to the
 * scene for the collection; add case.disc separately for the insertion flight.
 * disc has its origin at the physical disc centre and its normal along +Y.
 * onTexture is an invalidation hook, including the texture-error fallback.
 */
export async function createDiscCollection(albums, onTexture = () => {}) {
  const loader = new THREE.TextureLoader();
  const musicDirectory = new URL('./music/', import.meta.url);
  // The opaque tray sits well below the print. A full transparent box whose
  // upper face touches the artwork can still write an opaque shadow over it.
  const trayMaterial = new THREE.MeshStandardMaterial({
    color: '#66736b', roughness: .58, metalness: .04,
  });
  const paperEdgeMaterial = new THREE.MeshStandardMaterial({ color: '#e8e7de', roughness: .82, metalness: 0 });
  const rim = new THREE.MeshStandardMaterial({
    color: '#cbd6ce', roughness: .25, metalness: .25,
    transparent: true, opacity: .62, depthWrite: false,
  });
  const black = new THREE.MeshStandardMaterial({ color: '#354039', roughness: .54, metalness: .05 });
  const ribMaterial = new THREE.MeshStandardMaterial({ color: '#808e84', roughness: .57, metalness: .1 });
  const lidMaterial = new THREE.MeshStandardMaterial({
    color: '#ffffff', roughness: .14, metalness: .08,
    transparent: true, opacity: .055, depthWrite: false, side: THREE.DoubleSide,
  });
  const cradleMaterial = new THREE.MeshStandardMaterial({ color: '#46534b', roughness: .64, metalness: .04 });
  const silver = new THREE.MeshStandardMaterial({
    color: '#d6dedc', metalness: .79, roughness: .25, side: THREE.DoubleSide,
  });
  const geometries = {
    caseBody: new THREE.BoxGeometry(CASE_WIDTH, .035, CASE_DEPTH),
    cover: new THREE.PlaneGeometry(1.20, 1.20),
    paper: paperBacking(),
    spine: new THREE.BoxGeometry(.105, .035, 1.20),
    rib: new THREE.BoxGeometry(.106, .004, .017),
    longEdge: new THREE.BoxGeometry(CASE_WIDTH, .018, .014),
    shortEdge: new THREE.BoxGeometry(.014, .018, CASE_DEPTH - .028),
    lid: new THREE.PlaneGeometry(1.29, 1.215),
    hinge: new THREE.BoxGeometry(.067, .024, .1),
    hingePin: new THREE.CylinderGeometry(.017, .017, .12, 10),
    cradle: new THREE.RingGeometry(.093, .607, 64),
    cradleRim: new THREE.RingGeometry(.59, .613, 64),
    centreHub: new THREE.CylinderGeometry(.065, .070, .030, 16),
    discSurface: new THREE.RingGeometry(DISC_HOLE_RADIUS, DISC_RADIUS, 80),
    discOuterEdge: new THREE.CylinderGeometry(DISC_RADIUS, DISC_RADIUS, DISC_THICKNESS, 80, 1, true),
    discInnerEdge: new THREE.CylinderGeometry(DISC_HOLE_RADIUS, DISC_HOLE_RADIUS, DISC_THICKNESS, 48, 1, true),
    discLabel: printedRing(DISC_HOLE_RADIUS + DISC_PRINT_MARGIN, DISC_RADIUS - DISC_PRINT_MARGIN),
  };
  const matrix = new THREE.Matrix4();

  return Promise.all(albums.map(async (album, index) => {
    let texture = null;
    try {
      const source = await loader.loadAsync(new URL(album.cover, musicDirectory).href);
      // Rasterize the original vector cover at an explicit size before WebGL
      // upload. The source SVGs intentionally have viewBox-only dimensions;
      // CanvasTexture gives every browser a concrete 600 × 600 backing image.
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 600;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('A 2D canvas is required for the cover texture');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, 600, 600);
      context.drawImage(source.image, 0, 0, 600, 600);
      texture = new THREE.CanvasTexture(canvas);
      source.dispose();
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
    } catch (error) {
      console.warn(`Album cover could not load: ${album.title}`, error);
    }
    onTexture();

    const insertMaterial = new THREE.MeshStandardMaterial({
      map: texture, color: texture ? '#ffffff' : album.palette?.[0] || '#d3dace',
      roughness: .73, metalness: .015,
    });
    const discLabelMaterial = new THREE.MeshStandardMaterial({
      map: texture, color: texture ? '#ffffff' : album.palette?.[0] || '#d3dace',
      roughness: .69, metalness: .08,
    });
    const group = new THREE.Group();
    group.name = `Jewel case: ${album.title}`;
    group.userData.albumId = album.id;
    group.scale.setScalar(CASE_MODEL_SCALE);
    // The shelf supplies the final pose. Extra catalogue entries still need a
    // finite deterministic starting position before that arrangement is applied.
    const [x, z, turn] = poses[index] || [1.6 + (index - poses.length + 1) * 1.65, 3.15, .17];
    group.position.set(x, mm(5), z);
    group.rotation.y = turn;

    const body = new THREE.Mesh(geometries.caseBody, trayMaterial);
    body.name = 'Jewel-case tray body';
    body.position.y = -CASE_HEIGHT / 2 + .035 / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // The disc tray stays put while the clear front cover pivots about its
    // left spine. The stored disc sits below the closed paper/glass assembly.
    const cradle = horizontal(new THREE.Mesh(geometries.cradle, cradleMaterial), -.004);
    cradle.name = 'Disc cradle';
    cradle.position.x = DISC_SEAT.x;
    cradle.receiveShadow = true;
    group.add(cradle);
    const cradleRim = horizontal(new THREE.Mesh(geometries.cradleRim, ribMaterial), -.0025);
    cradleRim.name = 'Disc cradle retaining rim';
    cradleRim.position.x = DISC_SEAT.x;
    cradleRim.receiveShadow = true;
    group.add(cradleRim);
    const centreHub = new THREE.Mesh(geometries.centreHub, black);
    centreHub.name = 'Disc centre hub';
    centreHub.position.set(DISC_SEAT.x, .005, 0);
    centreHub.castShadow = true;
    centreHub.receiveShadow = true;
    group.add(centreHub);

    const lid = new THREE.Group();
    lid.name = `Hinged front cover: ${album.title}`;
    lid.position.set(HINGE_X, HINGE_Y, 0);
    group.add(lid);
    function addToLid(object) {
      object.position.x -= HINGE_X;
      object.position.y -= HINGE_Y;
      lid.add(object);
      return object;
    }
    const paper = new THREE.Mesh(geometries.paper, paperEdgeMaterial);
    paper.name = 'Lid paper insert';
    paper.position.set(.062, .0375, 0);
    // A solid cream reverse is visible when the cover swings open. Its
    // shadow is physical, but the very close print does not receive its own
    // backing's shadow (avoids the black-cover artefact on some drivers).
    paper.castShadow = true;
    paper.receiveShadow = false;
    addToLid(paper);
    const insert = horizontal(new THREE.Mesh(geometries.cover, insertMaterial), .041);
    insert.name = 'Album cover artwork';
    insert.position.x = .062;
    insert.castShadow = false;
    insert.receiveShadow = false;
    addToLid(insert);

    const spine = new THREE.Mesh(geometries.spine, black);
    spine.position.set(-.641, .0255, 0);
    spine.castShadow = true;
    spine.receiveShadow = true;
    group.add(spine);
    const ribs = new THREE.InstancedMesh(geometries.rib, ribMaterial, 23);
    for (let rib = 0; rib < 23; rib++) {
      matrix.makeTranslation(-.641, .044, -.594 + rib * .054);
      ribs.setMatrixAt(rib, matrix);
    }
    ribs.instanceMatrix.needsUpdate = true;
    ribs.receiveShadow = true;
    group.add(ribs);

    for (const side of [-1, 1]) {
      const longEdge = new THREE.Mesh(geometries.longEdge, rim);
      longEdge.position.set(0, .035, side * (CASE_DEPTH / 2 - .007));
      longEdge.castShadow = false;
      addToLid(longEdge);
      const shortEdge = new THREE.Mesh(geometries.shortEdge, rim);
      shortEdge.position.set(side * (CASE_WIDTH / 2 - .007), .035, 0);
      shortEdge.castShadow = false;
      addToLid(shortEdge);
      // Fixed lower tray lips remain visible around the empty cradle.
      const trayEdge = new THREE.Mesh(geometries.longEdge, rim);
      trayEdge.position.set(0, -.006, side * (CASE_DEPTH / 2 - .007));
      group.add(trayEdge);
      const hinge = new THREE.Mesh(geometries.hinge, black);
      hinge.position.set(-.671, .031, side * .519);
      group.add(hinge);
      const pin = new THREE.Mesh(geometries.hingePin, ribMaterial);
      pin.rotation.x = Math.PI / 2;
      pin.position.set(HINGE_X, HINGE_Y, side * .519);
      addToLid(pin);
    }
    const glass = horizontal(new THREE.Mesh(geometries.lid, lidMaterial), .045);
    glass.position.x = .04;
    glass.renderOrder = 2;
    addToLid(glass);

    const pickable = [body, insert, spine];
    for (const mesh of pickable) mesh.userData.albumId = album.id;

    // This separate object is the actual animated disc, never a 2D overlay.
    // Every surface omits the central hole, including the thin cylinder walls.
    const disc = new THREE.Group();
    disc.name = `Compact disc: ${album.title}`;
    disc.userData.albumId = album.id;
    disc.visible = false;
    disc.position.y = .14;
    const top = horizontal(new THREE.Mesh(geometries.discSurface, silver), DISC_THICKNESS/2);
    const bottom = horizontal(new THREE.Mesh(geometries.discSurface, silver), -DISC_THICKNESS/2);
    top.name = 'CD upper surface';bottom.name = 'CD lower surface';
    disc.add(top, bottom);
    const outerEdge = new THREE.Mesh(geometries.discOuterEdge, silver),innerEdge = new THREE.Mesh(geometries.discInnerEdge, silver);
    outerEdge.name = 'CD substrate outer edge';innerEdge.name = 'CD substrate inner edge';
    disc.add(outerEdge, innerEdge);
    // The full-face print leaves only a fine substrate rim around the outside
    // and the real centre hole. The reflective underside remains unprinted.
    const label = horizontal(new THREE.Mesh(geometries.discLabel, discLabelMaterial), DISC_THICKNESS/2+mm(.04));
    label.name = 'CD label artwork';
    disc.add(label);
    disc.traverse(object => {
      if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; }
    });

    return {
      group, album, home: group.position.clone(),
      homeRotation: group.rotation.clone(), pickable, disc, lid,
      setOpen(angle) {
        const finiteAngle = Number.isFinite(angle) ? angle : 0;
        lid.rotation.z = THREE.MathUtils.clamp(finiteAngle, 0, MAX_CASE_OPENING);
        group.userData.openAngle = lid.rotation.z;
      },
      getDiscSeat(target = new THREE.Vector3()) {
        group.updateWorldMatrix(true, false);
        return group.localToWorld(target.copy(DISC_SEAT));
      },
      get openAngle() { return lid.rotation.z; },
    };
  }));
}
