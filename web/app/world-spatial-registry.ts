import type { WorldPoint, WorldSectorId } from './world-topology';

export type WorldBuildingKind =
  | 'STARTER_TOWER'
  | 'CIVIC'
  | 'AUTOMOTIVE'
  | 'VILLA'
  | 'RESORT'
  | 'MOTORSPORT';

export type WorldSolidFootprint = Readonly<{
  id: string;
  name: string;
  kind: WorldBuildingKind;
  sectorId: WorldSectorId;
  center: WorldPoint;
  halfExtents: WorldPoint;
  shape?: 'RECTANGLE' | 'ELLIPSE';
  height: number;
  rotationRadians?: number;
  baseElevation?: number;
}>;

export type StarterTowerSpec = Readonly<{
  id: string;
  name: string;
  center: WorldPoint;
  width: number;
  depth: number;
  height: number;
  home?: boolean;
  door: WorldPoint;
}>;

export type WorldSiteReservation = Readonly<{
  id: string;
  name: string;
  center: WorldPoint;
  halfExtents: WorldPoint;
}>;

const starterTower = (
  id: string,
  center: WorldPoint,
  width: number,
  depth: number,
  height: number,
  home = false,
): StarterTowerSpec => {
  const facesAvenue = center[0] < 0 ? 1 : -1;
  return {
    id,
    name: `Starter Residence ${id}`,
    center,
    width,
    depth,
    height,
    home,
    door: [center[0] + facesAvenue * (width / 2 + 0.82), center[1]],
  };
};

/**
 * The playable starter district is a deliberately legible collection of
 * complete buildings, not a compressed field of visual-only towers. Each
 * footprint is consumed by both the renderer and collision system.
 */
export const STARTER_TOWER_SPECS: readonly StarterTowerSpec[] = [
  starterTower('ARC-A071', [-21, 86.4], 6.2, 5.8, 64, true),
  starterTower('ARC-A072', [-12.5, 86.4], 5.6, 5.8, 53),
  starterTower('ARC-A073', [12.5, 86.4], 5.6, 5.8, 57),
  starterTower('ARC-A074', [21, 86.4], 6.2, 5.8, 61),
  starterTower('ARC-B071', [-21, 78.4], 5.8, 5.6, 49),
  starterTower('ARC-B072', [-12.5, 78.4], 5.6, 5.6, 58),
  starterTower('ARC-B073', [12.5, 78.4], 5.6, 5.6, 51),
  starterTower('ARC-B074', [21, 78.4], 5.8, 5.6, 55),
  starterTower('ARC-C071', [-21, 69.6], 6, 5.4, 46),
  starterTower('ARC-C072', [-12.5, 69.6], 5.6, 5.4, 52),
  starterTower('ARC-C073', [12.5, 69.6], 5.6, 5.4, 48),
  starterTower('ARC-C074', [21, 69.6], 6, 5.4, 50),
];

const STARTER_TOWER_SOLIDS: readonly WorldSolidFootprint[] =
  STARTER_TOWER_SPECS.map((tower) => ({
    id: tower.id,
    name: tower.name,
    kind: 'STARTER_TOWER' as const,
    sectorId: 'STARTER_OUTER_RING' as const,
    center: tower.center,
    halfExtents: [tower.width / 2, tower.depth / 2],
    height: tower.height,
  }));

/** Named, permanent architecture. Site paving, parking and landscape are not
 * colliders; only the closed building envelopes appear here. */
