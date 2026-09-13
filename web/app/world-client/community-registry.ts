import midrise from '../../public/assets/3d/ampliworld/GC-MID-001/midrise-manifest.json';
import villas from '../../public/assets/3d/ampliworld/GC-VILLA-001/villa-manifest.json';
import { riverX } from './city-surface';

export type HomePlacement = {
  id: string;
  kind: 'middle' | 'villa';
  prototype: number;
  x: number;
  z: number;
  yaw: number;
  y: number;
};
export type CommunitySurface = {
  id: string;
  min: number[];
  max: number[];
  y: number;
  kind: 'road' | 'walk' | 'garden';
};
export const HOMES: HomePlacement[] = [
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `GC-MID-H${String(i + 1).padStart(2, '0')}`,
    kind: 'middle' as const,
    prototype: i % 3,
    x: -950 + (i % 3) * 100,
    z: 570 + Math.floor(i / 3) * 80,
    yaw: 0,
    y: 0.04,
  })),
  ...Array.from({ length: 60 }, (_, i) => {
    const row = Math.floor(i / 20),
      n = i % 20;
    const z = 660 + n * 36;
    return {
      id: `GC-RIVER-V${String(i + 1).padStart(2, '0')}`,
      kind: 'villa' as const,
      prototype: i % 4,
      x: riverX(z) - (260 + row * 86),
      z,
      yaw: -Math.PI / 2,
      y: 0.04,
    };
  }),
];
export const COMMUNITIES = [
  {
    id: 'GC-COMMUNITY-MID',
    name: '青庭花园 · 15 栋中端住宅',
    kind: 'middle',
    x: -850,
    z: 750,
    tier: '外围中端住宅；低于商场 CBD 核心地价',
    count: 15,
  },
  {
    id: 'GC-COMMUNITY-RIVER',
    name: '澜岸御邸 · 60 栋独栋别墅',
    kind: 'villa',
    x: riverX(1000) - 346,
    z: 1000,
    tier: '都市滨河高端独栋；商场 CBD 保留最高价值核心定位',
    count: 60,
  },
] as const;
export const COMMUNITY_KITS = {
  middle: { id: 'GC-MID-001', manifest: midrise },
  villa: { id: 'GC-VILLA-001', manifest: villas },
};
export function homePoint(
  p: HomePlacement,
  x: number,
  z: number,
): [number, number] {
  return [
    p.x + x * Math.cos(p.yaw) + z * Math.sin(p.yaw),
    p.z - x * Math.sin(p.yaw) + z * Math.cos(p.yaw),
  ];
}
export function homeBounds(p: HomePlacement, min: number[], max: number[]) {
  const points = [
    homePoint(p, min[0], min[1]),
    homePoint(p, max[0], min[1]),
    homePoint(p, min[0], max[1]),
    homePoint(p, max[0], max[1]),
  ];
  return {
    min: [
      Math.min(...points.map((q) => q[0])),
      Math.min(...points.map((q) => q[1])),
    ],
    max: [
      Math.max(...points.map((q) => q[0])),
      Math.max(...points.map((q) => q[1])),
    ],
  };
}
export const COMMUNITY_SURFACES: CommunitySurface[] = [];
function surface(
  id: string,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  kind: CommunitySurface['kind'],
) {
  COMMUNITY_SURFACES.push({
    id,
    min: [x0, z0],
    max: [x1, z1],
    y: kind === 'garden' ? 0.045 : kind === 'road' ? 0.06 : 0.12,
    kind,
  });
}
surface('mid-garden', -985, 546, -710, 950, 'garden');
for (let r = 0; r < 5; r++)
  surface(`mid-court-${r}`, -980, 587 + r * 80, -700, 602 + r * 80, 'walk');
surface('mid-loop-west', -983, 545, -973, 934, 'road');
surface('mid-loop-east', -722, 545, -710, 934, 'road');
surface('mid-loop-north', -983, 546, -710, 558, 'road');
surface('mid-loop-south', -983, 927, -710, 939, 'road');
surface('mid-city-entry', -710, 900, -440, 914, 'road');
surface('mid-global-entry', -901, 500, -889, 552, 'road');
for (const p of HOMES.filter((p) => p.kind === 'middle'))
  surface(`${p.id}-entry`, p.x - 2, p.z + 10, p.x + 2, p.z + 27, 'walk');
