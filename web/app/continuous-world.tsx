'use client';

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import * as THREE from 'three';
import { RiverHeadwaterFalls } from './urban-expansion';
import {
  WORLD_SURFACE_PLATEAUS,
  WORLD_SURFACE_RAMPS,
  getWorldSolidAtXZ,
  getWorldGroundElevation,
  isPointInNamedWorldSolid,
  isPointInNamedWorldSolidXZ,
  isPointInReservedWorldSite,
} from './world-spatial-registry';
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
  type RiverBridge,
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

/**
 * Temporary anchors for placing the existing content-only district models into
 * the shared topology. They deliberately align each old local metro entrance
 * with its canonical global METRO_HUBS position.
 */
export const LEGACY_DISTRICT_WORLD_ORIGINS = Object.freeze({
  CBD: [0, 0, 0],
  STARTER_ARCOLOGY: [0, 0, 89],
  AZURE_YACHT_MARINA: [-63, 0, -58],
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
];

export type ContinuousWorldBlocker = Readonly<{
  id: string;
  district: LegacyDistrictId;
  center: WorldPoint;
  halfExtents: WorldPoint;
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
    [28, -30, 5.8, 5.5],
    [-31, -42, 5.2, 4.8],
    [0, -35, 8, 8],
    [-18, -12, 3.2, 3.2],
    [18, -12, 3.2, 3.2],
    [-18, 0, 3.2, 3.2],
    [18, 0, 3.2, 3.2],
    [27, -14, 6.2, 5.2],
    [27, 3, 5.3, 4.4],
    [-25, 16, 8.3, 7.2],
    [-25, -3, 5.4, 4.5],
    [-26, 29, 11.5, 7.2],
    [0, 13, 3.4, 3.4],
    [45.5, 5, 6.9, 6.1],
    [-33, -58, 0.8, 5.2],
    [63, 55, 0.8, 5.2],
    [-5, -69, 0.8, 0.8],
    [5, -69, 0.8, 0.8],
    [-7.4, -31, 1.2, 0.9],
    [7.4, -31, 1.2, 0.9],
    [-7.4, -20.56, 1.2, 0.9],
    [7.4, -20.56, 1.2, 0.9],
    [-7.4, -10.11, 1.2, 0.9],
    [7.4, -10.11, 1.2, 0.9],
    [-7.4, 0.33, 1.2, 0.9],
    [7.4, 0.33, 1.2, 0.9],
    [-7.4, 10.78, 1.2, 0.9],
    [7.4, 10.78, 1.2, 0.9],
    [-7.4, 21.22, 1.2, 0.9],
    [7.4, 21.22, 1.2, 0.9],
    [-7.4, 31.67, 1.2, 0.9],
    [7.4, 31.67, 1.2, 0.9],
    [-7.4, 42.11, 1.2, 0.9],
    [7.4, 42.11, 1.2, 0.9],
    [-7.4, 52.56, 1.2, 0.9],
    [7.4, 52.56, 1.2, 0.9],
    [-7.4, 63, 1.2, 0.9],
    [7.4, 63, 1.2, 0.9],
    [-20.7, 7, 1.15, 13],
    [20.7, 7, 1.15, 13],
    [-48, 58, 11, 10],
    [54, 68, 11, 9],
    [60, 7, 10, 9],
    [-53, -59, 11, 10],
    [51, -59, 10, 9],
  ],
  // Starter towers now come from STARTER_TOWER_SPECS, which is shared by the
  // renderer and collision system. No hand-copied blockers remain here.
  STARTER_ARCOLOGY: [],
  AZURE_YACHT_MARINA: [
    [23, -15, 3.8, 3.2],
    [25, 14, 4.2, 5.1],
    [11.2, 15.5, 3.5, 3.6],
    [11.2, 6.8, 3.5, 3.6],
    [11.2, -1.9, 3.5, 3.6],
    [20.5, 13, 3.6, 3.7],
    [20.5, 4.3, 3.6, 3.7],
    [20.5, -4.3, 3.6, 3.7],
  ],
  CROWN_RESIDENTIAL_TOWERS: [
    [-15, -10, 4.8, 4.8],
    [0, -15, 4.8, 4.8],
    [15, -10, 4.8, 4.8],
    [0, 7, 5.4, 5.4],
    [-7.65, -10, 1.2, 0.9],
    [7.65, -10, 1.2, 0.9],
    [-7.65, 2, 1.2, 0.9],
    [7.65, 2, 1.2, 0.9],
    [-7.65, 14, 1.2, 0.9],
    [7.65, 14, 1.2, 0.9],
    [-7.65, 26, 1.2, 0.9],
    [7.65, 26, 1.2, 0.9],
  ],
  MILLIONAIRE_RIDGE: [
    [-15, 18, 4.4, 4.7],
    [15, 18, 4.4, 4.7],
    [-15, 2, 4.4, 4.7],
    [15, 2, 4.4, 4.7],
    [-15, -14, 4.4, 4.7],
    [15, -14, 4.4, 4.7],
    [0, -31, 5.2, 5.2],
    [-9.5, -14, 0.25, 6.2],
    [9.5, -14, 0.25, 6.2],
    [-9.5, 2, 0.25, 6.2],
    [9.5, 2, 0.25, 6.2],
    [-9.5, 18, 0.25, 6.2],
    [9.5, 18, 0.25, 6.2],
    [0, -34.8, 9, 1.1],
    [-30, 18, 5, 7.5],
    [30, 18, 5, 7.5],
  ],
};

