// One physical scale for the 304.1 mm-wide M4 Air and desk objects.
// Published envelope/media dimensions; the small details remain visual studies.
export const UNITS_PER_MM = 4.05 / 304.1;
export const mm = value => value * UNITS_PER_MM;
export const PHYSICAL_DIMENSIONS = Object.freeze({
  macbookAir: Object.freeze({width:304.1,depth:215,closedHeight:11.3}),
  superDrive: Object.freeze({width:139,depth:139,height:17}),
  cd: Object.freeze({diameter:120,holeDiameter:15,substrateThickness:1.2}),
});
export const DISC_RADIUS = mm(PHYSICAL_DIMENSIONS.cd.diameter/2);
export const DISC_HOLE_RADIUS = mm(PHYSICAL_DIMENSIONS.cd.holeDiameter/2);
export const DISC_THICKNESS = mm(PHYSICAL_DIMENSIONS.cd.substrateThickness);
// Preserve the rigid mock case's design, using the same millimetre basis.
// 142 × 125 mm is a representative single jewel-case footprint; small moulding
// details/roughly 9.2 mm closed thickness are illustrative, not standardised.
export const CASE_MODEL_SCALE = mm(100);
export const CASE_WIDTH = mm(142);
export const CASE_DEPTH = mm(125);
export const CASE_PICK_HEIGHT = mm(10);
export const DISC_APPROACH_DISTANCE = DISC_RADIUS + mm(14);
export const DISC_INSERT_DISTANCE = DISC_RADIUS + mm(5);
