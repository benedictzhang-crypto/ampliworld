'use client';

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import * as THREE from 'three';
import {
  RiverHeadwaterFalls,
  LEGACY_RIDGE_CONTENT_OFFSET,
  LEGACY_RIDGE_RESIDENTIAL_QUARTER_SPECS,
  LEGACY_RIDGE_VILLA_FOUNDATION_Y,
  LEGACY_RIDGE_VILLA_LAYOUT,
  METROPOLITAN_RESIDENTIAL_QUARTER_SPECS,
  createMarinaHotelDistrictPlan,
  AZURE_BAY_HOTEL_PLAN_OPTIONS,
  createResidentialQuarterPlan,
  type BuildingSite,
  type WorldPosition,
} from './urban-expansion';
import {
  WORLD_SURFACE_PLATEAUS,
  WORLD_SURFACE_RAMPS,
  WORLD_SOLID_FOOTPRINTS,
  getWorldSolidAtXZ,
  getWorldGroundElevation,
  isPointInNamedWorldSolid,
  isPointInNamedWorldSolidXZ,
  isPointInReservedWorldSite,
} from './world-spatial-registry';
import {
  createJoinedOffsetPolyline,
  getPolylineJunctionIndices,
  type LinearPoint,
} from './linear-infrastructure-geometry';
import {
  BRIDGE_RAIL_SPANS,
  getWorldLinearBarrierAtXZ,
  getWorldRiverBridgeDeckLength,
  getWorldRiverBridgeRenderedWidth,
} from './world-linear-collision';
import {
  getPersistentInfrastructurePierAtXZ,
  isPointInsidePersistentInfrastructure,
} from './persistent-infrastructure-registry';
import {
  createClippedRoadSpans,
  resolveRoadRoutes,
} from './world-road-geometry';
import {
  createRoadWaterCrossingEdgeMasks,
  createRoadWaterCrossings,
  pointInRoadWaterCrossingEdgeMask,
  pointInRoadWaterCrossingXZ,
  roadWaterCrossingElevationAtXZ,
  type RoadWaterCrossing,
} from './world-road-crossings';
import { getWorldWatercraftAtXZ } from './world-watercraft';
import {
  GRAND_RIVER_CORRIDOR,
  METERS_PER_WORLD_UNIT,
  METRO_HUBS,
  METRO_STATION_REGISTRY,
  RIVER_BRIDGES,
  ROAD_CONNECTORS,
  WORLD_CORE_UNITS,
  WORLD_SECTORS,
  distanceBetween,
  headingAlongNearestRoad,
  metroStationByTopologyId,
  type RoadConnector,
  type WorldPoint,
  type WorldSector,
  type WorldSectorId,
} from './world-topology';

export type ContinuousWorldLod = 'DETAIL' | 'SHELL' | 'CULLED';
export type ContinuousWorldPosition =
  | WorldPoint
  | Readonly<{ x: number; z: number }>;

export type ContinuousWorldMetroArrival = {
  stationCode: string;
  stationId: string;
  stationName: string;
  sector: WorldSectorId;
  position: readonly [x: number, y: number, z: number];
  heading: number;
};

export const CONTINUOUS_WORLD_BOUNDS = Object.freeze({
  minX: -155,
  maxX: 165,
  minZ: -100,
  maxZ: 105,
});

/** Radius-like clearance shared by the outdoor camera and its ground probe. */
export const WORLD_CAMERA_GROUND_CLEARANCE = 0.35;

/** The finite ocean rectangle rendered beneath the western edge of the world. */
export const CONTINUOUS_OCEAN_RECTANGLE = Object.freeze({
  minX: CONTINUOUS_WORLD_BOUNDS.minX,
  maxX: -62,
  minZ: CONTINUOUS_WORLD_BOUNDS.minZ,
  maxZ: -12,
});

/** Elliptical estuary bay rendered on top of the rectangular ocean sheet. */
export const CONTINUOUS_OCEAN_BAY = Object.freeze({
  center: [-64, -58] as WorldPoint,
  radii: [25.5, 14] as WorldPoint,
});

/**
 * Temporary anchors for placing the existing content-only district models into
 * the shared topology. They deliberately align each old local metro entrance
 * with its canonical global METRO_HUBS position.
 */
export const LEGACY_DISTRICT_WORLD_ORIGINS = Object.freeze({
  CBD: [0, 0, 0],
  STARTER_ARCOLOGY: [0, 0, 89],
  AZURE_YACHT_MARINA: [-63.5, 0, -58],
  CROWN_RESIDENTIAL_TOWERS: [34, 0, -60],
  MILLIONAIRE_RIDGE: [48, 0, -29],
} as const);

export const LEGACY_SCENE_METRO_HUBS = Object.freeze({
  STARTER_ARCOLOGY: 'MTR-S01',
  CBD: 'MTR-C01',
  AZURE_YACHT_MARINA: 'MTR-W01',
  CROWN_RESIDENTIAL_TOWERS: 'MTR-R01',
  MILLIONAIRE_RIDGE: 'MTR-H01',
} as const);

export type LegacyDistrictId = keyof typeof LEGACY_DISTRICT_WORLD_ORIGINS;

type LegacyLocalBlocker = readonly [
  x: number,
  z: number,
  halfWidth: number,
  halfDepth: number,
  id?: string,
  shape?: 'RECTANGLE' | 'ELLIPSE',
  height?: number,
];

export function getLegacyDistrictContentOrigin(
  district: LegacyDistrictId,
): WorldPosition {
  const origin = LEGACY_DISTRICT_WORLD_ORIGINS[district];
  const offset =
    district === 'MILLIONAIRE_RIDGE'
      ? LEGACY_RIDGE_CONTENT_OFFSET
      : ([0, 0, 0] as const);
  return [origin[0] + offset[0], origin[1] + offset[1], origin[2] + offset[2]];
}

/** Shared authored positions for legacy CBD landmarks that border the roads. */
export const LEGACY_CBD_LAYOUT = Object.freeze({
  PRISM_HOUSE: [28, 0, -35] as WorldPosition,
  CAREER_TOWER: [-18, 0, -18] as WorldPosition,
  ENERGY_CAMPUS: [44.5, 0, 5] as WorldPosition,
  ACADEMY_CAMPUS: [-25, 0, 13] as WorldPosition,
});

export const LEGACY_CBD_ENERGY_UTILITY_OFFSETS = Object.freeze([
  [-3.7, 2.8],
  [0, 2.8],
] as const);

export const LEGACY_CBD_ENERGY_REACTOR_OFFSET = Object.freeze([
  3.65, 0.85,
] as const);
export const LEGACY_CBD_ENERGY_MAST_OFFSET = Object.freeze([
  5.3, -2.9,
] as const);
export const LEGACY_CBD_ENERGY_CANOPY_CENTERS = Object.freeze([
  -3.8, 0, 3.8,
] as const);
export const LEGACY_CBD_ENERGY_CANOPY_SUPPORT_OFFSETS = Object.freeze(
  LEGACY_CBD_ENERGY_CANOPY_CENTERS.flatMap((canopyX) =>
    [-1.25, 1.25].map((supportX) => [canopyX + supportX, 4.75] as const),
  ),
);

const LEGACY_CBD_ENERGY_ROUND_BLOCKERS: readonly LegacyLocalBlocker[] = [
  ...LEGACY_CBD_ENERGY_UTILITY_OFFSETS.map(
    ([offsetX, offsetZ], index) =>
      [
        LEGACY_CBD_LAYOUT.ENERGY_CAMPUS[0] + offsetX,
        LEGACY_CBD_LAYOUT.ENERGY_CAMPUS[2] + offsetZ,
        0.66,
        0.66,
        `CBD-15-UTILITY-${['W', 'C'][index]}`,
        'ELLIPSE',
        1.55,
      ] as const,
  ),
  [
    LEGACY_CBD_LAYOUT.ENERGY_CAMPUS[0] + LEGACY_CBD_ENERGY_REACTOR_OFFSET[0],
    LEGACY_CBD_LAYOUT.ENERGY_CAMPUS[2] + LEGACY_CBD_ENERGY_REACTOR_OFFSET[1],
    1.55,
    1.55,
    'CBD-15-REACTOR',
    'ELLIPSE',
    2.74,
  ],
  [
    LEGACY_CBD_LAYOUT.ENERGY_CAMPUS[0] + LEGACY_CBD_ENERGY_MAST_OFFSET[0],
    LEGACY_CBD_LAYOUT.ENERGY_CAMPUS[2] + LEGACY_CBD_ENERGY_MAST_OFFSET[1],
    0.1,
    0.1,
    'CBD-15-MAST',
    'ELLIPSE',
    6.5,
  ],
  ...LEGACY_CBD_ENERGY_CANOPY_SUPPORT_OFFSETS.map(
    ([offsetX, offsetZ], index) =>
      [
        LEGACY_CBD_LAYOUT.ENERGY_CAMPUS[0] + offsetX,
        LEGACY_CBD_LAYOUT.ENERGY_CAMPUS[2] + offsetZ,
        0.08,
        0.08,
        `CBD-15-CANOPY-SUPPORT-${index + 1}`,
        'ELLIPSE',
        1.6,
      ] as const,
  ),
];

export type ContinuousWorldBlocker = Readonly<{
  id: string;
  district: LegacyDistrictId;
  center: WorldPoint;
  halfExtents: WorldPoint;
  shape?: 'RECTANGLE' | 'ELLIPSE';
  rotationRadians?: number;
  height?: number;
  baseElevation?: number;
}>;

export type BuildingSiteWorldTransform = Readonly<{
  position: WorldPosition;
  rotationY?: number;
  uniformScale?: number;
}>;

export type ContinuousWorldDeckMask = Readonly<{
  id: string;
  center: WorldPoint;
  halfExtents: WorldPoint;
  shape?: 'RECTANGLE' | 'ELLIPSE';
  rotationRadians?: number;
  elevation: number;
}>;

/*
 * The detailed district meshes still use their original local coordinates.
 * These are only solid architecture; the former water rectangles and river
 * barriers are intentionally absent because the shared water mask owns them.
 */
const LEGACY_LOCAL_BUILDING_BLOCKERS: Readonly<
  Record<LegacyDistrictId, readonly LegacyLocalBlocker[]>
> = {
  CBD: [
    [-27, -28, 4.6, 4.6],
    [
      LEGACY_CBD_LAYOUT.PRISM_HOUSE[0],
      LEGACY_CBD_LAYOUT.PRISM_HOUSE[2],
      5.8,
      5.5,
    ],
    [-31, -42, 5.2, 4.8],
    [0, -35, 7.7, 7.7, 'CBD-4', 'ELLIPSE', 10],
    [
      LEGACY_CBD_LAYOUT.CAREER_TOWER[0],
      LEGACY_CBD_LAYOUT.CAREER_TOWER[2],
      3.2,
      3.2,
    ],
    [18, -12, 3.2, 3.2],
    [-17.35, -0.93, 2.165, 1.99, 'CBD-7'],
    [18, 0, 3.2, 3.2],
    // Civic campuses and the mid-rise community use their measured building
    // envelopes below; lawns, parking and pools remain walkable public realm.
    [0, 13.9, 3.25, 3.25, 'CBD-14', 'ELLIPSE', 0.35],
    [
      LEGACY_CBD_LAYOUT.ENERGY_CAMPUS[0] - 3.25,
      LEGACY_CBD_LAYOUT.ENERGY_CAMPUS[2] - 2.15,
      2.7,
      2.125,
      'CBD-15-RESEARCH',
      'RECTANGLE',
      4.3,
    ],
    [
      LEGACY_CBD_LAYOUT.ENERGY_CAMPUS[0] + 2.55,
      LEGACY_CBD_LAYOUT.ENERGY_CAMPUS[2] - 2.4,
      1.95,
      1.85,
      'CBD-15-SERVICE',
      'RECTANGLE',
      2.9,
    ],
    ...LEGACY_CBD_ENERGY_ROUND_BLOCKERS,
    // Embedded mode omits the former approach gateways and arrival-spine
    // furniture. Keep only the two retail arcades that are still rendered.
    [-20.7, 7, 1.15, 13, 'CBD-40'],
    [20.7, 7, 1.15, 13, 'CBD-41'],
  ],
  // Starter towers now come from STARTER_TOWER_SPECS, which is shared by the
  // renderer and collision system. No hand-copied blockers remain here.
  STARTER_ARCOLOGY: [],
  // The two marina assets use measured GLB envelopes below.
  AZURE_YACHT_MARINA: [],
  CROWN_RESIDENTIAL_TOWERS: [
    [-15, -10, 4.8, 4.8],
    [0, -15, 4.8, 4.8],
    [15, -10, 4.8, 4.8],
    [0, 7, 5.2, 5.2, 'CROWN_RESIDENTIAL_TOWERS-4', 'ELLIPSE', 0.35],
  ],
  MILLIONAIRE_RIDGE: [
    // Villa buildings use measured GLB envelopes below. These remaining masks
    // are only the visible garden walls and gate across the internal drives.
    [-9.5, -14, 0.25, 6.2, 'MILLIONAIRE_RIDGE-8'],
    [9.5, -14, 0.25, 6.2, 'MILLIONAIRE_RIDGE-9'],
    [-9.5, 2, 0.25, 6.2, 'MILLIONAIRE_RIDGE-10'],
    [9.5, 2, 0.25, 6.2, 'MILLIONAIRE_RIDGE-11'],
    [-9.5, 18, 0.25, 6.2, 'MILLIONAIRE_RIDGE-12'],
    [9.5, 18, 0.25, 6.2, 'MILLIONAIRE_RIDGE-13'],
    [0, -34.8, 9, 1.1, 'MILLIONAIRE_RIDGE-14'],
  ],
};

const CONTINUOUS_WORLD_MANUAL_LEGACY_BLOCKERS: readonly ContinuousWorldBlocker[] =
  (
    Object.entries(LEGACY_LOCAL_BUILDING_BLOCKERS) as readonly [
      LegacyDistrictId,
      readonly LegacyLocalBlocker[],
    ][]
  ).flatMap(([district, blockers]) => {
    const origin = getLegacyDistrictContentOrigin(district);
    return blockers.map(
      ([x, z, halfWidth, halfDepth, id, shape, height], index) => ({
        id: id ?? `${district}-${index + 1}`,
        district,
        center: [origin[0] + x, origin[2] + z],
        halfExtents: [halfWidth, halfDepth],
        shape,
        height,
      }),
    );
  });

