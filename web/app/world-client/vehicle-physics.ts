import { Box3 } from 'three';
import { isGarageDriveArea } from './mall-garage';
// Synchronous scratch storage: wheel X/Z/support, reused across physics steps.
const tyreContacts = new Float64Array(12);
export type CarState = {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  y?: number;
};
export function carBlocked(
  x: number,
  z: number,
  obstacles: readonly Box3[],
  floor: (x: number, z: number, y?: number) => number,
  currentY = 0,
  yaw = 0,
) {
  const y = floor(x, z, currentY),
    c = Math.cos(yaw),
    s = Math.sin(yaw);
  if (
    Math.abs(x) > 9995 ||
    Math.abs(z) > 14995 ||
    !Number.isFinite(y) ||
    (y < -0.1 && !isGarageDriveArea(x, z))
  )
    return true;
  // Probe the real four tyre contacts in vehicle-local axes. The previous
  // world-aligned 5.2m square rejected valid lines near an 11m ramp's sides.
  let contact = 0;
  for (let side = -1; side <= 1; side += 2)
    for (let axle = -1; axle <= 1; axle += 2) {
      const wx = x + c * 0.86 * side + s * 1.5 * axle,
        wz = z - s * 0.86 * side + c * 1.5 * axle;
      const tyreY = floor(wx, wz, y);
      if (Math.abs(tyreY - y) > 0.65) return true;
      tyreContacts[contact++] = wx;
      tyreContacts[contact++] = wz;
      tyreContacts[contact++] = tyreY;
    }
  return obstacles.some((b) => {
    // Low wheel stops contact tyres, not the whole bumper overhang.
    if (b.max.y <= y + 0.4) {
      for (let i = 0; i < 12; i += 3) {
          const wx = tyreContacts[i], wz = tyreContacts[i + 1];
          // A rising road slab can sit above the car centre's floor. Compare
          // against the contacted tyre's road height, not the centre height.
          const tyreY = tyreContacts[i + 2];
          if (b.max.y <= tyreY + 0.18 || b.min.y >= tyreY + 0.35) continue;
          const dx = Math.max(b.min.x - wx, 0, wx - b.max.x),
            dz = Math.max(b.min.z - wz, 0, wz - b.max.z);
          if (dx * dx + dz * dz < 0.32 * 0.32) return true;
        }
      return false;
    }
    if (b.max.y <= y + 0.4 || b.min.y >= y + 1.9) return false;
    const dx = (b.min.x + b.max.x) / 2 - x,
      dz = (b.min.z + b.max.z) / 2 - z;
    const hx = (b.max.x - b.min.x) / 2,
      hz = (b.max.z - b.min.z) / 2;
    // Four separating axes: actual 2.1m-wide, 5m-long car, not a 5.2m square.
    return (
      Math.abs(dx) < hx + 1.05 * Math.abs(c) + 2.5 * Math.abs(s) &&
      Math.abs(dz) < hz + 1.05 * Math.abs(s) + 2.5 * Math.abs(c) &&
      Math.abs(dx * c - dz * s) < 1.05 + hx * Math.abs(c) + hz * Math.abs(s) &&
      Math.abs(dx * s + dz * c) < 2.5 + hx * Math.abs(s) + hz * Math.abs(c)
    );
  });
}
export function stepVehicleMotion(
  s: CarState,
  input: { throttle: number; steer: number; brake: boolean },
  elapsed: number,
  obstacles: readonly Box3[],
  floor: (x: number, z: number, y?: number) => number,
) {
  const dt = Math.min(elapsed, 0.06),
    throttle = Math.max(-1, Math.min(1, input.throttle)),
    steer = Math.max(-1, Math.min(1, input.steer));
  s.speed = Math.max(-12, Math.min(34, s.speed + throttle * 15 * dt));
  if (!throttle) s.speed *= Math.exp(-1.4 * dt);
  if (input.brake) s.speed *= Math.exp(-12 * dt);
  const steps = Math.max(1, Math.ceil(Math.abs(s.speed * dt) / 0.4));
  for (let i = 0; i < steps; i++) {
    const yaw = s.yaw + (((steer * s.speed) / 5.2) * dt) / steps,
      x = s.x - (Math.sin(yaw) * s.speed * dt) / steps,
      z = s.z - (Math.cos(yaw) * s.speed * dt) / steps;
    const y = floor(x, z, s.y);
    if (
      carBlocked(x, z, obstacles, floor, s.y ?? 0, yaw) ||
      Math.abs(y - floor(s.x, s.z, s.y)) > 0.3
    ) {
      s.speed = 0;
      return false;
    }
    s.x = x;
    s.z = z;
    s.yaw = yaw;
    s.y = y;
  }
  return true;
}