export const NAMED_WORLD_SOLIDS: readonly WorldSolidFootprint[] = [
  {
    id: 'CIV-SANCTUARY-NAVE',
    name: 'Aurelian Cyber Sanctuary Nave',
    kind: 'CIVIC',
    sectorId: 'CIVIC_MEDICAL',
    center: [30, 64],
    halfExtents: [4.8, 9.2],
    height: 15,
  },
  {
    id: 'CIV-SANCTUARY-TOWER',
    name: 'Aurelian Cyber Sanctuary Bell Tower',
    kind: 'CIVIC',
    sectorId: 'CIVIC_MEDICAL',
    center: [37.4, 67.2],
    halfExtents: [2.15, 2.15],
    height: 29,
  },
  {
    id: 'AUTO-APEX-SHOWROOM',
    name: 'Apex Motors Flagship Showroom',
    kind: 'AUTOMOTIVE',
    sectorId: 'MOTORSPORT_PARK',
    center: [75.7, -59.9],
    halfExtents: [5.4, 3.35],
    height: 6.8,
    baseElevation: getLeveledWorldSiteElevation([82, -55], [14.2, 10.1]),
  },
  {
    id: 'AUTO-APEX-SERVICE',
    name: 'Apex Motors Service Hall',
    kind: 'AUTOMOTIVE',
    sectorId: 'MOTORSPORT_PARK',
    center: [88.3, -60],
    halfExtents: [5.8, 3.5],
    height: 5.4,
    baseElevation: getLeveledWorldSiteElevation([82, -55], [14.2, 10.1]),
  },
  {
    id: 'VIL-HK-01',
    name: 'Harbour Fold House',
    kind: 'VILLA',
    sectorId: 'SUMMIT_ESTATES',
    center: [92, 49],
    halfExtents: [5.6, 4.8],
    height: 7.2,
    baseElevation: getLeveledWorldSiteElevation([92, 49], [7.2, 6.3]),
  },
  {
    id: 'VIL-LA-02',
    name: 'Bel Air Cantilever',
    kind: 'VILLA',
    sectorId: 'SUMMIT_ESTATES',
    center: [104, 36],
    halfExtents: [6.4, 4.9],
    height: 7.8,
    rotationRadians: -0.18,
    baseElevation: getLeveledWorldSiteElevation([104, 36], [8, 6.4], -0.18),
  },
  {
    id: 'VIL-HK-03',
    name: 'Victoria Glass Court',
    kind: 'VILLA',
    sectorId: 'SUMMIT_ESTATES',
    center: [112, 19],
    halfExtents: [5.5, 5.2],
    height: 9.2,
    rotationRadians: 0.16,
    baseElevation: getLeveledWorldSiteElevation([112, 19], [7.1, 6.7], 0.16),
  },
  {
    id: 'VIL-LA-04',
    name: 'Mulholland Horizon House',
    kind: 'VILLA',
    sectorId: 'SUMMIT_ESTATES',
    center: [88, 2],
    halfExtents: [6.3, 4.7],
    height: 6.8,
    rotationRadians: 0.1,
    baseElevation: getLeveledWorldSiteElevation([88, 2], [7.9, 6.2], 0.1),
  },
  {
    id: 'VIL-SUMMIT-05',
    name: 'Ampli Summit Estate',
    kind: 'VILLA',
    sectorId: 'SUMMIT_ESTATES',
    center: [118, -8],
    halfExtents: [7.2, 5.6],
    height: 10.5,
    rotationRadians: -0.12,
    baseElevation: getLeveledWorldSiteElevation([118, -8], [8.8, 7.1], -0.12),
  },
  {
    id: 'SEA-CROWN-CASINO',
    name: 'Ocean Crown Casino',
    kind: 'RESORT',
    sectorId: 'OFFSHORE_CITY',
    center: [-120, -58],
    halfExtents: [12.5, 12.5],
    shape: 'ELLIPSE',
    height: 25,
  },
  {
    id: 'SEA-CROWN-HOTEL',
    name: 'Ocean Crown Sky Hotel',
    kind: 'RESORT',
    sectorId: 'OFFSHORE_CITY',
    center: [-120, -40],
    halfExtents: [5.2, 3.4],
    height: 42,
  },
  {
    id: 'F1-PIT-COMPLEX',
    name: 'Ampli Grand Prix Pit Complex',
    kind: 'MOTORSPORT',
    sectorId: 'MOTORSPORT_PARK',
    center: [130, -67],
    halfExtents: [15, 2.8],
    height: 6.4,
  },
  {
    id: 'F1-GRANDSTAND',
    name: 'Ampli Grand Prix Main Grandstand',
    kind: 'MOTORSPORT',
    sectorId: 'MOTORSPORT_PARK',
    center: [136, -20],
    halfExtents: [9.5, 2.4],
    height: 8.2,
    rotationRadians: -0.08,
    baseElevation: getLeveledWorldSiteElevation([136, -20], [10.6, 3.5], -0.08),
  },
];

export const WORLD_SOLID_FOOTPRINTS: readonly WorldSolidFootprint[] = [
  ...STARTER_TOWER_SOLIDS,
  ...NAMED_WORLD_SOLIDS,
];

