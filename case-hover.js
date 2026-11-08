// Shelf hover owns only shelf-located cases. A case picked up by the scene
// keeps its displayed pose when this controller releases it to the flight.
const DURATION = 350;
const smootherstep = t => t * t * t * (t * (6 * t - 15) + 10);
const samePosition = (a, b) => a.distanceToSquared(b) < 1e-12;
const sameRotation = (a, b) => 1 - Math.abs(a.dot(b)) < 1e-10;

export function createCaseHover(records, shelf, {
  invalidate = () => {},
  reducedMotion = { matches: false },
  onChange = () => {},
} = {}) {
  const motions = new Map();
  let current = null;

  function changeCurrent(record) {
    if (current === record) return;
    current = record;
    onChange(current);
  }

  function move(record, hovered) {
    if (record.location !== 'shelf') { motions.delete(record); return; }
    const target = shelf.poseFor(record, hovered);
    const position = target.position.clone();
    const quaternion = target.quaternion.clone().normalize();
    const group = record.group;
    if (reducedMotion.matches) {
      motions.delete(record);
      group.position.copy(position);
      group.quaternion.copy(quaternion);
      invalidate();
      return;
    }
    const pending = motions.get(record);
    if (pending && samePosition(pending.toPosition, position) && sameRotation(pending.toQuaternion, quaternion)) return;
    if (samePosition(group.position, position) && sameRotation(group.quaternion, quaternion)) {
      motions.delete(record);
      return;
    }
    motions.set(record, {
      began: performance.now(),
      fromPosition: group.position.clone(),
      fromQuaternion: group.quaternion.clone().normalize(),
      toPosition: position,
      toQuaternion: quaternion,
    });
    invalidate();
  }

  return {
    set(record = null) {
      if (record && (record.location !== 'shelf' || !records.includes(record))) return;
      if (current === record) return;
      changeCurrent(record);
      for (const candidate of records) move(candidate, candidate === current);
    },
    step(now) {
      if (current && current.location !== 'shelf') changeCurrent(null);
      for (const [record, motion] of motions) {
        if (record.location !== 'shelf') { motions.delete(record); continue; }
        const t = reducedMotion.matches ? 1 : Math.max(0, Math.min(1, (now - motion.began) / DURATION));
        const eased = smootherstep(t);
        record.group.position.lerpVectors(motion.fromPosition, motion.toPosition, eased);
        record.group.quaternion.slerpQuaternions(motion.fromQuaternion, motion.toQuaternion, eased);
        if (t === 1) {
          record.group.position.copy(motion.toPosition);
          record.group.quaternion.copy(motion.toQuaternion);
          motions.delete(record);
        }
      }
      return motions.size > 0;
    },
    settle(exceptRecord = null) {
      changeCurrent(null);
      for (const record of records) {
        if (record === exceptRecord) motions.delete(record);
        else move(record, false);
      }
    },
    forget(record) {
      motions.delete(record);
      if (current === record) changeCurrent(null);
    },
    finish() {
      if (current && current.location !== 'shelf') changeCurrent(null);
      for (const [record, motion] of motions) {
        if (record.location === 'shelf') {
          record.group.position.copy(motion.toPosition);
          record.group.quaternion.copy(motion.toQuaternion);
        }
      }
      motions.clear();
      invalidate();
    },
    get current() { return current; },
  };
}
