import assert from 'node:assert/strict';
import { createTableCaseHover, TABLE_PREVIEW_ANGLE, TABLE_HOVER_DURATION } from './table-case-hover.js';

function fixture(options = {}) {
  let time = 0, invalidations = 0;
  const changes = [];
  const reducedMotion = { matches: false };
  const controller = createTableCaseHover({
    now: () => time,
    invalidate: () => invalidations++,
    onChange: record => changes.push(record),
    reducedMotion,
    ...options,
  });
  return {
    controller, changes, reducedMotion,
    at(value) { time = value; return controller.step(value); },
    clock(value) { time = value; },
    get invalidations() { return invalidations; },
  };
}
function record() {
  let angle = 0;
  const writes = [];
  return {
    location: 'table',
    group: { userData: { loaded: true }, position: Object.freeze({ x: 1, y: .05, z: 2 }), quaternion: Object.freeze({ x: 0, y: 0, z: 0, w: 1 }) },
    disc: Object.freeze({ visible: false, position: Object.freeze({ x: 0, y: .1, z: 0 }) }),
    writes,
    get openAngle() { return angle; },
    setOpen(value) { angle = value; writes.push(value); },
  };
}
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
let passed = 0;
function test(name, run) { run(); passed++; console.log(`PASS ${name}`); }

test('a loaded table lid interpolates to one third of its full opening and settles idle', () => {
  const f = fixture(), r = record();
  assert.equal(f.controller.step(), false); assert.equal(f.invalidations, 0);
  f.controller.set(r);
  assert.equal(f.controller.current, r); assert.equal(f.invalidations, 1);
  assert.equal(f.at(TABLE_HOVER_DURATION / 2), true);
  near(r.openAngle, TABLE_PREVIEW_ANGLE / 2);
  assert.equal(f.at(TABLE_HOVER_DURATION), false);
  near(r.openAngle * 180 / Math.PI, 40);
  const writes = r.writes.length;
  assert.equal(f.at(500), false); assert.equal(r.writes.length, writes);
});

test('leaving smoothly closes the lid without clearing its loaded state', () => {
  const f = fixture(), r = record();
  f.controller.set(r); f.at(300); f.controller.close();
  assert.equal(f.controller.current, null);
  assert.equal(f.at(450), true); near(r.openAngle, TABLE_PREVIEW_ANGLE / 2);
  assert.equal(f.at(600), false); near(r.openAngle, 0);
  assert.equal(r.group.userData.loaded, true);
  assert.deepEqual(f.changes, [r, null]);
});

test('rapid leave and re-entry retarget from the displayed angle without jumps', () => {
  const f = fixture(), r = record();
  f.controller.set(r); f.at(100);
  const first = r.openAngle; assert.ok(first > 0 && first < TABLE_PREVIEW_ANGLE);
  f.controller.set(null); near(r.openAngle, first); f.at(175);
  assert.ok(r.openAngle < first && r.openAngle > 0);
  const returning = r.openAngle;
  f.controller.set(r); near(r.openAngle, returning); f.at(175); near(r.openAngle, returning);
  f.at(475); near(r.openAngle, TABLE_PREVIEW_ANGLE);
});

test('changing the preview closes the previous lid while opening the new one', () => {
  const f = fixture(), a = record(), b = record();
  f.controller.set(a); f.at(300); f.controller.set(b); f.at(450);
  near(a.openAngle, TABLE_PREVIEW_ANGLE / 2); near(b.openAngle, TABLE_PREVIEW_ANGLE / 2);
  f.at(600); near(a.openAngle, 0); near(b.openAngle, TABLE_PREVIEW_ANGLE);
  assert.equal(f.controller.current, b);
});

test('release preserves the visible lid angle and cannot overwrite the eject animation', () => {
  const f = fixture(), r = record();
  f.controller.set(r); f.at(125); const displayed = r.openAngle;
  f.controller.release(r); near(r.openAngle, displayed); assert.equal(f.controller.current, null);
  r.setOpen(2 * Math.PI / 3); const writes = r.writes.length;
  assert.equal(f.at(1000), false); f.controller.finish();
  near(r.openAngle, 2 * Math.PI / 3); assert.equal(r.writes.length, writes);
});

test('release without a record drops all pending lid ownership without snapping', () => {
  const f = fixture(), a = record(), b = record();
  f.controller.set(a); f.at(150); f.controller.set(b); f.at(225);
  const angles = [a.openAngle, b.openAngle], writes = [a.writes.length, b.writes.length];
  f.controller.release(); f.at(1000); f.controller.finish();
  near(a.openAngle, angles[0]); near(b.openAngle, angles[1]);
  assert.deepEqual([a.writes.length, b.writes.length], writes);
});

test('shelf, travelling and unloaded records never receive preview writes', () => {
  const f = fixture();
  for (const location of ['shelf', 'travelling']) {
    const r = record(); r.location = location; f.controller.set(r); f.at(1000);
    assert.equal(f.controller.current, null); assert.deepEqual(r.writes, []);
  }
  const r = record(); r.group.userData.loaded = false; f.controller.set(r); f.at(1000);
  assert.equal(f.controller.current, null); assert.deepEqual(r.writes, []);
  assert.equal(f.invalidations, 0);
});

test('losing table or loaded eligibility discards motion before scene-owned lids are touched', () => {
  for (const change of [r => { r.location = 'travelling'; }, r => { r.group.userData.loaded = false; }]) {
    const f = fixture(), r = record();
    f.controller.set(r); f.at(100); change(r); r.setOpen(1.2); const writes = r.writes.length;
    assert.equal(f.at(1000), false); f.controller.finish();
    assert.equal(f.controller.current, null); near(r.openAngle, 1.2); assert.equal(r.writes.length, writes);
  }
});

test('reduced motion reaches exact endpoints immediately with no continuing render work', () => {
  const f = fixture(), r = record(); f.reducedMotion.matches = true;
  f.controller.set(r); near(r.openAngle, TABLE_PREVIEW_ANGLE); assert.equal(f.at(0), false);
  f.controller.set(r); assert.equal(f.invalidations, 1);
  f.controller.set(null); near(r.openAngle, 0); assert.equal(f.at(0), false);
  assert.equal(f.invalidations, 2);
});

test('finish commits only pending targets and repeated calls remain idle', () => {
  const f = fixture(), r = record();
  f.controller.set(r); f.at(70); f.controller.finish(); near(r.openAngle, TABLE_PREVIEW_ANGLE);
  const count = f.invalidations, writes = r.writes.length;
  f.controller.finish(); assert.equal(f.invalidations, count); assert.equal(r.writes.length, writes);
  f.controller.set(null); f.controller.finish(); near(r.openAngle, 0); assert.equal(f.at(500), false);
});

test('preview never changes the physical case pose or the separate inserted disc', () => {
  const f = fixture(), r = record();
  const before = JSON.stringify({ position: r.group.position, quaternion: r.group.quaternion, disc: r.disc });
  f.controller.set(r); f.at(100); f.controller.set(null); f.at(180); f.controller.finish();
  assert.equal(JSON.stringify({ position: r.group.position, quaternion: r.group.quaternion, disc: r.disc }), before);
});

console.log(`PASS all ${passed} table-case hover checks`);
