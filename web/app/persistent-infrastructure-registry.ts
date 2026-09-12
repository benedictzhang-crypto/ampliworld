import {
  F1_CIRCUIT_POINTS,
  OCEAN_SKYRAIL_ROUTE,
  getWorldGroundElevation,
} from './world-spatial-registry';
import { ROAD_CONNECTORS, type WorldPoint } from './world-topology';

export type PersistentInfrastructureKind =
  | 'SKYRAIL'
  | 'F1_CIRCUIT'
  | 'EASTERN_INTERCHANGE';

export type PersistentInfrastructureRoute = Readonly<{
  id: string;
  kind: PersistentInfrastructureKind;
  points: readonly WorldPoint[];
  width: number;
  thickness: number;
  color: string;
  segmentElevation: (
    index: number,
    from: WorldPoint,
    to: WorldPoint,
  ) => readonly [start: number, end: number];
}>;

export type PersistentInfrastructureSegment = Readonly<{
  id: string;
  routeId: string;
  kind: PersistentInfrastructureKind;
  index: number;
  from: WorldPoint;
  to: WorldPoint;
  startElevation: number;
  endElevation: number;
  width: number;
  thickness: number;
  color: string;
}>;

export type PersistentInfrastructureDeck = Readonly<{
  id: string;
  segmentId: string;
  kind: PersistentInfrastructureKind;
  position: readonly [x: number, y: number, z: number];
  scale: readonly [width: number, height: number, length: number];
  rotationX: number;
  rotationY: number;
  startElevation: number;
  endElevation: number;
  horizontalLength: number;
  color: string;
}>;

export type PersistentInfrastructurePier = Readonly<{
  id: string;
  segmentId: string;
  kind: Exclude<PersistentInfrastructureKind, 'F1_CIRCUIT'>;
  position: readonly [x: number, y: number, z: number];
  scale: readonly [radius: number, height: number, radius: number];
  color: string;
}>;

const easternInterchangeRoute = ROAD_CONNECTORS.find(
  (road) => road.id === 'RD-A14',
);

if (!easternInterchangeRoute) {
  throw new Error(
    'RD-A14 Grand Prix Expressway is required by the persistent shell',
  );
}

/**
 * Low-profile routes use the exact same plan coordinates as their detailed
 * infrastructure. Their surfaces sit slightly lower and narrower, allowing a
 * detailed model to cover them cleanly without a visible z-fight.
 */
export const PERSISTENT_INFRASTRUCTURE_ROUTES: readonly PersistentInfrastructureRoute[] =
  [
    {
      id: 'SHELL-OCEAN-SKYRAIL',
      kind: 'SKYRAIL',
      points: OCEAN_SKYRAIL_ROUTE,
      width: 2.7,
      thickness: 0.16,
      color: '#aeb8b6',
      segmentElevation: (index) => {
        const start = 4.52 + index * 0.18;
        return [start, start + 0.18];
      },
    },
    {
      id: 'SHELL-AMPLI-GRAND-PRIX',
      kind: 'F1_CIRCUIT',
      points: F1_CIRCUIT_POINTS,
      width: 5.7,
      thickness: 0.08,
      color: '#303536',
      segmentElevation: (_index, from, to) => [
        getWorldGroundElevation(from[0], from[1]) + 0.09,
        getWorldGroundElevation(to[0], to[1]) + 0.09,
      ],
    },
    {
      id: 'SHELL-EASTERN-INTERCHANGE',
      kind: 'EASTERN_INTERCHANGE',
      points: easternInterchangeRoute.points,
      width: 5.8,
      thickness: 0.18,
      color: '#4e5556',
      segmentElevation: (index) => {
        const start = 2.7 + index * 0.35;
        return [start, start + 0.35];
      },
    },
  ];

export function createPersistentInfrastructureSegments(
  routes: readonly PersistentInfrastructureRoute[] = PERSISTENT_INFRASTRUCTURE_ROUTES,
) {
  return routes.flatMap((route) =>
    route.points.slice(0, -1).map((from, index) => {
      const to = route.points[index + 1];
      const [startElevation, endElevation] = route.segmentElevation(
        index,
        from,
        to,
      );
      return {
        id: `${route.id}-SEGMENT-${index + 1}`,
        routeId: route.id,
        kind: route.kind,
        index,
        from,
        to,
        startElevation,
        endElevation,
        width: route.width,
        thickness: route.thickness,
        color: route.color,
      } satisfies PersistentInfrastructureSegment;
    }),
  );
}

