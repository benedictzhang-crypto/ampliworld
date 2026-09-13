import garage from '../../public/assets/3d/ampliworld/GC-MALL-GARAGE-002/garage-manifest.json';

export const MALL_GARAGE = garage;
export const GARAGE_OFFSET_Z = -188;
export function garageLevelAt(y: number) {
  return garage.levels.reduce(
    (best, level) =>
      Math.abs(level.floorY - y) < Math.abs(best.floorY - y) ? level : best,
    garage.levels[0],
  );
}
export function parkedGarageBay(s: {
  x: number;
  z: number;
  y?: number;
  yaw: number;
  speed: number;
}) {
  if ((s.y ?? 0) > -1 || Math.abs(s.speed) > 0.15) return undefined;
  const hx = 1.05 * Math.abs(Math.cos(s.yaw)) + 2.5 * Math.abs(Math.sin(s.yaw));
  const hz = 1.05 * Math.abs(Math.sin(s.yaw)) + 2.5 * Math.abs(Math.cos(s.yaw));
  return garage.bays.find(
    (b) =>
      Math.abs((s.y ?? 0) - b.center[1]) < 0.35 &&
      Math.abs(s.x - b.center[0]) + hx < b.width / 2 &&
      Math.abs(s.z - GARAGE_OFFSET_Z - b.center[2]) + hz < b.length / 2 &&
      !garage.cars.some(
        (c) =>
          Math.abs(c.position[1] - b.center[1]) < 0.35 &&
          Math.hypot(c.position[0] - b.center[0], c.position[2] - b.center[2]) <
            1,
      ),
  );
}
export const GARAGE_COLLIDERS = garage.colliders.map((c) => ({
  id: `GC-MALL-GARAGE-002/${c.id}`,
  min: [c.min[0], c.min[1], c.min[2] + GARAGE_OFFSET_Z],
  max: [c.max[0], c.max[1], c.max[2] + GARAGE_OFFSET_Z],
}));
export function isGarageDriveArea(x: number, z: number) {
  const localZ = z - GARAGE_OFFSET_Z;
  return (
    (x >= -104 && x <= 114 && localZ >= -85 && localZ <= 73) ||
    (x >= 114 && x <= 126 && localZ >= 60 && localZ <= 72) ||
    (x >= 115 && x <= 126 && localZ >= 72 && localZ <= 108)
  );
}
export function garageGroundHeight(x: number, z: number, currentY: number) {
  if (currentY >= -0.5) return undefined;
  const localZ = z - GARAGE_OFFSET_Z;
  if (
    x >= 114 &&
    x <= 126 &&
    localZ >= 61 &&
    localZ <= 72 &&
    Math.abs(currentY + 4.2) < 1
  )
    return -4.2;
  let support: number | undefined,
    distance = Infinity;
  const offer = (y: number) => {
    const d = Math.abs(y - currentY);
    if (d < distance) {
      distance = d;
      support = y;
    }
  };
  for (const s of garage.surfaces)
    if (
      x >= s.min[0] &&
      x <= s.max[0] &&
      localZ >= s.min[1] &&
      localZ <= s.max[1]
    )
      offer(s.y);
  const r = garage.entryRamp;
  if (
    x >= r.min[0] &&
    x <= r.max[0] &&
    localZ >= r.min[1] &&
    localZ <= r.max[1]
  )
    offer(
      r.lowY + ((x - r.min[0]) / (r.max[0] - r.min[0])) * (r.highY - r.lowY),
    );
  const h = garage.helix,
    dx = x - h.center[0],
    dz = localZ - h.center[1],
    rad = Math.hypot(dx, dz),
    tau = Math.PI * 2;
  if (rad >= h.radius - h.halfWidth && rad <= h.radius + h.halfWidth) {
    const angle = (((Math.atan2(dz, dx) - h.startAngle) % tau) + tau) % tau;
    const fraction = Math.max(
      0,
      Math.min(1, (angle - h.landingAngle) / (tau - 2 * h.landingAngle)),
    );
    for (let turn = 0; turn < h.turns; turn++)
      offer(h.topY - h.dropPerTurn * (turn + fraction));
  }
  return support;
}
