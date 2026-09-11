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
  minX: -90,
  maxX: 90,
  minZ: -90,
  maxZ: 90,
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
    [27, 25, 8.3, 6.3],
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
  STARTER_ARCOLOGY: [
    [-15, -6, 3.7, 4.1],
    [15, -6, 3.7, 4.1],
    [-15, 14, 3.5, 3.7],
    [15, 14, 3.5, 3.7],
    // The old [0, -18] blocker was the metro pavilion itself. The shared
    // topology places MTR-S01 there, so it must remain a usable arrival plaza.
  ],
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
    [-2.1, 18, 1.4, 2.4],
    [2.1, 5, 1.4, 2.4],
    [-2.1, -13, 1.4, 2.4],
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
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotationY?: number;
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

const HEADWATER_POINT = GRAND_RIVER_CORRIDOR.centerline[0];
const HEADWATER_DOWNSTREAM_POINT = GRAND_RIVER_CORRIDOR.centerline[1];
const HEADWATER_WIDTH = Math.max(8.5, RIVER_MIN_RENDER_WIDTH * 1.8);
const HEADWATER_ROTATION = Math.atan2(
  HEADWATER_POINT[0] - HEADWATER_DOWNSTREAM_POINT[0],
  HEADWATER_POINT[1] - HEADWATER_DOWNSTREAM_POINT[1],
);

function toHeadwaterLocal([x, z]: WorldPoint): WorldPoint {
  const dx = x - HEADWATER_POINT[0];
  const dz = z - HEADWATER_POINT[1];
  const cosine = Math.cos(HEADWATER_ROTATION);
  const sine = Math.sin(HEADWATER_ROTATION);
  return [dx * cosine - dz * sine, dx * sine + dz * cosine];
}

function isHeadwaterWater(point: WorldPoint, margin = 0.38) {
  const [localX, localZ] = toHeadwaterLocal(point);
  const poolRadius = HEADWATER_WIDTH * 0.62 + margin;
  const inLowerPool = Math.hypot(localX, localZ + 3.1) <= poolRadius;
  const inUpperChannel =
    Math.abs(localX) <= HEADWATER_WIDTH * 0.45 + margin &&
    localZ >= -0.6 - margin &&
    localZ <= 16.5 + margin;
  return inLowerPool || inUpperChannel;
}

function isHeadwaterCliff(point: WorldPoint, margin = 0.75) {
  const [localX, localZ] = toHeadwaterLocal(point);
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
  const nearestSample = RIVER_SAMPLES.reduce((nearest, sample) =>
    sample.point.distanceToSquared(
      new THREE.Vector3(bridge.position[0], sample.point.y, bridge.position[1]),
    ) <
    nearest.point.distanceToSquared(
      new THREE.Vector3(
        bridge.position[0],
        nearest.point.y,
        bridge.position[1],
      ),
    )
      ? sample
      : nearest,
  );
  return Math.max(12, nearestSample.halfWidth * 2 + 8);
}

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
      object.rotation.set(0, instance.rotationY ?? 0, 0);
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

function buildRoadInstances() {
  const surfaces: BoxInstance[] = [];
  const walks: BoxInstance[] = [];
  const markings: BoxInstance[] = [];

  ROAD_CONNECTORS.forEach((road) => {
    const width = getRoadRenderWidth(road);
    road.points.slice(0, -1).forEach((from, index) => {
      const to = road.points[index + 1];
      const dx = to[0] - from[0];
      const dz = to[1] - from[1];
      const length = Math.hypot(dx, dz);
      const rotationY = Math.atan2(dx, dz);
      const center: [number, number, number] = [
        (from[0] + to[0]) / 2,
        0.055,
        (from[1] + to[1]) / 2,
      ];
      const tangentX = dx / Math.max(length, 0.001);
      const tangentZ = dz / Math.max(length, 0.001);
      const normalX = -tangentZ;
      const normalZ = tangentX;
      const walkOffset = width / 2 + 0.95;

      surfaces.push({
        position: center,
        scale: [width, 0.11, length + 0.7],
        rotationY,
        color:
          road.class === 'SCENIC'
            ? '#343d3a'
            : road.class === 'RING'
              ? '#2a3032'
              : '#2d3335',
      });
      for (const side of [-1, 1] as const) {
        walks.push({
          position: [
            center[0] + normalX * walkOffset * side,
            0.105,
            center[2] + normalZ * walkOffset * side,
          ],
          scale: [1.7, 0.16, length + 0.45],
          rotationY,
          color: road.class === 'SCENIC' ? '#aaa78f' : '#bbb7aa',
        });
      }
      if (road.class !== 'SCENIC') {
        markings.push({
          position: [center[0], 0.125, center[2]],
          scale: [0.075, 0.018, Math.max(0.2, length - 0.8)],
          rotationY,
          color: road.class === 'AXIS' ? '#d5c270' : '#bfc4b8',
        });
      }
    });
  });

  return { surfaces, walks, markings };
}

