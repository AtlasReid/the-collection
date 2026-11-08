// A resting, loaded case owns only its lid during preview. The scene takes
// ownership before ejecting; release() deliberately keeps the displayed angle.
export const TABLE_PREVIEW_ANGLE = 2 * Math.PI / 9; // One third of the 120° opening.
export const TABLE_HOVER_DURATION = 300;
const smootherstep = t => t * t * t * (t * (6 * t - 15) + 10);
const near = (a, b) => Math.abs(a - b) < 1e-10;
const eligible = record => record?.location === 'table'
  && record.group?.userData?.loaded === true
  && typeof record.setOpen === 'function'
  && Number.isFinite(record.openAngle);

export function createTableCaseHover({
  invalidate = () => {},
  reducedMotion = { matches: false },
  onChange = () => {},
  now = () => performance.now(),
} = {}) {
  const motions = new Map();
  let current = null;

  function changeCurrent(record) {
    if (current === record) return;
    current = record;
    onChange(current);
  }

  function move(record, angle) {
    if (!eligible(record)) { motions.delete(record); return; }
    if (reducedMotion.matches) {
      motions.delete(record);
      if (!near(record.openAngle, angle)) {
        record.setOpen(angle);
        invalidate();
      }
      return;
    }
    if (motions.get(record)?.to === angle) return;
    if (near(record.openAngle, angle)) { motions.delete(record); return; }
    motions.set(record, { began: now(), from: record.openAngle, to: angle });
    invalidate();
  }

  function discardIneligible() {
    if (current && !eligible(current)) changeCurrent(null);
    for (const record of motions.keys()) if (!eligible(record)) motions.delete(record);
  }

  function set(record = null) {
    if (record && !eligible(record)) return;
    if (current === record) return;
    const previous = current;
    changeCurrent(record);
    if (previous) move(previous, 0);
    if (current) move(current, TABLE_PREVIEW_ANGLE);
  }

  return {
    set,
    close() { set(null); },
    step(time = now()) {
      discardIneligible();
      for (const [record, motion] of motions) {
        const t = reducedMotion.matches ? 1 : Math.max(0, Math.min(1, (time - motion.began) / TABLE_HOVER_DURATION));
        record.setOpen(t === 1 ? motion.to : motion.from + (motion.to - motion.from) * smootherstep(t));
        if (t === 1) motions.delete(record);
      }
      return motions.size > 0;
    },
    finish() {
      discardIneligible();
      let changed = false;
      for (const [record, motion] of motions) {
        if (!near(record.openAngle, motion.to)) {
          record.setOpen(motion.to);
          changed = true;
        }
      }
      motions.clear();
      if (changed) invalidate();
    },
    release(record) {
      if (record === undefined) {
        motions.clear();
        changeCurrent(null);
      } else {
        motions.delete(record);
        if (current === record) changeCurrent(null);
      }
    },
    get current() { return current; },
  };
}