/** Reservations remove anonymous LOD massing before named architecture is
 * rendered, so additions replace filler rather than overlap real buildings. */
export const WORLD_SITE_RESERVATIONS: readonly WorldSiteReservation[] = [
  {
    id: 'SITE-STARTER-MASTERPLAN',
    name: 'Starter Arcology Masterplan',
    center: [0, 78],
    halfExtents: [30, 13],
  },
  {
    id: 'SITE-CYBER-SANCTUARY',
    name: 'Aurelian Cyber Sanctuary Precinct',
    center: [31, 64],
    halfExtents: [11, 13],
  },
  {
    id: 'SITE-SUMMIT-ESTATES',
    name: 'Summit Estates',
    center: [98, 14],
    halfExtents: [32, 38],
  },
  {
    id: 'SITE-APEX-MOTORS',
    name: 'Apex Motors Flagship 4S Campus',
    center: [82, -55],
    halfExtents: [15, 11],
  },
  {
    id: 'SITE-OCEAN-CROWN',
    name: 'Ocean Crown Offshore City',
    center: [-120, -60],
    halfExtents: [24, 24],
  },
  {
    id: 'SITE-AMPLI-GRAND-PRIX',
    name: 'Ampli Grand Prix Circuit',
    center: [131, -56],
    halfExtents: [31, 31],
  },
];

export const OCEAN_SKYRAIL_ROUTE: readonly WorldPoint[] = [
  [-8, -77],
  [-35, -76],
  [-61, -73],
  [-82, -69],
  [-99, -65],
  [-120, -84],
];

export const F1_CIRCUIT_POINTS: readonly WorldPoint[] = [
  [105, -56],
  [111, -74],
  [148, -74],
  [158, -63],
  [155, -45],
  [143, -30],
  [125, -28],
  [111, -37],
  [104, -48],
  [105, -56],
];

export const F1_PIT_LANE_POINTS: readonly WorldPoint[] = [
  [111, -74],
  [112.5, -61.5],
  [147.5, -61.5],
  [158, -63],
];

export const SUMMIT_SCENIC_ROUTE: readonly WorldPoint[] = [
  [70, 38],
  [79, 33],
  [85, 27],
  [91, 20],
  [96, 12],
  [101, 4],
  [105, -16],
];

export type WorldSurfacePlateau = Readonly<{
  id: string;
  center: WorldPoint;
  halfExtents: WorldPoint;
  rotationRadians?: number;
  elevation: number;
}>;

export type WorldSurfaceRamp = Readonly<{
  id: string;
  from: WorldPoint;
  to: WorldPoint;
  width: number;
  startElevation: number;
  endElevation: number;
}>;

const automotiveBase = NAMED_WORLD_SOLIDS.find(
  (solid) => solid.id === 'AUTO-APEX-SHOWROOM',
)!.baseElevation!;

export const WORLD_SURFACE_PLATEAUS: readonly WorldSurfacePlateau[] = [
  {
    id: 'SURFACE-OCEAN-CROWN-TERMINAL',
    center: [-120, -84],
    halfExtents: [6.5, 2.7],
    elevation: 4.75,
  },
  {
    id: 'SURFACE-APEX-MOTORS',
    center: [82, -55],
    halfExtents: [14.2, 10.1],
    elevation: automotiveBase + 0.12,
  },
  ...NAMED_WORLD_SOLIDS.filter((solid) => solid.kind === 'VILLA').map(
    (solid) => ({
      id: `SURFACE-${solid.id}`,
      center: solid.center,
      halfExtents: [
        solid.halfExtents[0] + 1.55,
        solid.halfExtents[1] + 1.45,
      ] as WorldPoint,
      rotationRadians: solid.rotationRadians,
      // The visible terrace slab is 0.2 units above the leveled foundation.
      // Player feet and the rendered walking plane therefore share one height.
      elevation: solid.baseElevation! + 0.2,
    }),
  ),
];