const ROAD_INSTANCES = buildRoadInstances();

export function ContinuousRoadNetwork() {
  return (
    <group name="Continuous metropolitan road network">
      <InstancedBoxes instances={ROAD_INSTANCES.surfaces} roughness={0.94} />
      <InstancedBoxes instances={ROAD_INSTANCES.walks} roughness={0.9} />
      <InstancedBoxes
        instances={ROAD_INSTANCES.markings}
        roughness={0.66}
        emissive="#72683d"
        emissiveIntensity={0.12}
        receiveShadow={false}
      />
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
        position={[-91, -0.035, -60]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[72, 96, 1, 1]} />
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

function isOceanPoint([x, z]: WorldPoint) {
  const ocean = x <= -62 && z <= -12;
  const bayX = (x + 64) / 25.5;
  const bayZ = (z + 58) / 14;
  return ocean || bayX * bayX + bayZ * bayZ <= 1;
}

function isLegacyMarinaWater([x, z]: WorldPoint) {
  return Math.abs(x + 47) <= 11 && Math.abs(z - 1) <= 45;
}

function isPointInsideDeckMask(
  [x, z]: WorldPoint,
  deck: ContinuousWorldDeckMask,
  margin: number,
) {
  const rotation = deck.rotationRadians ?? 0;
  const dx = x - deck.center[0];
  const dz = z - deck.center[1];
  const localX = dx * Math.cos(rotation) - dz * Math.sin(rotation);
  const localZ = dx * Math.sin(rotation) + dz * Math.cos(rotation);
  return (
    Math.abs(localX) <= deck.halfExtents[0] + margin &&
    Math.abs(localZ) <= deck.halfExtents[1] + margin
  );
}

export function isWorldPointOnWalkableDeck(
  position: ContinuousWorldPosition,
  margin = 0,
) {
  const point = asWorldPoint(position);
  return CONTINUOUS_WORLD_WALKABLE_DECKS.some((deck) =>
    isPointInsideDeckMask(point, deck, margin),
  );
}

function distanceToRoadSegment(
  point: WorldPoint,
  from: WorldPoint,
  to: WorldPoint,
) {
  const segmentX = to[0] - from[0];
  const segmentZ = to[1] - from[1];
  const lengthSquared = segmentX * segmentX + segmentZ * segmentZ;
  if (lengthSquared <= Number.EPSILON) return distanceBetween(point, from);
  const progress = THREE.MathUtils.clamp(
    ((point[0] - from[0]) * segmentX + (point[1] - from[1]) * segmentZ) /
      lengthSquared,
    0,
    1,
  );
  return Math.hypot(
    point[0] - (from[0] + segmentX * progress),
    point[1] - (from[1] + segmentZ * progress),
  );
}

export function isWorldPointOnRoad(
  position: ContinuousWorldPosition,
  margin = 0,
) {
  const point = asWorldPoint(position);
  return ROAD_CONNECTORS.some((road) => {
    // Includes the paved carriageway and both modeled pedestrian verges.
    const halfCorridor = getRoadRenderWidth(road) / 2 + 1.8 + margin;
    return road.points
      .slice(0, -1)
      .some(
        (from, index) =>
          distanceToRoadSegment(point, from, road.points[index + 1]) <=
          halfCorridor,
      );
  });
}

export function distanceToGrandRiver(position: ContinuousWorldPosition) {
  const [x, z] = asWorldPoint(position);
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

export function isWorldPointOnRiverBridge(
  position: ContinuousWorldPosition,
  margin = 0,
) {
  const [x, z] = asWorldPoint(position);
  return RIVER_BRIDGES.some((bridge) => {
    const angle = THREE.MathUtils.degToRad(bridge.rotationDegrees);
    const dx = x - bridge.position[0];
    const dz = z - bridge.position[1];
    const localX = dx * Math.cos(angle) - dz * Math.sin(angle);
    const localZ = dx * Math.sin(angle) + dz * Math.cos(angle);
    const halfWidth =
      Math.max(2.8, bridge.width * ROAD_WIDTH_SCALE) / 2 + margin;
    const halfLength = bridgeDeckLength(bridge) / 2 + margin;
    return Math.abs(localX) <= halfWidth && Math.abs(localZ) <= halfLength;
  });
}

export function isWorldPointInWater(position: ContinuousWorldPosition) {
  const point = asWorldPoint(position);
  // Roads crossing water are rendered as causeways. Detailed marina decks and
  // bridge decks are also explicit solid surfaces, so water never traps a
  // station or cuts a visible pedestrian route.
  if (
    isWorldPointOnRiverBridge(point, 0.38) ||
    isWorldPointOnWalkableDeck(point, 0.38) ||
    isWorldPointOnRoad(point, 0.38)
  )
    return false;
  const river = distanceToGrandRiver(point);
  return (
    river.distance <= river.halfWidth ||
    isHeadwaterWater(point) ||
    isOceanPoint(point) ||
    isLegacyMarinaWater(point)
  );
}

export function isWorldPointBlockedByLegacyGeometry(
  position: ContinuousWorldPosition,
  margin = 0.38,
) {
  const [x, z] = asWorldPoint(position);
  return CONTINUOUS_WORLD_LEGACY_BLOCKERS.some(
    ({ center, halfExtents }) =>
      Math.abs(x - center[0]) < halfExtents[0] + margin &&
      Math.abs(z - center[1]) < halfExtents[1] + margin,
  );
}

export function isWithinContinuousWorldBounds(
  position: ContinuousWorldPosition,
) {
  const [x, z] = asWorldPoint(position);
  return (
    x >= CONTINUOUS_WORLD_BOUNDS.minX &&
    x <= CONTINUOUS_WORLD_BOUNDS.maxX &&
    z >= CONTINUOUS_WORLD_BOUNDS.minZ &&
    z <= CONTINUOUS_WORLD_BOUNDS.maxZ
  );
}

/** A first-pass outdoor collision predicate for Player integration. */
export function canTraverseContinuousWorld(position: ContinuousWorldPosition) {
  const point = asWorldPoint(position);
  return (
    isWithinContinuousWorldBounds(point) &&
    !isWorldPointInWater(point) &&
    !isHeadwaterCliff(point) &&
    !isWorldPointBlockedByLegacyGeometry(point)
  );
}

function buildSectorMassing(
  sector: WorldSector,
  lod: Exclude<ContinuousWorldLod, 'CULLED'>,
) {
  if (sector.role === 'RIVER') return [];
  // LOD changes must never reshuffle the skyline. Build one deterministic
  // DETAIL set, then let SHELL render its stable prefix.
  const random = seededRandom(hashString(sector.id));
  const [minX, maxX, minZ, maxZ] = sector.bounds;
  const detailCount = 20;
  const shellCount = 7;
  const instances: BoxInstance[] = [];
  let attempts = 0;

  while (instances.length < detailCount && attempts < detailCount * 9) {
    attempts += 1;
    const x = THREE.MathUtils.lerp(minX + 2, maxX - 2, random());
    const z = THREE.MathUtils.lerp(minZ + 2, maxZ - 2, random());
    if (isWorldPointInWater([x, z])) continue;
    // The source valley is a landscape room, not another tower parcel. Keep a
    // broad mountain-and-forest reveal around the falls so the river origin is
    // readable from the approach road and never hidden by streamed massing.
    if (Math.hypot(x - HEADWATER_POINT[0], z - HEADWATER_POINT[1]) < 24)
      continue;
    // Keep every station arrival in a genuine civic forecourt. Without this
    // reservation, deterministic LOD massing can place a tower directly in
    // front of a safe metro spawn even though the spawn itself is walkable.
    const stationClearance = METRO_STATION_REGISTRY.some(({ arrival }) =>
      Math.hypot(x - arrival[0], z - arrival[1]) < 9.5,
    );
    if (stationClearance) continue;
    const roadClearance = ROAD_CONNECTORS.some((road) => {
      const clearance = getRoadRenderWidth(road) / 2 + 2.4;
      return road.points
        .slice(0, -1)
        .some(
          (from, index) =>
            distanceToRoadSegment([x, z], from, road.points[index + 1]) <
            clearance,
        );
    });
    if (roadClearance) continue;

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
    instances.push({
      position: [x, height / 2, z],
      scale: [width, height, depth],
      rotationY: (random() - 0.5) * 0.24,
    });
  }
  return lod === 'DETAIL' ? instances : instances.slice(0, shellCount);
}

export function getContinuousWorldSectorLod(
  playerPosition: ContinuousWorldPosition,
  sector: WorldSector,
  streamPadding = 12,
): ContinuousWorldLod {
  const point = asWorldPoint(playerPosition);
  const distance = distanceBetween(point, sector.center);
  if (distance <= sector.detailRadius) return 'DETAIL';
  if (distance <= sector.streamRadius + streamPadding) return 'SHELL';
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

export function getContinuousWorldSectorAt(position: ContinuousWorldPosition) {
  const point = asWorldPoint(position);
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
    throw new Error(`Metro hub ${station.id} has no stable public station code`);
  }
  const arrival = publicStation.arrival;
  const heading = headingAlongNearestRoad(arrival);
  return {
    stationCode: publicStation.id,
    stationId: station.id,
    stationName: station.name,
    sector: station.sector,
    position: [arrival[0], 0.12, arrival[1]],
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
  return (
    <group
      name="AmpliWorld continuous outdoor world"
      userData={{
        coordinateSystem: 'GLOBAL_XZ_NORTH_POSITIVE',
        coreUnits: WORLD_CORE_UNITS,
      }}
    >
      <mesh
        position={[0, -0.13, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[208, 208, 1, 1]} />
        <meshStandardMaterial color="#687365" roughness={0.98} />
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