// Curved riverside lanes follow the surveyed bank rather than covering the river.
for (let row = 0; row < 3; row++)
  for (let j = 0; j < 76; j++) {
    const z = 620 + j * 10,
      x = riverX(z) - (291 + row * 86);
    surface(`river-lane-${row}-${j}`, x - 5, z, x + 7, z + 11, 'road');
  }
for (const p of HOMES.filter((p) => p.kind === 'villa')) {
  surface(`${p.id}-lot`, p.x - 21, p.z - 16, p.x + 20, p.z + 16, 'garden');
  surface(`${p.id}-drive`, p.x - 34, p.z - 4, p.x - 8, p.z + 4, 'walk');
}
surface(
  'river-crosslane-north',
  riverX(625) - 471,
  620,
  riverX(625) - 284,
  632,
  'road',
);
surface(
  'river-crosslane-south',
  riverX(1380) - 471,
  1373,
  riverX(1380) - 284,
  1385,
  'road',
);
surface('river-city-entry', 1500, 994, riverX(1000) - 457, 1006, 'road');

export const COMMUNITY_WALLS: { id: string; min: number[]; max: number[] }[] =
  [];
function wall(
  id: string,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  h = 1.8,
  bottom = 0.04,
) {
  COMMUNITY_WALLS.push({
    id,
    min: [x0, bottom, z0],
    max: [x1, bottom + h, z1],
  });
}
wall('mid-west-boundary', -987, 546, -985, 950);
wall('mid-south-boundary', -987, 950, -706, 952);
wall('mid-north-left', -987, 544, -901, 546);
wall('mid-north-right', -889, 544, -706, 546);
wall('mid-east-left', -708, 546, -706, 898);
wall('mid-east-right', -708, 916, -706, 952);
wall('mid-gate-pier-a', -710, 896, -704, 900, 4);
wall('mid-gate-pier-b', -710, 914, -704, 918, 4);
wall('mid-gate-canopy', -711, 895, -703, 919, 0.35, 4.04);
for (const p of HOMES.filter((p) => p.kind === 'villa')) {
  wall(
    `${p.id}-garden-edge`,
    p.x + 19,
    p.z - 15.5,
    p.x + 19.4,
    p.z + 15.5,
    0.65,
  );
  wall(`${p.id}-north-hedge`, p.x - 20, p.z - 16, p.x + 19.4, p.z - 15.5, 0.8);
}

export const COMMUNITY_COLLIDERS = [
  ...COMMUNITY_WALLS,
  ...HOMES.flatMap((p) =>
    COMMUNITY_KITS[p.kind].manifest.prototypes[p.prototype].colliders.map(
      (c) => {
        const b = homeBounds(p, [c.min[0], c.min[2]], [c.max[0], c.max[2]]);
        return {
          id: `${p.id}/${c.id}`,
          min: [b.min[0], c.min[1] + p.y, b.min[1]],
          max: [b.max[0], c.max[1] + p.y, b.max[1]],
        };
      },
    ),
  ),
];
const floors = HOMES.flatMap((p) =>
  COMMUNITY_KITS[p.kind].manifest.prototypes[p.prototype].surfaces.map((s) => ({
    ...homeBounds(p, s.min, s.max),
    y: s.y + p.y,
  })),
);
const allFloors = [...floors, ...COMMUNITY_SURFACES];
export function communityGroundHeight(
  x: number,
  z: number,
  currentY: number,
): number | undefined {
  let support: number | undefined;
  for (const s of allFloors)
    if (
      x >= s.min[0] &&
      x <= s.max[0] &&
      z >= s.min[1] &&
      z <= s.max[1] &&
      s.y <= currentY + 0.29
    )
      support = Math.max(support ?? -Infinity, s.y);
  return support;
}