export const CONTINUOUS_WORLD_MEASURED_CBD_BLOCKERS: readonly ContinuousWorldBlocker[] =
  [
    {
      id: 'CBD-HOSPITAL-MAIN',
      district: 'CBD',
      center: [27.1375, -14.315],
      halfExtents: [5.7275, 3.5],
      baseElevation: 0.05,
      height: 7.33,
    },
    {
      id: 'CBD-SAFETY-WEST',
      district: 'CBD',
      center: [24.437595, 5.601],
      halfExtents: [2.562405, 4.191],
      baseElevation: 0.05,
      height: 5.4044,
    },
    {
      id: 'CBD-SAFETY-EAST',
      district: 'CBD',
      center: [30.1, 3.8],
      halfExtents: [2.14, 3.04],
      baseElevation: 0.05,
      height: 2.98,
    },
    {
      id: 'CBD-ACADEMY-MAIN',
      district: 'CBD',
      center: [
        LEGACY_CBD_LAYOUT.ACADEMY_CAMPUS[0],
        LEGACY_CBD_LAYOUT.ACADEMY_CAMPUS[2] - 2.7,
      ],
      halfExtents: [5.13025, 3.385831],
      baseElevation: 0.05,
      height: 4.8475,
    },
    {
      id: 'CBD-FRESH-MARKET-MAIN',
      district: 'CBD',
      center: [-25, -2.1426],
      halfExtents: [3.49, 3.0326],
      baseElevation: 0.05,
      height: 5.4876,
    },
    {
      id: 'CBD-MIDRISE-STUDIO',
      district: 'CBD',
      center: [-32.3, 29],
      halfExtents: [2.79, 2.71],
      baseElevation: 0,
      height: 7.38,
    },
    {
      id: 'CBD-MIDRISE-1B',
      district: 'CBD',
      center: [-26, 27],
      halfExtents: [2.79, 2.71],
      baseElevation: 0,
      height: 8.82,
    },
    {
      id: 'CBD-MIDRISE-2B',
      district: 'CBD',
      center: [-19.7, 29],
      halfExtents: [2.79, 2.71],
      baseElevation: 0,
      height: 7.38,
    },
  ];

/**
 * Measured world envelopes for legacy GLB assets whose mesh origin is not the
 * centre of its visible geometry. Centres remain local to the district origin,
 * so moving a whole authored district also moves its visuals and physics.
 */
export const CONTINUOUS_WORLD_MEASURED_ASSET_BLOCKERS: readonly ContinuousWorldBlocker[] =
  [
    {
      id: 'AZURE_YACHT_MARINA-BUILDING-H',
      district: 'AZURE_YACHT_MARINA',
      center: (() => {
        const origin = getLegacyDistrictContentOrigin('AZURE_YACHT_MARINA');
        return [origin[0] + 27.0000003, origin[2] - 15];
      })(),
      halfExtents: [1.5020993, 1.7134149],
      rotationRadians: -Math.PI / 2,
      baseElevation: 0.1,
      height: 4.3961999,
    },
    {
      id: 'AZURE_YACHT_MARINA-BUILDING-J',
      district: 'AZURE_YACHT_MARINA',
      center: (() => {
        const origin = getLegacyDistrictContentOrigin('AZURE_YACHT_MARINA');
        return [origin[0] + 25, origin[2] + 14.0000002];
      })(),
      halfExtents: [3.2295614, 2.0770001],
      rotationRadians: -Math.PI / 2,
      baseElevation: 0.1,
      height: 5.2483002,
    },
    ...(
      [
        {
          id: 'B01',
          centerOffset: [-0.6999999, 0] as WorldPoint,
          halfExtents: [1.6430002, 1.3117501] as WorldPoint,
          rotationRadians: Math.PI / 2,
          baseElevation: 0.11,
          height: 2.4327,
        },
        {
          id: 'B02',
          centerOffset: [0.7, 0] as WorldPoint,
          halfExtents: [2.2393849, 1.3107] as WorldPoint,
          rotationRadians: -Math.PI / 2,
          baseElevation: 0.11,
          height: 3.1556252,
        },
        {
          id: 'B03',
          centerOffset: [-0.7, 0] as WorldPoint,
          halfExtents: [2.3764001, 1.482] as WorldPoint,
          rotationRadians: Math.PI / 2,
          baseElevation: 0.11,
          height: 2.9575,
        },
        {
          id: 'B04',
          centerOffset: [0.6438563, 0] as WorldPoint,
          halfExtents: [1.674, 1.1955437] as WorldPoint,
          rotationRadians: -Math.PI / 2,
          baseElevation: 0.11,
          height: 2.4786,
        },
        {
          id: 'B05',
          centerOffset: [-0.7, 0.018004] as WorldPoint,
          halfExtents: [1.740504, 1.8634539] as WorldPoint,
          rotationRadians: Math.PI / 2,
          baseElevation: 0.11,
          height: 3.0642761,
        },
        {
          id: 'B06',
          centerOffset: [0.7, 0] as WorldPoint,
          halfExtents: [1.69, 1.3364] as WorldPoint,
          rotationRadians: -Math.PI / 2,
          baseElevation: 0.11,
          height: 2.9575,
        },
        {
          id: 'B07',
          centerOffset: [-0.0000003, -0.6999999] as WorldPoint,
          halfExtents: [1.9992004, 1.521709] as WorldPoint,
          rotationRadians: 0,
          baseElevation: 0.11,
          height: 3.185,
        },
      ] as const
    ).map((asset) => {
      const { centerOffset, ...measuredGeometry } = asset;
      const origin = getLegacyDistrictContentOrigin('MILLIONAIRE_RIDGE');
      const visualId =
        `BLD-${asset.id}` as keyof typeof LEGACY_RIDGE_VILLA_FOUNDATION_Y;
      const layout = LEGACY_RIDGE_VILLA_LAYOUT[visualId];
      return {
        ...measuredGeometry,
        id: `MILLIONAIRE_RIDGE-BUILDING-${asset.id}`,
        district: 'MILLIONAIRE_RIDGE' as const,
        center: [
          origin[0] + layout.position[0] + centerOffset[0],
          origin[2] + layout.position[2] + centerOffset[1],
        ] as WorldPoint,
        rotationRadians: layout.rotationY,
        baseElevation: origin[1],
        height:
          asset.height +
          LEGACY_RIDGE_VILLA_FOUNDATION_Y[visualId] +
          asset.baseElevation,
      };
    }),
  ];

/**
 * Applies the same uniform scale, Y rotation and translation as the R3F parent
 * groups around a BuildingSite. The resulting oriented footprint is consumed
 * by player collision, camera occlusion and shell LOD generation.
 */
export function transformBuildingSitesToWorldBlockers({
  idPrefix,
  district,
  sites,
  transform,
}: {
  idPrefix: string;
  district: LegacyDistrictId;
  sites: readonly BuildingSite[];
  transform: BuildingSiteWorldTransform;
}): readonly ContinuousWorldBlocker[] {
  const rotationY = transform.rotationY ?? 0;
  const scale = Math.abs(transform.uniformScale ?? 1);
  const cosine = Math.cos(rotationY);
  const sine = Math.sin(rotationY);
  return sites.map((site, index) => {
    const scaledX = site.x * scale;
    const scaledZ = site.z * scale;
    return {
      id: `${idPrefix}-${String(site.stableBuildingIndex ?? index + 1).padStart(2, '0')}`,
      district,
      center: [
        transform.position[0] + scaledX * cosine + scaledZ * sine,
        transform.position[2] - scaledX * sine + scaledZ * cosine,
      ],
      halfExtents: [(site.width * scale) / 2, (site.depth * scale) / 2],
      rotationRadians: rotationY + site.rotationY,
      height: site.height * scale,
      baseElevation: transform.position[1],
    };
  });
}

export const METROPOLITAN_RESIDENTIAL_QUARTER_COLLISION_SPECS =
  METROPOLITAN_RESIDENTIAL_QUARTER_SPECS;

/** Keeps anonymous sector massing out of the authored superblock parcels. */
export const METROPOLITAN_RESIDENTIAL_MASSING_RESERVATIONS =
  METROPOLITAN_RESIDENTIAL_QUARTER_COLLISION_SPECS.map((quarter) => ({
    id: `${quarter.id}-SITE`,
    center: [quarter.position[0], quarter.position[2]] as WorldPoint,
    halfExtents: [
      (quarter.plan.footprint[0] * quarter.uniformScale) / 2 + 1,
      (quarter.plan.footprint[1] * quarter.uniformScale) / 2 + 1,
    ] as WorldPoint,
    rotationRadians: quarter.rotationY,
  }));

const azureHotelPlan = createMarinaHotelDistrictPlan(
  AZURE_BAY_HOTEL_PLAN_OPTIONS,
);

export const AZURE_HOTEL_BUILDING_BLOCKERS =
  transformBuildingSitesToWorldBlockers({
    idPrefix: 'AZURE-BAY-HOTEL',
    district: 'AZURE_YACHT_MARINA',
    sites: azureHotelPlan.hotels,
    transform: {
      position: LEGACY_DISTRICT_WORLD_ORIGINS.AZURE_YACHT_MARINA,
      rotationY: -Math.PI / 2,
      uniformScale: 0.62,
    },
  });

export const LEGACY_RIDGE_RESIDENTIAL_BUILDING_BLOCKERS =
  LEGACY_RIDGE_RESIDENTIAL_QUARTER_SPECS.flatMap((quarter) => {
    const ridgeOrigin = getLegacyDistrictContentOrigin('MILLIONAIRE_RIDGE');
    return transformBuildingSitesToWorldBlockers({
      idPrefix: `${quarter.id}-BUILDING`,
      district: 'MILLIONAIRE_RIDGE',
      sites: createResidentialQuarterPlan(quarter.plan).sites,
      transform: {
        position: [
          ridgeOrigin[0] + quarter.localPosition[0],
          ridgeOrigin[1] + quarter.localPosition[1],
          ridgeOrigin[2] + quarter.localPosition[2],
        ],
        uniformScale: quarter.uniformScale,
      },
    });
  });

export const METROPOLITAN_RESIDENTIAL_BUILDING_BLOCKERS =
  METROPOLITAN_RESIDENTIAL_QUARTER_COLLISION_SPECS.flatMap((quarter) =>
    transformBuildingSitesToWorldBlockers({
      idPrefix: `${quarter.id}-BUILDING`,
      district: 'CBD',
      sites: createResidentialQuarterPlan(quarter.plan).sites,
      transform: {
        position: quarter.position,
        rotationY: quarter.rotationY,
        uniformScale: quarter.uniformScale,
      },
    }),
  );

export const CONTINUOUS_WORLD_LEGACY_BLOCKERS: readonly ContinuousWorldBlocker[] =
  [
    ...CONTINUOUS_WORLD_MANUAL_LEGACY_BLOCKERS,
    ...CONTINUOUS_WORLD_MEASURED_CBD_BLOCKERS,
    ...CONTINUOUS_WORLD_MEASURED_ASSET_BLOCKERS,
    ...AZURE_HOTEL_BUILDING_BLOCKERS,
    ...LEGACY_RIDGE_RESIDENTIAL_BUILDING_BLOCKERS,
    ...METROPOLITAN_RESIDENTIAL_BUILDING_BLOCKERS,
  ];

const AZURE_ORIGIN = LEGACY_DISTRICT_WORLD_ORIGINS.AZURE_YACHT_MARINA;

/** Solid walking surfaces that sit above water in the detailed legacy art. */
export const CONTINUOUS_WORLD_WALKABLE_DECKS: readonly ContinuousWorldDeckMask[] =
  [
    {
      id: 'OCEAN-CROWN-ISLAND-DECK',
      center: [-120, -60],
      halfExtents: [24, 24],
      shape: 'ELLIPSE',
      elevation: 0.36,
    },
    {
      id: 'OCEAN-CROWN-TERMINAL-PIER',
      center: [-120, -81.5],
      halfExtents: [7, 3.5],
      elevation: 0.4,
    },
    {
      id: 'AZURE-MAIN-DECK',
      center: [AZURE_ORIGIN[0] - 4.5, AZURE_ORIGIN[2]],
      halfExtents: [5.7, 42.1],
      elevation: 0.12,
    },
    {
      id: 'AZURE-STONE-PROMENADE',
      center: [AZURE_ORIGIN[0] + 4, AZURE_ORIGIN[2]],
      halfExtents: [3.2, 42.1],
      elevation: 0.12,
    },
    {
      id: 'AZURE-HOTEL-AND-MARINA-LAND',
      center: [AZURE_ORIGIN[0] + 21, AZURE_ORIGIN[2]],
      halfExtents: [14.1, 42.1],
      elevation: 0.12,
    },
    ...[-24, -8, 8, 24].map((localZ) => ({
      id: `AZURE-FINGER-PIER-${localZ}`,
      center: [AZURE_ORIGIN[0] - 8.5, AZURE_ORIGIN[2] + localZ] as WorldPoint,
      halfExtents: [8.2, 1.45] as WorldPoint,
      elevation: 0.12,
    })),
  ];

export function legacyDistrictLocalToWorld(
  district: LegacyDistrictId,
  position: readonly [x: number, y: number, z: number],
): readonly [x: number, y: number, z: number] {
  const origin = LEGACY_DISTRICT_WORLD_ORIGINS[district];
  return [
    origin[0] + position[0],
    origin[1] + position[1],
    origin[2] + position[2],
  ];
}

export function worldToLegacyDistrictLocal(
  district: LegacyDistrictId,
  position: readonly [x: number, y: number, z: number],
): readonly [x: number, y: number, z: number] {
  const origin = LEGACY_DISTRICT_WORLD_ORIGINS[district];
  return [
    position[0] - origin[0],
    position[1] - origin[1],
    position[2] - origin[2],
  ];
}

const ROAD_WIDTH_SCALE = 0.42;
const MIN_ROAD_RENDER_WIDTH = 3.6;
const RIVER_SAMPLE_COUNT = 176;
const RIVER_MIN_RENDER_WIDTH = Math.max(
  3.2,
  GRAND_RIVER_CORRIDOR.widthMeters[0] / METERS_PER_WORLD_UNIT,
);
const RIVER_MAX_RENDER_WIDTH = Math.max(
  6.4,
  GRAND_RIVER_CORRIDOR.widthMeters[1] / METERS_PER_WORLD_UNIT,
);

type BoxInstance = {
  id?: string;
  routeSegmentId?: string;
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  color?: THREE.ColorRepresentation;
  shape?: 'BOX' | 'CYLINDER';
};

type RiverSample = {
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  halfWidth: number;
  progress: number;
};

function asWorldPoint(position: ContinuousWorldPosition): WorldPoint {
  return 'x' in position
    ? [position.x, position.z]
    : [position[0], position[1]];
}

function worldX(position: ContinuousWorldPosition) {
  return 'x' in position ? position.x : position[0];
}

function worldZ(position: ContinuousWorldPosition) {
  return 'x' in position ? position.z : position[1];
}

