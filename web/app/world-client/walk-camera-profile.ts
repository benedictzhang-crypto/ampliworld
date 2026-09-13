import { Vector3 } from 'three';
/** Keep orbital yaw, but don't inherit a long, steep outdoor boom underground. */
export function walkerCameraOffset(
  out: Vector3,
  eye: Vector3,
  target: Vector3,
  feet: number,
  radius: number,
) {
  out.subVectors(eye, target);
  if (feet < -0.8) {
    out.y = 0;
    if (out.lengthSq() < 0.0001) out.set(0, 0, 1);
    out.normalize().multiplyScalar(Math.min(5.5, radius));
    out.y = 1.2;
  } else out.normalize().multiplyScalar(radius);
  return out;
}