export const CONTINUOUS_WORLD_LEGACY_BLOCKERS: readonly ContinuousWorldBlocker[] =
  (
    Object.entries(LEGACY_LOCAL_BUILDING_BLOCKERS) as readonly [
      LegacyDistrictId,
      readonly LegacyLocalBlocker[],
    ][]
  ).flatMap(([district, blockers]) => {
    const origin = LEGACY_DISTRICT_WORLD_ORIGINS[district];
    return blockers.map(([x, z, halfWidth, halfDepth], index) => ({
      id: `${district}-${index + 1}`,
      district,
      center: [origin[0] + x, origin[2] + z],
      halfExtents: [halfWidth, halfDepth],
    }));
  });

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
      id: 'CBD-WATERFRONT-QUAY',
      center: [-36.5, 1],
      halfExtents: [0.9, 45],
      elevation: 0.12,
    },
    ...[-18, -2, 14, 29].map((z) => ({
      id: `CBD-FINGER-PIER-${z}`,
      center: [-42, z] as WorldPoint,
      halfExtents: [5.8, 0.8] as WorldPoint,
      elevation: 0.12,
    })),
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
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  color?: THREE.ColorRepresentation;
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

function bridgeDeckLength(bridge: RiverBridge) {
  let nearestSample = RIVER_SAMPLES[0];
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;
  for (const sample of RIVER_SAMPLES) {
    const dx = bridge.position[0] - sample.point.x;
    const dz = bridge.position[1] - sample.point.z;
    const distanceSquared = dx * dx + dz * dz;
    if (distanceSquared < nearestDistanceSquared) {
      nearestDistanceSquared = distanceSquared;
      nearestSample = sample;
    }
  }
  return Math.max(12, nearestSample.halfWidth * 2 + 8);
}

