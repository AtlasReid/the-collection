import * as THREE from './vendor/three/three.module.js';
import { mm } from './physical-scale.js';

// Slide out along the upright case's own face, preserving the separation
// between the leaning cases. A vertical world-space lift crosses neighbours.
export function raisedShelfPose(pose) {
  const up=new THREE.Vector3(0,0,-1).applyQuaternion(pose.quaternion);
  return {position:pose.position.clone().addScaledVector(up,mm(160)),quaternion:pose.quaternion.clone()};
}