export const WORLD_SURFACE_RAMPS: readonly WorldSurfaceRamp[] = [
  {
    id: 'SURFACE-OCEAN-CROWN-TERMINAL-RAMP',
    from: [-116, -76],
    // Stop at the north edge of the terminal plateau. Extending beneath the
    // plateau made the height field jump by a full metre at its front edge.
    to: [-120, -81.3],
    // Exactly matches the physical A13 sea-bridge deck footprint.
    width: 10.12,
    startElevation: 0.28,
    endElevation: 4.75,
  },
  {
    id: 'SURFACE-VIL-HK-01-DRIVE',
    from: [109.15, 49],
    to: [99.15, 49],
    width: 2.8,
    startElevation: getWorldGroundElevation(109.15, 49),
    endElevation:
      NAMED_WORLD_SOLIDS.find((solid) => solid.id === 'VIL-HK-01')!
        .baseElevation! + 0.2,
  },
  {
    id: 'SURFACE-VIL-LA-02-DRIVE',
    from: [115.757, 38.139],
    to: [111.822, 37.423],
    width: 2.8,
    startElevation: getWorldGroundElevation(115.757, 38.139),
    endElevation:
      NAMED_WORLD_SOLIDS.find((solid) => solid.id === 'VIL-LA-02')!
        .baseElevation! + 0.2,
  },
  {
    id: 'SURFACE-VIL-HK-03-DRIVE',
    from: [113.856, 30.501],
    to: [113.059, 25.565],
    width: 2.8,
    startElevation: getWorldGroundElevation(113.856, 30.501),
    endElevation:
      NAMED_WORLD_SOLIDS.find((solid) => solid.id === 'VIL-HK-03')!
        .baseElevation! + 0.2,
  },
  {
    id: 'SURFACE-VIL-LA-04-DRIVE',
    from: [97.801, 1.017],
    to: [95.811, 1.216],
    width: 2.8,
    startElevation: getWorldGroundElevation(97.801, 1.017),
    endElevation:
      NAMED_WORLD_SOLIDS.find((solid) => solid.id === 'VIL-LA-04')!
        .baseElevation! + 0.2,
  },
  {
    id: 'SURFACE-VIL-SUMMIT-05-DRIVE',
    from: [119.131, -17.382],
    to: [118.844, -14.999],
    width: 2.8,
    startElevation: getWorldGroundElevation(119.131, -17.382),
    endElevation:
      NAMED_WORLD_SOLIDS.find((solid) => solid.id === 'VIL-SUMMIT-05')!
        .baseElevation! + 0.2,
  },
];

type WorldCollisionMask = Readonly<{
  centerX: number;
  centerZ: number;
  halfX: number;
  halfZ: number;
  shape: 'RECTANGLE' | 'ELLIPSE';
  cosine: number;
  sine: number;
}>;

function collisionMaskFor(
  footprint: Pick<
    WorldSolidFootprint,
    'center' | 'halfExtents' | 'shape' | 'rotationRadians'
  >,
): WorldCollisionMask {
  const angle = footprint.rotationRadians ?? 0;
  return {
    centerX: footprint.center[0],
    centerZ: footprint.center[1],
    halfX: footprint.halfExtents[0],
    halfZ: footprint.halfExtents[1],
    shape: footprint.shape ?? 'RECTANGLE',
    cosine: Math.cos(angle),
    sine: Math.sin(angle),
  };
}

const WORLD_SOLID_COLLISION_MASKS =
  WORLD_SOLID_FOOTPRINTS.map(collisionMaskFor);
const WORLD_RESERVATION_COLLISION_MASKS =
  WORLD_SITE_RESERVATIONS.map(collisionMaskFor);

function smoothstep(min: number, max: number, value: number) {
  const progress = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return progress * progress * (3 - 2 * progress);
}

/** Continuous highland field for the new eastern ridge. Existing legacy
 * districts remain at grade; the rise begins beyond their current edge. */
export function getWorldGroundElevation(x: number, z: number) {
  const eastRise = smoothstep(76, 116, x);
  const southFeather = smoothstep(-31, -15, z);
  const northFeather = 1 - smoothstep(42, 56, z);
  const ridge = eastRise * southFeather * northFeather;
  const contour = 0.84 + Math.sin(z * 0.11 + x * 0.035) * 0.1;
  return Math.max(0, ridge * 13.5 * contour);
}