const BRIDGE_COLLISION_MASKS = RIVER_BRIDGES.map((bridge) => {
  const angle = THREE.MathUtils.degToRad(bridge.rotationDegrees);
  return {
    centerX: bridge.position[0],
    centerZ: bridge.position[1],
    cosine: Math.cos(angle),
    sine: Math.sin(angle),
    halfWidth: Math.max(2.8, bridge.width * ROAD_WIDTH_SCALE) / 2,
    halfLength: bridgeDeckLength(bridge) / 2,
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

function buildRoadInstances() {
  const surfaces: BoxInstance[] = [];
  const walks: BoxInstance[] = [];
  const cycleways: BoxInstance[] = [];
  const markings: BoxInstance[] = [];
  const treeTrunks: BoxInstance[] = [];
  const treeCanopies: BoxInstance[] = [];

  ROAD_CONNECTORS.forEach((road) => {
    const width = getRoadRenderWidth(road);
    road.points.slice(0, -1).forEach((from, index) => {
      const to = road.points[index + 1];
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
      const cycleOffset = width / 2 + 0.52;
      const walkOffset = width / 2 + 1.58;
      const treeOffset = width / 2 + 2.18;

      surfaces.push({
        position: center,
        scale: [width, 0.11, length + 0.7],
        rotationX: -slope,
        rotationY,
        color:
          road.class === 'SCENIC'
            ? '#69756e'
            : road.class === 'RING'
              ? '#596164'
              : '#60686b',
      });
      if (road.modes?.includes('WALK')) {
        for (const side of [-1, 1] as const) {
          walks.push({
            position: [
              center[0] + normalX * walkOffset * side,
              center[1] + 0.05,
              center[2] + normalZ * walkOffset * side,
            ],
            scale: [1.42, 0.16, length + 0.45],
            rotationX: -slope,
            rotationY,
            color: road.class === 'SCENIC' ? '#aaa78f' : '#bbb7aa',
          });
        }
      }
      if (road.modes?.includes('CYCLE')) {
        for (const side of [-1, 1] as const) {
          cycleways.push({
            position: [
              center[0] + normalX * cycleOffset * side,
              center[1] + 0.04,
              center[2] + normalZ * cycleOffset * side,
            ],
            scale: [0.7, 0.13, length + 0.38],
            rotationX: -slope,
            rotationY,
            color: road.class === 'SCENIC' ? '#71826d' : '#667c70',
          });
        }
      }
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

  return { surfaces, walks, cycleways, markings, treeTrunks, treeCanopies };
}

const ROAD_INSTANCES = buildRoadInstances();

function isWorldCameraPointInsideRoadsideTree(x: number, y: number, z: number) {
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
        const deckLength = bridgeDeckLength(bridge);
        const renderedWidth = Math.max(2.8, bridge.width * ROAD_WIDTH_SCALE);
        const rotationY = THREE.MathUtils.degToRad(bridge.rotationDegrees);
        const isPedestrian = bridge.class === 'PEDESTRIAN';
        const isMetro = bridge.class === 'METRO';
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
              <boxGeometry args={[renderedWidth, 0.12, deckLength]} />
              <meshStandardMaterial
                color={
                  isPedestrian ? '#b8b2a3' : isMetro ? '#56646c' : '#434b4d'
                }
                roughness={isPedestrian ? 0.78 : 0.64}
                metalness={isMetro ? 0.34 : 0.12}
              />
            </mesh>
            {!isMetro &&
              [-1, 1].map((side) => (
                <mesh
                  key={side}
                  position={[side * (renderedWidth / 2 - 0.18), 0.43, 0]}
                >
                  <boxGeometry args={[0.16, 0.74, deckLength]} />
                  <meshStandardMaterial
                    color="#bac3bf"
                    metalness={0.62}
                    roughness={0.32}
                  />
                </mesh>
              ))}
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
  return (
    <group name="Grand River estuary and western ocean">
      <mesh
        position={[-110, -0.035, -60]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[120, 120, 1, 1]} />
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
        position={[-64, -0.018, -58]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1.42, 1, 0.78]}
        receiveShadow
      >
        <circleGeometry args={[18, 64]} />
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
  const ocean = x <= -62 && z <= -12;
  const bayX = (x + 64) / 25.5;
  const bayZ = (z + 58) / 14;
  return ocean || bayX * bayX + bayZ * bayZ <= 1;
}

function isLegacyMarinaWaterXZ(x: number, z: number) {
  return Math.abs(x + 47) <= 11 && Math.abs(z - 1) <= 45;
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

const ROAD_COLLISION_SEGMENTS = ROAD_CONNECTORS.flatMap((road) =>
  road.points.slice(0, -1).map((from, index) => {
    const to = road.points[index + 1];
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    return {
      fromX: from[0],
      fromZ: from[1],
      dx,
      dz,
      lengthSquared: dx * dx + dz * dz,
      halfCorridor: getRoadRenderWidth(road) / 2 + 1.8,
    };
  }),
);

function distanceSquaredToRoadSegmentXZ(
  x: number,
  z: number,
  segment: (typeof ROAD_COLLISION_SEGMENTS)[number],
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
  for (const segment of ROAD_COLLISION_SEGMENTS) {
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
  // Roads crossing water are rendered as causeways. Detailed marina decks and
  // bridge decks are also explicit solid surfaces, so water never traps a
  // station or cuts a visible pedestrian route.
  if (
    isWorldPointOnRiverBridgeXZ(x, z, 0.38) ||
    isWorldPointOnWalkableDeckXZ(x, z, 0.38) ||
    Number.isFinite(surfaceRampElevationAtXZ(x, z)) ||
    isWorldPointOnRoadXZ(x, z, 0.38)
  )
    return false;
  return (
    isWorldPointInGrandRiverXZ(x, z) ||
    isHeadwaterWaterXZ(x, z) ||
    isOceanPointXZ(x, z) ||
    isLegacyMarinaWaterXZ(x, z)
  );
}

export function isWorldPointInWater(position: ContinuousWorldPosition) {
  return isWorldPointInWaterXZ(worldX(position), worldZ(position));
}

function isWorldPointBlockedByLegacyGeometryXZ(
  x: number,
  z: number,
  margin = 0.38,
) {
  for (const { center, halfExtents } of CONTINUOUS_WORLD_LEGACY_BLOCKERS) {
    if (
      Math.abs(x - center[0]) < halfExtents[0] + margin &&
      Math.abs(z - center[1]) < halfExtents[1] + margin
    )
      return true;
  }
  return false;
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
    isWorldPointBlockedByProceduralGeometryXZ(x, z, margin)
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
  if (y <= getWorldSurfaceElevationXZ(x, z) + 0.16) return true;
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
  if (y <= 110 && isWorldPointBlockedByLegacyGeometryXZ(x, z, 0.55))
    return true;
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

  while (instances.length < detailCount && attempts < detailCount * 24) {
    attempts += 1;
    const x = THREE.MathUtils.lerp(minX + 2, maxX - 2, random());
    const z = THREE.MathUtils.lerp(minZ + 2, maxZ - 2, random());
    if (getContinuousWorldSectorAt([x, z]).id !== sector.id) continue;
    const roleHeight =
      sector.role === 'CORE'
        ? 22 + random() * 34
        : sector.role === 'RESORT'
          ? 9 + random() * 19
          : sector.role === 'INFRASTRUCTURE'
            ? 5 + random() * 8
            : 7 + random() * 20;
    const height = roleHeight;
    const width = 3.4 + random() * (sector.role === 'CORE' ? 5.4 : 4.2);
    const depth = 3.6 + random() * 4.8;
    const rotationY = (random() - 0.5) * 0.24;
    const clearanceRadius = Math.hypot(width, depth) / 2 + 0.85;
    const point: WorldPoint = [x, z];
    if (isWorldPointInWater(point)) continue;
    if (isPointInReservedWorldSite(point, clearanceRadius)) continue;
    if (isPointInNamedWorldSolid(point, clearanceRadius)) continue;
    // Legacy district art is still physical architecture. Reserve its complete
    // footprint before adding streamed filler so both render layers can never
    // occupy the same parcel when their DETAIL LODs are active together.
    const legacyClearance = CONTINUOUS_WORLD_LEGACY_BLOCKERS.some(
      ({ center, halfExtents }) =>
        Math.hypot(x - center[0], z - center[1]) <
        clearanceRadius + Math.hypot(halfExtents[0], halfExtents[1]) + 0.6,
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
    const roadClearance = ROAD_COLLISION_SEGMENTS.some((segment) => {
      const clearance = segment.halfCorridor + 0.6 + clearanceRadius;
      return (
        distanceSquaredToRoadSegmentXZ(x, z, segment) < clearance * clearance
      );
    });
    if (roadClearance) continue;
    const overlapsAnotherBuilding = [
      ...acceptedWorldMassing,
      ...instances,
    ].some((building) => {
      const separation = Math.hypot(
        x - building.position[0],
        z - building.position[2],
      );
      const otherRadius = Math.hypot(building.scale[0], building.scale[2]) / 2;
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
    const dx = Math.max(
      0,
      Math.abs(x - blocker.center[0]) - blocker.halfExtents[0],
    );
    const dz = Math.max(
      0,
      Math.abs(z - blocker.center[1]) - blocker.halfExtents[1],
    );
    nearest = Math.min(nearest, Math.hypot(dx, dz));
  }
  return nearest;
}

function buildSectorMassing(
  sector: WorldSector,
  lod: Exclude<ContinuousWorldLod, 'CULLED'>,
) {
  const detail = getSectorDetailMassing(sector);
  return lod === 'DETAIL' ? detail : detail.slice(0, 7);
}

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
  if (centerDistance <= sector.streamRadius + streamPadding) return 'SHELL';
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
    () => buildSectorMassing(sector, lod),
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

  return (
    <group
      name={`${sector.name} ${lod.toLowerCase()} massing`}
      userData={{ sectorId: sector.id, lod, status: sector.status }}
    >
      <InstancedBoxes
        instances={stone}
        roughness={0.58}
        emissive={palette.stone}
        emissiveIntensity={0.1}
        castShadow={lod === 'DETAIL'}
      />
      <InstancedBoxes
        instances={glass}
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
}: {
  playerPosition: ContinuousWorldPosition;
  streamPadding?: number;
  renderSector?: (
    sector: WorldSector,
    lod: Exclude<ContinuousWorldLod, 'CULLED'>,
  ) => ReactNode;
}) {
  const [playerX, playerZ] = asWorldPoint(playerPosition);
  const streamCellSize = 6;
  const streamCellX = Math.round(playerX / streamCellSize) * streamCellSize;
  const streamCellZ = Math.round(playerZ / streamCellSize) * streamCellSize;
  const sectors = useMemo(
    () =>
      getVisibleContinuousWorldSectors(
        [streamCellX, streamCellZ],
        streamPadding,
      ),
    [streamCellX, streamCellZ, streamPadding],
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
  const oceanRamp = WORLD_SURFACE_RAMPS[0];
  const heading =
    station.id === 'MTR-O01'
      ? Math.atan2(
          oceanRamp.from[0] - oceanRamp.to[0],
          oceanRamp.from[1] - oceanRamp.to[1],
        )
      : headingAlongNearestRoad(arrival);
  return {
    stationCode: publicStation.id,
    stationId: station.id,
    stationName: station.name,
    sector: station.sector,
    position: [
      arrival[0],
      getWorldSurfaceElevationXZ(arrival[0], arrival[1]),
      arrival[1],
    ],
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
}: {
  playerPosition: ContinuousWorldPosition;
  streamPadding?: number;
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
      <ContinuousSectorStream
        playerPosition={playerPosition}
        streamPadding={streamPadding}
        renderSector={renderSector}
      />
      {children}
    </group>
  );
}