export const PERSISTENT_INFRASTRUCTURE_SEGMENTS: readonly PersistentInfrastructureSegment[] =
  createPersistentInfrastructureSegments();

export function persistentInfrastructureDeckFor(
  segment: PersistentInfrastructureSegment,
): PersistentInfrastructureDeck {
  const dx = segment.to[0] - segment.from[0];
  const dz = segment.to[1] - segment.from[1];
  const horizontalLength = Math.max(0.001, Math.hypot(dx, dz));
  const elevationChange = segment.endElevation - segment.startElevation;
  return {
    id: `${segment.id}-DECK`,
    segmentId: segment.id,
    kind: segment.kind,
    position: [
      (segment.from[0] + segment.to[0]) / 2,
      (segment.startElevation + segment.endElevation) / 2,
      (segment.from[1] + segment.to[1]) / 2,
    ],
    scale: [
      segment.width,
      segment.thickness,
      Math.hypot(horizontalLength, elevationChange) + 0.12,
    ],
    rotationX: -Math.atan2(elevationChange, horizontalLength),
    rotationY: Math.atan2(dx, dz),
    startElevation: segment.startElevation,
    endElevation: segment.endElevation,
    horizontalLength,
    color: segment.color,
  };
}

export function persistentInfrastructurePierFor(
  segment: PersistentInfrastructureSegment,
): PersistentInfrastructurePier | undefined {
  if (segment.kind === 'F1_CIRCUIT') return undefined;
  const height = Math.max(0.4, segment.startElevation - 0.12);
  return {
    id: `${segment.id}-PIER`,
    segmentId: segment.id,
    kind: segment.kind,
    position: [segment.from[0], height / 2, segment.from[1]],
    scale: [0.32, height, 0.32],
    color: segment.kind === 'SKYRAIL' ? '#8f9997' : '#787e7d',
  };
}

export const PERSISTENT_INFRASTRUCTURE_DECKS: readonly PersistentInfrastructureDeck[] =
  PERSISTENT_INFRASTRUCTURE_SEGMENTS.map(persistentInfrastructureDeckFor);

export const PERSISTENT_INFRASTRUCTURE_PIERS: readonly PersistentInfrastructurePier[] =
  PERSISTENT_INFRASTRUCTURE_SEGMENTS.flatMap((segment) => {
    const pier = persistentInfrastructurePierFor(segment);
    return pier ? [pier] : [];
  });

export function getPersistentInfrastructurePierAtXZ(
  x: number,
  z: number,
  margin = 0,
) {
  return PERSISTENT_INFRASTRUCTURE_PIERS.find(
    (pier) =>
      Math.hypot(x - pier.position[0], z - pier.position[2]) <
      pier.scale[0] + margin,
  );
}

/** Exact three-dimensional probe for the same low-poly decks and piers that
 * remain rendered at every LOD. Elevated decks do not create a ground-level
 * wall; their supports do. */
export function isPointInsidePersistentInfrastructure(
  x: number,
  y: number,
  z: number,
  margin = 0,
) {
  for (const pier of PERSISTENT_INFRASTRUCTURE_PIERS) {
    if (
      Math.hypot(x - pier.position[0], z - pier.position[2]) <
        pier.scale[0] + margin &&
      y >= -margin &&
      y <= pier.scale[1] + margin
    )
      return true;
  }
  for (const deck of PERSISTENT_INFRASTRUCTURE_DECKS) {
    const dx = x - deck.position[0];
    const dz = z - deck.position[2];
    const cosine = Math.cos(deck.rotationY);
    const sine = Math.sin(deck.rotationY);
    const localX = dx * cosine - dz * sine;
    const localZ = dx * sine + dz * cosine;
    if (
      Math.abs(localX) >= deck.scale[0] / 2 + margin ||
      Math.abs(localZ) >= deck.horizontalLength / 2 + 0.06 + margin
    )
      continue;
    const progress = Math.max(
      0,
      Math.min(1, localZ / deck.horizontalLength + 0.5),
    );
    const elevation =
      deck.startElevation +
      (deck.endElevation - deck.startElevation) * progress;
    if (Math.abs(y - elevation) <= deck.scale[1] / 2 + margin) return true;
  }
  return false;
}
