import plan from './metropolitan-plan.json';
import east from '../../public/assets/3d/ampliworld/GC-SUBCENTER-001/center-manifest.json';
import south from '../../public/assets/3d/ampliworld/GC-SUBCENTER-002/center-manifest.json';
import estuary from '../../public/assets/3d/ampliworld/GC-ESTUARY-001/estuary-manifest.json';
import { riverCenterX, riverHalfWidth } from './river-profile.mjs';
export const METROPOLITAN_PLAN = plan;
export const METROPOLITAN_PLACES = [
  {
    id: 'GC-SUBCENTER-001',
    x: 5000,
    z: 3000,
    file: 'center.glb',
    manifest: east,
  },
  {
    id: 'GC-SUBCENTER-002',
    x: -1000,
    z: 8000,
    file: 'center.glb',
    manifest: south,
  },
  {
    id: 'GC-ESTUARY-001',
    x: 0,
    z: 0,
    file: 'estuary-gardens.glb',
    manifest: estuary,
  },
];
export const METROPOLITAN_COLLIDERS = METROPOLITAN_PLACES.flatMap((p) =>
  p.manifest.colliders.map((c) => ({
    id: `${p.id}/${c.id}`,
    min: [c.min[0] + p.x, c.min[1], c.min[2] + p.z],
    max: [c.max[0] + p.x, c.max[1], c.max[2] + p.z],
  })),
);
export const CENTER_ROADS = plan.centers
  .filter((c) => c.role === 'secondary')
  .flatMap((p) => [
    {
      id: `${p.id}-east`,
      min: [p.x + 240, p.z - 13],
      max: [p.x + 500, p.z + 13],
      y: 0.065,
    },
    {
      id: `${p.id}-west`,
      min: [p.x - 500, p.z - 13],
      max: [p.x - 240, p.z + 13],
      y: 0.065,
    },
    {
      id: `${p.id}-north`,
      min: [p.x - 13, p.z - 500],
      max: [p.x + 13, p.z - 240],
      y: 0.065,
    },
    {
      id: `${p.id}-south`,
      min: [p.x - 13, p.z + 240],
      max: [p.x + 13, p.z + 500],
      y: 0.065,
    },
  ]);
export const METROPOLITAN_SURFACES = [
  ...CENTER_ROADS,
  ...METROPOLITAN_PLACES.flatMap((p) =>
    p.manifest.surfaces.map((s) => ({
      id: `${p.id}/${s.id}`,
      min: [s.min[0] + p.x, s.min[1] + p.z],
      max: [s.max[0] + p.x, s.max[1] + p.z],
      y: s.y,
    })),
  ),
];
export function metropolitanGroundHeight(
  x: number,
  z: number,
  currentY: number,
) {
  let y: number | undefined;
  for (const s of METROPOLITAN_SURFACES)
    if (
      x >= s.min[0] &&
      x <= s.max[0] &&
      z >= s.min[1] &&
      z <= s.max[1] &&
      s.y <= currentY + 0.29
    )
      y = Math.max(y ?? -Infinity, s.y);
  return y;
}
export function landValueZone(x: number, z: number) {
  const dry = Math.abs(x - riverCenterX(z)) - riverHalfWidth(z);
  if (z >= 13200 || dry < 0) return '水域';
  const center = plan.centers.find(
    (c) => Math.hypot(x - c.x, z - c.z) <= c.radius,
  );
  if (center) return `${center.name} · ${center.landTier}`;
  if (z >= 12000 && dry <= 700) return '河口景观带 · 高价值滨水地段';
  if (dry <= 350) return '都市滨河 · 高价值景观地段';
  return '普通城市地段';
}