function smoothstep(min: number, max: number, value: number) {
  const progress = THREE.MathUtils.clamp((value - min) / (max - min), 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

function hashString(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function getRoadRenderWidth(road: Pick<RoadConnector, 'width'>) {
  return Math.max(MIN_ROAD_RENDER_WIDTH, road.width * ROAD_WIDTH_SCALE);
}

export function isContinuousWorldLegacyArchitectureBlocker(
  blocker: ContinuousWorldBlocker,
) {
  if (blocker.shape === 'ELLIPSE') {
    return (
      (blocker.height ?? 0) >= 1.5 && Math.min(...blocker.halfExtents) >= 1.2
    );
  }
  return (
    blocker.id.includes('-BUILDING-') ||
    blocker.id.startsWith('AZURE-BAY-HOTEL-') ||
    (blocker.halfExtents[0] >= 2 && blocker.halfExtents[1] >= 2)
  );
}

export const CONTINUOUS_WORLD_LEGACY_ARCHITECTURE_BLOCKERS =
  CONTINUOUS_WORLD_LEGACY_BLOCKERS.filter(
    isContinuousWorldLegacyArchitectureBlocker,
  );

/** Road routing is intentionally more conservative than distant massing. A
 * shallow circular pool does not need a fake tower shell, but it still needs
 * a real plaza aperture so no carriageway is drawn through the water. */
export const CONTINUOUS_WORLD_LEGACY_ROAD_OBSTACLES =
  CONTINUOUS_WORLD_LEGACY_BLOCKERS.filter(
    (blocker) =>
      isContinuousWorldLegacyArchitectureBlocker(blocker) ||
      (blocker.shape === 'ELLIPSE' && Math.min(...blocker.halfExtents) >= 1.2),
  );

/** One physical source for road rendering, collision and water apertures. */
export const CONTINUOUS_WORLD_ROAD_ROUTES = resolveRoadRoutes({
  roads: ROAD_CONNECTORS,
  obstacles: [
    ...CONTINUOUS_WORLD_LEGACY_ROAD_OBSTACLES,
    ...WORLD_SOLID_FOOTPRINTS,
  ],
  renderWidth: getRoadRenderWidth,
  preserveAuthoredCenterlines: true,
});

/** Compatibility flattening for consumers that operate segment-by-segment. */
export const CONTINUOUS_WORLD_ROAD_SPANS = CONTINUOUS_WORLD_ROAD_ROUTES.flatMap(
  (route) => route.segments,
);

export const CONTINUOUS_WORLD_ROAD_CORRIDOR_BLOCKERS =
  CONTINUOUS_WORLD_ROAD_SPANS.map((span) => {
    const dx = span.to[0] - span.from[0];
    const dz = span.to[1] - span.from[1];
    return {
      id: span.id,
      center: [
        (span.from[0] + span.to[0]) / 2,
        (span.from[1] + span.to[1]) / 2,
      ] as WorldPoint,
      halfExtents: [
        span.renderedEnvelopeHalfWidth,
        Math.hypot(dx, dz) / 2 + span.width * 0.09,
      ] as WorldPoint,
      rotationRadians: Math.atan2(dx, dz),
    };
  });

function isPointNearLegacyArchitecture(x: number, z: number, margin: number) {
  return CONTINUOUS_WORLD_LEGACY_ARCHITECTURE_BLOCKERS.some((blocker) => {
    const dx = x - blocker.center[0];
    const dz = z - blocker.center[1];
    const angle = blocker.rotationRadians ?? 0;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const localX = dx * cosine - dz * sine;
    const localZ = dx * sine + dz * cosine;
    return (
      Math.abs(localX) < blocker.halfExtents[0] + margin &&
      Math.abs(localZ) < blocker.halfExtents[1] + margin
    );
  });
}

function riverWidthAt(progress: number) {
  const cityWidth = THREE.MathUtils.lerp(
    RIVER_MIN_RENDER_WIDTH,
    RIVER_MAX_RENDER_WIDTH,
    smoothstep(0.08, 0.78, progress),
  );
  const estuaryWidening = smoothstep(0.78, 1, progress) * 8.5;
  return cityWidth + estuaryWidening;
}

const RIVER_CURVE = new THREE.CatmullRomCurve3(
  GRAND_RIVER_CORRIDOR.centerline.map(
    ([x, z]) => new THREE.Vector3(x, 0.075, z),
  ),
  false,
  'centripetal',
  0.32,
);

const RIVER_SAMPLES: readonly RiverSample[] = Array.from(
  { length: RIVER_SAMPLE_COUNT + 1 },
  (_, index) => {
    const progress = index / RIVER_SAMPLE_COUNT;
    const point = RIVER_CURVE.getPointAt(progress);
    const tangent = RIVER_CURVE.getTangentAt(progress).setY(0).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    return {
      point,
      tangent,
      normal,
      halfWidth: riverWidthAt(progress) / 2,
      progress,
    };
  },
);

const RIVER_QUERY_BOUNDS = RIVER_SAMPLES.reduce(
  (bounds, sample) => ({
    minX: Math.min(bounds.minX, sample.point.x - sample.halfWidth),
    maxX: Math.max(bounds.maxX, sample.point.x + sample.halfWidth),
    minZ: Math.min(bounds.minZ, sample.point.z - sample.halfWidth),
    maxZ: Math.max(bounds.maxZ, sample.point.z + sample.halfWidth),
  }),
  {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
  },
);

const HEADWATER_POINT = GRAND_RIVER_CORRIDOR.centerline[0];
const HEADWATER_DOWNSTREAM_POINT = GRAND_RIVER_CORRIDOR.centerline[1];
const HEADWATER_WIDTH = Math.max(8.5, RIVER_MIN_RENDER_WIDTH * 1.8);
const HEADWATER_ROTATION = Math.atan2(
  HEADWATER_POINT[0] - HEADWATER_DOWNSTREAM_POINT[0],
  HEADWATER_POINT[1] - HEADWATER_DOWNSTREAM_POINT[1],
);

const HEADWATER_COSINE = Math.cos(HEADWATER_ROTATION);
const HEADWATER_SINE = Math.sin(HEADWATER_ROTATION);

function isHeadwaterWaterXZ(x: number, z: number, margin = 0.38) {
  const dx = x - HEADWATER_POINT[0];
  const dz = z - HEADWATER_POINT[1];
  const localX = dx * HEADWATER_COSINE - dz * HEADWATER_SINE;
  const localZ = dx * HEADWATER_SINE + dz * HEADWATER_COSINE;
  const poolRadius = HEADWATER_WIDTH * 0.62 + margin;
  const inLowerPool = Math.hypot(localX, localZ + 3.1) <= poolRadius;
  const inUpperChannel =
    Math.abs(localX) <= HEADWATER_WIDTH * 0.45 + margin &&
    localZ >= -0.6 - margin &&
    localZ <= 16.5 + margin;
  return inLowerPool || inUpperChannel;
}

function isHeadwaterCliffXZ(x: number, z: number, margin = 0.75) {
  const dx = x - HEADWATER_POINT[0];
  const dz = z - HEADWATER_POINT[1];
  const localX = dx * HEADWATER_COSINE - dz * HEADWATER_SINE;
  const localZ = dx * HEADWATER_SINE + dz * HEADWATER_COSINE;
  return (
    Math.abs(localX) <= HEADWATER_WIDTH * 0.725 + margin &&
    Math.abs(localZ - 1.42) <= 1.3 + margin
  );
}

function createRiverRibbonGeometry(extraWidth = 0, height = 0) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  RIVER_SAMPLES.forEach((sample, index) => {
    const width = sample.halfWidth + extraWidth;
    const left = sample.point.clone().addScaledVector(sample.normal, width);
    const right = sample.point.clone().addScaledVector(sample.normal, -width);
    positions.push(
      left.x,
      sample.point.y + height,
      left.z,
      right.x,
      sample.point.y + height,
      right.z,
    );
    uvs.push(0, sample.progress * 12, 1, sample.progress * 12);
    if (index < RIVER_SAMPLES.length - 1) {
      const start = index * 2;
      indices.push(
        start,
        start + 2,
        start + 1,
        start + 1,
        start + 2,
        start + 3,
      );
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

const BRIDGE_COLLISION_MASKS = RIVER_BRIDGES.map((bridge) => {
  const angle = THREE.MathUtils.degToRad(bridge.rotationDegrees);
  return {
    centerX: bridge.position[0],
    centerZ: bridge.position[1],
    cosine: Math.cos(angle),
    sine: Math.sin(angle),
    halfWidth: getWorldRiverBridgeRenderedWidth(bridge) / 2,
    halfLength: getWorldRiverBridgeDeckLength(bridge) / 2,
    elevation: 0.12,
  };
});

function InstancedBoxes({
  instances,
  roughness = 0.86,
  metalness = 0.05,
  transparent = false,
  opacity = 1,
  emissive,
  emissiveIntensity = 0,
  castShadow = false,
  receiveShadow = true,
}: {
  instances: readonly BoxInstance[];
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const object = new THREE.Object3D();
    const color = new THREE.Color();
    instances.forEach((instance, index) => {
      object.position.set(...instance.position);
      object.scale.set(...instance.scale);
      object.rotation.set(
        instance.rotationX ?? 0,
        instance.rotationY ?? 0,
        instance.rotationZ ?? 0,
      );
      object.updateMatrix();
      mesh.setMatrixAt(index, object.matrix);
      if (instance.color !== undefined) {
        mesh.setColorAt(index, color.set(instance.color));
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [instances]);

  if (instances.length === 0) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, instances.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <boxGeometry />
      <meshStandardMaterial
        color="#ffffff"
        vertexColors
        roughness={roughness}
        metalness={metalness}
        transparent={transparent}
        opacity={opacity}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
      />
    </instancedMesh>
  );
}

function InstancedCylinders({
  instances,
  roughness = 0.86,
  metalness = 0.05,
  emissive,
  emissiveIntensity = 0,
  castShadow = false,
  receiveShadow = true,
}: {
  instances: readonly BoxInstance[];
  roughness?: number;
  metalness?: number;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const object = new THREE.Object3D();
    const color = new THREE.Color();
    instances.forEach((instance, index) => {
      object.position.set(...instance.position);
      object.scale.set(...instance.scale);
      object.rotation.set(
        instance.rotationX ?? 0,
        instance.rotationY ?? 0,
        instance.rotationZ ?? 0,
      );
      object.updateMatrix();
      mesh.setMatrixAt(index, object.matrix);
      if (instance.color !== undefined)
        mesh.setColorAt(index, color.set(instance.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [instances]);

  if (instances.length === 0) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, instances.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <cylinderGeometry args={[0.5, 0.5, 1, 24]} />
      <meshStandardMaterial
        color="#ffffff"
        vertexColors
        roughness={roughness}
        metalness={metalness}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
      />
    </instancedMesh>
  );
}

function InstancedTreeCanopies({
  instances,
}: {
  instances: readonly BoxInstance[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const object = new THREE.Object3D();
    const color = new THREE.Color();
    instances.forEach((instance, index) => {
      object.position.set(...instance.position);
      object.scale.set(...instance.scale);
      object.rotation.set(0, instance.rotationY ?? 0, 0);
      object.updateMatrix();
      mesh.setMatrixAt(index, object.matrix);
      if (instance.color !== undefined)
        mesh.setColorAt(index, color.set(instance.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [instances]);
  if (instances.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, instances.length]}
      castShadow={false}
      receiveShadow
    >
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#ffffff"
        vertexColors
        roughness={0.92}
        emissive="#31563a"
        emissiveIntensity={0.5}
      />
    </instancedMesh>
  );
}

const ROADSIDE_TREE_WATER_CLEARANCE_RADIUS = 1.08;
const ROADSIDE_TREE_WATER_CLEARANCE_SAMPLES = [
  [0, 0] as const,
  ...Array.from({ length: 64 }, (_, index) => {
    const angle = (index / 64) * Math.PI * 2;
    return [
      Math.cos(angle) * ROADSIDE_TREE_WATER_CLEARANCE_RADIUS,
      Math.sin(angle) * ROADSIDE_TREE_WATER_CLEARANCE_RADIUS,
    ] as const;
  }),
];

function buildRoadInstances() {
  const surfaces: BoxInstance[] = [];
  const walks: BoxInstance[] = [];
  const cycleways: BoxInstance[] = [];
  const markings: BoxInstance[] = [];
  const treeTrunks: BoxInstance[] = [];
  const treeCanopies: BoxInstance[] = [];

  const appendBand = (
    target: BoxInstance[],
    points: readonly LinearPoint[],
    width: number,
    thickness: number,
    heightOffset: number,
    color: THREE.ColorRepresentation,
    routeSegmentIds?: readonly string[],
  ) => {
    points.slice(0, -1).forEach((from, index) => {
      const to = points[index + 1];
      const dx = to[0] - from[0];
      const dz = to[1] - from[1];
      const horizontalLength = Math.hypot(dx, dz);
      if (horizontalLength < 0.001) return;
      const fromY = getWorldGroundElevation(from[0], from[1]);
      const toY = getWorldGroundElevation(to[0], to[1]);
      const slope = Math.atan2(toY - fromY, horizontalLength);
      target.push({
        routeSegmentId: routeSegmentIds?.[index],
        position: [
          (from[0] + to[0]) / 2,
          (fromY + toY) / 2 + heightOffset,
          (from[1] + to[1]) / 2,
        ],
        scale: [
          width,
          thickness,
          Math.hypot(horizontalLength, toY - fromY) + width * 0.18,
        ],
        rotationX: -slope,
        rotationY: Math.atan2(dx, dz),
        color,
      });
    });

    getPolylineJunctionIndices(points).forEach((index) => {
      const point = points[index];
      // A wet junction is filled by the corresponding physical bridge or
      // causeway. Rendering a generic square here would create road surface
      // beyond the reviewed structure footprint.
      const halfWidth = width / 2;
      const junctionWaterSamples = [-1, 0, 1].flatMap((xOffset) =>
        [-1, 0, 1].map(
          (zOffset) =>
            [
              point[0] + xOffset * halfWidth,
              point[1] + zOffset * halfWidth,
            ] as const,
        ),
      );
      if (junctionWaterSamples.some(([x, z]) => isWorldPointInRawWaterXZ(x, z)))
        return;
      target.push({
        position: [
          point[0],
          getWorldGroundElevation(point[0], point[1]) + heightOffset,
          point[1],
        ],
        scale: [width, thickness, width],
        color,
      });
    });
  };

  const appendYieldingAmenityBand = ({
    target,
    road,
    fragmentId,
    routeSegmentIds,
    points,
    offset,
    width,
    thickness,
    heightOffset,
    color,
  }: {
    target: BoxInstance[];
    road: RoadConnector;
    fragmentId: string;
    routeSegmentIds: readonly string[];
    points: readonly LinearPoint[];
    offset: number;
    width: number;
    thickness: number;
    heightOffset: number;
    color: THREE.ColorRepresentation;
  }) => {
    const joined = createJoinedOffsetPolyline(points, offset);
    const spans = createClippedRoadSpans({
      roads: [
        {
          ...road,
          id: `${fragmentId}:AMENITY`,
          points: joined,
          width,
        },
      ],
      obstacles: [
        ...CONTINUOUS_WORLD_LEGACY_ROAD_OBSTACLES,
        ...WORLD_SOLID_FOOTPRINTS,
      ],
      renderWidth: () => width,
      outerMargin: 0,
      clearance: 0.38,
      minimumLength: 0.32,
    });
    spans.forEach((span) => {
      appendBand(
        target,
        [span.from, span.to],
        width,
        thickness,
        heightOffset,
        color,
        [routeSegmentIds[span.sourceSegmentIndex]],
      );
    });
  };

  CONTINUOUS_WORLD_ROAD_ROUTES.forEach((route) => {
    const road = route.road;
    const roadColor =
      road.class === 'SCENIC'
        ? '#69756e'
        : road.class === 'RING'
          ? '#596164'
          : '#60686b';
    route.fragments.forEach((fragment) => {
      const width = fragment.width;
      const routeSegmentIds = fragment.segments.map((segment) => segment.id);
      appendBand(
        surfaces,
        fragment.points,
        width,
        0.11,
        0.055,
        roadColor,
        routeSegmentIds,
      );

      // The sea bridge's continuous foundation itself forms the foot/cycle
      // shoulders. Offset miter bands would flare beyond the guarded deck at
      // its sharp terminal turns.
      if (road.id !== 'RD-A13' && road.modes?.includes('WALK')) {
        const walkColor = road.class === 'SCENIC' ? '#aaa78f' : '#bbb7aa';
        for (const side of [-1, 1] as const) {
          appendYieldingAmenityBand({
            target: walks,
            road,
            fragmentId: fragment.id,
            routeSegmentIds,
            points: fragment.points,
            offset: (width / 2 + 1.58) * side,
            width: 1.42,
            thickness: 0.16,
            heightOffset: 0.105,
            color: walkColor,
          });
        }
      }

      if (road.id !== 'RD-A13' && road.modes?.includes('CYCLE')) {
        const cycleColor = road.class === 'SCENIC' ? '#71826d' : '#667c70';
        for (const side of [-1, 1] as const) {
          appendYieldingAmenityBand({
            target: cycleways,
            road,
            fragmentId: fragment.id,
            routeSegmentIds,
            points: fragment.points,
            offset: (width / 2 + 0.52) * side,
            width: 0.7,
            thickness: 0.13,
            heightOffset: 0.095,
            color: cycleColor,
          });
        }
      }

      fragment.segments.forEach(({ from, to }) => {
        const dx = to[0] - from[0];
        const dz = to[1] - from[1];
        const horizontalLength = Math.hypot(dx, dz);
        const fromY = getWorldGroundElevation(from[0], from[1]);
        const toY = getWorldGroundElevation(to[0], to[1]);
        const slope = Math.atan2(toY - fromY, horizontalLength);
        const length = Math.hypot(horizontalLength, toY - fromY);
        const rotationY = Math.atan2(dx, dz);
        const center: [number, number, number] = [
          (from[0] + to[0]) / 2,
          (fromY + toY) / 2 + 0.055,
          (from[1] + to[1]) / 2,
        ];
        const tangentX = dx / Math.max(horizontalLength, 0.001);
        const tangentZ = dz / Math.max(horizontalLength, 0.001);
        const normalX = -tangentZ;
        const normalZ = tangentX;
        const treeOffset = width / 2 + 2.18;
        if (road.modes?.includes('WALK') && horizontalLength > 9) {
          const treeCount = Math.max(1, Math.floor(horizontalLength / 9));
          for (let treeIndex = 1; treeIndex <= treeCount; treeIndex += 1) {
            const progress = treeIndex / (treeCount + 1);
            const treeX = THREE.MathUtils.lerp(from[0], to[0], progress);
            const treeZ = THREE.MathUtils.lerp(from[1], to[1], progress);
            const treeY = getWorldGroundElevation(treeX, treeZ);
            for (const side of [-1, 1] as const) {
              const x = treeX + normalX * treeOffset * side;
              const z = treeZ + normalZ * treeOffset * side;
              if (
                ROADSIDE_TREE_WATER_CLEARANCE_SAMPLES.some(
                  ([offsetX, offsetZ]) =>
                    isWorldPointInRawWaterXZ(x + offsetX, z + offsetZ),
                ) ||
                isPointNearLegacyArchitecture(x, z, 1.6) ||
                isPointInNamedWorldSolidXZ(x, z, 1.6)
              )
                continue;
              const clearsMetroEntrance = METRO_STATION_REGISTRY.every(
                (station) => {
                  const stationX = x - station.arrival[0];
                  const stationZ = z - station.arrival[1];
                  return stationX * stationX + stationZ * stationZ > 90.25;
                },
              );
              if (!clearsMetroEntrance) continue;
              treeTrunks.push({
                position: [x, treeY + 0.72, z],
                scale: [0.18, 1.44, 0.18],
                color: '#67513b',
              });
              treeCanopies.push({
                position: [x, treeY + 1.85, z],
                scale: [1.05, 1.18, 1.05],
                rotationY: (treeIndex * 0.71 + side) % Math.PI,
                color: road.class === 'SCENIC' ? '#759b78' : '#82a080',
              });
            }
          }
        }
        if (road.class !== 'SCENIC') {
          markings.push({
            position: [center[0], center[1] + 0.07, center[2]],
            scale: [0.075, 0.018, Math.max(0.2, length - 0.8)],
            rotationX: -slope,
            rotationY,
            color: road.class === 'AXIS' ? '#d5c270' : '#bfc4b8',
          });
        }
      });
    });
  });

  return { surfaces, walks, cycleways, markings, treeTrunks, treeCanopies };
}

const ROAD_INSTANCES = buildRoadInstances();

export type ContinuousWorldRoadBandBlocker = Readonly<{
  id: string;
  routeSegmentId?: string;
  band: 'SURFACE' | 'WALK' | 'CYCLE';
  center: WorldPoint;
  halfExtents: WorldPoint;
  rotationRadians: number;
}>;

export const CONTINUOUS_WORLD_ROAD_RENDER_BAND_BLOCKERS: readonly ContinuousWorldRoadBandBlocker[] =
  (
    [
      ['SURFACE', ROAD_INSTANCES.surfaces],
      ['WALK', ROAD_INSTANCES.walks],
      ['CYCLE', ROAD_INSTANCES.cycleways],
    ] as const
  ).flatMap(([band, instances]) =>
    instances.map((instance, index) => ({
      id: `ROAD-${band}-${index + 1}`,
      routeSegmentId: instance.routeSegmentId,
      band,
      center: [instance.position[0], instance.position[2]] as WorldPoint,
      halfExtents: [instance.scale[0] / 2, instance.scale[2] / 2] as WorldPoint,
      rotationRadians: instance.rotationY ?? 0,
    })),
  );

export const CONTINUOUS_WORLD_ROADSIDE_TREE_FOOTPRINTS =
  ROAD_INSTANCES.treeCanopies.map((instance, index) => ({
    id: `ROADSIDE-TREE-${index + 1}`,
    center: [instance.position[0], instance.position[2]] as WorldPoint,
    halfExtents: [instance.scale[0], instance.scale[2]] as WorldPoint,
    rotationRadians: 0,
  }));

function isWorldCameraPointInsideRoadsideTree(x: number, y: number, z: number) {
  for (const trunk of ROAD_INSTANCES.treeTrunks) {
    if (
      Math.abs(x - trunk.position[0]) <= trunk.scale[0] / 2 + 0.32 &&
      Math.abs(y - trunk.position[1]) <= trunk.scale[1] / 2 + 0.24 &&
      Math.abs(z - trunk.position[2]) <= trunk.scale[2] / 2 + 0.32
    )
      return true;
  }
  for (const canopy of ROAD_INSTANCES.treeCanopies) {
    const radiusX = canopy.scale[0] + 0.32;
    const radiusY = canopy.scale[1] + 0.24;
    const radiusZ = canopy.scale[2] + 0.32;
    const dx = (x - canopy.position[0]) / radiusX;
    const dy = (y - canopy.position[1]) / radiusY;
    const dz = (z - canopy.position[2]) / radiusZ;
    if (dx * dx + dy * dy + dz * dz <= 1) return true;
  }
  return false;
}

export function ContinuousRoadNetwork() {
  return (
    <group name="Continuous metropolitan road network">
      <InstancedBoxes
        instances={ROAD_INSTANCES.surfaces}
        roughness={0.94}
        emissive="#3b4244"
        emissiveIntensity={0.24}
      />
      <InstancedBoxes
        instances={ROAD_INSTANCES.walks}
        roughness={0.9}
        emissive="#514f47"
        emissiveIntensity={0.1}
      />
      <InstancedBoxes
        instances={ROAD_INSTANCES.cycleways}
        roughness={0.82}
        emissive="#26372d"
        emissiveIntensity={0.06}
      />
      <InstancedBoxes
        instances={ROAD_INSTANCES.markings}
        roughness={0.66}
        emissive="#72683d"
        emissiveIntensity={0.12}
        receiveShadow={false}
      />
      <InstancedBoxes
        instances={ROAD_INSTANCES.treeTrunks}
        roughness={0.96}
        castShadow={false}
      />
      <InstancedTreeCanopies instances={ROAD_INSTANCES.treeCanopies} />
    </group>
  );
}

function RiverWalks() {
  const instances = useMemo(() => {
    const paths: BoxInstance[] = [];
    for (let index = 0; index < RIVER_SAMPLES.length - 1; index += 2) {
      const sample = RIVER_SAMPLES[index];
      const next = RIVER_SAMPLES[Math.min(index + 2, RIVER_SAMPLES.length - 1)];
      const segmentLength = sample.point.distanceTo(next.point) + 0.35;
      const rotationY = Math.atan2(sample.tangent.x, sample.tangent.z);
      for (const side of [-1, 1] as const) {
        const offset = sample.halfWidth + 1.65;
        paths.push({
          position: [
            sample.point.x + sample.normal.x * offset * side,
            0.19,
            sample.point.z + sample.normal.z * offset * side,
          ],
          scale: [2.35, 0.2, segmentLength],
          rotationY,
          color: side === 1 ? '#d0c8b5' : '#c3bca9',
        });
      }
    }
    return paths;
  }, []);

  return <InstancedBoxes instances={instances} roughness={0.91} />;
}

function ContinuousRiverBridges() {
  return (
    <group name="Grand River bridges">
      {RIVER_BRIDGES.map((bridge) => {
        const deckLength = getWorldRiverBridgeDeckLength(bridge);
        const deckVisualLength = deckLength + 0.48;
        const renderedWidth = getWorldRiverBridgeRenderedWidth(bridge);
        const rotationY = THREE.MathUtils.degToRad(bridge.rotationDegrees);
        const isPedestrian = bridge.class === 'PEDESTRIAN';
        const isMetro = bridge.class === 'METRO';
        const railSpans = BRIDGE_RAIL_SPANS.filter(
          (span) => span.bridgeId === bridge.id,
        );
        return (
          <group
            key={bridge.id}
            position={[bridge.position[0], 0.06, bridge.position[1]]}
            rotation={[0, rotationY, 0]}
            name={bridge.name}
            userData={{
              id: bridge.id,
              status: bridge.status,
              modes: bridge.modes,
            }}
          >
            <mesh castShadow receiveShadow>
              <boxGeometry args={[renderedWidth, 0.12, deckVisualLength]} />
              <meshStandardMaterial
                color={
                  isPedestrian ? '#b8b2a3' : isMetro ? '#56646c' : '#434b4d'
                }
                roughness={isPedestrian ? 0.78 : 0.64}
                metalness={isMetro ? 0.34 : 0.12}
              />
            </mesh>
            {!isMetro &&
              railSpans.map((span) => {
                const side = span.side === 'LEFT' ? -1 : 1;
                return (
                  <mesh
                    key={span.id}
                    position={[
                      side * (renderedWidth / 2 - 0.18),
                      0.43,
                      (span.start + span.end) / 2,
                    ]}
                  >
                    <boxGeometry args={[0.16, 0.74, span.end - span.start]} />
                    <meshStandardMaterial
                      color="#bac3bf"
                      metalness={0.62}
                      roughness={0.32}
                    />
                  </mesh>
                );
              })}
            {!isMetro &&
              railSpans.flatMap((span) => {
                const side = span.side === 'LEFT' ? -1 : 1;
                return [span.start, span.end].map((z) => (
                  <mesh
                    key={`${span.id}:POST:${z}`}
                    position={[side * (renderedWidth / 2 - 0.18), 0.43, z]}
                  >
                    <boxGeometry args={[0.24, 0.8, 0.24]} />
                    <meshStandardMaterial
                      color="#bac3bf"
                      metalness={0.62}
                      roughness={0.32}
                    />
                  </mesh>
                ));
              })}
            {isMetro &&
              [-0.7, 0.7].map((x) => (
                <mesh key={x} position={[x, 0.09, 0]}>
                  <boxGeometry args={[0.08, 0.08, deckLength - 0.6]} />
                  <meshStandardMaterial
                    color="#95cfd7"
                    metalness={0.74}
                    roughness={0.24}
                  />
                </mesh>
              ))}
          </group>
        );
      })}
    </group>
  );
}

function EstuaryOceanInterface() {
  const oceanWidth =
    CONTINUOUS_OCEAN_RECTANGLE.maxX - CONTINUOUS_OCEAN_RECTANGLE.minX;
  const oceanDepth =
    CONTINUOUS_OCEAN_RECTANGLE.maxZ - CONTINUOUS_OCEAN_RECTANGLE.minZ;
  const oceanCenterX =
    (CONTINUOUS_OCEAN_RECTANGLE.minX + CONTINUOUS_OCEAN_RECTANGLE.maxX) / 2;
  const oceanCenterZ =
    (CONTINUOUS_OCEAN_RECTANGLE.minZ + CONTINUOUS_OCEAN_RECTANGLE.maxZ) / 2;
  return (
    <group name="Grand River estuary and western ocean">
      <mesh
        position={[oceanCenterX, -0.035, oceanCenterZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[oceanWidth, oceanDepth, 1, 1]} />
        <meshPhysicalMaterial
          color="#1c6f8d"
          roughness={0.14}
          metalness={0.18}
          clearcoat={0.52}
          clearcoatRoughness={0.18}
          transparent
          opacity={0.94}
        />
      </mesh>
      <mesh
        position={[
          CONTINUOUS_OCEAN_BAY.center[0],
          -0.018,
          CONTINUOUS_OCEAN_BAY.center[1],
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[
          CONTINUOUS_OCEAN_BAY.radii[0],
          CONTINUOUS_OCEAN_BAY.radii[1],
          1,
        ]}
        receiveShadow
      >
        <circleGeometry args={[1, 64]} />
        <meshPhysicalMaterial
          color="#267d97"
          roughness={0.12}
          metalness={0.16}
          clearcoat={0.46}
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh position={[-49, 0.015, -65]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[10.4, 12.2, 56, 1, 0.42, Math.PI * 1.22]} />
        <meshStandardMaterial
          color="#c7b88e"
          roughness={0.96}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

export function ContinuousGrandRiver() {
  const bankGeometry = useMemo(
    () => createRiverRibbonGeometry(2.2, -0.045),
    [],
  );
  const riverGeometry = useMemo(() => createRiverRibbonGeometry(0, 0), []);

  useEffect(
    () => () => {
      bankGeometry.dispose();
      riverGeometry.dispose();
    },
    [bankGeometry, riverGeometry],
  );

  return (
    <group name="Continuous Grand River corridor">
      <EstuaryOceanInterface />
      <mesh geometry={bankGeometry} receiveShadow>
        <meshStandardMaterial color="#778074" roughness={0.96} />
      </mesh>
      <mesh geometry={riverGeometry} receiveShadow renderOrder={1}>
        <meshPhysicalMaterial
          color="#287f99"
          emissive="#123e50"
          emissiveIntensity={0.08}
          roughness={0.13}
          metalness={0.2}
          clearcoat={0.54}
          clearcoatRoughness={0.16}
          transparent
          opacity={0.91}
          depthWrite={false}
        />
      </mesh>
      <RiverWalks />
      <ContinuousRiverBridges />
      <RiverHeadwaterFalls
        position={[HEADWATER_POINT[0], 0, HEADWATER_POINT[1]]}
        rotationY={HEADWATER_ROTATION}
        width={HEADWATER_WIDTH}
        dropHeight={7.2}
      />
    </group>
  );
}

function sectorPalette(sector: WorldSector) {
  switch (sector.role) {
    case 'CORE':
      return { stone: '#d7d3c9', glass: '#325c6c', light: '#ffc986' };
    case 'RESORT':
      return { stone: '#e1d9c8', glass: '#3d7381', light: '#ffd29b' };
    case 'RESIDENTIAL':
      return { stone: '#cfc7b8', glass: '#456b72', light: '#f5c58a' };
    case 'INFRASTRUCTURE':
      return { stone: '#9da7a0', glass: '#41636a', light: '#91e9d1' };
    case 'EMPLOYMENT':
      return { stone: '#aaa99f', glass: '#3e5961', light: '#eab977' };
    default:
      return { stone: '#c3bcad', glass: '#486c73', light: '#f2c485' };
  }
}

function isOceanPointXZ(x: number, z: number) {
  const ocean =
    x >= CONTINUOUS_OCEAN_RECTANGLE.minX &&
    x <= CONTINUOUS_OCEAN_RECTANGLE.maxX &&
    z >= CONTINUOUS_OCEAN_RECTANGLE.minZ &&
    z <= CONTINUOUS_OCEAN_RECTANGLE.maxZ;
  const bayX =
    (x - CONTINUOUS_OCEAN_BAY.center[0]) / CONTINUOUS_OCEAN_BAY.radii[0];
  const bayZ =
    (z - CONTINUOUS_OCEAN_BAY.center[1]) / CONTINUOUS_OCEAN_BAY.radii[1];
  return ocean || bayX * bayX + bayZ * bayZ <= 1;
}

/** Hydrology without any traversal apertures. This predicate is the single
 * source used to prove that a road receives a real bridge or causeway instead
 * of making the river/ocean disappear beneath its footprint. */
export function isWorldPointInRawWaterXZ(x: number, z: number) {
  return (
    isWorldPointInGrandRiverXZ(x, z) ||
    isHeadwaterWaterXZ(x, z, 0) ||
    isOceanPointXZ(x, z)
  );
}

function getAuthoredRoadSurfaceElevationXZ(x: number, z: number) {
  let elevation = getWorldGroundElevation(x, z);
  for (const plateau of WORLD_SURFACE_PLATEAUS) {
    const angle = plateau.rotationRadians ?? 0;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const dx = x - plateau.center[0];
    const dz = z - plateau.center[1];
    const localX = dx * cosine - dz * sine;
    const localZ = dx * sine + dz * cosine;
    if (
      Math.abs(localX) <= plateau.halfExtents[0] &&
      Math.abs(localZ) <= plateau.halfExtents[1]
    )
      elevation = Math.max(elevation, plateau.elevation);
  }
  for (const ramp of WORLD_SURFACE_RAMPS) {
    const dx = ramp.to[0] - ramp.from[0];
    const dz = ramp.to[1] - ramp.from[1];
    const lengthSquared = dx * dx + dz * dz;
    const progress = THREE.MathUtils.clamp(
      ((x - ramp.from[0]) * dx + (z - ramp.from[1]) * dz) /
        Math.max(lengthSquared, Number.EPSILON),
      0,
      1,
    );
    const nearestX = ramp.from[0] + dx * progress;
    const nearestZ = ramp.from[1] + dz * progress;
    if (Math.hypot(x - nearestX, z - nearestZ) <= ramp.width / 2) {
      elevation = Math.max(
        elevation,
        THREE.MathUtils.lerp(ramp.startElevation, ramp.endElevation, progress),
      );
    }
  }
  return elevation;
}

export const CONTINUOUS_WORLD_ROAD_WATER_CROSSINGS = createRoadWaterCrossings({
  segments: CONTINUOUS_WORLD_ROAD_SPANS,
  roads: ROAD_CONNECTORS,
  bridges: RIVER_BRIDGES,
  isRawWaterXZ: isWorldPointInRawWaterXZ,
  groundElevationXZ: getAuthoredRoadSurfaceElevationXZ,
  bridgeDeckLength: getWorldRiverBridgeDeckLength,
});

const SEA_BRIDGE_CROSSINGS = CONTINUOUS_WORLD_ROAD_WATER_CROSSINGS.filter(
  (crossing) => crossing.surface === 'SEA_BRIDGE',
);
const SEA_BRIDGE_EDGE_TRIMS = (() => {
  const first = SEA_BRIDGE_CROSSINGS[0];
  const penultimate = SEA_BRIDGE_CROSSINGS.at(-2);
  const last = SEA_BRIDGE_CROSSINGS.at(-1);
  if (!first || !last) return {};
  if (first.id === last.id) return { [first.id]: { start: 2.2, end: 2.2 } };
  return {
    // The first deck merges into the elevated west-coast ring. Its landward
    // (left) parapet would sit across that road, so only the ocean-facing edge
    // continues through the merge throat.
    [first.id]: { start: 2.2, left: { start: 999 } },
    ...(penultimate ? { [penultimate.id]: { end: 999 } } : {}),
    [last.id]: { start: 999 },
  };
})();

export const CONTINUOUS_WORLD_ROAD_WATER_EDGE_MASKS =
  createRoadWaterCrossingEdgeMasks(SEA_BRIDGE_CROSSINGS, SEA_BRIDGE_EDGE_TRIMS);

export function getRoadWaterCrossingAtXZ(x: number, z: number, margin = 0) {
  return CONTINUOUS_WORLD_ROAD_WATER_CROSSINGS.find((crossing) =>
    pointInRoadWaterCrossingXZ(x, z, crossing, margin),
  );
}

function getRoadWaterCrossingEdgeAtXZ(x: number, z: number, margin = 0) {
  return CONTINUOUS_WORLD_ROAD_WATER_EDGE_MASKS.find((mask) =>
    pointInRoadWaterCrossingEdgeMask(x, z, mask, margin),
  );
}

const ROAD_SPAN_BY_ID = new Map(
  CONTINUOUS_WORLD_ROAD_SPANS.map((segment) => [segment.id, segment]),
);

function roadWaterCrossingFrame(crossing: RoadWaterCrossing) {
  const dx = crossing.to[0] - crossing.from[0];
  const dz = crossing.to[1] - crossing.from[1];
  const horizontalLength = Math.hypot(dx, dz);
  const elevationDelta = crossing.endElevation - crossing.startElevation;
  return {
    length: Math.hypot(horizontalLength, elevationDelta),
    rotationX: -Math.atan2(elevationDelta, horizontalLength),
    rotationY: Math.atan2(dx, dz),
    center: [
      (crossing.from[0] + crossing.to[0]) / 2,
      (crossing.startElevation + crossing.endElevation) / 2,
      (crossing.from[1] + crossing.to[1]) / 2,
    ] as const,
  };
}

const GENERATED_ROAD_WATER_CROSSINGS =
  CONTINUOUS_WORLD_ROAD_WATER_CROSSINGS.filter(
    (crossing) => crossing.surface !== 'BRIDGE',
  );

const ROAD_WATER_CROSSING_INSTANCES = (() => {
  const foundations: BoxInstance[] = [];
  const carriageways: BoxInstance[] = [];
  const markings: BoxInstance[] = [];
  const rails: BoxInstance[] = [];
  for (const crossing of GENERATED_ROAD_WATER_CROSSINGS) {
    const frame = roadWaterCrossingFrame(crossing);
    const roadSegment = ROAD_SPAN_BY_ID.get(crossing.routeSegmentId);
    if (!roadSegment) continue;
    const foundationColor =
      crossing.surface === 'SEA_BRIDGE' ? '#899492' : '#a4a39b';
    foundations.push({
      id: `${crossing.id}:FOUNDATION`,
      routeSegmentId: crossing.routeSegmentId,
      position: [frame.center[0], frame.center[1] - 0.12, frame.center[2]],
      scale: [
        crossing.structureHalfWidth * 2,
        0.3,
        frame.length + crossing.longitudinalOverhang * 2,
      ],
      rotationX: frame.rotationX,
      rotationY: frame.rotationY,
      color: foundationColor,
    });
    carriageways.push({
      id: `${crossing.id}:CARRIAGEWAY`,
      routeSegmentId: crossing.routeSegmentId,
      position: [frame.center[0], frame.center[1] + 0.045, frame.center[2]],
      scale: [
        roadSegment.width,
        0.07,
        frame.length + crossing.longitudinalOverhang * 2,
      ],
      rotationX: frame.rotationX,
      rotationY: frame.rotationY,
      color: '#525b5d',
    });
    if (roadSegment.width >= 3.6) {
      markings.push({
        id: `${crossing.id}:CENTERLINE`,
        routeSegmentId: crossing.routeSegmentId,
        position: [frame.center[0], frame.center[1] + 0.09, frame.center[2]],
        scale: [0.075, 0.018, Math.max(0.2, frame.length - 0.32)],
        rotationX: frame.rotationX,
        rotationY: frame.rotationY,
        color: '#d2c174',
      });
    }
  }
  for (const mask of CONTINUOUS_WORLD_ROAD_WATER_EDGE_MASKS) {
    const crossing = CONTINUOUS_WORLD_ROAD_WATER_CROSSINGS.find(
      (candidate) => candidate.id === mask.crossingId,
    );
    if (!crossing) continue;
    const frame = roadWaterCrossingFrame(crossing);
    const elevation = roadWaterCrossingElevationAtXZ(
      mask.center[0],
      mask.center[1],
      crossing,
    );
    rails.push({
      id: mask.id,
      routeSegmentId: crossing.routeSegmentId,
      position: [mask.center[0], elevation + 0.38, mask.center[1]],
      scale: [mask.halfExtents[0] * 2, 0.72, mask.halfExtents[1] * 2],
      rotationX: frame.rotationX,
      rotationY: mask.rotationRadians,
      color: '#d3c396',
    });
  }
  return { foundations, carriageways, markings, rails };
})();

export function ContinuousRoadWaterCrossings() {
  return (
    <group name="Physical road bridges and causeways">
      <InstancedBoxes
        instances={ROAD_WATER_CROSSING_INSTANCES.foundations}
        roughness={0.84}
        metalness={0.09}
      />
      <InstancedBoxes
        instances={ROAD_WATER_CROSSING_INSTANCES.carriageways}
        roughness={0.92}
        emissive="#30383a"
        emissiveIntensity={0.14}
      />
      <InstancedBoxes
        instances={ROAD_WATER_CROSSING_INSTANCES.markings}
        roughness={0.68}
        emissive="#74683c"
        emissiveIntensity={0.1}
        receiveShadow={false}
      />
      <InstancedBoxes
        instances={ROAD_WATER_CROSSING_INSTANCES.rails}
        roughness={0.34}
        metalness={0.58}
      />
    </group>
  );
}

const WALKABLE_DECK_COLLISION_MASKS = CONTINUOUS_WORLD_WALKABLE_DECKS.map(
  (deck) => {
    const rotation = deck.rotationRadians ?? 0;
    return {
      centerX: deck.center[0],
      centerZ: deck.center[1],
      halfX: deck.halfExtents[0],
      halfZ: deck.halfExtents[1],
      shape: deck.shape ?? 'RECTANGLE',
      elevation: deck.elevation,
      cosine: Math.cos(rotation),
      sine: Math.sin(rotation),
    };
  },
);

function isWorldPointOnWalkableDeckXZ(x: number, z: number, margin = 0) {
  for (const deck of WALKABLE_DECK_COLLISION_MASKS) {
    const dx = x - deck.centerX;
    const dz = z - deck.centerZ;
    const localX = dx * deck.cosine - dz * deck.sine;
    const localZ = dx * deck.sine + dz * deck.cosine;
    if (deck.shape === 'ELLIPSE') {
      const radiusX = deck.halfX + margin;
      const radiusZ = deck.halfZ + margin;
      if (
        (localX * localX) / (radiusX * radiusX) +
          (localZ * localZ) / (radiusZ * radiusZ) <=
        1
      )
        return true;
    } else if (
      Math.abs(localX) <= deck.halfX + margin &&
      Math.abs(localZ) <= deck.halfZ + margin
    ) {
      return true;
    }
  }
  return false;
}

const SURFACE_PLATEAU_MASKS = WORLD_SURFACE_PLATEAUS.map((surface) => {
  const rotation = surface.rotationRadians ?? 0;
  return {
    centerX: surface.center[0],
    centerZ: surface.center[1],
    halfX: surface.halfExtents[0],
    halfZ: surface.halfExtents[1],
    cosine: Math.cos(rotation),
    sine: Math.sin(rotation),
    elevation: surface.elevation,
  };
});

const SURFACE_RAMP_MASKS = WORLD_SURFACE_RAMPS.map((surface) => {
  const dx = surface.to[0] - surface.from[0];
  const dz = surface.to[1] - surface.from[1];
  return {
    fromX: surface.from[0],
    fromZ: surface.from[1],
    dx,
    dz,
    lengthSquared: dx * dx + dz * dz,
    halfWidth: surface.width / 2,
    startElevation: surface.startElevation,
    endElevation: surface.endElevation,
  };
});

function surfaceRampElevationAtXZ(x: number, z: number) {
  let elevation = Number.NEGATIVE_INFINITY;
  for (const ramp of SURFACE_RAMP_MASKS) {
    const progress = THREE.MathUtils.clamp(
      ((x - ramp.fromX) * ramp.dx + (z - ramp.fromZ) * ramp.dz) /
        Math.max(ramp.lengthSquared, Number.EPSILON),
      0,
      1,
    );
    const nearestX = ramp.fromX + ramp.dx * progress;
    const nearestZ = ramp.fromZ + ramp.dz * progress;
    const offsetX = x - nearestX;
    const offsetZ = z - nearestZ;
    if (
      offsetX * offsetX + offsetZ * offsetZ <=
      ramp.halfWidth * ramp.halfWidth
    )
      elevation = Math.max(
        elevation,
        THREE.MathUtils.lerp(ramp.startElevation, ramp.endElevation, progress),
      );
  }
  return elevation;
}

export function getWorldSurfaceElevationXZ(x: number, z: number) {
  let elevation = getWorldGroundElevation(x, z);
  for (const crossing of CONTINUOUS_WORLD_ROAD_WATER_CROSSINGS) {
    elevation = Math.max(
      elevation,
      roadWaterCrossingElevationAtXZ(x, z, crossing),
    );
  }
  for (const bridge of BRIDGE_COLLISION_MASKS) {
    const dx = x - bridge.centerX;
    const dz = z - bridge.centerZ;
    const localX = dx * bridge.cosine - dz * bridge.sine;
    const localZ = dx * bridge.sine + dz * bridge.cosine;
    if (
      Math.abs(localX) <= bridge.halfWidth &&
      Math.abs(localZ) <= bridge.halfLength
    )
      elevation = Math.max(elevation, bridge.elevation);
  }
  for (const deck of WALKABLE_DECK_COLLISION_MASKS) {
    const dx = x - deck.centerX;
    const dz = z - deck.centerZ;
    const localX = dx * deck.cosine - dz * deck.sine;
    const localZ = dx * deck.sine + dz * deck.cosine;
    const onDeck =
      deck.shape === 'ELLIPSE'
        ? (localX * localX) / (deck.halfX * deck.halfX) +
            (localZ * localZ) / (deck.halfZ * deck.halfZ) <=
          1
        : Math.abs(localX) <= deck.halfX && Math.abs(localZ) <= deck.halfZ;
    if (onDeck) elevation = Math.max(elevation, deck.elevation);
  }
  for (const surface of SURFACE_PLATEAU_MASKS) {
    const dx = x - surface.centerX;
    const dz = z - surface.centerZ;
    const localX = dx * surface.cosine - dz * surface.sine;
    const localZ = dx * surface.sine + dz * surface.cosine;
    if (Math.abs(localX) <= surface.halfX && Math.abs(localZ) <= surface.halfZ)
      elevation = Math.max(elevation, surface.elevation);
  }
  return Math.max(elevation, surfaceRampElevationAtXZ(x, z));
}

export function getWorldSurfaceElevation(position: ContinuousWorldPosition) {
  return getWorldSurfaceElevationXZ(worldX(position), worldZ(position));
}

export function isWorldPointOnWalkableDeck(
  position: ContinuousWorldPosition,
  margin = 0,
) {
  return isWorldPointOnWalkableDeckXZ(
    worldX(position),
    worldZ(position),
    margin,
  );
}

export const CONTINUOUS_WORLD_ROAD_COLLISION_SEGMENTS =
  CONTINUOUS_WORLD_ROAD_SPANS.map((span) => {
    const dx = span.to[0] - span.from[0];
    const dz = span.to[1] - span.from[1];
    return {
      fromX: span.from[0],
      fromZ: span.from[1],
      dx,
      dz,
      lengthSquared: dx * dx + dz * dz,
      surfaceHalfCorridor: span.outerHalfWidth,
      halfCorridor: span.renderedEnvelopeHalfWidth,
      routeSegmentId: span.id,
    };
  });

function distanceSquaredToRoadSegmentXZ(
  x: number,
  z: number,
  segment: (typeof CONTINUOUS_WORLD_ROAD_COLLISION_SEGMENTS)[number],
) {
  if (segment.lengthSquared <= Number.EPSILON) {
    const dx = x - segment.fromX;
    const dz = z - segment.fromZ;
    return dx * dx + dz * dz;
  }
  const progress = THREE.MathUtils.clamp(
    ((x - segment.fromX) * segment.dx + (z - segment.fromZ) * segment.dz) /
      segment.lengthSquared,
    0,
    1,
  );
  const nearestX = segment.fromX + segment.dx * progress;
  const nearestZ = segment.fromZ + segment.dz * progress;
  const dx = x - nearestX;
  const dz = z - nearestZ;
  return dx * dx + dz * dz;
}

function isWorldPointOnRoadXZ(x: number, z: number, margin = 0) {
  for (const segment of CONTINUOUS_WORLD_ROAD_COLLISION_SEGMENTS) {
    const clearance = segment.halfCorridor + margin;
    if (distanceSquaredToRoadSegmentXZ(x, z, segment) <= clearance * clearance)
      return true;
  }
  return false;
}

export function isWorldPointOnRoad(
  position: ContinuousWorldPosition,
  margin = 0,
) {
  return isWorldPointOnRoadXZ(worldX(position), worldZ(position), margin);
}

export function distanceToGrandRiver(position: ContinuousWorldPosition) {
  const x = worldX(position);
  const z = worldZ(position);
  let nearestDistance = Number.POSITIVE_INFINITY;
  let nearestHalfWidth = RIVER_MIN_RENDER_WIDTH / 2;
  for (const sample of RIVER_SAMPLES) {
    const distance = Math.hypot(x - sample.point.x, z - sample.point.z);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestHalfWidth = sample.halfWidth;
    }
  }
  return { distance: nearestDistance, halfWidth: nearestHalfWidth };
}

function isWorldPointInGrandRiverXZ(x: number, z: number) {
  if (
    x < RIVER_QUERY_BOUNDS.minX ||
    x > RIVER_QUERY_BOUNDS.maxX ||
    z < RIVER_QUERY_BOUNDS.minZ ||
    z > RIVER_QUERY_BOUNDS.maxZ
  )
    return false;
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;
  let nearestHalfWidth = RIVER_MIN_RENDER_WIDTH / 2;
  for (const sample of RIVER_SAMPLES) {
    const dx = x - sample.point.x;
    const dz = z - sample.point.z;
    const distanceSquared = dx * dx + dz * dz;
    if (distanceSquared < nearestDistanceSquared) {
      nearestDistanceSquared = distanceSquared;
      nearestHalfWidth = sample.halfWidth;
    }
  }
  return nearestDistanceSquared <= nearestHalfWidth * nearestHalfWidth;
}

function isWorldPointOnRiverBridgeXZ(x: number, z: number, margin = 0) {
  for (const bridge of BRIDGE_COLLISION_MASKS) {
    const dx = x - bridge.centerX;
    const dz = z - bridge.centerZ;
    const localX = dx * bridge.cosine - dz * bridge.sine;
    const localZ = dx * bridge.sine + dz * bridge.cosine;
    if (
      Math.abs(localX) <= bridge.halfWidth + margin &&
      Math.abs(localZ) <= bridge.halfLength + margin
    )
      return true;
  }
  return false;
}

export function isWorldPointOnRiverBridge(
  position: ContinuousWorldPosition,
  margin = 0,
) {
  return isWorldPointOnRiverBridgeXZ(
    worldX(position),
    worldZ(position),
    margin,
  );
}

function isWorldPointInWaterXZ(x: number, z: number) {
  // The raw water body remains continuous. Traversal is opened only where a
  // visible, collidable bridge/deck/causeway actually exists.
  if (
    isWorldPointOnRiverBridgeXZ(x, z, 0.38) ||
    Boolean(getRoadWaterCrossingAtXZ(x, z)) ||
    isWorldPointOnWalkableDeckXZ(x, z, 0.38)
  )
    return false;
  return isWorldPointInRawWaterXZ(x, z);
}

export function isWorldPointInWater(position: ContinuousWorldPosition) {
  return isWorldPointInWaterXZ(worldX(position), worldZ(position));
}

function legacyBlockerLocalOffset(
  x: number,
  z: number,
  blocker: Pick<
    ContinuousWorldBlocker,
    'center' | 'halfExtents' | 'rotationRadians'
  >,
) {
  const dx = x - blocker.center[0];
  const dz = z - blocker.center[1];
  const angle = blocker.rotationRadians ?? 0;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: dx * cosine - dz * sine,
    z: dx * sine + dz * cosine,
  };
}

function isPointInOrientedWorldFootprintXZ(
  x: number,
  z: number,
  footprint: Pick<
    ContinuousWorldBlocker,
    'center' | 'halfExtents' | 'shape' | 'rotationRadians'
  >,
  margin = 0,
) {
  const local = legacyBlockerLocalOffset(x, z, footprint);
  if (footprint.shape === 'ELLIPSE') {
    const radiusX = footprint.halfExtents[0] + margin;
    const radiusZ = footprint.halfExtents[1] + margin;
    if (radiusX <= 0 || radiusZ <= 0) return false;
    return (
      (local.x * local.x) / (radiusX * radiusX) +
        (local.z * local.z) / (radiusZ * radiusZ) <
      1
    );
  }
  return (
    Math.abs(local.x) < footprint.halfExtents[0] + margin &&
    Math.abs(local.z) < footprint.halfExtents[1] + margin
  );
}

export function getContinuousWorldLegacyBlockerAtXZ(
  x: number,
  z: number,
  margin = 0.38,
) {
  let highest: ContinuousWorldBlocker | undefined;
  let highestRoof = Number.NEGATIVE_INFINITY;
  for (const blocker of CONTINUOUS_WORLD_LEGACY_BLOCKERS) {
    if (!isPointInOrientedWorldFootprintXZ(x, z, blocker, margin)) continue;
    const roof =
      (blocker.baseElevation ??
        getWorldGroundElevation(blocker.center[0], blocker.center[1])) +
      (blocker.height ?? 110);
    if (roof <= highestRoof) continue;
    highest = blocker;
    highestRoof = roof;
  }
  return highest;
}

function isWorldPointBlockedByLegacyGeometryXZ(
  x: number,
  z: number,
  margin = 0.38,
) {
  return Boolean(getContinuousWorldLegacyBlockerAtXZ(x, z, margin));
}

export function isWorldPointBlockedByLegacyGeometry(
  position: ContinuousWorldPosition,
  margin = 0.38,
) {
  return isWorldPointBlockedByLegacyGeometryXZ(
    worldX(position),
    worldZ(position),
    margin,
  );
}

type ProceduralCollisionMask = Readonly<{
  centerX: number;
  centerZ: number;
  halfX: number;
  halfZ: number;
  cosine: number;
  sine: number;
  minimumY: number;
  maximumY: number;
}>;

let proceduralCollisionMaskCache:
  | readonly ProceduralCollisionMask[]
  | undefined;

function getProceduralCollisionMasks() {
  if (!proceduralCollisionMaskCache) {
    proceduralCollisionMaskCache = getAllProceduralMassing().map((building) => {
      const angle = building.rotationY ?? 0;
      return {
        centerX: building.position[0],
        centerZ: building.position[2],
        halfX: building.scale[0] / 2,
        halfZ: building.scale[2] / 2,
        cosine: Math.cos(angle),
        sine: Math.sin(angle),
        minimumY: building.position[1] - building.scale[1] / 2,
        maximumY: building.position[1] + building.scale[1] / 2,
      };
    });
  }
  return proceduralCollisionMaskCache;
}

function isWorldPointBlockedByProceduralGeometryXZ(
  x: number,
  z: number,
  margin = 0.38,
) {
  for (const building of getProceduralCollisionMasks()) {
    const dx = x - building.centerX;
    const dz = z - building.centerZ;
    const localX = dx * building.cosine - dz * building.sine;
    const localZ = dx * building.sine + dz * building.cosine;
    if (
      Math.abs(localX) < building.halfX + margin &&
      Math.abs(localZ) < building.halfZ + margin
    )
      return true;
  }
  return false;
}

function isWorldCameraPointInsideProceduralGeometry(
  x: number,
  y: number,
  z: number,
  margin = 0.55,
) {
  for (const building of getProceduralCollisionMasks()) {
    if (y < building.minimumY - margin || y > building.maximumY + margin)
      continue;
    const dx = x - building.centerX;
    const dz = z - building.centerZ;
    const localX = dx * building.cosine - dz * building.sine;
    const localZ = dx * building.sine + dz * building.cosine;
    if (
      Math.abs(localX) < building.halfX + margin &&
      Math.abs(localZ) < building.halfZ + margin
    )
      return true;
  }
  return false;
}

export function isWorldPointBlockedByProceduralGeometry(
  position: ContinuousWorldPosition,
  margin = 0.38,
) {
  return isWorldPointBlockedByProceduralGeometryXZ(
    worldX(position),
    worldZ(position),
    margin,
  );
}

function isWorldPointBlockedBySolidGeometryXZ(
  x: number,
  z: number,
  margin = 0.38,
) {
  return (
    isPointInNamedWorldSolidXZ(x, z, margin) ||
    isWorldPointBlockedByLegacyGeometryXZ(x, z, margin) ||
    isWorldPointBlockedByProceduralGeometryXZ(x, z, margin) ||
    Boolean(getWorldLinearBarrierAtXZ(x, z, margin)) ||
    Boolean(getRoadWaterCrossingEdgeAtXZ(x, z, margin)) ||
    Boolean(getPersistentInfrastructurePierAtXZ(x, z, margin)) ||
    Boolean(getWorldWatercraftAtXZ(x, z, margin))
  );
}

/** Closed outdoor architecture, independent of visual LOD. */
export function isWorldPointBlockedBySolidGeometry(
  position: ContinuousWorldPosition,
  margin = 0.38,
) {
  return isWorldPointBlockedBySolidGeometryXZ(
    worldX(position),
    worldZ(position),
    margin,
  );
}

/** Three-dimensional camera probe. Unlike player collision, buildings stop
 * occluding once the camera is genuinely above their roofline. */
export function isWorldCameraPointOccluded(position: {
  x: number;
  y: number;
  z: number;
}) {
  const { x, y, z } = position;
  const surfaceElevation = getWorldSurfaceElevationXZ(x, z);
  if (y <= surfaceElevation + WORLD_CAMERA_GROUND_CLEARANCE) return true;
  if (isPointInsidePersistentInfrastructure(x, y, z, 0.55)) return true;
  const linearBarrier = getWorldLinearBarrierAtXZ(x, z, 0.55);
  if (
    linearBarrier &&
    y >= surfaceElevation - 0.1 &&
    y <= surfaceElevation + (linearBarrier.kind === 'F1_BARRIER' ? 1.35 : 0.9)
  )
    return true;
  const crossingEdge = getRoadWaterCrossingEdgeAtXZ(x, z, 0.55);
  if (crossingEdge) {
    const crossing = CONTINUOUS_WORLD_ROAD_WATER_CROSSINGS.find(
      ({ id }) => id === crossingEdge.crossingId,
    );
    const deckElevation = crossing
      ? roadWaterCrossingElevationAtXZ(x, z, crossing)
      : surfaceElevation;
    if (y >= deckElevation - 0.1 && y <= deckElevation + 0.82) return true;
  }
  const namedSolid = getWorldSolidAtXZ(x, z, 0.55);
  if (namedSolid) {
    const baseElevation =
      namedSolid.baseElevation ??
      getWorldGroundElevation(namedSolid.center[0], namedSolid.center[1]);
    if (
      y >= baseElevation - 0.1 &&
      y <= baseElevation + namedSolid.height + 0.5
    )
      return true;
  }
  const watercraft = getWorldWatercraftAtXZ(x, z, 0.55);
  if (
    watercraft &&
    y >= watercraft.minimumY - 0.12 &&
    y <= watercraft.maximumY + 0.2
  )
    return true;
  const legacyBlocker = getContinuousWorldLegacyBlockerAtXZ(x, z, 0.55);
  if (legacyBlocker) {
    const baseElevation =
      legacyBlocker.baseElevation ??
      getWorldGroundElevation(legacyBlocker.center[0], legacyBlocker.center[1]);
    if (
      y >= baseElevation - 0.1 &&
      y <= baseElevation + (legacyBlocker.height ?? 110) + 0.5
    )
      return true;
  }
  return (
    isWorldCameraPointInsideProceduralGeometry(x, y, z) ||
    isWorldCameraPointInsideRoadsideTree(x, y, z)
  );
}

export function isWithinContinuousWorldBounds(
  position: ContinuousWorldPosition,
) {
  const x = worldX(position);
  const z = worldZ(position);
  return (
    x >= CONTINUOUS_WORLD_BOUNDS.minX &&
    x <= CONTINUOUS_WORLD_BOUNDS.maxX &&
    z >= CONTINUOUS_WORLD_BOUNDS.minZ &&
    z <= CONTINUOUS_WORLD_BOUNDS.maxZ
  );
}

/** A first-pass outdoor collision predicate for Player integration. */
export function canTraverseContinuousWorld(position: ContinuousWorldPosition) {
  const x = worldX(position);
  const z = worldZ(position);
  return (
    x >= CONTINUOUS_WORLD_BOUNDS.minX &&
    x <= CONTINUOUS_WORLD_BOUNDS.maxX &&
    z >= CONTINUOUS_WORLD_BOUNDS.minZ &&
    z <= CONTINUOUS_WORLD_BOUNDS.maxZ &&
    !isWorldPointInWaterXZ(x, z) &&
    !isHeadwaterCliffXZ(x, z) &&
    !isWorldPointBlockedBySolidGeometryXZ(x, z)
  );
}

/** Maximum vertical change the avatar may climb in one movement substep.
 * Elevated terraces remain real geometry: players reach them through explicit
 * ramps instead of being snapped upward at an arbitrary footprint edge. */
export const MAX_CONTINUOUS_WORLD_STEP = 0.55;

export function canStepBetweenContinuousWorldPoints(
  from: ContinuousWorldPosition,
  to: ContinuousWorldPosition,
) {
  const fromElevation = getWorldSurfaceElevationXZ(worldX(from), worldZ(from));
  const toElevation = getWorldSurfaceElevationXZ(worldX(to), worldZ(to));
  return Math.abs(toElevation - fromElevation) <= MAX_CONTINUOUS_WORLD_STEP;
}

/** Place the physical entrance beside—not on top of—the arrival marker. This
 * keeps the avatar and its trailing camera out of the canopy while preserving
 * a short, level connection to the station concourse. */
export function getContinuousWorldMetroEntrancePosition(
  arrival: ContinuousWorldMetroArrival,
): readonly [x: number, y: number, z: number] {
  const lateralX = Math.cos(arrival.heading);
  const lateralZ = -Math.sin(arrival.heading);
  for (const side of [1, -1] as const) {
    const x = arrival.position[0] + lateralX * 3.4 * side;
    const z = arrival.position[2] + lateralZ * 3.4 * side;
    if (
      canTraverseContinuousWorld([x, z]) &&
      canStepBetweenContinuousWorldPoints(
        [arrival.position[0], arrival.position[2]],
        [x, z],
      )
    )
      return [x, getWorldSurfaceElevationXZ(x, z), z];
  }
  return [...arrival.position];
}

const CUSTOM_ARCHITECTURE_SECTORS = new Set<WorldSectorId>([
  'CBD_CORE',
  'STARTER_OUTER_RING',
  'WATERFRONT_MARINA',
  'CROWN_RESIDENTIAL',
  'MIDSLOPE_VILLAS',
  'SUMMIT_ESTATES',
  'OFFSHORE_CITY',
  'MOTORSPORT_PARK',
]);

const SECTOR_MASSING_CACHE = new Map<WorldSectorId, readonly BoxInstance[]>();
let allProceduralMassingCache: readonly BoxInstance[] | undefined;

function buildSectorDetailMassing(
  sector: WorldSector,
  acceptedWorldMassing: readonly BoxInstance[],
) {
  if (sector.role === 'RIVER' || CUSTOM_ARCHITECTURE_SECTORS.has(sector.id))
    return [];
  const random = seededRandom(hashString(sector.id));
  const [minX, maxX, minZ, maxZ] = sector.bounds;
  const detailCount = 20;
  const instances: BoxInstance[] = [];
  let attempts = 0;

  while (instances.length < detailCount && attempts < detailCount * 160) {
    attempts += 1;
    const x = THREE.MathUtils.lerp(minX + 2, maxX - 2, random());
    const z = THREE.MathUtils.lerp(minZ + 2, maxZ - 2, random());
    const roleHeight =
      sector.role === 'CORE'
        ? 22 + random() * 34
        : sector.role === 'RESORT'
          ? 9 + random() * 19
          : sector.role === 'INFRASTRUCTURE'
            ? 5 + random() * 8
            : 7 + random() * 20;
    const height = roleHeight;
    const width = 2.8 + random() * (sector.role === 'CORE' ? 5.2 : 3.8);
    const depth = 3 + random() * 4;
    const rotationY = (random() - 0.5) * 0.24;
    const clearanceRadius = Math.max(width, depth) / 2 + 0.55;
    const point: WorldPoint = [x, z];
    if (isWorldPointInWater(point)) continue;
    if (isPointInReservedWorldSite(point, clearanceRadius)) continue;
    if (isPointInNamedWorldSolid(point, clearanceRadius)) continue;
    const authoredResidentialParcel =
      METROPOLITAN_RESIDENTIAL_MASSING_RESERVATIONS.some((reservation) =>
        isPointInOrientedWorldFootprintXZ(
          x,
          z,
          reservation,
          clearanceRadius + 0.6,
        ),
      );
    if (authoredResidentialParcel) continue;
    // Legacy district art is still physical architecture. Reserve its complete
    // footprint before adding streamed filler so both render layers can never
    // occupy the same parcel when their DETAIL LODs are active together.
    const legacyClearance = CONTINUOUS_WORLD_LEGACY_BLOCKERS.some((blocker) =>
      isPointInOrientedWorldFootprintXZ(x, z, blocker, clearanceRadius + 0.25),
    );
    if (legacyClearance) continue;
    // The source valley is a landscape room, not another tower parcel. Keep a
    // broad mountain-and-forest reveal around the falls so the river origin is
    // readable from the approach road and never hidden by streamed massing.
    if (Math.hypot(x - HEADWATER_POINT[0], z - HEADWATER_POINT[1]) < 24)
      continue;
    // Keep every station arrival in a genuine civic forecourt. Without this
    // reservation, deterministic LOD massing can place a tower directly in
    // front of a safe metro spawn even though the spawn itself is walkable.
    const stationClearance = METRO_STATION_REGISTRY.some(
      ({ arrival }) =>
        Math.hypot(x - arrival[0], z - arrival[1]) < 9.5 + clearanceRadius,
    );
    if (stationClearance) continue;
    const roadClearance = CONTINUOUS_WORLD_ROAD_COLLISION_SEGMENTS.some(
      (segment) => {
        const clearance = segment.halfCorridor + 0.6 + clearanceRadius;
        return (
          distanceSquaredToRoadSegmentXZ(x, z, segment) < clearance * clearance
        );
      },
    );
    if (roadClearance) continue;
    const overlapsAnotherBuilding = [
      ...acceptedWorldMassing,
      ...instances,
    ].some((building) => {
      const separation = Math.hypot(
        x - building.position[0],
        z - building.position[2],
      );
      const otherRadius = Math.max(building.scale[0], building.scale[2]) / 2;
      return separation < clearanceRadius + otherRadius + 1.4;
    });
    if (overlapsAnotherBuilding) continue;
    const groundElevation = getWorldGroundElevation(x, z);
    instances.push({
      id: `${sector.id}-FILLER-${instances.length + 1}`,
      position: [x, groundElevation + height / 2, z],
      scale: [width, height, depth],
      rotationY,
    });
  }
  return instances;
}

function ensureProceduralMassingPlan() {
  if (allProceduralMassingCache) return;
  const acceptedWorldMassing: BoxInstance[] = [];
  for (const sector of WORLD_SECTORS) {
    const buildings = buildSectorDetailMassing(sector, acceptedWorldMassing);
    SECTOR_MASSING_CACHE.set(sector.id, buildings);
    acceptedWorldMassing.push(...buildings);
  }
  allProceduralMassingCache = acceptedWorldMassing;
}

function getSectorDetailMassing(sector: WorldSector) {
  ensureProceduralMassingPlan();
  return SECTOR_MASSING_CACHE.get(sector.id) ?? [];
}

function getAllProceduralMassing() {
  ensureProceduralMassingPlan();
  return allProceduralMassingCache ?? [];
}

export function getContinuousWorldProceduralSolids() {
  return getAllProceduralMassing();
}

const LEGACY_DISTRICT_BY_SECTOR: Partial<
  Record<WorldSectorId, LegacyDistrictId>
> = {
  CBD_CORE: 'CBD',
  WATERFRONT_MARINA: 'AZURE_YACHT_MARINA',
  CROWN_RESIDENTIAL: 'CROWN_RESIDENTIAL_TOWERS',
  MIDSLOPE_VILLAS: 'MILLIONAIRE_RIDGE',
};

const CUSTOM_SECTOR_SHELL_CACHE = new Map<
  WorldSectorId,
  readonly BoxInstance[]
>();
const NAMED_SECTOR_SHELL_CACHE = new Map<
  WorldSectorId,
  readonly BoxInstance[]
>();

function customSectorShellMassing(sector: WorldSector) {
  const cached = CUSTOM_SECTOR_SHELL_CACHE.get(sector.id);
  if (cached) return cached;
  const instances: BoxInstance[] = [];
  const legacyDistrict = LEGACY_DISTRICT_BY_SECTOR[sector.id];
  if (legacyDistrict) {
    for (const blocker of CONTINUOUS_WORLD_LEGACY_ARCHITECTURE_BLOCKERS) {
      if (blocker.district !== legacyDistrict) continue;
      const [halfX, halfZ] = blocker.halfExtents;
      if (halfX * halfZ < 7.5 || Math.min(halfX, halfZ) < 1.35) continue;
      const random = seededRandom(hashString(blocker.id));
      const height =
        blocker.height ??
        (sector.role === 'CORE'
          ? 13 + random() * 39
          : sector.role === 'RESORT'
            ? 8 + random() * 15
            : 7 + random() * 19);
      const baseElevation =
        blocker.baseElevation ??
        getWorldGroundElevation(blocker.center[0], blocker.center[1]);
      instances.push({
        id: `${blocker.id}-SHELL`,
        position: [
          blocker.center[0],
          baseElevation + height / 2,
          blocker.center[1],
        ],
        scale: [halfX * 2, height, halfZ * 2],
        rotationY: blocker.rotationRadians,
        shape: blocker.shape === 'ELLIPSE' ? 'CYLINDER' : 'BOX',
      });
    }
  }
  if (sector.id === 'STARTER_OUTER_RING') {
    for (const solid of WORLD_SOLID_FOOTPRINTS) {
      if (solid.kind !== 'STARTER_TOWER') continue;
      instances.push({
        id: `${solid.id}-SHELL`,
        position: [
          solid.center[0],
          (solid.baseElevation ??
            getWorldGroundElevation(solid.center[0], solid.center[1])) +
            solid.height / 2,
          solid.center[1],
        ],
        scale: [
          solid.halfExtents[0] * 2,
          solid.height,
          solid.halfExtents[1] * 2,
        ],
        rotationY: solid.rotationRadians,
      });
    }
  }
  CUSTOM_SECTOR_SHELL_CACHE.set(sector.id, instances);
  return instances;
}

function namedSectorShellMassing(sector: WorldSector) {
  const cached = NAMED_SECTOR_SHELL_CACHE.get(sector.id);
  if (cached) return cached;
  const instances: BoxInstance[] = WORLD_SOLID_FOOTPRINTS.filter(
    (solid) => solid.kind !== 'STARTER_TOWER' && solid.sectorId === sector.id,
  ).map((solid): BoxInstance => {
    const baseElevation =
      solid.baseElevation ??
      getWorldGroundElevation(solid.center[0], solid.center[1]);
    return {
      id: `${solid.id}-PERSISTENT-SHELL`,
      position: [
        solid.center[0],
        baseElevation + solid.height / 2,
        solid.center[1],
      ] as const,
      scale: [
        solid.halfExtents[0] * 2,
        solid.height,
        solid.halfExtents[1] * 2,
      ] as const,
      rotationY: solid.rotationRadians,
      shape: solid.shape === 'ELLIPSE' ? 'CYLINDER' : 'BOX',
    };
  });
  NAMED_SECTOR_SHELL_CACHE.set(sector.id, instances);
  return instances;
}

function distanceToLegacySectorGeometryXZ(
  x: number,
  z: number,
  sector: WorldSector,
) {
  const district = LEGACY_DISTRICT_BY_SECTOR[sector.id];
  if (!district) return Number.POSITIVE_INFINITY;
  let nearest = Number.POSITIVE_INFINITY;
  for (const blocker of CONTINUOUS_WORLD_LEGACY_BLOCKERS) {
    if (blocker.district !== district) continue;
    const local = legacyBlockerLocalOffset(x, z, blocker);
    const dx = Math.max(0, Math.abs(local.x) - blocker.halfExtents[0]);
    const dz = Math.max(0, Math.abs(local.z) - blocker.halfExtents[1]);
    nearest = Math.min(nearest, Math.hypot(dx, dz));
  }
  return nearest;
}

export function getContinuousWorldSectorMassing(
  sector: WorldSector,
  lod: Exclude<ContinuousWorldLod, 'CULLED'>,
) {
  const detail = getSectorDetailMassing(sector);
  if (lod === 'DETAIL') return detail;
  const namedShells = namedSectorShellMassing(sector);
  if (CUSTOM_ARCHITECTURE_SECTORS.has(sector.id))
    return [...customSectorShellMassing(sector), ...namedShells];
  return [...detail.slice(0, 9), ...namedShells];
}

const COMPLETE_WORLD_SHELL_RADIUS = Math.hypot(
  CONTINUOUS_WORLD_BOUNDS.maxX - CONTINUOUS_WORLD_BOUNDS.minX,
  CONTINUOUS_WORLD_BOUNDS.maxZ - CONTINUOUS_WORLD_BOUNDS.minZ,
);

export function getContinuousWorldSectorLod(
  playerPosition: ContinuousWorldPosition,
  sector: WorldSector,
  streamPadding = 12,
): ContinuousWorldLod {
  const x = worldX(playerPosition);
  const z = worldZ(playerPosition);
  const centerDistance = Math.hypot(x - sector.center[0], z - sector.center[1]);
  const legacyGeometryDistance = distanceToLegacySectorGeometryXZ(x, z, sector);
  if (centerDistance <= sector.detailRadius || legacyGeometryDistance <= 18)
    return 'DETAIL';
  if (
    centerDistance <=
    Math.max(sector.streamRadius + streamPadding, COMPLETE_WORLD_SHELL_RADIUS)
  )
    return 'SHELL';
  return 'CULLED';
}

export function getVisibleContinuousWorldSectors(
  playerPosition: ContinuousWorldPosition,
  streamPadding = 12,
) {
  return WORLD_SECTORS.flatMap((sector) => {
    const lod = getContinuousWorldSectorLod(
      playerPosition,
      sector,
      streamPadding,
    );
    return lod === 'CULLED' ? [] : [{ sector, lod } as const];
  });
}

/** The company/model view never streams a district out. Detailed district
 * assets remain replaced by their lightweight shell, but every sector stays
 * represented in the one continuous continental coordinate system. */
export function getOverviewContinuousWorldSectors() {
  return WORLD_SECTORS.map((sector) => ({
    sector,
    lod: 'SHELL' as const,
  }));
}

const METRO_STATION_SECTOR_ZONES = METRO_STATION_REGISTRY.flatMap((station) => {
  const hub = METRO_HUBS.find(
    (candidate) => candidate.id === station.topologyId,
  );
  const sector = hub
    ? WORLD_SECTORS.find((candidate) => candidate.id === hub.sector)
    : undefined;
  return sector ? [{ arrival: station.arrival, sector }] : [];
});

const METRO_STATION_SECTOR_RADIUS = 6.5;

export function getContinuousWorldSectorAt(position: ContinuousWorldPosition) {
  const point = asWorldPoint(position);
  let stationSector: WorldSector | undefined;
  let nearestStationDistance = METRO_STATION_SECTOR_RADIUS;
  for (const zone of METRO_STATION_SECTOR_ZONES) {
    const distance = Math.hypot(
      point[0] - zone.arrival[0],
      point[1] - zone.arrival[1],
    );
    if (distance <= nearestStationDistance) {
      nearestStationDistance = distance;
      stationSector = zone.sector;
    }
  }
  if (stationSector) return stationSector;
  const containing = WORLD_SECTORS.filter((sector) => {
    const [minX, maxX, minZ, maxZ] = sector.bounds;
    return (
      point[0] >= minX &&
      point[0] <= maxX &&
      point[1] >= minZ &&
      point[1] <= maxZ
    );
  });
  const candidates = containing.length > 0 ? containing : WORLD_SECTORS;
  return candidates.reduce((nearest, sector) =>
    distanceBetween(point, sector.center) <
    distanceBetween(point, nearest.center)
      ? sector
      : nearest,
  );
}

export function SectorLodMassing({
  sector,
  lod,
}: {
  sector: WorldSector;
  lod: Exclude<ContinuousWorldLod, 'CULLED'>;
}) {
  const buildings = useMemo(
    () => getContinuousWorldSectorMassing(sector, lod),
    [lod, sector],
  );
  const palette = sectorPalette(sector);
  const stone = useMemo(
    () => buildings.map((building) => ({ ...building, color: palette.stone })),
    [buildings, palette.stone],
  );
  const glass = useMemo(
    () =>
      buildings.map((building) => ({
        ...building,
        position: [
          building.position[0],
          building.position[1] + building.scale[1] * 0.06,
          building.position[2],
        ] as const,
        scale: [
          building.scale[0] * 0.82,
          building.scale[1] * 0.78,
          building.scale[2] * 1.015,
        ] as const,
        color: palette.glass,
      })),
    [buildings, palette.glass],
  );
  const warmWindows = useMemo(
    () =>
      lod === 'DETAIL'
        ? buildings
            .filter((building) => building.shape !== 'CYLINDER')
            .slice(0, Math.ceil(buildings.length * 0.58))
            .map((building, index) => ({
              position: [
                building.position[0],
                building.position[1] + ((index % 3) - 1) * 1.6,
                building.position[2] + building.scale[2] * 0.512,
              ] as const,
              scale: [building.scale[0] * 0.46, 0.52, 0.035] as const,
              rotationY: building.rotationY,
              color: palette.light,
            }))
        : [],
    [buildings, lod, palette.light],
  );
  const stoneBoxes = stone.filter((instance) => instance.shape !== 'CYLINDER');
  const stoneCylinders = stone.filter(
    (instance) => instance.shape === 'CYLINDER',
  );
  const glassBoxes = glass.filter((instance) => instance.shape !== 'CYLINDER');
  const glassCylinders = glass.filter(
    (instance) => instance.shape === 'CYLINDER',
  );

  return (
    <group
      name={`${sector.name} ${lod.toLowerCase()} massing`}
      userData={{ sectorId: sector.id, lod, status: sector.status }}
    >
      <InstancedBoxes
        instances={stoneBoxes}
        roughness={0.58}
        emissive={palette.stone}
        emissiveIntensity={0.1}
        castShadow={lod === 'DETAIL'}
      />
      <InstancedCylinders
        instances={stoneCylinders}
        roughness={0.58}
        emissive={palette.stone}
        emissiveIntensity={0.1}
        castShadow={lod === 'DETAIL'}
      />
      <InstancedBoxes
        instances={glassBoxes}
        roughness={0.22}
        metalness={0.36}
        emissive={palette.glass}
        emissiveIntensity={0.08}
      />
      <InstancedCylinders
        instances={glassCylinders}
        roughness={0.22}
        metalness={0.36}
        emissive={palette.glass}
        emissiveIntensity={0.08}
      />
      <InstancedBoxes
        instances={warmWindows}
        roughness={0.18}
        emissive={palette.light}
        emissiveIntensity={0.58}
        receiveShadow={false}
      />
    </group>
  );
}

export function ContinuousSectorStream({
  playerPosition,
  streamPadding = 12,
  renderSector,
  overview = false,
}: {
  playerPosition: ContinuousWorldPosition;
  streamPadding?: number;
  overview?: boolean;
  renderSector?: (
    sector: WorldSector,
    lod: Exclude<ContinuousWorldLod, 'CULLED'>,
  ) => ReactNode;
}) {
  const [playerX, playerZ] = asWorldPoint(playerPosition);
  // Parent gameplay state already reports in two-unit cells. Re-quantizing to
  // six caused an entire district to switch LOD in one visible jump.
  const streamCellSize = 2;
  const streamCellX = Math.round(playerX / streamCellSize) * streamCellSize;
  const streamCellZ = Math.round(playerZ / streamCellSize) * streamCellSize;
  const sectors = useMemo(
    () =>
      overview
        ? getOverviewContinuousWorldSectors()
        : getVisibleContinuousWorldSectors(
            [streamCellX, streamCellZ],
            streamPadding,
          ),
    [overview, streamCellX, streamCellZ, streamPadding],
  );

  return (
    <group name="Streamed world sectors">
      {sectors.map(({ sector, lod }) => (
        <group
          key={sector.id}
          name={sector.name}
          userData={{ sectorId: sector.id, lod }}
        >
          {renderSector ? (
            renderSector(sector, lod)
          ) : (
            <SectorLodMassing sector={sector} lod={lod} />
          )}
        </group>
      ))}
    </group>
  );
}

export function getContinuousWorldMetroArrival(
  stationId: string,
): ContinuousWorldMetroArrival | undefined {
  const station = METRO_HUBS.find((hub) => hub.id === stationId);
  if (!station) return undefined;
  return metroHubArrival(station);
}

function metroArrivalHeadingIsClear(
  position: readonly [x: number, y: number, z: number],
  heading: number,
) {
  const [arrivalX, arrivalY, arrivalZ] = position;
  const forwardX = Math.sin(heading);
  const forwardZ = Math.cos(heading);
  let previousPoint: WorldPoint = [arrivalX, arrivalZ];
  for (let distance = 0.2; distance <= 4; distance += 0.2) {
    const point: WorldPoint = [
      arrivalX + forwardX * distance,
      arrivalZ + forwardZ * distance,
    ];
    if (
      !canTraverseContinuousWorld(point) ||
      !canStepBetweenContinuousWorldPoints(previousPoint, point)
    )
      return false;
    previousPoint = point;
  }

  const cameraX = arrivalX - forwardX * 5.6;
  const cameraZ = arrivalZ - forwardZ * 5.6;
  const cameraY = getWorldSurfaceElevationXZ(cameraX, cameraZ) + 3.2;
  for (let step = 1; step <= 28; step += 1) {
    const progress = step / 28;
    if (
      isWorldCameraPointOccluded({
        x: arrivalX + (cameraX - arrivalX) * progress,
        y: arrivalY + 1.7 + (cameraY - arrivalY - 1.7) * progress,
        z: arrivalZ + (cameraZ - arrivalZ) * progress,
      })
    )
      return false;
  }
  return true;
}

/** Preserve the authored road-facing direction whenever it is physically
 * viable, then choose the least disruptive alternate direction. This keeps
 * station spawns stable as nearby bridges and buildings become real solids. */
function safeMetroArrivalHeading(
  position: readonly [x: number, y: number, z: number],
  preferredHeading: number,
) {
  const offsets = [
    0,
    Math.PI,
    Math.PI / 2,
    -Math.PI / 2,
    Math.PI / 4,
    -Math.PI / 4,
    (Math.PI * 3) / 4,
    (-Math.PI * 3) / 4,
  ];
  return (
    offsets
      .map((offset) => preferredHeading + offset)
      .find((heading) => metroArrivalHeadingIsClear(position, heading)) ??
    preferredHeading
  );
}

function metroHubArrival(
  station: (typeof METRO_HUBS)[number],
): ContinuousWorldMetroArrival {
  const publicStation = metroStationByTopologyId(station.id);
  if (!publicStation) {
    throw new Error(
      `Metro hub ${station.id} has no stable public station code`,
    );
  }
  const arrival = publicStation.arrival;
  const nearestRoadHeading = headingAlongNearestRoad(arrival);
  const preferredHeading =
    station.id === 'MTR-O01'
      ? Math.PI / 2
      : station.id === 'MTR-B01'
        ? // Both headings follow the same road. Face away from Hotel 04 so the
          // corrected building envelope never spawns the trailing camera inside it.
          nearestRoadHeading - Math.PI
        : nearestRoadHeading;
  const position = [
    arrival[0],
    getWorldSurfaceElevationXZ(arrival[0], arrival[1]),
    arrival[1],
  ] as const;
  const heading = safeMetroArrivalHeading(position, preferredHeading);
  return {
    stationCode: publicStation.id,
    stationId: station.id,
    stationName: station.name,
    sector: station.sector,
    position,
    heading,
  };
}

export const CONTINUOUS_WORLD_METRO_ARRIVALS: readonly ContinuousWorldMetroArrival[] =
  METRO_HUBS.map(metroHubArrival);

export function getNearestContinuousWorldMetro(
  position: ContinuousWorldPosition,
) {
  const point = asWorldPoint(position);
  return CONTINUOUS_WORLD_METRO_ARRIVALS.reduce((nearest, station) =>
    distanceBetween(point, [station.position[0], station.position[2]]) <
    distanceBetween(point, [nearest.position[0], nearest.position[2]])
      ? station
      : nearest,
  );
}

export function ContinuousWorldBase({
  playerPosition,
  streamPadding = 12,
  renderSector,
  children,
  overview = false,
}: {
  playerPosition: ContinuousWorldPosition;
  streamPadding?: number;
  overview?: boolean;
  renderSector?: (
    sector: WorldSector,
    lod: Exclude<ContinuousWorldLod, 'CULLED'>,
  ) => ReactNode;
  children?: ReactNode;
}) {
  const terrainGeometry = useMemo(() => {
    const width = CONTINUOUS_WORLD_BOUNDS.maxX - CONTINUOUS_WORLD_BOUNDS.minX;
    const depth = CONTINUOUS_WORLD_BOUNDS.maxZ - CONTINUOUS_WORLD_BOUNDS.minZ;
    const centerX =
      (CONTINUOUS_WORLD_BOUNDS.minX + CONTINUOUS_WORLD_BOUNDS.maxX) / 2;
    const centerZ =
      (CONTINUOUS_WORLD_BOUNDS.minZ + CONTINUOUS_WORLD_BOUNDS.maxZ) / 2;
    const geometry = new THREE.PlaneGeometry(width, depth, 84, 58);
    const positions = geometry.getAttribute('position');
    for (let index = 0; index < positions.count; index += 1) {
      const localX = positions.getX(index);
      const localY = positions.getY(index);
      positions.setZ(
        index,
        getWorldGroundElevation(centerX + localX, centerZ - localY),
      );
    }
    positions.needsUpdate = true;
    geometry.rotateX(-Math.PI / 2);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }, []);
  useEffect(() => () => terrainGeometry.dispose(), [terrainGeometry]);
  const terrainCenterX =
    (CONTINUOUS_WORLD_BOUNDS.minX + CONTINUOUS_WORLD_BOUNDS.maxX) / 2;
  const terrainCenterZ =
    (CONTINUOUS_WORLD_BOUNDS.minZ + CONTINUOUS_WORLD_BOUNDS.maxZ) / 2;
  return (
    <group
      name="AmpliWorld continuous outdoor world"
      userData={{
        coordinateSystem: 'GLOBAL_XZ_NORTH_POSITIVE',
        coreUnits: WORLD_CORE_UNITS,
      }}
    >
      <mesh
        geometry={terrainGeometry}
        position={[terrainCenterX, -0.13, terrainCenterZ]}
        receiveShadow
      >
        <meshStandardMaterial
          color="#7b8878"
          roughness={0.98}
          emissive="#344034"
          emissiveIntensity={0.17}
        />
      </mesh>
      <ContinuousRoadNetwork />
      <ContinuousGrandRiver />
      <ContinuousRoadWaterCrossings />
      <ContinuousSectorStream
        playerPosition={playerPosition}
        streamPadding={streamPadding}
        renderSector={renderSector}
        overview={overview}
      />
      {children}
    </group>
  );
}
