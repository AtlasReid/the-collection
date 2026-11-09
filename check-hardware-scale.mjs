import assert from 'node:assert/strict';
import * as THREE from './vendor/three/three.module.js';
import { sceneAlbums as albums } from './music/scene-catalogue.js';
import { collectionAlbums } from './music/catalogue.js';
import { mm, DISC_APPROACH_DISTANCE, DISC_INSERT_DISTANCE } from './physical-scale.js';

// Build the actual runtime meshes without a browser, GPU or cover downloads.
// Artwork/rendering remains a browser check; these stubs only unblock geometry.
const previousDocument = globalThis.document;
const previousLoad = THREE.TextureLoader.prototype.loadAsync;
const requestedCovers = [];
const gradient = { addColorStop() {} };
const context = new Proxy({}, { get: (_object, key) => {
  if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
  if (key === 'measureText') return text => ({ width: String(text).length * 10 });
  return () => {};
} });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
THREE.TextureLoader.prototype.loadAsync = async url => {
  requestedCovers.push(url);
  return new THREE.Texture({ width: 600, height: 600 });
};
let hardware, records, shelf;
try {
  const [{ createHardware }, { createDiscCollection }, { createCDShelf }] = await Promise.all([
    import('./hardware.js'), import('./discs.js'), import('./cd-shelf.js'),
  ]);
  hardware = createHardware();
  records = await createDiscCollection(albums);
  shelf = createCDShelf(records);
} finally {
  THREE.TextureLoader.prototype.loadAsync = previousLoad;
  if (previousDocument === undefined) delete globalThis.document;
  else globalThis.document = previousDocument;
}
hardware.group.updateMatrixWorld(true);
// Geometry collisions must also catch an exit from inside a thin solid. GPU
// back-face culling should not make that physical wall disappear from a ray.
for (const root of [hardware.group, ...records.flatMap(record => [record.group, record.disc])]) {
  root.traverse(object => {
    if (!object.isMesh) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.side = THREE.DoubleSide;
  });
}

