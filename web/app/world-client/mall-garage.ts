import garage from '../../public/assets/3d/ampliworld/GC-MALL-GARAGE-001/garage-manifest.json';

export const MALL_GARAGE = garage;
export const GARAGE_OFFSET_Z = -188;
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
      Math.abs(s.x - b.center[0]) + hx < b.width / 2 &&
      Math.abs(s.z - GARAGE_OFFSET_Z - b.center[2]) + hz < b.length / 2 &&
      !garage.cars.some(
        (c) =>
          Math.hypot(c.position[0] - b.center[0], c.position[2] - b.center[2]) <
          1,
      ),
  );
}
export const GARAGE_COLLIDERS = garage.colliders.map((c) => ({
  id: `GC-MALL-GARAGE-001/${c.id}`,
  min: [c.min[0], c.min[1], c.min[2] + GARAGE_OFFSET_Z],
  max: [c.max[0], c.max[1], c.max[2] + GARAGE_OFFSET_Z],
}));
export function isGarageDriveArea(x: number, z: number) {
  const localZ = z - GARAGE_OFFSET_Z;
  return (
    (x >= -104 && x <= 114 && localZ >= -85 && localZ <= 70) ||
    (x >= 114 && x <= 126 && localZ >= 60 && localZ <= 72) ||
    (x >= 115 && x <= 126 && localZ >= 72 && localZ <= 108)
  );
}
export function garageGroundHeight(x: number, z: number, currentY: number) {
  if (currentY >= -0.5) return undefined;
  const localZ = z - GARAGE_OFFSET_Z;
  if (x >= -104 && x <= 115 && localZ >= -85 && localZ <= 70) return -4.2;
  return undefined;
}
