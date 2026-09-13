import { HOUSING_MODELS, type HousingInstance } from './housing-registry';
// Shared by distant silhouettes, loading fallbacks and failed-asset fallbacks.
export function housingProxy(i: HousingInstance) {
  const b = HOUSING_MODELS[i.model].bounds;
  const cx = (b.min[0] + b.max[0]) / 2,
    cz = (b.min[2] + b.max[2]) / 2;
  return {
    ...i,
    x: i.x + cx * Math.cos(i.yaw) + cz * Math.sin(i.yaw),
    z: i.z - cx * Math.sin(i.yaw) + cz * Math.cos(i.yaw),
    y: i.y + (b.min[1] + b.max[1]) / 2,
    w: b.max[0] - b.min[0],
    d: b.max[2] - b.min[2],
    h: b.max[1] - b.min[1],
  };
}