export function getWorldFootprintElevationRange(
  center: WorldPoint,
  halfExtents: WorldPoint,
  rotationRadians = 0,
  samplesPerAxis = 9,
) {
  const sampleCount = Math.max(2, Math.floor(samplesPerAxis));
  const cosine = Math.cos(rotationRadians);
  const sine = Math.sin(rotationRadians);
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (let row = 0; row < sampleCount; row += 1) {
    const localZ =
      -halfExtents[1] + (row / (sampleCount - 1)) * halfExtents[1] * 2;
    for (let column = 0; column < sampleCount; column += 1) {
      const localX =
        -halfExtents[0] + (column / (sampleCount - 1)) * halfExtents[0] * 2;
      const worldX = center[0] + cosine * localX + sine * localZ;
      const worldZ = center[1] - sine * localX + cosine * localZ;
      const elevation = getWorldGroundElevation(worldX, worldZ);
      minimum = Math.min(minimum, elevation);
      maximum = Math.max(maximum, elevation);
    }
  }
  return { minimum, maximum };
}

export function getLeveledWorldSiteElevation(
  center: WorldPoint,
  halfExtents: WorldPoint,
  rotationRadians = 0,
  clearance = 0.18,
) {
  return (
    getWorldFootprintElevationRange(center, halfExtents, rotationRadians, 9)
      .maximum + clearance
  );
}

export function pointInFootprint(
  point: WorldPoint,
  footprint: Pick<
    WorldSolidFootprint,
    'center' | 'halfExtents' | 'shape' | 'rotationRadians'
  >,
  margin = 0,
) {
  return pointInFootprintXZ(point[0], point[1], footprint, margin);
}

export function pointInFootprintXZ(
  x: number,
  z: number,
  footprint: Pick<
    WorldSolidFootprint,
    'center' | 'halfExtents' | 'shape' | 'rotationRadians'
  >,
  margin = 0,
) {
  const dx = x - footprint.center[0];
  const dz = z - footprint.center[1];
  const angle = footprint.rotationRadians ?? 0;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const localX = dx * cosine - dz * sine;
  const localZ = dx * sine + dz * cosine;
  if (footprint.shape === 'ELLIPSE') {
    const radiusX = footprint.halfExtents[0] + margin;
    const radiusZ = footprint.halfExtents[1] + margin;
    if (radiusX <= 0 || radiusZ <= 0) return false;
    return (
      (localX * localX) / (radiusX * radiusX) +
        (localZ * localZ) / (radiusZ * radiusZ) <
      1
    );
  }
  return (
    Math.abs(localX) < footprint.halfExtents[0] + margin &&
    Math.abs(localZ) < footprint.halfExtents[1] + margin
  );
}

function pointInCollisionMaskXZ(
  x: number,
  z: number,
  mask: WorldCollisionMask,
  margin: number,
) {
  const dx = x - mask.centerX;
  const dz = z - mask.centerZ;
  const localX = dx * mask.cosine - dz * mask.sine;
  const localZ = dx * mask.sine + dz * mask.cosine;
  if (mask.shape === 'ELLIPSE') {
    const radiusX = mask.halfX + margin;
    const radiusZ = mask.halfZ + margin;
    if (radiusX <= 0 || radiusZ <= 0) return false;
    return (
      (localX * localX) / (radiusX * radiusX) +
        (localZ * localZ) / (radiusZ * radiusZ) <
      1
    );
  }
  return (
    Math.abs(localX) < mask.halfX + margin &&
    Math.abs(localZ) < mask.halfZ + margin
  );
}

export function isPointInNamedWorldSolid(point: WorldPoint, margin = 0) {
  return isPointInNamedWorldSolidXZ(point[0], point[1], margin);
}

export function isPointInNamedWorldSolidXZ(x: number, z: number, margin = 0) {
  for (const mask of WORLD_SOLID_COLLISION_MASKS) {
    if (pointInCollisionMaskXZ(x, z, mask, margin)) return true;
  }
  return false;
}

export function getWorldSolidAtXZ(x: number, z: number, margin = 0) {
  for (let index = 0; index < WORLD_SOLID_COLLISION_MASKS.length; index += 1) {
    if (
      pointInCollisionMaskXZ(x, z, WORLD_SOLID_COLLISION_MASKS[index], margin)
    )
      return WORLD_SOLID_FOOTPRINTS[index];
  }
  return undefined;
}

export function isPointInReservedWorldSite(point: WorldPoint, margin = 0) {
  return isPointInReservedWorldSiteXZ(point[0], point[1], margin);
}

export function isPointInReservedWorldSiteXZ(x: number, z: number, margin = 0) {
  for (const mask of WORLD_RESERVATION_COLLISION_MASKS) {
    if (pointInCollisionMaskXZ(x, z, mask, margin)) return true;
  }
  return false;
}
