import stadium from '../../public/assets/3d/ampliworld/GC-STADIUM-001/stadium-manifest.json';
import sushi from '../../public/assets/3d/ampliworld/GC-SUSHI-001/sushi-manifest.json';
import dealership from '../../public/assets/3d/ampliworld/GC-AUTO-001/dealership-manifest.json';
import streets from '../../public/assets/3d/ampliworld/GC-SPORT-STREET-001/street-manifest.json';

export const CIVIC_PLACES = [
  {
    id: 'GC-STADIUM-001',
    name: '晖环体育场',
    x: 0,
    z: 600,
    file: 'stadium.glb',
    manifest: stadium,
  },
  {
    id: 'GC-SUSHI-001',
    name: '森间寿司',
    x: 180,
    z: -38,
    file: 'sushi.glb',
    manifest: sushi,
  },
  {
    id: 'GC-AUTO-001',
    name: 'Aureline 汽车中心',
    x: -565,
    z: 655,
    file: 'dealership.glb',
    manifest: dealership,
  },
] as const;
export const SPORTS_STREETS = streets;
export const CIVIC_COLLIDERS = [
  ...streets.colliders,
  ...CIVIC_PLACES.flatMap((p) =>
    p.manifest.colliders.map((c) => ({
      id: `${p.id}/${c.id}`,
      min: [c.min[0] + p.x, c.min[1], c.min[2] + p.z],
      max: [c.max[0] + p.x, c.max[1], c.max[2] + p.z],
    })),
  ),
];
export function civicGroundHeight(x: number, z: number): number | undefined {
  for (const p of CIVIC_PLACES)
    for (const s of p.manifest.surfaces)
      if (
        x >= s.min[0] + p.x &&
        x <= s.max[0] + p.x &&
        z >= s.min[1] + p.z &&
        z <= s.max[1] + p.z
      )
        return s.y;
  for (const s of streets.surfaces)
    if (x >= s.min[0] && x <= s.max[0] && z >= s.min[1] && z <= s.max[1])
      return s.y;
}