const EPS = 2e-6; // Float32 vertex error, far smaller than a visible millimetre.
function near(actual, expected, tolerance = EPS, label = 'dimension') {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected}`);
}
function named(parent, name) {
  const object = parent.getObjectByName(name);
  assert.ok(object?.isMesh, `Missing physical mesh: ${name}`);
  return object;
}
function meshBounds(mesh, relativeTo = null) {
  mesh.updateWorldMatrix(true, false);
  mesh.geometry.computeBoundingBox();
  const transform = mesh.matrixWorld.clone();
  if (relativeTo) {
    relativeTo.updateWorldMatrix(true, false);
    transform.premultiply(relativeTo.matrixWorld.clone().invert());
  }
  return mesh.geometry.boundingBox.clone().applyMatrix4(transform);
}
function groupLocalBounds(group) {
  group.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3();
  group.traverse(object => { if (object.isMesh) bounds.union(meshBounds(object, group)); });
  return bounds;
}
function place(record, pose) {
  record.group.position.copy(pose.position);
  record.group.quaternion.copy(pose.quaternion);
  record.group.updateMatrixWorld(true);
}
function obb(bounds, matrix = new THREE.Matrix4()) {
  const columns = [0, 1, 2].map(index => new THREE.Vector3().setFromMatrixColumn(matrix, index));
  return {
    centre: bounds.getCenter(new THREE.Vector3()).applyMatrix4(matrix),
    axes: columns.map(axis => axis.clone().normalize()),
    half: bounds.getSize(new THREE.Vector3()).toArray().map((size, index) => size * columns[index].length() / 2),
  };
}
function meshOBB(mesh) {
  mesh.updateWorldMatrix(true, false);
  mesh.geometry.computeBoundingBox();
  return obb(mesh.geometry.boundingBox, mesh.matrixWorld);
}
// Use separating axes instead of rejecting the leaning cases' overlapping AABBs.
function intersects(a, b) {
  const delta = b.centre.clone().sub(a.centre);
  const axes = [...a.axes, ...b.axes, ...a.axes.flatMap(x => b.axes.map(y => new THREE.Vector3().crossVectors(x, y)))];
  for (const axis of axes) {
    if (axis.lengthSq() < 1e-12) continue;
    axis.normalize();
    const radius = box => box.half.reduce((sum, half, index) => sum + half * Math.abs(axis.dot(box.axes[index])), 0);
    if (Math.abs(delta.dot(axis)) >= radius(a) + radius(b) - EPS) return false;
  }
  return true;
}
function discBounds(record, position = new THREE.Vector3(), quaternion = new THREE.Quaternion()) {
  record.disc.position.copy(position);
  record.disc.quaternion.copy(quaternion);
  record.disc.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(record.disc);
}
const tests = [];
function test(name, run) { tests.push({ name, run }); }
const driveBounds = new THREE.Box3().setFromObject(hardware.drive);
const body = named(hardware.laptop, 'Midnight aluminium body');
// Published footprint dimensions belong to the laptop's frame, independent of
// the arrangement yaw that enlarges its world-aligned bounding box.
const bodySize = meshBounds(body, hardware.laptop).getSize(new THREE.Vector3());
const driveSize = driveBounds.getSize(new THREE.Vector3());

test('all nine requested albums have separate physical cases and matching CD artwork', () => {
  assert.deepEqual(albums, collectionAlbums, 'the shelf uses the same real catalogue as Music');
  assert.equal(albums.length, 9, 'all nine requested albums belong on the shelf');
  assert.ok(albums.every(album => [album.soundcloudPlaylist,album.bandcampURL,album.appleMusicURL].filter(Boolean).length===1), 'every physical catalogue needs a real provider source rather than a silent demo');
  assert.deepEqual(records.map(record => record.album.id), albums.map(album => album.id));
  assert.equal(new Set(records.map(record => record.album.id)).size, records.length);
  const musicDirectory = new URL('./music/', import.meta.url);
  assert.deepEqual(requestedCovers, albums.map(album => new URL(album.cover, musicDirectory).href));
  for (const record of records) {
    assert.ok(record.group.position.toArray().every(Number.isFinite), 'extra entries need valid pre-shelf positions');
    const cover = named(record.lid, 'Album cover artwork');
    const label = named(record.disc, 'CD label artwork');
    assert.ok(cover.material.map?.isTexture, `${record.album.id} has no cover texture`);
    assert.equal(label.material.map, cover.material.map, 'the label reuses its own album cover without another texture');
  }
  assert.equal(new Set(records.map(record => record.lid.getObjectByName('Album cover artwork').material.map)).size, records.length, 'each album keeps its own artwork');
});

test('printed case fronts have no competing paper surface while retaining the reverse through lid motion', () => {
  const ray = new THREE.Raycaster();
  for (const record of records) {
    place(record, shelf.tablePose);
    const cover = named(record.lid, 'Album cover artwork');
    const paper = named(record.lid, 'Lid paper insert');
    for (const angle of [0, Math.PI / 3, 2 * Math.PI / 3]) {
      record.setOpen(angle); record.group.updateMatrixWorld(true);
      const normal = new THREE.Vector3(0, 0, 1).transformDirection(cover.matrixWorld);
      for (const x of [-.45, 0, .45]) for (const y of [-.45, 0, .45]) {
        const point = cover.localToWorld(new THREE.Vector3(x, y, 0));
        ray.set(point.clone().addScaledVector(normal, mm(20)), normal.clone().negate());
        const printHit = ray.intersectObject(cover)[0], reverseHit = ray.intersectObject(paper)[0];
        assert.ok(printHit && reverseHit, 'the print and solid paper reverse must both remain present');
        assert.ok(reverseHit.distance - printHit.distance > mm(.3), 'a nearly coincident paper face can flicker through the cover');
      }
    }
    record.setOpen(0); place(record, shelf.poseFor(record));
  }
});

test('generated Air body and complete drive housing use the published footprints', () => {
  near(bodySize.x, mm(304.1), EPS, 'Air width');
  near(bodySize.z, mm(215), EPS, 'Air depth');
  near(driveSize.x, mm(139), EPS, 'SuperDrive width');
  near(driveSize.z, mm(139), EPS, 'SuperDrive depth');
  near(driveSize.y, mm(17), EPS, 'SuperDrive total height');
  near(driveSize.x / bodySize.x, 139 / 304.1, EPS, 'drive/Air width ratio');
  near(driveSize.z / bodySize.z, 139 / 215, EPS, 'drive/Air depth ratio');
  near(driveBounds.min.y, 0, EPS, 'grounded drive');
});

test('the turned Air keeps its USB-C marker and rigid adapter parts aligned with the actual port', () => {
  const port = named(hardware.laptop, 'Front USB-C recess');
  const portCentre = port.getWorldPosition(new THREE.Vector3());
  const outward = new THREE.Vector3(0, 0, 1).transformDirection(port.matrixWorld);
  const marker = hardware.group.localToWorld(new THREE.Vector3().fromArray(hardware.cable.userData.usbPoint));
  near(marker.distanceTo(portCentre), 0, EPS, 'USB-C marker at actual port');
  const tip = named(hardware.cable, 'USB-C connector at MacBook Air');
  const offset = tip.getWorldPosition(new THREE.Vector3()).sub(portCentre);
  assert.ok(offset.dot(outward) > 0, 'the connector must extend out of the port');
  near(offset.clone().cross(outward).length(), 0, EPS, 'connector centre follows the port normal');
  for (const name of ['White USB-A plug body', 'SuperDrive USB-A plug shell at adapter', 'USB-C to USB-A adapter body', 'USB-A adapter socket', 'USB-C connector at MacBook Air', 'White USB-C connector']) {
    const connector = named(hardware.cable, name);
    const axis = new THREE.Vector3(-1, 0, 0).transformDirection(connector.matrixWorld);
    near(axis.distanceTo(outward), 0, EPS, `${name} follows the port orientation`);
  }
  const socket = named(hardware.cable, 'USB-A adapter socket');
  const socketMarker = hardware.group.localToWorld(new THREE.Vector3().fromArray(hardware.cable.userData.adapterSocket));
  near(socket.getWorldPosition(new THREE.Vector3()).distanceTo(socketMarker), 0, EPS, 'USB-A socket marker');
});

test('every actual CD edge has a 120 mm diameter, 15 mm hole and 1.2 mm substrate', () => {
  assert.equal(records.length, albums.length, 'no catalogue disc may be truncated');
  assert.equal(records.length, 9, 'check every requested real album after removing the six demos');
  for (const record of records) {
    discBounds(record);
    const outer = named(record.disc, 'CD substrate outer edge');
    const inner = named(record.disc, 'CD substrate inner edge');
    const outerSize = meshBounds(outer).getSize(new THREE.Vector3());
    const innerSize = meshBounds(inner).getSize(new THREE.Vector3());
    near(outerSize.x, mm(120), EPS, `${record.album.id} diameter X`);
    near(outerSize.z, mm(120), EPS, `${record.album.id} diameter Z`);
    near(innerSize.x, mm(15), EPS, `${record.album.id} hole X`);
    near(innerSize.z, mm(15), EPS, `${record.album.id} hole Z`);
    near(outerSize.y, mm(1.2), EPS, `${record.album.id} substrate thickness`);
    near(innerSize.y, mm(1.2), EPS, `${record.album.id} hole edge thickness`);
    near(outerSize.x / driveSize.x, 120 / 139, EPS, 'CD/drive diameter ratio');
    const full = discBounds(record).getSize(new THREE.Vector3());
    near(full.x, mm(120)); near(full.z, mm(120));
    assert.ok(full.y >= mm(1.2) - EPS && full.y <= mm(1.5), 'printed layers must remain thin');
  }
});

test('CD centre holes stay physically open through all artwork layers', () => {
  const ray = new THREE.Raycaster();
  for (const record of records) {
    discBounds(record);
    for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 8) {
      for (const radius of [0, mm(7.25)]) {
        ray.set(new THREE.Vector3(Math.cos(angle) * radius, mm(20), Math.sin(angle) * radius), new THREE.Vector3(0, -1, 0));
        assert.equal(ray.intersectObject(record.disc, true).length, 0, `${record.album.id} has a blocked centre hole`);
      }
    }
    ray.set(new THREE.Vector3(mm(30), mm(20), 0), new THREE.Vector3(0, -1, 0));
    assert.ok(ray.intersectObject(record.disc, true).length > 0, 'positive control: the recorded surface must be solid');
  }
});

test('album cover print fills each CD face with a centred circular crop and only fine substrate rims', () => {
  const ray = new THREE.Raycaster();
  for (const record of records) {
    discBounds(record);
    const label = named(record.disc, 'CD label artwork');
    const cover = named(record.lid, 'Album cover artwork');
    assert.equal(label.material.map, cover.material.map, 'full-face print must reuse the existing cover texture');
    const position = label.geometry.getAttribute('position');
    const uv = label.geometry.getAttribute('uv');
    const radii = Array.from({ length: position.count }, (_, index) => Math.hypot(position.getX(index), position.getY(index)));
    const innerRadius = Math.min(...radii), outerRadius = Math.max(...radii);
    assert.ok(innerRadius >= mm(7.5) - EPS && innerRadius <= mm(8), 'print leaves at most a 0.5 mm inner substrate margin');
    assert.ok(outerRadius >= mm(59.5) && outerRadius < mm(60), 'cover reaches the edge with at most a 0.5 mm outer rim');

    // A square image fills the circular bounds: cardinal points reach the
    // image edges, while equal radial steps keep the same image scale.
    for (let index = 0; index < position.count; index++) {
      const x = position.getX(index), y = position.getY(index);
      near((uv.getX(index) - .5) * 2 * outerRadius, x, EPS, 'cover U uses a centred, unscaled square crop');
      near((uv.getY(index) - .5) * 2 * outerRadius, y, EPS, 'cover V has the same scale as U');
      assert.ok(uv.getX(index) >= -EPS && uv.getX(index) <= 1 + EPS && uv.getY(index) >= -EPS && uv.getY(index) <= 1 + EPS, 'cover UV stays within the source image');
    }
    for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 8) {
      for (const radius of [mm(8.1), mm(40), mm(59.3)]) {
        ray.set(new THREE.Vector3(Math.cos(angle) * radius, mm(20), Math.sin(angle) * radius), new THREE.Vector3(0, -1, 0));
        assert.equal(ray.intersectObject(record.disc, true)[0]?.object, label, 'the cover, rather than a reflective overlay, is the visible face');
      }
    }
  }
});

test('the complete CD starts outside the drive and finishes fully inside its housing', () => {
  const slot = hardware.slot.getWorldPosition(new THREE.Vector3());
  const approach = slot.clone().add(new THREE.Vector3(0, 0, DISC_APPROACH_DISTANCE));
  const inside = slot.clone().add(new THREE.Vector3(0, 0, -DISC_INSERT_DISTANCE));
  for (const record of records) {
    const front = discBounds(record, approach);
    assert.ok(front.min.z > driveBounds.max.z + mm(10), 'approach must not already intersect the drive');
    const inserted = discBounds(record, inside);
    for (const axis of ['x', 'y', 'z']) {
      assert.ok(inserted.min[axis] > driveBounds.min[axis], `inserted CD escapes ${axis} minimum`);
      assert.ok(inserted.max[axis] < driveBounds.max[axis], `inserted CD escapes ${axis} maximum`);
    }
  }
});

test('the enlarged CD has an unobstructed full-width and full-thickness insertion corridor', () => {
  const record = records[0], centred = discBounds(record);
  const radius = centred.getSize(new THREE.Vector3()).x / 2;
  const slot = hardware.slot.getWorldPosition(new THREE.Vector3());
  const ray = new THREE.Raycaster();
  // Longitudinal rays cover the swept disc cross-section, including its extreme
  // rim and top/bottom print surfaces, rather than testing only its centre ray.
  for (let sample = 0; sample <= 48; sample++) {
    const x = radius * (sample / 24 - 1);
    const halfChord = Math.sqrt(Math.max(0, radius * radius - x * x));
    const startZ = slot.z + DISC_APPROACH_DISTANCE + halfChord;
    const endZ = slot.z - DISC_INSERT_DISTANCE - halfChord;
    for (const y of [centred.min.y, 0, centred.max.y]) {
      ray.set(new THREE.Vector3(slot.x + x, slot.y + y, startZ), new THREE.Vector3(0, 0, -1));
      ray.far = startZ - endZ;
      const hits = ray.intersectObject(hardware.drive, true);
      assert.equal(hits.length, 0, `CD corridor blocked by ${hits[0]?.object.name} at x=${x}, y=${y}`);
    }
  }
});

test('the representative case footprint, table pose and seated disc are physically compatible', () => {
  for (const record of records) {
    record.setOpen(0);
    place(record, { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() });
    const tray = meshBounds(named(record.group, 'Jewel-case tray body'));
    const traySize = tray.getSize(new THREE.Vector3());
    near(traySize.x, mm(142), EPS, 'jewel-case width');
    near(traySize.z, mm(125), EPS, 'jewel-case depth');
    const seated = discBounds(record, record.getDiscSeat());
    for (const axis of ['x', 'z']) {
      assert.ok(seated.min[axis] > tray.min[axis], `seated disc escapes tray ${axis} minimum`);
      assert.ok(seated.max[axis] < tray.max[axis], `seated disc escapes tray ${axis} maximum`);
    }
    assert.ok(seated.min.y > tray.max.y, 'substrate must clear the solid tray floor');
    const paper = meshBounds(named(record.lid, 'Lid paper insert'));
    assert.ok(seated.max.y < paper.min.y, 'closed paper/lid must clear the seated disc');
    const cradle = named(record.group, 'Disc cradle');
    const cradleWidth = meshBounds(cradle).getSize(new THREE.Vector3()).x;
    assert.ok(cradleWidth >= mm(120), 'cradle must accommodate the full disc diameter');
    const hub = named(record.group, 'Disc centre hub');
    assert.ok(meshBounds(hub).getSize(new THREE.Vector3()).x < mm(15), 'retaining hub must fit through the real centre hole');
    place(record, shelf.tablePose);
    const tableBounds = new THREE.Box3().setFromObject(record.group);
    assert.ok(tableBounds.min.y >= -EPS && tableBounds.min.y <= mm(1), 'closed case must rest on the table');
  }
});

test('a correctly seated CD clears the moving paper cover throughout case opening', () => {
  for (const record of records) {
    place(record, { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() });
    const bounds = discBounds(record, record.getDiscSeat());
    const radius = bounds.getSize(new THREE.Vector3()).x / 2;
    const centre = bounds.getCenter(new THREE.Vector3());
    const ray = new THREE.Raycaster();
    for (let step = 0; step <= 20; step++) {
      record.setOpen(step / 20 * 2 * Math.PI / 3);
      record.group.updateMatrixWorld(true);
      const paper = named(record.lid, 'Lid paper insert');
      // A small vertical segment through each sampled disc point catches a
      // lid entering its thickness while allowing the cover to pass overhead.
      for (let sample = 0; sample < 48; sample++) {
        const angle = sample * 2 * Math.PI / 48;
        for (const fraction of [.3, .65, .99]) {
          const point = new THREE.Vector3(centre.x + Math.cos(angle) * radius * fraction, bounds.max.y, centre.z + Math.sin(angle) * radius * fraction);
          ray.set(point, new THREE.Vector3(0, -1, 0));
          ray.far = bounds.max.y - bounds.min.y;
          assert.equal(ray.intersectObject(paper, false).length, 0, `${record.album.id} cover crosses the seated disc at opening step ${step}`);
        }
      }
    }
    record.setOpen(0);
  }
});

test('scaled rack, stored cases and hover envelopes clear the Air and drive', () => {
  shelf.group.updateMatrixWorld(true);
  const rackBounds = new THREE.Box3().setFromObject(shelf.group);
  near(rackBounds.min.y, 0, EPS, 'grounded shelf');
  const obstacles = [obb(driveBounds), meshOBB(body)];
  const supports = shelf.group.children.filter(object => object.isMesh);
  for (const support of supports) for (const obstacle of obstacles) {
    assert.ok(!intersects(meshOBB(support), obstacle), `${support.name} intersects hardware`);
  }
  const caseBounds = records.map(record => groupLocalBounds(record.group));
  for (const record of records) place(record, shelf.poseFor(record));
  for (let i = 0; i < records.length; i++) {
    for (const hovered of [false, true]) {
      place(records[i], shelf.poseFor(records[i], hovered));
      const box = obb(caseBounds[i], records[i].group.matrixWorld);
      for (const obstacle of obstacles) assert.ok(!intersects(box, obstacle), `case ${i} intersects hardware`);
      for (const support of supports) assert.ok(!intersects(box, meshOBB(support)), `case ${i} intersects ${support.name}`);
      for (let j = 0; j < records.length; j++) if (i !== j) {
        assert.ok(!intersects(box, obb(caseBounds[j], records[j].group.matrixWorld)), `case ${i} intersects case ${j}`);
      }
    }
    place(records[i], shelf.poseFor(records[i]));
  }
});

let failures = 0;
for (const { name, run } of tests) {
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}
if (failures) process.exitCode = 1;
else console.log(`PASS all ${tests.length} hardware scale checks`);
